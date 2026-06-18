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

function runCli(cwd: string, args: string[], env: Record<string, string | undefined> = {}): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
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
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function latestBundlePath(stdout: string): string {
  const line = stdout.trim().split('\n').find((entry) => entry.includes('.zcodegraph/diagnostics/bundles/'));
  expect(line, stdout).toBeDefined();
  return line!.slice(line!.indexOf('.zcodegraph/diagnostics/bundles/'));
}

describe('rust-hybrid doctor diagnostic bundles', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-hybrid-doctor-'));
    fs.writeFileSync(path.join(tempDir, 'a.ts'), 'export const secretSourceNeedle = "do-not-collect";\n');
    const cg = CodeGraph.initSync(tempDir);
    cg.close();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes a last-run record and creates a privacy-preserving degraded bundle', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');

    const index = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(index.status, `stdout:\n${index.stdout}\nstderr:\n${index.stderr}`).toBe(0);

    const lastRunPath = path.join(tempDir, '.zcodegraph', 'diagnostics', 'last-run.json');
    expect(fs.existsSync(lastRunPath)).toBe(true);
    const lastRun = readJson(lastRunPath);
    expect(lastRun).toMatchObject({
      engine: 'rust-hybrid',
      kind: 'last-run',
      exitCode: 0,
      fallbackState: 'degraded',
      rss: { peakRssBytes: null, unavailableReason: 'not-collected-in-this-run' },
    });
    expect(lastRun.sanitizedOutput.stdoutTail.unavailableReason).toBeTypeOf('string');

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    const bundleDir = path.resolve(tempDir, latestBundlePath(doctor.stdout));
    expect(fs.existsSync(path.join(bundleDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'status.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'graph-stats.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'corpus-fingerprint.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'per-file-diagnostics.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'replay.md'))).toBe(true);
    expect(fs.existsSync(path.join(bundleDir, 'privacy.md'))).toBe(true);

    const manifest = readJson(path.join(bundleDir, 'manifest.json'));
    expect(manifest).toMatchObject({ engine: 'rust-hybrid', source: 'last-run' });
    const status = readJson(path.join(bundleDir, 'status.json'));
    expect(status.index.hybrid.fallbackState).toBe('degraded');
    const fingerprintText = fs.readFileSync(path.join(bundleDir, 'corpus-fingerprint.json'), 'utf-8');
    const diagnosticsText = fs.readFileSync(path.join(bundleDir, 'per-file-diagnostics.json'), 'utf-8');
    const bundleText = fs.readdirSync(bundleDir)
      .map((file) => fs.readFileSync(path.join(bundleDir, file), 'utf-8'))
      .join('\n');
    expect(fingerprintText).not.toContain('a.ts');
    expect(fingerprintText).not.toContain('worker.py');
    expect(diagnosticsText).not.toContain('worker.py');
    expect(bundleText).not.toContain('secretSourceNeedle');
    expect(bundleText).not.toContain(tempDir);
  }, 30_000);

  it('writes a last-failure record and creates a failure bundle for Rust process failure', () => {
    const missingCore = path.join(tempDir, 'missing-zcodegraph-core');
    const index = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: missingCore,
    });
    expect(index.status).toBe(1);

    const failurePath = path.join(tempDir, '.zcodegraph', 'diagnostics', 'last-failure.json');
    expect(fs.existsSync(failurePath)).toBe(true);
    const failure = readJson(failurePath);
    expect(failure).toMatchObject({
      engine: 'rust-hybrid',
      kind: 'last-failure',
      exitCode: 1,
      previousIndexPreserved: true,
      rss: { peakRssBytes: null, unavailableReason: 'not-collected-in-this-run' },
    });
    expect(failure.sanitizedOutput.stderrTail.text).toContain('Rust index engine is unavailable');

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-failure']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    const bundleDir = path.resolve(tempDir, latestBundlePath(doctor.stdout));
    expect(readJson(path.join(bundleDir, 'manifest.json'))).toMatchObject({
      engine: 'rust-hybrid',
      source: 'last-failure',
    });
    const replay = fs.readFileSync(path.join(bundleDir, 'replay.md'), 'utf-8');
    expect(replay).toContain('last-failure');
    expect(replay).not.toContain(tempDir);
  }, 30_000);

  it('rejects source slices for diagnostic bundle v1', () => {
    const result = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run', '--include-source-slice']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('source slices are not supported');
  });
});
