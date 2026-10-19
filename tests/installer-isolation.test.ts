import { describe, expect, it } from 'vitest';
import { getMcpServerConfig, getCodeGraphPermissions } from '../src/installer/targets/shared';
import { getDaemonSocketPath, getDaemonPidPath } from '../src/mcp/daemon-paths';
import { claudeTarget } from '../src/installer/targets/claude';
import pkg from '../package.json';

/**
 * Issue #6: Audit daemon, watcher, index lock, and installer config isolation
 *
 * TDD vertical slices — one tracer bullet at a time.
 *
 * Slice 1 (tracer): generated installer config uses `zcodegraph` command.
 *   - Acceptance criterion: "Generated installer configs use `zcodegraph`."
 */
describe('Issue #6 — installer config uses zcodegraph', () => {
  it('getMcpServerConfig() returns command: "zcodegraph" (not "codegraph")', () => {
    const config = getMcpServerConfig();
    expect(config.command).toBe('zcodegraph');
    expect(config.args).toEqual(['serve', '--mcp']);
    expect(config.type).toBe('stdio');
  });

  /**
   * Slice 2 (tracer): permissions use zcodegraph_* tool names.
   * Acceptance criterion: "Generated installer configs use `zcodegraph`."
   * The permission strings combine the MCP server KEY (intentionally
   * kept as "codegraph") with the tool names ("zcodegraph_*").
   */
  it('getCodeGraphPermissions() uses mcp__zcodegraph__zcodegraph_* format', () => {
    const perms = getCodeGraphPermissions();
    expect(perms.length).toBeGreaterThan(0);
    for (const p of perms) {
      // KEY is "codegraph" (intentional internal identity from Issue #4)
      // Tool names are "zcodegraph_*" (new identity)
      expect(p).toMatch(/^mcp__zcodegraph__zcodegraph_/);
    }
  });

  /**
   * Slice 3 (tracer): daemon socket path is project-scoped.
   * Acceptance criterion: "Lock paths derive from the target project root"
   */
  it('getDaemonSocketPath() returns different paths for different project roots', () => {
    const pathA = getDaemonSocketPath('/project/A');
    const pathB = getDaemonSocketPath('/project/B');
    expect(pathA).not.toBe(pathB);
  });

  /**
   * Slice 4: daemon pid path is project-scoped.
   */
  it('getDaemonPidPath() returns project-scoped path', () => {
    const p = getDaemonPidPath('/my/project');
    expect(p).toContain('.zcodegraph');
    expect(p).toContain('daemon.pid');
  });

  /**
   * Slice 5 (tracer): generated config does NOT embed a stale
   * project-absolute path — the command is bare `zcodegraph`,
   * resolved from PATH at runtime.
   * Acceptance: "Global install does not embed stale project paths"
   */
  it('getMcpServerConfig() command is not an absolute path', () => {
    const config = getMcpServerConfig();
    // Should be bare executable name, NOT e.g. /home/user/project/node_modules/.bin/zcodegraph
    expect(config.command).not.toMatch(/^[a-zA-Z]:[\\\/]|^\//);
  });

  /**
   * Slice 6 (tracer): local install writes only to project-local
   * `.mcp.json`, never to the global `~/.claude.json`.
   * Acceptance: "Local install writes only to project-local config."
   */
  it('local install config path ends with .mcp.json (not .claude.json)', () => {
    const result = claudeTarget.detect('local');
    expect(result.configPath).toMatch(/[\\\/]\.mcp\.json$/);
    expect(result.configPath).not.toMatch(/[\\\/]\.claude\.json$/);
  });
});
