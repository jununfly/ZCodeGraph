#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const currentTarget = `${process.platform}-${process.arch}`;

function usage() {
  console.log([
    'Usage: node scripts/rust-package-smoke.mjs --bundle <dir> --npm-root <dir> --out <dir>',
    '',
    'Runs local-only smoke checks for a staged release bundle and staged packed',
    'npm package layout. The script never publishes packages, creates releases,',
    'pushes tags, or contacts the public npm registry.',
    '',
    'Inputs:',
    '  --bundle <dir>    Extracted Unix bundle root containing bin/zcodegraph',
    '  --npm-root <dir>  Staged release/npm root containing main/ and zcodegraph-<platform>/',
    '  --out <dir>       Artifact directory for stdout/stderr and summary files',
  ].join('\n'));
}

function parseArgs(argv) {
  let bundle = null;
  let npmRoot = null;
  let outDir = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, bundle, npmRoot, outDir };
    if (arg === '--bundle') {
      bundle = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--npm-root') {
      npmRoot = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--out') {
      outDir = path.resolve(argv[++i] ?? '');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, bundle, npmRoot, outDir };
}

function requireDir(label, dir) {
  if (!dir) throw new Error(`Missing required ${label}`);
  if (!fs.existsSync(dir)) throw new Error(`${label} does not exist: ${dir}`);
}

function writeArtifact(outDir, section, name, text) {
  const target = path.join(outDir, section, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return path.relative(outDir, target).split(path.sep).join('/');
}

function run(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      CODEGRAPH_NO_DOWNLOAD: '1',
      ...env,
    },
    encoding: 'utf-8',
  });
}

