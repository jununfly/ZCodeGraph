#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { spawnMeasured } from './process-tree-rss.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const TIMEOUT_SNAPSHOT_INTERVAL_MS = 30_000;
const MAX_TIMEOUT_SNAPSHOTS = 20;

function usage() {
  console.log([
    'Usage: node scripts/rust-hybrid-baseline.mjs --out <result.json> --repo <name>=<path> [--runs <n>] [--timeout-ms <n>] [--repo <name>=<path> ...]',
    '',
    'Runs default rust-hybrid indexing for each corpus, records wall time, RSS,',
    'profile artifacts, status/graphStats, fallback taxonomy, and missing-corpus',
    'needs-human-setup records. --runs applies to the most recent --repo.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = [];
  let out = null;
  let bin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
  let timeoutMs = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--out') {
      out = path.resolve(requiredValue(argv, ++i, '--out'));
      continue;
    }
    if (arg === '--bin') {
      bin = path.resolve(requiredValue(argv, ++i, '--bin'));
      continue;
    }
    if (arg === '--timeout-ms') {
      timeoutMs = Number.parseInt(requiredValue(argv, ++i, '--timeout-ms'), 10);
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('--timeout-ms must be a positive integer');
      continue;
    }
    if (arg === '--repo') {
      const spec = requiredValue(argv, ++i, '--repo');
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--repo must be name=path');
      repos.push({ name: spec.slice(0, eq), path: path.resolve(spec.slice(eq + 1)), runs: 1 });
      continue;
    }
    if (arg === '--runs') {
      if (repos.length === 0) throw new Error('--runs must follow --repo');
      const runs = Number.parseInt(requiredValue(argv, ++i, '--runs'), 10);
      if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
      repos[repos.length - 1].runs = runs;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out) throw new Error('--out is required');
  if (repos.length === 0) throw new Error('At least one --repo is required');
  return { help: false, out, bin, repos, timeoutMs };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
}

function runChecked(command, args, cwd, env = {}) {
  const result = run(command, args, cwd, env);
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed in ${cwd}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

function gitCommit(dir) {
  if (!fs.existsSync(path.join(dir, '.git'))) return null;
  const result = run('git', ['rev-parse', '--short', 'HEAD'], dir);
  return result.status === 0 ? result.stdout.trim() : null;
}

function isGitCheckout(dir) {
  if (!fs.existsSync(dir)) return false;
  const result = run('git', ['rev-parse', '--is-inside-work-tree'], dir);
  return result.status === 0 && result.stdout.trim() === 'true';
}

function nodeToolchain() {
  const rustc = run('rustc', ['--version'], repoRoot);
  const cargo = run('cargo', ['--version'], repoRoot);
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    rustc: rustc.status === 0 ? rustc.stdout.trim() : null,
    cargo: cargo.status === 0 ? cargo.stdout.trim() : null,
  };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function variance(values) {
  if (values.length <= 1) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length;
}

function summarizeProfile(profile) {
  const rustCore = profile?.rustCore ?? {};
  const finalize = profile?.finalize ?? {};
  const ref = finalize?.referenceResolutionBreakdown ?? {};
  const checkpoints = Array.isArray(profile?.checkpoints) ? profile.checkpoints : [];
  return {
    complete: profile?.complete === true,
    lastCheckpoint: checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null,
    checkpointCount: checkpoints.length,
    rustCore: pickNumbers(rustCore, [
      'sourceScanMs',
      'parseExtractionMs',
      'sqliteWriteMs',
      'subprocessStartupHandoffMs',
    ]),
    finalize: pickNumbers(finalize, [
      'frameworkPostExtractMs',
      'referenceResolutionMs',
      'dynamicDispatchSynthesisMs',
      'dbMaintenanceMs',
    ]),
    referenceResolutionBreakdown: pickNumbers(ref, [
      'importResolutionMs',
      'nameMatchingMs',
      'frameworkMatchingMs',
      'databaseAccessMs',
      'edgeWriteMs',
      'unresolvedCleanupMs',
      'resolvedCleanupMs',
    ]),
    typescriptFallbackAppend: profile?.typescriptFallbackAppend ?? null,
    typescriptFinalizationMs: numberOrNull(profile?.typescriptFinalizationMs),
    fallbackTaxonomy: finalize?.fallbackTaxonomy ?? null,
  };
}

function pickNumbers(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, numberOrNull(source?.[key])]));
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function statusGraphStats(bin, projectPath) {
  const result = run(process.execPath, [bin, 'status', projectPath, '--json'], projectPath, baseEnv());
  if (result.status !== 0) {
    return {
      available: false,
      error: result.stderr.trim() || result.stdout.trim() || 'status command failed',
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return {
      available: true,
      fileCount: parsed.fileCount ?? null,
      nodeCount: parsed.nodeCount ?? null,
      edgeCount: parsed.edgeCount ?? null,
      dbSizeBytes: parsed.dbSizeBytes ?? null,
      nodesByKind: parsed.nodesByKind ?? {},
      languages: parsed.languages ?? [],
      index: parsed.index ?? null,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function profileArtifactStatus(profilePath) {
  if (!fs.existsSync(profilePath)) return { exists: false };
  const stat = fs.statSync(profilePath);
  return {
    exists: true,
    sizeBytes: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function baseEnv(extra = {}) {
  return {
    ...extra,
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
}

async function runOne({ repo, runIndex, bin, outDir, timeoutMs }) {
  const profilePath = path.join(outDir, `${repo.name}-run${runIndex}.profile.json`);
  const init = run(
    process.execPath,
    [bin, 'init', repo.path, '--engine', 'rust-hybrid'],
    repo.path,
    baseEnv(),
  );
  if (init.status !== 0) {
    return {
      run: runIndex,
      command: {
        executable: process.execPath,
        args: [bin, 'init', repo.path, '--engine', 'rust-hybrid'],
        cwd: repo.path,
      },
      status: 'failed',
      exitCode: init.status,
      signal: init.signal,
      wallMs: 0,
      peakRssBytes: null,
      rssSource: null,
      rssUnavailableKind: 'process-ended-before-sample',
      rssUnavailableReason: 'RSS not sampled because init failed before indexing',
      profilePath: null,
      profileSummary: summarizeProfile(null),
      graphStats: statusGraphStats(bin, repo.path),
      stdoutBytes: Buffer.byteLength(init.stdout ?? ''),
      stderrBytes: Buffer.byteLength(init.stderr ?? ''),
      failureOutput: failureOutput(init.stdout, init.stderr),
    };
  }
  const args = [
    bin,
    'index',
    repo.path,
    '--engine',
    'rust-hybrid',
    '--force',
    '--profile-out',
    profilePath,
    '--quiet',
  ];
  const env = baseEnv();
  const timeoutSnapshots = [];
  let lastTimeoutSnapshotAt = -Infinity;
  const captureTimeoutSnapshot = (sample, force = false) => {
    if (!force && sample.elapsedMs - lastTimeoutSnapshotAt < TIMEOUT_SNAPSHOT_INTERVAL_MS) return;
    lastTimeoutSnapshotAt = sample.elapsedMs;
    timeoutSnapshots.push({
      elapsedMs: sample.elapsedMs,
      graphStats: statusGraphStats(bin, repo.path),
      profile: profileArtifactStatus(profilePath),
      stdoutBytes: Buffer.byteLength(sample.stdout ?? ''),
      stderrBytes: Buffer.byteLength(sample.stderr ?? ''),
      stdoutTail: tail(sample.stdout ?? ''),
      stderrTail: tail(sample.stderr ?? ''),
      peakRssBytes: sample.peakRssBytes ?? null,
      rssSource: sample.rssSource ?? null,
      rssUnavailableKind: sample.rssUnavailableKind ?? null,
      rssUnavailableReason: sample.rssUnavailableReason ?? null,
    });
    if (timeoutSnapshots.length > MAX_TIMEOUT_SNAPSHOTS) {
      timeoutSnapshots.splice(0, timeoutSnapshots.length - MAX_TIMEOUT_SNAPSHOTS);
    }
  };
  const measured = await spawnMeasured(process.execPath, args, {
    cwd: repo.path,
    env,
    rssMode: 'command',
    timeoutMs,
    onSample: (sample) => captureTimeoutSnapshot(sample),
  });
  if (measured.timedOut && timeoutSnapshots.length === 0) {
    captureTimeoutSnapshot({
      elapsedMs: measured.wallMs,
      stdout: measured.stdout,
      stderr: measured.stderr,
      peakRssBytes: measured.peakRssBytes,
      rssSource: measured.rssSource,
      rssUnavailableKind: measured.rssUnavailableKind,
      rssUnavailableReason: measured.rssUnavailableReason,
    }, true);
  }

  const profile = fs.existsSync(profilePath)
    ? JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
    : null;
  const status = statusGraphStats(bin, repo.path);
  const indexCompleted = profile?.complete === true && status.available && (status.nodeCount ?? 0) > 0;
  const completed = indexCompleted && (
    measured.code === 0 ||
    measured.rssUnavailableKind === 'command-wrapper-no-rss' ||
    measured.rssUnavailableKind === 'command-wrapper-unavailable'
  );
  return {
    run: runIndex,
    command: {
      executable: process.execPath,
      args,
      cwd: repo.path,
    },
    status: measured.timedOut ? 'timed-out' : (completed ? 'completed' : 'failed'),
    exitCode: measured.code,
    signal: measured.signal,
    wallMs: measured.wallMs,
    peakRssBytes: measured.peakRssBytes,
    rssSource: measured.rssSource ?? null,
    rssUnavailableKind: measured.rssUnavailableKind ?? null,
    rssUnavailableReason: measured.rssUnavailableReason,
    profilePath: fs.existsSync(profilePath) ? path.relative(repoRoot, profilePath) : null,
    profileSummary: summarizeProfile(profile),
    graphStats: status,
    stdoutBytes: Buffer.byteLength(measured.stdout),
    stderrBytes: Buffer.byteLength(measured.stderr),
    ...(measured.timedOut ? { timeoutSnapshots } : {}),
    ...(completed ? {} : {
      failureOutput: {
        ...failureOutput(measured.stdout, measured.stderr),
        reason: measured.code === 0
          ? 'index command exited successfully but did not produce a non-empty baseline profile and graph'
          : 'index command failed',
      },
    }),
  };
}

function failureOutput(stdout, stderr) {
  return {
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
  };
}

function tail(text, max = 4000) {
  if (!text) return '';
  return text.length <= max ? text : text.slice(text.length - max);
}

async function runRepo(repo, bin, outDir, timeoutMs) {
  const gitCheckout = isGitCheckout(repo.path);
  if (!fs.existsSync(repo.path) || !gitCheckout) {
    return {
      name: repo.name,
      path: repo.path,
      status: 'needs-human-setup',
      unavailableReason: !fs.existsSync(repo.path)
        ? 'corpus path does not exist'
        : 'corpus path is not a valid Git checkout',
      requestedRuns: repo.runs,
      runs: [],
    };
  }

  const runs = [];
  for (let runIndex = 1; runIndex <= repo.runs; runIndex++) {
    console.error(`[baseline] ${repo.name} run ${runIndex}/${repo.runs}`);
    runs.push(await runOne({ repo, runIndex, bin, outDir, timeoutMs }));
    if (runs[runs.length - 1].status !== 'completed') break;
  }
  const completed = runs.filter((run) => run.status === 'completed');
  const wallValues = completed.map((run) => run.wallMs).filter(Number.isFinite);
  const rssValues = completed.map((run) => run.peakRssBytes).filter(Number.isFinite);
  return {
    name: repo.name,
    path: repo.path,
    commit: gitCommit(repo.path),
    status: runs.some((run) => run.status === 'timed-out')
      ? 'timed-out'
      : (completed.length === repo.runs ? 'completed' : 'failed'),
    requestedRuns: repo.runs,
    completedRuns: completed.length,
    runs,
    summary: {
      medianWallMs: median(wallValues),
      wallMsVariance: variance(wallValues),
      medianPeakRssBytes: median(rssValues),
      peakRssBytesVariance: variance(rssValues),
      rssSources: [...new Set(runs.map((run) => run.rssSource).filter(Boolean))],
      rssUnavailableKinds: [...new Set(runs.map((run) => run.rssUnavailableKind).filter(Boolean))],
      rssUnavailableReasons: [...new Set(runs.map((run) => run.rssUnavailableReason).filter(Boolean))],
    },
  };
}

function classify(results) {
  if (results.some((result) => result.status === 'failed')) return 'baseline-run-failed';
  if (results.some((result) => result.status === 'timed-out')) return 'baseline-partial-timeout';
  if (results.some((result) => result.status === 'needs-human-setup')) return 'baseline-partial-needs-human-setup';
  return 'baseline-frozen';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.bin)) {
    throw new Error(`${args.bin} not found. Run npm run build first or pass --bin.`);
  }

  const outBase = path.basename(args.out, path.extname(args.out));
  const outDir = path.join(path.dirname(args.out), `tmp-${outBase}`);
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const repo of args.repos) {
    console.error(`[baseline] starting ${repo.name}`);
    results.push(await runRepo(repo, args.bin, outDir, args.timeoutMs));
    writeArtifact(args.out, {
      baseline: 'baseline-indexing-performance-v1',
      generatedAt: new Date().toISOString(),
      zcodegraphCommit: gitCommit(repoRoot),
      command: {
        executable: process.execPath,
        args: process.argv.slice(1),
        cwd: process.cwd(),
      },
      toolchain: nodeToolchain(),
      resultClassification: classify(results),
      thresholds: {
        candidateSignalPct: 5,
        planLevelClaimPct: 10,
      },
      results,
    });
  }

  const artifact = {
    baseline: 'baseline-indexing-performance-v1',
    generatedAt: new Date().toISOString(),
    zcodegraphCommit: gitCommit(repoRoot),
    command: {
      executable: process.execPath,
      args: process.argv.slice(1),
      cwd: process.cwd(),
    },
    toolchain: nodeToolchain(),
    resultClassification: classify(results),
    thresholds: {
      candidateSignalPct: 5,
      planLevelClaimPct: 10,
    },
    results,
  };

  writeArtifact(args.out, artifact);
  console.log(JSON.stringify({
    out: path.relative(repoRoot, args.out),
    resultClassification: artifact.resultClassification,
    results: results.map((result) => ({ name: result.name, status: result.status })),
  }, null, 2));
}

function writeArtifact(out, artifact) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(artifact, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
