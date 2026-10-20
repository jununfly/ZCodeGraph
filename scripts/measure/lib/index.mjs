/**
 * zcodegraph index runner for measurement scripts.
 *
 * Invokes `node dist/bin/zcodegraph.js index <repoDir>` and returns the
 * wall-clock time plus the path to the resulting `.zcodegraph/index.db`.
 *
 * The CLI must already be built (`npm run build`). We do NOT rebuild here —
 * the scripts are meant to measure the CLI as-shipped, not the local tree.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

export function runIndex({ repoDir, quiet }) {
  const args = { quiet };
  if (!fs.existsSync(BIN)) {
    throw new Error(
      `dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` before measuring.`,
    );
  }

  const start = Date.now();
  log(args, `indexing ${repoDir}`);

  execFileSync(
    process.execPath,
    [BIN, 'index', repoDir],
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
        CODEGRAPH_NO_DAEMON: '1',
        CODEGRAPH_NO_RELAUNCH: '1',
      },
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  const dbPath = path.join(repoDir, '.zcodegraph', 'zcodegraph.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`index completed but ${dbPath} is missing`);
  }

  return {
    dbPath,
    durationMs: Date.now() - start,
  };
}
