#!/usr/bin/env node
/**
 * chunk-explore-fusion.mjs — 1-3-3 V3 validation (Q13).
 *
 * For each of the 4 explore-miss queries from 1-3-3:
 *   flask-holdout-request-lifetime          (pallets-flask)
 *   eshop-basket-add-or-increment           (dotnet-architecture-eShopOnWeb)
 *   eshop-picture-url-composition           (dotnet-architecture-eShopOnWeb)
 *   eshop-catalog-filter-pagination         (dotnet-architecture-eShopOnWeb)
 *
 * Run two arms:
 *   - baseline : plan(cg, query)                              (current explore)
 *   - fused    : plan(cg, augmentedQuery) where augmentedQuery
 *                appends chunk-vec top-K symbol names (PascalCase
 *                preferred) to the original query, simulating
 *                F1 front-door seeding via query expansion.
 *
 * Pass gate: >= 3/4 queries where fused arm's Hit@5 succeeds AND
 * baseline arm failed (i.e., fused fixes a baseline miss).
 *
 * Scope: spike only, no src/ changes (Q14 = W1).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const CHUNK_DIR = path.join(REPO, '.tmp', 'chunk-explore-fusion');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v1.json');
const OUT_PATH = path.join(REPO, 'docs', 'evidence', '2026-11-03-chunk-explore-fusion.json');

const TARGET_QUERY_IDS = [
  'flask-holdout-request-lifetime',
  'eshop-basket-add-or-increment',
  'eshop-picture-url-composition',
  'eshop-catalog-filter-pagination',
];

const TOP_K_CHUNKS = 8;
const MAX_SYMBOLS_INJECT = 5;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
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

function loadChunks(corpus) {
  const p = path.join(CHUNK_DIR, `${corpus}.chunks.json`);
  if (!fs.existsSync(p)) throw new Error(`missing chunk index: ${p} (run chunk-index-build.mjs first)`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).chunks;
}

function pickSymbolsToInject(topChunks) {
  // Prefer PascalCase (class/interface names) then camelCase function names.
  // Dedup by name. Skip very short names (< 4 chars) and overly generic ones.
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
  return [...pascal, ...camel].slice(0, MAX_SYMBOLS_INJECT);
}

async function main() {
  const frozen = JSON.parse(fs.readFileSync(FROZEN_PATH, 'utf8'));
  const targets = frozen.queries.filter((q) => TARGET_QUERY_IDS.includes(q.id));
  if (targets.length !== 4) throw new Error(`expected 4 targets, got ${targets.length}`);

  const model = await loadEmbedder();
  const { CodeGraph } = await import(pathToFileURL(path.join(REPO, 'dist', 'index.js')).href);
  const { plan } = await import(pathToFileURL(path.join(REPO, 'dist', 'mcp', 'explore-planner.js')).href);

  const chunksByCorpus = new Map();
  const report = {
    metric: 'chunk-explore-fusion',
    version: 1,
    measuredAt: new Date().toISOString(),
    scope: 'V3 spike: 4 explore-miss queries; chunk-vec as front-door query-expansion seeding',
    config: { topKChunks: TOP_K_CHUNKS, maxSymbolsInject: MAX_SYMBOLS_INJECT, planMaxFiles: 10 },
    queries: [],
    summary: null,
  };

  let fixedCount = 0;
  for (const q of targets) {
    console.error(`[fusion] ${q.id}`);
    if (!chunksByCorpus.has(q.corpus)) chunksByCorpus.set(q.corpus, loadChunks(q.corpus));
    const chunks = chunksByCorpus.get(q.corpus);

    // chunk-vec retrieval
    const queryVec = await model.queryEmbed(q.query);
    const scored = chunks.map((c) => ({ c, score: cosine(queryVec, c.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K_CHUNKS);
    const symbols = pickSymbolsToInject(scored.map((s) => s.c));
    const augmentedQuery = symbols.length > 0
      ? `${q.query} ${symbols.join(' ')}`
      : q.query;

    // Run both arms
    const cg = CodeGraph.openSync(path.join(CORPUS_ROOT, q.corpus));
    let baselinePlan, fusedPlan;
    try {
      baselinePlan = await plan(cg, q.query, { maxFiles: 10 });
      fusedPlan = await plan(cg, augmentedQuery, { maxFiles: 10 });
    } finally {
      await cg.closeAndWait();
    }

    const baselineFiles = baselinePlan.sortedFiles.map(([f]) => f);
    const fusedFiles = fusedPlan.sortedFiles.map(([f]) => f);
    const expected = new Set(q.expectedFiles);
    const baselineRank = baselineFiles.findIndex((f) => expected.has(f)) + 1 || null;
    const fusedRank = fusedFiles.findIndex((f) => expected.has(f)) + 1 || null;
    const baselineHit5 = baselineRank !== null && baselineRank <= 5;
    const fusedHit5 = fusedRank !== null && fusedRank <= 5;
    const fixed = !baselineHit5 && fusedHit5;
    if (fixed) fixedCount++;

    report.queries.push({
      id: q.id, corpus: q.corpus,
      query: q.query, augmentedQuery, symbolsInjected: symbols,
      topChunksPreview: scored.slice(0, 5).map((s) => ({ file: s.c.file, name: s.c.name, score: Number(s.score.toFixed(4)) })),
      baselineRank, fusedRank, baselineHit5, fusedHit5, fixed,
      baselineTop5: baselineFiles.slice(0, 5),
      fusedTop5: fusedFiles.slice(0, 5),
    });
  }

  report.summary = {
    total: targets.length,
    fixedCount,
    v3Gate: '>=3/4 fixed',
    v3Pass: fixedCount >= 3,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ summary: report.summary, perQuery: report.queries.map((q) => ({ id: q.id, baselineRank: q.baselineRank, fusedRank: q.fusedRank, fixed: q.fixed, symbols: q.symbolsInjected })) }, null, 2));
}

await main();
