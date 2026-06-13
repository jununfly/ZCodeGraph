import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const currentTarget = `${process.platform}-${process.arch}`;
const isWindows = process.platform === 'win32';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-pack-npm-rust-core-'));
}

function writeExecutable(file: string, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

function createScriptRoot(): string {
  const root = tempRoot();
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'scripts', 'pack-npm.sh'), path.join(root, 'scripts', 'pack-npm.sh'));
  fs.copyFileSync(path.join(repoRoot, 'scripts', 'npm-shim.js'), path.join(root, 'scripts', 'npm-shim.js'));
  fs.copyFileSync(path.join(repoRoot, 'scripts', 'npm-sdk.js'), path.join(root, 'scripts', 'npm-sdk.js'));
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@jununfly/zcodegraph', version: '9.9.9-test' }) + '\n');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'index.d.ts'), 'export {};\n');
  return root;
}

function createBundle(root: string, target: string): void {
  const work = path.join(root, 'bundle-work', target);
  const top = path.join(work, `zcodegraph-${target}`);
  const win = target.startsWith('win32-');
  const coreName = win ? 'zcodegraph-core.exe' : 'zcodegraph-core';

  fs.mkdirSync(path.join(top, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(top, 'lib', 'dist', 'bin'), { recursive: true });

  if (win) {
    fs.writeFileSync(path.join(top, 'node.exe'), 'fake node exe');
    fs.writeFileSync(path.join(top, 'bin', 'zcodegraph.cmd'), '@echo off\r\n');
    fs.writeFileSync(path.join(top, 'bin', coreName), 'fake rust exe');
  } else {
    writeExecutable(
      path.join(top, 'node'),
      `#!/bin/sh
if [ "$1" = "--liftoff-only" ]; then shift; fi
exec "${process.execPath}" "$@"
`,
    );
    writeExecutable(path.join(top, 'bin', 'zcodegraph'), '#!/bin/sh\nexec "$(dirname "$0")/../node" --liftoff-only "$(dirname "$0")/../lib/dist/bin/zcodegraph.js" "$@"\n');
    writeExecutable(
      path.join(top, 'bin', coreName),
      `#!/bin/sh
echo rust > .npm-packaged-rust-core-invoked
exit 0
`,
    );
  }

  fs.writeFileSync(
    path.join(top, 'lib', 'dist', 'bin', 'zcodegraph.js'),
    `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const args = process.argv.slice(2);
if (args.includes('--engine') && args[args.indexOf('--engine') + 1] === 'rust') {
  const exe = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
  const core = path.resolve(__dirname, '..', '..', '..', 'bin', exe);
  if (!fs.existsSync(core)) {
    process.stderr.write('Rust index engine is unavailable: no Rust core binary was found\\n');
    process.exit(1);
  }
  const result = spawnSync(core, ['index'], { cwd: process.cwd(), encoding: 'utf8' });
  process.exit(result.status || 0);
}
fs.writeFileSync('.npm-packaged-default-index-invoked', '1\\n');
`,
  );

  const release = path.join(root, 'release');
  fs.mkdirSync(release, { recursive: true });
  if (win) {
    execFileSync('zip', ['-rqX', path.join(release, `zcodegraph-${target}.zip`), `zcodegraph-${target}`], {
      cwd: work,
    });
  } else {
    execFileSync('tar', ['--no-xattrs', '-czf', path.join(release, `zcodegraph-${target}.tar.gz`), '-C', work, `zcodegraph-${target}`]);
  }
}

function createAllBundles(root: string): void {
  for (const target of ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64', 'win32-arm64']) {
    createBundle(root, target);
  }
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function extractPackage(tgz: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  execFileSync('tar', ['-xzf', tgz, '-C', dest, '--strip-components=1']);
}

describe('pack-npm.sh Rust core packaging', () => {
  it('preserves Rust core binaries in platform packages while keeping the main package thin', () => {
    const root = createScriptRoot();
    try {
      createAllBundles(root);
      execFileSync('bash', ['scripts/pack-npm.sh', '9.9.9-test'], { cwd: root, stdio: 'pipe' });

      const npmRoot = path.join(root, 'release', 'npm');
      const expected = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64', 'win32-arm64'];
      for (const target of expected) {
        const pkgDir = path.join(npmRoot, `zcodegraph-${target}`);
        const win = target.startsWith('win32-');
        const core = path.join(pkgDir, 'bin', win ? 'zcodegraph-core.exe' : 'zcodegraph-core');
        expect(fs.existsSync(core)).toBe(true);
        expect(readJson(path.join(pkgDir, 'package.json')).files).toContain('bin');
      }

      const mainDir = path.join(npmRoot, 'main');
      const mainPkg = readJson(path.join(mainDir, 'package.json'));
      expect(mainPkg.files).not.toContain('bin');
      expect(fs.existsSync(path.join(mainDir, 'bin', 'zcodegraph-core'))).toBe(false);
      expect(Object.keys(mainPkg.optionalDependencies).sort()).toEqual(
        expected.map((target) => `@jununfly/zcodegraph-${target}`).sort(),
      );
      expect(JSON.stringify(mainPkg)).not.toContain('postinstall');
      expect(JSON.stringify(mainPkg)).not.toContain('cargo build');
      expect(JSON.stringify(mainPkg)).not.toContain('rustup');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it.runIf(!isWindows)('packed npm packages run default and explicit Rust indexing through the installed optional dependency', () => {
    const root = createScriptRoot();
    try {
      createAllBundles(root);
      execFileSync('bash', ['scripts/pack-npm.sh', '9.9.9-test'], { cwd: root, stdio: 'pipe' });

      const npmRoot = path.join(root, 'release', 'npm');
      const npmEnv = { ...process.env, npm_config_cache: path.join(root, '.npm-cache') };
      const mainTgz = execFileSync('npm', ['pack', path.join(npmRoot, 'main'), '--pack-destination', root], {
        cwd: root,
        env: npmEnv,
        encoding: 'utf8',
      }).trim().split('\n').pop()!;
      const platformTgz = execFileSync('npm', ['pack', path.join(npmRoot, `zcodegraph-${currentTarget}`), '--pack-destination', root], {
        cwd: root,
        env: npmEnv,
        encoding: 'utf8',
      }).trim().split('\n').pop()!;

      const installRoot = path.join(root, 'installed');
      extractPackage(path.join(root, mainTgz), path.join(installRoot, 'node_modules', '@jununfly', 'zcodegraph'));
      extractPackage(path.join(root, platformTgz), path.join(installRoot, 'node_modules', '@jununfly', `zcodegraph-${currentTarget}`));

      const shim = path.join(installRoot, 'node_modules', '@jununfly', 'zcodegraph', 'npm-shim.js');
      const project = path.join(root, 'project');
      fs.mkdirSync(project);

      let result = spawnSync(process.execPath, [shim, 'index', '--quiet'], {
        cwd: project,
        env: { ...process.env, CODEGRAPH_NO_DOWNLOAD: '1' },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(project, '.npm-packaged-default-index-invoked'))).toBe(true);
      expect(fs.existsSync(path.join(project, '.npm-packaged-rust-core-invoked'))).toBe(false);

      result = spawnSync(process.execPath, [shim, 'index', '--engine', 'rust', '--quiet'], {
        cwd: project,
        env: { ...process.env, CODEGRAPH_NO_DOWNLOAD: '1' },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(project, '.npm-packaged-rust-core-invoked'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
