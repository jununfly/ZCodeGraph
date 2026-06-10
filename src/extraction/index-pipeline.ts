/**
 * Index Pipeline
 *
 * Runs indexing stages in sequence with a shared IndexContext.
 * Extracted from ExtractionOrchestrator.indexAll() — the pipeline is the
 * "what happens in order", while the orchestrator remains the "who owns
 * the resources" (DB, rootDir, worker lifecycle).
 */

import type {
  IndexContext,
  IndexPipeline,
  IndexStage,
  IndexStageResult,
} from './index-pipeline-types';
import type { IndexResult } from './index';

/**
 * Create an empty indexing pipeline.
 * Stages are registered with register() and executed in registration order.
 */
export function createIndexPipeline(): IndexPipeline {
  const stages: IndexStage[] = [];

  return {
    register(stage: IndexStage): void {
      stages.push(stage);
    },

    stages(): readonly IndexStage[] {
      return stages;
    },

    async run(ctx: IndexContext): Promise<IndexResult> {
      ctx.startTime = ctx.startTime ?? Date.now();
      ctx.filesIndexed = 0;
      ctx.filesSkipped = 0;
      ctx.filesErrored = 0;
      ctx.totalNodes = 0;
      ctx.totalEdges = 0;
      ctx.errors = [];

      for (const stage of stages) {
        // Check for abort before each stage
        if (ctx.signal?.aborted) {
          ctx.errors!.push({
            message: 'Aborted',
            severity: 'error',
          });
          return buildAbortResult(ctx);
        }

        let result: IndexStageResult;
        try {
          result = await stage.execute(ctx);
        } catch (err) {
          ctx.errors!.push({
            message: `Stage "${stage.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
            severity: 'error',
          });
          return buildErrorResult(ctx);
        }

        // Accumulate errors from the stage
        if (result.errors && result.errors.length > 0) {
          ctx.errors!.push(...result.errors);
        }

        // Check for stage-initiated abort
        if (result.aborted) {
          if (result.abortReason) {
            ctx.errors!.push({
              message: result.abortReason,
              severity: 'error',
            });
          }
          return buildAbortResult(ctx);
        }
      }

      // Success — build final result from accumulated context
      return {
        success:
          ctx.filesIndexed! > 0 ||
          ctx.errors!.filter((e) => e.severity === 'error').length === 0,
        filesIndexed: ctx.filesIndexed!,
        filesSkipped: ctx.filesSkipped!,
        filesErrored: ctx.filesErrored!,
        nodesCreated: ctx.totalNodes!,
        edgesCreated: ctx.totalEdges!,
        errors: ctx.errors!,
        durationMs: Date.now() - ctx.startTime!,
      };
    },
  };
}

function buildAbortResult(ctx: IndexContext): IndexResult {
  return {
    success: false,
    filesIndexed: ctx.filesIndexed ?? 0,
    filesSkipped: ctx.filesSkipped ?? 0,
    filesErrored: ctx.filesErrored ?? 0,
    nodesCreated: ctx.totalNodes ?? 0,
    edgesCreated: ctx.totalEdges ?? 0,
    errors: ctx.errors ?? [],
    durationMs: Date.now() - (ctx.startTime ?? Date.now()),
  };
}

function buildErrorResult(ctx: IndexContext): IndexResult {
  return {
    success: false,
    filesIndexed: ctx.filesIndexed ?? 0,
    filesSkipped: ctx.filesSkipped ?? 0,
    filesErrored: ctx.filesErrored ?? 0,
    nodesCreated: ctx.totalNodes ?? 0,
    edgesCreated: ctx.totalEdges ?? 0,
    errors: ctx.errors ?? [],
    durationMs: Date.now() - (ctx.startTime ?? Date.now()),
  };
}
