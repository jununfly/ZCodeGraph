/**
 * Slice 3.2: Anchor discovery — unit tests.
 *
 * Pins the contract that anchor discovery:
 *   - extracts clues with a generic tokenizer (no repo-specific branches)
 *   - classifies clues with pure string heuristics
 *   - retains a small representative set per clue (perClueLimit)
 *   - marks ambiguity instead of picking a single winner
 *   - never lets a global top-k eliminate an entire clue kind
 *   - binds every read to the Slice 2 fixed snapshot
 */

import { describe, expect, it } from 'vitest';
import {
  ANCHOR_WORK_CEILING,
  classifyClue,
  extractClues,
  resolveAnchors,
  type AnchorGraphRead,
} from '../src/explore/anchors';
import { makeSnapshotIdentity } from '../src/explore/snapshot';
import { InMemoryExploreReadSnapshot } from '../src/explore/snapshot-observer';
import type { Node } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(partial: Partial<Node> & Pick<Node, 'id' | 'name' | 'kind' | 'filePath' | 'startLine' | 'endLine'>): Node {
  return partial as Node;
}

function snapshot() {
  return new InMemoryExploreReadSnapshot(
    makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
  );
}

// ---------------------------------------------------------------------------
// Clue extraction
// ---------------------------------------------------------------------------

describe('Slice 3.2 — clue extraction', () => {
  it('splits on whitespace and common separators', () => {
    const clues = extractClues('how does User.find call Database.connect?');
    expect(clues).toContain('User.find');
    expect(clues).toContain('Database.connect');
  });

  it('drops stopwords and short tokens', () => {
    const clues = extractClues('show me the foo and a bar');
    expect(clues).not.toContain('show');
    expect(clues).not.toContain('the');
    expect(clues).not.toContain('a');
    expect(clues).toContain('foo');
    expect(clues).toContain('bar');
  });

  it('dedupes clues preserving first-seen order', () => {
    const clues = extractClues('foo foo foo bar');
    expect(clues.filter((c) => c === 'foo')).toHaveLength(1);
    expect(clues[0]).toBe('foo');
  });

  it('caps clue count at maxClues', () => {
    const many = Array.from({ length: 50 }, (_, i) => `token${i}`).join(' ');
    const clues = extractClues(many);
    expect(clues.length).toBeLessThanOrEqual(ANCHOR_WORK_CEILING.maxClues);
  });
});

// ---------------------------------------------------------------------------
// Clue classification (no repo-specific branches)
// ---------------------------------------------------------------------------

describe('Slice 3.2 — clue classification', () => {
  it('classifies dotted identifiers as qualified-name', () => {
    expect(classifyClue('Foo.bar')).toBe('qualified-name');
  });

  it('classifies file paths as file-path', () => {
    expect(classifyClue('foo.ts')).toBe('file-path');
    expect(classifyClue('src/foo/bar.ts')).toBe('file-path');
  });

  it('classifies leading-slash as route', () => {
    expect(classifyClue('/api/users')).toBe('route');
  });

  it('classifies PascalCase as type-name', () => {
    expect(classifyClue('UserService')).toBe('type-name');
  });

  it('classifies snake_case as explicit-symbol', () => {
    expect(classifyClue('find_user')).toBe('explicit-symbol');
  });

  it('classifies module paths without file extension as module', () => {
    expect(classifyClue('src/auth')).toBe('module');
  });
});

// ---------------------------------------------------------------------------
// Anchor discovery
// ---------------------------------------------------------------------------

