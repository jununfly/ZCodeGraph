import { describe, expect, it } from 'vitest';
import {
  assertConfigParity,
  assertSamePayload,
  computeConfigFingerprint,
  makeSeededRandom,
  permuteWithFixedSeed,
  type ArmRun,
  type SharedRunConfig,
} from '../src/eval/zra-paired-core';

const config = (overrides: Partial<SharedRunConfig> = {}): SharedRunConfig => ({
  taskId: 'T-1',
  modelVersion: 'model-v1',
  prompt: 'answer the question',
  toolSchema: 'schema-v1',
  indexSnapshot: 'index-sha',
  mcpToolSurface: 'tools-v1',
  responseSchema: 'response-v1',
  ...overrides,
});

describe('fixed-seed permutation (S arm)', () => {
  it('keeps the same items and count without mutating the input', () => {
    const base = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'];
    const original = [...base];
    const permuted = permuteWithFixedSeed(base, 20261110);

    expect(base).toEqual(original);
    expect(permuted).toHaveLength(base.length);
    expect(() => assertSamePayload(base, permuted)).not.toThrow();
  });

  it('is reproducible for the same seed', () => {
    const base = Array.from({ length: 12 }, (_, index) => `f${index}.ts`);
    expect(permuteWithFixedSeed(base, 7)).toEqual(permuteWithFixedSeed(base, 7));
  });

  it('changes the order when the seed changes', () => {
    const base = Array.from({ length: 12 }, (_, index) => `f${index}.ts`);
    expect(permuteWithFixedSeed(base, 7)).not.toEqual(permuteWithFixedSeed(base, 8));
  });

  it('handles empty and single-item inputs', () => {
    expect(permuteWithFixedSeed([], 1)).toEqual([]);
    expect(permuteWithFixedSeed(['only.ts'], 1)).toEqual(['only.ts']);
  });

  it('produces a deterministic PRNG stream', () => {
    const left = makeSeededRandom(42);
    const right = makeSeededRandom(42);
    expect([left(), left(), left()]).toEqual([right(), right(), right()]);
  });
});

describe('S-arm payload parity', () => {
  it('rejects a dropped, added or substituted item', () => {
    const base = ['a.ts', 'b.ts', 'c.ts'];
    expect(() => assertSamePayload(base, ['a.ts', 'b.ts'])).toThrow(/count mismatch/);
    expect(() => assertSamePayload(base, ['a.ts', 'b.ts', 'c.ts', 'd.ts'])).toThrow(/count mismatch/);
    expect(() => assertSamePayload(base, ['a.ts', 'b.ts', 'x.ts'])).toThrow(/content mismatch/);
  });

  it('compares multisets, not just sorted sets', () => {
    expect(() => assertSamePayload(['a', 'a', 'b'], ['a', 'b', 'b'])).toThrow(/content mismatch/);
  });
});

describe('config fingerprint assertion', () => {
  it('is stable for equal configs and independent of key insertion order', () => {
    const reordered = {
      responseSchema: 'response-v1',
      mcpToolSurface: 'tools-v1',
      indexSnapshot: 'index-sha',
      toolSchema: 'schema-v1',
      prompt: 'answer the question',
      modelVersion: 'model-v1',
      taskId: 'T-1',
    } satisfies SharedRunConfig;
    expect(computeConfigFingerprint(reordered)).toBe(computeConfigFingerprint(config()));
  });

  it('changes when any shared field changes', () => {
    const baseline = computeConfigFingerprint(config());
    const fields: ReadonlyArray<keyof SharedRunConfig> = [
      'taskId', 'modelVersion', 'prompt', 'toolSchema',
      'indexSnapshot', 'mcpToolSurface', 'responseSchema',
    ];
    for (const field of fields) {
      expect(computeConfigFingerprint(config({ [field]: 'changed' }))).not.toBe(baseline);
    }
  });

  it('excludes arm identity and ordering seed from the shared fingerprint', () => {
    const withArm = { ...config(), retrievalArm: 'C', orderingSeed: 42 } as SharedRunConfig;
    expect(computeConfigFingerprint(withArm)).toBe(computeConfigFingerprint(config()));
  });

  it('accepts three arms sharing one config and returns the fingerprint', () => {
    const runs: ArmRun[] = [
      { arm: 'A', config: config() },
      { arm: 'C', config: config() },
      { arm: 'S', config: config() },
    ];
    expect(assertConfigParity(runs)).toBe(computeConfigFingerprint(config()));
  });

  it('refuses the run and names the disagreeing arm', () => {
    const runs: ArmRun[] = [
      { arm: 'A', config: config() },
      { arm: 'C', config: config({ modelVersion: 'model-v2' }) },
    ];
    expect(() => assertConfigParity(runs)).toThrow(/arm C/);
    expect(() => assertConfigParity(runs)).toThrow(/refusing this run/);
  });

  it('requires at least one arm run', () => {
    expect(() => assertConfigParity([])).toThrow(/at least one arm run/);
  });
});
