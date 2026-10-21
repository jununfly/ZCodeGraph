/**
 * MCP tool-surface cap (DES-schema-evolution-and-mcp-tool-cap-v1, Clause 2).
 *
 * The MCP tool surface exposed by `src/mcp/tools.ts` `tools[]` MUST stay
 * <= 12 entries at all times. New analytical capability defaults to folding
 * into `explore` / `status` or becoming a CLI subcommand; adding a new MCP
 * tool is the last resort and requires empirical evidence.
 *
 * This guardrail exists because new MCP tools are very rarely adopted by
 * agents (see AGENTS.md P-5; `zcodegraph_trace` / `zcodegraph_context` were
 * retired for this reason).
 */
import { describe, it, expect } from 'vitest';
import { tools } from '../src/mcp/tools';

describe('MCP tool-surface cap (DES-schema-evolution-and-mcp-tool-cap-v1)', () => {
  it('exposes at most 12 MCP tools', () => {
    expect(tools.length).toBeLessThanOrEqual(12);
  });

  it('exposes the current 8-tool surface as the baseline', () => {
    // Snapshot of the v1 baseline. Growing this list is allowed (cap=12)
    // but should be a deliberate, evidenced decision — see Clause 2 of the
    // contract. If you landed here because you added a tool, update this
    // snapshot AND the contract's "As of this contract the count is N".
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual([
      'zcodegraph_callees',
      'zcodegraph_callers',
      'zcodegraph_explore',
      'zcodegraph_files',
      'zcodegraph_impact',
      'zcodegraph_node',
      'zcodegraph_search',
      'zcodegraph_status',
    ]);
  });

  it('does not expose the retired trace/context tools', () => {
    const names = tools.map(t => t.name);
    expect(names).not.toContain('zcodegraph_trace');
    expect(names).not.toContain('zcodegraph_context');
  });
});
