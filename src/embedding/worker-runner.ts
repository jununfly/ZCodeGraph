/**
 * Embedding worker runner (roadmap 1-4-29, ADR-0009 D2).
 *
 * Owns the worker_threads.Worker lifecycle for the embed pipeline. The
 * worker itself (`worker.ts`) is a thin batch processor; this module is the
 * single place in the main process that decides WHEN to spawn it.
 *
 * Design invariants (1-4-29 Q1):
 *   - **Lazy start** — the worker is spawned only when there is actual work
 *     (first `notifyEnqueued`). No-op process stays at the same memory
 *     footprint as today (fastembed init adds ~264MB).
 *   - **Single worker per process** — the queue's transactional claim is
 *     already cross-process safe; in-process we keep exactly one worker to
 *     bound ONNX runtime memory.
 *   - **30s idle shutdown** — when the worker reports `idle` (queue drained)
 *     we schedule a terminate; new work cancels the timer. Keeps long-lived
 *     MCP servers from holding 264MB indefinitely while preserving fast
 *     restart (~220ms) for bursty edit streams.
 *   - **Crash recovery** — on worker error/exit-nonzero we mark the worker
 *     slot empty; the next `notifyEnqueued` spawns a fresh worker which
 *     runs `resetStaleInProgressEmbeddings` before claiming.
 *
 * The runner never blocks the caller — `notifyEnqueued` is fire-and-forget.
 * `drainAndExit()` is the explicit "CI 收口" path used by
 * `zcodegraph index --wait-embeddings`: it spawns the worker, waits for the
 * queue to empty (or for `permanentFailureOnModelMissing` to fail every
 * row), then terminates the worker and resolves.
 */

import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import { logDebug, logWarn } from '../errors';
import type { WorkerToParentMessage } from './worker';

/** Idle timeout before we terminate the worker to reclaim memory. */
const IDLE_SHUTDOWN_MS = 30_000;

export interface EmbeddingRunnerOptions {
  /** Absolute path to `.zcodegraph/zcodegraph.db`. */
  dbPath: string;
  /** Absolute path to project root (for resolving `files.path`). */
  projectRoot: string;
  /** Absolute path to the sqlite-vec vec0 extension binary. */
  vec0Path: string;
  /** fastembed cache directory (default `<projectRoot>/.zcodegraph/models`). */
  modelsDir?: string;
  /**
   * When true, missing fastembed marks rows failed (used by --wait-embeddings
   * to avoid an infinite requeue). When false (default, production MCP path),
   * rows stay `pending` and the next drain retries.
   */
  permanentFailureOnModelMissing?: boolean;
  /**
   * Test-only override for the worker entrypoint (defaults to
   * `dist/embedding/worker.js`). Lets unit tests substitute a mock worker.
   */
  workerEntrypoint?: string;
}

interface WorkerHandle {
  worker: Worker;
  ready: Promise<void>;
  idleTimer: NodeJS.Timeout | null;
  idleResolve: (() => void) | null;
}

/**
 * Process-wide registry of runners, keyed by dbPath. Multiple CodeGraph
 * instances in the same process (e.g. MCP serving several projects) must
 * share one worker per DB to avoid ONNX init cost × projects.
 */
const runnersByDbPath = new Map<string, EmbeddingRunner>();

export class EmbeddingRunner {
  private readonly opts: Required<Omit<EmbeddingRunnerOptions, 'workerEntrypoint'>> & {
    workerEntrypoint?: string;
  };
  private handle: WorkerHandle | null = null;

  constructor(options: EmbeddingRunnerOptions) {
    const modelsDir =
      options.modelsDir ??
      path.join(options.projectRoot, '.zcodegraph', 'models');
    this.opts = {
      dbPath: options.dbPath,
      projectRoot: options.projectRoot,
      vec0Path: options.vec0Path,
      modelsDir,
      permanentFailureOnModelMissing: options.permanentFailureOnModelMissing ?? false,
      ...(options.workerEntrypoint ? { workerEntrypoint: options.workerEntrypoint } : {}),
    };
  }

  /**
   * Get-or-create the runner for a given DB. Cross-CodeGraph-instance safe.
   */
  static forDatabase(options: EmbeddingRunnerOptions): EmbeddingRunner {
    const existing = runnersByDbPath.get(options.dbPath);
    if (existing) return existing;
    const created = new EmbeddingRunner(options);
    runnersByDbPath.set(options.dbPath, created);
    return created;
  }

  /** Test-only: drop the registry so each test gets a fresh runner. */
  static resetRegistryForTests(): void {
    runnersByDbPath.clear();
  }

  /**
   * Notify the runner that new rows may be pending. Spawns the worker if
   * necessary; otherwise cancels the idle-shutdown timer and nudges the
   * worker to drain. Cheap and non-blocking.
   */
  notifyEnqueued(): void {
    const handle = this.ensureStarted();
    if (handle.idleTimer) {
      clearTimeout(handle.idleTimer);
      handle.idleTimer = null;
    }
    handle.worker.postMessage({ type: 'drain' });
  }

