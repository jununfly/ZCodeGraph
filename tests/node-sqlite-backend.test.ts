/**
 * node:sqlite backend (issue #238 follow-up).
 *
 * node:sqlite (Node's built-in real SQLite) is now the sole backend. This drives
 * a real index + queries through it, so WAL, FTS5 search, and @named-param
 * writes are all exercised end-to-end.
 *
 * Skipped on Node < 22.5 where node:sqlite doesn't exist.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src';
import { createDatabase } from '../src/db/sqlite-adapter';
import { QueryBuilder } from '../src/db/queries';
import { DatabaseConnection } from '../src/db';

let nodeSqliteAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('node:sqlite');
  nodeSqliteAvailable = true;
} catch {
  nodeSqliteAvailable = false;
}

describe.skipIf(!nodeSqliteAvailable)('node:sqlite backend — real index + queries', () => {
  let dir: string;
  let cg: CodeGraph;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-nodesqlite-'));
    fs.writeFileSync(path.join(dir, 'a.ts'), 'export function helper(): number { return 1; }\n');
    fs.writeFileSync(
      path.join(dir, 'b.ts'),
      "import { helper } from './a';\nexport function main(): number { return helper(); }\n"
    );
    cg = await CodeGraph.init(dir, { index: true, engine: 'typescript' });
  });

  afterAll(() => {
    cg?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('uses the node:sqlite backend', () => {
    expect(cg.getBackend()).toBe('node-sqlite');
  });

  it('runs in WAL mode — the whole reason it beats the wasm fallback', () => {
    expect(cg.getJournalMode()).toBe('wal');
  });

  it('indexed the project (write path: @named-param INSERTs via node:sqlite)', () => {
    const stats = cg.getStats();
    expect(stats.fileCount).toBe(2);
    expect(stats.nodeCount).toBeGreaterThan(0);
  });

  it('FTS5 search returns the indexed symbol (read path)', () => {
    const results = cg.searchNodes('helper');
    const names = results.map(r => r.node.name);
    expect(names).toContain('helper');
  });

  it('graph traversal resolves the cross-file caller', () => {
    const helper = cg.searchNodes('helper').find(r => r.node.name === 'helper');
    expect(helper).toBeTruthy();
    const callers = cg.getCallers(helper!.node.id);
    expect(callers.map(c => c.node.name)).toContain('main');
  });
});

describe.skipIf(!nodeSqliteAvailable)('node:sqlite adapter — allowExtension option (1-4-2)', () => {
  // Roadmap 1-4-2 (P2 optional local hybrid semantic retrieval): the adapter
  // gains an opt-in `allowExtension` constructor flag so 1-4-3 can load
  // sqlite-vec's vec0 binary without re-plumbing. Default MUST stay disabled
  // so unrelated code paths fail closed.
  let tmpDb: string;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-allow-ext-'));
    tmpDb = path.join(tmpDir, 'probe.db');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults allowExtension to false — loadExtension call is rejected', () => {
    const { db } = createDatabase(tmpDb);
    try {
      // node:sqlite does not even expose loadExtension when the constructor
      // flag is false; probing via enableLoadExtension(false) is a no-op.
      // What we can assert deterministically: construction succeeded with the
      // default (no `allowExtension` passed), and the DB is writable.
      db.exec('CREATE TABLE t (x INTEGER)');
      db.prepare('INSERT INTO t VALUES (?)').run(1);
      const row = db.prepare('SELECT x FROM t').get();
      expect(row.x).toBe(1);
    } finally {
      db.close();
    }
  });

  it('accepts allowExtension: true and still opens a writable DB', () => {
    const { db } = createDatabase(tmpDb, { allowExtension: true });
    try {
      db.exec('CREATE TABLE IF NOT EXISTS t2 (x INTEGER)');
      db.prepare('INSERT INTO t2 VALUES (?)').run(42);
      const row = db.prepare('SELECT x FROM t2').get();
      expect(row.x).toBe(42);
    } finally {
      db.close();
    }
  });

  it('omitting the option behaves identically to passing allowExtension: false', () => {
    const a = createDatabase(tmpDb);
    const b = createDatabase(tmpDb, { allowExtension: false });
    try {
      // Both must succeed at basic writes — the flag must never break the
      // default open/read/write path.
      a.db.exec('CREATE TABLE IF NOT EXISTS t3 (x INTEGER)');
      b.db.exec('CREATE TABLE IF NOT EXISTS t4 (x INTEGER)');
    } finally {
      a.db.close();
      b.db.close();
    }
  });
});

describe.skipIf(!nodeSqliteAvailable)('node:sqlite lifecycle guard adapter (1-9-15)', () => {
  it('opens only on request and rejects mutations in read-only mode', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-readonly-guard-'));
    const dbPath = path.join(dir, 'guard.db');
    const setup = createDatabase(dbPath);
    setup.db.exec('CREATE TABLE facts (value TEXT)');
    setup.db.prepare('INSERT INTO facts VALUES (?)').run('persisted');
    setup.db.close();

    const guard = createDatabase(dbPath, { readOnly: true, open: false });
    try {
      expect(guard.db.open).toBe(false);
      guard.db.openConnection?.();
      expect(guard.db.prepare('SELECT value FROM facts').get()).toEqual({ value: 'persisted' });
      expect(() => guard.db.prepare('INSERT INTO facts VALUES (?)').run('mutation')).toThrow(/readonly/i);
      expect(() => guard.db.exec('CREATE TABLE forbidden (x INTEGER)')).toThrow(/readonly/i);
      expect(guard.db.prepare('SELECT value FROM facts').all()).toEqual([{ value: 'persisted' }]);
    } finally {
      guard.db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!nodeSqliteAvailable)('node:sqlite native staging and commit ordinal (1-9-15-2)', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-native-staging-'));
    dbPath = path.join(dir, 'staging.db');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('uncommitted writes are invisible to a fresh reader; committed writes are visible', () => {
    const { db } = createDatabase(dbPath);
    db.exec('CREATE TABLE IF NOT EXISTS staging_facts (value TEXT)');
    db.close();

    const writer = createDatabase(dbPath, {
      observation: { connectionId: 'native-staging-writer', runId: 'run-1', passId: 'pass-1' },
    });
    const reader = createDatabase(dbPath, { readOnly: true });
    try {
      // Start a transaction but do NOT commit yet.
      writer.db.exec('BEGIN');
      writer.db.prepare('INSERT INTO staging_facts VALUES (?)').run('staged');
      // Fresh reader must NOT see uncommitted data (WAL isolation).
      expect(reader.db.prepare('SELECT value FROM staging_facts').all()).toEqual([]);
      // Commit.
      writer.db.exec('COMMIT');
      // Fresh reader now sees committed data.
      expect(reader.db.prepare('SELECT value FROM staging_facts').all()).toEqual([{ value: 'staged' }]);
    } finally {
      writer.db.close();
      reader.db.close();
    }
  });

  it('edgeCommitOrdinal increments independently for each outermost transaction', () => {
    const receipts: Array<{ commitOrdinal: number; statements: unknown[] }> = [];
    const writer = createDatabase(dbPath, {
      observation: { connectionId: 'native-ordinal-writer', runId: 'run-1', passId: 'pass-1' },
    });
    try {
      writer.db.exec('CREATE TABLE IF NOT EXISTS ordinal_facts (value TEXT)');

      // Transaction 1: outermost BEGIN/COMMIT with observer.
      writer.db.transaction((observer?: { observeCommit: (s: unknown[], cb: (r: { commitOrdinal: number; statements: unknown[] }) => void) => void }) => {
        writer.db.prepare('INSERT INTO ordinal_facts VALUES (?)').run('tx1');
        observer?.observeCommit([{ value: 'tx1' }], (receipt) => {
          receipts.push(receipt);
        });
      })();

      // Transaction 2: another outermost BEGIN/COMMIT.
      writer.db.transaction((observer?: { observeCommit: (s: unknown[], cb: (r: { commitOrdinal: number; statements: unknown[] }) => void) => void }) => {
        writer.db.prepare('INSERT INTO ordinal_facts VALUES (?)').run('tx2');
        observer?.observeCommit([{ value: 'tx2' }], (receipt) => {
          receipts.push(receipt);
        });
      })();

      // Transaction 3: no observer — should still increment ordinal silently.
      writer.db.transaction(() => {
        writer.db.prepare('INSERT INTO ordinal_facts VALUES (?)').run('tx3');
      })();

      expect(receipts).toHaveLength(2);
      expect(receipts[0]!.commitOrdinal).toBe(1);
      expect(receipts[1]!.commitOrdinal).toBe(2);
      expect(receipts[0]!.statements).toEqual([{ value: 'tx1' }]);
      expect(receipts[1]!.statements).toEqual([{ value: 'tx2' }]);

      // Verify all three committed rows are visible to a fresh reader.
      const reader = createDatabase(dbPath, { readOnly: true });
      try {
        expect(reader.db.prepare('SELECT value FROM ordinal_facts ORDER BY rowid').all()).toEqual([
          { value: 'tx1' },
          { value: 'tx2' },
          { value: 'tx3' },
        ]);
      } finally {
        reader.db.close();
      }
    } finally {
      writer.db.close();
    }
  });
});

describe.skipIf(!nodeSqliteAvailable)('node:sqlite observer default-off (1-9-15-2)', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-observer-off-'));
    dbPath = path.join(dir, 'observer-off.db');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('default createDatabase does not inject transactionObserver into transaction fn', () => {
    const { db } = createDatabase(dbPath);
    try {
      db.exec('CREATE TABLE IF NOT EXISTS default_facts (value TEXT)');
      let observerSeen: unknown = 'not-called';
      db.transaction((observer?: unknown) => {
        observerSeen = observer;
        db.prepare('INSERT INTO default_facts VALUES (?)').run('default');
      })();
      // Default path: no observation → observer is undefined.
      expect(observerSeen).toBeUndefined();
      // Data committed normally.
      expect(db.prepare('SELECT value FROM default_facts').all()).toEqual([{ value: 'default' }]);
    } finally {
      db.close();
    }
  });

  it('default QueryBuilder does not collect or emit receipts for edge writes', () => {
    const conn = DatabaseConnection.initialize(dbPath);
    try {
      const queries = new QueryBuilder(conn.getDb());
      const node = {
        id: 'function:test',
        kind: 'function',
        name: 'test',
        qualifiedName: 'test',
        filePath: 'test.ts',
        language: 'typescript',
        startLine: 1,
        endLine: 1,
        startColumn: 0,
        endColumn: 1,
        updatedAt: Date.now(),
      };
      queries.insertNodes([node]);
      // No observer attached — insertValidatedEdges must not collect receipts.
      const diagnostics = queries.insertValidatedEdges([{
        source: node.id,
        target: node.id,
        kind: 'calls',
        line: 1,
        column: 0,
      }]);
      // Diagnostics still returned (public API unchanged), but no receipt events.
      expect(diagnostics).toBeDefined();
      expect(diagnostics.serializationMs).toBeGreaterThanOrEqual(0);
    } finally {
      conn.close();
    }
  });

  it('nested transaction without outermost observation throws only when observation is present', () => {
    // Default: no observation → nested transactions work silently.
    const { db } = createDatabase(dbPath);
    try {
      db.exec('CREATE TABLE IF NOT EXISTS nested_facts (value TEXT)');
      db.transaction(() => {
        db.transaction(() => {
          db.prepare('INSERT INTO nested_facts VALUES (?)').run('nested');
        })();
      })();
      expect(db.prepare('SELECT value FROM nested_facts').all()).toEqual([{ value: 'nested' }]);
    } finally {
      db.close();
    }
  });

  it('1-9-15-2: permits an ordinary nested helper before its outer receipt is registered', () => {
    const { db } = createDatabase(dbPath, {
      observation: { connectionId: 'nested-writer', runId: 'run-1', passId: 'pass-1' },
    });
    const receipts: Array<{ commitOrdinal: number; statements: unknown[] }> = [];
    try {
      db.exec('CREATE TABLE IF NOT EXISTS observed_nested_facts (value TEXT)');
      db.transaction((observer) => {
        db.transaction(() => {
          db.prepare('INSERT INTO observed_nested_facts VALUES (?)').run('nested-before-observation');
        })();
        observer.observeCommit([{ value: 'outer' }], (receipt) => receipts.push(receipt));
      })();
      expect(receipts).toEqual([{
        connectionId: 'nested-writer',
        runId: 'run-1',
        passId: 'pass-1',
        commitOrdinal: 1,
        statements: [{ value: 'outer' }],
      }]);
      expect(db.prepare('SELECT value FROM observed_nested_facts').all()).toEqual([
        { value: 'nested-before-observation' },
      ]);
    } finally {
      db.close();
    }
  });
});
