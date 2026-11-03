#!/usr/bin/env node
/**
 * holdout-gate.mjs — 1-3-3 acceptance evaluation on the frozen holdout split.
 *
 * Scope: Acceptance/evaluation only. No source changes; no CLI/MCP integration.
 *
 * Arms:
 *   - pure-fts          : uniqueFiles(cg.searchNodes(query, { limit: 100 }))
 *                         (1-3-2 recommended configuration)
 *   - existing-explore  : plan(cg, query, { maxFiles: 10 }) — the current Explore arm
 *                         that macro Hit@5 must beat by >= 5pp.
 *
 * Queries: frozen holdout split only (16 mixed-corpus + 12 eShopOnWeb = 28).
 *
 * Gates (from 1-3-3 node decision):
 *   - per-corpus Hit@5 >= 90%, Hit@10 >= 95%
 *   - macro MRR >= 0.70
 *   - macro Hit@5 >= existing-explore + 5pp
 *   - hot p50 <= 150ms, p95 <= 250ms; cold start <= 2s
 *   - large-corpus (eShopOnWeb) p95 <= 500ms
 *   - steady-state RSS delta <= 512MiB, peak RSS <= 768MiB
 *
 * Usage:
 *   node scripts/measure/holdout-gate.mjs [--out docs/evidence/2026-11-03-holdout-evaluation.json]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v1.json');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const VEC0 = path.join(SPIKE, 'vec0.dll');

const ARMS = ['pure-fts', 'existing-explore'];

const GATE = {
  perCorpus: { hitAt5: 0.9, hitAt10: 0.95 },
  macro: { mrr: 0.7, hitAt5DeltaVsExplore: 0.05 },
  latencyMs: { hotP50: 150, hotP95: 250, coldStart: 2000, largeCorpusP95: 500 },
  rssBytes: { steadyDelta: 512 * 1024 * 1024, peak: 768 * 1024 * 1024 },
};

function parseArgs(argv) {
  const out = { worker: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--worker') out.worker = true;
    else if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return out;
}

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`missing file: ${file}`);
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)];
}

function statsOf(rows) {
  const latencies = rows.flatMap((r) => r.warmMs);
  const n = rows.length;
  return {
    queries: n,
    hit: Object.fromEntries([1, 5, 10].map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    misses: rows.filter((r) => r.rank === null).map((r) => r.id),
    warmMs: {
      median: quantile(latencies, 0.5),
      p95: quantile(latencies, 0.95),
      max: latencies.length > 0 ? Math.max(...latencies) : null,
    },
    coldMs: quantile(rows.map((r) => r.coldMs).filter((v) => typeof v === 'number'), 0.5),
  };
}

function uniqueFiles(results) {
  const ranks = new Map();
  for (const result of results) {
    const file = result.node.filePath;
    const score = result.score;
    ranks.set(file, Math.max(score, ranks.get(file) ?? -Infinity));
  }
  return [...ranks.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function filesForPlan(plan) {
  return plan.sortedFiles.map(([file, group]) => [file, group.score]);
}

function gitRevision(corpus) {
  return execFileSync('git', ['-C', path.join(CORPUS_ROOT, corpus), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function validateBaseline(baseline) {
  const ids = new Set();
  const holdoutCorpora = new Set(baseline.queries.filter((q) => q.split === 'holdout').map((q) => q.corpus));
  for (const corpus of baseline.corpora) {
    if (!holdoutCorpora.has(corpus.id)) continue;
    requireFile(path.join(CORPUS_ROOT, corpus.id, '.git', 'HEAD'));
    const actual = gitRevision(corpus.id);
    if (actual !== corpus.ref) throw new Error(`${corpus.id} revision drift: expected ${corpus.ref}, got ${actual}`);
    requireFile(path.join(SPIKE, '.work', corpus.id, 'zcodegraph.db'));
  }
  for (const query of baseline.queries) {
    if (ids.has(query.id)) throw new Error(`duplicate query id: ${query.id}`);
    ids.add(query.id);
    if (query.split !== 'holdout') continue;
    if (query.expectedFiles.length === 0 || query.hardNegatives.length < 2) throw new Error(`incomplete oracle: ${query.id}`);
    const text = fs.readFileSync(path.join(CORPUS_ROOT, query.corpus, query.expectedFiles[0]), 'utf8').split(/\r?\n/);
    const line = text[query.evidence.startLine - 1] ?? '';
    const firstSymbol = query.evidence.symbol.split(' and ')[0].split('.').at(-1);
    if (!line.includes(firstSymbol)) throw new Error(`stale evidence anchor: ${query.id}: ${line}`);
    for (const file of [...query.expectedFiles, ...query.hardNegatives]) {
      requireFile(path.join(CORPUS_ROOT, query.corpus, file));
    }
  }
  requireFile(VEC0);
  requireFile(path.join(REPO, 'dist', 'index.js'));
}

function openVectorStore(corpus) {
  const db = new DatabaseSync(path.join(SPIKE, '.work', corpus, 'zcodegraph.db'), { readOnly: true, allowExtension: true });
  db.loadExtension(VEC0);
  db.enableLoadExtension(false);
  return db;
}

async function runWorker() {
  const baseline = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  validateBaseline(baseline);

  const holdoutQueries = baseline.queries.filter((q) => q.split === 'holdout');
  if (holdoutQueries.length === 0) throw new Error('no holdout queries');

  const holdoutCorpora = [...new Set(holdoutQueries.map((q) => q.corpus))];

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const report = {
    metric: 'holdout-gate',
    version: 1,
    measuredAt: new Date().toISOString(),
    labelStatus: baseline.status,
    scope: 'frozen holdout split only; acceptance/evaluation; no source changes',
    baseline: { path: 'docs/baselines/semantic-retrieval-human-frozen-v1.json', sha256: baseline.candidateSha256, reviewedAt: baseline.review.reviewedAt, reviewer: baseline.review.reviewer },
    arms: ARMS,
    gates: GATE,
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    process: {},
  };

  const perArmCorpusSummaries = Object.fromEntries(ARMS.map((a) => [a, []]));
  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of holdoutCorpora) {
    const corpusQueries = holdoutQueries.filter((q) => q.corpus === corpus);
    console.error(`[holdout-gate] corpus=${corpus} queries=${corpusQueries.length}`);

    const openStart = performance.now();
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const openMs = performance.now() - openStart;
    const vectorDb = openVectorStore(corpus);
    const coverage = vectorDb.prepare('SELECT (SELECT count(*) FROM files) AS files, (SELECT count(*) FROM vec_embeddings) AS vectors, (SELECT count(*) FROM nodes) AS nodes, (SELECT count(*) FROM edges) AS edges').get();
    const diskBytes = fs.statSync(path.join(SPIKE, '.work', corpus, 'zcodegraph.db')).size;

    const corpusEntry = {
      corpus,
      repo: baseline.corpora.find((c) => c.id === corpus)?.repo ?? corpus,
      ref: baseline.corpora.find((c) => c.id === corpus)?.ref,
      graph: coverage,
      vectorDbBytes: diskBytes,
      existingOpenMs: openMs,
      arms: {},
    };

    for (const arm of ARMS) {
      const ranksByQuery = new Map();
      for (let repetition = 0; repetition < 4; repetition++) {
        for (const query of corpusQueries) {
          const start = performance.now();
          let ranks;
          if (arm === 'pure-fts') {
            ranks = uniqueFiles(cg.searchNodes(query.query, { limit: 100 }));
          } else {
            const explore = await plan(cg, query.query, { maxFiles: 10 });
            ranks = filesForPlan(explore);
          }
          const elapsed = performance.now() - start;
          if (repetition === 0) {
            const top = ranks.slice(0, 10).map(([file, score]) => ({ file, score }));
            const expected = new Set(query.expectedFiles);
            const first = top.findIndex((r) => expected.has(r.file));
            ranksByQuery.set(query.id, {
              id: query.id, split: query.split, corpus: query.corpus,
              rank: first < 0 ? null : first + 1,
              top, warmMs: [], coldMs: elapsed,
            });
          } else {
            ranksByQuery.get(query.id).warmMs.push(elapsed);
          }
        }
      }
      const rows = [...ranksByQuery.values()];
      const summary = statsOf(rows);
      corpusEntry.arms[arm] = { summary, results: rows };
      perArmCorpusSummaries[arm].push({ corpus, summary });
      perArmAllRows[arm].push(...rows);
    }

    report.corpora.push(corpusEntry);
    vectorDb.close();
    await cg.closeAndWait();
  }

  for (const arm of ARMS) {
    report.macro[arm] = statsOf(perArmAllRows[arm]);
  }

  process.stdout.write(JSON.stringify(report));
}

function peakWorkingSet(pid) {
  try {
    const value = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.PeakWorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(value) || null;
  } catch { return null; }
}

function currentWorkingSet(pid) {
  try {
    const value = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.WorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(value) || null;
  } catch { return null; }
}

function evaluateGates(report) {
  const fts = report.macro['pure-fts'];
  const explore = report.macro['existing-explore'];

  const perCorpusGate = report.corpora.map((c) => {
    const s = c.arms['pure-fts'].summary;
    return {
      corpus: c.corpus,
      hitAt5: s.hit.at5,
      hitAt5Pass: s.hit.at5 >= GATE.perCorpus.hitAt5,
      hitAt10: s.hit.at10,
      hitAt10Pass: s.hit.at10 >= GATE.perCorpus.hitAt10,
    };
  });

  const largeCorpus = report.corpora.find((c) => c.corpus === 'dotnet-architecture-eShopOnWeb');
  const largeCorpusP95 = largeCorpus?.arms['pure-fts'].summary.warmMs.p95 ?? null;

  const peakRss = report.process?.peakWorkingSetBytes ?? null;
  const steadyRss = report.process?.steadyWorkingSetBytes ?? null;

  const gates = {
    'per-corpus Hit@5>=90%': { pass: perCorpusGate.every((g) => g.hitAt5Pass), detail: perCorpusGate },
    'per-corpus Hit@10>=95%': { pass: perCorpusGate.every((g) => g.hitAt10Pass), detail: perCorpusGate },
    'macro MRR>=0.70': { pass: fts.mrr >= GATE.macro.mrr, actual: fts.mrr, threshold: GATE.macro.mrr },
    'macro Hit@5 >= explore + 5pp': {
      pass: fts.hit.at5 - explore.hit.at5 >= GATE.macro.hitAt5DeltaVsExplore,
      actualFts: fts.hit.at5, actualExplore: explore.hit.at5,
      delta: fts.hit.at5 - explore.hit.at5, threshold: GATE.macro.hitAt5DeltaVsExplore,
    },
    'hot p50<=150ms': { pass: fts.warmMs.median <= GATE.latencyMs.hotP50, actual: fts.warmMs.median, threshold: GATE.latencyMs.hotP50 },
    'hot p95<=250ms': { pass: fts.warmMs.p95 <= GATE.latencyMs.hotP95, actual: fts.warmMs.p95, threshold: GATE.latencyMs.hotP95 },
    'cold start<=2s': { pass: (fts.coldMs ?? Infinity) <= GATE.latencyMs.coldStart, actual: fts.coldMs, threshold: GATE.latencyMs.coldStart },
    'large-corpus p95<=500ms (eShopOnWeb)': { pass: largeCorpusP95 !== null && largeCorpusP95 <= GATE.latencyMs.largeCorpusP95, actual: largeCorpusP95, threshold: GATE.latencyMs.largeCorpusP95 },
    'peak RSS<=768MiB': { pass: peakRss !== null && peakRss <= GATE.rssBytes.peak, actual: peakRss, threshold: GATE.rssBytes.peak },
    'steady RSS delta<=512MiB': { pass: steadyRss !== null && steadyRss <= GATE.rssBytes.steadyDelta, actual: steadyRss, threshold: GATE.rssBytes.steadyDelta },
  };

  const overall = Object.values(gates).every((g) => g.pass);
  return { gates, verdict: overall ? 'GO' : 'NO-GO' };
}

async function runParent(out) {
  const start = performance.now();
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker'], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ZCG_ENABLE_EMBEDDING: '0' } });
  let stdout = '';
  let peak = null;
  let baselineRss = null;
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  const timer = setInterval(() => {
    const p = peakWorkingSet(child.pid);
    if (p !== null) peak = Math.max(peak ?? 0, p);
    const c = currentWorkingSet(child.pid);
    if (c !== null && baselineRss === null) baselineRss = c;
  }, 50);
  const exit = await new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));
  clearInterval(timer);
  if (exit.code !== 0) throw new Error(`worker failed: ${JSON.stringify(exit)}`);
  const report = JSON.parse(stdout);
  const finalRss = currentWorkingSet(child.pid);
  report.process = {
    wallMs: performance.now() - start,
    peakWorkingSetBytes: peak,
    baselineWorkingSetBytes: baselineRss,
    steadyWorkingSetBytes: (peak !== null && baselineRss !== null) ? peak - baselineRss : null,
    finalWorkingSetBytes: finalRss,
  };
  const verdict = evaluateGates(report);
  report.gateEvaluation = verdict;
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text, 'utf8');
  process.stdout.write(text);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, 'docs', 'evidence', '2026-11-03-holdout-evaluation.json'));
