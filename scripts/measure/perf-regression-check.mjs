#!/usr/bin/env node
/**
 * perf-regression-check.mjs — architecture regression red-line check (roadmap 1-2-8-2).
 *
 * Re-measures the frozen corpus with perf-baseline.mjs, compares the current
 * medians against a committed baseline artifact, and fails (exit 1) when any
 * red line is crossed:
 *
 *   index wall-time regression  > 15%   (frozen by roadmap exit criterion)
 *   explore latency regression  > 20%   (roadmap 1-2-8 decision 2026-10-22)
 *
 * Usage:
 *   node scripts/measure/perf-regression-check.mjs --baseline <baseline.json>
 *     [--repetitions <n>] [--corpus-root <dir>] [--out <current.json>] [--quiet]
 *
 * The baseline artifact selects the corpus (repo + pinned ref) and the
 * sparse cones are not re-applied (baseline corpus is full-tree by design).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureClone } from './lib/clone.mjs';
import { emitReport } from './lib/report.mjs';
import { normalizeRepo, log, fail } from './lib/args.mjs';
import { loadContractQueries, measureCorpus, median } from './perf-baseline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');
const DEFAULT_CONTRACT = path.join(
  REPO_ROOT, 'docs', 'contracts', 'architecture-regression-baseline-v1.md',
);

const INDEX_RED_LINE = 0.15;
const EXPLORE_RED_LINE = 0.20;

function parseArgs(argv) {
  const args = {
    baseline: null,
    repetitions: 3,
    corpusRoot: 'C:/workspace/measure-corpus',
    out: null,
    quiet: false,
    contract: DEFAULT_CONTRACT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--baseline') args.baseline = path.resolve(argv[++i]);
    else if (a === '--repetitions') {
      args.repetitions = Number.parseInt(argv[++i], 10);
      if (!Number.isInteger(args.repetitions) || args.repetitions < 1) {
        throw new Error('--repetitions must be a positive integer');
      }
    }
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--contract') args.contract = path.resolve(argv[++i]);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (!args.baseline) throw new Error('--baseline <path> is required');
  return args;
}

export function evaluateRegression({ baselineValue, currentValue }) {
  const indexRegression =
    (currentValue.indexMedianMs - baselineValue.indexMedianMs) / baselineValue.indexMedianMs;
  const exploreRegression =
    (currentValue.exploreMedianMs - baselineValue.exploreMedianMs) / baselineValue.exploreMedianMs;
  const checks = [
    {
      metric: 'index',
      redLine: INDEX_RED_LINE,
      baselineMs: baselineValue.indexMedianMs,
      currentMs: currentValue.indexMedianMs,
      regression: indexRegression,
      pass: indexRegression <= INDEX_RED_LINE,
    },
    {
      metric: 'explore',
      redLine: EXPLORE_RED_LINE,
      baselineMs: baselineValue.exploreMedianMs,
      currentMs: currentValue.exploreMedianMs,
      regression: exploreRegression,
      pass: exploreRegression <= EXPLORE_RED_LINE,
    },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    fail(err.message);
  }
  if (!fs.existsSync(BIN)) {
    fail(`dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` first.`);
  }
  if (!fs.existsSync(args.baseline)) {
    fail(`baseline artifact not found at ${args.baseline}`);
  }

  const baseline = JSON.parse(fs.readFileSync(args.baseline, 'utf-8'));
  if (baseline.metric !== 'architecture-regression-baseline') {
    fail(`baseline artifact metric is '${baseline.metric}', expected 'architecture-regression-baseline'`);
  }
  const repo = normalizeRepo(baseline.repo);
  const ref = baseline.ref;
  const queries = loadContractQueries(args.contract);

  log(args, `corpus ${repo.slug} @ ${String(ref).slice(0, 12)} (from baseline artifact)`);
  const cloneInfo = ensureClone({
    repo,
    ref,
    sparse: [],
    corpusRoot: args.corpusRoot,
    quiet: args.quiet,
  });

  const measured = measureCorpus({
    repo,
    repoDir: cloneInfo.repoDir,
    repetitions: args.repetitions,
    queries,
    args,
  });

  const currentValue = {
    repetitions: args.repetitions,
    indexMedianMs: measured.index.medianMs,
    indexRunsMs: measured.index.runs,
    exploreMedianMs: measured.explore.medianMs,
    exploreQueries: measured.explore.queries,
  };

  const verdict = evaluateRegression({ baselineValue: baseline.value, currentValue });

  for (const c of verdict.checks) {
    const line =
      `[red-line] ${c.metric}: baseline=${c.baselineMs}ms current=${c.currentMs}ms ` +
      `regression=${fmtPct(c.regression)} red-line=${fmtPct(c.redLine)} → ${c.pass ? 'PASS' : 'FAIL'}`;
    (c.pass ? process.stdout : process.stderr).write(line + '\n');
  }

  emitReport({
    metric: 'architecture-regression-check',
    repo,
    ref: cloneInfo.sha,
    value: {
      pass: verdict.pass,
      checks: verdict.checks,
      current: currentValue,
      baseline: {
        artifact: path.relative(REPO_ROOT, args.baseline),
        measuredAt: baseline.measuredAt,
        value: baseline.value,
      },
    },
    evidence: {
      contract: path.relative(REPO_ROOT, args.contract),
      corpusDir: cloneInfo.repoDir,
      reusedClone: cloneInfo.reusedClone,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
    },
    out: args.out,
  });

  if (!verdict.pass) {
    process.stderr.write('[red-line] REGRESSION RED LINE CROSSED — see checks above\n');
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
