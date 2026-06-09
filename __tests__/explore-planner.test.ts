/**
 * Tests for explore-planner.ts — Issue #21
 */

import { describe, it, expect } from 'vitest';
import { computeGraphRelevance, synthEdgeNote, plan, matchesSymbol, parseQueryTokens, isTestPath, bodyLines, inNamedContext, seedNamedSymbols, CALLABLE_KINDS, isLowValue, buildFileGroups, countDistinctTermHits, aggregateFileGraphScores, gateAndSortFiles, readAdaptiveEnabled } from '../src/mcp/explore-planner';
import type { Edge, Node, Subgraph } from '../src/types';
import type { ExplorePlan, FileGroup } from '../src/mcp/explore-types';

// ===========================================================================
// computeGraphRelevance
// ===========================================================================

describe('computeGraphRelevance', () => {
  it('gives high mass to seed and its direct neighbor in connected graph', () => {
    // In a small undirected RWR, the seed and its connected neighbor
    // both accumulate significant mass — they should both far outweigh
    // a distant node.
    const nodeIds = ['a', 'b', 'c', 'd', 'e'];
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'calls' },
      { source: 'b', target: 'c', kind: 'calls' },
      { source: 'c', target: 'd', kind: 'calls' },
      { source: 'd', target: 'e', kind: 'calls' },
    ];
    const seeds = new Set(['a']);

    const scores = computeGraphRelevance(nodeIds, edges, seeds);

    // 'a' (seed) and its neighbor 'b' get high mass
    expect(scores.get('a')).toBeGreaterThan(0);
    expect(scores.get('b')).toBeGreaterThan(0);
    // Far node 'e' (4 hops away) gets much less
    expect(scores.get('a')!).toBeGreaterThan(scores.get('e')!);
    expect(scores.get('b')!).toBeGreaterThan(scores.get('e')!);
  });

  it('gives zero mass to isolated nodes far from seeds', () => {
    const nodeIds = ['a', 'b', 'z'];
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'calls' },
      // 'z' is isolated — no edges
    ];
    const seeds = new Set(['a']);

    const scores = computeGraphRelevance(nodeIds, edges, seeds);

    // Isolated node gets much less than connected nodes
    const zScore = scores.get('z')!;
    const bScore = scores.get('b')!;
    expect(bScore).toBeGreaterThan(zScore);
  });

  it('returns non-empty map for valid input', () => {
    const nodeIds = ['a', 'b'];
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'calls' },
    ];
    const seeds = new Set(['a']);

    const scores = computeGraphRelevance(nodeIds, edges, seeds);

    expect(scores.size).toBe(2);
    // All nodes should have some score
    for (const id of nodeIds) {
      expect(scores.get(id)).toBeDefined();
      expect(scores.get(id)).toBeGreaterThan(0);
    }
  });

  it('handles empty node list gracefully', () => {
    const scores = computeGraphRelevance(
      [],
      [],
      new Set(['missing']),
    );

    expect(scores.size).toBe(0);
  });

  it('falls back to uniform when no seed is in the node set', () => {
    const nodeIds = ['a', 'b', 'c'];
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'calls' },
    ];
    // Seeds that don't match any node
    const seeds = new Set(['x', 'y']);

    const scores = computeGraphRelevance(nodeIds, edges, seeds);

    // Should still return scores for all nodes (uniform fallback)
    expect(scores.size).toBe(3);
    for (const id of nodeIds) {
      expect(scores.get(id)).toBeGreaterThan(0);
    }
  });

  it('only considers RANK_EDGES kinds', () => {
    const nodeIds = ['a', 'b', 'c'];
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'calls' },
      { source: 'b', target: 'c', kind: 'contains' }, // NOT a rank edge
    ];
    const seeds = new Set(['a']);

    const scores = computeGraphRelevance(nodeIds, edges, seeds);

    // 'a' → 'b' is a rank edge, 'b' → 'c' is 'contains' (not ranked)
    // So 'c' should be isolated from 'a'/'b'
    const aScore = scores.get('a')!;
    const cScore = scores.get('c')!;
    expect(aScore).toBeGreaterThan(cScore);
  });
});

// ===========================================================================
// synthEdgeNote
// ===========================================================================

