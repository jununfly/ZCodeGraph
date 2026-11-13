// Evaluation-only snapshot-bound C Explore MCP server. Production flags/ranking
// are not registered or changed; only the Explore tool is replaced here.
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSymbolIndex, symbolRecallFiles } from '../measure/symbol-index-core.mjs';
import { verifyFrozenSymbolUnionCandidate } from './isolated-symbol-union.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function hash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function modules() {
  return Promise.all([
    import(pathToFileURL(path.join(REPO, 'dist/index.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist/mcp/tools.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist/mcp/session.js')).href),
    import(pathToFileURL(path.join(REPO, 'dist/mcp/transport.js')).href),
  ]);
}

function candidateEvidence(prepared, query, answer, calls, symbolIndexPath) {
  return {
    kind: 'snapshot-bound-c-explore-v1',
    retrievalArm: 'C',
    snapshotFingerprint: prepared.snapshotFingerprint,
    candidateSha256: prepared.candidateSha256,
    query,
    answer,
    answerSha256: hash(answer),
    symbolIndexPath,
    calls,
  };
}

/** A thin ToolHandler wrapper: only Explore changes; every other tool delegates. */
function evaluationHandler(ToolHandler, cg, prepared) {
  const handler = new ToolHandler(cg);
  const execute = handler.execute.bind(handler);
  handler.execute = async (name, args) => {
    if (name !== 'zcodegraph_explore') return execute(name, args);
    if (args.projectPath !== undefined) throw new Error('post-C snapshot rejects projectPath overrides');
    if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 10000) {
      return { content: [{ type: 'text', text: 'query is required and must be at most 10000 characters' }], isError: true };
    }
    const recall = symbolRecallFiles(args.query, prepared.symbolIndexPath);
    const result = await prepared.planBaseline(cg, args.query, { maxFiles: args.maxFiles });
    const retrieval = prepared.createIsolatedSymbolUnionRetrieval({
      planBaseline: async () => result,
      symbolRecall: async () => recall,
    });
    const retrieved = await retrieval({ arm: 'C', config: { query: args.query } });
    const mergedPlan = prepared.composeSymbolOnlyPlan(cg, result, retrieved.candidates);
    const answer = prepared.render(mergedPlan, cg, mergedPlan.spine,
      mergedPlan.budget.includeBlastRadius === false ? ''
        : handler.buildBlastRadiusSection(cg, mergedPlan.subgraph));
    const call = {
      query: args.query,
      files: retrieved.candidates.map(([file]) => file),
      symbolOnlyFiles: retrieved.candidates
        .filter(([file]) => !result.fileGroups.has(file)).map(([file]) => file),
      answerSha256: hash(answer),
    };
    prepared.calls.push(call);
    prepared.lastEvidence = candidateEvidence(
      prepared, args.query, answer, [...prepared.calls], prepared.symbolIndexPath,
    );
    await writeFile(path.join(prepared.evidenceDir, `${hash(answer)}.json`),
      `${JSON.stringify(prepared.lastEvidence, null, 2)}\n`, 'utf8');
    return handler.textResult(answer);
  };
  return handler;
}

