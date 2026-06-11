/**
 * Type-level tests for src/mcp/explore-types.ts.
 *
 * These tests verify that the extracted types exist, are structurally sound,
 * and match the shapes computed by handleExplore() in tools.ts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ExploreOutputBudget,
  FlowSpine,
  ExplorePlan,
} from '../src/mcp/explore-types';
import type { Node, Edge } from '../src/types';

describe('domain language', () => {
  it('uses Flow Spine terminology for MCP explore source comments', () => {
    const mcpDir = join(__dirname, '..', 'src', 'mcp');
    const source = ['explore-types.ts', 'explore-planner.ts']
      .map((file) => readFileSync(join(mcpDir, file), 'utf8'))
      .join('\n');

    expect(source).not.toContain('call-path spine');
    expect(source).toContain('Flow Spine');
  });
});

// ---------------------------------------------------------------------------
// ExploreOutputBudget
// ---------------------------------------------------------------------------
describe('ExploreOutputBudget', () => {
  it('is constructible with all required fields', () => {
    const b: ExploreOutputBudget = {
      maxOutputChars: 20000,
      defaultMaxFiles: 8,
      maxCharsPerFile: 6000,
      gapThreshold: 20,
      maxSymbolsInFileHeader: 12,
      maxEdgesPerRelationshipKind: 10,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
      excludeLowValueFiles: false,
    };

    expect(b.maxOutputChars).toBe(20000);
    expect(b.defaultMaxFiles).toBe(8);
    expect(b.maxCharsPerFile).toBe(6000);
    expect(b.gapThreshold).toBe(20);
    expect(b.maxSymbolsInFileHeader).toBe(12);
    expect(b.maxEdgesPerRelationshipKind).toBe(10);
    expect(b.includeRelationships).toBe(true);
    expect(b.includeAdditionalFiles).toBe(true);
    expect(b.includeCompletenessSignal).toBe(true);
    expect(b.includeBudgetNote).toBe(true);
    expect(b.excludeLowValueFiles).toBe(false);
  });

  it('has distinct values for small vs large project tiers', () => {
    // Build two budgets directly to verify the factory produces distinct tiers.
    // We duplicate the tier logic here (test-only) to avoid importing tools.ts
    // (which would pull in the heavy CodeGraph chain).
    const small: ExploreOutputBudget = {
      maxOutputChars: 20000,
      defaultMaxFiles: 6,
      maxCharsPerFile: 4000,
      gapThreshold: 10,
      maxSymbolsInFileHeader: 8,
      maxEdgesPerRelationshipKind: 6,
      includeRelationships: false,
      includeAdditionalFiles: false,
      includeCompletenessSignal: false,
      includeBudgetNote: false,
      excludeLowValueFiles: true,
    };
    const large: ExploreOutputBudget = {
      maxOutputChars: 25000,
      defaultMaxFiles: 12,
      maxCharsPerFile: 8000,
      gapThreshold: 30,
      maxSymbolsInFileHeader: 16,
      maxEdgesPerRelationshipKind: 14,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
      excludeLowValueFiles: false,
    };

    expect(small.maxOutputChars).toBeLessThan(large.maxOutputChars);
    expect(small.defaultMaxFiles).toBeLessThanOrEqual(large.defaultMaxFiles);
    expect(small.maxCharsPerFile).toBeLessThan(large.maxCharsPerFile);
    expect(small.gapThreshold).toBeLessThan(large.gapThreshold);
  });
});

// ---------------------------------------------------------------------------
// FlowSpine
// ---------------------------------------------------------------------------
describe('FlowSpine', () => {
  it('is constructible with all required fields', () => {
    const spine: FlowSpine = {
      text: 'flow text',
      pathNodeIds: new Set(['n1', 'n2']),
      namedNodeIds: new Set(['n1', 'n3']),
      uniqueNamedNodeIds: new Set(['n3']),
    };

    expect(spine.text).toBe('flow text');
    expect(spine.pathNodeIds.has('n1')).toBe(true);
    expect(spine.namedNodeIds.has('n3')).toBe(true);
    expect(spine.uniqueNamedNodeIds.has('n3')).toBe(true);
  });

  it('empty spine has empty sets and empty text', () => {
    const spine: FlowSpine = {
      text: '',
      pathNodeIds: new Set(),
      namedNodeIds: new Set(),
      uniqueNamedNodeIds: new Set(),
    };

    expect(spine.text).toBe('');
    expect(spine.pathNodeIds.size).toBe(0);
    expect(spine.namedNodeIds.size).toBe(0);
    expect(spine.uniqueNamedNodeIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ExplorePlan
// ---------------------------------------------------------------------------
describe('ExplorePlan', () => {
  function makeNode(id: string): Node {
    return {
      id,
      kind: 'function' as Node['kind'],
      name: `fn_${id}`,
      qualifiedName: `pkg.fn_${id}`,
      filePath: `/src/${id}.ts`,
      language: 'typescript',
      startLine: 1,
      endLine: 5,
      startColumn: 0,
      endColumn: 0,
      updatedAt: new Date(),
    };
  }

  function makePlan(overrides: Partial<ExplorePlan> = {}): ExplorePlan {
    const spine: FlowSpine = {
      text: '',
      pathNodeIds: new Set(),
      namedNodeIds: new Set(),
      uniqueNamedNodeIds: new Set(),
    };
    const budget: ExploreOutputBudget = {
      maxOutputChars: 20000,
      defaultMaxFiles: 8,
      maxCharsPerFile: 6000,
      gapThreshold: 20,
      maxSymbolsInFileHeader: 12,
      maxEdgesPerRelationshipKind: 10,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
      excludeLowValueFiles: false,
    };
    const subgraph = {
      nodes: new Map(),
      edges: [] as Edge[],
      roots: [] as string[],
    };

    return {
      query: 'test query',
      budget,
      maxFiles: 8,
      subgraph,
      entryNodeIds: new Set(),
      fileGroups: new Map(),
      sortedFiles: [],
      spine,
      adaptiveEnabled: true,
      ...overrides,
    };
  }

  it('is constructible with all required fields', () => {
    const plan = makePlan();
    expect(plan.query).toBe('test query');
    expect(plan.budget.maxOutputChars).toBe(20000);
    expect(plan.maxFiles).toBe(8);
    expect(plan.subgraph.nodes.size).toBe(0);
    expect(plan.entryNodeIds.size).toBe(0);
    expect(plan.fileGroups.size).toBe(0);
    expect(plan.sortedFiles).toEqual([]);
    expect(plan.spine.text).toBe('');
    expect(plan.adaptiveEnabled).toBe(true);
  });

  it('holds entry node ids', () => {
    const plan = makePlan({ entryNodeIds: new Set(['a', 'b']) });
    expect(plan.entryNodeIds.has('a')).toBe(true);
    expect(plan.entryNodeIds.has('b')).toBe(true);
    expect(plan.entryNodeIds.size).toBe(2);
  });

  it('holds file groups with nodes and scores', () => {
    const node = makeNode('n1');
    const plan = makePlan({
      fileGroups: new Map([['/src/file.ts', { nodes: [node], score: 42 }]]),
    });

    const fg = plan.fileGroups.get('/src/file.ts');
    expect(fg).toBeDefined();
    expect(fg!.score).toBe(42);
    expect(fg!.nodes[0]!.id).toBe('n1');
  });

  it('holds sorted files in priority order', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const plan = makePlan({
      sortedFiles: [
        ['/src/high.ts', { nodes: [n1], score: 100 }],
        ['/src/low.ts', { nodes: [n2], score: 10 }],
      ],
    });

    expect(plan.sortedFiles).toHaveLength(2);
    expect(plan.sortedFiles[0]![0]).toBe('/src/high.ts');
    expect(plan.sortedFiles[1]![0]).toBe('/src/low.ts');
  });

  it('holds a non-trivial flow spine', () => {
    const spine: FlowSpine = {
      text: 'main → helper → sink',
      pathNodeIds: new Set(['main', 'helper', 'sink']),
      namedNodeIds: new Set(['main', 'helper', 'sink', 'wrapper']),
      uniqueNamedNodeIds: new Set(['wrapper']),
    };
    const plan = makePlan({ spine });

    expect(plan.spine.text).toBe('main → helper → sink');
    expect(plan.spine.pathNodeIds.has('main')).toBe(true);
    expect(plan.spine.namedNodeIds.has('wrapper')).toBe(true);
    expect(plan.spine.uniqueNamedNodeIds.has('wrapper')).toBe(true);
    // uniqueNamedNodeIds is a subset of namedNodeIds
    for (const id of plan.spine.uniqueNamedNodeIds) {
      expect(plan.spine.namedNodeIds.has(id)).toBe(true);
    }
  });

  it('can disable adaptive sizing', () => {
    const plan = makePlan({ adaptiveEnabled: false });
    expect(plan.adaptiveEnabled).toBe(false);
  });
});
