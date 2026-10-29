/**
 * embedding queue — roadmap 1-4-28 (P2 async embedding pipeline, ADR-0009 D5).
 *
 * Covers the hard-floor contracts:
 *   - schema v6 creates `embedding_queue`; v7 adds durable worker leases
 *   - `enqueueEmbedding` is idempotent on the (file_path, content_hash) PK
 *   - `claimPendingEmbeddings` flips pending → in_progress atomically
 *   - `markEmbeddingDone` / `markEmbeddingFailed` transition and book-keep
 *   - `resetStaleInProgressEmbeddings` rescues worker-crash leftovers
 *   - `vec_embeddings` is intentionally NOT in schema.sql (vec0 may be absent)
 *
 * Skipped on Node < 22.5 where node:sqlite is unavailable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDatabase, type SqliteDatabase } from '../src/db/sqlite-adapter';
import { getCurrentVersion, runMigrations } from '../src/db/migrations';
import {
  claimPendingEmbeddings,
  countEmbeddingQueueByStatus,
  enqueueEmbedding,
  enqueueEmbeddingBatch,
  getEmbeddingQueueRow,
  heartbeatEmbeddingClaims,
  markEmbeddingDone,
  markEmbeddingFailed,
  resetStaleInProgressEmbeddings,
} from '../src/embedding/queue';

let nodeSqliteAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('node:sqlite');
  nodeSqliteAvailable = true;
} catch {
  nodeSqliteAvailable = false;
}

describe.skipIf(!nodeSqliteAvailable)('embedding queue (1-4-28 hard floor)', () => {
  let dir: string;
  let dbPath: string;
  let db: SqliteDatabase;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-embed-q-'));
    dbPath = path.join(dir, 'zcodegraph.db');
    const created = createDatabase(dbPath);
    db = created.db;
    // Apply the full baseline schema (same as DatabaseConnection.initialize).
    // The baseline schema.sql already includes embedding_queue (added by
    // 1-4-28), so we don't run runMigrations here — migrations are for
    // *upgrading* older databases that pre-date the schema.sql update. The
    // v6/v7 migration path is exercised separately by the
    // `migrates a v5 database through v7` test below.
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    db.exec(fs.readFileSync(schemaPath, 'utf-8'));
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('initial schema includes embedding_queue and durable worker leases', () => {
    // schema.sql already includes embedding_queue (1-4-28). The v6 migration
    // is a no-op on fresh databases; we just verify the table exists and
    // accepts writes.
    expect(getCurrentVersion(db)).toBeGreaterThanOrEqual(1);
    const ok = enqueueEmbedding(db, 'src/a.ts', 'hash-a', 1000);
    expect(ok).toBe(true);
    const row = getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a');
    expect(row).toMatchObject({
      file_path: 'src/a.ts',
      content_hash: 'hash-a',
      status: 'pending',
      attempts: 0,
      enqueued_at: 1000,
    });
  });

  it('vec_embeddings is NOT created by the migration (vec0 may be absent)', () => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','virtual') AND name = 'vec_embeddings'`)
      .get();
    expect(row).toBeUndefined();
  });

  it('migrates a v5 database through v7, including embedding worker leases', () => {
    // Build a fresh v5-style DB manually: schema_v1 plus migrations v2-v5.
    // We close the baseline db and open a new one.
    db.close();
    fs.rmSync(dbPath, { force: true });
    const created = createDatabase(dbPath);
    const v5db = created.db;
    // Minimal v1 schema (just enough for migrations v2..v5 to apply cleanly).
    v5db.exec(`
      CREATE TABLE schema_versions (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL,
        description TEXT
      );
      INSERT INTO schema_versions (version, applied_at, description)
        VALUES (1, 0, 'v1 baseline');
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL,
        qualified_name TEXT NOT NULL, file_path TEXT NOT NULL, language TEXT NOT NULL,
        start_line INTEGER NOT NULL, end_line INTEGER NOT NULL,
        start_column INTEGER NOT NULL, end_column INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL, target TEXT NOT NULL, kind TEXT NOT NULL
      );
      CREATE TABLE unresolved_refs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_node_id TEXT NOT NULL, reference_name TEXT NOT NULL,
        reference_kind TEXT NOT NULL, line INTEGER NOT NULL, col INTEGER NOT NULL
      );
    `);
    runMigrations(v5db, 1);
    expect(getCurrentVersion(v5db)).toBe(7);
    expect(v5db.prepare('PRAGMA table_info(embedding_queue)').all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'worker_id' }),
        expect.objectContaining({ name: 'heartbeat_at' }),
      ]),
    );
    // embedding_queue must now exist on the migrated DB.
    const r = v5db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='embedding_queue'`)
      .get() as { name: string } | undefined;
    expect(r?.name).toBe('embedding_queue');
    v5db.close();
    // Re-open the main test DB so afterEach cleanup stays symmetric.
    const reopened = createDatabase(dbPath);
    db = reopened.db;
  });

  it('enqueueEmbedding is idempotent on (file_path, content_hash)', () => {
    expect(enqueueEmbedding(db, 'src/a.ts', 'hash-a', 1000)).toBe(true);
    // Same pair, later timestamp → must be a no-op.
    expect(enqueueEmbedding(db, 'src/a.ts', 'hash-a', 2000)).toBe(false);
    const row = getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a');
    expect(row?.enqueued_at).toBe(1000); // original timestamp preserved
    // Same file with a NEW hash → new row (PK is the pair).
    expect(enqueueEmbedding(db, 'src/a.ts', 'hash-b', 3000)).toBe(true);
    const counts = countEmbeddingQueueByStatus(db);
    expect(counts.pending).toBe(2);
  });

  it('enqueueEmbeddingBatch deduplicates and reports insert count', () => {
    const inserted = enqueueEmbeddingBatch(
      db,
      [
        { filePath: 'a.ts', contentHash: 'h1' },
        { filePath: 'b.ts', contentHash: 'h2' },
        { filePath: 'a.ts', contentHash: 'h1' }, // duplicate within batch
        { filePath: 'c.ts', contentHash: 'h3' },
      ],
      5000,
    );
    expect(inserted).toBe(3);
    expect(countEmbeddingQueueByStatus(db).pending).toBe(3);
  });

  it('explicit retry re-pends a failed row with the same content hash', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    markEmbeddingFailed(db, 'a.ts', 'h1', 'transient-download-failure', 2000);

    const retried = enqueueEmbeddingBatch(
      db,
      [{ filePath: 'a.ts', contentHash: 'h1' }],
      3000,
      { retryFailed: true },
    );

    expect(retried).toBe(1);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')).toMatchObject({
      status: 'pending',
      attempts: 0,
      last_error: null,
      enqueued_at: 3000,
    });
  });

  it('explicit retry leaves pending, in_progress and done rows unchanged', () => {
    enqueueEmbeddingBatch(db, [
      { filePath: 'pending.ts', contentHash: 'h1' },
      { filePath: 'running.ts', contentHash: 'h1' },
      { filePath: 'done.ts', contentHash: 'h1' },
    ], 1000);
    db.prepare("UPDATE embedding_queue SET status='in_progress', attempts=1 WHERE file_path='running.ts'").run();
    db.prepare("UPDATE embedding_queue SET status='done' WHERE file_path='done.ts'").run();

    expect(enqueueEmbeddingBatch(db, [
      { filePath: 'pending.ts', contentHash: 'h1' },
      { filePath: 'running.ts', contentHash: 'h1' },
      { filePath: 'done.ts', contentHash: 'h1' },
    ], 2000, { retryFailed: true })).toBe(0);
    expect(getEmbeddingQueueRow(db, 'pending.ts', 'h1')?.enqueued_at).toBe(1000);
    expect(getEmbeddingQueueRow(db, 'running.ts', 'h1')?.status).toBe('in_progress');
    expect(getEmbeddingQueueRow(db, 'done.ts', 'h1')?.status).toBe('done');
  });

  it('claimPendingEmbeddings flips pending → in_progress and bumps attempts', () => {
    enqueueEmbeddingBatch(
      db,
      [
        { filePath: 'a.ts', contentHash: 'h1' },
        { filePath: 'b.ts', contentHash: 'h2' },
        { filePath: 'c.ts', contentHash: 'h3' },
      ],
      1000,
    );
    const claimed = claimPendingEmbeddings(db, 2, 10_000);
    expect(claimed).toHaveLength(2);
    for (const row of claimed) {
      expect(row.status).toBe('in_progress');
      expect(row.attempts).toBe(1);
      expect(row.started_at).toBe(10_000);
    }
    const counts = countEmbeddingQueueByStatus(db);
    expect(counts.in_progress).toBe(2);
    expect(counts.pending).toBe(1);
    // Second claim picks up the remaining one (ordered by enqueued_at).
    const claimed2 = claimPendingEmbeddings(db, 10, 11_000);
    expect(claimed2).toHaveLength(1);
    expect(claimed2[0].file_path).toBe('c.ts');
  });

  it('claimPendingEmbeddings skips rows already claimed by a racing worker', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    // Simulate another worker beating us to it.
    db.prepare(
      `UPDATE embedding_queue SET status='in_progress', started_at=?, attempts=1
        WHERE file_path='a.ts' AND content_hash='h1'`,
    ).run(9_999);
    const claimed = claimPendingEmbeddings(db, 1, 10_000);
    expect(claimed).toHaveLength(0);
  });

  it('markEmbeddingDone records model_version and clears last_error', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    claimPendingEmbeddings(db, 1, 10_000);
    markEmbeddingDone(db, 'a.ts', 'h1', 'bge-small-en-v1.5', 20_000);
    const row = getEmbeddingQueueRow(db, 'a.ts', 'h1');
    expect(row).toMatchObject({
      status: 'done',
      model_version: 'bge-small-en-v1.5',
      finished_at: 20_000,
      last_error: null,
    });
  });

  it('markEmbeddingFailed records error and finished_at', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    claimPendingEmbeddings(db, 1, 10_000);
    markEmbeddingFailed(db, 'a.ts', 'h1', 'embedding-runtime-init-failed', 20_000);
    const row = getEmbeddingQueueRow(db, 'a.ts', 'h1');
    expect(row).toMatchObject({
      status: 'failed',
      last_error: 'embedding-runtime-init-failed',
      finished_at: 20_000,
    });
  });

  it('stale recovery preserves a long-running claim with a fresh heartbeat', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    claimPendingEmbeddings(db, 1, 10_000, 'worker-a');
    expect(heartbeatEmbeddingClaims(db, 'worker-a', 100_000)).toBe(1);

    expect(resetStaleInProgressEmbeddings(db, 5_000, 101_000)).toBe(0);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')).toMatchObject({
      status: 'in_progress', worker_id: 'worker-a', heartbeat_at: 100_000,
    });
    expect(resetStaleInProgressEmbeddings(db, 5_000, 110_000)).toBe(1);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')).toMatchObject({
      status: 'pending', worker_id: null, heartbeat_at: null,
    });
  });

  it('stale recovery fails the fourth attempt instead of retrying forever', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    claimPendingEmbeddings(db, 1, 10_000, 'worker-a');
    db.prepare("UPDATE embedding_queue SET attempts=3, heartbeat_at=100 WHERE file_path='a.ts'").run();

    expect(resetStaleInProgressEmbeddings(db, 5_000, 10_000)).toBe(1);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')).toMatchObject({
      status: 'failed', attempts: 3, last_error: 'embedding-attempts-exhausted',
      worker_id: null, heartbeat_at: null,
    });
    expect(claimPendingEmbeddings(db, 1, 11_000, 'worker-b')).toHaveLength(0);
  });

  it('terminal writes cannot overwrite a different worker ownership lease', () => {
    enqueueEmbedding(db, 'a.ts', 'h1', 1000);
    claimPendingEmbeddings(db, 1, 10_000, 'worker-a');
    expect(markEmbeddingDone(db, 'a.ts', 'h1', 'model', 11_000, 'worker-b')).toBe(false);
    expect(markEmbeddingFailed(db, 'a.ts', 'h1', 'wrong worker', 11_000, 'worker-b')).toBe(false);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')?.status).toBe('in_progress');
    expect(markEmbeddingDone(db, 'a.ts', 'h1', 'model', 11_000, 'worker-a')).toBe(true);
    expect(getEmbeddingQueueRow(db, 'a.ts', 'h1')).toMatchObject({
      status: 'done', worker_id: null, heartbeat_at: null,
    });
  });

  it('resetStaleInProgressEmbeddings rescues only stale rows', () => {
    enqueueEmbeddingBatch(
      db,
      [
        { filePath: 'stale.ts', contentHash: 'h1' },
        { filePath: 'fresh.ts', contentHash: 'h2' },
        { filePath: 'pending.ts', contentHash: 'h3' },
      ],
      1000,
    );
    // stale.ts: claimed long ago. fresh.ts: claimed just now. pending.ts: never claimed.
    db.prepare(
      `UPDATE embedding_queue SET status='in_progress', started_at=100, attempts=1
        WHERE file_path='stale.ts'`,
    ).run();
    db.prepare(
      `UPDATE embedding_queue SET status='in_progress', started_at=?, attempts=1
        WHERE file_path='fresh.ts'`,
    ).run(9_900);

    const reset = resetStaleInProgressEmbeddings(db, /* staleMs */ 5_000, /* nowMs */ 10_000);
    expect(reset).toBe(1);

    const staleRow = getEmbeddingQueueRow(db, 'stale.ts', 'h1');
    expect(staleRow?.status).toBe('pending');
    expect(staleRow?.started_at).toBeNull();
    // attempts stays at 1 — ADR-0009 attempts>3 → failed policy is the worker's job.
    expect(staleRow?.attempts).toBe(1);

    expect(getEmbeddingQueueRow(db, 'fresh.ts', 'h2')?.status).toBe('in_progress');
    expect(getEmbeddingQueueRow(db, 'pending.ts', 'h3')?.status).toBe('pending');
  });
});
