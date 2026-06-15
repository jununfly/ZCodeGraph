import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-failure-safety-matrix.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

describe('Rust failure-safety matrix primitive', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    }
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('documents the matrix cases in --help', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/rust-failure-safety-matrix.mjs');
    for (const id of [
      'missing-binary',
      'nonzero-before-index',
      'malformed-stdout-json',
      'crash-after-temp-db',
      'partial-temp-db-then-fail',
      'lock-contention',
      'stale-lock-recovery',
      'packaged-binary-removed',
    ]) {
      expect(result.stdout).toContain(id);
    }
  });

  it('verifies a failed Rust index keeps the previous active index readable', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-failure-matrix-'));
    tempDirs.push(out);

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--case', 'missing-binary', '--out', out],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const summary = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf-8'));
    expect(summary.cases).toHaveLength(1);
    expect(summary.cases[0]).toMatchObject({
      id: 'missing-binary',
      passed: true,
      previousActiveIndexReadable: true,
      noPartialIndexActive: true,
      errorIncludesNextAction: true,
      defaultTypescriptIndexWorksAfterward: true,
    });
    expect(summary.gateFailures).toEqual([]);
    expect(fs.existsSync(path.join(out, 'missing-binary', 'stderr.txt'))).toBe(true);
  }, 30_000);
});
