/**
 * Index Pipeline Stages
 *
 * Each stage implements IndexStage with a single responsibility.
 * Extracted from ExtractionOrchestrator.indexAll() — stages are the
 * "what happens in each phase", independently testable with injected
 * file lists and mock storage.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { execFileSync } from 'child_process';

import type { ExtractionResult, Language } from '../types';
import type { IndexContext, IndexStage, IndexStageResult } from './index-pipeline-types';
import type { QueryBuilder } from '../db/queries';

import { detectLanguage, isSourceFile, initGrammars, isFileLevelOnlyLanguage } from './grammars';
import { extractFromSource } from './tree-sitter';
import { logWarn } from '../errors';
import { validatePathWithinRoot, normalizePath } from '../utils';
import ignore, { Ignore } from 'ignore';
import { detectFrameworks } from '../resolution/frameworks';
import type { ResolutionContext } from '../resolution/types';
import { hashContent } from './index';

// Re-export constants from extraction/index.ts that stages depend on
const FILE_IO_BATCH_SIZE = 10;
const MAX_FILE_SIZE = 1024 * 1024;
const PARSE_TIMEOUT_MS = 10_000;
const WORKER_RECYCLE_INTERVAL = 250;

// Re-export ignore patterns for scan stage
const DEFAULT_IGNORE_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'bower_components', 'jspm_packages', 'web_modules',
  '.yarn', '.pnpm-store',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.vite', '.parcel-cache', '.angular',
  '.docusaurus', 'storybook-static', '.vinxi', '.nitro', 'out-tsc',
  '.vercel', '.netlify', '.wrangler',
  'dist', 'build', 'out', '.output',
  'coverage', '.nyc_output',
  '__pycache__', '__pypackages__', '.venv', 'venv', '.pixi', '.pdm-build',
  '.mypy_cache', '.pytest_cache', '.ruff_cache', '.tox', '.nox', '.hypothesis',
  '.ipynb_checkpoints', '.eggs',
  'target', '.gradle',
  'obj',
  'vendor',
  '.build', 'Pods', 'Carthage', 'DerivedData', '.swiftpm',
  '.dart_tool', '.pub-cache',
  '.cxx', '.externalNativeBuild', 'vcpkg_installed',
  '.bloop', '.metals',
  'lua_modules', '.luarocks',
  '__history', '__recovery',
  '.cache',
]);

const DEFAULT_IGNORE_PATTERNS: string[] = [
  ...Array.from(DEFAULT_IGNORE_DIRS, (d) => `${d}/`),
  '*.egg-info/',
  'cmake-build-*/',
  'bazel-*/',
];

function buildDefaultIgnore(rootDir: string): Ignore {
  const ig = ignore().add(DEFAULT_IGNORE_PATTERNS);
  try {
    const rootGitignore = path.join(rootDir, '.gitignore');
    if (fs.existsSync(rootGitignore)) ig.add(fs.readFileSync(rootGitignore, 'utf-8'));
  } catch {
    // Unreadable root .gitignore — the built-in defaults still apply.
  }
  return ig;
}

// ─── Scan helpers (extracted from extraction/index.ts) ────────────────────────

