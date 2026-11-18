#!/usr/bin/env node
// Human-invoked Flask Agent Sufficiency baseline. Preparation never calls a model.
// The provider-specific adapter owns CLI and transcript details. Do not put
// credentials, authentication-file contents, or permission bypasses here.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// All prompt text, including the historical default, has one registry source.
// Explicit --prompt-id is required to select a calibrated diagnostic variant.
const DEFAULT_COMMIT = '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7';
const DEFAULT_PROMPT_ID = 'flask-ipv6-structure-trace-v1-candidate';

/** Resolve the selected or historical default prompt through the registry. */
async function resolvePrompt(promptId) {
  const { getPrompt } = await import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/task-prompts/registry.mjs')).href);
  const mod = getPrompt(promptId || DEFAULT_PROMPT_ID);
  return { promptId: mod.PROMPT_ID, prompt: mod.PROMPT, commit: mod.COMMIT };
}

function usage() {
  return `Usage (run from any normal terminal):
  node scripts/agent-eval/run-flask-baseline.mjs --prepare
  node scripts/agent-eval/run-flask-baseline.mjs --run

Options:
  --source <dir>     Flask source; default: %TEMP%/zcg-flask-source
  --out-dir <dir>    Valid evidence/diagnostics; default: %TEMP%/zcg-flask-results
  --run-id <id>      Unique run ID; default: flask-baseline-<UTC timestamp>
  --model <id>       Requested model; default: balanced-model
  --effort <level>   Explicit reasoning effort: minimal/low/medium/high/xhigh/max
  --cli <path>       Installed CodeBuddy launcher; auto-detected on this host
  --cli-flavor <id>  workbuddy-lite (default) or standalone (explicit .exe/JS entry)
  --clone-url <url>  Source for first preparation; default: GitHub pallets/flask
  --prompt-id <id>   Prompt from task-prompts registry; default: flask-ipv6-structure-trace-v1-candidate
  --post-c           Use frozen C; --prepare rehearses snapshot/index binding without a model

No arguments prints this help and performs no I/O. --prepare may clone/index,
but never invokes a model. --run invokes at most one with/without pair.
The candidate prompt is not frozen by this script; Human review is still required.`;
}

