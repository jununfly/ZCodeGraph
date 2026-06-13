import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'build-bundle.sh');
const nodePath = process.execPath;

function tempDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-${label}-`));
}

function writeExecutable(file: string, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

function writeFakeTools(dir: string): string {
  const bin = path.join(dir, 'fake-bin');
  fs.mkdirSync(bin, { recursive: true });

  writeExecutable(
    path.join(bin, 'npm'),
    `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
if (args[0] === 'run' && args[1] === 'build') {
  const dist = path.join(process.cwd(), 'dist');
  fs.mkdirSync(path.join(dist, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.js'), '');
  fs.writeFileSync(path.join(dist, 'index.d.ts'), '');
fs.writeFileSync(path.join(dist, 'bin', 'zcodegraph.js'), \`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const args = process.argv.slice(2);
if (args.includes('--engine') && args[args.indexOf('--engine') + 1] === 'rust') {
  const exe = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
  const core = path.resolve(__dirname, '..', '..', '..', 'bin', exe);
  if (!fs.existsSync(core)) {
    process.stderr.write('Rust index engine is unavailable: no Rust core binary was found\\\\n');
    process.exit(1);
  }
  const result = spawnSync(core, ['index'], { cwd: process.cwd(), encoding: 'utf8' });
  process.exit(result.status || 0);
}
fs.mkdirSync(path.join(process.cwd(), '.zcodegraph'), { recursive: true });
if (process.env.ZCODEGRAPH_FAKE_DEFAULT_MARKER) fs.writeFileSync(process.env.ZCODEGRAPH_FAKE_DEFAULT_MARKER, '1\\\\n');
process.exit(0);
\`);
  process.exit(0);
}
if (args[0] === 'ci') process.exit(0);
process.exit(0);
`,
  );

  writeExecutable(
    path.join(bin, 'curl'),
    `#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const out = args[args.indexOf('-o') + 1];
fs.mkdirSync(path.dirname(out), { recursive: true });
if (out.endsWith('.tar.gz')) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-node-tar-'));
  const nodeDir = path.join(work, 'node-v99.0.0-linux-x64', 'bin');
  fs.mkdirSync(nodeDir, { recursive: true });
  fs.writeFileSync(path.join(nodeDir, 'node'), ${JSON.stringify(`#!/bin/sh
if [ "$1" = "--liftoff-only" ]; then shift; fi
exec "${nodePath}" "$@"
`)});
  fs.chmodSync(path.join(nodeDir, 'node'), 0o755);
  execFileSync('/usr/bin/tar', ['-czf', out, '-C', work, 'node-v99.0.0-linux-x64']);
  fs.rmSync(work, { recursive: true, force: true });
} else {
  fs.writeFileSync(out, 'fake zip');
}
`,
  );

  writeExecutable(
    path.join(bin, 'unzip'),
    `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const dest = args[args.indexOf('-d') + 1];
const nodeDir = path.join(dest, 'node-v99.0.0-win-x64');
fs.mkdirSync(nodeDir, { recursive: true });
fs.writeFileSync(path.join(nodeDir, 'node.exe'), 'fake node exe');
`,
  );

  writeExecutable(
    path.join(bin, 'zip'),
    `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const out = args.find((arg) => arg.endsWith('.zip'));
const input = args[args.length - 1];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}
const lines = walk(input).map((file) => path.relative(process.cwd(), file).replace(/\\\\/g, '/')).sort();
fs.writeFileSync(out, lines.join('\\\\n') + '\\\\n');
`,
  );

  return bin;
}

function buildEnv(work: string, artifactDir: string, releaseDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${writeFakeTools(work)}${path.delimiter}${process.env.PATH}`,
    ZCODEGRAPH_RUST_CORE_ARTIFACT_DIR: artifactDir,
    ZCODEGRAPH_RELEASE_DIR: releaseDir,
  };
}

describe('build-bundle.sh Rust core packaging', () => {
  it('fails clearly when the target Rust core artifact is missing', () => {
    const work = tempDir('bundle-missing-rust-core');
    try {
      const result = spawnSync('bash', [script, 'linux-x64', 'v99.0.0'], {
        cwd: root,
        env: buildEnv(work, path.join(work, 'artifacts'), path.join(work, 'release')),
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('[bundle] error: Rust core artifact not found');
      expect(result.stderr).toContain('zcodegraph-core-linux-x64/zcodegraph-core');
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  it('packages the Unix launcher and Rust core and the extracted bundle can use both index engines', () => {
    const work = tempDir('bundle-unix-rust-core');
    try {
      const artifacts = path.join(work, 'artifacts');
      const release = path.join(work, 'release');
      const core = path.join(artifacts, 'zcodegraph-core-linux-x64', 'zcodegraph-core');
      writeExecutable(
        core,
        `#!/bin/sh
echo invoked > .packaged-rust-core-invoked
exit 0
`,
      );

      execFileSync('bash', [script, 'linux-x64', 'v99.0.0'], {
        cwd: root,
        env: buildEnv(work, artifacts, release),
        stdio: 'pipe',
      });

      const archive = path.join(release, 'zcodegraph-linux-x64.tar.gz');
      const listing = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' });
      expect(listing).toContain('zcodegraph-linux-x64/bin/zcodegraph\n');
      expect(listing).toContain('zcodegraph-linux-x64/bin/zcodegraph-core\n');

      const extracted = path.join(work, 'extracted');
      fs.mkdirSync(extracted);
      execFileSync('tar', ['-xzf', archive, '-C', extracted]);
      const bundledLauncher = path.join(extracted, 'zcodegraph-linux-x64', 'bin', 'zcodegraph');
      const project = path.join(work, 'project');
      fs.mkdirSync(project);

      execFileSync(bundledLauncher, ['index', '--quiet'], {
        cwd: project,
      });
      expect(fs.existsSync(path.join(project, '.packaged-rust-core-invoked'))).toBe(false);

      execFileSync(bundledLauncher, ['index', '--engine', 'rust', '--quiet'], {
        cwd: project,
      });
      expect(fs.existsSync(path.join(project, '.packaged-rust-core-invoked'))).toBe(true);

      fs.rmSync(path.join(extracted, 'zcodegraph-linux-x64', 'bin', 'zcodegraph-core'));
      const missing = spawnSync(bundledLauncher, ['index', '--engine', 'rust', '--quiet'], {
        cwd: project,
        encoding: 'utf8',
      });
      expect(missing.status).toBe(1);
      expect(missing.stderr).toContain('Rust index engine is unavailable');
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }, 30_000);

  it('packages the Windows launcher and Rust core executable', () => {
    const work = tempDir('bundle-windows-rust-core');
    try {
      const artifacts = path.join(work, 'artifacts');
      const release = path.join(work, 'release');
      const core = path.join(artifacts, 'zcodegraph-core-win32-x64', 'zcodegraph-core.exe');
      writeExecutable(core, 'fake exe');

      execFileSync('bash', [script, 'win32-x64', 'v99.0.0'], {
        cwd: root,
        env: buildEnv(work, artifacts, release),
        stdio: 'pipe',
      });

      const manifest = fs.readFileSync(path.join(release, 'zcodegraph-win32-x64.zip'), 'utf8');
      expect(manifest).toContain('zcodegraph-win32-x64/bin/zcodegraph.cmd');
      expect(manifest).toContain('zcodegraph-win32-x64/bin/zcodegraph-core.exe');
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
});
