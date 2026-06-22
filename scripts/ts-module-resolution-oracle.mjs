#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';

const PACKAGE_RUNTIME_REASONS = new Set([
  'package-or-runtime-binding',
]);

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function usage() {
  console.log([
    'Usage: node scripts/ts-module-resolution-oracle.mjs --project <dir> --profile <path> [--out-dir <dir>] [--prefix <name>]',
    '',
    'Builds an evidence-only TypeScript compiler moduleResolution oracle map',
    'for Rust package/runtime fallback samples. This script is benchmark tooling',
    'only; it does not change production indexing behavior.',
  ].join('\n'));
}

function parseArgs(argv) {
  let projectRoot = null;
  let profilePath = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = `${new Date().toISOString().slice(0, 10)}-ts-module-resolution-oracle`;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--project') {
      projectRoot = path.resolve(requiredValue(argv, ++i, '--project'));
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

  if (!projectRoot) throw new Error('--project is required');
  if (!profilePath) throw new Error('--profile is required');
  return { help: false, projectRoot, profilePath, outDir, prefix };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function loadSamples(profilePath) {
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const shadowSamples = profile?.rustCore?.moduleResolutionShadowSamples
    ?? profile?.profile?.moduleResolutionShadowSamples
    ?? profile?.moduleResolutionShadowSamples;
  if (Array.isArray(shadowSamples)) {
    return {
      rows: shadowSamples.map((sample) => ({
        sampleSource: 'moduleResolutionShadowSamples',
        rustCurrentReason: String(sample.fallbackReason ?? sample.failedLookupCategory ?? 'none'),
        referenceName: String(sample.specifier ?? ''),
        referenceKind: 'imports',
        filePath: String(sample.sourceFile ?? ''),
        language: String(sample.language ?? 'typescript'),
        line: Number.isFinite(sample.line) ? sample.line : 0,
        col: Number.isFinite(sample.col) ? sample.col : 0,
        rustCurrentTarget: typeof sample.resolvedPath === 'string' ? sample.resolvedPath : null,
        rustResolvedKind: String(sample.resolvedKind ?? 'unknown'),
        rustParityStatus: String(sample.parityStatus ?? 'unknown'),
        importSpecifier: typeof sample.specifier === 'string' ? sample.specifier : null,
      })),
      unavailableReason: shadowSamples.length === 0
        ? 'rustCore.moduleResolutionShadowSamples is empty'
        : null,
      dataSource: 'rustCore.moduleResolutionShadowSamples',
    };
  }

  const samples = profile?.rustCore?.esmNamedImportExportFallbackSamples;
  if (!Array.isArray(samples)) {
    return {
      rows: [],
      unavailableReason: 'rustCore.esmNamedImportExportFallbackSamples is missing or not an array',
      dataSource: 'rustCore.esmNamedImportExportFallbackSamples filtered to package/runtime reasons',
    };
  }
  return {
    rows: samples
      .filter((sample) => PACKAGE_RUNTIME_REASONS.has(String(sample.reason ?? '')))
      .map((sample) => ({
        sampleSource: 'esmNamedImportExportFallbackSamples',
        rustCurrentReason: String(sample.reason ?? 'unknown'),
        referenceName: String(sample.referenceName ?? ''),
        referenceKind: String(sample.referenceKind ?? ''),
        filePath: String(sample.filePath ?? ''),
        language: String(sample.language ?? 'unknown'),
        line: Number.isFinite(sample.line) ? sample.line : 0,
        col: Number.isFinite(sample.col) ? sample.col : 0,
        rustCurrentTarget: typeof sample.targetFilePath === 'string' ? sample.targetFilePath : null,
        rustResolvedKind: 'packageOrRuntime',
        rustParityStatus: 'unknown',
        importSpecifier: null,
      })),
    unavailableReason: samples.length === 0
      ? 'rustCore.esmNamedImportExportFallbackSamples is empty'
      : null,
    dataSource: 'rustCore.esmNamedImportExportFallbackSamples filtered to package/runtime reasons',
  };
}

function compilerOptionsForProject(projectRoot) {
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json')
    ?? ts.findConfigFile(projectRoot, ts.sys.fileExists, 'jsconfig.json');
  if (!configPath) {
    return {
      configPath: null,
      options: {
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        module: ts.ModuleKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        allowJs: true,
      },
    };
  }
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    return {
      configPath,
      options: {
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        module: ts.ModuleKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        allowJs: true,
      },
      configReadError: ts.flattenDiagnosticMessageText(read.error.messageText, '\n'),
    };
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
  );
  return {
    configPath,
    options: parsed.options,
  };
}

