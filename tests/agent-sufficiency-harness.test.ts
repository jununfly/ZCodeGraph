import { describe, expect, it } from 'vitest';
import { access, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { readFileSync as readFileSyncFromDisk, readdirSync as readdirSyncFromDisk } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  getAdapter,
  listAdapterIds,
  registerAdapter,
  runBaseline,
  sharedConfigFingerprint,
  withAndWithoutConfigs,
} from '../scripts/agent-eval/harness/runner.mjs';
import { createFakeAdapter } from '../scripts/agent-eval/harness/adapters/fake.mjs';

const HARNESS = path.join(__dirname, '..', 'scripts', 'agent-eval', 'harness');
const baseOptions = {
  corpus: 'corpus-1',
  prompt: 'How does X reach Y?',
  model: 'resolved-model-id',
  server: { command: 'zcodegraph', args: ['serve', '--mcp'] },
  runId: 'test-run',
};

const toolCalls = [
  { name: 'zcodegraph_explore', callId: 'c1', arguments: { query: 'X' } },
  { name: 'Read', callId: 'c2', arguments: { file_path: 'a.ts' } },
];

registerAdapter('fake', createFakeAdapter({ toolCalls, usage: { totalTokens: 120, credit: 0.4 }, turns: 3 }));
registerAdapter('fake-second', createFakeAdapter({ toolCalls: [], usage: {}, turns: 1 }));

describe('ADR-0016 decoupling criterion 1: no provider coupling in harness root', () => {
  it('contains no provider name or vendor transcript marker outside adapters/', () => {
    const forbidden = /claude|workbuddy|codebuddy|stream-json|\.claude/i;
    const files = readdirSyncFromDisk(HARNESS, { withFileTypes: true })
      .filter(entry => entry.isFile() && /\.(mjs|json)$/.test(entry.name))
      .map(entry => entry.name);
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) {
      const content = readFileSyncFromDisk(path.join(HARNESS, file), 'utf8');
      expect(content, `${file} must stay provider-neutral`).not.toMatch(forbidden);
    }
  });

  it('keeps with-vs-without as the only variable', () => {
    const configs = withAndWithoutConfigs({ command: 'zcodegraph' });
    expect(Object.keys(configs.with.mcpServers)).toEqual(['codegraph']);
    expect(configs.without.mcpServers).toEqual({});
  });
});

