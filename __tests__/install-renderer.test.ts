/**
 * InstallRenderer Tests
 *
 * Tests for NonInteractiveRenderer and TestRenderer — the two
 * concrete InstallRenderer implementations.
 *
 * TDD tracer bullets per zj-tdd:
 *   TB2: InstallRenderer interface + NonInteractiveRenderer + TestRenderer
 */

import { describe, it, expect } from 'vitest';
import {
  NonInteractiveRenderer,
  TestRenderer,
  type InstallRenderer,
} from '../src/installer/install-renderer';
import { createTestContext } from '../src/cli/command-context';
import type { InstallPlan } from '../src/installer/install-plan';
import type { AgentTarget, Location, DetectionResult, WriteResult, InstallOptions } from '../src/installer/targets/types';

// ============================================================
// Test doubles
// ============================================================

function makeStubTarget(id: string, displayName?: string): AgentTarget {
  return {
    id: id as any,
    displayName: displayName ?? id.charAt(0).toUpperCase() + id.slice(1),
    supportsLocation(_loc: Location): boolean { return true; },
    detect(_loc: Location): DetectionResult {
      return { installed: false, alreadyConfigured: false };
    },
    install(_loc: Location, _opts: InstallOptions): WriteResult {
      return { files: [] };
    },
    uninstall(_loc: Location): WriteResult {
      return { files: [] };
    },
    printConfig(_loc: Location): string { return '{}'; },
    describePaths(_loc: Location): string[] { return []; },
  };
}

function makePlan(overrides: Partial<InstallPlan> = {}): InstallPlan {
  return {
    targets: [],
    location: 'global',
    autoAllow: false,
    installCli: false,
    initializeProject: false,
    cwd: '/test/project',
    ...overrides,
  };
}

// ============================================================
// TB2a: NonInteractiveRenderer
// ============================================================

describe('NonInteractiveRenderer', () => {
  it('intro writes version to stdout', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.intro('1.2.3');

    expect(ctx.getStdout()).toContain('CodeGraph v1.2.3');
  });

  it('planSummary writes targets and location', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);
    const plan = makePlan({
      targets: [makeStubTarget('claude'), makeStubTarget('cursor')],
      location: 'global',
    });

    r.planSummary(plan);

    const out = ctx.getStdout();
    expect(out).toContain('Targets: Claude, Cursor');
    expect(out).toContain('Location: global');
  });

  it('planSummary shows CLI install when enabled', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);
    const plan = makePlan({ installCli: true });

    r.planSummary(plan);

    expect(ctx.getStdout()).toContain('Installing CLI on PATH');
  });

  it('targetResult renders file actions', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);
    const target = makeStubTarget('claude', 'Claude Code');
    const result: WriteResult = {
      files: [
        { path: '/home/user/.claude/mcp.json', action: 'created' },
        { path: '/home/user/.claude/settings.json', action: 'updated' },
      ],
      notes: ['Restart Claude to apply'],
    };

    r.targetResult(target, result);

    const out = ctx.getStdout();
    expect(out).toContain('Claude Code: Created /home/user/.claude/mcp.json');
    expect(out).toContain('Claude Code: Updated /home/user/.claude/settings.json');
    expect(out).toContain('Claude Code: Restart Claude to apply');
  });

  it('targetResult renders unchanged action', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);
    const target = makeStubTarget('claude', 'Claude Code');
    const result: WriteResult = {
      files: [{ path: '/home/user/.claude/mcp.json', action: 'unchanged' }],
    };

    r.targetResult(target, result);

    expect(ctx.getStdout()).toContain('Unchanged');
  });

  it('warn writes to stderr', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.warn('something is wrong');

    expect(ctx.getStderr()).toContain('[warn] something is wrong');
  });

  it('error writes to stderr', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.error('fatal error');

    expect(ctx.getStderr()).toContain('[error] fatal error');
  });

  it('info writes to stdout', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.info('all good');

    expect(ctx.getStdout()).toContain('[info] all good');
  });

  it('success writes to stdout', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.success('done');

    expect(ctx.getStdout()).toContain('[ok] done');
  });

  it('outro writes to stdout', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.outro('Installation complete!');

    expect(ctx.getStdout()).toContain('Installation complete!');
  });

  it('note with title includes title', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.note('cd my-project', 'Quick start');

    expect(ctx.getStdout()).toContain('Quick start: cd my-project');
  });

  it('note without title just writes message', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    r.note('some hint');

    expect(ctx.getStdout()).toContain('some hint');
  });

  it('spinnerStart logs message and returns no-op stop', () => {
    const ctx = createTestContext();
    const r = new NonInteractiveRenderer(ctx);

    const stop = r.spinnerStart('Installing...');

    expect(ctx.getStdout()).toContain('Installing...');
    // stop should not throw
    expect(() => stop()).not.toThrow();
  });
});

// ============================================================
// TB2b: TestRenderer
// ============================================================