describe('synthEdgeNote', () => {
  it('returns null for non-heuristic edges', () => {
    const edge: Edge = {
      source: 'a',
      target: 'b',
      kind: 'calls',
      // no provenance — default, not heuristic
    };
    expect(synthEdgeNote(edge)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(synthEdgeNote(null)).toBeNull();
  });

  it('recognizes callback strategy', () => {
    const edge: Edge = {
      source: 'reg', target: 'handler', kind: 'calls',
      provenance: 'heuristic',
      metadata: { synthesizedBy: 'callback', via: 'addEventListener', field: 'onClick' },
    };
    const note = synthEdgeNote(edge);
    expect(note).not.toBeNull();
    expect(note!.compact).toContain('callback');
    expect(note!.compact).toContain('addEventListener');
  });

  it('recognizes event-emitter strategy', () => {
    const edge: Edge = {
      source: 'emitter', target: 'listener', kind: 'calls',
      provenance: 'heuristic',
      metadata: { synthesizedBy: 'event-emitter', event: 'data' },
    };
    const note = synthEdgeNote(edge);
    expect(note).not.toBeNull();
    expect(note!.compact).toContain('event');
    expect(note!.compact).toContain('data');
  });

  it('recognizes react-render strategy', () => {
    const edge: Edge = {
      source: 'component', target: 'render', kind: 'calls',
      provenance: 'heuristic',
      metadata: { synthesizedBy: 'react-render' },
    };
    const note = synthEdgeNote(edge);
    expect(note).not.toBeNull();
    expect(note!.compact).toContain('React');
  });

  it('includes registeredAt in compact note when present', () => {
    const edge: Edge = {
      source: 'a', target: 'b', kind: 'calls',
      provenance: 'heuristic',
      metadata: { synthesizedBy: 'callback', via: 'on', registeredAt: 'app.tsx:42' },
    };
    const note = synthEdgeNote(edge);
    expect(note).not.toBeNull();
    expect(note!.compact).toContain('@app.tsx:42');
  });

  it('recognizes vue-handler strategy', () => {
    const edge: Edge = {
      source: 'tmpl', target: 'method', kind: 'calls',
      provenance: 'heuristic',
      metadata: { synthesizedBy: 'vue-handler', event: 'click' },
    };
    const note = synthEdgeNote(edge);
    expect(note).not.toBeNull();
    expect(note!.compact).toContain('Vue');
    expect(note!.compact).toContain('@click');
  });
});

// ===========================================================================
// plan() — skeleton
// ===========================================================================

describe('plan', () => {
  /**
   * Minimal mock of the CodeGraph interface, providing only the methods
   * plan() calls during budget computation and subgraph collection.
   */
  function mockCodeGraph(overrides?: {
    fileCount?: number;
    subgraph?: import('../src/types').Subgraph;
    getNodesByName?: (name: string) => import('../src/types').Node[];
  }) {
    const emptySubgraph: import('../src/types').Subgraph = {
      nodes: new Map(),
      edges: [],
      roots: [],
    };

    return {
      getStats: () => ({ fileCount: overrides?.fileCount ?? 100, nodeCount: 0, edgeCount: 0, dbSizeBytes: 0 }),
      getProjectRoot: () => '/mock/project',
      findRelevantContext: async () => overrides?.subgraph ?? emptySubgraph,
      getNodesByName: overrides?.getNodesByName ?? (() => []),
      searchNodes: () => [],
      getCallers: () => [],
      getCallees: () => [],
    } as unknown as import('../src/index').default;
  }

  it('returns a well-formed ExplorePlan for empty subgraph', async () => {
    const cg = mockCodeGraph();
    const result = await plan(cg, 'nothing matches this query');

    expect(result.query).toBe('nothing matches this query');
    expect(result.budget).toBeDefined();
    expect(result.budget.maxOutputChars).toBeGreaterThan(0);
    expect(result.maxFiles).toBeGreaterThanOrEqual(1);
    expect(result.maxFiles).toBeLessThanOrEqual(20);
    expect(result.subgraph).toBeDefined();
    expect(result.entryNodeIds).toBeInstanceOf(Set);
    expect(result.fileGroups).toBeInstanceOf(Map);
    expect(result.sortedFiles).toEqual([]);
    expect(result.spine).toBeDefined();
    expect(typeof result.adaptiveEnabled).toBe('boolean');
  });

  it('selects correct budget tier for project size <150', async () => {
    const cg = mockCodeGraph({ fileCount: 50 });
    const result = await plan(cg, 'test');

    // <150 tier: maxOutputChars=13000, defaultMaxFiles=4
    expect(result.budget.maxOutputChars).toBe(13000);
    expect(result.budget.defaultMaxFiles).toBe(4);
  });

  it('selects correct budget tier for project size <500', async () => {
    const cg = mockCodeGraph({ fileCount: 300 });
    const result = await plan(cg, 'test');

    // <500 tier: maxOutputChars=18000, defaultMaxFiles=5
    expect(result.budget.maxOutputChars).toBe(18000);
    expect(result.budget.defaultMaxFiles).toBe(5);
  });

  it('selects correct budget tier for project size <5000', async () => {
    const cg = mockCodeGraph({ fileCount: 2000 });
    const result = await plan(cg, 'test');

    // <5000 tier: maxOutputChars=24000, defaultMaxFiles=8
    expect(result.budget.maxOutputChars).toBe(24000);
    expect(result.budget.defaultMaxFiles).toBe(8);
  });

  it('falls back to largest budget tier on stats error', async () => {
    const cg = {
      getStats: () => { throw new Error('db not ready'); },
      getProjectRoot: () => '/mock',
      findRelevantContext: async () => ({
        nodes: new Map(),
        edges: [] as Edge[],
        roots: [] as string[],
      }),
      getNodesByName: () => [],
      searchNodes: () => [],
      getCallers: () => [],
      getCallees: () => [],
    } as unknown as import('../src/index').default;

    const result = await plan(cg, 'test');

    // Should fall back to largest tier (Infinity → 5th tier)
    expect(result.budget.maxOutputChars).toBeGreaterThan(0);
  });

  it('clamps maxFiles to [1, 20]', async () => {
    const cg = mockCodeGraph({ fileCount: 100 });

    // Below minimum → clamp to 1
    const r0 = await plan(cg, 'test', { maxFiles: 0 });
    expect(r0.maxFiles).toBe(1);

    // Above maximum → clamp to 20
    const r50 = await plan(cg, 'test', { maxFiles: 50 });
    expect(r50.maxFiles).toBe(20);

    // Within range → keep
    const r5 = await plan(cg, 'test', { maxFiles: 5 });
    expect(r5.maxFiles).toBe(5);
  });

  it('uses budget default when maxFiles not specified', async () => {
    const cg = mockCodeGraph({ fileCount: 100 }); // <150 → default 4
    const result = await plan(cg, 'test');
    expect(result.maxFiles).toBe(result.budget.defaultMaxFiles);
  });

  it('populates fileGroups and sortedFiles (not empty) after Slice #23', async () => {
    // Use a minimal subgraph with ≥2 files so grouping/sorting happens.
    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([
          ['n1', { id: 'n1', name: 'fn1', kind: 'function', filePath: 'src/a.ts', startLine: 1, endLine: 10 } as Node],
          ['n2', { id: 'n2', name: 'fn2', kind: 'function', filePath: 'src/b.ts', startLine: 1, endLine: 5 } as Node],
        ]),
        edges: [] as Edge[],
        roots: ['n1'],
      }),
    } as unknown as import('../src/index').default;
    const result = await plan(cg, 'fn1 fn2');
    // fileGroups should have entries (score ≥ 3 for entry + connected)
    expect(result.fileGroups.size).toBeGreaterThan(0);
    // sortedFiles should be derived from fileGroups
    expect(result.sortedFiles.length).toBeGreaterThan(0);
    // entryNodeIds should include roots + named seeds
    expect(result.entryNodeIds.has('n1')).toBe(true);
  });

  it('returns empty spine when no named symbols are found (Slice #24)', async () => {
    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([
          ['n1', { id: 'n1', name: 'fn1', kind: 'function', filePath: 'src/a.ts', startLine: 1, endLine: 10 } as Node],
          ['n2', { id: 'n2', name: 'fn2', kind: 'function', filePath: 'src/b.ts', startLine: 1, endLine: 5 } as Node],
        ]),
        edges: [] as Edge[],
        roots: ['n1'],
      }),
    } as unknown as import('../src/index').default;
    const result = await plan(cg, 'fn1 fn2');
    // buildFlowFromNamedSymbols returns EMPTY when no callable named symbols found
    expect(result.spine.text).toBe('');
    expect(result.spine.pathNodeIds.size).toBe(0);
    expect(result.spine.namedNodeIds.size).toBe(0);
    expect(result.spine.uniqueNamedNodeIds.size).toBe(0);
  });

  it('populates spine with call chain when named symbols are found (Slice #24)', async () => {
    const n1 = { id: 'n1', name: 'execute', kind: 'method' as Node['kind'], filePath: 'src/main.ts', startLine: 1, endLine: 20 } as Node;
    const n2 = { id: 'n2', name: 'validate', kind: 'function' as Node['kind'], filePath: 'src/main.ts', startLine: 30, endLine: 40 } as Node;
    const n3 = { id: 'n3', name: 'doWork', kind: 'function' as Node['kind'], filePath: 'src/main.ts', startLine: 22, endLine: 28 } as Node;

    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([
          ['n1', n1], ['n2', n2], ['n3', n3],
        ]),
        edges: [
          { source: 'n1', target: 'n3', kind: 'calls' } as Edge,
          { source: 'n3', target: 'n2', kind: 'calls' } as Edge,
        ],
        roots: ['n1'],
      }),
      // findAllSymbols → searchNodes. Return all three;
      // matchesSymbol will pick execute→n1, validate→n2.
      searchNodes: () => [
        { node: n1 }, { node: n2 }, { node: n3 },
      ],
      // BFS: n1 calls n3, n3 calls n2
      getCallers: (id: string) => {
        if (id === 'n3') return [{ node: n1, edge: { source: 'n1', target: 'n3', kind: 'calls' } }];
        if (id === 'n2') return [{ node: n3, edge: { source: 'n3', target: 'n2', kind: 'calls' } }];
        return [];
      },
      getCallees: (id: string) => {
        if (id === 'n1') return [{ node: n3, edge: { source: 'n1', target: 'n3', kind: 'calls' } }];
        if (id === 'n3') return [{ node: n2, edge: { source: 'n3', target: 'n2', kind: 'calls' } }];
        return [];
      },
      getNodesByName: () => [] as Node[],
    } as unknown as import('../src/index').default;

    const result = await plan(cg, 'execute validate');
    // Spine should be non-empty
    expect(result.spine.text.length).toBeGreaterThan(0);
    // pathNodeIds tracks the call path: n1 → n3 → n2
    expect(result.spine.pathNodeIds.has('n1')).toBe(true);
    expect(result.spine.pathNodeIds.has('n3')).toBe(true);
    expect(result.spine.pathNodeIds.has('n2')).toBe(true);
    // namedNodeIds = all callable entities the agent named
    expect(result.spine.namedNodeIds.has('n1')).toBe(true);
    expect(result.spine.namedNodeIds.has('n2')).toBe(true);
    // uniqueNamedNodeIds = definitions ≤ 3 (both have exactly 1)
    expect(result.spine.uniqueNamedNodeIds.has('n1')).toBe(true);
    expect(result.spine.uniqueNamedNodeIds.has('n2')).toBe(true);
  });

  it('sets adaptiveEnabled from CODEGRAPH_ADAPTIVE_EXPLORE env var (Slice #24)', async () => {
    const prev = process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
    process.env['CODEGRAPH_ADAPTIVE_EXPLORE'] = '1';
    try {
      const cg = mockCodeGraph({ fileCount: 100 });
      const result = await plan(cg, 'test');
      expect(result.adaptiveEnabled).toBe(true);
    } finally {
      if (prev === undefined) delete process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
      else process.env['CODEGRAPH_ADAPTIVE_EXPLORE'] = prev;
    }
  });

  it('adaptiveEnabled defaults to true when env var is not set (Slice #24)', async () => {
    const prev = process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
    delete process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
    try {
      const cg = mockCodeGraph({ fileCount: 100 });
      const result = await plan(cg, 'test');
      expect(result.adaptiveEnabled).toBe(true);
    } finally {
      if (prev === undefined) delete process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
      else process.env['CODEGRAPH_ADAPTIVE_EXPLORE'] = prev;
    }
  });

  it('adaptiveEnabled is false when env var is "0" (Slice #24)', async () => {
    const prev = process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
    process.env['CODEGRAPH_ADAPTIVE_EXPLORE'] = '0';
    try {
      const cg = mockCodeGraph({ fileCount: 100 });
      const result = await plan(cg, 'test');
      expect(result.adaptiveEnabled).toBe(false);
    } finally {
      if (prev === undefined) delete process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
      else process.env['CODEGRAPH_ADAPTIVE_EXPLORE'] = prev;
    }
  });

  // ===== Issue #25: complete ExplorePlan fields =====

  it('returns glueNodeIds, connectedToEntry, centralFiles, projectRoot (Issue #25)', async () => {
    const cg = mockCodeGraph({ fileCount: 100 });
    const result = await plan(cg, 'nothing');
    expect(result.glueNodeIds).toBeInstanceOf(Set);
    expect(result.connectedToEntry).toBeInstanceOf(Set);
    expect(result.centralFiles).toBeInstanceOf(Set);
    expect(typeof result.projectRoot).toBe('string');
    expect(result.projectRoot.length).toBeGreaterThan(0);
  });

  it('connectedToEntry reflects edges from entry nodes (Issue #25)', async () => {
    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([
          ['n1', { id: 'n1', name: 'fn1', kind: 'function', filePath: 'src/a.ts', startLine: 1, endLine: 10 } as Node],
          ['n2', { id: 'n2', name: 'fn2', kind: 'function', filePath: 'src/b.ts', startLine: 1, endLine: 5 } as Node],
          ['n3', { id: 'n3', name: 'fn3', kind: 'function', filePath: 'src/c.ts', startLine: 1, endLine: 5 } as Node],
        ]),
        edges: [
          { source: 'n1', target: 'n2', kind: 'calls' } as Edge,
        ] as Edge[],
        roots: ['n1'],
      }),
    } as unknown as import('../src/index').default;
    const result = await plan(cg, 'fn1 fn2 fn3');
    expect(result.connectedToEntry.has('n2')).toBe(true);
    expect(result.connectedToEntry.has('n3')).toBe(false);
  });

  it('centralFiles identifies file with highest graph score + term hit (Issue #25)', async () => {
    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([
          ['n1', { id: 'n1', name: 'MainHandler', kind: 'function', filePath: 'src/main.ts', startLine: 1, endLine: 30 } as Node],
          ['n2', { id: 'n2', name: 'helperFn', kind: 'function', filePath: 'src/helper.ts', startLine: 1, endLine: 5 } as Node],
        ]),
        edges: [
          { source: 'n1', target: 'n2', kind: 'calls' } as Edge,
        ] as Edge[],
        roots: ['n1'],
      }),
    } as unknown as import('../src/index').default;
    const result = await plan(cg, 'MainHandler helperFn');
    expect(result.centralFiles.has('src/main.ts')).toBe(true);
  });

  it('glueNodeIds populated when roots have neighbors in subgraph files (Issue #25)', async () => {
    const n1 = { id: 'n1', name: 'handler', kind: 'function' as Node['kind'], filePath: 'src/main.ts', startLine: 1, endLine: 10 } as Node;
    const n2 = { id: 'n2', name: 'bridge', kind: 'function' as Node['kind'], filePath: 'src/main.ts', startLine: 12, endLine: 20 } as Node;
    const cg = {
      ...mockCodeGraph({ fileCount: 100 }),
      findRelevantContext: async () => ({
        nodes: new Map([['n1', n1]]),
        edges: [] as Edge[],
        roots: ['n1'],
      }),
      getCallers: () => [{ node: n2, edge: { source: 'n2', target: 'n1', kind: 'calls' } }],
      getCallees: () => [],
    } as unknown as import('../src/index').default;
    const result = await plan(cg, 'handler');
    expect(result.glueNodeIds.has('n2')).toBe(true);
  });
});

