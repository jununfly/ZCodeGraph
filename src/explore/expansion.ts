/**
 * Slice 3.3: Bounded expansion (DES-universal-structural-explore-v1 §446-§450).
 *
 * Expand both directions from anchors through typed relations, including
 * relations that lead to new files. Search prioritizes closing obligations
 * between anchors and resolving dispatch/state boundaries, NOT general
 * graph centrality.
 *
 * Fixed implementation ceilings (§450):
 *   - seeds / visited nodes / adjacency rows / rounds / source reads.
 *   - Repeated requests or cache hits do NOT consume another unique
 *     visit/read (§494-§496).
 *   - Work exhaustion stops discovery, preserves selected requirements
 *     and adds a `search-limit` gap to each unclosed obligation. It
 *     never deletes already selected evidence or declares path absence
 *     (§490-§493).
 *
 * Same algorithm serves all repos (§473). No repo/framework branches.
 */

import type { Edge, EdgeKind, Node } from '../types';
import type { ExploreReadSnapshot } from './snapshot';
import type { AnchorMatch } from './anchors';
import type { EvidenceRelation, RelationSemantics, EvidenceCertainty } from './obligations';

// ===========================================================================
// Ceilings
// ===========================================================================

/** Fixed work ceilings for bounded expansion. */
export const EXPANSION_WORK_CEILING = Object.freeze({
  /** Max unique visited nodes. */
  maxUniqueVisitedNodes: 4096,
  /** Max adjacency rows returned (sum of in+out per node). */
  maxAdjacencyRows: 8192,
  /** Max BFS rounds from the seed set. */
  maxRounds: 8,
});

// ===========================================================================
// Graph surface
// ===========================================================================

/**
 * Narrow graph surface for expansion. Implementations MUST call
 * `snapshot.assertActive()` inside every method.
 */
export interface ExpansionGraphRead {
  getOutgoingEdges(nodeId: string): Edge[];
  getIncomingEdges(nodeId: string): Edge[];
  getNode(nodeId: string): Node | undefined;
}

// ===========================================================================
// Edge classification
// ===========================================================================

/**
 * Classify an edge into the contract's relation semantics (§311-§318).
 * Pure kind-based mapping — no repo-specific knowledge.
 *
 * `contains`/`imports`/`references` are non-execution per §422-§424:
 * they can assist discovery but cannot prove execution order. They
 * become `non-execution` semantics here.
 */
export function classifyEdgeSemantics(kind: EdgeKind): RelationSemantics {
  switch (kind) {
    case 'calls':
      return 'direct-call';
    case 'instantiates':
      return 'direct-call';
    case 'references':
      return 'non-execution';
    case 'imports':
    case 'exports':
      return 'non-execution';
    case 'contains':
      return 'non-execution';
    case 'extends':
    case 'implements':
    case 'overrides':
      // Type-level relations; they can inform dispatch boundaries but
      // are not direct runtime calls.
      return 'potential-dispatch';
    case 'decorates':
      return 'registration';
    case 'type_of':
    case 'returns':
      return 'non-execution';
    default:
      return 'non-execution';
  }
}

/**
 * Derive certainty from the edge's origin classifier. The contract
 * (§418-§421) is strict: a heuristic edge never becomes observed by
 * ranking highly.
 *
 * The four legacy edge origins map as follows:
 *   - `tree-sitter` / `rust-finalization`: direct AST/source facts → observed
 *   - `scip`: deterministic SCIP-indexed resolution → resolved
 *   - `heuristic`: identified static heuristic → inferred
 *   - missing/unknown: → ambiguous (alternatives retained)
 */
export function deriveEdgeCertainty(edge: Edge): EvidenceCertainty {
  const origin = edge.edgeOrigin;
  if (origin === 'tree-sitter' || origin === 'rust-finalization') return 'observed';
  if (origin === 'scip') return 'resolved';
  if (origin === 'heuristic') return 'inferred';
  return 'ambiguous';
}

// ===========================================================================
// Expansion result
// ===========================================================================

/** One visited node in the expansion. */
export interface VisitedNode {
  nodeId: string;
  /** BFS round at which this node was first visited. */
  round: number;
  /** How we reached this node (the relation that led to it). */
  viaRelationId?: string;
}

/** Result of bounded expansion. */
export interface ExpansionResult {
  /** All visited nodes keyed by id. */
  visited: ReadonlyMap<string, VisitedNode>;
  /** All relations discovered during expansion, keyed by id. */
  relations: ReadonlyMap<string, EvidenceRelation>;
  /** Number of adjacency rows consumed (in+out summed). */
  adjacencyRows: number;
  /** Number of BFS rounds actually executed. */
  rounds: number;
  /** True iff the search hit any ceiling before completing. */
  exhausted: boolean;
  /** Reason for exhaustion, if exhausted=true. */
  exhaustionReason?: 'visited-ceiling' | 'adjacency-ceiling' | 'rounds-ceiling';
  /** Nodes that were queued but never visited due to exhaustion. */
  unvisitedNodeIds: string[];
}

