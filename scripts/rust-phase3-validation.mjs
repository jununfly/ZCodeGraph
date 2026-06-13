#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const defaultRustCore = path.join(
  repoRoot,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const REQUIRED_REPOS = ['zcodegraph', 'excalidraw', 'zustand'];

function usage() {
  console.log([
    'Usage: node scripts/rust-phase3-validation.mjs --repo zcodegraph=<path> --repo excalidraw=<path> --repo zustand=<path> --out <dir>',
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-phase3-validation.mjs \\',
    '    --repo zcodegraph=. \\',
    '    --repo excalidraw=/tmp/codegraph-corpus/excalidraw \\',
    '    --repo zustand=/tmp/codegraph-corpus/zustand \\',
    '    --out /tmp/zcodegraph-rust-phase3',
    '',
    'The harness is intentionally thin: it delegates benchmark, profile, and',
    'Agent Sufficiency checks to the existing scripts, preserves their raw',
    'artifacts, runs local smoke/diagnostics checks, and writes summary.json plus',
    'summary.md for repeatable Phase 3 validation.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = new Map();
  let outDir = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repos, outDir };
    if (arg === '--repo') {
      const spec = argv[++i];
      if (!spec) throw new Error('--repo requires name=path');
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--repo must be name=path');
      repos.set(spec.slice(0, eq), path.resolve(spec.slice(eq + 1)));
      continue;
    }
    if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      outDir = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repos, outDir };
}

function validateArgs(repos, outDir) {
  const errors = [];
  if (!outDir) errors.push('Missing required --out <dir>');
  const missingRepos = REQUIRED_REPOS.filter((name) => !repos.has(name));
  if (missingRepos.length > 0) {
    errors.push(`Missing required repos: ${missingRepos.join(', ')}`);
  }
  for (const [name, repoPath] of repos) {
    if (!REQUIRED_REPOS.includes(name)) {
      errors.push(`Unknown repo "${name}". Expected: ${REQUIRED_REPOS.join(', ')}`);
      continue;
    }
    if (!fs.existsSync(repoPath)) errors.push(`Repo path for ${name} does not exist: ${repoPath}`);
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

function baseEnv() {
  return {
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
}

function scriptPath(envName, fallback) {
  return process.env[envName] ? path.resolve(process.env[envName]) : path.join(repoRoot, fallback);
}

function relativeArtifact(outDir, artifactPath) {
  return path.relative(outDir, artifactPath).split(path.sep).join('/');
}

function parseJsonMaybe(text) {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function writeTextArtifact(outDir, stepDir, basename, text) {
  const target = path.join(outDir, stepDir, basename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return relativeArtifact(outDir, target);
}

function repoArgs(repos) {
  const args = [];
  for (const name of REQUIRED_REPOS) {
    args.push('--repo', `${name}=${repos.get(name)}`);
  }
  return args;
}

function metadataForRepo(repoPath) {
  const result = fs.existsSync(path.join(repoPath, '.git'))
    ? spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoPath, encoding: 'utf-8' })
    : null;
  return {
    sourcePath: repoPath,
    commit: result?.status === 0 ? result.stdout.trim() : null,
  };
}

function runProcess(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...baseEnv(), ...env },
    encoding: 'utf-8',
  });
}

function summarizeProcess(name, result, parsedStdout, artifacts) {
  const gateFailures = Array.isArray(parsedStdout?.gateFailures) ? parsedStdout.gateFailures : [];
  const regressions = Array.isArray(parsedStdout?.regressions) ? parsedStdout.regressions : [];
  const passed = result.status === 0 && gateFailures.length === 0 && regressions.length === 0;
  return {
    name,
    passed,
    exitCode: result.status,
    signal: result.signal,
    gateFailures,
    regressions,
    artifacts,
  };
}

function runDelegatedStep(outDir, name, script, repos) {
  const result = runProcess(process.execPath, [script, ...repoArgs(repos)], repoRoot);
  const parsedStdout = parseJsonMaybe(result.stdout);
  const stdoutName = parsedStdout ? 'stdout.json' : 'stdout.txt';
  const artifacts = {
    stdout: writeTextArtifact(outDir, name, stdoutName, result.stdout),
    stderr: writeTextArtifact(outDir, name, 'stderr.txt', result.stderr),
  };
  return {
    parsedStdout,
    summary: summarizeProcess(name, result, parsedStdout, artifacts),
  };
}

