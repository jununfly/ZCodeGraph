import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  waitFor,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust index failure safety and project lock behavior', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('leaves the existing TypeScript index intact when the Rust binary is unavailable', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll({ engine: 'typescript' });
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(tempDir, 'missing-rust-core'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Rust index engine is unavailable');
    expect(result.stderr).toContain('Rust diagnostics:');
    expect(result.stderr).toContain('discovery source: env');
    expect(result.stderr).toContain(`attempted command: ${path.join(tempDir, 'missing-rust-core')}`);
    expect(result.stderr).toContain('active index preserved: yes');
    expect(result.stderr).toContain('next action: Set ZCODEGRAPH_RUST_CORE_BINARY');

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps the previous good index when the Rust writer cannot acquire the project lock', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll({ engine: 'typescript' });
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const lockPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.lock');
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    try {
      const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('CodeGraph database is locked by another process');
    } finally {
      fs.rmSync(lockPath, { force: true });
    }

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({
        engine: 'typescript',
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it.runIf(process.platform !== 'win32')('can index again after the Rust subprocess is terminated while holding the project lock', async () => {
    const indexPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.db');
    const child = spawn(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      indexPath,
    ], {
      cwd: tempDir,
      env: {
        ...process.env,
        ZCODEGRAPH_RUST_CORE_TEST_SLEEP_MS: '5000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const lockPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.lock');
    await waitFor(() => fs.existsSync(lockPath));
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => child.once('close', () => resolve()));
    expect(fs.existsSync(lockPath)).toBe(true);

    const retry = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(retry.status).toBe(0);
    expect(fs.existsSync(lockPath)).toBe(false);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'rust' });
    } finally {
      cg.close();
    }
  }, 30_000);
});
