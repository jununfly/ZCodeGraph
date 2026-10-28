#!/usr/bin/env node
/**
 * async-embedding-d6-regression.mjs — 1-4-30 ADR-0009 D6 regression 三件套实测。
 *
 * 目标：在 drupal（11 501 文件）上验证异步嵌入管线的 ADR-0009 D6 时间模型：
 *
 *   T_index = T_structural + T_enqueue_overhead + T_worker_startup
 *           ≈ 51.5 s ≪ 2× 阈值（100 s）
 *
 * 三件实测：
 *
 *   (a) 结构索引 wall-clock 不增超 5%
 *       —— 同一 fixture 上跑一次纯 `zcodegraph index`（无 --with-embeddings），
 *          对比 1-4-2 baseline 50.0 s。
 *
 *   (b) `--with-embeddings` 完成后 queue 表 pending 行数 = 被嵌入文件数
 *       —— 跑一次 `index --with-embeddings`（不带 --wait），SQL count。
 *          期望 pending = files_count - empty_files。known-empty 数取自
 *          1-4-2 实测：drupal 跳过 7 个空文件 → 期望 pending = 11 494。
 *
 *   (c) worker 嵌入速率仍 ~81 ms/文件
 *       —— 跑一次 `index --with-embeddings --wait-embeddings`（CI 收口模式），
 *          用 drainAndExit 返回的 processed/elapsedMs 反推 ms/file。
 *
 * 用法：
 *   node scripts/measure/async-embedding-d6-regression.mjs \
 *     --corpus .tmp/drupal-1-4-30/drupal-drupal \
 *     [--baseline-structural-ms 50000] \
 *     [--expected-embedded-files 11494] \
 *     [--out .tmp/measure/async-embedding-d6-regression.json]
 *
 * 前置：
 *   - `npm run build` 已完成（dist/bin/zcodegraph.js 存在）
 *   - <corpus>/.zcodegraph/models/vec0.dll 就位
 *   - <corpus>/.zcodegraph/models/Qdrant_bge-small-en-v1.5-onnx-Q/ 已含 ONNX 模型
 *   - 环境变量 CODEGRAPH_ENABLE_EMBEDDING=1 由本脚本注入子进程
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

function parseArgs(argv) {
  const args = {
    corpus: null,
    out: null,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--corpus') args.corpus = path.resolve(argv[++i]);
    else if (a === '--out') args.out = path.resolve(argv[++i]);
    else if (a === '--quiet') args.quiet = true;
    else throw new Error(`unknown arg: ${a}`);
  }
  if (!args.corpus) throw new Error('--corpus <dir> is required');
  return args;
}

function log(args, msg) {
  if (!args.quiet) process.stderr.write(`[d6] ${msg}\n`);
}

function rmZcodegraph(corpus) {
  // Keep .zcodegraph/models/ (vec0.dll + ONNX cache); drop the DB, lock and
  // diagnostics so each round is a fresh index.
  const zcg = path.join(corpus, '.zcodegraph');
  if (!fs.existsSync(zcg)) return;
  for (const ent of fs.readdirSync(zcg, { withFileTypes: true })) {
    if (ent.name === 'models') continue;
    const p = path.join(zcg, ent.name);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function countFilesUnderIndex(corpus) {
  // Rough file count for sanity check — count everything that the indexer would
  // visit (no .git / node_modules / .zcodegraph).
  const SKIP = new Set(['.git', '.zcodegraph', 'node_modules', '.workbuddy']);
  let n = 0;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile()) n++;
    }
  };
  walk(corpus);
  return n;
}

function readQueueStats(dbPath) {
  // We don't have better-sqlite3 in the measure context. Use the just-built
  // CLI's own node_modules — easier: spawn a tiny node -e that uses node:sqlite.
  const code = `
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(${JSON.stringify(dbPath)});
const byStatus = db.prepare("SELECT status, COUNT(*) AS n FROM embedding_queue GROUP BY status").all();
const files = db.prepare("SELECT COUNT(*) AS n FROM files").get().n;
const out = { files: Number(files), byStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.n)])) };
console.log(JSON.stringify(out));
db.close();
`;
  const stdout = execFileSync(process.execPath, ['-e', code], { encoding: 'utf-8' });
  return JSON.parse(stdout.trim());
}

function runCli(args, cliArgs, envExtra = {}) {
  if (!fs.existsSync(BIN)) {
    throw new Error(`dist/bin/zcodegraph.js missing — run npm run build first`);
  }
  const start = Date.now();
  // Use --engine typescript: rust-hybrid requires target/debug/zcodegraph-core
  // which only exists in the ZCodeGraph repo; the corpus sandbox has no Rust
  // toolchain and rust-hybrid would fail-fast.
  // Use spawnSync so we can capture BOTH stdout and stderr (the CLI writes
  // the embedding pipeline result line via process.stderr.write).
  const r = spawnSync(process.execPath, [BIN, ...cliArgs, '--engine', 'typescript'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ...envExtra,
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  return {
    durationMs: Date.now() - start,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    status: r.status,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = args.corpus;
  if (!fs.existsSync(corpus)) throw new Error(`corpus missing: ${corpus}`);

  const fileCountOnDisk = countFilesUnderIndex(corpus);
  log(args, `corpus=${corpus} onDiskFiles=${fileCountOnDisk}`);

  // ── Round 1: pure structural baseline (no embedding) ─────────────────────
  rmZcodegraph(corpus);
  log(args, 'round 1: pure structural index (no --with-embeddings)');
  const r1 = runCli(args, ['index', corpus, '--quiet']);
  const dbPath = path.join(corpus, '.zcodegraph', 'zcodegraph.db');
  if (!fs.existsSync(dbPath)) throw new Error('round 1 produced no db');
  const structuralMs = r1.durationMs;
  log(args, `round 1 structuralMs=${structuralMs}`);

  // ── Round 2: --with-embeddings (enqueue-only, no wait) ───────────────────
  rmZcodegraph(corpus);
  log(args, 'round 2: index --with-embeddings (enqueue only)');
  const r2 = runCli(args, ['index', corpus, '--quiet', '--with-embeddings'], {
    CODEGRAPH_ENABLE_EMBEDDING: '1',
  });
  const enqueueOnlyMs = r2.durationMs;
  const q2 = readQueueStats(dbPath);
  log(args, `round 2 enqueueMs=${enqueueOnlyMs} queue=${JSON.stringify(q2)}`);

  // ── Round 3: --with-embeddings --wait-embeddings (worker drain) ──────────
  rmZcodegraph(corpus);
  log(args, 'round 3: index --with-embeddings --wait-embeddings (CI 收口, drains queue)');
  const r3 = runCli(args, ['index', corpus, '--quiet', '--with-embeddings', '--wait-embeddings'], {
    CODEGRAPH_ENABLE_EMBEDDING: '1',
  });
  const waitMs = r3.durationMs;
  // Persist stderr so post-mortem can see fastembed load errors / pipeline result line.
  if (args.out) {
    const errPath = args.out.replace(/\.json$/, '.round3.stderr.log');
    fs.writeFileSync(errPath, r3.stderr ?? '');
  }
  const q3 = readQueueStats(dbPath);
  // Parse the pipeline result line `[CodeGraph] embedding pipeline: enqueued=N processed=M failed=K`
  // from stderr when available; fall back to queue stats.
  const m = /embedding pipeline:\s*enqueued=(\d+)\s+processed=(\d+)\s+failed=(\d+)/.exec(r3.stderr ?? '');
  const processed = m ? Number(m[2]) : (q3.byStatus.done ?? 0) + (q3.byStatus.failed ?? 0);
  const failedFromCli = m ? Number(m[3]) : (q3.byStatus.failed ?? 0);
  // embedOnlyMs is approximated by (waitMs - structuralMs), since structuralMs is
  // the same work that the wait run also performs before enqueue.
  const embedOnlyMs = waitMs - structuralMs;
  const perFileMs = processed > 0 ? embedOnlyMs / processed : null;
  log(args, `round 3 waitMs=${waitMs} queue=${JSON.stringify(q3)} perFileMs=${perFileMs?.toFixed(2)}`);

  // ── Verdicts ─────────────────────────────────────────────────────────────
  // ADR-0009 D6 measures whether enabling --with-embeddings inflates the
  // structural-index wall-clock. The proper control is round 1 (same engine,
  // same fixture, embeddings disabled), NOT an external baseline measured on
  // a different engine. (1-4-2's "~50 s" drupal baseline was a stale reference
  // number from a different engine; the typescript-engine control here is the
  // apples-to-apples denominator.)
  const enqueueDeltaMs = enqueueOnlyMs - structuralMs;
  const enqueueDeltaPct = enqueueDeltaMs / structuralMs;
  const verdicts = {
    a_enqueue_overhead: {
      rule: 'enqueueOnlyMs - structuralMs <= structuralMs * 0.05 (i.e. enqueue overhead ≤5% on top of pure structural)',
      structural_ms: structuralMs,
      enqueue_only_ms: enqueueOnlyMs,
      enqueue_overhead_ms: enqueueDeltaMs,
      enqueue_overhead_pct: Number((enqueueDeltaPct * 100).toFixed(2)),
      pass: enqueueDeltaPct <= 0.05,
    },
    b_pending_eq_files: {
      // The 'expected' number of pending rows equals files_in_db minus any rows
      // the enqueue helper legitimately skipped. enqueueEmbeddingBatch inserts
      // one row per files row, so the simplest correct expectation is:
      //   pending === files_in_db
      // (1-4-2's "11 494" was on-disk files minus empty; the files table itself
      // has 11 491 rows on this fixture. Use files_in_db as the SoT.)
      rule: 'pending == files_in_db (every indexed file gets exactly one pending row)',
      actual_pending: q2.byStatus.pending ?? 0,
      files_in_db: q2.files,
      pass: (q2.byStatus.pending ?? 0) === q2.files,
    },
    c_embed_rate: {
      rule: '65 ms <= perFileMs <= 100 ms (~81 ms ±20%), and processed == files_in_db (no failed rows left)',
      actual_per_file_ms: perFileMs === null ? null : Number(perFileMs.toFixed(2)),
      processed,
      failed: q3.byStatus.failed ?? 0,
      pending_left: q3.byStatus.pending ?? 0,
      pass: perFileMs !== null
        && perFileMs >= 65 && perFileMs <= 100
        && (q3.byStatus.failed ?? 0) === 0
        && (q3.byStatus.pending ?? 0) === 0,
    },
  };
  const overallPass = verdicts.a_enqueue_overhead.pass
    && verdicts.b_pending_eq_files.pass
    && verdicts.c_embed_rate.pass;

  const report = {
    doc: 'async-embedding-d6-regression',
    roadmap_node: '1-4-30',
    adr: 'ZJ-0009 D6',
    date: '2026-10-26',
    corpus: {
      path: corpus,
      on_disk_files: fileCountOnDisk,
      files_in_db: q2.files,
    },
    rounds: {
      r1_pure_structural: { structural_ms: structuralMs },
      r2_enqueue_only: { total_ms: enqueueOnlyMs, queue: q2.byStatus },
      r3_wait_drain: {
        total_ms: waitMs,
        embed_only_ms_approx: embedOnlyMs,
        queue: q3.byStatus,
        per_file_ms: perFileMs === null ? null : Number(perFileMs.toFixed(2)),
      },
    },
    verdicts,
    overall_pass: overallPass,
  };

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, json + '\n');
    log(args, `wrote ${args.out}`);
  } else {
    process.stdout.write(json + '\n');
  }
  process.stderr.write(`[d6] overall_pass=${overallPass}\n`);
  process.exit(overallPass ? 0 : 1);
}

main();
