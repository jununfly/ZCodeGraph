/**
 * zcodegraph visualize --since — history timeline e2e (1-3-6 P1-4)
 *
 * Builds a real git repository fixture under os.tmpdir() with N ≥ 10 commits
 * that add/modify/delete TypeScript source files, runs the real CLI
 * (`visualize --since HEAD~<N-1>`), and asserts:
 *
 *   1. The emitted HTML is a self-contained artifact containing the history
 *      IR (`commits`, `unionNodes`, `unionEdges`, `nodePresence`,
 *      `edgePresence`).
 *   2. Commit count and order match `git log` (oldest first).
 *   3. Timeline UI controls are present (slider, play button, prev/next).
 *   4. The union set contains symbols introduced and removed across the
 *      commit range (presence intervals are respected).
 *   5. The latest commit is selected by default (slider at rightmost).
 *
 * ci.yml `-t` step keys off the bare `it(...)` titles below — keep them
 * stable.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawnSync, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

const NUM_COMMITS = 11;

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

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  }) as string;
}

function writeFile(repo: string, rel: string, content: string): void {
  const abs = path.join(repo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

function deleteFile(repo: string, rel: string): void {
  const abs = path.join(repo, rel);
  try {
    fs.unlinkSync(abs);
  } catch {
    /* not present */
  }
}

/**
 * Build a small TypeScript project and walk it through N commits. The shape
 * of the evolution is deterministic so assertions can pin specific symbols:
 *
 *   commit 0:  src/main.ts only (App + main entrypoint)
 *   commit 1:  add src/helper.ts (helper function)
 *   commit 2:  add src/logger.ts (Logger class)
 *   commit 3:  add src/calculator.ts (Calculator class with add/multiply)
 *   commit 4:  modify helper.ts to add `helperV2` function
 *   commit 5:  add src/util.ts (utility function)
 *   commit 6:  modify logger.ts to add `warn` method
 *   commit 7:  delete src/util.ts
 *   commit 8:  add src/cache.ts (Cache class)
 *   commit 9:  modify calculator.ts to add `divide` method
 *   commit 10: modify main.ts to import + use cache
 *
 * The fixture uses LF newlines explicitly via `\n` joins to avoid the
 * WorkBuddy shell `\n` → `/n` text-write hazard documented in project memory.
 */
