/**
 * Embedding worker (roadmap 1-4-29, ADR-0009 D2).
 *
 * Runs inside a `worker_threads.Worker` spawned by `worker-runner.ts`. Pulls
 * `pending` rows off `embedding_queue`, embeds each file's contents with
 * fastembed BGE-small-en-v1.5 (384d), writes the vector into the vec0
 * `vec_embeddings` virtual table, then flips the queue row to `done`.
 *
 * Design invariants (ADR-0009 D2/D4/D5 + 1-4-29 Q1):
 *   - **Lazy fastembed probe** — `fastembed` is an optional ESM-only
 *     dependency. We `await import('fastembed')` on first batch. If that
 *     fails (module not installed, model download blocked, …) we DO NOT
 *     crash the worker: claimed rows are re-`pending`ed with
 *     `last_error='embedding-model-not-downloaded'` so the watchdog can
 *     re-drive them after the user installs the optional dep (ADR-0009
 *     Failure Modes row 1, 1-4-28 Q2).
 *   - **vec0 lazy-load** — `vec_embeddings` is NOT in schema.sql. The worker
 *     opens the DB with `allowExtension: true`, loads `vec0`, then
 *     immediately `enableLoadExtension(false)` to shrink the attack surface
 *     (sqlite-adapter contract). The table is created idempotently.
 *   - **Crash-safe claims** — `claimPendingEmbeddings` is transactional, so
 *     a worker crash mid-batch leaves the rows in `in_progress`. The next
 *     worker's watchdog (`resetStaleInProgressEmbeddings`) re-queues them
 *     after `staleMs`.
 *   - **Single worker per process** — enforced by `worker-runner.ts`; this
 *     module assumes it is the only writer on the queue's `in_progress`
 *     rows for the current process. Cross-process safety is provided by the
 *     queue's transactional claim.
 *
 * Communication with the parent thread is message-based:
 *   Parent → worker:  { type: 'drain' }      — process queue until empty, then post 'idle'
 *                     { type: 'shutdown' }   — graceful stop after current batch
 *   Worker → parent:  { type: 'ready' }
 *                     { type: 'idle', processed, failed }
 *                     { type: 'progress', processed, failed, remaining }
 *                     { type: 'fatal', message }
 *                     { type: 'log', level, message }
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parentPort, workerData } from 'node:worker_threads';
import { resolveFastembedSpecifier, importResolved } from './installer';

// node:sqlite's @types are only available on @types/node >=22; the package
// currently targets @types/node ^20. Use require() and a minimal local
// interface (same trick as src/db/sqlite-adapter.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-var
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string, options?: { allowExtension?: boolean }) => {
    isOpen: boolean;
    prepare(sql: string): {
      run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...params: any[]): any;
      all(...params: any[]): any[];
      iterate(...params: any[]): IterableIterator<any>;
    };
    exec(sql: string): void;
    close(): void;
    loadExtension(path: string): void;
    enableLoadExtension(allow: boolean): void;
  };
};
type DatabaseSync = InstanceType<typeof DatabaseSync>;
import {
  claimPendingEmbeddings,
  markEmbeddingDone,
  markEmbeddingFailed,
  resetStaleInProgressEmbeddings,
  countEmbeddingQueueByStatus,
  heartbeatEmbeddingClaims,
  type EmbeddingQueueRow,
} from './queue';
import type { SqliteDatabase } from '../db/sqlite-adapter';

/** Batch size for queue claims + fastembed embed calls. */
const BATCH_SIZE = 8;
/** Requeue `in_progress` rows older than this (crashed previous worker). */
const STALE_IN_PROGRESS_MS = 5 * 60_000;
const staleInProgressMs = Number(workerData?.staleInProgressMsForTests) > 0
  ? Number(workerData.staleInProgressMsForTests)
  : STALE_IN_PROGRESS_MS;
/** Truncate file contents to bound tokenizer memory (matches 1-4-2 spike). */
const TRUNCATE_CHARS = 8000;
/** Model version string stamped onto `vec_embeddings.model_version` and queue rows. */
const MODEL_VERSION = 'BGE-small-en-v1.5@384d';
/** Embedding vector dimension — must match vec0 schema. */
const EMBEDDING_DIM = 384;

export interface EmbeddingWorkerData {
  /** Absolute path to `.zcodegraph/zcodegraph.db`. */
  dbPath: string;
  /** Absolute path to project root (for resolving `files.path`). */
  projectRoot: string;
  /** Absolute path to the sqlite-vec vec0 extension binary. */
  vec0Path: string;
  /** Directory to cache fastembed models (`<projectRoot>/.zcodegraph/models`). */
  modelsDir: string;
  /**
   * Optional: when true, treat any fastembed load failure as a permanent
   * per-row failure (status='failed') instead of re-pending. Used by tests
   * and by `--wait-embeddings` to avoid an infinite requeue loop when the
   * optional dep is genuinely missing.
   */
  permanentFailureOnModelMissing?: boolean;
  /** Isolate scheduler tests from the native vec0 extension; never set in production. */
  skipVec0LoadForTests?: boolean;
  skipModelLoadForTests?: boolean;
}

