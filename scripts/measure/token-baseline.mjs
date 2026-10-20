#!/usr/bin/env node
/**
 * token-baseline.mjs — Layer-1 token-consumption baseline (roadmap 1-1-4).
 *
 * For each of the nine tasks frozen in docs/contracts/token-baseline-tasks-v1.md:
 *   - clone + index the task's repo (pinned ref via ensureClone/runIndex),
 *   - invoke the task's `cliCalls` against the real `dist/bin/zcodegraph.js`,
 *   - concatenate stdout payloads; byte-length is the numerator,
 *   - sum the byte-size of the task's `equivalentFiles[]`; that is the
 *     denominator,
 *   - repeat 3 times; report the median ratio.
 *
 * Conservative on both sides:
 *   - numerator: we run the REAL CLI, no SQL shortcut, no padding. If a
 *     call returns zero rows, the payload is whatever the CLI emitted.
 *   - denominator: only files the agent cannot avoid reading. See the
 *     contract's "Conservative annotation policy".
 *
 * Usage:
 *   node scripts/measure/token-baseline.mjs [--task <id>] [--corpus-root <dir>]
 *                                             [--out <path>] [--quiet]
 *
 * Default: run all nine tasks and print a single JSON report.
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
const CONTRACT_PATH = path.join(REPO_ROOT, 'docs', 'contracts', 'token-baseline-tasks-v1.md');

function parseArgs(argv) {
  const args = {
    task: null,
    corpusRoot: 'C:/workspace/measure-corpus',
    out: null,
    quiet: false,
    keepDb: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') args.task = argv[++i];
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else throw new Error(`unknown flag: ${a}`);
  }
  return args;
}

/** Extract the fenced JSON block from the contract markdown. */
function loadContract(contractPath) {
  const text = fs.readFileSync(contractPath, 'utf-8');
  const m = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`no fenced json block in ${contractPath}`);
  const parsed = JSON.parse(m[1]);
  if (parsed.version !== 1) {
    throw new Error(`unsupported contract version ${parsed.version}`);
  }
  return parsed;
}

