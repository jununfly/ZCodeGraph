#!/usr/bin/env node
/**
 * ZCodeGraph CLI
 *
 * Command-line interface for ZCodeGraph code intelligence.
 *
 * Usage:
 *   zcodegraph                    Run interactive installer (when no args)
 *   zcodegraph install            Run interactive installer
 *   zcodegraph uninstall          Remove ZCodeGraph from your agents
 *   zcodegraph init [path]        Initialize ZCodeGraph in a project
 *   zcodegraph uninit [path]      Remove ZCodeGraph from a project
 *   zcodegraph index [path]       Index all files in the project
 *   zcodegraph sync [path]        Sync changes since last index
 *   zcodegraph status [path]      Show index status
 *   zcodegraph doctor [path]      Create a local diagnostic bundle
 *   zcodegraph query <search>     Search for symbols
 *   zcodegraph files [options]    Show project file structure
 *   zcodegraph context <task>     Build context for a task
 *   zcodegraph callers <symbol>   Find what calls a function/method
 *   zcodegraph callees <symbol>   Find what a function/method calls
 *   zcodegraph impact <symbol>    Analyze what code is affected by changing a symbol
 *   zcodegraph affected [files]   Find test files affected by changes
 *   zcodegraph upgrade [version]  Update ZCodeGraph to the latest release
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { getCodeGraphDir, isInitialized } from '../directory';
import { getDatabasePath } from '../db';
import { detectWorktreeIndexMismatch, worktreeMismatchWarning } from '../sync/worktree';
import { createShimmerProgress } from '../ui/shimmer-progress';
import { getGlyphs } from '../ui/glyphs';
import { IndexEngine, resolveIndexEngine } from '../indexing/engine-selection';
import { getRustReadinessDiagnostics, runRustIndexer } from '../indexing/rust-indexer';
import {
  buildRustHybridMetadataFromPlan,
  mergeMissingFallbackDiagnostics,
  mergeRustOwnedGapDiagnostics,
  planRustHybridAssignments,
  RustOwnedPerFileGapDiagnostic,
} from '../indexing/rust-hybrid-contract';
import { createDiagnosticBundle, formatDiagnosticBundleSummary, writeDiagnosticRunRecord } from '../diagnostics';
import { buildRustHybridFallbackSummary, formatRustHybridFallbackDoctorHint } from '../diagnostics/fallback-summary';

import { buildNode25BlockBanner, buildNodeTooOldBanner, MIN_NODE_MAJOR } from './node-version-check';
import { relaunchWithWasmRuntimeFlagsIfNeeded } from '../extraction/wasm-runtime-flags';
import { EXTRACTION_VERSION } from '../extraction/extraction-version';

function resolveGraphWorkProfile(raw: string | undefined): 'full' | 'matched-ts-js' | undefined {
  if (raw == null) return undefined;
  if (raw === 'full' || raw === 'matched-ts-js') return raw;
  throw new Error(`Unsupported graph work profile "${raw}". Supported profiles: full, matched-ts-js`);
}

function resolveIndexProfile(raw: string | undefined): 'heap' | undefined {
  if (raw == null) return undefined;
  if (raw === 'heap') return raw;
  throw new Error(`Unsupported index profile "${raw}". Supported profiles: heap`);
}

function resolveSqliteWriteMode(raw: string | undefined): 'disk' | 'final-flush' | 'memory-final-flush' {
  if (raw == null) return 'final-flush';
  if (raw === 'disk' || raw === 'final-flush' || raw === 'memory-final-flush') return raw;
  throw new Error(`Unsupported SQLite write mode "${raw}". Supported modes: disk, final-flush, memory-final-flush`);
}

type ProfileCheckpointState = 'started' | 'completed';

type ProfileCheckpoint = {
  name: string;
  state: ProfileCheckpointState;
  elapsedMs: number;
};

type ProfileArtifact = Record<string, unknown> & {
  complete: boolean;
  checkpoints: ProfileCheckpoint[];
};

class IndexProfileWriter {
  private readonly resolvedProfileOut: string;
  private readonly startedAt = Date.now();
  private readonly checkpoints: ProfileCheckpoint[] = [];
  private profile: Record<string, unknown> = {};

  constructor(projectPath: string, profileOut: string) {
    this.resolvedProfileOut = path.resolve(projectPath, profileOut);
  }

  checkpoint(name: string): void {
    this.addCheckpoint(name);
    this.write(false);
  }

  merge(profile: unknown): void {
    if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
      this.profile = { ...this.profile, ...(profile as Record<string, unknown>) };
    }
    this.write(false);
  }

  complete(profile: unknown): ProfileArtifact {
    if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
      this.profile = { ...this.profile, ...(profile as Record<string, unknown>) };
    }
    this.addCheckpoint('profile.completed');
    return this.write(true);
  }

  private addCheckpoint(name: string): void {
    const suffix = name.endsWith('.completed') ? 'completed' : 'started';
    this.checkpoints.push({
      name,
      state: suffix,
      elapsedMs: Date.now() - this.startedAt,
    });
  }

  private write(complete: boolean): ProfileArtifact {
    const artifact: ProfileArtifact = {
      complete,
      checkpoints: this.checkpoints,
      ...this.profile,
    };
    fs.mkdirSync(path.dirname(this.resolvedProfileOut), { recursive: true });
    fs.writeFileSync(this.resolvedProfileOut, `${JSON.stringify(artifact, null, 2)}\n`);
    return artifact;
  }
}

function createIndexProfileWriter(projectPath: string, profileOut: string | undefined): IndexProfileWriter | undefined {
  return profileOut ? new IndexProfileWriter(projectPath, profileOut) : undefined;
}

// Lazy-load heavy modules (CodeGraph, runInstaller) to keep CLI startup fast.
async function loadCodeGraph(): Promise<typeof import('../index')> {
  try {
    return await import('../index');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m${getGlyphs().err}\x1b[0m Failed to load CodeGraph modules.`);
    console.error(`\n  Node: ${process.version}  Platform: ${process.platform} ${process.arch}`);
    console.error(`\n  Error: ${msg}`);
    console.error('\n  Try reinstalling with: npm install -g @jununfly/zcodegraph\n');
    process.exit(1);
  }
}

// Dynamic import helper — tsc compiles import() to require() in CJS mode,
// which fails for ESM-only packages. This bypasses the transformation.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importESM = new Function('specifier', 'return import(specifier)') as
  (specifier: string) => Promise<typeof import('@clack/prompts')>;

// Block CodeGraph on Node.js 25.x — V8's turboshaft WASM JIT has a Zone
// allocator bug that reliably crashes when compiling tree-sitter
// grammars (see #54, #81, #140). The previous behaviour was a soft
// console.warn that scrolls off-screen before the OOM crash 30 seconds
// later, leading to a steady stream of "what is this OOM" reports.
// Hard-exit before any WASM work; allow override via env var for users
// who patched V8 themselves or want to test a future fix.
const nodeVersion = process.versions.node;
const nodeMajor = parseInt(nodeVersion.split('.')[0] ?? '0', 10);
if (nodeMajor >= 25) {
  process.stderr.write(buildNode25BlockBanner(nodeVersion) + '\n');
  if (!process.env.CODEGRAPH_ALLOW_UNSAFE_NODE) {
    process.exit(1);
  }
  // Override active — banner shown for visibility, continuing.
}
// Enforce the supported Node floor. `engines` in package.json only *warns* on
// install (unless engine-strict), so hard-block here to actually keep users off
// unsupported versions. Mirrors the 25+ block above. See package.json `engines`.
if (nodeMajor < MIN_NODE_MAJOR) {
  process.stderr.write(buildNodeTooOldBanner(nodeVersion) + '\n');
  if (!process.env.CODEGRAPH_ALLOW_UNSAFE_NODE) {
    process.exit(1);
  }
  // Override active — banner shown for visibility, continuing.
}

// Re-exec with V8's `--liftoff-only` if it isn't already set, so tree-sitter's
// large WASM grammars never hit the turboshaft Zone OOM (`Fatal process out of
// memory: Zone`) on Node >= 22. No-op under the bundled launcher, which already
// passes the flag. Must run before any grammar (in the parse worker, which
// inherits this process's flags) is compiled. See ../extraction/wasm-runtime-flags.
relaunchWithWasmRuntimeFlagsIfNeeded(__filename);

// Check if running with no arguments - run installer
if (process.argv.length === 2) {
  import('../installer').then(({ runInstaller }) =>
    runInstaller()
  ).catch((err) => {
    console.error('Installation failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
} else {
  // Normal CLI flow
  main();
}

process.on('uncaughtException', (error) => {
  console.error('[CodeGraph] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CodeGraph] Unhandled rejection:', reason);
});

function main() {

const program = new Command();

// Version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
);

// =============================================================================
// ANSI Color Helpers (avoid chalk ESM issues)
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const chalk = {
  bold: (s: string) => `${colors.bold}${s}${colors.reset}`,
  dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
  red: (s: string) => `${colors.red}${s}${colors.reset}`,
  green: (s: string) => `${colors.green}${s}${colors.reset}`,
  yellow: (s: string) => `${colors.yellow}${s}${colors.reset}`,
  blue: (s: string) => `${colors.blue}${s}${colors.reset}`,
  cyan: (s: string) => `${colors.cyan}${s}${colors.reset}`,
  white: (s: string) => `${colors.white}${s}${colors.reset}`,
  gray: (s: string) => `${colors.gray}${s}${colors.reset}`,
};

program
  .name('zcodegraph')
  .description('Code intelligence and knowledge graph for any codebase')
  .version(packageJson.version);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve project path from argument or current directory
 * Walks up parent directories to find nearest initialized CodeGraph project
 * (must have .zcodegraph/zcodegraph.db, not just .zcodegraph/lessons.db)
 */
