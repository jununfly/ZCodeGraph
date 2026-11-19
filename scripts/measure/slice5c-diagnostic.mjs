#!/usr/bin/env node
/**
 * slice5c-diagnostic.mjs — Slice 5c-3 diagnostic raw-sample recorder.
 *
 * Authority: docs/contracts/universal-structural-explore-v1.md §671-§675
 * Roadmap: 1-9-9-3 / 5c-3.
 *
 * Reads the perf-regression-check current-run JSON (produced by 5c-2) and
 * augments it with environment metadata + derived diagnostic observations
 * (cold/warm p95, peak RSS if available, DB ops / files read if the
 * harness exposes them). The output is a single diagnostic artifact under
 * docs/evidence/. It is NOT a hard gate: no thresholds are asserted, no
 * pass/fail is computed. Raw samples are recorded so a future registered
 * baseline can be derived from real data, not invented.
 *
 * Usage:
 *   node scripts/measure/slice5c-diagnostic.mjs \
 *     --current docs/evidence/2026-11-19-slice5c-perf-current.json \
 *     --baseline docs/baselines/architecture-regression-v1.json \
 *     --out docs/evidence/2026-11-19-slice5c-diagnostic.json
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

function parseArgs(argv) {
  const args = { current: null, baseline: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--current') args.current = path.resolve(argv[++i]);
    else if (a === '--baseline') args.baseline = path.resolve(argv[++i]);
    else if (a === '--out') args.out = path.resolve(argv[++i]);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (!args.current || !args.baseline || !args.out) {
    throw new Error('--current, --baseline, --out are required');
  }
  return args;
}

/** Percentile (linear interpolation). p in [0, 100]. */
function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(values) {
  return percentile(values, 50);
}

function collectEnvironment() {
  const cpus = os.cpus();
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpuModel: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    totalMemBytes: os.totalmem(),
    freeMemBytes: os.freemem(),
    // Hostname is recorded so a future baseline can be tied back to the
    // same machine; no PII beyond the local hostname.
    hostname: os.hostname(),
    recordedAt: new Date().toISOString(),
  };
}

function collectGitIdentity() {
  // Cheap, no spawn: read .git/HEAD + the ref it points to.
  try {
    const headPath = path.join(REPO_ROOT, '.git', 'HEAD');
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5);
      const refPath = path.join(REPO_ROOT, '.git', ref.replace(/\//g, path.sep));
      if (fs.existsSync(refPath)) {
        return { head, ref, sha: fs.readFileSync(refPath, 'utf8').trim() };
      }
      return { head, ref, sha: null };
    }
    return { head, ref: null, sha: head };
  } catch {
    return { head: null, ref: null, sha: null };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const current = JSON.parse(fs.readFileSync(args.current, 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(args.baseline, 'utf8'));

  // Pull raw samples from the current run. perf-regression-check nests the
  // raw samples under `value.current` (the outer `value` holds the
  // red-line check verdicts, not the samples).
  const currentSamples = current.value?.current ?? current.value ?? {};
  const indexRuns = currentSamples.indexRunsMs ?? [];
  const exploreQueries = currentSamples.exploreQueries ?? [];
  const allExploreRuns = exploreQueries.flatMap((q) => q.runs ?? []);

  // Derived diagnostics — raw samples + percentiles, no thresholds.
  const diagnostics = {
    indexWallTime: {
      unit: 'ms',
      samples: indexRuns,
      repetitions: indexRuns.length,
      medianMs: median(indexRuns),
      p95Ms: percentile(indexRuns, 95),
      minMs: indexRuns.length > 0 ? Math.min(...indexRuns) : null,
      maxMs: indexRuns.length > 0 ? Math.max(...indexRuns) : null,
    },
    exploreWallTime: {
      unit: 'ms',
      // All runs across all queries, pooled. Per-query medians are in
      // current.value.exploreQueries if a future baseline needs them.
      samples: allExploreRuns,
      repetitions: allExploreRuns.length,
      medianMs: median(allExploreRuns),
      p95Ms: percentile(allExploreRuns, 95),
      minMs: allExploreRuns.length > 0 ? Math.min(...allExploreRuns) : null,
      maxMs: allExploreRuns.length > 0 ? Math.max(...allExploreRuns) : null,
    },
    // Placeholders for observations the current perf harness does not
    // expose. Recorded as null so the artifact is honest about what was
    // and was not measured. A future harness revision can fill these in.
    dbOps: null,
    filesRead: null,
    bytesRead: null,
    peakRssBytes: null,
    notes: [
      'dbOps / filesRead / bytesRead / peakRssBytes are not exposed by the current perf-baseline harness.',
      'Recorded as null to keep the artifact honest; a future harness revision can populate them.',
      'This artifact is diagnostic only. No thresholds, no pass/fail. See contract §671-§675.',
    ],
  };

  // Compare medians to the registered baseline (no red-line assertion —
  // that is perf-regression-check's job, already done in 5c-2).
  const baselineIndexMs = baseline.value?.indexMedianMs ?? null;
  const baselineExploreMs = baseline.value?.exploreMedianMs ?? null;
  const currentIndexMs = diagnostics.indexWallTime.medianMs;
  const currentExploreMs = diagnostics.exploreWallTime.medianMs;
  const comparison = {
    baselineIndexMedianMs: baselineIndexMs,
    currentIndexMedianMs: currentIndexMs,
    indexDeltaRatio: baselineIndexMs && currentIndexMs
      ? (currentIndexMs - baselineIndexMs) / baselineIndexMs
      : null,
    baselineExploreMedianMs: baselineExploreMs,
    currentExploreMedianMs: currentExploreMs,
    exploreDeltaRatio: baselineExploreMs && currentExploreMs
      ? (currentExploreMs - baselineExploreMs) / baselineExploreMs
      : null,
  };

  const artifact = {
    metric: 'slice5c-diagnostic',
    schema: 'slice5c-diagnostic-v1',
    recordedAt: new Date().toISOString(),
    environment: collectEnvironment(),
    git: collectGitIdentity(),
    baseline: {
      path: path.relative(REPO_ROOT, args.baseline),
      repo: baseline.repo,
      ref: baseline.ref,
      measuredAt: baseline.measuredAt,
    },
    current: {
      path: path.relative(REPO_ROOT, args.current),
      repo: current.repo,
      ref: current.ref,
      measuredAt: current.measuredAt,
    },
    diagnostics,
    comparison,
    // Hard-gate fields are explicitly absent — this is not a gate.
    hardGate: null,
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  // Print a short human summary so the CLI run is self-documenting.
  console.log(`diagnostic written: ${path.relative(REPO_ROOT, args.out)}`);
  console.log(`  index median=${currentIndexMs}ms p95=${diagnostics.indexWallTime.p95Ms}ms n=${indexRuns.length}`);
  console.log(`  explore median=${currentExploreMs}ms p95=${diagnostics.exploreWallTime.p95Ms}ms n=${allExploreRuns.length}`);
  console.log(`  baseline index=${baselineIndexMs}ms explore=${baselineExploreMs}ms`);
  console.log(`  delta index=${comparison.indexDeltaRatio?.toFixed(4) ?? 'n/a'} explore=${comparison.exploreDeltaRatio?.toFixed(4) ?? 'n/a'}`);
}

main();
