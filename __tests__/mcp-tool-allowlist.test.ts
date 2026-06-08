/**
 * CODEGRAPH_MCP_TOOLS allowlist — lets an operator (or an A/B harness) trim the
 * exposed MCP tool surface without touching the client config. Inert when unset.
 * Filtering happens in ListTools (getTools) and is enforced again on execute().
 */
import { describe, it, expect, afterEach } from 'vitest';
import { ToolHandler } from '../src/mcp/tools';

const ENV = 'CODEGRAPH_MCP_TOOLS';

describe('CODEGRAPH_MCP_TOOLS allowlist', () => {
  const original = process.env[ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[ENV];
    else process.env[ENV] = original;
  });

  const listed = () => new ToolHandler(null).getTools().map(t => t.name).sort();

  it('exposes the renamed ZCodeGraph tool surface when unset', () => {
    delete process.env[ENV];
    const all = listed();
    expect(all).toContain('zcodegraph_explore');
    expect(all).not.toContain('codegraph_explore');
    expect(all).not.toContain('zcodegraph_context');
    expect(all).not.toContain('zcodegraph_trace');
    expect(all.length).toBeGreaterThanOrEqual(8);
  });

  it('filters ListTools to the allowlisted short names', () => {
    process.env[ENV] = 'explore,search,node';
    expect(listed()).toEqual(['zcodegraph_explore', 'zcodegraph_node', 'zcodegraph_search']);
  });

  it('accepts fully-qualified zcodegraph_ names and ignores whitespace', () => {
    process.env[ENV] = ' zcodegraph_explore , search ';
    expect(listed()).toEqual(['zcodegraph_explore', 'zcodegraph_search']);
  });

  it('treats an empty/whitespace value as unset (full surface)', () => {
    process.env[ENV] = '   ';
    expect(listed().length).toBeGreaterThanOrEqual(8);
  });

  it('rejects a disabled tool on execute (defense in depth)', async () => {
    process.env[ENV] = 'node';
    const res = await new ToolHandler(null).execute('zcodegraph_explore', {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/disabled via CODEGRAPH_MCP_TOOLS/);
  });

  it('does not keep old codegraph_* names as compatibility aliases', async () => {
    delete process.env[ENV];
    const res = await new ToolHandler(null).execute('codegraph_explore', { query: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Unknown tool: codegraph_explore');
  });

  it('lets an allowlisted tool past the guard', async () => {
    process.env[ENV] = 'search';
    // No CodeGraph attached, so it fails *after* the allowlist guard — the
    // "disabled" message must NOT appear, proving the guard passed it through.
    const res = await new ToolHandler(null).execute('zcodegraph_search', { query: 'x' });
    expect(res.content[0].text).not.toMatch(/disabled via CODEGRAPH_MCP_TOOLS/);
  });
});
