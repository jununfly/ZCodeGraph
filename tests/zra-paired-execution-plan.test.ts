import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { preparePairedExecutionPlan } from '../src/eval/zra-paired-runtime';
import { armOrderSchedule } from '../src/eval/zra-paired-design';
import type { SharedRunConfig } from '../src/eval/zra-paired-core';

const subset = [
  ['A', 'S', 'C'], ['C', 'A', 'S'], ['S', 'A', 'C'], ['S', 'C', 'A'],
] as const;
const configs: SharedRunConfig[] = ['flask', 'django', 'express', 'gin', 'spring'].map((taskId) => ({
  taskId,
  modelVersion: 'glm-5.3-flash',
  prompt: `prompt-${taskId}`,
  toolSchema: 'Read,Grep,Glob,mcp__codegraph__*',
  indexSnapshot: `commit-${taskId}`,
  mcpToolSurface: 'eight-tools-v1',
  responseSchema: 'concise-source-cited-v1',
}));
const blockedReadiness = {
  taskSetReviewed: true,
  taskFreshnessReviewer: 'victo',
  primaryRunReviewer: 'victo',
  secondaryRunReviewer: 'victo',
  reviewersAreHuman: true,
  indexToolCoverageVerified: false,
  productionArmsReady: false,
  desBaselineConclusion: null,
  desBaselineRunId: null,
  correctnessNonInferiority: 0,
};

describe('preparePairedExecutionPlan', () => {
  it('freezes 60 deterministic planned runs without consuming or executing them', () => {
    const options = {
      configs, scope: 'pilot' as const, seed: 20261112,
      schedule: armOrderSchedule({ k: 4, subset }).orders,
      readiness: blockedReadiness,
    };
    const first = preparePairedExecutionPlan(options);
    const second = preparePairedExecutionPlan(options);

    expect(first.status).toBe('blocked');
    expect(first.reasons).toContain('second run reviewer must be a different Human from the primary reviewer');
    expect(first.plannedRuns).toBe(60);
    expect(first.consumedRuns).toBe(0);
    expect(first.blocks).toHaveLength(20);
    expect(first.blocks[0]).toMatchObject({ taskId: 'flask', trial: 1, seed: 20261112 });
    // Independent worked example: assignOrdersToTasks(..., 20261112), before
    // this planning API existed; this is not derived from the returned plan.
    expect(first.blocks[0]!.orders).toEqual([['C', 'A', 'S'], ['A', 'S', 'C'], ['S', 'C', 'A'], ['S', 'A', 'C']]);
    expect(first.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.blocks)).toBe(true);
  });

  it('records actual preparation gaps alongside its immutable reservations', () => {
    const plan = preparePairedExecutionPlan({
      configs, scope: 'pilot', seed: 20261112,
      schedule: armOrderSchedule({ k: 4, subset }).orders,
      readiness: { ...blockedReadiness, secondaryRunReviewer: 'UNSET', correctnessNonInferiority: null },
    });
    expect(plan.status).toBe('blocked');
    expect(plan.readiness).toEqual({ ...blockedReadiness, secondaryRunReviewer: 'UNSET', correctnessNonInferiority: null });
    expect(plan.reasons).toEqual([
      'second independent Human run reviewer is UNSET',
      'five-corpus index/tool coverage is incomplete',
      'production C/S wiring is incomplete',
      'post-C Agent Sufficiency baseline has not passed',
      'correctness non-inferiority is not pre-registered',
    ]);
  });

  it('keeps preparation evidence outside formal research and local workspace paths', async () => {
    const { resolvePreparationPaths } = await import('../scripts/agent-eval/prepare-zra-pilot-manifest.mjs');
    const root = path.resolve(import.meta.dirname, '..');
    const paths = resolvePreparationPaths(root, {});
    expect(paths.coverage).toBe(path.join(root, '.workbuddy/agent-eval/2026-11-12-zra-pilot-index-tool-coverage.json'));
    expect(paths.out).toBe(path.join(root, '.workbuddy/agent-eval/2026-11-12-zra-pilot-execution-manifest.json'));
    const des = await import('../scripts/agent-eval/prepare-zra-pilot-manifest.mjs');
    const recorded = des.readHumanDesClassification(path.join(
      root, '.workbuddy/agent-eval/2026-11-13-post-c-des-human-classification.json',
    ));
    expect(recorded).toEqual({ runId: 'flask-baseline-20261113T083913Z', conclusion: 'inconclusive' });
    expect(() => des.readHumanDesClassification(path.join(
      root, 'docs/plans/zra-pilot-task-set-v1.json',
    ))).toThrow(/Human reviewer/);
    expect(() => resolvePreparationPaths(root, {
      coverage: path.join(root, 're' + 'search', 'report.json'),
    })).toThrow(/must not use formal research assets/);
  });

  it('records a Human inconclusive DES baseline without advancing the reservation schedule', async () => {
    const { prepareManifest } = await import('../scripts/agent-eval/prepare-zra-pilot-manifest.mjs');
    const { getPrompt } = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    const { pilotTasks } = await import('../scripts/agent-eval/task-prompts/zra-pilot-v1.mjs');
    const coverage = {
      kind: 'zra-pilot-index-tool-coverage',
      status: 'incomplete',
      results: pilotTasks.map((task: { PROMPT_ID: string }) => ({
        promptId: task.PROMPT_ID, commit: getPrompt(task.PROMPT_ID).COMMIT,
        commitMatches: true, indexCoverage: 'pass', planCoverage: 'incomplete', status: 'incomplete',
      })),
    };
    const manifest = prepareManifest({
      coverage,
      desBaseline: { runId: 'flask-baseline-20261113T083913Z', conclusion: 'inconclusive' },
    });
    expect(manifest.readiness.desBaselineRunId).toBe('flask-baseline-20261113T083913Z');
    expect(manifest.readiness.desBaselineConclusion).toBe('inconclusive');
    expect(manifest.status).toBe('blocked');
    expect(manifest.blockers).toContain('post-C Agent Sufficiency baseline has not passed');
    expect(manifest.evidence.des).toContain('inconclusive');
    expect(manifest.manifestSha256).toBe('9efb02b260bfd220817eb7383705896e2900498dceb6224e722e045694dcf7cf');
    expect(manifest.plannedRuns).toBe(60);
    expect(manifest.consumedRuns).toBe(0);
  });

  it('requires actual prerequisites instead of treating self-review as independent review', () => {
    const plan = preparePairedExecutionPlan({
      configs, scope: 'pilot', seed: 20261112,
      schedule: armOrderSchedule({ k: 4, subset }).orders,
      readiness: {
        ...blockedReadiness,
        secondaryRunReviewer: 'external-human-reviewer',
        indexToolCoverageVerified: true,
        productionArmsReady: true,
        desBaselineConclusion: 'pass',
        desBaselineRunId: 'post-c-des-baseline-v1',
      },
    });
    expect(plan.status).toBe('ready');
    expect(plan.reasons).toEqual([]);
    expect(plan.consumedRuns).toBe(0);
  });
});
