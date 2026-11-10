import { permuteWithFixedSeed, type RetrievalArm } from './zra-paired-core';

/**
 * Arm-blinded double review (ADR-0015 D5; audit-agreement in the frozen
 * evaluation methodology). Two reviewers independently classify tool calls
 * with the retrieval arm hidden; the raw agreement must reach 90% or the
 * classification protocol is repaired rather than used for confirmation.
 *
 * Pure by construction: this module blinds, measures agreement and reveals
 * on explicit request. It never reads a transcript, never guesses a category
 * and never decides whether a product gate has been met.
 */

/** Constructive trajectory categories used by the fallback audit protocol. */
export const AUDIT_CATEGORIES = Object.freeze([
  'recovery', 'deepening', 'edit-prep', 'verification',
] as const);

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Frozen pilot gate for raw agreement. */
export const MIN_RAW_AGREEMENT = 0.9;

/** At least 20% of confirmation trajectories must receive a double review. */
export const MIN_DOUBLE_REVIEW_SHARE = 0.2;

export interface LabeledToolCall {
  readonly callId: string;
  readonly arm: RetrievalArm;
  readonly payload: string;
}

/** Reviewers see only this shape: no callId (may encode the arm) and no arm. */
export interface BlindedToolCall {
  readonly blindedId: string;
  readonly payload: string;
}

export interface RevealEntry {
  readonly blindedId: string;
  readonly callId: string;
  readonly arm: RetrievalArm;
}

export interface BlindingResult {
  readonly blinded: readonly BlindedToolCall[];
  readonly revealKey: readonly RevealEntry[];
  readonly seed: number;
}

export interface AuditJudgment {
  readonly blindedId: string;
  readonly category: AuditCategory;
}

export interface RevealedJudgment extends AuditJudgment {
  readonly callId: string;
  readonly arm: RetrievalArm;
}

export interface AgreementReport {
  readonly total: number;
  readonly agreed: number;
  readonly rate: number;
  readonly threshold: number;
  readonly meetsThreshold: boolean;
}

export interface CoverageReport {
  readonly total: number;
  readonly reviewed: number;
  readonly share: number;
  readonly required: number;
  readonly meetsRequirement: boolean;
}

function isRetrievalArm(value: unknown): value is RetrievalArm {
  return value === 'A' || value === 'C' || value === 'S';
}

function isAuditCategory(value: unknown): value is AuditCategory {
  return typeof value === 'string' && (AUDIT_CATEGORIES as readonly string[]).includes(value);
}

/** Structural guarantee that an audit record carries no arm label. */
export function assertBlinded(record: unknown): asserts record is BlindedToolCall {
  if (typeof record !== 'object' || record === null) {
    throw new Error('blinded record must be an object');
  }
  const candidate = record as Record<string, unknown>;
  if ('arm' in candidate || 'callId' in candidate) {
    throw new Error('arm label leaked into a blinded audit record');
  }
  if (typeof candidate.blindedId !== 'string' || typeof candidate.payload !== 'string') {
    throw new Error('blinded record requires blindedId and payload strings');
  }
}

/**
 * Shuffle with a fixed seed and strip callId/arm. The reveal key is returned
 * separately: keep it sealed until the confirmation phase, never hand it to
 * a reviewer. Same seed reproduces the same blinding for audit replay.
 */
export function blindToolCalls(calls: readonly LabeledToolCall[], seed: number): BlindingResult {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (calls.length === 0) throw new Error('at least one tool call is required');

  const seen = new Set<string>();
  for (const call of calls) {
    if (typeof call.callId !== 'string' || call.callId.length === 0 || seen.has(call.callId)) {
      throw new Error('callId must be non-empty and unique');
    }
    seen.add(call.callId);
    if (!isRetrievalArm(call.arm)) throw new Error(`unknown retrieval arm: ${String(call.arm)}`);
    if (typeof call.payload !== 'string') throw new Error('payload must be a string');
  }

  const shuffled = permuteWithFixedSeed(calls, seed);
  const blinded: BlindedToolCall[] = [];
  const revealKey: RevealEntry[] = [];
  shuffled.forEach((call, index) => {
    const blindedId = `B-${String(index + 1).padStart(4, '0')}`;
    const record = Object.freeze({ blindedId, payload: call.payload });
    assertBlinded(record);
    blinded.push(record);
    revealKey.push(Object.freeze({ blindedId, callId: call.callId, arm: call.arm }));
  });

  return Object.freeze({
    blinded: Object.freeze(blinded),
    revealKey: Object.freeze(revealKey),
    seed,
  });
}

