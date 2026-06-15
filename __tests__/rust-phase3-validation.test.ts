import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-phase3-validation.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');
const SUFFICIENCY_SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-sufficiency-guardrail.mjs');

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFakePrimitive(dir: string, name: string, exitCode = 0): string {
  const script = path.join(dir, `${name}.mjs`);
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const payload = {',
      `  primitive: ${JSON.stringify(name)},`,
      '  argv: process.argv.slice(2),',
      '  generatedAt: "2026-06-13T00:00:00.000Z",',
      '  toolchain: { node: process.version },',
      '  results: [],',
      '  gateFailures: [],',
      '  regressions: [],',
      '};',
      'process.stdout.write(JSON.stringify(payload, null, 2));',
      `process.exit(${exitCode});`,
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeFakeProfilePrimitive(dir: string): string {
  const script = path.join(dir, 'profile.mjs');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const payload = {',
      '  primitive: "profile",',
      '  generatedAt: "2026-06-13T00:00:00.000Z",',
      '  toolchain: { node: process.version, platform: process.platform, arch: process.arch },',
      '  results: [{',
      '    name: "zcodegraph",',
      '    engines: {',
      '      typescript: { wallMs: 10, peakRssBytes: 1000, rssUnavailableReason: null },',
      '      rust: { wallMs: 12, peakRssBytes: null, rssUnavailableReason: "process ended before RSS sample" }',
      '    },',
      '    finalizationSubphases: { frameworkPostExtractMs: 1, referenceResolutionMs: 2, dynamicDispatchSynthesisMs: 3, dbMaintenanceMs: 4 }',
      '  }],',
      '  gateFailures: [],',
      '  regressions: [],',
      '};',
      'process.stdout.write(JSON.stringify(payload, null, 2));',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeFakeMatrixPrimitive(dir: string, exitCode = 0): string {
  const script = path.join(dir, 'failure-matrix.cjs');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const path = require("path");',
      'const outIndex = process.argv.indexOf("--out");',
      'const out = outIndex >= 0 ? process.argv[outIndex + 1] : null;',
      'const payload = {',
      '  generatedAt: "2026-06-13T00:00:00.000Z",',
      '  matrix: ["missing-binary"],',
      '  cases: [{ id: "missing-binary", passed: true }],',
      '  gateFailures: [],',
      '};',
      'if (out) {',
      '  fs.mkdirSync(out, { recursive: true });',
      '  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(payload, null, 2));',
      '}',
      'process.stdout.write(JSON.stringify(payload, null, 2));',
      `process.exit(${exitCode});`,
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeFakePackageSmokePrimitive(dir: string, exitCode = 0): string {
  const script = path.join(dir, 'package-smoke.cjs');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const path = require("path");',
      'const outIndex = process.argv.indexOf("--out");',
      'const out = outIndex >= 0 ? process.argv[outIndex + 1] : null;',
      'const payload = {',
      '  generatedAt: "2026-06-13T00:00:00.000Z",',
      '  publishAttempted: false,',
      '  registryContactAllowed: false,',
      '  bundle: { explicitRustIndexWorks: true },',
      '  npm: { explicitRustIndexWorks: true, hasPostinstall: false },',
      '  gates: [{ name: "package-smoke", passed: true }],',
      '  gateFailures: [],',
      '};',
      'if (out) {',
      '  fs.mkdirSync(out, { recursive: true });',
      '  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(payload, null, 2));',
      '}',
      'process.stdout.write(JSON.stringify(payload, null, 2));',
      `process.exit(${exitCode});`,
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeRepoFixture(root: string, name: string): string {
  const repo = path.join(root, name);
  fs.mkdirSync(repo, { recursive: true });
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name }, null, 2));
  fs.writeFileSync(path.join(repo, 'index.ts'), `export const ${name.replace(/[^a-z]/g, '') || 'repo'} = 1;\n`);
  return repo;
}

describe('Phase 3 Rust validation harness', () => {
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

  it('documents the single-command interface in --help', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/rust-phase3-validation.mjs');
    expect(result.stdout).toContain('--repo zcodegraph=<path>');
    expect(result.stdout).toContain('--repo excalidraw=<path>');
    expect(result.stdout).toContain('--repo zustand=<path>');
    expect(result.stdout).toContain('--out <dir>');
  });

  it('keeps the sufficiency primitive independently runnable for all Phase 3 repos', () => {
    const result = spawnSync(process.execPath, [SUFFICIENCY_SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Names with built-in prompts: zcodegraph, excalidraw, zustand');
  });

  it('requires all pinned Phase 3 validation repos and an output directory', () => {
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--repo', 'zcodegraph=.'],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing required --out <dir>');
    expect(result.stderr).toContain('Missing required repos: excalidraw, zustand');
  });

  it('delegates primitives, preserves raw artifacts, and writes summaries', () => {
    const temp = makeTempDir('zcodegraph-phase3-validation-');
    const out = makeTempDir('zcodegraph-phase3-validation-out-');
    tempDirs.push(temp, out);

    const repos = {
      zcodegraph: writeRepoFixture(temp, 'zcodegraph'),
      excalidraw: writeRepoFixture(temp, 'excalidraw'),
      zustand: writeRepoFixture(temp, 'zustand'),
    };
    const binDir = path.join(temp, 'bin');
    fs.mkdirSync(binDir);

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--repo', `zcodegraph=${repos.zcodegraph}`,
        '--repo', `excalidraw=${repos.excalidraw}`,
        '--repo', `zustand=${repos.zustand}`,
        '--out', out,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ZCODEGRAPH_PHASE3_BENCHMARK_SCRIPT: writeFakePrimitive(binDir, 'benchmark'),
          ZCODEGRAPH_PHASE3_PROFILE_SCRIPT: writeFakeProfilePrimitive(binDir),
          ZCODEGRAPH_PHASE3_SUFFICIENCY_SCRIPT: writeFakePrimitive(binDir, 'sufficiency'),
          ZCODEGRAPH_PHASE3_FAILURE_MATRIX_SCRIPT: writeFakeMatrixPrimitive(binDir),
          ZCODEGRAPH_PHASE3_PACKAGE_SMOKE_SCRIPT: writeFakePackageSmokePrimitive(binDir),
          ZCODEGRAPH_PHASE3_BUNDLE_DIR: path.join(temp, 'bundle'),
          ZCODEGRAPH_PHASE3_NPM_ROOT: path.join(temp, 'npm'),
          ZCODEGRAPH_PHASE3_SKIP_SMOKE: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const summaryJson = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf-8'));
    const summaryMd = fs.readFileSync(path.join(out, 'summary.md'), 'utf-8');

    expect(summaryJson.repos.map((repo: { name: string }) => repo.name)).toEqual([
      'zcodegraph',
      'excalidraw',
      'zustand',
    ]);
    expect(summaryJson.gates.every((gate: { passed: boolean }) => gate.passed)).toBe(true);
    expect(summaryJson.artifacts.benchmark.stdout).toBe('benchmark/stdout.json');
    expect(summaryJson.artifacts.profile.stdout).toBe('profile/stdout.json');
    expect(summaryJson.profileRssEvidence).toEqual([
      {
        name: 'zcodegraph',
        typescript: { peakRssBytes: 1000, rssUnavailableReason: null },
        rust: { peakRssBytes: null, rssUnavailableReason: 'process ended before RSS sample' },
      },
    ]);
    expect(summaryJson.artifacts.sufficiency.stdout).toBe('sufficiency/stdout.json');
    expect(summaryJson.artifacts.failureSafetyMatrix.stdout).toBe('failure-safety-matrix/stdout.json');
    expect(summaryJson.artifacts.packageSmoke.stdout).toBe('package-smoke/stdout.json');
    expect(summaryJson.failureSafetyMatrix.cases).toContainEqual(expect.objectContaining({
      id: 'missing-binary',
      passed: true,
    }));
    expect(summaryJson.packageSmoke.publishAttempted).toBe(false);
    expect(summaryJson.packageSmoke.registryContactAllowed).toBe(false);
    expect(summaryJson.phase4Readiness).toEqual({
      packageSmokePassed: true,
      failureSafetyPassed: true,
      diagnosticsPassed: true,
      defaultTypescriptSmokePassed: true,
      rustSmokePassed: true,
      ciArtifactContractCovered: true,
      artifacts: {
        packageSmoke: summaryJson.artifacts.packageSmoke,
        failureSafetyMatrix: summaryJson.artifacts.failureSafetyMatrix,
        diagnostics: summaryJson.artifacts.diagnostics,
        defaultTypescriptSmoke: summaryJson.artifacts.defaultTypescriptSmoke,
        rustSmoke: summaryJson.artifacts.rustSmoke,
      },
    });
    expect(summaryJson.diagnostics.statusJson.initialized).toBe(true);
    expect(summaryJson.diagnostics.statusJson.rust.core.discoverySource).toBeTypeOf('string');
    expect(summaryMd).toContain('# Rust Indexing Core Phase 3 Validation Summary');
    expect(summaryMd).toContain('| benchmark | pass |');
    expect(summaryMd).toContain('## Phase 4 Readiness');
    expect(summaryMd).toContain('| package smoke | pass |');
    expect(summaryMd).toContain('| failure safety | pass |');
    expect(summaryMd).toContain('| diagnostics | pass |');
    expect(fs.existsSync(path.join(out, 'benchmark', 'stdout.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'profile', 'stdout.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'sufficiency', 'stdout.json'))).toBe(true);
  });

  it('exits non-zero and records failure when a delegated primitive fails', () => {
    const temp = makeTempDir('zcodegraph-phase3-validation-fail-');
    const out = makeTempDir('zcodegraph-phase3-validation-fail-out-');
    tempDirs.push(temp, out);

    const repos = {
      zcodegraph: writeRepoFixture(temp, 'zcodegraph'),
      excalidraw: writeRepoFixture(temp, 'excalidraw'),
      zustand: writeRepoFixture(temp, 'zustand'),
    };
    const binDir = path.join(temp, 'bin');
    fs.mkdirSync(binDir);

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--repo', `zcodegraph=${repos.zcodegraph}`,
        '--repo', `excalidraw=${repos.excalidraw}`,
        '--repo', `zustand=${repos.zustand}`,
        '--out', out,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ZCODEGRAPH_PHASE3_BENCHMARK_SCRIPT: writeFakePrimitive(binDir, 'benchmark', 2),
          ZCODEGRAPH_PHASE3_PROFILE_SCRIPT: writeFakePrimitive(binDir, 'profile'),
          ZCODEGRAPH_PHASE3_SUFFICIENCY_SCRIPT: writeFakePrimitive(binDir, 'sufficiency'),
          ZCODEGRAPH_PHASE3_FAILURE_MATRIX_SCRIPT: writeFakeMatrixPrimitive(binDir),
          ZCODEGRAPH_PHASE3_PACKAGE_SMOKE_SCRIPT: writeFakePackageSmokePrimitive(binDir),
          ZCODEGRAPH_PHASE3_BUNDLE_DIR: path.join(temp, 'bundle'),
          ZCODEGRAPH_PHASE3_NPM_ROOT: path.join(temp, 'npm'),
          ZCODEGRAPH_PHASE3_SKIP_SMOKE: '1',
          ZCODEGRAPH_PHASE3_SKIP_DIAGNOSTICS: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    const summaryJson = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf-8'));
    expect(summaryJson.gates).toContainEqual(expect.objectContaining({
      name: 'benchmark',
      passed: false,
    }));
    expect(result.stderr).toContain('Phase 3 validation failed');
  });
});