function collectGitFiles(repoDir: string, prefix: string, files: Set<string>): void {
  const gitOpts = { cwd: repoDir, encoding: 'utf-8' as const, timeout: 30000, maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'], windowsHide: true };

  const tracked = execFileSync('git', ['ls-files', '-z', '-c', '--recurse-submodules'], gitOpts);
  for (const rel of tracked.split('\0')) {
    if (rel) files.add(normalizePath(prefix + rel));
  }

  const untracked = execFileSync('git', ['ls-files', '-z', '-o', '--exclude-standard'], gitOpts);
  for (const rel of untracked.split('\0')) {
    if (!rel) continue;
    if (rel.endsWith('/')) {
      const childDir = path.join(repoDir, rel);
      if (fs.existsSync(path.join(childDir, '.git'))) {
        collectGitFiles(childDir, prefix + rel, files);
      }
      continue;
    }
    files.add(normalizePath(prefix + rel));
  }
}

function getGitVisibleFiles(rootDir: string): Set<string> | null {
  try {
    const gitRoot = execFileSync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd: rootDir, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
    ).trim();

    if (path.resolve(gitRoot) !== path.resolve(rootDir)) {
      try {
        execFileSync(
          'git',
          ['check-ignore', '-q', path.resolve(rootDir)],
          { cwd: rootDir, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
        );
        return null;
      } catch {
        // Not ignored — safe to use git ls-files
      }
    }

    const files = new Set<string>();
    collectGitFiles(rootDir, '', files);
    const ig = buildDefaultIgnore(rootDir);
    return new Set([...files].filter((f) => !ig.ignores(f)));
  } catch {
    return null;
  }
}

function scanDirectory(rootDir: string): string[] {
  const gitFiles = getGitVisibleFiles(rootDir);
  if (gitFiles !== null) {
    const files: string[] = [];
    for (const f of gitFiles) {
      if (isSourceFile(f)) files.push(f);
    }
    files.sort();
    return files;
  }

  // Fallback: filesystem walk
  const files: string[] = [];
  const ig = buildDefaultIgnore(rootDir);

  function walk(dir: string, stack: { dir: string; ig: Ignore }[]): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = normalizePath(path.relative(rootDir, fullPath));

      if (entry.isDirectory()) {
        if (ig.ignores(relative + '/')) continue;
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        // Recurse into directories, merging parent .gitignore
        let childIg = ig;
        const childGitignore = path.join(fullPath, '.gitignore');
        if (fs.existsSync(childGitignore)) {
          try {
            const parent = ig;
            childIg = ignore().add(parent);
            childIg.add(fs.readFileSync(childGitignore, 'utf-8'));
          } catch {
            // Unreadable — keep parent rules
          }
        }
        stack.push({ dir: fullPath, ig: childIg });
        continue;
      }

      if (ig.ignores(relative)) continue;
      if (isSourceFile(relative)) files.push(relative);
    }
  }

  walk(rootDir, [{ dir: rootDir, ig }]);
  return files;
}

// ─── Stage 1: Scan ───────────────────────────────────────────────────────────

/**
 * ScanStage: discovers all source files and detects frameworks.
 *
 * Input (from context):  rootDir, onProgress
 * Output (to context):   files, frameworkNames, neededLanguages
 */
export class ScanStage implements IndexStage {
  readonly name = 'scan';

  async execute(ctx: IndexContext): Promise<IndexStageResult> {
    await initGrammars();

    ctx.onProgress?.({ phase: 'scanning', current: 0, total: 0 });

    const files = scanDirectory(ctx.rootDir);
    ctx.files = files;

    // Detect frameworks from the scanned file list
    const frameworkNames = detectFrameworksFromFiles(ctx.rootDir, files);
    ctx.frameworkNames = frameworkNames;

    // Detect needed languages
    ctx.neededLanguages = [...new Set(files.map((f) => detectLanguage(f)))];
    // .h files default to 'c' but may be C++ — ensure cpp grammar is loaded
    if (ctx.neededLanguages.includes('c') && !ctx.neededLanguages.includes('cpp')) {
      ctx.neededLanguages.push('cpp');
    }

    // Determine worker availability
    ctx.parseWorkerPath = path.join(__dirname, 'parse-worker.js');
    ctx.useWorker = fs.existsSync(ctx.parseWorkerPath);

    return {};
  }
}

/**
 * Detect frameworks from the file list (used by ScanStage).
 * Builds a filesystem-backed ResolutionContext for framework detection.
 */
