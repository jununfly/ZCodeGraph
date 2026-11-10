import { describe, expect, it } from 'vitest';
import {
  computeConfigFingerprint,
  type ArmRun,
  type SharedRunConfig,
} from '../src/eval/zra-paired-core';
import {
  FORMAL_CEILING,
  PILOT_CEILING,
  PairedRunLedger,
  ceilingFor,
  type RunOutcome,
  type RunRecordInput,
} from '../src/eval/zra-paired-ledger';

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

const fingerprint = (overrides: Partial<SharedRunConfig> = {}): string =>
  computeConfigFingerprint(config(overrides));

const input = (overrides: Partial<RunRecordInput> = {}): RunRecordInput => ({
  scope: 'pilot',
  taskId: 'T-1',
  arm: 'A',
  trial: 1,
  seed: 20261110,
  outcome: 'completed',
  configFingerprint: fingerprint(),
  ...overrides,
});

const block = (overrides: Partial<SharedRunConfig> = {}): ArmRun[] => [
  { arm: 'A', config: config() },
  { arm: 'C', config: config() },
  { arm: 'S', config: config(overrides) },
];

describe('pre-registered hard budget ceiling', () => {
  it('freezes pilot at 96 paired-runs and formal at 0 until N is pre-registered', () => {
    expect(PILOT_CEILING).toBe(96);
    expect(FORMAL_CEILING).toBe(0);
    expect(ceilingFor('pilot')).toBe(96);
    expect(ceilingFor('formal')).toBe(0);
  });

  it('counts every outcome toward consumed, including retries and rejections', () => {
    const ledger = new PairedRunLedger();
    const outcomes: RunOutcome[] = [
      'completed', 'failed', 'timeout', 'retry', 'config-rejected', 'isolation-breach',
    ];
    for (const outcome of outcomes) ledger.append(input({ outcome }));

    expect(ledger.consumed('pilot')).toBe(outcomes.length);
    expect(ledger.checkCeiling('pilot').remaining).toBe(96 - outcomes.length);
  });

  it('never refunds runs and exposes no removal API', () => {
    const ledger = new PairedRunLedger();
    ledger.append(input({ outcome: 'failed' }));

    expect('remove' in ledger).toBe(false);
    expect('delete' in ledger).toBe(false);
    expect('refund' in ledger).toBe(false);
    expect(Object.getOwnPropertyNames(PairedRunLedger.prototype)).not.toContain('remove');

    const snapshot = ledger.entries();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(ledger.consumed('pilot')).toBe(1);
  });

  it('keeps pilot and formal as separate ledgers with no transfer', () => {
    const ledger = new PairedRunLedger();
    for (let i = 0; i < 3; i += 1) ledger.append(input({ trial: i + 1 }));

    expect(ledger.checkCeiling('pilot')).toMatchObject({
      consumed: 3, ceiling: 96, remaining: 93, stopped: false, verdict: 'within',
    });
    expect(ledger.checkCeiling('formal')).toMatchObject({
      consumed: 0, ceiling: 0, remaining: 0, stopped: true, verdict: 'inconclusive',
    });
  });

  it('refuses any formal run while the formal ceiling is zero', () => {
    const ledger = new PairedRunLedger();
    expect(() => ledger.append(input({ scope: 'formal' }))).toThrow(/D4 stop/);
    expect(ledger.consumed('formal')).toBe(0);
    expect(ledger.consumed('pilot')).toBe(0);
  });

  it('stops at 96 and judges inconclusive instead of allowing another batch', () => {
    const ledger = new PairedRunLedger();
    for (let i = 0; i < 96; i += 1) ledger.append(input({ trial: Math.floor(i / 3) + 1 }));

    expect(ledger.checkCeiling('pilot')).toMatchObject({
      consumed: 96, remaining: 0, stopped: true, verdict: 'inconclusive',
    });
    expect(() => ledger.append(input({ trial: 33 }))).toThrow(/inconclusive/);
    expect(ledger.consumed('pilot')).toBe(96);
  });

  it('assigns dense unique sequence numbers and isolates snapshots', () => {
    const ledger = new PairedRunLedger();
    const first = ledger.append(input());
    const second = ledger.append(input({ arm: 'C' }));
    const snapshot = ledger.entries();

    expect([first.seq, second.seq]).toEqual([1, 2]);
    expect(snapshot).toHaveLength(2);
    ledger.append(input({ arm: 'S' }));
    expect(snapshot).toHaveLength(2);
  });

  it('replays a persisted manifest without changing consumption', () => {
    const ledger = new PairedRunLedger();
    for (let i = 0; i < 5; i += 1) ledger.append(input({ trial: i + 1 }));

    const replayed = PairedRunLedger.from(JSON.parse(JSON.stringify(ledger.toJSON())));
    expect(replayed.consumed('pilot')).toBe(5);
    expect(replayed.entries()).toEqual(ledger.entries());
    expect(() => PairedRunLedger.from([{ ...ledger.entries()[0]!, seq: 9 }])).toThrow(/non-contiguous/);
  });

  it('rejects malformed run records at the boundary', () => {
    const ledger = new PairedRunLedger();
    expect(() => ledger.append(input({ taskId: '' }))).toThrow(/taskId/);
    expect(() => ledger.append(input({ arm: 'Z' as 'A' }))).toThrow(/unknown retrieval arm/);
    expect(() => ledger.append(input({ trial: 0 }))).toThrow(/trial/);
    expect(() => ledger.append(input({ configFingerprint: 'not-a-digest' }))).toThrow(/SHA-256/);
    expect(ledger.consumed('pilot')).toBe(0);
  });
});