function resolveProjectPath(pathArg?: string): string {
  const absolutePath = path.resolve(pathArg || process.cwd());

  // If exact path is initialized (has zcodegraph.db), use it
  if (isInitialized(absolutePath)) {
    return absolutePath;
  }

  // Walk up to find nearest parent with CodeGraph initialized
  // Note: findNearestCodeGraphRoot finds any .zcodegraph folder, but we need one with zcodegraph.db
  let current = absolutePath;
  const root = path.parse(current).root;

  while (current !== root) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;

    if (isInitialized(current)) {
      return current;
    }
  }

  // Not found - return original path (will fail later with helpful error)
  return absolutePath;
}

/**
 * Format a number with commas
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatCount(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`;
}

/**
 * Format duration in milliseconds to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

// Shimmer progress renderer (runs in a worker thread for smooth animation)
// Imported at top of file from '../ui/shimmer-progress'

/**
 * Create a plain-text progress callback for --verbose mode.
 * No animations, no ANSI tricks — just timestamped lines to stdout.
 */
function createVerboseProgress(): (progress: { phase: string; current: number; total: number; currentFile?: string }) => void {
  let lastPhase = '';
  let lastPct = -1;
  const startTime = Date.now();

  return (progress) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (progress.phase !== lastPhase) {
      lastPhase = progress.phase;
      lastPct = -1;
      console.log(`[${elapsed}s] Phase: ${progress.phase}`);
    }

    if (progress.total > 0) {
      const pct = Math.floor((progress.current / progress.total) * 100);
      // Log every 5% to keep output manageable
      if (pct >= lastPct + 5 || progress.current === progress.total) {
        lastPct = pct;
        console.log(`[${elapsed}s]   ${progress.current}/${progress.total} (${pct}%)${progress.currentFile ? ` ${getGlyphs().dash} ${progress.currentFile}` : ''}`);
      }
    } else if (progress.current > 0) {
      // Scanning phase (no total yet) — log periodically
      if (progress.current % 1000 === 0 || progress.current === 1) {
        console.log(`[${elapsed}s]   ${formatNumber(progress.current)} files found`);
      }
    }
  };
}

/**
 * Print success message
 */
function success(message: string): void {
  console.log(chalk.green(getGlyphs().ok) + ' ' + message);
}

/**
 * Print error message
 */
function error(message: string): void {
  console.error(chalk.red(getGlyphs().err) + ' ' + message);
}

/**
 * Print info message
 */
function info(message: string): void {
  console.log(chalk.blue(getGlyphs().info) + ' ' + message);
}

/**
 * Print warning message
 */
function warn(message: string): void {
  console.log(chalk.yellow(getGlyphs().warn) + ' ' + message);
}

type RustIndexProfile = {
  rustCore?: unknown;
  typescriptFallbackAppend?: {
    durationMs: number;
    fallbackFileCount: number;
    missingFallbackFileCount?: number;
    missingFallbackByLanguage?: Record<string, number>;
    errorTaxonomy: Record<string, number>;
  };
  finalize?: unknown;
  typescriptFinalizationMs?: number;
};

type IndexResult = {
  success: boolean;
  filesIndexed: number;
  filesSkipped: number;
  filesErrored: number;
  nodesCreated: number;
  edgesCreated: number;
  errors: Array<{ message: string; filePath?: string; severity: string; code?: string; line?: number; column?: number }>;
  durationMs: number;
  profile?: RustIndexProfile | Record<string, unknown>;
};

function countFatalIndexErrors(result: IndexResult): number {
  return result.errors.filter((err) => err.severity === 'error').length;
}

function countRecoverableIndexWarnings(result: IndexResult): number {
  return result.errors.filter((err) => err.severity !== 'error').length;
}

/**
 * Print indexing results using clack log methods
 */
function printIndexResult(clack: typeof import('@clack/prompts'), result: IndexResult, projectPath?: string): void {
  const hasErrors = result.filesErrored > 0;
  const fatalErrorCount = countFatalIndexErrors(result);
  const recoverableWarningCount = countRecoverableIndexWarnings(result);
  const onlyRecoverableWarnings = hasErrors && fatalErrorCount === 0 && recoverableWarningCount > 0;

  // Surface non-file-level failures (e.g. lock-acquisition failure
  // when another indexer is running) before the file-count branches.
  // Without this the CLI falls through to "No files found to index",
  // which is actively misleading — the index DID run, it just couldn't
  // get the lock.
  //
  // If success is false but no severity:'error' entry exists in
  // `result.errors` (degenerate case — shouldn't happen in practice
  // but worth guarding because the result shape is plumbed through
  // multiple call sites), fall back to a generic message rather than
  // continuing to the misleading "No files found" branch or throwing.
  if (!result.success && !hasErrors && result.filesIndexed === 0) {
    const generic = result.errors.find((e) => e.severity === 'error');
    clack.log.error(generic?.message ?? `Indexing failed ${getGlyphs().dash} no further details available`);
    return;
  }

  if (result.filesIndexed > 0) {
    if (onlyRecoverableWarnings) {
      clack.log.success(`Indexed ${formatNumber(result.filesIndexed)} files (${formatCount(recoverableWarningCount, 'warning diagnostic')})`);
    } else if (hasErrors) {
      clack.log.success(`Indexed ${formatNumber(result.filesIndexed)} files (${formatNumber(result.filesErrored)} could not be parsed)`);
    } else {
      clack.log.success(`Indexed ${formatNumber(result.filesIndexed)} files`);
    }
    clack.log.info(`${formatNumber(result.nodesCreated)} nodes, ${formatNumber(result.edgesCreated)} edges in ${formatDuration(result.durationMs)}`);
    const fallbackAppend = (result.profile as RustIndexProfile | undefined)?.typescriptFallbackAppend;
    if (fallbackAppend && fallbackAppend.fallbackFileCount > 0) {
      clack.log.warn(`Rust-hybrid appended ${formatNumber(fallbackAppend.fallbackFileCount)} TypeScript fallback files`);
    }
  } else if (hasErrors) {
    clack.log.error(`Indexing failed ${getGlyphs().dash} all ${formatNumber(result.filesErrored)} files had errors`);
  } else {
    clack.log.warn('No files found to index');
  }

  if (hasErrors) {
    const errorsByCode = new Map<string, number>();
    const warningsByCode = new Map<string, number>();
    for (const err of result.errors) {
      if (err.severity === 'error') {
        const code = err.code || 'unknown';
        errorsByCode.set(code, (errorsByCode.get(code) || 0) + 1);
      } else {
        const code = err.code || 'unknown';
        warningsByCode.set(code, (warningsByCode.get(code) || 0) + 1);
      }
    }

    const codeLabels: Record<string, string> = {
      parse_error: 'files failed to parse',
      read_error: 'files could not be read',
      size_exceeded: 'files exceeded size limit',
      path_traversal: 'blocked paths',
      unsupported_language: 'unsupported language',
      parser_error: 'parser initialization failures',
    };

    const warningLabels: Record<string, string> = {
      'rust-owned-parse-gap': 'Rust-owned files with diagnostics and no TypeScript fallback append',
      'rust-owned-extraction-gap': 'Rust-owned files with diagnostics and no TypeScript fallback append',
      'rust-owned-gap-with-partial-write-blocked': 'Rust-owned files with partial Rust writes not fallback-appended',
    };

    const errorBreakdown = Array.from(errorsByCode)
      .map(([code, count]) => `${formatNumber(count)} ${codeLabels[code] || code}`)
      .join('\n');
    const warningBreakdown = Array.from(warningsByCode)
      .map(([code, count]) => `${formatNumber(count)} ${warningLabels[code] || code}`)
      .join('\n');
    const breakdown = [errorBreakdown, warningBreakdown].filter(Boolean).join('\n');
    clack.note(breakdown, onlyRecoverableWarnings ? 'Warning breakdown' : 'Error breakdown');

    if (projectPath) {
      writeErrorLog(projectPath, result.errors);
      clack.log.info('See .zcodegraph/errors.log for details');
    }

    if (result.filesIndexed > 0) {
      clack.log.info(`The index is fully usable ${getGlyphs().dash} only the failed files are missing.`);
    }
  } else if (projectPath) {
    const logPath = path.join(projectPath, '.zcodegraph', 'errors.log');
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  }
}

/**
 * Write detailed error log to .zcodegraph/errors.log
 */
