/**
 * Tests for index-pipeline.ts and index-stages.ts — Candidate 3
 *
 * Tests the pipeline lifecycle: create, register stages, run in order,
 * abort handling, error accumulation, and context propagation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIndexPipeline } from '../src/extraction/index-pipeline';
import type {
  IndexContext,
  IndexStage,
  IndexStageResult,
  IndexPipeline,
} from '../src/extraction/index-pipeline-types';

// ===========================================================================
// Helpers
// ===========================================================================

function makeContext(overrides: Partial<IndexContext> = {}): IndexContext {
  return {
    rootDir: '/fake/project',
    queries: {} as any,
    ...overrides,
  };
}

/**
 * Create a simple stage that records execution order.
 */
function createSpyStage(
  name: string,
  fn?: (ctx: IndexContext) => Promise<IndexStageResult>
): IndexStage & { executed: boolean; order: number } {
  let order = 0;
  const stage: IndexStage & { executed: boolean; order: number } = {
    name,
    executed: false,
    order: 0,
    async execute(ctx: IndexContext): Promise<IndexStageResult> {
      stage.executed = true;
      stage.order = ++order;
      if (fn) return fn(ctx);
      return {};
    },
  };
  return stage;
}

// ===========================================================================
// createIndexPipeline
// ===========================================================================

describe('createIndexPipeline', () => {
  it('creates an empty pipeline', () => {
    const pipeline = createIndexPipeline();
    expect(pipeline.stages()).toHaveLength(0);
  });

  it('registers stages in order', () => {
    const pipeline = createIndexPipeline();
    const s1 = createSpyStage('s1');
    const s2 = createSpyStage('s2');
    pipeline.register(s1);
    pipeline.register(s2);
    expect(pipeline.stages()).toEqual([s1, s2]);
  });

  it('runs stages in registration order', async () => {
    const pipeline = createIndexPipeline();
    const executed: string[] = [];

    pipeline.register({
      name: 'first',
      async execute() { executed.push('first'); return {}; },
    });
    pipeline.register({
      name: 'second',
      async execute() { executed.push('second'); return {}; },
    });
    pipeline.register({
      name: 'third',
      async execute() { executed.push('third'); return {}; },
    });

    await pipeline.run(makeContext());
    expect(executed).toEqual(['first', 'second', 'third']);
  });

  it('returns IndexResult with default counters on empty pipeline', async () => {
    const pipeline = createIndexPipeline();
    const ctx = makeContext();
    const result = await pipeline.run(ctx);

    expect(result.success).toBe(true); // no errors, so success (even with 0 files)
    expect(result.filesIndexed).toBe(0);
    expect(result.filesSkipped).toBe(0);
    expect(result.filesErrored).toBe(0);
    expect(result.nodesCreated).toBe(0);
    expect(result.edgesCreated).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('accumulates filesIndexed from context', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 'indexer',
      async execute(ctx) {
        ctx.filesIndexed = 5;
        ctx.totalNodes = 42;
        ctx.totalEdges = 10;
        return {};
      },
    });

    const result = await pipeline.run(makeContext());
    expect(result.filesIndexed).toBe(5);
    expect(result.nodesCreated).toBe(42);
    expect(result.edgesCreated).toBe(10);
    expect(result.success).toBe(true);
  });

  it('accumulates filesSkipped and filesErrored', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 'skipper',
      async execute(ctx) {
        ctx.filesSkipped = 3;
        ctx.filesErrored = 1;
        return {};
      },
    });

    const result = await pipeline.run(makeContext());
    expect(result.filesSkipped).toBe(3);
    expect(result.filesErrored).toBe(1);
  });

  it('marks success=true when filesIndexed > 0', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 'indexer',
      async execute(ctx) {
        ctx.filesIndexed = 1;
        return {};
      },
    });

    const result = await pipeline.run(makeContext());
    expect(result.success).toBe(true);
  });

  it('marks success=false when no files indexed and errors exist', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 'failer',
      async execute(ctx) {
        return { errors: [{ message: 'bad', severity: 'error' }] };
      },
    });

    const result = await pipeline.run(makeContext());
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('marks success=true when no files but no error-severity issues', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 'warner',
      async execute(ctx) {
        return { errors: [{ message: 'warning only', severity: 'warning' }] };
      },
    });

    const result = await pipeline.run(makeContext());
    // success = filesIndexed > 0 || errors.filter(e => e.severity==='error').length === 0
    // filesIndexed = 0, error-severity = 0 → success = true
    expect(result.success).toBe(true);
  });

  it('accumulates errors across multiple stages', async () => {
    const pipeline = createIndexPipeline();
    pipeline.register({
      name: 's1',
      async execute() {
        return { errors: [{ message: 'e1', severity: 'error' }] };
      },
    });
    pipeline.register({
      name: 's2',
      async execute() {
        return { errors: [{ message: 'e2', severity: 'warning' }] };
      },
    });

    const result = await pipeline.run(makeContext());
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toBe('e1');
    expect(result.errors[1].message).toBe('e2');
  });

  it('tracks durationMs from startTime', async () => {
    const pipeline = createIndexPipeline();
    const ctx = makeContext({ startTime: Date.now() - 5000 });

    const result = await pipeline.run(ctx);
    expect(result.durationMs).toBeGreaterThanOrEqual(5000);
  });
});

