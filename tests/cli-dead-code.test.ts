/**
 * zcodegraph dead-code — isolated-fixture e2e
 *
 * Builds a small Python fixture with a known dead/alive shape, runs the
 * real CLI end-to-end (`index` then `dead-code`), and asserts:
 *   - exit code 0
 *   - human output carries candidates + three-bucket counts
 *   - `--json` produces a parseable payload with rubric/buckets/verdicts
 *   - `--md` produces a Markdown report with a verdict table
 *   - a function that is never called lands in the dead bucket (R4)
 *   - a function called by another function is not a candidate at all
 *
 * Modeled on tests/cli-health.test.ts.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      ZCG_ALLOW_UNSAFE_NODE: '1',
      ZCG_NO_DAEMON: '1',
      ZCG_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function writeFixture(root: string): void {
  const src = path.join(root, 'src');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(
    path.join(src, 'app.py'),
    [
      'def used_fn():',
      '    return 1',
      '',
      'def _dead_fn():',
      '    return 2',
      '',
      'def caller():',
      '    return used_fn()',
      '',
    ].join('\n'),
  );
}

interface JsonPayload {
  projectRoot: string;
  rubric: string;
  candidates: number;
  buckets: { dead: number; alive: number; unknown: number };
  unknownRatio: number;
  verdicts: Array<{
    qualified_name: string;
    bucket: string;
    rule_id: string;
    file_path: string;
  }>;
}

describe('zcodegraph dead-code (fixture e2e)', () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-dead-code-'));
    writeFixture(fixtureRoot);
    const idx = runCli(['index'], fixtureRoot);
    expect(idx.status, idx.stderr).toBe(0);
  }, 60_000);

  afterAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('human output shows candidates + bucket counts', () => {
    const r = runCli(['dead-code'], fixtureRoot);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/candidates=\d+/);
    expect(r.stdout).toMatch(/dead=\d+/);
    expect(r.stdout).toMatch(/alive=\d+/);
    expect(r.stdout).toMatch(/unknown=\d+/);
  });

  it('--json is parseable with rubric + buckets + verdicts keys', () => {
    const r = runCli(['dead-code', '--json'], fixtureRoot);
    expect(r.status, r.stderr).toBe(0);
    const payload = JSON.parse(r.stdout) as JsonPayload;
    expect(payload.rubric).toBe('DES-dead-code-rubric-v1');
    expect(payload.candidates).toBeGreaterThanOrEqual(1);
    expect(payload.buckets.dead + payload.buckets.alive + payload.buckets.unknown)
      .toBe(payload.candidates);
    expect(Array.isArray(payload.verdicts)).toBe(true);
  });

  it('dead_fn lands in dead bucket; used_fn/caller are not candidates', () => {
    const r = runCli(['dead-code', '--json'], fixtureRoot);
    const payload = JSON.parse(r.stdout) as JsonPayload;
    const byName = new Map(payload.verdicts.map((v) => [v.qualified_name, v]));
    const dead = byName.get('src/app.py::_dead_fn');
    expect(dead, JSON.stringify(payload.verdicts, null, 2)).toBeDefined();
    expect(dead!.bucket).toBe('dead');
    expect(dead!.rule_id).toBe('R4');
    expect(byName.has('src/app.py::used_fn')).toBe(false);
    expect(byName.has('src/app.py::caller')).toBe(false);
  });

  it('--md produces a Markdown report with the verdict table', () => {
    const r = runCli(['dead-code', '--md'], fixtureRoot);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('# ZCodeGraph Dead-Code Report');
    expect(r.stdout).toContain('| Symbol | File:Line | Rule | Evidence |');
    expect(r.stdout).toContain('src/app.py::_dead_fn');
  });

  it('--bucket alive filters the listed rows', () => {
    const r = runCli(['dead-code', '--bucket', 'alive'], fixtureRoot);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('alive bucket');
  });
});
