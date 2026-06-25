/**
 * CodeGraph
 *
 * A local-first code intelligence system that builds a semantic
 * knowledge graph from any codebase.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  Node,
  Edge,
  FileRecord,
  ExtractionResult,
  Subgraph,
  TraversalOptions,
  SearchOptions,
  SearchResult,
  Context,
  GraphStats,
  TaskInput,
  TaskContext,
  CollectContextOptions,
  FindRelevantContextOptions,
  UnresolvedReference,
} from './types';
import { DatabaseConnection, getDatabasePath } from './db';
import { QueryBuilder } from './db/queries';
import {
  isInitialized,
  createDirectory,
  removeDirectory,
  validateDirectory,
} from './directory';
import {
  ExtractionOrchestrator,
  IndexProgress,
  IndexResult,
  SyncResult,
  detectLanguage,
  extractFromSource,
  initGrammars,
  loadGrammarsForLanguages,
} from './extraction';
import {
  ReferenceResolver,
  createResolver,
  ResolutionResult,
} from './resolution';
import type { CandidateProtocolDiagnostics } from './resolution/candidate-protocol';
import { GraphTraverser, GraphQueryManager } from './graph';
import { ContextBuilder, createContextBuilder } from './context';
import { Mutex, FileLock } from './utils';
import { FileWatcher, WatchOptions, PendingFile, LockUnavailableError } from './sync';
import { EXTRACTION_VERSION } from './extraction/extraction-version';
import { CodeGraphPackageVersion } from './mcp/version';
import { IndexEngine } from './indexing/engine-selection';
import { runRustIndexer } from './indexing/rust-indexer';
import {
  buildRustHybridMetadataFromPlan,
  mergeMissingFallbackDiagnostics,
  mergeRustOwnedGapDiagnostics,
  planRustHybridAssignments,
  RustOwnedPerFileGapDiagnostic,
} from './indexing/rust-hybrid-contract';

type RustCoreProfileLike = {
  esmNamedImportExportResolvedRefs?: number;
  esmNamedImportExportFallbackRefs?: number;
  esmNamedImportExportFallbackSampleCounts?: Record<string, number>;
  esmNamedImportExportFallbackSamples?: Array<Record<string, unknown>>;
  esmNamedImportExportEdgeWriteAttemptedRefs?: number;
  esmNamedImportExportEdgeWriteWrittenRefs?: number;
  esmNamedImportExportEdgeWriteSkippedRefs?: number;
  esmNamedImportExportEdgeWriteSkippedCounts?: Record<string, number>;
  esmNamedImportExportEdgeWriteSkippedSamples?: Array<Record<string, unknown>>;
  moduleResolutionGuardedEdgeWriteAttemptedRefs?: number;
  moduleResolutionGuardedEdgeWriteWrittenRefs?: number;
  moduleResolutionGuardedEdgeWriteSkippedRefs?: number;
  moduleResolutionGuardedEdgeWriteSkippedCounts?: Record<string, number>;
  moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs?: number;
  moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs?: number;
  moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs?: number;
  moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts?: Record<string, number>;
  importPathAliasPackageSelfNameResolvedRefs?: number;
  importPathAliasPackageSelfNameFallbackRefs?: number;
  importPathAliasPackageSelfNameOutcomeCounts?: Record<string, number>;
  importPathAliasPackageImportsResolvedRefs?: number;
  importPathAliasPackageImportsFallbackRefs?: number;
  importPathAliasPackageImportsOutcomeCounts?: Record<string, number>;
};

type GuardedEdgeWriteDiagnostics = {
  eligibleRefs: number;
  attemptedRefs: number;
  writtenEdges: number;
  skippedRefs: number;
  skipReasons: Record<string, number>;
  skipSamples: Array<Record<string, unknown>>;
  edgeKindCounts: Record<string, number>;
};

type ModuleEdgeWriteDiagnostics = {
  owner: 'rust-core';
  mode: 'guarded-file-imports';
  eligibleRefs: number;
  attemptedRefs: number;
  writtenEdges: number;
  skippedRefs: number;
  skipReasons: Record<string, number>;
  edgeKindCounts: Record<string, number>;
  supportedSources: Array<'relative' | 'tsconfigPaths'>;
  excludedSources: string[];
  declarationRuntime: {
    mode: 'single-runtime-sibling-only';
    eligibleRefs: number;
    rewrittenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
  };
  packageSelfName: {
    mode: 'repo-local-file-targets-only';
    eligibleRefs: number;
    writtenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
    outcomeCounts: Record<string, number>;
  };
  packageImports: {
    mode: 'repo-local-file-targets-only';
    eligibleRefs: number;
    attemptedRefs: number;
    writtenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
    outcomeCounts: Record<string, number>;
  };
};

type CleanupOwnershipDiagnostics = {
  owner: 'typescript-finalization';
  mode: 'contract-only';
  resolvedTerminalRefs: number;
  intentionallyUnresolvedTerminalRefs: number;
  retainedRefs: number;
  rustCorePrecleanedRefs: number | null;
  notes: string[];
};

function rustCoreProfileLike(profile: unknown): RustCoreProfileLike {
  return profile && typeof profile === 'object' ? profile as RustCoreProfileLike : {};
}

function guardedEdgeWritePublicReason(reason: string): string {
  if (reason === 'direct-export-candidate-zero') return 'export-symbol-missing';
  if (reason === 'direct-export-candidate-many') return 'multiple-export-candidates';
  if (reason === 'target-file-not-found') return 'import-target-unresolved';
  return reason;
}

function mergeGuardedEdgeWriteReasons(reasons: Record<string, number>, next: Record<string, number>): void {
  for (const [reason, count] of Object.entries(next)) {
    const publicReason = guardedEdgeWritePublicReason(reason);
    reasons[publicReason] = (reasons[publicReason] ?? 0) + count;
  }
}

function guardedEdgeWriteSample(sample: Record<string, unknown>): Record<string, unknown> {
  const reason = typeof sample.reason === 'string'
    ? guardedEdgeWritePublicReason(sample.reason)
    : sample.reason;
  return {
    ...sample,
    reason,
    referenceName: sample.referenceName ?? sample.reference_name,
    referenceKind: sample.referenceKind ?? sample.reference_kind,
    filePath: sample.filePath ?? sample.file_path,
    targetFilePath: sample.targetFilePath ?? sample.target_file_path,
    candidateKind: sample.candidateKind ?? sample.candidate_kind,
    candidateCount: sample.candidateCount ?? sample.candidate_count,
    resolvedByAttempt: sample.resolvedByAttempt ?? sample.resolved_by_attempt,
  };
}

function guardedEdgeWriteDiagnosticsFromRustCore(profile: unknown): GuardedEdgeWriteDiagnostics {
  const rustProfile = rustCoreProfileLike(profile);
  const fallbackReasons = rustProfile.esmNamedImportExportFallbackSampleCounts ?? {};
  const edgeWriteSkipReasons = rustProfile.esmNamedImportExportEdgeWriteSkippedCounts ?? {};
  const skipReasons: Record<string, number> = {};
  mergeGuardedEdgeWriteReasons(skipReasons, fallbackReasons);
  mergeGuardedEdgeWriteReasons(skipReasons, edgeWriteSkipReasons);
  const fallbackSamples = rustProfile.esmNamedImportExportFallbackSamples ?? [];
  const edgeWriteSkipSamples = rustProfile.esmNamedImportExportEdgeWriteSkippedSamples ?? [];
  const attemptedRefs = rustProfile.esmNamedImportExportEdgeWriteAttemptedRefs ?? 0;
  const writtenEdges = rustProfile.esmNamedImportExportEdgeWriteWrittenRefs ?? 0;
  const resolutionFallbackRefs = rustProfile.esmNamedImportExportFallbackRefs ?? 0;
  const edgeWriteSkippedRefs = rustProfile.esmNamedImportExportEdgeWriteSkippedRefs ?? 0;
  return {
    eligibleRefs: (rustProfile.esmNamedImportExportResolvedRefs ?? 0) + resolutionFallbackRefs,
    attemptedRefs,
    writtenEdges,
    skippedRefs: resolutionFallbackRefs + edgeWriteSkippedRefs,
    skipReasons,
    skipSamples: [...fallbackSamples, ...edgeWriteSkipSamples].map(guardedEdgeWriteSample).slice(0, 20),
    edgeKindCounts: {
      calls: writtenEdges,
    },
  };
}

function packageSelfNameSkipReasons(outcomeCounts: Record<string, number>): Record<string, number> {
  const skipReasons: Record<string, number> = {};
  for (const [reason, count] of Object.entries(outcomeCounts)) {
    if (packageSelfNameOutcomeIsResolved(reason)) continue;
    skipReasons[reason] = count;
  }
  return skipReasons;
}

function packageSelfNameOutcomeIsResolved(reason: string): boolean {
  return reason.startsWith('resolved') || reason === 'exportsResolved';
}

function packageImportsSkipReasons(outcomeCounts: Record<string, number>): Record<string, number> {
  const skipReasons: Record<string, number> = {};
  for (const [reason, count] of Object.entries(outcomeCounts)) {
    if (packageImportsOutcomeIsResolved(reason)) continue;
    skipReasons[reason] = count;
  }
  return skipReasons;
}

function packageImportsOutcomeIsResolved(reason: string): boolean {
  return reason === 'importsResolved';
}

function sumPackageSelfNameOutcomes(
  outcomeCounts: Record<string, number>,
  predicate: (reason: string) => boolean,
): number {
  let total = 0;
  for (const [reason, count] of Object.entries(outcomeCounts)) {
    if (predicate(reason)) total += count;
  }
  return total;
}

function moduleEdgeWriteDiagnosticsFromRustCore(profile: unknown): ModuleEdgeWriteDiagnostics {
  const rustProfile = rustCoreProfileLike(profile);
  const attemptedRefs = rustProfile.moduleResolutionGuardedEdgeWriteAttemptedRefs ?? 0;
  const writtenEdges = rustProfile.moduleResolutionGuardedEdgeWriteWrittenRefs ?? 0;
  const skippedRefs = rustProfile.moduleResolutionGuardedEdgeWriteSkippedRefs ?? 0;
  const packageSelfNameOutcomeCounts = rustProfile.importPathAliasPackageSelfNameOutcomeCounts ?? {};
  const packageSelfNameResolvedRefs =
    rustProfile.importPathAliasPackageSelfNameResolvedRefs
    ?? sumPackageSelfNameOutcomes(packageSelfNameOutcomeCounts, packageSelfNameOutcomeIsResolved);
  const packageSelfNameFallbackRefs =
    rustProfile.importPathAliasPackageSelfNameFallbackRefs
    ?? sumPackageSelfNameOutcomes(packageSelfNameOutcomeCounts, (reason) => !packageSelfNameOutcomeIsResolved(reason));
  const packageImportsOutcomeCounts = rustProfile.importPathAliasPackageImportsOutcomeCounts ?? {};
  const packageImportsResolvedRefs =
    rustProfile.importPathAliasPackageImportsResolvedRefs
    ?? sumPackageSelfNameOutcomes(packageImportsOutcomeCounts, packageImportsOutcomeIsResolved);
  const packageImportsFallbackRefs =
    rustProfile.importPathAliasPackageImportsFallbackRefs
    ?? sumPackageSelfNameOutcomes(packageImportsOutcomeCounts, (reason) => !packageImportsOutcomeIsResolved(reason));
  return {
    owner: 'rust-core',
    mode: 'guarded-file-imports',
    eligibleRefs: attemptedRefs,
    attemptedRefs,
    writtenEdges,
    skippedRefs,
    skipReasons: rustProfile.moduleResolutionGuardedEdgeWriteSkippedCounts ?? {},
    edgeKindCounts: {
      imports: writtenEdges,
    },
    declarationRuntime: {
      mode: 'single-runtime-sibling-only',
      eligibleRefs: rustProfile.moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs ?? 0,
      rewrittenEdges: rustProfile.moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs ?? 0,
      skippedRefs: rustProfile.moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs ?? 0,
      skipReasons: rustProfile.moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts ?? {},
    },
    packageSelfName: {
      mode: 'repo-local-file-targets-only',
      eligibleRefs: packageSelfNameResolvedRefs + packageSelfNameFallbackRefs,
      writtenEdges: packageSelfNameResolvedRefs,
      skippedRefs: packageSelfNameFallbackRefs,
      skipReasons: packageSelfNameSkipReasons(packageSelfNameOutcomeCounts),
      outcomeCounts: packageSelfNameOutcomeCounts,
    },
    packageImports: {
      mode: 'repo-local-file-targets-only',
      eligibleRefs: packageImportsResolvedRefs + packageImportsFallbackRefs,
      attemptedRefs: packageImportsResolvedRefs + packageImportsFallbackRefs,
      writtenEdges: packageImportsResolvedRefs,
      skippedRefs: packageImportsFallbackRefs,
      skipReasons: packageImportsSkipReasons(packageImportsOutcomeCounts),
      outcomeCounts: packageImportsOutcomeCounts,
    },
    supportedSources: ['relative', 'tsconfigPaths'],
    excludedSources: [
      'rootDirs',
      'packageSelfName',
      'packageImports',
      'packageExports',
      'defaultImports',
      'typeOnlyImports',
      'symbolUsageEdges',
      'declarationRuntimeRewrite',
    ],
  };
}

function cleanupOwnershipDiagnostics(input: {
  resolvedTerminalRefs?: number;
  intentionallyUnresolvedTerminalRefs?: number;
  retainedRefs?: number;
} = {}): CleanupOwnershipDiagnostics {
  return {
    owner: 'typescript-finalization',
    mode: 'contract-only',
    resolvedTerminalRefs: input.resolvedTerminalRefs ?? 0,
    intentionallyUnresolvedTerminalRefs: input.intentionallyUnresolvedTerminalRefs ?? 0,
    retainedRefs: input.retainedRefs ?? 0,
    rustCorePrecleanedRefs: null,
    notes: [
      'This contract reports TypeScript finalization terminal cleanup and does not migrate cleanup into Rust core.',
      'Rust core may pre-clean references it owns, but this bucket reports null unless a reliable public count exists.',
    ],
  };
}

// Re-export types for consumers
export * from './types';
// Storage building blocks for embedded/SDK consumers that drive the graph
// directly (open a DB, run prepared queries) rather than through the CodeGraph
// facade. Exposed from the package entry so they no longer require deep imports
// into dist/ (issue #354).
export { getDatabasePath, DatabaseConnection } from './db';
export { QueryBuilder } from './db/queries';
export {
  getCodeGraphDir,
  isInitialized,
  findNearestCodeGraphRoot,
  CODEGRAPH_DIR,
} from './directory';
export { IndexProgress, IndexResult, SyncResult } from './extraction';
export { IndexEngine } from './indexing/engine-selection';
export { detectLanguage, isLanguageSupported, isGrammarLoaded, getSupportedLanguages, initGrammars, loadGrammarsForLanguages, loadAllGrammars } from './extraction';
export { ResolutionResult } from './resolution';
export {
  CodeGraphError,
  FileError,
  ParseError,
  DatabaseError,
  SearchError,
  VectorError,
  ConfigError,
  Logger,
  setLogger,
  getLogger,
  silentLogger,
  defaultLogger,
} from './errors';
export { Mutex, FileLock, processInBatches, debounce, throttle, MemoryMonitor } from './utils';
export { FileWatcher, WatchOptions, PendingFile, LockUnavailableError } from './sync';
export { MCPServer } from './mcp';

function classifyRustImportResolutionFallbacks(refs: UnresolvedReference[]): {
  bindingLevelSymbolDisambiguation: number;
  unsupportedImportForm: number;
  unresolvedImportTarget: number;
} {
  const counts = {
    bindingLevelSymbolDisambiguation: 0,
    unsupportedImportForm: 0,
    unresolvedImportTarget: 0,
  };

  for (const ref of refs) {
    if (ref.referenceKind !== 'imports') continue;
    if (ref.language == null || !['javascript', 'jsx', 'typescript', 'tsx'].includes(ref.language)) continue;
    const name = ref.referenceName;
    if (name.startsWith('./') || name.startsWith('../') || name.includes('/')) {
      counts.unresolvedImportTarget += 1;
    } else if (/^[$_A-Za-z][$_A-Za-z0-9]*$/.test(name)) {
      counts.bindingLevelSymbolDisambiguation += 1;
    } else {
      counts.unsupportedImportForm += 1;
    }
  }

  return counts;
}

/**
 * Options for initializing a new CodeGraph project
 */