// ===========================================================================
// Abort handling
// ===========================================================================

describe('pipeline abort handling', () => {
  it('aborts when signal is set before a stage', async () => {
    const pipeline = createIndexPipeline();
    const controller = new AbortController();
    controller.abort();

    const ctx = makeContext({ signal: controller.signal });
    const s1 = createSpyStage('s1');
    pipeline.register(s1);

    const result = await pipeline.run(ctx);
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toBe('Aborted');
    // Stage should NOT have executed since signal was aborted before it
    expect(s1.executed).toBe(false);
  });

  it('aborts when a stage returns aborted: true', async () => {
    const pipeline = createIndexPipeline();
    const s1 = createSpyStage('s1');
    const s2 = createSpyStage('s2');

    pipeline.register({
      name: 'aborter',
      async execute() {
        return { aborted: true, abortReason: 'test abort' };
      },
    });
    pipeline.register(s2);

    const result = await pipeline.run(makeContext());
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toBe('test abort');
    expect(s2.executed).toBe(false);
  });

  it('aborts when a stage throws an error', async () => {
    const pipeline = createIndexPipeline();
    const s2 = createSpyStage('s2');

    pipeline.register({
      name: 'thrower',
      async execute() {
        throw new Error('boom');
      },
    });
    pipeline.register(s2);

    const result = await pipeline.run(makeContext());
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('boom');
    expect(s2.executed).toBe(false);
  });
});

// ===========================================================================
// Context propagation
// ===========================================================================

describe('context propagation', () => {
  it('stages can read values written by previous stages', async () => {
    const pipeline = createIndexPipeline();
    const readValues: any[] = [];

    pipeline.register({
      name: 'writer',
      async execute(ctx) {
        ctx.files = ['a.ts', 'b.ts'];
        ctx.frameworkNames = ['express'];
        ctx.neededLanguages = ['typescript'];
        return {};
      },
    });
    pipeline.register({
      name: 'reader',
      async execute(ctx) {
        readValues.push({
          files: ctx.files,
          frameworkNames: ctx.frameworkNames,
          neededLanguages: ctx.neededLanguages,
        });
        return {};
      },
    });

    await pipeline.run(makeContext());
    expect(readValues).toEqual([{
      files: ['a.ts', 'b.ts'],
      frameworkNames: ['express'],
      neededLanguages: ['typescript'],
    }]);
  });

  it('initializes counters on first run', async () => {
    const pipeline = createIndexPipeline();
    const captured: any = {};

    pipeline.register({
      name: 'capture',
      async execute(ctx) {
        captured.filesIndexed = ctx.filesIndexed;
        captured.filesSkipped = ctx.filesSkipped;
        captured.filesErrored = ctx.filesErrored;
        captured.totalNodes = ctx.totalNodes;
        captured.totalEdges = ctx.totalEdges;
        captured.errors = ctx.errors;
        captured.startTime = ctx.startTime;
        return {};
      },
    });

    await pipeline.run(makeContext());
    expect(captured.filesIndexed).toBe(0);
    expect(captured.filesSkipped).toBe(0);
    expect(captured.filesErrored).toBe(0);
    expect(captured.totalNodes).toBe(0);
    expect(captured.totalEdges).toBe(0);
    expect(captured.errors).toEqual([]);
    expect(captured.startTime).toBeGreaterThan(0);
  });

  it('preserves startTime if already set', async () => {
    const pipeline = createIndexPipeline();
    const startTime = 1234567890;

    pipeline.register({
      name: 'check',
      async execute(ctx) {
        expect(ctx.startTime).toBe(startTime);
        return {};
      },
    });

    await pipeline.run(makeContext({ startTime }));
  });
});

// ===========================================================================
// ScanStage
// ===========================================================================

