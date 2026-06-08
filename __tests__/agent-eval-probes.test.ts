import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AGENT_EVAL = resolve('scripts/agent-eval');

function readProbe(name: string): string {
  return readFileSync(resolve(AGENT_EVAL, `${name}.mjs`), 'utf8');
}

/**
 * Issue #7: Make agent-eval probes explicit-project and ZCodeGraph-aware
 *
 * TDD vertical slices.
 *
 * Slice 1 (tracer): probe-explore.mjs calls h.execute('zcodegraph_explore')
 *   - Acceptance: "All agent-eval probes use `zcodegraph_*` tool names."
 */
describe('Issue #7 — agent-eval probes use zcodegraph_* tools', () => {
  it('probe-explore.mjs calls h.execute() with "zcodegraph_explore"', () => {
    const src = readProbe('probe-explore');
    // The actual MCP tool call must use the NEW name
    expect(src).toMatch(/h\.execute\(\s*['"]zcodegraph_explore['"]/);
  });

  /**
   * Slice 2 (tracer): probes pass explicit projectPath to h.execute()
   * when they have a repo argument.
   * Acceptance: "Probes that execute MCP tools pass explicit
   *   projectPath where supported."
   */
  it('probe-explore.mjs passes projectPath to h.execute()', () => {
    const src = readProbe('probe-explore');
    // Should pass { query: ..., projectPath: repo }
    expect(src).toMatch(/h\.execute\([^)]*projectPath/);
  });

  /**
   * Slice 3 (tracer): probe-trace.mjs also passes projectPath.
   */
  it('probe-trace.mjs passes projectPath to h.execute()', () => {
    const src = readProbe('probe-trace');
    expect(src).toMatch(/h\.execute\([^)]*projectPath/);
  });

  /**
   * Slice 4 (tracer): probe-sweep.mjs also passes projectPath.
   */
  it('probe-sweep.mjs passes projectPath to handler.execute()', () => {
    const src = readProbe('probe-sweep');
    expect(src).toMatch(/handler\.execute\([^)]*projectPath/);
  });
});
