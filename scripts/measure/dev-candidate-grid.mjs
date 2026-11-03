#!/usr/bin/env node
/**
 * dev-candidate-grid.mjs — 1-3-2 candidate selection on development split only.
 *
 * Evaluates 16 configurations (2 query encodings × 4 fusion strategies × 2 fusion partners)
 * on the frozen development queries (44 questions across 4 corpora). No holdout tuning.
 *
 * Prerequisites:
 *   - docs/baselines/semantic-retrieval-human-frozen-v1.json (frozen labels)
 *   - .tmp/embedding-baseline/.work/<corpus>/zcodegraph.db with vec_embeddings for all 4 corpora
 *   - actix-actix-web vectors must be generated via embedding-baseline.mjs before first run
 *
 * Usage:
 *   node scripts/measure/dev-candidate-grid.mjs [--out docs/evidence/2026-11-03-dev-candidate-selection.json]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v1.json');
const GRID_PATH = path.join(REPO, 'scripts', 'measure', 'dev-candidate-grid.json');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const VEC0 = path.join(SPIKE, 'vec0.dll');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');

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
  return {
    queries: n,
    hit: Object.fromEntries([1, 5, 10].map((k) => [`at${k}`, rows.filter((r) => r.rank !== null && r.rank <= k).length / n])),
    mrr: rows.reduce((sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank), 0) / n,
    misses: rows.filter((r) => r.rank === null).map((r) => r.id),
    warmMs: { median: quantile(latencies, 0.5), p95: quantile(latencies, 0.95), max: Math.max(...latencies) },
  };
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

function reciprocalRankFusion(baseline, vector, k = 60) {
  const scores = new Map();
  for (const source of [baseline, vector]) {
    source.forEach(([file], index) => scores.set(file, (scores.get(file) ?? 0) + 1 / (k + index + 1)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function weightedFusion(baseline, vector, alpha) {
  // alpha = weight of vector arm; (1-alpha) = weight of baseline arm
  const scores = new Map();
  const norm = (items) => {
    if (items.length === 0) return items;
    const max = Math.max(...items.map(([, s]) => s));
    const min = Math.min(...items.map(([, s]) => s));
    const range = max - min || 1;
    return items.map(([f, s]) => [f, (s - min) / range]);
  };
  const b = norm(baseline);
  const v = norm(vector);
  for (const [file, score] of b) scores.set(file, (scores.get(file) ?? 0) + (1 - alpha) * score);
  for (const [file, score] of v) scores.set(file, (scores.get(file) ?? 0) + alpha * score);
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function gitRevision(corpus) {
  return execFileSync('git', ['-C', path.join(CORPUS_ROOT, corpus), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function validateBaseline(baseline, grid) {
  const ids = new Set();
  const gridCorpusIds = new Set(grid.corpora);
  for (const corpus of baseline.corpora) {
    if (!gridCorpusIds.has(corpus.id)) continue;
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
    if (!gridCorpusIds.has(query.corpus)) continue;
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
  const baseline = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const grid = JSON.parse(fs.readFileSync(GRID_PATH, 'utf8'));
  validateBaseline(baseline, grid);

  const devQueries = baseline.queries.filter((q) => q.split === 'development');
  if (devQueries.length === 0) throw new Error('no development queries found');

  process.env.ZCG_ENABLE_EMBEDDING = '0';
  const [{ CodeGraph }, { plan }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href),
  ]);

  const report = {
    metric: 'dev-candidate-selection',
    version: 1,
    measuredAt: new Date().toISOString(),
    labelStatus: baseline.status,
    scope: 'development-split-only candidate selection; no holdout tuning',
    grid,
    host: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem() },
    configurations: [],
    resourceUsage: process.resourceUsage(),
  };

  let modelBundle = null;

  // Build all 16 configurations
  const configs = [];
  for (const encoding of grid.queryEncodings) {
    for (const fusion of grid.fusionStrategies) {
      for (const partner of grid.fusionPartners) {
        // pure-vec and pure-fts don't use a partner; deduplicate
        if ((fusion === 'pure-vec' || fusion === 'pure-fts') && partner !== grid.fusionPartners[0]) continue;
        configs.push({ encoding, fusion, partner });
      }
    }
  }

  for (const config of configs) {
    const configId = `${config.encoding}_${config.fusion}_${config.partner}`;
    console.error(`[dev-candidate-grid] running ${configId}`);

    const configResult = {
      id: configId,
      encoding: config.encoding,
      fusion: config.fusion,
      partner: config.partner,
      corpora: [],
      summary: null,
    };

    const allRows = [];

    for (const corpus of grid.corpora) {
      const corpusQueries = devQueries.filter((q) => q.corpus === corpus);
      if (corpusQueries.length === 0) continue;

      const openStart = performance.now();
      const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, corpus));
      const openMs = performance.now() - openStart;
      const vectorDb = openVectorStore(corpus);
      const coverage = vectorDb.prepare('SELECT (SELECT count(*) FROM files) AS files, (SELECT count(*) FROM vec_embeddings) AS vectors, (SELECT count(*) FROM nodes) AS nodes, (SELECT count(*) FROM edges) AS edges').get();

      const vectorExists = vectorDb.prepare('SELECT 1 FROM vec_embeddings WHERE file_path = ?');
      const missingExpectedVectors = corpusQueries.filter((query) => query.expectedFiles.some((file) => !vectorExists.get(file))).map((query) => query.id);
      if (missingExpectedVectors.length > 0) throw new Error(`expected-file vector coverage missing: ${corpus}: ${missingExpectedVectors.join(', ')}`);

      const diskBytes = fs.statSync(path.join(SPIKE, '.work', corpus, 'zcodegraph.db')).size;

      if ((config.fusion === 'pure-vec' || config.fusion === 'rrf-k60' || config.fusion === 'weighted-alpha') && !modelBundle) {
        modelBundle = await loadEmbedder();
      }

      const ranksByQuery = new Map();
      let coldMs = null;

      for (let repetition = 0; repetition < 4; repetition++) {
        for (const query of corpusQueries) {
          const start = performance.now();
          let ranks;

          const useQueryPrefix = config.encoding === 'queryEmbed';

          if (config.fusion === 'pure-fts') {
            ranks = uniqueFiles(cg.searchNodes(query.query, { limit: 100 }));
          } else if (config.fusion === 'pure-vec') {
            const vector = await embedQuery(modelBundle.model, query.query, useQueryPrefix);
            ranks = vectorRanks(vectorDb, vector);
          } else {
            // rrf-k60 or weighted-alpha
            let baselineRanks;
            if (config.partner === 'existing-explore') {
              const explore = await plan(cg, query.query, { maxFiles: 10 });
              baselineRanks = filesForPlan(explore);
            } else {
              baselineRanks = uniqueFiles(cg.searchNodes(query.query, { limit: 100 }));
            }
            const vector = await embedQuery(modelBundle.model, query.query, useQueryPrefix);
            const vectorRanksList = vectorRanks(vectorDb, vector);

            if (config.fusion === 'rrf-k60') {
              ranks = reciprocalRankFusion(baselineRanks, vectorRanksList, grid.rrfK);
            } else {
              // weighted-alpha: try all alphas and pick best on dev (this is the selection step)
              // For now, use alpha=0.5 as placeholder; the selection pass will optimize
              ranks = weightedFusion(baselineRanks, vectorRanksList, 0.5);
            }
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
          } else {
            ranksByQuery.get(query.id).warmMs.push(elapsed);
          }
        }
      }

      const rows = [...ranksByQuery.values()];
      allRows.push(...rows);
      configResult.corpora.push({
        corpus, repo: baseline.corpora.find((c) => c.id === corpus)?.repo ?? corpus,
        ref: baseline.corpora.find((c) => c.id === corpus)?.ref,
        graph: coverage, vectorDbBytes: diskBytes, existingOpenMs: openMs,
        coldQueryMs: coldMs, modelInitMs: modelBundle?.initMs ?? null,
        summary: statsOf(rows),
        results: rows,
      });

      vectorDb.close();
      await cg.closeAndWait();
    }

    configResult.summary = statsOf(allRows);
    report.configurations.push(configResult);
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
else await runParent(args.out ?? path.join(REPO, 'docs', 'evidence', '2026-11-03-dev-candidate-selection.json'));
