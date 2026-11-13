import { describe, expect, it } from 'vitest';
import { runPairedEvaluation } from '../src/eval/zra-paired-runtime';
import type { SharedRunConfig } from '../src/eval/zra-paired-core';

const config: SharedRunConfig = {
  taskId: 'isolated-symbol-union-v1',
  modelVersion: 'UNSET',
  prompt: 'trace the handler',
  toolSchema: 'codegraph-v1',
  indexSnapshot: 'fixed-corpus-commit',
  mcpToolSurface: 'explore-v1',
  responseSchema: 'concise-source-cited-v1',
};

describe('isolated ZRA retrieval adapter', () => {
  it('keeps A unchanged, uses the frozen C union, and gives S only a different candidate order', async () => {
    const { createIsolatedSymbolUnionRetrieval } = await import('../scripts/agent-eval/isolated-symbol-union.mjs');
    const groups = new Map(['a.ts', 'b.ts', 'c.ts'].map((file, index) => [file, {
      nodes: [{ name: `symbol-${index}` }], score: 3 - index,
    }]));
    const symbolGroups = new Map(['d.ts', 'e.ts', 'f.ts'].map((file) => [file, {
      count: 1, bm25: 1, names: ['handler'], kinds: ['function'], exported: [true],
    }]));
    const baselinePlan = { sortedFiles: [...groups.entries()], fileGroups: groups };
    const retrieve = createIsolatedSymbolUnionRetrieval({
      planBaseline: async () => baselinePlan,
      symbolRecall: () => ({
        files: ['d.ts', 'e.ts', 'f.ts'], byFile: symbolGroups, qTok: new Set(['handler']),
      }),
    });
    const result = await runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42, retrieve,
      execute: async () => ({ outcome: 'completed', toolCalls: [] }),
    });
    const [a, c, s] = result.executions;

    expect(result.status).toBe('completed');
    expect(a!.candidates).toEqual([...groups.entries()]);
    // Independent worked example of the frozen formula: position zero in
    // either list contributes .4, position one .36, and position two .32.
    // All symbol-only files therefore precede all plan-only files here.
    expect(c!.candidates.map(([file]) => file)).toEqual(['d.ts', 'e.ts', 'f.ts', 'a.ts', 'b.ts', 'c.ts']);
    expect(c!.candidates.find(([file]) => file === 'd.ts')![1]).toEqual({ nodes: [], score: 0 });
    expect(s!.payload).toBe(c!.payload);
    expect(s!.candidates).not.toEqual(c!.candidates);
    expect([...s!.candidates].sort((left, right) => left[0].localeCompare(right[0])))
      .toEqual([...c!.candidates].sort((left, right) => left[0].localeCompare(right[0])));
    expect(result.ledger.consumed('pilot')).toBe(3);
  });

  it('verifies the frozen C configuration without opening a corpus or building an index', async () => {
    const { verifyFrozenSymbolUnionCandidate } = await import('../scripts/agent-eval/isolated-symbol-union.mjs');
    expect(verifyFrozenSymbolUnionCandidate()).toEqual({
      candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
      rawSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      lineEndingNormalization: 'CRLF-to-LF-only',
      symbolTopK: 50,
      fileTopK: 10,
      unionRerank: '0.4*planPos + 0.4*symPos + 0.2*termAlign',
    });
  });
});