function moduleSpecifierFromSourceLine(projectRoot, filePath, line) {
  const abs = path.join(projectRoot, filePath);
  let text;
  try {
    const lines = fs.readFileSync(abs, 'utf-8').split(/\r?\n/);
    text = lines[Math.max(0, line - 1)] ?? '';
  } catch {
    return { importSpecifier: null, unavailableReason: 'source-file-unavailable' };
  }
  const specifier =
    text.match(/\bfrom\s+["']([^"']+)["']/)?.[1]
    ?? text.match(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/)?.[1]
    ?? text.match(/\bimport\s+["']([^"']+)["']/)?.[1]
    ?? text.match(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/)?.[1];
  return specifier
    ? { importSpecifier: specifier, unavailableReason: null }
    : { importSpecifier: null, unavailableReason: 'module-specifier-unavailable' };
}

function resolveWithTypeScript(projectRoot, sourceFile, specifier, options) {
  if (NODE_BUILTINS.has(specifier)) {
    return {
      tsResolvedKind: 'node-runtime-builtin',
      tsResolvedPath: null,
      repoLocal: false,
      isExternalLibraryImport: false,
    };
  }

  const host = ts.createCompilerHost(options, true);
  const resolved = ts.resolveModuleName(
    specifier,
    path.join(projectRoot, sourceFile),
    options,
    host,
  ).resolvedModule;

  if (!resolved) {
    return {
      tsResolvedKind: 'unresolved',
      tsResolvedPath: null,
      repoLocal: false,
      isExternalLibraryImport: false,
    };
  }

  const resolvedPath = path.resolve(resolved.resolvedFileName);
  const repoLocal = isInside(projectRoot, resolvedPath) && !resolvedPath.includes(`${path.sep}node_modules${path.sep}`);
  const bare = isBareSpecifier(specifier);
  let tsResolvedKind = 'relative-or-alias';
  if (repoLocal && bare && matchesTsPathsAlias(options, specifier)) {
    tsResolvedKind = 'repo-local-paths-alias';
  } else if (repoLocal && bare) {
    tsResolvedKind = isPackageSubpath(specifier, readRootPackageName(projectRoot))
      ? 'repo-local-package-subpath'
      : 'repo-local-package';
  } else if (repoLocal) {
    tsResolvedKind = 'repo-local-source';
  } else if (resolved.isExternalLibraryImport || resolvedPath.includes(`${path.sep}node_modules${path.sep}`)) {
    tsResolvedKind = bare && hasPackageSubpath(specifier)
      ? 'third-party-package-subpath'
      : 'third-party-package';
  }

  return {
    tsResolvedKind,
    tsResolvedPath: toRepoRelativeOrExternal(projectRoot, resolvedPath),
    repoLocal,
    isExternalLibraryImport: Boolean(resolved.isExternalLibraryImport),
  };
}

function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function toRepoRelativeOrExternal(projectRoot, target) {
  return isInside(projectRoot, target)
    ? normalizePath(path.relative(projectRoot, target))
    : normalizePath(target);
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function isBareSpecifier(specifier) {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.match(/^[A-Za-z]:/);
}

function hasPackageSubpath(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').length > 2;
  }
  return specifier.includes('/');
}

function isPackageSubpath(specifier, packageName) {
  return Boolean(packageName && specifier.startsWith(`${packageName}/`));
}

function matchesTsPathsAlias(options, specifier) {
  const paths = options?.paths;
  if (!paths || typeof paths !== 'object') return false;
  return Object.keys(paths).some((pattern) => matchesTsPathPattern(pattern, specifier));
}

function matchesTsPathPattern(pattern, specifier) {
  const starIndex = pattern.indexOf('*');
  if (starIndex === -1) return pattern === specifier;
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  return specifier.startsWith(prefix) && specifier.endsWith(suffix);
}

function readRootPackageName(projectRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    return typeof pkg?.name === 'string' ? pkg.name : null;
  } catch {
    return null;
  }
}