describe('Slice 3.2 — resolveAnchors', () => {
  it('resolves explicit-symbol clues via exact name lookup', () => {
    const node = makeNode({
      id: 'n1', name: 'find_user', kind: 'function', filePath: 'a.ts', startLine: 1, endLine: 5,
    });
    const graph: AnchorGraphRead = {
      getNodesByName: (name) => (name === 'find_user' ? [node] : []),
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('find_user', graph, snapshot());
    expect(result.anchors).toHaveLength(1);
    expect(result.anchors[0].kind).toBe('explicit-symbol');
    expect(result.anchors[0].matches).toHaveLength(1);
    expect(result.anchors[0].matches[0].nodeId).toBe('n1');
    expect(result.anchors[0].matches[0].ambiguous).toBe(false);
    expect(result.uniqueAnchorCount).toBe(1);
  });

  it('strips the container from qualified-name clues for exact lookup', () => {
    const node = makeNode({
      id: 'n1', name: 'find', kind: 'method', filePath: 'a.ts', startLine: 1, endLine: 5,
    });
    const graph: AnchorGraphRead = {
      getNodesByName: (name) => (name === 'find' ? [node] : []),
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('User.find', graph, snapshot());
    expect(result.anchors[0].matches[0].nodeId).toBe('n1');
  });

  it('marks ambiguity when a clue matches multiple nodes', () => {
    const a = makeNode({ id: 'a', name: 'foo', kind: 'function', filePath: 'a.ts', startLine: 1, endLine: 5 });
    const b = makeNode({ id: 'b', name: 'foo', kind: 'function', filePath: 'b.ts', startLine: 1, endLine: 5 });
    const graph: AnchorGraphRead = {
      getNodesByName: () => [a, b],
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('foo', graph, snapshot());
    expect(result.anchors[0].matches).toHaveLength(2);
    expect(result.anchors[0].matches.every((m) => m.ambiguous)).toBe(true);
    expect(result.uniqueAnchorCount).toBe(2);
  });

  it('respects perClueLimit and sets truncated', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `n${i}`, name: 'foo', kind: 'function', filePath: `${i}.ts`, startLine: 1, endLine: 5 }),
    );
    const graph: AnchorGraphRead = {
      getNodesByName: () => nodes,
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('foo', graph, snapshot());
    expect(result.anchors[0].matches).toHaveLength(ANCHOR_WORK_CEILING.perClueLimit);
    expect(result.anchors[0].truncated).toBe(true);
  });

  it('matches file-path clues by file node name or suffix', () => {
    const fileNode = makeNode({
      id: 'f1', name: 'auth.ts', kind: 'file', filePath: 'src/auth/auth.ts', startLine: 1, endLine: 1,
    });
    const graph: AnchorGraphRead = {
      getNodesByName: () => [],
      getNodesByKind: (kind) => (kind === 'file' ? [fileNode] : []),
    };
    const result = resolveAnchors('auth.ts', graph, snapshot());
    expect(result.anchors).toHaveLength(1);
    expect(result.anchors[0].kind).toBe('file-path');
    expect(result.anchors[0].matches[0].nodeId).toBe('f1');
  });

  it('matches route clues against route nodes', () => {
    const route = makeNode({
      id: 'r1', name: 'GET /api/users', kind: 'route', filePath: 'routes.ts', startLine: 5, endLine: 5,
    });
    const graph: AnchorGraphRead = {
      getNodesByName: () => [],
      getNodesByKind: (kind) => (kind === 'route' ? [route] : []),
    };
    const result = resolveAnchors('/api/users', graph, snapshot());
    expect(result.anchors[0].kind).toBe('route');
    expect(result.anchors[0].matches[0].nodeId).toBe('r1');
  });

  it('records unmatched clues separately (does NOT collapse to empty)', () => {
    const graph: AnchorGraphRead = {
      getNodesByName: () => [],
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('nonexistent_symbol_xyz', graph, snapshot());
    expect(result.anchors).toHaveLength(0);
    expect(result.unmatchedClues).toContain('nonexistent_symbol_xyz');
    expect(result.uniqueAnchorCount).toBe(0);
  });

  it('global ceiling caps total anchors across clues', () => {
    const nodes = Array.from({ length: 100 }, (_, i) =>
      makeNode({ id: `n${i}`, name: `sym${i % 5}`, kind: 'function', filePath: `${i}.ts`, startLine: 1, endLine: 5 }),
    );
    const graph: AnchorGraphRead = {
      getNodesByName: (name) => nodes.filter((n) => n.name === name),
      getNodesByKind: () => [],
    };
    const result = resolveAnchors('sym0 sym1 sym2 sym3 sym4', graph, snapshot());
    // Total anchors across all clues must not exceed globalLimit.
    const total = result.anchors.reduce((acc, a) => acc + a.matches.length, 0);
    expect(total).toBeLessThanOrEqual(ANCHOR_WORK_CEILING.globalLimit);
  });

  it('binds every read to the fixed snapshot (throws snapshot-lost after invalidate)', () => {
    const node = makeNode({ id: 'n1', name: 'foo', kind: 'function', filePath: 'a.ts', startLine: 1, endLine: 5 });
    const graph: AnchorGraphRead = {
      getNodesByName: () => [node],
      getNodesByKind: () => [],
    };
    const snap = snapshot();
    snap.invalidate();
    expect(() => resolveAnchors('foo', graph, snap)).toThrow(/snapshot-lost/);
  });
});
