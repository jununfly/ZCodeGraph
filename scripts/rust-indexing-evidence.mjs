#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const RUST_CORE_BUCKETS = [
  'sourceScanMs',
  'parseExtractionMs',
  'sqliteWriteMs',
  'importPathAliasResolutionMs',
  'esmNamedImportExportResolutionMs',
  'localExactReferenceResolutionMs',
  'subprocessStartupHandoffMs',
];

const EXCLUDED_CANDIDATES = [
  {
    issue: '#208',
    candidate: 'candidate replay verifier',
    reason: 'already measured as semantically useful but too expensive for production performance path unless materially reframed',
  },
  {
    issue: '#209',
    candidate: 'TypeScript finalization edge-write-only',
    reason: 'already measured as a narrow edge-write-only hypothesis; future work must materially reframe the finalization DB path',
  },
  {
    issue: '#211',
    candidate: 'FTS-trigger bulk write',
    reason: 'already implemented and measured; future graph-write work must target a different mechanism',
  },
];

function printHelp() {
  console.log(`Usage: node scripts/rust-indexing-evidence.mjs --before <raw.json> --after <raw.json> [--out <comparison.md>] [--decision-out <decision.md>]

Generate local Rust indexing optimization evidence from before/after experiment artifacts.

The tool is local-only: it does not call GitHub, edit labels, close issues, or require network access.
`);
}

