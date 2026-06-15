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
if (args.includes('--engine') && args[args.indexOf('--engine') + 1] === 'rust') {
  const core = path.resolve(__dirname, '..', '..', '..', 'bin', process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core');
  if (!fs.existsSync(core)) {
    process.stderr.write('Rust index engine is unavailable: no Rust core binary was found\\nnext action: install a package with bin/zcodegraph-core\\n');
    process.exit(1);
  }
  const result = spawnSync(core, ['index'], { cwd: process.cwd(), encoding: 'utf8' });
  process.exit(result.status || 0);
}
fs.writeFileSync(${JSON.stringify(defaultMarker)}, '1\\n');
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
      defaultTypescriptIndexWorks: true,
      explicitRustIndexWorks: true,
      missingRustBinaryFailsSafely: true,
    });
    expect(summary.npm).toMatchObject({
      defaultTypescriptIndexWorks: true,
      explicitRustIndexWorks: true,
      optionalPlatformPackageSuppliesRustCore: true,
      missingOptionalPackageFailsClearly: true,
      hasPostinstall: false,
      npxLikeSmokeWorks: true,
    });
  });
});
