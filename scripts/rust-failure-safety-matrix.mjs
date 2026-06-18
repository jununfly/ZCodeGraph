#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');

const CASES = [
  'missing-binary',
  'nonzero-before-index',
  'malformed-stdout-json',
  'crash-after-temp-db',
  'partial-temp-db-then-fail',
  'lock-contention',
  'stale-lock-recovery',
  'packaged-binary-removed',
];

function usage() {
  console.log([
    'Usage: node scripts/rust-failure-safety-matrix.mjs --out <dir> [--case <id> ...]',
    '',
    'Cases:',
    ...CASES.map((id) => `  - ${id}`),
    '',
    'Each case starts from a readable TypeScript-produced active index, triggers',
    'an opt-in Rust indexing failure, then verifies the active index is still',
    'readable, no partial Rust index became active, the error includes a next',
    'action, and explicit TypeScript indexing still works afterward.',
  ].join('\n'));
}

function parseArgs(argv) {
  const selected = [];
  let outDir = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, selected, outDir };
    if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      outDir = path.resolve(value);
      continue;
    }
    if (arg === '--case') {
      const value = argv[++i];
      if (!value) throw new Error('--case requires an id');
      if (!CASES.includes(value)) throw new Error(`Unknown case "${value}". Expected one of: ${CASES.join(', ')}`);
      selected.push(value);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, selected, outDir };
}

function baseEnv(extra = {}) {
  return {
    ...process.env,
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
    ...extra,
  };
}

function runCli(project, args, env = {}) {
  return spawnSync(process.execPath, [distBin, ...args], {
    cwd: project,
    env: baseEnv(env),
    encoding: 'utf-8',
  });
}

function writeArtifact(outDir, caseId, name, text) {
  const target = path.join(outDir, caseId, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return path.relative(outDir, target).split(path.sep).join('/');
}

function makeProject(caseId) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-failure-${caseId}-`));
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: `failure-${caseId}` }, null, 2));
  fs.writeFileSync(path.join(project, 'alpha.ts'), 'export function alpha() { return 1; }\n');
  const init = runCli(project, ['init', project]);
  if (init.status !== 0) {
    throw new Error(`failed to initialize baseline project for ${caseId}\n${init.stdout}\n${init.stderr}`);
  }
  const index = runCli(project, ['index', project, '--force', '--quiet', '--engine', 'typescript']);
  if (index.status !== 0) {
    throw new Error(`failed to create TypeScript baseline for ${caseId}\n${index.stdout}\n${index.stderr}`);
  }
  return project;
}

function statusJson(project) {
  const status = runCli(project, ['status', project, '--json']);
  if (status.status !== 0) return null;
  const line = status.stdout.trim().split('\n').filter(Boolean).pop();
  return line ? JSON.parse(line) : null;
}

function activeIndexHasAlpha(project) {
  const query = runCli(project, ['query', 'alpha', '--path', project, '--kind', 'function', '--json']);
  if (query.status !== 0) return false;
  try {
    const results = JSON.parse(query.stdout);
    return Array.isArray(results) && results.some((entry) => entry.node?.name === 'alpha');
  } catch {
    return false;
  }
}

function defaultTypescriptIndexWorks(project) {
  const result = runCli(project, ['index', project, '--force', '--quiet', '--engine', 'typescript']);
  return result.status === 0 && activeIndexHasAlpha(project);
}

function fakeCore(dir, caseId, behavior) {
  const script = path.join(dir, process.platform === 'win32' ? `${caseId}.cjs` : caseId);
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.writeFileSync(script, behavior);
  fs.chmodSync(script, 0o755);
  return script;
}

function tempDbScript(caseId, mode) {
  return [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    'const path = require("path");',
    'const args = process.argv.slice(2);',
    'const idx = args.indexOf("--index-path");',
    'const indexPath = idx >= 0 ? args[idx + 1] : null;',
    'if (indexPath) {',
    '  const tempPath = indexPath + ".rust-tmp-matrix";',
    mode === 'garbage'
      ? '  fs.writeFileSync(tempPath, "not sqlite");'
      : '  fs.writeFileSync(tempPath, "");',
    '}',
    'process.stderr.write(JSON.stringify({ type: "error", message: "matrix failure after temp db" }) + "\\n");',
    'process.exit(71);',
  ].join('\n') + '\n';
}

function rustFailureForCase(project, caseId) {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-failure-core-${caseId}-`));
  switch (caseId) {
    case 'missing-binary':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: path.join(binDir, 'missing-zcodegraph-core'),
      });
    case 'packaged-binary-removed':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: path.join(binDir, 'bin', process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core'),
      });
    case 'nonzero-before-index':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, [
          '#!/usr/bin/env node',
          'process.stderr.write(JSON.stringify({ type: "error", message: "matrix nonzero before index" }) + "\\n");',
          'process.exit(70);',
        ].join('\n') + '\n'),
      });
    case 'malformed-stdout-json':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, [
          '#!/usr/bin/env node',
          'process.stdout.write("{not-json}\\n");',
          'process.exit(0);',
        ].join('\n') + '\n'),
      });
    case 'crash-after-temp-db':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, tempDbScript(caseId, 'empty')),
      });
    case 'partial-temp-db-then-fail':
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, tempDbScript(caseId, 'garbage')),
      });
    case 'lock-contention': {
      const lockPath = path.join(project, '.zcodegraph', 'zcodegraph.lock');
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      try {
        return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
          ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, [
            '#!/usr/bin/env node',
            'process.stderr.write(JSON.stringify({ type: "error", message: "CodeGraph database is locked by another process" }) + "\\n");',
            'process.exit(70);',
          ].join('\n') + '\n'),
        });
      } finally {
        fs.rmSync(lockPath, { force: true });
      }
    }
    case 'stale-lock-recovery': {
      const lockPath = path.join(project, '.zcodegraph', 'zcodegraph.lock');
      fs.writeFileSync(lockPath, '99999999', { flag: 'w' });
      return runCli(project, ['index', project, '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: fakeCore(binDir, caseId, [
          '#!/usr/bin/env node',
          'const fs = require("fs");',
          'const path = require("path");',
          'const args = process.argv.slice(2);',
          'const project = args[args.indexOf("--project-path") + 1];',
          'const lockPath = path.join(project, ".zcodegraph", "zcodegraph.lock");',
          'if (fs.existsSync(lockPath)) fs.rmSync(lockPath, { force: true });',
          'process.stderr.write(JSON.stringify({ type: "error", message: "matrix stale lock cleared then failed safely" }) + "\\n");',
          'process.exit(70);',
        ].join('\n') + '\n'),
      });
    }
    default:
      throw new Error(`Unhandled case: ${caseId}`);
  }
}

