import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('universal Explore slice 0 development boundaries', () => {
  it('binds the five reviewed development tasks to immutable identities without registering them', async () => {
    const { loadExploreDevelopmentContract } = await import(pathToFileURL(path.join(
      ROOT, 'scripts/agent-eval/explore-development-contract.mjs',
    )).href);
    const registry = await import('../scripts/agent-eval/task-prompts/registry.mjs');
    const contract = loadExploreDevelopmentContract();

    expect(contract.taskModuleSha256).toBe('0433811d8b902d8d2f28afb9e55f35f9de65df9faedef2482cb9867b278c851d');
    expect(createHash('sha256').update(readFileSync(path.join(ROOT, contract.taskModule))).digest('hex'))
      .toBe(contract.taskModuleSha256);
    expect(contract.executionRegistration).toBe('not-registered');
    expect(contract.tasks.map(({ id, repo, commit }) => ({ id, repo, commit }))).toEqual([
      { id: 'flask-session-response-trace-v2-draft', repo: 'pallets/flask', commit: '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7' },
      { id: 'django-csrf-view-trace-v2-draft', repo: 'django/django', commit: '2fff3e9f493a9c85fb8a2294358c6751575ee4bf' },
      { id: 'express-mounted-prototypes-trace-v2-draft', repo: 'expressjs/express', commit: '6d2df035a95f3d1002be3e29997b7a4bfe976b5f' },
      { id: 'gin-not-found-middleware-trace-v2-draft', repo: 'gin-gonic/gin', commit: '0f09c3a9b4626d9fe9979cf4d0521d6ae32ab646' },
      { id: 'spring-pet-update-persistence-trace-v2-draft', repo: 'spring-projects/spring-petclinic', commit: 'f3c74834e31079f69855e9c9eddb34fceb40a8d9' },
    ]);
    for (const task of contract.tasks) {
      expect(task.task.CONTRACT_STATUS).toBe('content-reviewed-not-registered');
      expect(task.promptSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(registry.listPromptIds()).not.toContain(task.id);
      expect(() => registry.getPrompt(task.id)).toThrow('unknown prompt ID');
    }
  });

  it('keeps C/S projection inputs confined to the stopped evaluation wrapper', () => {
    const productionRenderer = readFileSync(path.join(ROOT, 'src/mcp/explore-renderer.ts'), 'utf8');
    const productionPlan = readFileSync(path.join(ROOT, 'src/explore/types.ts'), 'utf8');
    const evaluationWrapper = readFileSync(path.join(ROOT, 'src/mcp/render-c-explore-plan.ts'), 'utf8');
    expect(evaluationWrapper).toContain('projectSymbolOnlyRelationships');
    expect(evaluationWrapper).toContain('plan.symbolHitNodeIds');
    // Slice 1 step 6 will remove these optional inputs and migrate the harness
    // onto EvaluationExploreProjection; production must never import the C/S
    // evaluation wrapper to obtain them.
    expect(productionPlan).toContain('symbolHitNodeIds?:');
    expect(productionRenderer).not.toContain('render-c-explore-plan');
    expect(productionRenderer).not.toContain('c-explore-plan');
    expect(readFileSync(path.join(ROOT, 'src/bin/zcodegraph.ts'), 'utf8')).not.toContain('symbolHitNodeIds');
    expect(readFileSync(path.join(ROOT, 'src/mcp/tools.ts'), 'utf8')).not.toContain('render-c-explore-plan');
  });

  it('retains a degraded usable index without erasing parser diagnostics', async () => {
    const { legacyIndexStatus } = await import(pathToFileURL(path.join(
      ROOT, 'scripts/agent-eval/audit-legacy-explore-development.mjs',
    )).href);
    const errors = [{ message: 'parse error', severity: 'warning', filePath: 'templates/example.js', code: 'rust-owned-parse-gap' }];
    expect(legacyIndexStatus({ success: true, filesErrored: 1, errors })).toMatchObject({
      status: 'degraded', fatal: false, errors,
    });
    expect(legacyIndexStatus({ success: true, filesErrored: 0, errors: [] })).toMatchObject({ status: 'complete', fatal: false });
    expect(legacyIndexStatus({ success: false, filesErrored: 1, errors })).toMatchObject({ status: 'failed', fatal: true, errors });
  });

  it('records all five loss stages and refuses to turn legacy output into claim correctness', async () => {
    const { inspectLegacyExploreTask } = await import(pathToFileURL(path.join(
      ROOT, 'scripts/agent-eval/audit-legacy-explore-development.mjs',
    )).href);
    const { loadExploreDevelopmentContract } = await import(pathToFileURL(path.join(
      ROOT, 'scripts/agent-eval/explore-development-contract.mjs',
    )).href);
    const task = loadExploreDevelopmentContract().tasks[0].task;
    const nodes = task.SOURCE_ANCHORS.symbols.map((anchor, index) => ({
      id: `anchor-${index}`, name: anchor.name, filePath: `src/anchor-${index}.py`, startLine: 1, endLine: 1,
    }));
    const node = nodes[0];
    const graph = {
      getNodesInFile: () => nodes,
      searchNodes: (query: string) => nodes.filter((node) => task.SOURCE_ANCHORS.symbols.some((anchor) => anchor.query === query && anchor.name === node.name)).map((node) => ({ node })),
    };
    const planResult = {
      sortedFiles: nodes.map((node) => [node.filePath, { nodes: [node], score: 10 }]),
      subgraph: { nodes: new Map(nodes.map((node) => [node.id, node])), edges: [] },
      entryNodeIds: new Set(nodes.map((node) => node.id)),
      spine: { pathNodeIds: new Set(nodes.map((node) => node.id)) },
    };
    const answer = `### Source Code\n\n${nodes.map((node) => `#### ${node.filePath} — anchor(function)\n\n\`\`\`python\n1\tdef anchor(): pass\n\`\`\`\n`).join('\n')}`;
    const result = inspectLegacyExploreTask({ task, graph, planResult, answer });
    expect(Object.keys(result.stages)).toEqual([
      'anchor-discovery', 'path-composition', 'source-materialization', 'budget-rendering', 'claim-response',
    ]);
    expect(result.stages['anchor-discovery'].status).toBe('observed');
    expect(result.stages['source-materialization'].status).toBe('observed');
    expect(result.stages['path-composition'].status).toBe('not-assessed');
    expect(result.stages['claim-response'].status).toBe('unsupported');
    expect(result.status).toBe('legacy-baseline-not-accepted');
  });

  it('preserves the registered legacy anchor and nine-run statistic without inventing a target', async () => {
    const measured = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { median, loadContractQueries } from './scripts/measure/perf-baseline.mjs';
      console.log(JSON.stringify({ median: median([9, 1, 5, 3, 7, 2, 8, 6, 4]),
        queries: loadContractQueries('docs/contracts/architecture-regression-baseline-v1.md') }));
    `], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });
    expect(measured.status, measured.stderr).toBe(0);
    const { median: medianValue, queries } = JSON.parse(measured.stdout);
    const baseline = JSON.parse(readFileSync(path.join(ROOT, 'docs/baselines/architecture-regression-v1.json'), 'utf8'));
    expect(baseline.value.indexMedianMs).toBe(2948);
    expect(baseline.value.exploreMedianMs).toBe(239.5);
    expect(baseline.measurement.checkRepetitions).toBe(9);
    expect(baseline.measurement.baselineRepetitions).toBe(3);
    expect(queries).toEqual([
      'How does the owner controller reach the vet visit service?',
      'callers of OwnerRepository.save',
    ]);
    expect(medianValue).toBe(5);
  });
});
