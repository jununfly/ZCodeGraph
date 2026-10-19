import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  createRustCoreIndexFixture,
  REPO_ROOT,
  runRustCoreIndex,
  withSqliteDb,
} from './helpers/rust-indexing-sqlite';

describe('Rust SQLite write batching', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes Rust indexes with WAL journal mode and NORMAL synchronous pragma', () => {
    const fixture = createRustCoreIndexFixture();
    tempDirs.push(fixture.projectPath);
    fs.writeFileSync(path.join(fixture.projectPath, 'one.ts'), 'export function one() { return 1; }\n');
    fs.writeFileSync(path.join(fixture.projectPath, 'two.ts'), 'export function two() { return one(); }\n');

    const result = runRustCoreIndex(fixture);
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    withSqliteDb(fixture.dbPath, (db) => {
      expect(String(db.pragma('journal_mode', { simple: true })).toLowerCase()).toBe('wal');
      expect((db.prepare('SELECT COUNT(*) AS count FROM files').get() as { count: number }).count).toBe(2);
    });
  });
});
