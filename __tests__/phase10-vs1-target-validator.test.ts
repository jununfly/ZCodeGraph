import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'phase10-vs1-target-validator.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

const EXPECTED_SYMBOLS = [
  'AbstractExtensionService',
  '_createExtensionHostManager',
  '_doCreateExtensionHostManager',
  'ExtensionHostManager',
  'start',
  'ExtensionHostMain',
  'MainThreadExtensionService',
];

async function makeIndexedProject(source: string): Promise<string> {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-phase10-validator-'));
  fs.writeFileSync(path.join(project, 'flow.ts'), source);
  const cg = CodeGraph.initSync(project);
  await cg.indexAll({ force: true });
  cg.close();
  return project;
}

describe('Phase 10 VS-1 corrected target validator', () => {
  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit' });
    }
  }, 60_000);

  it('fails closed when any expected VS-1 symbol is absent', async () => {
    const project = await makeIndexedProject('export function start() { return 1; }\n');
    try {
      const result = spawnSync(process.execPath, [SCRIPT, '--repo', project], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      const parsed = JSON.parse(result.stdout) as {
        valid: boolean;
        sufficiencySmokeAllowed: boolean;
        missingSymbols: string[];
      };

      expect(parsed.valid).toBe(false);
      expect(parsed.sufficiencySmokeAllowed).toBe(false);
      expect(parsed.missingSymbols).toEqual(
        EXPECTED_SYMBOLS.filter((symbol) => symbol !== 'start'),
      );
      expect(result.stderr).toContain('sufficiency smoke must not run');
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  it('passes when all expected symbols are present and records start ambiguity', async () => {
    const project = await makeIndexedProject([
      'export abstract class AbstractExtensionService {',
      '  _createExtensionHostManager() { return this._doCreateExtensionHostManager(); }',
      '  _doCreateExtensionHostManager() { return new ExtensionHostManager(); }',
      '}',
      'export class ExtensionHostManager { start() { return new ExtensionHostMain(); } }',
      'export class ExtensionHostMain { start() { return new MainThreadExtensionService(); } }',
      'export class MainThreadExtensionService {}',
    ].join('\n') + '\n');
    try {
      const result = spawnSync(process.execPath, [SCRIPT, '--repo', project], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      const parsed = JSON.parse(result.stdout) as {
        valid: boolean;
        sufficiencySmokeAllowed: boolean;
        missingSymbols: string[];
        symbols: Array<{ token: string; candidateCount: number }>;
        start: { ambiguityCount: number };
      };

      expect(parsed.valid).toBe(true);
      expect(parsed.sufficiencySmokeAllowed).toBe(true);
      expect(parsed.missingSymbols).toEqual([]);
      for (const symbol of EXPECTED_SYMBOLS) {
        expect(parsed.symbols).toContainEqual(expect.objectContaining({ token: symbol }));
      }
      expect(parsed.start.ambiguityCount).toBeGreaterThan(1);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
