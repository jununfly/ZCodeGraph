import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

function makeTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-engine-'));
  fs.writeFileSync(path.join(dir, 'a.ts'), 'export function alpha(): number { return 1; }\n');
  const cg = CodeGraph.initSync(dir);
  cg.close();
  return dir;
}

function writeFakeRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core.cjs' : 'fake-rust-core');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({ type: "result", success: true, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [], durationMs: 1 }) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function runCli(
  cwd: string,
  args: string[],
  env: Record<string, string | undefined> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ...env,
    },
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('zcodegraph index engine selection', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
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
    tempDir = makeTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the TypeScript indexer by default', () => {
    const result = runCli(tempDir, ['index', '--quiet']);

    expect(result.status).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('runs the Rust subprocess when selected by environment variable', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_INDEX_ENGINE: 'rust',
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('rejects unsupported engine values before indexing', () => {
    const result = runCli(tempDir, ['index', '--engine', 'python', '--quiet']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported index engine');
  });

  it('leaves the existing TypeScript index intact when the Rust binary is unavailable', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll();
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const result = runCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(tempDir, 'missing-rust-core'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Rust index engine is unavailable');

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('writes a Rust-produced index that TypeScript status can inspect', () => {
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const statusResult = runCli(tempDir, ['status', '--json']);
    expect(statusResult.status).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      initialized: boolean;
      index: {
        engine: string | null;
        engineVersion: string | null;
        builtWithExtractionVersion: number | null;
      };
    };

    expect(status.initialized).toBe(true);
    expect(status.index.engine).toBe('rust');
    expect(status.index.engineVersion).toBe('0.1.0');
    expect(status.index.builtWithExtractionVersion).toBeTypeOf('number');

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getIndexBuildInfo()).toMatchObject({
        engine: 'rust',
        engineVersion: '0.1.0',
      });
      expect(cg.getStats().fileCount).toBe(0);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps the previous good index when the Rust writer cannot acquire the project lock', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll();
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const lockPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.lock');
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    try {
      const result = runCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
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
});
