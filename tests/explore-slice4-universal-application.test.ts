import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { DefaultExploreApplication } from '../src/explore/application';
import { minimumExploreErrorUtf8Bytes, prepareExploreDelivery } from '../src/explore/delivery';
import { CapBelowProtocolMinimumError } from '../src/explore/exhausted';
import { readExploreRuntimeOptions } from '../src/explore/runtime';
import type { ExploreOptions } from '../src/explore/types';

const temporaryDirectories: string[] = [];
const graphs: CodeGraph[] = [];

function project(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-universal-slice4-'));
  temporaryDirectories.push(root);
  fs.writeFileSync(path.join(root, 'target.ts'), 'export function target() { return 1; }\n');
  fs.writeFileSync(path.join(root, 'caller.ts'), 'import { target } from "./target";\nexport function caller() { return target(); }\n');
  fs.writeFileSync(path.join(root, 'registered.py'), 'def route(path):\n    def wrap(fn):\n        return fn\n    return wrap\n\n@route("/registered")\ndef registered():\n    return target()\n');
  return root;
}

function options(cap = 8192, overrides: Partial<ExploreOptions> = {}): ExploreOptions {
  return {
    maxFiles: 2,
    runtime: readExploreRuntimeOptions(),
    delivery: prepareExploreDelivery(cap, [], 0),
    ...overrides,
  };
}