function writeErrorLog(projectPath: string, errors: Array<{ message: string; filePath?: string; severity: string; code?: string; line?: number; column?: number }>): void {
  const cgDir = path.join(projectPath, '.zcodegraph');
  if (!fs.existsSync(cgDir)) return;

  const logPath = path.join(cgDir, 'errors.log');

  // Group errors by file path
  const errorsByFile = new Map<string, Array<{ message: string; code?: string; line?: number; column?: number }>>();
  const warningsByFile = new Map<string, Array<{ message: string; code?: string; line?: number; column?: number }>>();
  const noFileErrors: Array<{ message: string; code?: string; severity: string }> = [];

  for (const err of errors) {
    const isError = err.severity === 'error';
    const target = isError ? errorsByFile : warningsByFile;
    if (err.filePath) {
      let list = target.get(err.filePath);
      if (!list) {
        list = [];
        target.set(err.filePath, list);
      }
      list.push({ message: err.message, code: err.code, line: err.line, column: err.column });
    } else {
      noFileErrors.push({ message: err.message, code: err.code, severity: err.severity });
    }
  }

  const lines: string[] = [
    `CodeGraph Error Log - ${new Date().toISOString()}`,
    `${formatCount(errorsByFile.size, 'file')} with errors`,
    `${formatCount(warningsByFile.size, 'file')} with warning diagnostics`,
    '',
  ];

  for (const [filePath, fileErrors] of errorsByFile) {
    for (const err of fileErrors) {
      lines.push(`${filePath}: ${err.message}`);
    }
  }

  if (warningsByFile.size > 0) {
    lines.push('Warning diagnostics:');
    for (const [filePath, fileWarnings] of warningsByFile) {
      for (const warning of fileWarnings) {
        const location = warning.line ? `:${warning.line}${warning.column ? `:${warning.column}` : ''}` : '';
        const code = warning.code ? ` [${warning.code}]` : '';
        lines.push(`${filePath}${location}: ${warning.message}${code}`);
      }
    }
  }

  for (const err of noFileErrors) {
    const code = err.code ? ` [${err.code}]` : '';
    lines.push(`${err.severity}: ${err.message}${code}`);
  }

  fs.writeFileSync(logPath, lines.join('\n') + '\n');
}

async function runSelectedIndex(
  projectPath: string,
  engine: IndexEngine,
  options: {
    force?: boolean;
    verbose?: boolean;
    graphWorkProfile?: 'full' | 'matched-ts-js';
    sqliteWriteMode?: 'disk' | 'final-flush' | 'memory-final-flush';
    profile?: 'heap';
    profileOut?: string;
  },
  onProgress?: (progress: { phase: string; current: number; total: number; currentFile?: string }) => void,
): Promise<IndexResult> {
  if (engine === 'typescript') {
    const { default: CodeGraph } = await loadCodeGraph();
    const cg = await CodeGraph.open(projectPath);
    try {
      if (options.force) cg.clear();
      return await cg.indexAll({
        engine: 'typescript',
        ...(onProgress ? { onProgress } : {}),
        ...(options.verbose ? { verbose: true } : {}),
      });
    } finally {
      cg.destroy();
    }
  }

  const profileWriter = createIndexProfileWriter(projectPath, options.profileOut);
  const hybridPlan = engine === 'rust-hybrid' ? planRustHybridAssignments(projectPath) : null;

  profileWriter?.checkpoint('rustCore.started');
  const result = await runRustIndexer(projectPath, {
    force: options.force,
    verbose: options.verbose,
    graphWorkProfile: options.graphWorkProfile,
    sqliteWriteMode: options.sqliteWriteMode,
    profiling: options.profile,
    onProgress,
  });
  const mutableResult = result as IndexResult;
  const rustCoreProfile = result.profile;
  profileWriter?.checkpoint('rustCore.completed');
  profileWriter?.merge({ rustCore: rustCoreProfile });
  if (!result.success || result.filesIndexed === 0) {
    return result;
  }

  const { default: CodeGraph } = await loadCodeGraph();
  const cg = await CodeGraph.open(projectPath);
  try {
    let fallbackResult: Awaited<ReturnType<typeof cg.indexFallbackFiles>> | null = null;
    let runtimeHybridPlan = engine === 'rust-hybrid' && hybridPlan
      ? mergeRustOwnedGapDiagnostics(hybridPlan, result.errors as RustOwnedPerFileGapDiagnostic[])
      : hybridPlan;
    if (engine === 'rust-hybrid' && runtimeHybridPlan && runtimeHybridPlan.fallbackFiles.length > 0) {
      profileWriter?.checkpoint('typescriptFallbackAppend.started');
      fallbackResult = await cg.indexFallbackFiles(runtimeHybridPlan.fallbackFiles);
      profileWriter?.checkpoint('typescriptFallbackAppend.completed');
      profileWriter?.merge({
        typescriptFallbackAppend: {
          durationMs: fallbackResult.durationMs,
          fallbackFileCount: fallbackResult.fallbackFileCount,
          missingFallbackFileCount: fallbackResult.missingFallbackFileCount,
          missingFallbackByLanguage: fallbackResult.missingFallbackByLanguage,
          errorTaxonomy: fallbackResult.errorTaxonomy,
        },
      });
      if (fallbackResult.missingFallbackFileCount > 0) {
        runtimeHybridPlan = mergeMissingFallbackDiagnostics(runtimeHybridPlan, fallbackResult);
      }
      if (!fallbackResult.success) {
        return {
          success: false,
          filesIndexed: mutableResult.filesIndexed + fallbackResult.filesIndexed,
          filesSkipped: mutableResult.filesSkipped + fallbackResult.filesSkipped,
          filesErrored: mutableResult.filesErrored + fallbackResult.filesErrored,
          nodesCreated: mutableResult.nodesCreated + fallbackResult.nodesCreated,
          edgesCreated: mutableResult.edgesCreated + fallbackResult.edgesCreated,
          errors: fallbackResult.errors,
          durationMs: mutableResult.durationMs + fallbackResult.durationMs,
          profile: {
            rustCore: rustCoreProfile,
            typescriptFallbackAppend: {
              durationMs: fallbackResult.durationMs,
              fallbackFileCount: fallbackResult.fallbackFileCount,
              missingFallbackFileCount: fallbackResult.missingFallbackFileCount,
              missingFallbackByLanguage: fallbackResult.missingFallbackByLanguage,
              errorTaxonomy: fallbackResult.errorTaxonomy,
            },
          },
        };
      }
      mutableResult.filesIndexed += fallbackResult.filesIndexed;
      mutableResult.filesSkipped += fallbackResult.filesSkipped;
      mutableResult.filesErrored += fallbackResult.filesErrored;
      mutableResult.nodesCreated += fallbackResult.nodesCreated;
      mutableResult.edgesCreated += fallbackResult.edgesCreated;
      mutableResult.errors.push(...fallbackResult.errors);
    }

    const finalizationStarted = Date.now();
    profileWriter?.checkpoint('finalization.started');
    const finalized = await cg.finalizeRustIndex((current, total) => {
      onProgress?.({
        phase: 'resolving',
        current,
        total,
      });
    }, (checkpointName) => {
      profileWriter?.checkpoint(checkpointName);
    }, rustCoreProfile);
    profileWriter?.checkpoint('finalization.completed');
    if (engine === 'rust-hybrid') {
      cg.markRustHybridIndex(buildRustHybridMetadataFromPlan(runtimeHybridPlan ?? planRustHybridAssignments(projectPath)));
    }
    mutableResult.nodesCreated += finalized.nodesCreated;
    mutableResult.edgesCreated += finalized.edgesCreated;
    mutableResult.profile = {
      rustCore: rustCoreProfile,
      ...(fallbackResult ? {
        typescriptFallbackAppend: {
          durationMs: fallbackResult.durationMs,
          fallbackFileCount: fallbackResult.fallbackFileCount,
          missingFallbackFileCount: fallbackResult.missingFallbackFileCount,
          missingFallbackByLanguage: fallbackResult.missingFallbackByLanguage,
          errorTaxonomy: fallbackResult.errorTaxonomy,
        },
      } : {}),
      finalize: finalized.profile,
      typescriptFinalizationMs: Date.now() - finalizationStarted,
    };
    profileWriter?.merge(mutableResult.profile);
  } finally {
    cg.destroy();
  }
  if (profileWriter) {
    mutableResult.profile = profileWriter.complete(mutableResult.profile ?? null);
  }
  return mutableResult;
}

function shouldShowRustDiagnostics(engine: IndexEngine | undefined): boolean {
  return engine === 'rust' || engine === 'rust-hybrid';
}

function recordRustHybridRun(
  projectPath: string,
  engine: IndexEngine,
  commandName: string,
  startedAt: number,
  result: IndexResult,
): void {
  if (engine !== 'rust-hybrid') return;
  writeDiagnosticRunRecord(projectPath, {
    kind: result.success ? 'last-run' : 'last-failure',
    engine,
    commandName,
    args: process.argv.slice(2),
    startedAt,
    exitCode: result.success ? 0 : 1,
    result,
    previousIndexPreserved: fs.existsSync(getDatabasePath(projectPath)),
  });
}

function recordRustHybridFailure(
  projectPath: string,
  engine: IndexEngine | undefined,
  commandName: string,
  startedAt: number,
  err: unknown,
): void {
  if (engine !== 'rust-hybrid') return;
  writeDiagnosticRunRecord(projectPath, {
    kind: 'last-failure',
    engine,
    commandName,
    args: process.argv.slice(2),
    startedAt,
    exitCode: 1,
    error: err,
    previousIndexPreserved: fs.existsSync(getDatabasePath(projectPath)),
  });
}

