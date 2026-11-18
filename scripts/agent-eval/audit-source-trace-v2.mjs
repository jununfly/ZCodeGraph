#!/usr/bin/env node
// One bounded, zero-model preparation audit for the independently named v2 candidate.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pilotTasksV2Draft } from './task-prompts/zra-pilot-v2-draft.mjs';
import { buildSourceTraceIndex, recallSourceTrace, createSourceTraceRetrieval, verifySourceTraceCandidate } from './source-trace-candidate-v2.mjs';
import { compareFinalExploreAnswers, deriveFixedCVisibleEvidenceOrder, FIXED_C_VISIBLE_EVIDENCE_SCHEMA } from './fixed-c-visible-evidence.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = {
  'flask-session-response-trace-v2-draft': 'pallets-flask',
  'django-csrf-view-trace-v2-draft': 'django-django',
  'express-mounted-prototypes-trace-v2-draft': 'expressjs-express',
  'gin-not-found-middleware-trace-v2-draft': 'gin-gonic-gin',
  'spring-pet-update-persistence-trace-v2-draft': 'spring-projects-spring-petclinic',
};

async function modules() {
  const load = (file) => import(pathToFileURL(path.join(REPO, 'dist', file)).href);
  return { ...(await load('index.js')), ...(await load('mcp/explore-planner.js')),
    ...(await load('eval/c-explore-plan.js')), ...(await load('eval/render-c-explore-plan.js')),
    ...(await load('mcp/tools.js')), ...(await load('eval/zra-paired-core.js')) };
}

function coverage(task, candidates, rendered, graph) {
  const requirements = task.SOURCE_ANCHORS.requiredFiles.map((file) => ({
    file, indexed: graph.getNodesInFile(file).length > 0,
    candidate: candidates.includes(file), rendered: rendered.includes(file),
  }));
  const symbols = task.SOURCE_ANCHORS.symbols.map((anchor) => ({
    ...anchor,
    found: graph.searchNodes(anchor.query, { limit: 30 }).some(({ node }) =>
      node.name === anchor.name && node.filePath === anchor.file),
  }));
  return {
    requirements, symbols,
    indexCoverage: requirements.every((entry) => entry.indexed) && symbols.every((entry) => entry.found) ? 'pass' : 'incomplete',
    candidateCoverage: requirements.every((entry) => entry.candidate) ? 'pass' : 'incomplete',
    renderedSourceCoverage: requirements.every((entry) => entry.rendered) ? 'pass' : 'incomplete',
  };
}

