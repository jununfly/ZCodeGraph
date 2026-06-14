#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distBin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
const defaultRustCore = path.join(
  repoRoot,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const PHASE1_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json']);
const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);

function usage() {
  console.log([
    'Usage: node scripts/rust-index-profile.mjs --repo <name>=<path> [--repo <name>=<path> ...] [--rust-core <path>]',
    '',
    'Examples:',
    '  npm run build && cargo build --package zcodegraph-core',
    '  node scripts/rust-index-profile.mjs --repo zcodegraph=.',
    '  node scripts/rust-index-profile.mjs --repo zcodegraph=. --repo excalidraw=/tmp/codegraph-corpus/excalidraw',
    '',
    'The profiler copies each repo to a temporary JavaScript/TypeScript slice,',
    'runs the opt-in Rust indexer, runs the TypeScript finalization pass when',
    'Rust produced files, and emits machine-readable JSON for comparing runs.',
    '',
    'Profile phases:',
    '  sourceScanMs',
    '  parseExtractionMs',
    '  sqliteWriteMs',
    '  typescriptFinalizationMs',
    '  subprocessStartupHandoffMs',
    '',
    'TypeScript finalization subphases:',
    '  frameworkPostExtractMs',
    '  referenceResolutionMs',
    '  dynamicDispatchSynthesisMs',
    '  dbMaintenanceMs',
    '',
    'Reference resolution breakdown:',
    '  importResolutionMs',
    '  nameMatchingMs',
    '  frameworkMatchingMs',
    '  databaseAccessMs',
    '  cacheWarmupMs',
    '  unresolvedReadMs',
    '  candidateLookupMs',
    '  sharedCandidateLookupMs',
    '  candidateLookupCacheHitMs',
    '  perReferenceDisambiguationMs',
    '  edgeMaterializationMs',
    '  edgeWriteMs',
    '  unresolvedCleanupMs',
    '  otherResolutionMs',
    '',
    'Memory evidence:',
    '  engines.typescript.peakRssBytes',
    '  engines.rust.peakRssBytes',
    '  engines.<engine>.rssUnavailableReason',
    '  RSS sampling may be unavailable when process-list access is sandboxed.',
  ].join('\n'));
}

