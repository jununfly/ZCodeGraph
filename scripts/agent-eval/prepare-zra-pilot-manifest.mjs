#!/usr/bin/env node
// Preparation only: writes reservations, blockers and separately supplied Human classifications.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { preparePairedExecutionPlan } from '../../dist/eval/zra-paired-execution-plan.js';
import { armOrderSchedule } from '../../dist/eval/zra-paired-design.js';
import { pilotTasks } from './task-prompts/zra-pilot-v1.mjs';
import { verifyFrozenSymbolUnionCandidate } from './isolated-symbol-union.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EVIDENCE_DIR = '.workbuddy/agent-eval';
const DEFAULT_COVERAGE = path.join(REPO, EVIDENCE_DIR, '2026-11-12-zra-pilot-index-tool-coverage.json');
const DEFAULT_OUT = path.join(REPO, EVIDENCE_DIR, '2026-11-12-zra-pilot-execution-manifest.json');
const DEFAULT_DES_CLASSIFICATION = path.join(REPO, EVIDENCE_DIR, '2026-11-13-post-c-des-human-classification.json');
const DEFAULT_REVIEWER_ASSIGNMENT = path.join(REPO, EVIDENCE_DIR, '2026-11-13-secondary-reviewer-assignment.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function resolvePreparationPaths(repoRoot, { coverage, out }) {
  const resolve = (value, fallback) => {
    const target = value ? path.resolve(repoRoot, value) : fallback;
    const relative = path.relative(repoRoot, target).replace(/\\/g, '/');
    const firstSegment = relative.split('/')[0];
    if (firstSegment === 're' + 'search' || firstSegment === 'discussions') {
      throw new Error('preparation evidence must not use formal research assets');
    }
    return target;
  };
  return { coverage: resolve(coverage, DEFAULT_COVERAGE), out: resolve(out, DEFAULT_OUT) };
}

export function readHumanDesClassification(filePath) {
  const record = JSON.parse(readFileSync(filePath, 'utf8'));
  const conclusions = new Set(['pass', 'fail', 'inconclusive']);
  if (record.reviewer !== 'victo' || !conclusions.has(record.conclusion)
    || !/^flask-baseline-\d{8}T\d{6}Z$/.test(record.runId)) {
    throw new Error('a named Human reviewer, run ID and explicit DES conclusion are required');
  }
  return Object.freeze({ runId: record.runId, conclusion: record.conclusion });
}

export function readHumanReviewerAssignment(filePath) {
  const record = JSON.parse(readFileSync(filePath, 'utf8'));
  if (record.kind !== 'zra-pilot-human-reviewer-assignment'
    || typeof record.primaryRunReviewer !== 'string' || !record.primaryRunReviewer.trim()
    || typeof record.secondaryRunReviewer !== 'string' || !record.secondaryRunReviewer.trim()
    || record.secondaryRunReviewer === 'UNSET'
    || record.primaryRunReviewer === record.secondaryRunReviewer
    || record.reviewersAreHuman !== true || record.reviewCompleted !== false) {
    throw new Error('two distinct named Human run reviewers and an explicit unreviewed assignment are required');
  }
  return Object.freeze({
    primaryRunReviewer: record.primaryRunReviewer,
    secondaryRunReviewer: record.secondaryRunReviewer,
    reviewersAreHuman: true,
  });
}

