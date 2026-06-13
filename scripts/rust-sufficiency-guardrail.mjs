#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const rustCore = path.join(
  repoRoot,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);

const PROMPTS = {
  zcodegraph: [
    {
      id: 'ZCG-1',
      query: 'handleExplore plan ExplorePlan render',
      expected: ['handleExplore', 'plan', 'render'],
    },
    {
      id: 'ZCG-2',
      query: 'runIndex CodeGraph.indexAll ExtractionOrchestrator.indexAll ParseStage QueryBuilder.insertNode',
      expected: ['indexAll', 'ExtractionOrchestrator', 'insertNode'],
    },
    {
      id: 'ZCG-3',
      query: 'ReferenceResolver.resolveAll createSynthesizerRegistry registerFullGraphSynthesizers executeFullGraphSynthesizers QueryBuilder.insertEdge',
      expected: ['ReferenceResolver', 'executeFullGraphSynthesizers', 'insertEdge'],
    },
  ],
  excalidraw: [
    {
      id: 'EX-1',
      query: 'mutateElement triggerUpdate triggerRender render StaticCanvas renderStaticScene',
      expected: ['mutateElement', 'triggerUpdate', 'triggerRender', 'StaticCanvas', 'renderStaticScene'],
    },
    {
      id: 'EX-2',
      query: 'Scene.onUpdate triggerUpdate triggerRender render StaticCanvas',
      expected: ['onUpdate', 'triggerUpdate', 'triggerRender', 'StaticCanvas'],
    },
    {
      id: 'EX-3',
      query: 'StaticCanvas renderStaticScene _renderStaticScene drawElementOnCanvas renderElement',
      expected: ['StaticCanvas', 'renderStaticScene', 'drawElementOnCanvas', 'renderElement'],
    },
  ],
  zustand: [
    {
      id: 'ZU-1',
      query: 'createStore setState getState subscribe',
      expected: ['createStore', 'setState', 'getState', 'subscribe'],
    },
    {
      id: 'ZU-2',
      query: 'create useStore api setState',
      expected: ['create', 'useStore', 'setState'],
    },
    {
      id: 'ZU-3',
      query: 'persist createJSONStorage setItem getItem removeItem',
      expected: ['persist', 'createJSONStorage', 'setItem', 'getItem', 'removeItem'],
    },
  ],
};

function usage() {
  console.log([
    'Usage: node scripts/rust-sufficiency-guardrail.mjs --repo <name>=<path> [--repo <name>=<path> ...]',
    '',
    'Names with built-in prompts: zcodegraph, excalidraw, zustand',
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/tmp/codegraph-corpus/excalidraw',
    '',
    'The script creates TypeScript- and Rust-produced indexes, runs',
    'zcodegraph_explore for representative flow prompts, and compares Flow',
    'connectivity plus deterministic fallback-risk signals.',
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
    env: { ...process.env, ...baseEnv(), ...env },
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

function baseEnv() {
  return {
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
}

function copyRepo(source, label) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-guardrail-${label}-`));
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(source, src);
      if (!rel) return true;
      return !rel.split(path.sep).some((part) => SKIP_DIRS.has(part));
    },
  });
  return dest;
}

function initAndIndex(project, engine) {
  run(process.execPath, [distBin, 'init', project], project);
  const args = [distBin, 'index', project, '--force', '--quiet'];
  const env = {};
  if (engine === 'rust') {
    args.push('--engine', 'rust');
    env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;
  }
  run(process.execPath, args, project, env);
}

async function loadDist() {
  const idx = await import(pathToFileURL(path.join(repoRoot, 'dist', 'index.js')).href);
  const tools = await import(pathToFileURL(path.join(repoRoot, 'dist', 'mcp', 'tools.js')).href);
  return {
    CodeGraph: idx.default?.default ?? idx.default ?? idx.CodeGraph,
    ToolHandler: tools.ToolHandler ?? tools.default?.ToolHandler,
  };
}

async function explore(project, query) {
  const { CodeGraph, ToolHandler } = await loadDist();
  const cg = CodeGraph.openSync(project);
  try {
    const handler = new ToolHandler(cg);
    const result = await handler.execute('zcodegraph_explore', { query, projectPath: project });
    return result.content?.[0]?.text ?? '';
  } finally {
    try { cg.close?.(); } catch {}
  }
}

function analyze(text, expected) {
  const hasFlowSection = /## Flow \(call path among the symbols you queried\)/.test(text);
  const flowConnected = hasFlowSection && /(?:→|->)/.test(text.slice(0, Math.min(text.length, 4000)));
  const missingExpected = expected.filter((symbol) => !text.includes(symbol));
  const fallbackRisk = missingExpected.length > 0 || !flowConnected;
  return {
    outputChars: text.length,
    hasFlowSection,
    flowConnected,
    missingExpected,
    deterministicGenericRead: fallbackRisk ? 1 : 0,
    deterministicGenericGrep: fallbackRisk ? 1 : 0,
    classification: fallbackRisk
      ? (!flowConnected ? 'graph coverage' : 'scope shallow')
      : 'no regression',
  };
}

function metadataFor(repoPath) {
  const commit = fs.existsSync(path.join(repoPath, '.git'))
    ? run('git', ['rev-parse', '--short', 'HEAD'], repoPath).stdout.trim()
    : null;
  return { sourcePath: repoPath, commit };
}

function collectRegressions(results) {
  const regressions = [];
  for (const repo of results) {
    for (const prompt of repo.prompts) {
      if (prompt.typescript.flowConnected && !prompt.rust.flowConnected) {
        regressions.push(`${repo.name} ${prompt.id}: Rust lost a TypeScript-connected Flow section`);
      }
      if (prompt.rust.deterministicGenericRead > prompt.typescript.deterministicGenericRead) {
        regressions.push(`${repo.name} ${prompt.id}: Rust deterministic Read fallback risk increased`);
      }
      if (prompt.rust.deterministicGenericGrep > prompt.typescript.deterministicGenericGrep) {
        regressions.push(`${repo.name} ${prompt.id}: Rust deterministic Grep fallback risk increased`);
      }
    }
  }
  return regressions;
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
    const prompts = PROMPTS[repo.name];
    if (!prompts) throw new Error(`No built-in prompts for repo name "${repo.name}"`);

    const copies = {
      typescript: copyRepo(repo.path, `${repo.name}-ts`),
      rust: copyRepo(repo.path, `${repo.name}-rust`),
    };
    initAndIndex(copies.typescript, 'typescript');
    initAndIndex(copies.rust, 'rust');

    const promptResults = [];
    for (const prompt of prompts) {
      const tsText = await explore(copies.typescript, prompt.query);
      const rustText = await explore(copies.rust, prompt.query);
      promptResults.push({
        id: prompt.id,
        query: prompt.query,
        typescript: analyze(tsText, prompt.expected),
        rust: analyze(rustText, prompt.expected),
      });
    }

    results.push({
      name: repo.name,
      ...metadataFor(repo.path),
      prompts: promptResults,
    });
  }

  const regressions = collectRegressions(results);
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'deterministic-tool-surface',
    note: 'Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.',
    toolchain: {
      node: process.version,
      rustc: run('rustc', ['--version'], repoRoot).stdout.trim(),
      cargo: run('cargo', ['--version'], repoRoot).stdout.trim(),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
    },
    results,
    regressions,
  }, null, 2));
  if (regressions.length > 0) {
    console.error(`Rust sufficiency regressions detected:\n- ${regressions.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