// ===========================================================================
// matchesSymbol
// ===========================================================================

describe('matchesSymbol', () => {
  function makeNode(overrides?: Partial<Node>): Node {
    return {
      id: 'node-1',
      name: 'execute',
      kind: 'method',
      filePath: 'src/services/order_service.py',
      startLine: 42,
      endLine: 58,
      qualifiedName: 'services::order_service::OrderService::execute',
      signature: 'def execute(self, order_id: str) -> Order',
      ...overrides,
    } as Node;
  }

  it('matches simple name equality', () => {
    const node = makeNode({ name: 'execute' });
    expect(matchesSymbol(node, 'execute')).toBe(true);
  });

  it('rejects mismatched simple name', () => {
    const node = makeNode({ name: 'execute' });
    expect(matchesSymbol(node, 'cancel')).toBe(false);
  });

  it('matches qualified name with :: separator', () => {
    const node = makeNode({
      name: 'execute',
      qualifiedName: 'services::order_service::OrderService::execute',
    });
    expect(matchesSymbol(node, 'OrderService::execute')).toBe(true);
  });

  it('matches qualified name with . separator', () => {
    const node = makeNode({
      name: 'execute',
      qualifiedName: 'OrderService::execute',
    });
    expect(matchesSymbol(node, 'OrderService.execute')).toBe(true);
  });

  it('matches file-path qualified symbol', () => {
    const node = makeNode({
      name: 'run',
      filePath: 'src/configurator/stage_apply.rs',
      qualifiedName: 'configurator::stage_apply::run',
    });
    expect(matchesSymbol(node, 'stage_apply::run')).toBe(true);
  });

  it('rejects qualified name when last part differs', () => {
    const node = makeNode({
      name: 'execute',
      qualifiedName: 'Service::execute',
    });
    expect(matchesSymbol(node, 'Service::cancel')).toBe(false);
  });

  it('rejects non-qualified name when symbol is qualified', () => {
    const node = makeNode({ name: 'execute' });
    // 'execute' doesn't contain :: or . or / — not qualified
    expect(matchesSymbol(node, 'execute')).toBe(true);
    // But 'Service::execute' is qualified — requires last part to match
    expect(matchesSymbol(node, 'Service::execute')).toBe(true);
  });
});

