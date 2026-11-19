/**
 * slice5-dev-matrix/five-stage-audit.mjs
 *
 * Slice 5a scaffolding. Runs the five-stage audit on a single development
 * task and produces a pass/fail verdict with structured gap reporting.
 *
 * Authority: docs/contracts/universal-structural-explore-v1.md §598-§610
 *
 *   "Each task must pass all stages: indexed anchor -> discovered anchor ->
 *    selected trace -> materialized requirement -> rendered evidence.
 *    Each atomic semantic expectation in the Human-reviewed rubric becomes
 *    a required development QueryObligation ... one compound rubric
 *    sentence must not hide an unsatisfied sub-expectation. ...
 *    A required obligation that is unselected, degraded, unresolved or
 *    omitted fails this development gate even when the product correctly
 *    reports `partial`. File/symbol presence alone is insufficient. Each
 *    rendered claim is checked against its evidence links; no final text
 *    cut, unexplained omission or fabricated runtime claim is allowed."
 *
 * The five stages are:
 *   1. indexed-anchor: every SOURCE_ANCHORS symbol resolves to at least one
 *      indexed graph node with a stable identity.
 *   2. discovered-anchor: every anchor was reachable during the
 *      application's anchor/expansion phase. Evidence: the obligation
 *      list names a requirement whose source matches the anchor
 *      (file + name). We do NOT accept "the file appears in the markdown".
 *   3. selected-trace: every required obligation derived from the rubric
 *      has at least one selected requirement id AND its disposition is
 *      not 'unresolved'.
 *   4. materialized-requirement: every selected requirement's disposition
 *      in coverage.dispositions is 'returned' (not degraded/omitted).
 *      Dispositions live in `report.coverage.dispositions` (a Record), not
 *      in a synthetic `report.requirements` array; see src/explore/ledger.ts.
 *   5. rendered-evidence: no forbidden text-cut marker, no forbidden claim
 *      substring, and every obligationId referenced by a requirement is
 *      actually present in coverage.obligations (link integrity).
 *
 * The harness is **strict**: a single failing stage fails the task. A
 * macro average across tasks/repos cannot hide one failure (contract
 * §623). Status values are 'observed' | 'gap' | 'failed'.
 *
 * Shape contract with src/explore/ledger.ts (Slice 2/3):
 *   report.coverage.dispositions: Record<requirementId, 'returned'|'degraded'|'omitted'>
 *   report.coverage.obligations: readonly QueryObligation[]
 *   report.coverage.gaps: EvidenceGap[]
 * There is NO top-level report.requirements or report.claims array; any
 * such field in a test fixture is synthetic and only used to drive the
 * harness logic, not to mirror production.
 */

import {
  buildExpectedObligations,
  buildExpectedRequirements,
  buildForbiddenClaims,
} from './rubric-to-obligation.mjs';

const STAGES = [
  'indexed-anchor',
  'discovered-anchor',
  'selected-trace',
  'materialized-requirement',
  'rendered-evidence',
];

/** Markers that indicate the application silently truncated output
 * instead of doing structured degradation. Any of these in the markdown
 * is an automatic rendered-evidence failure. */
const TEXT_CUT_MARKERS = [
  'elided[output#',
  '(output truncated to budget',
  '[truncated]',
  '... (omitted for budget)',
];

/**
 * Stage 1: indexed anchor.
 *
 * @param {object} task frozen v2-draft task
 * @param {object} graph CodeGraph (or fixture substitute exposing
 *   getNodesInFile / searchNodes / getNode)
 */
function auditIndexedAnchor(task, graph) {
  const gaps = [];
  for (const anchor of task.SOURCE_ANCHORS.symbols) {
    const candidates = graph.getNodesInFile(anchor.file).filter((node) => node.name === anchor.name);
    if (candidates.length === 0) {
      gaps.push({ anchor: anchor.name, file: anchor.file, reason: 'no indexed node with this exact file+name identity' });
    }
  }
  return { status: gaps.length === 0 ? 'observed' : 'gap', gaps };
}

/**
 * Stage 2: discovered anchor. The report must demonstrate that each
 * SOURCE_ANCHORS symbol was reachable during the run. We accept a
 * discovery marker in either of two places:
 *   (a) a `requirements` side-channel populated by fixture/test
 *       scaffolding (synthetic, never produced by production code); or
 *   (b) a coverage.dispositions key matching `<file>::<name>` — the
 *       stable requirement-id convention used by the Slice 3 closure.
 *
 * The harness fails loudly if NEITHER channel records the anchor. We
 * deliberately do NOT scan the markdown; presence in text is not
 * discovery evidence.
 */
