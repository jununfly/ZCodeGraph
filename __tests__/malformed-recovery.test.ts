/**
 * Issue #679: MCP SQLite stale connection recovery (lazy detection)
 *
 * When CLI `zcodegraph index` rebuilds the database, the MCP server's
 * long-lived CodeGraph instance holds a stale SQLite handle. Subsequent
 * tool calls fail with "database disk image is malformed". The fix:
 * detect the corruption error in ToolHandler.execute()'s catch block,
 * reopen the database connection, and retry the tool call once.
 *
 * These tests follow TDD vertical slices — each test drives one piece
 * of implementation through the public interface.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isSqliteCorruptionError } from '../src/db/error-detection';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';

describe('isSqliteCorruptionError', () => {
  it('matches "database disk image is malformed"', () => {
    const err = new Error('database disk image is malformed');
    expect(isSqliteCorruptionError(err)).toBe(true);
  });

  it('matches "file is not a database"', () => {
    const err = new Error('file is not a database');
    expect(isSqliteCorruptionError(err)).toBe(true);
  });

  it('matches "SQLITE_CORRUPT" in error message', () => {
    const err = new Error('SQLITE_CORRUPT: some internal detail');
    expect(isSqliteCorruptionError(err)).toBe(true);
  });

  it('does not match non-corruption errors', () => {
    expect(isSqliteCorruptionError(new Error('database is locked'))).toBe(false);
    expect(isSqliteCorruptionError(new Error('no such table: nodes'))).toBe(false);
    expect(isSqliteCorruptionError(new Error('connection timeout'))).toBe(false);
  });

  it('handles non-Error values gracefully', () => {
    expect(isSqliteCorruptionError(null)).toBe(false);
    expect(isSqliteCorruptionError(undefined)).toBe(false);
    expect(isSqliteCorruptionError('database disk image is malformed')).toBe(true);
    expect(isSqliteCorruptionError(42)).toBe(false);
  });
});

describe('CodeGraph.reopen()', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-reopen-'));
    fs.mkdirSync(path.join(testDir, 'src'));
    fs.writeFileSync(
      path.join(testDir, 'src', 'survivor.ts'),
      'export function survivor() { return 1; }\n',
    );
    cg = CodeGraph.initSync(testDir, { config: { include: ['**/*.ts'], exclude: [] } } as any);
  });

  afterEach(() => {
    try { cg.unwatch(); } catch { /* ignore */ }
    try { cg.close(); } catch { /* ignore */ }
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('serves queries normally after reopen', async () => {
    await cg.indexAll({ engine: 'typescript' });

    // Verify search works before reopen
    const before = cg.searchNodes('survivor');
    expect(before.length).toBeGreaterThan(0);

    // Reopen — closes the old DB handle, opens a fresh one
    cg.reopen();

    // Search must still work with the new connection
    const after = cg.searchNodes('survivor');
    expect(after.length).toBeGreaterThan(0);
    expect(after[0].node.name).toBe('survivor');
  });
});

describe('ToolHandler lazy recovery', () => {
  let testDir: string;
  let cg: CodeGraph;
  let handler: ToolHandler;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-lazy-recovery-'));
    fs.mkdirSync(path.join(testDir, 'src'));
    fs.writeFileSync(
      path.join(testDir, 'src', 'survivor.ts'),
      'export function survivor() { return 1; }\n',
    );
    cg = CodeGraph.initSync(testDir, { config: { include: ['**/*.ts'], exclude: [] } } as any);
    handler = new ToolHandler(cg);
  });

  afterEach(() => {
    try { cg.unwatch(); } catch { /* ignore */ }
    try { cg.close(); } catch { /* ignore */ }
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('reopens and retries when a SQLite corruption error occurs', async () => {
    await cg.indexAll({ engine: 'typescript' });

    // Spy on searchNodes: throw once with corruption error, then work
    let searchCallCount = 0;
    const realSearchNodes = cg.searchNodes.bind(cg);
    cg.searchNodes = (...args: Parameters<typeof realSearchNodes>) => {
      searchCallCount++;
      if (searchCallCount === 1) {
        throw new Error('database disk image is malformed');
      }
      return realSearchNodes(...args);
    };

    // Spy on reopen to verify it's called
    const reopenSpy = vi.spyOn(cg, 'reopen');

    const res = await handler.execute('zcodegraph_search', { query: 'survivor' });

    expect(reopenSpy).toHaveBeenCalledTimes(1);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toMatch(/survivor/);
  });

  it('does not retry for non-corruption errors', async () => {
    await cg.indexAll({ engine: 'typescript' });

    // Spy on searchNodes: throw a non-corruption error
    cg.searchNodes = () => {
      throw new Error('no such table: nodes');
    };

    const reopenSpy = vi.spyOn(cg, 'reopen');

    const res = await handler.execute('zcodegraph_search', { query: 'survivor' });

    expect(reopenSpy).not.toHaveBeenCalled();
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/no such table/);
  });

  it('does not retry more than once', async () => {
    await cg.indexAll({ engine: 'typescript' });

    // searchNodes always throws corruption error, even after reopen
    cg.searchNodes = () => {
      throw new Error('database disk image is malformed');
    };

    const reopenSpy = vi.spyOn(cg, 'reopen');

    const res = await handler.execute('zcodegraph_search', { query: 'survivor' });

    // reopen called once, but error persists → return error, no second retry
    expect(reopenSpy).toHaveBeenCalledTimes(1);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/malformed/);
  });
});
