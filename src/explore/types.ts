/**
 * Shared Explore types — single source of truth for the Explore Module.
 *
 * Per DES-cli-p1-modularity-and-explore-v1 and DES-universal-structural-explore-v1,
 * these types live outside any transport directory so that CLI (`src/bin`) and
 * MCP (`src/mcp`) adapters share one contract. The production types in this file
 * MUST NOT carry evaluation-only signals — those belong to the harness-owned
 * `EvaluationExploreProjection`.
 */

import type { Node, Subgraph } from '../types';
import type { ExploreResult } from './answer';
import type { Utf8Budget } from './budget-utf8';

// ===========================================================================
// ExploreOutputBudget
// ===========================================================================

/**
 * Adaptive output budget tier computed from project file count.
 *
 * Controls how much source context the explore answer can include,
 * scaled so small projects get tighter answers and large projects
 * get enough context to be useful.
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
  /**
   * Include the "Blast radius" section (entry-symbol callers + tests).
   * Optional; missing = true (legacy behaviour preserved).
   */
  includeBlastRadius?: boolean;
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
 * Result of tracing the Flow Spine through named symbols.
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
// EvidenceValue
// ===========================================================================

/**
 * The expected contribution tier of a file to agent sufficiency.
 */
export type EvidenceValue = 'critical' | 'supportive' | 'compressible' | 'distracting';

// ===========================================================================
// ExplorePlanEntry
// ===========================================================================

/**
 * A single file entry in the explore plan, annotated with its evidence
 * value and source depth so the renderer can make per-file decisions
 * without recomputing plan-level logic.
 */
export interface ExplorePlanEntry {
  /** Absolute file path relative to project root. */
  filePath: string;
  /** Symbols surfaced for this file (deduplicated). */
  symbols: string[];
  /** Expected contribution tier to agent sufficiency. */
  evidenceValue: EvidenceValue;
  /** How the renderer should present this file. */
  renderMode: 'full' | 'focused' | 'skeleton' | 'omit';
  /** Human-readable reason — useful for debug fixtures and diagnostics. */
  reason: string;
  /** File-level aggregated relevance score (from FileGroup). */
  score: number;
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
 * Production plans MUST NOT carry evaluation-only signals (e.g. symbolHit*).
 * Those signals are owned by the harness-side `EvaluationExploreProjection`.
 *
 * Symbol-hit recall signals are confined to the harness-owned
 * `EvaluationExploreProjection` in `src/eval`; they are not production plan data.
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
  /** The collected subgraph (nodes, edges, Entry Nodes). */
  subgraph: Subgraph;
  /** Union of subgraph Entry Nodes and named seeds. */
  entryNodeIds: Set<string>;

  // ===== File Scoring & Sorting =====
  /** File path → scored file group. */
  fileGroups: Map<string, FileGroup>;
  /** Files that survived the relevance threshold, sorted by priority. */
  sortedFiles: Array<[string, FileGroup]>;
  /** Sorted file entries with evidence-value annotations. */
  entries: ExplorePlanEntry[];

  // ===== Flow Spine =====
  /** The Flow Spine traced through named symbols. */
  spine: FlowSpine;

  // ===== Adaptive Sizing Signal =====
  /** Whether skeletonization is enabled for this operation. */
  adaptiveEnabled: boolean;

  // ===== Glue Nodes (Issue #25) =====
  /** Nodes added as callers/callees of Entry Nodes, from subgraph files. */
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

// ===========================================================================
// P1 Composition: runtime options, application interface, render model
// ===========================================================================

/**
 * Runtime flags parsed exactly once per operation by the CLI/MCP Adapter.
 * The application, planner, evidence, and renderer receive these as data
 * and never read process.env lazily.
 */
export interface ExploreRuntimeOptions {
  adaptiveEnabled: boolean;
  lineNumbersEnabled: boolean;
  elidedMarkersEnabled: boolean;
  tightSmallProjectBudgetEnabled: boolean;
}

/** Caller-supplied options for the ExploreApplication. */
export interface ExploreOptions {
  maxFiles?: number;
  runtime: ExploreRuntimeOptions;
  /** Frozen adapter delivery inputs; legacy composition ignores these. */
  delivery?: Utf8Budget;
  signal?: AbortSignal;
}

/**
 * @deprecated Slice 1 compatibility alias. New application code consumes
 * ExploreResult; report remains internal to the application boundary.
 */
export type ExploreAnswer = ExploreResult;

/**
 * Internal completed-data contract for the pure renderer.
 *
 * `ExploreRenderModel` carries everything the legacy renderer needs from
 * `CodeGraph`, the filesystem, the project root, or the environment. Slice 1
 * materializes these fields inside `ExploreApplication` so the renderer is
 * a pure `(model) => string` function with no I/O.
 */
export interface ExploreRenderModel {
  /** The original plan — budget, subgraph, scores, spine, project root. */
  plan: ExplorePlan;
  /** Pre-rendered blast radius Markdown (empty string when omitted). */
  blastRadius: string;
  /** Runtime options snapshot for this operation. */
  runtime: ExploreRuntimeOptions;
  /**
   * File text materialized from disk for every file the renderer may visit.
   * Key = file path relative to project root, Value = raw file contents.
   */
  fileContents: ReadonlyMap<string, string>;
  /**
   * Node lookup fallback for nodes referenced by id but not present in
   * `plan.subgraph.nodes`. The renderer treats this as read-only.
   */
  extraNodes: ReadonlyMap<string, Node>;
  /**
   * Outgoing edges per node id (adjacency), used for polymorphic-sibling
   * and dynamic-dispatch lookups.
   */
  outgoingEdges: ReadonlyMap<string, readonly import('../types').Edge[]>;
  /**
   * Incoming edges per node id (adjacency), used for supertype implementer
   * counts and dynamic-dispatch lookups.
   */
  incomingEdges: ReadonlyMap<string, readonly import('../types').Edge[]>;
  /**
   * Pre-resolved registration snippets keyed by `filePath:line`. Eliminates
   * the legacy `registrationSnippetFromLocation` filesystem read inside the
   * renderer.
   */
  registrationSnippets: ReadonlyMap<string, string>;
  /** Project size (file count) used by the budget-note section. */
  projectFileCount: number | undefined;
  /** Total explore calls recommended for this project size. */
  recommendedExploreCalls: number;
}

/**
 * Application Module interface consumed by CLI and MCP adapters.
 *
 * Per the contract: the default implementation performs only the existing
 * sequence (plan, empty check, budget-gated blast radius, materialize
 * evidence/render model, render). Adapters do not reimplement planning,
 * blast-radius, evidence loading, or formatting policy.
 */
export interface ExploreApplication {
  explore(
    graph: import('../index').default,
    query: string,
    options: ExploreOptions,
  ): Promise<ExploreResult>;
}
