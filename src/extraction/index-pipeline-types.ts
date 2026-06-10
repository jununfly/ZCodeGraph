/**
 * Index Pipeline Types
 *
 * Defines the pipeline interface and stage contracts for indexing lifecycle
 * orchestration. Extracted from ExtractionOrchestrator.indexAll() to make
 * each stage independently testable behind explicit I/O boundaries.
 */

import type { ExtractionError, ExtractionResult, Language } from '../types';
import type { IndexProgress } from './index';
import type { IndexResult } from './index';
import type { QueryBuilder } from '../db/queries';

// ─── Pipeline Context ────────────────────────────────────────────────────────

/**
 * Shared context carried through every pipeline stage.
 * Each stage reads what it needs and writes its contributions.
 */
export interface IndexContext {
  /** Absolute project root directory */
  rootDir: string;

  /** Database query builder for storage operations */
  queries: QueryBuilder;

  /** Progress callback — stages call this to report progress */
  onProgress?: (progress: IndexProgress) => void;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;

  /** Whether to emit verbose worker logs */
  verbose?: boolean;

  // ── Stage outputs (populated by each stage) ──

  /** Scanned file list (populated by ScanStage) */
  files?: string[];

  /** Detected framework names (populated by ScanStage) */
  frameworkNames?: string[];

  /** Counters (populated by ParseStage, updated by RetryStage) */
  filesIndexed?: number;
  filesSkipped?: number;
  filesErrored?: number;
  totalNodes?: number;
  totalEdges?: number;

  /** Accumulated errors across all stages */
  errors?: ExtractionError[];

  /** Start timestamp for duration calculation */
  startTime?: number;

  /** Whether to use a worker thread for parsing */
  useWorker?: boolean;

  /** Languages needed for parsing (populated by ScanStage) */
  neededLanguages?: Language[];

  /** Path to the compiled parse worker script */
  parseWorkerPath?: string;

  /** Node/edge counts before indexing (for delta calculation) */
  beforeNodes?: number;
  beforeEdges?: number;

  /** Raw parse results keyed by file path (populated by ParseStage) */
  parseResults?: Map<string, ExtractionResult>;
}

// ─── Stage Result ─────────────────────────────────────────────────────────────

/**
 * Result returned by each pipeline stage.
 * A stage can abort the pipeline by setting `aborted: true`.
 */
export interface IndexStageResult {
  /** Whether the pipeline should abort after this stage */
  aborted?: boolean;

  /** Abort reason (required if aborted) */
  abortReason?: string;

  /** Additional errors to accumulate */
  errors?: ExtractionError[];
}

// ─── Pipeline Stage Interface ────────────────────────────────────────────────

/**
 * A single stage in the indexing pipeline.
 * Each stage receives the shared context, mutates it, and returns a result.
 */
export interface IndexStage {
  /** Human-readable stage name (for logging and tests) */
  readonly name: string;

  /** Execute this stage, reading from and writing to the shared context */
  execute(ctx: IndexContext): Promise<IndexStageResult>;
}

// ─── Pipeline Interface ──────────────────────────────────────────────────────

/**
 * Indexing pipeline that runs a sequence of stages in order.
 * Each stage receives a shared IndexContext and can read/write to it.
 */
export interface IndexPipeline {
  /** Run all registered stages in order */
  run(ctx: IndexContext): Promise<IndexResult>;

  /** Register a stage (appended to the end) */
  register(stage: IndexStage): void;

  /** Get the ordered list of registered stages */
  stages(): readonly IndexStage[];
}