interface WorkerToParentReady { type: 'ready' }
interface WorkerToParentIdle { type: 'idle'; processed: number; failed: number }
interface WorkerToParentProgress { type: 'progress'; processed: number; failed: number; remaining: number }
interface WorkerToParentFatal { type: 'fatal'; message: string }
interface WorkerToParentLog { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
export type WorkerToParentMessage =
  | WorkerToParentReady
  | WorkerToParentIdle
  | WorkerToParentProgress
  | WorkerToParentFatal
  | WorkerToParentLog;

interface ParentToWorkerDrain { type: 'drain' }
interface ParentToWorkerShutdown { type: 'shutdown' }
export type ParentToWorkerMessage = ParentToWorkerDrain | ParentToWorkerShutdown;

/** Stop after the active batch; finishShutdown closes the DB and exits. */
let shutdownRequested = false;
let draining = false;
let workerDb: SqliteDatabase | null = null;
function finishShutdown(): void {
  if (!shutdownRequested || draining) return;
  workerDb?.close();
  process.exit(0);
}

/**
 * Wrap `DatabaseSync` in the `SqliteDatabase` shape used by queue helpers.
 *
 * We deliberately do NOT go through `createDatabase()` from
 * `src/db/sqlite-adapter.ts` because the worker needs `allowExtension: true`
 * to load vec0 — and the adapter's public `createDatabase` runs migrations
 * which we don't want on a worker-thread connection (the main process has
 * already migrated).
 */
function wrapAsSqliteDatabase(raw: DatabaseSync): SqliteDatabase {
  return {
    prepare(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        run(...params: any[]) {
          const r = stmt.run(...params);
          return {
            changes: Number(r?.changes ?? 0),
            lastInsertRowid: r?.lastInsertRowid ?? 0,
          };
        },
        get(...params: any[]) {
          return stmt.get(...params);
        },
        all(...params: any[]) {
          return stmt.all(...params);
        },
        iterate(...params: any[]) {
          return stmt.iterate(...params);
        },
      };
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    pragma(str: string, options?: { simple?: boolean }) {
      const trimmed = str.trim();
      if (trimmed.includes('=')) {
        raw.exec(`PRAGMA ${trimmed}`);
        return;
      }
      const row = raw.prepare(`PRAGMA ${trimmed}`).get();
      if (options?.simple) {
        return row && typeof row === 'object' ? Object.values(row)[0] : row;
      }
      return row;
    },
    transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
      return (...args: any[]) => {
        raw.exec('BEGIN');
        try {
          const result = fn(...args);
          raw.exec('COMMIT');
          return result;
        } catch (error) {
          raw.exec('ROLLBACK');
          throw error;
        }
      };
    },
    close() {
      if (raw.isOpen) raw.close();
    },
    get open() {
      return raw.isOpen;
    },
  };
}

function postMessage(msg: WorkerToParentMessage): void {
  parentPort?.postMessage(msg);
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  postMessage({ type: 'log', level, message });
}

/**
 * Lazily-initialized fastembed state. We keep the loaded model behind a
 * getter so a missing module / blocked download never wedges the worker's
 * message loop — each `drain` retries the import once.
 */
interface EmbedderState {
  embed: (texts: string[]) => AsyncIterable<Float32Array[]>;
}
let embedderPromise: Promise<EmbedderState> | null = null;
let embedderFailure: string | null = null;

