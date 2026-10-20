/**
 * End-to-end tests for `zcodegraph churn`.
 *
 * Builds a temporary git repository with deterministic commits, then runs the
 * compiled CLI via `node dist/bin/zcodegraph.js churn` and verifies both the
 * JSON shape and the human-readable text output. Follows the MEMORY rule:
 * fixture files are written with `chr(10).join(lines)` semantics via
 * fs.writeFileSync (Node's fs writes `\n` verbatim on Windows when given a
 * JS string), and git is invoked as the plain C binary (immune to the
 * safe-delete shim). Flat `master`/`main` branch only — no nested refs.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = path.resolve(__dirname, '..', 'dist', 'bin', 'zcodegraph.js');

function git(repo: string, args: string[]): string {
  // Use execFileSync (not execSync with a joined string) so arguments with
  // spaces — e.g. `git commit -m "c1: add a and b"` — are not re-split by the
  // Windows shell.
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

describe('zcodegraph churn (e2e)', () => {
  let repo: string;

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-churn-'));
    git(repo, ['init', '-b', 'main']);
    git(repo, ['config', 'user.email', 'churn@test.local']);
    git(repo, ['config', 'user.name', 'Churn Test']);

    // Commit 1 — add two files.
    writeFileLines(path.join(repo, 'src', 'a.ts'), ['export const a = 1;']);
    writeFileLines(path.join(repo, 'src', 'b.ts'), ['export const b = 1;', 'export const b2 = 2;']);
    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'c1: add a and b']);

    // Commit 2 — modify a (add lines), modify b (delete line).
    writeFileLines(path.join(repo, 'src', 'a.ts'), [
      'export const a = 1;',
      'export const a2 = 2;',
      'export const a3 = 3;',
    ]);
    writeFileLines(path.join(repo, 'src', 'b.ts'), ['export const b = 1;']);
    git(repo, ['add', '.']);
    git(repo, ['commit', '-m', 'c2: grow a, shrink b']);

    // Commit 3 — rename a -> core/renamed.ts with modification.
    fs.mkdirSync(path.join(repo, 'core'), { recursive: true });
    fs.renameSync(path.join(repo, 'src', 'a.ts'), path.join(repo, 'core', 'renamed.ts'));
    writeFileLines(path.join(repo, 'core', 'renamed.ts'), [
      'export const a = 1;',
      'export const a2 = 2;',
      'export const a3 = 3;',
      'export const a4 = 4;',
    ]);
    git(repo, ['add', '-A']);
    git(repo, ['commit', '-m', 'c3: rename a to core/renamed.ts']);
  });

  afterAll(() => {
    try {
      fs.rmSync(repo, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('emits a JSON report with the expected shape and counts', () => {
    const out = execFileSync(
      process.execPath,
      [CLI, 'churn', '--path', repo, '--since', '2000-01-01', '--json'],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    const report = JSON.parse(out);
    expect(report.version).toBe(1);
    expect(report.repoRoot).toBe(repo);
    expect(report.totalCommits).toBe(3);
    expect(report.since).toBe('2000-01-01');

    // The rename is normalized to the new path `core/renamed.ts`.
    const paths = report.files.map((f: { path: string }) => f.path);
    expect(paths).toContain('core/renamed.ts');
    expect(paths).toContain('src/b.ts');
    // `src/a.ts` should also appear if rename detection merged — but git's
    // rename detection at -M50% should treat commit 3 as a rename, so the
    // old path may or may not appear depending on similarity. Just assert
    // the new path is present and carries at least the post-rename adds.
    const renamed = report.files.find((f: { path: string }) => f.path === 'core/renamed.ts');
    expect(renamed).toBeDefined();
    expect(renamed.adds).toBeGreaterThan(0);

    expect(report.summary.hotspots.length).toBeGreaterThan(0);
    expect(report.summary.totalFiles).toBe(report.files.length);
  });

  it('renders text output with the repo path and hotspot rows', () => {
    const out = execFileSync(
      process.execPath,
      [CLI, 'churn', '--path', repo, '--since', '2000-01-01'],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    expect(out).toContain('Churn report');
    expect(out).toContain('core/renamed.ts');
    expect(out).toContain('src/b.ts');
  });

  it('respects --path-filter to limit aggregation to a subtree', () => {
    const out = execFileSync(
      process.execPath,
      [CLI, 'churn', '--path', repo, '--since', '2000-01-01', '--path-filter', 'src', '--json'],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    const report = JSON.parse(out);
    const paths = report.files.map((f: { path: string }) => f.path);
    // Only files under src/ should appear; core/renamed.ts is outside the filter.
    expect(paths.every((p: string) => p.startsWith('src/'))).toBe(true);
    expect(paths).toContain('src/b.ts');
  });

  it('writes --html to a file with inline heat styles', () => {
    const outPath = path.join(repo, 'churn-out.html');
    execFileSync(
      process.execPath,
      [CLI, 'churn', '--path', repo, '--since', '2000-01-01', '--html', '--out', outPath],
      { encoding: 'utf-8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    expect(fs.existsSync(outPath)).toBe(true);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('ZCodeGraph churn');
    expect(html).toContain('core/renamed.ts');
    // No external CDN references
    expect(html).not.toMatch(/https?:\/\/cdn/);
    expect(html).not.toContain('<script src=');
  });

  it('fails with a clear error outside a git repo', () => {
    const notARepo = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-churn-norepo-'));
    try {
      let failed = false;
      try {
        execFileSync(process.execPath, [CLI, 'churn', '--path', notARepo], {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch (err) {
        failed = true;
        const e = err as { status?: number; stderr?: string; stdout?: string };
        expect(e.status).not.toBe(0);
        const text = String(e.stderr || '') + String(e.stdout || '');
        expect(text).toMatch(/git log failed|not a git repository|Churn failed/i);
      }
      expect(failed).toBe(true);
    } finally {
      fs.rmSync(notARepo, { recursive: true, force: true });
    }
  });
});
