/**
 * zcodegraph visualize — isolated-fixture e2e
 *
 * Builds a 3-file TypeScript fixture under `os.tmpdir()`, runs the real CLI
 * end-to-end (`index` then `visualize`), and asserts the emitted HTML is a
 * single self-contained artifact: doctype, cytoscape inline, project data
 * JSON, fixture symbol names, and no external CDN references.
 *
 * Runs each depth tier (`file`, `class`, `function`) and asserts the
 * exported node/edge counts are monotonically non-decreasing.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function writeFixture(root: string): void {
  const src = path.join(root, 'src');
  fs.mkdirSync(src, { recursive: true });

  const files: Record<string, string> = {
    'main.ts': `import { helper } from './helper';
import { Logger } from './logger';

export class App {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  run(): void {
    this.logger.info('starting');
    helper();
  }
}

const app = new App();
app.run();
`,
    'helper.ts': `export function helper(): number {
  return 42;
}

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  multiply(a: number, b: number): number {
    return a * b;
  }
}
`,
    'logger.ts': `export class Logger {
  info(msg: string): void {
    console.log('[INFO]', msg);
  }
  error(msg: string): void {
    console.error('[ERROR]', msg);
  }
}
`,
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(src, name), content, 'utf-8');
  }
}

describe('zcodegraph visualize (isolated fixture)', () => {
  let fixtureRoot = '';
  let binReady = false;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      throw new Error(
        `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before this suite.`,
      );
    }
    binReady = true;

    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-visualize-'));
    writeFixture(fixtureRoot);

    const index = runCli(['index'], fixtureRoot);
    if (index.status !== 0) {
      throw new Error(
        `zcodegraph index failed in fixture.\nstdout:\n${index.stdout}\nstderr:\n${index.stderr}`,
      );
    }
  }, 120_000);

  afterAll(() => {
    if (fixtureRoot) {
      try {
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
      } catch {
        // Windows: SQLite WAL sometimes lingers; the OS will reap the temp dir.
      }
    }
  });

  it('renders a self-contained HTML at depth=file with fixture symbols inlined', () => {
    if (!binReady) return;

    const out = path.join(fixtureRoot, '.zcodegraph', 'visualize.html');
    const result = runCli(['visualize'], fixtureRoot);
    expect(
      result.status,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
    expect(fs.existsSync(out)).toBe(true);

    const html = fs.readFileSync(out, 'utf-8');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    // Cytoscape source inlined (no external script src).
    expect(html).toContain('cytoscape');
    expect(html).not.toMatch(/<script[^>]+src=/i);
    // No CDN references anywhere.
    expect(html).not.toContain('https://unpkg.com');
    expect(html).not.toContain('https://cdn.jsdelivr.net');
    expect(html).not.toContain('https://cdnjs.cloudflare.com');
    // Snapshot JSON inlined: file nodes are present.
    expect(html).toContain('projectRoot');
    expect(html).toContain('generatedAt');
    expect(html).toContain('main.ts');
    expect(html).toContain('helper.ts');
    expect(html).toContain('logger.ts');
    // No placeholders leaked.
    expect(html).not.toContain('__CYTOSCAPE_SRC__');
    expect(html).not.toContain('__ZCODEGRAPH_DATA__');
  }, 60_000);

  it('exports monotonically more nodes as depth increases (file < class < function)', () => {
    if (!binReady) return;

    const counts: { depth: string; nodes: number; edges: number }[] = [];
    for (const depth of ['file', 'class', 'function']) {
      const result = runCli(['visualize', '--depth', depth], fixtureRoot);
      expect(
        result.status,
        `depth=${depth}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      ).toBe(0);
      // Parse "N/M nodes · X/Y edges" from stdout
      const m = result.stdout.match(/(\d+)\/(\d+) nodes · (\d+)\/(\d+) edges/);
      expect(m, `stdout missing node/edge counts for depth=${depth}`).not.toBeNull();
      counts.push({
        depth,
        nodes: parseInt(m![1], 10),
        edges: parseInt(m![3], 10),
      });
    }

    // file depth: 3 file nodes.
    expect(counts[0].nodes).toBe(3);
    // class depth adds App / Calculator / Logger => 6.
    expect(counts[1].nodes).toBe(6);
    // function depth adds all methods/functions/etc => > 6.
    expect(counts[2].nodes).toBeGreaterThan(6);
    // Edges are also monotonically non-decreasing.
    expect(counts[1].edges).toBeGreaterThanOrEqual(counts[0].edges);
    expect(counts[2].edges).toBeGreaterThanOrEqual(counts[1].edges);
  }, 60_000);

  it('rejects an unsupported --depth value with a clear error', () => {
    if (!binReady) return;

    const result = runCli(['visualize', '--depth', 'everything'], fixtureRoot);
    expect(result.status).not.toBe(0);
    // error() writes to stderr
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/Unsupported depth/i);
  }, 30_000);

  it('respects --max-nodes cap deterministically', () => {
    if (!binReady) return;

    const out = path.join(fixtureRoot, '.zcodegraph', 'capped.html');
    const result = runCli(
      ['visualize', '--depth', 'function', '--max-nodes', '5', '--out', out],
      fixtureRoot,
    );
    expect(
      result.status,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
    const m = result.stdout.match(/(\d+)\/(\d+) nodes/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1], 10)).toBe(5);
  }, 30_000);

  it('visualize embeds full node data and a module/class/function view switcher for in-page switching', () => {
    if (!binReady) return;

    // Default view is `module` (--depth file), but the page must still embed the
    // FULL node set so the in-page switcher can jump to class/function views.
    const out = path.join(fixtureRoot, '.zcodegraph', 'visualize.html');
    const result = runCli(['visualize'], fixtureRoot);
    expect(
      result.status,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
    const html = fs.readFileSync(out, 'utf-8');

    // View switcher present with all three tiers.
    expect(html).toContain('name="view"');
    expect(html).toContain('value="module"');
    expect(html).toContain('value="class"');
    expect(html).toContain('value="function"');

    // Full data embedded for switching (independent of the requested depth).
    expect(html).toContain('"allNodes"');
    expect(html).toContain('"allEdges"');
    expect(html).toContain('"initialView"');

    // Even at --depth file, the embedded full set contains class + function
    // symbols, so the switcher can show them without re-indexing.
    expect(html).toContain('"kind":"class"');
    expect(html).toMatch(/"kind":"(?:function|method)"/);
    // Concrete fixture symbols prove the data is real, not just the keys.
    expect(html).toContain('"name":"App"');
    expect(html).toContain('"name":"helper"');
    // The depth-limited `nodes` subset still only carries files (regression
    // guard for the legacy depth contract).
    const nodesSection = html.slice(html.indexOf('"nodes"'), html.indexOf('"allNodes"'));
    expect(nodesSection).toContain('"kind":"file"');
    expect(nodesSection).not.toContain('"kind":"class"');
  }, 60_000);
});
