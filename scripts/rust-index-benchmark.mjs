#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const rustCore = path.join(
  repoRoot,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const PHASE1_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json']);
const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);

function usage() {
  console.log([
    'Usage: node scripts/rust-index-benchmark.mjs --repo <name>=<path> [--repo <name>=<path> ...]',
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-index-benchmark.mjs --repo zcodegraph=. --repo excalidraw=/tmp/codegraph-corpus/excalidraw',
    '',
    'The script copies each repo to temporary JS/TS-slice directories, runs',
    '`zcodegraph index` with the TypeScript and Rust engines, and emits JSON',
    'with wall-clock time and sampled peak RSS for the process tree.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repos };
    if (arg === '--repo') {
      const spec = argv[++i];
      if (!spec) throw new Error('--repo requires name=path');
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--repo must be name=path');
      repos.push({ name: spec.slice(0, eq), path: path.resolve(spec.slice(eq + 1)) });
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repos };
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed in ${cwd}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function copyPhase1Slice(source, label) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-bench-${label}-`));
  let copiedFiles = 0;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const src = path.join(current, entry.name);
      const rel = path.relative(source, src);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(src);
        continue;
      }
      if (!entry.isFile()) continue;

      const basename = path.basename(src);
      const ext = path.extname(src);
      if (!PHASE1_EXTENSIONS.has(ext) && !CONFIG_FILES.has(basename)) continue;

      const target = path.join(dest, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(src, target);
      copiedFiles++;
    }
  }

  walk(source);
  return { path: dest, copiedFiles };
}

async function indexWithTimedCli(project, engine) {
  run(process.execPath, [distBin, 'init', project], project, baseEnv());

  const args = [
    distBin,
    'index',
    project,
    '--force',
    '--quiet',
  ];
  const env = baseEnv();
  if (engine === 'rust') {
    args.push('--engine', 'rust');
    env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;
  }

  const startedAt = Date.now();
  const result = await spawnMeasured(process.execPath, args, project, env);
  const finishedAt = Date.now();

  if (result.code !== 0) {
    throw new Error([
      `${process.execPath} ${args.join(' ')} failed in ${project}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }

  return {
    engine,
    wallMs: finishedAt - startedAt,
    peakRssBytes: result.peakRssBytes,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function sampleProcessTreeRssBytes(rootPid) {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf-8' });
  if (result.status !== 0) return null;

  const rows = result.stdout.trim().split('\n').map((line) => {
    const [pid, ppid, rssKb] = line.trim().split(/\s+/).map(Number);
    return { pid, ppid, rssKb };
  }).filter((row) => Number.isFinite(row.pid) && Number.isFinite(row.ppid) && Number.isFinite(row.rssKb));

  const children = new Map();
  for (const row of rows) {
    const list = children.get(row.ppid) ?? [];
    list.push(row.pid);
    children.set(row.ppid, list);
  }

  const wanted = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift();
    for (const child of children.get(pid) ?? []) {
      if (wanted.has(child)) continue;
      wanted.add(child);
      queue.push(child);
    }
  }

  let totalKb = 0;
  for (const row of rows) {
    if (wanted.has(row.pid)) totalKb += row.rssKb;
  }
  return totalKb * 1024;
}

function spawnMeasured(command, args, cwd, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let peakRssBytes = 0;
    const sample = () => {
      const rss = sampleProcessTreeRssBytes(child.pid);
      if (rss != null && rss > peakRssBytes) peakRssBytes = rss;
    };
    const timer = setInterval(sample, 50);
    sample();

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });
    child.on('close', (code, signal) => {
      sample();
      clearInterval(timer);
      resolve({ code, signal, stdout, stderr, peakRssBytes: peakRssBytes || null });
    });
  });
}

function baseEnv() {
  return {
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
}

function metadataFor(repoPath) {
  const commit = fs.existsSync(path.join(repoPath, '.git'))
    ? run('git', ['rev-parse', '--short', 'HEAD'], repoPath).stdout.trim()
    : null;
  return {
    sourcePath: repoPath,
    commit,
  };
}

function ratio(ts, rust) {
  const speedup = ts.wallMs > 0 ? (ts.wallMs - rust.wallMs) / ts.wallMs : 0;
  const rssReduction = ts.peakRssBytes && rust.peakRssBytes
    ? (ts.peakRssBytes - rust.peakRssBytes) / ts.peakRssBytes
    : null;
  return {
    speedupPct: Math.round(speedup * 1000) / 10,
    rssReductionPct: rssReduction == null ? null : Math.round(rssReduction * 1000) / 10,
    gatePass: speedup >= 0.25 || (rssReduction != null && rssReduction >= 0.30),
  };
}

function collectGateFailures(results) {
  return results
    .filter((result) => !result.comparison.gatePass)
    .map((result) => (
      `${result.name}: Rust was ${Math.abs(result.comparison.speedupPct)}% slower and ` +
      `${result.comparison.rssReductionPct ?? 'unknown'}% lower RSS, below the hard gate`
    ));
}

async function main() {
  const { help, repos } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (repos.length === 0) throw new Error('At least one --repo name=path is required');
  if (!fs.existsSync(distBin)) throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  if (!fs.existsSync(rustCore)) throw new Error('target/debug/zcodegraph-core not found. Run cargo build --package zcodegraph-core first.');
  const results = [];
  for (const repo of repos) {
    const tsCopy = copyPhase1Slice(repo.path, `${repo.name}-ts`);
    const rustCopy = copyPhase1Slice(repo.path, `${repo.name}-rust`);
    const ts = await indexWithTimedCli(tsCopy.path, 'typescript');
    const rust = await indexWithTimedCli(rustCopy.path, 'rust');
    results.push({
      name: repo.name,
      ...metadataFor(repo.path),
      phase1CopiedFiles: tsCopy.copiedFiles,
      typescript: ts,
      rust,
      comparison: ratio(ts, rust),
    });
  }

  const gateFailures = collectGateFailures(results);
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    toolchain: {
      node: process.version,
      rustc: run('rustc', ['--version'], repoRoot).stdout.trim(),
      cargo: run('cargo', ['--version'], repoRoot).stdout.trim(),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    results,
    gateFailures,
  }, null, 2));
  if (gateFailures.length > 0) {
    console.error(`Rust benchmark gates failed:\n- ${gateFailures.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
