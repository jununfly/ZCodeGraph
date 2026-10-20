#!/usr/bin/env node
/**
 * dead-code.mjs — measure dead-code ratio on a real-world repo.
 *
 * Formula (mirrors 1-1-6 D1):
 *   deadPct = deadFunctions / totalFunctions * 100
 * where deadFunctions = function/method nodes with zero incoming AND
 * outgoing `calls` edges.
 *
 * Usage:
 *   node scripts/measure/dead-code.mjs <github-url> [--ref sha] [--sparse path]
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

  const deadPct =
    graph.functions.total > 0
      ? Math.round((graph.functions.dead / graph.functions.total) * 1000) / 10
      : 0;

  emitReport({
    metric: 'dead-code',
    repo: args.repo,
    ref: clone.sha,
    value: {
      deadPct,
      deadFunctions: graph.functions.dead,
      totalFunctions: graph.functions.total,
    },
    evidence: {
      corpusDir: clone.repoDir,
      dbPath: idx.dbPath,
      filesIndexed: graph.files.total,
      nodesTotal: graph.nodes.total,
      edgesTotal: graph.edges.total,
      cloneDurationMs: clone.durationMs,
      indexDurationMs: idx.durationMs,
      totalDurationMs: Date.now() - startedAt,
      reusedClone: clone.reusedClone,
    },
    out: args.out,
  });
}

try {
  main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
