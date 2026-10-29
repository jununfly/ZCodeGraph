/**
 * Walkthrough driver for roadmap 1-2-1 (5 clean-environment scenarios).
 *
 * For each scenario:
 *   1. Build an isolated tmp dir with the right "dirty" state
 *      (locked DB / corrupt DB / read-only dir / missing wasm / no index).
 *   2. Run scripts/probe-mcp-init-failure.mjs against it.
 *   3. Collect pass/fail + the agent-visible text.
 *
 * Writes a summary JSON to .workbuddy/out/walkthrough-1-2-1.json and prints
 * a human-readable table.
 *
 * Usage: node scripts/walkthrough-1-2-1.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PROBE = path.resolve(HERE, 'probe-mcp-init-failure.mjs');
const BIN = path.resolve(ROOT, 'dist/bin/zcodegraph.js');
const OUT_DIR = path.resolve(ROOT, '.workbuddy/out');
const OUT_FILE = path.resolve(OUT_DIR, 'walkthrough-1-2-1.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- helpers ----------

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `zcg-wt1-2-1-${label}-`));
}

function writeMinimalProject(dir) {
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    'export function foo(): number { return 42; }\n',
  );
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'walkthrough', version: '0.0.0', private: true }, null, 2),
  );
}

function runNode(script, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function runIndexAt(dir) {
  // Run `zcodegraph index` in the tmp dir so we get a real .zcodegraph/.
  // --no-watch keeps it deterministic. We don't care about the resulting
  // index size — only that the DB file exists.
  return runNode(BIN, ['index', dir], {
    env: { ...process.env, ZCG_NO_DAEMON: '1' },
  });
}

async function runProbe(scenario, dir) {
  const r = await runNode(PROBE, [String(scenario), dir]);
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    parsed = { parseError: true, rawStdout: r.stdout, rawStderr: r.stderr };
  }
  return { exitCode: r.code, ...parsed };
}

// ---------- scenario builders ----------

async function buildScenario1() {
  // .zcodegraph/ exists with a real index, then we corrupt the DB by
  // truncating it to 0 bytes — sqlite open fails immediately.
  // (Locking a sqlite file from another process is unreliable on Windows;
  //  a 0-byte DB triggers the same "failed to open it" code path.)
  const dir = mkTmpDir('corrupt-db');
  writeMinimalProject(dir);
  const idx = await runIndexAt(dir);
  if (idx.code !== 0) return { dir, setupError: `index failed: ${idx.stderr}` };
  const dbPath = path.join(dir, '.zcodegraph', 'zcodegraph.db');
  if (!fs.existsSync(dbPath)) return { dir, setupError: 'no zcodegraph.db after index' };
  fs.writeFileSync(dbPath, Buffer.alloc(0));
  return { dir };
}

async function buildScenario2() {
  // .zcodegraph/ exists but DB contains garbage (not a sqlite header).
  const dir = mkTmpDir('garbage-db');
  writeMinimalProject(dir);
  const idx = await runIndexAt(dir);
  if (idx.code !== 0) return { dir, setupError: `index failed: ${idx.stderr}` };
  const dbPath = path.join(dir, '.zcodegraph', 'zcodegraph.db');
  fs.writeFileSync(dbPath, Buffer.from('not a sqlite database at all', 'utf8'));
  return { dir };
}

async function buildScenario3() {
  // .zcodegraph/ exists, dir mode read-only. On Windows chmod has limited
  // effect but sqlite still fails to open the DB for write (WAL needs -wal
  // and -shm files).
  const dir = mkTmpDir('readonly-dir');
  writeMinimalProject(dir);
  const idx = await runIndexAt(dir);
  if (idx.code !== 0) return { dir, setupError: `index failed: ${idx.stderr}` };
  const zcgDir = path.join(dir, '.zcodegraph');
  // Strip write permission on the directory itself.
  fs.chmodSync(zcgDir, 0o555);
  return { dir, cleanup: () => fs.chmodSync(zcgDir, 0o755) };
}

async function buildScenario4() {
  // Index a Lua file while the lua wasm is missing from node_modules.
  // We simulate by setting an env var that lets us shadow the wasm dir.
  // Simpler: temporarily rename the wasm, run index, restore.
  // For the probe we only need `zcodegraph_status` output, and the wasm
  // failure is registered when grammars load — i.e. during `index`.
  const dir = mkTmpDir('missing-wasm');
  fs.writeFileSync(path.join(dir, 'hello.lua'), 'local function f() return 1 end\n');
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'walkthrough-lua', version: '0.0.0', private: true }),
  );
  return { dir, needsWasmShadow: true };
}

async function buildScenario5() {
  // Completely clean — no .zcodegraph/ at all.
  const dir = mkTmpDir('no-index');
  writeMinimalProject(dir);
  return { dir };
}

// ---------- main ----------

const scenarios = [
  { id: 1, label: 'corrupt DB (0 bytes)', build: buildScenario1 },
  { id: 2, label: 'garbage DB (non-sqlite)', build: buildScenario2 },
  { id: 3, label: 'read-only .zcodegraph/', build: buildScenario3 },
  { id: 4, label: 'missing tree-sitter-lua.wasm', build: buildScenario4 },
  { id: 5, label: 'no .zcodegraph/ (clean)', build: buildScenario5 },
];

const results = [];
for (const s of scenarios) {
  process.stdout.write(`\n=== Scenario ${s.id}: ${s.label} ===\n`);
  const setup = await s.build();
  if (setup.setupError) {
    results.push({ scenario: s.id, label: s.label, pass: false, setupError: setup.setupError });
    console.log(`SETUP FAILED: ${setup.setupError}`);
    continue;
  }

  // Scenario 4 needs the lua wasm hidden during the *probe*, because that's
  // when the server tries to load grammars. Shadow it by renaming before
  // spawn, restoring after.
  let wasmRestore = null;
  if (setup.needsWasmShadow) {
    const wasmDir = path.resolve(ROOT, 'node_modules/tree-sitter-wasms/out');
    const wasmFile = path.join(wasmDir, 'tree-sitter-lua.wasm');
    const wasmBackup = wasmFile + '.walkthrough-bak';
    if (fs.existsSync(wasmFile)) {
      fs.renameSync(wasmFile, wasmBackup);
      wasmRestore = () => { try { fs.renameSync(wasmBackup, wasmFile); } catch { /* ignore */ } };
    }
  }

  try {
    const probe = await runProbe(s.id, setup.dir);
    results.push({ scenario: s.id, label: s.label, ...probe });
    console.log(`pass: ${probe.pass}`);
    if (!probe.pass) {
      console.log(`agent-visible text (first 500 chars):\n${(probe.agentVisible ?? '').slice(0, 500)}`);
      console.log(`stderr tail:\n${probe.stderrTail ?? ''}`);
    }
  } finally {
    if (wasmRestore) wasmRestore();
    if (setup.cleanup) setup.cleanup();
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));

const passCount = results.filter((r) => r.pass).length;
console.log(`\n=== Summary: ${passCount}/${results.length} scenarios passed ===`);
console.log(`Report written to: ${OUT_FILE}`);
process.exit(passCount === results.length ? 0 : 1);