function printRustHybridDoctorHint(
  clack: typeof import('@clack/prompts'),
  result: IndexResult,
): void {
  if (!result.success) return;
  const summary = buildRustHybridFallbackSummary(result);
  const [indexedLine, healthLine, ...detailLines] = formatRustHybridFallbackDoctorHint(summary);
  if (!indexedLine || !healthLine) return;
  clack.log.info(indexedLine);
  clack.log.warn(healthLine);
  for (const line of detailLines) {
    clack.log.info(line);
  }
}

function printRustHybridFailureDoctorHint(): void {
  console.error('Rust-hybrid indexing failed before fallback could safely continue.');
  console.error('Previous index was preserved.');
  console.error('Run:');
  console.error('  zcodegraph doctor --engine rust-hybrid --bundle --last-failure');
}

// =============================================================================
// Commands
// =============================================================================

/**
 * zcodegraph init [path]
 */
program
  .command('init [path]')
  .description('Initialize ZCodeGraph in a project directory and build the initial index')
  .option('-v, --verbose', 'Show detailed worker lifecycle and memory info')
  .option('--engine <engine>', 'Index engine to use: typescript, rust, or rust-hybrid')
  .action(async (pathArg: string | undefined, options: { verbose?: boolean; engine?: string }) => {
    const projectPath = path.resolve(pathArg || process.cwd());
    const clack = await importESM('@clack/prompts');
    let selectedEngine: IndexEngine | undefined;
    const commandStartedAt = Date.now();

    clack.intro('Initializing ZCodeGraph');

    try {
      const engine = resolveIndexEngine(options.engine);
      selectedEngine = engine;

      if (isInitialized(projectPath)) {
        clack.log.warn(`Already initialized in ${projectPath}`);
        clack.log.info('Use "zcodegraph index" to re-index or "zcodegraph sync" to update');
        try {
          const { offerWatchFallback } = await import('../installer');
          await offerWatchFallback(clack, projectPath);
        } catch { /* non-fatal */ }
        clack.outro('');
        return;
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.init(projectPath, { index: false });
      clack.log.success(`Initialized in ${projectPath}`);
      cg.destroy();

      let result: IndexResult;
      if (options.verbose) {
        result = await runSelectedIndex(projectPath, engine, { verbose: true }, createVerboseProgress());
      } else {
        process.stdout.write(`${colors.dim}${getGlyphs().rail}${colors.reset}\n`);
        const progress = createShimmerProgress();
        result = await runSelectedIndex(projectPath, engine, {}, progress.onProgress);
        await progress.stop();
      }
      printIndexResult(clack, result, projectPath);
      recordRustHybridRun(projectPath, engine, 'init', commandStartedAt, result);
      if (engine === 'rust-hybrid') {
        printRustHybridDoctorHint(clack, result);
      }

      if (!result.success) {
        process.exit(1);
      }

      try {
        const { offerWatchFallback } = await import('../installer');
        await offerWatchFallback(clack, projectPath);
      } catch { /* non-fatal */ }

      clack.outro('Done');
    } catch (err) {
      recordRustHybridFailure(projectPath, selectedEngine, 'init', commandStartedAt, err);
      clack.log.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      if (shouldShowRustDiagnostics(selectedEngine)) {
        const diagnostics = getRustReadinessDiagnostics(projectPath, { engine: null, engineVersion: null });
        const activeIndexPreserved = fs.existsSync(getDatabasePath(projectPath));
        console.error('Rust diagnostics:');
        console.error(`  discovery source: ${diagnostics.core.discoverySource}`);
        console.error(`  attempted command: ${diagnostics.core.attemptedCommand}`);
        if (diagnostics.core.attemptedArgsPrefix.length > 0) {
          console.error(`  attempted args prefix: ${diagnostics.core.attemptedArgsPrefix.join(' ')}`);
        }
        console.error(`  active index preserved: ${activeIndexPreserved ? 'yes' : 'no active index found'}`);
        if (selectedEngine === 'rust-hybrid') {
          printRustHybridFailureDoctorHint();
        }
      }
      process.exit(1);
    }
  });

/**
 * zcodegraph uninit [path]
 */
program
  .command('uninit [path]')
  .description('Remove ZCodeGraph from a project (deletes .zcodegraph/ directory)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (pathArg: string | undefined, options: { force?: boolean }) => {
    const projectPath = resolveProjectPath(pathArg);

    try {
      if (!isInitialized(projectPath)) {
        warn(`CodeGraph is not initialized in ${projectPath}`);
        return;
      }

      if (!options.force) {
        // Confirm with user
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question(
            chalk.yellow(`${getGlyphs().warn} This will permanently delete all CodeGraph data. Continue? (y/N) `),
            resolve
          );
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          info('Cancelled');
          return;
        }
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = CodeGraph.openSync(projectPath);
      cg.uninitialize();

      // Clean up any git sync hooks we installed (no-op if none / not a repo).
      try {
        const { removeGitSyncHook } = await import('../sync/git-hooks');
        const removed = removeGitSyncHook(projectPath);
        if (removed.installed.length > 0) {
          info(`Removed git ${removed.installed.join(', ')} sync hook${removed.installed.length > 1 ? 's' : ''}`);
        }
      } catch { /* non-fatal */ }

      success(`Removed CodeGraph from ${projectPath}`);
    } catch (err) {
      error(`Failed to uninitialize: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph index [path]
 */
program
  .command('index [path]')
  .description('Index all files in the project')
  .option('-f, --force', 'Force full re-index even if already indexed')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-v, --verbose', 'Show detailed worker lifecycle and memory info')
  .option('--engine <engine>', 'Index engine to use: typescript, rust, or rust-hybrid')
  .option('--graph-work-profile <profile>', 'Rust graph work profile to use: full or matched-ts-js')
  .option('--sqlite-write-mode <mode>', 'Rust SQLite write mode: final-flush, disk, or memory-final-flush')
  .option('--profile <mode>', 'Rust index profiling mode to use: heap')
  .option('--profile-out <path>', 'Write Rust index profile artifact to path')
  .action(async (pathArg: string | undefined, options: { force?: boolean; quiet?: boolean; verbose?: boolean; engine?: string; graphWorkProfile?: string; sqliteWriteMode?: string; profile?: string; profileOut?: string }) => {
    const projectPath = resolveProjectPath(pathArg);
    let selectedEngine: IndexEngine | undefined;
    const commandStartedAt = Date.now();

    try {
      const engine = resolveIndexEngine(options.engine);
      const graphWorkProfile = resolveGraphWorkProfile(options.graphWorkProfile);
      const sqliteWriteMode = resolveSqliteWriteMode(options.sqliteWriteMode);
      const indexProfile = resolveIndexProfile(options.profile);
      selectedEngine = engine;
      if (options.profileOut && engine === 'typescript') {
        throw new Error('--profile-out is only supported for rust and rust-hybrid index engines');
      }

      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        info('Run "zcodegraph init" first');
        process.exit(1);
      }

      if (options.quiet) {
        // Quiet mode: no UI, just run
        const result = await runSelectedIndex(projectPath, engine, {
          force: options.force,
          verbose: options.verbose,
          graphWorkProfile,
          sqliteWriteMode,
          profile: indexProfile,
          profileOut: options.profileOut,
        });
        recordRustHybridRun(projectPath, engine, 'index', commandStartedAt, result);
        if (!result.success) process.exit(1);
        return;
      }

      const clack = await importESM('@clack/prompts');
      clack.intro('Indexing project');

      let result: IndexResult;

      if (engine === 'rust' || engine === 'rust-hybrid') {
        if (options.force) {
          clack.log.info('Rust engine selected; force re-index requested');
        }
        result = await runSelectedIndex(projectPath, engine, {
          force: options.force,
          verbose: options.verbose,
          graphWorkProfile,
          sqliteWriteMode,
          profile: indexProfile,
          profileOut: options.profileOut,
        }, options.verbose ? createVerboseProgress() : undefined);
      } else {
        if (options.force) {
          clack.log.info('Cleared existing index');
        }
        if (options.verbose) {
          result = await runSelectedIndex(projectPath, engine, {
            force: options.force,
            verbose: true,
          }, createVerboseProgress());
        } else {
          process.stdout.write(`${colors.dim}${getGlyphs().rail}${colors.reset}\n`);
          const progress = createShimmerProgress();
          result = await runSelectedIndex(projectPath, engine, { force: options.force }, progress.onProgress);
          await progress.stop();
        }
      }

      printIndexResult(clack, result, projectPath);
      recordRustHybridRun(projectPath, engine, 'index', commandStartedAt, result);
      if (engine === 'rust-hybrid') {
        printRustHybridDoctorHint(clack, result);
      }

      if (!result.success) {
        process.exit(1);
      }

      clack.outro('Done');
    } catch (err) {
      recordRustHybridFailure(projectPath, selectedEngine, 'index', commandStartedAt, err);
      error(`Failed to index: ${err instanceof Error ? err.message : String(err)}`);
      if (shouldShowRustDiagnostics(selectedEngine)) {
        const diagnostics = getRustReadinessDiagnostics(projectPath, { engine: null, engineVersion: null });
        const activeIndexPreserved = fs.existsSync(getDatabasePath(projectPath));
        console.error('Rust diagnostics:');
        console.error(`  discovery source: ${diagnostics.core.discoverySource}`);
        console.error(`  attempted command: ${diagnostics.core.attemptedCommand}`);
        if (diagnostics.core.attemptedArgsPrefix.length > 0) {
          console.error(`  attempted args prefix: ${diagnostics.core.attemptedArgsPrefix.join(' ')}`);
        }
        console.error(`  active index preserved: ${activeIndexPreserved ? 'yes' : 'no active index found'}`);
        const nextAction = diagnostics.core.discoverySource === 'env'
          ? 'Set ZCODEGRAPH_RUST_CORE_BINARY to an executable zcodegraph-core binary, or unset it to use packaged/source discovery.'
          : 'Install a release bundle/platform package with bin/zcodegraph-core, or run cargo build --package zcodegraph-core for source development.';
        console.error(`  next action: ${nextAction}`);
        if (selectedEngine === 'rust-hybrid' && !options.quiet) {
          printRustHybridFailureDoctorHint();
        }
      }
      process.exit(1);
    }
  });

/**
 * zcodegraph sync [path]
 */
program
  .command('sync [path]')
  .description('Sync changes since last index')
  .option('-q, --quiet', 'Suppress output (for git hooks)')
  .action(async (pathArg: string | undefined, options: { quiet?: boolean }) => {
    const projectPath = resolveProjectPath(pathArg);

    try {
      if (!isInitialized(projectPath)) {
        if (!options.quiet) {
          error(`CodeGraph not initialized in ${projectPath}`);
        }
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);

      if (options.quiet) {
        await cg.sync();
        cg.destroy();
        return;
      }

      const clack = await importESM('@clack/prompts');
      clack.intro('Syncing CodeGraph');

      process.stdout.write(`${colors.dim}${getGlyphs().rail}${colors.reset}\n`);
      const progress = createShimmerProgress();

      const result = await cg.sync({
        onProgress: progress.onProgress,
      });

      await progress.stop();

      const totalChanges = result.filesAdded + result.filesModified + result.filesRemoved;

      if (totalChanges === 0) {
        clack.log.info('Already up to date');
      } else {
        clack.log.success(`Synced ${formatNumber(totalChanges)} changed files`);
        const details: string[] = [];
        if (result.filesAdded > 0) details.push(`Added: ${result.filesAdded}`);
        if (result.filesModified > 0) details.push(`Modified: ${result.filesModified}`);
        if (result.filesRemoved > 0) details.push(`Removed: ${result.filesRemoved}`);
        clack.log.info(`${details.join(', ')} ${getGlyphs().dash} ${formatNumber(result.nodesUpdated)} nodes in ${formatDuration(result.durationMs)}`);
      }

      clack.outro('Done');
      cg.destroy();
    } catch (err) {
      if (!options.quiet) {
        error(`Failed to sync: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }
  });

/**
 * zcodegraph status [path]
 */
program
  .command('status [path]')
  .description('Show index status and statistics')
  .option('-j, --json', 'Output as JSON')
  .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
    const projectPath = resolveProjectPath(pathArg);
    // The directory the user actually ran from, before walking up to the index
    // root. Used to detect when the resolved index lives in a different git
    // working tree (e.g. a nested worktree borrowing the main checkout's index).
    const startPath = path.resolve(pathArg || process.cwd());
    const worktreeMismatch = detectWorktreeIndexMismatch(startPath, projectPath);

    try {
      if (!isInitialized(projectPath)) {
        if (options.json) {
          console.log(JSON.stringify({
            initialized: false,
            version: packageJson.version,
            projectPath,
            indexPath: getCodeGraphDir(projectPath),
            databasePath: getDatabasePath(projectPath),
            lastIndexed: null,
            rust: getRustReadinessDiagnostics(projectPath, { engine: null, engineVersion: null }),
          }));
          return;
        }
        console.log(chalk.bold('\nCodeGraph Status\n'));
        info(`Project: ${projectPath}`);
        warn('Not initialized');
        info('Run "zcodegraph init" to initialize');
        return;
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      const stats = cg.getStats();
      const changes = cg.getChangedFiles();
      const backend = cg.getBackend();
      const journalMode = cg.getJournalMode();

      const buildInfo = cg.getIndexBuildInfo();
      const reindexRecommended = cg.isIndexStale();

      // JSON output mode
      if (options.json) {
        const lastIndexedMs = cg.getLastIndexedAt();
        console.log(JSON.stringify({
          initialized: true,
          version: packageJson.version,
          projectPath,
          indexPath: getCodeGraphDir(projectPath),
          databasePath: getDatabasePath(projectPath),
          lastIndexed: lastIndexedMs != null ? new Date(lastIndexedMs).toISOString() : null,
          fileCount: stats.fileCount,
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          dbSizeBytes: stats.dbSizeBytes,
          backend,
          journalMode,
          nodesByKind: stats.nodesByKind,
          languages: Object.entries(stats.filesByLanguage).filter(([, count]) => count > 0).map(([lang]) => lang),
          pendingChanges: {
            added: changes.added.length,
            modified: changes.modified.length,
            removed: changes.removed.length,
          },
          worktreeMismatch: worktreeMismatch
            ? { worktreeRoot: worktreeMismatch.worktreeRoot, indexRoot: worktreeMismatch.indexRoot }
            : null,
          index: {
            engine: buildInfo.engine,
            engineVersion: buildInfo.engineVersion,
            hybrid: buildInfo.hybrid,
            builtWithVersion: buildInfo.version,
            builtWithExtractionVersion: buildInfo.extractionVersion,
            currentExtractionVersion: EXTRACTION_VERSION,
            reindexRecommended,
          },
          rust: getRustReadinessDiagnostics(projectPath, buildInfo),
        }));
        cg.destroy();
        return;
      }

      console.log(chalk.bold('\nCodeGraph Status\n'));

      // Project info
      console.log(chalk.cyan('Project:'), projectPath);
      if (worktreeMismatch) {
        warn(worktreeMismatchWarning(worktreeMismatch));
      }
      console.log();

      // Index stats
      console.log(chalk.bold('Index Statistics:'));
      console.log(`  Files:     ${formatNumber(stats.fileCount)}`);
      console.log(`  Nodes:     ${formatNumber(stats.nodeCount)}`);
      console.log(`  Edges:     ${formatNumber(stats.edgeCount)}`);
      console.log(`  DB Size:   ${(stats.dbSizeBytes / 1024 / 1024).toFixed(2)} MB`);
      // Surface the active SQLite backend (node:sqlite — Node's built-in real
      // SQLite, full WAL + FTS5, no native build).
      const backendLabel = chalk.green(`node:sqlite ${getGlyphs().dash} built-in (full WAL)`);
      console.log(`  Backend:   ${backendLabel}`);
      // Effective journal mode: 'wal' means concurrent reads never block on a
      // writer; anything else means they can ("database is locked"). node:sqlite
      // supports WAL everywhere, so a non-wal mode means the filesystem can't
      // (network mounts, WSL2 /mnt). See issue #238.
      const journalLabel = journalMode === 'wal'
        ? chalk.green('wal')
        : chalk.yellow(`${journalMode || 'unknown'} ${getGlyphs().dash} WAL inactive; reads can block on writes`);
      console.log(`  Journal:   ${journalLabel}`);
      console.log();

      // Node breakdown
      console.log(chalk.bold('Nodes by Kind:'));
      const nodesByKind = Object.entries(stats.nodesByKind)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
      for (const [kind, count] of nodesByKind) {
        console.log(`  ${kind.padEnd(15)} ${formatNumber(count)}`);
      }
      console.log();

      // Language breakdown
      console.log(chalk.bold('Files by Language:'));
      const filesByLang = Object.entries(stats.filesByLanguage)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
      for (const [lang, count] of filesByLang) {
        console.log(`  ${lang.padEnd(15)} ${formatNumber(count)}`);
      }
      console.log();

      // Pending changes
      const totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
      if (totalChanges > 0) {
        console.log(chalk.bold('Pending Changes:'));
        if (changes.added.length > 0) {
          console.log(`  Added:     ${changes.added.length} files`);
        }
        if (changes.modified.length > 0) {
          console.log(`  Modified:  ${changes.modified.length} files`);
        }
        if (changes.removed.length > 0) {
          console.log(`  Removed:   ${changes.removed.length} files`);
        }
        info('Run "zcodegraph sync" to update the index');
      } else {
        success('Index is up to date');
      }
      console.log();

      // Re-index hint: the index was built by an older engine than the one now
      // running, so a rebuild would add data a migration can't backfill.
      if (reindexRecommended) {
        const builtWith = buildInfo.version ? `v${buildInfo.version.replace(/^v/, '')}` : 'an earlier version';
        warn(`Index was built by ${builtWith}; re-index to pick up this engine's improvements.`);
        info('Run "zcodegraph index -f" (full rebuild) or "zcodegraph sync"');
        console.log();
      }

      cg.destroy();
    } catch (err) {
      error(`Failed to get status: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph doctor [path]
 */
program
  .command('doctor [path]')
  .description('Create local diagnostic bundles for maintainers')
  .option('--engine <engine>', 'Index engine diagnostics to collect: rust-hybrid')
  .option('--bundle', 'Create a local diagnostic bundle directory')
  .option('--last-run', 'Bundle the last completed run')
  .option('--last-failure', 'Bundle the last failed run')
  .option('--include-source-slice', 'Unsupported in diagnostic bundle v1')
  .action((pathArg: string | undefined, options: { engine?: string; bundle?: boolean; lastRun?: boolean; lastFailure?: boolean; includeSourceSlice?: boolean }) => {
    const projectPath = resolveProjectPath(pathArg);
    try {
      if (options.includeSourceSlice) {
        throw new Error('source slices are not supported in diagnostic bundle v1; bundles exclude source by default');
      }
      if (!options.bundle) {
        throw new Error('doctor currently requires --bundle');
      }
      if (options.lastRun === options.lastFailure) {
        throw new Error('Specify exactly one of --last-run or --last-failure');
      }
      const engine = resolveIndexEngine(options.engine);
      if (engine !== 'rust-hybrid') {
        throw new Error('doctor bundle v1 currently supports --engine rust-hybrid');
      }
      if (!isInitialized(projectPath)) {
        throw new Error(`CodeGraph not initialized in ${projectPath}. Run "zcodegraph init" first.`);
      }
      const source = options.lastRun ? 'last-run' : 'last-failure';
      const bundlePath = createDiagnosticBundle(projectPath, {
        engine,
        source,
        version: packageJson.version,
      });
      success('Created diagnostic bundle:');
      console.log(bundlePath);
      for (const line of formatDiagnosticBundleSummary(projectPath, bundlePath)) {
        console.log(line);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

/**
 * zcodegraph query <search>
 */
program
  .command('query <search>')
  .description('Search for symbols in the codebase')
  .option('-p, --path <path>', 'Project path')
  .option('-l, --limit <number>', 'Maximum results', '10')
  .option('-k, --kind <kind>', 'Filter by node kind (function, class, etc.)')
  .option('-j, --json', 'Output as JSON')
  .action(async (search: string, options: { path?: string; limit?: string; kind?: string; json?: boolean }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);

      const limit = parseInt(options.limit || '10', 10);
      const rawResults = cg.searchNodes(search, {
        limit,
        kinds: options.kind ? [options.kind as any] : undefined,
      });

      // Mirror the MCP search down-rank so the CLI also surfaces the
      // hand-written implementation before protobuf/gRPC scaffolding
      // when both share a name. See extraction/generated-detection.ts.
      const { isGeneratedFile } = await import('../extraction/generated-detection');
      const results = [...rawResults].sort((a, b) => {
        const aGen = isGeneratedFile(a.node.filePath) ? 1 : 0;
        const bGen = isGeneratedFile(b.node.filePath) ? 1 : 0;
        return aGen - bGen;
      });

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        if (results.length === 0) {
          info(`No results found for "${search}"`);
        } else {
          console.log(chalk.bold(`\nSearch Results for "${search}":\n`));

          for (const result of results) {
            const node = result.node;
            const location = `${node.filePath}:${node.startLine}`;
            const score = chalk.dim(`(${(result.score * 100).toFixed(0)}%)`);

            console.log(
              chalk.cyan(node.kind.padEnd(12)) +
              chalk.white(node.name) +
              ' ' + score
            );
            console.log(chalk.dim(`  ${location}`));
            if (node.signature) {
              console.log(chalk.dim(`  ${node.signature}`));
            }
            console.log();
          }
        }
      }

      cg.destroy();
    } catch (err) {
      error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph files [path]
 */
program
  .command('files')
  .description('Show project file structure from the index')
  .option('-p, --path <path>', 'Project path')
  .option('--filter <dir>', 'Filter to files under this directory')
  .option('--pattern <glob>', 'Filter files matching this glob pattern')
  .option('--format <format>', 'Output format (tree, flat, grouped)', 'tree')
  .option('--max-depth <number>', 'Maximum directory depth for tree format')
  .option('--no-metadata', 'Hide file metadata (language, symbol count)')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: {
    path?: string;
    filter?: string;
    pattern?: string;
    format?: string;
    maxDepth?: string;
    metadata?: boolean;
    json?: boolean;
  }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      let files = cg.getFiles();

      if (files.length === 0) {
        info('No files indexed. Run "zcodegraph index" first.');
        cg.destroy();
        return;
      }

      // Filter by path prefix
      if (options.filter) {
        const filter = options.filter;
        files = files.filter(f => f.path.startsWith(filter) || f.path.startsWith('./' + filter));
      }

      // Filter by glob pattern
      if (options.pattern) {
        const regex = globToRegex(options.pattern);
        files = files.filter(f => regex.test(f.path));
      }

      if (files.length === 0) {
        info('No files found matching the criteria.');
        cg.destroy();
        return;
      }

      // JSON output
      if (options.json) {
        const output = files.map(f => ({
          path: f.path,
          language: f.language,
          nodeCount: f.nodeCount,
          size: f.size,
        }));
        console.log(JSON.stringify(output, null, 2));
        cg.destroy();
        return;
      }

      const includeMetadata = options.metadata !== false;
      const format = options.format || 'tree';
      const maxDepth = options.maxDepth ? parseInt(options.maxDepth, 10) : undefined;

      // Format output
      switch (format) {
        case 'flat':
          console.log(chalk.bold(`\nFiles (${files.length}):\n`));
          for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
            if (includeMetadata) {
              console.log(`  ${file.path} ${chalk.dim(`(${file.language}, ${file.nodeCount} symbols)`)}`);
            } else {
              console.log(`  ${file.path}`);
            }
          }
          break;

        case 'grouped':
          console.log(chalk.bold(`\nFiles by Language (${files.length} total):\n`));
          const byLang = new Map<string, typeof files>();
          for (const file of files) {
            const existing = byLang.get(file.language) || [];
            existing.push(file);
            byLang.set(file.language, existing);
          }
          const sortedLangs = [...byLang.entries()].sort((a, b) => b[1].length - a[1].length);
          for (const [lang, langFiles] of sortedLangs) {
            console.log(chalk.cyan(`${lang} (${langFiles.length}):`));
            for (const file of langFiles.sort((a, b) => a.path.localeCompare(b.path))) {
              if (includeMetadata) {
                console.log(`  ${file.path} ${chalk.dim(`(${file.nodeCount} symbols)`)}`);
              } else {
                console.log(`  ${file.path}`);
              }
            }
            console.log();
          }
          break;

        case 'tree':
        default:
          console.log(chalk.bold(`\nProject Structure (${files.length} files):\n`));
          printFileTree(files, includeMetadata, maxDepth, chalk);
          break;
      }

      console.log();
      cg.destroy();
    } catch (err) {
      error(`Failed to list files: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(escaped);
}

/**
 * Print files as a tree
 */
function printFileTree(
  files: { path: string; language: string; nodeCount: number }[],
  includeMetadata: boolean,
  maxDepth: number | undefined,
  chalk: { dim: (s: string) => string; cyan: (s: string) => string }
): void {
  interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
    file?: { language: string; nodeCount: number };
  }

  const root: TreeNode = { name: '', children: new Map() };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map() });
      }
      current = current.children.get(part)!;

      if (i === parts.length - 1) {
        current.file = { language: file.language, nodeCount: file.nodeCount };
      }
    }
  }

  const renderNode = (node: TreeNode, prefix: string, isLast: boolean, depth: number): void => {
    if (maxDepth !== undefined && depth > maxDepth) return;

    const glyphs = getGlyphs();
    const connector = isLast ? glyphs.treeLast : glyphs.treeBranch;
    const childPrefix = isLast ? '    ' : glyphs.treePipe;

    if (node.name) {
      let line = prefix + connector + node.name;
      if (node.file && includeMetadata) {
        line += chalk.dim(` (${node.file.language}, ${node.file.nodeCount} symbols)`);
      }
      console.log(line);
    }

    const children = [...node.children.values()];
    children.sort((a, b) => {
      const aIsDir = a.children.size > 0 && !a.file;
      const bIsDir = b.children.size > 0 && !b.file;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const nextPrefix = node.name ? prefix + childPrefix : prefix;
      renderNode(child, nextPrefix, i === children.length - 1, depth + 1);
    }
  };

  renderNode(root, '', true, 0);
}

