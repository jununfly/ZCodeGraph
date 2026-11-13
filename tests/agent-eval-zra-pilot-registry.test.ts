import { describe, expect, it } from 'vitest';

const ids = [
  'flask-session-response-trace-v1',
  'django-csrf-view-trace-v1',
  'express-mounted-prototypes-trace-v1',
  'gin-not-found-middleware-trace-v1',
  'spring-pet-update-persistence-trace-v1',
];

describe('ZRA pilot prompt registry', () => {
  it('exposes five Human-reviewed, source-anchored, commit-pinned prompts', async () => {
    const registry = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    expect(registry.listPromptIds()).toEqual(expect.arrayContaining(ids));
    for (const id of ids) {
      const task = registry.getPrompt(id);
      expect(task.PROMPT_ID).toBe(id);
      expect(task.COMMIT).toMatch(/^[0-9a-f]{40}$/);
      expect(task.PROMPT.startsWith(task.SHARED_PREFIX)).toBe(true);
      expect(task.RUBRIC.length).toBeGreaterThanOrEqual(4);
      expect(task.NEGATIVE_CONSTRAINTS.length).toBeGreaterThanOrEqual(2);
      expect(task.SOURCE_ANCHORS.requiredFiles.length).toBeGreaterThanOrEqual(2);
      expect(task.SOURCE_ANCHORS.symbols.length).toBeGreaterThanOrEqual(4);
      for (const symbol of task.SOURCE_ANCHORS.symbols) {
        expect(symbol).toMatchObject({ query: expect.any(String), name: expect.any(String), file: expect.any(String) });
      }
      expect(task.TASK_SET_REVIEW).toEqual({ reviewer: 'victo', verdict: 'accept', reviewedAt: '2026-11-12' });
      expect(task.FRESHNESS.reusedV3Text).toBe(false);
      expect(task.PROMPT).not.toContain('use mcp__codegraph__zcodegraph_explore');
      expect(task.PROMPT).not.toContain('First, use');
    }
  });

  it('versions non-mandatory Flask guidance and resolves the CLI default through the registry', async () => {
    const registry = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    const original = registry.getPrompt('flask-ipv6-structure-trace-v1-candidate');
    const calibrated = registry.getPrompt('flask-ipv6-structure-trace-v2-candidate');
    const weakGuidance = 'CodeGraph MCP tools are available for structural code questions in this read-only checkout; use them when they help. Investigate without editing files, running tests, or starting a server. Give a concise technical explanation with exact file paths and symbol names.';
    expect(calibrated.PROMPT).toBe(`${weakGuidance} ${original.PROMPT}`);
    expect(calibrated.COMMIT).toBe(original.COMMIT);
    expect(calibrated.PROMPT).toContain('use them when they help');
    expect(calibrated.PROMPT).not.toContain('use mcp__codegraph__zcodegraph_explore');
    expect(calibrated.PROMPT).not.toContain('First, use');
    expect(original.PROMPT).not.toContain('CodeGraph MCP tools are available');
    expect(registry.pilotTasks.map((task: { PROMPT: string }) => task.PROMPT))
      .toEqual((await import('../scripts/agent-eval/task-prompts/zra-pilot-v1.mjs'))
        .pilotTasks.map((task: { PROMPT: string }) => task.PROMPT));

    const cli = await import('../scripts/agent-eval/run-flask-baseline.mjs');
    await expect(cli.resolvePrompt()).resolves.toEqual({
      promptId: original.PROMPT_ID,
      prompt: original.PROMPT,
      commit: original.COMMIT,
    });
    await expect(cli.resolvePrompt(calibrated.PROMPT_ID)).resolves.toEqual({
      promptId: calibrated.PROMPT_ID,
      prompt: calibrated.PROMPT,
      commit: calibrated.COMMIT,
    });
  });

  it('keeps index coverage separate from planning coverage', async () => {
    const { inspectTaskCoverage } = await import('../scripts/agent-eval/check-pilot-coverage.mjs');
    const { getPrompt } = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    const task = getPrompt(ids[0]);
    const node = { name: '_get_session', filePath: task.SOURCE_ANCHORS.requiredFiles[0] };
    const cg = {
      getStats: () => ({ fileCount: 3, nodeCount: 1, edgeCount: 0 }),
      searchNodes: (query: string) => {
        const anchor = task.SOURCE_ANCHORS.symbols.find((candidate: { query: string }) => candidate.query === query);
        return [{ node: { name: anchor.name, filePath: anchor.file } }];
      },
      getNodesInFile: () => [node],
    };
    const result = inspectTaskCoverage(cg, { sortedFiles: [] }, task);
    expect(result.requiredFiles.every((entry: { indexed: boolean }) => entry.indexed)).toBe(true);
    expect(result.symbols.every((entry: { found: boolean }) => entry.found)).toBe(true);
    expect(result.indexCoverage).toBe('pass');
    expect(result.planCoverage).toBe('incomplete');
    expect(result.status).toBe('incomplete');
  });

  it('does not confuse the old unpinned guided Django diagnostic with the pilot task', async () => {
    const { getPrompt } = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    expect(getPrompt('django-middleware-chain-trace-v1-guided').COMMIT).toBe('main');
    expect(getPrompt('django-csrf-view-trace-v1').COMMIT).toBe('2fff3e9f493a9c85fb8a2294358c6751575ee4bf');
  });
});
