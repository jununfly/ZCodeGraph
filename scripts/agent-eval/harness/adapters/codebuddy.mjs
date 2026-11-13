// First concrete Adapter: the WorkBuddy-shipped headless CodeBuddy CLI Runner
// (ADR-0016 D3). All provider names and vendor transcript handling live here.
//
// Calibration note: the CLI's --output-format stream-json stdout and the
// on-disk session JSONL are different surfaces. This adapter normalizes the
// function_call-shaped events it receives; a first real run must confirm the
// exact stdout envelope. That calibration cannot affect the harness contract.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { analyzeFallback } from '../fallback-taxonomy.mjs';
import { analyzeToolAdoption } from '../tool-adoption-metrics.mjs';

const CLI = 'codebuddy';

// Headless mode still starts an internal loopback HTTP service. The CLI's
// --port flag only configures explicit --serve, so isolate this process from
// a WorkBuddy-owned inherited SERVER__PORT instead of touching that process.
async function reserveLoopbackPort() {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('loopback port unavailable');
    return String(address.port);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function normalize(lines) {
  const toolCalls = [];
  const toolResults = [];
  const mcpServers = [];
  const advertisedCodeGraphTools = new Set();
  let model;
  let usage = {};
  let turns = 0;
  let effort;
  let finalResponse = '';
  let runtimeError = '';
  function addToolResult(callId, output) {
    if (typeof callId !== 'string' || !callId) return;
    if (typeof output === 'string') {
      try {
        const envelope = JSON.parse(output);
        if (Array.isArray(envelope) && envelope.every(item =>
          item?.type === 'text' && typeof item.text === 'string')) {
          output = envelope;
        }
      } catch {
        // Ordinary tool output that only resembles an envelope is kept verbatim.
      }
    }
    let text;
    if (typeof output === 'string') text = output;
    else if (Array.isArray(output)) {
      const parts = output.map(item => {
        if (typeof item === 'string') return item;
        return item?.type === 'text' && typeof item.text === 'string' ? item.text : null;
      });
      if (parts.some(part => part === null)) return;
      text = parts.join('\n');
    } else if (output?.type === 'text' && typeof output.text === 'string') text = output.text;
    if (typeof text === 'string') {
      try {
        const envelope = JSON.parse(text);
        if (Array.isArray(envelope) && envelope.every(item =>
          item?.type === 'text' && typeof item.text === 'string')) {
          text = envelope.map(item => item.text).join('\n');
        }
      } catch {
        // Preserve non-JSON tool output exactly as observed.
      }
    }
    if (text !== undefined) toolResults.push({ callId, text });
  }
  for (const line of lines) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'function_call') {
      toolCalls.push({
        name: event.name,
        callId: event.callId,
        arguments: event.arguments,
        timestamp: event.timestamp,
      });
      turns += 1;
    }
    if (['function_call_output', 'tool_result', 'tool_result_event'].includes(event.type)) {
      addToolResult(event.call_id ?? event.callId ?? event.tool_use_id, event.output ?? event.result ?? event.content);
    }
    if (event.type === 'user' && event.message) {
      for (const item of Array.isArray(event.message.content) ? event.message.content : []) {
        if (item?.type === 'tool_result') addToolResult(item.tool_use_id, item.content);
      }
    }
    if (event.type === 'system' && typeof event.model === 'string') model = event.model;
    if (event.type === 'system' && event.subtype === 'init') {
      for (const server of Array.isArray(event.mcp_servers) ? event.mcp_servers : []) {
        if (typeof server?.name === 'string' && typeof server?.status === 'string') {
          mcpServers.push({ name: server.name, status: server.status });
        }
      }
      for (const tool of Array.isArray(event.tools) ? event.tools : []) {
        if (typeof tool === 'string' && tool.startsWith('mcp__codegraph__')) {
          advertisedCodeGraphTools.add(tool);
        }
      }
    }

    for (const container of [event, event.message, event.providerData]) {
      if (typeof container?.effort === 'string') effort = container.effort;
      else if (typeof container?.reasoning_effort === 'string') effort = container.reasoning_effort;
    }
    if (event.type === 'assistant' && event.message) {
      const message = event.message;
      if (typeof message.model === 'string') model = message.model;
      if (message.usage) {
        usage.promptTokens = Number(message.usage.input_tokens ?? message.usage.prompt_tokens ?? 0);
        usage.completionTokens = Number(message.usage.output_tokens ?? message.usage.completion_tokens ?? 0);
        usage.totalTokens = Number(message.usage.total_tokens ?? usage.promptTokens + usage.completionTokens);
      }
      const content = Array.isArray(message.content) ? message.content : [];
      const text = content
        .filter(item => item?.type === 'text' && typeof item.text === 'string')
        .map(item => item.text)
        .join('\n');
      if (text) finalResponse = text;
      for (const item of content) {
        if (item?.type !== 'tool_use') continue;
        toolCalls.push({
          name: item.name,
          callId: item.id,
          arguments: item.input,
          timestamp: event.__timestamp,
        });
      }
    }
    const data = event.providerData;
    if (event.type === 'result') {
      if (event.is_error === true || (event.subtype && event.subtype !== 'success')) {
        runtimeError = Array.isArray(event.errors) && event.errors.length
          ? event.errors.map(String).join('; ')
          : `runtime result: ${event.subtype ?? 'error'}`;
      }
      if (typeof event.result === 'string') finalResponse = event.result;
      if (typeof event.model === 'string') model = event.model;
      if (event.total_cost_usd !== undefined) usage.credit = Number(event.total_cost_usd);
      if (event.usage) {
        usage.promptTokens = Number(event.usage.input_tokens ?? event.usage.prompt_tokens ?? 0);
        usage.completionTokens = Number(event.usage.output_tokens ?? event.usage.completion_tokens ?? 0);
        usage.totalTokens = Number(event.usage.total_tokens ?? usage.promptTokens + usage.completionTokens);
      }
      if (event.num_turns !== undefined) turns = Number(event.num_turns);
    }
    if (data?.model) model = data.model;
    if (data?.rawUsage) {
      usage = {
        promptTokens: data.rawUsage.prompt_tokens ?? 0,
        completionTokens: data.rawUsage.completion_tokens ?? 0,
        totalTokens: data.rawUsage.total_tokens ?? 0,
        credit: data.rawUsage.credit ?? 0,
      };
    }
  }
  const { readGrepFallbackDisplacement, fallbackTaxonomy } = analyzeFallback(toolCalls);
  const { graphStats } = analyzeToolAdoption(toolCalls);

  return {
    toolCalls,
    toolResults,
    mcp: {
      servers: mcpServers,
      advertisedCodeGraphTools: [...advertisedCodeGraphTools],
      codeGraphToolCallCount: toolCalls.filter(
        call => typeof call.name === 'string' && call.name.startsWith('mcp__codegraph__'),
      ).length,
    },
    model,
    usage,
    turns,
    finalResponse,
    ...(readGrepFallbackDisplacement !== undefined ? { readGrepFallbackDisplacement } : {}),
    ...(fallbackTaxonomy !== undefined ? { fallbackTaxonomy } : {}),
    ...(graphStats !== undefined ? { graphStats } : {}),
    ...(effort ? { effort } : {}),
    ...(runtimeError ? { runtimeError } : {}),
  };
}

