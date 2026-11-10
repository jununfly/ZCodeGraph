import { describe, expect, it } from 'vitest';
import {
  fallbackFreeConsistency,
  holmCorrection,
  mcnemarExact,
  orderEffectDiagnosis,
  type FallbackFreePair,
  type FallbackFreeTrial,
  type HolmEntry,
} from '../src/eval/zra-paired-secondary';

const pair = (index: number, a: boolean, c: boolean): FallbackFreePair => ({
  taskId: `T-${index}`,
  aFallbackFree: a,
  cFallbackFree: c,
});

const allSuccessfulTrials = (k = 2): FallbackFreeTrial[] => {
  const trials: FallbackFreeTrial[] = [];
  for (const taskId of ['T-1', 'T-2']) {
    for (const arm of ['A', 'C', 'S'] as const) {
      for (let trial = 1; trial <= k; trial += 1) {
        trials.push({ taskId, arm, trial, fallbackFree: true });
      }
    }
  }
  return trials;
};

describe('C-S ordering diagnosis', () => {
  it('reports no ordering effect when C and S agree', () => {
    const result = orderEffectDiagnosis([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]);
    expect(result).toMatchObject({ n: 6, meanDifference: 0, pValue: 1, method: 'exact' });
  });

  it('detects a constructed ordering difference and stays diagnostic only', () => {
    const result = orderEffectDiagnosis([3, 3, 3, 3, 3, 3], [1, 1, 1, 1, 1, 1]);
    expect(result.meanDifference).toBe(2);
    expect(result.pValue).toBeCloseTo(2 / 64, 12);
    expect(result.note).toMatch(/not a product gate/);
    expect(result.note).toMatch(/does not establish full causal mediation/);
  });

  it('requires matching non-empty task means', () => {
    expect(() => orderEffectDiagnosis([1, 2], [1])).toThrow(/same non-empty/);
    expect(() => orderEffectDiagnosis([], [])).toThrow(/same non-empty/);
  });
});

describe('exact McNemar over discordant pairs', () => {
  it('returns p=1 when there are no discordant pairs', () => {
    const result = mcnemarExact([pair(1, true, true), pair(2, false, false), pair(3, true, true)]);
    expect(result).toMatchObject({
      b: 0, c: 0, discordant: 0, concordant: 3, pValue: 1, method: 'exact-binomial',
    });
  });

  it('matches the exact two-sided binomial tail', () => {
    const pairs = Array.from({ length: 10 }, (_, i) => pair(i, true, false));
    const result = mcnemarExact(pairs);
    expect(result).toMatchObject({ b: 10, c: 0, discordant: 10 });
    expect(result.pValue).toBeCloseTo(2 / 2 ** 10, 12);
  });

  it('is symmetric and returns p=1 for perfectly split discordance', () => {
    const split = [
      ...Array.from({ length: 5 }, (_, i) => pair(i, true, false)),
      ...Array.from({ length: 5 }, (_, i) => pair(i + 5, false, true)),
    ];
    expect(mcnemarExact(split).pValue).toBe(1);
    expect(mcnemarExact(split.map((p) => ({ ...p, aFallbackFree: p.cFallbackFree, cFallbackFree: p.aFallbackFree }))).pValue)
      .toBe(1);
  });

  it('rejects duplicate tasks and non-boolean outcomes', () => {
    expect(() => mcnemarExact([pair(1, true, false), pair(1, false, true)]))
      .toThrow(/unique/);
    expect(() => mcnemarExact([{ taskId: 'T-1', aFallbackFree: 'yes' as unknown as boolean, cFallbackFree: false }]))
      .toThrow(/booleans/);
  });
});

