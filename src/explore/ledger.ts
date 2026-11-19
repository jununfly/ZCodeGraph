/**
 * Slice 2: Internal evidence report + coverage ledger.
 *
 * Per DES-universal-structural-explore-v1 §111-§118 and §369-§380, every
 * explore answer produces an internal `ExploreReport` recording the fixed
 * snapshot identity, per-requirement disposition (returned/degraded/omitted),
 * omissions, diagnostics and the work-budget fingerprint.
 *
 * CRITICAL Slice 2 boundary:
 *  - This report is INTERNAL. It is attached alongside the legacy
 *    `ExploreAnswer` and is NOT exposed via ToolResult/metadata.
 *  - It does NOT change answer semantics, ranking, selection, or rendering.
 *  - It does NOT replace Slice 1's plan/evidence/renderer path.
 *  - Source / snapshot failures are surfaced via `gaps` + a non-`complete`
 *    status — they are NEVER relabelled as `no-evidence`.
 */

import type { SnapshotIdentity, ExploreWorkBudget } from './snapshot';
import { fingerprintWorkBudget } from './snapshot';
import type { ExplorePlan } from './types';
import type { QueryObligation } from './obligations';

// ===========================================================================
// Report core types (contract §111-§118, §369-§380)
// ===========================================================================

export type ExploreReportStatus = 'complete' | 'partial' | 'no-evidence';

export type RequirementDisposition = 'returned' | 'degraded' | 'omitted';

export type ExploreFailureCode =
  | 'aborted'
  | 'invalid-input'
  | 'snapshot-lost'
  | 'graph-unavailable'
  | 'source-unavailable'
  | 'source-changed'
  | 'source-too-large'
  | 'budget-exhausted';

/** A single evidence omission / gap entry. */
export interface EvidenceGap {
  /** Stable identifier (e.g. requirement id, file path, atom id). */
  id: string;
  /** Why this requirement was not fully returned. */
  reason:
    | 'snapshot-lost'
    | 'source-unavailable'
    | 'source-changed'
    | 'source-too-large'
    | 'graph-semantics-blocker'
    | 'query-interpretation'
    | 'search-limit'
    | 'budget-exhausted'
    | 'aborted'
    | 'other';
  /** Human-readable detail (no secrets, no env). */
  detail: string;
  /** Optional source location for provenance. */
  location?: string;
}

/** A non-fatal observation recorded during the run. */
export interface ExploreDiagnostic {
  code: string;
  message: string;
}

/**
 * Coverage ledger. Dispositions are tracked per-requirement-id; the four
 * counters (selected/returned/degraded/omitted) are derived, never written
 * independently. `searchExhausted` and `selectedEvidencePreserved` are
 * first-class booleans — search exhaustion is NOT path absence.
 *
 * Slice 3.1 adds `obligations` (contract §376). In Slice 2 the field is
 * always empty because legacy composition has no obligation tree; Slice
 * 3.5 will populate it once obligation closure lands.
 */
export interface CoverageLedger {
  status: ExploreReportStatus;
  dispositions: Readonly<Record<string, RequirementDisposition>>;
  selectedRequirements: number;
  returnedRequirements: number;
  degradedRequirements: number;
  omittedRequirements: number;
  /** Slice 3: query obligations. Empty in Slice 2. */
  obligations: readonly QueryObligation[];
  gaps: EvidenceGap[];
  searchExhausted: boolean;
  selectedEvidencePreserved: boolean;
}

/** The full internal explore report. */
export interface ExploreReport {
  status: ExploreReportStatus;
  snapshot: SnapshotIdentity;
  coverage: CoverageLedger;
  omissions: EvidenceGap[];
  diagnostics: ExploreDiagnostic[];
  workBudgetFingerprint: string;
}

// ===========================================================================
// Derivation — counters are computed, never asserted independently
// ===========================================================================

/**
 * Derive `CoverageLedger` counters from a disposition map. Status is
 * resolved per contract §397-§408:
 *  - 'no-evidence' iff zero returned+degraded AND no query-interpretation gap
 *    AND no failure code.
 *  - 'complete' iff every required requirement is `returned` AND no required
 *    gap exists.
 *  - otherwise 'partial'.
 *
 * Required vs supporting is intentionally not modeled here — Slice 2 only
 * observes legacy composition, which has no obligation tree yet (Slice 3
 * introduces QueryObligation). The `required` set is supplied by the caller.
 */
export interface DeriveCoverageInput {
  dispositions: Readonly<Record<string, RequirementDisposition>>;
  /** Ids that are required (vs supporting). */
  requiredIds: ReadonlySet<string>;
  gaps: EvidenceGap[];
  searchExhausted: boolean;
  /** Slice 3: obligations tree. Defaults to empty (Slice 2 behaviour). */
  obligations?: readonly QueryObligation[];
}

