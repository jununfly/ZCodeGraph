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
        importKind: typeof sample.importKind === 'string' ? sample.importKind : null,
        declarationTargetRelationship: typeof sample.declarationTargetRelationship === 'string'
          ? sample.declarationTargetRelationship
          : null,
        runtimeTargetPath: typeof sample.runtimeTargetPath === 'string' ? sample.runtimeTargetPath : null,
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
        importKind: typeof sample.importKind === 'string' ? sample.importKind : null,
        declarationTargetRelationship: typeof sample.declarationTargetRelationship === 'string'
          ? sample.declarationTargetRelationship
          : null,
        runtimeTargetPath: typeof sample.runtimeTargetPath === 'string' ? sample.runtimeTargetPath : null,
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
  if (repoLocal && specifier.startsWith('#')) {
    tsResolvedKind = 'repo-local-package-import';
  } else if (repoLocal && bare && matchesTsPathsAlias(options, specifier)) {
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

  const packageExportsSlice = repoLocal && bare
    ? packageExportsRecommendedSlice(projectRoot, specifier)
    : null;
  const packageImportsSlice = repoLocal && specifier.startsWith('#')
    ? packageImportsRecommendedSlice(projectRoot, sourceFile, specifier)
    : null;
  const resolvedPackageInfo = packageInfoForResolvedPath(projectRoot, resolvedPath);
  return {
    tsResolvedKind,
    tsResolvedPath: toRepoRelativeOrExternal(projectRoot, resolvedPath),
    repoLocal,
    isExternalLibraryImport: Boolean(resolved.isExternalLibraryImport),
    packageExportsCovered: Boolean(packageExportsSlice),
    packageExportsRecommendedSlice: packageExportsSlice,
    packageImportsCovered: Boolean(packageImportsSlice),
    packageImportsRecommendedSlice: packageImportsSlice,
    resolvedPackageHasTypesVersions: resolvedPackageInfo.hasTypesVersions,
    resolvedPathTraversesSymlink: pathTraversesSymlink(projectRoot, resolvedPath),
    preserveSymlinks: Boolean(options.preserveSymlinks),
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

function readRootPackageJson(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  } catch {
    return null;
  }
}

function readNearestPackageJson(projectRoot, sourceFile) {
  let dir = path.dirname(path.join(projectRoot, sourceFile));
  const root = path.resolve(projectRoot);
  while (isInside(root, dir)) {
    try {
      const packagePath = path.join(dir, 'package.json');
      return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function packageInfoForResolvedPath(projectRoot, resolvedPath) {
  let dir = path.dirname(path.resolve(resolvedPath));
  const root = path.resolve(projectRoot);
  while (isInside(root, dir)) {
    const packagePath = path.join(dir, 'package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        hasTypesVersions: Boolean(pkg && typeof pkg === 'object' && Object.prototype.hasOwnProperty.call(pkg, 'typesVersions')),
      };
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return { hasTypesVersions: false };
}

function pathTraversesSymlink(projectRoot, resolvedPath) {
  const root = path.resolve(projectRoot);
  const relative = path.relative(root, path.resolve(resolvedPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch {
      return false;
    }
  }
  return false;
}

function packageExportsRecommendedSlice(projectRoot, specifier) {
  const pkg = readRootPackageJson(projectRoot);
  const packageName = typeof pkg?.name === 'string' ? pkg.name : null;
  if (!packageName || !pkg || !Object.prototype.hasOwnProperty.call(pkg, 'exports')) return null;
  if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) return null;
  const subpath = specifier === packageName ? '' : specifier.slice(packageName.length + 1);
  const exportKey = subpath ? `./${subpath}` : '.';
  const exportsValue = pkg.exports;
  if (typeof exportsValue === 'string') {
    return exportKey === '.' ? 'simple exports string/object repo-local target slice' : null;
  }
  if (!exportsValue || typeof exportsValue !== 'object' || Array.isArray(exportsValue)) return null;
  if (Object.prototype.hasOwnProperty.call(exportsValue, exportKey)) {
    return hasNestedExportCondition(exportsValue[exportKey])
      ? 'pattern/nested exports repo-local completion slice'
      : 'simple exports string/object repo-local target slice';
  }
  for (const pattern of Object.keys(exportsValue)) {
    if (matchesSingleStarExportPattern(pattern, exportKey)) {
      return 'pattern/nested exports repo-local completion slice';
    }
  }
  return null;
}

function matchesSingleStarExportPattern(pattern, key) {
  const firstStar = pattern.indexOf('*');
  if (firstStar === -1 || firstStar !== pattern.lastIndexOf('*')) return false;
  const prefix = pattern.slice(0, firstStar);
  const suffix = pattern.slice(firstStar + 1);
  return prefix.startsWith('./') && key.startsWith(prefix) && key.endsWith(suffix);
}

function hasNestedExportCondition(value, depth = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (depth > 0) return true;
  return Object.values(value).some((child) => hasNestedExportCondition(child, depth + 1));
}

function packageImportsRecommendedSlice(projectRoot, sourceFile, specifier) {
  const pkg = readNearestPackageJson(projectRoot, sourceFile);
  if (!pkg || !Object.prototype.hasOwnProperty.call(pkg, 'imports')) return null;
  const importsValue = pkg.imports;
  if (!importsValue || typeof importsValue !== 'object' || Array.isArray(importsValue)) return null;
  if (Object.prototype.hasOwnProperty.call(importsValue, specifier)) {
    return 'package imports "#" repo-local slice';
  }
  for (const pattern of Object.keys(importsValue)) {
    if (matchesSingleStarPackageImportPattern(pattern, specifier)) {
      return 'package imports "#" repo-local slice';
    }
  }
  return null;
}

function matchesSingleStarPackageImportPattern(pattern, key) {
  const firstStar = pattern.indexOf('*');
  if (firstStar === -1 || firstStar !== pattern.lastIndexOf('*')) return false;
  const prefix = pattern.slice(0, firstStar);
  const suffix = pattern.slice(firstStar + 1);
  return prefix.startsWith('#') && key.startsWith(prefix) && key.endsWith(suffix);
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
  if (isJsonModuleRow(row)) {
    return 'JSON resolveJsonModule file-level dependency slice';
  }
  switch (row.deltaBucket) {
    case 'ts-resolves-repo-local-paths-alias':
      return 'paths/rootDirs parity slice + oracle taxonomy correction';
    case 'ts-resolves-repo-local-rust-fallback':
      return row.packageImportsRecommendedSlice
        ? row.packageImportsRecommendedSlice
        : row.packageExportsRecommendedSlice
        ? row.packageExportsRecommendedSlice
        : row.tsResolvedKind === 'repo-local-package' || row.tsResolvedKind === 'repo-local-package-subpath'
        ? 'package.json name repo-local self/subpath slice'
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

function semanticBoundaryFor(row) {
  if (isJsonModuleRow(row)) return 'json-module-boundary';
  if (isNonCodeModuleSpecifier(row.importSpecifier)) return 'non-code-module-boundary';
  switch (row.deltaBucket) {
    case 'ts-runtime-builtin-boundary':
      return 'runtime-builtin-boundary';
    case 'ts-resolves-third-party-boundary':
    case 'ts-unresolved-package-runtime':
      return 'external-package-boundary';
    case 'ts-resolves-repo-local-paths-alias':
    case 'ts-resolves-repo-local-rust-fallback':
      return 'repo-local-source';
    default:
      return 'unclassified-boundary';
  }
}

function isJsonModuleRow(row) {
  return isJsonModuleSpecifier(row.importSpecifier) || isJsonModuleSpecifier(row.tsResolvedPath);
}

function isJsonModuleSpecifier(value) {
  if (typeof value !== 'string') return false;
  return value.split(/[?#]/)[0].toLowerCase().endsWith('.json');
}

function isNonCodeModuleSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const withoutQuery = specifier.split(/[?#]/)[0].toLowerCase();
  return [
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.avif',
    '.ico',
    '.wasm',
  ].some((extension) => withoutQuery.endsWith(extension));
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
      importKind: sample.importKind,
      declarationTargetRelationship: sample.declarationTargetRelationship,
      runtimeTargetPath: sample.runtimeTargetPath,
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
    row.semanticBoundary = semanticBoundaryFor(row);
    row.researchFrontiers = researchFrontiersFor(row);
    row.researchFrontier = row.researchFrontiers[0] ?? null;
    row.researchDecision = researchDecisionFor(row.researchFrontiers);
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

function researchFrontiersFor(row) {
  const frontiers = [];
  if (row.resolvedPackageHasTypesVersions) {
    frontiers.push('typesVersions');
  }
  if (row.preserveSymlinks && row.resolvedPathTraversesSymlink) {
    frontiers.push('symlink-preserve-symlinks');
  }
  if (row.declarationTargetRelationship || row.runtimeTargetPath) {
    frontiers.push('declaration-runtime-pairing');
  }
  if (row.importKind === 'type') {
    frontiers.push('type-only-runtime-divergence');
  }
  return frontiers;
}

function researchDecisionFor(frontiers) {
  if (!frontiers.length) return 'not-research-frontier';
  if (frontiers.some((frontier) => frontier === 'type-only-runtime-divergence') && frontiers.length === 1) {
    return 'defer/no-go';
  }
  return 'keep-research';
}

function summarize(rows, sampleSourceUnavailableReason) {
  const deltaBuckets = {};
  const resolvedKinds = {};
  const parityStatuses = {};
  const recommendedSlices = {};
  const semanticBoundaries = {};
  const researchFrontiers = {};
  const researchDecisions = {};
  for (const row of rows) {
    deltaBuckets[row.deltaBucket] = (deltaBuckets[row.deltaBucket] ?? 0) + 1;
    resolvedKinds[row.tsResolvedKind] = (resolvedKinds[row.tsResolvedKind] ?? 0) + 1;
    parityStatuses[row.parityStatus] = (parityStatuses[row.parityStatus] ?? 0) + 1;
    recommendedSlices[row.recommendedSlice] = (recommendedSlices[row.recommendedSlice] ?? 0) + 1;
    semanticBoundaries[row.semanticBoundary] = (semanticBoundaries[row.semanticBoundary] ?? 0) + 1;
    for (const frontier of row.researchFrontiers ?? []) {
      researchFrontiers[frontier] = (researchFrontiers[frontier] ?? 0) + 1;
    }
    researchDecisions[row.researchDecision] = (researchDecisions[row.researchDecision] ?? 0) + 1;
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
    semanticBoundaries,
    parityStatuses,
    recommendedSlices,
    researchFrontiers,
    researchDecisions,
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
    '### Semantic Boundaries',
    '',
    '| Boundary | Count |',
    '| --- | ---: |',
    ...Object.entries(artifact.summary.semanticBoundaries)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([boundary, count]) => `| \`${boundary}\` | ${count} |`),
    '',
    '### Research Frontiers',
    '',
    '| Frontier | Count |',
    '| --- | ---: |',
    ...Object.entries(artifact.summary.researchFrontiers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([frontier, count]) => `| \`${frontier}\` | ${count} |`),
    '',
    '### Research Decisions',
    '',
    '| Decision | Count |',
    '| --- | ---: |',
    ...Object.entries(artifact.summary.researchDecisions)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([decision, count]) => `| \`${decision}\` | ${count} |`),
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
