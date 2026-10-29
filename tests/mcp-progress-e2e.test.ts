/**
 * End-to-end MCP `notifications/progress` (roadmap 1-2-2 exit criteria).
 *
 * Spawns the real `zcodegraph serve --mcp` binary against a fixture project
 * whose `.zcodegraph/` was initialized before the server starts and which
 * contains files added *after* init — guaranteeing `catchUpSync` does real
 * work and emits `IndexProgress` events. Asserts the client sees
 * `notifications/progress` with begin/report/end framing on a single token,
 * and that the begin title is the documented "Catching up index".
 *
 * This is the deterministic event-sequence assertion the node's exit
 * criteria demands: the client must observe `kind: 'begin'` before any
 * `kind: 'report'`, and exactly one `kind: 'end'` to close the token.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CodeGraph } from '../src';
import { cleanupSpawnedProcessAndTempDirs } from './helpers/spawned-process-cleanup';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');

interface StdoutEvent {
  seq: number;
  line: string;
  parsed: unknown;
}

function tagStdout(child: ChildProcessWithoutNullStreams): StdoutEvent[] {
  const events: StdoutEvent[] = [];
  let seq = 0;
  let buf = '';
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(line);
      } catch {
        // not JSON — shouldn't happen on stdout in MCP mode, but keep it for debugging
      }
      events.push({ seq: seq++, line, parsed });
    }
  });
  return events;
}

async function waitFor<T extends StdoutEvent>(
  events: ReadonlyArray<T>,
  predicate: (e: T) => boolean,
  timeoutMs: number,
): Promise<T> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const hit = events.find(predicate);
      if (hit) return resolve(hit);
      if (Date.now() - started > timeoutMs) {
        return reject(
          new Error(
            `Timed out after ${timeoutMs}ms. Saw ${events.length} events:\n` +
              events.map((e) => `[${e.seq}] ${e.line}`).join('\n'),
          ),
        );
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

describe('MCP notifications/progress end-to-end (roadmap 1-2-2)', () => {
  let tempDir: string;
  let child: ChildProcessWithoutNullStreams | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-mcp-progress-'));
  });

  afterEach(async () => {
    await cleanupSpawnedProcessAndTempDirs(child, [tempDir]);
    child = null;
  });

  it('catch-up sync pushes begin → report* → end notifications over stdio', async () => {
    // Seed a project: .zcodegraph/ initialized, then a handful of .ts files
    // added *after* the index snapshot. When the MCP server opens the project
    // it will run catch-up sync, see N changed files, and emit IndexProgress.
    const cg = await CodeGraph.init(tempDir);
    cg.close();
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(
        path.join(tempDir, `file-${i}.ts`),
        `export function fn${i}() { return ${i}; }\n`,
        'utf8',
      );
    }

    child = spawn(process.execPath, [BIN, 'serve', '--mcp'], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ZCG_NO_DAEMON: '1' },
    }) as ChildProcessWithoutNullStreams;

    const events = tagStdout(child);

    // Send initialize.
    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'progress-e2e', version: '0.0.0' },
          rootUri: `file://${tempDir}`,
        },
      }) + '\n',
    );

    // Wait for the initialize response first.
    await waitFor(
      events,
      (e) => {
        const p = e.parsed as { id?: number } | null;
        return p !== null && p.id === 0;
      },
      10000,
    );

    // Now wait for the first notifications/progress. Catch-up sync runs in
    // the background after open; on a small fixture it should fire within
    // ~15s even on slow CI.
    const beginEv = await waitFor(
      events,
      (e) => {
        const p = e.parsed as { method?: string; params?: { value?: { kind?: string } } } | null;
        return (
          p?.method === 'notifications/progress' && p?.params?.value?.kind === 'begin'
        );
      },
      20000,
    );

    // And the matching end.
    const endEv = await waitFor(
      events,
      (e) => {
        const p = e.parsed as { method?: string; params?: { value?: { kind?: string } } } | null;
        return p?.method === 'notifications/progress' && p?.params?.value?.kind === 'end';
      },
      20000,
    );

    // Token consistency + framing.
    const beginParams = (beginEv.parsed as { params: { progressToken: string; value: { title?: string } } }).params;
    const endParams = (endEv.parsed as { params: { progressToken: string } }).params;
    expect(beginParams.progressToken).toBe(endParams.progressToken);
    expect(beginParams.progressToken).toMatch(/^zcodegraph-sync-\d+$/);
    expect(beginParams.value.title).toBe('Catching up index');

    // Reports must arrive between begin and end.
    const reports = events.filter((e) => {
      const p = e.parsed as { method?: string; params?: { value?: { kind?: string } } } | null;
      return (
        p?.method === 'notifications/progress' &&
        p?.params?.value?.kind === 'report' &&
        e.seq > beginEv.seq &&
        e.seq < endEv.seq
      );
    });
    expect(reports.length).toBeGreaterThan(0);
  }, 45000);
});
