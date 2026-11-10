import type { RetrievalArm } from './zra-paired-core';
import { ALPHA, signFlipTest, type SignFlipOptions } from './zra-paired-stats';

/**
 * Pre-registered secondary family and descriptive statistics (ADR-0015 D2).
 * These never replace the primary endpoint or the primary A/C comparison;
 * the C-S diagnosis does not establish full causal mediation, and every
 * secondary p-value is Holm-corrected within a pre-declared family.
 *
 * Pure by construction: no transcript reads, no model calls, no ranking.
 */

export interface OrderEffectDiagnosis {
  readonly n: number;
  readonly meanDifference: number;
  readonly pValue: number;
  readonly method: 'exact' | 'simulated';
  readonly note: string;
}

/**
 * C-S ordering diagnosis. S shares C's candidates, content, count and
 * payload and differs only by a fixed-seed permutation of their order.
 */
export function orderEffectDiagnosis(
  cMeans: readonly number[],
  sMeans: readonly number[],
  options: SignFlipOptions = {},
): OrderEffectDiagnosis {
  if (cMeans.length === 0 || cMeans.length !== sMeans.length) {
    throw new Error('C and S require the same non-empty set of task means');
  }
  const differences = cMeans.map((value, index) => {
    const counterpart = sMeans[index];
    if (!Number.isFinite(value) || counterpart === undefined || !Number.isFinite(counterpart)) {
      throw new Error('task means must be finite numbers');
    }
    return value - counterpart;
  });
  const flip = signFlipTest(differences, options);
  return Object.freeze({
    n: differences.length,
    meanDifference: flip.observedMean,
    pValue: flip.pValue,
    method: flip.method,
    note: 'Ordering diagnosis only; S differs from C solely by a fixed-seed permutation. '
      + 'This does not establish full causal mediation and is not a product gate.',
  });
}

export interface FallbackFreePair {
  readonly taskId: string;
  readonly aFallbackFree: boolean;
  readonly cFallbackFree: boolean;
}

export interface McNemarResult {
  /** A fallback-free, C not fallback-free. */
  readonly b: number;
  /** A not fallback-free, C fallback-free. */
  readonly c: number;
  readonly discordant: number;
  readonly concordant: number;
  readonly pValue: number;
  readonly method: 'exact-binomial';
}

/** Two-sided exact binomial McNemar over discordant pairs. */
export function mcnemarExact(pairs: readonly FallbackFreePair[]): McNemarResult {
  if (pairs.length === 0) throw new Error('at least one paired task is required');
  const seen = new Set<string>();
  let b = 0;
  let c = 0;
  let concordant = 0;
  for (const pair of pairs) {
    if (typeof pair.taskId !== 'string' || pair.taskId.length === 0 || seen.has(pair.taskId)) {
      throw new Error('taskId must be non-empty and unique');
    }
    seen.add(pair.taskId);
    if (typeof pair.aFallbackFree !== 'boolean' || typeof pair.cFallbackFree !== 'boolean') {
      throw new Error('fallback-free outcomes must be booleans');
    }
    if (pair.aFallbackFree && !pair.cFallbackFree) b += 1;
    else if (!pair.aFallbackFree && pair.cFallbackFree) c += 1;
    else concordant += 1;
  }

  const discordant = b + c;
  let pValue = 1;
  if (discordant > 0) {
    const tail = Math.min(b, c);
    let logCoefficient = 0;
    let cumulative = 0;
    for (let i = 0; i <= tail; i += 1) {
      if (i > 0) logCoefficient += Math.log(discordant - i + 1) - Math.log(i);
      cumulative += Math.exp(logCoefficient - discordant * Math.LN2);
    }
    pValue = Math.min(1, 2 * cumulative);
  }

  return Object.freeze({ b, c, discordant, concordant, pValue, method: 'exact-binomial' });
}

export interface HolmEntry {
  readonly id: string;
  readonly pValue: number;
}

export interface HolmOptions {
  /** Pre-registered family size; submitted endpoints must match it exactly. */
  readonly familySize: number;
  readonly alpha?: number;
}

export interface HolmResultEntry extends HolmEntry {
  readonly rank: number;
  readonly adjustedAlpha: number;
  readonly adjustedPValue: number;
  readonly rejected: boolean;
}

export interface HolmReport {
  readonly familySize: number;
  readonly alpha: number;
  readonly entries: readonly HolmResultEntry[];
  readonly rejectedCount: number;
}

