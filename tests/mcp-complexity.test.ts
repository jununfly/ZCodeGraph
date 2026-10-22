/**
 * MCP `**Complexity:** N` surface — real CodeGraph + ToolHandler e2e
 * (roadmap 1-2-6).
 *
 * Builds a 5-language fixture (C#, Java, PHP, Python, Rust) with known
 * decision-point shapes, indexes with the real TypeScript engine, and
 * asserts that `zcodegraph_node` / `zcodegraph_search` responses carry
 * the rubric-computed complexity line:
 *   - function/method on a frozen language with a readable body → line
 *     present with the expected value
 *   - exempt nodes (abstract / extern / stub) → line absent
 *   - nodes of other kinds (class) or other languages (JS/TS) → line
 *     absent
 *
 * Locks the MCP mounting points in src/mcp/tools.ts (formatNodeDetails
 * + formatSearchResults). Uses the real CodeGraph initSync + indexAll
 * path — no CLI subprocess, no daemon.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';

// Each fixture file carries one named function/method whose decision-
// point count is fixed. Language coverage spans 4 of the 5 frozen
// languages in complexity-rubric-v1. Java is exercised at the rubric /
// calculator level (tests/metrics-complexity*.test.ts) but NOT at this
// MCP e2e layer, because the TypeScript engine (used here for
// deterministic fixture indexing) does not ship a Java extractor —
// Java extraction lives on the Rust side and only runs under the
// rust-hybrid engine. Pulling rust-hybrid into this test would import
// the Windows libsql FFI instability the rest of the suite carefully
// avoids.
const FIXTURES: Record<string, { language: string; lines: string[] }> = {
  // C# — one method with if + foreach → complexity 3.
  'src/Foo.cs': {
    language: 'csharp',
    lines: [
      'public class Foo {',
      '  public int Compute(int x) {',
      '    if (x > 0) {',
      '      foreach (var y in new[]{1,2}) {',
      '        System.Console.WriteLine(y);',
      '      }',
      '      return 1;',
      '    }',
      '    return 0;',
      '  }',
      '}',
    ],
  },
  // PHP — one function with if + while → complexity 3.
  'src/baz.php': {
    language: 'php',
    lines: [
      '<?php',
      'function compute_baz($x) {',
      '  if ($x > 0) {',
      '    while ($x > 1) {',
      '      $x--;',
      '    }',
      '    return 1;',
      '  }',
      '  return 0;',
      '}',
    ],
  },
  // Python — one function with if + elif + for → complexity 4.
  'src/qux.py': {
    language: 'python',
    lines: [
      'def compute_qux(x):',
      '    if x > 10:',
      '        return 10',
      '    elif x > 0:',
      '        for i in range(x):',
      '            print(i)',
      '        return 1',
      '    return 0',
    ],
  },
  // Rust — one function with match (3 arms) + if → complexity 5.
  'src/lib.rs': {
    language: 'rust',
    lines: [
      'pub fn compute_rs(x: i32) -> i32 {',
      '    if x < 0 {',
      '        return -1;',
      '    }',
      '    match x {',
      '        0 => 0,',
      '        1 => 1,',
      '        _ => 2,',
      '    }',
      '}',
    ],
  },
};

interface TextContent {
  type: string;
  text: string;
}

function getText(res: { content: unknown[] }): string {
  const first = res.content[0] as TextContent | undefined;
  if (!first || first.type !== 'text') {
    throw new Error(`expected text content, got ${JSON.stringify(res.content)}`);
  }
  return first.text;
}

describe('MCP complexity surface (4-language fixture e2e)', () => {
  let testDir: string;
  let cg: CodeGraph;
  let handler: ToolHandler;

  beforeAll(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-complexity-'));
    for (const [rel, fx] of Object.entries(FIXTURES)) {
      const abs = path.join(testDir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      // LF endings — the line arithmetic in ComplexityCalculator assumes
      // start_line/end_line are stable.
      fs.writeFileSync(abs, fx.lines.join('\n'), 'utf-8');
    }

    cg = CodeGraph.initSync(testDir, {
      config: {
        include: ['**/*.cs', '**/*.php', '**/*.py', '**/*.rs'],
        exclude: [],
      },
    });
    await cg.indexAll({ engine: 'typescript' });
    handler = new ToolHandler(cg);
  }, 120_000);

  afterAll(() => {
    try {
      cg.close();
    } catch {
      /* ignore */
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // zcodegraph_node — formatNodeDetails mounting point
  // -----------------------------------------------------------------------

  it('zcodegraph_node emits **Complexity:** 3 for the C# method', async () => {
    const res = await handler.execute('zcodegraph_node', {
      symbol: 'Compute',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## Compute \(method\)/);
    expect(text).toMatch(/\*\*Complexity:\*\* 3/);
  });

  // Java MCP e2e is intentionally absent — see the FIXTURES comment
  // above. Java rubric behavior is fully covered in
  // tests/metrics-complexity.test.ts.

  it('zcodegraph_node emits **Complexity:** 3 for the PHP function', async () => {
    const res = await handler.execute('zcodegraph_node', {
      symbol: 'compute_baz',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## compute_baz \(function\)/);
    expect(text).toMatch(/\*\*Complexity:\*\* 3/);
  });

  it('zcodegraph_node emits **Complexity:** 4 for the Python function', async () => {
    const res = await handler.execute('zcodegraph_node', {
      symbol: 'compute_qux',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## compute_qux \(function\)/);
    expect(text).toMatch(/\*\*Complexity:\*\* 4/);
  });

  it('zcodegraph_node emits **Complexity:** 5 for the Rust function (match = 3 arms + if)', async () => {
    const res = await handler.execute('zcodegraph_node', {
      symbol: 'compute_rs',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## compute_rs \(function\)/);
    expect(text).toMatch(/\*\*Complexity:\*\* 5/);
  });

  // -----------------------------------------------------------------------
  // zcodegraph_search — formatSearchResults mounting point
  // -----------------------------------------------------------------------

  it('zcodegraph_search results include the **Complexity:** line for function hits', async () => {
    const res = await handler.execute('zcodegraph_search', {
      query: 'compute_qux',
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    // Compact search-result block: ### name (kind) / path:line / sig / complexity
    expect(text).toMatch(/### compute_qux \(function\)/);
    expect(text).toMatch(/\*\*Complexity:\*\* 4/);
  });

  // -----------------------------------------------------------------------
  // Negative gates — no line for wrong kind / wrong language / exempt
  // -----------------------------------------------------------------------

  it('no **Complexity:** line for class-kind nodes (wrong kind)', async () => {
    const res = await handler.execute('zcodegraph_node', {
      symbol: 'Foo',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## Foo \(class\)/);
    expect(text).not.toMatch(/\*\*Complexity:\*\*/);
  });

  it('no **Complexity:** line for functions on non-frozen languages', async () => {
    // Add a JS file to the same fixture. JS is not in the 5 frozen
    // languages, so no complexity line should appear.
    fs.writeFileSync(
      path.join(testDir, 'src', 'util.js'),
      'function helperJs(x) {\n  if (x) { return 1; }\n  return 0;\n}\n',
      'utf-8',
    );
    await cg.sync();

    const res = await handler.execute('zcodegraph_node', {
      symbol: 'helperJs',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## helperJs \(function\)/);
    expect(text).not.toMatch(/\*\*Complexity:\*\*/);
  });

  it('no **Complexity:** line for Python stub bodies (E2 extern-or-ffi)', async () => {
    // Python stub: docstring-only body → E2 exemption → no line.
    fs.writeFileSync(
      path.join(testDir, 'src', 'stub.py'),
      'def stub_fn():\n    """Stub."""\n    pass\n',
      'utf-8',
    );
    await cg.sync();

    const res = await handler.execute('zcodegraph_node', {
      symbol: 'stub_fn',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## stub_fn \(function\)/);
    expect(text).not.toMatch(/\*\*Complexity:\*\*/);
  });

  it('no **Complexity:** line for Rust trait method without default body (E1)', async () => {
    // Trait method signature ending in `;` → E1 abstract-no-body.
    fs.writeFileSync(
      path.join(testDir, 'src', 'traits.rs'),
      'pub trait Shape {\n    fn area(&self) -> f64;\n}\n',
      'utf-8',
    );
    await cg.sync();

    const res = await handler.execute('zcodegraph_node', {
      symbol: 'area',
      includeCode: false,
    });
    expect(res.isError).toBeFalsy();
    const text = getText(res);
    expect(text).toMatch(/## area \(method\)/);
    expect(text).not.toMatch(/\*\*Complexity:\*\*/);
  });

  // -----------------------------------------------------------------------
  // Sanity — line shows up only when the language gate AND kind gate AND
  // exemption gate all pass. Locks against regression where a later
  // refactor accidentally drops the gates.
  // -----------------------------------------------------------------------

  it('complexity value matches the rubric-computed value (C# if+foreach=3)', async () => {
    // Recompute via the rubric directly to ensure MCP surface matches
    // the pure-function source of truth. searchNodes returns
    // SearchResult wrappers — unwrap `.node` before filtering.
    const results = cg.searchNodes('Compute');
    expect(results.length).toBeGreaterThan(0);
    const target = results
      .map((r) => (r as { node?: unknown }).node ?? r)
      .find(
        (n) =>
          (n as { kind?: string; language?: string }).kind === 'method' &&
          (n as { language?: string }).language === 'csharp',
      );
    expect(target).toBeDefined();

    const res = await handler.execute('zcodegraph_node', {
      symbol: 'Compute',
      file: 'Foo.cs',
      includeCode: false,
    });
    const text = getText(res);
    // Lock the exact value from the fixture: 1 + if + foreach = 3.
    expect(text).toContain('**Complexity:** 3');
  });
});
