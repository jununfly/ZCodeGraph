#!/usr/bin/env node
/**
 * embedding-baseline.mjs — 1-4-2 P2 quantization threshold measurement.
 *
 * For each cached corpus under `--corpus-root` (default C:/workspace/measure-corpus),
 * this script:
 *
 *   1. Snapshots the existing `.zcodegraph/zcodegraph.db` (db + wal + shm sizes).
 *   2. Copies the DB into a per-run working copy under `.tmp/embedding-baseline/.work/`
 *      so the original index stays untouched.
 *   3. Invokes the 1-4-2 spike pipeline (`.tmp/embedding-baseline/embed-and-write.mjs`)
 *      on the working copy, which loads `vec0.dll`, creates `vec_embeddings`,
 *      and embeds every file with BGE-small-en-v1.5 (384 dims).
 *   4. Measures post-embed sizes after a WAL TRUNCATE checkpoint.
 *   5. Emits a per-corpus JSON envelope plus a multi-corpus summary line.
 *
 * Exit criteria measured (P2 embedding quantization-threshold measurement):
 *   - extra disk        ≤ 50% of structural-index footprint
 *   - first index time  ≤ 2× baseline   (we measure only the embed pass here;
 *                                        baseline index wall-clock comes from
 *                                        scripts/measure/setup.mjs)
 *   - watch single-file incremental ≤ 5s (out of scope for this script — the
 *                                        spike measures batch embed only)
 *
 * Usage:
 *   node scripts/measure/embedding-baseline.mjs \
 *     --corpus pallets-flask --corpus expressjs-express ... \
 *     [--corpus-root C:/workspace/measure-corpus] \
 *     [--out research/archive/evidence/raw/2026-10-26-p2-embedding-thresholds.json]
 *
 * The spike fixture `.tmp/embedding-baseline/` must already be installed
 * (`npm install` in that directory) and `vec0.dll` must sit beside it.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const SPIKE_DIR = path.join(REPO_ROOT, '.tmp', 'embedding-baseline');
const EMBED_SCRIPT = path.join(SPIKE_DIR, 'embed-and-write.mjs');
const VEC0_DLL = path.join(SPIKE_DIR, 'vec0.dll');
const WORK_ROOT = path.join(SPIKE_DIR, '.work');

const DEFAULT_CORPUS_ROOT = 'C:/workspace/measure-corpus';

function parseArgs(argv) {
  const args = { corpora: [], corpusRoot: DEFAULT_CORPUS_ROOT, out: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--corpus') args.corpora.push(argv[++i]);
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else throw new Error(`unknown arg: ${a}`);
  }
  if (args.corpora.length === 0) throw new Error('at least one --corpus <dir-name> is required');
  return args;
}

function log(args, msg) {
  if (!args.quiet) process.stderr.write(`[embedding-baseline] ${msg}\n`);
}

function dirSizeOf(dbPath) {
  const out = { db: 0, wal: 0, shm: 0 };
  for (const [key, p] of [['db', dbPath], ['wal', `${dbPath}.wal`], ['shm', `${dbPath}.shm`]]) {
    try { out[key] = fs.statSync(p).size; } catch { /* missing */ }
  }
  out.total = out.db + out.wal + out.shm;
  return out;
}

function copyDb(srcDb, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  const dstDb = path.join(dstDir, 'zcodegraph.db');
  for (const src of [srcDb, `${srcDb}.wal`, `${srcDb}.shm`]) {
    if (!fs.existsSync(src)) continue;
    const dst = path.join(dstDir, path.basename(src));
    fs.copyFileSync(src, dst);
  }
  return dstDb;
}

function runEmbed({ workDb, corpusDir, quiet }) {
  const env = {
    ...process.env,
    HF_ENDPOINT: process.env.HF_ENDPOINT ?? 'https://hf-mirror.com',
    // Strip Clash proxy — hf-mirror must be reached directly; see 1-4-1 spike notes.
    https_proxy: '',
    http_proxy: '',
  };
  const out = execFileSync(
    process.execPath,
    [EMBED_SCRIPT, '--db', workDb, '--corpus-root', corpusDir, '--vec0', VEC0_DLL],
    { encoding: 'utf-8', env, maxBuffer: 32 * 1024 * 1024, stdio: quiet ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'inherit'] },
  );
  return JSON.parse(out);
}