async function loadEmbedder(modelsDir: string): Promise<EmbedderState> {
  if (embedderPromise) return embedderPromise;
  embedderPromise = (async () => {
    // Dynamic import — fastembed is ESM-only/CJS-hybrid and an optional dep
    // (1-4-28 decision), so we can't type against it at compile time. The
    // Function constructor bypasses tsc's CJS-module transformation of
    // import(); importResolved handles Windows drive-letter paths from the
    // models-dir fallback (ERR_UNSUPPORTED_ESM_URL_SCHEME without it).
    const specifier = resolveFastembedSpecifier(modelsDir);
    const mod = await importResolved(specifier);
    const model = await mod.FlagEmbedding.init({
      model: mod.EmbeddingModel.BGESmallENV15,
      cacheDir: modelsDir,
    });
    return {
      embed: (texts: string[]) =>
        model.embed(texts) as AsyncIterable<Float32Array[]>,
    };
  })();
  try {
    return await embedderPromise;
  } catch (err) {
    embedderPromise = null;
    embedderFailure = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

/**
 * Idempotently create the `vec_embeddings` virtual table.
 *
 * ADR-0009 D5's published DDL includes content_hash / model_version /
 * embedded_at as auxiliary columns; vec0 v0.1.9 only allows a single TEXT
 * primary-key column plus the embedding vector in `CREATE VIRTUAL TABLE ...
 * USING vec0`, so we keep the canonical file_path → embedding mapping here
 * and stamp the metadata columns on the queue row (which is the source of
 * truth for versioning anyway).
 */
function ensureVecTable(db: SqliteDatabase): void {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_embeddings'")
    .get();
  if (exists) return;
  db.exec(
    `CREATE VIRTUAL TABLE vec_embeddings USING vec0(
       file_path TEXT PRIMARY KEY,
       embedding float[${EMBEDDING_DIM}]
     )`,
  );
}

/**
 * Read file contents and truncate for the embedder. Returns null when the
 * file is unreadable or empty (the caller skips embedding and still marks
 * the queue row done — there is nothing to embed, and keeping it pending
 * would just spin the queue).
 */
function readEmbedText(absPath: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
  if (!content || content.trim().length === 0) return null;
  return content.slice(0, TRUNCATE_CHARS);
}

async function processBatch(
  db: SqliteDatabase,
  embedder: EmbedderState,
  rows: EmbeddingQueueRow[],
  projectRoot: string,
  workerId: string,
): Promise<{ processed: number; failed: number }> {
  const heartbeat = setInterval(() => {
    try {
      heartbeatEmbeddingClaims(db, workerId);
    } catch (err) {
      log('warn', `embedding heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, 30_000);
  heartbeat.unref();
  try {
    return await processClaimedBatch(db, embedder, rows, projectRoot, workerId);
  } finally {
    clearInterval(heartbeat);
  }
}

async function processClaimedBatch(
  db: SqliteDatabase,
  embedder: EmbedderState,
  rows: EmbeddingQueueRow[],
  projectRoot: string,
  workerId: string,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  const texts: string[] = [];
  const claimedPaths: EmbeddingQueueRow[] = [];
  const skippedRows: EmbeddingQueueRow[] = [];
  for (const row of rows) {
    const absPath = path.resolve(projectRoot, row.file_path);
    const text = readEmbedText(absPath);
    if (text === null) {
      skippedRows.push(row);
      continue;
    }
    texts.push(text);
    claimedPaths.push(row);
  }

  // Mark empty/unreadable rows as done — nothing to embed, no point retrying.
  for (const row of skippedRows) {
    markEmbeddingDone(db, row.file_path, row.content_hash, MODEL_VERSION, Date.now(), workerId);
    processed++;
  }

  if (texts.length === 0) return { processed, failed };

  const insertStmt = db.prepare(
    // vec0 v0.1.9 does not honor INSERT OR REPLACE on the PRIMARY KEY; delete
    // any stale row first (same file_path, older content_hash) then insert.
    'DELETE FROM vec_embeddings WHERE file_path = ?',
  );
  const insertVec = db.prepare(
    'INSERT INTO vec_embeddings (file_path, embedding) VALUES (?, ?)',
  );

  let offset = 0;
  try {
    const stream = embedder.embed(texts);
    for await (const batch of stream) {
      for (const vec of batch) {
        const row = claimedPaths[offset++];
        if (!row) continue;
        const f32 = vec instanceof Float32Array ? vec : Float32Array.from(vec as unknown as number[]);
        const buf = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
        const committed = db.transaction(() => {
          const done = markEmbeddingDone(
            db, row.file_path, row.content_hash, MODEL_VERSION, Date.now(), workerId,
          );
          if (!done) return false;
          insertStmt.run(row.file_path);
          insertVec.run(row.file_path, buf);
          return true;
        })();
        if (committed) processed++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Mark only the rows that didn't get embedded (offset..end) as failed;
    // earlier rows already committed.
    for (let i = offset; i < claimedPaths.length; i++) {
      const row = claimedPaths[i]!;
      markEmbeddingFailed(
        db, row.file_path, row.content_hash,
        `embedding-embed-failed: ${msg}`, Date.now(), workerId,
      );
      failed++;
    }
  }

  return { processed, failed };
}

async function drainLoop(
  db: SqliteDatabase,
  data: EmbeddingWorkerData,
  shouldStop: () => boolean,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const workerId = `${process.pid}:${randomUUID()}`;

  // Watchdog first — recover rows orphaned by a previous crashed worker.
  const reset = resetStaleInProgressEmbeddings(db, staleInProgressMs);
  if (reset > 0) {
    log('info', `reset ${reset} stale in_progress embedding rows back to pending`);
  }

  let embedder: EmbedderState | null = null;
  try {
    embedder = data.skipModelLoadForTests
      ? { embed: () => { throw new Error('scheduler test must not embed'); } }
      : await loadEmbedder(data.modelsDir);
  } catch (err) {
    const msg = embedderFailure ?? (err instanceof Error ? err.message : String(err));
    // fastembed missing / model download blocked. Re-pend claimed rows so a
    // future drain (after the user installs the optional dep) retries them.
    // ADR-0009 Failure Modes row 1: not-downloaded is *pending*, not failed.
    if (data.permanentFailureOnModelMissing) {
      // --wait-embeddings / test mode: don't loop forever — fail the batch.
      // A terminal drain must settle every pending row, not just the first
      // batch. The CLI separately inspects the durable queue and fails CI.
      const claimed = claimPendingEmbeddings(db, Number.MAX_SAFE_INTEGER, Date.now(), workerId);
      for (const row of claimed) {
        markEmbeddingFailed(
          db,
          row.file_path,
          row.content_hash,
          `embedding-model-not-downloaded: ${msg}`,
          Date.now(),
          workerId,
        );
        failed++;
      }
    } else {
      log('warn', `fastembed unavailable; embedding queue will stay pending: ${msg}`);
    }
    return { processed, failed };
  }

  while (!shouldStop()) {
    const claimed = claimPendingEmbeddings(db, BATCH_SIZE, Date.now(), workerId);
    if (claimed.length === 0) break;
    const r = await processBatch(db, embedder, claimed, data.projectRoot, workerId);
    processed += r.processed;
    failed += r.failed;
    const counts = countEmbeddingQueueByStatus(db);
    postMessage({
      type: 'progress',
      processed,
      failed,
      remaining: counts.pending + counts.in_progress,
    });
  }

  return { processed, failed };
}

async function main(): Promise<void> {
  if (!parentPort) {
    throw new Error('embedding worker must be spawned as a worker_thread');
  }
  const data = workerData as EmbeddingWorkerData;
  if (!data?.dbPath || !data?.projectRoot || !data?.vec0Path || !data?.modelsDir) {
    postMessage({
      type: 'fatal',
      message: 'workerData missing required fields: dbPath/projectRoot/vec0Path/modelsDir',
    });
    return;
  }

  // Open DB with extension loading enabled just long enough to load vec0,
  // then immediately disable to shrink the attack surface (sqlite-adapter
  // contract; see SqliteAdapterOptions.allowExtension).
  const raw = new DatabaseSync(data.dbPath, { allowExtension: !data.skipVec0LoadForTests });
  if (!data.skipVec0LoadForTests) {
    try {
      raw.loadExtension(data.vec0Path);
    } finally {
      raw.enableLoadExtension(false);
    }
  }
  const db = wrapAsSqliteDatabase(raw);
  if (!data.skipVec0LoadForTests) ensureVecTable(db);

  workerDb = db;
  let drainingPromise: Promise<void> | null = null;
  const scheduleRecoveryRetry = (): void => {
    if (shutdownRequested) return;
    const lease = db.prepare(
      `SELECT MIN(COALESCE(heartbeat_at, started_at)) AS heartbeat
         FROM embedding_queue WHERE status = 'in_progress'`,
    ).get() as { heartbeat?: number | null };
    if (typeof lease.heartbeat !== 'number') return;
    const waitMs = Math.max(1, lease.heartbeat + staleInProgressMs - Date.now() + 1);
    const timer = setTimeout(() => {
      if (!shutdownRequested && !drainingPromise) {
        parentPort?.emit('message', { type: 'drain' });
      }
    }, waitMs);
    timer.unref();
  };

  parentPort.on('message', (msg: ParentToWorkerMessage) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'shutdown') {
      shutdownRequested = true;
      if (drainingPromise) {
        void drainingPromise.finally(finishShutdown);
      } else {
        finishShutdown();
      }
      return;
    }
    if (msg.type === 'drain') {
      if (drainingPromise) return; // already running
      draining = true;
      drainingPromise = (async () => {
        try {
          const r = await drainLoop(db, data, () => shutdownRequested);
          postMessage({ type: 'idle', processed: r.processed, failed: r.failed });
          scheduleRecoveryRetry();
        } catch (err) {
          const msgText = err instanceof Error ? err.message : String(err);
          postMessage({ type: 'fatal', message: msgText });
        } finally {
          draining = false;
          drainingPromise = null;
          finishShutdown();
        }
      })();
    }
  });

  postMessage({ type: 'ready' });
}

main().catch((err) => {
  postMessage({
    type: 'fatal',
    message: err instanceof Error ? err.message : String(err),
  });
});