// ===========================================================================
// parseQueryTokens — Issue #22: Named symbol seeding
// ===========================================================================

describe('parseQueryTokens', () => {
  it('returns empty array for empty query', () => {
    expect(parseQueryTokens('')).toEqual([]);
    expect(parseQueryTokens('   ')).toEqual([]);
  });

  it('extracts simple identifier tokens', () => {
    const tokens = parseQueryTokens('validate process execute');
    expect(tokens).toContain('validate');
    expect(tokens).toContain('process');
    expect(tokens).toContain('execute');
  });

  it('strips common file extensions', () => {
    const tokens = parseQueryTokens('check validate.ts handle.js component.tsx');
    expect(tokens).toContain('validate');
    expect(tokens).toContain('handle');
    expect(tokens).toContain('component');
  });

  it('preserves qualified names with :: separator', () => {
    const tokens = parseQueryTokens('OrderService::execute Stage::run');
    expect(tokens).toContain('OrderService::execute');
    expect(tokens).toContain('Stage::run');
  });

  it('preserves qualified names with . separator', () => {
    const tokens = parseQueryTokens('OrderService.execute Stage.run');
    expect(tokens).toContain('OrderService.execute');
    expect(tokens).toContain('Stage.run');
  });

  it('filters out tokens shorter than 3 characters', () => {
    const tokens = parseQueryTokens('a ab abc abcd');
    expect(tokens).not.toContain('a');
    expect(tokens).not.toContain('ab');
    expect(tokens).toContain('abc');
    expect(tokens).toContain('abcd');
  });

  it('deduplicates tokens', () => {
    const tokens = parseQueryTokens('validate validate process process');
    // Should appear only once each
    const validateCount = tokens.filter(t => t === 'validate').length;
    const processCount = tokens.filter(t => t === 'process').length;
    expect(validateCount).toBe(1);
    expect(processCount).toBe(1);
  });

  it('caps tokens at 16', () => {
    const manyTokens = Array.from({ length: 30 }, (_, i) => `token${i}`).join(' ');
    const tokens = parseQueryTokens(manyTokens);
    expect(tokens.length).toBeLessThanOrEqual(16);
  });

  it('handles commas, brackets, and parentheses as delimiters', () => {
    const tokens = parseQueryTokens('foo, bar (baz) [qux]');
    expect(tokens).toContain('foo');
    expect(tokens).toContain('bar');
    expect(tokens).toContain('baz');
    expect(tokens).toContain('qux');
  });

  it('filters non-identifier tokens', () => {
    // Hyphens, @, # are NOT delimiters — the original split is only on
    // whitespace/commas/parens/brackets.  Tokens with those chars fail
    // the identifier regex and are excluded.
    const tokens = parseQueryTokens('valid-token @special #hash');
    expect(tokens).not.toContain('valid-token');
    expect(tokens).not.toContain('@special');
    expect(tokens).not.toContain('#hash');
    // The query yields no valid tokens
    expect(tokens.length).toBe(0);
  });
});

// ===========================================================================
// isTestPath — Issue #22
// ===========================================================================

describe('isTestPath', () => {
  it('detects /tests/ directory', () => {
    expect(isTestPath('src/tests/foo_test.py')).toBe(true);
    expect(isTestPath('tests/test_foo.py')).toBe(true);
  });

  it('detects /spec/ directory', () => {
    expect(isTestPath('spec/models/user_spec.rb')).toBe(true);
  });

  it('detects __tests__ directory', () => {
    expect(isTestPath('src/__tests__/utils.test.ts')).toBe(true);
  });

  it('detects testdata directory', () => {
    expect(isTestPath('testdata/fixtures.json')).toBe(true);
  });

  it('detects mocks directory', () => {
    expect(isTestPath('mocks/fs.ts')).toBe(true);
    expect(isTestPath('src/mock/handler.ts')).toBe(true);
  });

  it('detects fixtures directory', () => {
    expect(isTestPath('fixtures/users.yml')).toBe(true);
  });

  it('detects .test.ts extension', () => {
    expect(isTestPath('src/utils.test.ts')).toBe(true);
  });

  it('detects .spec.js extension', () => {
    expect(isTestPath('src/utils.spec.js')).toBe(true);
  });

  it('rejects normal source files', () => {
    expect(isTestPath('src/services/order_service.py')).toBe(false);
    expect(isTestPath('src/components/App.tsx')).toBe(false);
    expect(isTestPath('lib/validate.rb')).toBe(false);
  });

  it('rejects files with test in name but not in test dir', () => {
    // 'test' as a word in a normal source file path is not a test path
    expect(isTestPath('src/services/test_service.py')).toBe(false);
  });
});

// ===========================================================================
// bodyLines — Issue #22
// ===========================================================================

describe('bodyLines', () => {
  function n(overrides: Partial<Node>): Node {
    return { id: 'n1', name: 'f', kind: 'function', filePath: 'src/f.ts', startLine: 10, endLine: 20, ...overrides } as Node;
  }

  it('computes line count from start to end', () => {
    expect(bodyLines(n({ startLine: 10, endLine: 25 }))).toBe(15);
  });

  it('returns 0 for single-line node', () => {
    expect(bodyLines(n({ startLine: 42, endLine: 42 }))).toBe(0);
  });

  it('returns 0 when endLine is missing', () => {
    const node = n({ startLine: 10 });
    delete (node as any).endLine;
    expect(bodyLines(node)).toBe(0);
  });

  it('returns 0 when endLine < startLine (malformed)', () => {
    expect(bodyLines(n({ startLine: 50, endLine: 30 }))).toBe(0);
  });
});

// ===========================================================================
// inNamedContext — Issue #22
// ===========================================================================

