#!/usr/bin/env node
// Slice 0 observation only: legacy CLI latency, never a candidate tuning or
// paired-agent run. Reuses the registered bare-median statistic.
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { median } from './perf-baseline.mjs';
import { loadExploreDevelopmentContract } from '../agent-eval/explore-development-contract.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = path.join(REPO, 'dist', 'bin', 'zcodegraph.js');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function sourceIdentity() {
  const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } }).trim();
  const paths = execFileSync('git', ['ls-files', '-z', '--', 'src', 'package.json', 'package-lock.json'], {
    cwd: REPO, encoding: 'buffer', env: { ...process.env, NODE_OPTIONS: '' },
  }).toString('utf8').split('\0').filter(Boolean).sort();
  const blobIds = execSync(`git ls-files -s -- ${paths.map((file) => `"${file}"`).join(' ')}`, {
    cwd: REPO, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' },
  });
  return {
    head: git(['rev-parse', 'HEAD']),
    trackedSourceBlobSetSha256: sha256(blobIds),
    workingTreeSourceSha256: sha256(Buffer.concat(paths.map((file) => Buffer.from(`${file}\0${sha256(readFileSync(path.join(REPO, file)))}\0`)))),
    dirty: git(['status', '--porcelain']).length > 0,
  };
}

export function measureExploreLatency({ repoDir, queries, repetitions = 9 }) {
  if (!Number.isInteger(repetitions) || repetitions !== 9) throw new Error('slice 0 requires exactly nine repetitions');
  return queries.map((query) => {
    const runs = [];
    for (let run = 0; run < repetitions; run++) {
      const start = performance.now();
      const result = spawnSync(process.execPath, [BIN, 'explore', query], {
        cwd: repoDir, encoding: 'buffer', stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true, timeout: 120_000, maxBuffer: 128 * 1024 * 1024,
        env: {
          ...process.env, NODE_OPTIONS: '', ZCG_ALLOW_UNSAFE_NODE: '1',
          ZCG_NO_DAEMON: '1', ZCG_NO_RELAUNCH: '1',
        },
      });
      const durationMs = Math.round((performance.now() - start) * 1000) / 1000;
      if (result.status !== 0) throw new Error(`legacy explore failed (${result.status}): ${result.stderr?.toString('utf8')}`);
      runs.push(durationMs);
    }
    return { query, runs, medianMs: median(runs) };
  });
}

function parse(args) {
  if (args.length !== 6 || args[0] !== '--corpus-root' || args[2] !== '--audit' || args[4] !== '--out') {
    throw new Error('Usage: node scripts/measure/explore-slice0-latency.mjs --corpus-root <dir> --audit <report.json> --out <artifact.json>');
  }
  return { corpusRoot: path.resolve(args[1]), audit: path.resolve(args[3]), out: path.resolve(args[5]) };
}

export async function measureSlice0Latency({ corpusRoot, audit, out }) {
  const contract = loadExploreDevelopmentContract();
  const auditReport = JSON.parse(await readFile(audit, 'utf8'));
  if (auditReport.schema !== 'explore-slice0-legacy-five-stage-audit-v1'
      || auditReport.contract?.taskModuleSha256 !== contract.taskModuleSha256) {
    throw new Error('latency requires the matching frozen five-stage legacy audit');
  }
  const identity = sourceIdentity();
  const executableSha256 = sha256(await readFile(BIN));
  const runtimeModules = Object.fromEntries(await Promise.all([
    'dist/index.js', 'dist/explore/application.js', 'dist/explore/renderer.js', 'dist/bin/zcodegraph.js',
  ].map(async (module) => [module, sha256(await readFile(path.join(REPO, module)))])));
  const results = [];
  for (const entry of contract.tasks) {
    const auditResult = auditReport.results.find((result) => result.promptId === entry.id);
    const originalRoot = path.resolve(corpusRoot, entry.directory);
    if (!auditResult || auditResult.status === 'incomplete') {
      results.push({ promptId: entry.id, status: 'incomplete', reason: 'isolated default-index audit did not complete' });
      continue;
    }
    if (!auditResult.snapshot || auditResult.actualCommit !== entry.commit) {
      throw new Error(`audit snapshot identity missing: ${entry.id}`);
    }
    const repoDir = path.resolve(REPO, auditResult.snapshot.root);
    const database = path.resolve(repoDir, auditResult.snapshot.database);
    if (sha256(await readFile(database)) !== auditResult.databaseSha256) {
      throw new Error(`audited database changed before latency measurement: ${entry.id}`);
    }
    const actualCommit = execFileSync('git', ['-C', originalRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (actualCommit !== entry.commit) throw new Error(`fixed corpus mismatch: ${entry.id} at ${actualCommit}`);
    const queries = measureExploreLatency({ repoDir, queries: [entry.task.PROMPT], repetitions: 9 });
    if (sha256(await readFile(database)) !== auditResult.databaseSha256) {
      throw new Error(`database bytes changed during legacy CLI measurement: ${entry.id}`);
    }
    results.push({
      promptId: entry.id, repo: entry.repo, commit: actualCommit,
      promptSha256: entry.promptSha256, engine: 'legacy CLI; isolated default index; no indexing during query',
      status: 'observed', snapshot: auditResult.snapshot, indexStatus: auditResult.indexStatus,
      exploreQueries: queries, medianMs: queries[0].medianMs,
    });
  }
  const artifact = {
    schema: 'explore-slice0-legacy-latency-v1',
    scope: 'Development-only fresh-process legacy CLI latency on the five fixed task prompts; not a red-line verdict or candidate run.',
    measuredAt: new Date().toISOString(),
    statistic: 'per-query median of nine wall-clock runs',
    repetitions: 9,
    source: { ...identity, executable: 'dist/bin/zcodegraph.js', executableSha256, runtimeModules },
    taskModuleSha256: contract.taskModuleSha256,
    audit: { path: path.relative(REPO, audit), sha256: sha256(await readFile(audit)) },
    environment: {
      node: process.version, platform: `${process.platform}-${process.arch}`,
      cpus: (await import('node:os')).cpus().length,
    },
    results,
    limitations: [
      'Wall-clock observations are environment-specific; no absolute latency target is established.',
      'Latency does not establish answer correctness, Agent Sufficiency, production readiness or release.',
      'Existing corpus indexes are read only; the paired/pilot execution budgets remain untouched.',
      'Each sample uses its isolated audited default index and preserves degraded-index diagnostics without implying correctness.',
    ],
  };
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return artifact;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parse(process.argv.slice(2));
    const artifact = await measureSlice0Latency(options);
    console.log(JSON.stringify({ out: options.out, results: artifact.results.map((result) => ({
      promptId: result.promptId, status: result.status, medianMs: result.medianMs,
      runs: result.exploreQueries?.[0]?.runs,
    })) }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
