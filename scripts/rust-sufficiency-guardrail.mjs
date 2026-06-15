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

const PHASE1_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json']);
const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);
const UNAVAILABLE_KINDS = [
  'copy-timeout',
  'typescript-index-timeout',
  'rust-index-timeout',
  'explore-timeout',
  'missing-index',
  'validator-failed',
  'process-error',
  'unsupported-runtime',
];

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
    'Usage: node scripts/rust-sufficiency-guardrail.mjs --repo <name>=<path> [--repo <name>=<path> ...] [--prompts <json>]',
    '',
    'Options:',
    '  --prompts <json>                         Load external prompt definitions',
    '  --prompt-id <id>                         Run only matching prompt id (repeatable)',
    '  --out <file>                             Write final or partial JSON artifact to a file',
    '  --timeout-ms <ms>                        Bound copy/index/explore stages and emit unavailable artifact on timeout',
    '  --emit-partial-on-failure                Preserve partial artifact for process failures',
    '  --repo-pair <name>:typescript=<path>     Reuse an already indexed TypeScript project',
    '  --repo-pair <name>:rust=<path>           Reuse an already indexed Rust project',
    '',
    'Names with built-in prompts: zcodegraph, excalidraw, zustand',
    'Use --prompts for long-running repo-specific probes such as VS Code.',
    '',
    `Unavailable taxonomy: ${UNAVAILABLE_KINDS.join(', ')}`,
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/tmp/codegraph-corpus/excalidraw',
    '  node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/codegraph-corpus/vscode --prompts docs/benchmarks/vscode-sufficiency-prompts.json',
    '  node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/vscode --prompt-id VS-1 --out docs/benchmarks/vscode.raw.json',
    '',
    'The script creates TypeScript- and Rust-produced indexes, or reuses an',
    'explicit indexed pair, runs zcodegraph_explore for representative flow',
    'prompts, and compares Flow connectivity plus deterministic fallback-risk',
    'signals. Default stdout JSON behavior is preserved.',
    '',
    'For large JS/TS probes it copies a JavaScript/TypeScript/config slice,',
    'matching the Rust indexing profile scope and avoiding unrelated files.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = [];
  const promptFiles = [];
  const promptIds = new Set();
  const repoPairs = new Map();
  let out = null;
  let timeoutMs = null;
  let emitPartialOnFailure = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repos, promptFiles, promptIds, out, timeoutMs, emitPartialOnFailure, repoPairs };
    if (arg === '--repo') {
      const spec = argv[++i];
      if (!spec) throw new Error('--repo requires name=path');
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--repo must be name=path');
      repos.push({ name: spec.slice(0, eq), path: path.resolve(spec.slice(eq + 1)) });
      continue;
    }
    if (arg === '--repo-pair') {
      const spec = argv[++i];
      if (!spec) throw new Error('--repo-pair requires name:engine=path');
      const parsed = parseRepoPair(spec);
      const current = repoPairs.get(parsed.name) ?? {};
      current[parsed.engine] = parsed.path;
      repoPairs.set(parsed.name, current);
      continue;
    }
    if (arg === '--prompts') {
      const file = argv[++i];
      if (!file) throw new Error('--prompts requires a JSON file path');
      promptFiles.push(path.resolve(file));
      continue;
    }
    if (arg === '--prompt-id') {
      const id = argv[++i];
      if (!id) throw new Error('--prompt-id requires a prompt id');
      promptIds.add(id);
      continue;
    }
    if (arg === '--out') {
      const file = argv[++i];
      if (!file) throw new Error('--out requires a file path');
      out = path.resolve(file);
      continue;
    }
    if (arg === '--timeout-ms') {
      const value = Number.parseInt(argv[++i] ?? '', 10);
      if (!Number.isFinite(value) || value <= 0) throw new Error('--timeout-ms requires a positive integer');
      timeoutMs = value;
      continue;
    }
    if (arg === '--emit-partial-on-failure') {
      emitPartialOnFailure = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repos, promptFiles, promptIds, out, timeoutMs, emitPartialOnFailure, repoPairs };
}