/** Do not infer readiness here: only this candidate's preparation gates. */
export async function auditSourceTraceV2({ corpusRoot, output }) {
  const { CodeGraph, plan, composeSymbolOnlyPlan, render, ToolHandler, permuteWithFixedSeed } = await modules();
  const { candidateSha256 } = verifySourceTraceCandidate();
  const results = [];
  for (const task of pilotTasksV2Draft) {
    if (task.TASK_SET_REVIEW.verdict !== 'accept' || task.TASK_SET_REVIEW.reviewer !== 'victo'
        || task.CONTRACT_STATUS !== 'content-reviewed-not-registered') {
      throw new Error(`task is not independently Human-reviewed for this preparation audit: ${task.PROMPT_ID}`);
    }
    const corpus = CORPORA[task.PROMPT_ID];
    // The clean JavaScript snapshot is prepared by the audit command, never by
    // modifying the fixed corpus's original .zcodegraph directory.
    const root = path.resolve(corpusRoot, corpus);
    if (task.PROMPT_ID.startsWith('express-')) {
      const snapshot = path.join(output, 'express-snapshot');
      if (existsSync(snapshot)) throw new Error(`fresh Express snapshot required: ${snapshot}`);
      await cp(root, snapshot, { recursive: true, filter: (source) =>
        !source.split(path.sep).includes('.git') && !source.split(path.sep).includes('.zcodegraph') });
      const clean = CodeGraph.initSync(snapshot);
      const indexed = await clean.indexAll({ engine: 'typescript' });
      clean.close();
      if (!indexed.success || indexed.filesErrored > 0) throw new Error(`clean isolated Express indexing failed: ${JSON.stringify(indexed.errors)}`);
      writeFileSync(path.join(output, 'express-index-result.json'), `${JSON.stringify(indexed, null, 2)}\n`, 'utf8');
    }
    const evaluationRoot = task.PROMPT_ID.startsWith('express-') ? path.join(output, 'express-snapshot') : root;
    const head = spawnSync('git', ['-C', path.resolve(corpusRoot, corpus), 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    const actualCommit = head.status === 0 ? head.stdout.trim() : null;
    if (actualCommit !== task.COMMIT) {
      results.push({ promptId: task.PROMPT_ID, status: 'incomplete', actualCommit, error: 'fixed corpus commit mismatch' });
      continue;
    }
    const sourceDbPath = path.join(evaluationRoot, '.zcodegraph', 'zcodegraph.db');
    const indexPath = path.join(output, 'source-index', `${corpus}.db`);
    mkdirSync(path.dirname(indexPath), { recursive: true });
    if (existsSync(indexPath)) throw new Error(`fresh output required: ${indexPath}`);
    buildSourceTraceIndex({ dbPath: sourceDbPath, sourceRoot: evaluationRoot, indexPath });
    const hashes = {
      sourceDbSha256: createHash('sha256').update(readFileSync(sourceDbPath)).digest('hex'),
      sourceIndexSha256: createHash('sha256').update(readFileSync(indexPath)).digest('hex'),
    };
    let graph;
    try {
      graph = CodeGraph.openSync(evaluationRoot);
      const baseline = await plan(graph, task.PROMPT, { maxFiles: 20 });
      // Retrieval receives only the user prompt and real graph/index, not the
      // task's expected files, rubric, ID or source anchors below.
      const retrieval = createSourceTraceRetrieval({
        planBaseline: async () => baseline,
        symbolRecall: async () => recallSourceTrace({ query: task.PROMPT, indexPath, graph }),
      });
      const c = await retrieval({ arm: 'C', config: {} });
      const sCandidates = permuteWithFixedSeed(c.candidates, 20261112);
      const handler = new ToolHandler(graph);
      const renderArm = (candidates) => {
        const composed = composeSymbolOnlyPlan(graph, baseline, candidates);
        const blast = composed.budget.includeBlastRadius === false ? ''
          : handler.buildBlastRadiusSection(graph, composed.subgraph);
        return render(composed, graph, composed.spine, blast);
      };
      const cAnswer = renderArm(c.candidates);
      const independentSAnswer = renderArm(sCandidates);
      const controlAnswer = renderArm(c.candidates);
      let derived;
      let derivationError = null;
      try {
        derived = deriveFixedCVisibleEvidenceOrder({ cCandidates: c.candidates, sCandidates, cPayload: cAnswer });
      } catch (error) { derivationError = error instanceof Error ? error.message : String(error); }
      const sAnswer = derived?.answer ?? cAnswer;
      const comparison = compareFinalExploreAnswers(cAnswer, sAnswer);
      const orderIsolation = compareFinalExploreAnswers(cAnswer, controlAnswer);
      const files = c.candidates.map(([file]) => file);
      const report = {
        promptId: task.PROMPT_ID, actualCommit, commitMatches: true, ...hashes, candidateSha256,
        protocolSchema: FIXED_C_VISIBLE_EVIDENCE_SCHEMA,
        finalPayloadProof: derived?.proof ?? { schema: FIXED_C_VISIBLE_EVIDENCE_SCHEMA, status: 'incomplete', diagnostic: false, reason: derivationError },
        independentRenderDiagnostic: compareFinalExploreAnswers(cAnswer, independentSAnswer),
        baselineFiles: baseline.sortedFiles.map(([file]) => file),
        symbolFiles: c.payload.symbolFiles, graphFiles: c.payload.graphFiles,
        cCandidates: files, sCandidates: sCandidates.map(([file]) => file),
        coverage: coverage(task, files, comparison.cFileOrder, graph), renderedComparison: comparison,
        orderIsolation: { ...orderIsolation, status: orderIsolation.wholeTextEqual ? 'deterministic' : 'same-order-rendering-differs' },
      };
      const pass = report.coverage.indexCoverage === 'pass' && report.coverage.candidateCoverage === 'pass'
        && report.coverage.renderedSourceCoverage === 'pass' && derived?.proof.diagnostic === true
        && derived.proof.candidateProjectionEqual === true && comparison.nonSourcePrefixIdentical
        && comparison.nonSourceSuffixIdentical && comparison.fileSetsEqual
        && comparison.contentDifferences.length === 0 && !comparison.cHardCeiling && !comparison.sHardCeiling
        && orderIsolation.wholeTextEqual;
      results.push({ ...report, status: pass ? 'pass' : 'incomplete' });
      writeFileSync(path.join(output, `${task.PROMPT_ID}-rendered.json`), `${JSON.stringify({ c: cAnswer, s: sAnswer }, null, 2)}\n`, 'utf8');
    } catch (error) {
      results.push({ promptId: task.PROMPT_ID, status: 'incomplete', actualCommit, ...hashes,
        error: error instanceof Error ? error.message : String(error) });
    } finally { graph?.close(); }
  }
  return {
    schema: 'zra-source-trace-v2-preparation-audit-v1', candidateSha256,
    contractReview: { reviewer: 'victo', verdict: 'accept', reviewedAt: '2026-11-17', executionRegistration: 'not-registered' },
    scope: 'One bounded zero-model preparation audit; no models, Agent, DES, production wiring, paired ledger or pilot',
    seed: 20261112,
    status: results.every((result) => result.status === 'pass') ? 'pass' : 'incomplete',
    disposition: results.every((result) => result.status === 'pass') ? 'candidate-preparation-pass-other-gates-unchanged' : 'stop-candidate-retain-offline-diagnostics',
    results,
    limitations: ['Coverage and strict C/S parity are not answer correctness, Agent Sufficiency or release evidence.',
      'No subsequent candidate tuning or second seed is permitted by this bounded evaluation.',
      '1-8-2, 1-4/e9, production OFF, 60/0 and 96/0 are unchanged.'],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--corpus-root' || args[2] !== '--out') {
    console.error('Usage: node scripts/agent-eval/audit-source-trace-v2.mjs --corpus-root <dir> --out <fresh-local-directory>');
    process.exitCode = 1;
  } else {
    try {
      const output = path.resolve(args[3]);
      mkdirSync(output, { recursive: true });
      const report = await auditSourceTraceV2({ corpusRoot: path.resolve(args[1]), output });
      const out = path.join(output, 'report.json');
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log(JSON.stringify({ status: report.status, disposition: report.disposition, out,
        results: report.results.map((result) => ({ promptId: result.promptId, status: result.status,
          coverage: result.coverage, cCandidates: result.cCandidates,
          cHardCeiling: result.renderedComparison?.cHardCeiling, error: result.error })) }, null, 2));
      if (report.status !== 'pass') process.exitCode = 2;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
