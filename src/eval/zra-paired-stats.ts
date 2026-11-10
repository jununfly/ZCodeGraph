import { makeSeededRandom } from './zra-paired-core';

/**
 * Fixed-seed statistics for ADR-0015 D2. The task (Task Cluster) is the sole
 * independent inference unit: every public entry point takes one value per
 * task and has no trial dimension, so N cannot be inflated mechanically.
 *
 * These are methodological predicates, NOT product gates. A pilot is never a
 * product gate, and a real-machine pass only earns the right to seek further
 * G-ship evidence (ADR-0015 D6).
 */

export const ALPHA = 0.05;
export const FROZEN_MDE = 1.5;
export const MAX_EXACT_N = 20;
export const MIN_SIMULATIONS = 100_000;
export const BOOTSTRAP_REPLICATIONS = 10_000;
export const CONFIDENCE = 0.95;

const EPSILON = 1e-12;

export interface TaskArmMeans {
  readonly taskId: string;
  readonly aMean: number | null;
  readonly cMean: number | null;
}

export interface SignFlipOptions {
  readonly seed?: number;
  /** Exact enumeration threshold, capped at 20 by ADR-0015 D2. */
  readonly maxExactN?: number;
  /** Simulation count, never below 100000. */
  readonly simulations?: number;
}

export interface SignFlipResult {
  readonly n: number;
  readonly observedMean: number;
  readonly pValue: number;
  readonly method: 'exact' | 'simulated';
  readonly replications: number;
  readonly seed: number;
  readonly alpha: number;
}

export interface BootstrapOptions {
  readonly seed?: number;
  /** Never below 10000. */
  readonly replications?: number;
}

export interface BootstrapIntervalResult {
  readonly mean: number;
  readonly lower: number;
  readonly upper: number;
  readonly crossesZero: boolean;
  readonly replications: number;
  readonly seed: number;
  readonly confidence: number;
}

export interface PrimaryOutcomeOptions extends SignFlipOptions {
  readonly bootstrapSeed?: number;
  readonly bootstrapReplications?: number;
}

export interface PrimaryOutcomeResult {
  readonly passed: boolean;
  readonly reasons: readonly string[];
  readonly pValue: number;
  readonly observedMean: number;
  readonly mde: number;
  readonly alpha: number;
  readonly signFlip: SignFlipResult;
  readonly interval: BootstrapIntervalResult;
}

function validateDifferences(differences: readonly number[]): number {
  if (differences.length === 0) throw new Error('at least one task difference is required');
  let sum = 0;
  for (const value of differences) {
    if (!Number.isFinite(value)) throw new Error('task differences must be finite numbers');
    sum += value;
  }
  return sum / differences.length;
}

/**
 * d_i = mean(A_i) - mean(C_i). A missing arm is an error, not a silent skip:
 * D2 whole-task exclusion must be decided and reported by the caller.
 */
export function taskLevelDifferences(tasks: readonly TaskArmMeans[]): number[] {
  if (tasks.length === 0) throw new Error('at least one task is required');
  const seen = new Set<string>();
  return tasks.map((task) => {
    if (typeof task.taskId !== 'string' || task.taskId.length === 0 || seen.has(task.taskId)) {
      throw new Error('taskId must be non-empty and unique');
    }
    seen.add(task.taskId);
    const { aMean, cMean } = task;
    if (aMean === null || cMean === null || !Number.isFinite(aMean) || !Number.isFinite(cMean)) {
      throw new Error(
        `task ${task.taskId} is missing an arm; whole-task exclusion must be recorded by the caller`,
      );
    }
    return aMean - cMean;
  });
}

/**
 * Exact enumeration over all 2^N sign vectors via Gray code: consecutive
 * vectors differ in one sign, so each step is O(1) instead of O(N).
 */
function exactSignFlip(
  differences: readonly number[],
  observedAbs: number,
): { count: number; replications: number } {
  const n = differences.length;
  const replications = 2 ** n;
  const signs = new Int8Array(n).fill(1);
  let signedSum = differences.reduce((total, value) => total + value, 0);
  let count = 0;

  for (let i = 0; i < replications; i += 1) {
    if (i > 0) {
      const previousGray = (i - 1) ^ ((i - 1) >> 1);
      const currentGray = i ^ (i >> 1);
      const bit = previousGray ^ currentGray;
      const j = 31 - Math.clz32(bit);
      const sign = signs[j] ?? 1;
      signedSum -= 2 * sign * (differences[j] ?? 0);
      signs[j] = -sign;
    }
    if (Math.abs(signedSum / n) >= observedAbs - EPSILON) count += 1;
  }
  return { count, replications };
}