function parseRepoPair(spec) {
  const colon = spec.indexOf(':');
  const eq = spec.indexOf('=');
  if (colon <= 0 || eq <= colon + 1) throw new Error('--repo-pair must be name:typescript=path or name:rust=path');
  const name = spec.slice(0, colon);
  const engine = spec.slice(colon + 1, eq);
  if (engine !== 'typescript' && engine !== 'rust') throw new Error('--repo-pair engine must be typescript or rust');
  return { name, engine, path: path.resolve(spec.slice(eq + 1)) };
}

function loadPromptFiles(files) {
  const prompts = { ...PROMPTS };
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (parsed == null || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`Prompt file must contain an object keyed by repo name: ${file}`);
    }
    for (const [repoName, repoPrompts] of Object.entries(parsed)) {
      validatePrompts(repoName, repoPrompts, file);
      prompts[repoName] = repoPrompts;
    }
  }
  return prompts;
}

function validatePrompts(repoName, prompts, source) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    throw new Error(`Prompt file ${source} must define a non-empty array for repo "${repoName}"`);
  }
  for (const [index, prompt] of prompts.entries()) {
    const label = `${source} ${repoName}[${index}]`;
    if (prompt == null || typeof prompt !== 'object') {
      throw new Error(`Prompt ${label} must be an object`);
    }
    if (typeof prompt.id !== 'string' || prompt.id.length === 0) {
      throw new Error(`Prompt ${label} must include a non-empty string id`);
    }
    if (typeof prompt.query !== 'string' || prompt.query.length === 0) {
      throw new Error(`Prompt ${label} must include a non-empty string query`);
    }
    if (!Array.isArray(prompt.expected) || prompt.expected.some((symbol) => typeof symbol !== 'string' || symbol.length === 0)) {
      throw new Error(`Prompt ${label} must include a non-empty string expected array`);
    }
  }
}

function filterPrompts(repoName, prompts, promptIds) {
  if (promptIds.size === 0) return prompts;
  const filtered = prompts.filter((prompt) => promptIds.has(prompt.id));
  if (filtered.length === 0) {
    throw new Error(`No prompts selected for repo "${repoName}" with --prompt-id ${[...promptIds].join(', ')}`);
  }
  return filtered;
}

