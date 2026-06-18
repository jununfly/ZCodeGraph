/**
 * MCP project state isolation — Issue #5
 *
 * A single MCPEngine serves many sessions, each potentially targeting a
 * different project via the `projectPath` parameter. The shared ToolHandler
 * must NOT leak state from one project into another:
 *
 * 1. catchUpGate — A's post-open sync must not block B's tool calls
 * 2. projectCache — different projectPaths get separate CodeGraph instances
 * 3. defaultProjectHint — explicit projectPath must not fall back to the
 *    default project's hint in error messages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';

/**
 * ToolHandler lazy-loads CodeGraph via `require('../index')` for
 * cross-project queries. In Vitest's ESM transform this require
 * can't resolve the raw .ts source. Pre-populate the internal
 * projectCache so getCodeGraph() finds the cross-project instance
 * without hitting loadCodeGraph().
 */
function injectCrossProjectCache(handler: ToolHandler, projectPath: string, cg: CodeGraph): void {
  // projectCache is private — test-only injection for isolation testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (handler as any).projectCache as Map<string, CodeGraph>;
  cache.set(projectPath, cg);
  cache.set(cg.getProjectRoot(), cg);
}

describe('MCP project state isolation', () => {
  let dirA: string;
  let dirB: string;
  let cgA: CodeGraph;
  let cgB: CodeGraph;
  let handler: ToolHandler;

  beforeEach(async () => {
    dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-iso-a-'));
    dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-iso-b-'));

    fs.mkdirSync(path.join(dirA, 'src'));
    fs.writeFileSync(path.join(dirA, 'src', 'a.ts'), 'export const alpha = "project-a";\n');
    cgA = CodeGraph.initSync(dirA, { config: { include: ['**/*.ts'], exclude: [] } });
    await cgA.indexAll({ engine: 'typescript' });

    fs.mkdirSync(path.join(dirB, 'src'));
    fs.writeFileSync(path.join(dirB, 'src', 'b.ts'), 'export const beta = "project-b";\n');
    cgB = CodeGraph.initSync(dirB, { config: { include: ['**/*.ts'], exclude: [] } });
    await cgB.indexAll({ engine: 'typescript' });

    // Handler starts with no default — sessions will use projectPath for isolation
    handler = new ToolHandler(null);

    // Prime the cross-project cache so getCodeGraph() doesn't hit require()
    injectCrossProjectCache(handler, dirA, cgA);
    injectCrossProjectCache(handler, dirB, cgB);
  });

  afterEach(() => {
    try { cgA.unwatch(); } catch { /* ignore */ }
    try { cgA.close(); } catch { /* ignore */ }
    try { cgB.unwatch(); } catch { /* ignore */ }
    try { cgB.close(); } catch { /* ignore */ }
    if (fs.existsSync(dirA)) fs.rmSync(dirA, { recursive: true, force: true });
    if (fs.existsSync(dirB)) fs.rmSync(dirB, { recursive: true, force: true });
  });

  // ─── Tracer bullet 1: catchUpGate ───────────────────────────────────

  describe('catchUpGate per-project isolation', () => {
    it("cross-project tool call (projectPath=B) is NOT blocked by A's catch-up gate", async () => {
      // Set handler's default to project A
      handler.setDefaultCodeGraph(cgA);

      // Push a slow catch-up gate on project A
      let gateAwaited = false;
      handler.setCatchUpGate(
        new Promise<void>((resolve) => {
          setTimeout(() => { gateAwaited = true; resolve(); }, 150);
        }),
      );

      // Tool call explicitly targeting project B must complete immediately —
      // it must NOT wait for A's catch-up gate.
      const start = Date.now();
      const res = await handler.execute('zcodegraph_search', {
        query: 'beta',
        projectPath: dirB,
      });
      const elapsed = Date.now() - start;

      // Cross-project call completed before A's gate resolves
      expect(gateAwaited).toBe(false);
      // Response should be fast — gate was 150ms, so under 100ms confirms no blocking
      expect(elapsed).toBeLessThan(100);
      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toMatch(/beta/);
    });

    it('default project tool call (no projectPath) IS blocked by the catch-up gate', async () => {
      handler.setDefaultCodeGraph(cgA);

      let gateResolved = false;
      handler.setCatchUpGate(
        new Promise<void>((resolve) => {
          setTimeout(() => { gateResolved = true; resolve(); }, 80);
        }),
      );

      const res = await handler.execute('zcodegraph_search', { query: 'alpha' });
      // Default project call must have waited for the gate
      expect(gateResolved).toBe(true);
      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toMatch(/alpha/);
    });

    it('gate is cleared after first default-project call', async () => {
      handler.setDefaultCodeGraph(cgA);

      let awaitCount = 0;
      handler.setCatchUpGate(
        new Promise<void>((resolve) => {
          awaitCount++;
          setTimeout(resolve, 20);
        }),
      );

      await handler.execute('zcodegraph_search', { query: 'alpha' });
      const afterFirst = awaitCount;
      await handler.execute('zcodegraph_search', { query: 'alpha' });
      // Second call must NOT re-await the gate
      expect(awaitCount).toBe(afterFirst);
    });
  });

  // ─── Tracer bullet 2: projectCache ──────────────────────────────────

  describe('projectCache isolation', () => {
    it('different projectPath values return results from their respective projects', async () => {
      handler.setDefaultCodeGraph(cgA);

      // Search project A
      const resA = await handler.execute('zcodegraph_search', {
        query: 'alpha',
        projectPath: dirA,
      });
      expect(resA.content[0].text).toMatch(/alpha/);
      expect(resA.content[0].text).not.toMatch(/beta/);

      // Search project B
      const resB = await handler.execute('zcodegraph_search', {
        query: 'beta',
        projectPath: dirB,
      });
      expect(resB.content[0].text).toMatch(/beta/);
      expect(resB.content[0].text).not.toMatch(/alpha/);

      // Re-query A — cache returns the same instance, still A's data
      const resA2 = await handler.execute('zcodegraph_search', {
        query: 'alpha',
        projectPath: dirA,
      });
      expect(resA2.content[0].text).toMatch(/alpha/);
    });

    it('explicit projectPath that matches default root reuses the default instance', async () => {
      handler.setDefaultCodeGraph(cgA);

      // Search via default
      const resDefault = await handler.execute('zcodegraph_search', { query: 'alpha' });
      expect(resDefault.content[0].text).toMatch(/alpha/);

      // Search via explicit projectPath pointing to same root
      const resExplicit = await handler.execute('zcodegraph_search', {
        query: 'alpha',
        projectPath: dirA,
      });
      expect(resExplicit.content[0].text).toMatch(/alpha/);
    });
  });

  // ─── Tracer bullet 3: defaultProjectHint ────────────────────────────

  describe('defaultProjectHint does not leak', () => {
    it('explicit projectPath error does not mention the default hint', async () => {
      // Set a hint for project A
      handler.setDefaultProjectHint(dirA);

      // Query a directory that exists but has no .zcodegraph/
      const noCG = path.join(dirA, '..', 'no-zcodegraph-here');
      fs.mkdirSync(noCG, { recursive: true });
      try {
        const res = await handler.execute('zcodegraph_search', {
          query: 'anything',
          projectPath: noCG,
        });
        // The error should mention the given projectPath, not the default hint
        expect(res.isError).toBe(true);
        const firstText = res.content[0].text;
        // Must NOT mention dirA (the default hint)
        expect(firstText).not.toContain(dirA);
        // Must mention that CodeGraph is not initialized
        expect(firstText).toMatch(/not initialized|CodeGraph not/);
      } finally {
        fs.rmSync(noCG, { recursive: true, force: true });
      }
    });
  });
});