// ===========================================================================
// Relation id composition (§414-§416)
// ===========================================================================

/**
 * Compose a deterministic relation id. The id is a composite of
 * endpoints, kind/semantics, source site, origin/resolver and candidate
 * identity. Collisions retain distinct site/candidate ids rather than
 * last-write-wins.
 */
export function composeRelationId(edge: Edge, semantics: RelationSemantics): string {
  const site = edge.metadata && typeof (edge.metadata as Record<string, unknown>).registeredAt === 'string'
    ? (edge.metadata as Record<string, string>).registeredAt
    : '';
  return `${edge.source}→${edge.target}:${edge.kind}:${semantics}:${edge.edgeOrigin ?? ''}:${site}`;
}

// ===========================================================================
// Bounded expansion (BFS)
// ===========================================================================

/**
 * Expand from anchors via bounded BFS through typed relations.
 *
 * The expansion visits both directions (incoming+outgoing) so that
 * callers/callees/registration sites of an anchor are discovered in
 * the same pass. Each visited node is recorded with the round at
 * which it was first seen; revisiting an already-visited node does
 * NOT consume another unique visit.
 */
export function expandFromAnchors(
  anchors: readonly AnchorMatch[],
  graph: ExpansionGraphRead,
  snapshot: ExploreReadSnapshot,
): ExpansionResult {
  const visited = new Map<string, VisitedNode>();
  const relations = new Map<string, EvidenceRelation>();
  let adjacencyRows = 0;
  let rounds = 0;
  let exhausted = false;
  let exhaustionReason: ExpansionResult['exhaustionReason'];
  const queued: Array<{ nodeId: string; round: number; viaRelationId?: string }> = [];

  // Seed with anchors (round 0).
  for (const a of anchors) {
    if (!visited.has(a.nodeId)) {
      visited.set(a.nodeId, { nodeId: a.nodeId, round: 0 });
      queued.push({ nodeId: a.nodeId, round: 0 });
    }
  }

  while (queued.length > 0 && !exhausted) {
    snapshot.assertActive();
    const current = queued.shift()!;
    const nodeId = current.nodeId;

    // Round ceiling.
    if (current.round > EXPANSION_WORK_CEILING.maxRounds) {
      exhausted = true;
      exhaustionReason = 'rounds-ceiling';
      break;
    }
    rounds = Math.max(rounds, current.round);

    // Adjacency row ceiling.
    const outgoing = graph.getOutgoingEdges(nodeId);
    const incoming = graph.getIncomingEdges(nodeId);
    const rowsForNode = outgoing.length + incoming.length;
    if (adjacencyRows + rowsForNode > EXPANSION_WORK_CEILING.maxAdjacencyRows) {
      exhausted = true;
      exhaustionReason = 'adjacency-ceiling';
      break;
    }
    adjacencyRows += rowsForNode;

    // Process outgoing edges.
    for (const edge of outgoing) {
      const semantics = classifyEdgeSemantics(edge.kind);
      const relationId = composeRelationId(edge, semantics);
      if (!relations.has(relationId)) {
        relations.set(relationId, {
          id: relationId,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          kind: edge.kind,
          semantics,
          certainty: deriveEdgeCertainty(edge),
          provenance: { origin: edge.edgeOrigin },
          residuals: [],
        });
      }
      // Visit target.
      if (!visited.has(edge.target)) {
        if (visited.size >= EXPANSION_WORK_CEILING.maxUniqueVisitedNodes) {
          exhausted = true;
          exhaustionReason = 'visited-ceiling';
          break;
        }
        visited.set(edge.target, { nodeId: edge.target, round: current.round + 1, viaRelationId: relationId });
        queued.push({ nodeId: edge.target, round: current.round + 1, viaRelationId: relationId });
      }
    }

    if (exhausted) break;

    // Process incoming edges.
    for (const edge of incoming) {
      const semantics = classifyEdgeSemantics(edge.kind);
      const relationId = composeRelationId(edge, semantics);
      if (!relations.has(relationId)) {
        relations.set(relationId, {
          id: relationId,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          kind: edge.kind,
          semantics,
          certainty: deriveEdgeCertainty(edge),
          provenance: { origin: edge.edgeOrigin },
          residuals: [],
        });
      }
      // Visit source.
      if (!visited.has(edge.source)) {
        if (visited.size >= EXPANSION_WORK_CEILING.maxUniqueVisitedNodes) {
          exhausted = true;
          exhaustionReason = 'visited-ceiling';
          break;
        }
        visited.set(edge.source, { nodeId: edge.source, round: current.round + 1, viaRelationId: relationId });
        queued.push({ nodeId: edge.source, round: current.round + 1, viaRelationId: relationId });
      }
    }
  }

  return {
    visited,
    relations,
    adjacencyRows,
    rounds,
    exhausted,
    exhaustionReason,
    unvisitedNodeIds: queued.map((q) => q.nodeId),
  };
}
