import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { verifyArmProvenance } from './java-overload-paired-diagnostics.mjs';

const BEFORE = '53474b753c60ad459151fef45fd257fba6f809b2';
const AFTER = '827bfa18d57e269c431aa44835dd399a95afef34';

function revisionMarker(root, name, revision) {
  const directory = name === '.zcg-native-revision'
    ? path.join(root, 'target', 'debug')
    : root;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, name), `${revision}\n`);
}

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
