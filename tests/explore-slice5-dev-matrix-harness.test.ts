/**
 * Slice 5a — development-matrix harness self-tests.
 *
 * Authority: docs/contracts/universal-structural-explore-v1.md §586-§623
 * Roadmap: 1-9-9-1
 *
 * These tests validate the *harness itself* against a local fixture
 * substitute. They do NOT run the real five-repo fixed-commit matrix
 * (that is 5c); they prove that:
 *
 *   1. The corpus-resolver rejects unknown repos and malformed commits
 *      and resolves fixture substitutes without touching the network.
 *   2. The rubric-to-obligation translator splits compound rubric lines
 *      into one obligation per (file, symbol) so a compound sentence
 *      cannot hide an unsatisfied sub-expectation.
 *   3. The five-stage audit fails closed: an unselected / degraded /
 *      omitted / unresolved required obligation is a `fail`, even when
 *      the underlying application correctly reports `partial`.
 *   4. The audit catches every forbidden text-cut marker and every
 *      forbidden claim substring in the rendered markdown.
 *   5. The matrix aggregator refuses to hide a single failing task
 *      behind a macro average.
 *
 * This file is intentionally independent of the production
 * UniversalExploreApplication: it mocks the ExploreResult the harness
 * consumes so the harness logic is tested deterministically.
 */

import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(__dirname, '..');
const MATRIX_DIR = path.join(ROOT, 'scripts/agent-eval/slice5-dev-matrix');

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

async function loadHarness() {
  const resolver = await import(pathToFileURL(path.join(MATRIX_DIR, 'corpus-resolver.mjs')).href);
  const rubric = await import(pathToFileURL(path.join(MATRIX_DIR, 'rubric-to-obligation.mjs')).href);
  const audit = await import(pathToFileURL(path.join(MATRIX_DIR, 'five-stage-audit.mjs')).href);
  return { resolver, rubric, audit };
}

// ---------------------------------------------------------------------------
// Fixture substitutes
// ---------------------------------------------------------------------------

function makeFakeGraph(anchors: Array<{ name: string; file: string }>) {
  const byFile = new Map<string, Array<{ id: string; name: string; kind: string }>>();
  for (const anchor of anchors) {
    if (!byFile.has(anchor.file)) byFile.set(anchor.file, []);
    byFile.get(anchor.file)!.push({ id: `n-${anchor.name}`, name: anchor.name, kind: 'method' });
  }
  return {
    getNodesInFile(file: string) {
      return byFile.get(file) ?? [];
    },
  };
}

function makeFakeTask(overrides: Record<string, unknown> = {}) {
  return {
    PROMPT_ID: 'fixture-task-v1',
    COMMIT: 'a'.repeat(40),
    RUBRIC: [
      'src/example.py: Example.push opens the session before request matching.',
      'src/example.py: Example.save persists the session and serializes the cookie.',
    ],
    NEGATIVE_CONSTRAINTS: [
      'Do not claim every non-empty session unconditionally writes a cookie.',
      'Do not name lazyrouter as a concrete function.',
    ],
    SOURCE_ANCHORS: {
      requiredFiles: ['src/example.py'],
      symbols: [
        { query: 'push', name: 'Example.push', file: 'src/example.py' },
        { query: 'save', name: 'Example.save', file: 'src/example.py' },
      ],
    },
    ...overrides,
  } as any;
}

