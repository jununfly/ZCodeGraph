#!/usr/bin/env node
// Preparation-only C/S audit. No model, agent adapter, paired ledger or production wiring.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSymbolIndex, symbolRecallFiles } from '../measure/symbol-index-core.mjs';
import { pilotTasks } from './task-prompts/zra-pilot-v1.mjs';
import { createIsolatedSymbolUnionRetrieval, verifyFrozenSymbolUnionCandidate } from './isolated-symbol-union.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = {
  'flask-session-response-trace-v1': 'pallets-flask',
  'django-csrf-view-trace-v1': 'django-django',
  'express-mounted-prototypes-trace-v1': 'expressjs-express',
  'gin-not-found-middleware-trace-v1': 'gin-gonic-gin',
  'spring-pet-update-persistence-trace-v1': 'spring-projects-spring-petclinic',
};
const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const sorted = (values) => [...values].sort();

function compareRenderedAnswers(c, s) {
  const sourceMarker = '### Source Code';
  const source = (answer) => {
    const position = answer.indexOf(sourceMarker);
    if (position < 0) throw new Error('rendered answer has no Source Code section');
    return { prefix: answer.slice(0, position), body: answer.slice(position) };
  };
  const blocks = (answer) => {
    const body = source(answer).body;
    const headers = [...body.matchAll(/^#### (.+?)(?: — [^\n]*)?$/gm)];
    const found = new Map();
    for (const [index, match] of headers.entries()) {
      const start = match.index;
      const end = headers[index + 1]?.index ?? body.length;
      const file = match[1];
      if (found.has(file)) throw new Error(`duplicate rendered file block: ${file}`);
      found.set(file, source(answer).body.slice(start, end));
    }
    return found;
  };
  const left = blocks(c);
  const right = blocks(s);
  const leftFiles = [...left.keys()];
  const rightFiles = [...right.keys()];
  const contentDifferences = sorted(leftFiles.filter((file) => left.get(file) !== right.get(file)));
  return {
    schema: 'markdown-explore-source-blocks-v1',
    nonSourcePrefixIdentical: source(c).prefix === source(s).prefix,
    cFileOrder: leftFiles,
    sFileOrder: rightFiles,
    fileSetsEqual: JSON.stringify(sorted(leftFiles)) === JSON.stringify(sorted(rightFiles)),
    onlyInC: sorted(leftFiles.filter((file) => !right.has(file))),
    onlyInS: sorted(rightFiles.filter((file) => !left.has(file))),
    contentDifferences,
    cHardCeiling: c.includes('elided[output#'),
    sHardCeiling: s.includes('elided[output#'),
    cSha256: sha256(c),
    sSha256: sha256(s),
    wholeTextEqual: c === s,
  };
}

function coverage(requiredFiles, candidates, rendered, symbolsFound) {
  const requirements = requiredFiles.map(({ file, indexed }) => ({
    file, indexed, candidate: candidates.includes(file), rendered: rendered.includes(file),
  }));
  return {
    requirements,
    symbols: symbolsFound,
    indexCoverage: requirements.every((entry) => entry.indexed) && symbolsFound.every((entry) => entry.found)
      ? 'pass' : 'incomplete',
    candidateCoverage: requirements.every((entry) => entry.candidate) ? 'pass' : 'incomplete',
    renderedSourceCoverage: requirements.every((entry) => entry.rendered) ? 'pass' : 'incomplete',
  };
}

async function loadModules() {
  const dist = async (file) => import(pathToFileURL(path.join(REPO, 'dist', file)).href);
  return {
    ...(await dist('index.js')),
    ...(await dist('mcp/explore-planner.js')),
    ...(await dist('mcp/c-explore-plan.js')),
    ...(await dist('mcp/render-c-explore-plan.js')),
    ...(await dist('mcp/tools.js')),
    ...(await dist('eval/zra-paired-core.js')),
  };
}

export async function auditPilotRenderedArms({ corpusRoot, output }) {
  if (!corpusRoot || !output) throw new Error('corpusRoot and output are required');
  const { CodeGraph, plan, composeSymbolOnlyPlan, render, ToolHandler, permuteWithFixedSeed } = await loadModules();
  const results = [];
  for (const task of pilotTasks) {
    const root = path.resolve(corpusRoot, CORPORA[task.PROMPT_ID]);
    const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    const actualCommit = head.status === 0 ? head.stdout.trim() : null;
    const commitMatches = actualCommit === task.COMMIT;
    if (!commitMatches) {
      results.push({ promptId: task.PROMPT_ID, actualCommit, commitMatches, status: 'incomplete', error: 'fixed corpus commit does not match' });
      continue;
    }
    const indexPath = path.join(output, 'symbol-index', `${CORPORA[task.PROMPT_ID]}.db`);
    mkdirSync(path.dirname(indexPath), { recursive: true });
    buildSymbolIndex({ dbPath: path.join(root, '.zcodegraph', 'zcodegraph.db'), indexPath });
    const sourceDbSha256 = createHash('sha256').update(readFileSync(path.join(root, '.zcodegraph', 'zcodegraph.db'))).digest('hex');
    const symbolIndexSha256 = createHash('sha256').update(readFileSync(indexPath)).digest('hex');
    let cg;
    try {
      cg = CodeGraph.openSync(root);
      const baseline = await plan(cg, task.PROMPT, { maxFiles: 20 });
      const retrieval = createIsolatedSymbolUnionRetrieval({
        planBaseline: async () => baseline,
        symbolRecall: async () => symbolRecallFiles(task.PROMPT, indexPath),
      });
      const cRetrieval = await retrieval({ arm: 'C', config: { query: task.PROMPT } });
      const sCandidates = permuteWithFixedSeed(cRetrieval.candidates, 20261112);
      const handler = new ToolHandler(cg);
      const renderArm = (candidates) => {
        const composed = composeSymbolOnlyPlan(cg, baseline, candidates);
        const blastRadius = composed.budget.includeBlastRadius === false ? ''
          : handler.buildBlastRadiusSection(cg, composed.subgraph);
        return render(composed, cg, composed.spine, blastRadius);
      };
      const cAnswer = renderArm(cRetrieval.candidates);
      const sAnswer = renderArm(sCandidates);
      const compare = compareRenderedAnswers(cAnswer, sAnswer);
      const requiredFiles = task.SOURCE_ANCHORS.requiredFiles.map((file) => ({
        file, indexed: cg.getNodesInFile(file).length > 0,
      }));
      const symbols = task.SOURCE_ANCHORS.symbols.map((anchor) => ({
        ...anchor,
        found: cg.searchNodes(anchor.query, { limit: 30 }).some(({ node }) =>
          node.name === anchor.name && node.filePath === anchor.file),
      }));
      const cFiles = cRetrieval.candidates.map(([file]) => file);
      const report = {
        promptId: task.PROMPT_ID,
        actualCommit,
        commitMatches,
        sourceDbSha256,
        symbolIndexSha256,
        candidateSha256: verifyFrozenSymbolUnionCandidate().candidateSha256,
        baselineFiles: baseline.sortedFiles.map(([file]) => file),
        symbolFiles: cRetrieval.payload.symbolFiles,
        cCandidates: cFiles,
        sCandidates: sCandidates.map(([file]) => file),
        coverage: coverage(requiredFiles, cFiles, compare.cFileOrder, symbols),
        renderedComparison: compare,
      };
      const pass = report.coverage.indexCoverage === 'pass'
        && report.coverage.candidateCoverage === 'pass'
        && report.coverage.renderedSourceCoverage === 'pass'
        && compare.nonSourcePrefixIdentical && compare.fileSetsEqual
        && compare.contentDifferences.length === 0
        && !compare.cHardCeiling && !compare.sHardCeiling;
      results.push({ ...report, status: pass ? 'pass' : 'incomplete' });
      writeFileSync(path.join(output, `${task.PROMPT_ID}-rendered.json`), `${JSON.stringify({ c: cAnswer, s: sAnswer }, null, 2)}\n`, 'utf8');
    } catch (error) {
      results.push({
        promptId: task.PROMPT_ID, actualCommit, commitMatches, status: 'incomplete',
        sourceDbSha256, symbolIndexSha256, error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      cg?.close();
    }
  }
  return {
    schemaVersion: '1.0',
    kind: 'zra-pilot-isolated-c-s-rendered-audit',
    scope: 'preparation-only local renderer audit; no models, agents, paired-runs or production wiring',
    seed: 20261112,
    status: results.every((result) => result.status === 'pass') ? 'pass' : 'incomplete',
    results,
    limitations: [
      'Candidate presence and source-block parity are not answer-correctness or Agent Sufficiency evidence.',
      'Only fixed-seed file/block order may differ between C and S; hard-ceiling truncation is a preparation failure.',
      'This diagnostic alone does not change the combined five-corpus coverage readiness.',
    ],
  };
}

function parse(argv) {
  const options = { corpusRoot: '', out: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--corpus-root' && argv[i + 1]) options.corpusRoot = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) options.out = argv[++i];
    else throw new Error('Usage: node scripts/agent-eval/audit-pilot-rendered-arms.mjs --corpus-root <dir> --out <local-report-directory>');
  }
  if (!options.corpusRoot || !options.out) throw new Error('corpus root and local report directory are required');
  return { corpusRoot: path.resolve(options.corpusRoot), output: path.resolve(options.out) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parse(process.argv.slice(2));
    const relative = path.relative(REPO, options.output).replace(/\\/g, '/');
    if (relative.split('/')[0] === 're' + 'search' || relative.split('/')[0] === 'discussions') {
      throw new Error('rendered preparation evidence must stay outside formal research assets');
    }
    mkdirSync(options.output, { recursive: true });
    const report = await auditPilotRenderedArms(options);
    const out = path.join(options.output, 'report.json');
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: report.status, out, results: report.results.map((result) => ({
      promptId: result.promptId, status: result.status, coverage: result.coverage,
      missingCandidates: result.coverage?.requirements.filter((entry) => !entry.candidate).map((entry) => entry.file),
      missingRendered: result.coverage?.requirements.filter((entry) => !entry.rendered).map((entry) => entry.file),
      comparison: result.renderedComparison, error: result.error,
    })) }, null, 2));
    if (report.status !== 'pass') process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
