/**
 * Shared blast-radius Module per DES-cli-p1-modularity-and-explore-v1
 * §Shared blast-radius Module.
 *
 * `buildExploreBlastRadius` computes data (entries) without pre-formatting a
 * string; `renderExploreBlastRadius` (in `blast-radius-renderer.ts`) turns the
 * data into the Markdown section. CLI and MCP Adapters share both, so neither
 * transport keeps a private copy of the policy.
 *
 * The production implementation injects the canonical `isTestFile` predicate
 * at module composition; no second pattern list is introduced.
 */

import type { Node, Subgraph } from '../types';

/**
 * Narrow graph seam. The full `CodeGraph` is structurally usable; tests can
 * supply a small fake without constructing a DB.
 */
export interface ExploreCallerLookup {
  getCallers(nodeId: string): Array<{ node: Node }>;
}

export interface ExploreBlastEntry {
  entryNode: Node;
  /** Unique caller nodes (not unique files). */
  callerCount: number;
  /** Unique non-test paths, discovery order. */
  callerFiles: string[];
  /** Unique test paths, discovery order. */
  testFiles: string[];
}

export interface ExploreBlastRadius {
  entries: ExploreBlastEntry[];
}

/** Canonical test-file predicate, injected at composition time. */
export type IsTestFilePredicate = (filePath: string) => boolean;

const ROOT_CAP = 5;
const MEANINGFUL = new Set<string>([
  'function', 'method', 'class', 'interface', 'struct', 'trait', 'protocol',
  'enum', 'type_alias', 'component', 'constant', 'variable', 'property', 'field',
]);

/**
 * Compute the blast radius for the entry symbols of an explore subgraph.
 *
 * Behavior preserved from the legacy `ToolsHandler.buildBlastRadiusSection`:
 * 1. Select `subgraph.entryNodes`, resolve to nodes, keep meaningful kinds,
 *    cap at the first 5 before caller lookup.
 * 2. For each selected entry, call `getCallers` once. Preserve the per-entry
 *    skip if that lookup throws.
 * 3. Deduplicate caller nodes by ID in returned order. `callerCount` counts
 *    those unique nodes. Skip the entry if there are none.
 * 4. Normalize `\` to `/`, deduplicate caller file paths in discovery order,
 *    and partition with the canonical `isTestFile`. No sorting.
 * 5. The renderer (separate module) decides whether to emit the section.
 */
export function buildExploreBlastRadius(
  graph: ExploreCallerLookup,
  subgraph: Subgraph,
  isTestFile: IsTestFilePredicate,
): ExploreBlastRadius {
  const rel = (p: string) => p.replace(/\\/g, '/');

  const entryNodes = subgraph.entryNodes
    .map((id) => subgraph.nodes.get(id))
    .filter((n): n is Node => !!n && MEANINGFUL.has(n.kind))
    .slice(0, ROOT_CAP);
  if (entryNodes.length === 0) return { entries: [] };

  const entries: ExploreBlastEntry[] = [];
  for (const entryNode of entryNodes) {
    let callers: Array<{ node: Node }> = [];
    try {
      callers = graph.getCallers(entryNode.id) as Array<{ node: Node }>;
    } catch {
      // Skip this Entry Node — preserve the legacy per-entry skip so one
      // unavailable entry does not fabricate a zero-caller result.
      continue;
    }

    const seen = new Set<string>();
    const uniq: Node[] = [];
    for (const c of callers) {
      if (c?.node && !seen.has(c.node.id)) {
        seen.add(c.node.id);
        uniq.push(c.node);
      }
    }
    if (uniq.length === 0) continue;

    const callerFiles = [...new Set(uniq.map((n) => rel(n.filePath)))];
    const testFiles = callerFiles.filter((f) => isTestFile(f));
    const nonTest = callerFiles.filter((f) => !isTestFile(f));

    entries.push({
      entryNode,
      callerCount: uniq.length,
      callerFiles: nonTest,
      testFiles,
    });
  }

  return { entries };
}
