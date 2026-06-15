import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'phase9-vs1-graph-probe.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

describe('Phase 9 VS-1 graph probe', () => {
  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit' });
    }
  }, 60_000);

  it('classifies absent VS-1 symbols as missing-symbol instead of graph connectivity', async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-phase9-probe-'));
    try {
      fs.writeFileSync(
        path.join(project, 'flow.ts'),
        [
          'export function start() {',
          '  return 1;',
          '}',
        ].join('\n') + '\n',
      );
      const cg = CodeGraph.initSync(project);
      await cg.indexAll({ force: true });
      cg.close();

      const result = spawnSync(
        process.execPath,
        [SCRIPT, '--repo', project, '--query', 'AbstractExtensionService start'],
        { cwd: REPO_ROOT, encoding: 'utf-8' },
      );

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      const parsed = JSON.parse(result.stdout) as {
        classifications: Array<{ token: string; classification: string; candidateCount: number }>;
        summary: { primaryClassification: string };
      };

      expect(parsed.summary.primaryClassification).toBe('missing-symbol');
      expect(parsed.classifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            token: 'AbstractExtensionService',
            classification: 'missing-symbol',
            candidateCount: 0,
          }),
          expect.objectContaining({
            token: 'start',
            classification: 'explore-planner-pathfinding-gap',
            candidateCount: 1,
          }),
        ]),
      );
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
