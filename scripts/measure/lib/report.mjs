/**
 * Report envelope shared by all three metric scripts.
 *
 * stdout gets the pretty-printed JSON; --out writes the same payload to a
 * file. Downstream consumers (1-1-4/1-1-5 evidence docs) read either form.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export function emitReport({ metric, repo, ref, value, evidence, out }) {
  const payload = {
    metric,
    repo: repo.slug,
    ref,
    measuredAt: new Date().toISOString(),
    value,
    evidence,
  };
  const text = JSON.stringify(payload, null, 2);
  process.stdout.write(text + '\n');
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text + '\n', 'utf-8');
  }
  return payload;
}
