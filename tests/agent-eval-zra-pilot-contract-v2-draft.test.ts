import { describe, expect, it } from 'vitest';

describe('ZRA pilot contract v2 content review', () => {
  it('keeps v1 frozen and keeps every v2 task outside the executable registry', async () => {
    const registry = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    const { pilotTasks } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v1.mjs');
    const { pilotTasksV2Draft } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs');

    expect(pilotTasksV2Draft).toHaveLength(5);
    expect(pilotTasks.map((task) => task.PROMPT_ID)).toEqual([
      'flask-session-response-trace-v1',
      'django-csrf-view-trace-v1',
      'express-mounted-prototypes-trace-v1',
      'gin-not-found-middleware-trace-v1',
      'spring-pet-update-persistence-trace-v1',
    ]);
    expect(pilotTasks.every((task) => task.TASK_SET_REVIEW.verdict === 'accept')).toBe(true);
    for (const task of pilotTasksV2Draft) {
      expect(task.TASK_SET_REVIEW).toMatchObject({
        reviewer: 'victo', verdict: 'accept',
        reviewedAt: task.PROMPT_ID.startsWith('flask-') ? '2026-11-18' : '2026-11-17',
      });
      expect(task.CONTRACT_STATUS).toBe('content-reviewed-not-registered');
      expect(task.COMMIT).toMatch(/^[0-9a-f]{40}$/);
      expect(task.RUBRIC.length).toBeGreaterThanOrEqual(5);
      expect(task.NEGATIVE_CONSTRAINTS.length).toBeGreaterThanOrEqual(2);
      expect(registry.listPromptIds()).not.toContain(task.PROMPT_ID);
      expect(() => registry.getPrompt(task.PROMPT_ID)).toThrow('unknown prompt ID');
    }
  });

  it('uses the concrete Flask AppContext methods accepted by Human re-review', async () => {
    const { flaskV2 } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs');
    expect(flaskV2.PROMPT).toContain('combined AppContext with request information is pushed');
    expect(flaskV2.PROMPT).toContain('cached by its session accessor');
    expect(flaskV2.RUBRIC[0]).toContain('AppContext.push calls _get_session');
    expect(flaskV2.RUBRIC[0]).toContain('before request matching');
    expect(flaskV2.RUBRIC[1]).toContain('AppContext.session delegates to _get_session');
    expect(flaskV2.RUBRIC[1]).toContain('marks the returned session accessed');
    expect(flaskV2.NEGATIVE_CONSTRAINTS.join(' ')).toContain('Do not name RequestContext.push');
    expect(flaskV2.SOURCE_ANCHORS.symbols.map((symbol) => symbol.name)).toEqual(expect.arrayContaining([
      'AppContext.push', 'AppContext.session', 'AppContext._get_session',
    ]));
    expect(flaskV2.SOURCE_ANCHORS.symbols.map((symbol) => symbol.name)).not.toContain('RequestContext.push');
    expect(flaskV2.TASK_SET_REVIEW).toMatchObject({
      reviewer: 'victo', verdict: 'accept', reviewedAt: '2026-11-18',
    });
    expect(flaskV2.CONTRACT_STATUS).toBe('content-reviewed-not-registered');
  });

  it('keeps the legacy B audit a separate historical record after Flask acceptance', async () => {
    const { auditSourceTraceV2 } = await import('../scripts/agent-eval/audit-source-trace-v2.mjs');
    const { readFileSync } = await import('node:fs');
    expect(auditSourceTraceV2).toBeTypeOf('function');
    const auditSource = readFileSync(new URL('../scripts/agent-eval/audit-source-trace-v2.mjs', import.meta.url), 'utf8');
    expect(auditSource).toContain("schema: 'zra-source-trace-v2-preparation-audit-v1'");
    expect(auditSource).toContain("executionRegistration: 'not-registered'");
    const disposition = JSON.parse(readFileSync(new URL('../.workbuddy/agent-eval/2026-11-17-zra-source-trace-v2-bounded-candidate/b-to-c-disposition.json', import.meta.url), 'utf8'));
    expect(disposition.disposition).toBe('stop-candidate-retain-offline-diagnostics');
    expect(disposition.candidate.auditCount).toBe(1);
  });

  it('uses the actual Express getter name and preserves external-router boundaries', async () => {
    const { express } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs');
    expect(express.PROMPT).toContain('lazy router property getter');
    expect(express.RUBRIC.join(' ')).toContain('getter named getrouter');
    expect(express.SOURCE_ANCHORS.symbols.map((symbol) => symbol.name)).toContain('getrouter');
    expect(JSON.stringify({
      prompt: express.PROMPT,
      rubric: express.RUBRIC,
      anchors: express.SOURCE_ANCHORS,
    })).not.toContain('lazyrouter');
    expect(express.NEGATIVE_CONSTRAINTS.join(' ')).toContain('Do not name a lazyrouter function');
    expect(express.NEGATIVE_CONSTRAINTS.join(' ')).toContain('external-router behavior');
  });

  it('carries forward the three source-consistent tasks under the new Human-reviewed identity', async () => {
    const v1 = await import('../scripts/agent-eval/task-prompts/zra-pilot-v1.mjs');
    const { djangoV2, ginV2, springV2 } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs');
    for (const [before, after] of [[v1.django, djangoV2], [v1.gin, ginV2], [v1.spring, springV2]] as const) {
      for (const field of ['CORPUS', 'COMMIT', 'SHARED_PREFIX', 'PROMPT', 'RUBRIC', 'NEGATIVE_CONSTRAINTS', 'SOURCE_ANCHORS'] as const) {
        expect(after[field]).toEqual(before[field]);
      }
      expect(after.TASK_SET_REVIEW).toMatchObject({
        reviewer: 'victo', verdict: 'accept', reviewedAt: '2026-11-17',
      });
    }
  });
});
