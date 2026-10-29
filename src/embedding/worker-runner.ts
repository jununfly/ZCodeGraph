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
import { readBooleanFlag } from '../config/flags';
import type { WorkerToParentMessage } from './worker';

// Kept outside the application adapter: checking drain completion must not
// trigger migrations or create a second long-lived application connection.
// Load lazily so importing the SDK retains the existing Node-version guard.
type QueueDatabase = {
  prepare(sql: string): { get(...params: unknown[]): Record<string, unknown> | undefined };
  close(): void;
};

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
  /** Test-only extra worker data; production workers ignore this field. */
  workerData?: { mode?: string };
}

interface WorkerHandle {
  worker: Worker;
  ready: Promise<void>;
  idleTimer: NodeJS.Timeout | null;
  idleResolve: (() => void) | null;
  shutdownPromise: Promise<void> | null;
}

/**
 * Process-wide registry of runners, keyed by dbPath. Multiple CodeGraph
 * instances in the same process (e.g. MCP serving several projects) must
 * share one worker per DB to avoid ONNX init cost × projects.
 */
const runnersByDbPath = new Map<string, EmbeddingRunner>();

export class EmbeddingRunner {
  private readonly opts: Required<Omit<EmbeddingRunnerOptions, 'workerEntrypoint' | 'workerData'>> & {
    workerEntrypoint?: string;
    workerData?: { mode?: string };
  };
  private handle: WorkerHandle | null = null;
  private closing: Promise<void> | null = null;

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
      ...(options.workerData ? { workerData: options.workerData } : {}),
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

  /** Gracefully stop the shared runner for a closing CodeGraph instance. */
  static shutdownDatabase(dbPath: string): Promise<void> {
    const runner = runnersByDbPath.get(dbPath);
    if (!runner) return Promise.resolve();
    return runner.shutdown().finally(() => {
      if (runnersByDbPath.get(dbPath) === runner) runnersByDbPath.delete(dbPath);
    });
  }

  /** Wait for every runner in this process after all graph connections close. */
  static async shutdownAll(): Promise<void> {
    await Promise.all([...runnersByDbPath.keys()].map(dbPath => this.shutdownDatabase(dbPath)));
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
    void handle.ready.then(() => {
      if (this.handle !== handle || handle.shutdownPromise) return;
      handle.worker.postMessage({ type: 'drain' });
    }).catch((err) => {
      logWarn(`[embedding-worker] startup failed: ${err instanceof Error ? err.message : String(err)}`);
      void this.shutdown();
    });
  }

  /**
   * Block until the queue is empty (or all remaining rows have failed).
   * Used by `zcodegraph index --wait-embeddings` for CI 收口.
   */
  async drainAndExit(): Promise<{ processed: number; failed: number }> {
    const handle = this.ensureStarted();
    this.cancelIdleTimer(handle);
    try {
      await handle.ready;
      const result = await new Promise<{ processed: number; failed: number }>((resolve, reject) => {
        let processed = 0;
        let failed = 0;
        let settled = false;
        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (err) reject(err);
          else resolve({ processed, failed });
        };
        const onMessage = (msg: WorkerToParentMessage) => {
          if (msg.type === 'progress') {
            processed = msg.processed;
            failed = msg.failed;
          } else if (msg.type === 'idle') {
            processed = msg.processed;
            failed = msg.failed;
            finish();
          } else if (msg.type === 'fatal') {
            finish(new Error(msg.message));
          }
        };
        const onError = (err: Error) => finish(err);
        const onExit = (code: number) => finish(new Error(
          `Embedding worker exited before reporting idle (exit code ${code})`,
        ));
        const cleanup = () => {
          handle.worker.off('message', onMessage);
          handle.worker.off('error', onError);
          handle.worker.off('exit', onExit);
        };
        handle.worker.on('message', onMessage);
        handle.worker.on('error', onError);
        handle.worker.on('exit', onExit);
        handle.worker.postMessage({ type: 'drain' });
      });
      const counts = this.queueCounts();
      const unfinished = counts.pending + counts.inProgress;
      if (unfinished > 0) {
        throw new Error(`${unfinished} embedding task(s) remain pending after drain`);
      }
      if (result.failed > 0 || counts.failed > 0) {
        throw new Error(`${Math.max(result.failed, counts.failed)} embedding task(s) failed`);
      }
      return result;
    } finally {
      await this.shutdown();
    }
  }

  /** Stop after the current batch, then wait for the worker thread to exit. */
  async shutdown(): Promise<void> {
    if (this.closing) return this.closing;
    const shutdownPromise = this.shutdownCurrentHandle();
    this.closing = shutdownPromise;
    try {
      await shutdownPromise;
    } finally {
      if (this.closing === shutdownPromise) this.closing = null;
    }
  }

  private async shutdownCurrentHandle(): Promise<void> {
    const handle = this.handle;
    if (!handle) return;
    if (handle.shutdownPromise) return handle.shutdownPromise;
    this.handle = null;
    if (handle.idleTimer) {
      clearTimeout(handle.idleTimer);
      handle.idleTimer = null;
    }
    handle.shutdownPromise = new Promise<void>((resolve) => {
      const onExit = () => resolve();
      handle.worker.once('exit', onExit);
      try {
        handle.worker.postMessage({ type: 'shutdown' });
      } catch {
        handle.worker.off('exit', onExit);
        resolve();
      }
    });
    return handle.shutdownPromise;
  }

  private queueCounts(): { pending: number; inProgress: number; failed: number } {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite') as {
      DatabaseSync: new (path: string) => QueueDatabase;
    };
    const db = new DatabaseSync(this.opts.dbPath);
    try {
      // The post-drain verdict comes from the durable queue, not an
      // unverified worker-reported idle message.
      const row = db.prepare(
        `SELECT
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
         FROM embedding_queue`,
      ).get();
      return {
        pending: Number(row?.pending ?? 0),
        inProgress: Number(row?.in_progress ?? 0),
        failed: Number(row?.failed ?? 0),
      };
    } finally {
      db.close();
    }
  }

  /** True when a worker is currently spawned (regardless of idle state). */
  isRunning(): boolean {
    return this.handle !== null;
  }

  private cancelIdleTimer(handle: WorkerHandle): void {
    if (!handle.idleTimer) return;
    clearTimeout(handle.idleTimer);
    handle.idleTimer = null;
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
        ...this.opts.workerData,
      },
    });

    const handle: WorkerHandle = {
      worker,
      ready: new Promise<void>((resolve, reject) => {
        const onMsg = (msg: WorkerToParentMessage) => {
          if (msg.type === 'ready') {
            cleanup();
            resolve();
          } else if (msg.type === 'fatal') {
            cleanup();
            reject(new Error(msg.message));
          }
        };
        const onErr = (err: Error) => {
          cleanup();
          reject(err);
        };
        const onExit = (code: number) => {
          cleanup();
          reject(new Error(`Embedding worker exited before ready (exit code ${code})`));
        };
        const cleanup = () => {
          worker.off('message', onMsg);
          worker.off('error', onErr);
          worker.off('exit', onExit);
        };
        worker.on('message', onMsg);
        worker.on('error', onErr);
        worker.on('exit', onExit);
      }),
      idleTimer: null,
      idleResolve: null,
      shutdownPromise: null,
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
        if (handle.shutdownPromise) return;
        // Schedule idle shutdown — a new drain cancels this timer.
        this.cancelIdleTimer(handle);
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
  return readBooleanFlag('ZCG_ENABLE_EMBEDDING');
}
