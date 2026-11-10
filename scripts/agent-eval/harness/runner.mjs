#!/usr/bin/env node
// Provider-agnostic Agent Sufficiency baseline harness (ADR-0016).
// Rule: this file and every other root-level harness file contain no provider
// name and no vendor transcript marker. Those live exclusively in adapters/.

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const adapters = new Map();

export function registerAdapter(id, adapter) {
  if (typeof id !== 'string' || !id) throw new Error('adapter id required');
  if (typeof adapter?.run !== 'function') throw new Error('adapter must expose run()');
  adapters.set(id, adapter);
}

export function getAdapter(id) {
  const found = adapters.get(id);
  if (!found) throw new Error(`unknown adapter id: ${id}`);
  return found;
}

export function listAdapterIds() {
  return [...adapters.keys()];
}

/** Fingerprint of the fields every arm must share; MCP config is the only variable. */
export function sharedConfigFingerprint({ corpus, prompt, model, toolSchema }) {
  const canonical = JSON.stringify({ corpus, prompt, model, toolSchema });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function withAndWithoutConfigs(server) {
  return {
    with: { mcpServers: server ? { codegraph: server } : {} },
    without: { mcpServers: {} },
  };
}

function emptyArm(runId, arm, reason) {
  return {
    schemaVersion: '1.0',
    runId,
    arm,
    status: 'invalid',
    invalidReason: reason,
    humanReview: null,
  };
}

/**
 * Drive one with-vs-without baseline. Any arm failure invalidates and discards
 * the whole run (ADR-0015 D4); partial arms are never retained as evidence.
 */
export async function runBaseline(options = {}) {
  const {
    adapterId, corpus, prompt, model, toolSchema = '',
    server = null, maxTurns = 40, budget = null,
    outDir = null, runId = `baseline-${Date.now()}`,
    promptId = '', snapshot = '', adapterOptions = {},
  } = options;

  const totals = { credit: 0, totalTokens: 0, turns: 0 };
  if (!corpus || !prompt || !model) {
    const reason = 'corpus, prompt and model are required';
    return {
      runId, status: 'invalid', invalidReason: reason, totals,
      arms: { with: emptyArm(runId, 'with', reason), without: emptyArm(runId, 'without', reason) },
    };
  }

  const adapter = getAdapter(adapterId);
  const configs = withAndWithoutConfigs(server);
  const fingerprint = sharedConfigFingerprint({ corpus, prompt, model, toolSchema });
  const arms = {};
  let failure = null;

  for (const arm of ['with', 'without']) {
    let result;
    try {
      result = await adapter.run({
        arm, prompt, model, maxTurns, mcpConfig: configs[arm], ...adapterOptions,
      });
    } catch (error) {
      failure = `${arm}: adapter threw ${error.message}`;
      break;
    }
    if (!result || result.exitCode !== 0 || !Array.isArray(result.toolCalls)) {
      failure = `${arm}: non-zero exit, timeout, or missing transcript`;
      break;
    }
    if (result.sharedConfigFingerprint && result.sharedConfigFingerprint !== fingerprint) {
      failure = `${arm}: configuration fingerprint mismatch`;
      break;
    }

    totals.credit += Number(result.usage?.credit ?? 0);
    totals.totalTokens += Number(result.usage?.totalTokens ?? 0);
    totals.turns += Number(result.turns ?? 0);
    if (budget && (
      (budget.credit !== undefined && totals.credit > budget.credit)
      || (budget.totalTokens !== undefined && totals.totalTokens > budget.totalTokens)
      || (budget.turns !== undefined && totals.turns > budget.turns)
    )) {
      failure = `${arm}: hard budget exceeded`;
      break;
    }

    arms[arm] = {
      schemaVersion: '1.0',
      runId,
      arm,
      corpus: { id: corpus, prompt, promptId, snapshot },
      provider: { adapterId, model: result.model ?? model },
      toolCalls: result.toolCalls,
      toolCallCount: result.toolCalls.length,
      readGrepFallbackDisplacement: result.readGrepFallbackDisplacement ?? { read: 0, grep: 0, notes: '' },
      usage: result.usage ?? {},
      humanReview: null,
      sharedConfigFingerprint: fingerprint,
      graphStats: result.graphStats ?? {},
      fallbackTaxonomy: result.fallbackTaxonomy ?? {},
      status: 'valid',
    };
  }

  let outputArms = arms;
  if (failure) {
    outputArms = {};
    for (const arm of ['with', 'without']) {
      outputArms[arm] = arms[arm]
        ? { ...arms[arm], status: 'invalid', invalidReason: failure }
        : emptyArm(runId, arm, failure);
    }
  }

  const output = {
    runId,
    status: failure ? 'invalid' : 'valid',
    invalidReason: failure,
    arms: outputArms,
    totals,
  };

  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, `${runId}.json`), JSON.stringify(output, null, 2), 'utf8');
  }
  return output;
}
