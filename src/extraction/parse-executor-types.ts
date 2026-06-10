/**
 * Parse Executor Interface
 *
 * Isolates parse execution behind worker and in-process adapters.
 * Each executor handles its own lifecycle: initialization, parse
 * requests, and cleanup. Callers use the same interface regardless
 * of whether parsing happens in a worker thread or in-process.
 */

import type { ExtractionResult, Language } from '../types';

// ─── Parse request ──────────────────────────────────────────────────────────

/**
 * A single parse request — the file to parse and its content.
 */
export interface ParseRequest {
  /** Absolute or relative file path (for language detection + error reporting) */
  filePath: string;
  /** Full file content */
  content: string;
}

/**
 * Result of a parse execution — wraps ExtractionResult with metadata
 * the executor may add (e.g., worker timing, retry count).
 */
export interface ParseExecutionResult {
  /** The extraction result from tree-sitter */
  result: ExtractionResult;
  /** Whether this result came from a worker thread */
  fromWorker: boolean;
  /** Number of retries attempted (0 = first try) */
  retryCount: number;
}

// ─── Executor lifecycle ─────────────────────────────────────────────────────

/**
 * ParseExecutor: the single interface for all parse execution.
 *
 * Two implementations:
 *   - WorkerParseExecutor  — worker_threads-based (production path)
 *   - InProcessParseExecutor — direct extractFromSource() (test/fallback)
 */
export interface ParseExecutor {
  /** Human-readable name for diagnostics */
  readonly name: string;

  /**
   * Initialize the executor: load grammars, start worker, etc.
   * Must be called once before parse(). Idempotent.
   */
  initialize(languages: Language[], frameworkNames: string[]): Promise<void>;

  /**
   * Parse a single file. May throw on timeout, worker crash, or
   * unrecoverable parse errors.
   */
  parse(request: ParseRequest): Promise<ParseExecutionResult>;

  /**
   * Clean up resources: terminate worker, clear state.
   * After dispose(), initialize() must be called again before parse().
   */
  dispose(): Promise<void>;
}

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Configuration for parse executors.
 */
export interface ParseExecutorConfig {
  /** Timeout per parse in ms (default 10s + content-length-based scaling) */
  parseTimeoutMs?: number;
  /** Recycle worker after this many parses (default 250) */
  workerRecycleInterval?: number;
  /** Periodic parser reset interval for WASM heap (default 5000) */
  parserResetInterval?: number;
}

export const DEFAULT_PARSE_TIMEOUT_MS = 10_000;
export const DEFAULT_WORKER_RECYCLE_INTERVAL = 250;
