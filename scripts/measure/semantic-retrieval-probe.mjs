#!/usr/bin/env node
/**
 * Exploratory, offline file-entry retrieval probe on pinned real-code corpora.
 * This is not a human-labeled product acceptance gate. See the baseline policy.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-probe-v1.json');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const VEC0 = path.join(SPIKE, 'vec0.dll');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const ARMS = ['existing-explore', 'symbol-fts', 'vector-only', 'vector-query-encode', 'rrf-fusion'];
const KS = [1, 5, 10];

function parseArgs(argv) {
  const out = { worker: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--worker') out.worker = true;
    else if (argv[i] === '--out') out.out = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return out;
}

function requireFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`missing file: ${file}`);
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)];
}

function statsOf(rows) {
  const latencies = rows.flatMap((r) => r.warmMs);
  const n = rows.length;
  const metric = {
    queries: n,
    hit: Object.fromEntries(KS.map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    misses: rows.filter((r) => r.rank === null).map((r) => r.id),
    warmMs: { median: quantile(latencies, 0.5), p95: quantile(latencies, 0.95), max: Math.max(...latencies) },
  };
  return metric;
}

function rankRows(items) {
  return items.map(([file, score]) => ({ file, score }));
}

function uniqueFiles(results) {
  const ranks = new Map();
  for (const result of results) {
    const file = result.node.filePath;
    const score = result.score;
    ranks.set(file, Math.max(score, ranks.get(file) ?? -Infinity));
  }
  return [...ranks.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function reciprocalRankFusion(baseline, vector) {
  const scores = new Map();
  for (const source of [baseline, vector]) {
    source.forEach(([file], index) => scores.set(file, (scores.get(file) ?? 0) + 1 / (60 + index + 1)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function gitRevision(corpus) {
  return execFileSync('git', ['-C', path.join(CORPUS_ROOT, corpus), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function validateBaseline(baseline) {
  const ids = new Set();
  for (const corpus of baseline.corpora) {
    const root = path.join(CORPUS_ROOT, corpus.id);
    requireFile(path.join(root, '.git', 'HEAD'));
    const actual = gitRevision(corpus.id);
    if (actual !== corpus.ref) throw new Error(`${corpus.id} revision drift: expected ${corpus.ref}, got ${actual}`);
    requireFile(path.join(SPIKE, '.work', corpus.id, 'zcodegraph.db'));
  }
  for (const query of baseline.queries) {
    if (ids.has(query.id)) throw new Error(`duplicate query id: ${query.id}`);
    ids.add(query.id);
    if (!baseline.corpora.some((c) => c.id === query.corpus)) throw new Error(`unknown corpus: ${query.corpus}`);
    if (!['development', 'holdout'].includes(query.split)) throw new Error(`bad split: ${query.id}`);
    if (query.expectedFiles.length === 0 || query.hardNegatives.length < 2) throw new Error(`incomplete oracle: ${query.id}`);
    const text = fs.readFileSync(path.join(CORPUS_ROOT, query.corpus, query.expectedFiles[0]), 'utf8').split(/\r?\n/);
    const line = text[query.evidence.startLine - 1] ?? '';
    const firstSymbol = query.evidence.symbol.split(' and ')[0].split('.').at(-1);
    if (!line.includes(firstSymbol)) throw new Error(`stale evidence anchor: ${query.id}: ${line}`);
    for (const file of [...query.expectedFiles, ...query.hardNegatives]) {
      requireFile(path.join(CORPUS_ROOT, query.corpus, file));
    }
  }
  requireFile(VEC0);
  requireFile(path.join(MODEL_DIR, 'model_optimized.onnx'));
  requireFile(path.join(REPO, 'dist', 'index.js'));
}

async function loadEmbedder() {
  const requireFromSpike = createRequire(path.join(SPIKE, 'package.json'));
  const packagePath = path.join(SPIKE, 'node_modules', 'fastembed', 'package.json');
  const version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
  if (version !== '1.14.5') throw new Error(`fastembed must be pinned at 1.14.5, got ${version}`);
  const { FlagEmbedding, EmbeddingModel, Pooling } = await import(pathToFileURL(requireFromSpike.resolve('fastembed')).href);
  const start = performance.now();
  const model = await FlagEmbedding.init({
    model: EmbeddingModel.CUSTOM,
    modelAbsoluteDirPath: MODEL_DIR,
    modelName: 'model_optimized.onnx',
    pooling: Pooling.CLS,
    showDownloadProgress: false,
  });
  return { model, initMs: performance.now() - start, version };
}

function openVectorStore(corpus) {
  const db = new DatabaseSync(path.join(SPIKE, '.work', corpus, 'zcodegraph.db'), { readOnly: true, allowExtension: true });
  db.loadExtension(VEC0);
  db.enableLoadExtension(false);
  return db;
}

function filesForPlan(plan) {
  return plan.sortedFiles.map(([file, group]) => [file, group.score]);
}

function vectorRanks(db, vector) {
  const f32 = Float32Array.from(vector);
  return db.prepare('SELECT file_path AS file, distance AS score FROM vec_embeddings WHERE embedding MATCH ? AND k = 10')
    .all(Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength))
    .map((r) => [r.file, -r.score]);
}

async function embedQuery(model, query, useQueryPrefix) {
  if (useQueryPrefix) return model.queryEmbed(query);
  for await (const batch of model.embed([query])) return batch[0];
  throw new Error('empty embedding result');
}

async function runWorker() {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  validateBaseline(baseline);
  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);
  const report = {
    metric: 'semantic-retrieval-probe-result',
    version: 1,
    measuredAt: new Date().toISOString(),
    labelStatus: baseline.status,
    scope: 'real-source AI-authored probe, not independent human acceptance',
    protocol: { warmRepetitions: 3, k: 10, rrfK: 60, corpusDocumentEncoding: 'first-8000-characters; model.embed', vectorOnlyEncoding: 'model.embed', queryEncodeEncoding: 'model.queryEmbed', fusion: 'unweighted reciprocal-rank fusion of existing-explore and vector-only' },
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    corpora: [],
    resourceUsage: process.resourceUsage(),
  };
  let modelBundle = null;
  for (const corpus of baseline.corpora) {
    const openStart = performance.now();
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus.id));
    const openMs = performance.now() - openStart;
    const vectorDb = openVectorStore(corpus.id);
    const coverage = vectorDb.prepare('SELECT (SELECT count(*) FROM files) AS files, (SELECT count(*) FROM vec_embeddings) AS vectors, (SELECT count(*) FROM nodes) AS nodes, (SELECT count(*) FROM edges) AS edges').get();
    const queries = baseline.queries.filter((q) => q.corpus === corpus.id);
    const vectorExists = vectorDb.prepare('SELECT 1 FROM vec_embeddings WHERE file_path = ?');
    const missingExpectedVectors = queries.filter((query) => query.expectedFiles.some((file) => !vectorExists.get(file))).map((query) => query.id);
    if (missingExpectedVectors.length > 0) throw new Error(`expected-file vector coverage missing: ${corpus.id}: ${missingExpectedVectors.join(', ')}`);
    const diskBytes = fs.statSync(path.join(SPIKE, '.work', corpus.id, 'zcodegraph.db')).size;
    const cold = {};
    for (const arm of ARMS) {
      if ((arm === 'vector-only' || arm === 'vector-query-encode') && !modelBundle) modelBundle = await loadEmbedder();
      const ranksByQuery = new Map();
      let coldMs = null;
      for (let repetition = 0; repetition < 4; repetition++) {
        for (const query of queries) {
          const start = performance.now();
          let ranks;
          if (arm === 'existing-explore') {
            const explore = await plan(cg, query.query, { maxFiles: 10 });
            ranks = filesForPlan(explore);
          } else if (arm === 'symbol-fts') {
            ranks = uniqueFiles(cg.searchNodes(query.query, { limit: 100 }));
          } else if (arm === 'vector-only' || arm === 'vector-query-encode') {
            const vector = await embedQuery(modelBundle.model, query.query, arm === 'vector-query-encode');
            ranks = vectorRanks(vectorDb, vector);
          } else {
            const explore = await plan(cg, query.query, { maxFiles: 10 });
            const vector = await embedQuery(modelBundle.model, query.query, false);
            ranks = reciprocalRankFusion(filesForPlan(explore), vectorRanks(vectorDb, vector));
          }
          const elapsed = performance.now() - start;
          if (repetition === 0) {
            coldMs = elapsed;
            const top = rankRows(ranks.slice(0, 10));
            const expected = new Set(query.expectedFiles);
            const first = top.findIndex((r) => expected.has(r.file));
            ranksByQuery.set(query.id, {
              id: query.id, split: query.split, rank: first < 0 ? null : first + 1,
              top, warmMs: [], coldMs: elapsed,
              hardNegativeRanks: Object.fromEntries(query.hardNegatives.map((f) => [f, top.findIndex((r) => r.file === f) + 1 || null])),
            });
          } else ranksByQuery.get(query.id).warmMs.push(elapsed);
        }
      }
      cold[arm] = coldMs;
      const rows = [...ranksByQuery.values()];
      report.corpora.push({
        corpus: corpus.id, repo: corpus.repo, ref: corpus.ref, arm,
        graph: coverage, vectorDbBytes: diskBytes, existingOpenMs: openMs,
        coldQueryMs: coldMs, modelInitMs: modelBundle?.initMs ?? null,
        summary: { all: statsOf(rows), development: statsOf(rows.filter((r) => r.split === 'development')), holdout: statsOf(rows.filter((r) => r.split === 'holdout')) },
        results: rows,
      });
    }
    vectorDb.close();
    await cg.closeAndWait();
  }
  report.runtime = { fastembed: modelBundle?.version ?? null, model: 'BGE-small-en-v1.5-onnx-Q-384d', modelDirectory: MODEL_DIR, vec0: VEC0, networkUsed: false, coldModelInitMs: modelBundle?.initMs ?? null };
  process.stdout.write(JSON.stringify(report));
}

function peakWorkingSet(pid) {
  try {
    const value = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.PeakWorkingSet64 }`], { encoding: 'utf8', windowsHide: true }).trim();
    return Number(value) || null;
  } catch { return null; }
}

async function runParent(out) {
  const start = performance.now();
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker'], { cwd: REPO, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ZCG_ENABLE_EMBEDDING: '0' } });
  let stdout = '';
  let peak = null;
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  const timer = setInterval(() => {
    const value = peakWorkingSet(child.pid);
    if (value !== null) peak = Math.max(peak ?? 0, value);
  }, 25);
  const exit = await new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));
  clearInterval(timer);
  if (exit.code !== 0) throw new Error(`worker failed: ${JSON.stringify(exit)}`);
  const report = JSON.parse(stdout);
  report.process = { wallMs: performance.now() - start, peakWorkingSetBytes: peak, peakWorkingSetUnavailableReason: peak === null ? 'external Windows PeakWorkingSet64 sampling unavailable' : null, resourceUsage: report.resourceUsage };
  delete report.resourceUsage;
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text, 'utf8');
  process.stdout.write(text);
}

const args = parseArgs(process.argv.slice(2));
if (args.worker) await runWorker();
else await runParent(args.out ?? path.join(REPO, '.tmp', 'measure', 'semantic-retrieval-probe-result.json'));
