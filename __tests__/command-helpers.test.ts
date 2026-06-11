/**
 * Tests for CLI command helpers — pure functions for pre-checks,
 * path resolution, and formatting.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import {
  resolveProjectPath,
  isProjectInitialized,
  requireInitialized,
  requireNotInitialized,
  formatNumber,
  formatDuration,
  truncate,
  formatSize,
} from '../src/cli/command-helpers';

// ─── resolveProjectPath ─────────────────────────────────────────────────────

describe('resolveProjectPath', () => {
  it('returns cwd when no pathArg', () => {
    const cwd = process.platform === 'win32' ? 'C:\\home\\user' : '/home/user';
    expect(resolveProjectPath(undefined, cwd)).toBe(cwd);
  });

  it('resolves relative path against cwd', () => {
    const cwd = process.platform === 'win32' ? 'C:\\home\\user' : '/home/user';
    const result = resolveProjectPath('my-project', cwd);
    expect(result).toBe(path.resolve(cwd, 'my-project'));
  });

  it('returns absolute path as-is', () => {
    const absPath = process.platform === 'win32' ? 'C:\\absolute\\path' : '/absolute/path';
    expect(resolveProjectPath(absPath, '/home/user')).toBe(absPath);
  });
});

// ─── isProjectInitialized ───────────────────────────────────────────────────

describe('isProjectInitialized', () => {
  it('returns true for initialized project', () => {
    // Create a temp dir with .zcodegraph/
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.mkdirSync(path.join(tmp, '.zcodegraph'));
    fs.writeFileSync(path.join(tmp, '.zcodegraph', 'zcodegraph.db'), '');
    try {
      expect(isProjectInitialized(tmp)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns false for uninitialized project', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    try {
      expect(isProjectInitialized(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns false for .zcodegraph without zcodegraph.db', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.mkdirSync(path.join(tmp, '.zcodegraph'));
    try {
      expect(isProjectInitialized(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns false for non-existent path', () => {
    expect(isProjectInitialized('/nonexistent/path/12345')).toBe(false);
  });

  it('returns false when .zcodegraph is a file, not a directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.writeFileSync(path.join(tmp, '.zcodegraph'), 'not a dir');
    try {
      expect(isProjectInitialized(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ─── requireInitialized ─────────────────────────────────────────────────────

describe('requireInitialized', () => {
  it('returns ok with path for initialized project', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.mkdirSync(path.join(tmp, '.zcodegraph'));
    fs.writeFileSync(path.join(tmp, '.zcodegraph', 'zcodegraph.db'), '');
    try {
      const result = requireInitialized(undefined, tmp);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.path).toBe(path.resolve(tmp));
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns error for uninitialized project', () => {
    const result = requireInitialized('/nonexistent/path', '/cwd');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('not initialized');
      expect(result.hint).toContain('zcodegraph init');
    }
  });
});

// ─── requireNotInitialized ──────────────────────────────────────────────────

describe('requireNotInitialized', () => {
  it('returns ok for uninitialized project', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    try {
      const result = requireNotInitialized(undefined, tmp);
      expect(result.ok).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns error for initialized project', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.mkdirSync(path.join(tmp, '.zcodegraph'));
    fs.writeFileSync(path.join(tmp, '.zcodegraph', 'zcodegraph.db'), '');
    try {
      const result = requireNotInitialized(undefined, tmp);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('already initialized');
        expect(result.hint).toContain('uninit');
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns false for legacy .codegraph only', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-test-'));
    fs.mkdirSync(path.join(tmp, '.codegraph'));
    try {
      expect(isProjectInitialized(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ─── formatNumber ───────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats small numbers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
  });

  it('formats thousands with grouping', () => {
    const result = formatNumber(1234567);
    // On en-US locale: "1,234,567"
    expect(result).toMatch(/1[,.]234[,.]567/);
  });
});

// ─── formatDuration ─────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1234)).toBe('1.23s');
    expect(formatDuration(45678)).toBe('45.68s');
  });

  it('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

// ─── truncate ───────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns short strings as-is', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });

  it('handles exact length', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
});

// ─── formatSize ─────────────────────────────────────────────────────────────

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(0)).toBe('0B');
    expect(formatSize(500)).toBe('500B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(2048)).toBe('2.0KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0MB');
  });
});
