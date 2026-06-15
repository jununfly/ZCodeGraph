#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
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
const SUPPORTED_LANGUAGES = new Set(['javascript', 'typescript', 'jsx', 'tsx']);
const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function usage() {
  console.log([
    'Usage: node scripts/rust-parity-check.mjs --repo <path> [--repo <path> ...]',
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-parity-check.mjs --repo .',
    '  node scripts/rust-parity-check.mjs --repo . --repo ../excalidraw',
    '',
    'The script copies each repo to temporary directories, indexes one copy with',
    'the TypeScript engine and one with the Rust engine, then compares semantic',
    'files, nodes, edges, unresolved refs, and source locations.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return { help: true, repos };
    }
    if (arg === '--repo') {
      const value = argv[++i];
      if (!value) throw new Error('--repo requires a path');
      repos.push(path.resolve(value));
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

function copyRepo(source, label) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-parity-${label}-`));
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(source, src);
      if (!rel) return true;
      const parts = rel.split(path.sep);
      return !parts.some((part) => ['.git', '.zcodegraph', 'node_modules', 'dist', 'target'].includes(part));
    },
  });
  return dest;
}

async function loadDist() {
  if (!fs.existsSync(distBin)) {
    throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  }
  if (!fs.existsSync(rustCore)) {
    throw new Error('target/debug/zcodegraph-core not found. Run cargo build --package zcodegraph-core first.');
  }
  const parity = await import(path.join(repoRoot, 'dist', 'indexing', 'parity.js'));
  const db = await import(path.join(repoRoot, 'dist', 'db', 'index.js'));
  const queries = await import(path.join(repoRoot, 'dist', 'db', 'queries.js'));
  return { parity, db, QueryBuilder: queries.QueryBuilder };
}

function initAndIndex(project, engine) {
  const env = {
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
  run(process.execPath, [distBin, 'init', project], project, env);
  const args = [distBin, 'index', project, '--quiet'];
  if (engine === 'rust') {
    args.push('--engine', 'rust');
    env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;
  }
  run(process.execPath, args, project, env);
}

function snapshot(project, dbModule, QueryBuilder) {
  const conn = dbModule.DatabaseConnection.open(dbModule.getDatabasePath(project));
  try {
    const queries = new QueryBuilder(conn.getDb());
    const nodes = queries.getAllNodes().filter((node) => isSupportedSliceFile(node.filePath, node.language));
    const supportedNodeIds = new Set(nodes.map((node) => node.id));
    const nodeLabels = new Map(nodes.map((node) => [node.id, `${node.kind}:${node.filePath}:${node.name}`]));
    return {
      files: queries
        .getAllFiles()
        .filter((file) => isSupportedSliceFile(file.path, file.language))
        .map((file) => ({ path: file.path, language: file.language })),
      nodes: nodes.map((node) => ({
        kind: node.kind,
        name: node.name,
        filePath: node.filePath,
        language: node.language,
        startLine: node.startLine,
        startColumn: node.startColumn,
      })),
      edges: conn.getDb().prepare('SELECT source, target, kind FROM edges').all()
        .filter((edge) => supportedNodeIds.has(edge.source) && supportedNodeIds.has(edge.target))
        .map((edge) => ({
          kind: edge.kind,
          source: nodeLabels.get(edge.source) ?? edge.source,
          target: nodeLabels.get(edge.target) ?? edge.target,
        })),
      unresolvedRefs: queries
        .getUnresolvedReferences()
        .filter((ref) => isSupportedSliceFile(ref.filePath ?? '', ref.language ?? 'unknown'))
        .map((ref) => ({
          from: nodeLabels.get(ref.fromNodeId) ?? ref.fromNodeId,
          referenceName: ref.referenceName,
          referenceKind: ref.referenceKind,
          filePath: ref.filePath ?? '',
          language: ref.language ?? 'unknown',
          line: ref.line,
          column: ref.column,
        })),
    };
  } finally {
    conn.close();
  }
}

function isSupportedSliceFile(filePath, language) {
  return SUPPORTED_LANGUAGES.has(language) && SUPPORTED_EXTENSIONS.has(path.extname(filePath));
}

async function main() {
  const { help, repos } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (repos.length === 0) {
    throw new Error('At least one --repo path is required. Use --help for examples.');
  }

  const { parity, db, QueryBuilder } = await loadDist();
  const results = [];
  for (const repo of repos) {
    const tsCopy = copyRepo(repo, 'ts');
    const rustCopy = copyRepo(repo, 'rust');
    initAndIndex(tsCopy, 'typescript');
    initAndIndex(rustCopy, 'rust');
    const compared = parity.compareSemanticSnapshots(
      snapshot(tsCopy, db, QueryBuilder),
      snapshot(rustCopy, db, QueryBuilder),
      { locationToleranceLines: 2 },
    );
    results.push({ repo, summary: compared.summary, differences: compared.differences.slice(0, 50) });
  }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