function parse(argv) {
  const options = { mode: '', source: '', outDir: '', runId: '', model: 'balanced-model', effort: '', cli: '', cliFlavor: 'workbuddy-lite', cloneUrl: '', promptId: '', postC: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--post-c') {
      options.postC = true;
      continue;
    }
    if (arg === '--prepare' || arg === '--run') {
      if (options.mode) throw new Error('choose exactly one of --prepare or --run');
      options.mode = arg.slice(2);
      continue;
    }
    const key = { '--source': 'source', '--out-dir': 'outDir', '--run-id': 'runId', '--model': 'model', '--effort': 'effort', '--cli': 'cli', '--cli-flavor': 'cliFlavor', '--clone-url': 'cloneUrl', '--prompt-id': 'promptId' }[arg];
    if (!key || !argv[i + 1]) throw new Error(`unknown/incomplete argument: ${arg}`);
    options[key] = argv[++i];
  }
  if (!options.mode) throw new Error('choose --prepare (no model) or --run (one real pair)');
  options.source = path.resolve(options.source || path.join(tmpdir(), 'zcg-flask-source'));
  options.outDir = path.resolve(options.outDir || path.join(tmpdir(), 'zcg-flask-results'));
  options.cli = path.resolve(options.cli || path.join(
    process.env.LOCALAPPDATA || '',
    'Programs/WorkBuddy/resources/app.asar.unpacked/cli/bin/codebuddy',
  ));
  if (options.effort && !['minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(options.effort)) throw new Error('--effort must be minimal, low, medium, high, xhigh, or max');
  if (!['workbuddy-lite', 'standalone'].includes(options.cliFlavor)) throw new Error('--cli-flavor must be workbuddy-lite or standalone');
  options.cloneUrl = options.cloneUrl || 'https://github.com/pallets/flask.git';
  options.runId = options.runId || `flask-baseline-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.runId)) throw new Error('run ID must contain only letters, digits, dot, underscore, or dash');
  return options;
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO,
    env: { ...process.env, NODE_OPTIONS: '', ZCG_NO_DAEMON: '1', ZCG_NO_WATCH: '1' },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}

async function prepare(options, commit) {
  for (const [label, file] of [
    ['CodeBuddy launcher', options.cli],
    ['ZCodeGraph CLI', path.join(REPO, 'dist/bin/zcodegraph.js')],
  ]) {
    if (!file || !existsSync(file)) throw new Error(`${label} not found: ${file}`);
  }
  if (!await commandPath('git')) throw new Error('git was not found on PATH');
  if (!existsSync(path.join(options.source, '.git'))) {
    if (existsSync(options.source)) throw new Error(`source exists but is not a Flask git checkout: ${options.source}`);
    await mkdir(path.dirname(options.source), { recursive: true });
    execute('git', ['clone', '--filter=blob:none', '--no-checkout', options.cloneUrl, options.source]);
  }
  const head = spawnSync('git', ['-C', options.source, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== commit) {
    execute('git', ['-C', options.source, 'checkout', '--detach', commit]);
  }
  const confirmed = spawnSync('git', ['-C', options.source, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (confirmed.status !== 0 || confirmed.stdout.trim() !== commit) throw new Error('Flask commit verification failed');
  const db = path.join(options.source, '.zcodegraph', 'zcodegraph.db');
  if (!existsSync(db)) execute(process.execPath, [path.join(REPO, 'dist/bin/zcodegraph.js'), 'index', options.source, '--quiet']);
  if (!existsSync(db)) throw new Error('index preparation did not create zcodegraph.db');
  return db;
}

async function commandPath(command) {
  const result = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split(/\r?\n/)[0].trim() : '';
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options.mode === 'run' && (process.env.WORKBUDDY_FS_PROTECTION_ROLE || process.env.LSBOX_SHMEM_NAME)) {
    throw new Error('This terminal still has WorkBuddy process isolation markers. Open a NEW normal Windows Terminal/PowerShell outside WorkBuddy; do not clear markers to bypass the sandbox.');
  }
  const { promptId, prompt, commit } = await resolvePrompt(options.promptId);
  const db = await prepare(options, commit);
  await mkdir(options.outDir, { recursive: true });
  const outputPath = path.join(options.outDir, `${options.runId}.json`);
  const diagnosticPath = path.join(options.outDir, `${options.runId}.diagnostics.json`);
  if (existsSync(outputPath) || existsSync(diagnosticPath)) throw new Error(`run ID already has an output; choose a new --run-id: ${options.runId}`);
  console.log(JSON.stringify({ mode: options.mode, source: options.source, commit, promptId, indexReady: true, postC: options.postC, outDir: options.outDir, modelInvoked: false }, null, 2));
  if (options.mode === 'prepare') {
    if (options.postC) {
      const { createIsolatedSnapshot, preparePostCExplore, disposeSnapshot } = await import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/harness/isolation.mjs')).href);
      const snapshot = await createIsolatedSnapshot({ sourceDir: options.source });
      try {
        const { prepared } = await preparePostCExplore(snapshot, {
          arm: 'C', candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
        });
        console.log(JSON.stringify({ preparation: prepared, desEvidence: false, modelInvoked: false }, null, 2));
      } finally {
        await disposeSnapshot(snapshot);
      }
    }
    return;
  }

  const [{ registerAdapter, runBaseline }, { runIsolatedBaseline }, adapter] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/harness/runner.mjs')).href),
    import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/harness/isolation.mjs')).href),
    import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/harness/adapters/codebuddy.mjs')).href),
  ]);
  registerAdapter('codebuddy', adapter);
  const result = await runIsolatedBaseline({
    sourceDir: options.source,
    runBaseline,
    baselineOptions: {
      runId: options.runId,
      adapterId: 'codebuddy',
      corpus: `pallets/flask@${commit}`,
      prompt,
      model: options.model,
      toolSchema: 'Read,Grep,Glob,mcp__codegraph__*',
      promptId,
      snapshot: commit,
      ...(options.effort ? { execution: { effort: options.effort } } : {}),
      server: {
        command: process.execPath,
        args: [path.join(REPO, 'dist/bin/zcodegraph.js'), 'serve', '--mcp', '--no-watch'],
        env: { ZCG_NO_DAEMON: '1', ZCG_NO_WATCH: '1' },
        alwaysLoad: true,
      },
      outDir: options.outDir,
      diagnosticsDir: options.outDir,
      adapterOptions: { cliPath: options.cli, cliFlavor: options.cliFlavor, timeoutMs: 600000 },
      ...(options.postC ? {
        retrieval: {
          arm: 'C', candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
        },
      } : {}),
    },
  });
  console.log(JSON.stringify({
    runId: result.runId,
    status: result.status,
    invalidReason: result.invalidReason,
    attemptedArms: result.diagnostics?.attemptedArms ?? ['with', 'without'],
    totals: result.totals,
    isolation: result.isolation,
    resultPath: result.status === 'valid' ? outputPath : diagnosticPath,
    humanReview: 'required; a valid process result is not a DES pass',
  }, null, 2));
  if (result.status !== 'valid') process.exitCode = 2;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  if (process.argv.length === 2) console.log(usage());
  else main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}

export { DEFAULT_COMMIT as COMMIT, DEFAULT_PROMPT_ID as PROMPT_ID, parse, prepare, resolvePrompt, usage };