export interface InitOptions {
  /** Whether to run initial indexing after init */
  index?: boolean;

  /** Full-index engine to use when index is true. Defaults to rust-hybrid. */
  engine?: IndexEngine;

  /** Progress callback for indexing */
  onProgress?: (progress: IndexProgress) => void;
}

/**
 * Options for opening an existing CodeGraph project
 */
export interface OpenOptions {
  /** Whether to run sync if files have changed */
  sync?: boolean;

  /** Whether to run in read-only mode */
  readOnly?: boolean;
}

/**
 * Options for indexing
 */
export interface IndexOptions {
  /** Full-index engine to use. Defaults to rust-hybrid. */
  engine?: IndexEngine;

  /** Progress callback */
  onProgress?: (progress: IndexProgress) => void;

  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Enable verbose logging (worker lifecycle, memory, timeouts) */
  verbose?: boolean;
}

/**
 * Main CodeGraph class
 *
 * Provides the primary interface for interacting with the code knowledge graph.
 */
export class CodeGraph {
  private db: DatabaseConnection;
  private queries: QueryBuilder;
  private projectRoot: string;
  private orchestrator: ExtractionOrchestrator;
  private resolver: ReferenceResolver;
  private graphManager: GraphQueryManager;
  private traverser: GraphTraverser;
  private contextBuilder: ContextBuilder;

  // Mutex for preventing concurrent indexing operations (in-process)
  private indexMutex = new Mutex();

  // File lock for preventing concurrent writes across processes (CLI, MCP, git hooks)
  private fileLock: FileLock;

  // File watcher for auto-sync on file changes
  private watcher: FileWatcher | null = null;

