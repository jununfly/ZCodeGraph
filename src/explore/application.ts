import { createHash } from 'node:crypto';
import { buildExploreBlastRadius } from './blast-radius';
import { renderExploreBlastRadius } from './blast-radius-renderer';
import { buildExploreRenderModel } from './evidence';
import { observeLegacyComposition, type ExploreReport } from './ledger';
import { UniversalExploreApplication } from './universal-application';
import { plan } from './planner';
import { CodeGraphExploreGraphRead, RootConfinedExploreSourceRead } from './ports';
import { render } from './renderer';
import { openCodeGraphSnapshot } from './snapshot-observer';
import type { ExploreWorkBudget } from './snapshot';
import { isTestFile } from '../search/query-utils';
import type { ExploreApplication, ExploreAnswer, ExploreOptions } from './types';
import type CodeGraph from '../index';

/**
 * Slice 2 fixed work ceilings (observational only — they are not knobs).
 * Slice 3 will replace these with the obligation-driven search budget.
 */
const SLICE_2_WORK_BUDGET: ExploreWorkBudget = Object.freeze({
  maxSeeds: 32,
  maxUniqueVisitedNodes: 4096,
  maxAdjacencyRows: 8192,
  maxRounds: 8,
  maxCanonicalSourceReads: 64,
});

/** Optional observer sink. Production callers do NOT set this in Slice 2. */
export type ExploreReportObserver = (report: ExploreReport) => void;

let observer: ExploreReportObserver | undefined;

/**
 * Install an internal observer for the Slice 2 evidence report.
 *
 * The observer is process-wide and is only intended for development-time
 * inspection and unit tests. Production transports MUST NOT install one
 * that pipes the report into ToolResult/metadata — that requires a separate
 * additive compatibility review (contract §135-§137).
 */
export function setExploreReportObserver(fn: ExploreReportObserver | undefined): void {
  observer = fn;
}

/** Shared CLI/MCP composition; transports own only parsing and envelopes. */
export class DefaultExploreApplication implements ExploreApplication {
  private readonly universal?: UniversalExploreApplication;

  constructor(implementation: 'legacy' | 'universal-v1' = 'legacy') {
    if (implementation === 'universal-v1') this.universal = new UniversalExploreApplication();
  }

  async explore(graph: CodeGraph, query: string, options: ExploreOptions): Promise<ExploreAnswer> {
    if (this.universal) return this.universal.explore(graph, query, options);
    // Plan first so we can derive a stable project id from plan.projectRoot.
    const planned = await plan(graph, query, { maxFiles: options.maxFiles, runtime: options.runtime });
    const projectId = projectIdFromRoot(planned.projectRoot);

    // Slice 2: open a fixed read snapshot for the rest of the call. The
    // snapshot is observational — it does not change which reads the legacy
    // composition performs, but any read that would observe a different
    // generation is recorded as a gap (snapshot-lost), never silently
    // accepted.
    const snapshot = openCodeGraphSnapshot(graph, projectId);
    try {
      let report: ExploreReport | undefined;
      const publish = (value: ExploreReport): void => {
        report = value;
        if (observer) observer(value);
      };
      if (planned.subgraph.nodes.size === 0) {
        const report = observeLegacyComposition({
          snapshot: snapshot.identity,
          plan: planned,
          attemptedFileReads: new Map(),
          workBudget: SLICE_2_WORK_BUDGET,
        });
        publish(report);
        return { kind: 'empty', text: `No relevant code found for "${query}"`, report };
      }
      const blastRadius = planned.budget.includeBlastRadius === false
        ? ''
        : renderExploreBlastRadius(buildExploreBlastRadius(graph, planned.subgraph, isTestFile));
      const model = buildExploreRenderModel(
        new CodeGraphExploreGraphRead(graph),
        new RootConfinedExploreSourceRead(planned.projectRoot),
        planned,
        blastRadius,
        options.runtime,
      );

      // Slice 2: observe the legacy composition and emit an internal report.
      // This is a pure side-channel — it does NOT touch the returned answer.
      const attemptedFileReads = new Map<
          string,
          { ok: boolean; reason?: 'source-unavailable'; detail?: string }
        >();
        for (const [filePath] of planned.sortedFiles) {
          const read = model.fileContents.has(filePath);
          attemptedFileReads.set(
            filePath,
            read ? { ok: true } : { ok: false, reason: 'source-unavailable', detail: `file not materialized: ${filePath}` },
          );
        }
        report = observeLegacyComposition({
          snapshot: snapshot.identity,
          plan: planned,
          attemptedFileReads,
          workBudget: SLICE_2_WORK_BUDGET,
        });
        publish(report);

      return { kind: 'answer', markdown: render(model), report };
    } finally {
      await snapshot.close();
    }
  }
}

/** Stable per-project identifier. Mirrors daemon-paths.ts convention (first 16 hex of sha256). */
function projectIdFromRoot(projectRoot: string): string {
  return createHash('sha256').update(projectRoot).digest('hex').slice(0, 16);
}

// Re-export for test consumers that may need to observe the Slice 2 report.
export type { ExploreReport } from './ledger';

export const exploreApplication = new DefaultExploreApplication();
