import { describe, expect, it } from 'vitest';
import { runPairedEvaluation } from '../src/eval/zra-paired-runtime';
import type { SharedRunConfig } from '../src/eval/zra-paired-core';
import { PairedRunLedger } from '../src/eval/zra-paired-ledger';
import { armOrderSchedule } from '../src/eval/zra-paired-design';
import { computeConfigFingerprint } from '../src/eval/zra-paired-core';

const config: SharedRunConfig = {
  taskId: 'T-1',
  modelVersion: 'model-v1',
  prompt: 'How does the request reach the handler?',
  toolSchema: 'tools-v1',
  indexSnapshot: 'index-v1',
  mcpToolSurface: 'mcp-v1',
  responseSchema: 'response-v1',
};

describe('runPairedEvaluation', () => {
  it('executes an explicit three-arm block into an immutable consumed manifest', async () => {
    const result = await runPairedEvaluation({
      config,
      scope: 'pilot',
      trial: 1,
      seed: 42,
      retrieve: async ({ arm }: { arm: string }) => ({
        candidates: ['a.ts', 'b.ts', 'c.ts'],
        payload: { arm },
      }),
      execute: async () => ({ status: 'completed', toolCalls: [] }),
    });

    expect(result.status).toBe('completed');
    expect(result.executions.map((execution) => execution.arm)).toEqual(['A', 'C', 'S']);
    expect(result.manifest.map((record) => record.arm)).toEqual(['A', 'C', 'S']);
    expect(result.manifest.map((record) => record.outcome)).toEqual([
      'completed', 'completed', 'completed',
    ]);
    expect(result.manifest.every((record) => record.configFingerprint === result.configFingerprint)).toBe(true);
    expect(result.ledger.consumed('pilot')).toBe(3);
    expect(result.ledger.checkCeiling('formal')).toMatchObject({ consumed: 0, ceiling: 0, stopped: true });
    expect(Object.isFrozen(result.manifest)).toBe(true);
    expect(result.ledger.entries()).toEqual(result.manifest);
    const original = result.ledger.entries();
    expect(() => { original[0]!.outcome = 'retry'; }).toThrow(/read only/);
    expect(result.ledger.entries()[0]!.outcome).toBe('completed');
  });

  it('invalidates a fingerprint-mismatched block and preserves each attempted arm fingerprint', async () => {
    const attempted: string[] = [];
    const result = await runPairedEvaluation({
      config,
      scope: 'pilot',
      trial: 1,
      seed: 42,
      sharedConfig: () => config,
      resolveConfigFingerprint: ({ arm, config: shared }: { arm: string; config: SharedRunConfig }) =>
        arm === 'C' ? '0'.repeat(64) : computeConfigFingerprint(shared),
      retrieve: async () => ({ candidates: [], payload: null }),
      execute: async ({ arm }: { arm: string }) => {
        attempted.push(arm);
        return { status: 'completed', toolCalls: [] };
      },
    });

    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/configuration fingerprint mismatch/);
    expect(result.executions).toHaveLength(3);
    expect(attempted).toEqual(['A']);
    expect(result.executions.map((execution) => execution.outcome)).toEqual([
      'failed', 'config-rejected', 'failed',
    ]);
    expect(result.manifest.map((record) => record.outcome)).toEqual([
      'failed', 'config-rejected', 'failed',
    ]);
    expect(result.manifest[0]!.configFingerprint).toBe(result.configFingerprint);
    expect(result.manifest[1]!.configFingerprint).toBe('0'.repeat(64));
    expect(result.manifest[2]!.configFingerprint).toBe(result.configFingerprint);
    expect(result.manifest[1]!.configFingerprint).not.toBe(result.configFingerprint);
    expect(result.audit.revealKey).toBeUndefined();
    expect(result.audit.reviewable).toBe(false);
    expect(result.sealRevealKey()).toEqual([]);
    expect(result.ledger.consumed('pilot')).toBe(3);
  });

  it('reuses the C payload for S and permutes only its candidate ordering with a fixed seed', async () => {
    const retrievalArms: string[] = [];
    const candidates = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'];
    const payload = Object.freeze({ schema: 'explore-v1', content: 'same-content' });
    const options = {
      config,
      scope: 'pilot' as const,
      trial: 1,
      seed: 42,
      retrieve: async ({ arm }: { arm: string }) => {
        retrievalArms.push(arm);
        return { candidates, payload };
      },
      execute: async () => ({ status: 'completed' as const, toolCalls: [] }),
    };

    const first = await runPairedEvaluation(options);
    const second = await runPairedEvaluation(options);
    const c = first.executions.find((execution) => execution.arm === 'C')!;
    const s = first.executions.find((execution) => execution.arm === 'S')!;

    expect(retrievalArms).toEqual(['A', 'C', 'A', 'C']);
    expect(s.payload).toBe(c.payload);
    expect(s.candidates).toEqual(['b.ts', 'a.ts', 'e.ts', 'f.ts', 'c.ts', 'd.ts']);
    expect([...s.candidates].sort()).toEqual(candidates);
    expect(s.candidates).not.toEqual(c.candidates);
    expect(second.executions).toEqual(first.executions);
    expect(s.outcome).toBe('completed');
  });

  it('invalidates the whole block on an isolation breach and still counts attempted arms', async () => {
    const attempted: string[] = [];
    const result = await runPairedEvaluation({
      config,
      scope: 'pilot',
      trial: 1,
      seed: 42,
      retrieve: async () => ({ candidates: ['a.ts'], payload: null }),
      execute: async ({ arm }: { arm: string }) => {
        attempted.push(arm);
        return {
          outcome: arm === 'C' ? 'isolation-breach' as const : 'completed' as const,
          toolCalls: [],
        };
      },
    });

    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/isolation-breach/);
    expect(attempted).toEqual(['A', 'C']);
    expect(result.executions).toHaveLength(3);
    expect(result.manifest.map((record) => [record.arm, record.outcome])).toEqual([
      ['A', 'failed'], ['C', 'isolation-breach'], ['S', 'failed'],
    ]);
    expect(result.ledger.consumed('pilot')).toBe(3);
  });

  it('produces a separate arm-blinded review package and sealed reveal key', async () => {
    const result = await runPairedEvaluation({
      config,
      scope: 'pilot',
      trial: 1,
      seed: 42,
      retrieve: async () => ({ candidates: ['a.ts'], payload: null }),
      execute: async ({ arm }: { arm: string }) => ({
        outcome: 'completed' as const,
        toolCalls: [{ name: 'Read', callId: `${arm}-call-1`, arguments: { file_path: 'a.ts' } }],
      }),
    });

    expect(result.audit.blinded).toHaveLength(3);
    expect(result.audit.revealKey).toBeUndefined();
    for (const record of result.audit.blinded) {
      expect(record).toEqual({ blindedId: expect.stringMatching(/^B-\d{4}$/), payload: expect.any(String) });
      expect(record).not.toHaveProperty('arm');
      expect(record).not.toHaveProperty('callId');
    }
    expect(result.sealRevealKey().map((entry: { arm: string }) => entry.arm).sort()).toEqual(['A', 'C', 'S']);
    expect(result.sealRevealKey().map((entry: { callId: string }) => entry.callId)).toContain('C-call-1');
    expect(result.audit.agreement).toBeNull();
    expect(Object.isFrozen(result.audit)).toBe(true);

    const reviewed = result.submitDoubleReview!(
      result.audit.blinded.map((record: { blindedId: string }) => ({ blindedId: record.blindedId, category: 'recovery' as const })),
      result.audit.blinded.map((record: { blindedId: string }) => ({ blindedId: record.blindedId, category: 'recovery' as const })),
    );
    expect(reviewed.audit.agreement).toMatchObject({ rate: 1, meetsThreshold: true });
    expect(result.audit.agreement).toBeNull();
    expect(() => result.submitDoubleReview!(
      result.audit.blinded.map((record: { blindedId: string }) => ({ blindedId: record.blindedId, category: 'recovery' as const })),
      result.audit.blinded.map((record: { blindedId: string }) => ({ blindedId: record.blindedId, category: 'deepening' as const })),
    )).toThrow(/below 90%.*do not proceed to confirmation/);
  });

  it('uses the frozen trial order when a schedule is supplied', async () => {
    const schedule = armOrderSchedule({ k: 6 }).orders;
    const result = await runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42, schedule,
      retrieve: async () => ({ candidates: ['a.ts'], payload: null }),
      execute: async () => ({ outcome: 'completed', toolCalls: [] }),
    });
    expect(result.executions.map((execution) => execution.arm)).toEqual(['A', 'S', 'C']);
    expect(result.executions.find((execution) => execution.arm === 'S')!.payload)
      .toBe(result.executions.find((execution) => execution.arm === 'C')!.payload);
  });

  it('prepares C candidates exactly once even when the frozen order puts S first', async () => {
    const schedule = armOrderSchedule({ k: 6 }).orders;
    const retrievalArms: string[] = [];
    let cPreparations = 0;
    const result = await runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42, schedule,
      retrieve: async ({ arm }) => {
        retrievalArms.push(arm);
        cPreparations += 1;
        return {
          candidates: [`snapshot-${cPreparations}.ts`],
          payload: { snapshot: cPreparations },
        };
      },
      execute: async () => ({ outcome: 'completed', toolCalls: [] }),
    });
    const c = result.executions.find((execution) => execution.arm === 'C')!;
    const s = result.executions.find((execution) => execution.arm === 'S')!;
    expect(result.executions.map((execution) => execution.arm)).toEqual(['A', 'S', 'C']);
    expect(retrievalArms).toEqual(['A', 'C']);
    expect(c.payload).toBe(s.payload);
    expect(c.candidates).toEqual(s.candidates);
  });

  it('fails closed before a block that would cross the ceiling', async () => {
    const ledger = new PairedRunLedger();
    const configFingerprint = '0'.repeat(64);
    for (let seq = 0; seq < 96; seq += 1) {
      ledger.append({
        scope: 'pilot', taskId: 'T-1', arm: 'A', trial: 1, seed: 42,
        outcome: 'completed', configFingerprint,
      });
    }
    await expect(runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42, ledger,
      retrieve: async () => ({ candidates: [], payload: null }),
      execute: async () => ({ outcome: 'completed' }),
    })).rejects.toThrow(/D4 stop.*inconclusive/);
    expect(ledger.consumed('pilot')).toBe(96);
    await expect(runPairedEvaluation({
      config, scope: 'formal', trial: 1, seed: 42,
      retrieve: async () => ({ candidates: [], payload: null }),
      execute: async () => ({ outcome: 'completed' }),
    })).rejects.toThrow(/D4 stop.*inconclusive/);
  });

  it('records a thrown execution as a failed consumed block rather than leaking an exception', async () => {
    const result = await runPairedEvaluation({
      config, scope: 'pilot', trial: 1, seed: 42,
      retrieve: async () => ({ candidates: [], payload: null }),
      execute: async () => { throw new Error('process terminated'); },
    });
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/process terminated/);
    expect(result.manifest.map((record) => record.outcome)).toEqual(['failed', 'failed', 'failed']);
    expect(result.ledger.consumed('pilot')).toBe(3);
  });
});
