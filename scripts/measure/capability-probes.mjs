#!/usr/bin/env node
/**
 * capability-probes.mjs — per-capability-domain health probes (roadmap 1-2-8-3).
 *
 * Runs one minimal real check per capability domain against an indexed
 * corpus and emits `capabilities.json`:
 *
 *   extraction   — `zcodegraph status --json` reports indexed files/nodes > 0
 *   resolution   — `zcodegraph callers <symbol>` returns ≥1 caller
 *   search       — `zcodegraph query <term>` returns ≥1 hit
 *   context      — `zcodegraph explore "<query>"` produces a non-trivial payload
 *   mcp-tools    — MCP `initialize` handshake answers with the frozen tool set
 *   dead-code    — `zcodegraph dead-code --json` emits a parseable report
 *
 * Each probe reports { state: healthy|degraded|failed, latencyMs, detail }.
 * Overall pass = no domain in `failed`. Degraded = probe ran but signalled a
 * partial capability (e.g. zero callers resolved — graph usable, resolution
 * weak).
 *
 * Usage:
 *   node scripts/measure/capability-probes.mjs <github-url> [--ref <sha>]
 *     [--corpus-root <dir>] [--out <path>] [--quiet]
 *     [--callers-symbol <name>] [--query-term <term>] [--explore-query <q>]
 *
 * Environment:
 *   CAPABILITY_PROBE_DIR — skip clone/index, probe an already-indexed dir.
 *   MEASURE_SKIP_FETCH=1 — reuse cached clone without network (see lib/clone).
 */

import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { emitReport } from './lib/report.mjs';
import { normalizeRepo, log, fail } from './lib/args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

/**
 * Frozen MCP tool surface (schema-evolution-and-mcp-tool-cap-v1: ≤12 tools).
 * Mirrors the static registrations in src/mcp/tools.ts.
 *
 * Two dynamic gates are legitimate, probed states — not drift:
 *  - TINY_REPO gating (fileCount < 500): only explore/search/node exposed;
 *  - CODEGRAPH_MCP_TOOLS env allowlist.
 * The probe therefore asserts the *served* set against the expectation for
 * the gated profile: tiny repo → TINY set; otherwise → full set. Any other
 * missing/extra tool is drift.
 */
const FULL_MCP_TOOLS = [
  'zcodegraph_search',
  'zcodegraph_callers',
  'zcodegraph_callees',
  'zcodegraph_impact',
  'zcodegraph_node',
  'zcodegraph_explore',
  'zcodegraph_status',
  'zcodegraph_files',
];
const TINY_REPO_MCP_TOOLS = ['zcodegraph_explore', 'zcodegraph_search', 'zcodegraph_node'];
const TINY_REPO_FILE_THRESHOLD = 500;

function parseArgs(argv) {
  const args = {
    repo: null,
    ref: null,
    sparse: [],
    corpusRoot: 'C:/workspace/measure-corpus',
    out: null,
    quiet: false,
    callersSymbol: 'VetRepository.findAll',
    queryTerm: 'OwnerController',
    exploreQuery: 'How does the owner controller reach the vet visit service?',
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') args.ref = argv[++i];
    else if (a === '--sparse') args.sparse.push(argv[++i]);
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--callers-symbol') args.callersSymbol = argv[++i];
    else if (a === '--query-term') args.queryTerm = argv[++i];
    else if (a === '--explore-query') args.exploreQuery = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positional.push(a);
  }
  if (positional.length > 1) throw new Error(`expected at most one positional <github-url>`);
  args.repo = positional.length === 1 ? normalizeRepo(positional[0]) : null;
  return args;
}

