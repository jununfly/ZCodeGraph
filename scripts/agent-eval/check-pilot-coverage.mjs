#!/usr/bin/env node
// Read-only public-seam inspection. No adapters, models, or pilot-runs.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = {
  'flask-session-response-trace-v1': 'pallets-flask',
  'django-csrf-view-trace-v1': 'django-django',
  'express-mounted-prototypes-trace-v1': 'expressjs-express',
  'gin-not-found-middleware-trace-v1': 'gin-gonic-gin',
  'spring-pet-update-persistence-trace-v1': 'spring-projects-spring-petclinic',
};

/** Search and plan coverage are distinct; neither proves answer correctness. */
export function inspectTaskCoverage(cg, planResult, task) {
  const stats = cg.getStats();
  const plannedFiles = planResult.sortedFiles.map(([file]) => file);
  const requiredFiles = task.SOURCE_ANCHORS.requiredFiles.map((file) => {
    const indexedNodes = cg.getNodesInFile(file);
    return { file, indexed: indexedNodes.length > 0, indexedNodeCount: indexedNodes.length, planned: plannedFiles.includes(file) };
  });
  const symbols = task.SOURCE_ANCHORS.symbols.map((anchor) => {
    const matches = cg.searchNodes(anchor.query, { limit: 30 })
      .map(({ node }) => ({ name: node.name, kind: node.kind, file: node.filePath }))
      .filter((node) => node.name === anchor.name && node.file === anchor.file);
    return { ...anchor, found: matches.length > 0, matches };
  });
  const indexCoverage = requiredFiles.every((entry) => entry.indexed)
    && symbols.every((entry) => entry.found) ? 'pass' : 'incomplete';
  const planCoverage = requiredFiles.every((entry) => entry.planned) ? 'pass' : 'incomplete';
  return {
    promptId: task.PROMPT_ID,
    commit: task.COMMIT,
    stats,
    indexCoverage,
    planCoverage,
    status: indexCoverage === 'pass' && planCoverage === 'pass' ? 'pass' : 'incomplete',
    plannedFiles,
    requiredFiles,
    symbols,
    externalBoundaries: task.SOURCE_ANCHORS.externalBoundaries ?? [],
  };
}

function usage() {
  return `Usage:
  node scripts/agent-eval/check-pilot-coverage.mjs --check --corpus-root <dir> [--out <report.json>]

Checks all five fixed snapshots using CodeGraph.openSync/getStats/getNodesInFile/
searchNodes and the public explore plan(). No source or index is modified.`;
}

function parse(argv) {
  const options = { check: false, corpusRoot: '', out: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--check') { options.check = true; continue; }
    if (argv[i] === '--corpus-root' && argv[i + 1]) { options.corpusRoot = argv[++i]; continue; }
    if (argv[i] === '--out' && argv[i + 1]) { options.out = argv[++i]; continue; }
    throw new Error(`unknown/incomplete argument: ${argv[i]}`);
  }
  if (!options.check || !options.corpusRoot) throw new Error(usage());
  return options;
}

async function check(options) {
  const [{ CodeGraph }, { plan }, { pilotTasks }] = await Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist/index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist/mcp/explore-planner.js')).href),
    import(pathToFileURL(path.join(REPO, 'scripts/agent-eval/task-prompts/zra-pilot-v1.mjs')).href),
  ]);
  const results = [];
  for (const task of pilotTasks) {
    const directory = CORPORA[task.PROMPT_ID];
    const root = path.resolve(options.corpusRoot, directory);
    const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    const actualCommit = head.status === 0 ? head.stdout.trim() : null;
    let cg;
    try {
      cg = CodeGraph.openSync(root);
      const planResult = await plan(cg, task.PROMPT, { maxFiles: 20 });
      results.push({
        ...inspectTaskCoverage(cg, planResult, task),
        directory: root,
        actualCommit,
        commitMatches: actualCommit === task.COMMIT,
      });
    } catch (error) {
      results.push({
        promptId: task.PROMPT_ID, directory: root, actualCommit,
        commitMatches: actualCommit === task.COMMIT,
        status: 'error', error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      cg?.close();
    }
  }
  return {
    schemaVersion: '1.0',
    kind: 'zra-pilot-index-tool-coverage',
    scope: 'pre-execution public-seam inspection; no model runs; no consumed paired-runs',
    status: results.every((result) => result.status === 'pass' && result.commitMatches) ? 'pass' : 'incomplete',
    results,
    limitations: [
      'Index and plan coverage do not prove answer correctness or DES sufficiency.',
      'Plan coverage is not a release gate and cannot replace Human review.',
      'No claim of unseen repositories or zero model-training contamination.',
    ],
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  if (process.argv.length === 2) console.log(usage());
  else {
    try {
      const options = parse(process.argv.slice(2));
      const report = await check(options);
      const text = `${JSON.stringify(report, null, 2)}\n`;
      if (options.out) {
        const output = path.resolve(options.out);
        mkdirSync(path.dirname(output), { recursive: true });
        writeFileSync(output, text, 'utf8');
        console.log(JSON.stringify({ status: report.status, out: output, tasks: report.results.map((r) => ({ promptId: r.promptId, status: r.status, commitMatches: r.commitMatches, indexCoverage: r.indexCoverage, planCoverage: r.planCoverage, missingPlanFiles: r.requiredFiles?.filter((f) => !f.planned).map((f) => f.file) })) }, null, 2));
      } else process.stdout.write(text);
      if (report.status !== 'pass') process.exitCode = 2;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
