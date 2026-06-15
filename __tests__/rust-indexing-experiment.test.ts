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
    expect(gates.performance.peakRssDeltaPct).toBeNull();
    expect(gates.performance.diagnostics.map((diagnostic) => diagnostic.kind)).toContain('missing-peak-rss');
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
    const defaultResult = spawnSync(process.execPath, baseArgs, { cwd: REPO_ROOT, encoding: 'utf-8' });
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

    const gatedResult = spawnSync(process.execPath, [...baseArgs, '--fail-on-required-gate-failure'], { cwd: REPO_ROOT, encoding: 'utf-8' });
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
