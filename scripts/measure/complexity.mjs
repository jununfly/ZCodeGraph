#!/usr/bin/env node
/**
 * complexity.mjs — measure coupling + long-function distribution on a real repo.
 *
 * Payload (mirrors 1-1-6 D4 + D5 + adds function-size distribution):
 *   avgCoupling          — non-contains edges / files
 *   longFnPct            — % of functions with (end_line - start_line) >= 100
 *   fnLines: { p50, p95, max }  — function length distribution
 *   godFiles             — files with node_count >= 100
 *
 * Usage:
 *   node scripts/measure/complexity.mjs <github-url> [--ref sha] [--sparse path]
 *     [--out report.json] [--corpus-root dir] [--no-keep] [--quiet]
 */

import { parseArgs, log, fail } from './lib/args.mjs';
import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { openDb, probeGraph, percentile } from './lib/probe.mjs';
import { emitReport } from './lib/report.mjs';

const LONG_FN_THRESHOLD = 100;

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

  const fnLinesSorted = [...graph.functions.lines].sort((a, b) => a - b);
  const longFns = fnLinesSorted.filter((n) => n >= LONG_FN_THRESHOLD).length;
  const longFnPct =
    graph.functions.total > 0
      ? Math.round((longFns / graph.functions.total) * 1000) / 10
      : 0;

  emitReport({
    metric: 'complexity',
    repo: args.repo,
    ref: clone.sha,
    value: {
      avgCoupling: Math.round(graph.avgCoupling * 100) / 100,
      longFnPct,
      longFns,
      godFiles: graph.files.godFiles,
      fnLines: {
        p50: percentile(fnLinesSorted, 50),
        p95: percentile(fnLinesSorted, 95),
        max: fnLinesSorted.length > 0 ? fnLinesSorted[fnLinesSorted.length - 1] : 0,
      },
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
