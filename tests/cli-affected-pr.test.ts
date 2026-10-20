/**
 * zcodegraph affected --pr <range> — isolated-fixture e2e
 *
 * Builds a small TypeScript fixture with a real git history (init → commit A →
 * modify → commit B), runs the real CLI end-to-end (`index` then
 * `affected --pr <A>..<B>`), and asserts:
 *   - mode is "blast-radius"
 *   - changedFiles reflect the git diff
 *   - affectedSource includes dependents of changed files
 *   - affectedTests partitions test files away from source
 *   - summary numbers are internally consistent
 *
 * Legacy mode (no --pr) is also covered to lock in backward compatibility.
 *
 * codeflow is never invoked — see roadmap 1-1-2 Q4 decision: CI must not
 * depend on external processes. The recall-vs-codeflow evidence lives in
 * docs/evidence/2026-10-20-blast-radius-recall.md (offline artifact).
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
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runGit(args: string[], cwd: string): void {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed in ${cwd}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function writeFile(root: string, rel: string, content: string): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

/**
 * Fixture shape:
 *
 *   src/core.ts      — leaf (no imports)
 *   src/util.ts      — imports core.ts
 *   src/service.ts   — imports util.ts
 *   src/main.ts      — imports service.ts (entry point)
 *   tests/util.test.ts — imports ../src/util.ts (test file)
 *
 * Commit A: all five files.
 * Commit B: modifies src/core.ts only.
 *
 * Expected blast radius for A..B (changed = src/core.ts):
 *   source: core.ts, util.ts, service.ts, main.ts
 *   tests:  tests/util.test.ts
 */
function buildFixtureWithHistory(root: string): { commitA: string; commitB: string } {
  // Pass 1 — initial sources
  writeFile(root, 'src/core.ts', `export function core(): number {
  return 1;
}
`);
  writeFile(root, 'src/util.ts', `import { core } from './core';
export function util(): number {
  return core() + 1;
}
`);
  writeFile(root, 'src/service.ts', `import { util } from './util';
export function service(): number {
  return util() + 1;
}
`);
  writeFile(root, 'src/main.ts', `import { service } from './service';
export function main(): number {
  return service();
}
main();
`);
  writeFile(root, 'tests/util.test.ts', `import { util } from '../src/util';
export function testUtil(): boolean {
  return util() > 0;
}
`);

  runGit(['init', '-b', 'main'], root);
  runGit(['config', 'user.email', 'fixture@zcodegraph.local'], root);
  runGit(['config', 'user.name', 'zcodegraph-fixture'], root);
  runGit(['add', '.'], root);
  runGit(['commit', '-m', 'A: initial fixture'], root);
  const commitA = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf-8',
  }).stdout.trim();

  // Pass 2 — modify core.ts only
  writeFile(root, 'src/core.ts', `export function core(): number {
  return 2; // changed
}
`);
  runGit(['add', '.'], root);
  runGit(['commit', '-m', 'B: bump core() return value'], root);
  const commitB = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf-8',
  }).stdout.trim();

  return { commitA, commitB };
}

describe('zcodegraph affected --pr (isolated git fixture)', () => {
  let fixtureRoot = '';
  let binReady = false;
  let commitA = '';
  let commitB = '';

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      throw new Error(
        `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before this suite.`,
      );
    }
    binReady = true;

    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-affected-pr-'));
    const commits = buildFixtureWithHistory(fixtureRoot);
    commitA = commits.commitA;
    commitB = commits.commitB;

    const index = runCli(['index'], fixtureRoot);
    if (index.status !== 0) {
      throw new Error(
        `zcodegraph index failed in fixture.\nstdout:\n${index.stdout}\nstderr:\n${index.stderr}`,
      );
    }
  }, 180_000);

  afterAll(() => {
    if (fixtureRoot) {
      try {
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
      } catch {
        // Windows: SQLite WAL sometimes lingers; the OS will reap the temp dir.
      }
    }
  });

  it('reports blast radius for --pr <A>..<B> in JSON mode with source/test partition', () => {
    if (!binReady) return;

    const range = `${commitA}..${commitB}`;
    const result = runCli(['affected', '--pr', range, '--json'], fixtureRoot);
    expect(
      result.status,
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);

    // Strip any trailing node warnings before parsing JSON
    const jsonText = result.stdout.split('\n(node:')[0];
    const parsed = JSON.parse(jsonText);

    expect(parsed.mode).toBe('blast-radius');
    expect(parsed.prRange).toBe(range);

    // changedFiles comes straight from `git diff --name-only A..B`
    expect(parsed.changedFiles).toEqual(['src/core.ts']);

    // Blast radius must include core.ts itself + its transitive dependents.
    expect(parsed.affectedSource).toContain('src/core.ts');
    expect(parsed.affectedSource).toContain('src/util.ts');
    expect(parsed.affectedSource).toContain('src/service.ts');
    expect(parsed.affectedSource).toContain('src/main.ts');

    // Test files are partitioned away from source.
    expect(parsed.affectedTests).toContain('tests/util.test.ts');
    expect(parsed.affectedSource).not.toContain('tests/util.test.ts');

    // Summary is internally consistent.
    expect(parsed.summary.sourceFiles).toBe(parsed.affectedSource.length);
    expect(parsed.summary.testFiles).toBe(parsed.affectedTests.length);
    expect(parsed.summary.totalAffected).toBe(
      parsed.affectedSource.length + parsed.affectedTests.length,
    );
    expect(parsed.summary.maxDepthLimit).toBeGreaterThan(0);
  }, 90_000);

  it('emits a quiet stream usable for piping (affected files only, one per line)', () => {
    if (!binReady) return;

    const range = `${commitA}..${commitB}`;
    const result = runCli(['affected', '--pr', range, '--quiet'], fixtureRoot);
    expect(result.status).toBe(0);

    const lines = result.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(lines).toContain('src/core.ts');
    expect(lines).toContain('src/util.ts');
    expect(lines).toContain('tests/util.test.ts');
    // No decorative headers in quiet mode.
    expect(lines.some((l) => /^blast radius/i.test(l))).toBe(false);
  }, 90_000);

  it('fails cleanly when the git range is invalid', () => {
    if (!binReady) return;

    const result = runCli(
      ['affected', '--pr', 'deadbeef..cafebabe', '--json'],
      fixtureRoot,
    );
    expect(result.status).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/git diff --name-only deadbeef\.\.cafebabe failed/i);
  }, 30_000);

  it('legacy mode (no --pr) still returns only test files for backward compatibility', () => {
    if (!binReady) return;

    const result = runCli(
      ['affected', 'src/core.ts', '--json'],
      fixtureRoot,
    );
    expect(result.status).toBe(0);

    const jsonText = result.stdout.split('\n(node:')[0];
    const parsed = JSON.parse(jsonText);

    // Legacy schema: no `mode`, no `summary`, no `affectedSource`.
    expect(parsed.mode).toBeUndefined();
    expect(parsed.summary).toBeUndefined();
    expect(parsed.affectedSource).toBeUndefined();

    expect(parsed.changedFiles).toEqual(['src/core.ts']);
    expect(parsed.affectedTests).toContain('tests/util.test.ts');
    // Legacy mode does not surface source dependents.
    expect(parsed.affectedTests).not.toContain('src/util.ts');
    expect(parsed.affectedTests).not.toContain('src/service.ts');
  }, 60_000);
});