export function prepareManifest({ coverage, desBaseline = null, reviewers = null, renderedAudit = null }) {
  if (coverage.kind !== 'zra-pilot-index-tool-coverage' || !Array.isArray(coverage.results)) {
    throw new Error('a real five-corpus coverage report is required');
  }
  const coverageByPrompt = new Map(coverage.results.map((result) => [result.promptId, result]));
  const missing = pilotTasks.filter((task) => !coverageByPrompt.has(task.PROMPT_ID));
  if (missing.length > 0 || coverage.results.length !== pilotTasks.length) {
    throw new Error('coverage report must contain exactly the five registered pilot tasks');
  }
  if (renderedAudit) {
    if (renderedAudit.kind !== 'zra-pilot-isolated-c-s-rendered-audit'
      || renderedAudit.seed !== 20261112 || !Array.isArray(renderedAudit.results)
      || renderedAudit.results.length !== pilotTasks.length
      || new Set(renderedAudit.results.map((result) => result.promptId)).size !== pilotTasks.length
      || pilotTasks.some((task) => !renderedAudit.results.some((result) => result.promptId === task.PROMPT_ID))) {
      throw new Error('rendered audit must contain exactly the five registered pilot tasks and frozen seed');
    }
    for (const result of renderedAudit.results) {
      const comparison = result.renderedComparison;
      if (!comparison || !Array.isArray(comparison.contentDifferences)
        || !['pass', 'incomplete'].includes(result.status)
        || typeof comparison.nonSourcePrefixIdentical !== 'boolean'
        || typeof comparison.fileSetsEqual !== 'boolean'
        || typeof comparison.cHardCeiling !== 'boolean'
        || typeof comparison.sHardCeiling !== 'boolean') {
        throw new Error(`rendered audit requires explicit source-parity evidence: ${result.promptId}`);
      }
      if (result.status === 'pass' && (!comparison.nonSourcePrefixIdentical
        || !comparison.fileSetsEqual || comparison.contentDifferences.length > 0
        || comparison.cHardCeiling || comparison.sHardCeiling
        || Object.values(result.coverage ?? {}).filter((value) => typeof value === 'string')
          .some((value) => value !== 'pass'))) {
        throw new Error(`rendered audit cannot pass with missing or different source evidence: ${result.promptId}`);
      }
    }
  }
  const schedule = armOrderSchedule({
    k: 4,
    subset: [['A', 'S', 'C'], ['C', 'A', 'S'], ['S', 'A', 'C'], ['S', 'C', 'A']],
  });
  const readiness = Object.freeze({
    taskSetReviewed: pilotTasks.every((task) => task.TASK_SET_REVIEW.verdict === 'accept'
      && task.TASK_SET_REVIEW.reviewer === 'victo' && task.FRESHNESS.reusedV3Text === false),
    taskFreshnessReviewer: 'victo',
    primaryRunReviewer: reviewers?.primaryRunReviewer ?? 'victo',
    secondaryRunReviewer: reviewers?.secondaryRunReviewer ?? 'UNSET',
    reviewersAreHuman: reviewers?.reviewersAreHuman ?? true,
    indexToolCoverageVerified: coverage.status === 'pass'
      && coverage.results.every((result) => result.status === 'pass' && result.commitMatches === true),
    productionArmsReady: false,
    desBaselineConclusion: desBaseline?.conclusion ?? null,
    desBaselineRunId: desBaseline?.runId ?? null,
    correctnessNonInferiority: null,
  });
  const configs = pilotTasks.map((task) => ({
    taskId: task.PROMPT_ID,
    modelVersion: 'UNSET',
    prompt: task.PROMPT,
    toolSchema: 'Read,Grep,Glob,mcp__codegraph__*',
    indexSnapshot: task.COMMIT,
    mcpToolSurface: 'codegraph-explore-v1',
    responseSchema: 'concise-source-cited-v1',
  }));
  const plan = preparePairedExecutionPlan({ configs, scope: 'pilot', seed: 20261112, schedule: schedule.orders, readiness });
  const frozenCandidate = verifyFrozenSymbolUnionCandidate();
  return {
    schemaVersion: '1.0',
    evidenceDirectory: EVIDENCE_DIR,
    kind: 'zra-paired-pilot-execution-reservations',
    scope: 'preparation reservations plus a separately supplied Human DES classification; no model execution or production wiring',
    status: plan.status,
    blockers: plan.reasons,
    readiness: plan.readiness,
    requestedExecution: {
      provider: 'codebuddy-standalone',
      model: 'glm-5.3-flash',
      effort: 'high',
      runtimeModelReadback: 'UNSET',
      runtimeEffortReadback: 'UNSET',
    },
    seed: plan.seed,
    plannedRuns: plan.plannedRuns,
    consumedRuns: plan.consumedRuns,
    pilotCeiling: 96,
    formalCeiling: 0,
    armOrders: schedule.orders,
    uncoveredArmOrders: schedule.uncovered,
    manifestSha256: plan.manifestSha256,
    manifestDigestScope: 'scope, seed, schedule and block config fingerprints; readiness and evidence are separate fields',
    blocks: plan.blocks,
    promptRegistry: pilotTasks.map((task) => ({
      promptId: task.PROMPT_ID,
      corpus: task.CORPUS,
      commit: task.COMMIT,
      promptSha256: sha256(task.PROMPT, 'utf8'),
      rubricSha256: sha256(JSON.stringify(task.RUBRIC), 'utf8'),
      negativeConstraintsSha256: sha256(JSON.stringify(task.NEGATIVE_CONSTRAINTS), 'utf8'),
      sourceAnchorsSha256: sha256(JSON.stringify(task.SOURCE_ANCHORS), 'utf8'),
      taskSetReview: task.TASK_SET_REVIEW,
      freshness: task.FRESHNESS,
    })),
    retrievalPreparation: {
      isolationOnly: true,
      productionFlag: null,
      productionPlanChanged: false,
      baselinePlanMaxFiles: 20,
      unionFileTopK: frozenCandidate.fileTopK,
      symbolTopK: frozenCandidate.symbolTopK,
      unionRerank: frozenCandidate.unionRerank,
      frozenCandidateSha256: frozenCandidate.candidateSha256,
      frozenCandidateRawSha256: frozenCandidate.rawSha256,
      lineEndingNormalization: frozenCandidate.lineEndingNormalization,
      payload: renderedAudit
        ? 'isolated C/S final Explore markdown rendered from the frozen candidate order and its fixed-seed permutation'
        : 'file candidates plus frozen retrieval metadata; no rendered Explore payload yet',
      limitation: renderedAudit
        ? 'The isolated rendered audit is diagnostic evidence only; any coverage, content-parity or budget failure remains incomplete.'
        : 'S shares the C payload object and permutes candidates only; this is not evidence of full rendered-payload parity.',
    },
    evidence: {
      coverageReport: coverage.evidencePath ?? path.relative(REPO, DEFAULT_COVERAGE).replace(/\\/g, '/'),
      coverageStatus: coverage.status,
      renderedArms: renderedAudit ? {
        report: renderedAudit.evidencePath,
        status: renderedAudit.status,
        seed: renderedAudit.seed,
        results: renderedAudit.results.map((result) => ({
          promptId: result.promptId,
          status: result.status,
          coverage: result.coverage,
          comparison: result.renderedComparison,
          error: result.error,
        })),
      } : { status: 'not-run' },
      coverage: coverage.results.map((result) => ({
        promptId: result.promptId,
        status: result.status,
        commitMatches: result.commitMatches,
        indexCoverage: result.indexCoverage,
        planCoverage: result.planCoverage,
      })),
      humanReview: reviewers
        ? `${reviewers.primaryRunReviewer} and ${reviewers.secondaryRunReviewer} are assigned as distinct Human run reviewers; no trajectory review or agreement result yet`
        : 'single-reviewer-two-passes; not two independent reviewers',
      des: desBaseline
        ? `Human-classified post-C Agent Sufficiency baseline ${desBaseline.runId}: ${desBaseline.conclusion}; DES has not passed and production C/S wiring remains blocked`
        : 'post-C Agent Sufficiency baseline has not run; production C/S wiring remains blocked',
    },
    limitations: [
      'Reservations are not attempts and consume zero paired-runs.',
      'Provider/model/effort are requested for preparation; runtime transcript readback remains UNSET before execution.',
      'Correctness non-inferiority remains UNSET and requires Human pre-registration.',
      'Index/tool coverage does not prove answer correctness or Agent Sufficiency.',
      'Isolated retrieval availability is not production wiring or DES evidence.',
      'No claim of unseen repositories or zero model-training contamination.',
    ],
  };
}

