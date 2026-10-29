/**
 * MCP shared engine — the heavyweight, *shared* state for an MCP server:
 * the project's {@link CodeGraph} instance, file watcher, and the
 * {@link ToolHandler} cache for cross-project queries.
 *
 * One engine, many sessions:
 * - direct mode (single stdio session) instantiates one engine + one session;
 * - daemon mode instantiates one engine and a new session per socket
 *   connection. Every session reads from the same SQLite WAL and the same
 *   inotify watch set — that's the entire point of issue #411.
 */

import { readIntegerFlag } from '../config/flags';
import type CodeGraph from '../index';
import { findNearestCodeGraphRoot } from '../directory';
import { watchDisabledReason } from '../sync';
import { ToolHandler } from './tools';
import { getUnavailableGrammarErrors } from '../extraction/grammars';
import { EmbeddingRunner } from '../embedding/worker-runner';
import type { IndexProgress } from '../extraction';

/**
 * Server-side sink for MCP `notifications/progress`. The engine owns *when*
 * progress fires (catch-up sync, watcher-driven re-sync); the session owns
 * *where* it goes (its own transport). Decoupling via this signature lets
 * the daemon reuse one engine for N sessions — the sink is just the latest
 * session to have called `setProgressSink`, which matches how
 * `ToolHandler.setDefaultCodeGraph` already handles the shared-state case.
 */
export type ProgressSink = (method: string, params?: unknown) => void;

// Lazy-load the heavy CodeGraph chain (sqlite + query/graph/context layers) OFF
// the MCP startup path. It's only needed once a tool actually opens a project —
// not to answer initialize/tools-list — so deferring it lets `serve --mcp` (and
// the daemon it spawns) bind + register tools in ~Node-startup time instead of
// ~800ms, closing the "No such tool available" cold-start race that made headless
// agents flounder. require() is sync + cached on the CommonJS build.
const loadCodeGraph = (): typeof import('../index').default =>
  (require('../index') as typeof import('../index')).default;

/** Test seam for the un-transpiled CommonJS require above. */
let codeGraphLoaderForTests: (() => typeof import('../index').default) | null = null;
export function setCodeGraphLoaderForTests(
  loader: (() => typeof import('../index').default) | null,
): void {
  codeGraphLoaderForTests = loader;
}
const loadDefaultCodeGraph = (): typeof import('../index').default =>
  codeGraphLoaderForTests?.() ?? loadCodeGraph();

export interface MCPEngineOptions {
  /**
   * Whether to start the file watcher when initializing. Daemon and direct
   * modes both want this true; tests may set it false to keep the engine
   * cheap. Honors {@link watchDisabledReason} regardless.
   */
  watch?: boolean;
}

/**
 * Shared MCP engine. Thread-safe in the sense that multiple sessions can
 * call its methods concurrently — internally it serializes initialization
 * through a single promise so multiple sessions racing each other on first
 * connect never double-open the SQLite file.
 */
export class MCPEngine {
  private cg: CodeGraph | null = null;
  private toolHandler: ToolHandler;
  // Project root we resolved to. Null until `ensureInitialized` succeeds
  // (or null forever if no .zcodegraph/ ever turned up — that's a valid
  // state for the engine, since cross-project queries still work).
  private projectPath: string | null = null;
  // Set on first `ensureInitialized` so subsequent sessions don't redo work.
  private initPromise: Promise<void> | null = null;
  private watcherStarted = false;
  private opts: Required<MCPEngineOptions>;
  private closed = false;
  private stopPromise: Promise<void> | null = null;
  // Latest session-provided transport for progress notifications. Null until
  // a session calls setProgressSink (i.e. until `initialize` completes).
  private progressSink: ProgressSink | null = null;
  // Drives MCP `kind: 'begin' / 'end'` semantics — we only open a progress
  // token once per catch-up sync, not once per IndexProgress event.
  private progressTokenSeq = 0;

