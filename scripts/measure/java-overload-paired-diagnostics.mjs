#!/usr/bin/env node
/**
 * Temporary Java overload performance diagnostic, not the architecture gate.
 *
 * Measures three arms in one process on one runner:
 *   before:            53474b7 TypeScript + 53474b7 native
 *   after:             827bfa1 TypeScript + 827bfa1 native
 *   afterTsBeforeCore: 827bfa1 TypeScript + 53474b7 native
 *
 * No baseline, threshold, production source, or formal CI behavior is changed.
 * Every sample requires a successful full graph and a released OS index lease.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED = Object.freeze({
  before: '53474b753c60ad459151fef45fd257fba6f809b2',
  after: '827bfa18d57e269c431aa44835dd399a95afef34',
});
const CORPUS_REF = '500158f732419217507c7656904b8e6aa1bcc0d6';
const QUERIES = Object.freeze([
  'How does the owner controller reach the vet visit service?',
  'callers of OwnerRepository.save',
]);
const ORDER = Object.freeze([
  ['before', 'after', 'afterTsBeforeCore'],
  ['afterTsBeforeCore', 'before', 'after'],
  ['after', 'afterTsBeforeCore', 'before'],
]);

export function parseArgs(argv) {
  const args = { builds: null, corpus: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!['--builds', '--corpus', '--out'].includes(flag)) {
      throw new Error(`unknown argument: ${flag}`);
    }
    const key = flag.slice(2);
    if (args[key] !== null || !argv[i + 1]) throw new Error(`invalid ${flag}`);
    args[key] = path.resolve(argv[++i]);
  }
  for (const key of Object.keys(args)) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  return args;
}

export function orderForBlock(block) {
  if (!Number.isInteger(block) || block < 1 || block > 9) throw new Error('invalid block');
  return ORDER[(block - 1) % ORDER.length];
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function median(values) {
  if (values.length === 0 || values.length % 2 === 0) throw new Error('expected odd non-empty sample');
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

function roundMs(value) {
  return Math.round(value * 10) / 10;
}

function roundPercent(value) {
  return Math.round(value * 1000) / 10;
}

function summarize(values) {
  return {
    medianMs: median(values),
    rangeMs: [Math.min(...values), Math.max(...values)],
    runsMs: values,
  };
}

export function createArms(args) {
  const arms = {};
  for (const source of ['before', 'after']) {
    const root = path.join(args.builds, source);
    arms[source] = {
      revision: EXPECTED[source],
      cliRevision: EXPECTED[source],
      nativeRevision: EXPECTED[source],
      root,
      cli: path.join(root, 'dist', 'bin', 'zcodegraph.js'),
      native: path.join(root, 'target', 'debug', 'zcodegraph-core'),
      repo: path.join(args.corpus, source),
    };
  }
  const crossRoot = path.join(args.builds, 'cross-after-before-native');
  arms.afterTsBeforeCore = {
    ...arms.after,
    root: crossRoot,
    cli: path.join(crossRoot, 'dist', 'bin', 'zcodegraph.js'),
    nativeRevision: EXPECTED.before,
    native: path.join(crossRoot, 'target', 'debug', 'zcodegraph-core'),
    repo: path.join(args.corpus, 'after-ts-before-native'),
  };
  return arms;
}

export function verifyArmProvenance(name, arm) {
  for (const [kind, revision, marker] of [
    ['cli', arm.cliRevision, path.join(arm.root, '.zcg-diagnostic-revision')],
    ['native', arm.nativeRevision, path.join(path.dirname(arm.native), '.zcg-native-revision')],
  ]) {
    const actual = fs.readFileSync(marker, 'utf8').trim();
    if (actual !== revision) throw new Error(`${name} ${kind} source mismatch: ${actual}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    NODE_OPTIONS: '',
    ZCG_ALLOW_UNSAFE_NODE: '1',
    ZCG_NO_DAEMON: '1',
    ZCG_NO_RELAUNCH: '1',
  };
  delete env.ZCG_ENABLE_JAVA_OVERLOAD;
  delete env.ZCG_RUST_CORE_BINARY;

  const arms = createArms(args);

  const report = {
    schemaVersion: 1,
    diagnostic: 'java-overload-paired-v1',
    notArchitectureGate: true,
    protocol: {
      repetitions: 9,
      warmupPerArm: 1,
      indexOrder: 'three-arm Latin rotation; each arm occupies each position three times',
      exploreOrder: 'same block rotation, alternating query order',
      javaOverload: 'ZCG_ENABLE_JAVA_OVERLOAD unset; default false',
      build: 'cargo build --package zcodegraph-core (debug)',
      fullIndexPerSample: true,
    },
    revisions: EXPECTED,
    corpus: { repo: 'spring-projects/spring-petclinic', ref: CORPUS_REF },
    environment: {
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      runner: process.env.RUNNER_NAME ?? null,
      runnerImage: process.env.ImageOS ?? null,
    },
    arms,
    discovery: {},
    indexWarmups: [],
    index: [],
    explore: [],
  };
  const save = () => fs.writeFileSync(args.out, JSON.stringify(report, null, 2));

  function run(command, commandArgs, cwd) {
    try {
      return execFileSync(command, commandArgs, {
        cwd,
        env,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (error) {
      throw new Error(`command failed (${error.status}): ${command}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`);
    }
  }

  for (const [name, arm] of Object.entries(arms)) {
    verifyArmProvenance(name, arm);
    const moduleUrl = new URL(`file://${path.join(arm.root, 'dist', 'indexing', 'rust-indexer.js')}`).href;
    const script = `import {findRustCoreCommand,findLeaseHelperCommand} from ${JSON.stringify(moduleUrl)};console.log(JSON.stringify({index:findRustCoreCommand(),lease:findLeaseHelperCommand()}));`;
    const found = JSON.parse(run(process.execPath, ['--input-type=module', '-e', script], arm.root));
    for (const [kind, command] of Object.entries(found)) {
      if (path.resolve(command.command) !== path.resolve(arm.native)) {
        throw new Error(`${name} ${kind} selected wrong native: ${command.command}`);
      }
    }
    report.discovery[name] = { ...found, nativeSha256: sha256(fs.readFileSync(arm.native)) };
  }

  function index(name, block, warmup) {
    const arm = arms[name];
    const store = path.join(arm.repo, '.zcodegraph');
    if (fs.existsSync(store)) {
      const suffix = `${process.pid}-${process.hrtime.bigint()}`;
      fs.mkdirSync(path.join(args.builds, 'completed-stores'), { recursive: true });
      fs.renameSync(store, path.join(args.builds, 'completed-stores', `${name}-${block}-${suffix}`));
    }
    const started = performance.now();
    const stdout = run(process.execPath, [arm.cli, 'index', arm.repo], arm.repo);
    const wallMs = performance.now() - started;
    const diagnostic = JSON.parse(fs.readFileSync(path.join(store, 'diagnostics', 'last-run.json'), 'utf8'));
    const result = diagnostic.result;
    const status = diagnostic.statusSummary;
    const receipt = {
      exitCode: diagnostic.exitCode,
      success: result?.success,
      files: result?.filesIndexed,
      skipped: result?.filesSkipped,
      errors: result?.filesErrored,
      nodes: result?.nodesCreated,
      edges: result?.edgesCreated,
      statusFiles: status?.fileCount,
      statusNodes: status?.nodeCount,
      statusEdges: status?.edgeCount,
    };
    const expectedReceipt = {
      exitCode: 0, success: true, files: 77, skipped: 0, errors: 0,
      nodes: 1138, edges: 1963, statusFiles: 77, statusNodes: 1138, statusEdges: 1963,
    };
    if (JSON.stringify(receipt) !== JSON.stringify(expectedReceipt)) {
      throw new Error(`${name} block ${block}: incomplete graph ${JSON.stringify(receipt)}`);
    }
    const lease = JSON.parse(run(arm.native, ['index-lease', '--project-path', arm.repo, '--diagnose-json'], arm.repo));
    if (lease.state !== 'not-locked') throw new Error(`${name}: lease not released ${JSON.stringify(lease)}`);
    const row = {
      arm: name,
      block,
      wallMs: roundMs(wallMs),
      ...receipt,
      diagnosticElapsedMs: diagnostic.elapsedMs,
      javaParseMs: diagnostic.profile?.rustCore?.parseByLanguage?.java?.parseExtractionMs,
      javaAstMs: diagnostic.profile?.rustCore?.parseByLanguage?.java?.astExtractionMs,
      sqliteWriteMs: diagnostic.profile?.rustCore?.sqliteWriteMs,
      dbBytes: fs.statSync(path.join(store, 'zcodegraph.db')).size,
      stdoutSha256: sha256(stdout),
      leaseState: lease.state,
    };
    (warmup ? report.indexWarmups : report.index).push(row);
    save();
    console.log(`${warmup ? 'warmup' : 'index'} block=${block} arm=${name} wall=${row.wallMs}ms graph=${row.files}/${row.nodes}/${row.edges}`);
  }

  function explore(name, block, queryIndex) {
    const arm = arms[name];
    const started = performance.now();
    const stdout = run(process.execPath, [arm.cli, 'explore', QUERIES[queryIndex]], arm.repo);
    const wallMs = performance.now() - started;
    if (!stdout.trim()) throw new Error(`${name}: empty explore output`);
    report.explore.push({
      arm: name, block, queryIndex, query: QUERIES[queryIndex], wallMs: roundMs(wallMs),
      stdoutBytes: Buffer.byteLength(stdout), stdoutSha256: sha256(stdout),
    });
    save();
  }

  for (const name of ['after', 'before', 'afterTsBeforeCore']) index(name, 0, true);
  for (let block = 1; block <= 9; block++) {
    for (const name of orderForBlock(block)) index(name, block, false);
  }
  for (let block = 1; block <= 9; block++) {
    const queryIndexes = block % 2 ? [0, 1] : [1, 0];
    for (const queryIndex of queryIndexes) {
      for (const name of orderForBlock(block)) explore(name, block, queryIndex);
    }
  }

  report.summary = {};
  for (const name of Object.keys(arms)) {
    const indexRows = report.index.filter((row) => row.arm === name);
    const exploreRows = report.explore.filter((row) => row.arm === name);
    report.summary[name] = {
      index: summarize(indexRows.map((row) => row.wallMs)),
      explore: summarize(exploreRows.map((row) => row.wallMs)),
      javaParse: summarize(indexRows.map((row) => row.javaParseMs)),
      javaAst: summarize(indexRows.map((row) => row.javaAstMs)),
      sqliteWrite: summarize(indexRows.map((row) => row.sqliteWriteMs)),
      dbBytes: [...new Set(indexRows.map((row) => row.dbBytes))],
      exploreOutputHashes: Object.fromEntries(QUERIES.map((_, queryIndex) => [
        queryIndex,
        [...new Set(exploreRows.filter((row) => row.queryIndex === queryIndex).map((row) => row.stdoutSha256))],
      ])),
    };
  }
  report.summary.comparisons = {
    afterVsBeforeIndexPercent: roundPercent((report.summary.after.index.medianMs / report.summary.before.index.medianMs - 1) * 100),
    afterVsBeforeExplorePercent: roundPercent((report.summary.after.explore.medianMs / report.summary.before.explore.medianMs - 1) * 100),
    afterTsBeforeCoreVsBeforeIndexPercent: roundPercent((report.summary.afterTsBeforeCore.index.medianMs / report.summary.before.index.medianMs - 1) * 100),
  };
  for (let queryIndex = 0; queryIndex < QUERIES.length; queryIndex++) {
    const hashes = new Set(report.explore.filter((row) => row.queryIndex === queryIndex).map((row) => row.stdoutSha256));
    if (hashes.size !== 1) throw new Error(`explore output mismatch for query ${queryIndex}: ${[...hashes]}`);
  }
  save();
  console.log(JSON.stringify(report.summary, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
