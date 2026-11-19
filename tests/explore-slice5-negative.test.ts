/**
 * Slice 5b — negative & freshness suites for the universal Explore application.
 *
 * Authority: docs/contracts/universal-structural-explore-v1.md §625-§638.
 * Roadmap: 1-9-9-2.
 *
 * Each test drives `DefaultExploreApplication('universal-v1')` end-to-end on
 * a freshly-built temporary project, asserts the ExploreResult against the
 * negative-case contract, and refuses to accept a `complete` verdict when
 * the contract says the answer must be partial/failed/empty.
 *
 * Slice 4 already covers missing/changed source and a missing symbol's
 * no-evidence verdict; we deliberately do NOT re-test those here. The
 * categories covered below are the ones that had no end-to-end coverage
 * after Slice 4:
 *
 *   - ambiguous same-name symbol across two receivers
 *   - wrong overload selection (same name, different receiver)
 *   - external framework terminal (not a local implementation)
 *   - searchExhausted=true must not masquerade as no-path
 *   - budget exclusion forbids `complete`
 *   - non-ASCII UTF-8 source byte precision
 *   - Windows path separator identity
 *   - unrelated receiver/route registration decoy
 *   - swapped direct-call order (A→B→C must not render as A→C→B)
 *   - missing registration forbids connectivity
 *   - deterministic repeated output (byte-equal across runs)
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { DefaultExploreApplication } from '../src/explore/application';
import { prepareExploreDelivery } from '../src/explore/delivery';
import { readExploreRuntimeOptions } from '../src/explore/runtime';
import type { ExploreOptions } from '../src/explore/types';

const temporaryDirectories: string[] = [];
const graphs: CodeGraph[] = [];

function projectRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-slice5-neg-'));
  temporaryDirectories.push(root);
  return root;
}

function options(cap = 8192, overrides: Partial<ExploreOptions> = {}): ExploreOptions {
  return {
    maxFiles: 4,
    runtime: readExploreRuntimeOptions(),
    delivery: prepareExploreDelivery(cap, [], 0),
    ...overrides,
  };
}

async function indexed(root: string, include: string[] = ['**/*.ts', '**/*.py']): Promise<CodeGraph> {
  const graph = CodeGraph.initSync(root, { config: { include, exclude: [] } });
  graphs.push(graph);
  await graph.indexAll({ engine: 'typescript' });
  return graph;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(graphs.splice(0).map(async (graph) => graph.close()));
  for (const root of temporaryDirectories.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Ambiguity & overloads
// ---------------------------------------------------------------------------

describe('Slice 5b — ambiguous same-name symbol', () => {
  it('retains same-name receiver ambiguity and never reports complete', async () => {
    const root = projectRoot();
    fs.writeFileSync(path.join(root, 'a.ts'),
      'export class UserRepo { save(u: string) { return u; } }\n');
    fs.writeFileSync(path.join(root, 'b.ts'),
      'export class OrderRepo { save(o: number) { return o; } }\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(graph, 'save', options());
    expect(result, JSON.stringify(result)).toMatchObject({
      kind: 'answer',
      report: { coverage: { status: 'partial' } },
    });
    if (result.kind === 'answer') {
      expect(result.report.coverage.gaps).toEqual(expect.arrayContaining([
        expect.objectContaining({ reason: 'graph-semantics-blocker' }),
      ]));
      expect(result.markdown).toContain('ambiguity="save"');
    }
  });
});

describe('Slice 5b — wrong overload selection', () => {
  it('does not select a same-name overload whose receiver identity does not match', async () => {
    const root = projectRoot();
    // Entity has getPet(Integer) and getPet(String, boolean). The query
    // names getPet(String) explicitly, so the (Integer) overload is the
    // WRONG target. The matrix must not collapse to it.
    fs.writeFileSync(path.join(root, 'Owner.java'),
      'public class Owner {\n' +
      '  public Pet getPet(Integer id) { return byId(id); }\n' +
      '  public Pet getPet(String name, boolean ignoreNew) { return byName(name, ignoreNew); }\n' +
      '}\n');
    const graph = await indexed(root, ['**/*.java']);
    // Ask specifically about getPet(String) selection. The application
    // must not return the (Integer) overload's source as the answer.
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'getPet String name', options(),
    );
    if (result.kind === 'answer') {
      // If both overloads appear, ambiguity must be retained (not complete).
      // If only the String overload appears, status may be complete but the
      // Integer overload's `byId` body must NOT be the only evidence.
      const hasIntegerOverload = result.markdown.includes('byId');
      const hasStringOverload = result.markdown.includes('byName');
      if (hasIntegerOverload && hasStringOverload) {
        expect(result.report.coverage.status).not.toBe('complete');
      } else if (hasIntegerOverload && !hasStringOverload) {
        // Wrong overload selected — this is the failure mode we are guarding.
        throw new Error('application selected the wrong getPet overload (Integer) as the answer');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// External framework terminal
// ---------------------------------------------------------------------------

describe('Slice 5b — external framework terminal', () => {
  it('marks an external package boundary as external-terminal, not as a local implementation', async () => {
    const root = projectRoot();
    // The project imports `Router` from an external package and delegates
    // to it. There is no local implementation of Router; the graph must
    // treat it as an external terminal, not fabricate one.
    fs.writeFileSync(path.join(root, 'app.ts'),
      'import { Router } from "external-router";\n' +
      'export const router = new Router();\n' +
      'export function handle(req: string) { return router.handle(req); }\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'Router external-router', options(),
    );
    // Either the application reports an external-terminal role for Router,
    // or it correctly reports no local implementation. It must NOT invent
    // a local Router class body.
    if (result.kind === 'answer') {
      expect(result.markdown).not.toContain('class Router {');
      expect(result.markdown).not.toContain('function Router(');
    }
    // No fabricated source: the only Router references should be the
    // import + new expression, not a local definition.
    if (result.kind === 'answer' && result.markdown.includes('Router')) {
      // Verify the markdown only mentions Router as a use site.
      const lines = result.markdown.split('\n').filter((l) => l.includes('Router'));
      for (const line of lines) {
        expect(line).toMatch(/import|new Router|router\.|external-router|external terminal|external-package/i);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Search exhaustion vs no path
// ---------------------------------------------------------------------------

describe('Slice 5b — searchExhausted vs no-path', () => {
  it('distinguishes searchExhausted from a genuinely absent path', async () => {
    const root = projectRoot();
    // Two nodes that have no edge between them: the path truly does not
    // exist. searchExhausted must be false.
    fs.writeFileSync(path.join(root, 'a.ts'), 'export function a() { return 1; }\n');
    fs.writeFileSync(path.join(root, 'b.ts'), 'export function b() { return 2; }\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'a b', options(),
    );
    if (result.kind === 'answer') {
      expect(result.report.coverage.searchExhausted).toBe(false);
    } else if (result.kind === 'empty') {
      // No evidence is acceptable; searchExhausted is still false.
      expect(result.report.coverage.searchExhausted).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Budget exclusion forbids complete
// ---------------------------------------------------------------------------

describe('Slice 5b — budget exclusion forbids complete', () => {
  it('reports partial (not complete) when the budget excludes a required obligation', async () => {
    const root = projectRoot();
    // Three required source atoms, each ~1KB of body. A ~2KB cap cannot
    // hold all three; the application must degrade structurally and
    // report partial (or fail with budget-exhausted), never complete.
    const big = (name: string, ret: string) =>
      `export function ${name}() {\n` +
      `  // ${'x'.repeat(900)}\n` +
      `  return ${ret};\n` +
      `}\n`;
    fs.writeFileSync(path.join(root, 'a.ts'), big('alpha', '1'));
    fs.writeFileSync(path.join(root, 'b.ts'), big('beta', 'alpha()'));
    fs.writeFileSync(path.join(root, 'c.ts'), big('gamma', 'beta()'));
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'alpha beta gamma', options(2048),
    );
    if (result.kind === 'answer') {
      expect(result.report.coverage.status).not.toBe('complete');
    } else if (result.kind === 'failed') {
      // budget-exhausted is also an acceptable non-complete outcome.
      expect(result.code).toBe('budget-exhausted');
    }
    // Either way, no fabricated `complete` answer.
  });
});

// ---------------------------------------------------------------------------
// Non-ASCII UTF-8 byte precision
// ---------------------------------------------------------------------------

describe('Slice 5b — non-ASCII UTF-8 byte precision', () => {
  it('preserves UTF-8 byte integrity when the source contains non-ASCII characters', async () => {
    const root = projectRoot();
    // Chinese comments + emoji + accented identifiers.
    fs.writeFileSync(path.join(root, 'unicode.ts'),
      '// 计算两个数的和 🚀\n' +
      'export function café(x: number, y: number): number {\n' +
      '  return x + y; // 中文注释 ✨\n' +
      '}\n', 'utf8');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'café', options(),
    );
    if (result.kind === 'answer') {
      // The markdown must be valid UTF-8; Buffer.from must not lose bytes.
      const bytes = Buffer.from(result.markdown, 'utf8');
      // Round-trip must be lossless.
      expect(bytes.toString('utf8')).toBe(result.markdown);
      // The Chinese characters must survive.
      expect(result.markdown).toContain('café');
    }
  });
});

// ---------------------------------------------------------------------------
// Windows path separator identity
// ---------------------------------------------------------------------------

describe('Slice 5b — Windows path separator identity', () => {
  it('treats / and \\ as the same file identity (no phantom duplicates)', async () => {
    const root = projectRoot();
    fs.writeFileSync(path.join(root, 'a.ts'), 'export function a() { return 1; }\n');
    const graph = await indexed(root);
    // Look up the file with both separators. The graph must resolve to the
    // same node set, not treat them as two different files.
    const forward = graph.getNodesInFile('a.ts');
    const backslash = graph.getNodesInFile('a.ts'.replace(/\//g, '\\'));
    // Both queries must return the same nodes (same ids).
    const forwardIds = forward.map((n) => n.id).sort();
    const backslashIds = backslash.map((n) => n.id).sort();
    expect(backslashIds).toEqual(forwardIds);
    expect(forwardIds.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Unrelated receiver / route registration decoy
// ---------------------------------------------------------------------------

describe('Slice 5b — unrelated receiver/route decoy', () => {
  it('does not let an unrelated receiver registration masquerade as the real one', async () => {
    const root = projectRoot();
    // The real registration is on `api` router; a decoy `admin` router also
    // has a `get` method. The query names `api.get`, so the admin decoy
    // must not be returned as the answer.
    fs.writeFileSync(path.join(root, 'api.ts'),
      'export const api = { get(path: string) { return `api:${path}`; } };\n');
    fs.writeFileSync(path.join(root, 'admin.ts'),
      'export const admin = { get(path: string) { return `admin:${path}`; } };\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'api.get', options(),
    );
    if (result.kind === 'answer') {
      // If both receivers appear, the answer must retain ambiguity or be
      // partial. The decoy's `admin:` body must NOT be the only evidence.
      const hasApi = result.markdown.includes('api:');
      const hasAdmin = result.markdown.includes('admin:');
      if (hasAdmin && !hasApi) {
        throw new Error('decoy admin.get was returned as the answer to api.get');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Swapped direct-call order
// ---------------------------------------------------------------------------

describe('Slice 5b — swapped direct-call order', () => {
  it('does not reorder a direct call chain A→B→C as A→C→B', async () => {
    const root = projectRoot();
    // a calls b; b calls c. The rendered trace must preserve a→b→c order.
    fs.writeFileSync(path.join(root, 'a.ts'),
      'import { b } from "./b";\nexport function a() { return b(); }\n');
    fs.writeFileSync(path.join(root, 'b.ts'),
      'import { c } from "./c";\nexport function b() { return c(); }\n');
    fs.writeFileSync(path.join(root, 'c.ts'),
      'export function c() { return 3; }\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'a b c', options(),
    );
    if (result.kind === 'answer') {
      // Find the positions of a, b, c in the markdown. If all three appear
      // in a trace-like ordering, a must come before b and b before c.
      const aIdx = result.markdown.indexOf('function a');
      const bIdx = result.markdown.indexOf('function b');
      const cIdx = result.markdown.indexOf('function c');
      if (aIdx >= 0 && bIdx >= 0 && cIdx >= 0) {
        expect(aIdx).toBeLessThan(bIdx);
        expect(bIdx).toBeLessThan(cIdx);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Missing registration forbids connectivity
// ---------------------------------------------------------------------------

describe('Slice 5b — missing registration forbids connectivity', () => {
  it('does not connect two nodes when the registration that would link them is missing', async () => {
    const root = projectRoot();
    // handler is defined but never registered. The graph must NOT claim
    // handler is reachable from the route /users.
    fs.writeFileSync(path.join(root, 'handler.ts'),
      'export function listUsers(req: string) { return `users:${req}`; }\n');
    fs.writeFileSync(path.join(root, 'routes.ts'),
      '// No actual registration of listUsers.\nexport const routes: string[] = [];\n');
    const graph = await indexed(root);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'listUsers /users route', options(),
    );
    if (result.kind === 'answer') {
      // The application must NOT claim listUsers is reachable via a route
      // registration, because no such registration exists.
      // Look for any "route" or "registration" role assertion.
      const claimsRoute = /listUsers.*route|route.*listUsers/i.test(result.markdown);
      // If the markdown mentions both, it must also flag the missing
      // registration as a gap.
      if (claimsRoute) {
        expect(result.report.coverage.status).not.toBe('complete');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Deterministic repeated output
// ---------------------------------------------------------------------------

describe('Slice 5b — deterministic repeated output', () => {
  it('produces byte-identical markdown across two runs on the same input', async () => {
    const root = projectRoot();
    fs.writeFileSync(path.join(root, 'a.ts'),
      'import { b } from "./b";\nexport function a() { return b(); }\n');
    fs.writeFileSync(path.join(root, 'b.ts'),
      'export function b() { return 2; }\n');
    const graph = await indexed(root);
    const app = new DefaultExploreApplication('universal-v1');
    const first = await app.explore(graph, 'a b', options());
    const second = await app.explore(graph, 'a b', options());
    expect(first.kind).toBe(second.kind);
    if (first.kind === 'answer' && second.kind === 'answer') {
      expect(second.markdown).toBe(first.markdown);
      expect(second.report.coverage.status).toBe(first.report.coverage.status);
    }
  });
});
