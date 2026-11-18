/**
 * Slice 3.6: End-to-end integration matrix.
 *
 * Verifies the Slice 3 pipeline (anchor → expansion → trace → closure)
 * composes correctly and that the universal algorithm contains NO
 * repo/framework special-casing.
 *
 * This is an integration test only — it does NOT wire the new pipeline
 * into ExploreApplication. That switch is reserved for a separate
 * semantic-migration authorization (per Slice 3 scoping decision).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveAnchors, type AnchorGraphRead } from '../src/explore/anchors';
import { expandFromAnchors, type ExpansionGraphRead } from '../src/explore/expansion';
import { composeTraces } from '../src/explore/trace';
import { closeObligations, interpretQuery } from '../src/explore/closure';
import { makeSnapshotIdentity } from '../src/explore/snapshot';
import { InMemoryExploreReadSnapshot } from '../src/explore/snapshot-observer';
import type { Node, Edge } from '../src/types';

// ---------------------------------------------------------------------------
// End-to-end pipeline
// ---------------------------------------------------------------------------

describe('Slice 3.6 — end-to-end pipeline', () => {
  it('composes anchor → expansion → trace → closure on a small synthetic graph', () => {
    // Synthetic graph: User.find → Database.connect (direct-call, observed).
    const userFind: Node = {
      id: 'n-user-find', name: 'find', kind: 'method',
      filePath: 'user.ts', startLine: 10, endLine: 20,
    } as Node;
    const dbConnect: Node = {
      id: 'n-db-connect', name: 'connect', kind: 'method',
      filePath: 'db.ts', startLine: 5, endLine: 15,
    } as Node;
    const callEdge: Edge = {
      source: 'n-user-find', target: 'n-db-connect',
      kind: 'calls', edgeOrigin: 'tree-sitter',
    } as Edge;

    const anchorGraph: AnchorGraphRead = {
      getNodesByName: (name) => {
        if (name === 'find') return [userFind];
        if (name === 'connect') return [dbConnect];
        return [];
      },
      getNodesByKind: () => [],
    };
    const expansionGraph: ExpansionGraphRead = {
      getOutgoingEdges: (id) => (id === 'n-user-find' ? [callEdge] : []),
      getIncomingEdges: (id) => (id === 'n-db-connect' ? [callEdge] : []),
      getNode: () => undefined,
    };
    const snapshot = new InMemoryExploreReadSnapshot(
      makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
    );

    // Anchor discovery
    const anchorResult = resolveAnchors('User.find Database.connect', anchorGraph, snapshot);
    expect(anchorResult.uniqueAnchorCount).toBe(2);

    // Bounded expansion
    const allAnchors = anchorResult.anchors.flatMap((a) => a.matches);
    const expansionResult = expandFromAnchors(allAnchors, expansionGraph, snapshot);
    expect(expansionResult.visited.size).toBe(2);
    expect(expansionResult.relations.size).toBe(1);

    // Trace composition
    const traces = composeTraces(allAnchors, expansionResult);
    expect(traces.length).toBeGreaterThan(0);
    expect(traces[0].status).toBe('connected');

    // Obligation closure
    const interpretation = interpretQuery('how does User.find call Database.connect', allAnchors);
    const closure = closeObligations(interpretation, allAnchors, expansionResult, traces);
    const defObs = closure.obligations.filter((o) => o.role === 'definition');
    expect(defObs.every((o) => o.disposition === 'satisfied')).toBe(true);
    const invObs = closure.obligations.filter((o) => o.role === 'invocation-site');
    expect(invObs.length).toBeGreaterThan(0);
    expect(invObs.every((o) => o.disposition === 'satisfied')).toBe(true);
    expect(closure.gaps.filter((g) => g.reason === 'graph-semantics-blocker')).toHaveLength(0);
  });

  it('emits graph-semantics-blocker when the graph lacks the requested relation', () => {
    const node: Node = {
      id: 'n-foo', name: 'foo', kind: 'function',
      filePath: 'foo.ts', startLine: 1, endLine: 5,
    } as Node;
    const anchorGraph: AnchorGraphRead = {
      getNodesByName: () => [node],
      getNodesByKind: () => [],
    };
    const expansionGraph: ExpansionGraphRead = {
      getOutgoingEdges: () => [],
      getIncomingEdges: () => [],
      getNode: () => undefined,
    };
    const snapshot = new InMemoryExploreReadSnapshot(
      makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
    );

    const anchorResult = resolveAnchors('foo', anchorGraph, snapshot);
    const allAnchors = anchorResult.anchors.flatMap((a) => a.matches);
    const expansionResult = expandFromAnchors(allAnchors, expansionGraph, snapshot);
    const traces = composeTraces(allAnchors, expansionResult);

    const interpretation = interpretQuery('where is foo registered', allAnchors);
    const closure = closeObligations(interpretation, allAnchors, expansionResult, traces);

    const regOb = closure.obligations.find((o) => o.role === 'registration-site');
    expect(regOb?.disposition).toBe('unresolved');
    expect(closure.gaps.some((g) => g.reason === 'graph-semantics-blocker')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No repo/framework special-casing (contract §473-§475)
// ---------------------------------------------------------------------------

describe('Slice 3.6 — no repo/framework special-casing', () => {
  const MODULE_PATHS = [
    'src/explore/anchors.ts',
    'src/explore/expansion.ts',
    'src/explore/trace.ts',
    'src/explore/closure.ts',
    'src/explore/obligations.ts',
  ];

  const FORBIDDEN_PATTERNS = [
    /if\s*\([^)]*\b(?:flask|django|express|gin|spring|rails|laravel|fastapi|drupal|aspnet)\b/i,
    /\brepo(?:sitory)?\s*===?\s*['"]/i,
    /\bframework\s*===?\s*['"]/i,
    /\bswitch\s*\(\s*(?:repo|framework)/i,
  ];

  for (const path of MODULE_PATHS) {
    it(`${path} contains no repo/framework branches`, () => {
      const text = readFileSync(resolve(__dirname, '..', path), 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(pattern.test(text), `${path} matched forbidden pattern ${pattern}`).toBe(false);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Inferred / ambiguous relations never upgrade to observed (§434-§437)
// ---------------------------------------------------------------------------

describe('Slice 3.6 — inferred/ambiguous stay non-observed', () => {
  it('a heuristic direct-call never produces status=connected trace', () => {
    const userFind: Node = {
      id: 'a', name: 'find', kind: 'method',
      filePath: 'user.ts', startLine: 10, endLine: 20,
    } as Node;
    const dbConnect: Node = {
      id: 'b', name: 'connect', kind: 'method',
      filePath: 'db.ts', startLine: 5, endLine: 15,
    } as Node;
    const heuristicEdge: Edge = {
      source: 'a', target: 'b', kind: 'calls', edgeOrigin: 'heuristic',
    } as Edge;

    const anchorGraph: AnchorGraphRead = {
      getNodesByName: (name) => (name === 'find' ? [userFind] : name === 'connect' ? [dbConnect] : []),
      getNodesByKind: () => [],
    };
    const expansionGraph: ExpansionGraphRead = {
      getOutgoingEdges: (id) => (id === 'a' ? [heuristicEdge] : []),
      getIncomingEdges: (id) => (id === 'b' ? [heuristicEdge] : []),
      getNode: () => undefined,
    };
    const snapshot = new InMemoryExploreReadSnapshot(
      makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
    );

    const anchorResult = resolveAnchors('find connect', anchorGraph, snapshot);
    const allAnchors = anchorResult.anchors.flatMap((a) => a.matches);
    const expansionResult = expandFromAnchors(allAnchors, expansionGraph, snapshot);
    const traces = composeTraces(allAnchors, expansionResult);

    // The trace must NOT be connected: heuristic is not observed.
    expect(traces.every((t) => t.status === 'partial')).toBe(true);
  });
});
