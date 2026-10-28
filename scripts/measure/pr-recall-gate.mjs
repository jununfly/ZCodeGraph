#!/usr/bin/env node
/**
 * pr-recall-gate.mjs — CI merge-gate asserting `zcodegraph affected --pr`
 * does not regress below the 1-1-5 baseline (roadmap 1-3-2).
 *
 * Why this exists
 * ---------------
 * 1-1-5 measured `recallUnionIndexable = 1.000` on 60 real merged PRs
 * (3 repos × 20 PRs) at the P-1 sprint (see
 * research/archive/evidence/2026-10-20-pr-recall-baseline.{md,json}). REFINED-PLAN §7
 * defines the merge-gate metric `pr-impact-recall ≥ 0.85 ∧ ≥ baseline − 2pp`.
 * Since baseline = 1.000, the effective threshold is max(0.85, 1.000 − 0.02)
 * = 0.98 per pinned PR sample.
 *
 * 1-3-2 chose the "no re-run, CI gate only" path (decide 2026-10-25):
 * future Rust-migration / resolver changes are the regression risk; the
 * current codebase already satisfies recall. So instead of re-running the
 * full 60-PR baseline in CI, we pin a small sample of representative PRs
 * (1-2 per repo, all recallUnionIndexable = 1.0 in baseline) and re-run
 * them on every PR/merge. Any regression in the resolver / affected
 * pipeline that drops a pinned PR below the threshold fails CI.
 *
 * What it does
 * ------------
 * For each pinned (repo, baseSha, mergeSha) tuple:
 *   1. ensureClone the repo at the pinned cloneSha (reuses corpus cache).
 *   2. ensureCommit both base and merge shas (fetch --depth=1 if missing).
 *   3. git diff --name-only base..merge → mergedFiles (ground truth).
 *   4. git checkout --detach mergeSha, runIndex, run affected --pr --json.
 *   5. recall = |affectedUnion ∩ mergedIndexable| / |mergedIndexable|.
 *      - mergedIndexable = mergedFiles filtered to indexable source
 *        extensions (same regex as pr-recall-baseline.mjs).
 *      - affectedUnion = affectedSource ∪ affectedTests (partition-aware).
 *   6. Fail (exit 1) if any pinned PR's recall < threshold.
 *
 * Usage
 * -----
 *   node scripts/measure/pr-recall-gate.mjs [--corpus-root <dir>]
 *                                           [--threshold <f>] [--quiet]
 *
 * Defaults:
 *   --corpus-root /tmp/measure-corpus  (CI) or C:/workspace/measure-corpus
 *   --threshold   max(0.85, baseline − 0.02) where baseline comes from
 *                 research/archive/evidence/2026-10-20-pr-recall-baseline.json
 *
 * Pinned PRs (from 1-1-5 baseline JSON, all recallUnionIndexable = 1.0):
 *   expressjs/express            #7518 base=6d2df035 merge=a419aa73 (idx=3)
 *                                #7494 base=7ef98448 merge=6d2df035 (idx=7)
 *   pallets/flask                #6168 base=d73fa1cd merge=728c5e44 (idx=7)
 *                                #6096 base=514fc6b3 merge=05e9c6bd (idx=4)
 *   spring-projects/spring-petclinic #2672 base=818c4136 merge=500158f7 (idx=7)
 *                                    #2663 base=818c4136 merge=f3c74834 (idx=4)
 *
 * We pick PRs with mergedIndexableCount >= 2 so the recall denominator is
 * meaningful; small single-file PRs would pass trivially.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { log } from './lib/args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');
const BASELINE_JSON = path.join(
  REPO_ROOT,
  'docs',
  'evidence',
  '2026-10-20-pr-recall-baseline.json',
);

// Pinned sample — see file header for rationale. `cloneSha` matches the
// baseline run's cloneSha so ensureClone hits the same commit the baseline
// was produced against; baseSha/mergeSha are the per-PR pair the baseline
// measured 1.0 recallUnionIndexable on.
const PINNED = [
  {
    slug: 'expressjs/express',
    sparse: ['lib', 'examples'],
    defaultBranch: 'master',
    cloneSha: '0dee2c52c7c873498f8ed7d8ee4ddd0a04d3ada8',
    prs: [
      { pr: 7518, baseSha: '6d2df035a95f3d1002be3e29997b7a4bfe976b5f', mergeSha: 'a419aa7350389a275ab45fde2e849ed1f02449ef' },
      { pr: 7494, baseSha: '7ef98448f8b38099ab1ded55e458538ad47a51e7', mergeSha: '6d2df035a95f3d1002be3e29997b7a4bfe976b5f' },
    ],
  },
  {
    slug: 'pallets/flask',
    sparse: ['src', 'tests', 'examples'],
    defaultBranch: 'main',
    cloneSha: 'd086db856be187255b8ec61ef409357393020f32',
    prs: [
      { pr: 6168, baseSha: 'd73fa1cdcbd8b1465c151db8924ba58b1dd14e35', mergeSha: '728c5e440af704a786384159184f695cf04ecbe7' },
      { pr: 6096, baseSha: '514fc6b3e8402e4c646d5284e97a4f0ab50a7c4b', mergeSha: '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7' },
    ],
  },
  {
    slug: 'spring-projects/spring-petclinic',
    sparse: ['src'],
    defaultBranch: 'main',
    cloneSha: '500158f732419217507c7656904b8e6aa1bcc0d6',
    prs: [
      { pr: 2672, baseSha: '818c4136ea971c21674525f9053de0d9c7ad8cfe', mergeSha: '500158f732419217507c7656904b8e6aa1bcc0d6' },
      { pr: 2663, baseSha: '818c4136ea971c21674525f9053de0d9c7ad8cfe', mergeSha: 'f3c74834e31079f69855e9c9eddb34fceb40a8d9' },
    ],
  },
];

function parseArgs(argv) {
  const args = {
    corpusRoot: process.platform === 'win32' ? 'C:/workspace/measure-corpus' : '/tmp/measure-corpus',
    threshold: null,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--threshold') args.threshold = Number(argv[++i]);
    else if (a === '--quiet') args.quiet = true;
    else throw new Error(`unknown flag: ${a}`);
  }
  return args;
}

function git(repoDir, argv) {
  return execFileSync('git', ['-C', repoDir, ...argv], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  }).trim();
}

function hasCommit(repoDir, sha) {
  try {
    git(repoDir, ['cat-file', '-e', sha]);
    return true;
  } catch {
    return false;
  }
}

function ensureCommit(repoDir, sha, args) {
  if (hasCommit(repoDir, sha)) return;
  log(args, `  fetching ${sha.slice(0, 12)} (missing locally)`);
  git(repoDir, ['fetch', 'origin', '--depth=1', sha]);
}

function diffNames(repoDir, baseSha, mergeSha) {
  const out = git(repoDir, ['diff', '--name-only', `${baseSha}..${mergeSha}`]);
  if (!out) return [];
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function runAffected(repoDir, baseSha, mergeSha) {
  const stdout = execFileSync(
    process.execPath,
    [BIN, 'affected', '--pr', `${baseSha}..${mergeSha}`, '--json'],
    {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
        CODEGRAPH_NO_DAEMON: '1',
        CODEGRAPH_NO_RELAUNCH: '1',
      },
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

function isIndexableSource(rel) {
  return /\.(c|cc|cpp|cxx|h|hh|hpp|cs|go|java|kt|kts|m|mm|php|py|rb|rs|scala|swift|ts|tsx|js|jsx|mts|cts|dart|lua|pas|pp|dpr|dfm|vue|svelte)$/.test(
    rel,
  );
}

function intersectCount(a, bSet) {
  let n = 0;
  for (const x of a) if (bSet.has(x)) n++;
  return n;
}

function measurePr(repoDir, pinned, args) {
  const { pr, baseSha, mergeSha } = pinned;
  log(args, `  PR #${pr}: ${baseSha.slice(0, 8)}..${mergeSha.slice(0, 8)}`);

  ensureCommit(repoDir, baseSha, args);
  ensureCommit(repoDir, mergeSha, args);

  const mergedFiles = diffNames(repoDir, baseSha, mergeSha);
  const mergedIndexable = mergedFiles.filter(isIndexableSource);
  const mergedIndexableSet = new Set(mergedIndexable);

  git(repoDir, ['checkout', '--quiet', '--detach', mergeSha]);
  runIndex({ repoDir, quiet: true });

  const affected = runAffected(repoDir, baseSha, mergeSha);
  const affectedUnion = [
    ...(affected.affectedSource ?? []),
    ...(affected.affectedTests ?? []),
  ];

  const tp = intersectCount(affectedUnion, mergedIndexableSet);
  const recall =
    mergedIndexable.length === 0 ? null : tp / mergedIndexable.length;

  return {
    pr,
    baseSha,
    mergeSha,
    mergedFilesCount: mergedFiles.length,
    mergedIndexableCount: mergedIndexable.length,
    affectedCount: affectedUnion.length,
    recall,
  };
}

function readBaseline() {
  const raw = fs.readFileSync(BASELINE_JSON, 'utf-8');
  const d = JSON.parse(raw);
  return d?.value?.aggregate?.medianRecallUnionIndexableAcrossRepos ?? 1.0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const baseline = readBaseline();
  const threshold =
    args.threshold !== null ? args.threshold : Math.max(0.85, baseline - 0.02);

  log(args, `baseline (1-1-5) = ${baseline.toFixed(4)}`);
  log(args, `threshold (max(0.85, baseline - 0.02)) = ${threshold.toFixed(4)}`);
  log(args, '');

  const failures = [];
  const results = [];

  for (const repo of PINNED) {
    log(args, `=== ${repo.slug} ===`);
    const [owner, name] = repo.slug.split('/');
    // Pin the clone at the baseline's cloneSha so ensureClone fetches the
    // exact commit the baseline used; subsequent per-PR ensureCommit pulls
    // base/merge shas with --depth=1 as needed.
    const { repoDir } = ensureClone({
      repo: {
        owner,
        name,
        slug: repo.slug,
        httpsUrl: `https://github.com/${repo.slug}.git`,
        sshUrl: `git@github.com:${repo.slug}.git`,
        cloneUrl:
          process.env.MEASURE_GIT_PROTOCOL === 'ssh'
            ? `git@github.com:${repo.slug}.git`
            : `https://github.com/${repo.slug}.git`,
      },
      ref: repo.cloneSha,
      sparse: repo.sparse,
      corpusRoot: args.corpusRoot,
      quiet: args.quiet,
    });

    for (const pinned of repo.prs) {
      const r = measurePr(repoDir, pinned, args);
      results.push({ repo: repo.slug, ...r });
      const marker =
        r.recall === null
          ? 'skip (no indexable files)'
          : r.recall >= threshold
            ? `pass (${r.recall.toFixed(3)})`
            : `FAIL (${r.recall.toFixed(3)} < ${threshold.toFixed(3)})`;
      log(args, `    ${marker} — PR #${r.pr}, idx files=${r.mergedIndexableCount}, affected=${r.affectedCount}`);
      if (r.recall !== null && r.recall < threshold) {
        failures.push({ repo: repo.slug, ...r });
      }
    }
    log(args, '');
  }

  // Aggregate line — same metric family as 1-1-5, restricted to pinned sample.
  const measured = results.filter((r) => r.recall !== null);
  const aggregate =
    measured.length === 0
      ? null
      : measured.reduce((acc, r) => acc + r.recall, 0) / measured.length;

  console.log('---');
  console.log(`pinned PRs: ${results.length} (${measured.length} measurable)`);
  if (aggregate !== null) {
    console.log(`mean recallUnionIndexable across pinned sample: ${aggregate.toFixed(4)}`);
  }
  console.log(`threshold: ${threshold.toFixed(4)}`);
  console.log(`baseline (1-1-5): ${baseline.toFixed(4)}`);

  if (failures.length > 0) {
    console.log('');
    console.log(`FAIL: ${failures.length} pinned PR(s) below threshold:`);
    for (const f of failures) {
      console.log(
        `  ${f.repo}#${f.pr}: recall=${f.recall.toFixed(3)} < ${threshold.toFixed(3)}`,
      );
    }
    process.exit(1);
  }

  if (measured.length === 0) {
    console.log('');
    console.log('FAIL: no measurable PRs (all had zero indexable files).');
    process.exit(1);
  }

  console.log('');
  console.log('OK — all pinned PRs meet or exceed the threshold.');
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(2);
});