async function indexed(root: string): Promise<CodeGraph> {
  const graph = CodeGraph.initSync(root, { config: { include: ['**/*.ts'], exclude: [] } });
  graphs.push(graph);
  await graph.indexAll({ engine: 'typescript' });
  return graph;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(graphs.splice(0).map(async (graph) => graph.close()));
  for (const root of temporaryDirectories.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Slice 4 universal application integration', () => {
  it('uses one explicitly selected universal policy and returns verified source', async () => {
    const graph = await indexed(project());
    const application = new DefaultExploreApplication('universal-v1');
    const result = await application.explore(graph, 'target caller', options());
    expect(result.kind).toBe('answer');
    expect(result.kind === 'answer' && result.markdown).toContain('export function target');
    expect(result.kind === 'answer' && result.markdown).toContain('export function caller');
    expect(result.kind === 'answer' && result.report.coverage.selectedRequirements).toBe(2);
    expect(result.kind === 'answer' && result.markdown).not.toContain('## Exploration:');
  });

  it('keeps duplicate clues for the same symbol as one coherent evidence requirement', async () => {
    const graph = await indexed(project());
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'target target.ts', options(),
    );
    expect(result).toMatchObject({ kind: 'answer' });
    expect(result.kind === 'answer' && result.markdown).toContain('export function target');
    expect(result.kind === 'answer' && result.report.status).toBe('complete');
  });

  it('keeps default construction on legacy composition without reading the implementation env flag', async () => {
    vi.stubEnv('ZCG_EXPLORE_UNIVERSAL_IMPLEMENTATION', 'universal-v1');
    const graph = await indexed(project());
    const result = await new DefaultExploreApplication().explore(graph, 'target', {
      maxFiles: 2, runtime: readExploreRuntimeOptions(),
    });
    expect(result.kind).toBe('answer');
    expect(result.kind === 'answer' && result.markdown).toContain('## Exploration: target');
    vi.unstubAllEnvs();
  });

  it('does not reinterpret delivered-file maxFiles as stopping cross-file discovery', async () => {
    const graph = await indexed(project());
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'target caller', options(8192, { maxFiles: 1 }),
    );
    expect(result.kind).toBe('answer');
    expect(result.kind === 'answer' && result.markdown).toContain('target.ts');
    expect(result.kind === 'answer' && result.markdown).toContain('caller.ts');
    expect(result.kind === 'answer' && result.report.status).toBe('partial');
  });

  it('distinguishes source-changed and source-unavailable from no-evidence', async () => {
    const root = project();
    const graph = await indexed(root);
    const application = new DefaultExploreApplication('universal-v1');
    fs.writeFileSync(path.join(root, 'target.ts'), 'export function target() { return 999; }\n');
    const changed = await application.explore(graph, 'target', options());
    expect(changed).toMatchObject({ kind: 'failed', code: 'source-changed' });
    fs.unlinkSync(path.join(root, 'target.ts'));
    const missing = await application.explore(graph, 'target', options());
    expect(missing).toMatchObject({ kind: 'failed', code: 'source-unavailable' });
  });

  it('reports oversized source separately from changed and unavailable source', async () => {
    const root = project();
    const graph = await indexed(root);
    fs.appendFileSync(path.join(root, 'target.ts'), `// ${'x'.repeat(1024 * 1024)}\n`);
    const result = await new DefaultExploreApplication('universal-v1').explore(graph, 'target', options());
    expect(result).toMatchObject({ kind: 'failed', code: 'source-too-large' });
  });

  it('reports cancellation and snapshot invalidation as failures', async () => {
    const graph = await indexed(project());
    const application = new DefaultExploreApplication('universal-v1');
    const controller = new AbortController();
    controller.abort();
    const aborted = await application.explore(graph, 'target', options(8192, { signal: controller.signal }));
    expect(aborted).toMatchObject({ kind: 'failed', code: 'aborted' });
    const stats = graph.getStats();
    let firstRead = true;
    vi.spyOn(graph, 'getStats').mockImplementation(() => {
      if (firstRead) {
        firstRead = false;
        return stats;
      }
      return { ...stats, dbSizeBytes: stats.dbSizeBytes + 1 };
    });
    const lost = await application.explore(graph, 'target', options());
    expect(lost).toMatchObject({ kind: 'failed', code: 'snapshot-lost' });
  });

  it('checks the final stats read against the same snapshot before delivery', async () => {
    const graph = await indexed(project());
    const stats = graph.getStats();
    const originalGetStats = graph.getStats.bind(graph);
    let reads = 0;
    vi.spyOn(graph, 'getStats').mockImplementation(() => {
      reads += 1;
      // Invalidate only the final observed read; snapshot creation and anchor
      // validation must succeed so this test reaches the delivery boundary.
      return reads === 3 ? { ...stats, dbSizeBytes: stats.dbSizeBytes + 1 } : originalGetStats();
    });
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'target', options(),
    );
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(result).toMatchObject({ kind: 'failed', code: 'snapshot-lost' });
  });

  it('contains project root acquisition failures at the operation boundary', async () => {
    const graph = await indexed(project());
    vi.spyOn(graph, 'getProjectRoot').mockImplementation(() => {
      throw new Error('project root unavailable');
    });
    await expect(new DefaultExploreApplication('universal-v1').explore(
      graph, 'target', options(),
    )).resolves.toMatchObject({ kind: 'failed', code: 'graph-unavailable' });
  });

  it('validates an impossible cap before opening a snapshot or planning', async () => {
    const graph = await indexed(project());
    const minimum = minimumExploreErrorUtf8Bytes([], 0);
    await expect(new DefaultExploreApplication('universal-v1').explore(
      graph, 'target', options(8192, { delivery: {
        maxOutputUtf8Bytes: minimum - 1,
        transportReservation: { utf8Bytes: 0 },
        optionalCliNewlineBytes: 0,
        minimumErrorUtf8Bytes: minimum,
      } }),
    )).rejects.toBeInstanceOf(CapBelowProtocolMinimumError);
  });

  it('keeps missing relationship sites visible instead of substituting a definition', async () => {
    const graph = await indexed(project());
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'target registration', options(),
    );
    expect(result.kind).toBe('answer');
    expect(result.kind === 'answer' && result.markdown).toContain('### Trace and residuals');
    expect(result.kind === 'answer' && result.markdown).toContain('graph-semantics-blocker');
    expect(result.kind === 'answer' && result.report.status).toBe('partial');
    expect(result.kind === 'answer' && result.report.coverage.obligations.some((obligation) =>
      obligation.role === 'registration-site' && obligation.disposition === 'unresolved')).toBe(true);
  });

  it('keeps a known relationship without a usable site as a graph-semantics gap', async () => {
    const root = project();
    const graph = CodeGraph.initSync(root, { config: { include: ['**/*.py'], exclude: [] } });
    graphs.push(graph);
    await graph.indexAll({ engine: 'typescript' });
    const anchor = graph.getNodesByName('registered').find((node) => node.kind === 'function');
    const decorator = graph.getNodesByName('route').find((node) => node.kind === 'function');
    expect(anchor).toBeDefined();
    expect(decorator).toBeDefined();
    const originalGetOutgoingEdges = graph.getOutgoingEdges.bind(graph);
    vi.spyOn(graph, 'getOutgoingEdges').mockImplementation((nodeId) => [
      ...originalGetOutgoingEdges(nodeId),
      ...nodeId === anchor!.id ? [{
        source: anchor!.id, target: decorator!.id, kind: 'decorates' as const,
        edgeOrigin: 'tree-sitter' as const, metadata: {},
      }] : [],
    ]);
    const result = await new DefaultExploreApplication('universal-v1').explore(
      graph, 'registered registration', options(),
    );
    expect(result.kind).toBe('answer');
    expect(result.kind === 'answer' && result.report.omissions).toContainEqual(expect.objectContaining({
      id: expect.stringContaining('req-registration-site'),
      reason: 'graph-semantics-blocker',
    }));
    expect(result.kind === 'answer' && result.report.omissions).not.toContainEqual(expect.objectContaining({
      id: expect.stringContaining('req-registration-site'),
      reason: 'source-unavailable',
    }));
  });

  it('returns a deterministic no-evidence result for a missing symbol', async () => {
    const graph = await indexed(project());
    const result = await new DefaultExploreApplication('universal-v1').explore(graph, 'nonexistentSymbol', options());
    expect(result.kind).toBe('empty');
    expect(result.kind === 'empty' && result.text).not.toContain('source-unavailable');
  });
});
