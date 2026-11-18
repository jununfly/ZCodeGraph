import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';
import { exploreApplication } from '../src/explore/application';
import { readExploreRuntimeOptions } from '../src/explore/runtime';
import {
  CodeGraphExploreGraphRead,
  InMemoryExploreSourceRead,
  RootConfinedExploreSourceRead,
} from '../src/explore/ports';
import { buildExploreRenderModel } from '../src/explore/evidence';
import type { ExplorePlan, Node } from '../src/mcp/explore-types';

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'dist', 'bin', 'zcodegraph.js');
const temporaryDirectories: string[] = [];
const handlers: ToolHandler[] = [];

function temporaryProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-shared-explore-'));
  temporaryDirectories.push(root);
  return root;
}

function cli(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, NODE_OPTIONS: '', ZCG_ALLOW_UNSAFE_NODE: '1', ZCG_NO_DAEMON: '1', ZCG_NO_RELAUNCH: '1', ...env },
  });
}

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(handlers.splice(0).map((handler) => handler.closeAll()));
  for (const root of temporaryDirectories.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('shared ExploreApplication and platform ports', () => {
  it('renders byte-identical application and MCP payloads on a real SQLite CodeGraph', async () => {
    const root = temporaryProject();
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'target.ts'), 'export function target() { return 1; }\n');
    fs.writeFileSync(path.join(root, 'src', 'caller.ts'), 'import { target } from "./target";\nexport function caller() { return target(); }\n');
    const graph = CodeGraph.initSync(root, { config: { include: ['**/*.ts'], exclude: [] } });
    await graph.indexAll({ engine: 'typescript' });
    const application = await exploreApplication.explore(graph, 'target caller', {
      maxFiles: 2, runtime: readExploreRuntimeOptions(),
    });
    expect(application.kind).toBe('answer');
    const handler = new ToolHandler(graph);
    handlers.push(handler);
    const mcp = await handler.execute('zcodegraph_explore', { query: 'target caller', maxFiles: 2 });
    expect(mcp.isError).toBeUndefined();
    expect(application).toEqual({ kind: 'answer', markdown: mcp.content[0].text });
    expect(application.kind === 'answer' && application.markdown).toContain('export function target');

    const port = new CodeGraphExploreGraphRead(graph);
    expect(port.getStats().fileCount).toBe(2);
    const node = graph.searchNodes('target', { limit: 1 })[0]?.node;
    expect(node).toBeDefined();
    expect(port.getNode(node!.id)).toEqual(node);
    expect(port.getOutgoingEdges(node!.id)).toEqual(graph.getOutgoingEdges(node!.id));
    expect(port.getIncomingEdges(node!.id)).toEqual(graph.getIncomingEdges(node!.id));
  });

  it('uses the same application in CLI, with legacy output newline and runtime flags', async () => {
    const root = temporaryProject();
    fs.writeFileSync(path.join(root, 'feature.ts'), 'export function target() { return 1; }\n');
    const indexed = cli(['index', root, '--engine', 'typescript', '--quiet']);
    expect(indexed.status, indexed.stderr).toBe(0);
    const output = cli(['explore', 'target', '--path', root], { ZCG_EXPLORE_LINENUMS: '0' });
    expect(output.status, output.stderr).toBe(0);
    expect(output.stdout).toContain('#### feature.ts');
    expect(output.stdout).not.toMatch(/^1\t/);
    expect(output.stdout.endsWith('\n')).toBe(true);
    // console.log contributes exactly one newline beyond the markdown payload.
    expect(output.stdout.endsWith('\n\n')).toBe(true);
    expect(output.stdout.endsWith('\n\n\n')).toBe(false);
  });

  it('snapshots all runtime flags afresh across two calls on one MCP application', async () => {
    const root = temporaryProject();
    fs.writeFileSync(path.join(root, 'feature.ts'), 'export function target() { return 1; }\n');
    const graph = CodeGraph.initSync(root, { config: { include: ['**/*.ts'], exclude: [] } });
    await graph.indexAll({ engine: 'typescript' });
    const handler = new ToolHandler(graph);
    handlers.push(handler);
    const runtimeFlags = {
      ZCG_ADAPTIVE_EXPLORE: '1',
      ZCG_EXPLORE_LINENUMS: '1',
      ZCG_EXPLORE_ELIDED_MARKERS: '1',
      ZCG_EXPLORE_TIGHT_SMALL_PROJECT: '0',
    };
    for (const [name, value] of Object.entries(runtimeFlags)) vi.stubEnv(name, value);
    const explore = vi.spyOn(exploreApplication, 'explore');

    const first = await handler.execute('zcodegraph_explore', { query: 'target' });
    expect(first.isError).toBeUndefined();
    expect(first.content[0].text).toMatch(/^1\texport function target/m);
    expect(explore).toHaveBeenCalledTimes(1);
    const firstRuntime = explore.mock.calls[0]?.[2].runtime;
    expect(firstRuntime).toEqual({
      adaptiveEnabled: true,
      lineNumbersEnabled: true,
      elidedMarkersEnabled: true,
      tightSmallProjectBudgetEnabled: false,
    });

    for (const [name, value] of Object.entries(runtimeFlags)) {
      vi.stubEnv(name, value === '1' ? '0' : '1');
    }
    const second = await handler.execute('zcodegraph_explore', { query: 'target' });
    expect(second.isError).toBeUndefined();
    expect(second.content[0].text).toContain('export function target');
    expect(second.content[0].text).not.toMatch(/^1\texport function target/m);
    expect(explore).toHaveBeenCalledTimes(2);
    expect(explore.mock.calls[1]?.[2].runtime).toEqual({
      adaptiveEnabled: false,
      lineNumbersEnabled: false,
      elidedMarkersEnabled: false,
      tightSmallProjectBudgetEnabled: true,
    });
    expect(firstRuntime).toEqual({
      adaptiveEnabled: true,
      lineNumbersEnabled: true,
      elidedMarkersEnabled: true,
      tightSmallProjectBudgetEnabled: false,
    });
  });

  it('keeps source reads root-confined and supports an in-memory counterpart', () => {
    const root = temporaryProject();
    fs.writeFileSync(path.join(root, 'inside.ts'), 'inside\n');
    const port = new RootConfinedExploreSourceRead(root);
    expect(port.readText('inside.ts')).toBe('inside\n');
    expect(port.readText('../outside.ts')).toBeUndefined();
    expect(port.readText(path.join(root, '..', 'outside.ts'))).toBeUndefined();
    expect(port.readText('missing.ts')).toBeUndefined();
    expect(new InMemoryExploreSourceRead(new Map([['memory.ts', 'memory']])).readText('memory.ts')).toBe('memory');
  });

  it('materializes graph, registration and stats reads before pure rendering', () => {
    const target = { id: 'target', name: 'target', kind: 'function', filePath: 'feature.ts', startLine: 1, endLine: 1 } as Node;
    const plan = {
      query: 'target', maxFiles: 1, projectRoot: '/unused',
      budget: { includeBudgetNote: true }, sortedFiles: [['feature.ts', { nodes: [target], score: 4 }]],
      fileGroups: new Map(), entries: [], entryNodeIds: new Set([target.id]),
      subgraph: { nodes: new Map([[target.id, target]]), edges: [], entryNodes: [target.id] },
      spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
      adaptiveEnabled: false, glueNodeIds: new Set(), connectedToEntry: new Set(), centralFiles: new Set(),
    } as unknown as ExplorePlan;
    const graph = {
      getOutgoingEdges: vi.fn(() => []), getIncomingEdges: vi.fn(() => []),
      getNode: vi.fn(() => undefined), getStats: vi.fn(() => ({ fileCount: 4 })),
    };
    const source = new InMemoryExploreSourceRead(new Map([['feature.ts', 'target']]));
    const model = buildExploreRenderModel(graph, source, plan, '', readExploreRuntimeOptions());
    expect(model.fileContents.get('feature.ts')).toBe('target');
    expect(model.projectFileCount).toBe(4);
    expect(model.recommendedExploreCalls).toBe(1);
    expect(graph.getOutgoingEdges).toHaveBeenCalledWith(target.id);
    expect(graph.getIncomingEdges).toHaveBeenCalledWith(target.id);
  });
});
