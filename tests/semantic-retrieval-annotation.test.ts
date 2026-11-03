import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  validateQuery,
  validateRelease,
  validateReview,
} from '../scripts/measure/semantic-retrieval-annotation.mjs';

function syntheticCandidates() {
  const corpora = new Map([
    ['dev-corpus', { id: 'dev-corpus', language: 'typescript', split: 'development' }],
    ['holdout-corpus', { id: 'holdout-corpus', language: 'python', split: 'holdout' }],
  ]);
  const queries = Array.from({ length: 4 }, (_, index) => ({
    id: `q-${index}`,
    corpus: index < 3 ? 'dev-corpus' : 'holdout-corpus',
    split: index < 3 ? 'development' : 'holdout',
    query: 'Which entry handles this request?',
    expectedFiles: ['src/entry.ts'],
    evidence: { symbol: 'handle', startLine: 1 },
    hardNegatives: ['src/other.ts', 'src/helper.ts'],
  }));
  return {
    candidateSha256: 'a'.repeat(64),
    probeSha256: 'b'.repeat(64),
    corpora,
    queries,
    addition: {
      policy: {
        minimumQuestionsPerCorpus: 1,
        minimumTotalAccepted: 4,
        minimumHoldoutFraction: 0.25,
        wholeHoldoutCorpus: 'holdout-corpus',
      },
    },
  };
}
function reviewFixture() {
  const candidates = syntheticCandidates();
  return {
    candidates,
    review: {
      metric: 'semantic-retrieval-human-review',
      version: 1,
      candidateSha256: candidates.candidateSha256,
      probeSha256: candidates.probeSha256,
      reviewer: 'synthetic-test-reviewer-not-a-real-approval',
      reviewedAt: '2026-11-02T12:00:00+08:00',
      independentOfTuning: true,
      rankingsShown: false,
      corpusApproved: { 'dev-corpus': true, 'holdout-corpus': true },
      notes: 'Protocol unit-test fixture only.',
      decisions: candidates.queries.map((query) => ({
        id: query.id,
        decision: 'accept',
        revised: null,
        notes: '',
      })),
    },
  };
}

describe('semantic retrieval Human-blind review protocol', () => {
  it('accepts a fully reviewed synthetic fixture without touching real labels', () => {
    const { candidates, review } = reviewFixture();
    const result = validateReview(review, candidates, { requireApproval: true });
    expect(result.accepted).toHaveLength(4);
    expect(result.summary.holdoutFraction).toBe(0.25);
  });

  it('rejects pending, missing identity, corpus approval, and stale hashes', () => {
    const { candidates, review } = reviewFixture();
    for (const mutate of [
      (value: any) => { value.decisions[0].decision = 'pending'; },
      (value: any) => { value.reviewer = null; },
      (value: any) => { value.independentOfTuning = false; },
      (value: any) => { value.corpusApproved['holdout-corpus'] = false; },
      (value: any) => { value.candidateSha256 = 'c'.repeat(64); },
      (value: any) => { value.rankingsShown = true; },
    ]) {
      const copy = structuredClone(review);
      mutate(copy);
      expect(() => validateReview(copy, candidates, { requireApproval: true })).toThrow();
    }
  });

  it('requires explicit, anchored amendments and rejects silent label reduction', () => {
    const { candidates, review } = reviewFixture();
    review.decisions[0].decision = 'amend';
    review.decisions[0].revised = { query: 'Revised natural-language entry question?' };
    expect(validateReview(review, candidates, { requireApproval: true }).accepted[0].query).toBe(
      'Revised natural-language entry question?',
    );
    for (const revised of [
      { id: 'renamed' },
      { corpus: 'other' },
      { evidence: { symbol: 'handle', startLine: 0 } },
      {},
    ]) {
      const copy = structuredClone(review);
      copy.decisions[0].revised = revised;
      expect(() => validateReview(copy, candidates, { requireApproval: true })).toThrow();
    }
    const rejected = structuredClone(review);
    rejected.decisions[0] = { id: 'q-0', decision: 'reject', revised: null, notes: 'Ambiguous' };
    expect(() => validateReview(rejected, candidates, { requireApproval: true })).toThrow(
      /only 3 accepted/,
    );
  });

  it('keeps an entire holdout corpus and does not allow answer/distractor overlap', () => {
    const { candidates, review } = reviewFixture();
    const result = validateReview(review, candidates, { requireApproval: true });
    const moved = structuredClone(result.accepted);
    moved[0].split = 'holdout';
    moved[3].split = 'development';
    expect(() => validateRelease(candidates.corpora, moved, candidates.addition.policy)).toThrow(
      /whole holdout corpus/,
    );
    const invalid = structuredClone(candidates.queries[0]);
    invalid.hardNegatives[0] = invalid.expectedFiles[0];
    expect(() => validateQuery(invalid, candidates.corpora)).toThrow(/also a hard negative/);
  });

  it('keeps the real 60-question package explicitly awaiting Human review', () => {
    const file = join(__dirname, '..', 'docs', 'baselines', 'semantic-retrieval-human-annotation-v1.json');
    const baseline = JSON.parse(readFileSync(file, 'utf8'));
    expect(baseline.status).toBe('candidate-awaiting-human-review');
    expect(baseline.review.reviewer).toBeNull();
    expect(baseline.review.decision).toBe('pending');
    expect(baseline.queries).toHaveLength(36);
  });
});
