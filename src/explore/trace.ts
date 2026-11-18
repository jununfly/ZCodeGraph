/**
 * Slice 3.4: Trace composition (DES-universal-structural-explore-v1 §451-§455).
 *
 * Select deterministic paths that cover distinct anchors and mechanism
 * roles. Preserve alternative bounded paths when their semantics differ.
 *
 * Explicit non-goals (§454-§455):
 *   - Do NOT reuse the legacy callable-only / calls-only / longest-chain
 *     heuristic as the universal trace algorithm.
 *   - Do NOT run an unconstrained all-pairs / Steiner search.
 *
 * Same algorithm serves all repos (§473). No repo/framework branches.
 */

import type { AnchorMatch } from './anchors';
import type { ExpansionResult } from './expansion';
import type { EvidenceRelation, TracePath, TraceStep } from './obligations';

// ===========================================================================
// Ceilings
// ===========================================================================

export const TRACE_WORK_CEILING = Object.freeze({
  /** Max paths returned. */
  maxPaths: 8,
  /** Max steps in any single path. */
  maxStepsPerPath: 16,
});

// ===========================================================================
// Path selection
// ===========================================================================

/**
 * Select deterministic paths from the expansion result.
 *
 * Strategy (Slice 3.4 baseline):
 *   1. Group relations by semantics class — direct-call / registration /
 *      scheduling / potential-dispatch are semantically distinct.
 *   2. For each anchor pair (A, B) where a path exists through typed
 *      relations, emit one path per distinct semantics sequence.
 *   3. Sort paths by (path length, canonical step sequence) for
 *      deterministic tie-break (§494-§497).
 *
 * Slice 3.4 is a *baseline* — it does not try to discover the shortest
 * or best path; it enumerates bounded alternatives so Slice 3.5 can
 * close obligations over them.
 */
export function composeTraces(
  anchors: readonly AnchorMatch[],
  expansion: ExpansionResult,
): TracePath[] {
  // Build adjacency from relations.
  const outgoing = new Map<string, EvidenceRelation[]>();
  for (const rel of expansion.relations.values()) {
    if (!outgoing.has(rel.sourceNodeId)) outgoing.set(rel.sourceNodeId, []);
    outgoing.get(rel.sourceNodeId)!.push(rel);
  }

  const anchorIds = new Set(anchors.map((a) => a.nodeId));
  const paths: TracePath[] = [];

  // For each anchor, run a bounded DFS to find paths to other anchors.
  for (const start of anchorIds) {
    const visited = new Set<string>();
    const stack: TraceStep[] = [];
    const requiredRelationIds: string[] = [];

    const dfs = (nodeId: string): void => {
      if (paths.length >= TRACE_WORK_CEILING.maxPaths) return;
      if (stack.length >= TRACE_WORK_CEILING.maxStepsPerPath) return;

      // Found a path to a different anchor?
      if (nodeId !== start && anchorIds.has(nodeId) && stack.length > 0) {
        const pathId = `${start}→${nodeId}:${stack.map((s) => s.relationId).join('|')}`;
        // Avoid emitting the same path twice.
        if (!paths.some((p) => p.id === pathId)) {
          const allConnected = stack.every((s) => {
            const rel = expansion.relations.get(s.relationId);
            return rel && (rel.certainty === 'observed' || rel.certainty === 'resolved');
          });
          paths.push({
            id: pathId,
            status: allConnected ? 'connected' : 'partial',
            steps: [...stack],
            requiredRelationIds: [...requiredRelationIds],
          });
        }
        // Continue exploring — there may be alternative paths.
      }

      for (const rel of outgoing.get(nodeId) ?? []) {
        if (paths.length >= TRACE_WORK_CEILING.maxPaths) return;
        if (stack.length >= TRACE_WORK_CEILING.maxStepsPerPath) return;
        const nextNode = rel.targetNodeId;
        // Skip if we've already visited this node in this path (avoid cycles).
        if (visited.has(nextNode)) continue;
        // Skip non-execution relations for trace composition (§422-§424).
        if (rel.semantics === 'non-execution') continue;

        visited.add(nextNode);
        stack.push({ relationId: rel.id, semantics: rel.semantics, guards: [] });
        requiredRelationIds.push(rel.id);
        dfs(nextNode);
        stack.pop();
        requiredRelationIds.pop();
        visited.delete(nextNode);
      }
    };

    visited.add(start);
    dfs(start);
    visited.delete(start);
  }

  // Deterministic tie-break: sort by (steps.length, id).
  paths.sort((a, b) => {
    if (a.steps.length !== b.steps.length) return a.steps.length - b.steps.length;
    return a.id.localeCompare(b.id);
  });

  return paths.slice(0, TRACE_WORK_CEILING.maxPaths);
}
