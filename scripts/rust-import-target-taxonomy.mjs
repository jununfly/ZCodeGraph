#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const JS_TS_LANGUAGES = new Set(['javascript', 'jsx', 'typescript', 'tsx']);
const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
]);
const DECLARATION_EXTENSIONS = ['.d.ts', '.d.mts', '.d.cts'];
const ASSET_EXTENSIONS = new Set([
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.wasm',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.mp3',
  '.mp4',
  '.wav',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

function usage() {
  console.log([
    'Usage: node scripts/rust-import-target-taxonomy.mjs --db <path> [--out-dir <dir>] [--prefix <name>]',
    '       node scripts/rust-import-target-taxonomy.mjs --repo <path> [--out-dir <dir>] [--prefix <name>]',
    '       node scripts/rust-import-target-taxonomy.mjs --profile <path> [--out-dir <dir>] [--prefix <name>]',
    '',
    'Classifies JS/TS relative unresolved import targets from unresolved_refs or Rust core profile samples.',
    'This diagnostic reads database metadata only; it does not read source files.',
  ].join('\n'));
}

function parseArgs(argv) {
  let dbPath = null;
  let repoPath = null;
  let profilePath = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = `${new Date().toISOString().slice(0, 10)}-relative-import-target-taxonomy`;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--db') {
      dbPath = path.resolve(requiredValue(argv, ++i, '--db'));
      continue;
    }
    if (arg === '--repo') {
      repoPath = path.resolve(requiredValue(argv, ++i, '--repo'));
      continue;
    }
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

  if (profilePath && (dbPath || repoPath)) {
    throw new Error('--profile cannot be combined with --db or --repo');
  }
  if (repoPath && !dbPath && !profilePath) {
    dbPath = path.join(repoPath, '.zcodegraph', 'zcodegraph.db');
  }
  if (!dbPath && !profilePath) {
    dbPath = path.resolve('.zcodegraph', 'zcodegraph.db');
  }

  return { help: false, dbPath, profilePath, outDir, prefix };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function openDatabase(dbPath) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(dbPath, { readOnly: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Failed to open SQLite via node:sqlite. Run this diagnostic with Node 22.5+ ' +
      `or the bundled CodeGraph runtime. Underlying error: ${message}`,
    );
  }
}

function loadRows(db) {
  return db.prepare(`
    SELECT reference_name, reference_kind, line, col, file_path, language
    FROM unresolved_refs
    ORDER BY id
  `).all();
}

function loadProfileSamples(profilePath) {
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const samples = profile?.rustCore?.importPathAliasFallbackSamples;
  if (!Array.isArray(samples)) {
    return {
      rows: [],
      unavailableReason: 'rustCore.importPathAliasFallbackSamples is missing or not an array',
    };
  }
  return {
    rows: samples.map((sample) => ({
      reference_name: sample.referenceName ?? '',
      reference_kind: 'imports',
      line: sample.line ?? 0,
      col: sample.col ?? 0,
      file_path: sample.filePath ?? '',
      language: sample.language ?? 'unknown',
      source_kind: sample.sourceKind ?? 'unknown',
      reason: sample.reason ?? 'unknown',
      target_kind: sample.targetKind ?? null,
      target_extension: sample.targetExtension ?? null,
    })),
    unavailableReason: samples.length === 0
      ? 'rustCore.importPathAliasFallbackSamples is empty'
      : null,
  };
}

function isRelativeSpecifier(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function stripQueryHash(specifier) {
  const query = specifier.indexOf('?');
  const hash = specifier.indexOf('#');
  const cutPoints = [query, hash].filter((index) => index >= 0);
  if (cutPoints.length === 0) {
    return { stripped: specifier, suffix: '' };
  }
  const cut = Math.min(...cutPoints);
  return { stripped: specifier.slice(0, cut), suffix: specifier.slice(cut) };
}

function hasDeclarationExtension(specifier) {
  return DECLARATION_EXTENSIONS.some((extension) => specifier.endsWith(extension));
}

function extensionOfSpecifier(specifier) {
  if (hasDeclarationExtension(specifier)) return '.d.ts';
  const basename = specifier.split('/').pop() ?? specifier;
  const ext = path.posix.extname(basename);
  return ext || null;
}

function classifyReference(row) {
  if (row.target_kind === 'asset') return 'nonCodeAssetTarget';
  if (row.target_kind === 'config') return 'nonCodeConfigTarget';
  if (row.target_kind === 'source') return 'supportedSourceSpecifier';

  const raw = String(row.reference_name ?? '');
  if (raw.includes('${') || raw.includes('*')) return 'dynamicOrTemplateLike';
  if (raw.includes('\\') || raw.includes('//') || raw.includes('/./')) {
    return 'suspiciousPathNormalization';
  }

  const { stripped, suffix } = stripQueryHash(raw);
  const ext = extensionOfSpecifier(stripped);

  if (suffix) {
    if (hasDeclarationExtension(stripped)) return 'queryHashDeclarationTarget';
    if (ext && SUPPORTED_SOURCE_EXTENSIONS.has(ext)) return 'queryHashSupportedSource';
    if (ext && ASSET_EXTENSIONS.has(ext)) return 'queryHashAssetTarget';
    return 'queryHashUnknownTarget';
  }

  if (hasDeclarationExtension(stripped)) return 'declarationTarget';
  if (ext && ASSET_EXTENSIONS.has(ext)) return 'assetLikeTarget';
  if (ext && SUPPORTED_SOURCE_EXTENSIONS.has(ext)) return 'supportedSourceSpecifier';
  if (ext) return 'unsupportedExtension';
  if (stripped.endsWith('/')) return 'directoryIndexCandidate';
  return 'extensionlessOrIndexCandidate';
}

function emptyIgnoredRows() {
  return {
    nonImportReference: 0,
    unsupportedLanguage: 0,
    nonRelativeImport: 0,
  };
}

function addCategory(categories, category, row) {
  const bucket = categories[category] ?? {
    count: 0,
    examples: [],
  };
  bucket.count += 1;
  if (bucket.examples.length < 10) {
    bucket.examples.push({
      referenceName: row.reference_name,
      filePath: row.file_path,
      language: row.language,
      line: row.line,
      col: row.col,
    });
  }
  categories[category] = bucket;
}

function buildTaxonomy(rows, source) {
  const ignoredRows = emptyIgnoredRows();
  const categories = {};
  let totalRelativeUnresolvedImports = 0;

  for (const row of rows) {
    if (row.reference_kind !== 'imports') {
      ignoredRows.nonImportReference += 1;
      continue;
    }
    if (!JS_TS_LANGUAGES.has(row.language)) {
      ignoredRows.unsupportedLanguage += 1;
      continue;
    }
    if (!isRelativeSpecifier(row.reference_name)) {
      ignoredRows.nonRelativeImport += 1;
      continue;
    }

    totalRelativeUnresolvedImports += 1;
    addCategory(categories, classifyReference(row), row);
  }

  const sortedCategories = Object.fromEntries(
    Object.entries(categories).sort(([left], [right]) => left.localeCompare(right)),
  );
  const summaryCategories = Object.fromEntries(
    Object.entries(sortedCategories).map(([category, bucket]) => [category, bucket.count]),
  );

  return {
    generatedAt: new Date().toISOString(),
    ...source,
    rowsInspected: rows.length,
    totalRelativeUnresolvedImports,
    ignoredRows,
    categories: sortedCategories,
    summary: {
      totalRelativeUnresolvedImports,
      categories: summaryCategories,
    },
  };
}

function renderMarkdown(taxonomy) {
  const lines = [
    '# Relative Import Target Taxonomy',
    '',
    `Generated: ${taxonomy.generatedAt}`,
    '',
    '## Source',
    '',
    taxonomy.dbPath ? `- DB: \`${taxonomy.dbPath}\`` : null,
    taxonomy.profilePath ? `- Profile: \`${taxonomy.profilePath}\`` : null,
    `- Data source: \`${taxonomy.dataSource}\``,
    '- Source files read: none',
    taxonomy.sampleSourceUnavailableReason
      ? `- Sample source unavailable: ${taxonomy.sampleSourceUnavailableReason}`
      : null,
    '',
    '## Summary',
    '',
    `- Rows inspected: ${taxonomy.rowsInspected}`,
    `- Relative unresolved JS/TS imports: ${taxonomy.totalRelativeUnresolvedImports}`,
    `- Ignored non-import references: ${taxonomy.ignoredRows.nonImportReference}`,
    `- Ignored unsupported languages: ${taxonomy.ignoredRows.unsupportedLanguage}`,
    `- Ignored non-relative imports: ${taxonomy.ignoredRows.nonRelativeImport}`,
    '',
    '## Categories',
    '',
    '| Category | Count |',
    '| --- | ---: |',
  ].filter(Boolean);

  for (const [category, bucket] of Object.entries(taxonomy.categories)) {
    lines.push(`| ${category} | ${bucket.count} |`);
  }

  lines.push('', '## Examples', '');
  for (const [category, bucket] of Object.entries(taxonomy.categories)) {
    lines.push(`### ${category}`, '');
    for (const example of bucket.examples) {
      lines.push(
        `- \`${example.referenceName}\` from \`${example.filePath}\` (${example.language}:${example.line}:${example.col})`,
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
  if (args.profilePath) {
    if (!fs.existsSync(args.profilePath)) {
      throw new Error(`Profile not found: ${args.profilePath}`);
    }
    const { rows, unavailableReason } = loadProfileSamples(args.profilePath);
    const taxonomy = buildTaxonomy(rows, {
      profilePath: args.profilePath,
      dataSource: 'rustCore.importPathAliasFallbackSamples',
      sampleSourceUnavailableReason: unavailableReason ?? undefined,
    });
    const artifacts = writeArtifacts(taxonomy, args.outDir, args.prefix);
    process.stdout.write(`${JSON.stringify({ artifacts, summary: taxonomy.summary }, null, 2)}\n`);
    return;
  }

  if (!fs.existsSync(args.dbPath)) {
    throw new Error(`Database not found: ${args.dbPath}`);
  }

  const db = openDatabase(args.dbPath);
  try {
    const rows = loadRows(db);
    const taxonomy = buildTaxonomy(rows, {
      dbPath: args.dbPath,
      dataSource: 'unresolved_refs metadata only',
    });
    const artifacts = writeArtifacts(taxonomy, args.outDir, args.prefix);
    process.stdout.write(`${JSON.stringify({ artifacts, summary: taxonomy.summary }, null, 2)}\n`);
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