  /**
   * Block until the queue is empty (or all remaining rows have failed).
   * Used by `zcodegraph index --wait-embeddings` for CI 收口.
   */
  async drainAndExit(): Promise<{ processed: number; failed: number }> {
    const handle = this.ensureStarted();
    await handle.ready;
    return new Promise((resolve, reject) => {
      let processed = 0;
      let failed = 0;
      const onMessage = (msg: WorkerToParentMessage) => {
        if (msg.type === 'progress') {
          processed = msg.processed;
          failed = msg.failed;
        } else if (msg.type === 'idle') {
          cleanup();
          processed = msg.processed;
          failed = msg.failed;
          void this.shutdown();
          resolve({ processed, failed });
        } else if (msg.type === 'fatal') {
          cleanup();
          void this.shutdown();
          reject(new Error(msg.message));
        }
      };
      const onError = (err: Error) => {
        cleanup();
        void this.shutdown();
        reject(err);
      };
      const cleanup = () => {
        handle.worker.off('message', onMessage);
        handle.worker.off('error', onError);
      };
      handle.worker.on('message', onMessage);
      handle.worker.on('error', onError);
      handle.worker.postMessage({ type: 'drain' });
    });
  }

  /** Graceful shutdown. Safe to call when no worker is running. */
  async shutdown(): Promise<void> {
    const handle = this.handle;
    if (!handle) return;
    this.handle = null;
    if (handle.idleTimer) {
      clearTimeout(handle.idleTimer);
      handle.idleTimer = null;
    }
    try {
      handle.worker.postMessage({ type: 'shutdown' });
    } catch {
      /* worker may already be gone */
    }
    try {
      await handle.worker.terminate();
    } catch {
      /* already terminated */
    }
  }

  /** True when a worker is currently spawned (regardless of idle state). */
  isRunning(): boolean {
    return this.handle !== null;
  }

  private ensureStarted(): WorkerHandle {
    if (this.handle) return this.handle;

    const entrypoint =
      this.opts.workerEntrypoint ??
      // tsc emits worker.js beside this file under dist/embedding/.
      path.join(__dirname, 'worker.js');

    const worker = new Worker(entrypoint, {
      workerData: {
        dbPath: this.opts.dbPath,
        projectRoot: this.opts.projectRoot,
        vec0Path: this.opts.vec0Path,
        modelsDir: this.opts.modelsDir,
        permanentFailureOnModelMissing: this.opts.permanentFailureOnModelMissing,
      },
    });

    const handle: WorkerHandle = {
      worker,
      ready: new Promise<void>((resolve, reject) => {
        const onMsg = (msg: WorkerToParentMessage) => {
          if (msg.type === 'ready') {
            worker.off('message', onMsg);
            worker.off('error', onErr);
            resolve();
          } else if (msg.type === 'fatal') {
            worker.off('message', onMsg);
            worker.off('error', onErr);
            reject(new Error(msg.message));
          }
        };
        const onErr = (err: Error) => {
          worker.off('message', onMsg);
          worker.off('error', onErr);
          reject(err);
        };
        worker.on('message', onMsg);
        worker.on('error', onErr);
      }),
      idleTimer: null,
      idleResolve: null,
    };

    worker.on('message', (msg: WorkerToParentMessage) => {
      if (msg.type === 'log') {
        if (msg.level === 'warn') logWarn(`[embedding-worker] ${msg.message}`);
        else logDebug(`[embedding-worker] ${msg.message}`);
        return;
      }
      if (msg.type === 'idle') {
        if (handle.idleResolve) {
          handle.idleResolve();
          handle.idleResolve = null;
        }
        // Schedule idle shutdown — a new drain cancels this timer.
        if (handle.idleTimer) clearTimeout(handle.idleTimer);
        handle.idleTimer = setTimeout(() => {
          logDebug('[embedding-worker] idle timeout — terminating to reclaim memory');
          void this.shutdown();
        }, IDLE_SHUTDOWN_MS);
        return;
      }
      if (msg.type === 'fatal') {
        logWarn(`[embedding-worker] fatal: ${msg.message}`);
        void this.shutdown();
        return;
      }
    });

    worker.on('error', (err) => {
      logWarn(`[embedding-worker] error: ${err.message}`);
      void this.shutdown();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logWarn(`[embedding-worker] exited with code ${code}`);
      }
      // Ensure handle is cleared so a future notifyEnqueued spawns fresh.
      if (this.handle === handle) this.handle = null;
    });

    this.handle = handle;
    return handle;
  }
}

/**
 * Env-var gate for the whole embedding pipeline (1-4-29 Q2). Both the
 * watcher hook and the CLI flags consult this single helper so the opt-in
 * is consistent across entry points.
 */
export function embeddingEnabled(): boolean {
  return process.env.CODEGRAPH_ENABLE_EMBEDDING === '1';
}
