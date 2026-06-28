#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    bin: path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js'),
    keepFixture: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg === '--bin') {
      args.bin = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--keep-fixture') {
      args.keepFixture = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log([
    'Usage: node scripts/rust-hybrid-ci-smoke.mjs [--bin <dist/bin/zcodegraph.js>] [--keep-fixture]',
    '',
    'Creates a tiny temporary TypeScript project and verifies the built CLI can',
    'run init, index --engine rust-hybrid, status --json, and doctor --last-run.',
  ].join('\n'));
}

function fail(message, details = '') {
  const suffix = details ? `\n${details}` : '';
  throw new Error(`${message}${suffix}`);
}

function runCli(bin, project, args) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: project,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    fail(
      `zcodegraph ${args.join(' ')} failed with exit ${result.status}`,
      [
        '--- stdout ---',
        result.stdout.trim(),
        '--- stderr ---',
        result.stderr.trim(),
      ].join('\n'),
    );
  }
  return result;
}

function createFixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-hybrid-ci-smoke-'));
  fs.mkdirSync(path.join(project, 'src'), { recursive: true });
  fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'rust-hybrid-ci-smoke', type: 'module' }, null, 2)}\n`);
  fs.writeFileSync(path.join(project, 'src', 'math.ts'), [
    'export function double(value: number): number {',
    '  return value * 2;',
    '}',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(project, 'src', 'index.ts'), [
    "import { double } from './math';",
    '',
    'export function runSmoke(): number {',
    '  return double(21);',
    '}',
    '',
  ].join('\n'));
  return project;
}

function parseStatus(stdout) {
  const line = stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .reverse()
    .find((entry) => entry.trim().startsWith('{'));
  if (!line) fail('status --json did not print JSON output', stdout);
  try {
    return JSON.parse(line);
  } catch (error) {
    fail(`status --json output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`, stdout);
  }
}

function statusNumber(status, paths) {
  for (const keyPath of paths) {
    let value = status;
    for (const key of keyPath) value = value?.[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

function assertStatusShowsRustHybrid(status) {
  if (status?.index?.engine !== 'rust-hybrid') {
    fail(`status --json did not report rust-hybrid index engine: ${JSON.stringify(status?.index ?? null)}`);
  }
  const files = statusNumber(status, [['index', 'fileCount'], ['index', 'files'], ['fileCount'], ['indexedFiles']]);
  const nodes = statusNumber(status, [['index', 'nodeCount'], ['index', 'nodes'], ['nodeCount'], ['nodesCreated']]);
  if (files <= 0) fail(`status --json did not report non-zero indexed files: ${JSON.stringify(status?.index ?? status)}`);
  if (nodes <= 0) fail(`status --json did not report non-zero indexed nodes: ${JSON.stringify(status?.index ?? status)}`);
}

function assertDoctorReportedBundle(stdout, project) {
  const normalized = stdout.split(path.sep).join('/');
  if (!/\.zcodegraph\/diagnostics\/bundles\//.test(normalized)) {
    fail('doctor --bundle --last-run did not report a diagnostics bundle path', stdout);
  }
  const bundles = path.join(project, '.zcodegraph', 'diagnostics', 'bundles');
  if (!fs.existsSync(bundles)) {
    fail(`doctor did not create diagnostics bundles directory: ${bundles}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.bin)) fail(`CLI binary does not exist: ${args.bin}`);

  const project = createFixture();
  try {
    runCli(args.bin, project, ['init', project, '--engine', 'rust-hybrid']);
    runCli(args.bin, project, ['index', project, '--engine', 'rust-hybrid', '--force', '--quiet']);
    const status = parseStatus(runCli(args.bin, project, ['status', project, '--json']).stdout);
    assertStatusShowsRustHybrid(status);
    const doctor = runCli(args.bin, project, ['doctor', project, '--engine', 'rust-hybrid', '--bundle', '--last-run']);
    assertDoctorReportedBundle(doctor.stdout, project);
    console.log(`rust-hybrid CI smoke passed: ${project}`);
  } finally {
    if (!args.keepFixture) fs.rmSync(project, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
