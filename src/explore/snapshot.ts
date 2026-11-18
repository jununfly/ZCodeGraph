/**
 * Slice 2: Fixed SQLite read-view identity + observation port.
 *
 * Per DES-universal-structural-explore-v1 §154-§234, every graph/source read
 * that participates in Slice 2's evidence ledger MUST be bound to one fixed
 * read snapshot. The snapshot owns a `SnapshotIdentity` and detects
 * invalidation; once invalidated, subsequent reads surface `snapshot-lost`
 * instead of silently continuing against a new connection.
 *
 * This module introduces an *observational* port. Slice 1's legacy
 * `ExploreGraphRead` / `ExploreSourceRead` in `ports.ts` continue to drive
 * production composition unchanged. Slice 2 attaches a parallel snapshot
 * observer alongside legacy composition only — it does not switch semantics,
 * replace the graph/source ports, or feed anything back into the answer.
 */

import { CURRENT_SCHEMA_VERSION } from '../db/migrations';
import { hashContent } from '../extraction';

// ===========================================================================
// Identity
// ===========================================================================

/**
 * Identity of one fixed SQLite read view.
 *
 * `databaseGeneration` is the project-level generation token: any index
 * replacement / reindex / database swap produces a new generation, and an
 * open snapshot whose generation no longer matches is invalidated.
 *
 * `readViewId` is per-open-snapshot unique. It exists so two snapshots over
 * the same databaseGeneration can still be told apart in diagnostics.
 */
export interface SnapshotIdentity {
  projectId: string;
  databaseGeneration: string;
  readViewId: string;
  schemaVersion: number;
}

export interface SnapshotIdentityInput {
  projectId: string;
  databaseGeneration: string;
  readViewId: string;
  schemaVersion?: number;
}

/** Build a SnapshotIdentity, defaulting schemaVersion to CURRENT_SCHEMA_VERSION. */
export function makeSnapshotIdentity(input: SnapshotIdentityInput): SnapshotIdentity {
  return Object.freeze({
    projectId: input.projectId,
    databaseGeneration: input.databaseGeneration,
    readViewId: input.readViewId,
    schemaVersion: input.schemaVersion ?? CURRENT_SCHEMA_VERSION,
  });
}

// ===========================================================================
// Errors
// ===========================================================================

export type SnapshotErrorCode = 'snapshot-lost' | 'aborted';

export class SnapshotLostError extends Error {
  readonly code: SnapshotErrorCode = 'snapshot-lost';
  readonly identity: SnapshotIdentity;
  constructor(identity: SnapshotIdentity, message?: string) {
    super(message ?? `snapshot-lost: read view ${identity.readViewId} invalidated`);
    this.name = 'SnapshotLostError';
    this.identity = identity;
  }
}

// ===========================================================================
// Snapshot port
// ===========================================================================

/**
 * A single fixed SQLite read view.
 *
 * Implementations MUST:
 *  - bind every read (`assertActive`) to the same SQLite connection /
 *    read transaction that was opened at construction time;
 *  - detect database replacement / reindex / read-view invalidation and
 *    throw `SnapshotLostError` instead of continuing against a new view;
 *  - close the view in `close()` and never read after close.
 *
 * Implementations MUST NOT reopen transparently or relabel invalidation as
 * an empty result. The contract at §232-§234 is explicit: "Reopen, database
 * replacement or read-view invalidation returns `snapshot-lost`; the adapter
 * never continues transparently against a new connection."
 */
export interface ExploreReadSnapshot {
  readonly identity: SnapshotIdentity;
  /** Throws SnapshotLostError if this view is no longer usable. */
  assertActive(): void;
  /** True iff `assertActive()` would not throw. Never throws. */
  isActive(): boolean;
  /** Idempotent. After close, `assertActive()` always throws snapshot-lost. */
  close(): Promise<void>;
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Compute a stable per-file content hash (matches indexing's hashContent). */
export function snapshotContentHash(content: string): string {
  return hashContent(content);
}

/**
 * Compose a `workBudgetFingerprint` per §117. Slice 2's report only
 * fingerprints the (currently fixed) implementation work ceilings; it does
 * not fingerprint delivery budgets (those are Slice 4 concerns).
 */
export interface ExploreWorkBudget {
  maxSeeds: number;
  maxUniqueVisitedNodes: number;
  maxAdjacencyRows: number;
  maxRounds: number;
  maxCanonicalSourceReads: number;
}

export function fingerprintWorkBudget(budget: ExploreWorkBudget): string {
  const canonical = [
    `seeds=${budget.maxSeeds}`,
    `visited=${budget.maxUniqueVisitedNodes}`,
    `adjacency=${budget.maxAdjacencyRows}`,
    `rounds=${budget.maxRounds}`,
    `reads=${budget.maxCanonicalSourceReads}`,
  ].join(',');
  return hashContent(canonical).slice(0, 16);
}