  private constructor(
    db: DatabaseConnection,
    queries: QueryBuilder,
    projectRoot: string
  ) {
    this.db = db;
    this.queries = queries;
    this.projectRoot = projectRoot;
    this.fileLock = new FileLock(
      path.join(projectRoot, '.zcodegraph', 'zcodegraph.lock')
    );
    this.orchestrator = new ExtractionOrchestrator(projectRoot, queries);
    this.resolver = createResolver(projectRoot, queries);
    this.graphManager = new GraphQueryManager(queries);
    this.traverser = new GraphTraverser(queries);
    this.contextBuilder = createContextBuilder(
      projectRoot,
      queries,
      this.traverser
    );
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  /**
   * Initialize a new CodeGraph project
   *
   * Creates the .CodeGraph directory, database, and configuration.
   *
   * @param projectRoot - Path to the project root directory
   * @param options - Initialization options
   * @returns A new CodeGraph instance
   */
  static async init(projectRoot: string, options: InitOptions = {}): Promise<CodeGraph> {
    await initGrammars();
    const resolvedRoot = path.resolve(projectRoot);

    // Check if already initialized
    if (isInitialized(resolvedRoot)) {
      throw new Error(`CodeGraph already initialized in ${resolvedRoot}`);
    }

    // Create directory structure
    createDirectory(resolvedRoot);

    // Initialize database
    const dbPath = getDatabasePath(resolvedRoot);
    const db = DatabaseConnection.initialize(dbPath);
    const queries = new QueryBuilder(db.getDb());

    const instance = new CodeGraph(db, queries, resolvedRoot);

    // Run initial indexing if requested
    if (options.index) {
      await instance.indexAll({ engine: options.engine, onProgress: options.onProgress });
    }

    return instance;
  }

  /**
   * Initialize synchronously (without indexing)
   */
  static initSync(projectRoot: string): CodeGraph {
    const resolvedRoot = path.resolve(projectRoot);

    // Check if already initialized
    if (isInitialized(resolvedRoot)) {
      throw new Error(`CodeGraph already initialized in ${resolvedRoot}`);
    }

    // Create directory structure
    createDirectory(resolvedRoot);

    // Initialize database
    const dbPath = getDatabasePath(resolvedRoot);
    const db = DatabaseConnection.initialize(dbPath);
    const queries = new QueryBuilder(db.getDb());

    return new CodeGraph(db, queries, resolvedRoot);
  }

  /**
   * Open an existing CodeGraph project
   *
   * @param projectRoot - Path to the project root directory
   * @param options - Open options
   * @returns A CodeGraph instance
   */
  static async open(projectRoot: string, options: OpenOptions = {}): Promise<CodeGraph> {
    await initGrammars();
    const resolvedRoot = path.resolve(projectRoot);

    // Check if initialized
    if (!isInitialized(resolvedRoot)) {
      throw new Error(`CodeGraph not initialized in ${resolvedRoot}. Run init() first.`);
    }

    // Validate directory structure
    const validation = validateDirectory(resolvedRoot);
    if (!validation.valid) {
      throw new Error(`Invalid CodeGraph directory: ${validation.errors.join(', ')}`);
    }

    // Open database
    const dbPath = getDatabasePath(resolvedRoot);
    const db = DatabaseConnection.open(dbPath);
    const queries = new QueryBuilder(db.getDb());

    const instance = new CodeGraph(db, queries, resolvedRoot);

    // Sync if requested
    if (options.sync) {
      await instance.sync();
    }

    return instance;
  }

  /**
   * Open synchronously (without sync)
   */
  static openSync(projectRoot: string): CodeGraph {
    const resolvedRoot = path.resolve(projectRoot);

    // Check if initialized
    if (!isInitialized(resolvedRoot)) {
      throw new Error(`CodeGraph not initialized in ${resolvedRoot}. Run init() first.`);
    }

    // Validate directory structure
    const validation = validateDirectory(resolvedRoot);
    if (!validation.valid) {
      throw new Error(`Invalid CodeGraph directory: ${validation.errors.join(', ')}`);
    }

    // Open database
    const dbPath = getDatabasePath(resolvedRoot);
    const db = DatabaseConnection.open(dbPath);
    const queries = new QueryBuilder(db.getDb());

    return new CodeGraph(db, queries, resolvedRoot);
  }

  /**
   * Check if a directory has been initialized as a CodeGraph project
   */
  static isInitialized(projectRoot: string): boolean {
    return isInitialized(path.resolve(projectRoot));
  }

  /**
   * Close the CodeGraph instance and release resources
   */
  close(): void {
    this.unwatch();
    // Release file lock if held
    this.fileLock.release();
    this.db.close();
  }

  /**
   * Get the project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  // ===========================================================================
  // Indexing
  // ===========================================================================

  /**
   * Index all files in the project
   *
   * Uses a mutex to prevent concurrent indexing operations.
   */
  async indexAll(options: IndexOptions = {}): Promise<IndexResult> {
    const engine = options.engine ?? 'rust-hybrid';
    if (engine === 'rust' || engine === 'rust-hybrid') {
      return this.indexExternalEngine(engine, options);
    }

    return this.indexMutex.withLock(async () => {
      try {
        this.fileLock.acquire();
      } catch {
        return { success: false, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [{ message: 'Could not acquire file lock - another process may be indexing', severity: 'error' as const }], durationMs: 0 };
      }
      try {
        const before = this.queries.getNodeAndEdgeCount();
        const result = await this.orchestrator.indexAll(options.onProgress, options.signal, options.verbose);

        // Re-detect frameworks now that the index is populated. The resolver
        // is constructed with createResolver() before any files exist, so
        // framework resolvers whose detect() consults the indexed file list
        // (e.g. UIKit/SwiftUI scanning for imports, swift-objc-bridge looking
        // for both Swift and ObjC files) all return false on that initial pass
        // and silently drop themselves. Re-initializing here gives them a
        // chance to see the actual project before resolution runs.
        if (result.success && result.filesIndexed > 0) {
          this.resolver.initialize();
          // Cross-file finalization (e.g. NestJS RouterModule prefixes). Runs
          // before resolution so updated names show up in subsequent reads.
          this.resolver.runPostExtract();
        }

        // Resolve references to create call/import/extends edges
        if (result.success && result.filesIndexed > 0) {
          // Get count without loading all refs into memory
          const unresolvedCount = this.queries.getUnresolvedReferencesCount();

          options.onProgress?.({
            phase: 'resolving',
            current: 0,
            total: unresolvedCount,
          });

          await this.resolveReferencesBatched((current, total) => {
            options.onProgress?.({
              phase: 'resolving',
              current,
              total,
            });
          });
        }

        // Refresh planner stats + checkpoint the WAL after bulk writes.
        // Cheap and non-blocking; never load-bearing for correctness.
        if (result.success && result.filesIndexed > 0) {
          this.db.runMaintenance();
        }

        // The orchestrator only sees extraction-phase counts; resolution and
        // synthesizer edges (often >50% of the graph on JVM repos) come later.
        // Recompute against the DB so the CLI summary reports the true totals.
        if (result.success && result.filesIndexed > 0) {
          const after = this.queries.getNodeAndEdgeCount();
          result.nodesCreated = after.nodes - before.nodes;
          result.edgesCreated = after.edges - before.edges;
        }

        // Stamp the index with the engine that built it, so `zcodegraph status`
        // and `zcodegraph upgrade` can recommend a re-index when the running
        // engine produces richer extraction than the one on disk. Only on a
        // real full index — a sync touches a subset, so it must NOT advance the
        // extraction stamp (the bulk would still be stale). See extraction-version.ts.
        if (result.success && result.filesIndexed > 0) {
          try {
            this.queries.setMetadata('indexed_with_engine', 'typescript');
            this.queries.setMetadata('indexed_with_engine_version', CodeGraphPackageVersion);
            this.queries.setMetadata('indexed_with_version', CodeGraphPackageVersion);
            this.queries.setMetadata('indexed_with_extraction_version', String(EXTRACTION_VERSION));
          } catch { /* metadata is advisory — never fail an index over it */ }
        }

        return result;
      } finally {
        this.fileLock.release();
      }
    });
  }

  private async indexExternalEngine(engine: 'rust' | 'rust-hybrid', options: IndexOptions): Promise<IndexResult> {
    return this.indexMutex.withLock(async () => {
      this.closeDatabaseForExternalIndex();
      try {
        const result = await runRustIndexer(this.projectRoot, {
          verbose: options.verbose,
          onProgress: options.onProgress,
        });
        if (!result.success || result.filesIndexed === 0) {
          return result;
        }

        const cg = await CodeGraph.open(this.projectRoot);
        try {
          let fallbackResult: Awaited<ReturnType<typeof cg.indexFallbackFiles>> | null = null;
          const hybridPlan = engine === 'rust-hybrid' ? planRustHybridAssignments(this.projectRoot) : null;
          let runtimeHybridPlan = engine === 'rust-hybrid' && hybridPlan
            ? mergeRustOwnedGapDiagnostics(hybridPlan, result.errors as RustOwnedPerFileGapDiagnostic[])
            : hybridPlan;

          if (engine === 'rust-hybrid' && runtimeHybridPlan && runtimeHybridPlan.fallbackFiles.length > 0) {
            fallbackResult = await cg.indexFallbackFiles(runtimeHybridPlan.fallbackFiles);
            if (fallbackResult.missingFallbackFileCount > 0) {
              runtimeHybridPlan = mergeMissingFallbackDiagnostics(runtimeHybridPlan, fallbackResult);
            }
            if (!fallbackResult.success) {
              return {
                success: false,
                filesIndexed: result.filesIndexed + fallbackResult.filesIndexed,
                filesSkipped: result.filesSkipped + fallbackResult.filesSkipped,
                filesErrored: result.filesErrored + fallbackResult.filesErrored,
                nodesCreated: result.nodesCreated + fallbackResult.nodesCreated,
                edgesCreated: result.edgesCreated + fallbackResult.edgesCreated,
                errors: fallbackResult.errors,
                durationMs: result.durationMs + fallbackResult.durationMs,
                profile: {
                  rustCore: result.profile,
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
            result.filesIndexed += fallbackResult.filesIndexed;
            result.filesSkipped += fallbackResult.filesSkipped;
            result.filesErrored += fallbackResult.filesErrored;
            result.nodesCreated += fallbackResult.nodesCreated;
            result.edgesCreated += fallbackResult.edgesCreated;
            result.errors.push(...fallbackResult.errors);
          }

          const finalizationStarted = Date.now();
          const finalized = await cg.finalizeRustIndex(
            (current, total) => {
              options.onProgress?.({
                phase: 'resolving',
                current,
                total,
              });
            },
            undefined,
            result.profile,
          );
          if (engine === 'rust-hybrid') {
            cg.markRustHybridIndex(buildRustHybridMetadataFromPlan(runtimeHybridPlan ?? planRustHybridAssignments(this.projectRoot)));
          }
          result.nodesCreated += finalized.nodesCreated;
          result.edgesCreated += finalized.edgesCreated;
          result.profile = {
            rustCore: result.profile,
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
          return result;
        } finally {
          cg.close();
        }
      } finally {
        this.reopenDatabaseAfterExternalIndex();
      }
    });
  }

  private closeDatabaseForExternalIndex(): void {
    this.unwatch();
    this.fileLock.release();
    this.db.close();
  }

  private reopenDatabaseAfterExternalIndex(): void {
    const db = DatabaseConnection.open(getDatabasePath(this.projectRoot));
    const queries = new QueryBuilder(db.getDb());
    this.db = db;
    this.queries = queries;
    this.orchestrator = new ExtractionOrchestrator(this.projectRoot, queries);
    this.resolver = createResolver(this.projectRoot, queries);
    this.graphManager = new GraphQueryManager(queries);
    this.traverser = new GraphTraverser(queries);
    this.contextBuilder = createContextBuilder(
      this.projectRoot,
      queries,
      this.traverser
    );
  }

  /**
   * Index specific files
   *
   * Uses a mutex to prevent concurrent indexing operations.
   */
  async indexFiles(filePaths: string[]): Promise<IndexResult> {
    return this.indexMutex.withLock(async () => {
      try {
        this.fileLock.acquire();
      } catch {
        return { success: false, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [{ message: 'Could not acquire file lock - another process may be indexing', severity: 'error' as const }], durationMs: 0 };
      }
      try {
        await initGrammars();
        const neededLanguages = [...new Set(filePaths.map((filePath) => detectLanguage(filePath)))];
        if (neededLanguages.includes('c') && !neededLanguages.includes('cpp')) {
          neededLanguages.push('cpp');
        }
        await loadGrammarsForLanguages(neededLanguages);
        return this.orchestrator.indexFiles(filePaths);
      } finally {
        this.fileLock.release();
      }
    });
  }

  /**
   * Append TypeScript-owned fallback files into the currently open graph.
   *
   * @internal
   *
   * Internal rust-hybrid runtime hook: this deliberately indexes only the
   * provided files, does not clear existing Rust-owned data, and does not run
   * TypeScript finalization. The CLI runs finalization once after Rust + fallback
   * writes have both completed.
   */
  async indexFallbackFiles(filePaths: string[]): Promise<IndexResult & {
    fallbackFileCount: number;
    missingFallbackFileCount: number;
    missingFallbackByLanguage: Record<string, number>;
    errorTaxonomy: Record<string, number>;
  }> {
    const started = Date.now();
    const existingFilePaths: string[] = [];
    const missingFallbackByLanguage: Record<string, number> = {};
    const missingErrors = [];

    for (const filePath of filePaths) {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.projectRoot, filePath);
      if (fs.existsSync(absolutePath)) {
        existingFilePaths.push(filePath);
        continue;
      }

      const language = detectLanguage(filePath);
      missingFallbackByLanguage[language] = (missingFallbackByLanguage[language] ?? 0) + 1;
      missingErrors.push({
        message: `Planned TypeScript fallback file is missing: ${filePath}`,
        filePath,
        severity: 'warning' as const,
        code: 'language-level-fallback-missing-file',
      });
    }

    const result = existingFilePaths.length > 0
      ? await this.indexFiles(existingFilePaths)
      : {
        success: true,
        filesIndexed: 0,
        filesSkipped: 0,
        filesErrored: 0,
        nodesCreated: 0,
        edgesCreated: 0,
        errors: [],
        durationMs: 0,
      };
    const errorTaxonomy: Record<string, number> = {};
    const errors = [...result.errors, ...missingErrors];
    for (const err of errors) {
      const key = err.code ?? (err.severity === 'warning' ? 'warning' : 'unknown');
      errorTaxonomy[key] = (errorTaxonomy[key] ?? 0) + 1;
    }
    return {
      ...result,
      filesErrored: result.filesErrored + missingErrors.length,
      errors,
      fallbackFileCount: filePaths.length,
      missingFallbackFileCount: missingErrors.length,
      missingFallbackByLanguage,
      errorTaxonomy,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Sync with current file state (incremental update)
   *
   * Uses a mutex to prevent concurrent indexing operations.
   */
  async sync(options: IndexOptions = {}): Promise<SyncResult> {
    return this.indexMutex.withLock(async () => {
      try {
        this.fileLock.acquire();
      } catch {
        return { filesChecked: 0, filesAdded: 0, filesModified: 0, filesRemoved: 0, nodesUpdated: 0, durationMs: 0 };
      }
      try {
        const result = await this.orchestrator.sync(options.onProgress);

        // Cross-file finalization (e.g. NestJS RouterModule prefixes). Run on
        // every sync that touched files so edits to `app.module.ts` propagate
        // to controllers in unchanged files. The pass is idempotent and cheap
        // (regex over *.module.ts only).
        if (result.filesAdded > 0 || result.filesModified > 0) {
          this.resolver.runPostExtract();
        }

        // Resolve references if files were updated
        if (result.filesAdded > 0 || result.filesModified > 0) {
          if (result.changedFilePaths) {
            // Scope resolution to changed files (git fast path — bounded set)
            const unresolvedRefs = this.queries.getUnresolvedReferencesByFiles(result.changedFilePaths);

            options.onProgress?.({
              phase: 'resolving',
              current: 0,
              total: unresolvedRefs.length,
            });

            this.resolver.resolveAndPersist(unresolvedRefs, (current, total) => {
              options.onProgress?.({
                phase: 'resolving',
                current,
                total,
              });
            });
          } else {
            // No git info — use batched resolution to avoid OOM
            const unresolvedCount = this.queries.getUnresolvedReferencesCount();

            options.onProgress?.({
              phase: 'resolving',
              current: 0,
              total: unresolvedCount,
            });

            await this.resolveReferencesBatched((current, total) => {
              options.onProgress?.({
                phase: 'resolving',
                current,
                total,
              });
            });
          }
        }

        // Refresh planner stats + checkpoint the WAL after bulk writes.
        if (result.filesAdded > 0 || result.filesModified > 0 || result.filesRemoved > 0) {
          this.db.runMaintenance();
        }

        return result;
      } finally {
        this.fileLock.release();
      }
    });
  }

  /**
   * Check if an indexing operation is currently in progress
   */
  isIndexing(): boolean {
    return this.indexMutex.isLocked();
  }

  // ===========================================================================
  // File Watching
  // ===========================================================================

  /**
   * Start watching for file changes and auto-syncing.
   *
   * Uses native OS file events (FSEvents on macOS, inotify on Linux 19+,
   * ReadDirectoryChangesW on Windows) with debouncing to avoid thrashing.
   *
   * @param options - Watch options (debounce delay, callbacks)
   * @returns true if watching started successfully
   */
  watch(options: WatchOptions = {}): boolean {
    if (this.watcher?.isActive()) return true;

    this.watcher = new FileWatcher(
      this.projectRoot,
      async () => {
        const result = await this.sync();
        // sync() returns this exact zero-shape iff it failed to acquire the
        // file lock (a real empty sync always has filesChecked > 0 because
        // scanDirectory ran). Surface that to the watcher as a typed error
        // so it keeps pendingFiles + reschedules instead of clearing them
        // (#449).
        if (result.filesChecked === 0 && result.durationMs === 0) {
          throw new LockUnavailableError();
        }
        const filesChanged = result.filesAdded + result.filesModified + result.filesRemoved;
        return { filesChanged, durationMs: result.durationMs };
      },
      options
    );

    return this.watcher.start();
  }

  /**
   * Stop watching for file changes.
   */
  unwatch(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
  }

  /**
   * Check if the file watcher is active.
   */
  isWatching(): boolean {
    return this.watcher?.isActive() ?? false;
  }

  /**
   * Files seen by the file watcher since the last successful sync —
   * the per-file "stale" signal MCP tools attach to responses so an agent
   * can fall back to {@link Read} for just the affected file without
   * waiting for a debounced sync to complete (issue #403).
   *
   * Returns an empty list when the watcher isn't active, or no events have
   * arrived. Each entry includes `firstSeenMs` and `lastSeenMs` (wall-clock
   * `Date.now()` values) so callers can render "edited Nms ago", plus an
   * `indexing` flag indicating whether the in-flight sync (if any) will
   * absorb that file.
   */
  getPendingFiles(): PendingFile[] {
    return this.watcher?.getPendingFiles() ?? [];
  }

  /**
   * Resolves once the file watcher has installed its watch set. Useful for
   * tests that need a deterministic boundary before asserting on
   * `getPendingFiles()`. Resolves immediately when no watcher is active.
   */
  waitUntilWatcherReady(timeoutMs?: number): Promise<void> {
    return this.watcher ? this.watcher.waitUntilReady(timeoutMs) : Promise.resolve();
  }

  /**
   * Get files that have changed since last index
   */
  getChangedFiles(): { added: string[]; modified: string[]; removed: string[] } {
    return this.orchestrator.getChangedFiles();
  }

  /**
   * Most recent index timestamp (ms since epoch) across all tracked files, or
   * null when nothing is indexed yet. Lets library consumers check index
   * freshness without shelling out to `zcodegraph status --json`. (#329)
   */
  getLastIndexedAt(): number | null {
    return this.queries.getLastIndexedAt();
  }

  /**
   * Which engine built the current index: the package version + extraction
   * version stamped at the last full `indexAll`. Either field is null for an
   * index built before stamping existed (treated as stale). See
   * `extraction-version.ts` and `isIndexStale()`.
   */
  getIndexBuildInfo(): {
    version: string | null;
    extractionVersion: number | null;
    engine: string | null;
    engineVersion: string | null;
    hybrid: unknown | null;
  } {
    const engine = this.queries.getMetadata('indexed_with_engine');
    const engineVersion = this.queries.getMetadata('indexed_with_engine_version');
    const version = this.queries.getMetadata('indexed_with_version');
    const ev = this.queries.getMetadata('indexed_with_extraction_version');
    const hybridRaw = this.queries.getMetadata('indexed_with_hybrid_metadata');
    const parsed = ev != null ? parseInt(ev, 10) : NaN;
    let hybrid: unknown | null = null;
    if (hybridRaw != null) {
      try {
        hybrid = JSON.parse(hybridRaw);
      } catch {
        hybrid = { error: 'Failed to parse rust-hybrid metadata' };
      }
    }
    return { version, extractionVersion: Number.isFinite(parsed) ? parsed : null, engine, engineVersion, hybrid };
  }

  /**
   * Stamp a Rust-built index with the Phase 1 hybrid contract. The CLI owns the
   * temporary engine selection path; this only writes advisory metadata into the
   * existing project_metadata table.
   */
  markRustHybridIndex(metadata: unknown): void {
    this.queries.setMetadata('indexed_with_engine', 'rust-hybrid');
    this.queries.setMetadata('indexed_with_hybrid_metadata', JSON.stringify(metadata));
  }

  /**
   * True when the on-disk index was built by an engine whose extraction is
   * older than the one now running — i.e. a re-index would add data a migration
   * can't backfill. False when there's no index yet (nothing to refresh) or the
   * stamp is current. This is the signal behind `zcodegraph status`'s re-index
   * hint and `zcodegraph upgrade`'s reminder.
   */
  isIndexStale(): boolean {
    if (this.queries.getLastIndexedAt() == null) return false;
    const { extractionVersion } = this.getIndexBuildInfo();
    return extractionVersion == null || extractionVersion < EXTRACTION_VERSION;
  }

  /**
   * Extract nodes and edges from source code (without storing)
   */
  extractFromSource(filePath: string, source: string): ExtractionResult {
    return extractFromSource(filePath, source);
  }

  // ===========================================================================
  // Reference Resolution
  // ===========================================================================

  /**
   * Resolve unresolved references and create edges
   *
   * This method takes unresolved references from extraction and attempts
   * to resolve them using multiple strategies:
   * - Framework-specific patterns (React, Express, Laravel)
   * - Import-based resolution
   * - Name-based symbol matching
   */
  resolveReferences(onProgress?: (current: number, total: number) => void): ResolutionResult {
    // Get all unresolved references from the database
    const unresolvedRefs = this.queries.getUnresolvedReferences();
    return this.resolver.resolveAndPersist(unresolvedRefs, onProgress);
  }

  /**
   * Resolve references in batches to keep memory bounded on large codebases.
   * Processes chunks of unresolved refs, persisting results after each batch.
   */
  async resolveReferencesBatched(onProgress?: (current: number, total: number) => void): Promise<ResolutionResult> {
    return this.resolver.resolveAndPersistBatched(onProgress);
  }

  /**
   * Complete the TypeScript-side graph passes after an external extractor
   * has written files, nodes, edges, and unresolved_refs into the database.
   *
   * The Rust Phase 1 indexer owns extraction and metadata stamping; this method
   * deliberately only runs framework finalization, reference resolution, dynamic
   * edge synthesis, and maintenance so the index remains marked as Rust-built.
   */
  async finalizeRustIndex(
    onProgress?: (current: number, total: number) => void,
    onCheckpoint?: (name: string) => void,
    rustCoreProfile?: unknown,
  ): Promise<{
    nodesCreated: number;
    edgesCreated: number;
    profile: {
      frameworkPostExtractMs: number;
      referenceResolutionMs: number;
      referenceResolutionBreakdown: {
        importResolutionMs: number;
        nameMatchingMs: number;
        frameworkMatchingMs: number;
        databaseAccessMs: number;
        cacheWarmupDbMs: number;
        refHydrationDbMs: number;
        cacheWarmupMs: number;
        unresolvedReadMs: number;
        unresolvedReadDbMs: number;
        candidateLookupMs: number;
        sharedCandidateLookupMs: number;
        candidateLookupCacheHitMs: number;
        nameMatcherCandidateLookupDbMs: number;
        perReferenceDisambiguationMs: number;
        rustMatcherMs: number;
        rustMatcherStartupMs: number;
        rustMatcherSerializationMs: number;
        rustMatcherEligibleRefs: number;
        rustMatcherHandledRefs: number;
        rustMatcherFallbackRefs: number;
        rustMatcherSemanticMismatchRefs: number;
        rustMatcherSemanticMismatchSamples: Array<{
          referenceName: string;
          referenceKind: string;
          filePath: string;
          language: string;
          rustTargetNodeId: string | null;
          rustResolvedBy: string | null;
          rustConfidence: number;
          tsTargetNodeId: string | null;
          tsResolvedBy: string | null;
          tsConfidence: number | null;
          reason: string;
        }>;
        rustMatcherFallbackReasons: Record<string, number>;
        rustMatcherCandidateMaterializationMs: number;
        rustMatcherSubprocessMs: number;
        rustMatcherTsVerificationMs: number;
        rustMatcherTsVerificationReusedCandidateRefs: number;
        rustMatcherPayloadBytes: number;
        rustMatcherUniqueCandidateFacts: number;
        candidateReplayEligibleRefs: number;
        candidateReplayComparedRefs: number;
        candidateReplayEquivalentRefs: number;
        candidateReplayMismatchRefs: number;
        candidateReplayMismatchReasons: Record<string, number>;
        candidateReplayMismatchSamples: Array<{
          referenceName: string;
          referenceKind: string;
          filePath: string;
          language: string;
          baselineTargetNodeId: string | null;
          baselineResolvedBy: string | null;
          baselineConfidence: number | null;
          replayTargetNodeId: string | null;
          replayResolvedBy: string | null;
          replayConfidence: number | null;
          reason: string;
        }>;
        semanticReplay: {
          eligibleRefs: number;
          comparedRefs: number;
          equivalentRefs: number;
          mismatchRefs: number;
          skippedRefs: number;
          mismatchReasons: Record<string, number>;
          mismatchSamples: Array<{
            referenceName: string;
            referenceKind: string;
            filePath: string;
            language: string;
            baselineTargetNodeId: string | null;
            baselineResolvedBy: string | null;
            replayTargetNodeId: string | null;
            replayResolvedBy: string | null;
            reason: string;
          }>;
        };
        guardedEdgeWrite: GuardedEdgeWriteDiagnostics;
        moduleEdgeWrite: ModuleEdgeWriteDiagnostics;
        cleanupOwnership: CleanupOwnershipDiagnostics;
        candidateProtocol: CandidateProtocolDiagnostics;
        edgeMaterializationMs: number;
        edgeMaterializationDbMs: number;
        edgeEndpointValidationDbMs: number;
        edgeInsertCount: number;
        edgeInsertSerializationMs: number;
        edgeInsertSerializedBytes: number;
        edgeWriteMs: number;
        edgeWriteDbMs: number;
        unresolvedCleanupMs: number;
        unresolvedCleanupDbMs: number;
        resolvedCleanupMs: number;
        resolvedCleanupDbMs: number;
        resolvedCleanupRowCount: number;
        intentionallyUnresolvedCleanupMs: number;
        intentionallyUnresolvedCleanupDbMs: number;
        intentionallyUnresolvedCleanupRowCount: number;
        otherResolutionMs: number;
      };
      dynamicDispatchSynthesisMs: number;
      dbMaintenanceMs: number;
      boundaryProtocol: {
        version: number;
        productShell: 'typescript';
        rustOwnedStages: string[];
      };
      fallbackTaxonomy: {
        totalFallbacks: number;
        entries: Array<{
          stage: string;
          classification: 'parity-bug' | 'intentional-improvement-candidate' | 'known-unsupported';
          reason: string;
          count: number;
        }>;
      };
    };
  }> {
    return this.indexMutex.withLock(async () => {
      try {
        this.fileLock.acquire();
      } catch {
        throw new Error('Could not acquire file lock - another process may be indexing');
      }

      try {
        const before = this.queries.getNodeAndEdgeCount();
        const profile = {
          frameworkPostExtractMs: 0,
          referenceResolutionMs: 0,
          referenceResolutionBreakdown: {
            importResolutionMs: 0,
            nameMatchingMs: 0,
            frameworkMatchingMs: 0,
            databaseAccessMs: 0,
            cacheWarmupDbMs: 0,
            refHydrationDbMs: 0,
            cacheWarmupMs: 0,
            unresolvedReadMs: 0,
            unresolvedReadDbMs: 0,
            candidateLookupMs: 0,
            sharedCandidateLookupMs: 0,
            candidateLookupCacheHitMs: 0,
            nameMatcherCandidateLookupDbMs: 0,
            perReferenceDisambiguationMs: 0,
            rustMatcherMs: 0,
            rustMatcherStartupMs: 0,
            rustMatcherSerializationMs: 0,
            rustMatcherEligibleRefs: 0,
            rustMatcherHandledRefs: 0,
            rustMatcherFallbackRefs: 0,
            rustMatcherSemanticMismatchRefs: 0,
            rustMatcherSemanticMismatchSamples: [] as Array<{
              referenceName: string;
              referenceKind: string;
              filePath: string;
              language: string;
              rustTargetNodeId: string | null;
              rustResolvedBy: string | null;
              rustConfidence: number;
              tsTargetNodeId: string | null;
              tsResolvedBy: string | null;
              tsConfidence: number | null;
              reason: string;
            }>,
            rustMatcherFallbackReasons: {},
            rustMatcherCandidateMaterializationMs: 0,
            rustMatcherSubprocessMs: 0,
            rustMatcherTsVerificationMs: 0,
            rustMatcherTsVerificationReusedCandidateRefs: 0,
            rustMatcherPayloadBytes: 0,
            rustMatcherUniqueCandidateFacts: 0,
            candidateReplayEligibleRefs: 0,
            candidateReplayComparedRefs: 0,
            candidateReplayEquivalentRefs: 0,
            candidateReplayMismatchRefs: 0,
            candidateReplayMismatchReasons: {},
            candidateReplayMismatchSamples: [] as Array<{
              referenceName: string;
              referenceKind: string;
              filePath: string;
              language: string;
              baselineTargetNodeId: string | null;
              baselineResolvedBy: string | null;
              baselineConfidence: number | null;
              replayTargetNodeId: string | null;
              replayResolvedBy: string | null;
              replayConfidence: number | null;
              reason: string;
            }>,
            semanticReplay: {
              eligibleRefs: 0,
              comparedRefs: 0,
              equivalentRefs: 0,
              mismatchRefs: 0,
              skippedRefs: 0,
              mismatchReasons: {},
              mismatchSamples: [] as Array<{
                referenceName: string;
                referenceKind: string;
                filePath: string;
                language: string;
                baselineTargetNodeId: string | null;
                baselineResolvedBy: string | null;
                replayTargetNodeId: string | null;
                replayResolvedBy: string | null;
                reason: string;
              }>,
            },
            guardedEdgeWrite: guardedEdgeWriteDiagnosticsFromRustCore(rustCoreProfile),
            moduleEdgeWrite: moduleEdgeWriteDiagnosticsFromRustCore(rustCoreProfile),
            cleanupOwnership: cleanupOwnershipDiagnostics(),
            candidateProtocol: {
              enabled: true,
              materializationMs: 0,
              lookupMs: 0,
              lookupCount: 0,
              cacheHitCount: 0,
              cacheMissCount: 0,
              dbLookupCount: 0,
              candidateCount: 0,
              lookupShapeCounts: {
                ExactName: 0,
                LowerName: 0,
                QualifiedName: 0,
                FileNodes: 0,
                KnownNamePresence: 0,
              },
              lookupShapeMs: {
                ExactName: 0,
                LowerName: 0,
                QualifiedName: 0,
                FileNodes: 0,
                KnownNamePresence: 0,
              },
              fileNodesLookup: {
                requestedCount: 0,
                reusedCount: 0,
                missedCount: 0,
                fallbackCount: 0,
                lookupMs: 0,
                batchMaterializationMs: 0,
                batchMaterializedCount: 0,
                batchHitCount: 0,
                batchMissCount: 0,
                batchUnavailableCount: 0,
                batchUnavailableReason: null,
              },
              factsProtocol: {
                shapes: {
                  LowerName: {
                    ownership: 'protocol-owned',
                    status: 'candidate-for-bounded-exploit',
                    defaultRoute: 'typescript-baseline-with-optional-rust-routing',
                    semanticBoundary: 'candidate-set-only',
                  },
                  QualifiedName: {
                    ownership: 'protocol-owned',
                    status: 'partial-keep-with-taxonomy',
                    defaultRoute: 'typescript-baseline-with-dotted-rust-routing',
                    semanticBoundary: 'candidate-set-only',
                  },
                  FileNodes: {
                    ownership: 'protocol-owned',
                    status: 'keep-with-caveat',
                    defaultRoute: 'run-scoped-batch-then-typescript-fallback',
                    semanticBoundary: 'candidate-set-only',
                  },
                },
              },
              equivalenceComparedCount: 0,
              equivalenceMismatchCount: 0,
              fallbackReasons: {},
              disabledReason: null as string | null,
              rustCandidateProducer: {
                enabled: false,
                shadowMode: true,
                producerMs: 0,
                serializationMs: 0,
                subprocessMs: 0,
                lookupCount: 0,
                lookupShapeCounts: {
                  ExactName: 0,
                  LowerName: 0,
                  QualifiedName: 0,
                  FileNodes: 0,
                  KnownNamePresence: 0,
                },
                comparedCount: 0,
                mismatchCount: 0,
                mismatchReasons: {},
                mismatchSamples: [] as CandidateProtocolDiagnostics['rustCandidateProducer']['mismatchSamples'],
                candidateCount: 0,
                payloadBytes: 0,
                disabledReason: 'disabled-by-env' as string | null,
                routing: {
                  configured: false,
                  source: 'missing-config' as const,
                  active: false,
                  activeShapes: [] as Array<'ExactName' | 'KnownNamePresence' | 'LowerName' | 'QualifiedName' | 'FileNodes'>,
                  fallbackReason: null as string | null,
                  mismatchCount: 0,
                  mismatchSamples: [] as CandidateProtocolDiagnostics['rustCandidateProducer']['mismatchSamples'],
                  onDemandLookupCount: 0,
                  onDemandLookupShapeCounts: {
                    ExactName: 0,
                    LowerName: 0,
                    QualifiedName: 0,
                    FileNodes: 0,
                    KnownNamePresence: 0,
                  },
                  onDemandCacheHitCount: 0,
                },
              },
            } as CandidateProtocolDiagnostics,
            edgeMaterializationMs: 0,
            edgeMaterializationDbMs: 0,
            edgeEndpointValidationDbMs: 0,
            edgeInsertCount: 0,
            edgeInsertSerializationMs: 0,
            edgeInsertSerializedBytes: 0,
            edgeWriteMs: 0,
            edgeWriteDbMs: 0,
            unresolvedCleanupMs: 0,
            unresolvedCleanupDbMs: 0,
            resolvedCleanupMs: 0,
            resolvedCleanupDbMs: 0,
            resolvedCleanupRowCount: 0,
            intentionallyUnresolvedCleanupMs: 0,
            intentionallyUnresolvedCleanupDbMs: 0,
            intentionallyUnresolvedCleanupRowCount: 0,
            otherResolutionMs: 0,
          },
          dynamicDispatchSynthesisMs: 0,
          dbMaintenanceMs: 0,
          boundaryProtocol: {
            version: 1,
            productShell: 'typescript' as const,
            rustOwnedStages: ['source-scan', 'parse-extraction', 'graph-write'],
          },
          fallbackTaxonomy: {
            totalFallbacks: 4,
            entries: [
              {
                stage: 'framework-post-extract',
                classification: 'known-unsupported' as const,
                reason: 'typescript-finalization-not-yet-migrated',
                count: 1,
              },
              {
                stage: 'reference-resolution',
                classification: 'known-unsupported' as const,
                reason: 'typescript-finalization-not-yet-migrated',
                count: 1,
              },
              {
                stage: 'dynamic-dispatch-synthesis',
                classification: 'known-unsupported' as const,
                reason: 'typescript-finalization-not-yet-migrated',
                count: 1,
              },
              {
                stage: 'db-maintenance',
                classification: 'known-unsupported' as const,
                reason: 'typescript-finalization-not-yet-migrated',
                count: 1,
              },
            ],
          },
        };
        const rustImportEdgeCount = this.queries.getRustFinalizationImportEdgeCount();
        const rustLocalReferenceEdgeCount = this.queries.getRustFinalizationLocalReferenceEdgeCount();
        const rustEsmNamedImportExportEdgeCount = this.queries.getRustFinalizationEsmNamedImportExportEdgeCount();
        const rustEsmOneHopReexportEdgeCount = this.queries.getRustFinalizationEsmOneHopReexportEdgeCount();
        const rustImportFallbacks = classifyRustImportResolutionFallbacks(this.queries.getUnresolvedReferences());
        if (rustImportEdgeCount > 0) {
          profile.boundaryProtocol.rustOwnedStages.push('import-path-alias-resolution');
        }
        if (rustEsmNamedImportExportEdgeCount > 0) {
          profile.boundaryProtocol.rustOwnedStages.push('esm-named-import-export-resolution');
        }
        if (rustEsmOneHopReexportEdgeCount > 0) {
          profile.boundaryProtocol.rustOwnedStages.push('esm-one-hop-reexport-resolution');
        }
        if (rustLocalReferenceEdgeCount > 0) {
          profile.boundaryProtocol.rustOwnedStages.push('local-exact-reference-resolution');
        }
        const additionalFallbackEntries = [
          {
            stage: 'reference-resolution',
            classification: 'known-unsupported' as const,
            reason: 'binding-level-symbol-disambiguation-not-yet-rust-owned',
            count: rustImportFallbacks.bindingLevelSymbolDisambiguation,
          },
          {
            stage: 'reference-resolution',
            classification: 'known-unsupported' as const,
            reason: 'unsupported-import-form-not-yet-rust-owned',
            count: rustImportFallbacks.unsupportedImportForm,
          },
          {
            stage: 'reference-resolution',
            classification: 'known-unsupported' as const,
            reason: 'unresolved-file-level-import-target',
            count: rustImportFallbacks.unresolvedImportTarget,
          },
        ].filter((entry) => entry.count > 0);
        profile.fallbackTaxonomy.entries.push(...additionalFallbackEntries);
        profile.fallbackTaxonomy.totalFallbacks += additionalFallbackEntries.reduce((sum, entry) => sum + entry.count, 0);
        const frameworkStarted = Date.now();
        onCheckpoint?.('finalization.frameworkPostExtract.started');
        this.resolver.initialize();
        this.resolver.runPostExtract();
        profile.frameworkPostExtractMs = Date.now() - frameworkStarted;
        onCheckpoint?.('finalization.frameworkPostExtract.completed');

        const resolutionStarted = Date.now();
        onCheckpoint?.('finalization.referenceResolution.started');
        const resolution = await this.resolveReferencesBatched(onProgress);
        const resolutionTotalMs = Date.now() - resolutionStarted;
        onCheckpoint?.('finalization.referenceResolution.completed');
        const resolutionTimings = resolution.stats.timings;
        profile.referenceResolutionBreakdown = {
          importResolutionMs: resolutionTimings?.importResolutionMs ?? 0,
          nameMatchingMs: resolutionTimings?.nameMatchingMs ?? 0,
          frameworkMatchingMs: resolutionTimings?.frameworkMatchingMs ?? 0,
          databaseAccessMs: resolutionTimings?.databaseAccessMs ?? 0,
          cacheWarmupDbMs: resolutionTimings?.cacheWarmupDbMs ?? 0,
          refHydrationDbMs: resolutionTimings?.refHydrationDbMs ?? 0,
          cacheWarmupMs: resolutionTimings?.cacheWarmupMs ?? 0,
          unresolvedReadMs: resolutionTimings?.unresolvedReadMs ?? 0,
          unresolvedReadDbMs: resolutionTimings?.unresolvedReadDbMs ?? 0,
          candidateLookupMs: resolutionTimings?.candidateLookupMs ?? 0,
          sharedCandidateLookupMs: resolutionTimings?.sharedCandidateLookupMs ?? 0,
          candidateLookupCacheHitMs: resolutionTimings?.candidateLookupCacheHitMs ?? 0,
          nameMatcherCandidateLookupDbMs: resolutionTimings?.nameMatcherCandidateLookupDbMs ?? 0,
          perReferenceDisambiguationMs: resolutionTimings?.perReferenceDisambiguationMs ?? 0,
          rustMatcherMs: resolutionTimings?.rustMatcherMs ?? 0,
          rustMatcherStartupMs: resolutionTimings?.rustMatcherStartupMs ?? 0,
          rustMatcherSerializationMs: resolutionTimings?.rustMatcherSerializationMs ?? 0,
          rustMatcherEligibleRefs: resolutionTimings?.rustMatcherEligibleRefs ?? 0,
          rustMatcherHandledRefs: resolutionTimings?.rustMatcherHandledRefs ?? 0,
          rustMatcherFallbackRefs: resolutionTimings?.rustMatcherFallbackRefs ?? 0,
          rustMatcherSemanticMismatchRefs: resolutionTimings?.rustMatcherSemanticMismatchRefs ?? 0,
          rustMatcherSemanticMismatchSamples: resolutionTimings?.rustMatcherSemanticMismatchSamples ?? [],
          rustMatcherFallbackReasons: resolutionTimings?.rustMatcherFallbackReasons ?? {},
          rustMatcherCandidateMaterializationMs: resolutionTimings?.rustMatcherCandidateMaterializationMs ?? 0,
          rustMatcherSubprocessMs: resolutionTimings?.rustMatcherSubprocessMs ?? 0,
          rustMatcherTsVerificationMs: resolutionTimings?.rustMatcherTsVerificationMs ?? 0,
          rustMatcherTsVerificationReusedCandidateRefs:
            resolutionTimings?.rustMatcherTsVerificationReusedCandidateRefs ?? 0,
          rustMatcherPayloadBytes: resolutionTimings?.rustMatcherPayloadBytes ?? 0,
          rustMatcherUniqueCandidateFacts: resolutionTimings?.rustMatcherUniqueCandidateFacts ?? 0,
          candidateReplayEligibleRefs: resolutionTimings?.candidateReplayEligibleRefs ?? 0,
          candidateReplayComparedRefs: resolutionTimings?.candidateReplayComparedRefs ?? 0,
          candidateReplayEquivalentRefs: resolutionTimings?.candidateReplayEquivalentRefs ?? 0,
          candidateReplayMismatchRefs: resolutionTimings?.candidateReplayMismatchRefs ?? 0,
          candidateReplayMismatchReasons: resolutionTimings?.candidateReplayMismatchReasons ?? {},
          candidateReplayMismatchSamples: resolutionTimings?.candidateReplayMismatchSamples ?? [],
          semanticReplay: resolutionTimings?.semanticReplay ?? profile.referenceResolutionBreakdown.semanticReplay,
          guardedEdgeWrite: profile.referenceResolutionBreakdown.guardedEdgeWrite,
          moduleEdgeWrite: profile.referenceResolutionBreakdown.moduleEdgeWrite,
          cleanupOwnership: cleanupOwnershipDiagnostics({
            resolvedTerminalRefs: resolutionTimings?.resolvedCleanupRowCount ?? 0,
            intentionallyUnresolvedTerminalRefs: resolutionTimings?.intentionallyUnresolvedCleanupRowCount ?? 0,
            retainedRefs: this.queries.getUnresolvedReferencesCount(),
          }),
          candidateProtocol: resolutionTimings?.candidateProtocol ?? profile.referenceResolutionBreakdown.candidateProtocol,
          edgeMaterializationMs: resolutionTimings?.edgeMaterializationMs ?? 0,
          edgeMaterializationDbMs: resolutionTimings?.edgeMaterializationDbMs ?? 0,
          edgeEndpointValidationDbMs: resolutionTimings?.edgeEndpointValidationDbMs ?? 0,
          edgeInsertCount: resolutionTimings?.edgeInsertCount ?? 0,
          edgeInsertSerializationMs: resolutionTimings?.edgeInsertSerializationMs ?? 0,
          edgeInsertSerializedBytes: resolutionTimings?.edgeInsertSerializedBytes ?? 0,
          edgeWriteMs: resolutionTimings?.edgeWriteMs ?? 0,
          edgeWriteDbMs: resolutionTimings?.edgeWriteDbMs ?? 0,
          unresolvedCleanupMs: resolutionTimings?.unresolvedCleanupMs ?? 0,
          unresolvedCleanupDbMs: resolutionTimings?.unresolvedCleanupDbMs ?? 0,
          resolvedCleanupMs: resolutionTimings?.resolvedCleanupMs ?? 0,
          resolvedCleanupDbMs: resolutionTimings?.resolvedCleanupDbMs ?? 0,
          resolvedCleanupRowCount: resolutionTimings?.resolvedCleanupRowCount ?? 0,
          intentionallyUnresolvedCleanupMs: resolutionTimings?.intentionallyUnresolvedCleanupMs ?? 0,
          intentionallyUnresolvedCleanupDbMs: resolutionTimings?.intentionallyUnresolvedCleanupDbMs ?? 0,
          intentionallyUnresolvedCleanupRowCount: resolutionTimings?.intentionallyUnresolvedCleanupRowCount ?? 0,
          otherResolutionMs: resolutionTimings?.otherResolutionMs ?? 0,
        };
        profile.dynamicDispatchSynthesisMs = resolutionTimings?.dynamicDispatchSynthesisMs ?? 0;
        onCheckpoint?.('finalization.dynamicDispatchSynthesis.started');
        onCheckpoint?.('finalization.dynamicDispatchSynthesis.completed');
        profile.referenceResolutionMs = Math.max(0, resolutionTotalMs - profile.dynamicDispatchSynthesisMs);

        const maintenanceStarted = Date.now();
        onCheckpoint?.('finalization.dbMaintenance.started');
        this.db.runMaintenance();
        profile.dbMaintenanceMs = Date.now() - maintenanceStarted;
        onCheckpoint?.('finalization.dbMaintenance.completed');

        const after = this.queries.getNodeAndEdgeCount();
        return {
          nodesCreated: after.nodes - before.nodes,
          edgesCreated: after.edges - before.edges,
          profile,
        };
      } finally {
        this.fileLock.release();
      }
    });
  }

  /**
   * Get detected frameworks in the project
   */
  getDetectedFrameworks(): string[] {
    return this.resolver.getDetectedFrameworks();
  }

  /**
   * Re-initialize the resolver (useful after adding new files)
   */
  reinitializeResolver(): void {
    this.resolver.initialize();
  }

  // ===========================================================================
  // Graph Statistics
  // ===========================================================================

  /**
   * Get statistics about the knowledge graph
   */
  getStats(): GraphStats {
    const stats = this.queries.getStats();
    stats.dbSizeBytes = this.db.getSize();
    return stats;
  }

  /**
   * Active SQLite backend for this project's connection (`node-sqlite` — Node's
   * built-in real-SQLite module). Surfaced via `zcodegraph status` and the
   * `zcodegraph_status` MCP tool alongside the effective journal mode.
   */
  getBackend(): import('./db').SqliteBackend {
    return this.db.getBackend();
  }

  /**
   * The journal mode actually in effect ('wal', 'delete', …). 'wal' means
   * readers never block on a concurrent writer; anything else means they can,
   * which is the precondition for the "database is locked" failures in issue
   * #238. Surfaced via `zcodegraph status` and the `zcodegraph_status` MCP tool.
   */
  getJournalMode(): string {
    return this.db.getJournalMode();
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  /**
   * Get a node by ID
   */
  getNode(id: string): Node | null {
    return this.queries.getNodeById(id);
  }

  /**
   * Get all nodes in a file
   */
  getNodesInFile(filePath: string): Node[] {
    return this.queries.getNodesByFile(filePath);
  }

  /**
   * Get all nodes of a specific kind
   */
  getNodesByKind(kind: Node['kind']): Node[] {
    return this.queries.getNodesByKind(kind);
  }

  /**
   * Get ALL nodes with an exact name (direct index lookup, not FTS-ranked/capped).
   * Used to enumerate every overload of a heavily-overloaded name so the specific
   * definition the caller wants is never dropped below a search cut.
   */
  getNodesByName(name: string): Node[] {
    return this.queries.getNodesByName(name);
  }

  /**
   * Search nodes by text
   */
  searchNodes(query: string, options?: SearchOptions): SearchResult[] {
    return this.queries.searchNodes(query, options);
  }

  /**
   * Find the project's "primary route file" — the file with the densest
   * concentration of framework-emitted `route` nodes (≥3 routes, ≥30%
   * of all non-test routes). Used to inline the routing config in
   * `zcodegraph_explore` responses on small realworld template repos
   * (rails-realworld, laravel-realworld, drupal-admintoolbar, …) where
   * Glob+Read of `routes.rb`/`urls.py`/etc. otherwise beats codegraph.
   */
  getTopRouteFile(): { filePath: string; routeCount: number; totalRoutes: number } | null {
    return this.queries.getTopRouteFile();
  }

  /**
   * Build a URL → handler routing manifest from the index. Each entry
   * pairs a route node (URL + method) with its handler function/method
   * via the `references` edge that framework resolvers emit. Returns
   * null when fewer than 3 valid (non-test) routes exist.
   */
  getRoutingManifest(limit?: number): {
    entries: Array<{ url: string; handler: string; handlerFile: string; handlerLine: number; handlerKind: string }>;
    topHandlerFile: string | null;
    topHandlerFileCount: number;
    totalRoutes: number;
  } | null {
    return this.queries.getRoutingManifest(limit);
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): Edge[] {
    return this.queries.getOutgoingEdges(nodeId);
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): Edge[] {
    return this.queries.getIncomingEdges(nodeId);
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  /**
   * Get a file record by path
   */
  getFile(filePath: string): FileRecord | null {
    return this.queries.getFileByPath(filePath);
  }

  /**
   * Get all tracked files
   */
  getFiles(): FileRecord[] {
    return this.queries.getAllFiles();
  }

  // ===========================================================================
  // Graph Query Methods
  // ===========================================================================

  /**
   * Get the context for a node (ancestors, children, references)
   *
   * Returns comprehensive context about a node including its containment
   * hierarchy, children, incoming/outgoing references, type information,
   * and relevant imports.
   *
   * @param nodeId - ID of the focal node
   * @returns Context object with all related information
   */
  getContext(nodeId: string): Context {
    return this.graphManager.getContext(nodeId);
  }

  /**
   * Traverse the graph from a starting node
   *
   * Uses breadth-first search by default. Supports filtering by edge types,
   * node types, and traversal direction.
   *
   * @param startId - Starting node ID
   * @param options - Traversal options
   * @returns Subgraph containing traversed nodes and edges
   */
  traverse(startId: string, options?: TraversalOptions): Subgraph {
    return this.traverser.traverseBFS(startId, options);
  }

  /**
   * Get the call graph for a function
   *
   * Returns both callers (functions that call this function) and
   * callees (functions called by this function) up to the specified depth.
   *
   * @param nodeId - ID of the function/method node
   * @param depth - Maximum depth in each direction (default: 2)
   * @returns Subgraph containing the call graph
   */
  getCallGraph(nodeId: string, depth: number = 2): Subgraph {
    return this.traverser.getCallGraph(nodeId, depth);
  }

  /**
   * Get the type hierarchy for a class/interface
   *
   * Returns both ancestors (types this extends/implements) and
   * descendants (types that extend/implement this).
   *
   * @param nodeId - ID of the class/interface node
   * @returns Subgraph containing the type hierarchy
   */
  getTypeHierarchy(nodeId: string): Subgraph {
    return this.traverser.getTypeHierarchy(nodeId);
  }

  /**
   * Find all usages of a symbol
   *
   * Returns all nodes that reference the specified symbol through
   * any edge type (calls, references, type_of, etc.).
   *
   * @param nodeId - ID of the symbol node
   * @returns Array of nodes and edges that reference this symbol
   */
  findUsages(nodeId: string): Array<{ node: Node; edge: Edge }> {
    return this.traverser.findUsages(nodeId);
  }

  /**
   * Get callers of a function/method
   *
   * @param nodeId - ID of the function/method node
   * @param maxDepth - Maximum depth to traverse (default: 1)
   * @returns Array of nodes that call this function
   */
  getCallers(nodeId: string, maxDepth: number = 1): Array<{ node: Node; edge: Edge }> {
    return this.traverser.getCallers(nodeId, maxDepth);
  }

  /**
   * Get callees of a function/method
   *
   * @param nodeId - ID of the function/method node
   * @param maxDepth - Maximum depth to traverse (default: 1)
   * @returns Array of nodes called by this function
   */
  getCallees(nodeId: string, maxDepth: number = 1): Array<{ node: Node; edge: Edge }> {
    return this.traverser.getCallees(nodeId, maxDepth);
  }

  /**
   * Calculate the impact radius of a node
   *
   * Returns all nodes that could be affected by changes to this node.
   *
   * @param nodeId - ID of the node
   * @param maxDepth - Maximum depth to traverse (default: 3)
   * @returns Subgraph containing potentially impacted nodes
   */
  getImpactRadius(nodeId: string, maxDepth: number = 3): Subgraph {
    return this.traverser.getImpactRadius(nodeId, maxDepth);
  }

  /**
   * Find the shortest path between two nodes
   *
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @param edgeKinds - Edge types to consider (all if empty)
   * @returns Array of nodes and edges forming the path, or null if no path exists
   */
  findPath(
    fromId: string,
    toId: string,
    edgeKinds?: Edge['kind'][]
  ): Array<{ node: Node; edge: Edge | null }> | null {
    return this.traverser.findPath(fromId, toId, edgeKinds);
  }

  /**
   * Get ancestors of a node in the containment hierarchy
   *
   * @param nodeId - ID of the node
   * @returns Array of ancestor nodes from immediate parent to root
   */
  getAncestors(nodeId: string): Node[] {
    return this.traverser.getAncestors(nodeId);
  }

  /**
   * Get immediate children of a node
   *
   * @param nodeId - ID of the node
   * @returns Array of child nodes
   */
  getChildren(nodeId: string): Node[] {
    return this.traverser.getChildren(nodeId);
  }

  /**
   * Get dependencies of a file
   *
   * @param filePath - Path to the file
   * @returns Array of file paths this file depends on
   */
  getFileDependencies(filePath: string): string[] {
    return this.graphManager.getFileDependencies(filePath);
  }

  /**
   * Get dependents of a file
   *
   * @param filePath - Path to the file
   * @returns Array of file paths that depend on this file
   */
  getFileDependents(filePath: string): string[] {
    return this.graphManager.getFileDependents(filePath);
  }

  /**
   * Find circular dependencies in the codebase
   *
   * @returns Array of cycles, each cycle is an array of file paths
   */
  findCircularDependencies(): string[][] {
    return this.graphManager.findCircularDependencies();
  }

  /**
   * Find dead code (unreferenced symbols)
   *
   * @param kinds - Node kinds to check (default: functions, methods, classes)
   * @returns Array of unreferenced nodes
   */
  findDeadCode(kinds?: Node['kind'][]): Node[] {
    return this.graphManager.findDeadCode(kinds);
  }

  /**
   * Get complexity metrics for a node
   *
   * @param nodeId - ID of the node
   * @returns Object containing various complexity metrics
   */
  getNodeMetrics(nodeId: string): {
    incomingEdgeCount: number;
    outgoingEdgeCount: number;
    callCount: number;
    callerCount: number;
    childCount: number;
    depth: number;
  } {
    return this.graphManager.getNodeMetrics(nodeId);
  }

  // ===========================================================================
  // Context Building
  // ===========================================================================

  /**
   * Get the source code for a node
   *
   * Reads the file and extracts the code between startLine and endLine.
   *
   * @param nodeId - ID of the node
   * @returns Code string or null if not found
   */
  async getCode(nodeId: string): Promise<string | null> {
    return this.contextBuilder.getCode(nodeId);
  }

  /**
   * Find relevant subgraph for a query
   *
   * Combines semantic search with graph traversal to find the most
   * relevant nodes and their relationships for a given query.
   *
   * @param query - Natural language query describing the task
   * @param options - Search and traversal options
   * @returns Subgraph of relevant nodes and edges
   */
  async findRelevantContext(
    query: string,
    options?: FindRelevantContextOptions
  ): Promise<Subgraph> {
    return this.contextBuilder.findRelevantContext(query, options);
  }

  /**
   * Build context for a task
   *
   * Creates comprehensive context by:
   * 1. Running FTS search to find Entry Nodes
   * 2. Expanding the graph around Entry Nodes
   * 3. Extracting code blocks for key nodes
   * 4. Formatting output for Claude
   *
   * @param input - Task description (string or {title, description})
   * @param options - Build options (maxNodes, includeCode, format, etc.)
   * @returns TaskContext object or formatted string (markdown/JSON)
   */
  async collectContext(
    input: TaskInput,
    options?: CollectContextOptions
  ): Promise<TaskContext | string> {
    return this.contextBuilder.collectContext(input, options);
  }

  // ===========================================================================
  // Database Management
  // ===========================================================================

  /**
   * Optimize the database (vacuum and analyze)
   */
  optimize(): void {
    this.db.optimize();
  }

  /**
   * Clear all data from the graph
   */
  clear(): void {
    this.queries.clear();
  }

  /**
   * Alias for close() for backwards compatibility.
   * @deprecated Use close() instead
   */
  destroy(): void {
    this.close();
  }

  /**
   * Completely remove CodeGraph from the project.
   * This closes the database and deletes the .CodeGraph directory.
   *
   * WARNING: This permanently deletes all CodeGraph data for the project.
   */
  uninitialize(): void {
    this.close();
    removeDirectory(this.projectRoot);
  }
}

// Default export
export default CodeGraph;
