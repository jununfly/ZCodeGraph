/**
 * Resolve the path to the sqlite-vec `vec0` extension binary.
 *
 * vec0 is an optional runtime artifact (the P2 embedding pipeline is opt-in
 * via `ZCG_ENABLE_EMBEDDING=1`). We look in this order:
 *
 *   1. `ZCG_VEC0_PATH` env var — explicit override (CI / dev). Invalid paths
 *      fail fast rather than silently selecting a different binary.
 *   2. `<packageRoot>/vendor/sqlite-vec/vec0.{dll,so,dylib}` — bundled with
 *      the release tarball when the embedding feature is enabled at
 *      packaging time.
 *   3. `<projectRoot>/.zcodegraph/models/vec0.{dll,so,dylib}` — user-supplied
 *      local copy.
 *
 * Returns the absolute path if found, or null when no candidate exists. The
 * embed worker treats null as `embedding-vec0-load-failed` and the queue
 * stays `pending` (ADR-0009 Failure Modes row 4).
 *
 * Roadmap 1-4-29 (runtime). vec0 loading itself lives in `worker.ts`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readTextFlag } from '../config/flags';

/** Per-platform extension filenames in preference order. */
function candidateNames(): string[] {
  if (process.platform === 'win32') return ['vec0.dll'];
  if (process.platform === 'darwin') return ['vec0.dylib', 'vec0.so'];
  return ['vec0.so'];
}

export function getDefaultVec0Path(projectRoot: string): string | null {
  const envOverride = readTextFlag('ZCG_VEC0_PATH');
  if (envOverride !== undefined) {
    if (!fs.existsSync(envOverride) || !fs.statSync(envOverride).isFile()) {
      throw new Error(`ZCG_VEC0_PATH does not exist or is not a file: ${envOverride}`);
    }
    return path.resolve(envOverride);
  }

  // packageRoot = two levels up from dist/embedding/. When running from
  // source (src/embedding/), __dirname is src/embedding and the package
  // root is still two levels up.
  const packageRoot = path.resolve(__dirname, '..', '..');
  const names = candidateNames();
  for (const name of names) {
    const p = path.join(packageRoot, 'vendor', 'sqlite-vec', name);
    if (fs.existsSync(p)) return p;
  }
  for (const name of names) {
    const p = path.join(projectRoot, '.zcodegraph', 'models', name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
