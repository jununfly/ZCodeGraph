#!/usr/bin/env node
/**
 * chunk-fused-d1-dev.mjs — 1-6-1 D1 质量探索（development 60 题，超 v2 冻结范围）。
 *
 * 评估路线（非产品）：仅改本脚本与 .tmp/，不碰 src/、不改 CLI/MCP 默认行为。
 * 防作弊：只在 development 60 题迭代；v2 holdout 24 题冻结，本脚本根本不读它。
 *
 * Arms:
 *   - baseline-explore       : plan(cg, query, { maxFiles: 10 })              （当前 explore 基线）
 *   - chunk-fused-explore(C0): 现 v2 融合（top-8 chunk PascalCase 启发式注入）
 *   - d1                     : 拓宽符号注入源（top-24 跨 chunk 频率 + 调用目标 + 查询对齐）
 *
 * 指标：per-corpus / macro 的 Hit@5、Hit@10、MRR（沿用 v2 口径，只做对比，不判门）。
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

const ARMS = ['baseline-explore', 'chunk-fused-explore', 'd1'];
const TOP_K_CHUNKS = 8;
const D1_TOP_CHUNKS = 24;
const MAX_SYMBOLS_INJECT = 5;
const D1_MAX_SYMBOLS = 3; // v2: precision-first, down from 5

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
    misses: rows.filter((r) => r.rank === null && !r.timedOut).map((r) => r.id),
    warmMs: { median: quantile(latencies, 0.5), p95: quantile(latencies, 0.95), max: latencies.length > 0 ? Math.max(...latencies) : null },
    coldMs: quantile(rows.map((r) => r.coldMs).filter((v) => typeof v === 'number'), 0.5),
  };
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---- C0: 现 v2 融合（top-8 chunk PascalCase/camel 启发式，沿用 v2） ----
function pickSymbolsC0(topChunks) {
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

// ---- D1: 拓宽符号注入源 ----
function splitCamel(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase().split(/[\s_-]+/).filter(Boolean);
}
function queryTokens(q) {
  return new Set((q.toLowerCase().match(/[a-z0-9_]+/g) || []));
}
function chunkSymbolCandidates(c) {
  const cands = [];
  for (const n of [c.name, c.qualifiedName]) {
    if (!n) continue;
    const sym = n.includes('::') ? n.split('::').pop() : n;
    if (!sym || sym.length < 4) continue;
    if (/^(get|set|to|from|of|new|create|build|make|do|handle|on)_?[a-z]/i.test(sym) && sym.length < 10) continue;
    if (/^[A-Z][A-Za-z0-9]{3,}/.test(sym)) cands.push({ sym, isType: true });
    else if (/^[a-z][A-Za-z0-9]{3,}/.test(sym)) cands.push({ sym, isType: false });
  }
  return cands;
}
// NOTE D1 v2: chunkCallTargets() removed — call-target noise (next/Error/callback/send/User)
// polluted queries in v1 and pushed correct files out of top-5. v2 keeps only name/qualifiedName
// symbols (type names + camel identifiers) and strongly weights query-aligned type names.
function pickSymbolsD1(scoredChunks, queryText, topK = D1_TOP_CHUNKS, cap = D1_MAX_SYMBOLS) {
  const top = scoredChunks.slice(0, topK);
  const qTok = queryTokens(queryText);
  const freq = new Map();
  const addSym = (sym, isType) => {
    if (!sym || sym.length < 4) return;
    if (/^(get|set|to|from|of|new|create|build|make|do|handle|on)_?[a-z]/i.test(sym) && sym.length < 10) return;
    if (!/^[A-Za-z][A-Za-z0-9]{3,}/.test(sym)) return;
    const cur = freq.get(sym) || { count: 0, isType: false };
    cur.count += 1;
    if (isType) cur.isType = true;
    freq.set(sym, cur);
  };
  for (const s of top) {
    for (const cand of chunkSymbolCandidates(s.c)) addSym(cand.sym, cand.isType);
  }
  const ranked = [...freq.entries()].map(([sym, v]) => {
    const toks = splitCamel(sym);
    let align = 0;
    for (const t of toks) if (qTok.has(t)) align++;
    // Strongly favor type symbols that align with query tokens; suppress non-type unless aligned.
    const typeW = v.isType ? 2.0 : 0.4;
    const alignW = 1 + 2 * align;
    return { sym, score: v.count * typeW * alignW };
  }).sort((a, b) => b.score - a.score);
  return ranked.slice(0, cap).map((r) => r.sym);
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
  const dev = frozen.queries.filter((q) => q.split === 'development');
  if (dev.length !== 60) console.error(`[d1-dev] WARN expected 60 dev, got ${dev.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { model, initMs } = await loadEmbedder();
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const chunksByCorpus = new Map();
  const devCorpora = [...new Set(dev.map((q) => q.corpus))];
  for (const c of devCorpora) chunksByCorpus.set(c, loadChunks(c));

  const report = {
    metric: 'chunk-fused-d1-dev',
    version: 2,
    measuredAt: new Date().toISOString(),
    scope: 'v2 frozen development 60 queries (5 corpora); D1 vs C0 vs baseline-explore. HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v2.json', split: 'development' },
    arms: ARMS,
    config: { c0TopK: TOP_K_CHUNKS, d1TopK: D1_TOP_CHUNKS, d1MaxSymbols: D1_MAX_SYMBOLS, maxSymbolsInject: MAX_SYMBOLS_INJECT, modelInitMs: initMs, d1Note: 'v2: dropped call-target noise, type+query-align weighted, cap 3' },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));
  const qEmbedCache = new Map();

  for (const corpus of devCorpora) {
    const corpusQueries = dev.filter((q) => q.corpus === corpus);
    console.error(`[d1-dev] corpus=${corpus} queries=${corpusQueries.length}`);
    const chunks = chunksByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {} };

    // precompute scoredChunks + query embedding per query (reused across arms/reps)
    const scoredByQuery = new Map();
    for (const q of corpusQueries) {
      let qv = qEmbedCache.get(q.id);
      if (!qv) { qv = await model.queryEmbed(q.query); qEmbedCache.set(q.id, qv); }
      const scored = chunks.map((c) => ({ c, score: cosine(qv, c.vector) })).sort((a, b) => b.score - a.score);
      scoredByQuery.set(q.id, scored);
    }

    for (const arm of ARMS) {
      console.error(`[d1-dev] ${corpus} arm=${arm} start`);
      const armStart = performance.now();
      const rowsById = new Map();
      let queryIndex = 0;
      for (let repetition = 0; repetition < 4; repetition++) {
        for (const q of corpusQueries) {
          queryIndex++;
          const qStart = performance.now();
          const scored = scoredByQuery.get(q.id);
          let augmentedQuery = q.query;
          if (arm === 'chunk-fused-explore') {
            const symbols = pickSymbolsC0(scored.slice(0, TOP_K_CHUNKS));
            if (symbols.length > 0) augmentedQuery = `${q.query} ${symbols.join(' ')}`;
          } else if (arm === 'd1') {
            const symbols = pickSymbolsD1(scored, q.query, D1_TOP_CHUNKS, D1_MAX_SYMBOLS);
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
            if (err.message === 'plan timeout 30s') { timedOut = true; result = { sortedFiles: [] }; }
            else throw err;
          }
          const elapsed = performance.now() - start;
          const filePaths = result.sortedFiles.map(([f]) => f);
          const expected = new Set(q.expectedFiles);
          const rank = timedOut ? null : (filePaths.findIndex((f) => expected.has(f)) + 1 || null);
          if (timedOut) console.error(`[d1-dev] TIMEOUT ${corpus} ${arm} ${q.id}`);
          if (repetition === 0) {
            rowsById.set(q.id, { id: q.id, corpus: q.corpus, rank, coldMs: elapsed, warmMs: [], top5: filePaths.slice(0, 5), timedOut, augmented: augmentedQuery });
          } else {
            rowsById.get(q.id).warmMs.push(elapsed);
          }
        }
      }
      const rows = [...rowsById.values()];
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
      const armElapsed = ((performance.now() - armStart) / 1000).toFixed(1);
      console.error(`[d1-dev] ${corpus} arm=${arm} done (${armElapsed}s)`);
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

async function runParent(out) {
  const start = performance.now();
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker'], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ZCG_ENABLE_EMBEDDING: '0' } });
  let stdout = '';
  let peak = null;
  child.stdout.on('data', (c) => { stdout += c; });
  const timer = setInterval(() => { const p = peakWorkingSet(child.pid); if (p !== null) peak = Math.max(peak ?? 0, p); }, 50);
  const exit = await new Promise((r) => child.on('close', (code, signal) => r({ code, signal })));
  clearInterval(timer);
  if (exit.code !== 0) throw new Error(`worker failed: ${JSON.stringify(exit)}`);
  const report = JSON.parse(stdout);
  report.process = { wallMs: performance.now() - start, peakWorkingSetBytes: peak };
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text, 'utf8');
  // console summary
  const arms = ['baseline-explore', 'chunk-fused-explore', 'd1'];
  console.log('\n=== D1 dev summary (development 60) ===');
  console.log('arm'.padEnd(22), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR'.padEnd(8), 'coldMs');
  for (const a of arms) {
    const m = report.macro[a];
    console.log(a.padEnd(22), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)).padEnd(8), String(Math.round(m.coldMs ?? 0)));
  }
  console.log('\nper-corpus Hit@5:');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(34), 'base', c.arms['baseline-explore'].summary.hit.at5.toFixed(2), ' C0', c.arms['chunk-fused-explore'].summary.hit.at5.toFixed(2), ' D1', c.arms['d1'].summary.hit.at5.toFixed(2));
  }
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, '.tmp', 'measure', 'd1-dev.json'));
