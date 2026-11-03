#!/usr/bin/env node
/**
 * chunk-probe.mjs — 1-3-3 Round 2 chunk-representation probe (Q5/Q6).
 *
 * For the 5 eShopOnWeb queries where pure-fts missed in 1-3-3, hand-crafted
 * chunk candidates (expected + hard negatives) are embedded with BGE-small
 * and searched with cosine similarity. Gate: >= 4/5 expected chunk ranked
 * in top-5 AND no hard-negative chunk ranked in top-3.
 *
 * Scope: acceptance/evaluation probe. No source changes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const CHUNKS = path.join(REPO, '.tmp', 'chunk-probe', 'chunks.json');
const OUT = path.join(REPO, 'docs', 'evidence', '2026-11-03-chunk-probe.json');

async function loadEmbedder() {
  const requireFromSpike = createRequire(path.join(SPIKE, 'package.json'));
  const { FlagEmbedding, EmbeddingModel, Pooling } = await import(pathToFileURL(requireFromSpike.resolve('fastembed')).href);
  const model = await FlagEmbedding.init({
    model: EmbeddingModel.CUSTOM,
    modelAbsoluteDirPath: MODEL_DIR,
    modelName: 'model_optimized.onnx',
    pooling: Pooling.CLS,
    showDownloadProgress: false,
  });
  return model;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedBatch(model, texts, isQuery) {
  const out = [];
  if (isQuery) {
    for (const t of texts) out.push(await model.queryEmbed(t));
  } else {
    for await (const batch of model.embed(texts)) out.push(...batch);
  }
  return out;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(CHUNKS, 'utf8'));
  const model = await loadEmbedder();

  const report = { metric: 'chunk-probe', version: 1, measuredAt: new Date().toISOString(), gate: { expectedTop5Min: 4, total: 5, hardNegativeTop3Allowed: false }, queries: [], summary: null };

  let passed = 0;
  for (const q of data.queries) {
    console.error(`[chunk-probe] ${q.id}`);
    const chunkTexts = q.chunks.map((c) => c.text);
    const chunkVecs = await embedBatch(model, chunkTexts, false);
    const [queryVec] = await embedBatch(model, [q.query], true);

    const scored = q.chunks.map((c, i) => ({
      id: c.id, file: c.file, symbol: c.symbol, isExpected: c.isExpected,
      score: cosine(queryVec, chunkVecs[i]),
    })).sort((a, b) => b.score - a.score);

    const top5 = scored.slice(0, 5);
    const top3 = scored.slice(0, 3);
    const expectedInTop5 = top5.filter((s) => s.isExpected).length > 0;
    const hardNegInTop3 = top3.some((s) => !s.isExpected);
    const expectedRank = scored.findIndex((s) => s.isExpected) + 1;
    const pass = expectedInTop5 && !hardNegInTop3;
    if (pass) passed++;

    report.queries.push({
      id: q.id, query: q.query,
      expectedRank, expectedInTop5, hardNegInTop3, pass,
      ranked: scored.map((s, i) => ({ rank: i + 1, ...s })),
    });
  }

  report.summary = { total: data.queries.length, passed, gatePass: passed >= report.gate.expectedTop5Min };
  const text = JSON.stringify(report, null, 2) + '\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text, 'utf8');
  console.log(JSON.stringify({ summary: report.summary, perQuery: report.queries.map((q) => ({ id: q.id, expectedRank: q.expectedRank, pass: q.pass, hardNegInTop3: q.hardNegInTop3 })) }, null, 2));
}

await main();
