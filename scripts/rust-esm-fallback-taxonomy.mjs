#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REASON_GROUPS = {
  'type-only-import': 'typeOnlyBoundary',
  'import-edge-target-not-found': 'importEdgeTargetGap',
  'import-edge-target-ambiguous': 'importEdgeTargetGap',
  'target-file-content-unavailable': 'contentUnavailable',
  'direct-export-candidate-zero': 'directExportCandidateGap',
  'direct-export-candidate-multiple': 'directExportCandidateGap',
  'reexport-specifier-target-not-found': 'reexportTargetGap',
  'reexport-leaf-content-unavailable': 'reexportTargetGap',
  'reexport-leaf-candidate-zero': 'reexportCandidateGap',
  'reexport-leaf-candidate-multiple': 'reexportCandidateGap',
  'package-or-runtime-binding': 'packageOrRuntimeBoundary',
  'unsupported-import-shape': 'unsupportedImportShape',
};

const ACTIONABLE_GROUPS = new Set([
  'directExportCandidateGap',
  'reexportTargetGap',
  'reexportCandidateGap',
  'importEdgeTargetGap',
  'unsupportedImportShape',
]);

function usage() {
  console.log([
    'Usage: node scripts/rust-esm-fallback-taxonomy.mjs --profile <path> [--out-dir <dir>] [--prefix <name>]',
    '',
    'Classifies Rust core ESM named import/export fallback samples from a profile artifact.',
    'This diagnostic reads profile metadata only; it does not read source files or open a database.',
  ].join('\n'));
}

function parseArgs(argv) {
  let profilePath = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = `${new Date().toISOString().slice(0, 10)}-esm-named-fallback-taxonomy`;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--profile') {
      profilePath = path.resolve(requiredValue(argv, ++i, '--profile'));
      continue;
    }
    if (arg === '--out-dir') {
      outDir = path.resolve(requiredValue(argv, ++i, '--out-dir'));
      continue;
    }
    if (arg === '--prefix') {
      prefix = requiredValue(argv, ++i, '--prefix');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!profilePath) throw new Error('--profile is required');
  return { help: false, profilePath, outDir, prefix };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function loadProfileSamples(profilePath) {
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const samples = profile?.rustCore?.esmNamedImportExportFallbackSamples;
  const sampleCounts = profile?.rustCore?.esmNamedImportExportFallbackSampleCounts;
  if (!Array.isArray(samples)) {
    return {
      rows: [],
      sampleCounts: {},
      unavailableReason:
        'rustCore.esmNamedImportExportFallbackSamples is missing or not an array',
    };
  }
  return {
    rows: samples.map((sample) => ({
      reason: String(sample.reason ?? 'unknown'),
      referenceName: String(sample.referenceName ?? ''),
      referenceKind: String(sample.referenceKind ?? ''),
      filePath: String(sample.filePath ?? ''),
      language: String(sample.language ?? 'unknown'),
      line: Number.isFinite(sample.line) ? sample.line : 0,
      col: Number.isFinite(sample.col) ? sample.col : 0,
      targetFilePath: typeof sample.targetFilePath === 'string' ? sample.targetFilePath : undefined,
      candidateCount: Number.isFinite(sample.candidateCount) ? sample.candidateCount : undefined,
      resolvedByAttempt: typeof sample.resolvedByAttempt === 'string'
        ? sample.resolvedByAttempt
        : undefined,
    })),
    sampleCounts: sampleCounts && typeof sampleCounts === 'object' ? sampleCounts : {},
    unavailableReason: samples.length === 0
      ? 'rustCore.esmNamedImportExportFallbackSamples is empty'
      : null,
  };
}

function classifyReason(reason) {
  return REASON_GROUPS[reason] ?? 'unknownReason';
}

function addReason(reasons, row) {
  const group = classifyReason(row.reason);
  const bucket = reasons[group] ?? {
    count: 0,
    rawReasons: {},
    examples: [],
  };
  bucket.count += 1;
  bucket.rawReasons[row.reason] = (bucket.rawReasons[row.reason] ?? 0) + 1;
  if (bucket.examples.length < 10) {
    const example = {
      reason: row.reason,
      referenceName: row.referenceName,
      referenceKind: row.referenceKind,
      filePath: row.filePath,
      language: row.language,
      line: row.line,
      col: row.col,
    };
    if (row.targetFilePath) example.targetFilePath = row.targetFilePath;
    if (row.candidateCount !== undefined) example.candidateCount = row.candidateCount;
    if (row.resolvedByAttempt) example.resolvedByAttempt = row.resolvedByAttempt;
    bucket.examples.push(example);
  }
  reasons[group] = bucket;
}

function addReasonCount(reasons, rawReason, count) {
  const group = classifyReason(rawReason);
  const bucket = reasons[group] ?? {
    count: 0,
    rawReasons: {},
    examples: [],
  };
  bucket.count += count;
  bucket.rawReasons[rawReason] = (bucket.rawReasons[rawReason] ?? 0) + count;
  reasons[group] = bucket;
}

function addExample(bucket, row) {
  if (bucket.examples.length >= 10) return;
  const example = {
    reason: row.reason,
    referenceName: row.referenceName,
    referenceKind: row.referenceKind,
    filePath: row.filePath,
    language: row.language,
    line: row.line,
    col: row.col,
  };
  if (row.targetFilePath) example.targetFilePath = row.targetFilePath;
  if (row.candidateCount !== undefined) example.candidateCount = row.candidateCount;
  if (row.resolvedByAttempt) example.resolvedByAttempt = row.resolvedByAttempt;
  bucket.examples.push(example);
}

