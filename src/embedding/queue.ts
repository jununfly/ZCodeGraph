/**
 * Embedding queue (roadmap 1-4-28, ADR-0009 D5).
 *
 * Durable, SQLite-backed queue of `(file_path, content_hash)` pairs awaiting
 * background embedding. The queue lives in the same database as `nodes` /
 * `edges` / `files` so the "structural write + embed pending" pair commits in
 * one transaction — crash recovery is free.
 *
 * Design invariants (ADR-0009 D5):
 *   - PK is `(file_path, content_hash)`: same file with a new content hash
 *     becomes a new pending row; the old hash's row stays as historical
 *     'done'. A separate cleanup task (1-4-29+) reclaims stale rows.
 *   - `INSERT OR IGNORE` is the deduplication mechanism: enqueueing an
 *     already-queued pair is a no-op (ADR-0009 D3 final paragraph).
 *   - All mutating helpers are synchronous and accept the raw
 *     {@link SqliteDatabase}, so callers can wrap them in their own
 *     transactions or invoke them standalone.
 *
 * This module is intentionally low-level. It does NOT:
 *   - read file contents (callers hash upstream)
 *   - load sqlite-vec or touch `vec_embeddings` (the worker does that lazily)
 *   - run any background loop (that's `src/embedding/worker.ts`, 1-4-29)
 */

import type { SqliteDatabase } from '../db/sqlite-adapter';

/** ADR-0009 D5 status vocabulary. */
export type EmbeddingQueueStatus = 'pending' | 'in_progress' | 'done' | 'failed';

/** One row of `embedding_queue`. Column names match the SQL DDL verbatim. */
export interface EmbeddingQueueRow {
  file_path: string;
  content_hash: string;
  status: EmbeddingQueueStatus;
  attempts: number;
  last_error: string | null;
  model_version: string | null;
  enqueued_at: number;
  started_at: number | null;
  finished_at: number | null;
}

/**
 * Enqueue a file for background embedding.
 *
 * Uses `INSERT OR IGNORE` so a duplicate `(file_path, content_hash)` pair is
 * a silent no-op — the deduplication contract required by ADR-0009 D3's
 * three-trigger coexistence.
 *
 * @returns `true` when a new row was inserted, `false` when the pair was
 *          already queued.
 */
export function enqueueEmbedding(
  db: SqliteDatabase,
  filePath: string,
  contentHash: string,
  enqueuedAtMs: number = Date.now(),
): boolean {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO embedding_queue
       (file_path, content_hash, status, attempts, enqueued_at)
     VALUES (?, ?, 'pending', 0, ?)`,
  );
  const r = stmt.run(filePath, contentHash, enqueuedAtMs);
  return r.changes > 0;
}

/**
 * Batch-enqueue many files in a single transaction. Returns the number of
 * rows actually inserted (i.e. excluding duplicates that were silently
 * ignored). Order of `entries` is preserved for readability; callers should
 * not rely on insertion order for fairness.
 */
export function enqueueEmbeddingBatch(
  db: SqliteDatabase,
  entries: Array<{ filePath: string; contentHash: string }>,
  enqueuedAtMs: number = Date.now(),
): number {
  if (entries.length === 0) return 0;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO embedding_queue
       (file_path, content_hash, status, attempts, enqueued_at)
     VALUES (?, ?, 'pending', 0, ?)`,
  );
  let inserted = 0;
  db.transaction(() => {
    for (const e of entries) {
      const r = insert.run(e.filePath, e.contentHash, enqueuedAtMs);
      if (r.changes > 0) inserted++;
    }
  })();
  return inserted;
}

/** Fetch one row by primary key. Returns `undefined` when absent. */
export function getEmbeddingQueueRow(
  db: SqliteDatabase,
  filePath: string,
  contentHash: string,
): EmbeddingQueueRow | undefined {
  return db
    .prepare(
      `SELECT file_path, content_hash, status, attempts, last_error,
              model_version, enqueued_at, started_at, finished_at
         FROM embedding_queue
        WHERE file_path = ? AND content_hash = ?`,
    )
    .get(filePath, contentHash) as EmbeddingQueueRow | undefined;
}

/**
 * Aggregate counts by status. Useful for `zcodegraph status` and for tests
 * that assert on the queue's shape after an index run.
 */
