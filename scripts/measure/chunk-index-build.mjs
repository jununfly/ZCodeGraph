#!/usr/bin/env node
/**
 * chunk-index-build.mjs — Build function-level chunk index for a corpus.
 *
 * Reads .tmp/embedding-baseline/.work/<corpus>/zcodegraph.db, extracts every
 * function/method node (with body), embeds each chunk with BGE-small, and
 * writes .tmp/chunk-explore-fusion/<corpus>.chunks.json containing
 * { file, symbol, kind, startLine, text, vector } entries.
 *
 * Reused by chunk-explore-fusion.mjs for the V3 validation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPIKE = path.join(REPO, '.tmp', 'embedding-baseline');
const MODEL_DIR = path.join(SPIKE, '.model-cache', 'Qdrant_bge-small-en-v1.5-onnx-Q');
const OUT_DIR = path.join(REPO, '.tmp', 'chunk-explore-fusion');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';

const CHUNK_KINDS = new Set(['function', 'method']);

function parseArgs(argv) {
  const out = { corpora: [], maxChunks: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--corpus') out.corpora.push(argv[++i]);
    else if (argv[i] === '--max-chunks') out.maxChunks = parseInt(argv[++i], 10);
    else throw new Error(`unknown arg: ${argv[i]}`);
  }
  if (out.corpora.length === 0) throw new Error('at least one --corpus required');
  return out;
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

function readNodeSource(corpusRoot, file, startLine, endLine) {
  const full = path.join(corpusRoot, file);
  if (!fs.existsSync(full)) return null;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine ?? lines.length);
  return lines.slice(start, end).join('\n');
}

async function embedBatch(model, texts) {
  const out = [];
  for await (const batch of model.embed(texts)) out.push(...batch);
  return out;
}

async function buildFor(corpus, model, maxChunks) {
  // Prefer the live indexed db under CORPUS_ROOT/<corpus>/.zcodegraph/ (current
  // rust-hybrid or typescript index). Fall back to the spike .work/ copy for
  // reproducibility of 1-3-3-1 results.
  const liveDb = path.join(CORPUS_ROOT, corpus, '.zcodegraph', 'zcodegraph.db');
  const spikeDb = path.join(SPIKE, '.work', corpus, 'zcodegraph.db');
  const dbPath = fs.existsSync(liveDb) ? liveDb : spikeDb;
  if (!fs.existsSync(dbPath)) throw new Error(`missing db: tried ${liveDb} and ${spikeDb}`);
  const corpusRoot = path.join(CORPUS_ROOT, corpus);
  const db = new DatabaseSync(dbPath, { readOnly: true });

  const nodes = db.prepare(`
    SELECT id, file_path AS filePath, kind, name, qualified_name AS qualifiedName,
           start_line AS startLine, end_line AS endLine
    FROM nodes
    WHERE kind IN ('function', 'method')
      AND start_line IS NOT NULL
      AND end_line IS NOT NULL
      AND end_line > start_line
    ORDER BY file_path, start_line
  `).all();
  db.close();

  console.error(`[chunk-index-build] ${corpus}: ${nodes.length} candidate chunks`);

  const chunks = [];
  for (const n of nodes) {
    const text = readNodeSource(corpusRoot, n.filePath, n.startLine, n.endLine);
    if (!text || text.length < 16 || text.length > 8000) continue;
    chunks.push({
      id: n.id, file: n.filePath, kind: n.kind, name: n.name,
      qualifiedName: n.qualifiedName, startLine: n.startLine, endLine: n.endLine, text,
    });
  }
  console.error(`[chunk-index-build] ${corpus}: ${chunks.length} chunks after source filter`);

  // Apply --max-chunks cap if specified. Deterministic: take first N by file_path/start_line order.
  const effectiveChunks = maxChunks && chunks.length > maxChunks ? chunks.slice(0, maxChunks) : chunks;
  if (effectiveChunks.length < chunks.length) {
    console.error(`[chunk-index-build] ${corpus}: capped to ${effectiveChunks.length} chunks (--max-chunks ${maxChunks})`);
  }

  const BATCH = 16;
  const t0 = Date.now();
  for (let i = 0; i < effectiveChunks.length; i += BATCH) {
    const slice = effectiveChunks.slice(i, i + BATCH);
    const vecs = await embedBatch(model, slice.map((c) => c.text));
    for (let j = 0; j < slice.length; j++) slice[j].vector = vecs[j];
    const done = i + slice.length;
    if (done % 100 === 0 || done === effectiveChunks.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (done / ((Date.now() - t0) / 1000)).toFixed(1);
      console.error(`[chunk-index-build] ${corpus}: embedded ${done}/${effectiveChunks.length} (${elapsed}s, ${rate}/s)`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `${corpus}.chunks.json`);
  fs.writeFileSync(out, JSON.stringify({ corpus, count: effectiveChunks.length, chunks: effectiveChunks }, null, 0));
  console.error(`[chunk-index-build] ${corpus}: wrote ${out}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const model = await loadEmbedder();
  for (const corpus of args.corpora) await buildFor(corpus, model, args.maxChunks);
}

await main();