describe('ADR-0016 decoupling criteria 2 and 3', () => {
  it('runs a complete baseline with a process-free adapter', async () => {
    const result = await runBaseline({ ...baseOptions, adapterId: 'fake' });
    expect(result.status).toBe('valid');
    expect(Object.keys(result.arms)).toEqual(['with', 'without']);
    for (const arm of ['with', 'without']) {
      const record = result.arms[arm];
      expect(record.status).toBe('valid');
      expect(record.toolCallCount).toBe(2);
      expect(record.readGrepFallbackDisplacement).toBeNull();
      expect(record.graphStats).toBeNull();
      expect(record.fallbackTaxonomy).toBeNull();
      expect(record.humanReview).toBeNull();
      expect(record.sharedConfigFingerprint).toBe(
        sharedConfigFingerprint({ corpus: baseOptions.corpus, prompt: baseOptions.prompt, model: baseOptions.model, toolSchema: '' }),
      );
    }
    expect(result.arms.with.sharedConfigFingerprint).toBe(result.arms.without.sharedConfigFingerprint);
    expect(result.totals.totalTokens).toBe(240);
  });

  it('shares explicit execution settings across both arms and fingerprints them', async () => {
    const received: any[] = [];
    registerAdapter('execution-settings', {
      async run(options: any) {
        received.push(options);
        return {
          exitCode: 0, toolCalls: [], turns: 1, usage: {},
          model: options.model, finalResponse: 'synthetic response, not DES evidence',
        };
      },
    });
    const high = await runBaseline({
      ...baseOptions, adapterId: 'execution-settings', execution: { effort: 'high' },
    });
    const low = await runBaseline({
      ...baseOptions, adapterId: 'execution-settings', execution: { effort: 'low' },
    });

    expect(high.status).toBe('valid');
    expect(received.slice(0, 2).map(options => options.effort)).toEqual(['high', 'high']);
    expect(high.arms.with.provider.requestedEffort).toBe('high');
    expect(high.arms.with.provider.resolvedEffort).toBeNull();
    expect(high.arms.with.sharedConfigFingerprint).toBe(high.arms.without.sharedConfigFingerprint);
    expect(high.arms.with.sharedConfigFingerprint).not.toBe(low.arms.with.sharedConfigFingerprint);
  });

  it('fails closed when the runtime reports a different reasoning effort', async () => {
    registerAdapter('effort-mismatch', createFakeAdapter({ effort: 'low' }));
    const result = await runBaseline({
      ...baseOptions, adapterId: 'effort-mismatch', execution: { effort: 'high' },
    });
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toBe('with: runtime effort differs from requested effort');
    expect(result.diagnostics.attemptedArms).toEqual(['with']);
  });

  it('supports another adapter through registration alone', async () => {
    expect(listAdapterIds()).toEqual(expect.arrayContaining(['fake', 'fake-second']));
    expect(getAdapter('fake-second')).toBeDefined();
    const result = await runBaseline({ ...baseOptions, adapterId: 'fake-second' });
    expect(result.status).toBe('valid');
    expect(result.arms.with.toolCallCount).toBe(0);
  });

  it('fingerprints the declared retrieval candidate and snapshot preparation across both arms', async () => {
    const retrieval = {
      arm: 'C', candidateSha256: 'd'.repeat(64),
      preparation: {
        kind: 'snapshot-bound-c-explore-preparation-v1',
        snapshotFingerprint: 'a'.repeat(64),
        sourceDbSha256: 'b'.repeat(64),
        symbolIndexSha256: 'c'.repeat(64),
      },
    };
    const first = await runBaseline({ ...baseOptions, adapterId: 'fake', retrieval });
    const second = await runBaseline({
      ...baseOptions, adapterId: 'fake',
      retrieval: { ...retrieval, preparation: { ...retrieval.preparation, sourceDbSha256: 'e'.repeat(64) } },
    });
    expect(first.status).toBe('valid');
    expect(first.arms.with.sharedConfigFingerprint).toBe(first.arms.without.sharedConfigFingerprint);
    expect(first.arms.with.sharedConfigFingerprint).not.toBe(second.arms.with.sharedConfigFingerprint);
    expect(first.arms.with.sharedConfigFingerprint).toBe(sharedConfigFingerprint({
      ...baseOptions, toolSchema: '', retrieval,
    }));
  });

  it('resolves the model per run instead of freezing an identifier', async () => {
    const first = await runBaseline({ ...baseOptions, adapterId: 'fake' });
    const second = await runBaseline({ ...baseOptions, adapterId: 'fake', model: 'another-model' });
    expect(first.arms.with.provider.model).toBe(baseOptions.model);
    expect(second.arms.with.provider.model).toBe('another-model');
    expect(first.arms.with.sharedConfigFingerprint).not.toBe(second.arms.with.sharedConfigFingerprint);
  });
});