export function countEmbeddingQueueByStatus(
  db: SqliteDatabase,
): Record<EmbeddingQueueStatus, number> {
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS n FROM embedding_queue GROUP BY status`)
    .all() as Array<{ status: EmbeddingQueueStatus; n: number }>;
  const out: Record<EmbeddingQueueStatus, number> = {
    pending: 0,
    in_progress: 0,
    done: 0,
    failed: 0,
  };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

/**
 * Mark a queue row as failed with the given error message. Used by the
 * worker (1-4-29) and by tests that simulate failure paths. `attempts` is
 * incremented by the caller via {@link claimPendingEmbeddings}; this helper
 * only flips status and records the error.
 */
export function markEmbeddingFailed(
  db: SqliteDatabase,
  filePath: string,
  contentHash: string,
  errorMessage: string,
  finishedAtMs: number = Date.now(),
): void {
  db.prepare(
    `UPDATE embedding_queue
        SET status = 'failed', last_error = ?, finished_at = ?
      WHERE file_path = ? AND content_hash = ?`,
  ).run(errorMessage, finishedAtMs, filePath, contentHash);
}

/**
 * Mark a queue row as successfully embedded. The worker calls this after
 * the vec0 INSERT commits.
 */
export function markEmbeddingDone(
  db: SqliteDatabase,
  filePath: string,
  contentHash: string,
  modelVersion: string,
  finishedAtMs: number = Date.now(),
): void {
  db.prepare(
    `UPDATE embedding_queue
        SET status = 'done', model_version = ?, finished_at = ?, last_error = NULL
      WHERE file_path = ? AND content_hash = ?`,
  ).run(modelVersion, finishedAtMs, filePath, contentHash);
}

/**
 * Atomically claim up to `limit` pending rows for a worker. Claims by:
 *   1. Selecting the `limit` oldest `pending` rows.
 *   2. Updating them to `in_progress` with `started_at = now` and
 *      incrementing `attempts`.
 *
 * Both steps run inside one transaction so two workers racing the same DB
 * cannot claim the same row. Returns the claimed rows (post-update shape).
 *
 * ADR-0009 Failure Modes: a worker that crashes after claiming leaves rows
 * in `in_progress`; a separate watchdog (1-4-29) resets them to `pending`
 * after a timeout.
 */
export function claimPendingEmbeddings(
  db: SqliteDatabase,
  limit: number,
  nowMs: number = Date.now(),
): EmbeddingQueueRow[] {
  if (limit <= 0) return [];
  return db.transaction(() => {
    const picked = db
      .prepare(
        `SELECT file_path, content_hash FROM embedding_queue
          WHERE status = 'pending'
          ORDER BY enqueued_at ASC
          LIMIT ?`,
      )
      .all(limit) as Array<{ file_path: string; content_hash: string }>;
    if (picked.length === 0) return [];
    const update = db.prepare(
      `UPDATE embedding_queue
          SET status = 'in_progress', started_at = ?, attempts = attempts + 1
        WHERE file_path = ? AND content_hash = ? AND status = 'pending'`,
    );
    const claimed: EmbeddingQueueRow[] = [];
    for (const p of picked) {
      const r = update.run(nowMs, p.file_path, p.content_hash);
      if (r.changes === 0) continue; // raced with another worker — skip
      const row = getEmbeddingQueueRow(db, p.file_path, p.content_hash);
      if (row) claimed.push(row);
    }
    return claimed;
  })();
}

/**
 * Reset rows stuck in `in_progress` longer than `staleMs` back to `pending`.
 * Called by the worker watchdog on startup (and periodically) so a crashed
 * worker doesn't wedge the queue. ADR-0009 Failure Modes row 6.
 *
 * @returns number of rows reset.
 */
export function resetStaleInProgressEmbeddings(
  db: SqliteDatabase,
  staleMs: number,
  nowMs: number = Date.now(),
): number {
  const cutoff = nowMs - staleMs;
  const r = db
    .prepare(
      `UPDATE embedding_queue
          SET status = 'pending', started_at = NULL
        WHERE status = 'in_progress' AND started_at IS NOT NULL AND started_at < ?`,
    )
    .run(cutoff);
  return r.changes;
}