function simulatedSignFlip(
  differences: readonly number[],
  observedAbs: number,
  seed: number,
  simulations: number,
): { count: number; replications: number } {
  const n = differences.length;
  const random = makeSeededRandom(seed);
  let count = 0;
  for (let r = 0; r < simulations; r += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      sum += (random() < 0.5 ? -1 : 1) * (differences[i] ?? 0);
    }
    if (Math.abs(sum / n) >= observedAbs - EPSILON) count += 1;
  }
  return { count, replications: simulations };
}

/** Task-level two-sided sign-flip randomization test. */
export function signFlipTest(
  differences: readonly number[],
  options: SignFlipOptions = {},
): SignFlipResult {
  const mean = validateDifferences(differences);
  const seed = options.seed ?? 0;
  const maxExactN = options.maxExactN ?? MAX_EXACT_N;
  const simulations = options.simulations ?? MIN_SIMULATIONS;

  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (!Number.isInteger(maxExactN) || maxExactN < 1 || maxExactN > MAX_EXACT_N) {
    throw new Error(`exact enumeration threshold must be between 1 and ${MAX_EXACT_N}`);
  }
  if (!Number.isInteger(simulations) || simulations < MIN_SIMULATIONS) {
    throw new Error(`simulated sign-flip requires at least ${MIN_SIMULATIONS} replications`);
  }

  const observedAbs = Math.abs(mean);
  const exact = differences.length <= maxExactN;
  const { count, replications } = exact
    ? exactSignFlip(differences, observedAbs)
    : simulatedSignFlip(differences, observedAbs, seed, simulations);

  // The +1 correction keeps a simulated p-value strictly above zero.
  const pValue = exact ? count / replications : (count + 1) / (replications + 1);
  return Object.freeze({
    n: differences.length,
    observedMean: mean,
    pValue,
    method: exact ? 'exact' : 'simulated',
    replications,
    seed,
    alpha: ALPHA,
  });
}

/** Task-cluster bootstrap; provides a 95% interval ONLY, never a p-value. */
export function taskClusterBootstrapInterval(
  differences: readonly number[],
  options: BootstrapOptions = {},
): BootstrapIntervalResult {
  const mean = validateDifferences(differences);
  const seed = options.seed ?? 0;
  const replications = options.replications ?? BOOTSTRAP_REPLICATIONS;
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (!Number.isInteger(replications) || replications < BOOTSTRAP_REPLICATIONS) {
    throw new Error(`task-cluster bootstrap requires at least ${BOOTSTRAP_REPLICATIONS} replications`);
  }

  const n = differences.length;
  const random = makeSeededRandom(seed);
  const means = new Float64Array(replications);
  for (let r = 0; r < replications; r += 1) {
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      const index = Math.min(Math.floor(random() * n), n - 1);
      sum += differences[index] ?? 0;
    }
    means[r] = sum / n;
  }

  const sorted = Array.from(means).sort((left, right) => left - right);
  const tail = (1 - CONFIDENCE) / 2;
  const lower = sorted[Math.floor(tail * replications)] ?? mean;
  const upper = sorted[Math.min(Math.floor((1 - tail) * replications), replications - 1)] ?? mean;

  return Object.freeze({
    mean,
    lower,
    upper,
    crossesZero: lower <= 0 && upper >= 0,
    replications,
    seed,
    confidence: CONFIDENCE,
  });
}

/**
 * Mechanical combination of the three D2 verdict rules: significant
 * randomization p-value, interval not crossing zero, and an effect at least
 * the pre-registered MDE. A significant result below MDE fails; a
 * non-significant p-value fails even when the interval excludes zero.
 */
export function evaluatePrimaryOutcome(
  differences: readonly number[],
  options: PrimaryOutcomeOptions = {},
): PrimaryOutcomeResult {
  const seed = options.seed ?? 0;
  const signFlip = signFlipTest(differences, options);
  const interval = taskClusterBootstrapInterval(differences, {
    seed: options.bootstrapSeed ?? seed + 1,
    replications: options.bootstrapReplications,
  });

  const reasons: string[] = [];
  if (!(signFlip.pValue < signFlip.alpha)) {
    reasons.push(`randomization p=${signFlip.pValue} is not below alpha=${signFlip.alpha}`);
  }
  if (interval.crossesZero) {
    reasons.push('95% task-cluster interval crosses zero');
  }
  if (Math.abs(signFlip.observedMean) < FROZEN_MDE) {
    reasons.push(`effect ${signFlip.observedMean} is below the pre-registered MDE ${FROZEN_MDE}`);
  }

  return Object.freeze({
    passed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    pValue: signFlip.pValue,
    observedMean: signFlip.observedMean,
    mde: FROZEN_MDE,
    alpha: ALPHA,
    signFlip,
    interval,
  });
}