function cliEnv() {
  return {
    ...process.env,
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
}

/** Run a CLI probe; never throws — probe failure IS the measurement. */
function probeCli(repoDir, cliArgs, { expect = () => true, timeoutMs = 60_000 } = {}) {
  const start = Date.now();
  try {
    const out = execFileSync(process.execPath, [BIN, ...cliArgs], {
      cwd: repoDir,
      encoding: 'buffer',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: cliEnv(),
      maxBuffer: 128 * 1024 * 1024,
      timeout: timeoutMs,
    });
    const latencyMs = Date.now() - start;
    const text = out.toString('utf-8');
    return expect(text)
      ? { state: 'healthy', latencyMs, detail: `ok (${cliArgs.join(' ')})` }
      : { state: 'degraded', latencyMs, detail: `ran ok but expectation failed (${cliArgs.join(' ')})` };
  } catch (err) {
    return {
      state: 'failed',
      latencyMs: Date.now() - start,
      detail: `${cliArgs.join(' ')} failed: ${String(err.message).slice(0, 300)}`,
    };
  }
}

function probeExtraction(repoDir) {
  return probeCli(repoDir, ['status', '--json'], {
    expect: (text) => {
      try {
        const j = JSON.parse(text);
        return Number(j.fileCount) > 0 && Number(j.nodeCount) > 0;
      } catch {
        return false;
      }
    },
  });
}

function probeResolution(repoDir, symbol) {
  return probeCli(repoDir, ['callers', symbol, '--json'], {
    expect: (text) => {
      try {
        const j = JSON.parse(text);
        const arr = Array.isArray(j) ? j : j.callers ?? j.results ?? [];
        return arr.length >= 1;
      } catch {
        return false;
      }
    },
  });
}

function probeSearch(repoDir, term) {
  return probeCli(repoDir, ['query', term, '--json'], {
    expect: (text) => {
      try {
        const j = JSON.parse(text);
        const arr = Array.isArray(j) ? j : j.results ?? j.nodes ?? [];
        return arr.length >= 1;
      } catch {
        // Text output fallback: any non-empty payload counts.
        return text.trim().length > 0;
      }
    },
  });
}

function probeContext(repoDir, query) {
  return probeCli(repoDir, ['explore', query], {
    expect: (text) => text.trim().length > 200,
  });
}

function probeDeadCode(repoDir) {
  return probeCli(repoDir, ['dead-code', '--json'], {
    expect: (text) => {
      try {
        const j = JSON.parse(text);
        return typeof j === 'object' && j !== null;
      } catch {
        return false;
      }
    },
    timeoutMs: 120_000,
  });
}

/** Read indexed fileCount from `status --json` (0 when unavailable). */
function indexedFileCount(repoDir) {
  try {
    const out = execFileSync(process.execPath, [BIN, 'status', '--json'], {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: cliEnv(),
      maxBuffer: 16 * 1024 * 1024,
      timeout: 60_000,
    });
    return Number(JSON.parse(out).fileCount) || 0;
  } catch {
    return 0;
  }
}

/** MCP handshake: send initialize + tools/list over stdio, expect tool names. */
function probeMcpTools(repoDir) {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, 'serve', '--mcp'], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: cliEnv(),
    });
    let buf = '';
    let settled = false;
    const timer = setTimeout(() => {
      finish({ state: 'failed', latencyMs: Date.now() - start, detail: 'MCP handshake timed out (10s)' });
    }, 10_000);

    // A closed stdin (server exited mid-handshake or we already settled)
    // must never crash the probe run with an unhandled EPIPE.
    child.stdin.on('error', () => { /* swallow EPIPE on shutdown */ });

    function safeWrite(payload) {
      if (settled || child.stdin.destroyed || child.stdin.writableEnded) return;
      try {
        child.stdin.write(payload);
      } catch { /* EPIPE race — the exit handler reports the failure */ }
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch { /* already gone */ }
      resolve(result);
    }

    child.stdout.on('data', (chunk) => {
      buf += chunk.toString('utf-8');
      // MCP over stdio: newline-delimited JSON-RPC.
      const lines = buf.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        let msg;
        try { msg = JSON.parse(trimmed); } catch { continue; }
        if (msg.id === 1 && msg.result) {
          // initialize answered; ask for tools.
          safeWrite(JSON.stringify({
            jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
          }) + '\n');
        }
        if (msg.id === 2 && msg.result) {
          const names = (msg.result.tools ?? []).map((t) => t.name);
          const fileCount = indexedFileCount(repoDir);
          const allowlistEnv = cliEnv().CODEGRAPH_MCP_TOOLS;
          let expected;
          let profile;
          if (allowlistEnv && allowlistEnv.trim()) {
            const allow = new Set(allowlistEnv.split(',').map((s) => s.trim().replace(/^zcodegraph_/, '')).filter(Boolean));
            expected = FULL_MCP_TOOLS.filter((t) => allow.has(t.replace(/^zcodegraph_/, '')));
            profile = `env-allowlist (${expected.length} tools)`;
          } else if (fileCount > 0 && fileCount < TINY_REPO_FILE_THRESHOLD) {
            expected = TINY_REPO_MCP_TOOLS;
            profile = `tiny-repo gate (fileCount=${fileCount} < ${TINY_REPO_FILE_THRESHOLD})`;
          } else {
            expected = FULL_MCP_TOOLS;
            profile = `full surface (fileCount=${fileCount})`;
          }
          const missing = expected.filter((t) => !names.includes(t));
          const extra = names.filter((n) => !expected.includes(n));
          if (missing.length === 0 && extra.length === 0) {
            finish({ state: 'healthy', latencyMs: Date.now() - start, detail: `served ${names.length} tools matches ${profile}` });
          } else {
            finish({
              state: 'degraded',
              latencyMs: Date.now() - start,
              detail: `tool drift vs ${profile}: missing=[${missing.join(',')}] extra=[${extra.join(',')}]`,
            });
          }
        }
        if (msg.error) {
          finish({ state: 'failed', latencyMs: Date.now() - start, detail: `MCP error: ${JSON.stringify(msg.error).slice(0, 200)}` });
        }
      }
    });
    child.on('error', (err) => {
      finish({ state: 'failed', latencyMs: Date.now() - start, detail: `spawn failed: ${err.message}` });
    });
    child.on('exit', (code) => {
      if (!settled) finish({ state: 'failed', latencyMs: Date.now() - start, detail: `serve --mcp exited early (code ${code})` });
    });

    safeWrite(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'capability-probe', version: '1.0.0' },
      },
    }) + '\n');
  });
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    fail(err.message);
  }
  if (!fs.existsSync(BIN)) {
    fail(`dist/bin/zcodegraph.js not found at ${BIN}. Run \`npm run build\` first.`);
  }

  let repoDir;
  let repoSlug;
  let sha;
  if (process.env.CAPABILITY_PROBE_DIR) {
    repoDir = path.resolve(process.env.CAPABILITY_PROBE_DIR);
    repoSlug = path.basename(repoDir);
    sha = 'probe-dir';
    log(args, `probing pre-indexed dir: ${repoDir}`);
  } else {
    if (!args.repo) fail('positional <github-url> is required unless CAPABILITY_PROBE_DIR is set');
    const cloneInfo = ensureClone({
      repo: args.repo,
      ref: args.ref,
      sparse: args.sparse,
      corpusRoot: args.corpusRoot,
      quiet: args.quiet,
    });
    repoDir = cloneInfo.repoDir;
    repoSlug = args.repo.slug;
    sha = cloneInfo.sha;
    if (!fs.existsSync(path.join(repoDir, '.zcodegraph', 'zcodegraph.db'))) {
      runIndex({ repoDir, quiet: args.quiet });
    }
  }

  const startedAt = Date.now();
  const domains = {
    extraction: probeExtraction(repoDir),
    resolution: probeResolution(repoDir, args.callersSymbol),
    search: probeSearch(repoDir, args.queryTerm),
    context: probeContext(repoDir, args.exploreQuery),
    'mcp-tools': await probeMcpTools(repoDir),
    'dead-code': probeDeadCode(repoDir),
  };

  const states = Object.values(domains).map((d) => d.state);
  const overall = states.includes('failed') ? 'failed'
    : states.includes('degraded') ? 'degraded'
    : 'healthy';

  const report = emitReport({
    metric: 'capability-probes',
    repo: { slug: repoSlug },
    ref: sha,
    value: {
      overall,
      pass: overall !== 'failed',
      domains,
      probesTotalMs: Date.now() - startedAt,
    },
    evidence: {
      corpusDir: repoDir,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      fullMcpTools: FULL_MCP_TOOLS,
      tinyRepoMcpTools: TINY_REPO_MCP_TOOLS,
      tinyRepoFileThreshold: TINY_REPO_FILE_THRESHOLD,
    },
    out: args.out,
  });

  if (!report.value.pass) {
    process.stderr.write('[capability-probes] one or more domains FAILED — see report\n');
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`[capability-probes] ERROR: ${err.message}\n`);
    process.exit(1);
  });
}