function deltaBucketFor(row, resolved) {
  if (!row.importSpecifier) return row.specifierUnavailableReason;
  if (resolved.tsResolvedKind === 'node-runtime-builtin') return 'ts-runtime-builtin-boundary';
  if (resolved.tsResolvedKind === 'repo-local-paths-alias') return 'ts-resolves-repo-local-paths-alias';
  if (resolved.repoLocal) return 'ts-resolves-repo-local-rust-fallback';
  if (resolved.tsResolvedKind.startsWith('third-party')) return 'ts-resolves-third-party-boundary';
  if (resolved.tsResolvedKind === 'unresolved') return 'ts-unresolved-package-runtime';
  return 'ts-resolution-other';
}

function parityStatusFor(row, resolved) {
  if (!row.importSpecifier) return 'no-oracle';
  if (resolved.tsResolvedKind === 'unresolved') {
    return row.rustResolvedKind === 'unresolved' ? 'match' : 'mismatch';
  }
  if (resolved.tsResolvedKind === 'node-runtime-builtin') {
    return row.rustResolvedKind === 'nodeRuntimeBuiltin' ? 'match' : 'mismatch';
  }
  if (resolved.repoLocal) {
    return normalizePath(row.rustCurrentTarget ?? '') === normalizePath(resolved.tsResolvedPath ?? '')
      ? 'match'
      : 'mismatch';
  }
  if (resolved.tsResolvedKind.startsWith('third-party')) {
    return row.rustResolvedKind === 'packageOrRuntime' ? 'match' : 'mismatch';
  }
  return 'unknown';
}

function recommendedSliceFor(row) {
  switch (row.deltaBucket) {
    case 'ts-resolves-repo-local-paths-alias':
      return 'paths/rootDirs parity slice + oracle taxonomy correction';
    case 'ts-resolves-repo-local-rust-fallback':
      return row.tsResolvedKind === 'repo-local-package-subpath'
        ? 'package exports/imports repo-local file target'
        : 'repo-local package/self-name resolution';
    case 'ts-runtime-builtin-boundary':
      return 'Node/runtime builtin boundary taxonomy';
    case 'ts-resolves-third-party-boundary':
      return row.tsResolvedKind === 'third-party-package-subpath'
        ? 'third-party package subpath boundary taxonomy'
        : 'third-party package boundary taxonomy';
    default:
      return 'package/runtime unresolved no-go taxonomy';
  }
}

function buildRows(projectRoot, profilePath) {
  const source = loadSamples(profilePath);
  const config = compilerOptionsForProject(projectRoot);
  const rows = [];
  for (const sample of source.rows) {
    const specifier = sample.importSpecifier
      ? { importSpecifier: sample.importSpecifier, unavailableReason: null }
      : moduleSpecifierFromSourceLine(projectRoot, sample.filePath, sample.line);
    const base = {
      filePath: sample.filePath,
      language: sample.language,
      line: sample.line,
      col: sample.col,
      referenceName: sample.referenceName,
      referenceKind: sample.referenceKind,
      importSpecifier: specifier.importSpecifier,
      rustCurrentReason: sample.rustCurrentReason,
      rustCurrentTarget: sample.rustCurrentTarget,
      rustResolvedKind: sample.rustResolvedKind,
      rustParityStatus: sample.rustParityStatus,
      specifierUnavailableReason: specifier.unavailableReason,
    };
    const resolved = specifier.importSpecifier
      ? resolveWithTypeScript(projectRoot, sample.filePath, specifier.importSpecifier, config.options)
      : {
          tsResolvedKind: specifier.unavailableReason,
          tsResolvedPath: null,
          repoLocal: false,
          isExternalLibraryImport: false,
        };
    const row = {
      ...base,
      ...resolved,
    };
    row.deltaBucket = deltaBucketFor(row, resolved);
    row.parityStatus = parityStatusFor(row, resolved);
    row.recommendedSlice = recommendedSliceFor(row);
    rows.push(row);
  }
  return {
    rows,
    sampleSourceUnavailableReason: source.unavailableReason,
    dataSource: source.dataSource,
    tsconfigPath: config.configPath ? normalizePath(path.relative(projectRoot, config.configPath)) : null,
    tsconfigReadError: config.configReadError ?? null,
  };
}

