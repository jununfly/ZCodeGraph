#!/usr/bin/env node
/**
 * symbol-index-dev.mjs — 1-7-1 符号级索引召回探索（development 60 题）。
 *
 * 设计（Product execution 路线，但本轮仅改本脚本与 .tmp/，不碰 src/ 默认行为）：
 *   - 现状：nodes 表含 name/qualified_name/kind/visibility/is_exported，但
 *     signature=0、docstring=0（5 个 dev corpus 全 0），k8s 的 visibility 也=0。
 *     故符号级召回只能靠 name + qualified_name，且须 camelCase 切分对齐。
 *   - 现有 plan() 入口 findRelevantContext 用 FTS5-on-files + 名字匹配，但受
 *     searchLimit(8)×cap + minScore(0.2) 截断，只保留顶部 entry 节点，可能漏掉
 *     不在顶部文件里的相关符号。
 *   - 本脚本建**专用符号级 FTS5**（def-bearing kinds，camelCase 预切分 token 列），
 *     查询 = OR 查询词 camelCase 切分 token，bm25 召回 top-50 符号 → 聚合成文件。
 *
 * Arms:
 *   - A  baseline-explore：现 plan() 不动（继承 1-6 dev 基线）
 *   - B  symbol-only：纯符号级召回（不用 chunk、不用文件 FTS5、不用图）
 *   - C  symbol∪plan：基线 plan() 文件 ∪ 符号召回文件，双遍重排 0.4/0.4/0.2
 *
 * 防作弊：只在 development 60 题迭代；v3 holdout 24 题冻结，本脚本根本不读它。
 * 候选配置哈希：见 docs/baselines/semantic-retrieval-symbol-index-candidate-v1.json
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
  buildSymbolIndex, symbolRecallFiles, mergedRerank, rankSymbolFilesEnhanced,
  SYM_KINDS, SYMBOL_TOP_K, FILE_TOP_K,
} from './symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEASURE_DIR = path.join(REPO, '.tmp', 'measure');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v3.json');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-symbol-index-candidate-v1.json');

const ARMS = ['baseline-explore', 'symbol-only', 'symbol-union-plan', 'symbol-only-v2', 'symbol-union-v2'];

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
  if (dev.length !== 60) console.error(`[sym-dev] WARN expected 60 dev, got ${dev.length}`);

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const { CodeGraph, plan } = await loadPlan();

  const devCorpora = [...new Set(dev.map((q) => q.corpus))];
  const idxByCorpus = new Map();
  for (const c of devCorpora) idxByCorpus.set(c, buildSymbolIndex(c));

  const report = {
    metric: 'symbol-index-dev',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'v3 frozen development 60 queries (5 corpora); symbol-level FTS5 recall vs baseline plan() vs union. HOLDOUT NOT USED.',
    baseline: { frozenPath: 'docs/baselines/semantic-retrieval-human-frozen-v3.json', split: 'development' },
    arms: ARMS,
    candidate: JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8')),
    config: {
      symbolTopK: SYMBOL_TOP_K, fileTopK: FILE_TOP_K, symbolKinds: SYM_KINDS,
      tokenize: 'camelCase split + lowercase + len>=2', fts5: 'unicode61 default (OR query)',
      unionRerank: '0.4*planPos + 0.4*symPos + 0.2*termAlign',
    },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
    corpora: [],
    macro: {},
  };

  const perArmAllRows = Object.fromEntries(ARMS.map((a) => [a, []]));

  for (const corpus of devCorpora) {
    const corpusQueries = dev.filter((q) => q.corpus === corpus);
    console.error(`[sym-dev] corpus=${corpus} queries=${corpusQueries.length}`);
    const idxPath = idxByCorpus.get(corpus);
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
    const corpusEntry = { corpus, arms: {}, symbolStats: {} };

    const planByQuery = new Map();
    for (const q of corpusQueries) {
      const t0 = performance.now();
      const base = await plan(cg, q.query, { maxFiles: 10 });
      const baseFiles = base.sortedFiles.map(([f]) => f);
      const sym = symbolRecallFiles(q.query, idxPath);
      const cFiles = mergedRerank(baseFiles, sym.files, sym.byFile, sym.qTok);
      const symV2 = rankSymbolFilesEnhanced(sym, sym.qTok);
      const cV2 = mergedRerank(baseFiles, symV2, sym.byFile, sym.qTok);
      const t1 = performance.now();
      planByQuery.set(q.id, {
        base: baseFiles, sym: sym.files, union: cFiles, symV2, unionV2: cV2,
        symByFile: sym.byFile, qTok: sym.qTok, warmMs: t1 - t0,
        symMatched: sym.byFile.size,
      });
    }

    for (const [arm, key] of [['baseline-explore', 'base'], ['symbol-only', 'sym'], ['symbol-union-plan', 'union'], ['symbol-only-v2', 'symV2'], ['symbol-union-v2', 'unionV2']]) {
      const rows = corpusQueries.map((q) => {
        const pb = planByQuery.get(q.id);
        const files = pb[key];
        const rank = files.findIndex((f) => q.expectedFiles.includes(f)) + 1 || null;
        return { id: q.id, corpus: q.corpus, rank, coldMs: 0, warmMs: [pb.warmMs], top5: files.slice(0, 5), timedOut: false, augmented: '' };
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

  console.log('\n=== 1-7-1 symbol-index dev summary (development 60) ===');
  console.log('arm'.padEnd(24), 'Hit@5'.padEnd(8), 'Hit@10'.padEnd(8), 'MRR');
  for (const a of ARMS) {
    const m = report.macro[a];
    console.log(a.padEnd(24), String(m.hit.at5.toFixed(3)).padEnd(8), String(m.hit.at10.toFixed(3)).padEnd(8), String(m.mrr.toFixed(3)));
  }
  console.log('\nper-corpus Hit@5:');
  for (const c of report.corpora) {
    console.log('  ', c.corpus.padEnd(34),
      'A', c.arms['baseline-explore'].summary.hit.at5.toFixed(2),
      ' B', c.arms['symbol-only'].summary.hit.at5.toFixed(2),
      ' C', c.arms['symbol-union-plan'].summary.hit.at5.toFixed(2),
      ' D', c.arms['symbol-only-v2'].summary.hit.at5.toFixed(2),
      ' E', c.arms['symbol-union-v2'].summary.hit.at5.toFixed(2),
      ' | symAvgFiles', c.symbolStats.avgMatchedFiles.toFixed(1));
  }
  console.log(`\nwritten: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(MEASURE_DIR, 'symbol-index-dev.json'));