function chooseCandidateNextSlice(reasons, unavailableReason) {
  if (unavailableReason) return 'no samples available';
  const entries = Object.entries(reasons)
    .filter(([group]) => ACTIONABLE_GROUPS.has(group))
    .sort(([, left], [, right]) => right.count - left.count);
  if (entries.length === 0) return 'no actionable ESM named fallback group dominates';
  const [group, bucket] = entries[0];
  switch (group) {
    case 'directExportCandidateGap':
      return `investigate direct export candidate gaps (${bucket.count} reported)`;
    case 'reexportTargetGap':
      return `investigate one-hop re-export target gaps (${bucket.count} reported)`;
    case 'reexportCandidateGap':
      return `investigate one-hop re-export candidate gaps (${bucket.count} reported)`;
    case 'importEdgeTargetGap':
      return `investigate missing or ambiguous file-level import edges (${bucket.count} reported)`;
    case 'unsupportedImportShape':
      return `investigate unsupported import shapes (${bucket.count} reported)`;
    default:
      return `investigate ${group} (${bucket.count} reported)`;
  }
}

function buildTaxonomy(rows, sampleCounts, source) {
  const reasons = {};
  for (const [rawReason, rawCount] of Object.entries(sampleCounts)) {
    const count = Number(rawCount);
    if (Number.isFinite(count) && count > 0) addReasonCount(reasons, rawReason, count);
  }
  for (const row of rows) {
    if (Object.keys(sampleCounts).length === 0) addReason(reasons, row);
    else {
      const group = classifyReason(row.reason);
      const bucket = reasons[group] ?? {
        count: 0,
        rawReasons: {},
        examples: [],
      };
      addExample(bucket, row);
      reasons[group] = bucket;
    }
  }
  const sortedReasons = Object.fromEntries(
    Object.entries(reasons).sort(([left], [right]) => left.localeCompare(right)),
  );
  const summaryReasons = Object.fromEntries(
    Object.entries(sortedReasons).map(([reason, bucket]) => [reason, bucket.count]),
  );
  const candidateNextSlice = chooseCandidateNextSlice(
    sortedReasons,
    source.sampleSourceUnavailableReason,
  );

  return {
    generatedAt: new Date().toISOString(),
    ...source,
    dataSource: 'rustCore.esmNamedImportExportFallbackSamples',
    sourceFilesRead: 0,
    databaseOpened: false,
    rowsInspected: rows.length,
    countSource: Object.keys(sampleCounts).length > 0
      ? 'rustCore.esmNamedImportExportFallbackSampleCounts'
      : 'sample rows',
    reasons: sortedReasons,
    candidateNextSlice,
    summary: {
      rowsInspected: rows.length,
      sampleSourceUnavailableReason: source.sampleSourceUnavailableReason,
      reasons: summaryReasons,
      candidateNextSlice,
    },
  };
}

function renderMarkdown(taxonomy) {
  const lines = [
    '# ESM Named Binding Fallback Taxonomy',
    '',
    `Generated: ${taxonomy.generatedAt}`,
    '',
    '## Source',
    '',
    `- Profile: \`${taxonomy.profilePath}\``,
    `- Data source: \`${taxonomy.dataSource}\``,
    '- Source files read: none',
    '- Database opened: false',
    taxonomy.sampleSourceUnavailableReason
      ? `- Sample source unavailable: ${taxonomy.sampleSourceUnavailableReason}`
      : null,
    '',
    '## Summary',
    '',
    `- Rows inspected: ${taxonomy.rowsInspected}`,
    `- Candidate next slice: ${taxonomy.candidateNextSlice}`,
    '',
    '## Reasons',
    '',
    '| Reason group | Count |',
    '| --- | ---: |',
  ].filter(Boolean);

  for (const [reason, bucket] of Object.entries(taxonomy.reasons)) {
    lines.push(`| ${reason} | ${bucket.count} |`);
  }

  lines.push('', '## Candidate next slice', '', taxonomy.candidateNextSlice, '', '## Examples', '');
  for (const [reason, bucket] of Object.entries(taxonomy.reasons)) {
    lines.push(`### ${reason}`, '');
    for (const example of bucket.examples) {
      const target = example.targetFilePath ? ` -> \`${example.targetFilePath}\`` : '';
      const count = example.candidateCount !== undefined
        ? ` candidates=${example.candidateCount}`
        : '';
      const attempt = example.resolvedByAttempt ? ` via ${example.resolvedByAttempt}` : '';
      lines.push(
        `- \`${example.referenceName}\` from \`${example.filePath}\` (${example.language}:${example.line}:${example.col})${target}${count}${attempt}`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function writeArtifacts(taxonomy, outDir, prefix) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `${prefix}.json`);
  const markdownPath = path.join(outDir, `${prefix}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(taxonomy, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(taxonomy));
  return { json: jsonPath, markdown: markdownPath };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.profilePath)) {
    throw new Error(`Profile not found: ${args.profilePath}`);
  }
  const { rows, sampleCounts, unavailableReason } = loadProfileSamples(args.profilePath);
  const taxonomy = buildTaxonomy(rows, sampleCounts, {
    profilePath: args.profilePath,
    sampleSourceUnavailableReason: unavailableReason ?? undefined,
  });
  const artifacts = writeArtifacts(taxonomy, args.outDir, args.prefix);
  process.stdout.write(`${JSON.stringify({ artifacts, summary: taxonomy.summary }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