describe('ADR-0016 D6 failure semantics discard the whole run', () => {
  it.each([
    ['non-zero exit', { exitCode: 1 }],
    ['runtime-reported error', { exitCode: 0, runtimeError: 'Authentication required' }],
    ['missing transcript', { exitCode: 0, toolCalls: null }],
    ['missing final response', { finalResponse: '' }],
    ['missing runtime model', { model: null }],
    ['fingerprint mismatch', { sharedConfigFingerprint: 'wrong' }],
  ])('invalidates both arms on %s', async (_label, override) => {
    registerAdapter('failing', createFakeAdapter({ toolCalls, ...override }));
    const result = await runBaseline({ ...baseOptions, adapterId: 'failing' });
    expect(result.status).toBe('invalid');
    expect(result.arms.with.status).toBe('invalid');
    expect(result.arms.without.status).toBe('invalid');
    expect(result.arms.with.invalidReason).toBe(result.arms.without.invalidReason);
    if (override.runtimeError) {
      expect(result.invalidReason).toBe(`with: ${override.runtimeError}`);
      expect(result.diagnostics.attemptedArms).toEqual(['with']);
    }
  });

  it('persists a valid transcript but never persists a discarded partial run', async () => {
    const validDir = await mkdtemp(path.join(tmpdir(), 'zcg-baseline-valid-'));
    const valid = await runBaseline({
      ...baseOptions, adapterId: 'fake', runId: 'complete-run', outDir: validDir,
    });
    expect(valid.status).toBe('valid');
    const persisted = JSON.parse(await readFile(path.join(validDir, 'complete-run.json'), 'utf8'));
    expect(persisted).toEqual(valid);

    registerAdapter('fails-after-first-arm', createFakeAdapter(({ arm }) => ({
      toolCalls,
      ...(arm === 'without' ? { exitCode: 1 } : {}),
    })));
    const invalidDir = await mkdtemp(path.join(tmpdir(), 'zcg-baseline-invalid-'));
    const invalid = await runBaseline({
      ...baseOptions, adapterId: 'fails-after-first-arm', runId: 'discarded-run', outDir: invalidDir,
    });
    expect(invalid.status).toBe('invalid');
    expect(invalid.arms.with.toolCallCount).toBe(2);
    await expect(access(path.join(invalidDir, 'discarded-run.json'))).rejects.toThrow();
    expect(await readdir(invalidDir)).toEqual([]);
  });

  it('retains provider-neutral failure diagnostics without making a partial arm valid', async () => {
    registerAdapter('diagnostic-failure', createFakeAdapter({
      exitCode: 1,
      stderrTail: 'launcher exited before streaming output',
      transcriptPath: 'C:/temp/with.jsonl',
      toolCalls: [{ name: 'Read', callId: 'discarded', arguments: {} }],
    }));
    const result = await runBaseline({ ...baseOptions, adapterId: 'diagnostic-failure' });

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.arms).toEqual([{
      arm: 'with',
      outcome: 'attempted',
      exitCode: 1,
      stderrTail: 'launcher exited before streaming output',
      transcriptPath: 'C:/temp/with.jsonl',
    }]);
    expect(result.arms.with.invalidReason).toBe(result.arms.without.invalidReason);
    expect(result.arms.without.toolCallCount).toBeUndefined();
    expect(result.arms.without.humanReview).toBeNull();
    expect(result.arms.without.status).toBe('invalid');
    expect(result.diagnostics.arms).toHaveLength(1);
    expect(result.diagnostics.arms[0]).not.toHaveProperty('toolCalls');
    expect(result.diagnostics.arms[0]).not.toHaveProperty('finalResponse');
  });

  it('hard-stops when the accumulated budget ceiling is crossed', async () => {
    const result = await runBaseline({ ...baseOptions, adapterId: 'fake', budget: { credit: 0.1 } });
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/hard budget exceeded/);
    expect(result.arms.without.status).toBe('invalid');
  });

  it('rejects a run without corpus, prompt or model', async () => {
    const result = await runBaseline({ adapterId: 'fake', corpus: 'c', prompt: 'p' });
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/model are required/);
  });
});

describe('BaselineTranscript schema', () => {
  it('requires the DES evidence fields and keeps human review Human-owned', () => {
    const schema = JSON.parse(readFileSyncFromDisk(path.join(HARNESS, 'transcript-schema.json'), 'utf8'));
    expect(schema.required).toEqual(expect.arrayContaining([
      'corpus', 'provider', 'toolCalls', 'toolCallCount',
      'readGrepFallbackDisplacement', 'usage', 'sharedConfigFingerprint', 'status', 'humanReview',
    ]));
    expect(schema.required).toContain('finalResponse');
    expect(schema.properties.finalResponse).toEqual({ type: 'string', minLength: 1 });
    expect(schema.properties.provider.properties.model.description).toMatch(/never hard-coded/);
    expect(schema.properties.humanReview.type).toContain('null');
    for (const field of ['readGrepFallbackDisplacement', 'graphStats', 'fallbackTaxonomy']) {
      expect(schema.properties[field].type).toEqual(['object', 'null']);
    }
    expect(schema.properties.mcp.required).toEqual([
      'servers', 'advertisedCodeGraphTools', 'codeGraphToolCallCount',
    ]);
    expect(schema.properties.mcp.properties.codeGraphToolCallCount.minimum).toBe(0);
  });
});
