import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createDatabase } from '../../src/db/sqlite-adapter';
import { RUST_CORE_BIN } from './rust-indexing-cli';

export const REPO_ROOT = path.resolve(__dirname, '..', '..');

export interface RustCoreIndexFixture {
  projectPath: string;
  dbPath: string;
}

export function createRustCoreIndexFixture(prefix = 'zcodegraph-rust-sqlite-'): RustCoreIndexFixture {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    projectPath,
    dbPath: path.join(projectPath, '.zcodegraph', 'zcodegraph.db'),
  };
}

export function runRustCoreIndex(fixture: RustCoreIndexFixture): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    RUST_CORE_BIN,
    [
      'index',
      '--engine',
      'rust',
      '--project-path',
      fixture.projectPath,
      '--index-path',
      fixture.dbPath,
      '--force',
    ],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function withSqliteDb<T>(dbPath: string, callback: (db: ReturnType<typeof createDatabase>['db']) => T): T {
  const { db } = createDatabase(dbPath);
  try {
    return callback(db);
  } finally {
    db.close();
  }
}