/** Holm step-down over a pre-registered secondary family. */
export function holmCorrection(
  entries: readonly HolmEntry[],
  options: HolmOptions,
): HolmReport {
  const { familySize, alpha = ALPHA } = options;
  if (!Number.isInteger(familySize) || familySize < 1) {
    throw new Error('familySize must be a positive integer');
  }
  if (entries.length !== familySize) {
    throw new Error('submitted endpoints must match the pre-registered family size');
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('alpha must be between 0 and 1');
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.id !== 'string' || entry.id.length === 0 || seen.has(entry.id)) {
      throw new Error('endpoint ids must be non-empty and unique');
    }
    seen.add(entry.id);
    if (!Number.isFinite(entry.pValue) || entry.pValue < 0 || entry.pValue > 1) {
      throw new Error('p-values must lie in [0, 1]');
    }
  }

  const sorted = entries
    .map((entry, index) => ({ ...entry, index }))
    .sort((left, right) => left.pValue - right.pValue || left.id.localeCompare(right.id));

  const results = new Array<HolmResultEntry>(entries.length);
  let stopped = false;
  let runningMax = 0;
  sorted.forEach((entry, offset) => {
    const multiplier = familySize - offset;
    const adjustedAlpha = alpha / multiplier;
    runningMax = Math.min(1, Math.max(runningMax, multiplier * entry.pValue));
    const rejected = !stopped && entry.pValue <= adjustedAlpha;
    if (!rejected) stopped = true;
    results[entry.index] = Object.freeze({
      id: entry.id,
      pValue: entry.pValue,
      rank: offset + 1,
      adjustedAlpha,
      adjustedPValue: runningMax,
      rejected,
    });
  });

  return Object.freeze({
    familySize,
    alpha,
    entries: Object.freeze(results),
    rejectedCount: results.filter((entry) => entry.rejected).length,
  });
}

export interface FallbackFreeTrial {
  readonly taskId: string;
  readonly arm: RetrievalArm;
  readonly trial: number;
  /** null = unknown; a missing or unknown trial must never count as success. */
  readonly fallbackFree: boolean | null;
}

export interface ConsistencyByArm {
  readonly consistent: number;
  readonly total: number;
  readonly share: number;
}

export interface ConsistencyReport {
  readonly k: number;
  readonly tasks: number;
  readonly byArm: Readonly<Record<RetrievalArm, ConsistencyByArm>>;
  readonly missingOrUnknownTrials: number;
}

const ARMS: readonly RetrievalArm[] = ['A', 'C', 'S'];

/** Descriptive pass^k-style consistency; no p-value, no gate. */
export function fallbackFreeConsistency(
  trials: readonly FallbackFreeTrial[],
  k: number,
): ConsistencyReport {
  if (!Number.isInteger(k) || k < 1) throw new Error('k must be a positive integer');
  if (trials.length === 0) throw new Error('at least one trial is required');

  const groups = new Map<string, Map<number, boolean | null>>();
  const taskIds = new Set<string>();
  for (const trial of trials) {
    if (typeof trial.taskId !== 'string' || trial.taskId.length === 0) {
      throw new Error('taskId is required');
    }
    if (!ARMS.includes(trial.arm)) throw new Error(`unknown retrieval arm: ${String(trial.arm)}`);
    if (!Number.isInteger(trial.trial) || trial.trial < 1 || trial.trial > k) {
      throw new Error(`trial must be an integer in [1, ${k}]`);
    }
    taskIds.add(trial.taskId);
    const key = `${trial.taskId}|${trial.arm}`;
    if (!groups.has(key)) groups.set(key, new Map());
    const bucket = groups.get(key)!;
    if (bucket.has(trial.trial)) throw new Error(`duplicate trial for ${key}`);
    bucket.set(trial.trial, trial.fallbackFree);
  }

  const counts: Record<RetrievalArm, { consistent: number; total: number }> = {
    A: { consistent: 0, total: 0 },
    C: { consistent: 0, total: 0 },
    S: { consistent: 0, total: 0 },
  };
  let missingOrUnknownTrials = 0;

  for (const taskId of taskIds) {
    for (const arm of ARMS) {
      const bucket = groups.get(`${taskId}|${arm}`);
      const values = [...(bucket?.values() ?? [])];
      const present = values.length;
      const unknown = values.filter((value) => value === null).length;
      missingOrUnknownTrials += (k - present) + unknown;
      counts[arm].total += 1;
      if (present === k && values.every((value) => value === true)) {
        counts[arm].consistent += 1;
      }
    }
  }

  const byArm = Object.freeze({
    A: Object.freeze({ ...counts.A, share: counts.A.total ? counts.A.consistent / counts.A.total : 0 }),
    C: Object.freeze({ ...counts.C, share: counts.C.total ? counts.C.consistent / counts.C.total : 0 }),
    S: Object.freeze({ ...counts.S, share: counts.S.total ? counts.S.consistent / counts.S.total : 0 }),
  });
  return Object.freeze({ k, tasks: taskIds.size, byArm, missingOrUnknownTrials });
}
