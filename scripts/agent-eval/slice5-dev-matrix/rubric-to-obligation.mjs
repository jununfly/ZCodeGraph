/**
 * slice5-dev-matrix/rubric-to-obligation.mjs
 *
 * Slice 5a scaffolding. Translates a Human-reviewed RUBRIC line plus the
 * task's SOURCE_ANCHORS into the Slice 3 evidence-model data shapes
 * (QueryObligation / EvidenceRequirement) defined in
 * src/explore/obligations.ts.
 *
 * Authority: docs/contracts/universal-structural-explore-v1.md §598-§610
 *   "Each atomic semantic expectation in the Human-reviewed rubric becomes
 *    a required development QueryObligation with expected source atoms,
 *    evidence roles, relation semantics/certainty and forbidden claims;
 *    one compound rubric sentence must not hide an unsatisfied
 *    sub-expectation."
 *
 * The rubric is a *development oracle*, never a retrieval input. This
 * module runs after the UniversalExploreApplication returns its
 * ExploreResult and compares expectations to the actual report.
 *
 * The translator is deliberately literal:
 *   - it never invents roles the rubric line does not name
 *   - it never invents file paths the SOURCE_ANCHORS does not pin
 *   - a rubric line that names multiple symbols/files is split into one
 *     obligation per (file, symbol) pair so a compound sentence cannot
 *     hide a single missing sub-expectation
 */

import { createHash } from 'node:crypto';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Map a rubric line's natural-language cue to a Slice 3 EvidenceRole.
 * Deliberately narrow: an unrecognized cue falls back to 'supporting' so
 * the matrix fails loudly instead of guessing. */
// Cue order matters: the first matching pattern wins. More specific cues
// (state-mutation, condition, exception, external-terminal, scheduling,
// registration) run BEFORE the broader invocation/definition cues so a
// rubric line that names a method AND describes a state change is
// classified by the semantics, not by the bare method name.
const ROLE_CUES = [
  [/\b(cache|cached|caches|accessor marks accessed|marks accessed)\b/i, 'state-mutation'],
  [/\b(if |when |requires|non-empty|non-null|modified|permanent|conditional)\b/i, 'condition'],
  [/\b(deletion|empty session|reject|rejection|exception|integrity error)\b/i, 'exception-branch'],
  [/\b(external router|external package|delegated)\b/i, 'external-terminal'],
  [/\b(schedul|hook|mount event|middleware)\b/i, 'scheduling-site'],
  [/\b(registers|registration|@route|Use\(|app\.use|routergroup)\b/i, 'registration-site'],
  [/\b(open_session|save_session|should_set_cookie|process_response|getrouter|createApplication|handle|use|Next|Abort|serveError|getPet|save)\b/, 'invocation-site'],
  [/\b(accessor|getter|property|method|function)\b/i, 'definition'],
];

function roleForRubricLine(line) {
  for (const [pattern, role] of ROLE_CUES) {
    if (pattern.test(line)) return role;
  }
  return 'supporting';
}

/** Pull the `repo/path/file.ext` prefix out of a rubric line if it names
 * one explicitly. Returns null when the line is purely prose. */
function rubricFile(line) {
  const match = line.match(/^\s*([A-Za-z0-9_./-]+\.[A-Za-z]+)\s*:/);
  return match ? match[1] : null;
}

/** Match a rubric line to the SOURCE_ANCHORS symbols it talks about.
 * An anchor matches when its `name` (or its `query`) appears as a
 * word-boundary token in the rubric line. */
function anchorsForLine(line, anchors) {
  const out = [];
  for (const anchor of anchors.symbols) {
    const nameRe = new RegExp(`\\b${anchor.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const queryRe = new RegExp(`\\b${anchor.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (nameRe.test(line) || queryRe.test(line)) out.push(anchor);
  }
  return out;
}

/**
 * Build the list of expected QueryObligations for one frozen task.
 *
 * @param {object} task  a frozen v2-draft task (PROMPT_ID, RUBRIC, SOURCE_ANCHORS, …)
 * @returns {Array<{
 *   id: string,
 *   role: string,
 *   required: true,
 *   rubricLine: string,
 *   expectedFile: string|null,
 *   expectedAnchors: Array<{name:string,file:string,query:string}>,
 *   expectationSha256: string,
 * }>}
 */
export function buildExpectedObligations(task) {
  const out = [];
  for (const line of task.RUBRIC) {
    const file = rubricFile(line);
    const matchedAnchors = anchorsForLine(line, task.SOURCE_ANCHORS);
    const role = roleForRubricLine(line);
    // A rubric line with no SOURCE_ANCHORS match still becomes an
    // obligation. It will fail closed at audit time because nothing in
    // the evidence model can satisfy a missing anchor; this is the
    // "must not hide an unsatisfied sub-expectation" rule.
    const targets = matchedAnchors.length > 0 ? matchedAnchors : [null];
    for (const anchor of targets) {
      const obligationId = `ob-${sha256(`${task.PROMPT_ID}|${line}|${anchor?.name ?? ''}`).slice(0, 16)}`;
      out.push({
        id: obligationId,
        role,
        required: true,
        rubricLine: line,
        expectedFile: anchor?.file ?? file ?? null,
        expectedAnchors: anchor ? [anchor] : [],
        expectationSha256: sha256(line),
      });
    }
  }
  return out;
}

/**
 * Build the list of expected EvidenceRequirements that, together, would
 * close the obligations returned by buildExpectedObligations.
 *
 * One obligation → one anchor requirement per expected anchor. The harness
 * checks that the application returned each of these as `returned` (not
 * degraded, not omitted).
 */
export function buildExpectedRequirements(task, obligations) {
  const requirements = [];
  for (const obligation of obligations) {
    for (const anchor of obligation.expectedAnchors) {
      const reqId = `req-${sha256(`${obligation.id}|${anchor.name}@${anchor.file}`).slice(0, 16)}`;
      requirements.push({
        id: reqId,
        obligationIds: [obligation.id],
        kind: 'anchor',
        role: obligation.role,
        requirement: 'required',
        expectedFile: anchor.file,
        expectedName: anchor.name,
      });
    }
  }
  return requirements;
}

/**
 * Build the negative-claim list. The harness will scan the rendered
 * markdown for each forbidden claim and fail the matrix if any appear.
 *
 * Negative constraints are free-form prose; the harness performs literal
 * substring matching after normalizing whitespace. This is intentional:
 * semantic negative checking (e.g. "claim X via paraphrase") is a 5b/5c
 * concern, not 5a.
 */
export function buildForbiddenClaims(task) {
  return task.NEGATIVE_CONSTRAINTS.map((line) => ({
    text: line,
    sha256: sha256(line),
  }));
}
