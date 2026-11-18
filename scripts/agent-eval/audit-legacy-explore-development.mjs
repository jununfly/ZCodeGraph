#!/usr/bin/env node
// Observation-only slice 0 audit. No model, Agent, DES, pilot, C/S retrieval,
// repository-specific query rewrite, or production module is involved here.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadExploreDevelopmentContract } from './explore-development-contract.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORED_SNAPSHOT_DIRECTORIES = new Set(['.git', '.zcodegraph', 'node_modules']);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const outcome = (pass) => pass ? 'observed' : 'gap';

/** A recoverable parser gap limits graph completeness; it does not erase the
 * facts already indexed. Preserve its exact diagnostics rather than hiding a
 * partial graph behind either a clean-index or a no-result claim. */
export function legacyIndexStatus(indexResult) {
  if (!indexResult.success) {
    return { status: 'failed', errors: indexResult.errors, fatal: true };
  }
  if (indexResult.filesErrored > 0) {
    return {
      status: 'degraded', fatal: false, errors: indexResult.errors,
      observation: 'Usable graph retained with indexed-file diagnostics; no complete-index or claim-correctness claim.',
    };
  }
  return { status: 'complete', fatal: false, errors: indexResult.errors };
}

function renderedSource(answer) {
  const files = new Map();
  let current = null;
  let fenced = false;
  for (const line of answer.split('\n')) {
    const header = line.match(/^#### (.+?) —/);
    if (header && !fenced) {
      current = { numberedLines: new Set(), text: [] };
      files.set(header[1], current);
      continue;
    }
    if (!current) continue;
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) {
      current.text.push(line);
      const numbered = line.match(/^(\d+)\t/);
      if (numbered) current.numberedLines.add(Number(numbered[1]));
    } else if (/^### /.test(line)) current = null;
  }
  return files;
}

/** Inspect actual source blocks and anchor ranges, never infer semantic truth
 * from a file title. The claim stage remains unsupported in legacy Explore. */
export function inspectLegacyExploreTask({ task, graph, planResult, answer }) {
  const rendered = renderedSource(answer);
  const plannedFiles = new Set(planResult.sortedFiles.map(([file]) => file));
  const symbols = task.SOURCE_ANCHORS.symbols.map((anchor) => {
    const candidates = graph.getNodesInFile(anchor.file).filter((node) => node.name === anchor.name);
    const searchable = new Set(graph.searchNodes(anchor.query, { limit: 30 }).map(({ node }) => node.id));
    const matches = candidates.map((node) => {
      const block = rendered.get(node.filePath);
      const numberedSourcePresent = node.startLine > 0 && node.endLine >= node.startLine
        && Array.from({ length: node.endLine - node.startLine + 1 }, (_, index) => node.startLine + index)
          .every((line) => block?.numberedLines.has(line));
      return {
        id: node.id, kind: node.kind, startLine: node.startLine, endLine: node.endLine,
        searchable: searchable.has(node.id),
        discovered: planResult.subgraph.nodes.has(node.id),
        entry: planResult.entryNodeIds.has(node.id),
        onSpine: planResult.spine.pathNodeIds.has(node.id),
        related: planResult.subgraph.edges.some((edge) => edge.source === node.id || edge.target === node.id),
        sourceBlockPresent: Boolean(block),
        numberedSourcePresent,
      };
    });
    return { ...anchor, exactIdentityMatches: candidates.length, matches };
  });
  const files = task.SOURCE_ANCHORS.requiredFiles.map((file) => ({
    file,
    indexedNodeCount: graph.getNodesInFile(file).length,
    planned: plannedFiles.has(file),
    sourceBlockPresent: rendered.has(file),
  }));
  const anchorObserved = symbols.every((anchor) => anchor.matches.length > 0
    && anchor.matches.some((match) => match.searchable && match.discovered));
  const sourceObserved = symbols.every((anchor) => anchor.matches.some((match) => match.numberedSourcePresent));
  const hardCeiling = answer.includes('elided[output#') || answer.includes('(output truncated to budget');
  return {
    promptId: task.PROMPT_ID,
    commit: task.COMMIT,
    status: 'legacy-baseline-not-accepted',
    stages: {
      'anchor-discovery': {
        status: outcome(anchorObserved),
        observation: 'Exact file/name/range identities; discovery requires both search and the legacy plan.',
      },
      'path-composition': {
        status: 'not-assessed',
        observation: 'Legacy entry/spine/edge membership is recorded; no query obligation, typed path or runtime-order proof exists.',
      },
      'source-materialization': {
        status: outcome(sourceObserved),
        observation: 'The actual rendered block must include every numbered line of at least one exact anchor range.',
      },
      'budget-rendering': {
        status: hardCeiling ? 'truncated' : sourceObserved ? 'observed' : 'gap',
        hardCeiling,
        renderedFileCount: rendered.size,
        plannedFileCount: plannedFiles.size,
        observation: 'Observed legacy selection and final string ceiling; not an atom-level UTF-8 ledger.',
      },
      'claim-response': {
        status: 'unsupported',
        obligationLedger: 'not-implemented',
        claimEvidenceLinks: 'not-implemented',
        observation: 'No claim-level correctness, Agent Sufficiency or production admission conclusion can be derived.',
      },
    },
    files, symbols,
  };
}

async function prepareSnapshot({ entry, output }) {
  const sourceRoot = path.resolve(output, 'corpora', entry.directory);
  await mkdir(path.dirname(sourceRoot), { recursive: true });
  await cp(entry.root, sourceRoot, {
    recursive: true, errorOnExist: true, force: false,
    filter: (source) => !source.split(path.sep).some((part) => IGNORED_SNAPSHOT_DIRECTORIES.has(part)),
  });
  return sourceRoot;
}

export async function auditLegacyExploreDevelopment({ corpusRoot, output, onlyPromptId }) {
  const contract = loadExploreDevelopmentContract();
  if (onlyPromptId && !contract.tasks.some((task) => task.id === onlyPromptId)) {
    throw new Error(`unknown development prompt ID: ${onlyPromptId}`);
  }
  await mkdir(output, { recursive: true });
  const [{ CodeGraph }, { plan }, { render }, { buildExploreRenderModel },
    { CodeGraphExploreGraphRead, RootConfinedExploreSourceRead }, { readExploreRuntimeOptions }] = await Promise.all([
      import(pathToFileURL(path.join(REPO, 'dist/index.js')).href),
      import(pathToFileURL(path.join(REPO, 'dist/mcp/explore-planner.js')).href),
      import(pathToFileURL(path.join(REPO, 'dist/explore/renderer.js')).href),
      import(pathToFileURL(path.join(REPO, 'dist/explore/evidence.js')).href),
      import(pathToFileURL(path.join(REPO, 'dist/explore/ports.js')).href),
      import(pathToFileURL(path.join(REPO, 'dist/explore/runtime.js')).href),
    ]);
  const results = [];
  for (const entry of contract.tasks) {
    if (onlyPromptId && entry.id !== onlyPromptId) continue;
    const root = path.resolve(corpusRoot, entry.directory);
    const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });
    const actualCommit = head.status === 0 ? head.stdout.trim() : null;
    const tree = actualCommit ? spawnSync('git', ['-C', root, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }) : null;
    const sourceTreeSha256 = tree?.status === 0 ? tree.stdout.trim() : null;
    if (actualCommit !== entry.commit || !sourceTreeSha256) {
      results.push({ promptId: entry.id, actualCommit, status: 'incomplete', error: 'fixed corpus commit mismatch' });
      continue;
    }
    let graph;
    let snapshotRoot;
    let result;
    try {
      snapshotRoot = await prepareSnapshot({ entry: { ...entry, root }, output });
      graph = CodeGraph.initSync(snapshotRoot);
      const indexResult = await graph.indexAll();
      const indexStatus = legacyIndexStatus(indexResult);
      if (indexStatus.fatal) {
        throw new Error(`isolated default indexing failed: ${JSON.stringify(indexResult.errors)}`);
      }
      const runtime = readExploreRuntimeOptions();
      const planResult = await plan(graph, entry.task.PROMPT, { maxFiles: 20, runtime });
      const blastRadius = '';
      const model = buildExploreRenderModel(
        new CodeGraphExploreGraphRead(graph),
        new RootConfinedExploreSourceRead(planResult.projectRoot),
        planResult, blastRadius, runtime,
      );
      const answer = render(model);
      const stats = graph.getStats();
      result = {
        ...inspectLegacyExploreTask({ task: entry.task, graph, planResult, answer }),
        actualCommit, commitMatches: true, indexEngine: 'default', stats, indexStatus,
        indexResult: {
          success: indexResult.success, filesIndexed: indexResult.filesIndexed,
          filesErrored: indexResult.filesErrored, filesSkipped: indexResult.filesSkipped,
        },
        snapshot: {
          root: path.relative(REPO, snapshotRoot), database: '.zcodegraph/zcodegraph.db',
          sourceCommit: entry.commit, sourceTree: sourceTreeSha256,
        },
        answerSha256: sha256(answer),
        plan: {
          entryNodeIds: [...planResult.entryNodeIds], spineNodeIds: [...planResult.spine.pathNodeIds],
          maxFiles: planResult.maxFiles, maxOutputChars: planResult.budget.maxOutputChars,
          files: planResult.sortedFiles.map(([file]) => file),
          relationships: planResult.subgraph.edges.map(({ source, target, kind, edgeOrigin }) => ({ source, target, kind, edgeOrigin })),
        },
      };
      await writeFile(path.join(output, `${entry.id}.answer.md`), `${answer}\n`, 'utf8');
    } catch (error) {
      results.push({ promptId: entry.id, actualCommit, status: 'incomplete', error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (graph) await graph.closeAndWait();
    }
    if (result) {
      result.databaseSha256 = sha256(await readFile(path.join(snapshotRoot, '.zcodegraph', 'zcodegraph.db')));
      results.push(result);
    }
  }
  const report = {
    schema: 'explore-slice0-legacy-five-stage-audit-v1',
    status: results.length === contract.tasks.length && results.every((result) => result.status !== 'incomplete')
      ? 'legacy-baseline-recorded-not-accepted' : 'incomplete',
    contract: {
      schema: contract.schema, taskModuleSha256: contract.taskModuleSha256,
      executionRegistration: contract.executionRegistration,
      tasks: contract.tasks.map(({ task, ...identity }) => identity),
    },
    scope: 'Fresh isolated default indexes; read-only public planner/renderer; no C/S candidates, model, Agent, DES or pilot.',
    stageNames: ['anchor-discovery', 'path-composition', 'source-materialization', 'budget-rendering', 'claim-response'],
    selectedPromptId: onlyPromptId ?? null,
    results,
    selectedPromptStatus: onlyPromptId
      ? results.length === 1 && results[0].status !== 'incomplete'
        ? 'legacy-baseline-recorded-not-accepted' : 'incomplete'
      : null,
    limitations: [
      'Source and path observations are not claim-level correctness or universal semantic coverage.',
      'A degraded index retains exact parser diagnostics and a usable graph; it never counts as a complete index or accepted result.',
      'These fixed development tasks are not an unseen holdout and cannot authorize production admission.',
      '60 planned / 0 consumed and 96 pilot / 0 formal remain unchanged; production defaults and release blockers are unchanged.',
    ],
  };
  await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 && args.length !== 6 || args[0] !== '--corpus-root' || args[2] !== '--out'
      || args.length === 6 && args[4] !== '--prompt-id') {
    console.error('Usage: node scripts/agent-eval/audit-legacy-explore-development.mjs --corpus-root <dir> --out <fresh-directory> [--prompt-id <frozen-id>]');
    process.exitCode = 1;
  } else {
    try {
      const report = await auditLegacyExploreDevelopment({
        corpusRoot: path.resolve(args[1]), output: path.resolve(args[3]), onlyPromptId: args[5],
      });
      console.log(JSON.stringify({ status: report.status, results: report.results.map((result) => ({
        promptId: result.promptId, status: result.status, indexStatus: result.indexStatus, stages: result.stages, error: result.error,
      })) }, null, 2));
      if (report.selectedPromptId ? report.selectedPromptStatus === 'incomplete' : report.status === 'incomplete') process.exitCode = 2;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
