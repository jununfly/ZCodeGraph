import { describe, expect, it } from 'vitest';
import {
  MIN_DOUBLE_REVIEW_SHARE,
  MIN_RAW_AGREEMENT,
  assertAuditAgreement,
  assertBlinded,
  blindToolCalls,
  rawAgreementRate,
  revealJudgments,
  reviewCoverage,
  type AuditCategory,
  type AuditJudgment,
  type LabeledToolCall,
} from '../src/eval/zra-paired-audit';

const calls: LabeledToolCall[] = Array.from({ length: 10 }, (_, i) => ({
  callId: `call-${i + 1}`,
  arm: (['A', 'C', 'S'] as const)[i % 3],
  payload: `tool-call-payload-${i + 1}`,
}));

const categories: readonly AuditCategory[] = [
  'recovery', 'deepening', 'edit-prep', 'verification', 'recovery',
  'deepening', 'edit-prep', 'verification', 'recovery', 'deepening',
];

const judgments = (list: readonly AuditCategory[]): AuditJudgment[] =>
  list.map((category, index) => ({
    blindedId: `B-${String(index + 1).padStart(4, '0')}`,
    category,
  }));

describe('arm-blinded double review', () => {
  it('freezes the 90% raw agreement and 20% double-review gates', () => {
    expect(MIN_RAW_AGREEMENT).toBe(0.9);
    expect(MIN_DOUBLE_REVIEW_SHARE).toBe(0.2);
  });

  it('strips callId and arm, keeps payloads, and is reproducible for a fixed seed', () => {
    const first = blindToolCalls(calls, 20261110);
    const second = blindToolCalls(calls, 20261110);

    expect(first.blinded).toEqual(second.blinded);
    expect(first.blinded).toHaveLength(calls.length);
    for (const record of first.blinded) {
      expect(Object.keys(record).sort()).toEqual(['blindedId', 'payload']);
      expect(() => assertBlinded(record)).not.toThrow();
    }
    expect(first.blinded.map((r) => r.payload).sort())
      .toEqual(calls.map((c) => c.payload).sort());
    expect(blindToolCalls(calls, 20261111).blinded.map((r) => r.blindedId))
      .toEqual(first.blinded.map((r) => r.blindedId));
    expect(blindToolCalls(calls, 20261111).blinded.map((r) => r.payload))
      .not.toEqual(first.blinded.map((r) => r.payload));
  });

  it('rejects a leaked arm label and malformed calls', () => {
    expect(() => assertBlinded({ blindedId: 'B-0001', payload: 'x', arm: 'A' }))
      .toThrow(/arm label leaked/);
    expect(() => blindToolCalls([], 1)).toThrow(/at least one/);
    expect(() => blindToolCalls([
      { callId: 'same', arm: 'A', payload: 'x' },
      { callId: 'same', arm: 'C', payload: 'y' },
    ], 1)).toThrow(/unique/);
    expect(() => blindToolCalls([{ callId: 'x', arm: 'Z' as 'A', payload: 'y' }], 1))
      .toThrow(/unknown retrieval arm/);
  });

  it('keeps a sealed reveal key and only unblinds on explicit request', () => {
    const { blinded, revealKey } = blindToolCalls(calls, 7);
    expect(revealKey).toHaveLength(calls.length);
    expect(new Set(revealKey.map((e) => e.callId)).size).toBe(calls.length);

    const revealed = revealJudgments(
      blinded.map((record, i) => ({ blindedId: record.blindedId, category: categories[i]! })),
      revealKey,
    );
    expect(revealed).toHaveLength(calls.length);
    for (const entry of revealed) {
      const original = calls.find((c) => c.callId === entry.callId);
      expect(original?.arm).toBe(entry.arm);
    }
    expect(() => revealJudgments([{ blindedId: 'B-9999', category: 'recovery' }], revealKey))
      .toThrow(/unknown blindedId/);
  });

  it('computes agreed / double-reviewed, including the exact 90% boundary', () => {
    const primary = judgments(categories);
    expect(rawAgreementRate(primary, [...primary].reverse())).toMatchObject({
      total: 10, agreed: 10, rate: 1, threshold: 0.9, meetsThreshold: true,
    });

    const oneDisagreement = [...categories];
    oneDisagreement[9] = 'verification';
    expect(rawAgreementRate(primary, judgments(oneDisagreement))).toMatchObject({
      agreed: 9, rate: 0.9, meetsThreshold: true,
    });

    const twoDisagreements = [...categories];
    twoDisagreements[8] = 'verification';
    twoDisagreements[9] = 'verification';
    const failing = rawAgreementRate(primary, judgments(twoDisagreements));
    expect(failing).toMatchObject({ agreed: 8, rate: 0.8, meetsThreshold: false });
    expect(() => assertAuditAgreement(primary, judgments(twoDisagreements)))
      .toThrow(/repair the classification protocol/);
  });

  it('fails closed on mismatched call sets, empty sets and unknown categories', () => {
    const primary = judgments(categories);
    const shifted = judgments(categories).map((j, i) =>
      i === 9 ? { ...j, blindedId: 'B-9999' } : j);
    expect(() => rawAgreementRate(primary, shifted)).toThrow(/missing a judgment/);
    expect(() => rawAgreementRate([], primary)).toThrow(/non-empty/);
    expect(() => rawAgreementRate(primary, judgments([...categories]).slice(0, 9)))
      .toThrow(/same number of calls/);
    expect(() => rawAgreementRate(primary, [{
      blindedId: 'B-0001', category: 'recovery',
    }])).toThrow(/same number of calls/);
    expect(() => rawAgreementRate([{
      blindedId: 'B-0001', category: 'unknown' as AuditCategory,
    }], primary)).toThrow(/unknown audit category/);
  });

  it('measures double-review coverage against the full trajectory set', () => {
    const all = Array.from({ length: 10 }, (_, i) => `T-${i}`);
    expect(reviewCoverage(all.slice(0, 2), all)).toMatchObject({
      total: 10, reviewed: 2, share: 0.2, required: 0.2, meetsRequirement: true,
    });
    expect(reviewCoverage(all.slice(0, 1), all).meetsRequirement).toBe(false);
    expect(() => reviewCoverage(['outside'], all)).toThrow(/not in the trajectory set/);
    expect(() => reviewCoverage([], [])).toThrow(/non-empty/);
  });
});
