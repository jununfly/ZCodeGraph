/**
 * Tests for explore-renderer.ts — Issue #14
 *
 * The renderer takes ExplorePlan + CodeGraph + flow + blastRadius
 * and produces the final markdown output for zcodegraph_explore.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '../src/mcp/explore-renderer';
import type { ExplorePlan, Subgraph, Edge, Node } from '../src/mcp/explore-types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    name: `Symbol_${id}`,
    kind: 'function',
    filePath: `src/${id.replace(/\d+/g, 'file')}.ts`,
    startLine: 1,
    endLine: 10,
    ...overrides,
  } as Node;
}

function mockExplorePlan(overrides: Partial<ExplorePlan> = {}): ExplorePlan {
  return {
    query: 'test query',
    budget: {
      maxOutputChars: 24000,
      maxCharsPerFile: 8000,
      maxFiles: 6,
      maxSymbolsInFileHeader: 8,
      maxEdgesPerRelationshipKind: 20,
      gapThreshold: 15,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
    },
    maxFiles: 6,
    subgraph: {
      nodes: new Map(),
      edges: [],
      roots: [],
    },
    entryNodeIds: new Set(),
    fileGroups: new Map(),
    sortedFiles: [],
    spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
    adaptiveEnabled: false,
    glueNodeIds: new Set(),
    connectedToEntry: new Set(),
    centralFiles: new Set(),
    projectRoot: '/fake/project',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Issue #14: ExploreRenderer
// ---------------------------------------------------------------------------

describe('render', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a non-empty string for non-empty subgraph', () => {
    const n1 = mockNode('n1', { name: 'main', filePath: 'src/main.ts' });
    const plan = mockExplorePlan({
      subgraph: {
        nodes: new Map([['n1', n1]]),
        edges: [],
        roots: ['n1'],
      },
      entryNodeIds: new Set(['n1']),
      fileGroups: new Map([
        ['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }],
      ]),
      sortedFiles: [['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }]],
      centralFiles: new Set(['src/main.ts']),
    });

    const flow = { text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(), uniqueNamedNodeIds: new Set<string>() };
    const blastRadius = '';

    const output = render(plan, null as any, flow, blastRadius);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('includes the query in the header', () => {
    const n1 = mockNode('n1', { name: 'main', filePath: 'src/main.ts' });
    const plan = mockExplorePlan({
      query: 'my specific query',
      subgraph: {
        nodes: new Map([['n1', n1]]),
        edges: [],
        roots: ['n1'],
      },
      entryNodeIds: new Set(['n1']),
      fileGroups: new Map([
        ['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }],
      ]),
      sortedFiles: [['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }]],
      centralFiles: new Set(['src/main.ts']),
    });

    const flow = { text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(), uniqueNamedNodeIds: new Set<string>() };
    const blastRadius = '';

    const output = render(plan, null as any, flow, blastRadius);
    expect(output).toContain('my specific query');
  });

  it('includes blast radius text when provided', () => {
    const n1 = mockNode('n1', { name: 'main', filePath: 'src/main.ts' });
    const plan = mockExplorePlan({
      subgraph: {
        nodes: new Map([['n1', n1]]),
        edges: [],
        roots: ['n1'],
      },
      entryNodeIds: new Set(['n1']),
      fileGroups: new Map([
        ['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }],
      ]),
      sortedFiles: [['src/main.ts', { score: 50, nodes: [n1], filePath: 'src/main.ts' }]],
      centralFiles: new Set(['src/main.ts']),
    });

    const flow = { text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(), uniqueNamedNodeIds: new Set<string>() };
    const blastRadius = '### Blast radius\n\n- `foo` (src/foo.ts:10)\n';

    const output = render(plan, null as any, flow, blastRadius);
    expect(output).toContain('Blast radius');
    expect(output).toContain('`foo`');
  });

  it('includes relationships when budget allows', () => {
    const n1 = mockNode('n1', { name: 'caller', filePath: 'src/caller.ts' });
    const n2 = mockNode('n2', { name: 'callee', filePath: 'src/callee.ts' });
    const plan = mockExplorePlan({
      subgraph: {
        nodes: new Map([['n1', n1], ['n2', n2]]),
        edges: [{ source: 'n1', target: 'n2', kind: 'calls' } as Edge],
        roots: ['n1'],
      },
      entryNodeIds: new Set(['n1']),
      fileGroups: new Map([
        ['src/caller.ts', { score: 50, nodes: [n1], filePath: 'src/caller.ts' }],
        ['src/callee.ts', { score: 50, nodes: [n2], filePath: 'src/callee.ts' }],
      ]),
      sortedFiles: [
        ['src/caller.ts', { score: 50, nodes: [n1], filePath: 'src/caller.ts' }],
      ],
      centralFiles: new Set(['src/caller.ts']),
    });

    const flow = { text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(), uniqueNamedNodeIds: new Set<string>() };
    const blastRadius = '';

    const output = render(plan, null as any, flow, blastRadius);
    expect(output).toContain('caller');
    expect(output).toContain('callee');
  });
});
