#!/usr/bin/env node
/**
 * graph-recall-dev.mjs — 1-7-2 调用图/类型图召回探索（development 60 题）。
 *
 * 设计（Product execution 路线，本轮仅改本脚本与 .tmp/，不碰 src/ 默认行为）：
 *   现有 plan() 已含 seedNamedSymbols(name 种子)+glue(entry node 的 callers/callees
 *   仅限于已浮现文件)+RWR 图扩散。1-7-2 新意：从「专用符号 FTS5 召回的更宽符号集」
 *   (top-K by bm25) 出发，遍历 callers(1)+callees(1)+getTypeHierarchy 边，拉取邻居文件
 *   （即使不在初始 subgraph）——对准 1-7-1 残留的「候选集内排序 + 语义鸿沟」。
 *
 * Arms:
 *   - A  baseline-explore：现 plan() 不动
 *   - C  symbol-union-plan：基线 ∪ 符号召回（1-7-1 最佳臂，作对照）
 *   - G1 symbol-graph-union：基线 ∪ 符号召回 ∪ 图召回，三源合并 rerank 0.4/0.4/0.2
 *   - D  graph-only：纯图召回（诊断，看图遍历本身能否召回期望文件）
 *
 * 防作弊：只在 development 60 题迭代；v3 holdout 24 题冻结，本脚本根本不读它。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
  buildSymbolIndex, symbolRecallFiles, mergedRerank, graphExpand, rankGraphFiles,
  uniqueFiles, SYM_KINDS, SYMBOL_TOP_K, FILE_TOP_K,
} from './symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEASURE_DIR = path.join(REPO, '.tmp', 'measure');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v3.json');

const ARMS = ['baseline-explore', 'symbol-union-plan', 'symbol-graph-union', 'graph-only'];
const GRAPH_TOP_K = 15; // 图遍历的种子符号数

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
  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const dev = frozen.queries.filter((q) => q.split === 'development');
  if (dev.length !== 60) console.error(`[graph-dev] WARN expected 60 dev, got ${dev.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { CodeGraph, plan } = await loadPlan();

  const devCorpora = [...new Set(dev.map((q) => q.corpus))];
  const idxByCorpus = new Map();
  for (const c of devCorpora) idxByCorpus.set(c, buildSymbolIndex(c));

  const report = {
    metric: 'graph-recall-dev',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'v3 frozen development 60 queries (5 corpora); graph/type recall from symbol seeds vs baseline vs symbol-union. HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v3.json', split: 'development' },
    arms: ARMS,
    config: {
      symbolTopK: SYMBOL_TOP_K, fileTopK: FILE_TOP_K, graphTopK: GRAPH_TOP_K,
      graphEdges: 'callers(1)+callees(1)+getTypeHierarchy', graphRerank: '0.4*planPos + 0.4*extraPos + 0.2*termAlign',
    },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of devCorpora) {
    const corpusQueries = dev.filter((q) => q.corpus === corpus);
    console.error(`[graph-dev] corpus=${corpus} queries=${corpusQueries.length}`);
    const idxPath = idxByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {}, graphStats: {} };

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const t0 = performance.now();
      const base = await plan(cg, q.query, { maxFiles: 10 });
      const baseFiles = base.sortedFiles.map(([f]) => f);
      const sym = symbolRecallFiles(q.query, idxPath);
      const graphNeighbors = graphExpand(cg, sym.topSymIds, GRAPH_TOP_K);
      const graphFiles = rankGraphFiles(graphNeighbors, sym.qTok);
      const cFiles = mergedRerank(baseFiles, sym.files, sym.byFile, sym.qTok);
      const extra = uniqueFiles(sym.files, [...graphNeighbors.keys()]);
      const g1 = mergedRerank(baseFiles, extra, sym.byFile, sym.qTok);
      const t1 = performance.now();
      planByQuery.set(q.id, {
        base: baseFiles, c: cFiles, g1, graphOnly: graphFiles,
        symByFile: sym.byFile, qTok: sym.qTok, warmMs: t1 - t0,
        graphFiles: graphNeighbors.size, symMatched: sym.byFile.size,
      });
    }

    for (const [arm, key] of [['baseline-explore', 'base'], ['symbol-union-plan', 'c'], ['symbol-graph-union', 'g1'], ['graph-only', 'graphOnly']]) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = pb[key];
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [pb.warmMs], top5: files.slice(0, 5), timedOut: false, augmented: '' };
      });
      corpusEntry.arms[arm] = { summary: statsOf(rows), results: rows };
      perArmAllRows[arm].push(...rows);
    }
    corpusEntry.graphStats = {
      avgGraphFiles: corpusQueries.reduce((s, q) => s + planByQuery.get(q.id).graphFiles, 0) / corpusQueries.length,
      avgSymMatched: corpusQueries.reduce((s, q) => s + planByQuery.get(q.id).symMatched, 0) / corpusQueries.length,
    };
    report.corpora.push(corpusEntry);
    await cg.closeAndWait();
  }

  for (const arm of ARMS) report.macro[arm] = statsOf(perArmAllRows[arm]);
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

  console.log('\n=== 1-7-2 graph-recall dev summary (development 60) ===');
  console.log('arm'.padEnd(24), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(24), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus Hit@5:');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(34),
      'A', c.arms['baseline-explore'].summary.hit.at5.toFixed(2),
      ' C', c.arms['symbol-union-plan'].summary.hit.at5.toFixed(2),
      ' G1', c.arms['symbol-graph-union'].summary.hit.at5.toFixed(2),
      ' D', c.arms['graph-only'].summary.hit.at5.toFixed(2),
      ' | graphAvg', c.graphStats.avgGraphFiles.toFixed(1));
  }
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(MEASURE_DIR, 'graph-recall-dev.json'));
