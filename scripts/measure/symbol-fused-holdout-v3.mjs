#!/usr/bin/env node
/**
 * symbol-fused-holdout-v3.mjs — 1-7-1 符号级索引召回 v3 holdout 一次性评估。
 *
 * 防作弊：只读 v3 frozen holdout 24 题（rails 12 + k8s 12），配置冻结前断言
 * 候选哈希，禁止调参/早停。dev 60 题仅作迭代，本脚本根本不读它。
 *
 * Arms（与 dev 一致）：
 *   - A  baseline-explore：现 plan() 不动
 *   - B  symbol-only：纯符号级召回
 *   - C  symbol-union-plan：基线 ∪ 符号召回，双遍重排
 *
 * 门（沿用 v2 §4，1-7 exit criteria）：
 *   macro Hit@5 ≥ baseline+5pp；per-corpus Hit@5 ≥ 90%；per-corpus Hit@10 ≥ 95%；
 *   MRR 不回退（Δ<0.01 记 tie/PASS）；Hit@10 不回退。
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
const MEASURE_DIR = path.join(REPO, '.tmp', 'measure');
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v3.json');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-symbol-index-candidate-v1.json');

// 候选哈希断言（防误调）：运行前计算 candidate 文件 sha256 须匹配此值。
const EXPECTED_CANDIDATE_SHA256 = 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d';

const ARMS = ['baseline-explore', 'symbol-only', 'symbol-union-plan'];

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
  // ---- 候选哈希断言 ----
  const cp = createRequire(path.join(REPO, 'package.json'));
  const crypto = cp('node:crypto');
  const candidateBuf = fs.readFileSync(CANDIDATE_PATH);
  const candidateSha = crypto.createHash('sha256').update(candidateBuf).digest('hex');
  if (candidateSha !== EXPECTED_CANDIDATE_SHA256) {
    throw new Error(`candidate hash mismatch: got ${candidateSha}, expected ${EXPECTED_CANDIDATE_SHA256}. Refusing to evaluate (config may have been altered).`);
  }
  console.error(`[sym-holdout] candidate sha256 OK: ${candidateSha}`);

  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const holdout = frozen.queries.filter((q) => q.split === 'holdout');
  if (holdout.length !== 24) console.error(`[sym-holdout] WARN expected 24 holdout, got ${holdout.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { CodeGraph, plan } = await loadPlan();

  const holdoutCorpora = [...new Set(holdout.map((q) => q.corpus))];
  const idxByCorpus = new Map();
  for (const c of holdoutCorpora) idxByCorpus.set(c, buildSymbolIndex(c));

  const report = {
    metric: 'symbol-fused-holdout-v3',
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
    console.error(`[sym-holdout] corpus=${corpus} queries=${corpusQueries.length}`);
    const idxPath = idxByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join('C:/workspace/measure-corpus', corpus));
    const corpusEntry = { corpus, arms: {}, symbolStats: {} };

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const base = await plan(cg, q.query, { maxFiles: 10 });
      const baseFiles = base.sortedFiles.map(([f]) => f);
      const sym = symbolRecallFiles(q.query, idxPath);
      const cFiles = mergedRerank(baseFiles, sym.files, sym.byFile, sym.qTok);
      planByQuery.set(q.id, {
        base: baseFiles, sym: sym.files, union: cFiles,
        symByFile: sym.byFile, qTok: sym.qTok, symMatched: sym.byFile.size,
      });
    }

    for (const [arm, key] of [['baseline-explore', 'base'], ['symbol-only', 'sym'], ['symbol-union-plan', 'union']]) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = pb[key];
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, top5: files.slice(0, 5) };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }
    corpusEntry.symbolStats = {
      avgMatchedFiles: corpusQueries.reduce((s, q) => s + planByQuery.get(q.id).symMatched, 0) / corpusQueries.length,
    };
    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);

  // ---- 门判定（沿用 v2 §4） ----
  const base = report.macro['baseline-explore'];
  const cand = report.macro['symbol-union-plan'];
  const macroHit5Delta = cand.hit.at5 - base.hit.at5;
  const mrrDelta = cand.mrr - base.mrr;
  const hit10Delta = cand.hit.at10 - base.hit.at10;
  const perCorpusHit5 = report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at5, cand: c.arms['symbol-union-plan'].summary.hit.at5 }));
  const perCorpusHit10 = report.corpora.map((c) => ({ corpus: c.corpus, base: c.arms['baseline-explore'].summary.hit.at10, cand: c.arms['symbol-union-plan'].summary.hit.at10 }));
  report.gates = {
    macroHit5Plus5pp: { pass: macroHit5Delta >= 0.05, delta: macroHit5Delta },
    perCorpusHit5At90: { pass: perCorpusHit5.every((c) => c.cand >= 0.90), detail: perCorpusHit5 },
    perCorpusHit10At95: { pass: perCorpusHit10.every((c) => c.cand >= 0.95), detail: perCorpusHit10 },
    mrrNoRegression: { pass: mrrDelta >= -0.01, delta: mrrDelta },
    hit10NoRegression: { pass: hit10Delta >= 0, delta: hit10Delta },
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

  console.log('\n=== 1-7-1 symbol-index HOLDOUT (v3, 24) ===');
  console.log('arm'.padEnd(24), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(24), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus C vs A (Hit@5):');
  for (const g of report.gates.perCorpusHit5At90.detail) {
    console.log('  ', g.corpus.padEnd(14), 'A', g.base.toFixed(2), 'C', g.cand.toFixed(2));
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
else await runParent(args.out ?? path.join(MEASURE_DIR, 'symbol-fused-holdout-v3.json'));
