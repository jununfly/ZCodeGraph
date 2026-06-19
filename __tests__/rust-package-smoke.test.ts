import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-package-smoke.mjs');
const currentTarget = `${process.platform}-${process.arch}`;

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-package-smoke-'));
}

function writeExecutable(file: string, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

function createUnixBundle(root: string): string {
  const bundle = path.join(root, 'zcodegraph-linux-x64');
  fs.mkdirSync(path.join(bundle, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(bundle, 'lib', 'dist', 'bin'), { recursive: true });
  writeExecutable(path.join(bundle, 'node'), `#!/bin/sh
if [ "$1" = "--liftoff-only" ]; then shift; fi
exec "${process.execPath}" "$@"
`);
  writeExecutable(path.join(bundle, 'bin', 'zcodegraph'), '#!/bin/sh\nDIR="$(cd "$(dirname "$0")/.." && pwd)"\nexec "$DIR/node" --liftoff-only "$DIR/lib/dist/bin/zcodegraph.js" "$@"\n');
  writeExecutable(path.join(bundle, 'bin', 'zcodegraph-core'), '#!/bin/sh\necho rust > .bundle-rust-core-invoked\n');
  fs.writeFileSync(path.join(bundle, 'lib', 'dist', 'bin', 'zcodegraph.js'), fakeCliSource('.bundle-default-index-invoked', '.bundle-rust-core-invoked'));
  return bundle;
}

function fakeCliSource(defaultMarker: string, _rustMarker: string): string {
  return `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const args = process.argv.slice(2);
if (process.env.ZCODEGRAPH_INDEX_ENGINE) {
  process.stderr.write('ZCODEGRAPH_INDEX_ENGINE is no longer supported for selecting the index engine. Use: zcodegraph index --engine typescript\\n');
  process.exit(1);
}
function projectArg(command) {
  const candidate = args[1];
  return candidate && !candidate.startsWith('-') ? candidate : process.cwd();
}
function ensureIndex(project, degraded) {
  fs.mkdirSync(path.join(project, '.zcodegraph'), { recursive: true });
  fs.writeFileSync(path.join(project, '.zcodegraph', 'status.json'), JSON.stringify({
    index: {
      engine: 'rust-hybrid',
      hybrid: {
        fallbackState: degraded ? 'degraded' : 'healthy',
        fallbackFileCount: degraded ? 1 : 0,
        fallbackReasonTaxonomy: degraded ? { 'language-level-typescript-fallback': 1 } : {}
      }
    }
  }));
  fs.mkdirSync(path.join(project, '.zcodegraph', 'diagnostics'), { recursive: true });
  fs.writeFileSync(path.join(project, '.zcodegraph', 'diagnostics', 'last-run.json'), '{}');
}
function invokeRustCore() {
  const core = path.resolve(__dirname, '..', '..', '..', 'bin', process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core');
  if (!fs.existsSync(core)) {
    const project = projectArg(args[0] || 'index');
    fs.mkdirSync(path.join(project, '.zcodegraph', 'diagnostics'), { recursive: true });
    fs.writeFileSync(path.join(project, '.zcodegraph', 'diagnostics', 'last-failure.json'), '{}');
    process.stderr.write('Rust index engine is unavailable: no Rust core binary was found\\nnext action: install a package with bin/zcodegraph-core\\n');
    process.exit(1);
  }
  const result = spawnSync(core, ['index'], { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status) process.exit(result.status);
}
if (args[0] === 'init') {
  const project = projectArg('init');
  invokeRustCore();
  ensureIndex(project, fs.existsSync(path.join(project, 'worker.py')));
  process.exit(0);
}
if (args[0] === 'index') {
  const project = projectArg('index');
  invokeRustCore();
  ensureIndex(project, fs.existsSync(path.join(project, 'worker.py')));
  fs.writeFileSync(${JSON.stringify(defaultMarker)}, '1\\n');
  process.exit(0);
}
if (args[0] === 'status' && args.includes('--json')) {
  const project = projectArg('status');
  process.stdout.write(fs.readFileSync(path.join(project, '.zcodegraph', 'status.json'), 'utf8') + '\\n');
  process.exit(0);
}
if (args[0] === 'doctor') {
  const project = projectArg('doctor');
  const source = args.includes('--last-failure') ? 'last-failure' : 'last-run';
  const bundle = path.join(project, '.zcodegraph', 'diagnostics', 'bundles', source);
  fs.mkdirSync(bundle, { recursive: true });
  process.stdout.write(path.relative(project, bundle).split(path.sep).join('/') + '\\n');
  process.exit(0);
}
if (args.includes('--version')) {
  process.stdout.write('9.9.9-smoke\\n');
  process.exit(0);
}
process.exit(0);
`;
}

function createPackedPackageLayout(root: string): string {
  const npm = path.join(root, 'npm');
  const main = path.join(npm, 'main');
  const platform = path.join(npm, `zcodegraph-${currentTarget}`);
  fs.mkdirSync(main, { recursive: true });
  fs.mkdirSync(path.join(platform, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(platform, 'lib', 'dist', 'bin'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, 'scripts', 'npm-shim.js'), path.join(main, 'npm-shim.js'));
  fs.writeFileSync(path.join(main, 'package.json'), JSON.stringify({
    name: '@jununfly/zcodegraph',
    version: '9.9.9-smoke',
    bin: { zcodegraph: 'npm-shim.js' },
    optionalDependencies: { [`@jununfly/zcodegraph-${currentTarget}`]: '9.9.9-smoke' },
  }, null, 2));
  fs.writeFileSync(path.join(platform, 'package.json'), JSON.stringify({
    name: `@jununfly/zcodegraph-${currentTarget}`,
    version: '9.9.9-smoke',
    files: ['node', 'lib', 'bin'],
  }, null, 2));
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(platform, 'node.exe'), 'fake');
    fs.writeFileSync(path.join(platform, 'bin', 'zcodegraph.cmd'), '@echo off\r\n');
    fs.writeFileSync(path.join(platform, 'bin', 'zcodegraph-core.exe'), 'fake');
  } else {
    writeExecutable(path.join(platform, 'node'), `#!/bin/sh
if [ "$1" = "--liftoff-only" ]; then shift; fi
exec "${process.execPath}" "$@"
`);
    writeExecutable(path.join(platform, 'bin', 'zcodegraph'), '#!/bin/sh\nDIR="$(cd "$(dirname "$0")/.." && pwd)"\nexec "$DIR/node" --liftoff-only "$DIR/lib/dist/bin/zcodegraph.js" "$@"\n');
    writeExecutable(path.join(platform, 'bin', 'zcodegraph-core'), '#!/bin/sh\necho rust > .npm-rust-core-invoked\n');
  }
  fs.writeFileSync(path.join(platform, 'lib', 'dist', 'bin', 'zcodegraph.js'), fakeCliSource('.npm-default-index-invoked', '.npm-rust-core-invoked'));
  return npm;
}

describe.skipIf(process.platform === 'win32')('local Rust package smoke primitive', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('documents local bundle and packed npm smoke usage', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/rust-package-smoke.mjs');
    expect(result.stdout).toContain('--bundle <dir>');
    expect(result.stdout).toContain('--npm-root <dir>');
    expect(result.stdout).toContain('--out <dir>');
  });

  it('verifies staged bundle and packed npm package behavior without publishing', () => {
    const root = tempRoot();
    const out = path.join(root, 'out');
    tempDirs.push(root);
    const bundle = createUnixBundle(root);
    const npmRoot = createPackedPackageLayout(root);

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bundle', bundle, '--npm-root', npmRoot, '--out', out],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, CODEGRAPH_NO_DOWNLOAD: '1' },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const summary = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf-8'));
    expect(summary.publishAttempted).toBe(false);
    expect(summary.registryContactAllowed).toBe(false);
    expect(summary.gateFailures).toEqual([]);
    expect(summary.bundle).toMatchObject({
      launcherPathPreserved: true,
      initRustHybridWorks: true,
      defaultRustHybridIndexWorks: true,
      explicitRustHybridIndexWorks: true,
      staleEnvEngineSelectionFailsClearly: true,
      statusShowsHybridMetadata: true,
      degradedDoctorLastRunWorks: true,
      missingRustBinaryFailsSafely: true,
      failureDoctorLastFailureWorks: true,
    });
    expect(summary.npm).toMatchObject({
      initRustHybridWorks: true,
      defaultRustHybridIndexWorks: true,
      explicitRustHybridIndexWorks: true,
      staleEnvEngineSelectionFailsClearly: true,
      statusShowsHybridMetadata: true,
      degradedDoctorLastRunWorks: true,
      failureDoctorLastFailureWorks: true,
      optionalPlatformPackageSuppliesRustCore: true,
      missingOptionalPackageFailsClearly: true,
      hasPostinstall: false,
      npxLikeSmokeWorks: true,
    });
    expect(summary.gates.map((gate: { name: string }) => gate.name)).toContain('bundle-default-rust-hybrid');
    expect(summary.gates.map((gate: { name: string }) => gate.name)).toContain('bundle-env-engine-selection-fails');
    expect(summary.gates.map((gate: { name: string }) => gate.name)).toContain('npm-doctor-last-failure');
    expect(summary.gates.map((gate: { name: string }) => gate.name)).toContain('npm-env-engine-selection-fails');
    expect(summary.gates.map((gate: { name: string }) => gate.name)).not.toContain('bundle-default-typescript');
    expect(summary.gates.map((gate: { name: string }) => gate.name)).not.toContain('npm-default-typescript');
  });
});
