import { getExploreBudget } from './budget';
import type { ExploreGraphRead, ExploreSourceRead } from './ports';
import type { ExplorePlan, ExploreRenderModel, ExploreRuntimeOptions } from './types';

/**
 * Materialize every read the legacy renderer needs, before rendering begins.
 * This deliberately preserves its per-read fallback behavior; it is not the
 * fixed SQLite snapshot/acquisition protocol introduced by later slices.
 */
export function buildExploreRenderModel(
  graph: ExploreGraphRead,
  source: ExploreSourceRead,
  plan: ExplorePlan,
  blastRadius: string,
  runtime: ExploreRuntimeOptions,
): ExploreRenderModel {
  const fileContents = new Map<string, string>();
  for (const [filePath] of plan.sortedFiles) {
    const content = source.readText(filePath);
    if (content !== undefined) fileContents.set(filePath, content);
  }

  const outgoingEdges = new Map<string, ReturnType<ExploreGraphRead['getOutgoingEdges']>>();
  const incomingEdges = new Map<string, ReturnType<ExploreGraphRead['getIncomingEdges']>>();
  const nodeIds = new Set(plan.subgraph.nodes.keys());
  if (plan.adaptiveEnabled && plan.spine.pathNodeIds.size > 0) {
    for (const [, group] of plan.sortedFiles) {
      for (const node of group.nodes) nodeIds.add(node.id);
    }
  }
  for (const nodeId of nodeIds) {
    outgoingEdges.set(nodeId, graph.getOutgoingEdges(nodeId));
    incomingEdges.set(nodeId, graph.getIncomingEdges(nodeId));
  }
  if (plan.adaptiveEnabled) {
    for (const [, group] of plan.sortedFiles) {
      for (const node of group.nodes) {
        if (!outgoingEdges.has(node.id)) outgoingEdges.set(node.id, graph.getOutgoingEdges(node.id));
        for (const edge of outgoingEdges.get(node.id) ?? []) {
          if ((edge.kind === 'implements' || edge.kind === 'extends') && !incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, graph.getIncomingEdges(edge.target));
          }
        }
        if (!incomingEdges.has(node.id)) incomingEdges.set(node.id, graph.getIncomingEdges(node.id));
      }
    }
  }

  const extraNodes = new Map<string, import('../types').Node>();
  const lookupNode = (id: string) => {
    if (plan.subgraph.nodes.has(id) || extraNodes.has(id)) return;
    const node = graph.getNode(id);
    if (node) extraNodes.set(id, node);
  };
  for (const id of plan.spine.namedNodeIds) lookupNode(id);
  for (const edges of [...outgoingEdges.values(), ...incomingEdges.values()]) {
    for (const edge of edges) {
      if (edge.kind === 'calls' && edge.edgeOrigin === 'heuristic') {
        lookupNode(edge.source);
        lookupNode(edge.target);
      }
    }
  }

  const registrationSnippets = new Map<string, string>();
  const dynamicEdges = new Map<string, import('../types').Edge>();
  for (const edges of [...outgoingEdges.values(), ...incomingEdges.values()]) {
    for (const edge of edges) {
      if (edge.kind === 'calls' && edge.edgeOrigin === 'heuristic') {
        dynamicEdges.set(`${edge.source}>${edge.target}`, edge);
      }
    }
  }
  for (const edge of dynamicEdges.values()) {
    const metadata = edge.metadata as Record<string, unknown> | undefined;
    if (metadata?.synthesizedBy !== 'callback' || typeof metadata.registrationSnippet === 'string') continue;
    const registeredAt = typeof metadata.registeredAt === 'string' ? metadata.registeredAt : undefined;
    const match = registeredAt?.match(/^(.*):(\d+)$/);
    if (!registeredAt || !match) continue;
    const [, filePath, rawLine] = match;
    const lineNumber = Number(rawLine);
    if (!filePath || !Number.isFinite(lineNumber) || lineNumber < 1) continue;
    const content = fileContents.get(filePath) ?? source.readText(filePath);
    if (content === undefined) continue;
    if (!fileContents.has(filePath)) fileContents.set(filePath, content);
    const snippet = content.split('\n')[lineNumber - 1]?.trim().replace(/\s+/g, ' ');
    if (snippet) registrationSnippets.set(registeredAt, snippet.length > 160 ? `${snippet.slice(0, 157)}...` : snippet);
  }

  let projectFileCount: number | undefined;
  try {
    projectFileCount = graph.getStats().fileCount;
  } catch {
    // Preserve legacy: omit the budget note when stats are unavailable.
  }
  return {
    plan, blastRadius, runtime, fileContents, extraNodes, outgoingEdges, incomingEdges,
    registrationSnippets, projectFileCount,
    recommendedExploreCalls: projectFileCount === undefined ? 0 : getExploreBudget(projectFileCount),
  };
}
