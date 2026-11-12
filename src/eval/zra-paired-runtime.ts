import {
  assertSamePayload,
  computeConfigFingerprint,
  permuteWithFixedSeed,
  type ArmRun,
  type RetrievalArm,
  type SharedRunConfig,
} from './zra-paired-core';
import {
  PairedRunLedger,
  type RunOutcome,
  type RunRecord,
  type RunScope,
} from './zra-paired-ledger';
import {
  blindToolCalls,
  assertAuditAgreement,
  type AgreementReport,
  type AuditJudgment,
} from './zra-paired-audit';
import { assignOrdersToTasks, type ArmOrder } from './zra-paired-design';

export interface RetrievalResult {
  readonly candidates: readonly unknown[];
  readonly payload: unknown;
}

export interface RetrievalInput {
  readonly arm: 'A' | 'C';
  readonly config: SharedRunConfig;
}

export interface ToolCallRecord {
  readonly name: string;
  readonly callId: string;
  readonly arguments: unknown;
  readonly timestamp?: string;
}

export interface AgentExecutionInput extends RetrievalResult {
  readonly arm: RetrievalArm;
  readonly config: SharedRunConfig;
  readonly seed: number;
}

export interface AgentExecutionResult {
  readonly outcome?: Exclude<RunOutcome, 'config-rejected'>;
  readonly toolCalls?: readonly ToolCallRecord[];
  readonly isolationBreached?: boolean;
}

export interface PairedEvaluationOptions {
  readonly config: SharedRunConfig;
  readonly scope: RunScope;
  readonly trial: number;
  readonly seed: number;
  readonly ledger?: PairedRunLedger;
  /** A balanced, predeclared set; the runner chooses its order for this task. */
  readonly schedule?: readonly ArmOrder[];
  /** Supply the provider-shared configuration observed for each attempted arm. */
  readonly sharedConfig?: (input: { arm: RetrievalArm }) => SharedRunConfig;
  readonly resolveConfigFingerprint?: (input: {
    arm: RetrievalArm;
    config: SharedRunConfig;
  }) => string | undefined;
  readonly retrieve: (input: RetrievalInput) => Promise<RetrievalResult>;
  readonly execute: (input: AgentExecutionInput) => Promise<AgentExecutionResult>;
}

export interface PairedArmExecution extends AgentExecutionInput {
  readonly outcome: RunOutcome;
  readonly toolCalls: readonly ToolCallRecord[];
}

export interface PairedEvaluationResult {
  readonly status: 'completed' | 'invalid';
  readonly invalidReason: string | null;
  readonly configFingerprint: string;
  readonly executions: readonly PairedArmExecution[];
  readonly manifest: readonly RunRecord[];
  readonly ledger: PairedRunLedger;
  readonly audit: Readonly<Omit<ReturnType<typeof blindToolCalls>, 'revealKey'> & {
    agreement: AgreementReport | null;
    reviewable: boolean;
  }>;
  /** Keep the key out of reviewer-facing output until confirmation. */
  readonly sealRevealKey: () => ReturnType<typeof blindToolCalls>['revealKey'];
  /** May be populated only after two independent reviewers have submitted judgments. */
  submitDoubleReview?: (
    primary: readonly AuditJudgment[],
    secondary: readonly AuditJudgment[],
  ) => PairedEvaluationResult;
}

/**
 * Runtime composition of the already-approved paired-run primitives. Retrieval
 * and agent execution are injected: this module does not implement symbol
 * union, register a production flag, or touch Explore ranking.
 */
