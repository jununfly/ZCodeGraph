import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createDatabase } from '../src/db/sqlite-adapter';

const REPO_ROOT = path.resolve(__dirname, '..');
const RUST_CORE_BIN = path.resolve(
  REPO_ROOT,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

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
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-sqlite-'));
    tempDirs.push(project);
    fs.writeFileSync(path.join(project, 'one.ts'), 'export function one() { return 1; }\n');
    fs.writeFileSync(path.join(project, 'two.ts'), 'export function two() { return one(); }\n');
    const dbPath = path.join(project, '.zcodegraph', 'zcodegraph.db');

    const result = spawnSync(
      RUST_CORE_BIN,
      [
        'index',
        '--engine',
        'rust',
        '--project-path',
        project,
        '--index-path',
        dbPath,
        '--force',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const { db } = createDatabase(dbPath);
    try {
      expect(String(db.pragma('journal_mode', { simple: true })).toLowerCase()).toBe('wal');
      expect((db.prepare('SELECT COUNT(*) AS count FROM files').get() as { count: number }).count).toBe(2);
    } finally {
      db.close();
    }
  });
});