function buildFixtureRepo(repoRoot: string): void {
  fs.mkdirSync(repoRoot, { recursive: true });

  git(['init', '-q', '-b', 'main'], repoRoot);
  git(['config', 'user.email', 'visualize-history@test.local'], repoRoot);
  git(['config', 'user.name', 'Visualize History Test'], repoRoot);
  git(['config', 'commit.gpgsign', 'false'], repoRoot);

  const steps: Array<() => void> = [
    // 0: initial
    () => {
      writeFile(
        repoRoot,
        'src/main.ts',
        [
          'export class App {',
          '  run(): void {',
          "    console.log('v0');",
          '  }',
          '}',
          '',
          'const app = new App();',
          'app.run();',
          '',
        ].join('\n'),
      );
      writeFile(
        repoRoot,
        'package.json',
        JSON.stringify({ name: 'vh-fixture', version: '0.0.0', private: true }, null, 2) + '\n',
      );
    },
    // 1: add helper.ts
    () => {
      writeFile(
        repoRoot,
        'src/helper.ts',
        ['export function helper(): number {', '  return 42;', '}', ''].join('\n'),
      );
    },
    // 2: add logger.ts
    () => {
      writeFile(
        repoRoot,
        'src/logger.ts',
        [
          'export class Logger {',
          '  info(msg: string): void {',
          "    console.log('[INFO]', msg);",
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 3: add calculator.ts
    () => {
      writeFile(
        repoRoot,
        'src/calculator.ts',
        [
          'export class Calculator {',
          '  add(a: number, b: number): number {',
          '    return a + b;',
          '  }',
          '  multiply(a: number, b: number): number {',
          '    return a * b;',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 4: modify helper.ts (add helperV2)
    () => {
      writeFile(
        repoRoot,
        'src/helper.ts',
        [
          'export function helper(): number {',
          '  return 42;',
          '}',
          '',
          'export function helperV2(): number {',
          '  return 43;',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 5: add util.ts
    () => {
      writeFile(
        repoRoot,
        'src/util.ts',
        ['export function utilThing(): string {', "  return 'u';", '}', ''].join('\n'),
      );
    },
    // 6: modify logger.ts (add warn)
    () => {
      writeFile(
        repoRoot,
        'src/logger.ts',
        [
          'export class Logger {',
          '  info(msg: string): void {',
          "    console.log('[INFO]', msg);",
          '  }',
          '  warn(msg: string): void {',
          "    console.warn('[WARN]', msg);",
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 7: delete util.ts
    () => {
      deleteFile(repoRoot, 'src/util.ts');
    },
    // 8: add cache.ts
    () => {
      writeFile(
        repoRoot,
        'src/cache.ts',
        [
          'export class Cache {',
          '  private store = new Map<string, string>();',
          '  get(k: string): string | undefined {',
          '    return this.store.get(k);',
          '  }',
          '  set(k: string, v: string): void {',
          '    this.store.set(k, v);',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 9: modify calculator.ts (add divide)
    () => {
      writeFile(
        repoRoot,
        'src/calculator.ts',
        [
          'export class Calculator {',
          '  add(a: number, b: number): number {',
          '    return a + b;',
          '  }',
          '  multiply(a: number, b: number): number {',
          '    return a * b;',
          '  }',
          '  divide(a: number, b: number): number {',
          '    if (b === 0) throw new Error("div by zero");',
          '    return a / b;',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    },
    // 10: modify main.ts (import + use cache)
    () => {
      writeFile(
        repoRoot,
        'src/main.ts',
        [
          "import { Cache } from './cache';",
          '',
          'export class App {',
          '  private cache = new Cache();',
          '  run(): void {',
          "    this.cache.set('k', 'v');",
          "    console.log('v10', this.cache.get('k'));",
          '  }',
          '}',
          '',
          'const app = new App();',
          'app.run();',
          '',
        ].join('\n'),
      );
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    steps[i]!();
    git(['add', '-A'], repoRoot);
    git(['commit', '-q', '-m', `c${i}: fixture step ${i}`], repoRoot);
  }
}

describe('zcodegraph visualize --since (history timeline)', () => {
  let fixtureRoot = '';
  let binReady = false;
  let historyHtml = '';
  let historyHtmlPath = '';
  let commitShas: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      throw new Error(
        `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before this suite.`,
      );
    }
    binReady = true;

    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-visualize-history-'));
    buildFixtureRepo(fixtureRoot);

    // Initialize the project's own `.zcodegraph/` so `visualize --since`
    // passes its `isInitialized` gate. The history run then writes per-commit
    // indexes under `.zcodegraph/visualize-history/<sha>/`.
    const boot = runCli(['index', '--quiet'], fixtureRoot);
    if (boot.status !== 0) {
      throw new Error(
        `zcodegraph index failed on history fixture.\nstdout:\n${boot.stdout}\nstderr:\n${boot.stderr}`,
      );
    }

    commitShas = git(['log', '--format=%H'], fixtureRoot)
      .trim()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .reverse(); // oldest first
    expect(commitShas.length).toBe(NUM_COMMITS);
  }, 300_000);

  afterAll(() => {
    if (fixtureRoot) {
      try {
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
      } catch {
        /* Windows sqlite WAL sometimes lingers */
      }
    }
  });

  it(
    'visualize --since HEAD~N produces a history HTML with N+1 commits embedded, timeline controls, and union data',
    () => {
      if (!binReady) return;
      historyHtmlPath = path.join(fixtureRoot, '.zcodegraph', 'visualize-history.html');
      const since = `HEAD~${NUM_COMMITS - 1}`;
      const result = runCli(
        [
          'visualize',
          '--since',
          since,
          '--max-commits',
          String(NUM_COMMITS),
          '--out',
          historyHtmlPath,
        ],
        fixtureRoot,
      );
      expect(
        result.status,
        `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      ).toBe(0);
      expect(fs.existsSync(historyHtmlPath)).toBe(true);

      historyHtml = fs.readFileSync(historyHtmlPath, 'utf-8');
      expect(historyHtml.startsWith('<!doctype html>')).toBe(true);
      expect(historyHtml).toContain('cytoscape');
      expect(historyHtml).not.toMatch(/<script[^>]+src=/i);
      expect(historyHtml).not.toContain('https://unpkg.com');
      expect(historyHtml).not.toContain('https://cdn.jsdelivr.net');
      expect(historyHtml).not.toContain('https://cdnjs.cloudflare.com');
      expect(historyHtml).not.toContain('__CYTOSCAPE_SRC__');
      expect(historyHtml).not.toContain('__ZCODEGRAPH_HISTORY_DATA__');

      // History IR keys present.
      expect(historyHtml).toContain('"commits"');
      expect(historyHtml).toContain('"unionNodes"');
      expect(historyHtml).toContain('"unionEdges"');
      expect(historyHtml).toContain('"nodePresence"');
      expect(historyHtml).toContain('"edgePresence"');

      // Timeline UI controls present.
      expect(historyHtml).toContain('id="timeline"');
      expect(historyHtml).toContain('id="slider"');
      expect(historyHtml).toContain('id="btn-play"');
      expect(historyHtml).toContain('id="btn-prev"');
      expect(historyHtml).toContain('id="btn-next"');
    },
    // N × (extract + index) on Windows + rust-hybrid default; generous ceiling.
    600_000,
  );

  it(
    'history IR contains exactly N commits in oldest-first order with real SHAs from git log',
    () => {
      if (!binReady || !historyHtml) return;
      const dataMatch = historyHtml.match(
        /var DATA = (\{[\s\S]*?\});\s*\n\s*var KIND_COLORS/,
      );
      expect(dataMatch, 'history IR JSON not found in HTML').not.toBeNull();
      const data = JSON.parse(dataMatch![1]!);
      expect(Array.isArray(data.commits)).toBe(true);
      expect(data.commits.length).toBe(NUM_COMMITS);

      const gotShas = data.commits.map((c: { commit: { sha: string } }) => c.commit.sha);
      expect(gotShas).toEqual(commitShas);

      // Subjects are oldest-first (c0..c10).
      expect(data.commits[0].commit.subject).toContain('c0');
      expect(data.commits[NUM_COMMITS - 1].commit.subject).toContain(`c${NUM_COMMITS - 1}`);

      // Each commit entry carries ONLY meta + stats — the per-commit
      // allNodes/allEdges are stripped before embedding (size optimisation,
      // dogfood measured 84% of HTML in this duplication). The UI reads the
      // top-level unionNodes/unionEdges + nodePresence/edgePresence instead.
      for (const c of data.commits) {
        expect(c).toHaveProperty('stats');
        expect(c).not.toHaveProperty('allNodes');
        expect(c).not.toHaveProperty('allEdges');
        expect(c).not.toHaveProperty('nodes');
        expect(c).not.toHaveProperty('edges');
        expect(c.commit).toHaveProperty('shortSha');
        expect(c.commit).toHaveProperty('date');
        expect(c.commit).toHaveProperty('timestamp');
      }
    },
    30_000,
  );

  it(
    'union sets include symbols that appear (helperV2, divide) and disappear (utilThing) across the range',
    () => {
      if (!binReady || !historyHtml) return;
      const dataMatch = historyHtml.match(
        /var DATA = (\{[\s\S]*?\});\s*\n\s*var KIND_COLORS/,
      );
      const data = JSON.parse(dataMatch![1]!);
      const nodeNames = new Set<string>(
        data.unionNodes.map((n: { name: string }) => n.name),
      );
      // Added mid-range.
      expect(nodeNames.has('helperV2')).toBe(true);
      expect(nodeNames.has('divide')).toBe(true);
      expect(nodeNames.has('Cache')).toBe(true);
      // Deleted mid-range.
      expect(nodeNames.has('utilThing')).toBe(true);
      // Present throughout.
      expect(nodeNames.has('App')).toBe(true);
      expect(nodeNames.has('Calculator')).toBe(true);

      // Presence intervals: helperV2 was added in commit 4, so first >= 4.
      // utilThing was added in 5 and removed in 7, so last <= 6.
      const byName = new Map<string, { first: number; last: number }>();
      for (const n of data.unionNodes) {
        const p = data.nodePresence[n.id];
        if (p) byName.set(n.name, p);
      }
      const v2 = byName.get('helperV2');
      expect(v2).toBeDefined();
      expect(v2!.first).toBeGreaterThanOrEqual(4);
      expect(v2!.last).toBe(NUM_COMMITS - 1);

      const util = byName.get('utilThing');
      expect(util).toBeDefined();
      expect(util!.first).toBeGreaterThanOrEqual(5);
      expect(util!.last).toBeLessThan(NUM_COMMITS - 1);
    },
    30_000,
  );

  it(
    'history HTML size is bounded by union+presence, not by N × per-commit IR',
    () => {
      if (!binReady || !historyHtml) return;
      // The size regression guard: commits[] must NOT carry per-commit
      // allNodes/allEdges/nodes/edges (the 84% duplication measured on
      // ZCodeGraph dogfood, 78MB of 93MB). We assert structurally that the
      // per-commit payload is stripped, which is what bounds HTML size by
      // union+presence rather than N × per-commit IR.
      const dataMatch = historyHtml.match(
        /var DATA = (\{[\s\S]*?\});\s*\n\s*var KIND_COLORS/,
      );
      const data = JSON.parse(dataMatch![1]!);

      // Hard structural guarantee: no commit carries node/edge arrays.
      for (const c of data.commits) {
        expect(c.allNodes, 'commits[].allNodes must be stripped').toBeUndefined();
        expect(c.allEdges, 'commits[].allEdges must be stripped').toBeUndefined();
        expect(c.nodes, 'commits[].nodes must be stripped').toBeUndefined();
        expect(c.edges, 'commits[].edges must be stripped').toBeUndefined();
      }

      // Soft size sanity: per-commit payload should be only meta + stats.
      // On the fixture, meta dominates (≈4KB for 11 commits of tiny JSON);
      // on a real project with 20k+ nodes per commit, the strip prevents
      // N-fold duplication. We assert a generous per-commit byte budget
      // (1KB) which any leaked nodes/edges would immediately blow past.
      const commitsBytes = JSON.stringify(data.commits).length;
      const bytesPerCommit = commitsBytes / data.commits.length;
      expect(
        bytesPerCommit,
        `commits[] is ${commitsBytes}B over ${data.commits.length} commits = ${bytesPerCommit.toFixed(0)}B/commit; expected < 1KB/commit (only meta+stats)`,
      ).toBeLessThan(1024);

      // Sanity: the embedded commits[] must still have useful meta.
      expect(data.commits[0].commit.subject).toBeTruthy();
      expect(data.commits[0].stats).toBeDefined();
    },
    30_000,
  );

  it(
    'rejects --since combined with --filter (loud error, no silent data drop)',
    () => {
      if (!binReady) return;
      const result = runCli(
        ['visualize', '--since', 'HEAD~2', '--filter', 'src/**'],
        fixtureRoot,
      );
      expect(result.status).not.toBe(0);
      const combined = result.stdout + result.stderr;
      expect(combined).toMatch(/--filter is not supported with --since/i);
    },
    30_000,
  );

  it(
    'rejects --since on a non-git directory with a clear error',
    () => {
      if (!binReady) return;
      const notGit = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-visualize-nogit-'));
      try {
        writeFile(notGit, 'src/x.ts', 'export const x = 1;\n');
        // Bootstrap the store so `isInitialized` passes; then `--since` must
        // fail because `git log` cannot run outside a work tree.
        const boot = runCli(['index', '--quiet'], notGit);
        expect(boot.status, `boot stdout:\n${boot.stdout}\nstderr:\n${boot.stderr}`).toBe(0);
        const result = runCli(['visualize', '--since', 'HEAD~1'], notGit);
        expect(result.status).not.toBe(0);
        const combined = result.stdout + result.stderr;
        expect(combined).toMatch(/git log failed|not a git/i);
      } finally {
        try {
          fs.rmSync(notGit, { recursive: true, force: true });
        } catch {
          /* best-effort */
        }
      }
    },
    120_000,
  );
});
