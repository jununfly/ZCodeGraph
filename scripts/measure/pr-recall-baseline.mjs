#!/usr/bin/env node
/**
 * pr-recall-baseline.mjs — PR-level recall/precision baseline for
 * `zcodegraph affected --pr <base>..<head>` (roadmap 1-1-5).
 *
 * For each of three pinned repos (expressjs/express, pallets/flask,
 * spring-projects/spring-petclinic):
 *   1. ensureClone the repo (existing helper, sparse cone from prior runs).
 *   2. Fetch the last N merged PRs against the default branch via `gh api`.
 *      For each PR, record (baseSha, mergeSha).
 *   3. For each PR:
 *      a. Ensure both baseSha and mergeSha are available as commits
 *         (fetch --depth=1 origin <sha> if missing).
 *      b. git diff --name-only <baseSha>..<mergeSha>  → mergedFiles (ground truth).
 *      c. git checkout --detach <mergeSha>; ensure sparse cone still covers
 *         the same directories as the baseline run (lib/, examples/, src/...).
 *      d. runIndex (zcodegraph index) at mergeSha.
 *      e. Run `zcodegraph affected --pr <baseSha>..<mergeSha> --json` and
 *         parse affectedSource/affectedTests.
 *      f. recall = |affectedSource ∩ mergedFiles| / |mergedFiles|
 *         precision = |affectedSource ∩ mergedFiles| / |affectedSource|
 *         (affectedTests reported separately, NOT counted in recall — tests
 *          rarely appear in the PR diff itself.)
 *   4. Aggregate per repo: median recall, median precision, PR count,
 *      PRs with recall == 1.0 / >= 0.5 / < 0.5.
 *
 * Ground truth: `git diff --name-only base..merge` — the actual files
 * changed by the merged PR. This is the strictest available definition of
 * "files that should be flagged as affected".
 *
 * Caveat: the ground truth counts every *modified* file; `affectedSource`
 * reports *transitively impacted* files (the changed file itself plus its
 * dependents). So recall can be < 1.0 when:
 *   - a changed file has no dependents and the CLI only emits dependents,
 *     not the changed file itself; or
 *   - a changed file is outside the indexed language set (e.g. .md).
 * Precision can be < 1.0 because dependents of a changed file are by
 * definition *not* in the merged-files set. This is expected — precision
 * against ground-truth-of-changed-files is NOT a quality signal for a
 * blast-radius tool; we report it for completeness only.
 *
 * Usage:
 *   node scripts/measure/pr-recall-baseline.mjs [--prs <n>] [--out <path>]
 *                                               [--corpus-root <dir>] [--quiet]
 *                                               [--only <slug>]
 *
 * Default: 20 PRs × 3 repos, single JSON report on stdout + --out file.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { emitReport } from './lib/report.mjs';
import { log, fail } from './lib/args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

// Pinned sparse cones per repo — same ones earlier measure scripts used so
// we index the same code surface the existing baselines describe.
const REPOS = [
  {
    slug: 'expressjs/express',
    sparse: ['lib', 'examples'],
    defaultBranch: 'master',
  },
  {
    slug: 'pallets/flask',
    sparse: ['src', 'tests', 'examples'],
    defaultBranch: 'main',
  },
  {
    slug: 'spring-projects/spring-petclinic',
    sparse: ['src'],
    defaultBranch: 'main',
  },
];

function parseArgs(argv) {
  const args = {
    prs: 20,
    out: null,
    corpusRoot: 'C:/workspace/measure-corpus',
    quiet: false,
    only: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prs') args.prs = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--only') args.only = argv[++i];
    else throw new Error(`unknown flag: ${a}`);
  }
  if (!Number.isInteger(args.prs) || args.prs < 1) {
    throw new Error(`--prs must be a positive integer, got ${args.prs}`);
  }
  return args;
}

function git(repoDir, argv, opts = {}) {
  return execFileSync('git', ['-C', repoDir, ...argv], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    ...opts,
  }).trim();
}

function gh(argv) {
  return execFileSync('gh', argv, {
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

/**
 * Return last N merged PRs against <defaultBranch>.
 *
 * Uses the search/issues API because /pulls?state=closed only covers a
 * recent window of activity and under-reports merged PRs on slow-moving
 * repos (observed: flask returned 3 merged PRs via /pulls vs 30+ via
 * search/issues). We then hit /pulls/<n> for each candidate to grab the
 * base/merge shas (search hits don't carry them).
 */
