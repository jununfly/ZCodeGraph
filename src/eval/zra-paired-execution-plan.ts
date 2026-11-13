import { createHash } from 'node:crypto';
import { assignOrdersToTasks, assertNoAbba, type ArmOrder } from './zra-paired-design';
import { computeConfigFingerprint, type SharedRunConfig } from './zra-paired-core';
import type { RunScope } from './zra-paired-ledger';

/** Preparation-only prerequisites; no judgment is inferred from process validity. */
export interface PairedExecutionReadiness {
  readonly taskSetReviewed: boolean;
  readonly taskFreshnessReviewer: string | null;
  readonly primaryRunReviewer: string | null;
  readonly secondaryRunReviewer: string | null;
  readonly reviewersAreHuman: boolean;
  readonly indexToolCoverageVerified: boolean;
  readonly productionArmsReady: boolean;
  readonly desBaselineConclusion: 'pass' | 'fail' | 'inconclusive' | null;
  readonly desBaselineRunId: string | null;
  readonly correctnessNonInferiority: number | null;
}

export interface PairedExecutionPlanOptions {
  readonly configs: readonly SharedRunConfig[];
  readonly scope: RunScope;
  readonly seed: number;
  readonly schedule: readonly ArmOrder[];
  readonly readiness: PairedExecutionReadiness;
}

export interface PlannedPairedBlock {
  readonly taskId: string;
  readonly trial: number;
  readonly seed: number;
  readonly orders: readonly ArmOrder[];
  readonly configFingerprint: string;
}

/**
 * A manifest of reservations, not a ledger of attempts. Preparing it consumes
 * zero paired-runs and never calls retrieval, an adapter, or a model.
 */
export function preparePairedExecutionPlan(options: PairedExecutionPlanOptions) {
  if (!Number.isInteger(options.seed)) throw new Error('seed must be an integer');
  if (options.configs.length === 0) throw new Error('at least one task configuration is required');
  const assignments = assignOrdersToTasks(
    options.configs.map((config) => config.taskId), options.schedule, options.seed,
  );
  const blocks: PlannedPairedBlock[] = [];
  for (const [index, assignment] of assignments.entries()) {
    const config = options.configs[index]!;
    assignment.orders.forEach((order, orderIndex) => {
      const orders = [order];
      assertNoAbba(orders);
      blocks.push(Object.freeze({
        taskId: config.taskId,
        trial: orderIndex + 1,
        seed: options.seed,
        orders: Object.freeze([...assignment.orders]),
        configFingerprint: computeConfigFingerprint(config),
      }));
    });
  }
  const readiness = options.readiness;
  const reasons: string[] = [];
  if (!readiness.taskSetReviewed || !readiness.taskFreshnessReviewer) {
    reasons.push('task set and Task Freshness review are incomplete');
  }
  if (!readiness.primaryRunReviewer || !readiness.secondaryRunReviewer
    || readiness.secondaryRunReviewer === 'UNSET' || !readiness.reviewersAreHuman) {
    reasons.push('second independent Human run reviewer is UNSET');
  } else if (readiness.primaryRunReviewer === readiness.secondaryRunReviewer) {
    reasons.push('second run reviewer must be a different Human from the primary reviewer');
  }
  if (!readiness.indexToolCoverageVerified) reasons.push('five-corpus index/tool coverage is incomplete');
  if (!readiness.productionArmsReady) reasons.push('production C/S wiring is incomplete');
  if (readiness.desBaselineConclusion !== 'pass' || !readiness.desBaselineRunId) {
    reasons.push('post-C Agent Sufficiency baseline has not passed');
  }
  if (readiness.correctnessNonInferiority === null
    || !Number.isFinite(readiness.correctnessNonInferiority)
    || readiness.correctnessNonInferiority < 0) {
    reasons.push('correctness non-inferiority is not pre-registered');
  }
  const frozenBlocks = Object.freeze(blocks);
  const manifestSha256 = createHash('sha256').update(JSON.stringify({
    scope: options.scope, seed: options.seed, schedule: options.schedule, blocks: frozenBlocks,
  })).digest('hex');
  return Object.freeze({
    status: reasons.length === 0 ? 'ready' as const : 'blocked' as const,
    reasons: Object.freeze(reasons),
    readiness: Object.freeze({ ...readiness }),
    seed: options.seed,
    plannedRuns: frozenBlocks.length * 3,
    consumedRuns: 0,
    blocks: frozenBlocks,
    manifestSha256,
  });
}
