#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TARGET_MS = 60_000;

function usage() {
  console.log([
    'Usage: node scripts/rust-hybrid-reference-resolution-fixture-smoke.mjs --fixture <dir> --out <result.json> [--bin <zcodegraph.js>]',
    '',
    'Runs rust-hybrid profile smoke on the reduced reference-resolution fixture',
    'and records whether it is a useful fast inner-loop pressure target.',
  ].join('\n'));
}

function parseArgs(argv) {
  let fixture = null;
  let out = null;
  let bin = path.resolve('dist', 'bin', 'zcodegraph.js');

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--fixture') {
      fixture = path.resolve(requiredValue(argv, ++i, '--fixture'));
      continue;
    }
    if (arg === '--out') {
      out = path.resolve(requiredValue(argv, ++i, '--out'));
      continue;
    }
    if (arg === '--bin') {
      bin = path.resolve(requiredValue(argv, ++i, '--bin'));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!fixture) throw new Error('--fixture is required');
  if (!out) throw new Error('--out is required');
  return { help: false, fixture, out, bin };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
}

function tail(text, max = 4000) {
  if (!text) return '';
  return text.length <= max ? text : text.slice(text.length - max);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function failArtifact(args, status, result, startedAt, profilePath = null) {
  const artifact = {
    status,
    fixture: args.fixture,
    command: result ? {
      exitCode: result.status,
      signal: result.signal,
      stdoutTail: tail(result.stdout),
      stderrTail: tail(result.stderr),
    } : null,
    wallMs: Date.now() - startedAt,
    profilePath,
  };
  writeJson(args.out, artifact);
  return artifact;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function summarizeProfile(profile) {
  const breakdown = profile?.finalize?.referenceResolutionBreakdown ?? {};
  const checkpointNames = Array.isArray(profile?.checkpoints)
    ? profile.checkpoints.map((checkpoint) => checkpoint.name)
    : [];
  return {
    complete: profile?.complete === true,
    checkpointNames,
    referenceResolutionMs: numberOrNull(profile?.finalize?.referenceResolutionMs),
    dynamicDispatchSynthesisMs: numberOrNull(profile?.finalize?.dynamicDispatchSynthesisMs),
    dbMaintenanceMs: numberOrNull(profile?.finalize?.dbMaintenanceMs),
    edgeInsertCount: numberOrNull(breakdown.edgeInsertCount) ?? 0,
    edgeWriteMs: numberOrNull(breakdown.edgeWriteMs),
    candidateLookupCount: numberOrNull(breakdown.candidateProtocol?.lookupCount) ?? 0,
    fileNodesLookupCount: numberOrNull(breakdown.candidateProtocol?.lookupShapeCounts?.FileNodes) ?? 0,
    fileNodesLookup: breakdown.candidateProtocol?.fileNodesLookup ?? null,
    knownNamePresenceLookupCount: numberOrNull(breakdown.candidateProtocol?.lookupShapeCounts?.KnownNamePresence) ?? 0,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const startedAt = Date.now();
  if (!fs.existsSync(args.fixture)) {
    const artifact = failArtifact(args, 'needs-human-setup', null, startedAt);
    console.log(JSON.stringify({ status: artifact.status, result: artifact }, null, 2));
    return;
  }

  fs.rmSync(path.join(args.fixture, '.zcodegraph'), { recursive: true, force: true });
  const init = run(process.execPath, [args.bin, 'init', args.fixture, '--engine', 'rust-hybrid'], args.fixture);
  if (init.status !== 0) {
    const artifact = failArtifact(args, 'init-failed', init, startedAt);
    console.log(JSON.stringify({ status: artifact.status, result: artifact }, null, 2));
    process.exit(1);
  }

  const profilePath = path.resolve(path.dirname(args.out), `${path.basename(args.out, path.extname(args.out))}.profile.json`);
  const index = run(
    process.execPath,
    [args.bin, 'index', args.fixture, '--engine', 'rust-hybrid', '--force', '--profile-out', profilePath, '--quiet'],
    args.fixture,
  );
  if (index.status !== 0) {
    const artifact = failArtifact(args, 'index-failed', index, startedAt, profilePath);
    console.log(JSON.stringify({ status: artifact.status, result: artifact }, null, 2));
    process.exit(1);
  }

  const wallMs = Date.now() - startedAt;
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const summary = summarizeProfile(profile);
  const artifact = {
    status: 'completed',
    fixture: args.fixture,
    profilePath,
    wallMs,
    budget: {
      targetMs: TARGET_MS,
      passed: wallMs < TARGET_MS,
    },
    profile: {
      complete: summary.complete,
      checkpointNames: summary.checkpointNames,
      referenceResolutionMs: summary.referenceResolutionMs,
      dynamicDispatchSynthesisMs: summary.dynamicDispatchSynthesisMs,
      dbMaintenanceMs: summary.dbMaintenanceMs,
    },
    pressureSignal: {
      edgeInsertCount: summary.edgeInsertCount,
      edgeWriteMs: summary.edgeWriteMs,
      candidateLookupCount: summary.candidateLookupCount,
      fileNodesLookupCount: summary.fileNodesLookupCount,
      fileNodesLookup: summary.fileNodesLookup,
      knownNamePresenceLookupCount: summary.knownNamePresenceLookupCount,
    },
    decision: {
      suitableForNextOptimizationLoop: summary.complete
        && summary.checkpointNames.includes('finalization.referenceResolution.started')
        && summary.checkpointNames.includes('finalization.referenceResolution.completed')
        && summary.edgeInsertCount > 0
        && summary.candidateLookupCount > 0
        && wallMs < TARGET_MS,
      note: 'This smoke validates a reduced fixture as a fast pressure target; it does not claim production performance improvement.',
    },
  };
  writeJson(args.out, artifact);
  console.log(JSON.stringify({
    status: artifact.status,
    result: {
      profileComplete: artifact.profile.complete,
      referenceResolutionMs: artifact.profile.referenceResolutionMs,
      edgeInsertCount: artifact.pressureSignal.edgeInsertCount,
      wallMs: artifact.wallMs,
      suitableForNextOptimizationLoop: artifact.decision.suitableForNextOptimizationLoop,
    },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
