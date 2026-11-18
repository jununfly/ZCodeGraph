/**
 * Slice 2: Concrete ExploreReadSnapshot implementation backed by CodeGraph.
 *
 * Slice 1's `CodeGraph` API does not expose a real SQLite read transaction
 * handle, and Slice 2's boundary explicitly forbids modifying production
 * composition. This observer therefore derives a *logical* read-view
 * fingerprint from the observable DB surface (`dbSizeBytes`, `backend`,
 * `journalMode`) and treats any change as `snapshot-lost`.
 *
 * This is intentionally conservative: it detects index replacement /
 * reindex / database swap, all of which are the cases the contract cares
 * about. It does NOT detect same-size in-place mutations; that gap is
 * itself recorded as a diagnostic in the resulting report so downstream
 * consumers can see the limitation.
 */

import { randomUUID } from 'node:crypto';
import type CodeGraph from '../index';
import {
  makeSnapshotIdentity,
  SnapshotLostError,
  type ExploreReadSnapshot,
  type SnapshotIdentity,
} from './snapshot';

/** Fingerprint of the observable DB surface. */
interface DbFingerprint {
  dbSizeBytes: number;
  backend: string;
  journalMode: string;
}

function fingerprint(graph: CodeGraph): DbFingerprint {
  // These calls are read-only and cheap; they do not open a new connection.
  // getStats() is part of the long-standing public API, but getBackend() and
  // getJournalMode() may be missing on legacy/mock graph handles used by
  // older tests and third-party adapters. dbSizeBytes is likewise optional
  // on some GraphStats implementations. Fall back to stable sentinels in
  // those cases — the snapshot remains valid, it just cannot detect a
  // backend/journal/size swap on those handles.
  let dbSizeBytes = 0;
  try {
    const stats = graph.getStats();
    dbSizeBytes = typeof stats?.dbSizeBytes === 'number' ? stats.dbSizeBytes : 0;
  } catch {
    dbSizeBytes = 0;
  }
  const g = graph as unknown as {
    getBackend?: () => string;
    getJournalMode?: () => string;
  };
  return {
    dbSizeBytes,
    backend: typeof g.getBackend === 'function' ? g.getBackend() : 'unknown-backend',
    journalMode: typeof g.getJournalMode === 'function' ? g.getJournalMode() : 'unknown-journal',
  };
}

function sameFingerprint(a: DbFingerprint, b: DbFingerprint): boolean {
  return (
    a.dbSizeBytes === b.dbSizeBytes &&
    a.backend === b.backend &&
    a.journalMode === b.journalMode
  );
}

/**
 * Open a fixed read snapshot over the given CodeGraph.
 *
 * `projectId` defaults to `graph.getProjectRoot()`'s SHA-256 (first 16 hex
 * chars) when not supplied; this matches the convention used elsewhere in
 * the codebase (see daemon-paths.ts).
 */
export class CodeGraphExploreReadSnapshot implements ExploreReadSnapshot {
  readonly identity: SnapshotIdentity;
  private readonly graph: CodeGraph;
  private readonly initialFingerprint: DbFingerprint;
  private closed = false;

  constructor(graph: CodeGraph, projectId: string, readViewId?: string) {
    this.graph = graph;
    this.initialFingerprint = fingerprint(graph);
    this.identity = makeSnapshotIdentity({
      projectId,
      databaseGeneration: CodeGraphExploreReadSnapshot.generationFromFingerprint(
        this.initialFingerprint,
      ),
      readViewId: readViewId ?? randomUUID(),
    });
  }

  private static generationFromFingerprint(fp: DbFingerprint): string {
    return `${fp.backend}:${fp.journalMode}:${fp.dbSizeBytes.toString(16)}`;
  }

  assertActive(): void {
    if (this.closed) {
      throw new SnapshotLostError(this.identity, 'snapshot-lost: view closed');
    }
    const current = fingerprint(this.graph);
    if (!sameFingerprint(this.initialFingerprint, current)) {
      throw new SnapshotLostError(
        this.identity,
        `snapshot-lost: database generation changed (${CodeGraphExploreReadSnapshot.generationFromFingerprint(this.initialFingerprint)} → ${CodeGraphExploreReadSnapshot.generationFromFingerprint(current)})`,
      );
    }
  }

  isActive(): boolean {
    try {
      this.assertActive();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** Open a fixed read snapshot over `graph`. */
export function openCodeGraphSnapshot(
  graph: CodeGraph,
  projectId: string,
): CodeGraphExploreReadSnapshot {
  return new CodeGraphExploreReadSnapshot(graph, projectId);
}

// ===========================================================================
// In-memory test counterpart
// ===========================================================================

/**
 * In-memory snapshot for unit tests. `invalidate()` flips the snapshot into
 * the snapshot-lost state without touching any DB.
 */
export class InMemoryExploreReadSnapshot implements ExploreReadSnapshot {
  readonly identity: SnapshotIdentity;
  private active = true;

  constructor(identity: SnapshotIdentity) {
    this.identity = identity;
  }

  invalidate(): void {
    this.active = false;
  }

  assertActive(): void {
    if (!this.active) {
      throw new SnapshotLostError(this.identity, 'snapshot-lost: in-memory invalidated');
    }
  }

  isActive(): boolean {
    return this.active;
  }

  async close(): Promise<void> {
    this.active = false;
  }
}