function evaluateCase(outDir, caseId) {
  const project = makeProject(caseId);
  const before = statusJson(project);
  const beforeReadable = activeIndexHasAlpha(project);
  const failure = rustFailureForCase(project, caseId);
  const after = statusJson(project);
  const previousActiveIndexReadable = activeIndexHasAlpha(project);
  const noPartialIndexActive = after?.index?.engine === before?.index?.engine && after?.index?.engine === 'typescript';
  const errorIncludesNextAction = /next action:/i.test(failure.stderr);
  const defaultTypescriptIndexWorksAfterward = defaultTypescriptIndexWorks(project);
  const artifacts = {
    stdout: writeArtifact(outDir, caseId, 'stdout.txt', failure.stdout),
    stderr: writeArtifact(outDir, caseId, 'stderr.txt', failure.stderr),
  };
  const passed = failure.status !== 0 &&
    beforeReadable &&
    previousActiveIndexReadable &&
    noPartialIndexActive &&
    errorIncludesNextAction &&
    defaultTypescriptIndexWorksAfterward;
  return {
    id: caseId,
    passed,
    rustExitCode: failure.status,
    previousActiveIndexReadable,
    noPartialIndexActive,
    errorIncludesNextAction,
    defaultTypescriptIndexWorksAfterward,
    beforeEngine: before?.index?.engine ?? null,
    afterEngine: after?.index?.engine ?? null,
    artifacts,
  };
}

function writeMarkdown(outDir, summary) {
  const lines = [
    '# Rust Failure Safety Matrix',
    '',
    '| Case | Status | Active index readable | No partial active | Next action | TS works afterward |',
    '|---|---|---|---|---|---|',
  ];
  for (const item of summary.cases) {
    lines.push([
      `| ${item.id}`,
      item.passed ? 'pass' : 'fail',
      item.previousActiveIndexReadable ? 'yes' : 'no',
      item.noPartialIndexActive ? 'yes' : 'no',
      item.errorIncludesNextAction ? 'yes' : 'no',
      `${item.defaultTypescriptIndexWorksAfterward ? 'yes' : 'no'} |`,
    ].join(' | '));
  }
  fs.writeFileSync(path.join(outDir, 'summary.md'), `${lines.join('\n')}\n`);
}

async function main() {
  const { help, selected, outDir } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (!outDir) throw new Error('Missing required --out <dir>');
  if (!fs.existsSync(distBin)) throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  fs.mkdirSync(outDir, { recursive: true });
  const cases = selected.length > 0 ? selected : CASES;
  const results = cases.map((caseId) => evaluateCase(outDir, caseId));
  const gateFailures = results.filter((item) => !item.passed).map((item) => item.id);
  const summary = {
    generatedAt: new Date().toISOString(),
    matrix: CASES,
    cases: results,
    gateFailures,
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  writeMarkdown(outDir, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (gateFailures.length > 0) {
    console.error(`Rust failure-safety matrix failed:\n- ${gateFailures.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
