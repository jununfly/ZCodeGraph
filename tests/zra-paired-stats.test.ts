import { describe, expect, it } from 'vitest';
import {
  ALPHA,
  BOOTSTRAP_REPLICATIONS,
  CONFIDENCE,
  FROZEN_MDE,
  MAX_EXACT_N,
  MIN_SIMULATIONS,
  evaluatePrimaryOutcome,
  signFlipTest,
  taskClusterBootstrapInterval,
  taskLevelDifferences,
} from '../src/eval/zra-paired-stats';

const repeat = (value: number, count: number): number[] =>
  Array.from({ length: count }, () => value);

describe('frozen statistical constants (ADR-0015 D2)', () => {
  it('keeps the pre-registered values fixed', () => {
    expect(ALPHA).toBe(0.05);
    expect(FROZEN_MDE).toBe(1.5);
    expect(MAX_EXACT_N).toBe(20);
    expect(MIN_SIMULATIONS).toBe(100_000);
    expect(BOOTSTRAP_REPLICATIONS).toBe(10_000);
    expect(CONFIDENCE).toBe(0.95);
  });
});

describe('task-level differences', () => {
  it('derives one d_i per task and exposes no trial dimension', () => {
    const differences = taskLevelDifferences([
      { taskId: 'T-1', aMean: 3, cMean: 1 },
      { taskId: 'T-2', aMean: 4, cMean: 2 },
      { taskId: 'T-3', aMean: 2, cMean: 5 },
    ]);
    expect(differences).toEqual([2, 2, -3]);
    expect(differences).toHaveLength(3);
  });

  it('refuses to silently drop a task with a missing arm', () => {
    expect(() => taskLevelDifferences([
      { taskId: 'T-1', aMean: 3, cMean: 1 },
      { taskId: 'T-2', aMean: 4, cMean: null },
    ])).toThrow(/whole-task exclusion must be recorded by the caller/);
    expect(() => taskLevelDifferences([])).toThrow(/at least one task/);
    expect(() => taskLevelDifferences([
      { taskId: 'T-1', aMean: 1, cMean: 1 },
      { taskId: 'T-1', aMean: 2, cMean: 2 },
    ])).toThrow(/unique/);
  });
});

describe('two-sided sign-flip randomization', () => {
  it('returns p=1 for a zero-effect task set', () => {
    const result = signFlipTest(repeat(0, 4));
    expect(result).toMatchObject({ n: 4, observedMean: 0, pValue: 1, method: 'exact', replications: 16 });
  });

  it('detects a constructed effect with exact enumeration', () => {
    const result = signFlipTest(repeat(2, 6));
    expect(result.method).toBe('exact');
    expect(result.replications).toBe(64);
    expect(result.pValue).toBeCloseTo(2 / 64, 12);
    expect(result.pValue).toBeLessThan(ALPHA);
  });

  it('matches a naive 2^N brute force (Gray-code correctness)', () => {
    const differences = [1.5, -0.5, 2, 0.75, -1.25];
    const n = differences.length;
    const mean = differences.reduce((sum, value) => sum + value, 0) / n;
    let count = 0;
    for (let mask = 0; mask < 2 ** n; mask += 1) {
      const signed = differences.reduce(
        (sum, value, i) => sum + ((mask >> i) & 1 ? -value : value),
        0,
      );
      if (Math.abs(signed / n) >= Math.abs(mean) - 1e-12) count += 1;
    }
    expect(signFlipTest(differences).pValue).toBeCloseTo(count / 2 ** n, 12);
  });

  it('switches to a reproducible fixed-seed simulation above N=20', () => {
    const differences = Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const first = signFlipTest(differences, { seed: 42 });
    const second = signFlipTest(differences, { seed: 42 });

    expect(first.method).toBe('simulated');
    expect(first.replications).toBeGreaterThanOrEqual(MIN_SIMULATIONS);
    expect(first.pValue).toBeGreaterThan(0);
    expect(first.pValue).toBeLessThanOrEqual(1);
    expect(first).toEqual(second);
  });

  it('refuses to lower the frozen enumeration or simulation thresholds', () => {
    expect(() => signFlipTest([1, 2], { maxExactN: 21 })).toThrow(/between 1 and 20/);
    expect(() => signFlipTest([1, 2], { simulations: 99_999 })).toThrow(/at least 100000/);
  });
});

describe('task-cluster bootstrap interval', () => {
  it('produces a reproducible 95% interval that contains the observed mean', () => {
    const first = taskClusterBootstrapInterval([1, 2, 3, 4], { seed: 11 });
    const second = taskClusterBootstrapInterval([1, 2, 3, 4], { seed: 11 });

    expect(first).toEqual(second);
    expect(first.confidence).toBe(0.95);
    expect(first.replications).toBe(BOOTSTRAP_REPLICATIONS);
    expect(first.mean).toBe(2.5);
    expect(first.lower).toBeLessThanOrEqual(first.mean);
    expect(first.upper).toBeGreaterThanOrEqual(first.mean);
    expect(first.crossesZero).toBe(false);
  });

  it('reports a zero-crossing interval for a zero-effect set', () => {
    expect(taskClusterBootstrapInterval(repeat(0, 5)).crossesZero).toBe(true);
  });

  it('refuses fewer than 10000 replications', () => {
    expect(() => taskClusterBootstrapInterval([1, 2], { replications: 9999 }))
      .toThrow(/at least 10000/);
  });
});

describe('D2 primary outcome verdict', () => {
  it('passes when p is significant, the interval excludes zero and the effect meets MDE', () => {
    const result = evaluatePrimaryOutcome(repeat(2, 10), { seed: 5 });
    expect(result.passed).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.pValue).toBeLessThan(ALPHA);
    expect(result.mde).toBe(FROZEN_MDE);
  });

  it('fails when p is not significant even if the interval excludes zero', () => {
    const result = evaluatePrimaryOutcome(repeat(2, 4), { seed: 5 });
    expect(result.pValue).toBeCloseTo(0.125, 12);
    expect(result.interval.crossesZero).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/not below alpha/);
  });

  it('fails when a significant effect is below the pre-registered MDE', () => {
    const result = evaluatePrimaryOutcome(repeat(1, 8), { seed: 5 });
    expect(result.pValue).toBeLessThan(ALPHA);
    expect(result.passed).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/below the pre-registered MDE/);
  });

  it('fails on all three rules for a zero-effect set', () => {
    const result = evaluatePrimaryOutcome(repeat(0, 4), { seed: 5 });
    expect(result.passed).toBe(false);
    expect(result.reasons).toHaveLength(3);
    expect(result.interval.crossesZero).toBe(true);
  });
});
