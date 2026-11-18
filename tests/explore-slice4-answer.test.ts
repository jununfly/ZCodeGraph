/**
 * Slice 4.4 / 4.6: Complete result interface + budget-exhausted envelope — unit tests.
 */

import { describe, expect, it } from 'vitest';
import {
  extractReport,
  isAnswer,
  isFailed,
  resolveResultState,
  type ExploreResult,
} from '../src/explore/answer';
import {
  buildBudgetExhaustedEnvelope,
  CapBelowProtocolMinimumError,
  measureEnvelopeBytes,
  validateCapAgainstProtocolMinimum,
  MAX_STABLE_IDS,
} from '../src/explore/exhausted';
import type { ExploreReport } from '../src/explore/ledger';
import { makeSnapshotIdentity } from '../src/explore/snapshot';

function fakeReport(): ExploreReport {
  return {
    status: 'partial',
    snapshot: makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
    coverage: {
      status: 'partial',
      dispositions: {},
      selectedRequirements: 0,
      returnedRequirements: 0,
      degradedRequirements: 0,
      omittedRequirements: 0,
      obligations: [],
      gaps: [],
      searchExhausted: false,
      selectedEvidencePreserved: false,
    },
    omissions: [],
    diagnostics: [],
    workBudgetFingerprint: 'abc',
  };
}

// ---------------------------------------------------------------------------
// ExploreResult union
// ---------------------------------------------------------------------------

describe('Slice 4.4 — ExploreResult union', () => {
  it('isFailed identifies failure envelopes', () => {
    const r: ExploreResult = { kind: 'failed', code: 'snapshot-lost', text: '...' };
    expect(isFailed(r)).toBe(true);
    expect(isAnswer(r)).toBe(false);
  });

  it('isAnswer identifies non-failed answers', () => {
    const r: ExploreResult = { kind: 'empty', text: 'none', report: fakeReport() };
    expect(isAnswer(r)).toBe(true);
    expect(isFailed(r)).toBe(false);
  });

  it('extractReport returns the report for answers', () => {
    const rep = fakeReport();
    const r: ExploreResult = { kind: 'answer', markdown: 'x', report: rep };
    expect(extractReport(r)).toBe(rep);
  });

  it('extractReport throws on failure envelopes', () => {
    const r: ExploreResult = { kind: 'failed', code: 'aborted', text: '' };
    expect(() => extractReport(r)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveResultState (§397-§408 precedence)
// ---------------------------------------------------------------------------

describe('Slice 4.4 — resolveResultState precedence', () => {
  it('failure wins over everything', () => {
    expect(resolveResultState({
      failureCode: 'snapshot-lost',
      anchorCount: 5,
      returnedOrDegradedCount: 5,
      hasQueryInterpretationGap: false,
      allRequiredSatisfied: true,
      hasRequiredGap: false,
    })).toBe('failed');
  });

  it('empty requires no anchor + no returned+degraded + no QI gap', () => {
    expect(resolveResultState({
      anchorCount: 0,
      returnedOrDegradedCount: 0,
      hasQueryInterpretationGap: false,
      allRequiredSatisfied: false,
      hasRequiredGap: false,
    })).toBe('empty');
  });

  it('QI gap alone prevents empty (returns partial)', () => {
    expect(resolveResultState({
      anchorCount: 0,
      returnedOrDegradedCount: 0,
      hasQueryInterpretationGap: true,
      allRequiredSatisfied: false,
      hasRequiredGap: false,
    })).toBe('answer-partial');
  });

  it('answer-complete requires allRequiredSatisfied AND no required gap', () => {
    expect(resolveResultState({
      anchorCount: 1,
      returnedOrDegradedCount: 1,
      hasQueryInterpretationGap: false,
      allRequiredSatisfied: true,
      hasRequiredGap: false,
    })).toBe('answer-complete');
  });

  it('required gap forces partial even with allRequiredSatisfied', () => {
    expect(resolveResultState({
      anchorCount: 1,
      returnedOrDegradedCount: 1,
      hasQueryInterpretationGap: false,
      allRequiredSatisfied: true,
      hasRequiredGap: true,
    })).toBe('answer-partial');
  });
});

// ---------------------------------------------------------------------------
// Budget-exhausted envelope
// ---------------------------------------------------------------------------

describe('Slice 4.6 — budget-exhausted envelope', () => {
  it('produces a deterministic bounded envelope', () => {
    const input = {
      selectedRequirements: 10,
      returnedRequirements: 3,
      omittedRequirements: 7,
      gapIds: ['g1', 'g2', 'g3'],
    };
    const a = buildBudgetExhaustedEnvelope(input);
    const b = buildBudgetExhaustedEnvelope(input);
    expect(a.text).toBe(b.text);
    expect(measureEnvelopeBytes(a)).toBe(measureEnvelopeBytes(b));
    expect(a.kind).toBe('failed');
    expect(a.code).toBe('budget-exhausted');
  });

  it('caps stableIds at MAX_STABLE_IDS', () => {
    const many = Array.from({ length: 50 }, (_, i) => `g${i}`);
    const env = buildBudgetExhaustedEnvelope({
      selectedRequirements: 50,
      returnedRequirements: 0,
      omittedRequirements: 50,
      gapIds: many,
    });
    expect(env.stableIds.length).toBeLessThanOrEqual(MAX_STABLE_IDS);
  });

  it('is NEVER complete', () => {
    const env = buildBudgetExhaustedEnvelope({
      selectedRequirements: 0,
      returnedRequirements: 0,
      omittedRequirements: 0,
      gapIds: [],
    });
    expect(env.kind).toBe('failed');
  });
});

describe('Slice 4.6 — validateCapAgainstProtocolMinimum', () => {
  const envelope = buildBudgetExhaustedEnvelope({
    selectedRequirements: 0,
    returnedRequirements: 0,
    omittedRequirements: 0,
    gapIds: [],
  });

  it('throws CapBelowProtocolMinimumError when cap is too small', () => {
    expect(() => validateCapAgainstProtocolMinimum(
      {
        maxOutputUtf8Bytes: 1,
        transportReservation: { utf8Bytes: 0 },
        optionalCliNewlineBytes: 0,
        minimumErrorUtf8Bytes: measureEnvelopeBytes(envelope),
      },
      envelope,
    )).toThrow(CapBelowProtocolMinimumError);
  });

  it('accepts a cap that fits the minimum envelope', () => {
    const required = measureEnvelopeBytes(envelope) + 10;
    expect(() => validateCapAgainstProtocolMinimum(
      {
        maxOutputUtf8Bytes: required,
        transportReservation: { utf8Bytes: 5 },
        optionalCliNewlineBytes: 1,
        minimumErrorUtf8Bytes: measureEnvelopeBytes(envelope),
      },
      envelope,
    )).not.toThrow();
  });
});