function run(command, args, cwd, env = {}, timeoutMs = null) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...baseEnv(), ...env },
    encoding: 'utf-8',
    timeout: timeoutMs ?? undefined,
  });
  if (result.status !== 0) {
    const err = new Error([
      `${command} ${args.join(' ')} failed in ${cwd}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
    err.result = result;
    throw err;
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

function nowMs() {
  return Date.now();
}

function makeStage(status = 'pending', extra = {}) {
  return { status, elapsedMs: 0, ...extra };
}

function emptyStages() {
  return {
    copy: makeStage(),
    typescriptIndex: makeStage(),
    rustIndex: makeStage(),
    exploreAnalyze: makeStage(),
    comparison: makeStage(),
  };
}

function createArtifact({ mode, command, timeoutMs }) {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
  return {
    generatedAt: new Date().toISOString(),
    status: 'running',
    mode,
    command,
    timeoutMs,
    unavailableKind: null,
    unavailableReason: null,
    note: 'Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.',
    unavailableTaxonomy: UNAVAILABLE_KINDS,
    defaultRolloutReadinessClaimed: false,
    runtimeWarnings: Number.isFinite(nodeMajor) && nodeMajor >= 25
      ? ['Node.js >=25 is outside the supported runtime range and may trigger V8 Wasm tiering instability on large tree-sitter workloads.']
      : [],
    stages: emptyStages(),
    toolchain: null,
    results: [],
    regressions: [],
  };
}

function finishArtifact(artifact, status, extra = {}) {
  artifact.generatedAt = new Date().toISOString();
  artifact.status = status;
  Object.assign(artifact, extra);
  return artifact;
}

function markUnavailable(artifact, kind, reason, stageName, extra = {}) {
  if (stageName && artifact.stages[stageName]) {
    artifact.stages[stageName].status = 'unavailable';
  }
  return finishArtifact(artifact, 'unavailable', {
    unavailableKind: kind,
    unavailableReason: reason,
    ...extra,
  });
}

function writeArtifact(out, artifact) {
  if (!out) return;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n');
}

function emitArtifact(out, artifact) {
  const json = JSON.stringify(artifact, null, 2);
  writeArtifact(out, artifact);
  console.log(json);
}

function tail(text, max = 4000) {
  if (!text) return '';
  return text.length <= max ? text : text.slice(text.length - max);
}

function classifyProcessFailure(engine, result) {
  const stderr = result?.stderr ?? '';
  if (stderr.includes('[CodeGraph] Unsupported Node.js version')) {
    return 'unsupported-runtime';
  }
  const timedOut = result?.signal === 'SIGTERM' || result?.error?.code === 'ETIMEDOUT';
  if (timedOut) {
    return engine === 'rust' ? 'rust-index-timeout' : 'typescript-index-timeout';
  }
  return 'process-error';
}

function remainingTimeout(deadline) {
  if (deadline == null) return null;
  return Math.max(1, deadline - Date.now());
}

function ensureNotTimedOut(deadline, artifact, stageName) {
  if (deadline != null && Date.now() >= deadline) {
    const kind = stageName === 'typescriptIndex'
      ? 'typescript-index-timeout'
      : stageName === 'rustIndex'
        ? 'rust-index-timeout'
        : stageName === 'exploreAnalyze'
          ? 'explore-timeout'
          : 'copy-timeout';
    throw Object.assign(new Error(`Timed out during ${stageName}`), {
      unavailableKind: kind,
      stageName,
      artifact: markUnavailable(artifact, kind, `Timed out during ${stageName}.`, stageName),
    });
  }
}

function copyRepo(source, label, artifact, deadline) {
  const started = nowMs();
  artifact.stages.copy.status = 'running';
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-guardrail-${label}-`));
  let copiedFiles = 0;

  function walk(current) {
    ensureNotTimedOut(deadline, artifact, 'copy');
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const src = path.join(current, entry.name);
      const rel = path.relative(source, src);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(src);
        continue;
      }
      if (!entry.isFile()) continue;

      const basename = path.basename(src);
      const ext = path.extname(src);
      if (!PHASE1_EXTENSIONS.has(ext) && !CONFIG_FILES.has(basename)) continue;

      const target = path.join(dest, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(src, target);
      copiedFiles++;
    }
  }

  walk(source);
  artifact.stages.copy = makeStage('completed', {
    elapsedMs: nowMs() - started,
    mode: 'js-ts-config-slice',
  });
  return {
    path: dest,
    copiedFiles,
    mode: 'js-ts-config-slice',
  };
}

