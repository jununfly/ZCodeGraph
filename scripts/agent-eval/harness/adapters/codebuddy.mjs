// First concrete Adapter: the WorkBuddy-shipped headless CodeBuddy CLI Runner
// (ADR-0016 D3). All provider names and vendor transcript handling live here.
//
// Calibration note: the CLI's --output-format stream-json stdout and the
// on-disk session JSONL are different surfaces. This adapter normalizes the
// function_call-shaped events it receives; a first real run must confirm the
// exact stdout envelope. That calibration cannot affect the harness contract.

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CLI = process.env.CODEBUDDY_CLI || 'codebuddy';

function normalize(lines) {
  const toolCalls = [];
  let model;
  let usage = {};
  let turns = 0;
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
    const data = event.providerData;
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
  return { toolCalls, model, usage, turns };
}

export async function run({
  prompt, model, maxTurns = 40, mcpConfig, arm,
  timeoutMs = 120000, spawnImpl = spawn,
} = {}) {
  if (!prompt || !model) return null;
  const dir = await mkdtemp(path.join(tmpdir(), 'cg-baseline-'));
  const configPath = path.join(dir, 'mcp.json');
  const transcriptPath = path.join(dir, `${arm}.jsonl`);
  await writeFile(configPath, JSON.stringify(mcpConfig), 'utf8');

  const args = [
    CLI, '-p', prompt,
    '--output-format', 'stream-json',
    '--mcp-config', configPath,
    '--model', model,
    '--max-turns', String(maxTurns),
    '--permission-mode', 'dontAsk',
  ];

  return new Promise(resolve => {
    const child = spawnImpl(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { child.kill(); finish(124); }
    }, timeoutMs);

    function finish(exitCode) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const lines = out.split(/\r?\n/);
      void writeFile(transcriptPath, out, 'utf8').catch(() => undefined);
      const parsed = normalize(lines);
      resolve({
        exitCode,
        transcriptPath,
        stderrTail: err.slice(-2000),
        ...parsed,
        model: parsed.model ?? model,
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
