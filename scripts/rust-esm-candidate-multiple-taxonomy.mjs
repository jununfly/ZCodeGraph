#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MULTIPLE_REASONS = new Set([
  'direct-export-candidate-multiple',
  'same-file-export-specifier-candidate-multiple',
]);

const TYPE_KINDS = new Set(['interface', 'type_alias']);
const VALUE_KINDS = new Set(['function', 'class', 'constant', 'variable', 'enum', 'namespace']);
const VALUE_TOKEN_KINDS = new Set(['constant', 'variable']);

const DECISION_POSTURE = {
  'class-plus-interface': 'no-go-keep-fallback',
  'value-token-plus-interface': 'needs-more-metadata',
  'enum-or-namespace-plus-type': 'no-go-keep-fallback',
  'type-alias-plus-value': 'no-go-keep-fallback',
  'unknown-collision': 'no-go-keep-fallback',
  'function-overload-signature': 'prerequisite-first',
  'ambient-declaration-merge': 'prerequisite-first',
  'type-value-namespace-collision': 'no-go-keep-fallback',
  'duplicate-extraction': 'prerequisite-first',
  'same-kind-duplicate': 'prerequisite-first',
  'unknown-multiple': 'no-go-keep-fallback',
};

const BOUNDED_TIE_BREAK_CANDIDATES = new Set([
  'duplicate-extraction',
]);

const NO_GO_SUBTYPES = new Set([
  'class-plus-interface',
  'enum-or-namespace-plus-type',
  'type-alias-plus-value',
  'unknown-collision',
  'type-value-namespace-collision',
  'unknown-multiple',
]);

const COLLISION_RECOMMENDATION = {
  'value-token-plus-interface': 'candidate-for-next-routing-slice',
  'class-plus-interface': 'no-go-keep-fallback',
  'enum-or-namespace-plus-type': 'no-go-keep-fallback',
  'type-alias-plus-value': 'no-go-keep-fallback',
  'unknown-collision': 'needs-more-metadata',
};

function usage() {
  console.log([
    'Usage: node scripts/rust-esm-candidate-multiple-taxonomy.mjs --profile <path> --db <path> [--source-root <dir>] [--out-dir <dir>] [--prefix <name>]',
    '',
    'Classifies Rust ESM direct export candidate-multiple fallbacks using profile samples and SQLite node metadata.',
    'This diagnostic may read bounded local syntax metadata but never writes source snippets to artifacts.',
  ].join('\n'));
}