function makeProject(label, kind = 'healthy') {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-package-smoke-${label}-`));
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: label }, null, 2));
  fs.writeFileSync(path.join(project, 'index.ts'), 'export function packageSmoke() { return 1; }\n');
  if (kind === 'go') {
    fs.writeFileSync(path.join(project, 'main.go'), 'package main\nfunc main() {}\n');
  }
  if (kind === 'degraded') {
    fs.writeFileSync(path.join(project, 'worker.py'), 'def worker():\n    return 1\n');
  }
  return project;
}

function launcherForBundle(bundle) {
  const launcher = path.join(bundle, 'bin', process.platform === 'win32' ? 'zcodegraph.cmd' : 'zcodegraph');
  return launcher;
}

function rustCoreForBundle(bundle) {
  return path.join(bundle, 'bin', process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core');
}

function cli(command, prefixArgs = []) {
  return { command, prefixArgs };
}

function runCli(target, args, cwd, env = {}) {
  return run(target.command, [...target.prefixArgs, ...args], cwd, env);
}

function notRun(reason) {
  return { status: 1, stdout: '', stderr: `not run: ${reason}` };
}

function parseStatusJson(stdout) {
  const line = stdout.trim().split(/\r?\n/).filter(Boolean).reverse().find((entry) => entry.trim().startsWith('{'));
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function statusShowsHybrid(statusRun) {
  const status = parseStatusJson(statusRun.stdout);
  return status?.index?.engine === 'rust-hybrid' && !!status?.index?.hybrid;
}

function statusShowsDegraded(statusRun) {
  const status = parseStatusJson(statusRun.stdout);
  return status?.index?.hybrid?.fallbackState === 'degraded'
    || (status?.index?.hybrid?.fallbackFileCount ?? 0) > 0;
}

function doctorCreatedBundle(doctorRun) {
  return doctorRun.status === 0 && /\.zcodegraph\/diagnostics\/bundles\//.test(doctorRun.stdout);
}

function smokeRustHybridTarget(target, section, outDir, rustCore, rootForRelativePaths) {
  const initProject = makeProject(`${section}-init`, 'go');
  const initRun = runCli(target, ['init', initProject, '-i'], initProject);
  const initStatusRun = initRun.status === 0
    ? runCli(target, ['status', initProject, '--json'], initProject)
    : notRun('init failed');

  const defaultProject = makeProject(`${section}-default`, 'go');
  const defaultInitRun = runCli(target, ['init', defaultProject], defaultProject);
  const defaultRun = defaultInitRun.status === 0
    ? runCli(target, ['index', defaultProject, '--quiet'], defaultProject)
    : notRun('default init failed');
  const defaultStatusRun = defaultRun.status === 0
    ? runCli(target, ['status', defaultProject, '--json'], defaultProject)
    : notRun('default index failed');

  const explicitProject = makeProject(`${section}-explicit`, 'go');
  const explicitInitRun = runCli(target, ['init', explicitProject], explicitProject);
  const explicitRun = explicitInitRun.status === 0
    ? runCli(target, ['index', explicitProject, '--engine', 'rust-hybrid', '--quiet'], explicitProject)
    : notRun('explicit init failed');

  const degradedProject = makeProject(`${section}-degraded`, 'degraded');
  const degradedInitRun = runCli(target, ['init', degradedProject], degradedProject);
  const degradedStatusRun = degradedInitRun.status === 0
    ? runCli(target, ['status', degradedProject, '--json'], degradedProject)
    : notRun('degraded init failed');
  const lastRunDoctor = degradedInitRun.status === 0
    ? runCli(target, ['doctor', degradedProject, '--engine', 'rust-hybrid', '--bundle', '--last-run'], degradedProject)
    : notRun('degraded init failed');

  const failureProject = makeProject(`${section}-failure`, 'go');
  const failureInitRun = runCli(target, ['init', failureProject], failureProject);
  let missingRun = notRun('rust core missing fixture not available');
  let lastFailureDoctor = notRun('missing rust core run not executed');
  const movedCore = `${rustCore}.removed-for-smoke`;
  if (failureInitRun.status === 0 && fs.existsSync(rustCore)) {
    fs.renameSync(rustCore, movedCore);
    try {
      missingRun = runCli(target, ['index', failureProject, '--engine', 'rust-hybrid', '--quiet'], failureProject);
      lastFailureDoctor = runCli(target, ['doctor', failureProject, '--engine', 'rust-hybrid', '--bundle', '--last-failure'], failureProject);
    } finally {
      fs.renameSync(movedCore, rustCore);
    }
  }

  const artifacts = {
    initStdout: writeArtifact(outDir, section, 'init.stdout.txt', initRun.stdout),
    initStderr: writeArtifact(outDir, section, 'init.stderr.txt', initRun.stderr),
    initStatusStdout: writeArtifact(outDir, section, 'init-status.stdout.txt', initStatusRun.stdout),
    initStatusStderr: writeArtifact(outDir, section, 'init-status.stderr.txt', initStatusRun.stderr),
    defaultInitStdout: writeArtifact(outDir, section, 'default-init.stdout.txt', defaultInitRun.stdout),
    defaultInitStderr: writeArtifact(outDir, section, 'default-init.stderr.txt', defaultInitRun.stderr),
    defaultStdout: writeArtifact(outDir, section, 'default.stdout.txt', defaultRun.stdout),
    defaultStderr: writeArtifact(outDir, section, 'default.stderr.txt', defaultRun.stderr),
    defaultStatusStdout: writeArtifact(outDir, section, 'default-status.stdout.txt', defaultStatusRun.stdout),
    defaultStatusStderr: writeArtifact(outDir, section, 'default-status.stderr.txt', defaultStatusRun.stderr),
    explicitInitStdout: writeArtifact(outDir, section, 'explicit-init.stdout.txt', explicitInitRun.stdout),
    explicitInitStderr: writeArtifact(outDir, section, 'explicit-init.stderr.txt', explicitInitRun.stderr),
    explicitStdout: writeArtifact(outDir, section, 'explicit.stdout.txt', explicitRun.stdout),
    explicitStderr: writeArtifact(outDir, section, 'explicit.stderr.txt', explicitRun.stderr),
    degradedInitStdout: writeArtifact(outDir, section, 'degraded-init.stdout.txt', degradedInitRun.stdout),
    degradedInitStderr: writeArtifact(outDir, section, 'degraded-init.stderr.txt', degradedInitRun.stderr),
    degradedStatusStdout: writeArtifact(outDir, section, 'degraded-status.stdout.txt', degradedStatusRun.stdout),
    degradedStatusStderr: writeArtifact(outDir, section, 'degraded-status.stderr.txt', degradedStatusRun.stderr),
    doctorLastRunStdout: writeArtifact(outDir, section, 'doctor-last-run.stdout.txt', lastRunDoctor.stdout),
    doctorLastRunStderr: writeArtifact(outDir, section, 'doctor-last-run.stderr.txt', lastRunDoctor.stderr),
    missingRustStdout: writeArtifact(outDir, section, 'missing-rust.stdout.txt', missingRun.stdout),
    missingRustStderr: writeArtifact(outDir, section, 'missing-rust.stderr.txt', missingRun.stderr),
    doctorLastFailureStdout: writeArtifact(outDir, section, 'doctor-last-failure.stdout.txt', lastFailureDoctor.stdout),
    doctorLastFailureStderr: writeArtifact(outDir, section, 'doctor-last-failure.stderr.txt', lastFailureDoctor.stderr),
  };

  return {
    rustCore: path.relative(rootForRelativePaths, rustCore).split(path.sep).join('/'),
    rustCorePresent: fs.existsSync(rustCore),
    initRustHybridWorks: initRun.status === 0 && statusShowsHybrid(initStatusRun),
    defaultRustHybridIndexWorks: defaultRun.status === 0 && statusShowsHybrid(defaultStatusRun),
    explicitRustHybridIndexWorks: explicitRun.status === 0,
    statusShowsHybridMetadata: statusShowsHybrid(defaultStatusRun),
    degradedFallbackRecorded: statusShowsDegraded(degradedStatusRun),
    degradedDoctorLastRunWorks: statusShowsDegraded(degradedStatusRun) && doctorCreatedBundle(lastRunDoctor),
    missingRustBinaryFailsSafely: missingRun.status !== 0 && /Rust index engine is unavailable|next action|rust-hybrid indexing failed/i.test(missingRun.stderr),
    failureDoctorLastFailureWorks: missingRun.status !== 0 && doctorCreatedBundle(lastFailureDoctor),
    artifacts,
  };
}

function smokeBundle(bundle, outDir) {
  const launcher = launcherForBundle(bundle);
  const rustCore = rustCoreForBundle(bundle);
  return {
    launcher: path.relative(bundle, launcher).split(path.sep).join('/'),
    launcherPathPreserved: fs.existsSync(launcher) && path.relative(bundle, launcher).split(path.sep).join('/') === 'bin/zcodegraph',
    ...smokeRustHybridTarget(cli(launcher), 'bundle', outDir, rustCore, bundle),
  };
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function installStagedNpm(npmRoot) {
  const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-package-smoke-npm-install-'));
  const mainSrc = path.join(npmRoot, 'main');
  const platformSrc = path.join(npmRoot, `zcodegraph-${currentTarget}`);
  const mainDest = path.join(installRoot, 'node_modules', '@jununfly', 'zcodegraph');
  const platformDest = path.join(installRoot, 'node_modules', '@jununfly', `zcodegraph-${currentTarget}`);
  copyDir(mainSrc, mainDest);
  copyDir(platformSrc, platformDest);
  return { installRoot, mainDest, platformDest };
}

function smokeNpm(npmRoot, outDir) {
  const { installRoot, mainDest, platformDest } = installStagedNpm(npmRoot);
  const mainPkg = JSON.parse(fs.readFileSync(path.join(mainDest, 'package.json'), 'utf-8'));
  const platformPkg = JSON.parse(fs.readFileSync(path.join(platformDest, 'package.json'), 'utf-8'));
  const shim = path.join(mainDest, 'npm-shim.js');
  const rustCoreName = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
  const platformRustCore = path.join(platformDest, 'bin', rustCoreName);
  const smoke = smokeRustHybridTarget(cli(process.execPath, [shim]), 'npm', outDir, platformRustCore, platformDest);

  const missingInstall = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-package-smoke-npm-missing-'));
  copyDir(mainDest, path.join(missingInstall, 'node_modules', '@jununfly', 'zcodegraph'));
  const missingShim = path.join(missingInstall, 'node_modules', '@jununfly', 'zcodegraph', 'npm-shim.js');
  const missingRun = run(process.execPath, [missingShim, '--version'], makeProject('npm-missing'));

  const npxProject = makeProject('npx-like');
  const npxLikeRun = run(process.execPath, [shim, '--version'], npxProject);

  const artifacts = {
    ...smoke.artifacts,
    missingOptionalStdout: writeArtifact(outDir, 'npm', 'missing-optional.stdout.txt', missingRun.stdout),
    missingOptionalStderr: writeArtifact(outDir, 'npm', 'missing-optional.stderr.txt', missingRun.stderr),
    npxLikeStdout: writeArtifact(outDir, 'npm', 'npx-like.stdout.txt', npxLikeRun.stdout),
    npxLikeStderr: writeArtifact(outDir, 'npm', 'npx-like.stderr.txt', npxLikeRun.stderr),
  };

  return {
    ...smoke,
    platformPackage: platformPkg.name,
    optionalPlatformPackageSuppliesRustCore: fs.existsSync(platformRustCore),
    missingOptionalPackageFailsClearly: missingRun.status !== 0 && /no prebuilt bundle|optional dependency|zcodegraph-/i.test(missingRun.stderr),
    hasPostinstall: JSON.stringify(mainPkg).includes('postinstall') || JSON.stringify(platformPkg).includes('postinstall'),
    mentionsLocalRustCompilation: /cargo build|rustup|npm rebuild/i.test(JSON.stringify(mainPkg) + JSON.stringify(platformPkg)),
    npxLikeSmokeWorks: npxLikeRun.status === 0,
    artifacts,
  };
}

function writeMarkdown(outDir, summary) {
  const lines = [
    '# Rust Package Smoke Summary',
    '',
    '| Gate | Status |',
    '|---|---|',
    ...summary.gates.map((gate) => `| ${gate.name} | ${gate.passed ? 'pass' : 'fail'} |`),
    '',
  ];
  fs.writeFileSync(path.join(outDir, 'summary.md'), `${lines.join('\n')}\n`);
}

async function main() {
  const { help, bundle, npmRoot, outDir } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  requireDir('--bundle <dir>', bundle);
  requireDir('--npm-root <dir>', npmRoot);
  if (!outDir) throw new Error('Missing required --out <dir>');
  fs.mkdirSync(outDir, { recursive: true });

  const bundleSummary = smokeBundle(bundle, outDir);
  const npmSummary = smokeNpm(npmRoot, outDir);
  const gates = [
    { name: 'bundle-init-rust-hybrid', passed: bundleSummary.initRustHybridWorks },
    { name: 'bundle-default-rust-hybrid', passed: bundleSummary.defaultRustHybridIndexWorks },
    { name: 'bundle-explicit-rust-hybrid', passed: bundleSummary.explicitRustHybridIndexWorks },
    { name: 'bundle-status-hybrid-metadata', passed: bundleSummary.statusShowsHybridMetadata },
    { name: 'bundle-degraded-fallback-taxonomy', passed: bundleSummary.degradedFallbackRecorded },
    { name: 'bundle-doctor-last-run', passed: bundleSummary.degradedDoctorLastRunWorks },
    { name: 'bundle-missing-rust-binary', passed: bundleSummary.missingRustBinaryFailsSafely },
    { name: 'bundle-doctor-last-failure', passed: bundleSummary.failureDoctorLastFailureWorks },
    { name: 'bundle-launcher-path', passed: bundleSummary.launcherPathPreserved },
    { name: 'npm-init-rust-hybrid', passed: npmSummary.initRustHybridWorks },
    { name: 'npm-default-rust-hybrid', passed: npmSummary.defaultRustHybridIndexWorks },
    { name: 'npm-explicit-rust-hybrid', passed: npmSummary.explicitRustHybridIndexWorks },
    { name: 'npm-status-hybrid-metadata', passed: npmSummary.statusShowsHybridMetadata },
    { name: 'npm-degraded-fallback-taxonomy', passed: npmSummary.degradedFallbackRecorded },
    { name: 'npm-doctor-last-run', passed: npmSummary.degradedDoctorLastRunWorks },
    { name: 'npm-missing-rust-binary', passed: npmSummary.missingRustBinaryFailsSafely },
    { name: 'npm-doctor-last-failure', passed: npmSummary.failureDoctorLastFailureWorks },
    { name: 'npm-optional-platform-rust-core', passed: npmSummary.optionalPlatformPackageSuppliesRustCore },
    { name: 'npm-missing-optional-package', passed: npmSummary.missingOptionalPackageFailsClearly },
    { name: 'npm-no-postinstall', passed: !npmSummary.hasPostinstall },
    { name: 'npm-no-local-rust-compilation', passed: !npmSummary.mentionsLocalRustCompilation },
    { name: 'npx-like-local-smoke', passed: npmSummary.npxLikeSmokeWorks },
  ];
  const summary = {
    generatedAt: new Date().toISOString(),
    publishAttempted: false,
    registryContactAllowed: false,
    bundle: bundleSummary,
    npm: npmSummary,
    gates,
    gateFailures: gates.filter((gate) => !gate.passed).map((gate) => gate.name),
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  writeMarkdown(outDir, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.gateFailures.length > 0) {
    console.error(`Rust package smoke failed:\n- ${summary.gateFailures.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
