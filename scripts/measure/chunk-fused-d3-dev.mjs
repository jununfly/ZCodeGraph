#!/usr/bin/env node
/**
 * chunk-fused-d3-dev.mjs — 1-6-3 D3 注入位置/权重探索（development 60 题，超 v2 冻结范围）。
 *
 * 评估路线（非产品）：仅改本脚本与 .tmp/，不碰 src/、不改 CLI/MCP 默认行为。
 * 防作弊：只在 development 60 题迭代；v2 holdout 24 题冻结，本脚本根本不读它。
 *
 * 设计：构建在 D2 v2 自洽门控注入（scGate=0.4）之上——D3 只改"注入环节本身"：
 *   - 第一遍裸跑 plan() 拿 baseline 排序（pb.base）与第二遍符号注入排序（pb.d1）。
 *   - 沿用 D2 v2 自洽门：scOverlap(base, qTok, 3) < 0.4 才注入，否则回落 base（保护易仓满分）。
 *   - 注入变体由 D3 候选网格构造：
 *       位置 position ∈ {prefix, suffix}
 *       权重 weight   ∈ {uniform, type-boost(类型符号重复加权)}
 *       保留 retention∈ {keep(保留原始NL query), drop(仅符号)}
 *       注入数 cap    ∈ {1,2,3,4,5}
 *     = 40 格。每格仅在 lowConf 时跑一次 plan(augQ)。
 *
 * 参照臂（与 D2 报告对齐）：baseline-explore / chunk-fused-explore(C0) / d1(blanket) / d2(自洽门@0.4)。
 * 指标：per-corpus / macro 的 Hit@5、Hit@10、MRR（沿用 v2 口径，只对比，不判门）。
 *
 * 退出判据（沿用 1-6 协议）：dev Hit@5 须 > d2@0.4 incumbent 0.767 方够格进 holdout；
 *   否则按 1-5 关闭、路径不解锁 1-4。
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

const REF_ARMS = ['baseline-explore', 'chunk-fused-explore', 'd1', 'd2'];
const TOP_K_CHUNKS = 8;
const D1_TOP_CHUNKS = 24;
const D1_MAX_SYMBOLS = 3;
const SC_GATE = 0.4; // D3 base 固定用 D2 v2 自洽门阈值

// D3 候选网格
const POSITIONS = ['prefix', 'suffix'];
const WEIGHTS = ['uniform', 'type-boost'];
const RETENTIONS = ['keep', 'drop'];
const CAPS = [1, 2, 3, 4, 5];

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
// 返回完整 ranked 列表（不切片），由调用方按 cap 切片
function pickSymbolsD1Ranked(scoredChunks, queryText, topK = D1_TOP_CHUNKS) {
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
  return [...freq.entries()].map(([sym, v]) => {
    const toks = splitCamel(sym);
    let align = 0;
    for (const t of toks) if (qTok.has(t)) align++;
    const typeW = v.isType ? 2.0 : 0.4;
    const alignW = 1 + 2 * align;
    return { sym, isType: v.isType, score: v.count * typeW * alignW };
  }).sort((a, b) => b.score - a.score);
}

// ---- D3 注入构造 ----
function buildInjection(ranked, queryText, { position, weight, retention, cap }) {
  const top = ranked.slice(0, cap);
  let syms = top.map((r) => r.sym);
  if (weight === 'type-boost') syms = top.flatMap((r) => (r.isType ? [r.sym, r.sym] : [r.sym]));
  if (syms.length === 0) return retention === 'keep' ? queryText : '';
  const symStr = syms.join(' ');
  if (retention === 'drop') return symStr;
  return position === 'prefix' ? `${symStr} ${queryText}` : `${queryText} ${symStr}`;
}

// ---- 重排辅助（与 D2 一致，供 d2 参照臂） ----
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
function scOverlap(topFiles, chunksByFile, qTok, topK = 3) {
  const union = new Set();
  for (const f of topFiles.slice(0, topK)) for (const t of fileSymToks(f, chunksByFile)) union.add(t);
  if (qTok.size === 0) return 1;
  let hit = 0;
  for (const t of qTok) if (union.has(t)) hit++;
  return hit / qTok.size;
}
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
  if (dev.length !== 60) console.error(`[d3-dev] WARN expected 60 dev, got ${dev.length}`);

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
    metric: 'chunk-fused-d3-dev',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'v2 frozen development 60 queries (5 corpora); D3 injection position/weight sweep ON TOP OF D2 v2 self-consistency gated injection (scGate=0.4). HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v2.json', split: 'development' },
    refArms: REF_ARMS,
    grid: { positions: POSITIONS, weights: WEIGHTS, retentions: RETENTIONS, caps: CAPS },
    config: { c0TopK: TOP_K_CHUNKS, d1TopK: D1_TOP_CHUNKS, d1MaxSymbols: D1_MAX_SYMBOLS, scGate: SC_GATE, modelInitMs: initMs, note: 'D3 sweeps injection string only; gate fixed at D2 v2 self-consistency (top-3 returned-file symbol overlap vs query); incumbent d2@0.4 dev Hit@5=0.767' },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    gridMacro: {},
    incumbent: { arm: 'd2@0.4', hit5: 0.767 },
  };

  // 参照臂 + 网格 的全集行收集
  const refAllRows = Object.fromEntries(REF_ARMS.map((a) => [a, []]));
  const gridAllRows = {}; // key `${position}|${weight}|${retention}|${cap}` -> rows[]

  for (const corpus of devCorpora) {
    const corpusQueries = dev.filter((q) => q.corpus === corpus);
    console.error(`[d3-dev] corpus=${corpus} queries=${corpusQueries.length}`);
    const chunks = chunksByCorpus.get(corpus);
    const chunksByFile = buildChunksByFile(chunks);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const planCache = new Map(); // augQ -> sortedFiles
    const planOf = async (q) => {
      if (!planCache.has(q)) {
        const r = await plan(cg, q, { maxFiles: 10 });
        planCache.set(q, r.sortedFiles.map(([f]) => f));
      }
      return planCache.get(q);
    };

    const corpusEntry = { corpus, refArms: {}, grid: {}, injectionRate: 0 };

    const scoredByQuery = new Map();
    const qEmbedCache = new Map();
    for (const q of corpusQueries) {
      let qv = qEmbedCache.get(q.id);
      if (!qv) { qv = await model.queryEmbed(q.query); qEmbedCache.set(q.id, qv); }
      const scored = chunks.map((c) => ({ c, score: cosine(qv, c.vector) })).sort((a, b) => b.score - a.score);
      scoredByQuery.set(q.id, { qv, scored });
    }

    let lowConfCount = 0;
    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const { qv, scored } = scoredByQuery.get(q.id);
      const qTok = queryTokens(q.query);
      const top1Score = scored[0]?.score ?? 0;
      const base = await planOf(q.query);
      const c0sym = pickSymbolsC0(scored.slice(0, TOP_K_CHUNKS));
      const c0q = c0sym.length ? `${q.query} ${c0sym.join(' ')}` : q.query;
      const c0 = await planOf(c0q);
      const d1sym = pickSymbolsD1Ranked(scored, q.query, D1_TOP_CHUNKS).slice(0, D1_MAX_SYMBOLS).map((r) => r.sym);
      const d1q = d1sym.length ? `${q.query} ${d1sym.join(' ')}` : q.query;
      const d1 = await planOf(d1q);
      const ranked = pickSymbolsD1Ranked(scored, q.query, D1_TOP_CHUNKS);
      const ov = scOverlap(base, chunksByFile, qTok, 3);
      const lowConf = ov < SC_GATE;
      if (lowConf) lowConfCount++;
      planByQuery.set(q.id, { qTok, top1Score, base, c0, d1, ranked, lowConf });
    }
    corpusEntry.injectionRate = lowConfCount / corpusQueries.length;

    // 参照臂
    const refArmFiles = {
      'baseline-explore': (pb) => pb.base,
      'chunk-fused-explore': (pb) => pb.c0,
      'd1': (pb) => pb.d1,
      'd2': (pb) => (pb.lowConf ? mergedRerank(pb, chunksByFile) : pb.base),
    };
    for (const arm of REF_ARMS) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = refArmFiles[arm](pb);
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [], top5: files.slice(0, 5), timedOut: false, augmented: arm };
      });
      corpusEntry.refArms[arm] = { summary: statsOf(rows), results: rows };
      refAllRows[arm].push(...rows);
    }

    // 网格扫描
    for (const position of POSITIONS) {
      corpusEntry.grid[position] = corpusEntry.grid[position] || {};
      for (const weight of WEIGHTS) {
        corpusEntry.grid[position][weight] = corpusEntry.grid[position][weight] || {};
        for (const retention of RETENTIONS) {
          corpusEntry.grid[position][weight][retention] = corpusEntry.grid[position][weight][retention] || {};
          for (const cap of CAPS) {
            const key = `${position}|${weight}|${retention}|${cap}`;
            const rows = [];
            for (const q of corpusQueries) {
              const pb = planByQuery.get(q.id);
              let files;
              if (!pb.lowConf) {
                files = pb.base; // 高置信：所有网格格等价回落 base
              } else {
                const augQ = buildInjection(pb.ranked, q.query, { position, weight, retention, cap });
                files = (augQ && augQ.trim()) ? await planOf(augQ) : pb.base;
              }
              const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
              rows.push({ id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [], top5: files.slice(0, 5), timedOut: false, augmented: key });
            }
            corpusEntry.grid[position][weight][retention][cap] = { summary: statsOf(rows), results: rows };
            if (!gridAllRows[key]) gridAllRows[key] = [];
            gridAllRows[key].push(...rows);
          }
        }
      }
    }

    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of REF_ARMS) report.macro[arm] = statsOf(refAllRows[arm]);
  for (const key of Object.keys(gridAllRows)) report.gridMacro[key] = statsOf(gridAllRows[key]);
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

  console.log('\n=== D3 dev summary (development 60) ===');
  console.log('reference arms:');
  for (const a of REF_ARMS) {
    const m = report.macro[a];
    console.log('  ' + a.padEnd(22), 'Hit@5=' + m.hit.at5.toFixed(3), 'Hit@10=' + m.hit.at10.toFixed(3), 'MRR=' + m.mrr.toFixed(3));
  }
  console.log(`\nincumbent: d2@0.4 dev Hit@5=${report.incumbent.hit5}  (D3 须 > 此值方够格进 holdout)`);
  // 网格 top 表现（按 macro Hit@5 降序）
  const grid = Object.entries(report.gridMacro).map(([k, s]) => ({ k, h5: s.hit.at5, h10: s.hit.at10, mrr: s.mrr })).sort((a, b) => b.h5 - a.h5);
  console.log('\nD3 grid top-12 by macro Hit@5:');
  for (const g of grid.slice(0, 12)) {
    console.log('  ' + g.k.padEnd(34), 'Hit@5=' + g.h5.toFixed(3), 'Hit@10=' + g.h10.toFixed(3), 'MRR=' + g.mrr.toFixed(3));
  }
  const best = grid[0];
  console.log(`\nbest D3 cell: ${best.k} Hit@5=${best.h5.toFixed(3)} ${best.h5 > report.incumbent.hit5 ? 'BEATS incumbent -> qualify for holdout' : 'below incumbent -> route to 1-5'}`);
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, '.tmp', 'measure', 'd3-dev.json'));