  constructor(opts: MCPEngineOptions = {}) {
    this.opts = { watch: opts.watch ?? true };
    this.toolHandler = new ToolHandler(null);
  }

  /**
   * Register the transport used to push `notifications/progress` for
   * engine-driven work (currently: catch-up sync after project open). The
   * latest call wins — in daemon mode N sessions share one engine, and the
   * sink is a property of "whoever is currently connected", not of the
   * engine itself.
   */
  setProgressSink(sink: ProgressSink | null): void {
    this.progressSink = sink;
  }

  /**
   * Current progress sink — exposed for tests to assert that sessions
   * register/deregister their transport correctly.
   */
  getProgressSink(): ProgressSink | null {
    return this.progressSink;
  }

  /**
   * Convenience for {@link MCPServer} compatibility: pre-seed an explicit
   * project path (from the `--path` CLI flag) without yet opening it. This
   * keeps the synchronous constructor cheap; the actual open happens on the
   * first `ensureInitialized` call.
   */
  setProjectPathHint(projectPath: string): void {
    this.projectPath = projectPath;
    this.toolHandler.setDefaultProjectHint(projectPath);
  }

  /** Project root that the engine resolved on first init (null if none). */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  /** Shared ToolHandler — sessions delegate tool dispatch through this. */
  getToolHandler(): ToolHandler {
    return this.toolHandler;
  }

  /** Whether the default project's CodeGraph is open. */
  hasDefaultCodeGraph(): boolean {
    return this.toolHandler.hasDefaultCodeGraph();
  }

  /**
   * Walk up from `searchFrom` to find the nearest `.zcodegraph/` and open it.
   * Idempotent: concurrent callers share one in-flight init; subsequent
   * callers after success are no-ops.
   *
   * The original `MCPServer.tryInitializeDefault` carried the same retry-on-
   * subsequent-tool-call semantics; we preserve them by NOT throwing when the
   * search misses (just leaves `cg` null so the next call can retry).
   */
  async ensureInitialized(searchFrom: string): Promise<void> {
    if (this.closed) return;
    if (this.toolHandler.hasDefaultCodeGraph()) return;
    if (this.initPromise) {
      try { await this.initPromise; } catch { /* let caller retry */ }
      return;
    }

    this.initPromise = this.doInitialize(searchFrom).finally(() => {
      this.initPromise = null;
    });
    try {
      await this.initPromise;
    } catch {
      // Init errors are logged inside `doInitialize`; falling through here
      // matches MCPServer's previous "retry on next tool call" behavior.
    }
  }

  /**
   * Synchronous last-resort init used by the per-session retry loop when the
   * background `ensureInitialized` already finished (or failed) and we need
   * to pick up a project that appeared *after* the engine started.
   */
  retryInitializeSync(searchFrom: string): void {
    if (this.closed) return;
    if (this.toolHandler.hasDefaultCodeGraph()) return;
    this.toolHandler.setDefaultProjectHint(searchFrom);
    const resolvedRoot = findNearestCodeGraphRoot(searchFrom);
    if (!resolvedRoot) return;
    try {
      // Close any previously failed instance to avoid leaking resources.
      if (this.cg) {
        try { this.cg.close(); } catch { /* ignore */ }
        this.cg = null;
      }
      this.cg = loadDefaultCodeGraph().openSync(resolvedRoot);
      this.projectPath = resolvedRoot;
      this.toolHandler.setDefaultCodeGraph(this.cg);
      this.cg.resumePendingEmbeddings();
      this.startWatching();
      this.catchUpSync();
    } catch {
      // Still failing — caller will try again on the next tool call.
    }
  }

  /**
   * Close everything. Used on graceful daemon shutdown (SIGTERM/idle timeout)
   * and on direct-mode stop. Idempotent.
   */
  stop(): void {
    void this.stopAndWait();
  }

