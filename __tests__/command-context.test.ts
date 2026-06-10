/**
 * Tests for CLI Command Context, helpers, and command functions.
 *
 * Candidate 5: separate command behavior from process-level IO,
 * formatting, and exit handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// ─── command-context tests ──────────────────────────────────────────────────

import {
  createTestContext,
  createProcessContext,
  TestExit,
  writeCommandOutput,
  writeCommandErrors,
} from '../src/cli/command-context';
import type { CommandContext, CommandOutput, CommandError } from '../src/cli/command-context';

describe('CommandContext', () => {
  describe('createTestContext', () => {
    it('creates context with default cwd', () => {
      const ctx = createTestContext();
      expect(ctx.cwd).toBe('/test/project');
      expect(ctx.platform).toBe(process.platform);
    });

    it('creates context with custom cwd', () => {
      const ctx = createTestContext('/custom/path');
      expect(ctx.cwd).toBe('/custom/path');
    });

    it('captures stdout writes', () => {
      const ctx = createTestContext();
      ctx.stdout.write('hello');
      ctx.stdout.write(' world');
      expect(ctx.getStdout()).toBe('hello world');
    });

    it('captures stderr writes', () => {
      const ctx = createTestContext();
      ctx.stderr.write('error!');
      expect(ctx.getStderr()).toBe('error!');
    });

    it('captures log calls', () => {
      const ctx = createTestContext();
      ctx.log('msg1');
      ctx.warn('msg2');
      ctx.error('msg3');
      expect(ctx.getLogs()).toEqual([
        '[INFO] msg1',
        '[WARN] msg2',
        '[ERROR] msg3',
      ]);
    });

    it('exit() throws TestExit with exit code', () => {
      const ctx = createTestContext();
      expect(() => ctx.exit(42)).toThrow(TestExit);
      try {
        ctx.exit(42);
      } catch (e) {
        expect(e).toBeInstanceOf(TestExit);
        expect((e as TestExit).exitCode).toBe(42);
        expect((e as TestExit).message).toContain('42');
      }
    });

    it('exit() does not terminate the process', () => {
      const ctx = createTestContext();
      let caught = false;
      try { ctx.exit(0); } catch { caught = true; }
      expect(caught).toBe(true);
      // If we reach here, the process is still alive
    });
  });

  describe('createProcessContext', () => {
    it('creates context wired to real process', () => {
      const ctx = createProcessContext('/tmp');
      expect(ctx.cwd).toBe('/tmp');
      expect(ctx.platform).toBe(process.platform);
      expect(ctx.nodeVersion).toBe(process.version);
      // stdout/stderr are real streams
      expect(ctx.stdout).toBe(process.stdout);
      expect(ctx.stderr).toBe(process.stderr);
    });
  });
});

// ─── writeCommandOutput tests ───────────────────────────────────────────────

describe('writeCommandOutput', () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('writes text output', () => {
    writeCommandOutput({ text: 'hello world' }, ctx);
    expect(ctx.getStdout()).toBe('hello world\n');
  });

  it('writes line array', () => {
    writeCommandOutput({ lines: ['line1', 'line2', 'line3'] }, ctx);
    expect(ctx.getStdout()).toBe('line1\nline2\nline3\n');
  });

  it('writes JSON output', () => {
    writeCommandOutput({ json: { a: 1, b: [2, 3] } }, ctx);
    const parsed = JSON.parse(ctx.getStdout().trim());
    expect(parsed).toEqual({ a: 1, b: [2, 3] });
  });

  it('writes all output types together', () => {
    writeCommandOutput({
      text: 'text',
      lines: ['l1'],
      json: { key: 'val' },
    }, ctx);
    const out = ctx.getStdout();
    expect(out).toContain('text\n');
    expect(out).toContain('l1\n');
    expect(out).toContain('"key"');
  });

  it('writes nothing for empty output', () => {
    writeCommandOutput({}, ctx);
    expect(ctx.getStdout()).toBe('');
  });
});

// ─── writeCommandErrors tests ───────────────────────────────────────────────

describe('writeCommandErrors', () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('writes error to stderr', () => {
    writeCommandErrors([
      { message: 'something failed', severity: 'error', code: 'E001' },
    ], ctx);
    expect(ctx.getStderr()).toBe('ERROR: something failed\n');
  });

  it('writes warning to stdout', () => {
    writeCommandErrors([
      { message: 'deprecated option', severity: 'warn', code: 'W001' },
    ], ctx);
    expect(ctx.getStdout()).toBe('WARN: deprecated option\n');
  });

  it('writes info to stdout', () => {
    writeCommandErrors([
      { message: 'hint: use --force', severity: 'info', code: 'hint' },
    ], ctx);
    expect(ctx.getStdout()).toBe('INFO: hint: use --force\n');
  });

  it('writes multiple errors to correct streams', () => {
    writeCommandErrors([
      { message: 'err1', severity: 'error' },
      { message: 'warn1', severity: 'warn' },
      { message: 'info1', severity: 'info' },
      { message: 'err2', severity: 'error' },
    ], ctx);
    expect(ctx.getStderr()).toBe('ERROR: err1\nERROR: err2\n');
    expect(ctx.getStdout()).toBe('WARN: warn1\nINFO: info1\n');
  });
});

// ─── TestExit tests ─────────────────────────────────────────────────────────

describe('TestExit', () => {
  it('is an Error instance', () => {
    const e = new TestExit(1);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(TestExit);
  });

  it('has correct name', () => {
    const e = new TestExit(0);
    expect(e.name).toBe('TestExit');
  });

  it('stores exit code', () => {
    expect(new TestExit(0).exitCode).toBe(0);
    expect(new TestExit(1).exitCode).toBe(1);
    expect(new TestExit(127).exitCode).toBe(127);
  });
});