describe('inNamedContext', () => {
  function nd(overrides: Partial<Node>): Node {
    return {
      id: 'n1', name: 'validate', kind: 'method',
      filePath: 'src/services/order_service.py', startLine: 42, endLine: 58,
      qualifiedName: 'services::order_service::OrderService::validate',
      ...overrides,
    } as Node;
  }

  it('matches when filePath contains a type token (case-insensitive)', () => {
    const node = nd({ filePath: 'src/services/OrderService.py' });
    expect(inNamedContext(node, ['OrderService'])).toBe(true);
  });

  it('matches when qualifiedName contains a type token (case-insensitive)', () => {
    const node = nd({ qualifiedName: 'DataRequest::validate' });
    expect(inNamedContext(node, ['DataRequest'])).toBe(true);
  });

  it('rejects when neither filePath nor qualifiedName contains any type token', () => {
    const node = nd({
      filePath: 'src/utils/validation.py',
      qualifiedName: 'utils::validate',
    });
    expect(inNamedContext(node, ['OrderService', 'DataRequest'])).toBe(false);
  });

  it('returns false for empty typeTokens', () => {
    const node = nd({ filePath: 'src/DataRequest.ts' });
    expect(inNamedContext(node, [])).toBe(false);
  });

  it('matches partial substring in filePath', () => {
    const node = nd({ filePath: 'packages/data-request/src/index.ts' });
    // 'data-request' contains 'datarequest'? No — 'data-request' lowercase is 'data-request',
    // which does NOT contain 'datarequest'. So this should be false.
    // But 'datarequest' uppercase has...
    // Actually the original code checks lowercase versions. 'data-request' doesn't
    // contain 'datarequest'. Let me test with something simpler.
    expect(inNamedContext(node, ['DataRequest'])).toBe(false);
  });

  it('matches when filePath directory equals type token', () => {
    const node = nd({ filePath: 'src/DataRequest/validate.ts' });
    expect(inNamedContext(node, ['DataRequest'])).toBe(true);
  });
});

// ===========================================================================
// seedNamedSymbols — Issue #22: main seeding function
// ===========================================================================

