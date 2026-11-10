import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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
    const files = readdirSync(HARNESS, { withFileTypes: true })
      .filter(entry => entry.isFile() && /\.(mjs|json)$/.test(entry.name))
      .map(entry => entry.name);
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const file of files) {
      const content = readFileSync(path.join(HARNESS, file), 'utf8');
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
      expect(record.humanReview).toBeNull();
      expect(record.sharedConfigFingerprint).toBe(
        sharedConfigFingerprint({ corpus: baseOptions.corpus, prompt: baseOptions.prompt, model: baseOptions.model, toolSchema: '' }),
      );
    }
    expect(result.arms.with.sharedConfigFingerprint).toBe(result.arms.without.sharedConfigFingerprint);
    expect(result.totals.totalTokens).toBe(240);
  });

  it('supports another adapter through registration alone', async () => {
    expect(listAdapterIds()).toEqual(expect.arrayContaining(['fake', 'fake-second']));
    expect(getAdapter('fake-second')).toBeDefined();
    const result = await runBaseline({ ...baseOptions, adapterId: 'fake-second' });
    expect(result.status).toBe('valid');
    expect(result.arms.with.toolCallCount).toBe(0);
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
    ['missing transcript', { exitCode: 0, toolCalls: null }],
    ['fingerprint mismatch', { sharedConfigFingerprint: 'wrong' }],
  ])('invalidates both arms on %s', async (_label, override) => {
    registerAdapter('failing', createFakeAdapter({ toolCalls, ...override }));
    const result = await runBaseline({ ...baseOptions, adapterId: 'failing' });
    expect(result.status).toBe('invalid');
    expect(result.arms.with.status).toBe('invalid');
    expect(result.arms.without.status).toBe('invalid');
    expect(result.arms.with.invalidReason).toBe(result.arms.without.invalidReason);
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
    const schema = JSON.parse(readFileSync(path.join(HARNESS, 'transcript-schema.json'), 'utf8'));
    expect(schema.required).toEqual(expect.arrayContaining([
      'corpus', 'provider', 'toolCalls', 'toolCallCount',
      'readGrepFallbackDisplacement', 'usage', 'sharedConfigFingerprint', 'status', 'humanReview',
    ]));
    expect(schema.properties.humanReview.type).toContain('null');
    expect(schema.properties.provider.properties.model.description).toMatch(/never hard-coded/);
  });
});
