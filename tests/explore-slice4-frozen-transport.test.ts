import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { FrozenMcpExploreAdapter } from '../src/mcp/frozen-explore-transport';
import {
  composeFrozenExploreTransport,
  freezeExploreTransport,
  frozenFailureReservation,
  projectFrozenExploreTransport,
} from '../src/explore/frozen-transport';
import { formatStaleBanner, formatStaleFooter } from '../src/mcp/tools';
import { utf8ByteLength } from '../src/explore/budget-utf8';
import { minimumExploreErrorUtf8Bytes } from '../src/explore/delivery';
import type { PendingFile } from '../src/sync';

const roots: string[] = [];
const graphs: CodeGraph[] = [];
const pending = (filePath: string, lastSeenMs = 80): PendingFile => ({
  path: filePath, firstSeenMs: lastSeenMs, lastSeenMs, indexing: false,
});

function frozenInput(files: PendingFile[] = [pending('target.ts')]) {
  return {
    filePaths: ['target.ts'], pendingFiles: files, nowMs: 100,
    worktreeNotice: 'worktree: frozen', formatStaleBanner, formatStaleFooter,
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(graphs.splice(0).map((graph) => graph.close()));
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Slice 4 frozen MCP transport', () => {
  it('freezes prefix/footer and injected clock without a later watcher read', () => {
    const files = [pending('target.ts'), pending('elsewhere.ts')];
    const input = frozenInput(files);
    const frozen = freezeExploreTransport(input);
    const failedProjection = { ...frozen, suffix: '', reservationUtf8Bytes: frozen.terminalFailureUtf8Bytes };
    const failed = composeFrozenExploreTransport('budget-exhausted: bounded', failedProjection, 4096);
    expect(failed).not.toContain('elsewhere.ts');
    expect(frozenFailureReservation(failedProjection)).toBe(
      utf8ByteLength(failed) - utf8ByteLength('budget-exhausted: bounded'),
    );
    expect(utf8ByteLength(failed)).toBeLessThanOrEqual(frozen.reservationUtf8Bytes);
    const projected = projectFrozenExploreTransport(input, 'target.ts');
    files[0]!.path = 'changed.ts';
    files[0]!.lastSeenMs = 99;
    expect(frozen.prefix).toContain('edited 20ms ago');
    expect(frozen.suffix).toContain('elsewhere.ts');
    expect(projected.prefix).toBe(frozen.prefix);
    expect(projected.suffix).toBe(frozen.suffix);
    expect(frozen.reservationUtf8Bytes).toBeGreaterThanOrEqual(
      projected.reservationUtf8Bytes,
    );
  });

  it('accounts for notices, separators and footer without tail truncation', () => {
    const frozen = freezeExploreTransport(frozenInput());
    const projected = projectFrozenExploreTransport(frozenInput(), 'target.ts');
    const text = composeFrozenExploreTransport('target.ts', projected, 4096);
    expect(utf8ByteLength(text)).toBe(projected.reservationUtf8Bytes + utf8ByteLength('target.ts'));
    expect(() => composeFrozenExploreTransport('target.ts', projected, utf8ByteLength(text) - 1))
      .toThrow('budget-exhausted');
  });

  it('reserves a banner and separators even when referenced files are initially unknown', () => {
    const input = { ...frozenInput(), filePaths: [] };
    const frozen = freezeExploreTransport(input);
    const projected = projectFrozenExploreTransport(input, '#### target.ts:1-1\nsource');
    const output = composeFrozenExploreTransport('source', projected, 4096);
    expect(frozen.reservationUtf8Bytes).toBeGreaterThanOrEqual(
      utf8ByteLength(output) - utf8ByteLength('source'),
    );
    expect(output).toContain('worktree: frozen\n\n⚠️');
    expect(output).toContain('target.ts');
  });

  it('uses frozen MCP notices and an exact final cap with real SQLite source', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-frozen-mcp-'));
    roots.push(root);
    fs.writeFileSync(path.join(root, 'target.ts'), 'export function target() { return 1; }\n');
    const graph = CodeGraph.initSync(root, { config: { include: ['**/*.ts'], exclude: [] } });
    graphs.push(graph);
    await graph.indexAll({ engine: 'typescript' });
    const files = [pending('target.ts')];
    const text = await new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: 2048, nowMs: 100,
      pendingFiles: files, worktreeNotice: 'worktree: frozen',
    });
    expect(text).toContain('worktree: frozen\n\n');
    expect(text).toContain('export function target');
    expect(text).toContain('edited 20ms ago');
    expect(utf8ByteLength(text)).toBeLessThanOrEqual(2048);
    files[0]!.lastSeenMs = 1;
    expect(text).toContain('edited 20ms ago');
    const repeated = await new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: 2048, nowMs: 100,
      pendingFiles: [pending('target.ts')], worktreeNotice: 'worktree: frozen',
    });
    expect(repeated).toBe(text);
    const exactCap = utf8ByteLength(text);
    const frozen = freezeExploreTransport({
      ...frozenInput([pending('target.ts')]), filePaths: [],
    });
    const protocolMinimum = frozen.reservationUtf8Bytes + minimumExploreErrorUtf8Bytes([], 0);
    expect(exactCap).toBeLessThan(protocolMinimum);
    const tight = await new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: protocolMinimum, nowMs: 100,
      pendingFiles: [pending('target.ts')], worktreeNotice: 'worktree: frozen',
    });
    expect(tight).toBe(text);
    await expect(new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: protocolMinimum - 1, nowMs: 100,
      pendingFiles: [pending('target.ts')], worktreeNotice: 'worktree: frozen',
    })).rejects.toThrow('invalid-input');
  });

  it('does not append a success footer to a real source failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-frozen-failure-'));
    roots.push(root);
    const target = path.join(root, 'target.ts');
    fs.writeFileSync(target, 'export function target() { return 1; }\n');
    const graph = CodeGraph.initSync(root, { config: { include: ['**/*.ts'], exclude: [] } });
    graphs.push(graph);
    await graph.indexAll({ engine: 'typescript' });
    fs.writeFileSync(target, 'export function target() { return 2; }\n');
    const text = await new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: 4096, nowMs: 100,
      pendingFiles: [pending('target.ts'), pending('elsewhere.ts')],
      worktreeNotice: 'worktree: frozen',
    });
    expect(text).toContain('worktree: frozen\n\nsource-changed: no verified source evidence');
    expect(text).not.toContain('elsewhere.ts');
    expect(text).not.toContain('Some files referenced below');
  });

  it('rejects the complete frozen minimum using UTF-8 bytes, not UTF-16 length', async () => {
    const graph = { getProjectRoot: vi.fn() } as unknown as CodeGraph;
    const pendingFiles = [pending('目标.ts')];
    const input = { ...frozenInput(pendingFiles), filePaths: [] };
    const frozen = freezeExploreTransport(input);
    const required = frozen.reservationUtf8Bytes + minimumExploreErrorUtf8Bytes([], 0);
    await expect(new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: required - 1, nowMs: 100, pendingFiles,
      worktreeNotice: 'worktree: frozen',
    })).rejects.toThrow('invalid-input');
    expect(graph.getProjectRoot).not.toHaveBeenCalled();
  });

  it('rejects a frozen protocol minimum violation before graph retrieval', async () => {
    const graph = { getProjectRoot: vi.fn() } as unknown as CodeGraph;
    await expect(new FrozenMcpExploreAdapter().explore({
      graph, query: 'target', capUtf8Bytes: minimumExploreErrorUtf8Bytes([], 0) - 1,
      nowMs: 100, pendingFiles: [pending('target.ts')],
    })).rejects.toThrow('invalid-input');
    expect(graph.getProjectRoot).not.toHaveBeenCalled();
  });
});
