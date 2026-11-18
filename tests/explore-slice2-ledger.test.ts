/**
 * Slice 2: Internal evidence ledger — unit tests.
 *
 * These tests pin the Slice 2 boundary:
 *   - SnapshotIdentity carries projectId/databaseGeneration/readViewId/schemaVersion
 *   - Snapshot invalidation surfaces as snapshot-lost, never as no-evidence
 *   - CoverageLedger counters are derived, never asserted independently
 *   - Status resolution follows contract §397-§408:
 *       failed > empty/no-evidence > answer/complete > answer/partial
 *   - The report is observable via setExploreReportObserver but is NOT
 *     exposed on the ExploreAnswer returned to transports.
 */

import { describe, expect, it } from 'vitest';
import {
  makeSnapshotIdentity,
  SnapshotLostError,
  fingerprintWorkBudget,
  type ExploreWorkBudget,
} from '../src/explore/snapshot';
import {
  InMemoryExploreReadSnapshot,
} from '../src/explore/snapshot-observer';
import {
  deriveCoverageLedger,
  observeLegacyComposition,
  type EvidenceGap,
} from '../src/explore/ledger';
import type { ExplorePlan } from '../src/explore/types';

// ---------------------------------------------------------------------------
// SnapshotIdentity
// ---------------------------------------------------------------------------

