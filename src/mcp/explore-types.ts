/**
 * Explore Planner Types
 *
 * Types that model the output of the explore planner seam — the data
 * the renderer needs to produce a markdown answer without knowing how
 * planning decisions were made.
 *
 * Part of Phase 1: Extract ExplorePlanner / ExploreRenderer.
 * See docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md
 */

import type { Node, Subgraph } from '../types';

// ===========================================================================
// ExploreOutputBudget
// ===========================================================================

/**
 * Adaptive output budget tier computed from project file count.
 *
 * Controls how much source context the explore answer can include,
 * scaled so small projects get tighter answers and large projects
 * get enough context to be useful.
 *
 * Mirrors the existing `ExploreOutputBudget` in tools.ts.  Eventually
 * that definition should re-export from here to keep the single source
 * of truth.
 */
export interface ExploreOutputBudget {
  /** Hard cap on total output characters. */
  maxOutputChars: number;
  /** Default `maxFiles` when the caller didn't specify one. */
  defaultMaxFiles: number;
  /** Cap on contiguous source returned per file (across all its clusters). */
  maxCharsPerFile: number;
  /** Cluster gap threshold in lines — tighter clustering on small projects. */
  gapThreshold: number;
  /** Max symbols listed in the per-file header (`#### path — sym(kind), ...`). */
  maxSymbolsInFileHeader: number;
  /** Max edges shown per relationship kind in the Relationships section. */
  maxEdgesPerRelationshipKind: number;
  /** Include the "Relationships" section. */
  includeRelationships: boolean;
  /** Include the "Additional relevant files (not shown)" trailing list. */
  includeAdditionalFiles: boolean;
  /** Include the "Complete source code is included above…" reminder. */
  includeCompletenessSignal: boolean;
  /** Include the explore-budget reminder at the end. */
  includeBudgetNote: boolean;
  /**
   * Hard-drop test/spec/icon/i18n files from the relevant-file set unless
   * the query itself mentions tests.
   */
  excludeLowValueFiles: boolean;
}

// ===========================================================================
// FlowSpine
// ===========================================================================

/**
 * Result of tracing the call-path spine through named symbols.
 *
 * The spine is the actual chain of calls the agent asked about;
 * everything else is context around it.  The spine determines
 * which files are kept full and which may be skeletonized.
 */
export interface FlowSpine {
  /** Human-readable description of the call chain. */
  text: string;
  /** Node ids on the actual traced call path (the spine). */
  pathNodeIds: Set<string>;
  /** All callable entities the agent named (superset of pathNodeIds). */
  namedNodeIds: Set<string>;
  /**
   * Named callable entities that are unique (≤ 3 definitions) in the graph.
   * Safe to spare a file from skeletonization when one of these is present.
   */
  uniqueNamedNodeIds: Set<string>;
}

// ===========================================================================
// ExplorePlan
// ===========================================================================

/**
 * A file group: nodes in a file with their aggregated relevance score.
 */
export interface FileGroup {
  nodes: Node[];
  score: number;
}

/**
 * The complete planning output for an explore query.
 *
 * `ExplorePlan` captures every decision the planner makes before
 * rendering begins: budget, subgraph collection, file scoring and
 * sorting, flow spine, and adaptive-sizing signals.  The renderer
 * consumes this plan to produce the final markdown answer.
 *
 * Key domain concepts (see ZJ-CONTEXT.md):
 * - **Evidence Scope** — which files/symbols/relationships are included.
 * - **Evidence Value** — the expected contribution of each piece of
 *   evidence to agent sufficiency (captured in scores and sorting).
 * - **Output Budget** — finite capacity allocated by evidence value,
 *   not by raw repository coverage.
 */
export interface ExplorePlan {
  // ===== Input =====
  /** The validated, cleaned user query. */
  query: string;

  // ===== Budget =====
  /** Adaptive output budget computed from project file count. */
  budget: ExploreOutputBudget;
  /** maxFiles clamped to [1, 20]. */
  maxFiles: number;

  // ===== Subgraph & Seeding =====
  /** The collected subgraph (nodes, edges, roots). */
  subgraph: Subgraph;
  /**
   * Union of subgraph roots and named seeds — the entry points
   * into the evidence scope.
   */
  entryNodeIds: Set<string>;

  // ===== File Scoring & Sorting =====
  /** File path → scored file group. */
  fileGroups: Map<string, FileGroup>;
  /** Files that survived the relevance threshold, sorted by priority. */
  sortedFiles: Array<[string, FileGroup]>;

  // ===== Flow Spine =====
  /** The call-path spine traced through named symbols. */
  spine: FlowSpine;

  // ===== Adaptive Sizing Signal =====
  /** Whether CODEGRAPH_ADAPTIVE_EXPLORE is enabled (skeletonization on). */
  adaptiveEnabled: boolean;

  // ===== Glue Nodes (Issue #25) =====
  /** Nodes added as callers/callees of entry roots, from subgraph files. */
  glueNodeIds: Set<string>;

  // ===== Connectivity (Issue #25) =====
  /** Nodes directly connected by edge to any entryNodeIds. */
  connectedToEntry: Set<string>;

  // ===== Central Files (Issue #25) =====
  /** Top 1-2 graph-central files that also match a query term. */
  centralFiles: Set<string>;

  // ===== Project Root (Issue #25) =====
  /** Project root path, read from CodeGraph. */
  projectRoot: string;
}