export async function run({
  prompt, model, effort, maxTurns = 40, mcpConfig, arm,
  timeoutMs = 120000, spawnImpl = spawn, isolation = null,
  cliPath = process.env.CODEBUDDY_CLI || CLI,
  cliFlavor = 'workbuddy-lite',
} = {}) {
  if (!prompt || !model || !cliPath) return null;
  if (effort !== undefined && !['minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) {
    throw new Error(`unsupported reasoning effort: ${effort}`);
  }
  const dir = await mkdtemp(path.join(tmpdir(), 'cg-baseline-'));
  const configPath = path.join(dir, 'mcp.json');
  const transcriptPath = path.join(dir, `${arm}.jsonl`);
  await writeFile(configPath, JSON.stringify(mcpConfig), 'utf8');

  if (!['workbuddy-lite', 'standalone'].includes(cliFlavor)) {
    throw new Error(`unsupported CodeBuddy CLI flavor: ${cliFlavor}`);
  }
  if (cliFlavor === 'standalone' && ['.cmd', '.bat'].includes(path.extname(cliPath).toLowerCase())) {
    throw new Error('Use the standalone .exe or package bin/codebuddy JS entry, not a shell shim.');
  }
  const standaloneExecutable = cliFlavor === 'standalone' && path.extname(cliPath).toLowerCase() === '.exe';
  const args = [
    ...(standaloneExecutable ? [] : [cliPath]), '-p', prompt,
    '--output-format', 'stream-json',
    '--mcp-config', configPath,
    '--strict-mcp-config',
    '--setting-sources', '',
    '--tools', [
      // Built-in tools the model may use for investigation
      'Read', 'Grep', 'Glob',
      // CodeGraph MCP tools exposed to the model's function schemas
      'mcp__codegraph__zcodegraph_explore',
      'mcp__codegraph__zcodegraph_node',
      'mcp__codegraph__zcodegraph_search',
      'mcp__codegraph__zcodegraph_callers',
      'mcp__codegraph__zcodegraph_callees',
      'mcp__codegraph__zcodegraph_impact',
      'mcp__codegraph__zcodegraph_files',
      'mcp__codegraph__zcodegraph_status',
    ].join(','),
    '--allowedTools', 'Read,Grep,Glob,mcp__codegraph__*',
    '--disallowedTools', ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash', 'Task'].join(','),
    '--model', model,
    ...(effort ? ['--effort', effort] : []),
    '--max-turns', String(maxTurns),
    '--permission-mode', 'dontAsk',
    '--no-session-persistence',
  ];

  const env = { ...(isolation ? isolation.env : process.env) };
  if (cliFlavor === 'workbuddy-lite') {
    env.CODEBUDDY_FORCE_LITE_WB_BUNDLE = '1';
  } else {
    delete env.CODEBUDDY_FORCE_LITE_WB_BUNDLE;
  }
  env.SERVER__PORT = await reserveLoopbackPort();

  return new Promise(resolve => {
    const child = spawnImpl(standaloneExecutable ? cliPath : process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      ...(isolation ? { cwd: isolation.corpusDir } : {}),
    });
    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { child.kill(); finish(124); }
    }, timeoutMs);

    async function finish(exitCode) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const lines = out.split(/\r?\n/);
      let transcriptError = null;
      try {
        await writeFile(transcriptPath, out, 'utf8');
      } catch (error) {
        transcriptError = error instanceof Error ? error.message : String(error);
      }
      const parsed = normalize(lines);
      resolve({
        exitCode: transcriptError ? 1 : exitCode,
        transcriptPath,
        stderrTail: [
          err.slice(-2000),
          transcriptError ? `transcript persistence failed: ${transcriptError}` : '',
        ].filter(Boolean).join('\n'),
        ...parsed,
      });
    }

    child.stdout?.on('data', chunk => { out += String(chunk); });
    child.stderr?.on('data', chunk => { err += String(chunk); });
    child.on('error', () => finish(1));
    child.on('close', code => finish(code ?? 1));
  });
}

export async function readTranscript(transcriptPath) {
  const text = await readFile(transcriptPath, 'utf8');
  return normalize(text.split(/\r?\n/));
}