async function createRuntime(cwd, env) {
  const snapshotFingerprint = env.ZCG_EVAL_SNAPSHOT_FINGERPRINT;
  const candidateSha256 = env.ZCG_EVAL_CANDIDATE_SHA256;
  const evidenceDir = env.ZCG_EVAL_EVIDENCE_DIR ?? await mkdtemp(path.join(tmpdir(), 'zcg-post-c-evidence-'));
  if (!/^[0-9a-f]{64}$/.test(snapshotFingerprint ?? '')
      || !/^[0-9a-f]{64}$/.test(candidateSha256 ?? '')) {
    throw new Error('post-C server requires snapshot fingerprint, candidate hash and evidence directory');
  }
  const verified = verifyFrozenSymbolUnionCandidate();
  if (verified.candidateSha256 !== candidateSha256) {
    throw new Error('post-C server candidate does not match the frozen configuration');
  }
  const resolvedEvidence = path.resolve(evidenceDir);
  if (resolvedEvidence.startsWith(`${path.resolve(cwd)}${path.sep}`)
      || resolvedEvidence === path.resolve(cwd)) {
    throw new Error('post-C evidence and symbol index must be outside the snapshot corpus');
  }
  await mkdir(resolvedEvidence, { recursive: true });
  const [{ CodeGraph }, tools, { MCPSession }, { StdioTransport }] = await modules();
  const { plan } = await import(pathToFileURL(path.join(REPO, 'dist/mcp/explore-planner.js')).href);
  const { render } = await import(pathToFileURL(path.join(REPO, 'dist/mcp/render-c-explore-plan.js')).href);
  const { createIsolatedSymbolUnionRetrieval } = await import('./isolated-symbol-union.mjs');
  const { composeSymbolOnlyPlan } = await import(pathToFileURL(path.join(REPO, 'dist/mcp/c-explore-plan.js')).href);
  const cg = CodeGraph.openSync(cwd);
  if (typeof cg.findRelevantContext !== 'function') {
    throw new Error('post-C server did not open a CodeGraph instance');
  }
  const preparationPath = env.ZCG_EVAL_PREPARATION_PATH;
  if (!preparationPath || path.dirname(path.resolve(preparationPath)) !== resolvedEvidence) {
    throw new Error('post-C server requires the preparation record in its evidence directory');
  }
  const preparation = JSON.parse(await readFile(preparationPath, 'utf8'));
  const symbolIndexPath = path.resolve(preparation.symbolIndexPath ?? '');
  if (preparation.kind !== 'snapshot-bound-c-explore-preparation-v1'
      || preparation.retrievalArm !== 'C'
      || preparation.snapshotFingerprint !== snapshotFingerprint
      || preparation.candidateSha256 !== candidateSha256
      || preparation.evidenceDir !== resolvedEvidence
      || symbolIndexPath !== path.join(resolvedEvidence, 'symbol-index.db')) {
    throw new Error('post-C runtime preparation does not match the snapshot/candidate/index');
  }
  const sourceDbSha256 = hash(await readFile(path.join(cwd, '.zcodegraph', 'zcodegraph.db')));
  if (preparation.sourceDbSha256 !== sourceDbSha256
      || preparation.symbolIndexSha256 !== hash(await readFile(symbolIndexPath))) {
    throw new Error('post-C runtime index is not bound to the prepared snapshot database');
  }
  const prepared = {
    snapshotFingerprint, candidateSha256, symbolIndexPath,
    evidenceDir: resolvedEvidence,
    planBaseline: plan, createIsolatedSymbolUnionRetrieval,
    composeSymbolOnlyPlan, render, calls: [], lastEvidence: null,
  };
  const handler = evaluationHandler(tools.ToolHandler, cg, prepared);
  const transport = new StdioTransport({ exitOnClose: false });
  const session = new MCPSession(transport, {
    setProgressSink() {},
    getToolHandler() { return handler; },
    ensureInitialized() { return Promise.resolve(); },
    retryInitializeSync() {},
    hasDefaultCodeGraph() { return true; },
    getProjectPath() { return cwd; },
  }, { explicitProjectPath: cwd });
  return {
    prepared,
    start() { session.start(); },
    async close() {
      session.stop();
      await cg.closeAndWait();
    },
  };
}

export async function preparePostCExplore({ corpusDir, env }) {
  const snapshotFingerprint = env.ZCG_EVAL_SNAPSHOT_FINGERPRINT;
  const candidateSha256 = env.ZCG_EVAL_CANDIDATE_SHA256;
  const verified = verifyFrozenSymbolUnionCandidate();
  if (!/^[0-9a-f]{64}$/.test(snapshotFingerprint ?? '')
      || verified.candidateSha256 !== candidateSha256) {
    throw new Error('post-C preparation requires the frozen candidate and snapshot fingerprint');
  }
  const evidenceDir = await mkdtemp(path.join(tmpdir(), 'zcg-post-c-evidence-'));
  const [{ CodeGraph }] = await modules();
  const cg = CodeGraph.openSync(corpusDir);
  const symbolIndexPath = buildSymbolIndex({
    dbPath: path.join(corpusDir, '.zcodegraph', 'zcodegraph.db'),
    indexPath: path.join(evidenceDir, 'symbol-index.db'),
  });
  await cg.closeAndWait();
  const prepared = {
    kind: 'snapshot-bound-c-explore-preparation-v1',
    retrievalArm: 'C',
    snapshotFingerprint,
    candidateSha256,
    sourceDbSha256: hash(await readFile(path.join(corpusDir, '.zcodegraph', 'zcodegraph.db'))),
    symbolIndexPath,
    symbolIndexSha256: hash(await readFile(symbolIndexPath)),
    evidenceDir,
  };
  const preparationPath = path.join(evidenceDir, 'preparation.json');
  await writeFile(preparationPath, `${JSON.stringify(prepared, null, 2)}\n`, 'utf8');
  return { ...prepared, preparationPath };
}

async function main() {
  const prepare = process.argv[2] === '--prepare';
  if (prepare) {
    const prepared = await preparePostCExplore({ corpusDir: process.cwd(), env: process.env });
    process.stdout.write(`${JSON.stringify(prepared)}\n`);
    return;
  }
  const runtime = await createRuntime(process.cwd(), process.env);
  runtime.start();
  const close = async () => {
    const evidence = runtime.prepared.lastEvidence;
    if (evidence) {
      await writeFile(path.join(process.env.ZCG_EVAL_EVIDENCE_DIR, 'latest.json'),
        `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    }
    await runtime.close();
  };
  process.stdin.once('close', () => {
    void close().then(() => { process.exit(0); });
  });
}

process.once('uncaughtException', (error) => {
  process.stderr.write(`post-C uncaught exception: ${error.stack ?? error}\n`);
  process.exit(1);
});
process.once('unhandledRejection', (error) => {
  process.stderr.write(`post-C unhandled rejection: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});

await (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  ? main()
  : Promise.resolve());