function indexJudgments(judgments: readonly AuditJudgment[]): Map<string, AuditCategory> {
  const indexed = new Map<string, AuditCategory>();
  for (const judgment of judgments) {
    if (typeof judgment.blindedId !== 'string' || judgment.blindedId.length === 0) {
      throw new Error('blindedId is required');
    }
    if (!isAuditCategory(judgment.category)) {
      throw new Error(`unknown audit category: ${String(judgment.category)}`);
    }
    if ('arm' in judgment || 'callId' in judgment) {
      throw new Error('arm label leaked into a reviewer judgment');
    }
    if (indexed.has(judgment.blindedId)) {
      throw new Error(`duplicate blindedId ${judgment.blindedId} in one reviewer's judgments`);
    }
    indexed.set(judgment.blindedId, judgment.category);
  }
  return indexed;
}

/**
 * agreed calls / double-reviewed calls. Both reviewers must judge exactly the
 * same call set: comparing only the intersection would let a reviewer drop
 * disagreements, and an empty set would fake a 100% agreement.
 */
export function rawAgreementRate(
  primary: readonly AuditJudgment[],
  secondary: readonly AuditJudgment[],
): AgreementReport {
  if (primary.length === 0 || secondary.length === 0) {
    throw new Error('double review requires non-empty judgments from both reviewers');
  }
  const left = indexJudgments(primary);
  const right = indexJudgments(secondary);
  if (left.size !== right.size) {
    throw new Error('reviewers must judge the same number of calls');
  }

  let agreed = 0;
  for (const [blindedId, category] of left) {
    const counterpart = right.get(blindedId);
    if (counterpart === undefined) {
      throw new Error(`second reviewer is missing a judgment for ${blindedId}`);
    }
    if (counterpart === category) agreed += 1;
  }

  const rate = agreed / left.size;
  return Object.freeze({
    total: left.size,
    agreed,
    rate,
    threshold: MIN_RAW_AGREEMENT,
    meetsThreshold: rate >= MIN_RAW_AGREEMENT,
  });
}

/** Fail closed before unblinding; below 90% means repair the protocol. */
export function assertAuditAgreement(
  primary: readonly AuditJudgment[],
  secondary: readonly AuditJudgment[],
): AgreementReport {
  const report = rawAgreementRate(primary, secondary);
  if (!report.meetsThreshold) {
    throw new Error(
      `raw agreement ${(report.rate * 100).toFixed(1)}% is below ${MIN_RAW_AGREEMENT * 100}%: ` +
      `repair the classification protocol; do not proceed to confirmation`,
    );
  }
  return report;
}

/** Explicit unblinding, to be called only in the confirmation phase. */
export function revealJudgments(
  judgments: readonly AuditJudgment[],
  revealKey: readonly RevealEntry[],
): readonly RevealedJudgment[] {
  const byBlindedId = new Map(revealKey.map((entry) => [entry.blindedId, entry]));
  return Object.freeze(judgments.map((judgment) => {
    const entry = byBlindedId.get(judgment.blindedId);
    if (!entry) throw new Error(`unknown blindedId ${judgment.blindedId}`);
    return Object.freeze({
      blindedId: judgment.blindedId,
      category: judgment.category,
      callId: entry.callId,
      arm: entry.arm,
    });
  }));
}

export function reviewCoverage(
  reviewedIds: readonly string[],
  allIds: readonly string[],
): CoverageReport {
  if (allIds.length === 0) throw new Error('a non-empty trajectory set is required');
  const all = new Set(allIds);
  if (all.size !== allIds.length) throw new Error('allIds must be unique');
  const reviewed = new Set(reviewedIds);
  for (const id of reviewed) {
    if (!all.has(id)) throw new Error(`reviewed id ${id} is not in the trajectory set`);
  }
  const share = reviewed.size / all.size;
  return Object.freeze({
    total: all.size,
    reviewed: reviewed.size,
    share,
    required: MIN_DOUBLE_REVIEW_SHARE,
    meetsRequirement: share >= MIN_DOUBLE_REVIEW_SHARE,
  });
}
