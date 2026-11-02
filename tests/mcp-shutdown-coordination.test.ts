import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MCPEngine, setCodeGraphLoaderForTests } from '../src/mcp/engine';
import { ToolHandler } from '../src/mcp/tools';
import type CodeGraph from '../src/index';

describe('MCP shutdown coordination', () => {
  let projectRoot: string;

  afterEach(() => {
    setCodeGraphLoaderForTests(null);
    vi.restoreAllMocks();
    if (projectRoot) fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('stopAndWait waits for initialization and catch-up before closing the graph', async () => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-mcp-stop-'));
    fs.mkdirSync(path.join(projectRoot, '.zcodegraph'));
    fs.writeFileSync(path.join(projectRoot, '.zcodegraph', 'zcodegraph.db'), '');

    let releaseOpen!: () => void;
    let releaseSync!: () => void;
    const openGate = new Promise<void>((resolve) => { releaseOpen = resolve; });
    const syncGate = new Promise<void>((resolve) => { releaseSync = resolve; });
    const events: string[] = [];
    const cg = {
      resumePendingEmbeddings: vi.fn(),
      sync: vi.fn(async () => {
        events.push('sync-started');
        await syncGate;
        events.push('sync-finished');
        return {
          filesChecked: 0, filesAdded: 0, filesModified: 0, filesRemoved: 0,
          nodesUpdated: 0, durationMs: 0,
        };
      }),
      close: vi.fn(() => { events.push('closed'); }),
      closeAndWait: vi.fn(async () => { events.push('closed'); }),
    };
    setCodeGraphLoaderForTests(() => ({
      open: vi.fn(async () => {
        events.push('open-started');
        await openGate;
        events.push('open-finished');
        return cg;
      }),
      openSync: vi.fn(() => cg),
    }) as never);
    const engine = new MCPEngine({ watch: false });
    const initializing = engine.ensureInitialized(projectRoot);
    await vi.waitFor(() => expect(events).toContain('open-started'));

    let stopFinished = false;
    const stopping = engine.stopAndWait().then(() => { stopFinished = true; });
    releaseOpen();
    await vi.waitFor(() => expect(events).toContain('sync-started'));
    expect(stopFinished).toBe(false);
    expect(cg.closeAndWait).not.toHaveBeenCalled();

    releaseSync();
    await stopping;
    await initializing;

    expect(events).toEqual([
      'open-started', 'open-finished', 'sync-started', 'sync-finished', 'closed',
    ]);
    expect(cg.closeAndWait).toHaveBeenCalledOnce();
  });

  it('attempts every graph close before stopAndWait rejects', async () => {
    const calls: string[] = [];
    const failing = {
      closeAndWait: vi.fn(async () => {
        calls.push('failing');
        throw new Error('worker shutdown failed');
      }),
    } as unknown as CodeGraph;
    const survivor = {
      closeAndWait: vi.fn(async () => { calls.push('survivor'); }),
    } as unknown as CodeGraph;
    const handler = new ToolHandler(failing);
    const closing = handler.beginShutdown();

    await expect(handler.closeAll(survivor)).rejects.toThrow('worker shutdown failed');
    await closing;

    expect(calls.sort()).toEqual(['failing', 'survivor']);
    expect(failing.closeAndWait).toHaveBeenCalledOnce();
    expect(survivor.closeAndWait).toHaveBeenCalledOnce();
  });

  it('stopAndWait waits for an already-dispatched tool call before closing', async () => {
    let releaseSearch!: () => void;
    const searchGate = new Promise<void>((resolve) => { releaseSearch = resolve; });
    const events: string[] = [];
    const cg = {
      searchNodes: vi.fn(() => []),
      getPendingFiles: vi.fn(() => []),
      getProjectRoot: vi.fn(() => 'fixture'),
      closeAndWait: vi.fn(async () => { events.push('closed'); }),
    } as unknown as CodeGraph;
    const engine = new MCPEngine({ watch: false });
    const handler = engine.getToolHandler();
    handler.setDefaultCodeGraph(cg);
    handler.setCatchUpGate(searchGate.then(() => {
      events.push('tool-gate-finished');
    }));

    const executing = handler.execute('zcodegraph_search', { query: 'survivor' });
    await new Promise<void>(resolve => setImmediate(resolve));
    let stopFinished = false;
    const stopping = engine.stopAndWait().then(() => { stopFinished = true; });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(stopFinished).toBe(false);
    expect(cg.closeAndWait).not.toHaveBeenCalled();

    releaseSearch();
    await executing;
    await stopping;
    expect(events).toEqual(['tool-gate-finished', 'closed']);
    const rejected = await handler.execute('zcodegraph_search', { query: 'after-stop' });
    expect(rejected.isError).toBe(true);
    expect(rejected.content[0]?.text).toContain('MCP server is shutting down.');
  });
});
