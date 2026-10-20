#!/usr/bin/env node
/**
 * setup.mjs — measure first-time setup latency on a real repo.
 *
 * Payload:
 *   cloneMs       — shallow+sparse clone wall-clock (0 when --corpus-root has
 *                   a cached clone; pass --no-keep between runs to force
 *                   a cold measurement)
 *   indexMs       — zcodegraph index wall-clock
 *   totalMs       — end-to-end wall-clock (clone + index)
 *   filesIndexed  — sanity check: files in the resulting graph
 *   nodesTotal    — sanity check: nodes in the resulting graph
 *
 * Usage:
 *   node scripts/measure/setup.mjs <github-url> [--ref sha] [--sparse path]
 *     [--out report.json] [--corpus-root dir] [--no-keep] [--quiet]
 */

import { parseArgs, log, fail } from './lib/args.mjs';
import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { openDb, probeGraph } from './lib/probe.mjs';
import { emitReport } from './lib/report.mjs';

function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  const clone = ensureClone(args);
  log(args, `clone: ${clone.sha} (${clone.durationMs}ms, reused=${clone.reusedClone})`);

  const idx = runIndex({ repoDir: clone.repoDir, quiet: args.quiet });
  log(args, `index: ${idx.dbPath} (${idx.durationMs}ms)`);

  const db = openDb(idx.dbPath);
  let graph;
  try {
    graph = probeGraph(db);
  } finally {
    db.close();
  }

  const totalMs = Date.now() - startedAt;

  emitReport({
    metric: 'setup',
    repo: args.repo,
    ref: clone.sha,
    value: {
      cloneMs: clone.durationMs,
      indexMs: idx.durationMs,
      totalMs,
      filesIndexed: graph.files.total,
      nodesTotal: graph.nodes.total,
      edgesTotal: graph.edges.total,
      reusedClone: clone.reusedClone,
    },
    evidence: {
      corpusDir: clone.repoDir,
      dbPath: idx.dbPath,
      cold: !clone.reusedClone,
    },
    out: args.out,
  });
}

try {
  main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