function runFailureSafetyMatrix(outDir, script) {
  const matrixOutDir = path.join(outDir, 'failure-safety-matrix', 'matrix-output');
  const result = runProcess(process.execPath, [script, '--out', matrixOutDir], repoRoot);
  const parsedStdout = parseJsonMaybe(result.stdout);
  const stdoutName = parsedStdout ? 'stdout.json' : 'stdout.txt';
  const artifacts = {
    stdout: writeTextArtifact(outDir, 'failure-safety-matrix', stdoutName, result.stdout),
    stderr: writeTextArtifact(outDir, 'failure-safety-matrix', 'stderr.txt', result.stderr),
    summary: relativeArtifact(outDir, path.join(matrixOutDir, 'summary.json')),
  };
  return {
    parsedStdout,
    summary: summarizeProcess('failure-safety-matrix', result, parsedStdout, artifacts),
  };
}

function runPackageSmoke(outDir, script) {
  if (process.env.ZCODEGRAPH_PHASE3_SKIP_PACKAGE_SMOKE === '1') {
    return {
      parsedStdout: null,
      summary: {
        name: 'package-smoke',
        passed: true,
        skipped: true,
        reason: 'ZCODEGRAPH_PHASE3_SKIP_PACKAGE_SMOKE=1',
        artifacts: {},
      },
    };
  }
  const bundleDir = process.env.ZCODEGRAPH_PHASE3_BUNDLE_DIR;
  const npmRoot = process.env.ZCODEGRAPH_PHASE3_NPM_ROOT;
  if (!bundleDir || !npmRoot) {
    return {
      parsedStdout: null,
      summary: {
        name: 'package-smoke',
        passed: false,
        gateFailures: ['ZCODEGRAPH_PHASE3_BUNDLE_DIR and ZCODEGRAPH_PHASE3_NPM_ROOT are required unless ZCODEGRAPH_PHASE3_SKIP_PACKAGE_SMOKE=1'],
        artifacts: {},
      },
    };
  }
  const smokeOutDir = path.join(outDir, 'package-smoke', 'smoke-output');
  const result = runProcess(process.execPath, [
    script,
    '--bundle',
    bundleDir,
    '--npm-root',
    npmRoot,
    '--out',
    smokeOutDir,
  ], repoRoot);
  const parsedStdout = parseJsonMaybe(result.stdout);
  const stdoutName = parsedStdout ? 'stdout.json' : 'stdout.txt';
  const artifacts = {
    stdout: writeTextArtifact(outDir, 'package-smoke', stdoutName, result.stdout),
    stderr: writeTextArtifact(outDir, 'package-smoke', 'stderr.txt', result.stderr),
    summary: relativeArtifact(outDir, path.join(smokeOutDir, 'summary.json')),
  };
  return {
    parsedStdout,
    summary: summarizeProcess('package-smoke', result, parsedStdout, artifacts),
  };
}