function fetchMergedPrs(repo, n, args) {
  log(args, `fetching last ${n} merged PRs for ${repo.slug} (base:${repo.defaultBranch})`);
  const searchRaw = gh([
    'api',
    `search/issues?q=repo:${repo.slug}+is:pr+is:merged+base:${repo.defaultBranch}&sort=updated&order=desc&per_page=${n}`,
    '--jq',
    '.items[] | .number',
  ]);
  if (!searchRaw) return [];
  const numbers = searchRaw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .slice(0, n);

  const prs = [];
  for (const number of numbers) {
    const raw = gh([
      'api',
      `repos/${repo.slug}/pulls/${number}`,
      '--jq',
      '{number, merged_at, base_sha: .base.sha, merge_sha: .merge_commit_sha, base_ref: .base.ref}',
    ]);
    const p = JSON.parse(raw);
    if (!p.merged_at) continue; // paranoia: search should only return merged
    if (p.base_ref !== repo.defaultBranch) continue;
    prs.push(p);
  }
  return prs;
}

function diffNames(repoDir, baseSha, mergeSha) {
  const out = git(repoDir, ['diff', '--name-only', `${baseSha}..${mergeSha}`]);
  if (!out) return [];
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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
        ZCG_ALLOW_UNSAFE_NODE: '1',
        ZCG_NO_DAEMON: '1',
        ZCG_NO_RELAUNCH: '1',
      },
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}

function median(xs) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function setOf(arr) {
  return new Set(arr);
}

function intersectCount(a, bSet) {
  let n = 0;
  for (const x of a) if (bSet.has(x)) n++;
  return n;
}

/** Files that are definitely outside our indexed language set. */
function isIndexableSource(rel) {
  return /\.(c|cc|cpp|cxx|h|hh|hpp|cs|go|java|kt|kts|m|mm|php|py|rb|rs|scala|swift|ts|tsx|js|jsx|mts|cts|dart|lua|pas|pp|dpr|dfm|vue|svelte)$/.test(
    rel,
  );
}

function measurePr(repoDir, pr, args) {
  const { number, base_sha, merge_sha } = pr;
  log(args, `  PR #${number}: ${base_sha.slice(0, 8)}..${merge_sha.slice(0, 8)}`);

  ensureCommit(repoDir, base_sha, args);
  ensureCommit(repoDir, merge_sha, args);

  const mergedFiles = diffNames(repoDir, base_sha, merge_sha);
  const mergedIndexable = mergedFiles.filter(isIndexableSource);

  // Detach to merge_sha, then index.
  git(repoDir, ['checkout', '--quiet', '--detach', merge_sha]);
  const idx = runIndex({ repoDir, quiet: true });

  const affected = runAffected(repoDir, base_sha, merge_sha);
  const affectedSource = affected.affectedSource ?? [];
  const affectedTests = affected.affectedTests ?? [];
  // Union view — most callers only care about "is this file in the blast
  // radius at all", regardless of the source/test partition.
  const affectedUnion = [...affectedSource, ...affectedTests];

  const mergedSet = setOf(mergedFiles);
  const mergedIndexableSet = setOf(mergedIndexable);

  const truePositivesAll = intersectCount(affectedSource, mergedSet);
  const truePositivesIdx = intersectCount(affectedSource, mergedIndexableSet);
  const truePositivesUnion = intersectCount(affectedUnion, mergedSet);
  const truePositivesUnionIdx = intersectCount(affectedUnion, mergedIndexableSet);

  const recallAll = mergedFiles.length === 0 ? null : truePositivesAll / mergedFiles.length;
  const recallIndexable =
    mergedIndexable.length === 0 ? null : truePositivesIdx / mergedIndexable.length;
  // Union recalls — partition-aware blast radius.
  const recallUnion = mergedFiles.length === 0 ? null : truePositivesUnion / mergedFiles.length;
  const recallUnionIndexable =
    mergedIndexable.length === 0 ? null : truePositivesUnionIdx / mergedIndexable.length;
  const precision =
    affectedSource.length === 0 ? null : truePositivesAll / affectedSource.length;

  return {
    pr: number,
    baseSha: base_sha,
    mergeSha: merge_sha,
    mergedFiles,
    mergedIndexableCount: mergedIndexable.length,
    affectedSourceCount: affectedSource.length,
    affectedTestsCount: affectedTests.length,
    recall: recallAll,
    recallIndexable,
    recallUnion,
    recallUnionIndexable,
    precision,
    indexDurationMs: idx.durationMs,
  };
}

