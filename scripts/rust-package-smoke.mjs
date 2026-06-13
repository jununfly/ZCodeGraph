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

function makeProject(label) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-package-smoke-${label}-`));
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: label }, null, 2));
  fs.writeFileSync(path.join(project, 'index.ts'), 'export function packageSmoke() { return 1; }\n');
  return project;
}

function launcherForBundle(bundle) {
  const launcher = path.join(bundle, 'bin', process.platform === 'win32' ? 'zcodegraph.cmd' : 'zcodegraph');
  return launcher;
}

function rustCoreForBundle(bundle) {
  return path.join(bundle, 'bin', process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core');
}

function smokeBundle(bundle, outDir) {
  const launcher = launcherForBundle(bundle);
  const rustCore = rustCoreForBundle(bundle);
  const project = makeProject('bundle');
  const initRun = run(launcher, ['init', project], project);
  const defaultRun = initRun.status === 0
    ? run(launcher, ['index', '--quiet'], project)
    : { status: 1, stdout: '', stderr: 'not run: init failed' };
  const rustRun = initRun.status === 0
    ? run(launcher, ['index', '--engine', 'rust', '--quiet'], project)
    : { status: 1, stdout: '', stderr: 'not run: init failed' };

  let missingRun = { status: 1, stdout: '', stderr: 'not run' };
  const movedCore = `${rustCore}.removed-for-smoke`;
  if (fs.existsSync(rustCore)) {
    fs.renameSync(rustCore, movedCore);
    try {
      missingRun = run(launcher, ['index', '--engine', 'rust', '--quiet'], project);
    } finally {
      fs.renameSync(movedCore, rustCore);
    }
  }

  const artifacts = {
    initStdout: writeArtifact(outDir, 'bundle', 'init.stdout.txt', initRun.stdout),
    initStderr: writeArtifact(outDir, 'bundle', 'init.stderr.txt', initRun.stderr),
    defaultStdout: writeArtifact(outDir, 'bundle', 'default.stdout.txt', defaultRun.stdout),
    defaultStderr: writeArtifact(outDir, 'bundle', 'default.stderr.txt', defaultRun.stderr),
    rustStdout: writeArtifact(outDir, 'bundle', 'rust.stdout.txt', rustRun.stdout),
    rustStderr: writeArtifact(outDir, 'bundle', 'rust.stderr.txt', rustRun.stderr),
    missingRustStdout: writeArtifact(outDir, 'bundle', 'missing-rust.stdout.txt', missingRun.stdout),
    missingRustStderr: writeArtifact(outDir, 'bundle', 'missing-rust.stderr.txt', missingRun.stderr),
  };

  return {
    launcher: path.relative(bundle, launcher).split(path.sep).join('/'),
    rustCore: path.relative(bundle, rustCore).split(path.sep).join('/'),
    launcherPathPreserved: fs.existsSync(launcher) && path.relative(bundle, launcher).split(path.sep).join('/') === 'bin/zcodegraph',
    rustCorePresent: fs.existsSync(rustCore),
    defaultTypescriptIndexWorks: defaultRun.status === 0,
    explicitRustIndexWorks: rustRun.status === 0,
    missingRustBinaryFailsSafely: missingRun.status !== 0 && /Rust index engine is unavailable|next action/i.test(missingRun.stderr),
    artifacts,
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
  const project = makeProject('npm');
  const initRun = run(process.execPath, [shim, 'init', project], project);
  const defaultRun = initRun.status === 0
    ? run(process.execPath, [shim, 'index', '--quiet'], project)
    : { status: 1, stdout: '', stderr: 'not run: init failed' };
  const rustRun = initRun.status === 0
    ? run(process.execPath, [shim, 'index', '--engine', 'rust', '--quiet'], project)
    : { status: 1, stdout: '', stderr: 'not run: init failed' };

  const missingInstall = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-package-smoke-npm-missing-'));
  copyDir(mainDest, path.join(missingInstall, 'node_modules', '@jununfly', 'zcodegraph'));
  const missingShim = path.join(missingInstall, 'node_modules', '@jununfly', 'zcodegraph', 'npm-shim.js');
  const missingRun = run(process.execPath, [missingShim, '--version'], makeProject('npm-missing'));

  const npxProject = makeProject('npx-like');
  const npxLikeRun = run(process.execPath, [shim, '--version'], npxProject);

  const artifacts = {
    initStdout: writeArtifact(outDir, 'npm', 'init.stdout.txt', initRun.stdout),
    initStderr: writeArtifact(outDir, 'npm', 'init.stderr.txt', initRun.stderr),
    defaultStdout: writeArtifact(outDir, 'npm', 'default.stdout.txt', defaultRun.stdout),
    defaultStderr: writeArtifact(outDir, 'npm', 'default.stderr.txt', defaultRun.stderr),
    rustStdout: writeArtifact(outDir, 'npm', 'rust.stdout.txt', rustRun.stdout),
    rustStderr: writeArtifact(outDir, 'npm', 'rust.stderr.txt', rustRun.stderr),
    missingOptionalStdout: writeArtifact(outDir, 'npm', 'missing-optional.stdout.txt', missingRun.stdout),
    missingOptionalStderr: writeArtifact(outDir, 'npm', 'missing-optional.stderr.txt', missingRun.stderr),
    npxLikeStdout: writeArtifact(outDir, 'npm', 'npx-like.stdout.txt', npxLikeRun.stdout),
    npxLikeStderr: writeArtifact(outDir, 'npm', 'npx-like.stderr.txt', npxLikeRun.stderr),
  };

  return {
    platformPackage: platformPkg.name,
    optionalPlatformPackageSuppliesRustCore: fs.existsSync(platformRustCore),
    defaultTypescriptIndexWorks: defaultRun.status === 0,
    explicitRustIndexWorks: rustRun.status === 0,
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
    { name: 'bundle-default-typescript', passed: bundleSummary.defaultTypescriptIndexWorks },
    { name: 'bundle-explicit-rust', passed: bundleSummary.explicitRustIndexWorks },
    { name: 'bundle-missing-rust-binary', passed: bundleSummary.missingRustBinaryFailsSafely },
    { name: 'bundle-launcher-path', passed: bundleSummary.launcherPathPreserved },
    { name: 'npm-default-typescript', passed: npmSummary.defaultTypescriptIndexWorks },
    { name: 'npm-explicit-rust', passed: npmSummary.explicitRustIndexWorks },
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