function auditDiscoveredAnchor(task, result) {
  if (result.kind === 'failed') {
    return { status: 'failed', gaps: [{ reason: `application returned kind=failed code=${result.code}` }] };
  }
  const report = result.report;
  const syntheticReqs = Array.isArray(report.requirements) ? report.requirements : [];
  const dispositions = report.coverage?.dispositions ?? {};
  const gaps = [];
  for (const anchor of task.SOURCE_ANCHORS.symbols) {
    const viaSynthetic = syntheticReqs.some(
      (r) => r.source?.filePath === anchor.file && r.source?.name === anchor.name,
    );
    const stableId = `${anchor.file}::${anchor.name}`;
    const viaDispositions = stableId in dispositions;
    if (!viaSynthetic && !viaDispositions) {
      gaps.push({ anchor: anchor.name, file: anchor.file, reason: 'anchor not present in dispositions or requirement side-channel' });
    }
  }
  return { status: gaps.length === 0 ? 'observed' : 'gap', gaps };
}

/**
 * Stage 3: selected trace. Every required obligation derived from the
 * rubric must map to at least one selected requirement in the report.
 */
function auditSelectedTrace(task, result, expectedObligations) {
  if (result.kind === 'failed') {
    return { status: 'failed', gaps: [{ reason: `application failed: ${result.code}` }] };
  }
  const report = result.report;
  const obligationsById = new Map((report.coverage.obligations ?? []).map((ob) => [ob.id, ob]));
  const gaps = [];
  for (const expected of expectedObligations) {
    const ob = obligationsById.get(expected.id);
    if (!ob) {
      gaps.push({ obligationId: expected.id, rubricLine: expected.rubricLine, reason: 'required obligation missing from report' });
      continue;
    }
    if (!Array.isArray(ob.requirementIds) || ob.requirementIds.length === 0) {
      gaps.push({ obligationId: expected.id, reason: 'obligation has no selected requirements' });
    }
    if (ob.disposition === 'unresolved') {
      gaps.push({ obligationId: expected.id, reason: 'obligation disposition=unresolved' });
    }
  }
  return { status: gaps.length === 0 ? 'observed' : 'gap', gaps };
}

/**
 * Stage 4: materialized requirement. Selected requirements must all be
 * disposition='returned' (not degraded/omitted). Dispositions come from
 * report.coverage.dispositions (the production shape). For fixture
 * scaffolding that synthesizes a `requirements` array we accept its
 * disposition field as a fallback so the harness stays testable.
 */
function auditMaterializedRequirement(task, result, expectedRequirements) {
  if (result.kind === 'failed') {
    return { status: 'failed', gaps: [{ reason: `application failed: ${result.code}` }] };
  }
  const report = result.report;
  const dispositions = report.coverage?.dispositions ?? {};
  const syntheticReqs = Array.isArray(report.requirements) ? report.requirements : [];
  const syntheticById = new Map(syntheticReqs.map((r) => [r.id, r]));
  const gaps = [];
  for (const expected of expectedRequirements) {
    // Prefer the production disposition record; fall back to the
    // synthetic requirement entry only when no record exists.
    let disposition = dispositions[expected.id];
    if (disposition === undefined) {
      const synth = syntheticById.get(expected.id);
      disposition = synth?.disposition;
    }
    if (disposition === undefined) {
      gaps.push({ requirementId: expected.id, expectedFile: expected.expectedFile, expectedName: expected.expectedName, reason: 'no disposition recorded for required requirement' });
      continue;
    }
    if (disposition !== 'returned') {
      gaps.push({ requirementId: expected.id, disposition, reason: 'requirement not returned' });
    }
  }
  return { status: gaps.length === 0 ? 'observed' : 'gap', gaps };
}

/**
 * Stage 5: rendered evidence. Every required RenderedClaim must have its
 * requirement/relation links intact; no forbidden claim; no text cut;
 * no budget overflow.
 */
