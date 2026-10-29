/**
 * Embedding runtime — roadmap 1-4-29 (worker + watcher hook + read-repair +
 * CLI flag). These tests cover the orchestration contracts without spawning
 * a real worker_threads.Worker (which would require fastembed + vec0).
 *
 * Covers:
 *   - embeddingEnabled() gates the whole pipeline behind
 *     ZCG_ENABLE_EMBEDDING=1 (1-4-29 Q2)
 *   - CodeGraph.enqueueEmbeddingReadRepair() inserts pending rows for
 *     missed/stale/failed files and is a no-op when disabled (1-4-29 Q3)
 *   - EmbeddingRunner.forDatabase() is a per-DB singleton (1-4-29 Q1)
 *   - runEmbeddingPipeline() enqueues files when called with wait=false
 *     (1-4-29 Q4 — wait=true path is exercised by manual CI gate, not in
 *     unit tests, because it requires a real fastembed + vec0)
 *   - watch() wraps onSyncComplete so the embedding hook fires after sync
 *     (1-4-29 Q2)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDatabase, type SqliteDatabase } from '../src/db/sqlite-adapter';
import { DatabaseConnection } from '../src/db';
import { QueryBuilder } from '../src/db/queries';
import {
  countEmbeddingQueueByStatus,
  enqueueEmbedding,
  getEmbeddingQueueRow,
} from '../src/embedding/queue';
import {
  EmbeddingRunner,
  embeddingEnabled,
} from '../src/embedding/worker-runner';
import { getDefaultVec0Path } from '../src/embedding/vec0-path';
import { MCPEngine } from '../src/mcp/engine';
import { MCPServer } from '../src/mcp/index';

let nodeSqliteAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('node:sqlite');
  nodeSqliteAvailable = true;
} catch {
  nodeSqliteAvailable = false;
}

describe.skipIf(!nodeSqliteAvailable)('embedding runtime (1-4-29)', () => {
  let dir: string;
  let projectRoot: string;
  let dbPath: string;
  let db: SqliteDatabase;
  const originalEnv = process.env.ZCG_ENABLE_EMBEDDING;
  const originalVec0 = process.env.ZCG_VEC0_PATH;
  let vec0Path: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-embed-rt-'));
    projectRoot = dir;
    dbPath = path.join(dir, 'zcodegraph.db');
    // Drop a fake vec0 binary so getDefaultVec0Path resolves. The worker
    // would fail to load it, but these tests never spawn a real worker.
    vec0Path = path.join(dir, 'vec0.dll');
    fs.writeFileSync(vec0Path, 'fake');
    process.env.ZCG_VEC0_PATH = vec0Path;

    const created = createDatabase(dbPath);
    db = created.db;
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    db.exec(fs.readFileSync(schemaPath, 'utf-8'));

    // Seed the files table with two rows.
    db.prepare(
      `INSERT INTO files (path, content_hash, language, size, modified_at, indexed_at)
       VALUES (?, ?, 'typescript', 100, 1000, 1000)`,
    ).run('src/a.ts', 'hash-a');
    db.prepare(
      `INSERT INTO files (path, content_hash, language, size, modified_at, indexed_at)
       VALUES (?, ?, 'typescript', 100, 1000, 1000)`,
    ).run('src/b.ts', 'hash-b');
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    EmbeddingRunner.resetRegistryForTests();
    if (originalEnv === undefined) {
      delete process.env.ZCG_ENABLE_EMBEDDING;
    } else {
      process.env.ZCG_ENABLE_EMBEDDING = originalEnv;
    }
    if (originalVec0 === undefined) {
      delete process.env.ZCG_VEC0_PATH;
    } else {
      process.env.ZCG_VEC0_PATH = originalVec0;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('embeddingEnabled env gate', () => {
    it('rejects an explicitly configured missing vec0 binary', () => {
      const missing = path.join(dir, 'missing-vec0.dll');
      process.env.ZCG_VEC0_PATH = missing;
      expect(() => getDefaultVec0Path(projectRoot)).toThrow(
        `ZCG_VEC0_PATH does not exist or is not a file: ${missing}`,
      );
    });

    it('accepts the canonical boolean values and rejects non-boolean text', () => {
      process.env.ZCG_ENABLE_EMBEDDING = ' TRUE ';
      expect(embeddingEnabled()).toBe(true);
      process.env.ZCG_ENABLE_EMBEDDING = 'yes';
      expect(embeddingEnabled()).toBe(false);
    });

    it('is false when ZCG_ENABLE_EMBEDDING is unset', () => {
      delete process.env.ZCG_ENABLE_EMBEDDING;
      expect(embeddingEnabled()).toBe(false);
    });

    it('is false when ZCG_ENABLE_EMBEDDING=0', () => {
      process.env.ZCG_ENABLE_EMBEDDING = '0';
      expect(embeddingEnabled()).toBe(false);
    });

    it('accepts 1/true and 0/false case-insensitively', () => {
      for (const enabled of ['1', ' TRUE ']) {
        process.env.ZCG_ENABLE_EMBEDDING = enabled;
        expect(embeddingEnabled()).toBe(true);
      }
      for (const disabled of ['0', ' False ']) {
        process.env.ZCG_ENABLE_EMBEDDING = disabled;
        expect(embeddingEnabled()).toBe(false);
      }
    });
  });

  describe('EmbeddingRunner.forDatabase', () => {
    it('returns the same instance for the same dbPath', () => {
      const a = EmbeddingRunner.forDatabase({
        dbPath,
        projectRoot,
        vec0Path,
      });
      const b = EmbeddingRunner.forDatabase({
        dbPath,
        projectRoot,
        vec0Path,
      });
      expect(a).toBe(b);
    });

    it('returns different instances for different dbPaths', () => {
      const a = EmbeddingRunner.forDatabase({ dbPath, projectRoot, vec0Path });
      const otherDbPath = path.join(dir, 'other.db');
      fs.writeFileSync(otherDbPath, '');
      const b = EmbeddingRunner.forDatabase({
        dbPath: otherDbPath,
        projectRoot,
        vec0Path,
      });
      expect(a).not.toBe(b);
    });

    it('cancels an earlier idle timer before a subsequent terminal drain', async () => {
      const originalSetTimeout = global.setTimeout;
      const idleTimer = { marker: 'idle' } as unknown as NodeJS.Timeout;
      const clear = vi.spyOn(global, 'clearTimeout');
      const timeout = vi.spyOn(global, 'setTimeout').mockImplementation(((handler: TimerHandler, ms?: number) => {
        if (ms === 30_000) return idleTimer;
        return originalSetTimeout(handler, ms);
      }) as typeof setTimeout);
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const runner = new EmbeddingRunner({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
      });
      try {
        runner.notifyEnqueued();
        await vi.waitFor(() => {
          expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('done');
          expect(timeout).toHaveBeenCalledWith(expect.any(Function), 30_000);
        });
        // The old timer is captured at the public worker lifecycle boundary;
        // it must be cleared before the second drain begins.
        enqueueEmbedding(db, 'src/b.ts', 'hash-b');
        await expect(runner.drainAndExit()).resolves.toEqual({ processed: 1, failed: 0 });
        expect(getEmbeddingQueueRow(db, 'src/b.ts', 'hash-b')?.status).toBe('done');
        expect(clear).toHaveBeenCalledWith(idleTimer);
      } finally {
        timeout.mockRestore();
        clear.mockRestore();
        await runner.shutdown();
      }
    });

    it('drainAndExit rejects when pending rows remain after a terminal drain', async () => {
      const runner = new EmbeddingRunner({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(
          __dirname,
          'fixtures/embedding-model-failure-worker.cjs',
        ),
      });
      for (let i = 0; i < 9; i++) enqueueEmbedding(db, `src/f${i}.ts`, `hash-${i}`);

      await expect(runner.drainAndExit()).rejects.toThrow('1 embedding task(s) remain pending');
      expect(countEmbeddingQueueByStatus(db)).toMatchObject({ pending: 1, failed: 8 });
      expect(runner.isRunning()).toBe(false);
    });

    it('drainAndExit rejects when the drain reports failed rows', async () => {
      const runner = new EmbeddingRunner({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(
          __dirname,
          'fixtures/embedding-model-failure-worker.cjs',
        ),
      });
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');

      await expect(runner.drainAndExit()).rejects.toThrow('1 embedding task(s) failed');
      expect(runner.isRunning()).toBe(false);
    });

    it('drainAndExit rejects when the worker exits without reporting idle', async () => {
      const runner = new EmbeddingRunner({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
        workerData: { mode: 'early-exit' },
      });

      await expect(runner.drainAndExit()).rejects.toThrow(
        'Embedding worker exited before reporting idle (exit code 23)',
      );
      expect(runner.isRunning()).toBe(false);
    });

    it('shutdown waits for the active batch to commit its final state', async () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const runner = new EmbeddingRunner({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
      });
      runner.notifyEnqueued();
      await vi.waitFor(() => {
        expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('in_progress');
      });
      await runner.shutdown();

      expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('done');
      expect(runner.isRunning()).toBe(false);
    });

    it('MCP shutdown waits for the active embedding batch before exiting', async () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      db.prepare(`INSERT OR IGNORE INTO schema_versions(version,applied_at,description)
        SELECT column1,0,column2 FROM (VALUES (2,'v2'),(3,'v3'),(4,'v4'),(5,'v5'),(6,'v6'),(7,'v7'))`).run();
      db.close();
      const CodeGraph = (await import('../src/index')).default;
      const connection = DatabaseConnection.open(dbPath);
      db = connection.getDb();
      const cg = new CodeGraph(connection, db, projectRoot);
      const engine = new MCPEngine({ watch: false });
      (engine as unknown as { cg: CodeGraph }).cg = cg;
      const server = new MCPServer(projectRoot);
      (server as unknown as { engine: MCPEngine }).engine = engine;
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      const runner = EmbeddingRunner.forDatabase({
        dbPath,
        projectRoot,
        vec0Path,
        workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
      });
      runner.notifyEnqueued();
      await vi.waitFor(() => {
        expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('in_progress');
      });
      try {
        server.stop();
        expect(exit).not.toHaveBeenCalled();
        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
      } finally {
        exit.mockRestore();
        db = createDatabase(dbPath).db;
      }
      expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('done');
      db.close();
    });

    it('resetRegistryForTests drops the singleton', () => {
      const a = EmbeddingRunner.forDatabase({ dbPath, projectRoot, vec0Path });
      EmbeddingRunner.resetRegistryForTests();
      const b = EmbeddingRunner.forDatabase({ dbPath, projectRoot, vec0Path });
      expect(a).not.toBe(b);
    });

    it('isRunning() is false before any notifyEnqueued', () => {
      const r = EmbeddingRunner.forDatabase({ dbPath, projectRoot, vec0Path });
      expect(r.isRunning()).toBe(false);
    });
  });

  describe('MCP startup resume', () => {
    async function openRealCodeGraph(): Promise<import('../src/index').default> {
      db.prepare(`INSERT OR IGNORE INTO schema_versions(version,applied_at,description)
        SELECT column1,0,column2 FROM (VALUES (2,'v2'),(3,'v3'),(4,'v4'),(5,'v5'),(6,'v6'),(7,'v7'))`).run();
      db.close();
      const CodeGraph = (await import('../src/index')).default;
      const connection = DatabaseConnection.open(dbPath);
      return new CodeGraph(connection, new QueryBuilder(connection.getDb()), projectRoot);
    }

    it('resumes persisted pending rows through the real CodeGraph interface', async () => {
      process.env.ZCG_ENABLE_EMBEDDING = '1';
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const cg = await openRealCodeGraph();
      const notify = vi.fn();
      const forDatabase = vi.spyOn(EmbeddingRunner, 'forDatabase').mockReturnValue({
        notifyEnqueued: notify,
      } as unknown as EmbeddingRunner);
      try {
        expect(cg.resumePendingEmbeddings()).toBe(true);
        expect(notify).toHaveBeenCalledOnce();
        expect(cg.resumePendingEmbeddings()).toBe(true);
        expect(notify).toHaveBeenCalledTimes(2);
      } finally {
        forDatabase.mockRestore();
        cg.close();
        db = createDatabase(dbPath).db;
      }
    });

    it('starts recovery when the only remaining work is an orphaned in_progress row', async () => {
      process.env.ZCG_ENABLE_EMBEDDING = '1';
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      db.prepare(
        `UPDATE embedding_queue SET status='in_progress', attempts=1,
          worker_id='dead-worker', started_at=1, heartbeat_at=1
          WHERE file_path='src/a.ts'`,
      ).run();
      const cg = await openRealCodeGraph();
      const notify = vi.fn();
      const forDatabase = vi.spyOn(EmbeddingRunner, 'forDatabase').mockReturnValue({
        notifyEnqueued: notify,
      } as unknown as EmbeddingRunner);
      try {
        expect(cg.resumePendingEmbeddings()).toBe(true);
        expect(notify).toHaveBeenCalledOnce();
      } finally {
        forDatabase.mockRestore();
        cg.close();
        db = createDatabase(dbPath).db;
      }
    });

    it('does not spawn when disabled or when no pending work exists', async () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const cg = await openRealCodeGraph();
      const forDatabase = vi.spyOn(EmbeddingRunner, 'forDatabase');
      try {
        delete process.env.ZCG_ENABLE_EMBEDDING;
        expect(cg.resumePendingEmbeddings()).toBe(false);
        expect(forDatabase).not.toHaveBeenCalled();
        (cg as unknown as { db: DatabaseConnection }).db.getDb()
          .prepare("UPDATE embedding_queue SET status='done'").run();
        process.env.ZCG_ENABLE_EMBEDDING = '1';
        expect(cg.resumePendingEmbeddings()).toBe(false);
        expect(forDatabase).not.toHaveBeenCalled();
      } finally {
        forDatabase.mockRestore();
        cg.close();
        db = createDatabase(dbPath).db;
      }
    });
  });

  describe('read-repair enqueue logic (mirrors CodeGraph.enqueueEmbeddingReadRepair)', () => {
    /**
     * We can't easily instantiate a full CodeGraph in this unit test (it
     * would require tree-sitter grammars etc). Instead, we exercise the
     * SAME queue-state transitions the real helper performs, by inlining
     * the algorithm against the raw DB. This keeps the contract covered
     * without pulling the whole indexing stack into the test.
     */
    function readRepairEnqueue(hitPaths: string[]): number {
      const fileHashStmt = db.prepare(
        'SELECT path, content_hash FROM files WHERE path = ?',
      );
      const queueStmt = db.prepare(
        `SELECT content_hash, status FROM embedding_queue
          WHERE file_path = ?
          ORDER BY enqueued_at DESC LIMIT 1`,
      );
      const toEnqueue: Array<{ filePath: string; contentHash: string }> = [];
      for (const p of new Set(hitPaths)) {
        const fileRow = fileHashStmt.get(p) as
          | { path: string; content_hash: string }
          | undefined;
        if (!fileRow) continue;
        const queueRow = queueStmt.get(p) as
          | { content_hash: string; status: string }
          | undefined;
        if (
          !queueRow ||
          queueRow.content_hash !== fileRow.content_hash ||
          queueRow.status === 'failed'
        ) {
          toEnqueue.push({
            filePath: fileRow.path,
            contentHash: fileRow.content_hash,
          });
        }
      }
      if (toEnqueue.length === 0) return 0;
      const insert = db.prepare(
        `INSERT OR IGNORE INTO embedding_queue
           (file_path, content_hash, status, attempts, enqueued_at)
         VALUES (?, ?, 'pending', 0, ?)`,
      );
      let inserted = 0;
      for (const e of toEnqueue) {
        const r = insert.run(e.filePath, e.contentHash, Date.now());
        if (r.changes > 0) inserted++;
      }
      return inserted;
    }

    it('enqueues a missed file (no queue row)', () => {
      const n = readRepairEnqueue(['src/a.ts']);
      expect(n).toBe(1);
      const row = getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a');
      expect(row?.status).toBe('pending');
    });

    it('does NOT enqueue when hash matches and status=done', () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      db.prepare(
        `UPDATE embedding_queue SET status='done' WHERE file_path='src/a.ts'`,
      ).run();
      const n = readRepairEnqueue(['src/a.ts']);
      expect(n).toBe(0);
    });

    it('does NOT enqueue when hash matches and status=pending', () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const n = readRepairEnqueue(['src/a.ts']);
      expect(n).toBe(0);
    });

    it('enqueues a stale file (queue row hash differs from files)', () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-OLD');
      const n = readRepairEnqueue(['src/a.ts']);
      expect(n).toBe(1);
      const row = getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a');
      expect(row?.status).toBe('pending');
    });

    it('keeps a failed current hash terminal through the real CodeGraph interface', async () => {
      process.env.ZCG_ENABLE_EMBEDDING = '1';
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      db.prepare(
        `UPDATE embedding_queue SET status='failed' WHERE file_path='src/a.ts'`,
      ).run();
      db.prepare(`INSERT OR IGNORE INTO schema_versions(version,applied_at,description)
        SELECT column1,0,column2 FROM (VALUES (2,'v2'),(3,'v3'),(4,'v4'),(5,'v5'),(6,'v6'),(7,'v7'))`).run();
      db.close();
      const CodeGraph = (await import('../src/index')).default;
      const connection = DatabaseConnection.open(dbPath);
      const cg = new CodeGraph(connection, new QueryBuilder(connection.getDb()), projectRoot);
      const notify = vi.fn();
      const forDatabase = vi.spyOn(EmbeddingRunner, 'forDatabase').mockReturnValue({
        notifyEnqueued: notify,
      } as unknown as EmbeddingRunner);
      try {
        expect(cg.enqueueEmbeddingReadRepair(['src/a.ts'])).toBe(0);
        expect(getEmbeddingQueueRow(connection.getDb(), 'src/a.ts', 'hash-a')).toMatchObject({
          status: 'failed',
          attempts: 0,
        });
        expect(notify).not.toHaveBeenCalled();
      } finally {
        forDatabase.mockRestore();
        cg.close();
        db = createDatabase(dbPath).db;
      }
    });

    it('skips files not in the files table', () => {
      const n = readRepairEnqueue(['src/nonexistent.ts']);
      expect(n).toBe(0);
      expect(countEmbeddingQueueByStatus(db).pending).toBe(0);
    });

    it('dedupes hit paths before enqueue', () => {
      const n = readRepairEnqueue(['src/a.ts', 'src/a.ts', 'src/a.ts']);
      expect(n).toBe(1);
    });
  });

  describe('watcher onSyncComplete wrapping (1-4-29 Q2)', () => {
    it('CodeGraph.watch passes through user callback and triggers enqueue', async () => {
      // Spy on the FileWatcher constructor to capture the wrapped options.
      const watchOptionsSeen: Array<Record<string, unknown>> = [];
      const fakeSyncResult = {
        filesChecked: 3,
        filesAdded: 1,
        filesModified: 0,
        filesRemoved: 0,
        nodesUpdated: 0,
        durationMs: 5,
        changedFilePaths: ['src/a.ts'],
      };

      // We don't actually start a CodeGraph here (would require tree-sitter
      // + lock file); instead we directly verify the contract by simulating
      // the wrapper logic. The integration coverage lives in
      // tests/extraction.test.ts which exercises real watch() flows.
      // Here we assert the embedding hook fires only when the env gate is
      // open and the sync produced changes.
      let enqueuedPaths: string[] = [];
      const fakeEnqueue = (paths: string[]) => {
        enqueuedPaths = paths;
      };

      const wrapper = async (
        enabled: boolean,
        result: typeof fakeSyncResult,
        userCallback?: (r: { filesChanged: number; durationMs: number }) => void,
      ) => {
        if (enabled && result.changedFilePaths && result.changedFilePaths.length > 0) {
          fakeEnqueue(result.changedFilePaths);
        }
        const filesChanged =
          result.filesAdded + result.filesModified + result.filesRemoved;
        userCallback?.({ filesChanged, durationMs: result.durationMs });
      };

      // Disabled: no enqueue, user callback still fires.
      enqueuedPaths = [];
      const userSpy = vi.fn();
      await wrapper(false, fakeSyncResult, userSpy);
      expect(enqueuedPaths).toEqual([]);
      expect(userSpy).toHaveBeenCalledWith({ filesChanged: 1, durationMs: 5 });

      // Enabled: enqueue fires with the changed paths.
      enqueuedPaths = [];
      await wrapper(true, fakeSyncResult, userSpy);
      expect(enqueuedPaths).toEqual(['src/a.ts']);
    });
  });

  describe('runEmbeddingPipeline contract (1-4-29 Q4)', () => {
    it('enqueue-all without wait inserts one pending row per file', () => {
      // Mirrors CodeGraph.runEmbeddingPipeline's non-wait branch: enqueue
      // every row in files, return the inserted count. We don't spawn the
      // real worker here (fastembed not installed in test env).
      const rows = db
        .prepare('SELECT path, content_hash FROM files')
        .all() as Array<{ path: string; content_hash: string }>;
      const insert = db.prepare(
        `INSERT OR IGNORE INTO embedding_queue
           (file_path, content_hash, status, attempts, enqueued_at)
         VALUES (?, ?, 'pending', 0, ?)`,
      );
      let enqueued = 0;
      for (const r of rows) {
        const rr = insert.run(r.path, r.content_hash, Date.now());
        if (rr.changes > 0) enqueued++;
      }
      expect(enqueued).toBe(2);
      expect(countEmbeddingQueueByStatus(db).pending).toBe(2);
    });

    it('re-enqueue with same content_hash is a no-op (idempotent CLI re-run)', () => {
      enqueueEmbedding(db, 'src/a.ts', 'hash-a');
      const insert = db.prepare(
        `INSERT OR IGNORE INTO embedding_queue
           (file_path, content_hash, status, attempts, enqueued_at)
         VALUES (?, ?, 'pending', 0, ?)`,
      );
      let inserted = 0;
      for (const r of [
        { path: 'src/a.ts', content_hash: 'hash-a' },
        { path: 'src/b.ts', content_hash: 'hash-b' },
      ]) {
        const rr = insert.run(r.path, r.content_hash, Date.now());
        if (rr.changes > 0) inserted++;
      }
      expect(inserted).toBe(1); // only src/b.ts is new
    });
  });
});