export function deriveCoverageLedger(input: DeriveCoverageInput): CoverageLedger {
  const dispositions = input.dispositions;
  const ids = Object.keys(dispositions);
  const selected = ids.length;
  let returned = 0;
  let degraded = 0;
  let omitted = 0;
  for (const id of ids) {
    const d = dispositions[id];
    if (d === 'returned') returned += 1;
    else if (d === 'degraded') degraded += 1;
    else omitted += 1;
  }

  const requiredReturned = input.requiredIds.size > 0
    && [...input.requiredIds].every((id) => dispositions[id] === 'returned');
  const requiredGap = input.gaps.some(
    (g) => input.requiredIds.has(g.id) || g.reason === 'query-interpretation',
  );

  const hasFailure = input.gaps.some(
    (g) =>
      g.reason === 'snapshot-lost' ||
      g.reason === 'source-unavailable' ||
      g.reason === 'source-changed' ||
      g.reason === 'source-too-large' ||
      g.reason === 'aborted',
  );

  let status: ExploreReportStatus;
  if (returned + degraded === 0 && !requiredGap && !hasFailure) {
    status = 'no-evidence';
  } else if (requiredReturned && !requiredGap && !hasFailure) {
    status = 'complete';
  } else {
    status = 'partial';
  }

  const selectedEvidencePreserved = [...input.requiredIds].every(
    (id) => dispositions[id] !== 'omitted',
  );

  return {
    status,
    dispositions,
    selectedRequirements: selected,
    returnedRequirements: returned,
    degradedRequirements: degraded,
    omittedRequirements: omitted,
    obligations: input.obligations ?? [],
    gaps: input.gaps,
    searchExhausted: input.searchExhausted,
    selectedEvidencePreserved,
  };
}

// ===========================================================================
// Observation — build a report by watching the legacy plan/evidence
// ===========================================================================

/**
 * Observation inputs harvested from the legacy composition path. Slice 2
 * collects these alongside Slice 1 — they are NOT new inputs to planning.
 */
export interface ObserveLegacyInput {
  snapshot: SnapshotIdentity;
  plan: ExplorePlan;
  /** Files that the legacy renderer attempted to read. */
  attemptedFileReads: ReadonlyMap<string, { ok: boolean; reason?: EvidenceGap['reason']; detail?: string }>;
  /** Diagnostics observed during the run. */
  diagnostics?: ExploreDiagnostic[];
  /** Work budget actually used (fixed implementation constants). */
  workBudget: ExploreWorkBudget;
  /** True if the planner exhausted its search ceilings. */
  searchExhausted?: boolean;
}

/**
 * Build an `ExploreReport` by observing the legacy plan. Each plan entry
 * becomes a requirement (id = file path) with disposition derived from
 * whether the file was read AND its renderMode.
 *
 * Mapping (observational, not semantic):
 *  - renderMode 'omit'           → omitted (with gap if read failed)
 *  - renderMode 'skeleton'/'focused' → degraded
 *  - renderMode 'full'           → returned (or omitted if read failed)
 *
 * This mapping is purely for Slice 2 observation. It does NOT feed back
 * into plan, ranking, or rendering.
 */
export function observeLegacyComposition(input: ObserveLegacyInput): ExploreReport {
  const dispositions: Record<string, RequirementDisposition> = {};
  const gaps: EvidenceGap[] = [];
  const requiredIds = new Set<string>();

  for (const entry of input.plan.entries) {
    const id = entry.filePath;
    // In legacy composition, every entry that survived planning is "required"
    // for Slice 2 observation — supporting obligations arrive in Slice 3.
    requiredIds.add(id);

    const read = input.attemptedFileReads.get(id);
    const readFailed = read !== undefined && !read.ok;

    if (readFailed) {
      dispositions[id] = 'omitted';
      gaps.push({
        id,
        reason: read.reason ?? 'source-unavailable',
        detail: read.detail ?? `failed to read ${id}`,
        location: id,
      });
      continue;
    }

    if (entry.renderMode === 'omit') {
      dispositions[id] = 'omitted';
    } else if (entry.renderMode === 'full') {
      dispositions[id] = 'returned';
    } else {
      dispositions[id] = 'degraded';
    }
  }

  const coverage = deriveCoverageLedger({
    dispositions,
    requiredIds,
    gaps,
    searchExhausted: input.searchExhausted ?? false,
  });

  return {
    status: coverage.status,
    snapshot: input.snapshot,
    coverage,
    omissions: gaps,
    diagnostics: input.diagnostics ?? [],
    workBudgetFingerprint: fingerprintWorkBudget(input.workBudget),
  };
}
