/**
 * MCP initialization failure — actionable recovery hints (roadmap 1-2-1).
 *
 * When the MCP server starts in a directory that HAS a `.zcodegraph/` but
 * `CodeGraph.open()` fails (sqlite-adapter throw, lock, permissions, …),
 * the current behavior is `engine.ts` writes the underlying error to stderr
 * and leaves `cg = null`. Subsequent `tools/call` then falls into the
 * generic "No CodeGraph project is loaded for this session" branch in
 * `ToolHandler.getCodeGraph()`, which tells the agent "this is a working-
 * directory detection issue" — the wrong diagnosis entirely.
 *
 * This suite pins the contract that an init-time open failure is surfaced
 * back through the tool error channel with the underlying message AND a
 * concrete recovery hint, so the agent can self-heal instead of guessing.
 *
 * Three scenarios:
 *   1. `.zcodegraph/` exists but open() throws (lock / perms / corrupt).
 *   2. `zcodegraph_status` lists tree-sitter grammars that failed to load
 *      (wasm missing / ABI mismatch), so the agent knows which languages
 *      have no parser instead of silently getting degraded results.
 *   3. The server-instructions text documents the recovery playbook so the
 *      agent has a single source of truth at handshake time.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolHandler } from '../src/mcp/tools';
import { SERVER_INSTRUCTIONS } from '../src/mcp/server-instructions';

describe('MCP init failure → actionable tool errors', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-init-recovery-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Windows may hold file locks briefly; best-effort cleanup.
    }
  });

  it('tools/call surfaces cached init error with recovery hint when open() failed', async () => {
    // Simulate: engine attempted to open `<tmpDir>/.zcodegraph/` and the
    // underlying sqlite layer threw. The handler must include BOTH the
    // underlying error message AND a recovery hint in the error ToolResult.
    const handler = new ToolHandler(null);
    handler.setDefaultProjectHint(tmpDir);
    const underlying = 'SQLITE_CANTOPEN: unable to open database file';
    handler.setInitFailure({
      projectPath: tmpDir,
      message: underlying,
    });

    const result = await handler.execute('zcodegraph_search', { query: 'foo' });
    const text = toolResultText(result);
    expect(isErrorResult(result)).toBe(true);
    expect(text).toContain(underlying);
    expect(text).toMatch(/zcodegraph index|delete.*\.zcodegraph|reindex/i);
  });

  it('tools/call without init failure keeps the existing "not initialized" wording', async () => {
    // Guard: when there's NO cached init failure, the original "no project
    // loaded — pass projectPath or set --path" error must not regress.
    const handler = new ToolHandler(null);
    handler.setDefaultProjectHint(tmpDir);

    const result = await handler.execute('zcodegraph_search', { query: 'foo' });
    const text = toolResultText(result);
    expect(isErrorResult(result)).toBe(true);
    expect(text).toMatch(/No CodeGraph project is loaded/);
  });

  it('init failure is cleared once a default CodeGraph is set', async () => {
    // After a successful retry (setDefaultCodeGraph), the cached init error
    // must not shadow later tool errors. Prevents a stale cached failure
    // from masking a real, new problem on the recovered instance.
    const handler = new ToolHandler(null);
    handler.setDefaultProjectHint(tmpDir);
    handler.setInitFailure({ projectPath: tmpDir, message: 'boom' });

    // Fake a successful retry — the handler should drop the cached failure.
    handler.setDefaultCodeGraph({} as never);

    // With a cg set, the next error should NOT contain the stale cached text.
    const result = await handler.execute('zcodegraph_search', {} as never);
    const text = toolResultText(result);
    expect(text).not.toMatch(/boom/);
  });
});

describe('zcodegraph_status — unavailable grammar surface', () => {
  it('status output includes an "Unavailable grammars" section listing failed languages', async () => {
    // Build a handler with a stub cg that exposes the minimal surface
    // handleStatus() touches. We drive the unavailable-grammar list through
    // a new explicit injection point so the test doesn't need real wasm
    // failures (those are platform/ABI dependent).
    const stubCg = makeStatusStub();
    const handler = new ToolHandler(stubCg as never);
    handler.setUnavailableGrammars(new Map([
      ['csharp', 'ABI version mismatch: expected 14, got 13'],
      ['lua', 'ENOENT: tree-sitter-lua.wasm not found'],
    ]));

    const result = await handler.execute('zcodegraph_status', {});
    const text = toolResultText(result);
    expect(text).toMatch(/Unavailable grammars/i);
    expect(text).toMatch(/csharp/);
    expect(text).toMatch(/lua/);
    // The agent must be told these languages are NOT parsed.
    expect(text).toMatch(/not parsed|parsing unavailable|no parser/i);
  });

  it('status output omits the section when every grammar loaded fine', async () => {
    const stubCg = makeStatusStub();
    const handler = new ToolHandler(stubCg as never);
    handler.setUnavailableGrammars(new Map());

    const result = await handler.execute('zcodegraph_status', {});
    const text = toolResultText(result);
    expect(text).not.toMatch(/Unavailable grammars/i);
  });
});

describe('SERVER_INSTRUCTIONS — first-run troubleshooting section', () => {
  it('documents the recovery playbook for the three actionable failure classes', () => {
    // §1: open() failed on an existing .zcodegraph/ — agent should see the
    // underlying message plus a concrete next step (reindex / delete dir).
    expect(SERVER_INSTRUCTIONS).toMatch(/Troubleshooting|首次接入失败|first[- ]run/i);

    // §2: uninitialized — covered today by the Limitations section; we pin
    // that the new section links the same `zcodegraph index` command so the
    // two sections don't drift.
    expect(SERVER_INSTRUCTIONS).toMatch(/zcodegraph index/);

    // §3: unavailable grammars — the agent should learn to consult
    // `zcodegraph_status` to see which languages lost their parser.
    expect(SERVER_INSTRUCTIONS).toMatch(/zcodegraph_status/);
  });
});

// ---------- helpers ----------

function isErrorResult(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}

function toolResultText(result: unknown): string {
  // MCP ToolResult shape: { content: Array<{ type: 'text'; text: string }> }
  const r = result as { content?: Array<{ type: string; text?: string }> };
  if (!r.content) return JSON.stringify(result);
  return r.content.map((c) => c.text ?? '').join('\n');
}

/**
 * Minimal CodeGraph stub satisfying only what `handleStatus` reads.
 * Real CodeGraph construction requires a valid `.zcodegraph/`; we avoid
 * that here because this suite is about the tool-result SHAPE, not the
 * indexing pipeline (covered elsewhere).
 */
function makeStatusStub() {
  return {
    getProjectRoot: () => os.tmpdir(),
    getStats: () => ({
      fileCount: 1,
      nodeCount: 1,
      edgeCount: 0,
      dbSizeBytes: 1024,
      nodesByKind: { file: 1 },
      filesByLanguage: { typescript: 1 },
    }),
    getIndexBuildInfo: () => ({ engine: null, engineVersion: null }),
    getJournalMode: () => 'wal',
    getPendingFiles: () => [],
  };
}