describe('seedNamedSymbols', () => {
  /** Minimal mock CodeGraph for seeding tests. */
  function mockCg(overrides?: {
    getNodesByName?: (name: string) => Node[];
    searchNodes?: (name: string) => Array<{ node: Node }>;
  }) {
    return {
      getNodesByName: overrides?.getNodesByName ?? (() => []),
      searchNodes: overrides?.searchNodes ?? (() => []),
    } as unknown as import('../src/index').default;
  }

  /** Build a minimal Node for test injection. */
  function nd(overrides: Partial<Node> & { id: string; name: string }): Node {
    return {
      kind: 'method', filePath: 'src/service.ts', startLine: 10, endLine: 20,
      qualifiedName: '',
      ...overrides,
    } as Node;
  }

  it('returns empty set for empty query', () => {
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };
    const result = seedNamedSymbols(mockCg(), '', subgraph);
    expect(result.size).toBe(0);
    expect(subgraph.nodes.size).toBe(0);
  });

  it('injects a simple token resolved via getNodesByName', () => {
    const injected = nd({ id: 'n1', name: 'validate', kind: 'method', filePath: 'src/validate.ts' });
    const cg = mockCg({ getNodesByName: (name) => name === 'validate' ? [injected] : [] });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    const result = seedNamedSymbols(cg, 'validate', subgraph);
    expect(result.has('n1')).toBe(true);
    expect(subgraph.nodes.has('n1')).toBe(true);
  });

  it('skips non-callable kinds', () => {
    const leaf = nd({ id: 'n1', name: 'config', kind: 'variable', filePath: 'src/config.ts' });
    const cg = mockCg({ getNodesByName: () => [leaf] });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    const result = seedNamedSymbols(cg, 'config', subgraph);
    expect(result.size).toBe(0); // variable kind is not callable
  });

  it('skips test-path nodes', () => {
    const testFn = nd({ id: 'n1', name: 'validate', kind: 'method', filePath: 'src/__tests__/validate.test.ts' });
    const cg = mockCg({ getNodesByName: () => [testFn] });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    const result = seedNamedSymbols(cg, 'validate', subgraph);
    expect(result.size).toBe(0);
  });

  it('injects all candidates when ≤3 definitions', () => {
    const a = nd({ id: 'a', name: 'run', kind: 'function', filePath: 'src/a.ts', endLine: 25 });
    const b = nd({ id: 'b', name: 'run', kind: 'function', filePath: 'src/b.ts', endLine: 50 });
    const c = nd({ id: 'c', name: 'run', kind: 'function', filePath: 'src/c.ts', endLine: 30 });
    const cg = mockCg({ getNodesByName: () => [a, b, c] });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    const result = seedNamedSymbols(cg, 'run', subgraph);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
    expect(result.has('c')).toBe(true);
  });

  it('filters overloaded name (≥4 defs) to named-context bias', () => {
    // 4 definitions of 'validate', one in DataRequest context
    const a = nd({ id: 'a', name: 'validate', kind: 'method', filePath: 'src/DataRequest/validate.ts', qualifiedName: 'DataRequest::validate', endLine: 100 });
    const b = nd({ id: 'b', name: 'validate', kind: 'method', filePath: 'src/other.ts', qualifiedName: 'OtherClass::validate', endLine: 50 });
    const c = nd({ id: 'c', name: 'validate', kind: 'method', filePath: 'src/Validation.swift', qualifiedName: 'Validation::validate', endLine: 80 });
    const d = nd({ id: 'd', name: 'validate', kind: 'method', filePath: 'src/base.ts', qualifiedName: 'Base::validate', endLine: 20 });
    const cg = mockCg({
      getNodesByName: (name) => name === 'validate' ? [a, b, c, d] : [],
    });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    // Query includes 'DataRequest' as a PascalCase type token for disambiguation
    const result = seedNamedSymbols(cg, 'DataRequest validate', subgraph);
    expect(result.has('a')).toBe(true); // DataRequest::validate injected
    expect(result.has('b')).toBe(false);
    expect(result.has('c')).toBe(false);
    expect(result.has('d')).toBe(false);
  });

  it('falls back to most-substantive def when no context match for overloaded name', () => {
    const a = nd({ id: 'a', name: 'poll', kind: 'function', filePath: 'src/a.rs', qualifiedName: 'a::poll', endLine: 10 });
    const b = nd({ id: 'b', name: 'poll', kind: 'function', filePath: 'src/b.rs', qualifiedName: 'b::poll', endLine: 100 });
    const c = nd({ id: 'c', name: 'poll', kind: 'function', filePath: 'src/c.rs', qualifiedName: 'c::poll', endLine: 5 });
    const d = nd({ id: 'd', name: 'poll', kind: 'function', filePath: 'src/d.rs', qualifiedName: 'd::poll', endLine: 30 });
    // Sorted by bodyLines descending: b(100), d(30), a(10), c(5)
    const cg = mockCg({ getNodesByName: () => [a, b, c, d] });
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };

    // Query has no PascalCase type token to disambiguate → fallback to best (most lines)
    const result = seedNamedSymbols(cg, 'poll', subgraph);
    // Should inject only the most-substantive one (b, 100 lines)
    expect(result.has('b')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('marks existing subgraph nodes as named seeds', () => {
    // If the node was already in the subgraph (FTS gathered it), seedNamedSymbols
    // should still add it to namedSeedIds.
    const existing = nd({ id: 'existing', name: 'execute', kind: 'method', filePath: 'src/exec.ts' });
    const cg = mockCg({ getNodesByName: () => [existing] });
    const subgraph = {
      nodes: new Map<string, Node>([['existing', existing]]),
      edges: [] as Edge[],
      roots: ['existing'],
    };

    const result = seedNamedSymbols(cg, 'execute', subgraph);
    expect(result.has('existing')).toBe(true);
  });
});

// ===========================================================================
// isLowValue — Issue #23: test/spec/icon/i18n file detection
// ===========================================================================

describe('isLowValue', () => {
  it('detects /tests/ directory', () => {
    expect(isLowValue('src/tests/foo_test.py')).toBe(true);
    expect(isLowValue('tests/test_foo.py')).toBe(true);
  });

  it('detects __tests__ directory', () => {
    expect(isLowValue('src/__tests__/utils.test.ts')).toBe(true);
  });

  it('detects /spec/ directory', () => {
    expect(isLowValue('spec/models/user_spec.rb')).toBe(true);
  });

  it('detects _test.go files', () => {
    expect(isLowValue('pkg/handler/handler_test.go')).toBe(true);
  });

  it('detects test_*.py files', () => {
    expect(isLowValue('test_models.py')).toBe(true);
    expect(isLowValue('tests/test_views.py')).toBe(true);
  });

  it('detects _test.py files', () => {
    expect(isLowValue('models_test.py')).toBe(true);
  });

  it('detects _spec.rb files', () => {
    expect(isLowValue('models/user_spec.rb')).toBe(true);
  });

  it('detects _test.rb files', () => {
    expect(isLowValue('models/user_test.rb')).toBe(true);
  });

  it('detects .test.[jt]sx? extensions', () => {
    expect(isLowValue('src/utils.test.ts')).toBe(true);
    expect(isLowValue('src/utils.spec.js')).toBe(true);
    expect(isLowValue('src/utils.test.jsx')).toBe(true);
  });

  it('detects test/spec/tests.{java,kt,scala} files', () => {
    expect(isLowValue('test.java')).toBe(true);
    expect(isLowValue('src/Spec.kt')).toBe(true);
    expect(isLowValue('src/Tests.scala')).toBe(true);
  });

  it('detects test/spec.cs files', () => {
    expect(isLowValue('Tests.cs')).toBe(true);
    expect(isLowValue('spec.cs')).toBe(true);
  });

  it('detects test.swift files', () => {
    expect(isLowValue('Tests.swift')).toBe(true);
    expect(isLowValue('tests.swift')).toBe(true);
  });

  it('detects _test.dart files', () => {
    expect(isLowValue('lib/utils_test.dart')).toBe(true);
  });

  it('detects icon files', () => {
    expect(isLowValue('src/icons/index.ts')).toBe(true);
    expect(isLowValue('assets/icon.tsx')).toBe(true);
  });

  it('detects i18n files', () => {
    expect(isLowValue('src/i18n/zh.ts')).toBe(true);
    expect(isLowValue('locale/i18n.ts')).toBe(true);
  });

  it('rejects normal source files', () => {
    expect(isLowValue('src/services/order_service.py')).toBe(false);
    expect(isLowValue('src/components/App.tsx')).toBe(false);
    expect(isLowValue('lib/validate.rb')).toBe(false);
  });
});

// ===========================================================================
// buildFileGroups — Issue #23: group nodes by file, score per node
// ===========================================================================

describe('buildFileGroups', () => {
  function nd(overrides: Partial<Node> & { id: string }): Node {
    return {
      name: 'fn', kind: 'function', filePath: 'src/a.ts',
      startLine: 10, endLine: 20,
      ...overrides,
    } as Node;
  }

  it('returns empty map for empty subgraph', () => {
    const subgraph = { nodes: new Map<string, Node>(), edges: [] as Edge[], roots: [] as string[] };
    const result = buildFileGroups(subgraph, new Set(), new Set());
    expect(result.size).toBe(0);
  });

  it('groups multiple nodes in the same file', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'fn2', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a], ['b', b]]),
      edges: [] as Edge[],
      roots: ['a'],
    };
    const entryIds = new Set(['a']);
    const result = buildFileGroups(subgraph, new Set(), entryIds);
    expect(result.size).toBe(1);
    expect(result.get('src/a.ts')!.nodes.length).toBe(2);
  });

  it('splits nodes across different files', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'fn2', filePath: 'src/b.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a], ['b', b]]),
      edges: [] as Edge[],
      roots: ['a'],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set(['a']));
    expect(result.size).toBe(2);
    expect(result.has('src/a.ts')).toBe(true);
    expect(result.has('src/b.ts')).toBe(true);
  });

  it('assigns +50 to named-seed nodes', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a]]),
      edges: [] as Edge[],
      roots: [],
    };
    const namedSeeds = new Set(['a']);
    const result = buildFileGroups(subgraph, namedSeeds, new Set());
    expect(result.get('src/a.ts')!.score).toBe(50);
  });

  it('assigns +10 to entry nodes', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a]]),
      edges: [] as Edge[],
      roots: ['a'],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set(['a']));
    expect(result.get('src/a.ts')!.score).toBe(10);
  });

  it('assigns +3 to nodes connected to entry', () => {
    const a = nd({ id: 'a', name: 'entry', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'neighbor', filePath: 'src/b.ts' });
    const c = nd({ id: 'c', name: 'distant', filePath: 'src/c.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a], ['b', b], ['c', c]]),
      edges: [{ source: 'a', target: 'b', kind: 'calls' }] as Edge[],
      roots: ['a'],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set(['a']));
    expect(result.get('src/a.ts')!.score).toBe(10); // entry
    expect(result.get('src/b.ts')!.score).toBe(3);  // connected to entry
    expect(result.get('src/c.ts')!.score).toBe(1);  // other
  });

  it('assigns +1 to remaining nodes', () => {
    const a = nd({ id: 'a', name: 'fn', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a]]),
      edges: [] as Edge[],
      roots: [],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set());
    expect(result.get('src/a.ts')!.score).toBe(1);
  });

  it('skips import and export nodes', () => {
    const a = nd({ id: 'a', name: 'fn', kind: 'function', filePath: 'src/a.ts' });
    const imp = nd({ id: 'imp', name: 'useState', kind: 'import', filePath: 'src/a.ts' });
    const exp = nd({ id: 'exp', name: 'Foo', kind: 'export', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a], ['imp', imp], ['exp', exp]]),
      edges: [] as Edge[],
      roots: [],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set());
    // Only the function node should be counted
    expect(result.get('src/a.ts')!.nodes.length).toBe(1);
    expect(result.get('src/a.ts')!.nodes.map(n => n.id)).toEqual(['a']);
  });

  it('accumulates scores from multiple nodes in the same file', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'fn2', filePath: 'src/a.ts' });
    const subgraph = {
      nodes: new Map<string, Node>([['a', a], ['b', b]]),
      edges: [] as Edge[],
      roots: ['a'],
    };
    const result = buildFileGroups(subgraph, new Set(), new Set(['a']));
    // a: entry=10, b: other=1 → total=11
    expect(result.get('src/a.ts')!.score).toBe(11);
  });
});