function parseArgs(argv) {
  let profilePath = null;
  let dbPath = null;
  let sourceRoot = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = `${new Date().toISOString().slice(0, 10)}-esm-direct-export-candidate-multiple-taxonomy`;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--profile') {
      profilePath = path.resolve(requiredValue(argv, ++i, '--profile'));
      continue;
    }
    if (arg === '--db') {
      dbPath = path.resolve(requiredValue(argv, ++i, '--db'));
      continue;
    }
    if (arg === '--source-root') {
      sourceRoot = path.resolve(requiredValue(argv, ++i, '--source-root'));
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
  if (!dbPath) throw new Error('--db is required');
  return {
    help: false,
    profilePath,
    dbPath,
    sourceRoot: sourceRoot ?? inferSourceRootFromDbPath(dbPath),
    outDir,
    prefix,
  };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function loadMultipleSamples(profilePath) {
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const samples = profile?.rustCore?.esmNamedImportExportFallbackSamples;
  const overloadImplementationResolvedRefs = Number(
    profile?.rustCore?.esmNamedImportExportOverloadImplementationResolvedRefs ?? 0,
  );
  if (!Array.isArray(samples)) {
    return {
      rows: [],
      overloadImplementationResolvedRefs,
      unavailableReason:
        'rustCore.esmNamedImportExportFallbackSamples is missing or not an array',
    };
  }
  const rows = samples
    .filter((sample) => MULTIPLE_REASONS.has(String(sample.reason ?? '')))
    .map((sample) => ({
      reason: String(sample.reason ?? ''),
      referenceName: String(sample.referenceName ?? ''),
      referenceKind: String(sample.referenceKind ?? ''),
      filePath: String(sample.filePath ?? ''),
      language: String(sample.language ?? 'unknown'),
      line: Number.isFinite(sample.line) ? sample.line : 0,
      col: Number.isFinite(sample.col) ? sample.col : 0,
      targetFilePath: typeof sample.targetFilePath === 'string' ? sample.targetFilePath : '',
      candidateCount: Number.isFinite(sample.candidateCount) ? sample.candidateCount : undefined,
      resolvedByAttempt: typeof sample.resolvedByAttempt === 'string'
        ? sample.resolvedByAttempt
        : undefined,
      candidateLineRanges: sanitizeCandidateLineRanges(sample.candidateLineRanges),
    }));
  return {
    rows,
    overloadImplementationResolvedRefs,
    unavailableReason: rows.length === 0
      ? 'No direct export candidate-multiple samples found'
      : null,
  };
}

function sanitizeCandidateLineRanges(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((candidate) => candidate && typeof candidate === 'object')
    .map((candidate) => {
      const sanitized = {
        kind: typeof candidate.kind === 'string' ? candidate.kind : 'unknown',
        startLine: Number(candidate.startLine ?? 0),
        endLine: Number(candidate.endLine ?? 0),
      };
      if (typeof candidate.hasBody === 'boolean') {
        sanitized.hasBody = candidate.hasBody;
      }
      if (isDeclarationForm(candidate.declarationForm)) {
        sanitized.declarationForm = candidate.declarationForm;
      }
      if (isMetadataSource(candidate.metadataSource)) {
        sanitized.metadataSource = candidate.metadataSource;
      }
      return sanitized;
    });
}

function isDeclarationForm(value) {
  return value === 'implementation' || value === 'signature' || value === 'unknown';
}

function isMetadataSource(value) {
  return value === 'rust-ast'
    || value === 'target-file-line-range-inference'
    || value === 'unavailable';
}

function loadCandidates(dbPath, row) {
  const sql = [
    '.mode json',
    `SELECT id, kind, name, file_path AS filePath, start_line AS startLine, end_line AS endLine`,
    `FROM nodes`,
    `WHERE file_path = ${sqlString(row.targetFilePath)}`,
    `  AND name = ${sqlString(row.referenceName)}`,
    `  AND kind IN ('function', 'class', 'interface', 'type_alias', 'constant', 'variable', 'enum', 'namespace')`,
    `ORDER BY start_line, end_line, kind, id;`,
  ].join('\n');
  const result = spawnSync('sqlite3', [dbPath], {
    input: sql,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `sqlite3 exited with ${result.status}`);
  }
  const text = result.stdout.trim();
  if (!text) return [];
  return JSON.parse(text).map((candidate) => ({
    id: String(candidate.id ?? ''),
    kind: String(candidate.kind ?? ''),
    name: String(candidate.name ?? ''),
    filePath: String(candidate.filePath ?? ''),
    startLine: Number(candidate.startLine ?? 0),
    endLine: Number(candidate.endLine ?? 0),
  }));
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function classifyCandidates(candidates) {
  if (candidates.length === 0) return 'unknown-multiple';

  const kinds = new Set(candidates.map((candidate) => candidate.kind));
  const hasInterface = kinds.has('interface');
  const hasClass = kinds.has('class');
  const hasEnumOrNamespace = kinds.has('enum') || kinds.has('namespace');
  const hasTypeAlias = kinds.has('type_alias');
  const hasValueToken = candidates.some((candidate) => VALUE_TOKEN_KINDS.has(candidate.kind));
  const hasType = candidates.some((candidate) => TYPE_KINDS.has(candidate.kind));
  const hasValue = candidates.some((candidate) => VALUE_KINDS.has(candidate.kind));

  if (hasInterface && hasClass) return 'class-plus-interface';
  if (hasTypeAlias && hasValue) return 'type-alias-plus-value';
  if (hasType && hasEnumOrNamespace) return 'enum-or-namespace-plus-type';
  if (hasInterface && hasValueToken) return 'value-token-plus-interface';
  if (hasType && hasValue) return 'unknown-collision';
  if (hasDuplicateLocation(candidates)) return 'duplicate-extraction';
  if (candidates.every((candidate) => candidate.kind === 'function')) {
    return 'function-overload-signature';
  }
  if (hasSingleLineDeclarationMerge(candidates)) return 'ambient-declaration-merge';
  if (kinds.size === 1) return 'same-kind-duplicate';
  return 'unknown-multiple';
}

function hasDuplicateLocation(candidates) {
  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.filePath}:${candidate.startLine}:${candidate.endLine}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function hasSingleLineDeclarationMerge(candidates) {
  return candidates.length > 1 && candidates.every((candidate) => candidate.startLine === candidate.endLine);
}

function candidateKinds(candidates) {
  return [...new Set(candidates.map((candidate) => candidate.kind))];
}

function candidateLineRanges(row, candidates) {
  if (Array.isArray(row.candidateLineRanges) && row.candidateLineRanges.length > 0) {
    return row.candidateLineRanges;
  }
  return candidates.map((candidate) => ({
    kind: candidate.kind,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
  }));
}

function addSubtype(subtypes, subtype, row, candidates, syntaxMetadata) {
  const bucket = subtypes[subtype] ?? {
    count: 0,
    decisionPosture: DECISION_POSTURE[subtype] ?? 'no-go-keep-fallback',
    rawReasons: {},
    syntaxSummary: {
      importForms: {},
      usageContextHints: {},
      candidateShapes: {},
    },
    examples: [],
  };
  bucket.count += 1;
  bucket.rawReasons[row.reason] = (bucket.rawReasons[row.reason] ?? 0) + 1;
  if (syntaxMetadata) {
    increment(bucket.syntaxSummary.importForms, syntaxMetadata.importForm);
    increment(bucket.syntaxSummary.usageContextHints, syntaxMetadata.usageContextHint);
    increment(bucket.syntaxSummary.candidateShapes, syntaxMetadata.candidateShape);
  }
  if (bucket.examples.length < 10) {
    const example = {
      reason: row.reason,
      referenceName: row.referenceName,
      referenceKind: row.referenceKind,
      filePath: row.filePath,
      language: row.language,
      line: row.line,
      col: row.col,
      targetFilePath: row.targetFilePath,
      candidateCount: candidates.length || row.candidateCount,
      resolvedByAttempt: row.resolvedByAttempt,
      candidateKinds: candidateKinds(candidates),
      candidateLineRanges: candidateLineRanges(row, candidates),
    };
    if (syntaxMetadata) {
      example.importForm = syntaxMetadata.importForm;
      example.usageContextHint = syntaxMetadata.usageContextHint;
      example.candidateShape = syntaxMetadata.candidateShape;
      example.collisionRecommendation = syntaxMetadata.collisionRecommendation;
    }
    bucket.examples.push(example);
  }
  subtypes[subtype] = bucket;
}

function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function inferSourceRootFromDbPath(dbPath) {
  const normalized = path.resolve(dbPath);
  if (path.basename(normalized) === 'zcodegraph.db' && path.basename(path.dirname(normalized)) === '.zcodegraph') {
    return path.dirname(path.dirname(normalized));
  }
  return path.dirname(normalized);
}

function readSourceFile(sourceRoot, filePath, cache, readPaths) {
  if (!sourceRoot || !filePath) return null;
  const root = path.resolve(sourceRoot);
  const fullPath = path.resolve(root, filePath);
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  if (cache.has(fullPath)) return cache.get(fullPath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    cache.set(fullPath, content);
    readPaths.add(fullPath);
    return content;
  } catch {
    cache.set(fullPath, null);
    return null;
  }
}

function buildSyntaxMetadata({ row, candidates, subtype, sourceRoot, sourceCache, sourceReadPaths }) {
  if (!isCollisionSubtype(subtype)) return null;
  const content = readSourceFile(sourceRoot, row.filePath, sourceCache, sourceReadPaths);
  const importForm = inferImportForm(content, row.line, row.referenceName, row.reason);
  const usageContextHint = inferUsageContextHint(content, row.referenceName);
  const candidateShape = inferCandidateShape(candidates);
  return {
    importForm,
    usageContextHint,
    candidateShape,
    collisionRecommendation: COLLISION_RECOMMENDATION[subtype] ?? 'needs-more-metadata',
  };
}

function isCollisionSubtype(subtype) {
  return Object.prototype.hasOwnProperty.call(COLLISION_RECOMMENDATION, subtype);
}

function inferImportForm(content, line, referenceName, reason) {
  if (reason === 'same-file-export-specifier-candidate-multiple') return 'export-specifier';
  const statement = statementAroundLine(content, line);
  if (!statement) return 'unknown';
  if (/^\s*import\s+type\b/.test(statement)) return 'import-type';
  if (/^\s*export\s+type\s*\{/.test(statement) || /^\s*export\s*\{/.test(statement)) {
    return 'export-specifier';
  }
  if (!/^\s*import\b/.test(statement)) return 'unknown';
  const named = statement.match(/\{([\s\S]*?)\}/)?.[1] ?? '';
  if (!named) return 'unknown';
  const specifiers = named.split(',').map((part) => part.trim()).filter(Boolean);
  const matching = specifiers.find((specifier) => specifierNameMatches(specifier, referenceName));
  if (!matching) return specifiers.some((specifier) => specifier.startsWith('type '))
    ? 'mixed-import'
    : 'named-value-import';
  if (matching.startsWith('type ')) return 'import-type';
  if (specifiers.some((specifier) => specifier.startsWith('type '))) return 'mixed-import';
  return 'named-value-import';
}

function specifierNameMatches(specifier, referenceName) {
  const normalized = specifier.replace(/^type\s+/, '').trim();
  const [left, right] = normalized.split(/\s+as\s+/);
  return left === referenceName || right === referenceName;
}

function statementAroundLine(content, line) {
  if (!content || !Number.isFinite(line) || line <= 0) return '';
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 1);
  const collected = [];
  for (let index = start; index < Math.min(lines.length, start + 8); index += 1) {
    collected.push(lines[index]);
    if (lines[index].includes(';')) break;
  }
  return collected.join('\n');
}

function inferUsageContextHint(content, referenceName) {
  if (!content || !referenceName) return 'unknown';
  const escaped = escapeRegExp(referenceName);
  const nonImportLines = content
    .split(/\r?\n/)
    .filter((line) => !/^\s*import\b/.test(line) && !/^\s*export\s+\{/.test(line));
  if (nonImportLines.some((line) => new RegExp(`@${escaped}\\b`).test(line))) {
    return 'decorator-token';
  }
  if (nonImportLines.some((line) => /constructor\s*\(/.test(line) && new RegExp(`\\b${escaped}\\b`).test(line))) {
    return 'constructor-parameter';
  }
  if (nonImportLines.some((line) => isTypePositionLine(line, escaped))) {
    return 'type-position';
  }
  if (nonImportLines.some((line) => isRuntimeExpressionLine(line, escaped))) {
    return 'runtime-expression';
  }
  return 'unknown';
}

function isTypePositionLine(line, escapedName) {
  return new RegExp(`(:|implements\\s+|extends\\s+|as\\s+|<)\\s*${escapedName}\\b`).test(line)
    || new RegExp(`\\btype\\s+\\w+\\s*=.*\\b${escapedName}\\b`).test(line)
    || new RegExp(`\\binterface\\s+\\w+\\s+extends\\s+${escapedName}\\b`).test(line);
}

function isRuntimeExpressionLine(line, escapedName) {
  return new RegExp(`\\bnew\\s+${escapedName}\\b`).test(line)
    || new RegExp(`\\b${escapedName}\\s*\\(`).test(line)
    || new RegExp(`\\b${escapedName}\\s*\\.`).test(line)
    || new RegExp(`=\\s*${escapedName}\\b`).test(line);
}

function inferCandidateShape(candidates) {
  const kinds = new Set(candidates.map((candidate) => candidate.kind));
  if (kinds.has('interface') && (kinds.has('constant') || kinds.has('variable'))) {
    return 'constant-interface';
  }
  if (kinds.has('interface') && kinds.has('class')) return 'class-interface';
  if ((kinds.has('enum') || kinds.has('namespace')) && [...kinds].some((kind) => TYPE_KINDS.has(kind))) {
    return 'enum-type';
  }
  if (kinds.has('type_alias') && [...kinds].some((kind) => VALUE_KINDS.has(kind))) {
    return 'type-alias-value';
  }
  return 'other';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTaxonomy({
  rows,
  profilePath,
  dbPath,
  sourceRoot,
  sampleSourceUnavailableReason,
  overloadImplementationResolvedRefs,
}) {
  const subtypes = {};
  const sourceCache = new Map();
  const sourceReadPaths = new Set();
  let databaseOpened = false;
  let databaseUnavailableReason;

  if (!fs.existsSync(dbPath)) {
    databaseUnavailableReason = `Database not found: ${dbPath}`;
  } else {
    databaseOpened = true;
  }

  for (const row of rows) {
    let candidates = [];
    let subtype = 'unknown-multiple';
    if (databaseOpened) {
      try {
        candidates = loadCandidates(dbPath, row);
        subtype = classifyCandidates(candidates);
      } catch (error) {
        databaseUnavailableReason = error instanceof Error ? error.message : String(error);
      }
    }
    const syntaxMetadata = buildSyntaxMetadata({
      row,
      candidates,
      subtype,
      sourceRoot,
      sourceCache,
      sourceReadPaths,
    });
    addSubtype(subtypes, subtype, row, candidates, syntaxMetadata);
  }

  const sortedSubtypes = Object.fromEntries(
    Object.entries(subtypes).sort(([left], [right]) => left.localeCompare(right)),
  );
  const summarySubtypes = Object.fromEntries(
    Object.entries(sortedSubtypes).map(([subtype, bucket]) => [subtype, bucket.count]),
  );
  const largestSubtype = Object.entries(summarySubtypes)
    .sort(([leftName, leftCount], [rightName, rightCount]) => {
      if (rightCount !== leftCount) return rightCount - leftCount;
      return leftName.localeCompare(rightName);
    })[0]?.[0] ?? null;
  const boundedTieBreakCandidates = Object.entries(sortedSubtypes)
    .filter(([subtype]) => BOUNDED_TIE_BREAK_CANDIDATES.has(subtype))
    .map(([subtype]) => subtype);
  const noGoSubtypes = Object.entries(sortedSubtypes)
    .filter(([subtype]) => NO_GO_SUBTYPES.has(subtype))
    .map(([subtype]) => subtype);
  const collisionSubtypes = Object.fromEntries(
    Object.entries(sortedSubtypes)
      .filter(([subtype]) => isCollisionSubtype(subtype))
      .map(([subtype, bucket]) => [
        subtype,
        {
          count: bucket.count,
          recommendation: COLLISION_RECOMMENDATION[subtype] ?? 'needs-more-metadata',
        },
      ]),
  );
  const prerequisiteFirstSubtypes = Object.entries(sortedSubtypes)
    .filter(([, bucket]) => bucket.decisionPosture === 'prerequisite-first')
    .map(([subtype]) => subtype);

  return {
    generatedAt: new Date().toISOString(),
    profilePath,
    dbPath,
    sourceRoot,
    dataSource: 'rustCore.esmNamedImportExportFallbackSamples',
    sourceFilesRead: sourceReadPaths.size,
    databaseOpened,
    resolvedEvidence: {
      overloadImplementationResolvedRefs,
    },
    sampleSourceUnavailableReason: sampleSourceUnavailableReason ?? undefined,
    databaseUnavailableReason,
    rowsInspected: rows.length,
    subtypes: sortedSubtypes,
    largestSubtype,
    collisionSubtypes,
    boundedTieBreakCandidates,
    prerequisiteFirstSubtypes,
    noGoSubtypes,
    recommendedNextSlice: chooseRecommendedNextSlice(
      largestSubtype,
      boundedTieBreakCandidates,
      prerequisiteFirstSubtypes,
      databaseUnavailableReason,
      sampleSourceUnavailableReason,
    ),
    summary: {
      rowsInspected: rows.length,
      sampleSourceUnavailableReason: sampleSourceUnavailableReason ?? undefined,
      databaseUnavailableReason,
      subtypes: summarySubtypes,
      largestSubtype,
      collisionSubtypes,
      boundedTieBreakCandidates,
      prerequisiteFirstSubtypes,
      noGoSubtypes,
      resolvedEvidence: {
        overloadImplementationResolvedRefs,
      },
    },
  };
}

function chooseRecommendedNextSlice(
  largestSubtype,
  boundedTieBreakCandidates,
  prerequisiteFirstSubtypes,
  databaseUnavailableReason,
  sampleSourceUnavailableReason,
) {
  if (sampleSourceUnavailableReason) return 'no samples available';
  if (databaseUnavailableReason) return 'rerun with readable SQLite metadata';
  if (largestSubtype && BOUNDED_TIE_BREAK_CANDIDATES.has(largestSubtype)) {
    return `consider bounded tie-break for ${largestSubtype}`;
  }
  if (largestSubtype && COLLISION_RECOMMENDATION[largestSubtype] === 'candidate-for-next-routing-slice') {
    return `candidate for next routing slice: ${largestSubtype}`;
  }
  if (largestSubtype && COLLISION_RECOMMENDATION[largestSubtype]) {
    return `collision semantic decision needed for ${largestSubtype}`;
  }
  if (largestSubtype && prerequisiteFirstSubtypes.includes(largestSubtype)) {
    return `resolve prerequisite for ${largestSubtype} before tie-break`;
  }
  if (boundedTieBreakCandidates.length > 0) {
    return `bounded tie-break candidate exists: ${boundedTieBreakCandidates.join(', ')}`;
  }
  return largestSubtype
    ? `keep fallback for dominant subtype: ${largestSubtype}`
    : 'no candidate-multiple subtype dominates';
}

function renderMarkdown(taxonomy) {
  const lines = [
    '# ESM Direct Export Candidate-Multiple Taxonomy',
    '',
    `Generated: ${taxonomy.generatedAt}`,
    '',
    '## Source',
    '',
    `- Profile: \`${taxonomy.profilePath}\``,
    `- Database: \`${taxonomy.dbPath}\``,
    `- Source root: \`${taxonomy.sourceRoot}\``,
    `- Source files read for bounded syntax metadata: ${taxonomy.sourceFilesRead}`,
    `- Database opened: ${taxonomy.databaseOpened ? 'true' : 'false'}`,
    taxonomy.sampleSourceUnavailableReason
      ? `- Sample source unavailable: ${taxonomy.sampleSourceUnavailableReason}`
      : null,
    taxonomy.databaseUnavailableReason
      ? `- Database unavailable: ${taxonomy.databaseUnavailableReason}`
      : null,
    '',
    '## Summary',
    '',
    `- Rows inspected: ${taxonomy.rowsInspected}`,
    `- Largest subtype: ${taxonomy.largestSubtype ?? 'none'}`,
    `- Recommended next slice: ${taxonomy.recommendedNextSlice}`,
    `- Overload implementation resolved refs: ${taxonomy.resolvedEvidence.overloadImplementationResolvedRefs}`,
    '',
    '## Subtypes',
    '',
    '| Subtype | Count | Decision |',
    '| --- | ---: | --- |',
  ].filter(Boolean);

  for (const [subtype, bucket] of Object.entries(taxonomy.subtypes)) {
    lines.push(`| ${subtype} | ${bucket.count} | ${bucket.decisionPosture} |`);
  }

  lines.push(
    '',
    '## Decision',
    '',
    `- Bounded tie-break candidates: ${taxonomy.boundedTieBreakCandidates.join(', ') || 'none'}`,
    `- Prerequisite-first subtypes: ${taxonomy.prerequisiteFirstSubtypes.join(', ') || 'none'}`,
    `- No-go subtypes: ${taxonomy.noGoSubtypes.join(', ') || 'none'}`,
    '',
    '## Collision Subtypes',
    '',
    '| Collision subtype | Count | Recommendation |',
    '| --- | ---: | --- |',
  );

  for (const [subtype, bucket] of Object.entries(taxonomy.collisionSubtypes)) {
    lines.push(`| ${subtype} | ${bucket.count} | ${bucket.recommendation} |`);
  }

  lines.push(
    '',
    '## Examples',
    '',
  );

  for (const [subtype, bucket] of Object.entries(taxonomy.subtypes)) {
    lines.push(`### ${subtype}`, '');
    for (const example of bucket.examples) {
      const target = example.targetFilePath ? ` -> \`${example.targetFilePath}\`` : '';
      const kinds = example.candidateKinds?.length
        ? ` kinds=${example.candidateKinds.join('|')}`
        : '';
      const syntax = example.importForm
        ? ` import=${example.importForm} context=${example.usageContextHint} shape=${example.candidateShape}`
        : '';
      lines.push(
        `- \`${example.referenceName}\` from \`${example.filePath}\` (${example.language}:${example.line}:${example.col})${target}${kinds}${syntax}`,
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
  const { rows, unavailableReason, overloadImplementationResolvedRefs } = loadMultipleSamples(args.profilePath);
  const taxonomy = buildTaxonomy({
    rows,
    profilePath: args.profilePath,
    dbPath: args.dbPath,
    sourceRoot: args.sourceRoot,
    sampleSourceUnavailableReason: unavailableReason,
    overloadImplementationResolvedRefs,
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