function measureCorpus(args, corpusName) {
  const corpusDir = path.join(args.corpusRoot, corpusName);
  const srcDb = path.join(corpusDir, '.zcodegraph', 'zcodegraph.db');
  if (!fs.existsSync(srcDb)) throw new Error(`missing source DB: ${srcDb}`);

  // Baseline (pre-embed) sizes measured on the *source* DB so we report the
  // true starting footprint, not the working copy.
  const sizeBefore = dirSizeOf(srcDb);

  const workDir = path.join(WORK_ROOT, corpusName);
  fs.rmSync(workDir, { recursive: true, force: true });
  const workDb = copyDb(srcDb, workDir);

  const t0 = Date.now();
  const spike = runEmbed({ workDb, corpusDir, quiet: args.quiet });
  const embedWallMs = Date.now() - t0;

  // Post-embed sizes on the working copy (post-checkpoint inside the spike).
  const sizeAfter = dirSizeOf(workDb);

  const value = {
    corpus: corpusName,
    filesTotal: spike.filesTotal,
    embedded: spike.embedded,
    skipped: spike.skipped,
    skippedReasons: spike.skippedReasons,
    timings: {
      ...spike.timings,
      embedWallMs, // end-to-end wall clock of the spike process (includes init)
    },
    disk: {
      before: sizeBefore,
      after: sizeAfter,
      deltaBytes: sizeAfter.total - sizeBefore.total,
      deltaPct:
        sizeBefore.total > 0
          ? Math.round(((sizeAfter.total - sizeBefore.total) / sizeBefore.total) * 1000) / 10
          : 0,
      // Sanity threshold from roadmap: extra disk ≤ 50%
      thresholdPct: 50,
      pass50Pct: sizeBefore.total > 0 && (sizeAfter.total - sizeBefore.total) / sizeBefore.total <= 0.5,
    },
    selfKnnDistance: spike.selfDistance,
  };

  return {
    metric: 'embedding-baseline',
    repo: corpusName,
    measuredAt: new Date().toISOString(),
    value,
    evidence: {
      corpusDir,
      sourceDb: srcDb,
      workDb,
      vec0: VEC0_DLL,
      embedScript: EMBED_SCRIPT,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(EMBED_SCRIPT)) throw new Error(`missing spike script: ${EMBED_SCRIPT}`);
  if (!fs.existsSync(VEC0_DLL)) throw new Error(`missing vec0.dll: ${VEC0_DLL}`);

  const results = [];
  for (const corpus of args.corpora) {
    log(args, `measuring ${corpus}`);
    const r = measureCorpus(args, corpus);
    results.push(r);
    log(
      args,
      `  files=${r.value.filesTotal} embedded=${r.value.embedded} ` +
        `embedWall=${r.value.timings.embedWallMs}ms perFile=${r.value.timings.perFileAvgMs}ms ` +
        `disk Δ=${r.value.disk.deltaBytes}B (${r.value.disk.deltaPct}%) pass50=${r.value.disk.pass50Pct}`,
    );
  }

  const summary = {
    metric: 'embedding-baseline-summary',
    measuredAt: new Date().toISOString(),
    corpora: results.map((r) => ({
      corpus: r.repo,
      filesTotal: r.value.filesTotal,
      embedded: r.value.embedded,
      embedWallMs: r.value.timings.embedWallMs,
      perFileAvgMs: r.value.timings.perFileAvgMs,
      diskDeltaBytes: r.value.disk.deltaBytes,
      diskDeltaPct: r.value.disk.deltaPct,
      pass50Pct: r.value.disk.pass50Pct,
      baselineTotalBytes: r.value.disk.before.total,
      postEmbedTotalBytes: r.value.disk.after.total,
    })),
  };

  const payload = { results, summary };
  const text = JSON.stringify(payload, null, 2);
  process.stdout.write(text + '\n');
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, text + '\n', 'utf-8');
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`embedding-baseline failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