  /** Process-exit path: close all graph connections before awaiting their workers. */
  stopAndWait(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.closed = true;
    this.stopPromise = (async () => {
      this.toolHandler.closeAll();
      if (this.cg) {
        try { this.cg.close(); } catch { /* ignore */ }
        this.cg = null;
      }
      await EmbeddingRunner.shutdownAll();
    })();
    return this.stopPromise;
  }

  private async doInitialize(searchFrom: string): Promise<void> {
    this.toolHandler.setDefaultProjectHint(searchFrom);

    const resolvedRoot = findNearestCodeGraphRoot(searchFrom);
    if (!resolvedRoot) {
      // No .zcodegraph/ above searchFrom. Sessions may still discover one later via roots/list
      this.projectPath = searchFrom;
      return;
    }

    this.projectPath = resolvedRoot;
    try {
      this.cg = await loadDefaultCodeGraph().open(resolvedRoot);
      this.toolHandler.setDefaultCodeGraph(this.cg);
      // Surface tree-sitter grammar load failures so zcodegraph_status can
      // list languages that lost their parser (wasm missing / ABI mismatch).
      // Roadmap 1-2-1.
      const grammarFailures = getUnavailableGrammarErrors();
      this.toolHandler.setUnavailableGrammars(
        new Map(Object.entries(grammarFailures) as Array<[string, string]>),
      );
      this.cg.resumePendingEmbeddings();
      this.startWatching();
      this.catchUpSync();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[CodeGraph MCP] Failed to open project at ${resolvedRoot}: ${msg}\n`);
      // Surface the failure to subsequent tool calls so the agent sees the
      // underlying cause + recovery hint, not the misleading "no project
      // loaded" working-directory diagnostic. Roadmap 1-2-1.
      this.toolHandler.setInitFailure({ projectPath: resolvedRoot, message: msg });
    }
  }

  /**
   * Start file watching on the active CodeGraph instance. Idempotent — the
   * watcher is per-engine, not per-session, which is why the daemon path
   * collapses N inotify sets to one. The wording of the disabled-reason log
   * exactly matches the prior in-tree implementation so log-driven dashboards
   * keep working.
   */
  private startWatching(): void {
    if (!this.cg || this.watcherStarted || !this.opts.watch) return;

    const disabledReason = watchDisabledReason(this.projectPath ?? process.cwd());
    if (disabledReason) {
      process.stderr.write(
        `[CodeGraph MCP] File watcher disabled — ${disabledReason}. ` +
        `The graph will not auto-update; run \`zcodegraph sync\` (or run \`zcodegraph index\` in an interactive terminal to install git sync hooks) to refresh.\n`
      );
      this.watcherStarted = true;
      return;
    }

    // Optional override for the debounce window via env var (issue #403).
    // Useful for workspaces with bursty writes (formatter-on-save chains,
    // large generated outputs) where the 2s default fires too often. Clamped
    // to [100ms, 60s]; out-of-range / non-numeric values fall back to the
    // FileWatcher default. We log the active value so it's discoverable.
    const debounceMs = parseDebounceEnv(process.env.ZCG_WATCH_DEBOUNCE_MS);
    if (debounceMs !== undefined) {
      process.stderr.write(`[CodeGraph MCP] File watcher debounce: ${debounceMs}ms (ZCG_WATCH_DEBOUNCE_MS)\n`);
    }

    const started = this.cg.watch({
      debounceMs,
      onSyncComplete: (result) => {
        if (result.filesChanged > 0) {
          process.stderr.write(
            `[CodeGraph MCP] Auto-synced ${result.filesChanged} file(s) in ${result.durationMs}ms\n`
          );
        }
      },
      onSyncError: (err) => {
        process.stderr.write(`[CodeGraph MCP] Auto-sync error: ${err.message}\n`);
      },
    });

