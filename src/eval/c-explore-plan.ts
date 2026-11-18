import { isConfigLeafNode } from '../utils';
import type { ExplorePlan, ExplorePlanEntry, FileGroup } from '../explore/types';
import type { EvaluationExploreProjection } from './explore-projection';

export type EvaluationExplorePlan = ExplorePlan & EvaluationExploreProjection;
import type CodeGraph from '../index';

// This helper is imported by the evaluation harness, never registered by the
// production MCP server or read by plan(). It deliberately cannot alter A.

/**
 * Evaluation-only C composition: preserve the baseline planner's graph and
 * rendering policy, replacing only file union/order. A symbol-only file must
 * contribute real indexed nodes; an empty group is never a valid Explore answer.
 */
export function composeSymbolOnlyPlan(
  cg: CodeGraph,
  baseline: ExplorePlan,
  candidates: ReadonlyArray<readonly [string, FileGroup]>,
): EvaluationExplorePlan {
  const subgraph = {
    ...baseline.subgraph,
    nodes: new Map(baseline.subgraph.nodes),
  };
  const fileGroups = new Map(baseline.fileGroups);
  const sortedFiles: Array<[string, FileGroup]> = [];
  const entries: ExplorePlanEntry[] = [];
  const oldEntries = new Map(baseline.entries.map((entry) => [entry.filePath, entry]));
  const symbolHitNodeIds = new Set<string>();
  const symbolHitRanks = new Map<string, number>();
  for (const [, original] of candidates) {
    const hitIds = (original as FileGroup & { symbolHitIds?: ReadonlySet<string> }).symbolHitIds;
    const hitRanks = (original as FileGroup & { symbolHitRanks?: ReadonlyMap<string, number> }).symbolHitRanks;
    for (const [id, rank] of hitRanks ?? []) if (hitIds?.has(id)) symbolHitRanks.set(id, rank);
  }
  for (const [filePath, original] of candidates) {
    const provenance = (original as FileGroup & { symbolHitIds?: ReadonlySet<string> }).symbolHitIds;
    const symbolHitIds = new Set(provenance);
    const nodes = cg.getNodesInFile(filePath)
      .filter((node) => node.kind !== 'import' && node.kind !== 'export' && !isConfigLeafNode(node));
    if (nodes.length === 0) throw new Error(`C candidate has no renderable graph nodes: ${filePath}`);
    // C changes file union/order, not the baseline's evidence scope. Reusing
    // every incidental node can exceed the renderer's final hard ceiling even
    // though each necessary file bypasses the ordinary budget. Keep the nodes
    // the baseline planner designated as the answer; symbol-only files still
    // receive their real nodes below.
    const designated = original.nodes.filter((node) => baseline.entryNodeIds.has(node.id)
      || baseline.spine.pathNodeIds.has(node.id)
      || baseline.spine.namedNodeIds.has(node.id)
      || baseline.spine.uniqueNamedNodeIds.has(node.id)
      || symbolHitIds.has(node.id));
    // The symbol-only group starts empty by design, so resolve its hits against
    // the file's actual indexed nodes rather than looking only in original.nodes.
    // Do not turn the other, unrecalled nodes into necessary full-file evidence.
    const evidence = [...new Map([
      ...nodes.filter((node) => symbolHitIds.has(node.id)),
      ...designated,
    ].map((node) => [node.id, node])).values()];
    for (const node of nodes) if (symbolHitIds.has(node.id)) symbolHitNodeIds.add(node.id);
    const group = { ...original, nodes: evidence, score: original.score || evidence.length };
    fileGroups.set(filePath, group);
    sortedFiles.push([filePath, group]);
    for (const node of nodes) subgraph.nodes.set(node.id, node);
    entries.push(oldEntries.get(filePath) ?? {
      filePath,
      symbols: [...new Set(nodes.map((node) => node.name))],
      evidenceValue: nodes.some((node) => symbolHitNodeIds.has(node.id))
        ? 'critical' : 'compressible',
      renderMode: 'full',
      reason: 'C symbol-union candidate',
      score: group.score,
    });
  }
  return { ...baseline, subgraph, fileGroups, sortedFiles, entries, symbolHitNodeIds, symbolHitRanks };
}

/** C carries only relationships internal to its selected evidence, not all
 * nodes belonging to newly recalled files. Baseline production plans are
 * returned unchanged; this also makes independent C renders order-invariant. */
export function projectSymbolOnlyRelationships(plan: EvaluationExplorePlan): EvaluationExplorePlan {
  if (!plan.symbolHitNodeIds) return plan;
  const selected = new Set(plan.sortedFiles.flatMap(([, group]) => group.nodes.map((node) => node.id)));
  return {
    ...plan,
    subgraph: {
      ...plan.subgraph,
      nodes: new Map([...plan.subgraph.nodes].filter(([id]) => selected.has(id))),
      edges: plan.subgraph.edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)),
    },
  };
}