function parseArgs(argv) {
  const repos = [];
  let rustCore = defaultRustCore;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, repos, rustCore };
    if (arg === '--repo') {
      const spec = argv[++i];
      if (!spec) throw new Error('--repo requires name=path');
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--repo must be name=path');
      repos.push({ name: spec.slice(0, eq), path: path.resolve(spec.slice(eq + 1)) });
      continue;
    }
    if (arg === '--rust-core') {
      const configured = argv[++i];
      if (!configured) throw new Error('--rust-core requires a path');
      rustCore = path.resolve(configured);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, repos, rustCore };
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed in ${cwd}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function copyPhase1Slice(source, label) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-profile-${label}-`));
  let copiedFiles = 0;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const src = path.join(current, entry.name);
      const rel = path.relative(source, src);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(src);
        continue;
      }
      if (!entry.isFile()) continue;

      const basename = path.basename(src);
      const ext = path.extname(src);
      if (!PHASE1_EXTENSIONS.has(ext) && !CONFIG_FILES.has(basename)) continue;

      const target = path.join(dest, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(src, target);
      copiedFiles++;
    }
  }

  walk(source);
  return { path: dest, copiedFiles };
}

function metadataFor(repoPath) {
  const commit = fs.existsSync(path.join(repoPath, '.git'))
    ? run('git', ['rev-parse', '--short', 'HEAD'], repoPath).stdout.trim()
    : null;
  return {
    sourcePath: repoPath,
    commit,
  };
}

function baseEnv(rustCore) {
  return {
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
    ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
  };
}

function indexWithMeasuredCli(project, engine, rustCore, CodeGraph) {
  CodeGraph.initSync(project).close();

  const args = [
    distBin,
    'index',
    project,
    '--force',
    '--quiet',
  ];
  const env = baseEnv(rustCore);
  if (engine === 'rust') {
    args.push('--engine', 'rust');
  }

  const startedAt = Date.now();
  return spawnMeasured(process.execPath, args, project, env).then((result) => {
    if (result.code !== 0) {
      throw new Error([
        `${process.execPath} ${args.join(' ')} failed in ${project}`,
        result.stdout,
        result.stderr,
      ].filter(Boolean).join('\n'));
    }

    return {
      engine,
      wallMs: Date.now() - startedAt,
      peakRssBytes: result.peakRssBytes,
      rssUnavailableReason: result.rssUnavailableReason,
    };
  });
}

function sampleProcessTreeRssBytes(rootPid) {
  if (!Number.isFinite(rootPid)) {
    return { peakRssBytes: null, unavailableReason: 'process pid is unavailable' };
  }
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf-8' });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    return {
      peakRssBytes: null,
      unavailableReason: /EPERM|operation not permitted/i.test(message)
        ? `RSS sampling unavailable: process-list access is sandboxed (${message})`
        : message,
    };
  }
  if (result.status !== 0) {
    const message = result.stderr?.trim() || '`ps -axo pid=,ppid=,rss=` failed';
    return {
      peakRssBytes: null,
      unavailableReason: /EPERM|operation not permitted/i.test(message)
        ? `RSS sampling unavailable: process-list access is sandboxed (${message})`
        : message,
    };
  }

  const rows = result.stdout.trim().split('\n').map((line) => {
    const [pid, ppid, rssKb] = line.trim().split(/\s+/).map(Number);
    return { pid, ppid, rssKb };
  }).filter((row) => Number.isFinite(row.pid) && Number.isFinite(row.ppid) && Number.isFinite(row.rssKb));
  if (rows.length === 0) {
    return { peakRssBytes: null, unavailableReason: 'process RSS sample returned no rows' };
  }

  const children = new Map();
  for (const row of rows) {
    const list = children.get(row.ppid) ?? [];
    list.push(row.pid);
    children.set(row.ppid, list);
  }

  const wanted = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift();
    for (const child of children.get(pid) ?? []) {
      if (wanted.has(child)) continue;
      wanted.add(child);
      queue.push(child);
    }
  }

  let totalKb = 0;
  for (const row of rows) {
    if (wanted.has(row.pid)) totalKb += row.rssKb;
  }
  return totalKb > 0
    ? { peakRssBytes: totalKb * 1024, unavailableReason: null }
    : { peakRssBytes: null, unavailableReason: 'process tree RSS sample was zero' };
}

function spawnMeasured(command, args, cwd, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let peakRssBytes = 0;
    let rssUnavailableReason = null;
    const sample = () => {
      const rss = sampleProcessTreeRssBytes(child.pid);
      if (rss.peakRssBytes != null && rss.peakRssBytes > peakRssBytes) {
        peakRssBytes = rss.peakRssBytes;
        rssUnavailableReason = null;
      } else if (peakRssBytes === 0 && rss.unavailableReason) {
        rssUnavailableReason = rss.unavailableReason;
      }
    };
    const timer = setInterval(sample, 50);
    sample();

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });
    child.on('close', (code, signal) => {
      sample();
      clearInterval(timer);
      resolve({
        code,
        signal,
        stdout,
        stderr,
        peakRssBytes: peakRssBytes || null,
        rssUnavailableReason: peakRssBytes > 0 ? null : (rssUnavailableReason ?? 'RSS sampling did not capture a live process tree'),
      });
    });
  });
}

async function loadDist() {
  if (!fs.existsSync(distBin)) {
    throw new Error('dist/bin/zcodegraph.js not found. Run npm run build first.');
  }
  const index = await import(path.join(repoRoot, 'dist', 'index.js'));
  const rustIndexer = await import(path.join(repoRoot, 'dist', 'indexing', 'rust-indexer.js'));
  return {
    CodeGraph: index.CodeGraph ?? index.default?.default ?? index.default,
    runRustIndexer: rustIndexer.runRustIndexer,
  };
}

async function profileRepo(repo, rustCore, dist) {
  const typescriptSlice = copyPhase1Slice(repo.path, `${repo.name}-typescript`);
  const measuredRustSlice = copyPhase1Slice(repo.path, `${repo.name}-rust-measured`);
  const slice = copyPhase1Slice(repo.path, `${repo.name}-rust-profile`);
  const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
  process.env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;

  try {
    const engines = {
      typescript: await indexWithMeasuredCli(typescriptSlice.path, 'typescript', rustCore, dist.CodeGraph),
      rust: await indexWithMeasuredCli(measuredRustSlice.path, 'rust', rustCore, dist.CodeGraph),
    };

    dist.CodeGraph.initSync(slice.path).close();
    const wallStarted = Date.now();
    const rustResult = await dist.runRustIndexer(slice.path, { force: true });
    let typescriptFinalizationMs = 0;
    let finalizationSubphases = {
      frameworkPostExtractMs: 0,
      referenceResolutionMs: 0,
      referenceResolutionBreakdown: {
        importResolutionMs: 0,
        nameMatchingMs: 0,
        frameworkMatchingMs: 0,
        databaseAccessMs: 0,
        cacheWarmupMs: 0,
        unresolvedReadMs: 0,
        candidateLookupMs: 0,
        sharedCandidateLookupMs: 0,
        candidateLookupCacheHitMs: 0,
        perReferenceDisambiguationMs: 0,
        edgeMaterializationMs: 0,
        edgeWriteMs: 0,
        unresolvedCleanupMs: 0,
        otherResolutionMs: 0,
      },
      dynamicDispatchSynthesisMs: 0,
      dbMaintenanceMs: 0,
    };
    let referenceResolutionBreakdown = finalizationSubphases.referenceResolutionBreakdown;

    if (rustResult.success && rustResult.filesIndexed > 0) {
      const finalizeStarted = Date.now();
      const cg = await dist.CodeGraph.open(slice.path);
      try {
        const finalized = await cg.finalizeRustIndex();
        rustResult.nodesCreated += finalized.nodesCreated;
        rustResult.edgesCreated += finalized.edgesCreated;
        finalizationSubphases = finalized.profile ?? finalizationSubphases;
        referenceResolutionBreakdown = finalizationSubphases.referenceResolutionBreakdown ?? referenceResolutionBreakdown;
      } finally {
        cg.destroy();
      }
      typescriptFinalizationMs = Date.now() - finalizeStarted;
    }

    const profile = {
      sourceScanMs: rustResult.profile?.sourceScanMs ?? 0,
      parseExtractionMs: rustResult.profile?.parseExtractionMs ?? 0,
      sqliteWriteMs: rustResult.profile?.sqliteWriteMs ?? 0,
      typescriptFinalizationMs,
      subprocessStartupHandoffMs: rustResult.profile?.subprocessStartupHandoffMs ?? 0,
    };

    return {
      name: repo.name,
      ...metadataFor(repo.path),
      profileSource: 'docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66',
      phase1CopiedFiles: slice.copiedFiles,
      tempProjectPath: slice.path,
      engines,
      wallMs: Date.now() - wallStarted,
      result: {
        success: rustResult.success,
        filesIndexed: rustResult.filesIndexed,
        filesSkipped: rustResult.filesSkipped,
        filesErrored: rustResult.filesErrored,
        nodesCreated: rustResult.nodesCreated,
        edgesCreated: rustResult.edgesCreated,
        durationMs: rustResult.durationMs,
        errors: rustResult.errors,
      },
      profile,
      finalizationSubphases,
      referenceResolutionBreakdown,
      dominantFinalizationSubphase: dominantSubphase(finalizationSubphases),
      dominantReferenceResolutionSubpath: dominantSubphase(referenceResolutionBreakdown),
    };
  } finally {
    if (previousRustCore === undefined) {
      delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    } else {
      process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
    }
  }
}

function dominantSubphase(subphases) {
  return Object.entries(subphases)
    .filter((entry) => typeof entry[1] === 'number')
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'frameworkPostExtractMs';
}

async function main() {
  const { help, repos, rustCore } = parseArgs(process.argv.slice(2));
  if (help) {
    usage();
    return;
  }
  if (repos.length === 0) throw new Error('At least one --repo name=path is required');
  if (!fs.existsSync(rustCore)) throw new Error(`${rustCore} not found. Run cargo build --package zcodegraph-core first or pass --rust-core.`);

  const dist = await loadDist();
  const results = [];
  for (const repo of repos) {
    results.push(await profileRepo(repo, rustCore, dist));
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    toolchain: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      rustc: run('rustc', ['--version'], repoRoot).stdout.trim(),
      cargo: run('cargo', ['--version'], repoRoot).stdout.trim(),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    rustCore,
    results,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