export async function runPairedEvaluation(
  options: PairedEvaluationOptions,
): Promise<PairedEvaluationResult> {
  const ledger = options.ledger ?? new PairedRunLedger();
  const order: ArmOrder = options.schedule
    ? assignOrdersToTasks([options.config.taskId], options.schedule, options.seed)[0]!.orders[0]!
    : (['A', 'C', 'S'] as const);
  if (new Set(order).size !== 3 || !(['A', 'C', 'S'] as const).every((arm) => order.includes(arm))) {
    throw new Error('a paired block requires exactly one A, one C and one S arm');
  }
  ledger.assertCanStartBlock(options.scope, order.length);

  const runs: ArmRun[] = order.map((arm) => ({
    arm,
    config: options.sharedConfig?.({ arm }) ?? options.config,
  }));
  const configFingerprint = computeConfigFingerprint(options.config);
  const executions: PairedArmExecution[] = [];
  const before = ledger.entries().length;
  const pendingRecords: Array<{
    arm: RetrievalArm;
    outcome: RunOutcome;
    configFingerprint: string;
  }> = [];
  let invalidReason: string | null = null;
  let cRetrieval: RetrievalResult | null = null;

  for (let index = 0; index < order.length; index += 1) {
    const arm = order[index]!;
    if (invalidReason !== null && !executions.some((execution) => execution.arm === arm)) {
      const config = runs[index]!.config;
      const outcome = computeConfigFingerprint(config) !== configFingerprint
        ? 'config-rejected' as const
        : 'failed' as const;
      const observedFingerprint = options.resolveConfigFingerprint?.({ arm, config })
        ?? computeConfigFingerprint(config);
      executions.push(Object.freeze({
        arm, config, seed: options.seed, candidates: [], payload: null,
        outcome, toolCalls: Object.freeze([]),
      }));
      pendingRecords.push({ arm, outcome, configFingerprint: observedFingerprint });
      continue;
    }
    const config = runs[index]!.config;
    const observedFingerprint = options.resolveConfigFingerprint?.({ arm, config });
    const mismatch = computeConfigFingerprint(config) !== configFingerprint
      || (observedFingerprint !== undefined && observedFingerprint !== configFingerprint);
    let outcome: RunOutcome = mismatch ? 'config-rejected' : 'completed';
    let toolCalls: readonly ToolCallRecord[] = [];
    let retrieval: RetrievalResult = { candidates: [], payload: null };
    if (mismatch) {
      invalidReason ??= `configuration fingerprint mismatch at arm ${arm}`;
    }
    if (!invalidReason) {
      try {
        if (arm === 'S') {
          if (!cRetrieval) {
            const retrieved = await options.retrieve({ arm: 'C', config });
            cRetrieval = retrieved;
          }
          const candidates = permuteWithFixedSeed(cRetrieval.candidates, options.seed);
          assertSamePayload(cRetrieval.candidates, candidates);
          retrieval = { candidates, payload: cRetrieval.payload };
        } else if (arm === 'C') {
          if (!cRetrieval) cRetrieval = await options.retrieve({ arm, config });
          retrieval = cRetrieval;
        } else {
          retrieval = await options.retrieve({ arm, config });
        }
        const executed = await options.execute({ arm, config, seed: options.seed, ...retrieval });
        outcome = executed.isolationBreached || executed.outcome === 'isolation-breach'
          ? 'isolation-breach'
          : executed.outcome ?? 'completed';
        toolCalls = Object.freeze([...(executed.toolCalls ?? [])]);
        if (outcome !== 'completed') invalidReason ??= `arm ${arm} ended as ${outcome}`;
      } catch (error) {
        outcome = 'failed';
        invalidReason ??= `arm ${arm}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    executions.push(Object.freeze({ arm, config, seed: options.seed, ...retrieval, outcome, toolCalls }));
    pendingRecords.push({ arm, outcome, configFingerprint: observedFingerprint ?? computeConfigFingerprint(config) });
  }

  if (invalidReason !== null) {
    for (let index = 0; index < executions.length; index += 1) {
      const execution = executions[index]!;
      if (execution.outcome === 'completed') {
        executions[index] = Object.freeze({ ...execution, outcome: 'failed' });
      }
    }
    for (const record of pendingRecords) {
      if (record.outcome === 'completed') record.outcome = 'failed';
    }
  }

  for (const record of pendingRecords) {
    ledger.append({
      ...record,
      scope: options.scope,
      taskId: options.config.taskId,
      trial: options.trial,
      seed: options.seed,
    });
  }

  const labeledCalls = executions.flatMap((execution) => execution.toolCalls.map((call) => ({
    callId: call.callId,
    arm: execution.arm,
    payload: JSON.stringify({ name: call.name, arguments: call.arguments }),
  })));
  const blinding = labeledCalls.length > 0
    ? blindToolCalls(labeledCalls, options.seed)
    : { blinded: Object.freeze([]), revealKey: Object.freeze([]), seed: options.seed };
  const audit = Object.freeze({
    blinded: blinding.blinded,
    seed: blinding.seed,
    agreement: null as AgreementReport | null,
    reviewable: invalidReason === null,
  });
  const result: PairedEvaluationResult = {
    status: invalidReason === null ? 'completed' : 'invalid',
    invalidReason,
    configFingerprint,
    executions: Object.freeze(executions),
    manifest: Object.freeze(ledger.entries().slice(before)),
    ledger,
    audit,
    sealRevealKey: () => blinding.revealKey,
  };
  return Object.freeze({
    ...result,
    submitDoubleReview(primary: readonly AuditJudgment[], secondary: readonly AuditJudgment[]) {
      if (result.status !== 'completed') throw new Error('an invalid block cannot be reviewed as evidence');
      const agreement = assertAuditAgreement(primary, secondary);
      return Object.freeze({ ...result, audit: Object.freeze({ ...audit, agreement }) });
    },
  });
}