function initAndIndex(project, engine, CodeGraph, artifact, deadline) {
  const stageName = engine === 'rust' ? 'rustIndex' : 'typescriptIndex';
  const started = nowMs();
  artifact.stages[stageName].status = 'running';
  CodeGraph.initSync(project).close();
  const args = [distBin, 'index', project, '--force', '--quiet'];
  const env = {};
  if (engine === 'rust') {
    args.push('--engine', 'rust');
    env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;
  }
  try {
    run(process.execPath, args, project, env, remainingTimeout(deadline));
    artifact.stages[stageName] = makeStage('completed', {
      elapsedMs: nowMs() - started,
      projectPath: project,
    });
  } catch (err) {
    const kind = classifyProcessFailure(engine, err.result);
    artifact.stages[stageName] = makeStage('unavailable', {
      elapsedMs: nowMs() - started,
      projectPath: project,
      stderrTail: tail(err.result?.stderr),
    });
    throw Object.assign(err, {
      unavailableKind: kind,
      stageName,
      artifact: markUnavailable(artifact, kind, err.message, stageName),
    });
  }
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
  const evidenceText = text
    .split('\n')
    .filter((line) => !line.startsWith('## Exploration:'))
    .join('\n');
  const missingExpected = expected.filter((symbol) => !evidenceText.includes(symbol));
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

function toolchain() {
  return {
    node: process.version,
    rustc: run('rustc', ['--version'], repoRoot).stdout.trim(),
    cargo: run('cargo', ['--version'], repoRoot).stdout.trim(),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cpuCount: os.cpus().length,
  };
}

function validateIndexedProject(project) {
  return fs.existsSync(project) && fs.existsSync(path.join(project, '.zcodegraph'));
}

function repoPairFor(repoPairs, repoName) {
  const pair = repoPairs.get(repoName);
  if (!pair) return null;
  return {
    typescript: pair.typescript,
    rust: pair.rust,
  };
}

async function runExploreComparison(repo, prompts, projects, artifact, deadline) {
  const started = nowMs();
  artifact.stages.exploreAnalyze.status = 'running';
  const promptResults = [];
  for (const prompt of prompts) {
    ensureNotTimedOut(deadline, artifact, 'exploreAnalyze');
    const tsText = await explore(projects.typescript, prompt.query);
    ensureNotTimedOut(deadline, artifact, 'exploreAnalyze');
    const rustText = await explore(projects.rust, prompt.query);
    promptResults.push({
      id: prompt.id,
      query: prompt.query,
      typescript: analyze(tsText, prompt.expected),
      rust: analyze(rustText, prompt.expected),
    });
  }
  artifact.stages.exploreAnalyze = makeStage('completed', {
    elapsedMs: nowMs() - started,
  });
  return promptResults;
}

function commandLine() {
  return [process.execPath, process.argv[1], ...process.argv.slice(2)].join(' ');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { help, repos, promptFiles, promptIds, out, timeoutMs, repoPairs } = options;
  if (help) {
    usage();
    return;
  }

  const deadline = timeoutMs == null ? null : Date.now() + timeoutMs;
  const artifact = createArtifact({
    mode: repoPairs.size > 0 ? 'deterministic-tool-surface-reuse-indexed-pair' : 'deterministic-tool-surface',
    command: commandLine(),
    timeoutMs,
  });

  try {
    const promptCatalog = loadPromptFiles(promptFiles);
    const repoNames = new Set([...repos.map((repo) => repo.name), ...repoPairs.keys()]);
    if (repoNames.size === 0) throw new Error('At least one --repo name=path or --repo-pair name:engine=path is required');
    for (const repoName of repoNames) {
      if (!promptCatalog[repoName]) throw new Error(`No built-in or configured prompts for repo name "${repoName}"`);
    }
    if (!fs.existsSync(distBin)) throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
    if (repoPairs.size === 0 && !fs.existsSync(rustCore)) {
      throw Object.assign(new Error('target/debug/zcodegraph-core not found. Run cargo build --package zcodegraph-core first.'), {
        unavailableKind: 'process-error',
        stageName: 'rustIndex',
      });
    }

    artifact.toolchain = toolchain();
    const dist = await loadDist();
    const results = [];
    for (const repoName of repoNames) {
      const sourceRepo = repos.find((item) => item.name === repoName) ?? { name: repoName, path: repoPairFor(repoPairs, repoName)?.typescript ?? '' };
      const prompts = filterPrompts(repoName, promptCatalog[repoName], promptIds);
      const pair = repoPairFor(repoPairs, repoName);
      let projects;
      let copies = null;
      let reuseIndexedPair = null;

      if (pair) {
        artifact.stages.copy = makeStage('skipped', { reason: 'reuse-indexed-pair' });
        artifact.stages.typescriptIndex = makeStage('skipped', { reason: 'reuse-indexed-pair' });
        artifact.stages.rustIndex = makeStage('skipped', { reason: 'reuse-indexed-pair' });
        if (!pair.typescript || !pair.rust || !validateIndexedProject(pair.typescript) || !validateIndexedProject(pair.rust)) {
          const missing = [
            !pair.typescript || !validateIndexedProject(pair.typescript) ? 'typescript' : null,
            !pair.rust || !validateIndexedProject(pair.rust) ? 'rust' : null,
          ].filter(Boolean);
          markUnavailable(artifact, 'missing-index', `Missing indexed project for ${repoName}: ${missing.join(', ')}`, 'exploreAnalyze', {
            results,
            missingIndex: {
              repo: repoName,
              typescript: pair.typescript ?? null,
              rust: pair.rust ?? null,
            },
          });
          emitArtifact(out, artifact);
          process.exitCode = 1;
          return;
        }
        projects = { typescript: pair.typescript, rust: pair.rust };
        reuseIndexedPair = {
          sourceTarget: sourceRepo.path || null,
          typescript: { path: pair.typescript, engineLabel: 'typescript', engineLabelSource: 'caller' },
          rust: { path: pair.rust, engineLabel: 'rust', engineLabelSource: 'caller' },
        };
      } else {
        const copyTs = copyRepo(sourceRepo.path, `${repoName}-ts`, artifact, deadline);
        const copyRust = copyRepo(sourceRepo.path, `${repoName}-rust`, artifact, deadline);
        copies = {
          typescript: copyTs,
          rust: copyRust,
        };
        initAndIndex(copies.typescript.path, 'typescript', dist.CodeGraph, artifact, deadline);
        initAndIndex(copies.rust.path, 'rust', dist.CodeGraph, artifact, deadline);
        projects = { typescript: copies.typescript.path, rust: copies.rust.path };
      }

      const promptResults = await runExploreComparison(repoName, prompts, projects, artifact, deadline);
      results.push({
        name: repoName,
        ...metadataFor(sourceRepo.path || projects.typescript),
        copyMode: pair ? 'reuse-indexed-pair' : 'js-ts-config-slice',
        copies: pair
          ? {
              typescript: { copiedFiles: 0, tempProjectPath: projects.typescript, skipped: true },
              rust: { copiedFiles: 0, tempProjectPath: projects.rust, skipped: true },
            }
          : {
              typescript: {
                copiedFiles: copies.typescript.copiedFiles,
                tempProjectPath: copies.typescript.path,
              },
              rust: {
                copiedFiles: copies.rust.copiedFiles,
                tempProjectPath: copies.rust.path,
              },
            },
        reuseIndexedPair,
        prompts: promptResults,
      });
    }

    artifact.results = results;
    artifact.regressions = collectRegressions(results);
    artifact.stages.comparison = makeStage(artifact.regressions.length > 0 ? 'failed' : 'completed', {
      elapsedMs: 0,
      regressionCount: artifact.regressions.length,
    });
    finishArtifact(artifact, artifact.regressions.length > 0 ? 'failed' : 'completed');
    emitArtifact(out, artifact);
    if (artifact.regressions.length > 0) {
      console.error(`Rust sufficiency regressions detected:\n- ${artifact.regressions.join('\n- ')}`);
      process.exitCode = 1;
    }
  } catch (err) {
    const partial = err.artifact ?? markUnavailable(
      artifact,
      err.unavailableKind ?? 'process-error',
      err instanceof Error ? err.message : String(err),
      err.stageName ?? null,
      { stderrTail: tail(err.result?.stderr) },
    );
    writeArtifact(out, partial);
    if (out) {
      console.error(partial.unavailableReason ?? (err instanceof Error ? err.message : String(err)));
    } else {
      console.error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