function measureRepo(repo, args) {
  log(args, `=== ${repo.slug} ===`);
  const cloneInfo = ensureClone({
    repo: {
      owner: repo.slug.split('/')[0],
      name: repo.slug.split('/')[1],
      slug: repo.slug,
      httpsUrl: `https://github.com/${repo.slug}.git`,
      sshUrl: `git@github.com:${repo.slug}.git`,
      cloneUrl:
        (process.env.MEASURE_GIT_PROTOCOL ?? 'ssh').toLowerCase() === 'https'
          ? `https://github.com/${repo.slug}.git`
          : `git@github.com:${repo.slug}.git`,
    },
    ref: null,
    sparse: repo.sparse,
    corpusRoot: args.corpusRoot,
    quiet: args.quiet,
  });
  log(args, `clone ready: ${cloneInfo.repoDir} @ ${cloneInfo.sha.slice(0, 12)}`);

  const prs = fetchMergedPrs(repo, args.prs, args);
  log(args, `got ${prs.length} merged PRs`);

  const perPr = [];
  for (const pr of prs) {
    try {
      const r = measurePr(cloneInfo.repoDir, pr, args);
      perPr.push(r);
      log(
        args,
        `    merged=${r.mergedFiles.length} (idx=${r.mergedIndexableCount}) ` +
          `affected=${r.affectedSourceCount} ` +
          `recall=${r.recall === null ? 'n/a' : r.recall.toFixed(3)} ` +
          `recallIdx=${r.recallIndexable === null ? 'n/a' : r.recallIndexable.toFixed(3)}`,
      );
    } catch (err) {
      log(args, `    ERROR: ${err.message.split('\n')[0]}`);
      perPr.push({
        pr: pr.number,
        baseSha: pr.base_sha,
        mergeSha: pr.merge_sha,
        error: String(err.message ?? err),
      });
    }
  }

  const ok = perPr.filter((p) => !p.error);
  const recallVals = ok.map((p) => p.recall).filter((v) => v !== null);
  const recallIdxVals = ok.map((p) => p.recallIndexable).filter((v) => v !== null);
  const recallUnionVals = ok.map((p) => p.recallUnion).filter((v) => v !== null);
  const recallUnionIdxVals = ok.map((p) => p.recallUnionIndexable).filter((v) => v !== null);
  const precisionVals = ok.map((p) => p.precision).filter((v) => v !== null);

  const summary = {
    totalPrs: perPr.length,
    succeeded: ok.length,
    failed: perPr.length - ok.length,
    medianRecall: median(recallVals),
    medianRecallIndexable: median(recallIdxVals),
    medianRecallUnion: median(recallUnionVals),
    medianRecallUnionIndexable: median(recallUnionIdxVals),
    medianPrecision: median(precisionVals),
    prsWithPerfectRecallIdx: ok.filter((p) => p.recallIndexable === 1).length,
    prsWithPerfectRecallUnionIdx: ok.filter((p) => p.recallUnionIndexable === 1).length,
    prsWithZeroRecallIdx: ok.filter((p) => p.recallIndexable === 0).length,
    // Denominator-skew note: PRs whose merged file set contains zero
    // indexable files produce recallIndexable === null and are excluded
    // from the median.
    prsWithNoIndexableFiles: ok.filter((p) => p.recallIndexable === null).length,
  };

  return {
    repo: repo.slug,
    defaultBranch: repo.defaultBranch,
    sparse: repo.sparse,
    cloneSha: cloneInfo.sha,
    repoDir: cloneInfo.repoDir,
    summary,
    perPr,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(BIN)) {
    fail(`dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` first.`);
  }

  let repos = REPOS;
  if (args.only) {
    repos = repos.filter((r) => r.slug === args.only);
    if (repos.length === 0) {
      fail(`no repo with slug '${args.only}' (known: ${REPOS.map((r) => r.slug).join(', ')})`);
    }
  }

  const results = repos.map((r) => measureRepo(r, args));

  const aggregate = {
    repoCount: results.length,
    totalPrs: results.reduce((n, r) => n + r.summary.totalPrs, 0),
    succeeded: results.reduce((n, r) => n + r.summary.succeeded, 0),
    failed: results.reduce((n, r) => n + r.summary.failed, 0),
    medianRecallAcrossRepos: median(results.map((r) => r.summary.medianRecall)),
    medianRecallIndexableAcrossRepos: median(
      results.map((r) => r.summary.medianRecallIndexable),
    ),
    medianRecallUnionAcrossRepos: median(results.map((r) => r.summary.medianRecallUnion)),
    medianRecallUnionIndexableAcrossRepos: median(
      results.map((r) => r.summary.medianRecallUnionIndexable),
    ),
    medianPrecisionAcrossRepos: median(results.map((r) => r.summary.medianPrecision)),
  };

  emitReport({
    metric: 'pr-recall-baseline',
    repo: { slug: 'multi-corpus' },
    ref: results.map((r) => `${r.repo}@${r.cloneSha.slice(0, 12)}`).join(','),
    value: { aggregate, repos: results },
    evidence: {
      prCount: args.prs,
      groundTruth: 'git diff --name-only base..merge',
      recallDefinition:
        '|affectedSource ∩ mergedFiles| / |mergedFiles|; affectedTests NOT counted',
      recallIndexableDefinition:
        'same as recall but restricted to merged files with an indexed source extension',
      recallUnionDefinition:
        '|(affectedSource ∪ affectedTests) ∩ mergedFiles| / |mergedFiles| — ' +
        'partition-aware recall; the right number to quote when callers do not care ' +
        'about the source/test split',
      precisionDefinition:
        '|affectedSource ∩ mergedFiles| / |affectedSource| — expected to be LOW by design ' +
        '(blast radius intentionally includes dependents of changed files)',
      repos: REPOS.map((r) => r.slug),
    },
    out: args.out,
  });
}

main();
