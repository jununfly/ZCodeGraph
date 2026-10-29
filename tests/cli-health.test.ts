/**
 * zcodegraph health — isolated-fixture e2e
 *
 * Builds a small TypeScript fixture with a known graph shape, runs the real
 * CLI end-to-end (`index` then `health`), and asserts:
 *   - exit code 0
 *   - human output carries a letter grade + dimensions + scale + hidden costs
 *   - `--json` produces a parseable payload with the expected keys
 *   - `--md` produces a Markdown report with the grade and a dimension table
 *   - determinism: two consecutive `health --json` runs produce identical
 *     score/grade/dimensions (generatedAt may differ, so we exclude it)
 *
 * The fixture is small enough to index in <10s on every OS, but rich enough
 * to exercise: imports edges, calls edges, a god-file-in-the-making, and at
 * least one orphan node (a function nothing calls).
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
  // Nothing calls this — should show up as a dead function.
  return -1;
}

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  multiply(a: number, b: number): number {
    return a * b;
  }
}
`,
    'logger.ts': `export class Logger {
  info(msg: string): void {
    console.log('[INFO]', msg);
  }
  error(msg: string): void {
    console.error('[ERROR]', msg);
  }
}
`,
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(src, name), content, 'utf-8');
  }
}

describe('zcodegraph health (isolated fixture)', () => {
  let fixtureRoot = '';
  let binReady = false;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      throw new Error(
        `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before this suite.`,
      );
    }
    binReady = true;

    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-health-'));
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
        // Windows: SQLite WAL sometimes lingers; the OS will reap the temp dir.
      }
    }
  });

  it('exits 0 and prints an A-F grade with all six dimensions', () => {
    if (!binReady) return;

    const result = runCli(['health'], fixtureRoot);
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    // Grade line contains a letter A-F and "N/100"
    expect(result.stdout).toMatch(/Health:/);
    expect(result.stdout).toMatch(/[A-F]/);
    expect(result.stdout).toMatch(/\(\d+\/100\)/);

    // All six dimensions are listed
    expect(result.stdout).toContain('Dead code %');
    expect(result.stdout).toContain('Circular import SCCs');
    expect(result.stdout).toContain('God files');
    expect(result.stdout).toContain('coupling');
    expect(result.stdout).toContain('Long function %');
    expect(result.stdout).toContain('Orphan node %');

    // Scale + hidden costs sections
    expect(result.stdout).toContain('Scale');
    expect(result.stdout).toContain('Hidden costs');
    expect(result.stdout).toContain('files');
    expect(result.stdout).toContain('functions');
    expect(result.stdout).toContain('languages');
  }, 30_000);

  it('--json emits a parseable payload with score/grade/dimensions/scale/hiddenCosts', () => {
    if (!binReady) return;

    const result = runCli(['health', '--json'], fixtureRoot);
    expect(result.status, `stderr:\n${result.stderr}`).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(typeof payload.score).toBe('number');
    expect(payload.score).toBeGreaterThanOrEqual(0);
    expect(payload.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(payload.grade);

    expect(Array.isArray(payload.dimensions)).toBe(true);
    expect(payload.dimensions.length).toBe(6);
    const dimIds = payload.dimensions.map((d: { id: string }) => d.id).sort();
    expect(dimIds).toEqual([
      'circular_imports',
      'coupling',
      'dead_code',
      'god_files',
      'long_functions',
      'orphan_nodes',
    ]);

    for (const d of payload.dimensions) {
      expect(typeof d.raw).toBe('number');
      expect(typeof d.deduction).toBe('number');
      expect(typeof d.cap).toBe('number');
      expect(d.deduction).toBeLessThanOrEqual(d.cap);
    }

    expect(payload.scale).toBeDefined();
    expect(payload.scale.files).toBe(3);
    expect(payload.scale.functions).toBeGreaterThan(0);
    expect(payload.scale.languages).toBeGreaterThan(0);

    expect(payload.hiddenCosts).toBeDefined();
    expect(typeof payload.hiddenCosts.circularIssues).toBe('number');
    expect(typeof payload.hiddenCosts.deadPct).toBe('number');
    expect(typeof payload.hiddenCosts.avgCoupling).toBe('number');

    expect(typeof payload.projectRoot).toBe('string');
    expect(typeof payload.generatedAt).toBe('string');
  }, 30_000);

  it('--md emits a Markdown report with the grade and dimension table', () => {
    if (!binReady) return;

    const result = runCli(['health', '--md'], fixtureRoot);
    expect(result.status, `stderr:\n${result.stderr}`).toBe(0);

    expect(result.stdout).toContain('# ZCodeGraph Health Report');
    expect(result.stdout).toMatch(/## Grade: \*\*[A-F]\*\* \(\d+\/100\)/);
    expect(result.stdout).toContain('| Dimension | Raw | Deduction | Cap | Suggestion |');
    expect(result.stdout).toContain('Dead code %');
    expect(result.stdout).toContain('## Scale');
    expect(result.stdout).toContain('## Hidden costs');
  }, 30_000);

  it('is deterministic: two consecutive --json runs agree on score/grade/dimensions', () => {
    if (!binReady) return;

    const a = runCli(['health', '--json'], fixtureRoot);
    const b = runCli(['health', '--json'], fixtureRoot);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);

    const pa = JSON.parse(a.stdout);
    const pb = JSON.parse(b.stdout);
    expect(pa.score).toBe(pb.score);
    expect(pa.grade).toBe(pb.grade);
    expect(JSON.stringify(pa.dimensions)).toBe(JSON.stringify(pb.dimensions));
    expect(JSON.stringify(pa.scale)).toBe(JSON.stringify(pb.scale));
    expect(JSON.stringify(pa.hiddenCosts)).toBe(JSON.stringify(pb.hiddenCosts));
  }, 30_000);

  it('fails cleanly on an uninitialized directory', () => {
    if (!binReady) return;

    const uninitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-health-uninit-'));
    try {
      const result = runCli(['health'], uninitRoot);
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