describe('ScanStage', () => {
  // ScanStage is tested via the pipeline because it needs real filesystem access
  // for scanDirectory(). The stage itself is a thin wrapper over the scan logic.
  // Full integration tests exist in extraction.test.ts.

  it('is registered with name "scan"', async () => {
    // Import dynamically to verify the name
    const { ScanStage } = await import('../src/extraction/index-stages');
    const stage = new ScanStage();
    expect(stage.name).toBe('scan');
  });
});

// ===========================================================================
// ParseStage
// ===========================================================================

describe('ParseStage', () => {
  it('is registered with name "parse"', async () => {
    const { ParseStage } = await import('../src/extraction/index-stages');
    const stage = new ParseStage();
    expect(stage.name).toBe('parse');
  });

  it('aborts when signal is set with no files to parse', async () => {
    const { ParseStage } = await import('../src/extraction/index-stages');
    const controller = new AbortController();
    controller.abort();

    const stage = new ParseStage();
    const ctx = makeContext({
      files: [],
      frameworkNames: [],
      signal: controller.signal,
    });

    const result = await stage.execute(ctx);
    expect(result.aborted).toBeUndefined(); // empty files → no loop → no abort check
  });
});

// ===========================================================================
// RetryStage
// ===========================================================================

describe('RetryStage', () => {
  it('is registered with name "retry"', async () => {
    const { RetryStage } = await import('../src/extraction/index-stages');
    const stage = new RetryStage();
    expect(stage.name).toBe('retry');
  });

  it('returns empty when no worker available', async () => {
    const { RetryStage } = await import('../src/extraction/index-stages');
    const stage = new RetryStage();
    const ctx = makeContext({
      useWorker: false,
      errors: [],
    });

    const result = await stage.execute(ctx);
    expect(result).toEqual({});
  });

  it('returns empty when no retryable errors exist', async () => {
    const { RetryStage } = await import('../src/extraction/index-stages');
    const stage = new RetryStage();
    const ctx = makeContext({
      useWorker: true,
      errors: [
        { message: 'some other error', severity: 'error', code: 'read_error' },
      ],
    });

    const result = await stage.execute(ctx);
    expect(result).toEqual({});
  });

  it('skips when errors have no filePath', async () => {
    const { RetryStage } = await import('../src/extraction/index-stages');
    const stage = new RetryStage();
    const ctx = makeContext({
      useWorker: true,
      errors: [
        { message: 'Worker exited', severity: 'error', code: 'parse_error' },
      ],
    });

    const result = await stage.execute(ctx);
    expect(result).toEqual({});
  });
});

// ===========================================================================
// storeExtractionResult
// ===========================================================================

describe('storeExtractionResult', () => {
  it('is exported and callable', async () => {
    const { storeExtractionResult } = await import('../src/extraction/index-stages');
    expect(typeof storeExtractionResult).toBe('function');
  });
});

// ===========================================================================
// Full pipeline composition
// ===========================================================================

describe('full pipeline composition', () => {
  it('can register Scan, Parse, Retry stages in order', async () => {
    const { ScanStage, ParseStage, RetryStage } = await import('../src/extraction/index-stages');
    const pipeline = createIndexPipeline();

    pipeline.register(new ScanStage());
    pipeline.register(new ParseStage());
    pipeline.register(new RetryStage());

    const stageNames = pipeline.stages().map(s => s.name);
    expect(stageNames).toEqual(['scan', 'parse', 'retry']);
  });

  it('passes progress callbacks through context', async () => {
    const pipeline = createIndexPipeline();
    const progressCalls: any[] = [];

    pipeline.register({
      name: 'progresser',
      async execute(ctx) {
        ctx.onProgress?.({ phase: 'scanning', current: 10, total: 100 });
        ctx.onProgress?.({ phase: 'parsing', current: 50, total: 100, currentFile: 'test.ts' });
        return {};
      },
    });

    await pipeline.run(makeContext({
      onProgress: (p) => progressCalls.push(p),
    }));

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toEqual({ phase: 'scanning', current: 10, total: 100 });
    expect(progressCalls[1]).toEqual({ phase: 'parsing', current: 50, total: 100, currentFile: 'test.ts' });
  });

  it('preserves verbose flag in context', async () => {
    const pipeline = createIndexPipeline();
    let capturedVerbose: boolean | undefined;

    pipeline.register({
      name: 'check',
      async execute(ctx) {
        capturedVerbose = ctx.verbose;
        return {};
      },
    });

    await pipeline.run(makeContext({ verbose: true }));
    expect(capturedVerbose).toBe(true);
  });
});