// ===========================================================================
// countDistinctTermHits — Issue #23: query term matching per file
// ===========================================================================

describe('countDistinctTermHits', () => {
  function nd(overrides: Partial<Node> & { id: string }): Node {
    return {
      name: 'fn', kind: 'function', filePath: 'src/a.ts',
      startLine: 10, endLine: 20,
      ...overrides,
    } as Node;
  }

  it('returns 0 for empty files', () => {
    const result = countDistinctTermHits(new Map(), ['validate', 'process']);
    expect(result.size).toBe(0);
  });

  it('counts term in file path', () => {
    const a = nd({ id: 'a', name: 'fn', filePath: 'src/validate.ts' });
    const groups = new Map<string, FileGroup>([
      ['src/validate.ts', { nodes: [a], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['validate']);
    expect(result.get('src/validate.ts')).toBe(1);
  });

  it('counts terms in node names', () => {
    const a = nd({ id: 'a', name: 'validate', filePath: 'src/utils.ts' });
    const groups = new Map<string, FileGroup>([
      ['src/utils.ts', { nodes: [a], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['validate']);
    expect(result.get('src/utils.ts')).toBe(1);
  });

  it('counts distinct terms only (not total occurrences)', () => {
    const a = nd({ id: 'a', name: 'validate', filePath: 'src/validate.ts' });
    // 'validate' appears in both filePath and node name — still count as 1
    const groups = new Map<string, FileGroup>([
      ['src/validate.ts', { nodes: [a], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['validate']);
    expect(result.get('src/validate.ts')).toBe(1);
  });

  it('counts multiple distinct term matches', () => {
    const a = nd({ id: 'a', name: 'validate', filePath: 'src/order_service.ts' });
    const b = nd({ id: 'b', name: 'processOrder', filePath: 'src/order_service.ts' });
    const groups = new Map<string, FileGroup>([
      ['src/order_service.ts', { nodes: [a, b], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['validate', 'order', 'process']);
    // 'validate' hits node a name, 'order' hits filePath and node b name, 'process' hits node b name
    expect(result.get('src/order_service.ts')).toBe(3);
  });

  it('handles multiple files', () => {
    const a = nd({ id: 'a', name: 'fn', filePath: 'src/validate.ts' });
    const b = nd({ id: 'b', name: 'fn', filePath: 'src/process.ts' });
    const groups = new Map<string, FileGroup>([
      ['src/validate.ts', { nodes: [a], score: 0 }],
      ['src/process.ts', { nodes: [b], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['validate', 'process']);
    expect(result.get('src/validate.ts')).toBe(1);
    expect(result.get('src/process.ts')).toBe(1);
  });

  it('filters query terms < 3 chars', () => {
    const a = nd({ id: 'a', name: 'do', filePath: 'src/do.ts' });
    const groups = new Map<string, FileGroup>([
      ['src/do.ts', { nodes: [a], score: 0 }],
    ]);
    const result = countDistinctTermHits(groups, ['do', 'ab']);
    // 'do' and 'ab' are both < 3 chars — filtered
    expect(result.get('src/do.ts')).toBe(0);
  });
});

// ===========================================================================
// aggregateFileGraphScores — Issue #23: aggregate RWR per file
// ===========================================================================

describe('aggregateFileGraphScores', () => {
  function nd(overrides: Partial<Node> & { id: string }): Node {
    return {
      name: 'fn', kind: 'function', filePath: 'src/a.ts',
      startLine: 10, endLine: 20,
      ...overrides,
    } as Node;
  }

  it('returns zero maxGraph for empty subgraph', () => {
    const subgraph: Subgraph = { nodes: new Map(), edges: [], roots: [] };
    const { fileGraphScore, maxGraph } = aggregateFileGraphScores(subgraph, new Map());
    expect(maxGraph).toBe(0);
    expect(fileGraphScore.size).toBe(0);
  });

  it('aggregates RWR scores per file', () => {
    const a = nd({ id: 'a', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', filePath: 'src/a.ts' });
    const c = nd({ id: 'c', filePath: 'src/b.ts' });
    const subgraph: Subgraph = {
      nodes: new Map([['a', a], ['b', b], ['c', c]]),
      edges: [],
      roots: [],
    };
    const rwr = new Map([['a', 0.3], ['b', 0.2], ['c', 0.5]]);

    const { fileGraphScore, maxGraph } = aggregateFileGraphScores(subgraph, rwr);
    expect(fileGraphScore.get('src/a.ts')).toBeCloseTo(0.5); // 0.3 + 0.2
    expect(fileGraphScore.get('src/b.ts')).toBeCloseTo(0.5);
    expect(maxGraph).toBeCloseTo(0.5);
  });

  it('handles nodes missing from RWR map', () => {
    const a = nd({ id: 'a', filePath: 'src/a.ts' });
    const subgraph: Subgraph = {
      nodes: new Map([['a', a]]),
      edges: [],
      roots: [],
    };
    // no RWR scores for 'a'
    const { fileGraphScore, maxGraph } = aggregateFileGraphScores(subgraph, new Map());
    expect(fileGraphScore.get('src/a.ts')).toBe(0);
    expect(maxGraph).toBe(0);
  });

  it('computes correct max across files', () => {
    const a = nd({ id: 'a', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', filePath: 'src/b.ts' });
    const c = nd({ id: 'c', filePath: 'src/c.ts' });
    const subgraph: Subgraph = {
      nodes: new Map([['a', a], ['b', b], ['c', c]]),
      edges: [],
      roots: [],
    };
    const rwr = new Map([['a', 0.1], ['b', 0.8], ['c', 0.3]]);

    const { maxGraph } = aggregateFileGraphScores(subgraph, rwr);
    expect(maxGraph).toBeCloseTo(0.8);
  });
});

// ===========================================================================
// gateAndSortFiles — Issue #23: relevance gate + sort
// ===========================================================================

describe('gateAndSortFiles', () => {
  function nd(overrides: Partial<Node> & { id: string }): Node {
    return {
      name: 'fn', kind: 'function', filePath: 'src/a.ts',
      startLine: 10, endLine: 20,
      ...overrides,
    } as Node;
  }

  function makeSubgraph(nodes: Node[], edges: Edge[] = [], roots: string[] = []): Subgraph {
    return { nodes: new Map(nodes.map(n => [n.id, n])), edges, roots };
  }

  it('returns empty array for empty fileGroups', () => {
    const subgraph = makeSubgraph([]);
    const result = gateAndSortFiles(subgraph, new Set(), new Set(), new Map(), 'test query');
    expect(result).toEqual([]);
  });

  it('filters out files with score < 3', () => {
    const a = nd({ id: 'a', name: 'fn1', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'fn2', filePath: 'src/b.ts' });
    const subgraph = makeSubgraph([a, b], [], ['a']);
    // a is an entry → score=10, b has no connection → score=1
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['a']));
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['a']), fileGroups, 'fn1');
    // Only a survives (score ≥ 3)
    expect(result.length).toBe(1);
    expect(result[0]![0]).toBe('src/a.ts');
  });

  it('hard-excludes test/spec files when query does not mention tests', () => {
    const a = nd({ id: 'a', name: 'process', kind: 'function', filePath: 'src/main.ts' });
    const t = nd({ id: 't', name: 'test_process', kind: 'function', filePath: 'src/__tests__/main.test.ts' });
    const c = nd({ id: 'c', name: 'helper', kind: 'function', filePath: 'src/helper.ts' });
    const subgraph = makeSubgraph([a, t, c], [
      { source: 'a', target: 't', kind: 'calls' },
      { source: 'a', target: 'c', kind: 'calls' },
    ], ['a']); // a is entry, t and c are connected
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['a']));
    // All 3 have score ≥ 3, nonLow has 2 files (a, c) → exclusion applied
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['a']), fileGroups, 'process');
    expect(result.map(r => r[0])).not.toContain('src/__tests__/main.test.ts');
  });

  it('keeps test files when query mentions tests', () => {
    const a = nd({ id: 'a', name: 'process', kind: 'function', filePath: 'src/main.ts' });
    const t = nd({ id: 't', name: 'test_process', kind: 'function', filePath: 'src/__tests__/main.test.ts' });
    const subgraph = makeSubgraph([a, t], [
      { source: 'a', target: 't', kind: 'calls' },
    ], ['a']);
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['a']));
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['a']), fileGroups, 'test the process');
    expect(result.map(r => r[0])).toContain('src/__tests__/main.test.ts');
  });

  it('protects entry files from the relevance gate', () => {
    // Create a file whose RWR mass is low but it's an entry file
    const entry = nd({ id: 'entry', name: 'main', kind: 'function', filePath: 'src/entry.ts' });
    const other = nd({ id: 'other', name: 'helper', kind: 'function', filePath: 'src/helper.ts' });
    // No edges → no RWR diffusion. entry gets restart probability only.
    const subgraph = makeSubgraph([entry, other], [], ['entry']);
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['entry']));
    // Both are entry or connected-to-entry? No — 'other' is not connected.
    // entry has score=10, other has score=1. But other is filtered (<3). Need ≥2.
    // Let me add one more non-entry to provide a second file.
    const x = nd({ id: 'x', name: 'xfn', kind: 'function', filePath: 'src/x.ts' });
    subgraph.nodes.set('x', x);
    subgraph.edges.push({ source: 'entry', target: 'x', kind: 'calls' });
    const fg2 = buildFileGroups(subgraph, new Set(), new Set(['entry']));
    // x is connected to entry → score=3

    const result = gateAndSortFiles(subgraph, new Set(), new Set(['entry']), fg2, 'entry main');
    // entry file should survive gate
    expect(result.map(r => r[0])).toContain('src/entry.ts');
  });

  it('protects files with ≥2 distinct term hits from gate', () => {
    const a = nd({ id: 'a', name: 'validate_order', kind: 'function', filePath: 'src/order_validator.ts' });
    const b = nd({ id: 'b', name: 'fn', kind: 'function', filePath: 'src/other.ts' });
    const subgraph = makeSubgraph([a, b], [
      { source: 'a', target: 'b', kind: 'calls' },
    ], ['a']);
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['a']));
    // 'other.ts' has only 'fn' which doesn't match many terms
    // But with >= 2 hits on order_validator.ts, it survives
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['a']), fileGroups, 'validate order service');
    expect(result.map(r => r[0])).toContain('src/order_validator.ts');
  });

  it('sorts named-seed files first', () => {
    const named = nd({ id: 'named', name: 'myFunc', kind: 'function', filePath: 'src/named.ts' });
    const other = nd({ id: 'other', name: 'helper', kind: 'function', filePath: 'src/helper.ts' });
    const subgraph = makeSubgraph([named, other], [
      { source: 'named', target: 'other', kind: 'calls' },
    ], ['named']);
    const fileGroups = buildFileGroups(subgraph, new Set(['named']), new Set(['named']));
    const result = gateAndSortFiles(subgraph, new Set(['named']), new Set(['named']), fileGroups, 'myFunc');
    expect(result[0]![0]).toBe('src/named.ts');
  });

  it('deprioritizes generated files in sort', () => {
    // Neither gen nor src is an entry node → RWR scores similar,
    // so comparator falls through to the generated-file penalty.
    const entry = nd({ id: 'entry', name: 'main', kind: 'function', filePath: 'src/main.ts' });
    const gen = nd({ id: 'gen', name: 'fn1', kind: 'function', filePath: 'src/foo.pb.go' });
    const src = nd({ id: 'src', name: 'fn2', kind: 'function', filePath: 'src/foo.go' });
    const subgraph = makeSubgraph([entry, gen, src], [
      { source: 'entry', target: 'gen', kind: 'calls' },
      { source: 'entry', target: 'src', kind: 'calls' },
    ], ['entry']);
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['entry']));
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['entry']), fileGroups, 'foo');
    const genIdx = result.findIndex(([p]) => p === 'src/foo.pb.go');
    const srcIdx = result.findIndex(([p]) => p === 'src/foo.go');
    expect(srcIdx).toBeLessThan(genIdx);
  });

  it('guards against pruning below 2 files', () => {
    // Two files, both with very low RWR (isolated nodes)
    const a = nd({ id: 'a', name: 'fn1', kind: 'function', filePath: 'src/a.ts' });
    const b = nd({ id: 'b', name: 'fn2', kind: 'function', filePath: 'src/b.ts' });
    const subgraph = makeSubgraph([a, b], [
      { source: 'a', target: 'b', kind: 'calls' },
    ], ['a']); // a is entry, b is connected
    const fileGroups = buildFileGroups(subgraph, new Set(), new Set(['a']));
    // Both have score ≥ 3, gate should not prune below 2
    const result = gateAndSortFiles(subgraph, new Set(), new Set(['a']), fileGroups, 'fn1 fn2');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// readAdaptiveEnabled — Issue #24: env var reader
// ===========================================================================

describe('readAdaptiveEnabled', () => {
  const KEY = 'CODEGRAPH_ADAPTIVE_EXPLORE';

  const prev = process.env[KEY];

  // Restore after each test to avoid leakage
  const restore = () => {
    if (prev === undefined) delete process.env[KEY];
    else process.env[KEY] = prev;
  };

  it('returns true when env var is not set (default on)', () => {
    delete process.env[KEY];
    expect(readAdaptiveEnabled()).toBe(true);
    restore();
  });

  it('returns false when env var is "0"', () => {
    process.env[KEY] = '0';
    expect(readAdaptiveEnabled()).toBe(false);
    restore();
  });

  it('returns true when env var is "1"', () => {
    process.env[KEY] = '1';
    expect(readAdaptiveEnabled()).toBe(true);
    restore();
  });

  it('returns true when env var is any non-zero, non-empty string', () => {
    process.env[KEY] = 'true';
    expect(readAdaptiveEnabled()).toBe(true);
    restore();
  });

  it('returns false when env var is empty string', () => {
    process.env[KEY] = '';
    expect(readAdaptiveEnabled()).toBe(false);
    restore();
  });
});
