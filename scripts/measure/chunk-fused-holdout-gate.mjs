#!/usr/bin/env node
/**
 * chunk-fused-holdout-gate.mjs — 1-3-3-1 full acceptance gate on frozen holdout.
 *
 * Two arms:
 *   - baseline-explore      : plan(cg, query, { maxFiles: 10 })
 *   - chunk-fused-explore   : plan(cg, augmentedQuery, { maxFiles: 10 })
 *
 * Evaluated on the frozen holdout split (16 queries: flask 2 + express 2 +
 * eShopOnWeb 12). Gates from 1-3-3 node decision:
 *   per-corpus Hit@5 >= 90%, Hit@10 >= 95%
 *   macro MRR >= 0.70
 *   macro Hit@5 >= baseline-explore + 5pp
 *   hot p50 <= 150ms, p95 <= 250ms; cold <= 2s; large-corpus p95 <= 500ms
 *   peak RSS <= 768MiB; steady-state delta <= 512MiB
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const CHUNK_DIR = path.join(REPO, '.tmp', 'chunk-explore-fusion');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v1.json');

const ARMS = ['baseline-explore', 'chunk-fused-explore'];
const TOP_K_CHUNKS = 8;
const MAX_SYMBOLS_INJECT = 5;

const GATE = {
  perCorpus: { hitAt5: 0.9, hitAt10: 0.95 },
  macro: { mrr: 0.7, hitAt5DeltaVsBaseline: 0.05 },
  latencyMs: { hotP50: 150, hotP95: 250, coldStart: 2000, largeCorpusP95: 500 },
  rssBytes: { steadyDelta: 512 * 1024 * 1024, peak: 768 * 1024 * 1024 },
};

function parseArgs(argv) {
  const out = { worker: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--worker') out.worker = true;
    else if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else throw new Error(`unknown arg: ${argv[i]}`);
  }
  return out;
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

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function pickSymbolsToInject(topChunks) {
  const seen = new Set();
  const pascal = [];
  const camel = [];
  for (const c of topChunks) {
    const n = c.name;
    if (!n || n.length < 4 || seen.has(n)) continue;
    if (/^(get|set|to|from|of|new|create|build|make|do|handle|on)_?[a-z]/i.test(n) && n.length < 10) continue;
    seen.add(n);
    if (/^[A-Z][A-Za-z0-9]{3,}/.test(n)) pascal.push(n);
    else if (/^[a-z][A-Za-z0-9]{3,}/.test(n)) camel.push(n);
  }
  return [...pascal, ...camel].slice(0, MAX_SYMBOLS_INJECT);
}

async function loadEmbedder() {
  const requireFromSpike = createRequire(path.join(SPIKE, 'package.json'));
  const { FlagEmbedding, EmbeddingModel, Pooling } = await import(pathToFileURL(requireFromSpike.resolve('fastembed')).href);
  const start = performance.now();
  const model = await FlagEmbedding.init({
    model: EmbeddingModel.CUSTOM,
    modelAbsoluteDirPath: MODEL_DIR,
    modelName: 'model_optimized.onnx',
    pooling: Pooling.CLS,
    showDownloadProgress: false,
  });
  return { model, initMs: performance.now() - start };
}

function loadChunks(corpus) {
  const p = path.join(CHUNK_DIR, `${corpus}.chunks.json`);
  if (!fs.existsSync(p)) throw new Error(`missing chunk index: ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).chunks;
}

async function runWorker() {
  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const holdout = frozen.queries.filter((q) => q.split === 'holdout');
  if (holdout.length !== 16) throw new Error(`expected 16 holdout, got ${holdout.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { model, initMs } = await loadEmbedder();
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const chunksByCorpus = new Map();
  const holdoutCorpora = [...new Set(holdout.map((q) => q.corpus))];
  for (const c of holdoutCorpora) chunksByCorpus.set(c, loadChunks(c));

  const report = {
    metric: 'chunk-fused-holdout-gate',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'frozen holdout split; chunk-fused-explore vs baseline-explore',
    baseline: { path: 'docs/baselines/semantic-retrieval-human-frozen-v1.json', reviewedAt: frozen.review.reviewedAt },
    arms: ARMS,
    gates: GATE,
    config: { topKChunks: TOP_K_CHUNKS, maxSymbolsInject: MAX_SYMBOLS_INJECT, planMaxFiles: 10, modelInitMs: initMs },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    process: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of holdoutCorpora) {
    const corpusQueries = holdout.filter((q) => q.corpus === corpus);
    console.error(`[gate] corpus=${corpus} queries=${corpusQueries.length}`);
    const chunks = chunksByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {} };

    for (const arm of ARMS) {
      const rowsById = new Map();
      for (let repetition = 0; repetition < 4; repetition++) {
        for (const q of corpusQueries) {
          let augmentedQuery = q.query;
          if (arm === 'chunk-fused-explore') {
            const qv = await model.queryEmbed(q.query);
            const scored = chunks.map((c) => ({ c, score: cosine(qv, c.vector) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, TOP_K_CHUNKS);
            const symbols = pickSymbolsToInject(scored.map((s) => s.c));
            if (symbols.length > 0) augmentedQuery = `${q.query} ${symbols.join(' ')}`;
          }
          const start = performance.now();
          const result = await plan(cg, augmentedQuery, { maxFiles: 10 });
          const elapsed = performance.now() - start;
          const files = result.sortedFiles.map(([f]) => f);
          const expected = new Set(q.expectedFiles);
          const rank = files.findIndex((f) => expected.has(f)) + 1 || null;
          if (repetition === 0) {
            rowsById.set(q.id, {
              id: q.id, corpus: q.corpus, rank,
              coldMs: elapsed, warmMs: [],
              top5: files.slice(0, 5),
            });
          } else {
            rowsById.get(q.id).warmMs.push(elapsed);
          }
        }
      }
      const rows = [...rowsById.values()];
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }

    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);
  process.stdout.write(JSON.stringify(report));
}

function peakWorkingSet(pid) {
  try {
    const v = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.PeakWorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(v) || null;
  } catch { return null; }
}

function currentWorkingSet(pid) {
  try {
    const v = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.WorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(v) || null;
  } catch { return null; }
}

function evaluateGates(report) {
  const fused = report.macro['chunk-fused-explore'];
  const base = report.macro['baseline-explore'];

  const perCorpusGate = report.corpora.map((c) => {
    const s = c.arms['chunk-fused-explore'].summary;
    return {
      corpus: c.corpus,
      hitAt5: s.hit.at5, hitAt5Pass: s.hit.at5 >= GATE.perCorpus.hitAt5,
      hitAt10: s.hit.at10, hitAt10Pass: s.hit.at10 >= GATE.perCorpus.hitAt10,
    };
  });

  const largeCorpus = report.corpora.find((c) => c.corpus === 'dotnet-architecture-eShopOnWeb');
  const largeCorpusP95 = largeCorpus?.arms['chunk-fused-explore'].summary.warmMs.p95 ?? null;

  const peakRss = report.process?.peakWorkingSetBytes ?? null;
  const steadyRss = report.process?.steadyWorkingSetBytes ?? null;

  const gates = {
    'per-corpus Hit@5>=90%': { pass: perCorpusGate.every((g) => g.hitAt5Pass), detail: perCorpusGate },
    'per-corpus Hit@10>=95%': { pass: perCorpusGate.every((g) => g.hitAt10Pass), detail: perCorpusGate },
    'macro MRR>=0.70': { pass: fused.mrr >= GATE.macro.mrr, actual: fused.mrr, threshold: GATE.macro.mrr },
    'macro Hit@5 >= baseline-explore + 5pp': {
      pass: fused.hit.at5 - base.hit.at5 >= GATE.macro.hitAt5DeltaVsBaseline,
      actualFused: fused.hit.at5, actualBaseline: base.hit.at5,
      delta: fused.hit.at5 - base.hit.at5, threshold: GATE.macro.hitAt5DeltaVsBaseline,
    },
    'hot p50<=150ms': { pass: fused.warmMs.median <= GATE.latencyMs.hotP50, actual: fused.warmMs.median, threshold: GATE.latencyMs.hotP50 },
    'hot p95<=250ms': { pass: fused.warmMs.p95 <= GATE.latencyMs.hotP95, actual: fused.warmMs.p95, threshold: GATE.latencyMs.hotP95 },
    'cold start<=2s': { pass: (fused.coldMs ?? Infinity) <= GATE.latencyMs.coldStart, actual: fused.coldMs, threshold: GATE.latencyMs.coldStart },
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
  child.stdout.on('data', (c) => { stdout += c; });
  const timer = setInterval(() => {
    const p = peakWorkingSet(child.pid);
    if (p !== null) peak = Math.max(peak ?? 0, p);
    const c = currentWorkingSet(child.pid);
    if (c !== null && baselineRss === null) baselineRss = c;
  }, 50);
  const exit = await new Promise((r) => child.on('close', (code, signal) => r({ code, signal })));
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
else await runParent(args.out ?? path.join(REPO, 'docs', 'evidence', '2026-11-03-chunk-fused-holdout.json'));
