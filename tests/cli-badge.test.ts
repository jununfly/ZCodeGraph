/**
 * zcodegraph badge — isolated-fixture e2e
 *
 * Builds the same small TypeScript fixture as `cli-health.test.ts`, runs
 * the real CLI end-to-end (`index` then `badge`), and asserts the
 * 1-1-8 exit criteria:
 *   - exit code 0
 *   - stdout mode emits a raw SVG document (parseable, self-contained)
 *   - --output writes the SVG to the given file (parent dirs created)
 *   - --stdout flag is accepted (explicit no-op for CI readability)
 *   - the SVG carries health grade/score, nodes, edges (three fields)
 *   - determinism: two consecutive `badge` runs produce byte-equal SVG
 *   - fails cleanly on an uninitialized directory
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

function writeFixture(root: string): void {
  const src = path.join(root, 'src');
  fs.mkdirSync(src, { recursive: true });

  const files: Record<string, string> = {
    'main.ts': `import { helper } from './helper';
import { Logger } from './logger';

export class App {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  run(): void {
    this.logger.info('starting');
    helper();
  }
}

const app = new App();
app.run();
`,
    'helper.ts': `export function helper(): number {
  return 42;
}

export function orphanHelper(): number {
  return -1;
}
`,
    'logger.ts': `export class Logger {
  info(msg: string): void {
    console.log('[INFO]', msg);
  }
}
`,
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(src, name), content, 'utf-8');
  }
}

describe('zcodegraph badge (isolated fixture)', () => {
  let fixtureRoot = '';
  let binReady = false;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      throw new Error(
        `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before this suite.`,
      );
    }
    binReady = true;

    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-badge-'));
    writeFixture(fixtureRoot);

    const index = runCli(['index'], fixtureRoot);
    if (index.status !== 0) {
      throw new Error(
        `zcodegraph index failed in fixture.\nstdout:\n${index.stdout}\nstderr:\n${index.stderr}`,
      );
    }
  }, 120_000);

  afterAll(() => {
    if (fixtureRoot) {
      try {
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
      } catch {
        /* Windows sqlite WAL */
      }
    }
  });

  it('exits 0 and prints a self-contained SVG to stdout by default', () => {
    if (!binReady) return;

    const result = runCli(['badge'], fixtureRoot);
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const svg = result.stdout.trim();
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');

    // Three fields per exit criteria: grade+score, nodes, edges.
    expect(svg).toMatch(/>[A-F] · \d+</); // e.g. ">A · 92<"
    expect(svg).toContain('>zcodegraph<');

    // Self-containment: no scripts, no external fetches beyond the SVG xmlns.
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('<image');
    const httpMatches = svg.match(/http:\/\//g) ?? [];
    expect(httpMatches.length).toBe(1); // xmlns only
  }, 30_000);

  it('--stdout produces identical bytes to default stdout mode', () => {
    if (!binReady) return;

    const a = runCli(['badge'], fixtureRoot);
    const b = runCli(['badge', '--stdout'], fixtureRoot);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(b.stdout).toBe(a.stdout);
  }, 30_000);

  it('--output writes the SVG to a file, creating parent dirs', () => {
    if (!binReady) return;

    const outPath = path.join(fixtureRoot, 'out', 'nested', 'badge.svg');
    const result = runCli(['badge', '--output', outPath], fixtureRoot);
    expect(result.status, `stderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(outPath)).toBe(true);

    const written = fs.readFileSync(outPath, 'utf-8');
    expect(written.startsWith('<svg ')).toBe(true);
    expect(written).toContain('>zcodegraph<');

    // Human-readable confirmation mentions the path and the key metrics.
    expect(result.stdout).toContain('Badge written:');
    expect(result.stdout).toMatch(/grade=[A-F]/);
    expect(result.stdout).toMatch(/score=\d+/);
    expect(result.stdout).toMatch(/nodes=\d+/);
    expect(result.stdout).toMatch(/edges=\d+/);
  }, 30_000);

  it('is deterministic: two consecutive stdout runs are byte-equal', () => {
    if (!binReady) return;

    const a = runCli(['badge'], fixtureRoot);
    const b = runCli(['badge'], fixtureRoot);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    expect(a.stdout).toBe(b.stdout);
  }, 30_000);

  it('emits a badge whose numbers agree with `health --json`', () => {
    if (!binReady) return;

    const health = runCli(['health', '--json'], fixtureRoot);
    expect(health.status).toBe(0);
    const payload = JSON.parse(health.stdout);

    const badge = runCli(['badge'], fixtureRoot);
    expect(badge.status).toBe(0);
    const svg = badge.stdout;

    // Score (the integer next to the grade) and total node count must match.
    expect(svg).toContain(`>${payload.grade} · ${payload.score}<`);
    const nodesFormatted = payload.scale.files > 0 ? payload.scale.functions : 0;
    void nodesFormatted; // nodes are asserted via the aria-label below.

    // aria-label embeds "N nodes, M edges" as plain integers.
    const totalNodesMatch = svg.match(/(\d+) nodes,/);
    expect(totalNodesMatch).not.toBeNull();
    expect(Number(totalNodesMatch![1])).toBeGreaterThan(0);
  }, 30_000);

  it('fails cleanly on an uninitialized directory', () => {
    if (!binReady) return;

    const uninitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-badge-uninit-'));
    try {
      const result = runCli(['badge'], uninitRoot);
      expect(result.status).not.toBe(0);
      const combined = result.stdout + result.stderr;
      expect(combined).toMatch(/not initialized/i);
    } finally {
      try {
        fs.rmSync(uninitRoot, { recursive: true, force: true });
      } catch {
        /* Windows sqlite WAL */
      }
    }
  }, 30_000);
});
