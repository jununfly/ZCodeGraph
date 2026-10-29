/**
 * Walkthrough probe for roadmap 1-2-1: spawn `zcodegraph serve --mcp` in a
 * crafted dirty/clean project dir, do the MCP handshake, fire one tool call,
 * and report the EXACT text the agent would see.
 *
 * Usage:
 *   node scripts/probe-mcp-init-failure.mjs <scenario> <projectDir>
 *
 * Scenarios:
 *   1  .zcodegraph/ exists, DB locked (we hold an exclusive lock on it)
 *   2  .zcodegraph/ exists, DB is 0 bytes (corrupt)
 *   3  .zcodegraph/ exists, directory read-only (chmod 555)
 *   4  node_modules/tree-sitter-wasms lua wasm deleted → status shows it
 *   5  no .zcodegraph/ at all → "Run zcodegraph index" hint
 *
 * The probe exits 0 if the agent-visible output contains the expected
 * keywords for that scenario, 1 otherwise. Stdout is a structured report
 * (one JSON per scenario) so we can paste it into the roadmap decision log.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(HERE, '../dist/bin/zcodegraph.js');

const scenario = process.argv[2];
const projectDir = process.argv[3];

if (!scenario || !projectDir) {
  console.error('usage: probe-mcp-init-failure.mjs <scenario 1-5> <projectDir>');
  process.exit(2);
}

// ---------- helpers ----------

function rpc(id, method, params) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
}

async function talkToMcp(child, toolName, toolArgs) {
  let stdoutBuf = '';
  let stderrBuf = '';
  const responses = new Map();
  let nextId = 1;

  child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString('utf8');
    let idx;
    while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
      const line = stdoutBuf.slice(0, idx);
      stdoutBuf = stdoutBuf.slice(idx + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined) responses.set(msg.id, msg);
      } catch { /* not json */ }
    }
  });
  child.stderr.on('data', (chunk) => { stderrBuf += chunk.toString('utf8'); });

  const send = (method, params) => {
    const id = nextId++;
    child.stdin.write(rpc(id, method, params));
    return id;
  };
  const waitFor = async (id, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (responses.has(id)) return responses.get(id);
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`timeout waiting for id=${id}`);
  };

  // handshake
  const initId = send('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'probe', version: '0.0.0' },
    rootUri: `file://${projectDir.replace(/\\/g, '/')}`,
  });
  await waitFor(initId);
  child.stdin.write(rpc(0, 'notifications/initialized', undefined).replace('"id":0,', '').replace(',"id":0', ''));

  // Give the engine a beat to attempt (and possibly fail) the project open.
  await new Promise((r) => setTimeout(r, 800));

  const callId = send('tools/call', { name: toolName, arguments: toolArgs });
  const callResp = await waitFor(callId);

  return { toolResult: callResp.result, stderr: stderrBuf };
}

// ---------- scenario runners ----------

async function runScenario(toolName, toolArgs) {
  const child = spawn(process.execPath, [BIN, 'serve', '--mcp'], {
    cwd: projectDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ZCG_NO_DAEMON: '1' },
  });
  try {
    return await talkToMcp(child, toolName, toolArgs);
  } finally {
    child.kill('SIGTERM');
    // Give it a moment to exit so the next scenario doesn't race the port/lock.
    await new Promise((r) => setTimeout(r, 200));
  }
}

function expectKeywords(text, keywords, label) {
  const hits = keywords.filter((k) => text.includes(k));
  const missing = keywords.filter((k) => !text.includes(k));
  return { label, hits, missing, pass: missing.length === 0 };
}

// ---------- main ----------

const result = await runScenario(
  scenario === '4' ? 'zcodegraph_status' : 'zcodegraph_search',
  scenario === '4' ? {} : { query: 'foo' },
);

const toolText = (result.toolResult?.content ?? [])
  .map((c) => c.text ?? '')
  .join('\n');
const combined = toolText + '\n--- stderr ---\n' + result.stderr;

let checks;
switch (scenario) {
  case '1':
  case '2':
  case '3':
    // Init open failure → tools/call must surface underlying + recovery
    checks = [
      expectKeywords(toolText, ['failed to open it'], 'contains "failed to open it"'),
      expectKeywords(toolText, ['Underlying error'], 'contains "Underlying error"'),
      expectKeywords(toolText, ['zcodegraph index'], 'contains "zcodegraph index" recovery'),
    ];
    break;
  case '4':
    // wasm missing → status must list Unavailable grammars
    checks = [
      expectKeywords(toolText, ['Unavailable grammars'], 'contains "Unavailable grammars"'),
      expectKeywords(toolText, ['lua'], 'names lua as unavailable'),
      expectKeywords(toolText, ['NOT parsed'], 'states NOT parsed'),
    ];
    break;
  case '5':
    // No .zcodegraph/ → original "No CodeGraph project is loaded" wording
    checks = [
      expectKeywords(toolText, ['No CodeGraph project is loaded'], 'contains "No CodeGraph project is loaded"'),
      expectKeywords(toolText, ['--path'], 'mentions --path fix'),
    ];
    break;
  default:
    console.error(`unknown scenario: ${scenario}`);
    process.exit(2);
}

const report = {
  scenario,
  projectDir,
  pass: checks.every((c) => c.pass),
  checks,
  agentVisible: toolText,
  stderrTail: result.stderr.split('\n').slice(-10).join('\n'),
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