function summarize(rows, sampleSourceUnavailableReason) {
  const deltaBuckets = {};
  const resolvedKinds = {};
  const parityStatuses = {};
  const recommendedSlices = {};
  for (const row of rows) {
    deltaBuckets[row.deltaBucket] = (deltaBuckets[row.deltaBucket] ?? 0) + 1;
    resolvedKinds[row.tsResolvedKind] = (resolvedKinds[row.tsResolvedKind] ?? 0) + 1;
    parityStatuses[row.parityStatus] = (parityStatuses[row.parityStatus] ?? 0) + 1;
    recommendedSlices[row.recommendedSlice] = (recommendedSlices[row.recommendedSlice] ?? 0) + 1;
  }
  const recommendedSliceGoals = Object.keys(recommendedSlices).sort((a, b) => {
    const priority = (value) => {
      if (value === 'repo-local package/self-name resolution') return 0;
      if (value === 'paths/rootDirs parity slice + oracle taxonomy correction') return 1;
      if (value === 'package exports/imports repo-local file target') return 2;
      if (value.includes('boundary taxonomy')) return 3;
      return 4;
    };
    return priority(a) - priority(b) || recommendedSlices[b] - recommendedSlices[a];
  });
  return {
    rowsInspected: rows.length,
    sampleSourceUnavailableReason,
    deltaBuckets,
    resolvedKinds,
    parityStatuses,
    recommendedSlices,
    recommendedSliceGoals,
    recommendedTotalSliceCount: recommendedSliceGoals.length + 1, // include closeout
  };
}

function buildArtifact(args) {
  const built = buildRows(args.projectRoot, args.profilePath);
  const summary = summarize(built.rows, built.sampleSourceUnavailableReason);
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: displayPath(args.projectRoot),
    profilePath: displayPath(args.profilePath),
    dataSource: built.dataSource,
    productionRuntimeBehaviorChanged: false,
    typescriptRuntimeDependencyAdded: false,
    sourceContentIncluded: false,
    sourceFilesReadForSpecifierExtraction: true,
    tsconfigPath: built.tsconfigPath,
    tsconfigReadError: built.tsconfigReadError,
    rows: built.rows,
    summary,
  };
}

function displayPath(value) {
  const resolved = path.resolve(value);
  const cwd = process.cwd();
  if (isInside(cwd, resolved)) {
    const relative = path.relative(cwd, resolved);
    return relative ? normalizePath(relative) : '.';
  }
  return normalizePath(resolved);
}

function renderMarkdown(artifact) {
  const lines = [
    '# TypeScript Module Resolution Oracle',
    '',
    `Generated: ${artifact.generatedAt}`,
    '',
    '## Source',
    '',
    `- Project: \`${artifact.projectRoot}\``,
    `- Profile: \`${artifact.profilePath}\``,
    `- Data source: \`${artifact.dataSource}\``,
    `- tsconfig/jsconfig: ${artifact.tsconfigPath ? `\`${artifact.tsconfigPath}\`` : 'not found, NodeNext defaults used'}`,
    '- Production runtime behavior changed: false',
    '- TypeScript runtime dependency added: false',
    '- Source content included: false',
    '',
    '## Summary',
    '',
    `- Rows inspected: ${artifact.summary.rowsInspected}`,
    `- Recommended total slice count: ${artifact.summary.recommendedTotalSliceCount}`,
    '',
    '### Delta Buckets',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    ...Object.entries(artifact.summary.deltaBuckets)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([bucket, count]) => `| \`${bucket}\` | ${count} |`),
    '',
    '### Parity Statuses',
    '',
    '| Status | Count |',
    '| --- | ---: |',
    ...Object.entries(artifact.summary.parityStatuses)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| \`${status}\` | ${count} |`),
    '',
    '### Recommended Slice Goals',
    '',
    ...artifact.summary.recommendedSliceGoals.map((goal) => `- ${goal}`),
    '',
    '## Examples',
    '',
    '| Delta | Parity | Specifier | TS kind | TS path | File |',
    '| --- | --- | --- | --- | --- | --- |',
    ...artifact.rows.slice(0, 20).map((row) => [
      `\`${row.deltaBucket}\``,
      `\`${row.parityStatus}\``,
      `\`${row.importSpecifier ?? 'unavailable'}\``,
      `\`${row.tsResolvedKind}\``,
      row.tsResolvedPath ? `\`${row.tsResolvedPath}\`` : '',
      `\`${row.filePath}:${row.line}\``,
    ].join(' | ')).map((line) => `| ${line} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const artifact = buildArtifact(args);
  fs.mkdirSync(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `${args.prefix}.json`);
  const markdownPath = path.join(args.outDir, `${args.prefix}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(artifact));

  process.stdout.write(`${JSON.stringify({
    artifacts: {
      json: jsonPath,
      markdown: markdownPath,
    },
    summary: artifact.summary,
  }, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
