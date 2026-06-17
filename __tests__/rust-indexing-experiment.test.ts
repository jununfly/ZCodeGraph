import { describe, expect, it, afterEach, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-indexing-experiment.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function canonicalManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    experimentId: 'rust-indexing-core-phase-14',
    kind: 'indexing-ab',
    arms: ['rust', 'typescript'],
    sourceCopy: {
      mode: 'js-ts-config-slice',
      isolation: 'per-arm',
    },
    targets: [],
    metrics: {},
    outputs: {},
    ignoredFutureField: { preserved: true },
    ...overrides,
  };
}

describe('Rust indexing formal experiment runner', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      const result = spawnSync('npm', ['run', 'build'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      expect(result.status).toBe(0);
    }
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function runWithManifest(value: string | Record<string, unknown>) {
    const temp = makeTempDir('zcodegraph-rust-experiment-');
    tempDirs.push(temp);
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    if (typeof value === 'string') {
      fs.writeFileSync(manifest, value);
    } else {
      writeJson(manifest, value);
    }

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );
    return { result, out, summaryOut };
  }

  it('accepts a valid manifest and normalizes arm order', () => {
    const { result, out, summaryOut } = runWithManifest(canonicalManifest());

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      schemaVersion: number;
      experimentId: string;
      kind: string;
      arms: string[];
      manifest: { unknownFields: string[] };
      classification: string;
      decisionReadiness: { rolloutReadinessClaimed: boolean };
    };
    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.experimentId).toBe('rust-indexing-core-phase-14');
    expect(artifact.kind).toBe('indexing-ab');
    expect(artifact.arms).toEqual(['typescript', 'rust']);
    expect(artifact.manifest.unknownFields).toContain('ignoredFutureField');
    expect(artifact.classification).toBe('failed-required-arm-unavailable');
    expect(artifact.decisionReadiness.rolloutReadinessClaimed).toBe(false);
    expect(fs.readFileSync(summaryOut, 'utf-8')).toContain('Rust default rollout readiness is not claimed');
  });

  it('rejects invalid JSON with a fatal manifest diagnostic', () => {
    const { result, out, summaryOut } = runWithManifest('{ not valid json');

    expect(result.status).toBe(1);
    expect(fs.existsSync(summaryOut)).toBe(false);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      preflight: { status: string; diagnostics: Array<{ kind: string }> };
    };
    expect(artifact.classification).toBe('failed-manifest-invalid');
    expect(artifact.preflight.status).toBe('failed');
    expect(artifact.preflight.diagnostics.map((diagnostic) => diagnostic.kind)).toContain('invalid-manifest-json');
  });

  it('resolves Rust graph work profiles from manifest defaults and target arm overrides', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-graph-work-profile-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(path.join(source, 'src', 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');

    const { result, out, summaryOut } = runWithManifest(
      canonicalManifest({
        rust: { graphWorkProfile: 'matched-ts-js' },
        targets: [
          {
            name: 'manifestDefault',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
          {
            name: 'targetOverride',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-2'],
            arms: { rust: { graphWorkProfile: 'full' } },
          },
        ],
      }),
    );

    const rerun = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', path.join(path.dirname(out), 'experiment.json'), '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(rerun.status, `stdout:\n${rerun.stdout}\nstderr:\n${rerun.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        name: string;
        arms: {
          rust: {
            graphWorkProfile: { configured: string | null; effective: string; source: string };
          };
        };
      }>;
    };
    const byName = Object.fromEntries(artifact.targets.map((target) => [target.name, target]));
    expect(byName.manifestDefault.arms.rust.graphWorkProfile).toEqual({
      configured: 'matched-ts-js',
      effective: 'matched-ts-js',
      source: 'experiment',
    });
    expect(byName.targetOverride.arms.rust.graphWorkProfile).toEqual({
      configured: 'full',
      effective: 'full',
      source: 'target-arm',
    });

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('## Rust graph work profiles');
    expect(summary).toContain('| manifestDefault | matched-ts-js | experiment |');
    expect(summary).toContain('| targetOverride | full | target-arm |');
    expect(summary).toContain('matched-ts-js controls the most obvious rerun5 cost drivers');
  });

  it('passes experimental SQLite write mode from the manifest to the Rust arm only', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-sqlite-write-mode-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(path.join(source, 'src', 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');

    const { result, out, summaryOut } = runWithManifest(
      canonicalManifest({
        rust: {
          graphWorkProfile: 'matched-ts-js',
          sqliteWriteMode: 'memory-final-flush',
        },
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const rerun = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', path.join(path.dirname(out), 'experiment.json'), '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(rerun.status, `stdout:\n${rerun.stdout}\nstderr:\n${rerun.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      rust: { sqliteWriteMode: string };
      targets: Array<{
        arms: {
          typescript: { command: { args: string[] } };
          rust: {
            sqliteWriteMode: { configured: string; effective: string; source: string };
            command: { args: string[] };
          };
        };
      }>;
    };
    expect(artifact.rust.sqliteWriteMode).toBe('memory-final-flush');
    expect(artifact.targets[0].arms.rust.sqliteWriteMode).toEqual({
      configured: 'memory-final-flush',
      effective: 'memory-final-flush',
      source: 'experiment',
    });
    expect(artifact.targets[0].arms.rust.command.args).toContain('--sqlite-write-mode');
    expect(artifact.targets[0].arms.rust.command.args).toContain('memory-final-flush');
    expect(artifact.targets[0].arms.typescript.command.args).not.toContain('--sqlite-write-mode');

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('## Rust SQLite write modes');
    expect(summary).toContain('| fixture | memory-final-flush | experiment |');
  });

  it('rejects unknown Rust graph work profiles from the manifest', () => {
    const { result, out } = runWithManifest(
      canonicalManifest({
        rust: { graphWorkProfile: 'wide-open' },
      }),
    );

    expect(result.status).toBe(1);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      preflight: { diagnostics: Array<{ kind: string; field?: string }> };
    };
    expect(artifact.classification).toBe('failed-manifest-invalid');
    expect(artifact.preflight.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'unsupported-graph-work-profile', field: 'rust.graphWorkProfile' }),
    );
  });

  it('rejects unsupported kind, arms, duplicate targets, invalid source copy, target paths, and thresholds', () => {
    const { result, out } = runWithManifest(
      canonicalManifest({
        kind: 'other-experiment',
        arms: ['typescript', 'python'],
        sourceCopy: { mode: 'reuse-indexed', isolation: 'shared' },
        targets: [
          { name: 'duplicate', pathFallback: '.' },
          { name: 'duplicate' },
        ],
        metrics: { thresholds: { wallTimeImprovementPct: 'fast' } },
      }),
    );

    expect(result.status).toBe(1);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      preflight: { diagnostics: Array<{ kind: string }> };
    };
    const kinds = artifact.preflight.diagnostics.map((diagnostic) => diagnostic.kind);
    expect(artifact.classification).toBe('failed-manifest-invalid');
    expect(kinds).toContain('unsupported-experiment-kind');
    expect(kinds).toContain('unsupported-arms');
    expect(kinds).toContain('unsupported-source-copy-mode');
    expect(kinds).toContain('unsupported-source-copy-isolation');
    expect(kinds).toContain('duplicate-target-name');
    expect(kinds).toContain('invalid-target-path');
    expect(kinds).toContain('invalid-metrics-threshold');
  });

  it('records target path provenance and unavailable arm preflight without aborting other targets', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-targets-');
    tempDirs.push(temp);
    const envTarget = path.join(temp, 'env-target');
    const fallbackTarget = path.join(temp, 'fallback-target');
    fs.mkdirSync(envTarget, { recursive: true });
    fs.mkdirSync(fallbackTarget, { recursive: true });

    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'envTarget',
            pathEnv: 'ZCODEGRAPH_TEST_TARGET',
            pathFallback: path.join(temp, 'ignored-fallback'),
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['ENV-1'],
          },
          {
            name: 'fallbackTarget',
            pathFallback: fallbackTarget,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FB-1'],
          },
          {
            name: 'missingTarget',
            pathFallback: path.join(temp, 'missing'),
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['MISS-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_TEST_TARGET: envTarget,
          ZCODEGRAPH_RUST_CORE_BINARY: path.join(temp, 'missing-rust-core'),
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      preflight: { status: string; rustCore: { available: boolean } };
      targets: Array<{
        name: string;
        preflight: { status: string; kind: string | null };
        path: { resolvedPath: string | null; pathSource: string | null };
        arms: {
          typescript: { preflight: { status: string; kind: string | null }; execution: { status: string } };
          rust: { preflight: { status: string; kind: string | null }; execution: { status: string } };
        };
      }>;
    };
    expect(artifact.preflight.status).toBe('completed');
    expect(artifact.preflight.rustCore.available).toBe(false);
    const byName = Object.fromEntries(artifact.targets.map((target) => [target.name, target]));
    expect(byName.envTarget.path).toMatchObject({ resolvedPath: envTarget, pathSource: 'env' });
    expect(byName.envTarget.preflight.status).toBe('available');
    expect(byName.envTarget.arms.typescript.preflight.status).toBe('available');
    expect(byName.envTarget.arms.typescript.execution.status).toBe('completed');
    expect(byName.envTarget.arms.rust.preflight).toMatchObject({ status: 'unavailable', kind: 'missing-rust-binary' });
    expect(byName.envTarget.arms.rust.execution.status).toBe('skipped');
    expect(byName.envTarget.arms.typescript.execution.diagnostics).toEqual([]);
    expect(byName.fallbackTarget.path).toMatchObject({ resolvedPath: fallbackTarget, pathSource: 'fallback' });
    expect(byName.fallbackTarget.preflight.status).toBe('available');
    expect(byName.missingTarget.preflight).toMatchObject({ status: 'unavailable', kind: 'missing-target-path' });
    expect(byName.missingTarget.arms.typescript.execution.status).toBe('skipped');
    expect(byName.missingTarget.arms.rust.execution.status).toBe('skipped');
  });

  it('records child process errors when init output exceeds the configured capture buffer', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-init-buffer-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ type: 'module' }));
    for (let i = 0; i < 200; i += 1) {
      fs.writeFileSync(path.join(source, 'src', `file-${i}.ts`), `export const value${i} = ${i};\n`);
    }
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: path.join(temp, 'missing-rust-core'),
          ZCODEGRAPH_EXPERIMENT_CHILD_MAX_BUFFER_BYTES: '128',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          typescript: {
            execution: { status: string; diagnostics: Array<{ kind: string; errorCode?: string; stdoutTail?: string; stderrTail?: string }> };
            graphAvailable: boolean;
          };
        };
      }>;
    };
    const diagnostic = artifact.targets[0].arms.typescript.execution.diagnostics[0];
    expect(artifact.targets[0].arms.typescript.execution.status).toBe('failed');
    expect(artifact.targets[0].arms.typescript.graphAvailable).toBe(false);
    expect(diagnostic).toMatchObject({ kind: 'init-process-failed', errorCode: 'ENOBUFS' });
    expect((diagnostic.stdoutTail ?? diagnostic.stderrTail ?? '').length).toBeGreaterThan(0);
  });

  it('copies isolated source slices and preserves one arm failure without losing the other arm evidence', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-execution-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.mkdirSync(path.join(source, '.zcodegraph'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(path.join(source, 'src', 'flow.ts'), 'export function alpha() { return beta(); }\nexport function beta() { return 1; }\n');
    fs.writeFileSync(path.join(source, '.zcodegraph', 'should-not-copy.txt'), 'stale index');

    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAIL_ENGINE: 'rust',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          typescript: {
            sourceCopy: { path: string; mode: string; copiedFiles: number; skipped: boolean };
            execution: { status: string; elapsedMs: number; diagnostics: Array<{ kind: string; stderrTail?: string }> };
            indexing: { status: string };
            graphAvailable: boolean;
            graphStats: Record<string, number> | null;
            command: { args: string[]; cwd: string };
          };
          rust: {
            sourceCopy: { path: string; mode: string; copiedFiles: number; skipped: boolean } | null;
            execution: { status: string };
            indexing: { status: string };
            graphAvailable: boolean;
            diagnostics: Array<{ kind: string }>;
          };
        };
      }>;
    };
    const target = artifact.targets[0];
    const tsArm = target.arms.typescript;
    const rustArm = target.arms.rust;
    expect(tsArm.sourceCopy).toMatchObject({ mode: 'js-ts-config-slice', skipped: false });
    expect(rustArm.sourceCopy).toMatchObject({ mode: 'js-ts-config-slice', skipped: false });
    expect(tsArm.sourceCopy.path).not.toBe(rustArm.sourceCopy?.path);
    expect(fs.existsSync(path.join(tsArm.sourceCopy.path, '.zcodegraph', 'should-not-copy.txt'))).toBe(false);
    expect(fs.existsSync(path.join(rustArm.sourceCopy!.path, '.zcodegraph', 'should-not-copy.txt'))).toBe(false);
    expect(tsArm.execution.status).toBe('completed');
    expect(tsArm.execution.diagnostics).toEqual([]);
    expect(tsArm.indexing.status).toBe('completed');
    expect(tsArm.graphAvailable).toBe(true);
    expect(tsArm.graphStats, JSON.stringify(tsArm.graphStats, null, 2)).toMatchObject({ fileCount: expect.any(Number) });
    expect(tsArm.graphStats!.fileCount).toBeGreaterThan(0);
    expect(tsArm.command.args).toContain('--force');
    expect(rustArm.execution.status).toBe('failed');
    expect(rustArm.indexing.status).toBe('failed');
    expect(rustArm.graphAvailable).toBe(false);
  });

  it('records graphStats parity breakdown by node and edge kind', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-graph-parity-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(path.join(source, 'src'), { recursive: true });
    fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ type: 'module' }));
    fs.writeFileSync(
      path.join(source, 'src', 'flow.ts'),
      'import { helper } from "./helper";\nexport function alpha() { return helper(); }\n',
    );
    fs.writeFileSync(path.join(source, 'src', 'helper.ts'), 'export function helper() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          typescript: { graphStats: { fileCount: number; nodeCount: number; edgeCount: number; nodeKinds: Record<string, number>; edgeKinds: Record<string, number> } };
          rust: { graphStats: { fileCount: number; nodeCount: number; edgeCount: number; nodeKinds: Record<string, number>; edgeKinds: Record<string, number> } };
        };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.arms.typescript.graphStats).toMatchObject({
      fileCount: expect.any(Number),
      nodeCount: expect.any(Number),
      edgeCount: expect.any(Number),
      nodeKinds: expect.objectContaining({ function: expect.any(Number) }),
      edgeKinds: expect.objectContaining({ contains: expect.any(Number) }),
    });
    expect(target.arms.rust.graphStats).toMatchObject({
      fileCount: expect.any(Number),
      nodeCount: expect.any(Number),
      edgeCount: expect.any(Number),
      nodeKinds: expect.objectContaining({ function: expect.any(Number) }),
      edgeKinds: expect.objectContaining({ contains: expect.any(Number) }),
    });

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('## GraphStats parity');
    expect(summary).toContain('### fixture graphStats parity');
    expect(summary).toContain('Node kind deltas');
    expect(summary).toContain('Edge kind deltas');
    expect(summary).toContain('| function |');
    expect(summary).toContain('| contains |');
  });

  it('records peak RSS for completed arms and uses it in the performance gate', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-peak-rss-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
        metrics: { thresholds: { wallTimeImprovementPct: 0, peakRssReductionPct: 0, maxOtherMetricRegressionPct: 10 } },
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES: '1',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          typescript: { execution: { peakRssBytes: number | null } };
          rust: { execution: { peakRssBytes: number | null } };
        };
        gates: { performance: { status: string; peakRssDeltaPct: number | null; diagnostics: Array<{ kind: string }> } };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.arms.typescript.execution.peakRssBytes).toEqual(expect.any(Number));
    expect(target.arms.typescript.execution.peakRssBytes).toBeGreaterThan(0);
    expect(target.arms.rust.execution.peakRssBytes).toBe(1);
    expect(target.gates.performance.peakRssDeltaPct).toEqual(expect.any(Number));
    expect(target.gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).not.toContain('missing-peak-rss');

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('peakRssDeltaPct=');
  });

  it('records a specific diagnostic when peak RSS collection is unavailable', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-missing-peak-rss-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_TYPESCRIPT_PEAK_RSS_BYTES: '0',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES: '0',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: { typescript: { execution: { peakRssBytes: number | null } }; rust: { execution: { peakRssBytes: number | null } } };
        gates: { performance: { peakRssDeltaPct: number | null; diagnostics: Array<{ kind: string; message: string }> } };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.arms.typescript.execution.peakRssBytes).toBeNull();
    expect(target.arms.rust.execution.peakRssBytes).toBeNull();
    expect(target.gates.performance.peakRssDeltaPct).toBeNull();
    expect(target.gates.performance.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'missing-peak-rss', message: 'Peak RSS was not collected for one or both arms' }),
    );
  });

  it('records Rust index profile breakdown when emitted by the CLI', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-rust-profile-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PROFILE: JSON.stringify({
            rustCore: {
              sourceScanMs: 11,
              parseExtractionMs: 22,
              sqliteWriteMs: 33,
              subprocessStartupHandoffMs: 4,
            },
            finalize: {
              frameworkPostExtractMs: 5,
              referenceResolutionMs: 44,
              dynamicDispatchSynthesisMs: 6,
              dbMaintenanceMs: 7,
            },
            typescriptFinalizationMs: 62,
          }),
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          rust: {
            execution: {
              indexProfile: {
                rustCore: { sourceScanMs: number; parseExtractionMs: number; sqliteWriteMs: number; subprocessStartupHandoffMs: number };
                finalize: { frameworkPostExtractMs: number; referenceResolutionMs: number; dynamicDispatchSynthesisMs: number; dbMaintenanceMs: number };
                typescriptFinalizationMs: number;
              };
            };
          };
        };
      }>;
    };
    const indexProfile = artifact.targets[0].arms.rust.execution.indexProfile;
    expect(indexProfile.rustCore).toMatchObject({
      sourceScanMs: 11,
      parseExtractionMs: 22,
      sqliteWriteMs: 33,
      subprocessStartupHandoffMs: 4,
    });
    expect(indexProfile.finalize).toMatchObject({
      frameworkPostExtractMs: 5,
      referenceResolutionMs: 44,
      dynamicDispatchSynthesisMs: 6,
      dbMaintenanceMs: 7,
    });
    expect(indexProfile.typescriptFinalizationMs).toBe(62);

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('## Rust index profile breakdown');
    expect(summary).toContain('| fixture | sourceScanMs | 11 |');
    expect(summary).toContain('| fixture | referenceResolutionMs | 44 |');
  });

  it('records heap profiling reports requested by the manifest', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-heap-profile-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        experimentId: 'phase-15e-heap',
        profiling: { heap: true, summaryHtml: true },
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      profiling: { heap: boolean; summaryHtml: boolean };
      targets: Array<{
        arms: {
          rust: {
            execution: {
              profiling: { heapReport: string | null; heapSummaryHtml: string | null };
            };
          };
        };
      }>;
    };
    const heapReport = artifact.targets[0].arms.rust.execution.profiling.heapReport;
    const summaryHtml = artifact.targets[0].arms.rust.execution.profiling.heapSummaryHtml;
    expect(artifact.profiling.heap).toBe(true);
    expect(artifact.profiling.summaryHtml).toBe(true);
    expect(heapReport).toContain(path.join('.workbuddy', 'profiling', 'phase-15e-heap', 'dhat-heap.json'));
    expect(fs.existsSync(heapReport!)).toBe(true);
    expect(summaryHtml).toContain(path.join('.workbuddy', 'profiling', 'phase-15e-heap', 'dhat-summary.html'));
    expect(fs.existsSync(summaryHtml!)).toBe(true);
  });

  it('records wall-time diagnostics by experiment phase', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-wall-time-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS: '60000',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        arms: {
          typescript: { execution: { timingsMs: Record<string, number> } };
          rust: { execution: { timingsMs: Record<string, number> } };
        };
        gates: { performance: { diagnostics: Array<{ kind: string; phase?: string }> } };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.arms.typescript.execution.timingsMs).toMatchObject({
      sourceCopy: expect.any(Number),
      init: expect.any(Number),
      index: expect.any(Number),
      graphStats: expect.any(Number),
      total: expect.any(Number),
    });
    expect(target.arms.rust.execution.timingsMs).toMatchObject({
      sourceCopy: expect.any(Number),
      index: expect.any(Number),
      graphStats: expect.any(Number),
      total: expect.any(Number),
    });
    expect(target.gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).toContain('wall-time-phase-dominant');
    expect(target.gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).toContain('wall-time-regression-source');

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('## Wall-time diagnostics');
    expect(summary).toContain('| fixture | typescript |');
    expect(summary).toContain('| fixture | rust |');
  });

  it('records sufficiency and performance gates independently', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-gates-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return beta(); }\nexport function beta() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
        metrics: { thresholds: { wallTimeImprovementPct: 25, peakRssReductionPct: 30, maxOtherMetricRegressionPct: 10 } },
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES: '1',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      targets: Array<{
        gates: {
          sufficiency: { status: string; regressions: string[] };
          performance: { status: string; wallTimeDeltaPct: number | null; peakRssDeltaPct: number | null; diagnostics: Array<{ kind: string }> };
        };
      }>;
    };
    const gates = artifact.targets[0].gates;
    expect(gates.sufficiency).toMatchObject({ status: 'passed', regressions: [] });
    expect(gates.performance.status).toBe('passed');
    expect(gates.performance.wallTimeDeltaPct).toBeLessThan(0);
    expect(gates.performance.peakRssDeltaPct).toEqual(expect.any(Number));
    expect(gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).not.toContain('missing-peak-rss');
  });

  it('classifies completed required arms with unmet performance gates honestly', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-performance-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return beta(); }\nexport function beta() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
        metrics: { thresholds: { wallTimeImprovementPct: 25, peakRssReductionPct: 30, maxOtherMetricRegressionPct: 10 } },
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS: '60000',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      decisionReadiness: { sufficiencyPassed: boolean; performancePassed: boolean; requiredTargetsPassed: boolean; rolloutReadinessClaimed: boolean };
      targets: Array<{
        classification: string;
        arms: { typescript: { execution: { status: string } }; rust: { execution: { status: string } } };
        gates: { sufficiency: { status: string }; performance: { status: string; wallTimeDeltaPct: number | null; diagnostics: Array<{ kind: string }> } };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.arms.typescript.execution.status).toBe('completed');
    expect(target.arms.rust.execution.status).toBe('completed');
    expect(target.gates.sufficiency.status).toBe('passed');
    expect(target.gates.performance.status).toBe('unavailable');
    expect(target.gates.performance.wallTimeDeltaPct).toBeGreaterThan(0);
    expect(target.gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).toContain('wall-time-phase-dominant');
    expect(target.classification).toBe('target-failed-performance-gate-unmet');
    expect(artifact.classification).toBe('failed-required-performance-gate-unmet');
    expect(artifact.decisionReadiness).toMatchObject({
      sufficiencyPassed: true,
      performancePassed: false,
      requiredTargetsPassed: false,
      rolloutReadinessClaimed: false,
    });

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('Classification: failed-required-performance-gate-unmet');
    expect(summary).toContain('fixture: sufficiency=passed; performance=unavailable');
    expect(summary).toContain('Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.');
  });

  it('classifies stress-only experiments without pretending a required arm is unavailable', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-stress-only-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return beta(); }\nexport function beta() { return 1; }\n');
    const rustCore = path.join(temp, 'fake-rust-core');
    fs.writeFileSync(rustCore, 'not a real rust core');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'stressFixture',
            pathFallback: source,
            targetClass: 'stress',
            requiredForDecision: false,
            requiredAfterPrdCompletion: true,
            allowDirty: true,
            promptIds: ['STRESS-1'],
          },
        ],
        metrics: { thresholds: { wallTimeImprovementPct: 25, peakRssReductionPct: 30, maxOtherMetricRegressionPct: 10 } },
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS: '1',
          ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS: '60000',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      decisionReadiness: { sufficiencyPassed: boolean; performancePassed: boolean; requiredTargetsPassed: boolean; rolloutReadinessClaimed: boolean };
      targets: Array<{
        requiredForDecision: boolean;
        classification: string;
        arms: { typescript: { execution: { status: string } }; rust: { execution: { status: string } } };
        gates: { sufficiency: { status: string }; performance: { status: string } };
      }>;
    };
    const target = artifact.targets[0];
    expect(target.requiredForDecision).toBe(false);
    expect(target.arms.typescript.execution.status).toBe('completed');
    expect(target.arms.rust.execution.status).toBe('completed');
    expect(target.gates.sufficiency.status).toBe('passed');
    expect(target.gates.performance.status).toBe('unavailable');
    expect(target.classification).toBe('target-failed-performance-gate-unmet');
    expect(artifact.classification).toBe('stress-only-targets-completed-with-nonblocking-failures');
    expect(artifact.classification).not.toBe('failed-required-arm-unavailable');
    expect(artifact.decisionReadiness).toMatchObject({
      sufficiencyPassed: false,
      performancePassed: false,
      requiredTargetsPassed: false,
      rolloutReadinessClaimed: false,
    });

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('Classification: stress-only-targets-completed-with-nonblocking-failures');
    expect(summary).toContain('| stressFixture | stress | no | available | completed | completed | target-failed-performance-gate-unmet |');
    expect(summary).toContain('No required targets are present; stress targets are diagnostic and do not claim rollout readiness.');
  });

  it('classifies required failures and returns 2 only when fail-on-required-gate-failure is requested', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-classification-');
    tempDirs.push(temp);
    const source = path.join(temp, 'source');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'flow.ts'), 'export function alpha() { return 1; }\n');
    const manifest = path.join(temp, 'experiment.json');
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    writeJson(
      manifest,
      canonicalManifest({
        targets: [
          {
            name: 'fixture',
            pathFallback: source,
            targetClass: 'required',
            requiredForDecision: true,
            allowDirty: true,
            promptIds: ['FX-1'],
          },
        ],
      }),
    );

    const baseArgs = [SCRIPT, '--experiment', manifest, '--out', out, '--summary-out', summaryOut];
    const unavailableArmEnv = {
      ...process.env,
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(temp, 'missing-rust-core'),
    };
    const defaultResult = spawnSync(process.execPath, baseArgs, { cwd: REPO_ROOT, encoding: 'utf-8', env: unavailableArmEnv });
    expect(defaultResult.status, `stdout:\n${defaultResult.stdout}\nstderr:\n${defaultResult.stderr}`).toBe(0);
    const defaultArtifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      classification: string;
      decisionReadiness: { requiredTargetsPassed: boolean; rolloutReadinessClaimed: boolean };
      targets: Array<{ classification: string }>;
    };
    expect(defaultArtifact.targets[0].classification).toBe('target-failed-arm-unavailable');
    expect(defaultArtifact.classification).toBe('failed-required-arm-unavailable');
    expect(defaultArtifact.decisionReadiness.requiredTargetsPassed).toBe(false);
    expect(defaultArtifact.decisionReadiness.rolloutReadinessClaimed).toBe(false);

    const gatedResult = spawnSync(process.execPath, [...baseArgs, '--fail-on-required-gate-failure'], { cwd: REPO_ROOT, encoding: 'utf-8', env: unavailableArmEnv });
    expect(gatedResult.status).toBe(2);
  });

  it('accepts the canonical manifest and writes a complete decision summary draft', () => {
    const temp = makeTempDir('zcodegraph-rust-experiment-summary-');
    tempDirs.push(temp);
    const out = path.join(temp, 'artifact.json');
    const summaryOut = path.join(temp, 'summary.md');
    const canonical = path.join(REPO_ROOT, 'docs', 'benchmarks', 'rust-indexing-core-phase-14.experiment.json');

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--experiment', canonical, '--out', out, '--summary-out', summaryOut],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_CORPUS_EXCALIDRAW: path.join(temp, 'missing-excalidraw'),
          ZCODEGRAPH_CORPUS_VSCODE: path.join(temp, 'missing-vscode'),
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      experimentId: string;
      targets: Array<{ name: string }>;
      decisionReadiness: { rolloutReadinessClaimed: boolean };
    };
    expect(artifact.experimentId).toBe('rust-indexing-core-phase-14');
    expect(artifact.targets.map((target) => target.name)).toEqual(['zcodegraph', 'excalidraw', 'vscode']);
    expect(artifact.decisionReadiness.rolloutReadinessClaimed).toBe(false);

    const summary = fs.readFileSync(summaryOut, 'utf-8');
    expect(summary).toContain('# Rust Indexing Core Phase 14 Decision Summary Draft');
    expect(summary).toContain('## Target matrix');
    expect(summary).toContain('## Preflight summary');
    expect(summary).toContain('## Gates');
    expect(summary).toContain('## Rollout recommendation draft');
    expect(summary).toContain('Rust default rollout readiness is not claimed by this generated draft.');
  });
});
