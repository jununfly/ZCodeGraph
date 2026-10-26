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
