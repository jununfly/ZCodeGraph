/**
 * End-to-end coverage for the index-scope feature (roadmap 1-2-9).
 *
 * Two scenarios, both against an isolated fixture repo:
 *   1. After `zcodegraph index`, files under `.workbuddy/` do NOT produce
 *      nodes in the graph (they would have before this node shipped).
 *   2. `zcodegraph status` surfaces the Index Scope section listing the
 *      excluded agent work dirs present in the project.
 *   3. `zcodegraph affected --pr` never emits paths under `.workbuddy/**`.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = path.resolve(__dirname, '..', 'dist', 'bin', 'zcodegraph.js');

function git(repo: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  }) as string;
}

function writeFileLines(file: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
}

function run(args: string[], cwd: string): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  }) as string;
}

describe('index scope (e2e)', () => {
  let repo: string;

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-scope-'));
    git(repo, ['init', '-b', 'main']);
    git(repo, ['config', 'user.email', 'scope@test.local']);
    git(repo, ['config', 'user.name', 'Scope Test']);

    // Source file that SHOULD be indexed.
    writeFileLines(path.join(repo, 'src', 'index.ts'), [
      'export function hello(): string {',
      '  return "hi";',
      '}',
    ]);
    // Agent working dir that SHOULD be excluded even though it contains .md/.ts.
    writeFileLines(path.join(repo, '.workbuddy', 'memory', '2026-10-20.md'), [
      '# Agent memory',
      'This file should not be indexed.',
    ]);
    writeFileLines(path.join(repo, '.claude', 'scratch.ts'), [
      'export const scratch = 1;',
    ]);
    // A second source file so we have something to query for in affected.
    writeFileLines(path.join(repo, 'src', 'util.ts'), [
      'import { hello } from "./index";',
      'export const shout = () => hello().toUpperCase();',
    ]);

    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'c1: init with agent work dirs']);

    // Index the project. `index` takes a positional path, not --path.
    run(['index', repo], repo);
  }, 120_000);

  afterAll(() => {
    try {
      fs.rmSync(repo, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  it('index excludes .workbuddy/ and .claude/ from the graph', () => {
    // `files --format flat` prints one path per line followed by `(lang, N symbols)`.
    // Parse the path prefix from each line.
    const out = run(['files', '--path', repo, '--format', 'flat'], repo);
    // Strip ANSI escape sequences (chalk color output) before matching.
    const stripped = out.replace(/\[[0-9;]*m/g, '');
    const lines = stripped.split('\n');
    const paths: string[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*(\S.*?)\s+\([^)]+, \d+ symbols?\)\s*$/);
      if (m && m[1]) paths.push(m[1]);
    }
    expect(paths.length).toBeGreaterThan(0);
    const offending = paths.filter(
      (p) => p.startsWith('.workbuddy/') || p.startsWith('.claude/'),
    );
    expect(offending).toEqual([]);
    // Sanity: src files ARE indexed.
    expect(paths.some((p) => p.endsWith('src/index.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('src/util.ts'))).toBe(true);
  });

  it('status prints an Index Scope section listing excluded agent dirs', () => {
    const out = run(['status', repo], repo);
    expect(out).toContain('Index Scope');
    expect(out).toContain('.workbuddy/');
    expect(out).toContain('.claude/');
    expect(out).toContain('zcodegraph.json');
  });

  it('status --json exposes indexScope metadata', () => {
    const out = run(['status', repo, '--json'], repo);
    const parsed = JSON.parse(out);
    expect(parsed.indexScope).toBeDefined();
    expect(parsed.indexScope.agentWorkDirsExcluded).toContain('.workbuddy');
    expect(parsed.indexScope.agentWorkDirsExcluded).toContain('.claude');
    expect(parsed.indexScope.projectConfigPresent).toBe(false);
    expect(parsed.indexScope.projectConfigExcludeCount).toBe(0);
  });

  it('affected --pr never lists paths under .workbuddy/**', () => {
    // Make a commit that touches both src/ and .workbuddy/, then run
    // affected --pr HEAD~1..HEAD and assert the .workbuddy/ entry does not
    // appear in the output. Since the graph itself excludes .workbuddy/,
    // the blast radius cannot contain it.
    writeFileLines(path.join(repo, 'src', 'index.ts'), [
      'export function hello(): string {',
      '  return "hello";',
      '}',
    ]);
    writeFileLines(path.join(repo, '.workbuddy', 'memory', '2026-10-21.md'), [
      '# next-day memory',
    ]);
    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'c2: touch src + .workbuddy']);

    // Re-index so the graph has the new src/ state.
    run(['index', repo], repo);

    const out = run(
      ['affected', '--path', repo, '--pr', 'HEAD~1..HEAD', '--json'],
      repo,
    );
    const parsed = JSON.parse(out);
    const allFiles: string[] = [
      ...(parsed.affectedSource ?? []),
      ...(parsed.affectedTests ?? []),
      ...(parsed.changedFiles ?? []),
    ];
    const offending = allFiles.filter((p) => p.startsWith('.workbuddy/'));
    expect(offending).toEqual([]);
  }, 120_000);
});
