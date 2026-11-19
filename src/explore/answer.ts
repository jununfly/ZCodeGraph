/**
 * Slice 4.4: Complete result interface (DES-universal-structural-explore-v1 §93-§147).
 *
 * This is the FIRST slice allowed to extend the public ExploreAnswer
 * schema. Slices 1-3 explicitly preserved the legacy union; Slice 4
 * replaces it with the complete contract shape:
 *
 *   ExploreResult = ExploreAnswer | { kind: 'failed', code, text }
 *   ExploreAnswer =
 *     | { kind: 'empty', text, report }
 *     | { kind: 'answer', markdown, report }
 *
 * The application boundary returns this union for both implementations.
 * Legacy composition still supplies the default text; the internal report
 * never becomes ToolResult/metadata without a separate compatibility review.
 */

import type { ExploreReport } from './ledger';

// ===========================================================================
// Failure codes (§101-§109)
// ===========================================================================

export type ExploreFailureCode =
  | 'aborted'
  | 'invalid-input'
  | 'snapshot-lost'
  | 'graph-unavailable'
  | 'source-unavailable'
  | 'source-changed'
  | 'source-too-large'
  | 'budget-exhausted';

// ===========================================================================
// Complete result union
// ===========================================================================

/**
 * The complete Slice 4 answer shape. Carries the internal ExploreReport
 * alongside the rendered payload; the report is observable but does
 * not alter the answer's external meaning.
 */
export type ExploreAnswerComplete =
  | { kind: 'empty'; text: string; report: ExploreReport }
  | { kind: 'answer'; markdown: string; report: ExploreReport };

/** Top-level result: either a non-failed answer or a failure envelope. */
export type ExploreResult =
  | ExploreAnswerComplete
  | { kind: 'failed'; code: ExploreFailureCode; text: string };

// ===========================================================================
// Helpers
// ===========================================================================

/** True iff the result is a failure envelope. */
export function isFailed(result: ExploreResult): result is { kind: 'failed'; code: ExploreFailureCode; text: string } {
  return result.kind === 'failed';
}

/** True iff the result is a non-failed answer. */
export function isAnswer(result: ExploreResult): result is ExploreAnswerComplete {
  return result.kind === 'empty' || result.kind === 'answer';
}

/** Extract the report from a non-failed answer. Throws on failure envelopes. */
export function extractReport(result: ExploreResult): ExploreReport {
  if (isFailed(result)) {
    throw new Error(`extractReport called on failure envelope: ${result.code}`);
  }
  return result.report;
}

// ===========================================================================
// Result-state precedence (§397-§408)
// ===========================================================================

/**
 * Resolve the mutually exclusive result state in the contract's exact
 * order:
 *   1. Unrecoverable failure with no usable answer → failed
 *   2. empty / no-evidence (no anchor, no returned+degraded, no
 *      query-interpretation gap, no failure)
 *   3. answer / complete (every required obligation satisfied, all
 *      required requirements returned, no required gap)
 *   4. answer / partial (everything else)
 *
 * This is a *resolver*, not a validator — the caller is responsible
 * for ensuring the inputs are coherent.
 */
export interface ResultStateInput {
  /** Set when an unrecoverable failure occurred and no usable answer exists. */
  failureCode?: ExploreFailureCode;
  /** Number of discovered anchors. */
  anchorCount: number;
  /** Number of returned + degraded requirements. */
  returnedOrDegradedCount: number;
  /** Whether a query-interpretation gap exists. */
  hasQueryInterpretationGap: boolean;
  /** Whether every required obligation is satisfied. */
  allRequiredSatisfied: boolean;
  /** Whether any required gap exists. */
  hasRequiredGap: boolean;
}

export type ResultState = 'failed' | 'empty' | 'answer-complete' | 'answer-partial';

export function resolveResultState(input: ResultStateInput): ResultState {
  // 1. Failure takes precedence.
  if (input.failureCode !== undefined) return 'failed';

  // 2. empty / no-evidence
  if (
    input.anchorCount === 0 &&
    input.returnedOrDegradedCount === 0 &&
    !input.hasQueryInterpretationGap &&
    !input.hasRequiredGap
  ) {
    return 'empty';
  }

  // 3. answer / complete
  if (input.allRequiredSatisfied && !input.hasRequiredGap
      && (input.anchorCount > 0 || input.returnedOrDegradedCount > 0)) {
    return 'answer-complete';
  }

  // 4. answer / partial
  return 'answer-partial';
}
