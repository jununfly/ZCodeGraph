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

const SUPPORTED_TOP_LEVEL_FIELDS = new Set([
  'schemaVersion',
  'experimentId',
  'kind',
  'arms',
  'sourceCopy',
  'targets',
  'metrics',
  'outputs',
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

function writeSummary(file, artifact, manifestPath) {
  ensureParentDir(file);
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
    '## Arm availability and graph stats',
    '',
    ...artifact.targets.flatMap((target) => [
      `### ${target.name}`,
      '',
      `- TypeScript: ${target.arms.typescript.graphAvailable ? 'graph available' : 'graph unavailable'}; stats: ${JSON.stringify(target.arms.typescript.graphStats)}`,
      `- Rust: ${target.arms.rust.graphAvailable ? 'graph available' : 'graph unavailable'}; stats: ${JSON.stringify(target.arms.rust.graphStats)}`,
      '',
    ]),
    '## Metrics',
    '',
    ...artifact.targets.map((target) => `- ${target.name}: wallTimeDeltaPct=${target.gates.performance.wallTimeDeltaPct}, peakRssDeltaPct=${target.gates.performance.peakRssDeltaPct}`),
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

function runCommand(command, args, cwd, env = {}) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
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
    const queryResult = runCommand(process.execPath, ['-e', `const Database=require('better-sqlite3');const db=new Database(process.argv[1]);console.log(JSON.stringify({fileCount:db.prepare('select count(*) as c from files').get().c,nodeCount:db.prepare('select count(*) as c from nodes').get().c,edgeCount:db.prepare('select count(*) as c from edges').get().c,dbSizeBytes:require('fs').statSync(process.argv[1]).size}));db.close();`, dbFile], project);
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
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    arm.execution.elapsedMs = Number.parseInt(process.env.ZCODEGRAPH_EXPERIMENT_FAKE_RUST_ELAPSED_MS || '1', 10);
    arm.execution.status = 'completed';
    arm.indexing.status = 'completed';
    arm.graphStats = {
      fileCount: arm.sourceCopy.copiedFiles,
      nodeCount: 1,
      edgeCount: 1,
      dbSizeBytes: 0,
    };
    arm.graphAvailable = true;
    return;
  }
  if (process.env.ZCODEGRAPH_EXPERIMENT_FAIL_ENGINE === engine) {
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    arm.execution.elapsedMs = Date.now() - started;
    arm.execution.status = 'failed';
    arm.execution.diagnostics.push(diagnostic('forced-engine-failure', `Forced ${engine} indexing failure`));
    arm.indexing.status = 'failed';
    arm.graphAvailable = false;
    return;
  }
  try {
    arm.sourceCopy = copySourceSlice(target.path.resolvedPath, engine);
    const bin = path.join(repoRoot, 'dist', 'bin', 'zcodegraph.js');
    const initResult = runCommand(process.execPath, [bin, 'init', arm.sourceCopy.path], arm.sourceCopy.path);
    if (initResult.status !== 0) {
      arm.execution.status = 'failed';
      arm.execution.diagnostics.push(diagnostic('init-process-failed', `Init failed for ${target.name}:${engine}`, { stderrTail: tail(initResult.stderr) }));
      arm.indexing.status = 'failed';
      arm.graphAvailable = false;
      return;
    }
    const args = [bin, 'index', arm.sourceCopy.path, '--force', '--quiet'];
    const env = {};
    if (engine === 'rust') {
      args.push('--engine', 'rust');
      env.ZCODEGRAPH_RUST_CORE_BINARY = rustCoreInfo.path;
    }
    arm.command = {
      executable: process.execPath,
      args,
      cwd: arm.sourceCopy.path,
      nodeVersion: process.version,
      env,
    };
    arm.execution.status = 'running';
    const result = runCommand(process.execPath, args, arm.sourceCopy.path, env);
    arm.execution.elapsedMs = Date.now() - started;
    if (result.status !== 0) {
      arm.execution.status = 'failed';
      arm.execution.diagnostics.push(diagnostic('index-process-failed', `Indexing failed for ${target.name}:${engine}`, { stderrTail: tail(result.stderr) }));
      arm.indexing.status = 'failed';
      arm.graphAvailable = false;
      return;
    }
    arm.execution.status = 'completed';
    arm.indexing.status = 'completed';
    arm.graphStats = collectGraphStats(arm.sourceCopy.path) ?? {
      fileCount: arm.sourceCopy.copiedFiles,
      nodeCount: 0,
      edgeCount: 0,
      dbSizeBytes: 0,
    };
    arm.graphAvailable = true;
  } catch (error) {
    arm.execution.elapsedMs = Date.now() - started;
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
  const peakRssDeltaPct = null;
  const diagnostics = [diagnostic('missing-peak-rss', 'Peak RSS was not collected')];
  const wallTimePasses = wallTimeDeltaPct != null && wallTimeDeltaPct <= -thresholds.wallTimeImprovementPct;
  target.gates.performance = {
    status: wallTimePasses ? 'passed' : 'unavailable',
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
    preflight: {
      status: 'available',
      kind: null,
      diagnostics: [],
    },
    execution: {
      status: 'pending',
      elapsedMs: 0,
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

function preflightTarget(target, rustCoreInfo) {
  const targetPath = resolveTargetPath(target);
  const arms = {
    typescript: emptyArm('typescript'),
    rust: emptyArm('rust'),
  };
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
  if (requiredTargets.some((target) => target.classification === 'target-failed-preflight')) return 'failed-required-target-unavailable';
  if (requiredTargets.some((target) => target.classification === 'target-failed-arm-unavailable')) return 'failed-required-arm-unavailable';
  if (requiredTargets.some((target) => target.classification === 'target-failed-comparison-regression')) return 'failed-required-comparison-regression';
  const requiredPassed = requiredTargets.length > 0 && requiredTargets.every((target) => target.classification === 'target-success-comparison-completed');
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
  const targets = normalized.targets.map((target) => preflightTarget(target, preflight.rustCore));
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