    this.watcherStarted = true;
    if (started) {
      process.stderr.write('[CodeGraph MCP] File watcher active — graph will auto-sync on changes\n');
    } else {
      process.stderr.write(
        '[CodeGraph MCP] File watcher unavailable on this platform — run `zcodegraph sync` to refresh the graph after changes.\n'
      );
    }
  }

  /**
   * Reconcile the index with the current filesystem once, right after open —
   * catches edits, adds, deletes, and `git pull`/`checkout` changes made while
   * no watcher was running. Runs in the background, but the returned promise
   * is pushed into the ToolHandler as a one-shot gate so the *first* tool
   * call awaits completion before serving (without this, a tool call that
   * races past sync returns rows for files that no longer exist on disk —
   * and the per-file staleness banner can't help because `getPendingFiles()`
   * is populated by the watcher, not by catch-up).
   */
  private catchUpSync(): void {
    const cg = this.cg;
    if (!cg) return;

    // MCP progress bridge. We open a single `progressToken` per catch-up
    // sync and translate IndexProgress events into MCP `notifications/progress`
    // begin/report/end messages. Phases are forwarded verbatim from the
    // extraction pipeline so the agent can map them onto its own UX
    // (scanning → parsing → storing → resolving).
    const sink = this.progressSink;
    const token = sink ? `zcodegraph-sync-${++this.progressTokenSeq}` : null;
    let sawBegin = false;
    const onProgress = sink && token
      ? (evt: IndexProgress) => {
          const title = 'Catching up index';
          const message = `${evt.phase}: ${evt.current}/${evt.total}${evt.currentFile ? ` — ${evt.currentFile}` : ''}`;
          const percentage = evt.total > 0 ? Math.round((evt.current / evt.total) * 100) : undefined;
          if (!sawBegin) {
            sawBegin = true;
            sink('notifications/progress', {
              progressToken: token,
              value: { kind: 'begin', title, message, percentage },
            });
            return;
          }
          sink('notifications/progress', {
            progressToken: token,
            value: { kind: 'report', message, percentage },
          });
        }
      : undefined;

    const p = cg
      .sync(onProgress ? { onProgress } : {})
      .then((result) => {
        const changed = result.filesAdded + result.filesModified + result.filesRemoved;
        if (changed > 0) {
          process.stderr.write(`[CodeGraph MCP] Caught up ${changed} file(s) changed since last run\n`);
        }
        if (sink && token && sawBegin) {
          sink('notifications/progress', {
            progressToken: token,
            value: {
              kind: 'end',
              message: changed > 0 ? `Caught up ${changed} file(s)` : 'Index already up to date',
            },
          });
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[CodeGraph MCP] Catch-up sync failed: ${msg}\n`);
        if (sink && token && sawBegin) {
          sink('notifications/progress', {
            progressToken: token,
            value: { kind: 'end', message: `Catch-up sync failed: ${msg}` },
          });
        }
      });
    this.toolHandler.setCatchUpGate(p);
  }
}

/**
 * Parse and clamp the ZCG_WATCH_DEBOUNCE_MS env override.
 *
 * Issue #403: workspaces with bursty writes (formatter-on-save, multi-file
 * refactors) sometimes want a longer quiet window before sync. Returns
 * `undefined` for unset / empty / non-numeric / out-of-range values so the
 * FileWatcher default (2000ms) takes over — never throws.
 *
 * Clamp range: 100ms (faster would mean a sync per keystroke) to 60s (longer
 * and the watcher feels broken). Out-of-range values are treated as "ignore
 * this misconfiguration" rather than capped, since silently capping a 0 or
 * a typoed value would mask a real config bug.
 */
export function parseDebounceEnv(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = readIntegerFlag('ZCG_WATCH_DEBOUNCE_MS', {
    env: { ZCG_WATCH_DEBOUNCE_MS: raw },
    onWarning: message => process.stderr.write(`[CodeGraph MCP] ${message}\n`),
  });
  return parsed === 2000 && raw.trim() !== '2000' ? undefined : parsed;
}