/** Run one CLI call, return stdout as Buffer. */
function runCli(repoDir, cliArgs) {
  const out = execFileSync(process.execPath, [BIN, ...cliArgs], {
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
  return out;
}

/** Byte length of a file inside the cloned repo. */
function fileBytes(repoDir, rel) {
  const p = path.join(repoDir, rel);
  if (!fs.existsSync(p)) {
    throw new Error(`equivalentFile not found: ${rel} (expected at ${p})`);
  }
  return fs.statSync(p).size;
}

function measureTaskOnce(task, repoDir) {
  let numerator = 0;
  const callBreakdown = [];
  for (const cliArgs of task.cliCalls) {
    const payload = runCli(repoDir, cliArgs);
    const bytes = payload.length;
    numerator += bytes;
    callBreakdown.push({ call: cliArgs.join(' '), bytes });
  }
  let denominator = 0;
  const fileBreakdown = [];
  for (const rel of task.equivalentFiles) {
    const bytes = fileBytes(repoDir, rel);
    denominator += bytes;
    fileBreakdown.push({ path: rel, bytes });
  }
  return { numerator, denominator, callBreakdown, fileBreakdown };
}

function median(xs) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function measureTask(task, repoDir, repetitions, args) {
  log(args, `task ${task.id}: ${repetitions} repetitions`);
  const runs = [];
  for (let i = 0; i < repetitions; i++) {
    const r = measureTaskOnce(task, repoDir);
    runs.push(r);
    log(args, `  run ${i + 1}: num=${r.numerator} den=${r.denominator}`);
  }
  const numerators = runs.map((r) => r.numerator);
  const denominators = runs.map((r) => r.denominator);
  const ratios = runs.map((r) => r.numerator / r.denominator);
  return {
    id: task.id,
    repo: task.repo,
    type: task.type,
    question: task.question,
    repetitions,
    median: {
      numeratorBytes: median(numerators),
      denominatorBytes: median(denominators),
      ratio: median(ratios),
    },
    allRuns: runs.map((r, i) => ({
      run: i + 1,
      numeratorBytes: r.numerator,
      denominatorBytes: r.denominator,
      ratio: r.numerator / r.denominator,
    })),
    breakdown: {
      cliCalls: runs[0].callBreakdown,
      equivalentFiles: runs[0].fileBreakdown,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(BIN)) {
    fail(`dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` first.`);
  }
  if (!fs.existsSync(CONTRACT_PATH)) {
    fail(`contract not found at ${CONTRACT_PATH}`);
  }
  const contract = loadContract(CONTRACT_PATH);
  const repetitions = contract.repetitions ?? 3;

  let tasks = contract.tasks;
  if (args.task) {
    tasks = tasks.filter((t) => t.id === args.task);
    if (tasks.length === 0) {
      fail(`no task with id '${args.task}' in contract`);
    }
  }

  // Group tasks by repo so we clone+index each repo only once.
  const byRepo = new Map();
  for (const t of tasks) {
    if (!byRepo.has(t.repo)) byRepo.set(t.repo, []);
    byRepo.get(t.repo).push(t);
  }

  const results = [];
  const repoMeta = [];
  for (const [slug, repoTasks] of byRepo.entries()) {
    log(args, `=== ${slug}: ${repoTasks.length} task(s) ===`);
    const { ensureClone: ec, runIndex: ri } = { ensureClone, runIndex };
    const cloneInfo = ec({
      repo: {
        owner: slug.split('/')[0],
        name: slug.split('/')[1],
        slug,
        httpsUrl: `https://github.com/${slug}.git`,
        sshUrl: `git@github.com:${slug}.git`,
        cloneUrl:
          (process.env.MEASURE_GIT_PROTOCOL ?? 'ssh').toLowerCase() === 'https'
            ? `https://github.com/${slug}.git`
            : `git@github.com:${slug}.git`,
      },
      ref: null,
      sparse: [],
      corpusRoot: args.corpusRoot,
      quiet: args.quiet,
    });
    log(args, `clone ready: ${cloneInfo.repoDir} @ ${cloneInfo.sha.slice(0, 12)}`);
    const indexInfo = ri({ repoDir: cloneInfo.repoDir, quiet: args.quiet });
    log(args, `index ready: ${indexInfo.dbPath}`);
    repoMeta.push({
      repo: slug,
      sha: cloneInfo.sha,
      repoDir: cloneInfo.repoDir,
      reusedClone: cloneInfo.reusedClone,
      indexDurationMs: indexInfo.durationMs,
    });
    for (const task of repoTasks) {
      const r = measureTask(task, cloneInfo.repoDir, repetitions, args);
      results.push(r);
    }
  }

  // Aggregate across tasks
  const allRatios = results.map((r) => r.median.ratio);
  const aggregate = {
    taskCount: results.length,
    medianRatioAcrossTasks: median(allRatios),
    minRatio: Math.min(...allRatios),
    maxRatio: Math.max(...allRatios),
  };

  const value = {
    aggregate,
    tasks: results,
  };

  emitReport({
    metric: 'token-baseline-layer1',
    repo: { slug: 'multi-corpus' },
    ref: repoMeta.map((m) => `${m.repo}@${m.sha.slice(0, 12)}`).join(','),
    value,
    evidence: {
      contract: 'docs/contracts/token-baseline-tasks-v1.md',
      contractVersion: contract.version,
      repetitions,
      repos: repoMeta,
      numeratorDefinition:
        'concatenated stdout bytes of the task\'s cliCalls against dist/bin/zcodegraph.js',
      denominatorDefinition:
        'sum of byte-size of the task\'s equivalentFiles[] inside the cloned repo',
    },
    out: args.out,
  });
}

main();