/**
 * zcodegraph serve
 */
program
  .command('serve')
  .description('Start ZCodeGraph as an MCP server for AI assistants')
  .option('-p, --path <path>', 'Project path (optional for MCP mode, uses rootUri from client)')
  .option('--mcp', 'Run as MCP server (stdio transport)')
  .option('--no-watch', 'Disable the file watcher (no auto-sync; useful on slow filesystems like WSL2 /mnt drives)')
  .action(async (options: { path?: string; mcp?: boolean; watch?: boolean }) => {
    const projectPath = options.path ? resolveProjectPath(options.path) : undefined;

    // Commander sets watch=false when --no-watch is passed. Route it through
    // the same env-var chokepoint the watcher and MCP server already honor.
    if (options.watch === false) {
      process.env.CODEGRAPH_NO_WATCH = '1';
    }

    try {
      if (options.mcp) {
        // Start MCP server - it handles initialization lazily based on rootUri from client
        const { MCPServer } = await import('../mcp/index');
        const server = new MCPServer(projectPath);
        await server.start();
        // Server will run until terminated
      } else {
        // Default: show info about MCP mode.
        // Use stderr so stdout stays clean for any piped/stdio usage.
        console.error(chalk.bold('\nCodeGraph MCP Server\n'));
        console.error(chalk.blue(getGlyphs().info) + ' Use --mcp flag to start the MCP server');
        console.error('\nTo use with Claude Code, add to your MCP configuration:');
        console.error(chalk.dim(`
{
  "mcpServers": {
    "zcodegraph": {
      "command": "zcodegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
`));
        console.error('Available tools:');
        console.error(chalk.cyan('  zcodegraph_explore') + '   - Primary: source of the relevant symbols for any question');
        console.error(chalk.cyan('  zcodegraph_search') + '    - Search for code symbols');
        console.error(chalk.cyan('  zcodegraph_callers') + '   - Find callers of a symbol');
        console.error(chalk.cyan('  zcodegraph_callees') + '   - Find what a symbol calls');
        console.error(chalk.cyan('  zcodegraph_impact') + '    - Analyze impact of changes');
        console.error(chalk.cyan('  zcodegraph_node') + '      - Get symbol details');
        console.error(chalk.cyan('  zcodegraph_files') + '     - Get project file structure');
        console.error(chalk.cyan('  zcodegraph_status') + '    - Get index status');
      }
    } catch (err) {
      error(`Failed to start server: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * codegraph unlock [path]
 */
program
  .command('unlock [path]')
  .description('Remove a stale lock file that is blocking indexing')
  .action(async (pathArg: string | undefined) => {
    const projectPath = resolveProjectPath(pathArg);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        return;
      }

      const lockPath = path.join(getCodeGraphDir(projectPath), 'zcodegraph.lock');

      if (!fs.existsSync(lockPath)) {
        info(`No lock file found ${getGlyphs().dash} nothing to do`);
        return;
      }

      fs.unlinkSync(lockPath);
      success('Removed lock file. You can now run indexing again.');
    } catch (err) {
      error(`Failed to remove lock: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph callers <symbol>
 *
 * CLI parity with the MCP graph tools (zcodegraph_callers/callees/impact) so the
 * traversal queries work in scripts, CI, and git hooks without a running MCP
 * server.
 */
program
  .command('callers <symbol>')
  .description('Find all functions/methods that call a specific symbol')
  .option('-p, --path <path>', 'Project path')
  .option('-l, --limit <number>', 'Maximum results', '20')
  .option('-j, --json', 'Output as JSON')
  .action(async (symbol: string, options: { path?: string; limit?: string; json?: boolean }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      const limit = parseInt(options.limit || '20', 10);

      const matches = cg.searchNodes(symbol, { limit: 50 });
      if (matches.length === 0) {
        info(`Symbol "${symbol}" not found`);
        cg.destroy();
        return;
      }

      const seen = new Set<string>();
      const allCallers: Array<{ name: string; kind: string; filePath: string; startLine?: number }> = [];

      for (const match of matches) {
        const exactMatch = match.node.name === symbol || match.node.name.endsWith(`.${symbol}`) || match.node.name.endsWith(`::${symbol}`);
        if (!exactMatch && matches.length > 1) continue;
        for (const c of cg.getCallers(match.node.id)) {
          if (!seen.has(c.node.id)) {
            seen.add(c.node.id);
            allCallers.push({ name: c.node.name, kind: c.node.kind, filePath: c.node.filePath, startLine: c.node.startLine });
          }
        }
      }

      // Fallback: if exact filter removed everything, use the top match
      if (allCallers.length === 0 && matches[0]) {
        for (const c of cg.getCallers(matches[0].node.id)) {
          if (!seen.has(c.node.id)) {
            seen.add(c.node.id);
            allCallers.push({ name: c.node.name, kind: c.node.kind, filePath: c.node.filePath, startLine: c.node.startLine });
          }
        }
      }

      const limited = allCallers.slice(0, limit);

      if (options.json) {
        console.log(JSON.stringify({ symbol, callers: limited }, null, 2));
      } else if (limited.length === 0) {
        info(`No callers found for "${symbol}"`);
      } else {
        console.log(chalk.bold(`\nCallers of "${symbol}" (${limited.length}):\n`));
        for (const node of limited) {
          const loc = node.startLine ? `:${node.startLine}` : '';
          console.log(
            chalk.cyan(node.kind.padEnd(12)) +
            chalk.white(node.name)
          );
          console.log(chalk.dim(`  ${node.filePath}${loc}`));
          console.log();
        }
      }

      cg.destroy();
    } catch (err) {
      error(`callers failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph callees <symbol>
 */
program
  .command('callees <symbol>')
  .description('Find all functions/methods that a specific symbol calls')
  .option('-p, --path <path>', 'Project path')
  .option('-l, --limit <number>', 'Maximum results', '20')
  .option('-j, --json', 'Output as JSON')
  .action(async (symbol: string, options: { path?: string; limit?: string; json?: boolean }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      const limit = parseInt(options.limit || '20', 10);

      const matches = cg.searchNodes(symbol, { limit: 50 });
      if (matches.length === 0) {
        info(`Symbol "${symbol}" not found`);
        cg.destroy();
        return;
      }

      const seen = new Set<string>();
      const allCallees: Array<{ name: string; kind: string; filePath: string; startLine?: number }> = [];

      for (const match of matches) {
        const exactMatch = match.node.name === symbol || match.node.name.endsWith(`.${symbol}`) || match.node.name.endsWith(`::${symbol}`);
        if (!exactMatch && matches.length > 1) continue;
        for (const c of cg.getCallees(match.node.id)) {
          if (!seen.has(c.node.id)) {
            seen.add(c.node.id);
            allCallees.push({ name: c.node.name, kind: c.node.kind, filePath: c.node.filePath, startLine: c.node.startLine });
          }
        }
      }

      if (allCallees.length === 0 && matches[0]) {
        for (const c of cg.getCallees(matches[0].node.id)) {
          if (!seen.has(c.node.id)) {
            seen.add(c.node.id);
            allCallees.push({ name: c.node.name, kind: c.node.kind, filePath: c.node.filePath, startLine: c.node.startLine });
          }
        }
      }

      const limited = allCallees.slice(0, limit);

      if (options.json) {
        console.log(JSON.stringify({ symbol, callees: limited }, null, 2));
      } else if (limited.length === 0) {
        info(`No callees found for "${symbol}"`);
      } else {
        console.log(chalk.bold(`\nCallees of "${symbol}" (${limited.length}):\n`));
        for (const node of limited) {
          const loc = node.startLine ? `:${node.startLine}` : '';
          console.log(
            chalk.cyan(node.kind.padEnd(12)) +
            chalk.white(node.name)
          );
          console.log(chalk.dim(`  ${node.filePath}${loc}`));
          console.log();
        }
      }

      cg.destroy();
    } catch (err) {
      error(`callees failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph impact <symbol>
 */
program
  .command('impact <symbol>')
  .description('Analyze what code is affected by changing a symbol')
  .option('-p, --path <path>', 'Project path')
  .option('-d, --depth <number>', 'Traversal depth', '2')
  .option('-j, --json', 'Output as JSON')
  .action(async (symbol: string, options: { path?: string; depth?: string; json?: boolean }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      const depth = Math.min(Math.max(parseInt(options.depth || '2', 10), 1), 10);

      const matches = cg.searchNodes(symbol, { limit: 50 });
      if (matches.length === 0) {
        info(`Symbol "${symbol}" not found`);
        cg.destroy();
        return;
      }

      // Merge impact subgraphs across all exact-matching symbols
      const mergedNodes = new Map<string, { name: string; kind: string; filePath: string; startLine?: number }>();
      const seenEdges = new Set<string>();
      let edgeCount = 0;

      for (const match of matches) {
        const exactMatch = match.node.name === symbol || match.node.name.endsWith(`.${symbol}`) || match.node.name.endsWith(`::${symbol}`);
        if (!exactMatch && matches.length > 1) continue;
        const impact = cg.getImpactRadius(match.node.id, depth);
        for (const [id, n] of impact.nodes) {
          mergedNodes.set(id, { name: n.name, kind: n.kind, filePath: n.filePath, startLine: n.startLine });
        }
        for (const e of impact.edges) {
          const key = `${e.source}->${e.target}:${e.kind}`;
          if (!seenEdges.has(key)) {
            seenEdges.add(key);
            edgeCount++;
          }
        }
      }

      // Fallback to top match if exact filter removed everything
      if (mergedNodes.size === 0 && matches[0]) {
        const impact = cg.getImpactRadius(matches[0].node.id, depth);
        for (const [id, n] of impact.nodes) {
          mergedNodes.set(id, { name: n.name, kind: n.kind, filePath: n.filePath, startLine: n.startLine });
        }
        edgeCount = impact.edges.length;
      }

      if (options.json) {
        console.log(JSON.stringify({
          symbol,
          depth,
          nodeCount: mergedNodes.size,
          edgeCount,
          affected: Array.from(mergedNodes.values()),
        }, null, 2));
      } else if (mergedNodes.size === 0) {
        info(`No affected symbols found for "${symbol}"`);
      } else {
        console.log(chalk.bold(`\nImpact of changing "${symbol}" — ${mergedNodes.size} affected symbols:\n`));

        // Group by file
        const byFile = new Map<string, Array<{ name: string; kind: string; startLine?: number }>>();
        for (const node of mergedNodes.values()) {
          const list = byFile.get(node.filePath) || [];
          list.push({ name: node.name, kind: node.kind, startLine: node.startLine });
          byFile.set(node.filePath, list);
        }

        for (const [file, nodes] of byFile) {
          console.log(chalk.cyan(file));
          for (const node of nodes) {
            const loc = node.startLine ? `:${node.startLine}` : '';
            console.log(`  ${chalk.dim(node.kind.padEnd(12))}${node.name}${chalk.dim(loc)}`);
          }
          console.log();
        }
      }

      cg.destroy();
    } catch (err) {
      error(`impact failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph affected [files...]
 *
 * Find test files affected by the given source files.
 * Traces dependency edges transitively to find test files that depend on changed code.
 *
 * Usage:
 *   git diff --name-only | zcodegraph affected --stdin
 *   zcodegraph affected src/lib/components/Editor.svelte src/routes/+page.svelte
 */
program
  .command('affected [files...]')
  .description('Find test files affected by changed source files')
  .option('-p, --path <path>', 'Project path')
  .option('--stdin', 'Read file list from stdin (one per line)')
  .option('-d, --depth <number>', 'Max dependency traversal depth', '5')
  .option('-f, --filter <glob>', 'Custom glob filter for test files (e.g. "e2e/*.spec.ts")')
  .option('-j, --json', 'Output as JSON')
  .option('-q, --quiet', 'Only output file paths, no decoration')
  .action(async (fileArgs: string[], options: { path?: string; stdin?: boolean; depth?: string; filter?: string; json?: boolean; quiet?: boolean }) => {
    const projectPath = resolveProjectPath(options.path);

    try {
      if (!isInitialized(projectPath)) {
        error(`CodeGraph not initialized in ${projectPath}`);
        process.exit(1);
      }

      // Collect changed files from args or stdin
      let changedFiles: string[] = [...(fileArgs || [])];

      if (options.stdin) {
        const stdinData = fs.readFileSync(0, 'utf-8');
        const stdinFiles = stdinData.split('\n').map(f => f.trim()).filter(Boolean);
        changedFiles.push(...stdinFiles);
      }

      if (changedFiles.length === 0) {
        if (!options.quiet) info('No files provided. Use file arguments or --stdin.');
        process.exit(0);
      }

      const { default: CodeGraph } = await loadCodeGraph();
      const cg = await CodeGraph.open(projectPath);
      const maxDepth = parseInt(options.depth || '5', 10);

      // Common test file patterns
      const defaultTestPatterns = [
        /\.spec\./,
        /\.test\./,
        /\/__tests__\//,
        /\/tests?\//,
        /\/e2e\//,
        /\/spec\//,
      ];

      // Custom filter pattern
      let customFilter: RegExp | null = null;
      if (options.filter) {
        // Convert glob to regex: ** → .+, * → [^/]*, . → \.
        const regex = options.filter
          .replace(/[+[\]{}()^$|\\]/g, '\\$&')
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.+')
          .replace(/\*/g, '[^/]*');
        customFilter = new RegExp(regex);
      }

      function isTestFile(filePath: string): boolean {
        if (customFilter) return customFilter.test(filePath);
        return defaultTestPatterns.some(p => p.test(filePath));
      }

      // BFS to find all transitive dependents of changed files, filtered to test files
      const affectedTests = new Set<string>();
      const allDependents = new Set<string>();

      for (const file of changedFiles) {
        // If the changed file is itself a test file, include it
        if (isTestFile(file)) {
          affectedTests.add(file);
          continue;
        }

        // BFS through dependents
        const queue: Array<{ file: string; depth: number }> = [{ file, depth: 0 }];
        const visited = new Set<string>();
        visited.add(file);

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (current.depth >= maxDepth) continue;

          const dependents = cg.getFileDependents(current.file);
          for (const dep of dependents) {
            if (visited.has(dep)) continue;
            visited.add(dep);
            allDependents.add(dep);

            if (isTestFile(dep)) {
              affectedTests.add(dep);
            } else {
              queue.push({ file: dep, depth: current.depth + 1 });
            }
          }
        }
      }

      const sortedTests = Array.from(affectedTests).sort();

      // Output
      if (options.json) {
        console.log(JSON.stringify({
          changedFiles,
          affectedTests: sortedTests,
          totalDependentsTraversed: allDependents.size,
        }, null, 2));
      } else if (options.quiet) {
        for (const t of sortedTests) console.log(t);
      } else {
        if (sortedTests.length === 0) {
          info('No test files affected by the changed files.');
        } else {
          console.log(chalk.bold(`\nAffected test files (${sortedTests.length}):\n`));
          for (const t of sortedTests) {
            console.log('  ' + chalk.cyan(t));
          }
          console.log();
        }
      }

      cg.destroy();
    } catch (err) {
      error(`Affected analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

/**
 * zcodegraph install
 */
program
  .command('install')
  .description('Install the ZCodeGraph MCP server into one or more agents (Claude Code, Cursor, Codex CLI, opencode, Hermes Agent)')
  .option('-t, --target <ids>', 'Target agent(s): comma-separated ids, or "auto"|"all"|"none". Default: prompt')
  .option('-l, --location <where>', 'Install location: "global" or "local". Default: prompt')
  .option('-y, --yes', 'Non-interactive: defaults to --location=global --target=auto, auto-allow on')
  .option('--no-permissions', 'Skip writing the auto-allow permissions list (Claude Code only)')
  .option('--print-config <id>', 'Print MCP config snippet for the named agent and exit (no file writes)')
  .action(async (opts: {
    target?: string;
    location?: string;
    yes?: boolean;
    permissions?: boolean;
    printConfig?: string;
  }) => {
    if (opts.printConfig) {
      const { getTarget, listTargetIds } = await import('../installer/targets/registry');
      const target = getTarget(opts.printConfig);
      if (!target) {
        const known = listTargetIds().join(', ');
        error(`Unknown target "${opts.printConfig}". Known: ${known}.`);
        process.exit(1);
      }
      const loc = (opts.location === 'local' ? 'local' : 'global') as 'global' | 'local';
      process.stdout.write(target.printConfig(loc));
      return;
    }

    const { runInstallerWithOptions } = await import('../installer');
    if (opts.location && opts.location !== 'global' && opts.location !== 'local') {
      error(`--location must be "global" or "local" (got "${opts.location}").`);
      process.exit(1);
    }
    try {
      // Commander's `--no-permissions` makes `opts.permissions === false`;
      // omitting the flag leaves it `true` (the positive-form default).
      // We MUST treat the default-true as "user did not override — let
      // the orchestrator prompt" and only forward an explicit `false`
      // (or `true` when --yes implies it). Otherwise the auto-allow
      // prompt is silently skipped on every interactive run.
      const explicitNoPermissions = opts.permissions === false;
      const autoAllow: boolean | undefined = explicitNoPermissions
        ? false
        : opts.yes
          ? true
          : undefined;

      await runInstallerWithOptions({
        target: opts.target,
        location: opts.location as 'global' | 'local' | undefined,
        autoAllow,
        yes: opts.yes,
      });
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

/**
 * zcodegraph uninstall
 *
 * Inverse of `install`. Removes the codegraph MCP server entry,
 * instructions block, and permissions from every agent (or a
 * `--target` subset). Prompts global-vs-local when not given. Does NOT
 * delete the `.zcodegraph/` index — that's `zcodegraph uninit`.
 */
program
  .command('uninstall')
  .description('Remove ZCodeGraph from your agents (Claude Code, Cursor, Codex CLI, opencode, Hermes Agent)')
  .option('-t, --target <ids>', 'Target agent(s): comma-separated ids, or "all". Default: all')
  .option('-l, --location <where>', 'Uninstall location: "global" or "local". Default: prompt')
  .option('-y, --yes', 'Non-interactive: defaults to --location=global --target=all')
  .action(async (opts: {
    target?: string;
    location?: string;
    yes?: boolean;
  }) => {
    const { runUninstaller } = await import('../installer');
    if (opts.location && opts.location !== 'global' && opts.location !== 'local') {
      error(`--location must be "global" or "local" (got "${opts.location}").`);
      process.exit(1);
    }
    try {
      await runUninstaller({
        target: opts.target,
        location: opts.location as 'global' | 'local' | undefined,
        yes: opts.yes,
      });
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

/**
 * zcodegraph upgrade [version]
 *
 * Self-update, however CodeGraph was installed (bundle via install.sh/.ps1,
 * npm-global, npx, or a source checkout). See ../upgrade for the detection and
 * per-method upgrade logic.
 */
program
  .command('upgrade [version]')
  .description('Update ZCodeGraph to the latest release (or a specific version)')
  .option('--check', 'Check whether an update is available without installing')
  .option('-f, --force', 'Reinstall even if already on the target version')
  .action(async (versionArg: string | undefined, options: { check?: boolean; force?: boolean }) => {
    const up = await import('../upgrade');
    const method = up.detectInstallMethod({
      filename: __filename,
      platform: process.platform,
      cwd: process.cwd(),
    });
    const pin = versionArg || process.env.CODEGRAPH_VERSION || undefined;
    const code = await up.runUpgrade(
      { version: pin, check: options.check, force: options.force },
      {
        currentVersion: packageJson.version,
        method,
        resolveLatest: () => up.resolveLatestVersion(),
        run: up.defaultRun,
        hasCommand: up.hasCommand,
        log: (m: string) => console.log(m),
        warn: (m: string) => warn(m),
        error: (m: string) => error(m),
        platform: process.platform,
      }
    );
    process.exit(code);
  });

// Parse and run
program.parse();

} // end main()
