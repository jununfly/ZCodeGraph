#!/usr/bin/env node
/**
 * chunk-fused-holdout-gate-v2.mjs — 1-3-4 v2 acceptance gate on frozen holdout.
 *
 * Arms:
 *   - baseline-explore           : plan(cg, query, { maxFiles: 10 })
 *   - chunk-fused-explore (C0)   : plan(cg, augmentedQuery, { maxFiles: 10 })
 *   - chunk-fused-r1 (C1)        : C0 + R1 chunk-score weighted injection
 *   - chunk-fused-r3 (C2)        : C0 + R3 same-file aggregation rerank
 *
 * Evaluated on v2 frozen holdout (24 queries: rails 12 + kubernetes 12).
 * Gates from v2 §4:
 *   corpus-macro Hit@5 >= current Explore + 5pp
 *   corpus-macro MRR and Hit@10 non-regression vs current Explore
 *   per-corpus Hit@5>=90%, Hit@10>=95%
 *   warm p50<=150ms, p95<=250ms; cold<=2s; large-corpus p95<=500ms
 *   peak RSS<=768MiB; steady delta<=512MiB
 *   exact-name safety, storage/indexing, degradation, freshness (to be added)
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
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v2.json');

const ARMS = ['baseline-explore', 'chunk-fused-explore', 'chunk-fused-r1', 'chunk-fused-r3'];
const TOP_K_CHUNKS = 8;
const MAX_SYMBOLS_INJECT = 5;

const GATE = {
  perCorpus: { hitAt5: 0.9, hitAt10: 0.95 },
  macro: { hitAt5DeltaVsBaseline: 0.05 },
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
  const timeouts = rows.filter((r) => r.timedOut).map((r) => r.id);
  return {
    queries: n,
    hit: Object.fromEntries([1, 5, 10].map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    misses: rows.filter((r) => r.rank === null && !r.timedOut).map((r) => r.id),
    timeouts,
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

// C0: PascalCase priority + length filter (current heuristic)
function pickSymbolsToInjectC0(topChunks) {
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

// C1: R1 — chunk-score weighted injection (replace PascalCase heuristic with score order)
function pickSymbolsToInjectC1(scoredChunks) {
  const seen = new Set();
  const symbols = [];
  for (const s of scoredChunks) {
    const n = s.c.name;
    if (!n || n.length < 4 || seen.has(n)) continue;
    if (/^(get|set|to|from|of|new|create|build|make|do|handle|on)_?[a-z]/i.test(n) && n.length < 10) continue;
    seen.add(n);
    symbols.push(n);
    if (symbols.length >= MAX_SYMBOLS_INJECT) break;
  }
  return symbols;
}

// C2: R3 — same-file aggregation rerank (boost files with multiple chunks in top-8)
function rerankFilesC2(files, scoredChunks) {
  // Count chunks per file in top-8
  const fileChunkCount = new Map();
  for (const s of scoredChunks) {
    const f = s.c.file;
    fileChunkCount.set(f, (fileChunkCount.get(f) ?? 0) + 1);
  }
  // Boost score: files with more chunks get higher rank
  // This is a post-hoc rerank on plan() output — we can't change plan() internals
  // So we return the files reordered by chunk count, then by original order
  const fileScore = new Map();
  for (const [file] of files) {
    fileScore.set(file, fileChunkCount.get(file) ?? 0);
  }
  return files.sort((a, b) => {
    const scoreDiff = (fileScore.get(b[0]) ?? 0) - (fileScore.get(a[0]) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return 0; // preserve original order for ties
  });
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
  if (holdout.length !== 24) throw new Error(`expected 24 holdout, got ${holdout.length}`);

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
    metric: 'chunk-fused-holdout-gate-v2',
    version: 2,
    measuredAt: new Date().toISOString(),
    scope: 'v2 frozen holdout (rails 12 + kubernetes 12); C0/C1/C2 vs baseline-explore',
    baseline: { path: 'docs/baselines/semantic-retrieval-human-frozen-v2.json', reviewedAt: frozen.review.reviewedAt },
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
    console.error(`[gate-v2] corpus=${corpus} queries=${corpusQueries.length}`);
    const chunks = chunksByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {} };

    for (const arm of ARMS) {
      console.error(`[gate-v2] ${corpus} arm=${arm} start`);
      const armStart = performance.now();
      const rowsById = new Map();
      let queryIndex = 0;
      for (let repetition = 0; repetition < 4; repetition++) {
        for (const q of corpusQueries) {
          queryIndex++;
          const qStart = performance.now();
          let augmentedQuery = q.query;
          let scoredChunks = null;
          if (arm === 'chunk-fused-explore' || arm === 'chunk-fused-r1' || arm === 'chunk-fused-r3') {
            const qv = await model.queryEmbed(q.query);
            scoredChunks = chunks.map((c) => ({ c, score: cosine(qv, c.vector) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, TOP_K_CHUNKS);
            let symbols;
            if (arm === 'chunk-fused-r1') {
              symbols = pickSymbolsToInjectC1(scoredChunks);
            } else {
              symbols = pickSymbolsToInjectC0(scoredChunks.map((s) => s.c));
            }
            if (symbols.length > 0) augmentedQuery = `${q.query} ${symbols.join(' ')}`;
          }
          const start = performance.now();
          let result;
          let timedOut = false;
          try {
            result = await Promise.race([
              plan(cg, augmentedQuery, { maxFiles: 10 }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('plan timeout 30s')), 30000)),
            ]);
          } catch (err) {
            if (err.message === 'plan timeout 30s') {
              timedOut = true;
              result = { sortedFiles: [] };
            } else {
              throw err;
            }
          }
          let files = result.sortedFiles;
          // C2: apply same-file aggregation rerank
          if (arm === 'chunk-fused-r3' && scoredChunks) {
            files = rerankFilesC2(files, scoredChunks);
          }
          const elapsed = performance.now() - start;
          const filePaths = files.map(([f]) => f);
          const expected = new Set(q.expectedFiles);
          const rank = timedOut ? null : (filePaths.findIndex((f) => expected.has(f)) + 1 || null);
          if (timedOut) {
            console.error(`[gate-v2] TIMEOUT ${corpus} ${arm} ${q.id} (>30s)`);
          }
          if (repetition === 0) {
            rowsById.set(q.id, {
              id: q.id, corpus: q.corpus, rank,
              coldMs: elapsed, warmMs: [],
              top5: filePaths.slice(0, 5),
              timedOut,
            });
          } else {
            rowsById.get(q.id).warmMs.push(elapsed);
          }
          const qElapsed = performance.now() - qStart;
          if (queryIndex % 10 === 0 || queryIndex === corpusQueries.length * 4) {
            const totalElapsed = ((performance.now() - armStart) / 1000).toFixed(1);
            console.error(`[gate-v2] ${corpus} ${arm} ${queryIndex}/${corpusQueries.length * 4} queries (${totalElapsed}s, last q: ${qElapsed.toFixed(0)}ms)`);
          }
        }
      }
      const rows = [...rowsById.values()];
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
      const armElapsed = ((performance.now() - armStart) / 1000).toFixed(1);
      console.error(`[gate-v2] ${corpus} arm=${arm} done (${armElapsed}s)`);
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
  const base = report.macro['baseline-explore'];

  // Corpus-macro: unweighted mean of per-corpus metrics
  const corpusMacro = (arm, metric) => {
    const values = report.corpora.map((c) => c.arms[arm].summary[metric]);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const perCorpusGate = (arm) => report.corpora.map((c) => {
    const s = c.arms[arm].summary;
    return {
      corpus: c.corpus,
      hitAt5: s.hit.at5, hitAt5Pass: s.hit.at5 >= GATE.perCorpus.hitAt5,
      hitAt10: s.hit.at10, hitAt10Pass: s.hit.at10 >= GATE.perCorpus.hitAt10,
    };
  });

  const largeCorpus = report.corpora.find((c) => c.corpus === 'kubernetes');
  const largeCorpusP95 = largeCorpus?.arms['chunk-fused-explore'].summary.warmMs.p95 ?? null;

  const peakRss = report.process?.peakWorkingSetBytes ?? null;
  const steadyRss = report.process?.steadyWorkingSetBytes ?? null;

  const gates = {};
  for (const arm of ['chunk-fused-explore', 'chunk-fused-r1', 'chunk-fused-r3']) {
    const s = report.macro[arm];
    const prefix = arm.replace('chunk-fused-', '');
    gates[`${prefix} corpus-macro Hit@5 >= baseline + 5pp`] = {
      pass: corpusMacro(arm, 'hit')?.at5 - corpusMacro('baseline-explore', 'hit')?.at5 >= GATE.macro.hitAt5DeltaVsBaseline,
      actual: corpusMacro(arm, 'hit')?.at5,
      baseline: corpusMacro('baseline-explore', 'hit')?.at5,
      delta: corpusMacro(arm, 'hit')?.at5 - corpusMacro('baseline-explore', 'hit')?.at5,
      threshold: GATE.macro.hitAt5DeltaVsBaseline,
    };
    gates[`${prefix} corpus-macro MRR non-regression`] = {
      pass: corpusMacro(arm, 'mrr') >= corpusMacro('baseline-explore', 'mrr'),
      actual: corpusMacro(arm, 'mrr'),
      baseline: corpusMacro('baseline-explore', 'mrr'),
    };
    gates[`${prefix} corpus-macro Hit@10 non-regression`] = {
      pass: corpusMacro(arm, 'hit')?.at10 >= corpusMacro('baseline-explore', 'hit')?.at10,
      actual: corpusMacro(arm, 'hit')?.at10,
      baseline: corpusMacro('baseline-explore', 'hit')?.at10,
    };
    gates[`${prefix} per-corpus Hit@5>=90%`] = { pass: perCorpusGate(arm).every((g) => g.hitAt5Pass), detail: perCorpusGate(arm) };
    gates[`${prefix} per-corpus Hit@10>=95%`] = { pass: perCorpusGate(arm).every((g) => g.hitAt10Pass), detail: perCorpusGate(arm) };
    gates[`${prefix} hot p50<=150ms`] = { pass: s.warmMs.median <= GATE.latencyMs.hotP50, actual: s.warmMs.median, threshold: GATE.latencyMs.hotP50 };
    gates[`${prefix} hot p95<=250ms`] = { pass: s.warmMs.p95 <= GATE.latencyMs.hotP95, actual: s.warmMs.p95, threshold: GATE.latencyMs.hotP95 };
    gates[`${prefix} cold start<=2s`] = { pass: (s.coldMs ?? Infinity) <= GATE.latencyMs.coldStart, actual: s.coldMs, threshold: GATE.latencyMs.coldStart };
    gates[`${prefix} large-corpus p95<=500ms (kubernetes)`] = { pass: largeCorpusP95 !== null && largeCorpusP95 <= GATE.latencyMs.largeCorpusP95, actual: largeCorpusP95, threshold: GATE.latencyMs.largeCorpusP95 };
    gates[`${prefix} peak RSS<=768MiB`] = { pass: peakRss !== null && peakRss <= GATE.rssBytes.peak, actual: peakRss, threshold: GATE.rssBytes.peak };
    gates[`${prefix} steady RSS delta<=512MiB`] = { pass: steadyRss !== null && steadyRss <= GATE.rssBytes.steadyDelta, actual: steadyRss, threshold: GATE.rssBytes.steadyDelta };
  }

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
else await runParent(args.out ?? path.join(REPO, 'docs', 'evidence', '2026-11-04-chunk-fused-holdout-v2.json'));
