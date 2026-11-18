import { describe, expect, it } from 'vitest';
import {
  assertArmSwitchAllowed,
  canEnableRetrievalArm,
  type ArmSwitchEvidence,
} from '../src/eval/zra-paired-gate';

const emptyEvidence = (): ArmSwitchEvidence => ({
  baselineConclusion: null,
  baselineRunId: null,
  taskSetReviewed: false,
  taskFreshnessReviewer: null,
  namedReviewers: [],
  reviewerIsHuman: false,
  correctnessNonInferiority: null,
});

const completeEvidence = (): ArmSwitchEvidence => ({
  baselineConclusion: 'pass',
  baselineRunId: 'baseline-run-001',
  taskSetReviewed: true,
  taskFreshnessReviewer: 'Human reviewer',
  namedReviewers: ['victo', 'external-human-reviewer'],
  reviewerIsHuman: true,
  retrievalArm: 'C',
  correctnessNonInferiority: 0,
});

describe('baseline fail-closed gate (S3)', () => {
  it('stays blocked until all four Human-owned evidence gates are satisfied', () => {
    const blocked = canEnableRetrievalArm(emptyEvidence());
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toHaveLength(4);
    expect(() => assertArmSwitchAllowed(emptyEvidence()))
      .toThrow(/Agent Sufficiency baseline/);

    const open = canEnableRetrievalArm(completeEvidence());
    expect(open.allowed).toBe(true);
    expect(open.reasons).toEqual([]);

    const variants: Partial<ArmSwitchEvidence>[] = [
      { baselineConclusion: null },
      { baselineRunId: null },
      { taskSetReviewed: false },
      { taskFreshnessReviewer: null },
      { namedReviewers: [] },
      { namedReviewers: ['victo', 'victo'] },
      { retrievalArm: undefined },
      { reviewerIsHuman: false },
      { correctnessNonInferiority: null },
      { baselineConclusion: 'fail' },
    ];
    for (const patch of variants) {
      expect(canEnableRetrievalArm({ ...completeEvidence(), ...patch }).allowed).toBe(false);
    }
  });
});
