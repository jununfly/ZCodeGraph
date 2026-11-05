#!/usr/bin/env node
/**
 * graph-fused-holdout-v3.mjs — 1-7-2 调用图/类型图召回 v3 holdout 一次性评估。
 *
 * 防作弊：只读 v3 frozen holdout 24 题（rails 12 + k8s 12），配置冻结前断言
 * 候选哈希，禁止调参/早停。dev 60 仅作迭代，本脚本根本不读它。
 *
 * Arms：
 *   - A  baseline-explore：现 plan() 不动
 *   - C  symbol-union-plan：基线 ∪ 符号召回（1-7-1 最佳臂，对照）
 *   - G1 symbol-graph-union：基线 ∪ 符号召回 ∪ 图邻居文件（本次被试）
 *
 * 门（沿用 v2 §4，1-7 exit criteria）。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
  buildSymbolIndex, symbolRecallFiles, mergedRerank, graphExpand, uniqueFiles,
} from './symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEASURE_DIR = path.join(REPO, '.tmp', 'measure');
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v3.json');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-symbol-graph-candidate-v1.json');

const EXPECTED_CANDIDATE_SHA256 = 'dc73fb7dbefb5a2832a4741b8268bc2bb3d6cceada53b86227ee52f6017ae782';
const GRAPH_TOP_K = 15;

const ARMS = ['baseline-explore', 'symbol-union-plan', 'symbol-graph-union'];

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
  const n = rows.length;
  return {
    queries: n,
    hit: Object.fromEntries([1, 5, 10].map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    misses: rows.filter((r) => r.rank === null && !r.timedOut).map((r) => r.id),
  };
}

async function loadPlan() {
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);
  return { CodeGraph, plan };
}

async function runWorker() {
  const cp = createRequire(path.join(REPO, 'package.json'));
  const crypto = cp('node:crypto');
  const candidateBuf = fs.readFileSync(CANDIDATE_PATH);
  const candidateSha = crypto.createHash('sha256').update(candidateBuf).digest('hex');
  if (candidateSha !== EXPECTED_CANDIDATE_SHA256) {
    throw new Error(`candidate hash mismatch: got ${candidateSha}, expected ${EXPECTED_CANDIDATE_SHA256}. Refusing to evaluate.`);
  }
  console.error(`[graph-holdout] candidate sha256 OK: ${candidateSha}`);

  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const holdout = frozen.queries.filter((q) => q.split === 'holdout');
  if (holdout.length !== 24) console.error(`[graph-holdout] WARN expected 24 holdout, got ${holdout.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { CodeGraph, plan } = await loadPlan();

  const holdoutCorpora = [...new Set(holdout.map((q) => q.corpus))];
  const idxByCorpus = new Map();
  for (const c of holdoutCorpora) idxByCorpus.set(c, buildSymbolIndex(c));

  const report = {
    metric: 'graph-fused-holdout-v3',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'v3 frozen holdout 24 queries (rails12 + k8s12); one-shot. DEV NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v3.json', split: 'holdout' },
    arms: ARMS,
    candidateSha256: candidateSha,
    candidate: JSON.parse(candidateBuf.toString('utf8')),
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
    gates: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of holdoutCorpora) {
    const corpusQueries = holdout.filter((q) => q.corpus === corpus);
    console.error(`[graph-holdout] corpus=${corpus} queries=${corpusQueries.length}`);
    const idxPath = idxByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join('C:/workspace/measure-corpus', corpus));
    const corpusEntry = { corpus, arms: {}, graphStats: {} };

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const base = await plan(cg, q.query, { maxFiles: 10 });
      const baseFiles = base.sortedFiles.map(([f]) => f);
      const sym = symbolRecallFiles(q.query, idxPath);
      const cFiles = mergedRerank(baseFiles, sym.files, sym.byFile, sym.qTok);
      const graphNeighbors = graphExpand(cg, sym.topSymIds, GRAPH_TOP_K);
      const extra = uniqueFiles(sym.files, [...graphNeighbors.keys()]);
      const g1 = mergedRerank(baseFiles, extra, sym.byFile, sym.qTok);
      planByQuery.set(q.id, {
        base: baseFiles, c: cFiles, g1,
        symByFile: sym.byFile, qTok: sym.qTok, graphFiles: graphNeighbors.size,
      });
    }

    for (const [arm, key] of [['baseline-explore', 'base'], ['symbol-union-plan', 'c'], ['symbol-graph-union', 'g1']]) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = pb[key];
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, top5: files.slice(0, 5) };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }
    corpusEntry.graphStats = {
      avgGraphFiles: corpusQueries.reduce((s, q) => s + planByQuery.get(q.id).graphFiles, 0) / corpusQueries.length,
    };
    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);

  const base = report.macro['baseline-explore'];
  const cand = report.macro['symbol-graph-union'];
  const cUnion = report.macro['symbol-union-plan'];
  report.gates = {
    g1MacroHit5Plus5pp: { pass: cand.hit.at5 - base.hit.at5 >= 0.05, delta: cand.hit.at5 - base.hit.at5 },
    cMacroHit5Plus5pp: { pass: cUnion.hit.at5 - base.hit.at5 >= 0.05, delta: cUnion.hit.at5 - base.hit.at5 },
    perCorpusHit5At90: {
      pass: report.corpora.every((c) => c.arms['symbol-graph-union'].summary.hit.at5 >= 0.90),
      detail: report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at5, c: c.arms['symbol-union-plan'].summary.hit.at5, g1: c.arms['symbol-graph-union'].summary.hit.at5 })),
    },
    perCorpusHit10At95: {
      pass: report.corpora.every((c) => c.arms['symbol-graph-union'].summary.hit.at10 >= 0.95),
      detail: report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at10, c: c.arms['symbol-union-plan'].summary.hit.at10, g1: c.arms['symbol-graph-union'].summary.hit.at10 })),
    },
    mrrNoRegression: { pass: cand.mrr - base.mrr >= -0.01, delta: cand.mrr - base.mrr },
    hit10NoRegression: { pass: cand.hit.at10 - base.hit.at10 >= 0, delta: cand.hit.at10 - base.hit.at10 },
  };
  report.verdict = (report.gates.g1MacroHit5Plus5pp.pass && report.gates.perCorpusHit5At90.pass && report.gates.perCorpusHit10At95.pass && report.gates.mrrNoRegression.pass && report.gates.hit10NoRegression.pass) ? 'PASS' : 'NO-GO';

  process.stdout.write(JSON.stringify(report));
}

function peakWorkingSet(pid) {
  try {
    const { execFileSync } = require('node:child_process');
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

  console.log('\n=== 1-7-2 graph-recall HOLDOUT (v3, 24) ===');
  console.log('arm'.padEnd(24), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(24), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus G1 vs C vs A (Hit@5):');
  for (const g of report.gates.perCorpusHit5At90.detail) {
    console.log('  ', g.corpus.padEnd(14), 'A', g.base.toFixed(2), 'C', g.c.toFixed(2), 'G1', g.g1.toFixed(2));
  }
  console.log('\nGATES:');
  for (const [k, v] of Object.entries(report.gates)) {
    if (k === 'perCorpusHit5At90' || k === 'perCorpusHit10At95') continue;
    console.log('  ', k.padEnd(22), v.pass ? 'PASS' : 'FAIL', 'Δ', (v.delta ?? 0).toFixed(3));
  }
  console.log('  ', 'perCorpusHit5At90'.padEnd(22), report.gates.perCorpusHit5At90.pass ? 'PASS' : 'FAIL');
  console.log('  ', 'perCorpusHit10At95'.padEnd(22), report.gates.perCorpusHit10At95.pass ? 'PASS' : 'FAIL');
  console.log('\nVERDICT:', report.verdict);
  console.log(`written: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(MEASURE_DIR, 'graph-fused-holdout-v3.json'));
