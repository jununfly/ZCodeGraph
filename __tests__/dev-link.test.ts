import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DEV_LINK_SCRIPT = path.join(REPO_ROOT, 'scripts', 'dev-link.sh');
const LOCAL_INSTALL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'local-install.sh');

const tempDirs: string[] = [];

function tempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-dev-link-'));
  tempDirs.push(dir);
  return dir;
}

function runDevLink(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync('bash', [DEV_LINK_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function runLocalInstall(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync('bash', [LOCAL_INSTALL_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function writeExecutable(file: string, body: string): void {
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('scripts/dev-link.sh', () => {
  it('installs only zcodegraph-dev into the selected bin dir', () => {
    const binDir = tempRoot();

    const result = runDevLink(['--bin-dir', binDir, '--no-build']);

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(binDir, 'zcodegraph-dev'))).toBe(true);
    expect(fs.existsSync(path.join(binDir, 'zcodegraph'))).toBe(false);
    expect(result.stdout).toContain('Installed zcodegraph-dev:');
    expect(result.stdout).toContain('Release channel remains:');
  });

  it('defaults to a build-on-run shim with argument passthrough', () => {
    const binDir = tempRoot();

    const result = runDevLink(['--bin-dir', binDir]);

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const shim = fs.readFileSync(path.join(binDir, 'zcodegraph-dev'), 'utf8');
    expect(shim).toContain('npm run build');
    expect(shim).toContain('exec node "$REPO_ROOT/dist/bin/zcodegraph.js" "$@"');
    expect(result.stdout).toContain('Mode: build on each run');
  });

  it('supports a no-build shim for prebuilt benchmark loops', () => {
    const binDir = tempRoot();

    const result = runDevLink(['--bin-dir', binDir, '--no-build']);

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const shim = fs.readFileSync(path.join(binDir, 'zcodegraph-dev'), 'utf8');
    expect(shim).not.toContain('npm run build');
    expect(shim).toContain('exec node "$REPO_ROOT/dist/bin/zcodegraph.js" "$@"');
    expect(result.stdout).toContain('Mode: no-build');
  });

  it('warns but does not remove a legacy zcodegraph dev shim by default', () => {
    const binDir = tempRoot();
    const legacyDir = tempRoot();
    const legacy = path.join(legacyDir, 'zcodegraph');
    writeExecutable(legacy, `#!/bin/sh\nexec node "${path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js')}" "$@"\n`);

    const result = runDevLink(['--bin-dir', binDir, '--no-build'], {
      PATH: `${legacyDir}${path.delimiter}${process.env.PATH ?? ''}`,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Detected legacy zcodegraph dev shim:');
    expect(result.stdout).toContain('scripts/dev-link.sh --repair-zcodegraph');
    expect(fs.existsSync(legacy)).toBe(true);
  });

  it('repairs only a proven current-checkout zcodegraph dev shim when requested', () => {
    const binDir = tempRoot();
    const legacyDir = tempRoot();
    const legacy = path.join(legacyDir, 'zcodegraph');
    writeExecutable(legacy, `#!/bin/sh\nexec node "${path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js')}" "$@"\n`);

    const result = runDevLink(['--bin-dir', binDir, '--no-build', '--repair-zcodegraph'], {
      PATH: `${legacyDir}${path.delimiter}${process.env.PATH ?? ''}`,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Removed legacy zcodegraph dev shim:');
    expect(fs.existsSync(legacy)).toBe(false);
  });

  it('does not repair an unrelated zcodegraph command', () => {
    const binDir = tempRoot();
    const releaseDir = tempRoot();
    const release = path.join(releaseDir, 'zcodegraph');
    writeExecutable(release, '#!/bin/sh\necho release "$@"\n');

    const result = runDevLink(['--bin-dir', binDir, '--no-build', '--repair-zcodegraph'], {
      PATH: `${releaseDir}${path.delimiter}${process.env.PATH ?? ''}`,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).not.toContain('Removed legacy zcodegraph dev shim:');
    expect(fs.existsSync(release)).toBe(true);
  });
});

describe('scripts/local-install.sh compatibility wrapper', () => {
  it('installs zcodegraph-dev without creating zcodegraph', () => {
    const binDir = tempRoot();

    const result = runLocalInstall(['--bin-dir', binDir, '--no-build']);

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('explicit development channel');
    expect(result.stdout).toContain('dev command:     zcodegraph-dev');
    expect(result.stdout).toContain('release command: zcodegraph');
    expect(fs.existsSync(path.join(binDir, 'zcodegraph-dev'))).toBe(true);
    expect(fs.existsSync(path.join(binDir, 'zcodegraph'))).toBe(false);
  });

  it('undo removes only zcodegraph-dev', () => {
    const binDir = tempRoot();
    fs.writeFileSync(path.join(binDir, 'zcodegraph-dev'), '#!/bin/sh\n');
    fs.writeFileSync(path.join(binDir, 'zcodegraph'), '#!/bin/sh\n');

    const result = runLocalInstall(['--undo', '--bin-dir', binDir]);

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Removed zcodegraph-dev:');
    expect(result.stdout).toContain('zcodegraph was not modified.');
    expect(fs.existsSync(path.join(binDir, 'zcodegraph-dev'))).toBe(false);
    expect(fs.existsSync(path.join(binDir, 'zcodegraph'))).toBe(true);
  });
});
