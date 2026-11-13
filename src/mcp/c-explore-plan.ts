import { isConfigLeafNode } from '../utils';
import type { ExplorePlan, ExplorePlanEntry, FileGroup } from './explore-types';
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
): ExplorePlan {
  const subgraph = {
    ...baseline.subgraph,
    nodes: new Map(baseline.subgraph.nodes),
  };
  const fileGroups = new Map(baseline.fileGroups);
  const sortedFiles: Array<[string, FileGroup]> = [];
  const entries: ExplorePlanEntry[] = [];
  const oldEntries = new Map(baseline.entries.map((entry) => [entry.filePath, entry]));
  for (const [filePath, original] of candidates) {
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
      || baseline.spine.uniqueNamedNodeIds.has(node.id));
    // An incidental group may contain only a module/container node. Preserve
    // that group so the ordinary renderer can account for or budget-elide it.
    const evidence = original.nodes.length > 0 && designated.length > 0
      ? designated : nodes;
    const group = { ...original, nodes: evidence, score: original.score || evidence.length };
    fileGroups.set(filePath, group);
    sortedFiles.push([filePath, group]);
    for (const node of nodes) subgraph.nodes.set(node.id, node);
    entries.push(oldEntries.get(filePath) ?? {
      filePath,
      symbols: [...new Set(nodes.map((node) => node.name))],
      evidenceValue: 'compressible',
      renderMode: 'full',
      reason: 'C symbol-union candidate',
      score: group.score,
    });
  }
  return { ...baseline, subgraph, fileGroups, sortedFiles, entries };
}
