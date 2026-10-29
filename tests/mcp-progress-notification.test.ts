/**
 * MCP `notifications/progress` for engine-driven catch-up sync (roadmap 1-2-2).
 *
 * The `IndexProgress` pipeline (scanning → parsing → storing → resolving) is
 * already wired end-to-end for the CLI: `CodeGraph.indexAll/sync` accepts an
 * `onProgress` callback, TS engine emits per-file events, rust-hybrid engine
 * forwards Rust-core messages, and the CLI renders them via shimmer.
 *
 * The gap this node closes is the MCP side: when the server's catch-up sync
 * runs after project open, agents had no signal — they just saw a stall
 * followed by `Caught up N file(s)` on stderr. This suite pins the contract
 * that:
 *
 *   1. Sessions register their transport as the engine's progress sink on
 *      `initialize`, and deregister on `stop`.
 *   2. `engine.catchUpSync` translates `IndexProgress` events into MCP
 *      `notifications/progress` with begin/report/end semantics on a single
 *      `progressToken` per sync.
 *   3. If no progress events fire (e.g. empty sync), no begin/end is sent —
 *      we don't spam the agent for a no-op.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MCPEngine } from '../src/mcp/engine';
import * as engineModule from '../src/mcp/engine';
import { MCPSession } from '../src/mcp/session';
import type { JsonRpcTransport, JsonRpcRequest, JsonRpcNotification } from '../src/mcp/transport';
import type { IndexProgress } from '../src/extraction';

/**
 * Minimal transport stub — only `notify` is interesting for this suite;
 * everything else is a no-op.
 */
class StubTransport implements JsonRpcTransport {
  notifications: Array<{ method: string; params?: unknown }> = [];
  private handler: ((m: JsonRpcRequest | JsonRpcNotification) => Promise<void>) | null = null;

  start(handler: (m: JsonRpcRequest | JsonRpcNotification) => Promise<void>): void {
    this.handler = handler;
  }
  stop(): void { /* no-op */ }
  send(): void { /* no-op */ }
  sendResult(): void { /* no-op */ }
  sendError(): void { /* no-op */ }
  request(): Promise<unknown> {
    return Promise.reject(new Error('not implemented in stub'));
  }
  notify(method: string, params?: unknown): void {
    this.notifications.push({ method, params });
  }
  async dispatch(m: JsonRpcRequest | JsonRpcNotification): Promise<void> {
    if (this.handler) await this.handler(m);
  }
}

/**
 * Drive `engine.catchUpSync` against a stubbed CodeGraph whose `sync()` emits
 * the given IndexProgress events via `options.onProgress`, then resolves with
 * a no-change result. Lets us assert the notification sequence without a real
 * sqlite tree underneath.
 */
function installSyncStub(
  engine: MCPEngine,
  events: IndexProgress[],
): void {
  const fakeSync = vi.fn(async (options?: { onProgress?: (p: IndexProgress) => void }) => {
    for (const evt of events) {
      options?.onProgress?.(evt);
    }
    return {
      filesChecked: events.length,
      filesAdded: 0,
      filesModified: 0,
      filesRemoved: 0,
      nodesUpdated: 0,
      durationMs: 0,
    };
  });

  // Catch-up sync is invoked from `doInitialize`, but we don't want to walk
  // the real `.zcodegraph/` discovery here. Instead we poke the two pieces
  // it needs (`cg` and the gate) directly and call the private method.
  (engine as unknown as { cg: unknown }).cg = { sync: fakeSync };
  (engine as unknown as { toolHandler: { setCatchUpGate(p: Promise<unknown>): void } })
    .toolHandler.setCatchUpGate = () => { /* swallow */ };

  (engine as unknown as { catchUpSync(): void }).catchUpSync();
}

