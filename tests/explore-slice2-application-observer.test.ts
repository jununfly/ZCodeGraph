/**
 * Slice 2: ExploreApplication observer side-channel — integration test.
 *
 * Pins the contract that the Slice 2 report is observable internally but is
 * NOT exposed on the ExploreAnswer returned to CLI/MCP transports.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import CodeGraph from '../src/index';
import {
  DefaultExploreApplication,
  setExploreReportObserver,
} from '../src/explore/application';
import type { ExploreReport } from '../src/explore/ledger';
import type { ExploreRuntimeOptions } from '../src/explore/types';

const runtime: ExploreRuntimeOptions = {
  adaptiveEnabled: false,
  lineNumbersEnabled: true,
  elidedMarkersEnabled: true,
  tightSmallProjectBudgetEnabled: false,
};

describe('Slice 2 — ExploreApplication observer', () => {
  let tmp: string;
  let graph: CodeGraph;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'slice2-observer-'));
    writeFileSync(
      join(tmp, 'a.ts'),
      'export function hello(): string { return "world"; }\n',
      'utf8',
    );
    graph = await CodeGraph.init(tmp);
    await graph.indexAll();
  });

  afterEach(async () => {
    setExploreReportObserver(undefined);
    await graph.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('invokes the observer with an internal report and returns a normal answer', async () => {
    const reports: ExploreReport[] = [];
    setExploreReportObserver((r) => reports.push(r));

    const app = new DefaultExploreApplication();
    const answer = await app.explore(graph, 'hello', { runtime });

    // The answer shape is unchanged — no `report` field is attached.
    expect(answer.kind).toBe('answer');
    if (answer.kind === 'answer') {
      expect(answer.markdown).toContain('hello');
      expect('report' in answer).toBe(false);
    }

    // The observer fired exactly once with a coherent internal report.
    expect(reports).toHaveLength(1);
    const r = reports[0];
    expect(r.snapshot.projectId).toMatch(/^[0-9a-f]{16}$/);
    expect(r.snapshot.readViewId).toBeTruthy();
    expect(r.snapshot.schemaVersion).toBeGreaterThan(0);
    expect(r.workBudgetFingerprint).toHaveLength(16);
    expect(['complete', 'partial', 'no-evidence']).toContain(r.status);
    expect(r.coverage.selectedRequirements).toBeGreaterThanOrEqual(0);
  });

  it('emits a no-evidence report when the query matches nothing', async () => {
    const reports: ExploreReport[] = [];
    setExploreReportObserver((r) => reports.push(r));

    const app = new DefaultExploreApplication();
    const answer = await app.explore(graph, 'zzz-not-a-real-symbol-zzz', { runtime });

    expect(answer.kind).toBe('empty');
    expect(reports).toHaveLength(1);
    expect(reports[0].status).toBe('no-evidence');
    expect(reports[0].coverage.selectedRequirements).toBe(0);
  });

  it('does not invoke any observer when none is installed (legacy behavior preserved)', async () => {
    // No observer installed — the explore call should behave identically to
    // Slice 1 and must not throw.
    const app = new DefaultExploreApplication();
    const answer = await app.explore(graph, 'hello', { runtime });
    expect(answer.kind).toBe('answer');
  });
});