describe('Holm correction for a pre-registered family', () => {
  it('rejects both endpoints when both are significant after step-down', () => {
    const entries: readonly HolmEntry[] = [
      { id: 'cs-order', pValue: 0.01 },
      { id: 'mcnemar', pValue: 0.04 },
    ];
    const report = holmCorrection(entries, { familySize: 2 });
    expect(report.familySize).toBe(2);
    expect(report.alpha).toBe(0.05);
    expect(report.entries).toHaveLength(2);
    expect(report.entries[0]).toMatchObject({ id: 'cs-order', rank: 1, adjustedAlpha: 0.025, adjustedPValue: 0.02, rejected: true });
    expect(report.entries[1]).toMatchObject({ id: 'mcnemar', rank: 2, adjustedAlpha: 0.05, adjustedPValue: 0.04, rejected: true });
    expect(report.rejectedCount).toBe(2);
  });

  it('stops the whole family at the first non-rejection', () => {
    const report = holmCorrection([
      { id: 'cs-order', pValue: 0.03 },
      { id: 'mcnemar', pValue: 0.04 },
    ], { familySize: 2 });
    expect(report.entries.every((entry) => !entry.rejected)).toBe(true);
    expect(report.rejectedCount).toBe(0);
    expect(report.entries[1]!.adjustedPValue).toBeGreaterThanOrEqual(report.entries[0]!.adjustedPValue);
  });

  it('refuses a mismatched family size and invalid endpoints', () => {
    expect(() => holmCorrection([{ id: 'a', pValue: 0.01 }], { familySize: 2 }))
      .toThrow(/pre-registered family size/);
    expect(() => holmCorrection([
      { id: 'a', pValue: 0.01 }, { id: 'a', pValue: 0.02 },
    ], { familySize: 2 })).toThrow(/unique/);
    expect(() => holmCorrection([{ id: 'a', pValue: 1.5 }], { familySize: 1 }))
      .toThrow(/\[0, 1\]/);
  });
});

describe('descriptive fallback-free consistency', () => {
  it('reports per-arm pass^k-style shares with no p-value', () => {
    const report = fallbackFreeConsistency(allSuccessfulTrials(), 2);
    expect(report.k).toBe(2);
    expect(report.tasks).toBe(2);
    expect(report.missingOrUnknownTrials).toBe(0);
    expect(report.byArm.A).toMatchObject({ consistent: 2, total: 2, share: 1 });
    expect('pValue' in report).toBe(false);
  });

  it('never counts a missing or unknown trial as success', () => {
    const withUnknown = allSuccessfulTrials().map((trial) =>
      trial.taskId === 'T-1' && trial.arm === 'A' && trial.trial === 2
        ? { ...trial, fallbackFree: null }
        : trial);
    const unknown = fallbackFreeConsistency(withUnknown, 2);
    expect(unknown.byArm.A).toMatchObject({ consistent: 1, total: 2, share: 0.5 });
    expect(unknown.missingOrUnknownTrials).toBe(1);

    const withMissing = allSuccessfulTrials().filter((trial) =>
      !(trial.taskId === 'T-1' && trial.arm === 'C' && trial.trial === 2));
    const missing = fallbackFreeConsistency(withMissing, 2);
    expect(missing.byArm.C).toMatchObject({ consistent: 1, total: 2, share: 0.5 });
    expect(missing.missingOrUnknownTrials).toBe(1);
  });

  it('validates k, arm, trial range and duplicates', () => {
    expect(() => fallbackFreeConsistency(allSuccessfulTrials(), 0)).toThrow(/k must be/);
    expect(() => fallbackFreeConsistency([{ taskId: 'T-1', arm: 'Z' as 'A', trial: 1, fallbackFree: true }], 1))
      .toThrow(/unknown retrieval arm/);
    expect(() => fallbackFreeConsistency([{ taskId: 'T-1', arm: 'A', trial: 3, fallbackFree: true }], 2))
      .toThrow(/trial must be/);
    expect(() => fallbackFreeConsistency([
      { taskId: 'T-1', arm: 'A', trial: 1, fallbackFree: true },
      { taskId: 'T-1', arm: 'A', trial: 1, fallbackFree: false },
    ], 2)).toThrow(/duplicate trial/);
  });
});
