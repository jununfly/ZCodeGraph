import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { median, summarize, createArms, verifyArmProvenance } from './java-overload-paired-diagnostics.mjs';

const BEFORE = '53474b753c60ad459151fef45fd257fba6f809b2';
const AFTER = '827bfa18d57e269c431aa44835dd399a95afef34';

function revisionMarker(root, name, revision) {
  const directory = name === '.zcg-native-revision'
    ? path.join(root, 'target', 'debug')
    : root;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, name), `${revision}\n`);
}

test('summarizes two nine-run Explore queries with the architecture metric aggregation', () => {
  const query0 = [200, 210, 220, 230, 240, 250, 260, 270, 280];
  const query1 = [100, 110, 120, 130, 140, 150, 160, 170, 180];
  const rows = Array.from({ length: 9 }, (_, block) => [
    { queryIndex: 0, wallMs: query0[block] },
    { queryIndex: 1, wallMs: query1[block] },
  ]).flat();

  assert.deepEqual(summarize(rows), {
    medianMs: 190,
    rangeMs: [100, 280],
    perQuery: {
      0: { medianMs: 240, rangeMs: [200, 280], runsMs: query0 },
      1: { medianMs: 140, rangeMs: [100, 180], runsMs: query1 },
    },
  });
});

test('runs candidate TypeScript from the copy containing the baseline native', () => {
  const arms = createArms({ builds: '/builds', corpus: '/corpus' });
  const cross = arms.afterTsBeforeCore;
  const expectedRoot = path.join('/builds', 'cross-after-before-native');

  assert.equal(cross.root, expectedRoot);
  assert.equal(cross.cli, path.join(expectedRoot, 'dist', 'bin', 'zcodegraph.js'));
  assert.equal(cross.native, path.join(expectedRoot, 'target', 'debug', 'zcodegraph-core'));
  assert.notEqual(cross.root, arms.after.root);
  assert.equal(cross.cliRevision, AFTER);
  assert.equal(cross.nativeRevision, BEFORE);
});

test('checks candidate TypeScript and baseline native independently', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-paired-provenance-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  revisionMarker(root, '.zcg-diagnostic-revision', AFTER);
  revisionMarker(root, '.zcg-native-revision', BEFORE);

  const arm = {
    root,
    native: path.join(root, 'target', 'debug', 'zcodegraph-core'),
    cliRevision: AFTER,
    nativeRevision: BEFORE,
  };
  verifyArmProvenance('afterTsBeforeCore', arm);

  revisionMarker(root, '.zcg-native-revision', AFTER);
  assert.throws(
    () => verifyArmProvenance('afterTsBeforeCore', arm),
    /afterTsBeforeCore native source mismatch/,
  );
});
