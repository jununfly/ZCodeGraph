#!/usr/bin/env node
/**
 * semantic-rerank-probe.mjs — 1-7-3 轻量语义重排探针。
 *
 * 假设：1-7-1 的 C 臂（基线 plan() ∪ 符号召回）已把期望文件召回进候选集，
 * 但候选集内排序（位置权重 0.4/0.4/0.2）把期望文件压在 top5 之外
 * （rails0.50 / k8s0.42）。本探针检验：能否用现有 BGE chunk 嵌入在 C 的
 * 候选集 *内部* 做语义重排，把期望文件顶进 top5/10。
 *
 * 方法（不引 cross-encoder/LLM 重排模型，复用 1-3-3/1-6 既有资产）：
 *   - 加载 .tmp/chunk-explore-fusion/{corpus}.chunks.json（384 维，rails/k8s 全量 20000）。
 *   - fastembed 对 query 做嵌入（model_optimized.onnx，与 chunk 同空间）。
 *   - 对 C 候选集中的每个文件，取其 chunk 向量，算语义分：
 *       R1 rerankMaxCos  : max_cosine(queryVec, chunkVec) over 该文件 chunks
 *       R2 rerankMeanPool: cosine(queryVec, mean(chunkVec) over 该文件 chunks)
 *   - 候选集内重排 → top10。无 chunk 覆盖的文件保留 C 原位置（fallback）。
 *   - 诊断臂 S chunkRetrieval：纯 chunk 语义检索 top10（不依赖 C），看语义检索天花板。
 *
 * 协议：--split development 先迭代（不哈希断言、可调参）；--split holdout 一次性
 * 评估（先断言候选哈希，禁止调参）。门沿用 v2 §4 / 1-7 exit criteria。
 *
 * 复用：symbol-index-core.mjs（buildSymbolIndex / symbolRecallFiles / mergedRerank）
 * 以完全复刻 1-7-1 的 C 臂候选集，保证与 1-7-1/1-7-2 holdout 同口径。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
  buildSymbolIndex, symbolRecallFiles, mergedRerank,
} from './symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const CHUNK_DIR = path.join(REPO, '.tmp', 'chunk-explore-fusion');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v3.json');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-semantic-rerank-candidate-v1.json');

// 候选配置（dev 可调；holdout 运行前断言此 JSON 的 sha256 须匹配 EXPECTED）。
const CANDIDATE_CONFIG = {
  version: 1,
  method: 'semantic-rerank-within-C',
  rationale: '在 C(基线∪符号召回) 候选集内部用 BGE chunk 嵌入做语义重排，不引入 cross-encoder/LLM。',
  embedding: {
    model: 'Qdrant/bge-small-en-v1.5', dim: 384, pooling: 'CLS',
    querySpace: 'queryEmbed (prefix "query: ")',
    chunkSpace: 'passageEmbed (prefix "passage: ") — chunk-explore-fusion 产物',
  },
  input: 'C = symbol-union-plan (mergedRerank plan() ∪ symbolRecall, top10)',
  rerankStrategies: {
    rerankMaxCos: 'score(file)=max_cosine(queryVec, chunkVec) over chunks with chunk.file==file',
    rerankMeanPool: 'score(file)=cosine(queryVec, mean(chunkVec) over chunks of file)',
  },
  fallback: 'files in C with no chunk coverage keep their C position (sink after scored files)',
  topK: 10,
  arms: ['baseline-explore', 'symbol-union-plan', 'rerankMaxCos', 'rerankMeanPool', 'chunkRetrieval'],
};

// holdout 一次性评估前断言：运行配置不可改动（防误调 / 早停 / 元泄漏）。
const EXPECTED_CANDIDATE_SHA256 = '3feff6a7257c96aa0759f76e4632a338d9c89a5a0109281c3d3e14798adef5ba';

const ARMS = CANDIDATE_CONFIG.arms;
const PRIMARY_RERANK_ARM = 'rerankMaxCos';

function parseArgs(argv) {
  const out = { worker: false, split: 'development', out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--worker') out.worker = true;
    else if (argv[i] === '--split') out.split = argv[++i];
    else if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else throw new Error(`unknown arg: ${argv[i]}`);
  }
  if (!['development', 'holdout'].includes(out.split)) throw new Error(`--split must be development|holdout, got ${out.split}`);
  return out;
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
    misses: rows.filter((r) => r.rank === null && !r.timedOut).map((r) => r.id),
  };
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function loadEmbedder() {
  const requireFromSpike = createRequire(path.join(SPIKE, 'package.json'));
  const { FlagEmbedding, EmbeddingModel, Pooling } = await import(pathToFileURL(requireFromSpike.resolve('fastembed')).href);
  return FlagEmbedding.init({
    model: EmbeddingModel.CUSTOM,
    modelAbsoluteDirPath: MODEL_DIR,
    modelName: 'model_optimized.onnx',
    pooling: Pooling.CLS,
    showDownloadProgress: false,
  });
}

// 加载 chunk 嵌入：返回 { byFile: Map<file, Float32Array[]>, all: {file,vec}[] }
function loadChunks(corpus) {
  const p = path.join(CHUNK_DIR, `${corpus}.chunks.json`);
  if (!fs.existsSync(p)) throw new Error(`missing chunk index: ${p}`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const byFile = new Map();
  const all = [];
  for (const c of data.chunks) {
    const v = Float32Array.from(c.vector);
    all.push({ file: c.file, vec: v });
    if (!byFile.has(c.file)) byFile.set(c.file, []);
    byFile.get(c.file).push(v);
  }
  return { byFile, all };
}

// 候选集内语义重排（R1 max-cos / R2 mean-pool）。无 chunk 覆盖文件保留 C 位置。
function rerankWithinC(cFiles, qVec, chunkByFile, strategy) {
  const scored = [];
  const unsorted = [];
  for (let i = 0; i < cFiles.length; i++) {
    const file = cFiles[i];
    const vecs = chunkByFile.get(file);
    if (!vecs || vecs.length === 0) { unsorted.push({ file, pos: i }); continue; }
    let score;
    if (strategy === 'rerankMaxCos') {
      let best = -Infinity;
      for (const v of vecs) { const s = cosine(qVec, v); if (s > best) best = s; }
      score = best;
    } else { // rerankMeanPool
      const mean = new Float32Array(qVec.length);
      for (const v of vecs) for (let j = 0; j < v.length; j++) mean[j] += v[j];
      for (let j = 0; j < mean.length; j++) mean[j] /= vecs.length;
      score = cosine(qVec, mean);
    }
    scored.push({ file, score, pos: i });
  }
  scored.sort((a, b) => b.score - a.score);
  const reordered = [...scored.map((s) => s.file), ...unsorted.sort((a, b) => a.pos - b.pos).map((u) => u.file)];
  return reordered.slice(0, CANDIDATE_CONFIG.topK);
}

// 诊断：纯 chunk 语义检索 top-K 文件（不依赖 C）。
function chunkRetrievalTopK(qVec, allChunks, topK) {
  const scored = allChunks.map((c) => ({ file: c.file, score: cosine(qVec, c.vec) }));
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const s of scored) { if (!seen.has(s.file)) { seen.add(s.file); out.push(s.file); if (out.length >= topK) break; } }
  return out;
}

async function loadPlan() {
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);
  return { CodeGraph, plan };
}

async function runWorker(split) {
  // ---- holdout 候选哈希断言 ----
  let candidateSha = null;
  if (!fs.existsSync(CANDIDATE_PATH)) {
    // dev 迭代阶段：候选配置 JSON 可能尚未落盘，写入一份再校验。
    fs.mkdirSync(path.dirname(CANDIDATE_PATH), { recursive: true });
    fs.writeFileSync(CANDIDATE_PATH, JSON.stringify(CANDIDATE_CONFIG, null, 2) + '\n', 'utf8');
  }
  const cp = createRequire(path.join(REPO, 'package.json'));
  const crypto = cp('node:crypto');
  const candidateBuf = fs.readFileSync(CANDIDATE_PATH);
  candidateSha = crypto.createHash('sha256').update(candidateBuf).digest('hex');
  if (split === 'holdout') {
    if (EXPECTED_CANDIDATE_SHA256 === 'PENDING_FILL_AT_COMMIT') {
      throw new Error(`holdout requires EXPECTED_CANDIDATE_SHA256 to be pinned; current sha=${candidateSha}. Commit the candidate config first.`);
    }
    if (candidateSha !== EXPECTED_CANDIDATE_SHA256) {
      throw new Error(`candidate hash mismatch: got ${candidateSha}, expected ${EXPECTED_CANDIDATE_SHA256}. Refusing to evaluate (config may have been altered).`);
    }
    console.error(`[rerank-holdout] candidate sha256 OK: ${candidateSha}`);
  } else {
    console.error(`[rerank-dev] candidate sha256 (dev, not enforced): ${candidateSha}`);
  }

  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const queries = frozen.queries.filter((q) => q.split === split);
  console.error(`[rerank] split=${split} queries=${queries.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { CodeGraph, plan } = await loadPlan();
  const model = await loadEmbedder();

  const corpora = [...new Set(queries.map((q) => q.corpus))];
  const idxByCorpus = new Map();
  const chunkByCorpus = new Map();
  for (const c of corpora) {
    idxByCorpus.set(c, buildSymbolIndex(c));
    chunkByCorpus.set(c, loadChunks(c));
  }

  const report = {
    metric: 'semantic-rerank-probe',
    version: 1,
    measuredAt: new Date().toISOString(),
    split,
    scope: split === 'holdout'
      ? 'v3 frozen holdout 24 (rails12+k8s12); one-shot, hash-asserted. DEV NOT USED.'
      : 'v3 frozen development 60 (5 small corpora); iterative. HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v3.json', split },
    arms: ARMS,
    candidateSha256: candidateSha,
    candidate: JSON.parse(candidateBuf.toString('utf8')),
    config: CANDIDATE_CONFIG,
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    gates: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of corpora) {
    const corpusQueries = queries.filter((q) => q.corpus === corpus);
    console.error(`[rerank] corpus=${corpus} queries=${corpusQueries.length}`);
    const idxPath = idxByCorpus.get(corpus);
    const { byFile: chunkByFile, all: allChunks } = chunkByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {}, chunkCoverage: {} };

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const base = await plan(cg, q.query, { maxFiles: 10 });
      const baseFiles = base.sortedFiles.map(([f]) => f);
      const sym = symbolRecallFiles(q.query, idxPath);
      const cFiles = mergedRerank(baseFiles, sym.files, sym.byFile, sym.qTok);
      const qVec = await model.queryEmbed(q.query);
      const r1 = rerankWithinC(cFiles, qVec, chunkByFile, 'rerankMaxCos');
      const r2 = rerankWithinC(cFiles, qVec, chunkByFile, 'rerankMeanPool');
      const s = chunkRetrievalTopK(qVec, allChunks, CANDIDATE_CONFIG.topK);
      // 候选集内 chunk 覆盖度统计
      const covered = cFiles.filter((f) => chunkByFile.has(f) && chunkByFile.get(f).length > 0).length;
      planByQuery.set(q.id, {
        base: baseFiles, union: cFiles, r1, r2, s,
        cChunkCoverage: covered / Math.max(1, cFiles.length),
      });
    }

    for (const [arm, key] of [['baseline-explore', 'base'], ['symbol-union-plan', 'union'], ['rerankMaxCos', 'r1'], ['rerankMeanPool', 'r2'], ['chunkRetrieval', 's']]) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = pb[key];
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, top5: files.slice(0, 5) };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }
    corpusEntry.chunkCoverage = {
      avgCChunkCoverage: corpusQueries.reduce((s, q) => s + planByQuery.get(q.id).cChunkCoverage, 0) / corpusQueries.length,
      totalChunks: allChunks.length,
    };
    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);

  // ---- 门判定（沿用 v2 §4 / 1-7 exit criteria），对 R1/R2 两个重排臂分别判 ----
  const base = report.macro['baseline-explore'];
  const candC = report.macro['symbol-union-plan'];
  const candR1 = report.macro['rerankMaxCos'];
  const candR2 = report.macro['rerankMeanPool'];
  const buildGates = (cand) => {
    const macroHit5Delta = cand.hit.at5 - base.hit.at5;
    const mrrDelta = cand.mrr - base.mrr;
    const hit10Delta = cand.hit.at10 - base.hit.at10;
    const perCorpusHit5 = report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at5, cand: c.arms[Object.keys(c.arms).find((k) => k === 'rerankMaxCos') ? 'rerankMaxCos' : 'rerankMaxCos'].summary.hit.at5 }));
    const perCorpusHit10 = report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at10, cand: c.arms['rerankMaxCos'].summary.hit.at10 }));
    return {
      macroHit5Plus5pp: { pass: macroHit5Delta >= 0.05, delta: macroHit5Delta },
      perCorpusHit5At90: { pass: report.corpora.every((c) => c.arms['rerankMaxCos'].summary.hit.at5 >= 0.90), detail: report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at5, rerankMaxCos: c.arms['rerankMaxCos'].summary.hit.at5, rerankMeanPool: c.arms['rerankMeanPool'].summary.hit.at5 })) },
      perCorpusHit10At95: { pass: report.corpora.every((c) => c.arms['rerankMaxCos'].summary.hit.at10 >= 0.95), detail: report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at10, rerankMaxCos: c.arms['rerankMaxCos'].summary.hit.at10, rerankMeanPool: c.arms['rerankMeanPool'].summary.hit.at10 })) },
      mrrNoRegression: { pass: mrrDelta >= -0.01, delta: mrrDelta },
      hit10NoRegression: { pass: hit10Delta >= 0, delta: hit10Delta },
    };
  };
  // 门以 R1(rerankMaxCos) 为基准臂（与 macro 展示一致）；R2 仅作对照。
  report.gates = buildGates(candR1);
  report.macroDelta = {
    baseline: { hit5: base.hit.at5, hit10: base.hit.at10, mrr: base.mrr },
    C: { hit5: candC.hit.at5, hit10: candC.hit.at10, mrr: candC.mrr },
    rerankMaxCos: { hit5: candR1.hit.at5, hit10: candR1.hit.at10, mrr: candR1.mrr },
    rerankMeanPool: { hit5: candR2.hit.at5, hit10: candR2.hit.at10, mrr: candR2.mrr },
  };
  report.verdict = (report.gates.macroHit5Plus5pp.pass && report.gates.perCorpusHit5At90.pass && report.gates.perCorpusHit10At95.pass && report.gates.mrrNoRegression.pass && report.gates.hit10NoRegression.pass) ? 'PASS' : 'NO-GO';

  process.stdout.write(JSON.stringify(report));
}

function peakWorkingSet(pid) {
  try {
    const { execFileSync } = require('node:child_process');
    const v = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.PeakWorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(v) || null;
  } catch { return null; }
}

async function runParent(args) {
  const start = performance.now();
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', '--split', args.split], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ZCG_ENABLE_EMBEDDING: '0' } });
  let stdout = '';
  let peak = null;
  child.stdout.on('data', (c) => { stdout += c; });
  const timer = setInterval(() => { const p = peakWorkingSet(child.pid); if (p !== null) peak = Math.max(peak ?? 0, p); }, 50);
  const exit = await new Promise((r) => child.on('close', (code, signal) => r({ code, signal })));
  clearInterval(timer);
  if (exit.code !== 0) throw new Error(`worker failed: ${JSON.stringify(exit)}`);
  const report = JSON.parse(stdout);
  report.process = { wallMs: performance.now() - start, peakWorkingSetBytes: peak };
  const out = args.out ?? path.join(REPO, '.tmp', 'measure', `semantic-rerank-${args.split}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\n=== 1-7-3 semantic-rerank PROBE (${args.split}) ===`);
  console.log('arm'.padEnd(20), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(20), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus C vs R1(rerankMaxCos) vs R2(rerankMeanPool) Hit@5:');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(34),
      'A', c.arms['baseline-explore'].summary.hit.at5.toFixed(2),
      ' C', c.arms['symbol-union-plan'].summary.hit.at5.toFixed(2),
      ' R1', c.arms['rerankMaxCos'].summary.hit.at5.toFixed(2),
      ' R2', c.arms['rerankMeanPool'].summary.hit.at5.toFixed(2),
      ' | cCov', c.chunkCoverage.avgCChunkCoverage.toFixed(2), 'chunks', c.chunkCoverage.totalChunks);
  }
  if (args.split === 'holdout') {
    console.log('\nGATES (baseline on rerankMaxCos):');
    for (const [k, v] of Object.entries(report.gates)) {
      if (k === 'perCorpusHit5At90' || k === 'perCorpusHit10At95') continue;
      console.log('  ', k.padEnd(22), v.pass ? 'PASS' : 'FAIL', 'Δ', (v.delta ?? 0).toFixed(3));
    }
    console.log('  ', 'perCorpusHit5At90'.padEnd(22), report.gates.perCorpusHit5At90.pass ? 'PASS' : 'FAIL');
    console.log('  ', 'perCorpusHit10At95'.padEnd(22), report.gates.perCorpusHit10At95.pass ? 'PASS' : 'FAIL');
    console.log('\nVERDICT:', report.verdict);
  }
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker(args.split);
else await runParent(args);