describe('paired block recording', () => {
  it('records three arms sharing one config fingerprint', () => {
    const ledger = new PairedRunLedger();
    const result = ledger.recordArmBlock({ scope: 'pilot', taskId: 'T-1', trial: 1, seed: 7, runs: block() });

    expect(result.accepted).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.records).toHaveLength(3);
    expect(new Set(result.records.map((record) => record.configFingerprint)).size).toBe(1);
    expect(result.fingerprint).toBe(fingerprint());
    expect(ledger.consumed('pilot')).toBe(3);
  });

  it('records a fingerprint mismatch as three config-rejected runs instead of discarding them', () => {
    const ledger = new PairedRunLedger();
    const result = ledger.recordArmBlock({
      scope: 'pilot', taskId: 'T-1', trial: 1, seed: 7,
      runs: block({ prompt: 'a different prompt' }),
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/config fingerprint mismatch/);
    expect(result.records).toHaveLength(3);
    expect(result.records.every((record) => record.outcome === 'config-rejected')).toBe(true);
    expect(ledger.consumed('pilot')).toBe(3);
  });

  it('refuses partial or duplicated arms', () => {
    const ledger = new PairedRunLedger();
    expect(() => ledger.recordArmBlock({
      scope: 'pilot', taskId: 'T-1', trial: 1, seed: 7,
      runs: [{ arm: 'A', config: config() }, { arm: 'C', config: config() }],
    })).toThrow(/exactly one A/);
    expect(() => ledger.recordArmBlock({
      scope: 'pilot', taskId: 'T-1', trial: 1, seed: 7,
      runs: [
        { arm: 'A', config: config() },
        { arm: 'A', config: config() },
        { arm: 'S', config: config() },
      ],
    })).toThrow(/exactly one A/);
    expect(ledger.consumed('pilot')).toBe(0);
  });

  it('never lets a block straddle the ceiling', () => {
    const ledger = new PairedRunLedger();
    for (let i = 0; i < 94; i += 1) ledger.append(input({ trial: i + 1 }));
    expect(ledger.checkCeiling('pilot').remaining).toBe(2);

    expect(() => ledger.recordArmBlock({
      scope: 'pilot', taskId: 'T-95', trial: 1, seed: 7, runs: block(),
    })).toThrow(/D4 stop/);
    expect(ledger.consumed('pilot')).toBe(94);
  });
});