function detectFrameworksFromFiles(rootDir: string, files: string[]): string[] {
  const context: ResolutionContext = {
    getNodesInFile: () => [],
    getNodesByName: () => [],
    getNodesByQualifiedName: () => [],
    getNodesByKind: () => [],
    getNodesByLowerName: () => [],
    getImportMappings: () => [],
    getAllFiles: () => files,
    getProjectRoot: () => rootDir,
    fileExists: (relativePath: string) => {
      const full = validatePathWithinRoot(rootDir, relativePath);
      if (!full) return false;
      try { return fs.existsSync(full); } catch { return false; }
    },
    readFile: (relativePath: string) => {
      const full = validatePathWithinRoot(rootDir, relativePath);
      if (!full) return null;
      try { return fs.readFileSync(full, 'utf-8'); } catch { return null; }
    },
    listDirectories: (relativePath: string) => {
      const target = relativePath === '.' || relativePath === '' ? rootDir : path.join(rootDir, relativePath);
      try {
        return fs.readdirSync(target, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      } catch { return []; }
    },
  };
  return detectFrameworks(context).map((r) => r.name);
}

// ─── Stage 2: Parse ──────────────────────────────────────────────────────────

/**
 * ParseStage: parses all scanned files, storing results via queries.
 *
 * This is the largest stage — it manages the worker thread lifecycle,
 * batches file I/O, sends files to the worker for tree-sitter parsing,
 * and stores results in the database.
 *
 * Input (from context):  files, frameworkNames, neededLanguages, useWorker,
 *                         parseWorkerPath, rootDir, queries, onProgress, signal
 * Output (to context):   filesIndexed, filesSkipped, filesErrored, totalNodes,
 *                         totalEdges, errors, parseResults
 */
export class ParseStage implements IndexStage {
  readonly name = 'parse';

  async execute(ctx: IndexContext): Promise<IndexStageResult> {
    const files = ctx.files!;
    const frameworkNames = ctx.frameworkNames!;
    const total = files.length;

    ctx.onProgress?.({ phase: 'parsing', current: 0, total });
    // Yield so progress bar renders before blocking work
    await new Promise(resolve => setImmediate(resolve));

    // ── Worker setup ──
    let WorkerClass: typeof import('worker_threads').Worker | null = null;
    if (ctx.useWorker) {
      const { Worker } = await import('worker_threads');
      WorkerClass = Worker;
    }

    let parseWorker: import('worker_threads').Worker | null = null;
    let nextId = 0;
    let workerParseCount = 0;
    const pendingParses = new Map<number, {
      resolve: (result: ExtractionResult) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }>();

    function rejectAllPending(reason: string): void {
      for (const [id, pending] of pendingParses) {
        clearTimeout(pending.timer);
        pendingParses.delete(id);
        pending.reject(new Error(reason));
      }
    }

    function attachWorkerHandlers(w: import('worker_threads').Worker): void {
      w.on('message', (msg: { type: string; id?: number; result?: ExtractionResult }) => {
        if (msg.type === 'parse-result' && msg.id !== undefined) {
          const pending = pendingParses.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingParses.delete(msg.id);
            pending.resolve(msg.result!);
          }
        }
      });
      w.on('error', (err) => {
        logWarn('Parse worker error', { error: err.message });
        rejectAllPending(`Worker error: ${err.message}`);
      });
      w.on('exit', (code) => {
        if (code !== 0 && pendingParses.size > 0) {
          logWarn('Parse worker exited unexpectedly', { code });
          rejectAllPending(`Worker exited with code ${code}`);
        }
        if (parseWorker === w) {
          parseWorker = null;
          workerParseCount = 0;
        }
      });
    }

    async function ensureWorker(): Promise<import('worker_threads').Worker> {
      if (parseWorker) return parseWorker;
      parseWorker = new WorkerClass!(ctx.parseWorkerPath!);
      attachWorkerHandlers(parseWorker);
      await new Promise<void>((resolve, reject) => {
        parseWorker!.once('message', (msg: { type: string }) => {
          if (msg.type === 'grammars-loaded') resolve();
          else reject(new Error(`Unexpected message: ${msg.type}`));
        });
        parseWorker!.postMessage({ type: 'load-grammars', languages: ctx.neededLanguages });
      });
      return parseWorker;
    }

    function recycleWorker(): void {
      if (!parseWorker) return;
      const w = parseWorker;
      parseWorker = null;
      workerParseCount = 0;
      w.terminate().catch(() => {});
    }

    async function requestParse(filePath: string, content: string): Promise<ExtractionResult> {
      if (!WorkerClass) {
        return extractFromSource(filePath, content, detectLanguage(filePath, content), frameworkNames);
      }
      if (workerParseCount >= WORKER_RECYCLE_INTERVAL) {
        await recycleWorker();
      }
      const worker = await ensureWorker();
      const id = nextId++;
      workerParseCount++;
      const timeoutMs = PARSE_TIMEOUT_MS + Math.floor(content.length / 100_000) * 10_000;

      return new Promise<ExtractionResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingParses.delete(id);
          parseWorker = null;
          workerParseCount = 0;
          reject(new Error(`Parse timed out after ${timeoutMs}ms`));
          worker.terminate().catch(() => {});
        }, timeoutMs);
        pendingParses.set(id, { resolve, reject, timer });
        worker.postMessage({ type: 'parse', id, filePath, content, frameworkNames });
      });
    }

    if (WorkerClass) {
      await ensureWorker();
    }

    // ── Parse loop ──
    let processed = 0;

    for (let i = 0; i < files.length; i += FILE_IO_BATCH_SIZE) {
      if (ctx.signal?.aborted) {
        if (parseWorker) (parseWorker as import('worker_threads').Worker).terminate().catch(() => {});
        return { aborted: true, abortReason: 'Aborted' };
      }

      const batch = files.slice(i, i + FILE_IO_BATCH_SIZE);
      const fileContents = await Promise.all(
        batch.map(async (fp) => {
          try {
            const fullPath = validatePathWithinRoot(ctx.rootDir, fp);
            if (!fullPath) {
              return { filePath: fp, content: null as string | null, stats: null as fs.Stats | null, error: new Error('Path traversal blocked') };
            }
            const content = await fsp.readFile(fullPath, 'utf-8');
            const stats = await fsp.stat(fullPath);
            return { filePath: fp, content, stats, error: null as Error | null };
          } catch (err) {
            return { filePath: fp, content: null as string | null, stats: null as fs.Stats | null, error: err as Error };
          }
        })
      );

      for (const { filePath, content, stats, error } of fileContents) {
        if (ctx.signal?.aborted) {
          if (parseWorker) (parseWorker as import('worker_threads').Worker).terminate().catch(() => {});
          return { aborted: true, abortReason: 'Aborted' };
        }

        ctx.onProgress?.({ phase: 'parsing', current: processed, total, currentFile: filePath });

        if (error || content === null || stats === null) {
          processed++;
          ctx.filesErrored!++;
          ctx.errors!.push({
            message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
            filePath,
            severity: 'error',
            code: 'read_error',
          });
          continue;
        }

        if (stats.size > MAX_FILE_SIZE) {
          processed++;
          ctx.filesSkipped!++;
          ctx.errors!.push({
            message: `File exceeds max size (${stats.size} > ${MAX_FILE_SIZE})`,
            filePath,
            severity: 'warning',
            code: 'size_exceeded',
          });
          ctx.onProgress?.({ phase: 'parsing', current: processed, total });
          continue;
        }

        let result: ExtractionResult;
        try {
          result = await requestParse(filePath, content);
        } catch (parseErr) {
          processed++;
          ctx.filesErrored!++;
          ctx.errors!.push({
            message: parseErr instanceof Error ? parseErr.message : String(parseErr),
            filePath,
            severity: 'error',
            code: 'parse_error',
          });
          continue;
        }

        processed++;

        // Store in database
        if (result.nodes.length > 0 || result.errors.length === 0) {
          const language = detectLanguage(filePath, content);
          storeExtractionResult(ctx.queries, filePath, content, language, stats, result);
        }

        if (result.errors.length > 0) {
          for (const err of result.errors) {
            if (!err.filePath) err.filePath = filePath;
          }
          ctx.errors!.push(...result.errors);
        }

        if (result.nodes.length > 0) {
          ctx.filesIndexed!++;
          ctx.totalNodes! += result.nodes.length;
          ctx.totalEdges! += result.edges.length;
        } else if (result.errors.some((e) => e.severity === 'error')) {
          ctx.filesErrored!++;
        } else {
          const lang = detectLanguage(filePath, content);
          if (isFileLevelOnlyLanguage(lang)) {
            ctx.filesIndexed!++;
          } else {
            ctx.filesSkipped!++;
          }
        }
      }
    }

    // Report 100%
    ctx.onProgress?.({ phase: 'parsing', current: total, total });
    await new Promise(resolve => setImmediate(resolve));

    // Cleanup
    rejectAllPending('Indexing complete');
    if (parseWorker) {
      (parseWorker as import('worker_threads').Worker).terminate().catch(() => {});
    }

    return {};
  }
}

