/**
 * Slice 3.4: Trace composition — unit tests.
 *
 * Pins:
 *   - paths are deterministic (stable sort, no randomness)
 *   - cycles are avoided
 *   - non-execution relations are excluded from traces
 *   - alternative paths through different semantics are preserved
 *   - path ceilings are respected
 *   - status=connected requires every step observed/resolved
 */

import { describe, expect, it } from 'vitest';
import {
  TRACE_WORK_CEILING,
  composeTraces,
} from '../src/explore/trace';
import type { AnchorMatch } from '../src/explore/anchors';
import type { ExpansionResult } from '../src/explore/expansion';
import type { EvidenceRelation } from '../src/explore/obligations';

function anchor(nodeId: string): AnchorMatch {
  return { id: `a:${nodeId}`, nodeId, kind: 'explicit-symbol', clue: 'x', ambiguous: false };
}

function rel(partial: Partial<EvidenceRelation> & Pick<EvidenceRelation, 'id' | 'sourceNodeId' | 'targetNodeId' | 'semantics' | 'certainty'>): EvidenceRelation {
  return {
    kind: 'calls',
    provenance: {},
    residuals: [],
    ...partial,
  };
}

function expansion(relations: EvidenceRelation[]): ExpansionResult {
  return {
    visited: new Map(),
    relations: new Map(relations.map((r) => [r.id, r])),
    adjacencyRows: 0,
    rounds: 0,
    exhausted: false,
    unvisitedNodeIds: [],
  };
}

describe('Slice 3.4 — composeTraces', () => {
  it('returns empty when there are no anchors', () => {
    expect(composeTraces([], expansion([]))).toEqual([]);
  });

  it('returns empty for a single anchor with no path', () => {
    expect(composeTraces([anchor('a')], expansion([]))).toEqual([]);
  });

  it('finds a direct path between two anchors', () => {
    const r = rel({
      id: 'r1', sourceNodeId: 'a', targetNodeId: 'b',
      semantics: 'direct-call', certainty: 'observed',
    });
    const paths = composeTraces([anchor('a'), anchor('b')], expansion([r]));
    expect(paths).toHaveLength(1);
    expect(paths[0].steps).toHaveLength(1);
    expect(paths[0].status).toBe('connected');
    expect(paths[0].requiredRelationIds).toEqual(['r1']);
  });

  it('status=partial when any step is inferred/ambiguous', () => {
    const r = rel({
      id: 'r1', sourceNodeId: 'a', targetNodeId: 'b',
      semantics: 'direct-call', certainty: 'inferred',
    });
    const paths = composeTraces([anchor('a'), anchor('b')], expansion([r]));
    expect(paths[0].status).toBe('partial');
  });

  it('excludes non-execution relations from traces', () => {
    const r = rel({
      id: 'r1', sourceNodeId: 'a', targetNodeId: 'b',
      semantics: 'non-execution', certainty: 'observed',
    });
    const paths = composeTraces([anchor('a'), anchor('b')], expansion([r]));
    expect(paths).toHaveLength(0);
  });

  it('preserves alternative paths through different intermediate nodes', () => {
    // a→b→d and a→c→d: two distinct paths from a to d.
    const rs = [
      rel({ id: 'ab', sourceNodeId: 'a', targetNodeId: 'b', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'bd', sourceNodeId: 'b', targetNodeId: 'd', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'ac', sourceNodeId: 'a', targetNodeId: 'c', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'cd', sourceNodeId: 'c', targetNodeId: 'd', semantics: 'direct-call', certainty: 'observed' }),
    ];
    const paths = composeTraces([anchor('a'), anchor('d')], expansion(rs));
    // Expect 2 distinct paths from a to d.
    const aToD = paths.filter((p) => p.id.startsWith('a→d:'));
    expect(aToD.length).toBe(2);
  });

  it('avoids cycles (no infinite recursion)', () => {
    // a→b→a cycle.
    const rs = [
      rel({ id: 'ab', sourceNodeId: 'a', targetNodeId: 'b', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'ba', sourceNodeId: 'b', targetNodeId: 'a', semantics: 'direct-call', certainty: 'observed' }),
    ];
    expect(() => composeTraces([anchor('a'), anchor('b')], expansion(rs))).not.toThrow();
  });

  it('respects maxPaths ceiling', () => {
    // Build a graph with many paths.
    const rs: EvidenceRelation[] = [];
    for (let i = 0; i < 30; i++) {
      rs.push(rel({ id: `a-x${i}`, sourceNodeId: 'a', targetNodeId: `x${i}`, semantics: 'direct-call', certainty: 'observed' }));
      rs.push(rel({ id: `x${i}-b`, sourceNodeId: `x${i}`, targetNodeId: 'b', semantics: 'direct-call', certainty: 'observed' }));
    }
    const paths = composeTraces([anchor('a'), anchor('b')], expansion(rs));
    expect(paths.length).toBeLessThanOrEqual(TRACE_WORK_CEILING.maxPaths);
  });

  it('sorts paths deterministically (shorter first, then by id)', () => {
    const rs = [
      rel({ id: 'a-b', sourceNodeId: 'a', targetNodeId: 'b', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'a-c', sourceNodeId: 'a', targetNodeId: 'c', semantics: 'direct-call', certainty: 'observed' }),
      rel({ id: 'c-b', sourceNodeId: 'c', targetNodeId: 'b', semantics: 'direct-call', certainty: 'observed' }),
    ];
    const paths = composeTraces([anchor('a'), anchor('b')], expansion(rs));
    // Shorter path (a→b direct) should come first.
    expect(paths[0].steps.length).toBeLessThanOrEqual(paths[paths.length - 1].steps.length);
  });
});