function makeSmokeProject(label) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-phase3-${label}-`));
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: `phase3-${label}` }, null, 2));
  fs.writeFileSync(path.join(project, 'index.ts'), 'export function phase3Smoke() { return 3; }\n');
  return project;
}

function runDefaultTypescriptSmoke(outDir) {
  if (process.env.ZCODEGRAPH_PHASE3_SKIP_SMOKE === '1') {
    return {
      name: 'default-typescript-smoke',
      passed: true,
      skipped: true,
      reason: 'ZCODEGRAPH_PHASE3_SKIP_SMOKE=1',
      artifacts: {},
    };
  }

  const project = makeSmokeProject('typescript-smoke');
  const init = runProcess(process.execPath, [distBin, 'init', project], project);
  const index = init.status === 0
    ? runProcess(process.execPath, [distBin, 'index', project, '--force', '--quiet'], project)
    : null;
  const stdout = [`$ zcodegraph init\n${init.stdout}`, `$ zcodegraph index\n${index?.stdout ?? ''}`].join('\n');
  const stderr = [`$ zcodegraph init\n${init.stderr}`, `$ zcodegraph index\n${index?.stderr ?? ''}`].join('\n');
  const artifacts = {
    stdout: writeTextArtifact(outDir, 'default-typescript-smoke', 'stdout.txt', stdout),
    stderr: writeTextArtifact(outDir, 'default-typescript-smoke', 'stderr.txt', stderr),
  };
  return {
    name: 'default-typescript-smoke',
    passed: init.status === 0 && index?.status === 0,
    exitCode: index?.status ?? init.status,
    artifacts,
  };
}

function runRustSmoke(outDir) {
  if (process.env.ZCODEGRAPH_PHASE3_SKIP_SMOKE === '1') {
    return {
      name: 'rust-smoke',
      passed: true,
      skipped: true,
      reason: 'ZCODEGRAPH_PHASE3_SKIP_SMOKE=1',
      artifacts: {},
    };
  }

  const rustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY ?? defaultRustCore;
  const project = makeSmokeProject('rust-smoke');
  const init = runProcess(process.execPath, [distBin, 'init', project], project);
  const index = init.status === 0
    ? runProcess(
      process.execPath,
      [distBin, 'index', project, '--force', '--quiet', '--engine', 'rust'],
      project,
      { ZCODEGRAPH_RUST_CORE_BINARY: rustCore },
    )
    : null;
  const stdout = [`$ zcodegraph init\n${init.stdout}`, `$ zcodegraph index --engine rust\n${index?.stdout ?? ''}`].join('\n');
  const stderr = [`$ zcodegraph init\n${init.stderr}`, `$ zcodegraph index --engine rust\n${index?.stderr ?? ''}`].join('\n');
  const artifacts = {
    stdout: writeTextArtifact(outDir, 'rust-smoke', 'stdout.txt', stdout),
    stderr: writeTextArtifact(outDir, 'rust-smoke', 'stderr.txt', stderr),
  };
  return {
    name: 'rust-smoke',
    passed: init.status === 0 && index?.status === 0,
    exitCode: index?.status ?? init.status,
    rustCore,
    artifacts,
  };
}

function runDiagnostics(outDir) {
  if (process.env.ZCODEGRAPH_PHASE3_SKIP_DIAGNOSTICS === '1') {
    return {
      name: 'diagnostics',
      passed: true,
      skipped: true,
      reason: 'ZCODEGRAPH_PHASE3_SKIP_DIAGNOSTICS=1',
      artifacts: {},
    };
  }

  const project = makeSmokeProject('diagnostics');
  const init = runProcess(process.execPath, [distBin, 'init', project], project);
  const status = init.status === 0
    ? runProcess(process.execPath, [distBin, 'status', project, '--json'], project)
    : null;
  const parsedStdout = parseJsonMaybe(status?.stdout ?? '');
  const artifacts = {
    stdout: writeTextArtifact(outDir, 'diagnostics', parsedStdout ? 'stdout.json' : 'stdout.txt', status?.stdout ?? ''),
    stderr: writeTextArtifact(outDir, 'diagnostics', 'stderr.txt', `${init.stderr}${status?.stderr ?? ''}`),
  };
  return {
    name: 'diagnostics',
    passed: init.status === 0 && status?.status === 0 && parsedStdout != null,
    exitCode: status?.status ?? init.status,
    statusJson: parsedStdout,
    artifacts,
  };
}

function writeSummaryJson(outDir, summary) {
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

function writeSummaryMarkdown(outDir, summary) {
  const lines = [
    '# Rust Indexing Core Phase 3 Validation Summary',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Gates',
    '',
    '| Gate | Status | Notes |',
    '|---|---|---|',
  ];
  for (const gate of summary.gates) {
    const status = gate.passed ? 'pass' : 'fail';
    const notes = [
      gate.skipped ? `skipped: ${gate.reason}` : '',
      gate.gateFailures?.length ? `gate failures: ${gate.gateFailures.length}` : '',
      gate.regressions?.length ? `regressions: ${gate.regressions.length}` : '',
    ].filter(Boolean).join('; ');
    lines.push(`| ${gate.name} | ${status} | ${notes || ''} |`);
  }
  lines.push('', '## Repos', '', '| Repo | Commit | Path |', '|---|---|---|');
  for (const repo of summary.repos) {
    lines.push(`| ${repo.name} | ${repo.commit ?? 'n/a'} | ${repo.sourcePath} |`);
  }
  lines.push('');
  fs.writeFileSync(path.join(outDir, 'summary.md'), `${lines.join('\n')}\n`);
}

async function main() {
  const { help, repos, outDir } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  validateArgs(repos, outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const benchmarkScript = scriptPath('ZCODEGRAPH_PHASE3_BENCHMARK_SCRIPT', 'scripts/rust-index-benchmark.mjs');
  const profileScript = scriptPath('ZCODEGRAPH_PHASE3_PROFILE_SCRIPT', 'scripts/rust-index-profile.mjs');
  const sufficiencyScript = scriptPath('ZCODEGRAPH_PHASE3_SUFFICIENCY_SCRIPT', 'scripts/rust-sufficiency-guardrail.mjs');
  const failureMatrixScript = scriptPath('ZCODEGRAPH_PHASE3_FAILURE_MATRIX_SCRIPT', 'scripts/rust-failure-safety-matrix.mjs');
  const packageSmokeScript = scriptPath('ZCODEGRAPH_PHASE3_PACKAGE_SMOKE_SCRIPT', 'scripts/rust-package-smoke.mjs');

  const benchmark = runDelegatedStep(outDir, 'benchmark', benchmarkScript, repos);
  const profile = runDelegatedStep(outDir, 'profile', profileScript, repos);
  const sufficiency = runDelegatedStep(outDir, 'sufficiency', sufficiencyScript, repos);
  const failureSafetyMatrix = runFailureSafetyMatrix(outDir, failureMatrixScript);
  const packageSmoke = runPackageSmoke(outDir, packageSmokeScript);
  const typescriptSmoke = runDefaultTypescriptSmoke(outDir);
  const rustSmoke = runRustSmoke(outDir);
  const diagnostics = runDiagnostics(outDir);

  const gates = [
    benchmark.summary,
    profile.summary,
    sufficiency.summary,
    failureSafetyMatrix.summary,
    packageSmoke.summary,
    typescriptSmoke,
    rustSmoke,
    diagnostics,
  ];
  const summary = {
    generatedAt: new Date().toISOString(),
    plan: 'docs/plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md',
    toolchain: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    repos: REQUIRED_REPOS.map((name) => ({
      name,
      ...metadataForRepo(repos.get(name)),
    })),
    scripts: {
      benchmark: benchmarkScript,
      profile: profileScript,
      sufficiency: sufficiencyScript,
      failureSafetyMatrix: failureMatrixScript,
      packageSmoke: packageSmokeScript,
    },
    artifacts: {
      benchmark: benchmark.summary.artifacts,
      profile: profile.summary.artifacts,
      sufficiency: sufficiency.summary.artifacts,
      failureSafetyMatrix: failureSafetyMatrix.summary.artifacts,
      packageSmoke: packageSmoke.summary.artifacts,
      defaultTypescriptSmoke: typescriptSmoke.artifacts,
      rustSmoke: rustSmoke.artifacts,
      diagnostics: diagnostics.artifacts,
    },
    benchmark: benchmark.parsedStdout,
    profile: profile.parsedStdout,
    sufficiency: sufficiency.parsedStdout,
    failureSafetyMatrix: failureSafetyMatrix.parsedStdout,
    packageSmoke: packageSmoke.parsedStdout,
    smoke: {
      defaultTypescript: typescriptSmoke,
      rust: rustSmoke,
    },
    diagnostics,
    gates,
  };

  writeSummaryJson(outDir, summary);
  writeSummaryMarkdown(outDir, summary);

  const failures = gates.filter((gate) => !gate.passed);
  if (failures.length > 0) {
    console.error(`Phase 3 validation failed:\n- ${failures.map((gate) => gate.name).join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Phase 3 validation passed. Summary: ${path.join(outDir, 'summary.md')}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
