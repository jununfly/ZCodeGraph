import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'dist', 'bin', 'zcodegraph.js');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('CLI help surface', () => {
  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    }
  }, 60_000);

  it('advertises doctor diagnostics and the documented rust-hybrid bundle flags', () => {
    const topLevel = runCli(['--help']);
    expect(topLevel.status, `stdout:\n${topLevel.stdout}\nstderr:\n${topLevel.stderr}`).toBe(0);
    expect(topLevel.stdout).toContain('doctor [options] [path]');
    expect(topLevel.stdout).toContain('Create local diagnostic bundles for maintainers');

    const doctor = runCli(['doctor', '--help']);
    expect(doctor.status, `stdout:\n${doctor.stdout}\nstderr:\n${doctor.stderr}`).toBe(0);
    expect(doctor.stdout).toContain('Usage: zcodegraph doctor [options] [path]');
    expect(doctor.stdout).toContain('--engine <engine>');
    expect(doctor.stdout).toContain('rust-hybrid');
    expect(doctor.stdout).toContain('--bundle');
    expect(doctor.stdout).toContain('--last-run');
    expect(doctor.stdout).toContain('--last-failure');
  });
});