// ─── Stage 3: Retry ──────────────────────────────────────────────────────────

/**
 * RetryStage: re-attempts files that failed due to WASM memory errors.
 *
 * Operates on the errors accumulated by ParseStage. For each retryable
 * error, spawns a fresh worker and re-parses. Falls back to stripping
 * comment-only lines as a last resort.
 *
 * Input (from context):  errors, rootDir, frameworkNames, useWorker,
 *                         parseWorkerPath, neededLanguages, queries
 * Output (to context):   filesIndexed, filesSkipped, filesErrored, totalNodes,
 *                         totalEdges, errors (updated in place)
 */
export class RetryStage implements IndexStage {
  readonly name = 'retry';

  async execute(ctx: IndexContext): Promise<IndexStageResult> {
    if (!ctx.useWorker) return {};

    const retryableErrors = ctx.errors!.filter(
      (e) => e.code === 'parse_error' && e.filePath &&
        (e.message.includes('Worker exited') || e.message.includes('memory access out of bounds'))
    );

    if (retryableErrors.length === 0) return {};

    // ── First retry: fresh worker ──
    const stillFailing: typeof retryableErrors = [];

    for (const errEntry of retryableErrors) {
      const filePath = errEntry.filePath!;
      if (ctx.signal?.aborted) break;

      let content: string;
      try {
        const fullPath = validatePathWithinRoot(ctx.rootDir, filePath);
        if (!fullPath) continue;
        content = await fsp.readFile(fullPath, 'utf-8');
      } catch { continue; }

      let result: ExtractionResult;
      try {
        result = extractFromSource(
          filePath, content,
          detectLanguage(filePath, content),
          ctx.frameworkNames!
        );
      } catch {
        stillFailing.push(errEntry);
        continue;
      }

      if (result.nodes.length > 0 || result.errors.length === 0) {
        const language = detectLanguage(filePath, content);
        const stats = await fsp.stat(path.join(ctx.rootDir, filePath));
        storeExtractionResult(ctx.queries, filePath, content, language, stats, result);

        const idx = ctx.errors!.indexOf(errEntry);
        if (idx >= 0) ctx.errors!.splice(idx, 1);
        ctx.filesErrored!--;
        ctx.filesIndexed!++;
        ctx.totalNodes! += result.nodes.length;
        ctx.totalEdges! += result.edges.length;
      }
    }

    // ── Second retry: strip comments ──
    if (stillFailing.length > 0) {
      for (const errEntry of stillFailing) {
        const filePath = errEntry.filePath!;
        if (ctx.signal?.aborted) break;

        let fullContent: string;
        try {
          const fullPath = validatePathWithinRoot(ctx.rootDir, filePath);
          if (!fullPath) continue;
          fullContent = await fsp.readFile(fullPath, 'utf-8');
        } catch { continue; }

        const stripped = fullContent
          .split('\n')
          .map(line => /^\s*\/\//.test(line) ? '' : line)
          .join('\n');

        let result: ExtractionResult;
        try {
          result = extractFromSource(
            filePath, stripped,
            detectLanguage(filePath, fullContent),
            ctx.frameworkNames!
          );
        } catch { continue; }

        if (result.nodes.length > 0 || result.errors.length === 0) {
          const language = detectLanguage(filePath, fullContent);
          const stats = await fsp.stat(path.join(ctx.rootDir, filePath));
          storeExtractionResult(ctx.queries, filePath, fullContent, language, stats, result);

          const idx = ctx.errors!.indexOf(errEntry);
          if (idx >= 0) ctx.errors!.splice(idx, 1);
          ctx.filesErrored!--;
          ctx.filesIndexed!++;
          ctx.totalNodes! += result.nodes.length;
          ctx.totalEdges! += result.edges.length;
        }
      }
    }

    return {};
  }
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Store an extraction result in the database.
 * Extracted from ExtractionOrchestrator.storeExtractionResult() so both
 * ParseStage and RetryStage can use it without coupling to the orchestrator.
 */
export function storeExtractionResult(
  queries: QueryBuilder,
  filePath: string,
  content: string,
  language: Language,
  stats: fs.Stats,
  result: ExtractionResult
): void {
  const contentHash = hashContent(content);

  const existingFile = queries.getFileByPath(filePath);
  if (existingFile && existingFile.contentHash === contentHash) {
    return; // No changes
  }

  if (existingFile) {
    queries.deleteFile(filePath);
  }

  const validNodes = result.nodes.filter((n) => n.id && n.kind && n.name && n.filePath && n.language);

  if (validNodes.length > 0) {
    queries.insertNodes(validNodes);
  }

  if (result.edges.length > 0) {
    const insertedIds = new Set(validNodes.map((n) => n.id));
    const validEdges = result.edges.filter(
      (e) => insertedIds.has(e.source) && insertedIds.has(e.target)
    );
    if (validEdges.length > 0) {
      queries.insertEdges(validEdges);
    }
  }

  if (result.unresolvedReferences.length > 0) {
    const insertedIds = new Set(validNodes.map((n) => n.id));
    const refsWithContext = result.unresolvedReferences
      .filter((ref) => insertedIds.has(ref.fromNodeId))
      .map((ref) => ({
        ...ref,
        filePath: ref.filePath ?? filePath,
        language: ref.language ?? language,
      }));
    if (refsWithContext.length > 0) {
      queries.insertUnresolvedRefsBatch(refsWithContext);
    }
  }

  queries.upsertFile({
    path: filePath,
    contentHash,
    language,
    size: stats.size,
    modifiedAt: stats.mtimeMs,
    indexedAt: Date.now(),
    nodeCount: result.nodes.length,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
}