describe('TestRenderer', () => {
  it('captures intro version', () => {
    const r = new TestRenderer();

    r.intro('2.0.0');

    expect(r.output.intro).toEqual(['2.0.0']);
  });

  it('captures planSummary fields', () => {
    const r = new TestRenderer();
    const plan = makePlan({
      targets: [makeStubTarget('claude')],
      location: 'local',
      autoAllow: true,
      installCli: true,
      initializeProject: true,
    });

    r.planSummary(plan);

    expect(r.output.planSummary).toContain('targets=claude');
    expect(r.output.planSummary).toContain('location=local');
    expect(r.output.planSummary).toContain('autoAllow=true');
    expect(r.output.planSummary).toContain('installCli=true');
    expect(r.output.planSummary).toContain('initProject=true');
  });

  it('captures targetResult with file actions', () => {
    const r = new TestRenderer();
    const target = makeStubTarget('cursor', 'Cursor');
    const result: WriteResult = {
      files: [
        { path: '/tmp/.cursor/mcp.json', action: 'created' },
        { path: '/tmp/.cursor/README.md', action: 'updated' },
      ],
      notes: ['Restart Cursor'],
    };

    r.targetResult(target, result);

    expect(r.output.targetResults).toHaveLength(1);
    expect(r.output.targetResults[0].target).toBe('cursor');
    expect(r.output.targetResults[0].lines).toContain('created:/tmp/.cursor/mcp.json');
    expect(r.output.targetResults[0].lines).toContain('updated:/tmp/.cursor/README.md');
    expect(r.output.targetResults[0].lines).toContain('note:Restart Cursor');
  });

  it('captures warnings', () => {
    const r = new TestRenderer();

    r.warn('low disk space');

    expect(r.output.warns).toEqual(['low disk space']);
  });

  it('captures infos', () => {
    const r = new TestRenderer();

    r.info('processing');

    expect(r.output.infos).toEqual(['processing']);
  });

  it('captures successes', () => {
    const r = new TestRenderer();

    r.success('all targets configured');

    expect(r.output.successes).toEqual(['all targets configured']);
  });

  it('captures errors', () => {
    const r = new TestRenderer();

    r.error('permission denied');

    expect(r.output.errors).toEqual(['permission denied']);
  });

  it('captures outro messages', () => {
    const r = new TestRenderer();

    r.outro('Done!');

    expect(r.output.outros).toEqual(['Done!']);
  });

  it('captures notes', () => {
    const r = new TestRenderer();

    r.note('run zcodegraph sync', 'Tip');

    expect(r.output.notes).toEqual([{ title: 'Tip', message: 'run zcodegraph sync' }]);
  });

  it('tracks spinner lifecycle', () => {
    const r = new TestRenderer();

    const stop = r.spinnerStart('Indexing files...');

    expect(r.output.spinners).toHaveLength(1);
    expect(r.output.spinners[0].message).toBe('Indexing files...');
    expect(r.output.spinners[0].stopped).toBe(false);

    stop();

    expect(r.output.spinners[0].stopped).toBe(true);
  });

  it('tracks multiple spinners independently', () => {
    const r = new TestRenderer();

    const stop1 = r.spinnerStart('Step 1');
    const stop2 = r.spinnerStart('Step 2');

    expect(r.output.spinners).toHaveLength(2);
    expect(r.output.spinners[0].stopped).toBe(false);
    expect(r.output.spinners[1].stopped).toBe(false);

    stop1();

    expect(r.output.spinners[0].stopped).toBe(true);
    expect(r.output.spinners[1].stopped).toBe(false);

    stop2();

    expect(r.output.spinners[1].stopped).toBe(true);
  });

  it('has clean initial state', () => {
    const r = new TestRenderer();

    expect(r.output.intro).toEqual([]);
    expect(r.output.planSummary).toEqual([]);
    expect(r.output.targetResults).toEqual([]);
    expect(r.output.warns).toEqual([]);
    expect(r.output.infos).toEqual([]);
    expect(r.output.successes).toEqual([]);
    expect(r.output.errors).toEqual([]);
    expect(r.output.outros).toEqual([]);
    expect(r.output.notes).toEqual([]);
    expect(r.output.spinners).toEqual([]);
  });
});

// ============================================================
// TB2c: Interface contract
// ============================================================

describe('InstallRenderer interface contract', () => {
  it('NonInteractiveRenderer satisfies InstallRenderer', () => {
    const ctx = createTestContext();
    const r: InstallRenderer = new NonInteractiveRenderer(ctx);

    // All methods should be callable without error
    r.intro('1.0');
    r.planSummary(makePlan());
    r.targetResult(makeStubTarget('claude'), { files: [] });
    r.warn('w');
    r.info('i');
    r.success('s');
    r.error('e');
    r.outro('o');
    r.note('n');
    r.spinnerStart('sp');
  });

  it('TestRenderer satisfies InstallRenderer', () => {
    const r: InstallRenderer = new TestRenderer();

    r.intro('1.0');
    r.planSummary(makePlan());
    r.targetResult(makeStubTarget('claude'), { files: [] });
    r.warn('w');
    r.info('i');
    r.success('s');
    r.error('e');
    r.outro('o');
    r.note('n');
    r.spinnerStart('sp');
  });
});
