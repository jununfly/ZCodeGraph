#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const DEFAULT_QUERY = 'AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService';
const CALLABLE = new Set(['method', 'function', 'component', 'constructor']);
const GAP_CLASSIFICATIONS = [
  'missing-symbol',
  'ambiguous-symbol',
  'missing-static-edge',
  'missing-synthesized-edge',
  'explore-planner-pathfinding-gap',
  'expected-runtime-boundary',
];

function usage() {
  console.log([
    'Usage: node scripts/phase9-vs1-graph-probe.mjs --repo <path> [--query <symbols>] [--out <file>]',
    '',
    'Runs a deterministic graph probe for the Phase 9 VS-1 Explore Flow coverage gap.',
    `Default query: ${DEFAULT_QUERY}`,
    '',
    `Classifications: ${GAP_CLASSIFICATIONS.join(', ')}`,
  ].join('\n'));
}

function parseArgs(argv) {
  let repo = null;
  let query = DEFAULT_QUERY;
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repo, query, out };
    if (arg === '--repo') {
      repo = path.resolve(argv[++i] ?? '');
      continue;
    }
    if (arg === '--query') {
      query = argv[++i] ?? '';
      continue;
    }
    if (arg === '--out') {
      out = path.resolve(argv[++i] ?? '');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repo, query, out };
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function parseTokens(query) {
  return [...new Set(
    query
      .split(/[\s,()[\]]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && /^[A-Za-z_$][\w$]*(?:(?:::|\.)[\w$]+)*$/.test(token)),
  )];
}

function edgeSummary(edges, direction) {
  return edges
    .filter(({ edge }) => edge.kind === 'calls' || edge.kind === 'references')
    .slice(0, 12)
    .map(({ node, edge }) => ({
      direction,
      otherNodeId: node.id,
      otherName: node.name,
      otherKind: node.kind,
      otherFilePath: node.filePath,
      kind: edge.kind,
      line: edge.line ?? null,
      edgeOrigin: edge.edgeOrigin ?? null,
      synthesizedBy: edge.metadata?.synthesizedBy ?? null,
    }));
}

function classifyToken(candidateCount, callableCount, hasFlowSection) {
  if (candidateCount === 0) return 'missing-symbol';
  if (callableCount > 3) return 'ambiguous-symbol';
  if (!hasFlowSection) return 'explore-planner-pathfinding-gap';
  return 'expected-runtime-boundary';
}

async function explore(project, query) {
  const idx = await import(pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href);
  const tools = await import(pathToFileURL(path.join(repoRoot, 'dist', 'mcp', 'tools.js')).href);
  const CodeGraph = idx.default?.default ?? idx.default ?? idx.CodeGraph;
  const ToolHandler = tools.ToolHandler ?? tools.default?.ToolHandler;
  const cg = CodeGraph.openSync(project);
  try {
    const handler = new ToolHandler(cg);
    const result = await handler.execute('zcodegraph_explore', { query, projectPath: project });
    return result.content?.[0]?.text ?? '';
  } finally {
    cg.close?.();
  }
}

async function probe(project, query) {
  const idx = await import(pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href);
  const CodeGraph = idx.default?.default ?? idx.default ?? idx.CodeGraph;
  const cg = CodeGraph.openSync(project);
  const exploreText = await explore(project, query);
  const hasFlowSection = /## Flow \(call path among the symbols you queried\)/.test(exploreText);
  const flowConnected = hasFlowSection && /(?:→|->)/.test(exploreText.slice(0, Math.min(exploreText.length, 4000)));
  const tokens = parseTokens(query);

  try {
    const classifications = tokens.map((token) => {
      const candidates = cg.getNodesByName(token);
      const callable = candidates.filter((node) => CALLABLE.has(node.kind));
      const classification = classifyToken(candidates.length, callable.length, hasFlowSection);
      return {
        token,
        classification,
        candidateCount: candidates.length,
        callableCandidateCount: callable.length,
        candidates: candidates.slice(0, 12).map((node) => ({
          id: node.id,
          kind: node.kind,
          name: node.name,
          qualifiedName: node.qualifiedName,
          filePath: node.filePath,
          startLine: node.startLine,
          language: node.language,
          incoming: edgeSummary(cg.getCallers(node.id), 'incoming'),
          outgoing: edgeSummary(cg.getCallees(node.id), 'outgoing'),
        })),
      };
    });

    const primaryClassification =
      classifications.find((item) => item.classification === 'missing-symbol')?.classification
      ?? classifications.find((item) => item.classification === 'ambiguous-symbol')?.classification
      ?? (!hasFlowSection ? 'explore-planner-pathfinding-gap' : 'expected-runtime-boundary');

    return {
      generatedAt: new Date().toISOString(),
      repo: {
        path: project,
        commit: fs.existsSync(path.join(project, '.git')) ? run('git', ['rev-parse', '--short', 'HEAD'], project) : null,
      },
      query,
      tokens,
      explore: {
        outputChars: exploreText.length,
        hasFlowSection,
        flowConnected,
      },
      summary: {
        primaryClassification,
        taxonomy: GAP_CLASSIFICATIONS,
      },
      classifications,
    };
  } finally {
    cg.close?.();
  }
}

async function main() {
  const { help, repo, query, out } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (!repo) throw new Error('--repo is required');
  if (!fs.existsSync(distBin)) throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  if (!fs.existsSync(path.join(repo, '.zcodegraph'))) {
    throw new Error(`${repo} is not indexed. Run zcodegraph init/index first.`);
  }

  const result = await probe(repo, query);
  const json = JSON.stringify(result, null, 2);
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, json + '\n');
  }
  console.log(json);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
