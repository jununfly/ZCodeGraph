/**
 * Slice 4.6: Minimum budget-exhausted envelope (DES-universal-structural-explore-v1 §555-§564).
 *
 * A fixed minimal `budget-exhausted` outcome handles a cap too small
 * for the minimum skeleton. It contains:
 *   - a stable code
 *   - bounded deterministic counts
 *   - a bounded number of stable requirement/gap IDs
 *
 * Its own envelope is size-checked and it is NEVER `complete`.
 *
 * A cap below the protocol minimum fails adapter validation BEFORE
 * retrieval rather than emitting a malformed answer (§562-§564).
 */

import { utf8ByteLength, type Utf8Budget } from './budget-utf8';
import type { ExploreFailureCode } from './answer';

// ===========================================================================
// Stable diagnostic codes (finite enum — §562-§563)
// ===========================================================================

export const DIAGNOSTIC_CODES = Object.freeze([
  'budget-exhausted',
  'snapshot-lost',
  'source-unavailable',
  'source-changed',
  'source-too-large',
  'graph-unavailable',
  'invalid-input',
  'aborted',
] as const);

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

// ===========================================================================
// Budget-exhausted envelope
// ===========================================================================

/**
 * The minimum budget-exhausted outcome. Bounded: at most
 * `MAX_STABLE_IDS` requirement/gap ids, counts are deterministic
 * (derived from inputs, never wall-clock).
 */
export const MAX_STABLE_IDS = 8;

export interface BudgetExhaustedEnvelope {
  kind: 'failed';
  code: 'budget-exhausted';
  /** Stable bounded text — no env, no clock, no secrets. */
  text: string;
  /** Bounded deterministic counts. */
  counts: {
    selectedRequirements: number;
    returnedRequirements: number;
    omittedRequirements: number;
    gapCount: number;
  };
  /** Bounded stable requirement/gap IDs. */
  stableIds: readonly string[];
}

export interface BudgetExhaustedInput {
  selectedRequirements: number;
  returnedRequirements: number;
  omittedRequirements: number;
  gapIds: readonly string[];
}

/**
 * Build the budget-exhausted envelope. Deterministic: same inputs
 * always produce the same envelope text and byte count.
 */
export function buildBudgetExhaustedEnvelope(
  input: BudgetExhaustedInput,
): BudgetExhaustedEnvelope {
  const stableIds = input.gapIds.slice(0, MAX_STABLE_IDS);
  const text = [
    'budget-exhausted: output cap too small for minimum skeleton',
    `selected=${input.selectedRequirements} returned=${input.returnedRequirements} omitted=${input.omittedRequirements} gaps=${input.gapIds.length}`,
    ...stableIds.map((id) => `gap:${id}`),
  ].join('\n');

  return {
    kind: 'failed',
    code: 'budget-exhausted',
    text,
    counts: {
      selectedRequirements: input.selectedRequirements,
      returnedRequirements: input.returnedRequirements,
      omittedRequirements: input.omittedRequirements,
      gapCount: input.gapIds.length,
    },
    stableIds,
  };
}

/**
 * Compute the byte size of the budget-exhausted envelope. The adapter
 * uses this as `minimumErrorUtf8Bytes` in the Slice 4.1 budget.
 */
export function measureEnvelopeBytes(envelope: BudgetExhaustedEnvelope): number {
  return utf8ByteLength(envelope.text);
}

// ===========================================================================
// Adapter validation
// ===========================================================================

export class CapBelowProtocolMinimumError extends Error {
  readonly code: ExploreFailureCode = 'invalid-input';
  constructor(readonly requiredBytes: number, readonly providedBytes: number) {
    super(
      `invalid-input: maxOutputUtf8Bytes (${providedBytes}) below protocol minimum (${requiredBytes})`,
    );
    this.name = 'CapBelowProtocolMinimumError';
  }
}

/**
 * Adapter-side validation: throws `CapBelowProtocolMinimumError` if
 * the requested cap cannot fit the minimum budget-exhausted envelope
 * plus its transport notices and the optional CLI newline.
 *
 * Must be called BEFORE retrieval (§562-§564).
 */
export function validateCapAgainstProtocolMinimum(
  budget: Utf8Budget,
  minimumEnvelope: BudgetExhaustedEnvelope,
): void {
  const envelopeBytes = measureEnvelopeBytes(minimumEnvelope);
  const required =
    envelopeBytes +
    budget.transportReservation.utf8Bytes +
    budget.optionalCliNewlineBytes;
  if (budget.maxOutputUtf8Bytes < required) {
    throw new CapBelowProtocolMinimumError(required, budget.maxOutputUtf8Bytes);
  }
}
