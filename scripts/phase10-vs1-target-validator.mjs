#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const DEFAULT_EXPECTED_COMMIT = '4ac5322601c6985aba4cd9349c23f4ef22dc3e65';
const EXPECTED_SYMBOLS = [
  'AbstractExtensionService',
  '_createExtensionHostManager',
  '_doCreateExtensionHostManager',
  'ExtensionHostManager',
  'start',
  'ExtensionHostMain',
  'MainThreadExtensionService',
];
const JS_TS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json']);
const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);

function usage() {
  console.log([
    'Usage: node scripts/phase10-vs1-target-validator.mjs --repo <path> [--out <file>] [--expected-commit <sha>]',
    '',
    'Validates the Phase 10 corrected VS Code VS-1 sparse target contract.',
    'The validator fails closed if any expected VS-1 symbol is absent.',
  ].join('\n'));
}

function parseArgs(argv) {
  let repo = null;
  let out = null;
  let expectedCommit = DEFAULT_EXPECTED_COMMIT;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repo, out, expectedCommit };
    if (arg === '--repo') {
      repo = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--out') {
      out = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--expected-commit') {
      expectedCommit = argv[++i] ?? '';
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repo, out, expectedCommit };
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function gitValue(repo, args) {
  if (!fs.existsSync(path.join(repo, '.git'))) return null;
  return run('git', args, repo);
}

function sparsePatterns(repo) {
  const output = gitValue(repo, ['sparse-checkout', 'list']);
  if (!output) return [];
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function countSourceFiles(repo) {
  let copiedJsTsConfigFileCount = 0;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const basename = path.basename(full);
      const ext = path.extname(full);
      if (JS_TS_EXTENSIONS.has(ext) || CONFIG_FILES.has(basename)) {
        copiedJsTsConfigFileCount++;
      }
    }
  }
  walk(repo);
  return copiedJsTsConfigFileCount;
}

function indexedJsTsFileCount(files) {
  return files.filter((file) => {
    const ext = path.extname(file.path);
    return JS_TS_EXTENSIONS.has(ext) || CONFIG_FILES.has(path.basename(file.path));
  }).length;
}

async function validate({ repo, expectedCommit }) {
  const idx = await import(pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href);
  const CodeGraph = idx.default?.default ?? idx.default ?? idx.CodeGraph;
  const cg = CodeGraph.openSync(repo);
  try {
    const commit = gitValue(repo, ['rev-parse', 'HEAD']);
    const shortCommit = gitValue(repo, ['rev-parse', '--short', 'HEAD']);
    const symbols = EXPECTED_SYMBOLS.map((token) => {
      const candidates = cg.getNodesByName(token);
      return {
        token,
        candidateCount: candidates.length,
        candidates: candidates.slice(0, 20).map((node) => ({
          id: node.id,
          kind: node.kind,
          name: node.name,
          qualifiedName: node.qualifiedName,
          filePath: node.filePath,
          startLine: node.startLine,
          language: node.language,
        })),
      };
    });
    const missingSymbols = symbols
      .filter((symbol) => symbol.candidateCount === 0)
      .map((symbol) => symbol.token);
    const start = symbols.find((symbol) => symbol.token === 'start');
    const commitMatches = commit == null || expectedCommit.length === 0 || commit === expectedCommit;
    const valid = missingSymbols.length === 0;

    return {
      generatedAt: new Date().toISOString(),
      target: {
        localPath: repo,
        localPathProvenance: 'local-only',
        expectedCommit,
        commit,
        shortCommit,
        commitMatchesExpected: commitMatches,
        commitDrift: commit != null && expectedCommit.length > 0 && commit !== expectedCommit
          ? { expected: expectedCommit, actual: commit }
          : null,
        sparsePatterns: sparsePatterns(repo),
        copiedJsTsConfigFileCount: countSourceFiles(repo),
        indexedJsTsFileCount: indexedJsTsFileCount(cg.getFiles()),
      },
      expectedSymbols: EXPECTED_SYMBOLS,
      symbols,
      start: {
        ambiguityCount: start?.candidateCount ?? 0,
        candidates: start?.candidates ?? [],
      },
      missingSymbols,
      valid,
      sufficiencySmokeAllowed: valid,
      gate: valid
        ? 'All expected VS-1 symbols have candidates; sufficiency smoke may run.'
        : 'Missing expected VS-1 symbols; sufficiency smoke must not run.',
    };
  } finally {
    cg.close?.();
  }
}

async function main() {
  const { help, repo, out, expectedCommit } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (!repo) throw new Error('--repo is required');
  if (!fs.existsSync(distBin)) throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  if (!fs.existsSync(path.join(repo, '.zcodegraph'))) {
    throw new Error(`${repo} is not indexed. Run zcodegraph init/index first.`);
  }

  const result = await validate({ repo, expectedCommit });
  const json = JSON.stringify(result, null, 2);
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, json + '\n');
  }
  console.log(json);
  if (!result.valid) {
    console.error(result.gate);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
