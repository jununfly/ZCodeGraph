import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { render } from '../src/mcp/explore-renderer';
import type { ExplorePlan } from '../src/mcp/explore-types';
import { buildExploreRenderModel } from '../src/explore/evidence';
import { readExploreRuntimeOptions } from '../src/explore/runtime';
import { CodeGraphExploreGraphRead, RootConfinedExploreSourceRead } from '../src/explore/ports';

const emptyFlow = {
  text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(),
  uniqueNamedNodeIds: new Set<string>(),
};

function symbol(id: string, filePath: string): Node {
  return {
    id, name: id, kind: 'function', filePath, startLine: 1, endLine: 1,
    language: 'typescript',
  } as Node;
}

function planFor(root: string, files: Array<[string, Node]>): ExplorePlan {
  const sortedFiles = files.map(([file, node]) => [file, { nodes: [node], score: 10 }] as const);
  return {
    query: 'legacy source',
    budget: {
      maxOutputChars: 24_000, defaultMaxFiles: 8, maxCharsPerFile: 8_000,
      maxFiles: 8, maxSymbolsInFileHeader: 8, maxEdgesPerRelationshipKind: 20,
      gapThreshold: 15, includeRelationships: false, includeAdditionalFiles: true,
      includeCompletenessSignal: true, includeBudgetNote: true, excludeLowValueFiles: false,
    },
    maxFiles: 2,
    subgraph: { nodes: new Map(files.map(([, node]) => [node.id, node])), edges: [], entryNodes: [] },
    entryNodeIds: new Set(), fileGroups: new Map(sortedFiles), sortedFiles: [...sortedFiles],
    entries: [], spine: emptyFlow, adaptiveEnabled: false, glueNodeIds: new Set(),
    connectedToEntry: new Set(), centralFiles: new Set(), projectRoot: root,
  };
}

function renderLegacy(plan: ExplorePlan, graph: CodeGraph, blastRadius = ''): string {
  const model = buildExploreRenderModel(
    new CodeGraphExploreGraphRead(graph),
    new RootConfinedExploreSourceRead(plan.projectRoot),
    plan,
    blastRadius,
    readExploreRuntimeOptions(),
  );
  return render(model);
}

function graphWithCallback(edge: Edge, target: Node): CodeGraph {
  return {
    getOutgoingEdges: (id: string) => id === edge.source ? [edge] : [],
    getIncomingEdges: () => [],
    getNode: (id: string) => id === target.id ? target : undefined,
    getStats: () => { throw new Error('stats unavailable'); },
  } as unknown as CodeGraph;
}

describe('legacy source materialization', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-legacy-source-'));
    fs.mkdirSync(path.join(root, 'src'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('skips missing files without consuming the successful-file cap and preserves the old remainder indexing', () => {
    fs.writeFileSync(path.join(root, 'src', 'readable.ts'), 'export const readable = true;\n');
    fs.writeFileSync(path.join(root, 'src', 'last.ts'), 'export const last = true;\n');
    const plan = planFor(root, [
      ['src/missing.ts', symbol('missing', 'src/missing.ts')],
      ['src/readable.ts', symbol('readable', 'src/readable.ts')],
      ['src/last.ts', symbol('last', 'src/last.ts')],
    ]);

    const output = renderLegacy(plan, graphWithCallback({ source: '', target: '', kind: 'calls' }, symbol('unused', 'src/unused.ts')));
    expect(output).toContain('#### src/readable.ts');
    expect(output).toContain('#### src/last.ts');
    expect(output).not.toContain('#### src/missing.ts');
    // Legacy slice(filesIncluded) is not a set of actually rendered files.
    expect(output).toMatch(/Not shown above[\s\S]*src\/last\.ts/);
    expect(output).toContain('Complete source for 2 files');
    expect(output).not.toContain('Explore budget:');
  });

  it('treats a directory at a source path as unreadable and continues to later files', () => {
    fs.mkdirSync(path.join(root, 'src', 'unreadable.ts'));
    fs.writeFileSync(path.join(root, 'src', 'readable.ts'), 'export const readable = true;\n');
    const plan = planFor(root, [
      ['src/unreadable.ts', symbol('unreadable', 'src/unreadable.ts')],
      ['src/readable.ts', symbol('readable', 'src/readable.ts')],
    ]);
    plan.maxFiles = 1;

    const output = renderLegacy(plan, graphWithCallback({ source: '', target: '', kind: 'calls' }, symbol('unused', 'src/unused.ts')));
    expect(output).toContain('#### src/readable.ts');
    expect(output).not.toContain('#### src/unreadable.ts');
    expect(output).toContain('Complete source for 1 files');
  });

  it('uses registration metadata before disk, falls back to its source line, and degrades to a bare callback', () => {
    const source = symbol('register', 'src/registry.ts');
    const target = symbol('listener', 'src/listener.ts');
    fs.writeFileSync(path.join(root, 'src', 'registry.ts'), 'events.on("change", listener);\n');
    fs.writeFileSync(path.join(root, 'src', 'listener.ts'), 'export const listener = () => {};\n');
    const plan = planFor(root, [['src/registry.ts', source]]);
    plan.subgraph.entryNodes = [source.id];
    plan.subgraph.nodes.set(target.id, target);
    const edge: Edge = {
      source: source.id, target: target.id, kind: 'calls', edgeOrigin: 'heuristic',
      metadata: {
        synthesizedBy: 'callback', via: 'events.on', registeredAt: 'src/registry.ts:1',
        registrationSnippet: 'indexed registration text',
      },
    };
    plan.subgraph.edges = [edge];
    const graph = graphWithCallback(edge, target);

    const indexed = renderLegacy(plan, graph);
    expect(indexed).toContain('indexed registration text');
    expect(indexed).not.toContain('— `events.on("change", listener);`');

    const withoutMetadata: Edge = {
      ...edge, metadata: { synthesizedBy: 'callback', via: 'events.on', registeredAt: 'src/registry.ts:1' },
    };
    plan.subgraph.edges = [withoutMetadata];
    const diskGraph = graphWithCallback(withoutMetadata, target);
    const fallback = renderLegacy(plan, diskGraph);
    expect(fallback).toContain('events.on("change", listener);');

    fs.rmSync(path.join(root, 'src', 'registry.ts'));
    const missing = renderLegacy(plan, diskGraph);
    expect(missing).toContain('callback via `events.on` @src/registry.ts:1');
    expect(missing).not.toContain('events.on("change", listener);');
    expect(missing).not.toContain('Explore budget:');
  });
});