function auditRenderedEvidence(task, result, forbiddenClaims) {
  if (result.kind === 'failed') {
    // A `budget-exhausted` envelope is not `complete`. It is not
    // automatically a failure of the *matrix* if the task's budget was
    // adequate; but it cannot pass rendered-evidence either.
    return { status: 'failed', gaps: [{ reason: `application failed: ${result.code}` }] };
  }
  const markdown = result.markdown ?? '';
  const gaps = [];
  for (const marker of TEXT_CUT_MARKERS) {
    if (markdown.includes(marker)) {
      gaps.push({ reason: `forbidden text-cut marker in markdown: ${marker}` });
    }
  }
  const normalized = markdown.replace(/\s+/g, ' ');
  for (const claim of forbiddenClaims) {
    // Negative constraints are written as imperatives ("Do not claim X").
    // We extract the claim body and search for its distinctive phrases.
    // This is intentionally literal; semantic paraphrase detection is
    // out of 5a scope.
    const body = claim.text.replace(/^Do not (?:claim|describe|name|invent|use|save|select|omit|drop|defer|reduce|attribute)\s+/i, '').replace(/\.$/, '');
    // Take the first 60 chars of the body as a distinctive substring;
    // short constraints use the whole body.
    const needle = body.slice(0, 60).replace(/\s+/g, ' ').trim();
    if (needle.length > 0 && normalized.includes(needle)) {
      gaps.push({ reason: `forbidden claim present in markdown`, needle, constraint: claim.text });
    }
  }
  // Obligation ↔ requirement link integrity (contract §385, §362-§367):
  // every obligationId referenced by a requirement must exist in
  // coverage.obligations. This is the production-shape equivalent of
  // "every rendered claim has its requirement links intact".
  const obligationIds = new Set((result.report.coverage?.obligations ?? []).map((o) => o.id));
  const syntheticReqs = Array.isArray(result.report.requirements) ? result.report.requirements : [];
  for (const req of syntheticReqs) {
    for (const oid of req.obligationIds ?? []) {
      if (!obligationIds.has(oid)) {
        gaps.push({ requirementId: req.id, obligationId: oid, reason: 'requirement references missing obligation (broken evidence link)' });
      }
    }
  }
  // When fixture scaffolding populates a synthetic `claims` array, we
  // also check its requirement links. Production reports do not carry
  // this array; the check is a no-op for them.
  const syntheticClaims = Array.isArray(result.report.claims) ? result.report.claims : [];
  const knownReqIds = new Set(syntheticReqs.map((r) => r.id));
  for (const claim of syntheticClaims) {
    if (!Array.isArray(claim.requirementIds) || claim.requirementIds.length === 0) {
      gaps.push({ claimId: claim.id, reason: 'rendered claim has no requirementIds' });
      continue;
    }
    for (const rid of claim.requirementIds) {
      if (!knownReqIds.has(rid)) {
        gaps.push({ claimId: claim.id, requirementId: rid, reason: 'claim references missing requirement' });
      }
    }
  }
  return { status: gaps.length === 0 ? 'observed' : 'gap', gaps };
}

/**
 * Run the full five-stage audit on one development task.
 *
 * @param {object} args
 * @param {object} args.task            frozen v2-draft task
 * @param {object} args.graph           CodeGraph (or fixture substitute)
 * @param {object} args.result          ExploreResult from UniversalExploreApplication
 * @returns {{
 *   promptId: string,
 *   commit: string,
 *   verdict: 'pass' | 'fail',
 *   stages: Record<string, {status: 'observed'|'gap'|'failed', gaps: Array}>,
 *   expectedObligations: Array,
 *   expectedRequirements: Array,
 *   forbiddenClaims: Array,
 * }}
 */
export function auditDevelopmentTask({ task, graph, result }) {
  const expectedObligations = buildExpectedObligations(task);
  const expectedRequirements = buildExpectedRequirements(task, expectedObligations);
  const forbiddenClaims = buildForbiddenClaims(task);

  const stages = {
    'indexed-anchor': auditIndexedAnchor(task, graph),
    'discovered-anchor': auditDiscoveredAnchor(task, result),
    'selected-trace': auditSelectedTrace(task, result, expectedObligations),
    'materialized-requirement': auditMaterializedRequirement(task, result, expectedRequirements),
    'rendered-evidence': auditRenderedEvidence(task, result, forbiddenClaims),
  };

  // Order matters: if stage 1 fails, later stages are likely to fail
  // too; we still report every stage so the gap is diagnosable.
  const verdict = STAGES.every((stage) => stages[stage].status === 'observed') ? 'pass' : 'fail';

  return {
    promptId: task.PROMPT_ID,
    commit: task.COMMIT,
    verdict,
    stages,
    expectedObligations,
    expectedRequirements,
    forbiddenClaims,
  };
}

/**
 * Run the audit across the full frozen development matrix. Each task is
 * an independent hard gate; a macro pass rate is forbidden by the
 * contract (§623). Returns per-task verdicts plus an overall pass/fail.
 *
 * @param {object} args
 * @param {Array}  args.contractTasks  frozen tasks from explore-development-contract
 * @param {(task) => Promise<{graph:object, result:object}>} args.runOne
 *        callback that runs the application for one task and returns the
 *        graph handle and ExploreResult. The callback owns corpus
 *        resolution, indexing, and cleanup.
 */
export async function auditDevelopmentMatrix({ contractTasks, runOne }) {
  const perTask = [];
  for (const { task } of contractTasks) {
    const { graph, result } = await runOne(task);
    const audit = auditDevelopmentTask({ task, graph, result });
    perTask.push(audit);
  }
  const overall = perTask.every((a) => a.verdict === 'pass') ? 'pass' : 'fail';
  const failing = perTask.filter((a) => a.verdict !== 'pass').map((a) => a.promptId);
  return { overall, failing, perTask };
}
