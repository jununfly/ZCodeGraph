#!/usr/bin/env node
/**
 * chunk-fused-d2-dev.mjs — 1-6-2 D2 质量探索（development 60 题，超 v2 冻结范围）。
 *
 * 评估路线（非产品）：仅改本脚本与 .tmp/，不碰 src/、不改 CLI/MCP 默认行为。
 * 防作弊：只在 development 60 题迭代；v2 holdout 24 题冻结，本脚本根本不读它。
 *
 * 设计：
 *   - 第一遍裸跑 plan() 拿 baseline 排序（pb.base）与第二遍符号注入排序（pb.d1）。
 *   - d2-cos（v1 参照）：条件门 = top-1 chunk cosine < COS_GATE 才注入。已知该信号无区分度 → 空转。
 *   - d2（v2 主角，自洽门）：条件门 = plan() 返回顶部文件符号与查询的 overlap < SC_GATE 才注入。
 *     这是与"plan() 自身是否自信"正相关的推理期信号（不依赖标签）。
 *   - 注入分支：合并两遍候选集，按 rankScore = 0.4*第一遍位置 + 0.4*第二遍位置 + 0.2*chunk查询对齐 重排
 *     （保留 plan 位置记忆，避免纯 chunk 分数惩罚无 chunk 的期望文件）。
 *   - 高置信分支：直接用第一遍结果，保护易仓满分。
 *
 * Arms: baseline-explore / chunk-fused-explore(C0) / d1(blanket) / d2-cos(v1参照) / d2(自洽门)
 * 指标：per-corpus / macro 的 Hit@5、Hit@10、MRR（沿用 v2 口径，只对比，不判门）。
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

const ARMS = ['baseline-explore', 'chunk-fused-explore', 'd1', 'd2-cos', 'd2'];
const TOP_K_CHUNKS = 8;
const D1_TOP_CHUNKS = 24;
const D1_MAX_SYMBOLS = 3;
const COS_GATE = 0.50; // v1 chunk-cosine 门参照阈值（已知无区分度）
const SC_GATE = [0.0, 0.2, 0.4, 0.6, 0.8]; // v2 自洽门 sweep（顶部返回文件符号与查询 overlap）

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

// ---- C0: 现 v2 融合（top-8 chunk PascalCase/camel 启发式） ----
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
  return [...pascal, ...camel].slice(0, D1_MAX_SYMBOLS);
}

// ---- D1 v2 符号 picker（类型名 + 查询对齐，cap3） ----
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
  for (const s of top) for (const cand of chunkSymbolCandidates(s.c)) addSym(cand.sym, cand.isType);
  const ranked = [...freq.entries()].map(([sym, v]) => {
    const toks = splitCamel(sym);
    let align = 0;
    for (const t of toks) if (qTok.has(t)) align++;
    const typeW = v.isType ? 2.0 : 0.4;
    const alignW = 1 + 2 * align;
    return { sym, score: v.count * typeW * alignW };
  }).sort((a, b) => b.score - a.score);
  return ranked.slice(0, cap).map((r) => r.sym);
}

// ---- 重排辅助 ----
function buildChunksByFile(chunks) {
  const m = new Map();
  for (const c of chunks) {
    if (!c.file) continue;
    if (!m.has(c.file)) m.set(c.file, []);
    m.get(c.file).push(c);
  }
  return m;
}
function fileSymToks(file, chunksByFile) {
  const chs = chunksByFile.get(file);
  if (!chs) return new Set();
  const toks = new Set();
  for (const c of chs) for (const cand of chunkSymbolCandidates(c)) for (const t of splitCamel(cand.sym)) toks.add(t);
  return toks;
}
function chunkAlign(file, chunksByFile, qTok) {
  if (!chunksByFile.get(file) || qTok.size === 0) return 0;
  const symToks = fileSymToks(file, chunksByFile);
  let hit = 0;
  for (const t of qTok) if (symToks.has(t)) hit++;
  return hit / qTok.size;
}
// plan() 返回顶部文件符号与查询的 overlap（自洽度信号，推理期可用，不依赖标签）
function scOverlap(topFiles, chunksByFile, qTok, topK = 3) {
  const union = new Set();
  for (const f of topFiles.slice(0, topK)) for (const t of fileSymToks(f, chunksByFile)) union.add(t);
  if (qTok.size === 0) return 1;
  let hit = 0;
  for (const t of qTok) if (union.has(t)) hit++;
  return hit / qTok.size;
}
// 融合重排：保留 plan 双遍位置记忆 + chunk 查询对齐辅助，不单用 chunk 分数
function rankScoreOf(file, idxA, idxB, chunksByFile, qTok) {
  const a = idxA < 0 ? 0 : (10 - idxA) / 10;
  const b = idxB < 0 ? 0 : (10 - idxB) / 10;
  const c = chunkAlign(file, chunksByFile, qTok);
  return 0.4 * a + 0.4 * b + 0.2 * c;
}
function uniqueFiles(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) for (const f of list) if (!seen.has(f)) { seen.add(f); out.push(f); }
  return out;
}
function mergedRerank(pb, chunksByFile) {
  const merged = uniqueFiles(pb.base, pb.d1);
  const idxA = new Map(pb.base.map((f, i) => [f, i]));
  const idxB = new Map(pb.d1.map((f, i) => [f, i]));
  return merged
    .map((f) => ({ f, s: rankScoreOf(f, idxA.get(f) ?? -1, idxB.get(f) ?? -1, chunksByFile, pb.qTok) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.f)
    .slice(0, 10);
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
  if (dev.length !== 60) console.error(`[d2-dev] WARN expected 60 dev, got ${dev.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { model, initMs } = await loadEmbedder();
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const devCorpora = [...new Set(dev.map((q) => q.corpus))];
  const chunksByCorpus = new Map();
  for (const c of devCorpora) chunksByCorpus.set(c, loadChunks(c));

  const report = {
    metric: 'chunk-fused-d2-dev',
    version: 2,
    measuredAt: new Date().toISOString(),
    scope: 'v2 frozen development 60 queries (5 corpora); D2 self-consistency-gate selective fusion vs C0 vs D1 vs baseline. HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v2.json', split: 'development' },
    arms: ARMS,
    sweepThresholds: SC_GATE,
    config: { c0TopK: TOP_K_CHUNKS, d1TopK: D1_TOP_CHUNKS, d1MaxSymbols: D1_MAX_SYMBOLS, cosGate: COS_GATE, scGate: SC_GATE, modelInitMs: initMs, d2Note: 'selective fusion via self-consistency gate (top-3 returned-file symbol overlap vs query); merged dual-pass rerank 0.4*passA+0.4*passB+0.2*chunkAlign' },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));
  const qEmbedCache = new Map();

  for (const corpus of devCorpora) {
    const corpusQueries = dev.filter((q) => q.corpus === corpus);
    console.error(`[d2-dev] corpus=${corpus} queries=${corpusQueries.length}`);
    const chunks = chunksByCorpus.get(corpus);
    const chunksByFile = buildChunksByFile(chunks);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {}, d2Sweep: {} };

    const scoredByQuery = new Map();
    for (const q of corpusQueries) {
      let qv = qEmbedCache.get(q.id);
      if (!qv) { qv = await model.queryEmbed(q.query); qEmbedCache.set(q.id, qv); }
      const scored = chunks.map((c) => ({ c, score: cosine(qv, c.vector) })).sort((a, b) => b.score - a.score);
      scoredByQuery.set(q.id, { qv, scored });
    }

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const { qv, scored } = scoredByQuery.get(q.id);
      const qTok = queryTokens(q.query);
      const top1Score = scored[0]?.score ?? 0;
      let base = await plan(cg, q.query, { maxFiles: 10 });
      const c0sym = pickSymbolsC0(scored.slice(0, TOP_K_CHUNKS));
      const c0q = c0sym.length ? `${q.query} ${c0sym.join(' ')}` : q.query;
      let c0 = await plan(cg, c0q, { maxFiles: 10 });
      const d1sym = pickSymbolsD1(scored, q.query, D1_TOP_CHUNKS, D1_MAX_SYMBOLS);
      const d1q = d1sym.length ? `${q.query} ${d1sym.join(' ')}` : q.query;
      let d1 = await plan(cg, d1q, { maxFiles: 10 });
      planByQuery.set(q.id, {
        qTok, top1Score,
        base: base.sortedFiles.map(([f]) => f),
        c0: c0.sortedFiles.map(([f]) => f),
        d1: d1.sortedFiles.map(([f]) => f),
      });
    }

    for (const arm of ['baseline-explore', 'chunk-fused-explore', 'd1']) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = arm === 'baseline-explore' ? pb.base : arm === 'chunk-fused-explore' ? pb.c0 : pb.d1;
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [], top5: files.slice(0, 5), timedOut: false, augmented: '' };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }

    // d2-cos: v1 chunk-cosine 门参照（已知无区分度）
    {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const lowConf = pb.top1Score < COS_GATE;
        const files = lowConf ? mergedRerank(pb, chunksByFile) : pb.base;
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [], top5: files.slice(0, 5), timedOut: false, augmented: `cosGate<${COS_GATE} lowConf=${lowConf}` };
      });
      corpusEntry.arms['d2-cos'] = { summary: statsOf(rows), results: rows };
      perArmAllRows['d2-cos'].push(...rows);
    }

    // d2: 自洽门 sweep
    for (const g of SC_GATE) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const ov = scOverlap(pb.base, chunksByFile, pb.qTok, 3);
        const lowConf = ov < g;
        const files = lowConf ? mergedRerank(pb, chunksByFile) : pb.base;
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [], top5: files.slice(0, 5), timedOut: false, augmented: `scGate<${g} ov=${ov.toFixed(2)} lowConf=${lowConf}` };
      });
      corpusEntry.d2Sweep[String(g)] = { summary: statsOf(rows), results: rows };
      if (g === 0.4) {
        corpusEntry.arms['d2'] = { summary: statsOf(rows), results: rows };
        perArmAllRows['d2'].push(...rows);
      }
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

  console.log('\n=== D2 v2 dev summary (development 60) ===');
  console.log('arm'.padEnd(22), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(22), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nD2 self-consistency gate sweep (macro Hit@5):');
  for (const g of report.sweepThresholds) {
    const sum = report.corpora.reduce((acc, c) => {
      const s = c.d2Sweep[String(g)].summary;
      return { n: acc.n + s.queries, h5: acc.h5 + s.hit.at5 * s.queries };
    }, { n: 0, h5: 0 });
    console.log('  scGate=' + String(g).padEnd(5), 'Hit@5=', (sum.h5 / sum.n).toFixed(3));
  }
  console.log('\nper-corpus Hit@5 (d2 @scGate=0.4):');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(34), 'base', c.arms['baseline-explore'].summary.hit.at5.toFixed(2), ' C0', c.arms['chunk-fused-explore'].summary.hit.at5.toFixed(2), ' D1', c.arms['d1'].summary.hit.at5.toFixed(2), ' D2', c.arms['d2'].summary.hit.at5.toFixed(2));
  }
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, '.tmp', 'measure', 'd2-dev.json'));
