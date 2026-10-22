#!/usr/bin/env node
/**
 * perf-baseline.mjs — architecture regression baseline measurement (roadmap 1-2-8-1).
 *
 * Measures, for a single corpus repo:
 *   - index wall-time: `repetitions` cold re-indexes (delete .zcodegraph/
 *     between runs), median is the index baseline;
 *   - explore latency: each frozen query from the contract is run
 *     `repetitions` times against the indexed DB; per-query median is the
 *     explore baseline.
 *
 * Contract: docs/contracts/architecture-regression-baseline-v1.md
 *
 * Usage:
 *   node scripts/measure/perf-baseline.mjs <github-url> [--ref <sha>]
 *     [--sparse <path>]... [--repetitions <n>] [--corpus-root <dir>]
 *     [--contract <path>] [--out <path>] [--quiet]
 *
 * The same script doubles as the *current-run* measurer for
 * perf-regression-check.mjs: identical envelope, metric id
 * `architecture-regression-baseline`.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { emitReport } from './lib/report.mjs';
import { normalizeRepo, log, fail } from './lib/args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');
const DEFAULT_CONTRACT = path.join(
  REPO_ROOT, 'docs', 'contracts', 'architecture-regression-baseline-v1.md',
);

export function parseArgs(argv) {
  const args = {
    repo: null,
    ref: null,
    sparse: [],
    repetitions: 3,
    corpusRoot: 'C:/workspace/measure-corpus',
    out: null,
    quiet: false,
    contract: DEFAULT_CONTRACT,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') args.ref = argv[++i];
    else if (a === '--sparse') args.sparse.push(argv[++i]);
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
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positional.push(a);
  }
  if (positional.length !== 1) {
    throw new Error(`expected exactly one positional <github-url>, got ${positional.length}`);
  }
  args.repo = normalizeRepo(positional[0]);
  return args;
}

/** Extract frozen explore queries from the contract's fenced json block. */
export function loadContractQueries(contractPath) {
  const text = fs.readFileSync(contractPath, 'utf-8');
  const blocks = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  for (const b of blocks) {
    const parsed = JSON.parse(b[1]);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((q) => typeof q === 'string')) {
      return parsed;
    }
  }
  throw new Error(`no frozen explore query list (json array of strings) found in ${contractPath}`);
}

export function median(xs) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function removeIndexDir(repoDir) {
  const dir = path.join(repoDir, '.zcodegraph');
  fs.rmSync(dir, { recursive: true, force: true });
}

function runExploreOnce(repoDir, query) {
  const start = Date.now();
  execFileSync(process.execPath, [BIN, 'explore', query], {
    cwd: repoDir,
    encoding: 'buffer',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    maxBuffer: 128 * 1024 * 1024,
  });
  return Date.now() - start;
}

export function measureCorpus({ repo, repoDir, repetitions, queries, args }) {
  // Index runs: cold re-index each time.
  const indexRuns = [];
  let lastIndex = null;
  for (let i = 0; i < repetitions; i++) {
    removeIndexDir(repoDir);
    const info = runIndex({ repoDir, quiet: args.quiet });
    indexRuns.push(info.durationMs);
    lastIndex = info;
    log(args, `index run ${i + 1}/${repetitions}: ${info.durationMs}ms`);
  }

  // Explore runs against the final indexed DB.
  const explore = queries.map((query) => {
    const runs = [];
    for (let i = 0; i < repetitions; i++) {
      const ms = runExploreOnce(repoDir, query);
      runs.push(ms);
    }
    log(args, `explore "${query}": runs=${runs.join(',')}ms`);
    return { query, runs, medianMs: median(runs) };
  });

  const exploreMedianAcrossQueries = median(explore.map((e) => e.medianMs));

  return {
    index: { runs: indexRuns, medianMs: median(indexRuns) },
    explore: { queries: explore, medianMs: exploreMedianAcrossQueries },
    dbPath: lastIndex.dbPath,
  };
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
  if (!fs.existsSync(args.contract)) {
    fail(`contract not found at ${args.contract}`);
  }
  const queries = loadContractQueries(args.contract);

  const cloneInfo = ensureClone({
    repo: args.repo,
    ref: args.ref,
    sparse: args.sparse,
    corpusRoot: args.corpusRoot,
    quiet: args.quiet,
  });
  log(args, `clone ready: ${cloneInfo.repoDir} @ ${cloneInfo.sha.slice(0, 12)}`);

  const measured = measureCorpus({
    repo: args.repo,
    repoDir: cloneInfo.repoDir,
    repetitions: args.repetitions,
    queries,
    args,
  });

  emitReport({
    metric: 'architecture-regression-baseline',
    repo: args.repo,
    ref: cloneInfo.sha,
    value: {
      repetitions: args.repetitions,
      indexMedianMs: measured.index.medianMs,
      indexRunsMs: measured.index.runs,
      exploreMedianMs: measured.explore.medianMs,
      exploreQueries: measured.explore.queries,
    },
    evidence: {
      contract: path.relative(REPO_ROOT, args.contract),
      corpusDir: cloneInfo.repoDir,
      dbPath: measured.dbPath,
      reusedClone: cloneInfo.reusedClone,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
    },
    out: args.out,
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