describe('MCP startup embedding recovery', () => {
  it.each([
    ['async initialization', 'doInitialize'],
    ['synchronous retry initialization', 'retryInitializeSync'],
  ])('%s resumes persisted embedding work after opening CodeGraph', async (_name, method) => {
    const engine = new MCPEngine({ watch: false });
    const resumePendingEmbeddings = vi.fn(() => true);
    const fakeCg = {
      resumePendingEmbeddings,
      close: vi.fn(),
      sync: vi.fn(async () => ({
        filesChecked: 0, filesAdded: 0, filesModified: 0, filesRemoved: 0,
        nodesUpdated: 0, durationMs: 0,
      })),
    };
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-resume-'));
    try {
      fs.mkdirSync(path.join(projectPath, '.zcodegraph'));
      fs.writeFileSync(path.join(projectPath, '.zcodegraph', 'zcodegraph.db'), '');
      // Keep the CommonJS production loader lazy while substituting the
      // project-open boundary, rather than duplicating engine internals.
      engineModule.setCodeGraphLoaderForTests(() => ({
        open: async () => fakeCg,
        openSync: () => fakeCg,
      }) as never);
      try {
        if (method === 'doInitialize') {
          await engine.ensureInitialized(projectPath);
        } else {
          engine.retryInitializeSync(projectPath);
        }
        expect(resumePendingEmbeddings).toHaveBeenCalledOnce();
      } finally {
        engineModule.setCodeGraphLoaderForTests(null);
        engine.stop();
      }
    } finally {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  });
});

describe('MCP progress notifications for catch-up sync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-progress-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort on Windows
    }
  });

  it('session registers its transport as the engine progress sink on initialize', async () => {
    const engine = new MCPEngine({ watch: false });
    const transport = new StubTransport();
    const session = new MCPSession(transport, engine, { explicitProjectPath: tmpDir });
    session.start();

    // Before initialize: no sink.
    expect(engine.getProgressSink()).toBeNull();

    // Drive handleInitialize via the public handleMessage path.
    const initReq: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '0.0.0' },
      },
    };
    await transport.dispatch(initReq);

    const sink = engine.getProgressSink();
    expect(sink).not.toBeNull();

    // Fire a notification through the sink and confirm the transport saw it.
    sink?.('notifications/progress', { progressToken: 't', value: { kind: 'begin', title: 'x' } });
    expect(transport.notifications).toHaveLength(1);
    expect(transport.notifications[0]?.method).toBe('notifications/progress');
    const params = transport.notifications[0]?.params as { progressToken: string; value: { kind: string } };
    expect(params.progressToken).toBe('t');
    expect(params.value.kind).toBe('begin');
  });

  it('catchUpSync emits begin → report* → end on a single progressToken', async () => {
    const engine = new MCPEngine({ watch: false });
    const transport = new StubTransport();
    const session = new MCPSession(transport, engine, { explicitProjectPath: tmpDir });
    session.start();

    await transport.dispatch({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {} },
    } as JsonRpcRequest);

    const events: IndexProgress[] = [
      { phase: 'scanning', current: 0, total: 0 },
      { phase: 'parsing', current: 0, total: 3 },
      { phase: 'parsing', current: 1, total: 3, currentFile: 'a.ts' },
      { phase: 'parsing', current: 2, total: 3, currentFile: 'b.ts' },
      { phase: 'parsing', current: 3, total: 3 },
      { phase: 'resolving', current: 0, total: 1 },
      { phase: 'resolving', current: 1, total: 1 },
    ];
    installSyncStub(engine, events);

    // Allow the sync promise chain to drain.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    const notes = transport.notifications.filter((n) => n.method === 'notifications/progress');
    expect(notes.length).toBe(events.length + 1); // begin (first event) + reports + end

    // All notifications share one progressToken.
    const tokens = new Set(
      notes.map((n) => (n.params as { progressToken: string }).progressToken),
    );
    expect(tokens.size).toBe(1);
    const token = [...tokens][0]!;
    expect(token).toMatch(/^zcodegraph-sync-\d+$/);

    // First notification opens with kind: 'begin'.
    const first = notes[0]!.params as { value: { kind: string; title?: string; message?: string } };
    expect(first.value.kind).toBe('begin');
    expect(first.value.title).toBe('Catching up index');
    expect(first.value.message).toContain('scanning');

    // Middle notifications are reports in the order events were emitted.
    const reports = notes.slice(1, -1).map((n) => (n.params as { value: { kind: string; message?: string } }).value);
    expect(reports).toHaveLength(events.length - 1);
    for (const report of reports) {
      expect(report.kind).toBe('report');
    }
    // Phase ordering is preserved from the IndexProgress stream.
    expect(reports[0]?.message).toContain('parsing');
    expect(reports[reports.length - 1]?.message).toContain('resolving');

    // Final notification closes with kind: 'end'.
    const last = notes[notes.length - 1]!.params as { value: { kind: string; message?: string } };
    expect(last.value.kind).toBe('end');
    expect(last.value.message).toBe('Index already up to date');
  });

  it('no progress events → no begin/end spam', async () => {
    const engine = new MCPEngine({ watch: false });
    const transport = new StubTransport();
    const session = new MCPSession(transport, engine, { explicitProjectPath: tmpDir });
    session.start();

    await transport.dispatch({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {} },
    } as JsonRpcRequest);

    installSyncStub(engine, []); // zero IndexProgress events

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    const notes = transport.notifications.filter((n) => n.method === 'notifications/progress');
    expect(notes).toHaveLength(0);
  });

  it('session stop deregisters the sink so the engine does not hold a stale transport', async () => {
    const engine = new MCPEngine({ watch: false });
    const transport = new StubTransport();
    const session = new MCPSession(transport, engine, { explicitProjectPath: tmpDir });
    session.start();

    await transport.dispatch({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {} },
    } as JsonRpcRequest);

    expect(engine.getProgressSink()).not.toBeNull();
    session.stop();
    expect(engine.getProgressSink()).toBeNull();
  });
});
