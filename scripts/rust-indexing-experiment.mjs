#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultRustCore = path.join(
  repoRoot,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const PHASE1_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json']);
const SKIP_DIRS = new Set(['.git', '.zcodegraph', 'node_modules', 'dist', 'target', '.next', 'coverage']);
const SUPPORTED_GRAPH_WORK_PROFILES = new Set(['full', 'matched-ts-js']);

const SUPPORTED_TOP_LEVEL_FIELDS = new Set([
  'schemaVersion',
  'experimentId',
  'kind',
  'arms',
  'sourceCopy',
  'targets',
  'metrics',
  'outputs',
  'rust',
]);

function printHelp() {
  console.log(`Usage: node scripts/rust-indexing-experiment.mjs --experiment <file> --out <file> --summary-out <file>

Run a formal Rust indexing A/B experiment from a manifest.

Options:
  --experiment <file>   Manifest JSON file
  --out <file>          Raw artifact JSON file
  --summary-out <file>  Decision summary draft Markdown file
  --fail-on-required-gate-failure
                       Return 2 when completed experiment classification starts with failed-required-
  --help                Show this help
`);
}

function parseArgs(argv) {
  const args = { experiment: null, out: null, summaryOut: null, failOnRequiredGateFailure: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--experiment') {
      args.experiment = argv[++i] ?? null;
    } else if (arg === '--out') {
      args.out = argv[++i] ?? null;
    } else if (arg === '--summary-out') {
      args.summaryOut = argv[++i] ?? null;
    } else if (arg === '--fail-on-required-gate-failure') {
      args.failOnRequiredGateFailure = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function diagnostic(kind, message, details = {}) {
  return { kind, message, ...details };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateString(value, field, diagnostics) {
  if (typeof value !== 'string' || value.length === 0) {
    diagnostics.push(diagnostic('invalid-manifest-field', `${field} must be a non-empty string`, { field }));
    return false;
  }
  return true;
}

function validateTargetPath(target, index, diagnostics) {
  const hasPathEnv = typeof target.pathEnv === 'string' && target.pathEnv.length > 0;
  const hasPathFallback = typeof target.pathFallback === 'string' && target.pathFallback.length > 0;
  if (!hasPathEnv && !hasPathFallback) {
    diagnostics.push(
      diagnostic('invalid-target-path', `targets[${index}] must define pathEnv or pathFallback`, {
        field: `targets[${index}]`,
      }),
    );
    return false;
  }
  return true;
}

function validateGraphWorkProfile(value, field, diagnostics) {
  if (value == null) return null;
  if (typeof value !== 'string' || !SUPPORTED_GRAPH_WORK_PROFILES.has(value)) {
    diagnostics.push(
      diagnostic('unsupported-graph-work-profile', `Unsupported graph work profile at ${field}; supported profiles: full, matched-ts-js`, {
        field,
        supported: Array.from(SUPPORTED_GRAPH_WORK_PROFILES),
        value,
      }),
    );
    return null;
  }
  return value;
}

function validateMetrics(metrics, diagnostics) {
  if (metrics === undefined) {
    return {};
  }
  if (!isPlainObject(metrics)) {
    diagnostics.push(diagnostic('invalid-metrics', 'metrics must be an object', { field: 'metrics' }));
    return metrics;
  }
  if (metrics.thresholds !== undefined) {
    if (!isPlainObject(metrics.thresholds)) {
      diagnostics.push(diagnostic('invalid-metrics-thresholds', 'metrics.thresholds must be an object', { field: 'metrics.thresholds' }));
      return metrics;
    }
    for (const field of ['wallTimeImprovementPct', 'peakRssReductionPct', 'maxOtherMetricRegressionPct']) {
      if (metrics.thresholds[field] !== undefined && typeof metrics.thresholds[field] !== 'number') {
        diagnostics.push(
          diagnostic('invalid-metrics-threshold', `metrics.thresholds.${field} must be a number`, {
            field: `metrics.thresholds.${field}`,
          }),
        );
      }
    }
  }
  return metrics;
}

function validateManifest(manifest) {
  const diagnostics = [];
  const unknownFields = [];

  if (!isPlainObject(manifest)) {
    diagnostics.push(diagnostic('invalid-manifest', 'Manifest must be a JSON object'));
    return { valid: false, normalized: null, diagnostics, unknownFields };
  }

  for (const key of Object.keys(manifest)) {
    if (!SUPPORTED_TOP_LEVEL_FIELDS.has(key)) {
      unknownFields.push(key);
    }
  }

  if (manifest.schemaVersion !== 1) {
    diagnostics.push(diagnostic('unsupported-schema-version', 'schemaVersion must be 1', { field: 'schemaVersion' }));
  }
  validateString(manifest.experimentId, 'experimentId', diagnostics);
  if (manifest.kind !== 'indexing-ab') {
    diagnostics.push(diagnostic('unsupported-experiment-kind', 'kind must be indexing-ab', { field: 'kind' }));
  }

  if (!Array.isArray(manifest.arms)) {
    diagnostics.push(diagnostic('invalid-arms', 'arms must be an array containing exactly typescript and rust', { field: 'arms' }));
  } else {
    const uniqueArms = new Set(manifest.arms);
    const expected = ['typescript', 'rust'];
    const unsupported = manifest.arms.filter((arm) => !expected.includes(arm));
    const missing = expected.filter((arm) => !uniqueArms.has(arm));
    if (manifest.arms.length !== 2 || uniqueArms.size !== 2 || unsupported.length > 0 || missing.length > 0) {
      diagnostics.push(
        diagnostic('unsupported-arms', 'arms must contain exactly typescript and rust', {
          field: 'arms',
          unsupported,
          missing,
        }),
      );
    }
  }

  if (!isPlainObject(manifest.sourceCopy)) {
    diagnostics.push(diagnostic('invalid-source-copy', 'sourceCopy must be an object', { field: 'sourceCopy' }));
  } else {
    if (manifest.sourceCopy.mode !== 'js-ts-config-slice') {
      diagnostics.push(
        diagnostic('unsupported-source-copy-mode', 'sourceCopy.mode must be js-ts-config-slice', { field: 'sourceCopy.mode' }),
      );
    }
    if (manifest.sourceCopy.isolation !== 'per-arm') {
      diagnostics.push(
        diagnostic('unsupported-source-copy-isolation', 'sourceCopy.isolation must be per-arm', {
          field: 'sourceCopy.isolation',
        }),
      );
    }
  }

  const experimentGraphWorkProfile = validateGraphWorkProfile(manifest.rust?.graphWorkProfile, 'rust.graphWorkProfile', diagnostics);

  if (!Array.isArray(manifest.targets)) {
    diagnostics.push(diagnostic('invalid-targets', 'targets must be an array', { field: 'targets' }));
  } else {
    const seenTargets = new Set();
    manifest.targets.forEach((target, index) => {
      if (!isPlainObject(target)) {
        diagnostics.push(diagnostic('invalid-target', `targets[${index}] must be an object`, { field: `targets[${index}]` }));
        return;
      }
      if (validateString(target.name, `targets[${index}].name`, diagnostics)) {
        if (seenTargets.has(target.name)) {
          diagnostics.push(
            diagnostic('duplicate-target-name', `Duplicate target name: ${target.name}`, {
              field: `targets[${index}].name`,
              targetName: target.name,
            }),
          );
        }
        seenTargets.add(target.name);
      }
      validateTargetPath(target, index, diagnostics);
      validateGraphWorkProfile(target.arms?.rust?.graphWorkProfile, `targets[${index}].arms.rust.graphWorkProfile`, diagnostics);
    });
  }

  const metrics = validateMetrics(manifest.metrics ?? {}, diagnostics);

  const normalized = {
    schemaVersion: 1,
    experimentId: manifest.experimentId,
    kind: 'indexing-ab',
    arms: ['typescript', 'rust'],
    sourceCopy: {
      mode: manifest.sourceCopy?.mode,
      isolation: manifest.sourceCopy?.isolation,
    },
    rust: {
      graphWorkProfile: experimentGraphWorkProfile,
    },
    targets: Array.isArray(manifest.targets) ? manifest.targets : [],
    metrics,
    outputs: isPlainObject(manifest.outputs) ? manifest.outputs : {},
  };

  return { valid: diagnostics.length === 0, normalized, diagnostics, unknownFields };
}

function ensureParentDir(file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

function writeJson(file, value) {
  ensureParentDir(file);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function formatSignedNumber(value) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  return value > 0 ? `+${value}` : `${value}`;
}

function graphKindDeltas(tsKinds = {}, rustKinds = {}) {
  const kinds = Array.from(new Set([...Object.keys(tsKinds), ...Object.keys(rustKinds)])).sort();
  return kinds.map((kind) => {
    const typescript = tsKinds[kind] ?? 0;
    const rust = rustKinds[kind] ?? 0;
    return { kind, typescript, rust, delta: rust - typescript };
  });
}

function wallTimeDiagnosticsLines(target) {
  return ['typescript', 'rust'].map((engine) => {
    const timings = target.arms[engine].execution.timingsMs ?? {};
    return `| ${target.name} | ${engine} | ${timings.sourceCopy ?? 'n/a'} | ${timings.init ?? 'n/a'} | ${timings.index ?? 'n/a'} | ${timings.graphStats ?? 'n/a'} | ${timings.total ?? target.arms[engine].execution.elapsedMs ?? 'n/a'} |`;
  });
}

function rustIndexProfileRows(target) {
  const profile = target.arms.rust.execution.indexProfile;
  if (!profile) return [];
  const rows = [];
  for (const [phase, value] of Object.entries(profile.rustCore ?? {})) {
    if (typeof value === 'number') rows.push([target.name, phase, value]);
  }
  for (const [phase, value] of Object.entries(profile.finalize ?? {})) {
    if (typeof value === 'number') rows.push([target.name, phase, value]);
  }
  if (typeof profile.typescriptFinalizationMs === 'number') rows.push([target.name, 'typescriptFinalizationMs', profile.typescriptFinalizationMs]);
  return rows;
}

function graphParitySummaryLines(target) {
  const tsStats = target.arms.typescript.graphStats;
  const rustStats = target.arms.rust.graphStats;
  if (!tsStats || !rustStats) {
    return [`### ${target.name} graphStats parity`, '', 'GraphStats parity unavailable because one or both arms did not produce graph stats.', ''];
  }
  const nodeDeltas = graphKindDeltas(tsStats.nodeKinds, rustStats.nodeKinds);
  const edgeDeltas = graphKindDeltas(tsStats.edgeKinds, rustStats.edgeKinds);
  return [
    `### ${target.name} graphStats parity`,
    '',
    `Totals: files ${tsStats.fileCount} → ${rustStats.fileCount} (${formatSignedNumber(rustStats.fileCount - tsStats.fileCount)}); nodes ${tsStats.nodeCount} → ${rustStats.nodeCount} (${formatSignedNumber(rustStats.nodeCount - tsStats.nodeCount)}); edges ${tsStats.edgeCount} → ${rustStats.edgeCount} (${formatSignedNumber(rustStats.edgeCount - tsStats.edgeCount)}).`,
    '',
    'Node kind deltas',
    '',
    '| Kind | TypeScript | Rust | Delta |',
    '|---|---:|---:|---:|',
    ...(nodeDeltas.length > 0 ? nodeDeltas.map((row) => `| ${row.kind} | ${row.typescript} | ${row.rust} | ${formatSignedNumber(row.delta)} |`) : ['| n/a | 0 | 0 | 0 |']),
    '',
    'Edge kind deltas',
    '',
    '| Kind | TypeScript | Rust | Delta |',
    '|---|---:|---:|---:|',
    ...(edgeDeltas.length > 0 ? edgeDeltas.map((row) => `| ${row.kind} | ${row.typescript} | ${row.rust} | ${formatSignedNumber(row.delta)} |`) : ['| n/a | 0 | 0 | 0 |']),
    '',
  ];
}

function graphWorkProfileSummaryLines(targets) {
  const rows = targets.map((target) => {
    const profile = target.arms.rust.graphWorkProfile;
    return `| ${target.name} | ${profile.effective} | ${profile.source} |`;
  });
  return [
    '## Rust graph work profiles',
    '',
    '| Target | Effective profile | Source |',
    '|---|---|---|',
    ...rows,
    '',
    '`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.',
    '',
  ];
}

function writeSummary(file, artifact, manifestPath) {
  ensureParentDir(file);
  const requiredPerformanceGateUnmet = artifact.targets.some(
    (target) => target.requiredForDecision !== false && target.classification === 'target-failed-performance-gate-unmet',
  );
  const stressOnlyExperiment = artifact.targets.length > 0 && artifact.targets.every((target) => target.requiredForDecision === false);
  const lines = [
    '# Rust Indexing Core Phase 14 Decision Summary Draft',
    '',
    `Experiment: ${artifact.experimentId}`,
    `Manifest: ${manifestPath}`,
    `Classification: ${artifact.classification}`,
    '',
    '## Target matrix',
    '',
    '| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |',
    '|---|---|---:|---|---|---|---|',
    ...artifact.targets.map((target) => `| ${target.name} | ${target.targetClass} | ${target.requiredForDecision ? 'yes' : 'no'} | ${target.preflight.status}${target.preflight.kind ? ` (${target.preflight.kind})` : ''} | ${target.arms.typescript.execution.status} | ${target.arms.rust.execution.status} | ${target.classification} |`),
    '',
    '## Preflight summary',
    '',
    `Experiment preflight: ${artifact.preflight.status}`,
    `Rust core: ${artifact.preflight.rustCore?.available ? 'available' : 'unavailable'} (${artifact.preflight.rustCore?.path ?? 'n/a'})`,
    '',
    ...graphWorkProfileSummaryLines(artifact.targets),
    '## Arm availability and graph stats',
    '',
    ...artifact.targets.flatMap((target) => [
      `### ${target.name}`,
      '',
      `- TypeScript: ${target.arms.typescript.graphAvailable ? 'graph available' : 'graph unavailable'}; stats: ${JSON.stringify(target.arms.typescript.graphStats)}`,
      `- Rust: ${target.arms.rust.graphAvailable ? 'graph available' : 'graph unavailable'}; stats: ${JSON.stringify(target.arms.rust.graphStats)}`,
      '',
    ]),
    '## GraphStats parity',
    '',
    ...artifact.targets.flatMap((target) => graphParitySummaryLines(target)),
    '## Metrics',
    '',
    ...artifact.targets.map((target) => `- ${target.name}: wallTimeDeltaPct=${target.gates.performance.wallTimeDeltaPct}, peakRssDeltaPct=${target.gates.performance.peakRssDeltaPct}`),
    '',
    '## Wall-time diagnostics',
    '',
    '| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...artifact.targets.flatMap((target) => wallTimeDiagnosticsLines(target)),
    '',
    '## Rust index profile breakdown',
    '',
    '| Target | Phase | Duration ms |',
    '|---|---|---:|',
    ...artifact.targets.flatMap((target) => {
      const rows = rustIndexProfileRows(target);
      return rows.length > 0 ? rows.map(([name, phase, value]) => `| ${name} | ${phase} | ${value} |`) : [`| ${target.name} | n/a | n/a |`];
    }),
    '',
    '## Gates',
    '',
    ...artifact.targets.map((target) => `- ${target.name}: sufficiency=${target.gates.sufficiency.status}; performance=${target.gates.performance.status}`),
    '',
    '## Regressions',
    '',
    ...artifact.targets.flatMap((target) => target.gates.sufficiency.regressions.length > 0 ? target.gates.sufficiency.regressions.map((regression) => `- ${target.name}: ${regression}`) : [`- ${target.name}: none recorded`]),
    '',
    '## Classifications',
    '',
    ...artifact.targets.map((target) => `- ${target.name}: ${target.classification}`),
    `- experiment: ${artifact.classification}`,
    '',
    '## Rollout recommendation draft',
    '',
    ...(requiredPerformanceGateUnmet ? ['Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.'] : []),
    ...(stressOnlyExperiment ? ['No required targets are present; stress targets are diagnostic and do not claim rollout readiness.'] : []),
    'Rust default rollout readiness is not claimed by this generated draft.',
    '',
  ];
  fs.writeFileSync(file, `${lines.join('\n')}`);
}

function optionalCommandVersion(command, args) {
  try {
    const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf-8' });
    if (result.status !== 0) return null;
    return result.stdout.trim();
  } catch {
    return null;
  }
}

function getGitCommit(targetPath) {
  if (!fs.existsSync(path.join(targetPath, '.git'))) return null;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: targetPath, encoding: 'utf-8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function childMaxBufferBytes() {
  const configured = Number.parseInt(process.env.ZCODEGRAPH_EXPERIMENT_CHILD_MAX_BUFFER_BYTES ?? '', 10);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return 64 * 1024 * 1024;
}

function runCommand(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
    maxBuffer: childMaxBufferBytes(),
  });
}

function childProcessFailureDetails(result) {
  return {
    status: result.status,
    signal: result.signal,
    errorCode: result.error?.code,
    errorMessage: result.error?.message,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
  };
}

function measuredPeakRssBytes(engine) {
  const envKey = engine === 'rust' ? 'ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES' : 'ZCODEGRAPH_EXPERIMENT_FAKE_TYPESCRIPT_PEAK_RSS_BYTES';
  const override = process.env[envKey];
  if (override !== undefined) {
    const parsed = Number.parseInt(override, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const rss = process.memoryUsage().rss;
  return Number.isFinite(rss) && rss > 0 ? rss : null;
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function elapsedSince(startedAt) {
  return Math.max(0, Date.now() - startedAt);
}

function dominantTimingPhase(timings) {
  const entries = Object.entries(timings ?? {}).filter(([phase]) => phase !== 'total');
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best), entries[0]);
}

function phaseTimingDeltas(tsTimings = {}, rustTimings = {}) {
  return ['sourceCopy', 'init', 'index', 'graphStats'].map((phase) => ({
    phase,
    typescriptMs: tsTimings[phase] ?? 0,
    rustMs: rustTimings[phase] ?? 0,
    deltaMs: (rustTimings[phase] ?? 0) - (tsTimings[phase] ?? 0),
  }));
}

function dominantRegressionPhase(tsTimings, rustTimings) {
  const deltas = phaseTimingDeltas(tsTimings, rustTimings);
  const dominant = deltas.reduce((best, row) => (row.deltaMs > best.deltaMs ? row : best), deltas[0]);
  return dominant && dominant.deltaMs > 0 ? dominant : null;
}

function tail(text, max = 4000) {
  if (!text) return '';
  return text.length <= max ? text : text.slice(text.length - max);
}

function copySourceSlice(source, engine) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-rust-experiment-${engine}-`));
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
      copiedFiles += 1;
    }
  }

  walk(source);
  return {
    path: dest,
    copiedFiles,
    mode: 'js-ts-config-slice',
    skipped: false,
  };
}

function collectGraphStats(project) {
  const dbFile = path.join(project, '.zcodegraph', 'zcodegraph.db');
  if (fs.existsSync(dbFile)) {
    const queryScript = `
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const db = new DatabaseSync(process.argv[1]);
function count(sql) { return db.prepare(sql).get().c; }
function countsByKind(table) {
  const rows = db.prepare(\`select kind, count(*) as c from \${table} group by kind order by kind\`).all();
  return Object.fromEntries(rows.map((row) => [row.kind, row.c]));
}
console.log(JSON.stringify({
  fileCount: count('select count(*) as c from files'),
  nodeCount: count('select count(*) as c from nodes'),
  edgeCount: count('select count(*) as c from edges'),
  nodeKinds: countsByKind('nodes'),
  edgeKinds: countsByKind('edges'),
  dbSizeBytes: fs.statSync(process.argv[1]).size,
}));
db.close();
`;
    const queryResult = runCommand(process.execPath, ['-e', queryScript, dbFile], project);
    if (queryResult.status === 0) {
      try {
        return JSON.parse(queryResult.stdout);
      } catch {}
    }
  }
  const statusResult = runCommand(process.execPath, [path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js'), 'status', project, '--json'], project);
  if (statusResult.status !== 0) return null;
  try {
    const parsed = JSON.parse(statusResult.stdout);
    if (parsed.initialized === false) return null;
    return {
      fileCount: parsed.fileCount ?? 0,
      nodeCount: parsed.nodeCount ?? 0,
      edgeCount: parsed.edgeCount ?? 0,
      nodeKinds: {},
      edgeKinds: {},
      dbSizeBytes: parsed.dbSizeBytes ?? 0,
    };
  } catch {
    return null;
  }
}

function indexArm(target, engine, rustCoreInfo) {
  const arm = target.arms[engine];
  if (target.preflight.status !== 'available' || arm.preflight.status !== 'available') return;

  const started = Date.now();
  if (process.env.ZCODEGRAPH_EXPERIMENT_FAKE_RUST_SUCCESS === '1' && engine === 'rust') {
    const sourceCopyStarted = Date.now();
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    const elapsedMs = Number.parseInt(process.env.ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS || '1', 10);
    if (process.env.ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PROFILE) {
      try {
        arm.execution.indexProfile = JSON.parse(process.env.ZCODEGRAPH_EXPERIMENT_FAKE_RUST_PROFILE);
      } catch {
        arm.execution.diagnostics.push(diagnostic('rust-index-profile-parse-failed', 'Failed to parse fake Rust index profile'));
      }
    }
    arm.execution.elapsedMs = elapsedMs;
    arm.execution.timingsMs = {
      sourceCopy: elapsedSince(sourceCopyStarted),
      init: 0,
      index: elapsedMs,
      graphStats: 0,
      total: elapsedMs,
    };
    arm.execution.peakRssBytes = measuredPeakRssBytes(engine);
    arm.execution.status = 'completed';
    arm.indexing.status = 'completed';
    arm.graphStats = {
      fileCount: arm.sourceCopy.copiedFiles,
      nodeCount: 1,
      edgeCount: 1,
      nodeKinds: { function: 1 },
      edgeKinds: { contains: 1 },
      dbSizeBytes: 0,
    };
    arm.graphAvailable = true;
    return;
  }
  if (process.env.ZCODEGRAPH_EXPERIMENT_FAIL_ENGINE === engine) {
    const sourceCopyStarted = Date.now();
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    arm.execution.elapsedMs = Date.now() - started;
    arm.execution.timingsMs = {
      sourceCopy: elapsedSince(sourceCopyStarted),
      init: 0,
      index: 0,
      graphStats: 0,
      total: arm.execution.elapsedMs,
    };
    arm.execution.peakRssBytes = measuredPeakRssBytes(engine);
    arm.execution.status = 'failed';
    arm.execution.diagnostics.push(diagnostic('forced-engine-failure', `Forced ${engine} indexing failure`));
    arm.indexing.status = 'failed';
    arm.graphAvailable = false;
    return;
  }
  try {
    const sourceCopyStarted = Date.now();
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    const timingsMs = {
      sourceCopy: elapsedSince(sourceCopyStarted),
      init: 0,
      index: 0,
      graphStats: 0,
      total: 0,
    };
    const bin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
    const initStarted = Date.now();
    const initResult = runCommand(process.execPath, [bin, 'init', arm.sourceCopy.path], arm.sourceCopy.path);
    timingsMs.init = elapsedSince(initStarted);
    if (initResult.status !== 0 || initResult.error) {
      arm.execution.status = 'failed';
      arm.execution.diagnostics.push(diagnostic('init-process-failed', `Init failed for ${target.name}:${engine}`, childProcessFailureDetails(initResult)));
      arm.indexing.status = 'failed';
      arm.graphAvailable = false;
      return;
    }
    const args = [bin, 'index', arm.sourceCopy.path, '--force', '--quiet'];
    const env = {};
    let indexProfileFile = null;
    if (engine === 'rust') {
      args.push('--engine', 'rust', '--graph-work-profile', arm.graphWorkProfile.effective);
      env.ZCODEGRAPH_RUST_CORE_BINARY = rustCoreInfo.path;
      indexProfileFile = path.join(arm.sourceCopy.path, '.zcodegraph', 'rust-index-profile.json');
      env.ZCODEGRAPH_INDEX_PROFILE_OUT = indexProfileFile;
    }
    arm.command = {
      executable: process.execPath,
      args,
      cwd: arm.sourceCopy.path,
      nodeVersion: process.version,
      env,
    };
    arm.execution.status = 'running';
    const indexStarted = Date.now();
    const result = runCommand(process.execPath, args, arm.sourceCopy.path, env);
    timingsMs.index = elapsedSince(indexStarted);
    arm.execution.elapsedMs = Date.now() - started;
    timingsMs.total = arm.execution.elapsedMs;
    arm.execution.timingsMs = timingsMs;
    arm.execution.peakRssBytes = measuredPeakRssBytes(engine);
    if (result.status !== 0 || result.error) {
      arm.execution.status = 'failed';
      arm.execution.diagnostics.push(diagnostic('index-process-failed', `Indexing failed for ${target.name}:${engine}`, childProcessFailureDetails(result)));
      arm.indexing.status = 'failed';
      arm.graphAvailable = false;
      return;
    }
    arm.execution.status = 'completed';
    arm.indexing.status = 'completed';
    if (indexProfileFile) {
      arm.execution.indexProfile = readJsonIfExists(indexProfileFile);
      if (!arm.execution.indexProfile) {
        arm.execution.diagnostics.push(diagnostic('missing-rust-index-profile', 'Rust index profile was not emitted by the CLI'));
      }
    }
    const graphStatsStarted = Date.now();
    arm.graphStats = collectGraphStats(arm.sourceCopy.path) ?? {
      fileCount: arm.sourceCopy.copiedFiles,
      nodeCount: 0,
      edgeCount: 0,
      nodeKinds: {},
      edgeKinds: {},
      dbSizeBytes: 0,
    };
    timingsMs.graphStats = elapsedSince(graphStatsStarted);
    timingsMs.total = arm.execution.elapsedMs;
    arm.graphAvailable = true;
  } catch (error) {
    arm.execution.elapsedMs = Date.now() - started;
    arm.execution.timingsMs = arm.execution.timingsMs ?? { sourceCopy: 0, init: 0, index: 0, graphStats: 0, total: arm.execution.elapsedMs };
    arm.execution.peakRssBytes = measuredPeakRssBytes(engine);
    arm.execution.status = 'failed';
    arm.execution.diagnostics.push(diagnostic('index-exception', error instanceof Error ? error.message : String(error)));
    arm.indexing.status = 'failed';
    arm.graphAvailable = false;
  }
}

function computeDeltaPct(base, candidate) {
  if (!Number.isFinite(base) || !Number.isFinite(candidate) || base === 0) return null;
  return ((candidate - base) / base) * 100;
}

function applyGates(target, thresholds) {
  const ts = target.arms.typescript;
  const rust = target.arms.rust;
  if (ts.graphAvailable && rust.graphAvailable) {
    target.gates.sufficiency = { status: 'passed', regressions: [] };
  } else {
    target.gates.sufficiency = {
      status: 'unavailable',
      regressions: [],
      diagnostics: [diagnostic('comparison-requires-both-arms', 'Sufficiency comparison requires both arms to be graph-available')],
    };
  }

  if (ts.execution.status !== 'completed' || rust.execution.status !== 'completed') {
    target.gates.performance = {
      status: 'unavailable',
      wallTimeDeltaPct: null,
      peakRssDeltaPct: null,
      diagnostics: [diagnostic('performance-requires-both-arms', 'Performance comparison requires both arms to complete')],
    };
    return;
  }

  const wallTimeDeltaPct = computeDeltaPct(ts.execution.elapsedMs, rust.execution.elapsedMs);
  const peakRssDeltaPct = computeDeltaPct(ts.execution.peakRssBytes, rust.execution.peakRssBytes);
  const diagnostics = [];
  if (peakRssDeltaPct == null) diagnostics.push(diagnostic('missing-peak-rss', 'Peak RSS was not collected for one or both arms'));
  const tsDominant = dominantTimingPhase(ts.execution.timingsMs);
  const rustDominant = dominantTimingPhase(rust.execution.timingsMs);
  if (rustDominant) {
    diagnostics.push(
      diagnostic('wall-time-phase-dominant', `Dominant Rust wall-time phase is ${rustDominant[0]}`, {
        arm: 'rust',
        phase: rustDominant[0],
        elapsedMs: rustDominant[1],
      }),
    );
  }
  if (tsDominant) {
    diagnostics.push(
      diagnostic('wall-time-phase-dominant', `Dominant TypeScript wall-time phase is ${tsDominant[0]}`, {
        arm: 'typescript',
        phase: tsDominant[0],
        elapsedMs: tsDominant[1],
      }),
    );
  }
  const regressionPhase = dominantRegressionPhase(ts.execution.timingsMs, rust.execution.timingsMs);
  if (regressionPhase) {
    diagnostics.push(
      diagnostic('wall-time-regression-source', `Largest Rust-over-TypeScript wall-time delta is ${regressionPhase.phase}`, regressionPhase),
    );
  }
  const wallTimePasses = wallTimeDeltaPct != null && wallTimeDeltaPct <= -thresholds.wallTimeImprovementPct;
  const peakRssPasses = peakRssDeltaPct != null && peakRssDeltaPct <= -thresholds.peakRssReductionPct;
  target.gates.performance = {
    status: wallTimePasses && peakRssPasses ? 'passed' : 'unavailable',
    wallTimeDeltaPct,
    peakRssDeltaPct,
    diagnostics,
  };
}

function classifyTarget(target) {
  if (target.preflight.status !== 'available') return 'target-failed-preflight';
  const ts = target.arms.typescript;
  const rust = target.arms.rust;
  if (ts.preflight.status !== 'available' || rust.preflight.status !== 'available') return 'target-failed-arm-unavailable';
  if (ts.execution.status !== 'completed' || rust.execution.status !== 'completed') return 'target-failed-arm-unavailable';
  if (target.gates.sufficiency.status === 'failed') return 'target-failed-comparison-regression';
  if (target.gates.performance.status === 'failed') return 'target-failed-comparison-regression';
  if (target.gates.sufficiency.status === 'passed' && target.gates.performance.status === 'passed') return 'target-success-comparison-completed';
  if (target.gates.sufficiency.status === 'passed' && target.gates.performance.status !== 'passed') return 'target-failed-performance-gate-unmet';
  return 'target-skipped';
}

function runArms(target, rustCoreInfo, thresholds) {
  indexArm(target, 'typescript', rustCoreInfo);
  indexArm(target, 'rust', rustCoreInfo);
  applyGates(target, thresholds);
  target.classification = classifyTarget(target);
}

function isGitDirty(targetPath) {
  if (!fs.existsSync(path.join(targetPath, '.git'))) return false;
  const result = spawnSync('git', ['status', '--porcelain'], { cwd: targetPath, encoding: 'utf-8' });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function emptyArm(engine) {
  return {
    engine,
    graphWorkProfile: engine === 'rust' ? { configured: null, effective: 'full', source: 'built-in-default' } : null,
    preflight: {
      status: 'available',
      kind: null,
      diagnostics: [],
    },
    execution: {
      status: 'pending',
      elapsedMs: 0,
      peakRssBytes: null,
      timingsMs: null,
      indexProfile: null,
      diagnostics: [],
    },
    indexing: {
      status: 'pending',
    },
    sourceCopy: null,
    graphAvailable: false,
    graphStats: null,
    command: null,
  };
}

function skipArm(arm, kind, message) {
  arm.preflight = {
    status: 'unavailable',
    kind,
    diagnostics: [diagnostic(kind, message)],
  };
  arm.execution.status = 'skipped';
  arm.indexing.status = 'skipped';
}

function resolveTargetPath(target) {
  const configuredPathEnv = target.pathEnv ?? null;
  const configuredPathFallback = target.pathFallback ?? null;
  const envValue = configuredPathEnv ? process.env[configuredPathEnv] : null;
  if (envValue) {
    return {
      configuredPathEnv,
      configuredPathFallback,
      resolvedPath: path.resolve(envValue),
      pathSource: 'env',
    };
  }
  if (configuredPathFallback) {
    return {
      configuredPathEnv,
      configuredPathFallback,
      resolvedPath: path.resolve(repoRoot, configuredPathFallback),
      pathSource: 'fallback',
    };
  }
  return {
    configuredPathEnv,
    configuredPathFallback,
    resolvedPath: null,
    pathSource: null,
  };
}

function resolveRustGraphWorkProfile(target, experimentRust) {
  const targetArmProfile = target.arms?.rust?.graphWorkProfile;
  if (targetArmProfile) {
    return { configured: targetArmProfile, effective: targetArmProfile, source: 'target-arm' };
  }
  if (experimentRust?.graphWorkProfile) {
    return { configured: experimentRust.graphWorkProfile, effective: experimentRust.graphWorkProfile, source: 'experiment' };
  }
  return { configured: null, effective: 'full', source: 'built-in-default' };
}

function preflightTarget(target, rustCoreInfo, experimentRust = {}) {
  const targetPath = resolveTargetPath(target);
  const arms = {
    typescript: emptyArm('typescript'),
    rust: emptyArm('rust'),
  };
  arms.rust.graphWorkProfile = resolveRustGraphWorkProfile(target, experimentRust);
  const preflight = {
    status: 'available',
    kind: null,
    diagnostics: [],
    commit: null,
    dirty: false,
    promptIds: Array.isArray(target.promptIds) ? target.promptIds : [],
  };

  if (!targetPath.resolvedPath || !fs.existsSync(targetPath.resolvedPath)) {
    const message = `Target path is missing for ${target.name}`;
    preflight.status = 'unavailable';
    preflight.kind = 'missing-target-path';
    preflight.diagnostics.push(diagnostic('missing-target-path', message));
    skipArm(arms.typescript, 'target-unavailable', message);
    skipArm(arms.rust, 'target-unavailable', message);
  } else {
    preflight.commit = getGitCommit(targetPath.resolvedPath);
    preflight.dirty = isGitDirty(targetPath.resolvedPath);
    if (target.expectedCommit && preflight.commit !== target.expectedCommit) {
      const message = `Target commit drift for ${target.name}`;
      preflight.status = 'unavailable';
      preflight.kind = 'target-drift';
      preflight.diagnostics.push(diagnostic('target-drift', message, { expectedCommit: target.expectedCommit, actualCommit: preflight.commit }));
      skipArm(arms.typescript, 'target-unavailable', message);
      skipArm(arms.rust, 'target-unavailable', message);
    } else if (target.allowDirty === false && preflight.dirty) {
      const message = `Target working tree is dirty for ${target.name}`;
      preflight.status = 'unavailable';
      preflight.kind = 'target-dirty';
      preflight.diagnostics.push(diagnostic('target-dirty', message));
      skipArm(arms.typescript, 'target-unavailable', message);
      skipArm(arms.rust, 'target-unavailable', message);
    } else if (!rustCoreInfo.available) {
      skipArm(arms.rust, 'missing-rust-binary', `Rust core binary is not available at ${rustCoreInfo.path}`);
    }
  }

  return {
    name: target.name,
    targetClass: target.targetClass ?? 'required',
    requiredForDecision: target.requiredForDecision !== false,
    requiredAfterPrdCompletion: target.requiredAfterPrdCompletion === true,
    sparsePatterns: Array.isArray(target.sparsePatterns) ? target.sparsePatterns : [],
    path: targetPath,
    preflight,
    arms,
    gates: {
      sufficiency: { status: 'unavailable', regressions: [] },
      performance: { status: 'unavailable', wallTimeDeltaPct: null, peakRssDeltaPct: null, diagnostics: [] },
    },
    classification: preflight.status === 'available' ? 'target-skipped' : 'target-failed-preflight',
  };
}

function createExperimentPreflight() {
  const rustCorePath = process.env.ZCODEGRAPH_RUST_CORE_BINARY || defaultRustCore;
  return {
    status: 'completed',
    diagnostics: [],
    toolchain: {
      node: process.version,
      rustc: optionalCommandVersion('rustc', ['--version']),
      cargo: optionalCommandVersion('cargo', ['--version']),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
    },
    rustCore: {
      path: rustCorePath,
      available: fs.existsSync(rustCorePath),
    },
  };
}

function metricThresholds(metrics) {
  return {
    wallTimeImprovementPct: metrics?.thresholds?.wallTimeImprovementPct ?? 25,
    peakRssReductionPct: metrics?.thresholds?.peakRssReductionPct ?? 30,
    maxOtherMetricRegressionPct: metrics?.thresholds?.maxOtherMetricRegressionPct ?? 10,
  };
}

function classifyExperiment(targets) {
  const requiredTargets = targets.filter((target) => target.requiredForDecision !== false);
  if (requiredTargets.length === 0) {
    if (targets.length === 0) return 'failed-required-arm-unavailable';
    if (targets.every((target) => target.classification === 'target-success-comparison-completed')) return 'stress-only-targets-completed';
    return 'stress-only-targets-completed-with-nonblocking-failures';
  }
  if (requiredTargets.some((target) => target.classification === 'target-failed-preflight')) return 'failed-required-target-unavailable';
  if (requiredTargets.some((target) => target.classification === 'target-failed-arm-unavailable')) return 'failed-required-arm-unavailable';
  if (requiredTargets.some((target) => target.classification === 'target-failed-comparison-regression')) return 'failed-required-comparison-regression';
  if (requiredTargets.some((target) => target.classification === 'target-failed-performance-gate-unmet')) return 'failed-required-performance-gate-unmet';
  const requiredPassed = requiredTargets.every((target) => target.classification === 'target-success-comparison-completed');
  if (requiredPassed && targets.some((target) => target.requiredForDecision === false && target.classification !== 'target-success-comparison-completed')) {
    return 'success-required-targets-passed-with-stress-failures';
  }
  if (requiredPassed) return 'success-required-targets-passed';
  return 'failed-required-arm-unavailable';
}

function decisionReadinessFor(classification, targets) {
  const requiredTargets = targets.filter((target) => target.requiredForDecision !== false);
  return {
    sufficiencyPassed: requiredTargets.length > 0 && requiredTargets.every((target) => target.gates.sufficiency.status === 'passed'),
    performancePassed: requiredTargets.length > 0 && requiredTargets.every((target) => target.gates.performance.status === 'passed'),
    requiredTargetsPassed: classification.startsWith('success-required-targets-passed'),
    rolloutReadinessClaimed: false,
  };
}

function createArtifact(normalized, manifestPath, validation) {
  const preflight = createExperimentPreflight();
  const thresholds = metricThresholds(normalized.metrics);
  const targets = normalized.targets.map((target) => preflightTarget(target, preflight.rustCore, normalized.rust));
  for (const target of targets) {
    runArms(target, preflight.rustCore, thresholds);
  }
  const classification = classifyExperiment(targets);
  return {
    schemaVersion: 1,
    experimentId: normalized.experimentId,
    kind: normalized.kind,
    generatedAt: new Date().toISOString(),
    arms: normalized.arms,
    sourceCopy: normalized.sourceCopy,
    manifest: {
      path: manifestPath,
      unknownFields: validation.unknownFields,
    },
    preflight,
    targets,
    classification,
    decisionReadiness: decisionReadinessFor(classification, targets),
  };
}

function createFatalArtifact(manifestPath, diagnostics, classification = 'failed-manifest-invalid') {
  return {
    schemaVersion: 1,
    experimentId: null,
    kind: 'indexing-ab',
    generatedAt: new Date().toISOString(),
    arms: ['typescript', 'rust'],
    manifest: {
      path: manifestPath,
      unknownFields: [],
    },
    preflight: {
      status: 'failed',
      diagnostics,
    },
    targets: [],
    classification,
    decisionReadiness: {
      sufficiencyPassed: false,
      performancePassed: false,
      requiredTargetsPassed: false,
      rolloutReadinessClaimed: false,
    },
  };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  const missingArgs = [];
  if (!args.experiment) missingArgs.push('--experiment');
  if (!args.out) missingArgs.push('--out');
  if (!args.summaryOut) missingArgs.push('--summary-out');
  if (missingArgs.length > 0) {
    console.error(`Missing required arguments: ${missingArgs.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(args.experiment, 'utf-8'));
  } catch (error) {
    const diagnostics = [diagnostic('invalid-manifest-json', `Invalid manifest JSON: ${error.message}`)];
    const artifact = createFatalArtifact(args.experiment, diagnostics);
    writeJson(args.out, artifact);
    console.error(JSON.stringify({ classification: artifact.classification, diagnostics }, null, 2));
    process.exitCode = 1;
    return;
  }

  const validation = validateManifest(manifest);
  if (!validation.valid) {
    const artifact = createFatalArtifact(args.experiment, validation.diagnostics);
    writeJson(args.out, artifact);
    console.error(JSON.stringify({ classification: artifact.classification, diagnostics: validation.diagnostics }, null, 2));
    process.exitCode = 1;
    return;
  }

  const artifact = createArtifact(validation.normalized, args.experiment, validation);
  writeJson(args.out, artifact);
  writeSummary(args.summaryOut, artifact, args.experiment);
  console.log(JSON.stringify(artifact, null, 2));
  if (args.failOnRequiredGateFailure && artifact.classification.startsWith('failed-required-')) {
    process.exitCode = 2;
  }
}

main();