function makeFakeResult(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'answer',
    markdown: 'some evidence',
    report: {
      status: 'complete',
      coverage: {
        status: 'complete',
        obligations: [],
        gaps: [],
        selectedRequirements: 0,
        returnedRequirements: 0,
        degradedRequirements: 0,
        omittedRequirements: 0,
      },
      requirements: [],
      claims: [],
      omissions: [],
      diagnostics: [],
    },
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// corpus-resolver
// ---------------------------------------------------------------------------

describe('Slice 5a — corpus-resolver', () => {
  it('rejects an unknown frozen repo', async () => {
    const { resolver } = await loadHarness();
    expect(() => resolver.resolveFrozenCorpus({ repo: 'unknown/repo', commit: 'a'.repeat(40) }))
      .toThrow('unknown frozen development repo');
  });

  it('rejects a non-full-sha commit', async () => {
    const { resolver } = await loadHarness();
    expect(() => resolver.resolveFrozenCorpus({ repo: 'pallets/flask', commit: '05e9c6b' }))
      .toThrow('full 40-char sha');
  });

  it('exposes every frozen repo from the slice 0 contract', async () => {
    const { resolver } = await loadHarness();
    expect(Object.keys(resolver.FROZEN_REPO_DIRECTORIES).sort()).toEqual([
      'django/django',
      'expressjs/express',
      'gin-gonic/gin',
      'pallets/flask',
      'spring-projects/spring-petclinic',
    ]);
  });

  it('resolves a fixture substitute without touching the network', async () => {
    const { resolver } = await loadHarness();
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-slice5-fixture-'));
    try {
      const resolved = resolver.resolveFixtureSubstitute({ fixtureRoot, taskId: 'fixture-task-v1' });
      expect(resolved.repoDir).toBe(fixtureRoot);
      expect(resolved.isFixtureSubstitute).toBe(true);
      expect(resolved.directory).toBe('fixture:fixture-task-v1');
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('rejects a relative fixtureRoot', async () => {
    const { resolver } = await loadHarness();
    expect(() => resolver.resolveFixtureSubstitute({ fixtureRoot: './relative', taskId: 'x' }))
      .toThrow('must be absolute');
  });
});

// ---------------------------------------------------------------------------
// rubric-to-obligation
// ---------------------------------------------------------------------------

describe('Slice 5a — rubric-to-obligation', () => {
  it('produces one required obligation per rubric line per matched anchor', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask();
    const obligations = rubric.buildExpectedObligations(task);
    // 2 rubric lines × 1 anchor each = 2 obligations
    expect(obligations).toHaveLength(2);
    for (const ob of obligations) {
      expect(ob.required).toBe(true);
      expect(ob.id).toMatch(/^ob-[0-9a-f]{16}$/);
      expect(ob.expectationSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('does not hide a compound rubric line behind a single obligation', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask({
      RUBRIC: ['src/example.py: Example.push and Example.save are both required.'],
      SOURCE_ANCHORS: {
        requiredFiles: ['src/example.py'],
        symbols: [
          { query: 'push', name: 'Example.push', file: 'src/example.py' },
          { query: 'save', name: 'Example.save', file: 'src/example.py' },
        ],
      },
    });
    const obligations = rubric.buildExpectedObligations(task);
    // One compound sentence MUST yield two obligations (one per anchor).
    expect(obligations).toHaveLength(2);
    const ids = new Set(obligations.map((o: any) => o.id));
    expect(ids.size).toBe(2);
  });

  it('produces a failing obligation when a rubric line names no anchor', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask({
      RUBRIC: ['Some purely-prose expectation with no matching anchor.'],
    });
    const obligations = rubric.buildExpectedObligations(task);
    expect(obligations).toHaveLength(1);
    expect(obligations[0].expectedAnchors).toEqual([]);
  });

  it('assigns evidence roles from rubric cues without inventing roles', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask({
      RUBRIC: [
        'src/example.py: Example.push caches the session accessor.', // -> state-mutation
        'src/example.py: Example.save requires modified sessions.',   // -> condition
        'An unrecognized cue with no anchor.',                        // -> supporting
      ],
    });
    const obligations = rubric.buildExpectedObligations(task);
    const roles = obligations.map((o: any) => o.role);
    expect(roles).toContain('state-mutation');
    expect(roles).toContain('condition');
    expect(roles).toContain('supporting');
  });

  it('builds one anchor requirement per expected anchor', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask();
    const obligations = rubric.buildExpectedObligations(task);
    const requirements = rubric.buildExpectedRequirements(task, obligations);
    expect(requirements.length).toBeGreaterThanOrEqual(obligations.length);
    for (const req of requirements) {
      expect(req.requirement).toBe('required');
      expect(req.kind).toBe('anchor');
      expect(req.obligationIds).toHaveLength(1);
    }
  });

  it('forbids claims verbatim from the negative-constraint list', async () => {
    const { rubric } = await loadHarness();
    const task = makeFakeTask();
    const forbidden = rubric.buildForbiddenClaims(task);
    expect(forbidden).toHaveLength(task.NEGATIVE_CONSTRAINTS.length);
    for (const f of forbidden) {
      expect(f.sha256).toBe(sha256(f.text));
    }
  });
});

// ---------------------------------------------------------------------------
// five-stage audit
// ---------------------------------------------------------------------------

describe('Slice 5a — five-stage audit fails closed', () => {
  it('fails when a SOURCE_ANCHORS symbol has no indexed node', async () => {
    const { audit } = await loadHarness();
    const task = makeFakeTask();
    const graph = makeFakeGraph([]); // empty graph — anchor missing
    const result = makeFakeResult();
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    expect(verdict.stages['indexed-anchor'].status).toBe('gap');
    expect(verdict.stages['indexed-anchor'].gaps[0].anchor).toBe('Example.push');
  });

  it('fails when the application returned kind=failed', async () => {
    const { audit } = await loadHarness();
    const task = makeFakeTask();
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const result = { kind: 'failed', code: 'budget-exhausted', text: '...' };
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    expect(verdict.stages['discovered-anchor'].status).toBe('failed');
    expect(verdict.stages['selected-trace'].status).toBe('failed');
  });

  it('fails when a required obligation is missing from the report', async () => {
    const { audit } = await loadHarness();
    const task = makeFakeTask();
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const result = makeFakeResult({
      report: {
        status: 'partial',
        coverage: { status: 'partial', obligations: [], gaps: [] },
        requirements: [],
        claims: [],
        omissions: [],
        diagnostics: [],
      },
    });
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    expect(verdict.stages['selected-trace'].status).toBe('gap');
  });

  it('fails when a required obligation is unresolved even if the product reports partial', async () => {
    const { audit, rubric } = await loadHarness();
    const task = makeFakeTask();
    const expectedObligations = rubric.buildExpectedObligations(task);
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const result = makeFakeResult({
      report: {
        status: 'partial',
        coverage: {
          status: 'partial',
          obligations: expectedObligations.map((ob: any) => ({
            id: ob.id, required: true, requirementIds: ['req-x'], disposition: 'unresolved',
          })),
          gaps: [],
        },
        requirements: [],
        claims: [],
        omissions: [],
        diagnostics: [],
      },
    });
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    const trace = verdict.stages['selected-trace'];
    expect(trace.status).toBe('gap');
    expect(trace.gaps.some((g: any) => g.reason === 'obligation disposition=unresolved')).toBe(true);
  });

  it('fails when a requirement is degraded or omitted (not returned)', async () => {
    const { audit, rubric } = await loadHarness();
    const task = makeFakeTask();
    const expectedObligations = rubric.buildExpectedObligations(task);
    const expectedRequirements = rubric.buildExpectedRequirements(task, expectedObligations);
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const result = makeFakeResult({
      report: {
        status: 'partial',
        coverage: {
          status: 'partial',
          obligations: expectedObligations.map((ob: any) => ({
            id: ob.id, required: true,
            requirementIds: expectedRequirements.filter((r: any) => r.obligationIds[0] === ob.id).map((r: any) => r.id),
            disposition: 'satisfied',
          })),
          gaps: [],
        },
        requirements: expectedRequirements.map((r: any) => ({
          ...r, disposition: 'degraded', reasonCode: 'budget',
        })),
        claims: [],
        omissions: [],
        diagnostics: [],
      },
    });
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    expect(verdict.stages['materialized-requirement'].status).toBe('gap');
  });

  it('fails on every forbidden text-cut marker', async () => {
    const { audit, rubric } = await loadHarness();
    const task = makeFakeTask();
    const expectedObligations = rubric.buildExpectedObligations(task);
    const expectedRequirements = rubric.buildExpectedRequirements(task, expectedObligations);
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const goodReport = {
      status: 'complete',
      coverage: {
        status: 'complete',
        obligations: expectedObligations.map((ob: any) => ({
          id: ob.id, required: true,
          requirementIds: expectedRequirements.filter((r: any) => r.obligationIds[0] === ob.id).map((r: any) => r.id),
          disposition: 'satisfied',
        })),
        gaps: [],
      },
      requirements: expectedRequirements.map((r: any) => ({ ...r, disposition: 'returned', source: { filePath: r.expectedFile, name: r.expectedName } })),
      claims: [],
      omissions: [],
      diagnostics: [],
    };
    for (const marker of ['elided[output#', '(output truncated to budget', '[truncated]', '... (omitted for budget)']) {
      const result = makeFakeResult({ markdown: `evidence ${marker} more`, report: goodReport });
      const verdict = audit.auditDevelopmentTask({ task, graph, result });
      expect(verdict.verdict).toBe('fail');
      expect(verdict.stages['rendered-evidence'].status).toBe('gap');
    }
  });

  it('fails when a forbidden claim substring appears in the markdown', async () => {
    const { audit, rubric } = await loadHarness();
    const task = makeFakeTask();
    const expectedObligations = rubric.buildExpectedObligations(task);
    const expectedRequirements = rubric.buildExpectedRequirements(task, expectedObligations);
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const goodReport = {
      status: 'complete',
      coverage: {
        status: 'complete',
        obligations: expectedObligations.map((ob: any) => ({
          id: ob.id, required: true,
          requirementIds: expectedRequirements.filter((r: any) => r.obligationIds[0] === ob.id).map((r: any) => r.id),
          disposition: 'satisfied',
        })),
        gaps: [],
      },
      requirements: expectedRequirements.map((r: any) => ({ ...r, disposition: 'returned', source: { filePath: r.expectedFile, name: r.expectedName } })),
      claims: [],
      omissions: [],
      diagnostics: [],
    };
    const result = makeFakeResult({
      markdown: '... every non-empty session unconditionally writes a cookie ...',
      report: goodReport,
    });
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('fail');
    expect(verdict.stages['rendered-evidence'].status).toBe('gap');
  });

  it('passes a clean end-to-end fixture task', async () => {
    const { audit, rubric } = await loadHarness();
    const task = makeFakeTask();
    const expectedObligations = rubric.buildExpectedObligations(task);
    const expectedRequirements = rubric.buildExpectedRequirements(task, expectedObligations);
    const graph = makeFakeGraph(task.SOURCE_ANCHORS.symbols);
    const result = makeFakeResult({
      markdown: 'Example.push opens the session. Example.save persists it.',
      report: {
        status: 'complete',
        coverage: {
          status: 'complete',
          obligations: expectedObligations.map((ob: any) => ({
            id: ob.id, required: true,
            requirementIds: expectedRequirements.filter((r: any) => r.obligationIds[0] === ob.id).map((r: any) => r.id),
            disposition: 'satisfied',
          })),
          gaps: [],
        },
        requirements: expectedRequirements.map((r: any) => ({
          ...r,
          disposition: 'returned',
          source: { filePath: r.expectedFile, name: r.expectedName },
        })),
        claims: [],
        omissions: [],
        diagnostics: [],
      },
    });
    const verdict = audit.auditDevelopmentTask({ task, graph, result });
    expect(verdict.verdict).toBe('pass');
    for (const stage of Object.values(verdict.stages)) {
      expect((stage as any).status).toBe('observed');
    }
  });
});

// ---------------------------------------------------------------------------
// matrix aggregator
// ---------------------------------------------------------------------------

describe('Slice 5a — matrix aggregator refuses to hide failure', () => {
  it('fails the overall matrix when one task fails (no macro average)', async () => {
    const { audit, rubric } = await loadHarness();
    const passingTask = makeFakeTask({ PROMPT_ID: 'pass-task', COMMIT: 'b'.repeat(40) });
    const failingTask = makeFakeTask({ PROMPT_ID: 'fail-task', COMMIT: 'c'.repeat(40) });
    const contractTasks = [{ task: passingTask }, { task: failingTask }];

    const runOne = async (task: any) => {
      const expectedObligations = rubric.buildExpectedObligations(task);
      const expectedRequirements = rubric.buildExpectedRequirements(task, expectedObligations);
      const graph = task.PROMPT_ID === 'pass-task'
        ? makeFakeGraph(task.SOURCE_ANCHORS.symbols)
        : makeFakeGraph([]); // missing anchor -> fail
      const result = makeFakeResult({
        markdown: 'clean',
        report: {
          status: 'complete',
          coverage: {
            status: 'complete',
            obligations: expectedObligations.map((ob: any) => ({
              id: ob.id, required: true,
              requirementIds: expectedRequirements.filter((r: any) => r.obligationIds[0] === ob.id).map((r: any) => r.id),
              disposition: 'satisfied',
            })),
            gaps: [],
          },
          requirements: expectedRequirements.map((r: any) => ({
            ...r, disposition: 'returned', source: { filePath: r.expectedFile, name: r.expectedName },
          })),
          claims: [], omissions: [], diagnostics: [],
        },
      });
      return { graph, result };
    };

    const matrix = await audit.auditDevelopmentMatrix({ contractTasks, runOne });
    expect(matrix.overall).toBe('fail');
    expect(matrix.failing).toEqual(['fail-task']);
    expect(matrix.perTask).toHaveLength(2);
    const passVerdict = matrix.perTask.find((a: any) => a.promptId === 'pass-task');
    expect(passVerdict.verdict).toBe('pass');
  });
});
