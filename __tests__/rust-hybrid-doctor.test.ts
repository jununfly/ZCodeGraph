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

function writeFakeRustCoreWithPerFileGap(dir: string, filePath: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-gap.cjs' : 'fake-rust-core-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      '    code: "rust-owned-extraction-gap",',
      '    severity: "warning",',
      '    writtenByRust: false,',
      '    line: 1,',
      '    column: 8,',
      '    message: "fake Rust-owned extraction gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
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
      fallbackState: 'healthy',
      rss: { peakRssBytes: null, unavailableReason: 'not-collected-in-this-run' },
    });
    expect(lastRun.sanitizedOutput.stdoutTail.unavailableReason).toBeTypeOf('string');

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    expect(doctor.stdout).toContain('Bundle summary: rust-hybrid last-run');
    expect(doctor.stdout).toContain('Graph:');
    expect(doctor.stdout).toContain('Graph health: healthy');
    expect(doctor.stdout).toContain('Fallback health: healthy');
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
    expect(status.index.hybrid.fallbackState).toBe('healthy');
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

  it('prints a parseable machine-readable doctor bundle summary with --json', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');

    const index = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(index.status, `stdout:\n${index.stdout}\nstderr:\n${index.stderr}`).toBe(0);

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run', '--json']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    expect(doctor.stdout).not.toContain('Created diagnostic bundle');
    const parsed = JSON.parse(doctor.stdout) as {
      bundlePath: string;
      summary: {
        engine: string;
        source: string;
        lines: string[];
        graph: { available: boolean; fileCount: number | null; nodeCount: number | null; edgeCount: number | null };
        fallback: { state: string | null; reasonTaxonomy: Record<string, number>; topReasons: Array<{ code: string; count: number }> } | null;
      };
    };
    expect(parsed.bundlePath).toContain('.zcodegraph/diagnostics/bundles/');
    expect(parsed.summary).toMatchObject({
      engine: 'rust-hybrid',
      source: 'last-run',
      graph: {
        available: true,
        fileCount: expect.any(Number),
        nodeCount: expect.any(Number),
        edgeCount: expect.any(Number),
      },
      fallback: {
        state: 'healthy',
        reasonTaxonomy: {},
        topReasons: [],
      },
    });
    expect(parsed.summary.lines).toContain('Graph health: healthy');
    expect(parsed.summary.lines).toContain('Fallback health: healthy');
  }, 30_000);

  it('includes Rust-owned per-file fallback taxonomy in the doctor last-run bundle', () => {
    const rustCore = writeFakeRustCoreWithPerFileGap(tempDir, 'a.ts');

    const index = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });
    expect(index.status, `stdout:\n${index.stdout}\nstderr:\n${index.stderr}`).toBe(0);

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    expect(doctor.stdout).toContain('Bundle summary: rust-hybrid last-run');
    expect(doctor.stdout).toContain('Graph health: degraded');
    expect(doctor.stdout).toContain('Fallback health: degraded');
    expect(doctor.stdout).toContain('The index is usable; fallback-degraded files or diagnostics are the only parts that need review.');
    expect(doctor.stdout).toContain('Top fallback reasons:');
    expect(doctor.stdout).toContain('1 Rust-owned files with extraction diagnostics');
    expect(doctor.stdout).toContain('Diagnostic artifact: per-file-diagnostics.json uses path hashes and reason categories without source slices.');
    expect(doctor.stdout).toContain('Next step: share this bundle path with the maintainer or attach the bundle contents requested by them.');
    const bundleDir = path.resolve(tempDir, latestBundlePath(doctor.stdout));

    const status = readJson(path.join(bundleDir, 'status.json'));
    expect(status.index.hybrid).toMatchObject({
      fallbackState: 'degraded',
      fallbackFileCount: 0,
      fallbackReasonTaxonomy: { 'rust-owned-extraction-gap': 1 },
    });

    const perFile = readJson(path.join(bundleDir, 'per-file-diagnostics.json'));
    expect(perFile).toMatchObject({
      schemaVersion: 1,
      classification: {
        replaySafe: true,
        sourcePathPolicy: 'path-hash-only',
        sourceSlicePolicy: 'omitted',
        aggregateTaxonomy: {
          fallbackState: 'degraded',
          fallbackFileCount: 0,
          fallbackReasonTaxonomy: { 'rust-owned-extraction-gap': 1 },
        },
      },
    });
    expect(perFile.errors).toEqual([
      expect.objectContaining({
        pathHash: expect.any(String),
        extension: '.ts',
        language: 'typescript',
        code: 'rust-owned-extraction-gap',
        severity: 'warning',
        line: 1,
        column: 8,
      }),
    ]);
    const diagnosticsText = fs.readFileSync(path.join(bundleDir, 'per-file-diagnostics.json'), 'utf-8');
    expect(diagnosticsText).not.toContain('a.ts');
    expect(diagnosticsText).not.toContain(tempDir);
    const replay = fs.readFileSync(path.join(bundleDir, 'replay.md'), 'utf-8');
    expect(replay).toContain('Per-file diagnostics');
    expect(replay).toContain('pathHash');
    expect(replay).toContain('fallbackReasonTaxonomy');
    expect(replay).not.toContain('a.ts');
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
    expect(doctor.stdout).toContain('Graph health: failed');
    const bundleDir = path.resolve(tempDir, latestBundlePath(doctor.stdout));
    expect(readJson(path.join(bundleDir, 'manifest.json'))).toMatchObject({
      engine: 'rust-hybrid',
      source: 'last-failure',
    });
    const replay = fs.readFileSync(path.join(bundleDir, 'replay.md'), 'utf-8');
    expect(replay).toContain('last-failure');
    expect(replay).not.toContain(tempDir);
  }, 30_000);

  it('creates a corrupted database bundle without opening the malformed DB', () => {
    const lastRunPath = path.join(tempDir, '.zcodegraph', 'diagnostics', 'last-run.json');
    fs.mkdirSync(path.dirname(lastRunPath), { recursive: true });
    fs.writeFileSync(lastRunPath, `${JSON.stringify({
      schemaVersion: 1,
      kind: 'last-run',
      engine: 'rust-hybrid',
      command: { name: 'index', args: ['--engine', 'rust-hybrid'] },
      startedAt: '2026-07-02T00:00:00.000Z',
      endedAt: '2026-07-02T00:00:01.000Z',
      elapsedMs: 1000,
      exitCode: 0,
      fallbackState: null,
      previousIndexPreserved: null,
      projectRootHash: 'test-project-root-hash',
      rss: { peakRssBytes: null, unavailableReason: 'not-collected-in-this-run' },
      sanitizedOutput: {
        stdoutTail: { unavailableReason: 'not-captured-in-this-run' },
        stderrTail: { unavailableReason: 'not-captured-in-this-run' },
      },
      errors: [],
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(tempDir, '.zcodegraph', 'zcodegraph.db'), 'not sqlite');

    const doctor = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    expect(doctor.stdout).toContain('Graph health: corrupted');
    const bundleDir = path.resolve(tempDir, latestBundlePath(doctor.stdout));

    const status = readJson(path.join(bundleDir, 'status.json'));
    expect(status).toMatchObject({
      available: false,
      health: {
        state: 'corrupted',
        usable: false,
      },
      database: {
        present: true,
        sizeBytes: expect.any(Number),
        mtime: expect.any(String),
        openError: expect.any(String),
      },
      diagnostics: {
        lastRun: { exists: true, endedAt: '2026-07-02T00:00:01.000Z' },
        lastFailure: { exists: false },
      },
    });
    expect(status.database.openError).toMatch(/file is not a database|database disk image is malformed/);
    expect(status.database.openError).not.toContain(tempDir);
    expect(status.health.nextCommands).toContain('rm -rf .zcodegraph && zcodegraph init');

    const graphStats = readJson(path.join(bundleDir, 'graph-stats.json'));
    expect(graphStats).toEqual({
      available: false,
      unavailableReason: 'corrupted',
    });
    const bundleText = fs.readdirSync(bundleDir)
      .map((file) => fs.readFileSync(path.join(bundleDir, file), 'utf-8'))
      .join('\n');
    expect(bundleText).not.toContain(tempDir);
    expect(bundleText).not.toContain('secretSourceNeedle');
  }, 30_000);

  it('rejects source slices for diagnostic bundle v1', () => {
    const result = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run', '--include-source-slice']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('source slices are not supported');
  });

  it('prints an exact last-run source-selection command when no last-run record exists', () => {
    const result = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-run']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No last-run diagnostic record found.');
    expect(result.stderr).toContain('Graph health: unavailable');
    expect(result.stderr).toContain('zcodegraph index --engine rust-hybrid');
    expect(result.stderr).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  });

  it('prints an exact last-failure source-selection command when no last-failure record exists', () => {
    const result = runCli(tempDir, ['doctor', '--engine', 'rust-hybrid', '--bundle', '--last-failure']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No last-failure diagnostic record found.');
    expect(result.stderr).toContain('Graph health: unavailable');
    expect(result.stderr).toContain('zcodegraph index --engine rust-hybrid');
    expect(result.stderr).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-failure');
  });
});