describe('Slice 2 — SnapshotIdentity', () => {
  it('captures projectId, generation, readViewId and current schema version', () => {
    const id = makeSnapshotIdentity({
      projectId: 'abc123',
      databaseGeneration: 'node-sqlite:wal:beef',
      readViewId: 'view-1',
    });
    expect(id.projectId).toBe('abc123');
    expect(id.databaseGeneration).toBe('node-sqlite:wal:beef');
    expect(id.readViewId).toBe('view-1');
    expect(id.schemaVersion).toBeGreaterThan(0);
  });

  it('honors an explicit schemaVersion override', () => {
    const id = makeSnapshotIdentity({
      projectId: 'x',
      databaseGeneration: 'g',
      readViewId: 'v',
      schemaVersion: 99,
    });
    expect(id.schemaVersion).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Snapshot lifecycle
// ---------------------------------------------------------------------------

describe('Slice 2 — Snapshot lifecycle', () => {
  it('in-memory snapshot starts active and reports active=true', () => {
    const id = makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' });
    const snap = new InMemoryExploreReadSnapshot(id);
    expect(snap.isActive()).toBe(true);
    expect(() => snap.assertActive()).not.toThrow();
  });

  it('invalidate() flips the snapshot to snapshot-lost', () => {
    const id = makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' });
    const snap = new InMemoryExploreReadSnapshot(id);
    snap.invalidate();
    expect(snap.isActive()).toBe(false);
    expect(() => snap.assertActive()).toThrow(SnapshotLostError);
  });

  it('close() is idempotent and forces snapshot-lost', async () => {
    const id = makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' });
    const snap = new InMemoryExploreReadSnapshot(id);
    await snap.close();
    await snap.close();
    expect(snap.isActive()).toBe(false);
    expect(() => snap.assertActive()).toThrow(SnapshotLostError);
  });

  it('SnapshotLostError carries the identity and code', () => {
    const id = makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' });
    const err = new SnapshotLostError(id);
    expect(err.code).toBe('snapshot-lost');
    expect(err.identity).toBe(id);
    expect(err.name).toBe('SnapshotLostError');
  });
});

// ---------------------------------------------------------------------------
// Work budget fingerprint
// ---------------------------------------------------------------------------

describe('Slice 2 — work budget fingerprint', () => {
  it('is stable for the same budget', () => {
    const b: ExploreWorkBudget = {
      maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
      maxRounds: 8, maxCanonicalSourceReads: 64,
    };
    expect(fingerprintWorkBudget(b)).toBe(fingerprintWorkBudget(b));
    expect(fingerprintWorkBudget(b)).toHaveLength(16);
  });

  it('differs when any ceiling changes', () => {
    const base: ExploreWorkBudget = {
      maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
      maxRounds: 8, maxCanonicalSourceReads: 64,
    };
    const fp = fingerprintWorkBudget(base);
    expect(fingerprintWorkBudget({ ...base, maxSeeds: 33 })).not.toBe(fp);
    expect(fingerprintWorkBudget({ ...base, maxRounds: 9 })).not.toBe(fp);
  });
});

// ---------------------------------------------------------------------------
// CoverageLedger derivation
// ---------------------------------------------------------------------------

describe('Slice 2 — CoverageLedger derivation', () => {
  it('derives counters from dispositions (never asserted independently)', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'returned', b: 'degraded', c: 'omitted' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.selectedRequirements).toBe(3);
    expect(ledger.returnedRequirements).toBe(1);
    expect(ledger.degradedRequirements).toBe(1);
    expect(ledger.omittedRequirements).toBe(1);
  });

  it('reports status=complete when every required is returned and no gap', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'returned', b: 'returned' },
      requiredIds: new Set(['a', 'b']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('complete');
  });

  it('reports status=no-evidence when zero returned+degraded AND no failure', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'omitted' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('no-evidence');
  });

  it('NEVER relabels a source/snapshot failure as no-evidence', () => {
    // Contract §257-§260: failures are partial, not no-evidence.
    const snapshotGap: EvidenceGap = {
      id: 'file-a',
      reason: 'snapshot-lost',
      detail: 'read view invalidated',
    };
    const ledger = deriveCoverageLedger({
      dispositions: { 'file-a': 'omitted' },
      requiredIds: new Set(['file-a']),
      gaps: [snapshotGap],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('partial');
    expect(ledger.status).not.toBe('no-evidence');
  });

  it('reports partial when required is omitted (selectedEvidencePreserved=false)', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'returned', b: 'omitted' },
      requiredIds: new Set(['a', 'b']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('partial');
    expect(ledger.selectedEvidencePreserved).toBe(false);
  });

  it('reports partial when a required is degraded', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'degraded' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('partial');
  });

  it('query-interpretation gap forces partial even with zero returned', () => {
    const qiGap: EvidenceGap = {
      id: 'q',
      reason: 'query-interpretation',
      detail: 'unable to normalize query',
    };
    const ledger = deriveCoverageLedger({
      dispositions: {},
      requiredIds: new Set(),
      gaps: [qiGap],
      searchExhausted: false,
    });
    expect(ledger.status).toBe('partial');
  });

  it('searchExhausted is independent from path absence', () => {
    const exhausted = deriveCoverageLedger({
      dispositions: { a: 'returned' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: true,
    });
    expect(exhausted.searchExhausted).toBe(true);
    expect(exhausted.status).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// observeLegacyComposition
// ---------------------------------------------------------------------------

function minimalPlan(overrides: Partial<ExplorePlan> = {}): ExplorePlan {
  return {
    query: 'test',
    budget: {} as ExplorePlan['budget'],
    maxFiles: 12,
    subgraph: { nodes: new Map(), edges: new Map() } as unknown as ExplorePlan['subgraph'],
    entryNodeIds: new Set(),
    fileGroups: new Map(),
    sortedFiles: [],
    entries: [],
    spine: { text: '', pathNodeIds: new Set(), namedNodeIds: new Set(), uniqueNamedNodeIds: new Set() },
    adaptiveEnabled: false,
    glueNodeIds: new Set(),
    connectedToEntry: new Set(),
    centralFiles: new Set(),
    projectRoot: '/tmp/test',
    ...overrides,
  };
}

describe('Slice 2 — observeLegacyComposition', () => {
  const identity = makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' });
  const budget: ExploreWorkBudget = {
    maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
    maxRounds: 8, maxCanonicalSourceReads: 64,
  };

  it('maps renderMode full → returned, skeleton/focused → degraded, omit → omitted', () => {
    const plan = minimalPlan({
      entries: [
        { filePath: 'a.ts', symbols: [], evidenceValue: 'critical', renderMode: 'full', reason: '', score: 1 },
        { filePath: 'b.ts', symbols: [], evidenceValue: 'supportive', renderMode: 'skeleton', reason: '', score: 0.5 },
        { filePath: 'c.ts', symbols: [], evidenceValue: 'compressible', renderMode: 'omit', reason: '', score: 0.1 },
      ],
    });
    const report = observeLegacyComposition({
      snapshot: identity, plan,
      attemptedFileReads: new Map([
        ['a.ts', { ok: true }],
        ['b.ts', { ok: true }],
        ['c.ts', { ok: true }],
      ]),
      workBudget: budget,
    });
    expect(report.coverage.dispositions['a.ts']).toBe('returned');
    expect(report.coverage.dispositions['b.ts']).toBe('degraded');
    expect(report.coverage.dispositions['c.ts']).toBe('omitted');
    expect(report.status).toBe('partial');
    expect(report.snapshot).toBe(identity);
    expect(report.workBudgetFingerprint).toHaveLength(16);
  });

  it('records a gap when a file failed to materialize (never no-evidence)', () => {
    const plan = minimalPlan({
      entries: [
        { filePath: 'a.ts', symbols: [], evidenceValue: 'critical', renderMode: 'full', reason: '', score: 1 },
      ],
    });
    const report = observeLegacyComposition({
      snapshot: identity, plan,
      attemptedFileReads: new Map([
        ['a.ts', { ok: false, reason: 'source-unavailable', detail: 'ENOENT' }],
      ]),
      workBudget: budget,
    });
    expect(report.coverage.dispositions['a.ts']).toBe('omitted');
    expect(report.omissions).toHaveLength(1);
    expect(report.omissions[0].reason).toBe('source-unavailable');
    expect(report.omissions[0].detail).toBe('ENOENT');
    expect(report.status).toBe('partial');
  });

  it('reports no-evidence when zero entries AND no failure', () => {
    const plan = minimalPlan({ entries: [] });
    const report = observeLegacyComposition({
      snapshot: identity, plan,
      attemptedFileReads: new Map(),
      workBudget: budget,
    });
    expect(report.status).toBe('no-evidence');
    expect(report.coverage.selectedRequirements).toBe(0);
  });

  it('searchExhausted=true does not by itself change status to partial', () => {
    const plan = minimalPlan({
      entries: [
        { filePath: 'a.ts', symbols: [], evidenceValue: 'critical', renderMode: 'full', reason: '', score: 1 },
      ],
    });
    const report = observeLegacyComposition({
      snapshot: identity, plan,
      attemptedFileReads: new Map([['a.ts', { ok: true }]]),
      workBudget: budget,
      searchExhausted: true,
    });
    expect(report.coverage.searchExhausted).toBe(true);
    expect(report.status).toBe('complete');
  });
});
