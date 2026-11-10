import {
  assertConfigParity,
  computeConfigFingerprint,
  type ArmRun,
  type RetrievalArm,
} from './zra-paired-core';

/**
 * Immutable run manifest + the pre-registered hard budget gate
 * (ADR-0015 D4/D5; MET-hard-budget-ceiling-pre-registration sections 1 and 4).
 *
 * Side-effect free by construction: this module records run boundaries and
 * decides whether a scope has hit its ceiling. It never starts a run, never
 * calls a model, never reads a transcript and never changes MCP ranking.
 * A run harness must wire it in explicitly; until then the frozen ceiling is
 * enforceable but not yet wired to an executor.
 */

export type RunScope = 'pilot' | 'formal';

/**
 * Every outcome is a consumed run. In particular `retry`, `config-rejected`
 * and `isolation-breach` must not be dropped, or a caller could escape the
 * ceiling by discarding failed attempts.
 */
export type RunOutcome =
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'retry'
  | 'config-rejected'
  | 'isolation-breach';

/** Frozen by roadmap 1-8-2 decision #5. Not configurable from callers. */
export const PILOT_CEILING = 96;

/**
 * Zero until official N is pre-registered; afterwards it must be refrozen as
 * N x k x 3 and never raised after results are visible.
 */
export const FORMAL_CEILING = 0;

const OUTCOMES: readonly RunOutcome[] = [
  'completed', 'failed', 'timeout', 'retry', 'config-rejected', 'isolation-breach',
];
const FINGERPRINT = /^[0-9a-f]{64}$/;

export function ceilingFor(scope: RunScope): number {
  return scope === 'pilot' ? PILOT_CEILING : FORMAL_CEILING;
}

export interface RunRecordInput {
  scope: RunScope;
  taskId: string;
  arm: RetrievalArm;
  trial: number;
  seed: number;
  outcome: RunOutcome;
  configFingerprint: string;
}

/** One immutable manifest entry delimits exactly one paired-run. */
export type RunRecord = Readonly<RunRecordInput> & { readonly seq: number };

export interface CeilingVerdict {
  readonly scope: RunScope;
  readonly consumed: number;
  readonly ceiling: number;
  readonly remaining: number;
  readonly stopped: boolean;
  readonly verdict: 'within' | 'inconclusive';
}

export interface ArmBlockRequest {
  scope: RunScope;
  taskId: string;
  trial: number;
  seed: number;
  runs: readonly ArmRun[];
}

export interface ArmBlockResult {
  readonly accepted: boolean;
  readonly reason: string | null;
  readonly fingerprint: string | null;
  readonly records: readonly RunRecord[];
}

function validateRunInput(input: RunRecordInput): void {
  if (input.scope !== 'pilot' && input.scope !== 'formal') {
    throw new Error(`unknown run scope: ${String(input.scope)}`);
  }
  if (typeof input.taskId !== 'string' || input.taskId.length === 0) {
    throw new Error('taskId is required');
  }
  if (input.arm !== 'A' && input.arm !== 'C' && input.arm !== 'S') {
    throw new Error(`unknown retrieval arm: ${String(input.arm)}`);
  }
  if (!Number.isInteger(input.trial) || input.trial < 1) {
    throw new Error('trial must be a positive integer');
  }
  if (!Number.isInteger(input.seed)) {
    throw new Error('seed must be an integer');
  }
  if (!OUTCOMES.includes(input.outcome)) {
    throw new Error(`unknown run outcome: ${String(input.outcome)}`);
  }
  if (!FINGERPRINT.test(input.configFingerprint)) {
    throw new Error('configFingerprint must be a lowercase SHA-256 hex digest');
  }
}

/**
 * Append-only manifest. There is deliberately no remove, refund or edit API:
 * D2 whole-task exclusion does not refund runs already executed.
 */
export class PairedRunLedger {
  private readonly records: RunRecord[] = [];

  /** Replay a persisted manifest; entries are re-validated and seq must be dense. */
  static from(records: readonly RunRecord[]): PairedRunLedger {
    const ledger = new PairedRunLedger();
    for (const record of records) {
      if (record.seq !== ledger.records.length + 1) {
        throw new Error(`non-contiguous run manifest at seq ${record.seq}`);
      }
      ledger.append(record);
    }
    return ledger;
  }

  /** Frozen snapshot; mutating it cannot mutate the ledger. */
  entries(scope?: RunScope): readonly RunRecord[] {
    const snapshot = scope
      ? this.records.filter((record) => record.scope === scope)
      : [...this.records];
    return Object.freeze(snapshot.map((record) => Object.freeze({ ...record })));
  }

  toJSON(): readonly RunRecord[] {
    return this.entries();
  }

  consumed(scope: RunScope): number {
    return this.records.reduce(
      (count, record) => count + (record.scope === scope ? 1 : 0),
      0,
    );
  }

  checkCeiling(scope: RunScope): CeilingVerdict {
    const consumed = this.consumed(scope);
    const ceiling = ceilingFor(scope);
    const stopped = consumed >= ceiling;
    return Object.freeze({
      scope,
      consumed,
      ceiling,
      remaining: Math.max(0, ceiling - consumed),
      stopped,
      verdict: stopped ? 'inconclusive' : 'within',
    });
  }

  /** Call before starting a block; a block must never straddle its ceiling. */
  assertCanStartBlock(scope: RunScope, armCount = 3): void {
    const verdict = this.checkCeiling(scope);
    if (verdict.stopped || verdict.remaining < armCount) {
      throw new Error(
        `D4 stop: ${scope} consumed ${verdict.consumed}/${verdict.ceiling} paired-runs; ` +
        `a ${armCount}-arm block cannot be started (verdict=inconclusive)`,
      );
    }
  }

  append(input: RunRecordInput): RunRecord {
    validateRunInput(input);
    const verdict = this.checkCeiling(input.scope);
    if (verdict.stopped) {
      throw new Error(
        `D4 stop: ${input.scope} consumed ${verdict.consumed}/${verdict.ceiling} paired-runs; ` +
        `verdict=inconclusive, no further run may be appended`,
      );
    }
    const record: RunRecord = Object.freeze({ ...input, seq: this.records.length + 1 });
    this.records.push(record);
    return record;
  }

  /**
   * Record a whole A/C/S paired block. A config fingerprint disagreement
   * rejects the block, but the three runs are still recorded as
   * `config-rejected` so the ceiling cannot be bypassed by invalidating runs.
   */
  recordArmBlock(request: ArmBlockRequest): ArmBlockResult {
    const { runs, ...shared } = request;
    const arms = new Set(runs.map((run) => run.arm));
    if (runs.length !== 3 || arms.size !== 3) {
      throw new Error('a paired block requires exactly one A, one C and one S arm');
    }
    this.assertCanStartBlock(request.scope, runs.length);

    let fingerprint: string | null = null;
    let reason: string | null = null;
    try {
      fingerprint = assertConfigParity(runs);
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    const records: RunRecord[] = [];
    for (const run of runs) {
      records.push(this.append({
        ...shared,
        arm: run.arm,
        outcome: reason ? 'config-rejected' : 'completed',
        configFingerprint: computeConfigFingerprint(run.config),
      }));
    }

    return Object.freeze({
      accepted: reason === null,
      reason,
      fingerprint,
      records: Object.freeze(records),
    });
  }
}
