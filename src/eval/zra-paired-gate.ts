/**
 * Fail-closed gate for the ZRA-Paired v1 retrieval-arm switch.
 *
 * DES-baseline-agent-sufficiency-v1 Trigger Matrix :42 requires an Agent
 * Sufficiency baseline whenever MCP tool behavior, shape, ranking or returned
 * evidence changes; ADR-0015 D1 binds that requirement to the implementation
 * stage. This module does NOT read or register flags and does NOT touch
 * plan()/sortedFiles: it only decides whether the four Human-owned evidence
 * gates are satisfied. Evidence is never inferred or fabricated here.
 */

export interface ArmSwitchEvidence {
  /** Conclusion of the Agent Sufficiency baseline, owned by Human. */
  readonly baselineConclusion: 'pass' | 'fail' | null;
  readonly baselineRunId: string | null;
  /** Required for a C/S switch: pre-C Flask evidence cannot satisfy this gate. */
  readonly retrievalArm?: 'C';
  /** Independent task set plus Task Freshness review. */
  readonly taskSetReviewed: boolean;
  readonly taskFreshnessReviewer: string | null;
  /** Q68: the reviewer is Human, never the agent. */
  readonly namedReviewers: readonly string[];
  readonly reviewerIsHuman: boolean;
  /** Pre-registered correctness non-inferiority value. */
  readonly correctnessNonInferiority: number | null;
}

export interface ArmSwitchGateResult {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export function canEnableRetrievalArm(evidence: ArmSwitchEvidence): ArmSwitchGateResult {
  const reasons: string[] = [];

  if (evidence.baselineConclusion !== 'pass' || !evidence.baselineRunId || evidence.retrievalArm !== 'C') {
    reasons.push('post-C Agent Sufficiency baseline evidence is missing or not passed (Trigger Matrix :42)');
  }
  if (!evidence.taskSetReviewed || !evidence.taskFreshnessReviewer) {
    reasons.push('independent task set and Task Freshness review are not recorded');
  }
  if (evidence.namedReviewers.length < 2 || new Set(evidence.namedReviewers).size < 2 || !evidence.reviewerIsHuman) {
    reasons.push('two distinct named Human reviewers are required; one reviewer in two passes is not independent (Q68)');
  }
  const nonInferiority = evidence.correctnessNonInferiority;
  if (nonInferiority === null || !Number.isFinite(nonInferiority) || nonInferiority < 0) {
    reasons.push('correctness non-inferiority value is not pre-registered');
  }

  return Object.freeze({ allowed: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function assertArmSwitchAllowed(evidence: ArmSwitchEvidence): void {
  const result = canEnableRetrievalArm(evidence);
  if (!result.allowed) {
    throw new Error(`retrieval-arm switch is blocked: ${result.reasons.join('; ')}`);
  }
}
