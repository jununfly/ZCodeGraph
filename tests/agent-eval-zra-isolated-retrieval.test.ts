import { describe, expect, it } from 'vitest';
import { runPairedEvaluation } from '../src/eval/zra-paired-runtime';
import type { SharedRunConfig } from '../src/eval/zra-paired-core';
import { composeSymbolOnlyPlan } from '../src/mcp/c-explore-plan';
import { render } from '../src/mcp/render-c-explore-plan';
import type { Node } from '../src/types';
import type { ExplorePlan } from '../src/mcp/explore-types';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const config: SharedRunConfig = {
  taskId: 'isolated-symbol-union-v1',
  modelVersion: 'UNSET',
  prompt: 'trace the handler',
  toolSchema: 'codegraph-v1',
  indexSnapshot: 'fixed-corpus-commit',
  mcpToolSurface: 'explore-v1',
  responseSchema: 'concise-source-cited-v1',
};

describe('isolated ZRA retrieval adapter', () => {
  it('keeps A unchanged, uses the frozen C union, and gives S only a different candidate order', async () => {
    const { createIsolatedSymbolUnionRetrieval } = await import('../scripts/agent-eval/isolated-symbol-union.mjs');
    const groups = new Map(['a.ts', 'b.ts', 'c.ts'].map((file, index) => [file, {
      nodes: [{ name: `symbol-${index}` }], score: 3 - index,
    }]));
    const symbolGroups = new Map(['d.ts', 'e.ts', 'f.ts'].map((file) => [file, {
      count: 1, bm25: 1, names: ['handler'], kinds: ['function'], exported: [true],
    }]));
    const baselinePlan = { sortedFiles: [...groups.entries()], fileGroups: groups };
    const retrieve = createIsolatedSymbolUnionRetrieval({
      planBaseline: async () => baselinePlan,
      symbolRecall: () => ({
        files: ['d.ts', 'e.ts', 'f.ts'], byFile: symbolGroups, qTok: new Set(['handler']),
      }),
    });
    const result = await runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42, retrieve,
      deriveRenderedS: () => ({ source: 'C-answer', order: 'S-fixed-seed' }),
      execute: async () => ({ outcome: 'completed', toolCalls: [] }),
    });
    const [a, c, s] = result.executions;

    expect(result.status).toBe('completed');
    expect(a!.candidates).toEqual([...groups.entries()]);
    // Independent worked example of the frozen formula: position zero in
    // either list contributes .4, position one .36, and position two .32.
    // All symbol-only files therefore precede all plan-only files here.
    expect(c!.candidates.map(([file]) => file)).toEqual(['d.ts', 'e.ts', 'f.ts', 'a.ts', 'b.ts', 'c.ts']);
    expect(c!.candidates.find(([file]) => file === 'd.ts')![1]).toEqual({ nodes: [], score: 0 });
    expect(c!.payload).toMatchObject({ symbolFiles: ['d.ts', 'e.ts', 'f.ts'] });
    expect(s!.payload).toEqual({ source: 'C-answer', order: 'S-fixed-seed' });
    expect(s!.candidates).not.toEqual(c!.candidates);
    expect([...s!.candidates].sort((left, right) => left[0].localeCompare(right[0])))
      .toEqual([...c!.candidates].sort((left, right) => left[0].localeCompare(right[0])));
    expect(result.ledger.consumed('pilot')).toBe(3);
  });

  it('keeps real symbol hits as necessary evidence instead of dropping them as incidental', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'zcodegraph-c-evidence-'));
    writeFileSync(join(projectRoot, 'noise.ts'), 'export function noise() {\n  return "unrelated";\n}\n');
    writeFileSync(join(projectRoot, 'handler.ts'), [
      'export function unrelatedPrefix() {',
      '  return "not the recalled implementation";',
      '}',
      'export function handleRequest() {',
      '  return "the recalled implementation";',
      '}',
    ].join('\n'));
    const noise: Node = {
      id: 'noise-id', name: 'noise', qualifiedName: 'noise', kind: 'function',
      filePath: 'noise.ts', language: 'typescript', startLine: 1, endLine: 3,
    } as Node;
    const prefix: Node = {
      id: 'prefix-id', name: 'unrelatedPrefix', qualifiedName: 'unrelatedPrefix', kind: 'function',
      filePath: 'handler.ts', language: 'typescript', startLine: 1, endLine: 3,
    } as Node;
    const hit: Node = {
      id: 'hit-id', name: 'handleRequest', qualifiedName: 'handleRequest', kind: 'function',
      filePath: 'handler.ts', language: 'typescript', startLine: 4, endLine: 6,
    } as Node;
    const emptyGroup = { nodes: [], score: 0 };
    const handlerGroup = { nodes: [], score: 0, symbolHitIds: new Set([hit.id]) };
    const baseline = {
      query: 'trace request handling',
      budget: {
        maxOutputChars: 2000, maxCharsPerFile: 500, maxFiles: 6,
        maxSymbolsInFileHeader: 8, maxEdgesPerRelationshipKind: 20,
        gapThreshold: 2, includeRelationships: false, includeAdditionalFiles: true,
        includeCompletenessSignal: true, includeBudgetNote: false,
      },
      maxFiles: 6,
      subgraph: { nodes: new Map([['noise-id', noise]]), edges: [], entryNodes: [] },
      entryNodeIds: new Set<string>(), fileGroups: new Map([['noise.ts', { nodes: [noise], score: 1 }]]),
      sortedFiles: [['noise.ts', { nodes: [noise], score: 1 }]],
      spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
      adaptiveEnabled: false, glueNodeIds: new Set(), connectedToEntry: new Set(),
      centralFiles: new Set(), projectRoot, entries: [],
    } as unknown as ExplorePlan;
    const cg = {
      getNodesInFile: (file: string) => file === 'handler.ts' ? [prefix, hit] : [noise],
      getNode: (id: string) => id === hit.id ? hit : undefined,
      getOutgoingEdges: () => [], getIncomingEdges: () => [], getStats: () => ({ fileCount: 2 }),
    };
    const composed = composeSymbolOnlyPlan(cg as any, baseline, [['noise.ts', emptyGroup], ['handler.ts', handlerGroup]]);

    expect(composed.symbolHitNodeIds?.has(hit.id)).toBe(true);
    expect(composed.symbolHitNodeIds?.has(prefix.id)).toBe(false);
    expect(composed.fileGroups.get('handler.ts')?.nodes).toEqual([hit]);
    expect(composed.entries.find((entry) => entry.filePath === 'handler.ts')?.evidenceValue).toBe('critical');
    // The baseline flow remains a separate, unchanged diagnostic signal.
    expect(composed.spine.namedNodeIds.has(hit.id)).toBe(false);
    const answer = render(composed, cg as any, composed.spine, '');
    expect(answer).toContain('#### handler.ts');
    expect(answer).toContain('the recalled implementation');
    expect(answer).not.toContain('elided[file#handler.ts');
  });

  it('renders a specific recalled method without duplicating its class envelope', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'zcodegraph-c-envelope-'));
    writeFileSync(join(projectRoot, 'session.py'), [
      'class SessionInterface:',
      '    def open_session(self, request):',
      '        return "complete recalled method"',
      '',
      '    def other_method(self):',
      '        return "not selected"',
    ].join('\n'));
    const outer: Node = {
      id: 'outer', name: 'SessionInterface', kind: 'class', filePath: 'session.py',
      language: 'python', startLine: 1, endLine: 6,
    } as Node;
    const hit: Node = {
      id: 'hit', name: 'SessionInterface.open_session', kind: 'method', filePath: 'session.py',
      language: 'python', startLine: 2, endLine: 3,
    } as Node;
    const group = { nodes: [outer, hit], score: 3, symbolHitIds: new Set([hit.id]) };
    const baseline = {
      query: 'session loading', budget: {
        maxOutputChars: 2000, maxCharsPerFile: 300, maxFiles: 6,
        maxSymbolsInFileHeader: 8, maxEdgesPerRelationshipKind: 20,
        gapThreshold: 2, includeRelationships: false, includeAdditionalFiles: false,
        includeCompletenessSignal: false, includeBudgetNote: false,
      }, maxFiles: 6,
      subgraph: { nodes: new Map(), edges: [], entryNodes: [] },
      entryNodeIds: new Set<string>(), fileGroups: new Map(), sortedFiles: [],
      spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
      adaptiveEnabled: false, glueNodeIds: new Set(), connectedToEntry: new Set(),
      centralFiles: new Set(), projectRoot, entries: [],
    } as unknown as ExplorePlan;
    const cg = {
      getNodesInFile: () => [outer, hit], getNode: (id: string) => id === outer.id ? outer : hit,
      getOutgoingEdges: () => [], getIncomingEdges: () => [], getStats: () => ({ fileCount: 1 }),
    };
    const composed = composeSymbolOnlyPlan(cg as any, baseline, [['session.py', group]]);
    const answer = render(composed, cg as any, composed.spine, '');
    expect(answer).toContain('complete recalled method');
    expect(answer).toContain('SessionInterface.open_session(method)');
    expect(answer).not.toContain('SessionInterface(class)');
    expect(answer).not.toContain('elided[output#');
    const { render: renderDefault } = await import('../src/mcp/explore-renderer');
    const defaultAnswer = renderDefault(composed, cg as any, composed.spine, '');
    expect(defaultAnswer).toContain('not selected');
  });

  it('keeps another file hit id out of the current file evidence', () => {
    const local: Node = {
      id: 'local', name: 'local', qualifiedName: 'local', kind: 'method',
      filePath: 'local.ts', language: 'typescript', startLine: 1, endLine: 2,
    } as Node;
    const foreign: Node = { ...local, id: 'foreign', filePath: 'other.ts' };
    const baseline = {
      subgraph: { nodes: new Map(), edges: [], entryNodes: [] },
      entryNodeIds: new Set<string>(), fileGroups: new Map(), sortedFiles: [],
      spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
      entries: [],
    } as unknown as ExplorePlan;
    const cg = {
      getNodesInFile: (file: string) => file === 'local.ts' ? [local] : [foreign],
      getNode: (id: string) => id === local.id ? local : foreign,
    };
    const composed = composeSymbolOnlyPlan(cg as any, baseline, [
      ['local.ts', { nodes: [local], score: 1, symbolHitIds: new Set([foreign.id]) }],
      ['other.ts', { nodes: [], score: 0, symbolHitIds: new Set([foreign.id]) }],
    ]);
    expect(composed.fileGroups.get('local.ts')?.nodes).toEqual([]);
    expect(composed.symbolHitNodeIds?.has(local.id)).toBe(false);
    expect(composed.symbolHitNodeIds?.has(foreign.id)).toBe(true);
    expect(composed.fileGroups.get('other.ts')?.nodes).toEqual([foreign]);
  });

  it('verifies the frozen C configuration without opening a corpus or building an index', async () => {
    const { verifyFrozenSymbolUnionCandidate } = await import('../scripts/agent-eval/isolated-symbol-union.mjs');
    expect(verifyFrozenSymbolUnionCandidate()).toEqual({
      candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
      rawSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      lineEndingNormalization: 'CRLF-to-LF-only',
      symbolTopK: 50,
      fileTopK: 10,
      unionRerank: '0.4*planPos + 0.4*symPos + 0.2*termAlign',
    });
  });
});