function parse(argv) {
  const options = { coverage: DEFAULT_COVERAGE, out: DEFAULT_OUT, desClassification: null, reviewerAssignment: null, renderedAudit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const key = { '--coverage': 'coverage', '--out': 'out', '--des-classification': 'desClassification', '--reviewer-assignment': 'reviewerAssignment', '--rendered-audit': 'renderedAudit' }[argv[i]];
    if (!key || !argv[i + 1]) throw new Error('Usage: node scripts/agent-eval/prepare-zra-pilot-manifest.mjs [--coverage <report.json>] [--out <manifest.json>] [--des-classification <human-record.json>] [--reviewer-assignment <human-record.json>] [--rendered-audit <local-report.json>]');
    options[key] = path.resolve(argv[++i]);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parse(process.argv.slice(2));
    const paths = resolvePreparationPaths(REPO, options);
    const coverage = JSON.parse(readFileSync(paths.coverage, 'utf8'));
    const renderedAudit = options.renderedAudit
      ? JSON.parse(readFileSync(options.renderedAudit, 'utf8')) : null;
    const manifest = prepareManifest({
      coverage: { ...coverage, evidencePath: path.relative(REPO, paths.coverage).replace(/\\/g, '/') },
      desBaseline: readHumanDesClassification(options.desClassification ?? DEFAULT_DES_CLASSIFICATION),
      reviewers: readHumanReviewerAssignment(options.reviewerAssignment ?? DEFAULT_REVIEWER_ASSIGNMENT),
      renderedAudit: renderedAudit ? {
        ...renderedAudit,
        evidencePath: path.relative(REPO, options.renderedAudit).replace(/\\/g, '/'),
      } : null,
    });
    const text = `${JSON.stringify(manifest, null, 2)}\n`;
    const reservationSha256 = createHash('sha256').update(JSON.stringify({
      scope: 'pilot', seed: manifest.seed, schedule: manifest.armOrders, blocks: manifest.blocks,
    })).digest('hex');
    if (reservationSha256 !== manifest.manifestSha256) throw new Error('manifest reservation digest verification failed');
    mkdirSync(path.dirname(paths.out), { recursive: true });
    writeFileSync(paths.out, text, 'utf8');
    console.log(JSON.stringify({ status: manifest.status, plannedRuns: manifest.plannedRuns, consumedRuns: manifest.consumedRuns, blockers: manifest.blockers, manifestSha256: manifest.manifestSha256, out: paths.out }, null, 2));
    if (manifest.status !== 'blocked') throw new Error('actual prerequisites unexpectedly became ready; Human review is required before execution');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
