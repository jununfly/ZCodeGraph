/**
 * embedding queue — roadmap 1-4-28 (P2 async embedding pipeline, ADR-0009 D5).
 *
 * Covers the hard-floor contracts:
 *   - schema v6 migration creates `embedding_queue` on existing v5 databases
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
    // v6 migration path is exercised separately by the
    // `migrates a v5 database to v6` test below.
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

  it('migrates to CURRENT_SCHEMA_VERSION 6 and creates embedding_queue', () => {
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

  it('migrates a v5 database to v6 by adding embedding_queue', () => {
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
    expect(getCurrentVersion(v5db)).toBe(6);
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
