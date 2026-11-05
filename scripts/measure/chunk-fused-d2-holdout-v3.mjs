#!/usr/bin/env node
/**
 * chunk-fused-d2-holdout-v3.mjs — 1-6 D2 候选的 holdout 一次性评估（冻结配置，禁止调参）。
 *
 * 防作弊：读取 docs/baselines/semantic-retrieval-d2-candidate-v1.json 的冻结配置与哈希；
 * 脚本启动即断言哈希一致，任何中途修改都会使本评估失效。holdout 24 题（rails 12 + k8s 12）
 * 来自 v2 frozen artifact，本脚本只读、不增删 query、不改候选。
 *
 * 评测 arms：baseline-explore / chunk-fused-explore(C0) / d1(blanket) / d2-cos(v1参照) / d2(自洽门,冻结)
 * 判门（沿用 v2 §4 质量门，性能门由 1-3-5 已验证，本脚本仅报告不判）：
 *   - corpus-macro Hit@5 >= baseline + 5pp
 *   - per-corpus Hit@5 >= 90% (rails & k8s)
 *   - per-corpus Hit@10 >= 95%
 *   - MRR / Hit@10 不回退
 * 输出 docs/evidence/2026-11-05-d2-selfconsistency-holdout-v3.json（含 gateEvaluation + verdict）。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as crypto from 'node:crypto';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const CHUNK_DIR = path.join(REPO, '.tmp', 'chunk-explore-fusion');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v2.json');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-d2-candidate-v1.json');

const ARMS = ['baseline-explore', 'chunk-fused-explore', 'd1', 'd2-cos', 'd2'];
const TOP_K_CHUNKS = 8;
const D1_TOP_CHUNKS = 24;
const D1_MAX_SYMBOLS = 3;

function parseArgs(argv) {
  const out = { worker: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--worker') out.worker = true;
    else if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else throw new Error(`unknown arg: ${argv[i]}`);
  }
  return out;
}

// ---- 冻结配置加载 + 哈希断言 ----
function loadFrozenConfig() {
  const cfg = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
  const canonical = JSON.stringify(cfg.config, Object.keys(cfg.config).sort());
  const hash = 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
  if (hash !== cfg.configHash) throw new Error(`FROZEN CONFIG TAMPERED: computed ${hash} != registered ${cfg.configHash}. Aborting holdout eval.`);
  return cfg;
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)];
}
function statsOf(rows) {
  const n = rows.length;
  return {
    queries: n,
    hit: Object.fromEntries([1, 5, 10].map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    coldMs: quantile(rows.map((r) => r.coldMs).filter((v) => typeof v === 'number'), 0.5),
    warmMs: { median: quantile(rows.flatMap((r) => r.warmMs), 0.5), p95: quantile(rows.flatMap((r) => r.warmMs), 0.95) },
  };
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
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
  const cfg = loadFrozenConfig();
  const SC_GATE = cfg.config.scGate;
  if (SC_GATE !== 0.4) throw new Error(`frozen scGate expected 0.4, got ${SC_GATE}`);

  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const holdout = frozen.queries.filter((q) => q.split === 'holdout');
  if (holdout.length !== 24) console.error(`[d2-holdout] WARN expected 24 holdout, got ${holdout.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { model, initMs } = await loadEmbedder();
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const hoCorpora = [...new Set(holdout.map((q) => q.corpus))];
  const chunksByCorpus = new Map();
  for (const c of hoCorpora) chunksByCorpus.set(c, loadChunks(c));

  const report = {
    metric: 'chunk-fused-d2-holdout-v3',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'v2 frozen holdout 24 queries (rails 12 + kubernetes 12). D2 self-consistency-gate candidate ONE-SHOT eval. NO tuning.',
    candidate: cfg,
    configHash: cfg.configHash,
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v2.json', split: 'holdout' },
    arms: ARMS,
    config: { c0TopK: TOP_K_CHUNKS, d1TopK: D1_TOP_CHUNKS, d1MaxSymbols: D1_MAX_SYMBOLS, scGate: SC_GATE, modelInitMs: initMs },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    gateEvaluation: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));
  const qEmbedCache = new Map();

  for (const corpus of hoCorpora) {
    const corpusQueries = holdout.filter((q) => q.corpus === corpus);
    console.error(`[d2-holdout] corpus=${corpus} queries=${corpusQueries.length}`);
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
      const t0 = performance.now();
      let base = await plan(cg, q.query, { maxFiles: 10 });
      const cold = performance.now() - t0;
      const c0sym = pickSymbolsC0(scored.slice(0, TOP_K_CHUNKS));
      const c0q = c0sym.length ? `${q.query} ${c0sym.join(' ')}` : q.query;
      let c0 = await plan(cg, c0q, { maxFiles: 10 });
      const d1sym = pickSymbolsD1(scored, q.query, D1_TOP_CHUNKS, D1_MAX_SYMBOLS);
      const d1q = d1sym.length ? `${q.query} ${d1sym.join(' ')}` : q.query;
      let d1 = await plan(cg, d1q, { maxFiles: 10 });
      const warmArr = [];
      for (let k = 0; k < 3; k++) { const s = performance.now(); await plan(cg, d1q, { maxFiles: 10 }); warmArr.push(performance.now() - s); }
      planByQuery.set(q.id, {
        qTok, top1Score, coldMs: cold, warmMs: warmArr,
        base: base.sortedFiles.map(([f]) => f),
        c0: c0.sortedFiles.map(([f]) => f),
        d1: d1.sortedFiles.map(([f]) => f),
      });
    }

    for (const arm of ARMS) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        let files;
        if (arm === 'baseline-explore') files = pb.base;
        else if (arm === 'chunk-fused-explore') files = pb.c0;
        else if (arm === 'd1') files = pb.d1;
        else if (arm === 'd2-cos') files = pb.top1Score < 0.5 ? mergedRerank(pb, chunksByFile) : pb.base;
        else { // d2 self-consistency gate (frozen)
          const ov = scOverlap(pb.base, chunksByFile, pb.qTok, 3);
          files = ov < SC_GATE ? mergedRerank(pb, chunksByFile) : pb.base;
        }
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: pb.coldMs, warmMs: pb.warmMs, top5: files.slice(0, 5), timedOut: false };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }

    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);

  // ---- v2 质量门判定（沿用 v2 §4） ----
  const base = report.macro['baseline-explore'];
  const d2 = report.macro['d2'];
  const baseCorpusHit5 = Object.fromEntries(report.corpora.map((c) => [c.corpus, c.arms['baseline-explore'].summary.hit.at5]));
  const d2CorpusHit5 = Object.fromEntries(report.corpora.map((c) => [c.corpus, c.arms['d2'].summary.hit.at5]));
  const macroHit5 = (m) => { const v = report.corpora.map((c) => c.arms[m].summary.hit.at5); return v.reduce((a, b) => a + b, 0) / v.length; };
  const macroHit10 = (m) => { const v = report.corpora.map((c) => c.arms[m].summary.hit.at10); return v.reduce((a, b) => a + b, 0) / v.length; };
  const macroMRR = (m) => { const v = report.corpora.map((c) => c.arms[m].summary.mrr); return v.reduce((a, b) => a + b, 0) / v.length; };

  const deltaHit5 = macroHit5('d2') - macroHit5('baseline-explore');
  const gates = {
    'corpus-macro Hit@5 >= baseline + 5pp': { pass: deltaHit5 >= 0.05, delta: +deltaHit5.toFixed(4), threshold: 0.05, baselineMacro: +macroHit5('baseline-explore').toFixed(4), d2Macro: +macroHit5('d2').toFixed(4) },
    'per-corpus Hit@5>=90%': { pass: true, detail: [] },
    'per-corpus Hit@10>=95%': { pass: true, detail: [] },
    'corpus-macro MRR non-regression': { pass: macroMRR('d2') >= macroMRR('baseline-explore'), actual: +macroMRR('d2').toFixed(4), baseline: +macroMRR('baseline-explore').toFixed(4) },
    'corpus-macro Hit@10 non-regression': { pass: macroHit10('d2') >= macroHit10('baseline-explore'), actual: +macroHit10('d2').toFixed(4), baseline: +macroHit10('baseline-explore').toFixed(4) },
  };
  for (const c of report.corpora) {
    const h5 = c.arms['d2'].summary.hit.at5;
    const h10 = c.arms['d2'].summary.hit.at10;
    gates['per-corpus Hit@5>=90%'].detail.push({ corpus: c.corpus, hitAt5: +h5.toFixed(4), hitAt5Pass: h5 >= 0.90 });
    gates['per-corpus Hit@10>=95%'].detail.push({ corpus: c.corpus, hitAt10: +h10.toFixed(4), hitAt10Pass: h10 >= 0.95 });
    if (h5 < 0.90) gates['per-corpus Hit@5>=90%'].pass = false;
    if (h10 < 0.95) gates['per-corpus Hit@10>=95%'].pass = false;
  }
  const verdict = Object.values(gates).every((g) => g.pass) ? 'GO' : 'NO-GO';
  report.gateEvaluation = { gates, verdict };

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

  console.log('\n=== D2 holdout v3 (24 queries: rails12 + k8s12) ===');
  console.log('arm'.padEnd(22), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(22), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus Hit@5:');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(12), 'base', c.arms['baseline-explore'].summary.hit.at5.toFixed(2), ' D2', c.arms['d2'].summary.hit.at5.toFixed(2));
  }
  console.log('\nGATES:');
  for (const [name, g] of Object.entries(report.gateEvaluation.gates)) console.log('  ', g.pass ? 'PASS' : 'FAIL', name, JSON.stringify(g.detail || { delta: g.delta, actual: g.actual, baseline: g.baseline }));
  console.log('\nVERDICT:', report.gateEvaluation.verdict);
  console.log(`written: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, 'docs', 'evidence', '2026-11-05-d2-selfconsistency-holdout-v3.json'));