function parseArgs(argv) {
  const args = { before: null, after: null, out: null, decisionOut: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--before') args.before = argv[++i] ?? null;
    else if (arg === '--after') args.after = argv[++i] ?? null;
    else if (arg === '--out') args.out = argv[++i] ?? null;
    else if (arg === '--decision-out') args.decisionOut = argv[++i] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function ensureParentDir(file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

function writeText(file, text) {
  ensureParentDir(file);
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

function pct(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null;
  return ((after - before) / before) * 100;
}

function fmt(value) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function fmtPct(value) {
  if (value == null || Number.isNaN(value)) return 'n/a';
  const fixed = value.toFixed(2);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

function byName(targets = []) {
  return new Map(targets.map((target) => [target.name, target]));
}

function graphStatsComparable(stats) {
  if (!stats) return null;
  return {
    fileCount: stats.fileCount ?? 0,
    nodeCount: stats.nodeCount ?? 0,
    edgeCount: stats.edgeCount ?? 0,
    nodeKinds: stats.nodeKinds ?? {},
    edgeKinds: stats.edgeKinds ?? {},
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function graphStatsParity(beforeTarget, afterTarget) {
  const before = graphStatsComparable(beforeTarget?.arms?.rust?.graphStats);
  const after = graphStatsComparable(afterTarget?.arms?.rust?.graphStats);
  if (!before || !after) return 'unavailable';
  return stableJson(before) === stableJson(after) ? 'unchanged' : 'changed';
}

function rssUnavailableReason(execution) {
  return (
    execution?.peakRssUnavailableReason ??
    execution?.rssUnavailableReason ??
    execution?.peakRssBytesUnavailableReason ??
    execution?.resourceUsage?.peakRssUnavailableReason ??
    null
  );
}

function rustCore(target) {
  return target?.arms?.rust?.execution?.indexProfile?.rustCore ?? {};
}

function finalization(target) {
  return target?.arms?.rust?.execution?.indexProfile?.finalize ?? {};
}

function refBreakdown(target) {
  return finalization(target).referenceResolutionBreakdown ?? {};
}

function tsFinalization(target) {
  return target?.arms?.rust?.execution?.indexProfile?.typescriptFinalizationMs ?? null;
}

function targetRows(beforeArtifact, afterArtifact) {
  const beforeTargets = byName(beforeArtifact.targets);
  return (afterArtifact.targets ?? []).map((afterTarget) => {
    const beforeTarget = beforeTargets.get(afterTarget.name);
    const beforeRust = beforeTarget?.arms?.rust?.execution ?? {};
    const afterRust = afterTarget?.arms?.rust?.execution ?? {};
    return {
      name: afterTarget.name,
      targetClass: afterTarget.targetClass ?? 'required',
      required: afterTarget.requiredForDecision !== false,
      emptyCorpus: afterTarget.emptyCorpus?.status ?? 'unavailable',
      sufficiency: afterTarget.gates?.sufficiency?.status ?? 'unavailable',
      graphStatsParity: graphStatsParity(beforeTarget, afterTarget),
      beforeRustMs: beforeRust.elapsedMs ?? null,
      afterRustMs: afterRust.elapsedMs ?? null,
      rustWallDeltaPct: pct(beforeRust.elapsedMs, afterRust.elapsedMs),
      beforeRssBytes: beforeRust.peakRssBytes ?? null,
      afterRssBytes: afterRust.peakRssBytes ?? null,
      beforeRssUnavailableReason: rssUnavailableReason(beforeRust),
      afterRssUnavailableReason: rssUnavailableReason(afterRust),
      rustRssDeltaPct: pct(beforeRust.peakRssBytes, afterRust.peakRssBytes),
      beforeSqliteWriteMs: rustCore(beforeTarget).sqliteWriteMs ?? null,
      afterSqliteWriteMs: rustCore(afterTarget).sqliteWriteMs ?? null,
      sqliteWriteDeltaPct: pct(rustCore(beforeTarget).sqliteWriteMs, rustCore(afterTarget).sqliteWriteMs),
      beforeTarget,
      afterTarget,
    };
  });
}

function bucketRows(beforeTarget, afterTarget) {
  const beforeCore = rustCore(beforeTarget);
  const afterCore = rustCore(afterTarget);
  const coreRows = RUST_CORE_BUCKETS.map((bucket) => ({
    target: afterTarget.name,
    bucket,
    before: beforeCore[bucket] ?? 0,
    after: afterCore[bucket] ?? 0,
    deltaPct: pct(beforeCore[bucket] ?? 0, afterCore[bucket] ?? 0),
    owner: 'rust-core',
  }));
  const tsBefore = tsFinalization(beforeTarget);
  const tsAfter = tsFinalization(afterTarget);
  const finalizationRows = [
    {
      target: afterTarget.name,
      bucket: 'TypeScript finalization',
      before: tsBefore,
      after: tsAfter,
      deltaPct: pct(tsBefore, tsAfter),
      owner: 'typescript-finalization',
    },
  ];
  const beforeBreakdown = refBreakdown(beforeTarget);
  const afterBreakdown = refBreakdown(afterTarget);
  const breakdownKeys = Array.from(new Set([...Object.keys(beforeBreakdown), ...Object.keys(afterBreakdown)]))
    .filter((bucket) => typeof (beforeBreakdown[bucket] ?? afterBreakdown[bucket]) === 'number')
    .sort();
  const breakdownRows = breakdownKeys.map((bucket) => ({
    target: afterTarget.name,
    bucket,
    before: beforeBreakdown[bucket] ?? 0,
    after: afterBreakdown[bucket] ?? 0,
    deltaPct: pct(beforeBreakdown[bucket] ?? 0, afterBreakdown[bucket] ?? 0),
    owner: 'typescript-finalization-breakdown',
  }));
  return [...coreRows, ...finalizationRows, ...breakdownRows];
}

function allBucketRows(beforeArtifact, afterArtifact) {
  const beforeTargets = byName(beforeArtifact.targets);
  return (afterArtifact.targets ?? []).flatMap((afterTarget) => bucketRows(beforeTargets.get(afterTarget.name), afterTarget));
}

function candidateScores(beforeArtifact, afterArtifact) {
  const rows = allBucketRows(beforeArtifact, afterArtifact);
  const afterTargets = byName(afterArtifact.targets);
  const grouped = new Map();
  for (const row of rows) {
    if (row.owner !== 'rust-core') continue;
    if (row.bucket === 'sqliteWriteMs' || row.bucket === 'subprocessStartupHandoffMs' || row.bucket === 'sourceScanMs') continue;
    const entry = grouped.get(row.bucket) ?? {
      bucket: row.bucket,
      owner: row.owner,
      requiredAfterMs: 0,
      stressAfterMs: 0,
      totalAfterMs: 0,
      targets: [],
    };
    const target = afterTargets.get(row.target);
    const after = row.after ?? 0;
    entry.totalAfterMs += after;
    if (target?.requiredForDecision === false) entry.stressAfterMs += after;
    else entry.requiredAfterMs += after;
    entry.targets.push(`${row.target}:${after}`);
    grouped.set(row.bucket, entry);
  }
  return Array.from(grouped.values()).sort((a, b) => {
    if ((b.requiredAfterMs > 0) !== (a.requiredAfterMs > 0)) return b.requiredAfterMs > 0 ? 1 : -1;
    if (b.stressAfterMs !== a.stressAfterMs) return b.stressAfterMs - a.stressAfterMs;
    return b.totalAfterMs - a.totalAfterMs;
  });
}

function recommendation(beforeArtifact, afterArtifact) {
  const scores = candidateScores(beforeArtifact, afterArtifact);
  const top = scores[0];
  if (!top) return { action: 'pause', text: 'Pause: no eligible Rust-owned candidate bucket was found.', scores };
  return {
    action: 'candidate',
    bucket: top.bucket,
    text: `Recommend next bounded candidate: ${top.bucket}.`,
    scores,
  };
}

function comparisonMarkdown(beforeArtifact, afterArtifact, beforePath, afterPath) {
  const rows = targetRows(beforeArtifact, afterArtifact);
  const buckets = allBucketRows(beforeArtifact, afterArtifact);
  const rec = recommendation(beforeArtifact, afterArtifact);
  const lines = [
    '# Rust Indexing Evidence Comparison',
    '',
    `Before: ${beforeArtifact.experimentId ?? beforePath}`,
    `After: ${afterArtifact.experimentId ?? afterPath}`,
    `Before classification: ${beforeArtifact.classification ?? 'unknown'}`,
    `After classification: ${afterArtifact.classification ?? 'unknown'}`,
    '',
    'Rust default rollout readiness is not claimed by this comparison.',
    '',
    '## Evidence Contract',
    '',
    '- Scope: local before/after artifact comparison; no GitHub or network side effects.',
    '- Target status: required/stress classification, empty-corpus status, sufficiency, and Rust graphStats parity are reported per target.',
    '- Wall time: compares Rust arm elapsed milliseconds only.',
    '- RSS: records peak RSS bytes when available, otherwise records an unavailable reason.',
    '- Profile buckets: Rust-owned buckets, TypeScript finalization total, and numeric finalization breakdown fields are reported separately.',
    '- Rollout readiness: generated output never claims Rust default rollout readiness.',
    '',
    '## Target Matrix',
    '',
    '| Target | Class | Required | Empty corpus | Sufficiency | Rust graphStats |',
    '|---|---|---:|---|---|---|',
    ...rows.map((row) => `| ${row.name} | ${row.targetClass} | ${row.required ? 'yes' : 'no'} | ${row.emptyCorpus} | ${row.sufficiency} | ${row.graphStatsParity} |`),
    '',
    '## Wall Time and RSS',
    '',
    '| Target | Before Rust ms | After Rust ms | Rust wall delta | Before sqliteWriteMs | After sqliteWriteMs | sqliteWrite delta |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map(
      (row) =>
        `| ${row.name} | ${fmt(row.beforeRustMs)} | ${fmt(row.afterRustMs)} | ${fmtPct(row.rustWallDeltaPct)} | ${fmt(row.beforeSqliteWriteMs)} | ${fmt(row.afterSqliteWriteMs)} | ${fmtPct(row.sqliteWriteDeltaPct)} |`,
    ),
    '',
    '| Target | Before Rust RSS | After Rust RSS | Rust RSS delta | Before RSS unavailable reason | After RSS unavailable reason |',
    '|---|---:|---:|---:|---|---|',
    ...rows.map(
      (row) =>
        `| ${row.name} | ${fmt(row.beforeRssBytes)} | ${fmt(row.afterRssBytes)} | ${fmtPct(row.rustRssDeltaPct)} | ${fmt(row.beforeRssUnavailableReason)} | ${fmt(row.afterRssUnavailableReason)} |`,
    ),
    '',
    '## Profile Buckets',
    '',
    '| Target | Bucket | Before ms | After ms | Delta |',
    '|---|---|---:|---:|---:|',
    ...buckets.map((row) => `| ${row.target} | ${row.bucket} | ${fmt(row.before)} | ${fmt(row.after)} | ${fmtPct(row.deltaPct)} |`),
    '',
    '## Candidate Ranking',
    '',
    rec.text,
    '',
    '| Rank | Bucket | Required after ms | Stress after ms | Total after ms | Targets |',
    '|---:|---|---:|---:|---:|---|',
    ...(rec.scores.length > 0
      ? rec.scores.map((score, index) => `| ${index + 1} | ${score.bucket} | ${score.requiredAfterMs} | ${score.stressAfterMs} | ${score.totalAfterMs} | ${score.targets.join(', ')} |`)
      : ['| n/a | n/a | n/a | n/a | n/a | n/a |']),
    '',
    '## Excluded Directions',
    '',
    ...EXCLUDED_CANDIDATES.map((item) => `- ${item.issue} ${item.candidate}: ${item.reason}.`),
    '',
  ];
  return lines.join('\n');
}

function decisionMarkdown(beforeArtifact, afterArtifact, beforePath, afterPath) {
  const comparison = comparisonMarkdown(beforeArtifact, afterArtifact, beforePath, afterPath);
  const rec = recommendation(beforeArtifact, afterArtifact);
  const rows = targetRows(beforeArtifact, afterArtifact);
  const allSufficiencyPassed = rows.every((row) => row.sufficiency === 'passed');
  const allGraphStatsUnchanged = rows.every((row) => row.graphStatsParity === 'unchanged');
  const keep = allSufficiencyPassed && allGraphStatsUnchanged;
  return [
    '# Rust Indexing Optimization Decision Draft',
    '',
    '## Scope',
    '',
    'Generated from before/after Rust indexing experiment artifacts.',
    '',
    'No Rust default rollout readiness is claimed.',
    '',
    '## Recommendation',
    '',
    keep ? 'Keep the implementation if this draft corresponds to a completed bounded candidate.' : 'Pause or revert until sufficiency and graphStats parity are explained.',
    '',
    rec.text,
    '',
    '## Evidence',
    '',
    comparison,
    '## Tracker Update Draft',
    '',
    '- Sufficiency: ' + (allSufficiencyPassed ? 'passed on all compared targets.' : 'not passed on all compared targets.'),
    '- Rust graphStats parity: ' + (allGraphStatsUnchanged ? 'unchanged on all compared targets.' : 'changed or unavailable on at least one target.'),
    `- Next recommendation: ${rec.text}`,
    '- Rust default rollout readiness is not claimed.',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }
  if (!args.before || !args.after) {
    throw new Error('--before and --after are required');
  }
  const beforeArtifact = readJson(args.before);
  const afterArtifact = readJson(args.after);
  const comparison = comparisonMarkdown(beforeArtifact, afterArtifact, args.before, args.after);
  if (args.out) writeText(args.out, comparison);
  else process.stdout.write(`${comparison}\n`);
  if (args.decisionOut) writeText(args.decisionOut, decisionMarkdown(beforeArtifact, afterArtifact, args.before, args.after));
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
