/**
 * Worker Parse Executor
 *
 * Runs tree-sitter parsing in a separate worker thread. Encapsulates
 * worker lifecycle management previously spread across ParseStage:
 *   - Worker creation, grammar loading, message routing
 *   - Timeout handling with per-request timers
 *   - Periodic worker recycling (WORKER_RECYCLE_INTERVAL)
 *   - WASM crash detection + worker restart
 *   - Pending request cleanup on errors
 */

import type { Language, ExtractionResult } from '../types';
import type {
  ParseExecutor,
  ParseRequest,
  ParseExecutionResult,
  ParseExecutorConfig,
} from './parse-executor-types';
import {
  DEFAULT_PARSE_TIMEOUT_MS,
  DEFAULT_WORKER_RECYCLE_INTERVAL,
} from './parse-executor-types';
import { logWarn } from '../errors';

// ─── Pending parse tracking ─────────────────────────────────────────────────

interface PendingParse {
  resolve: (result: ExtractionResult) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ─── Worker message types ───────────────────────────────────────────────────

interface WorkerMessage {
  type: string;
  id?: number;
  filePath?: string;
  content?: string;
  languages?: Language[];
  frameworkNames?: string[];
  result?: ExtractionResult;
}

// ─── Executor ───────────────────────────────────────────────────────────────

export class WorkerParseExecutor implements ParseExecutor {
  readonly name = 'worker';

  private _config: Required<ParseExecutorConfig>;
  private _workerPath: string;
  private _languages: Language[] = [];
  private _frameworkNames: string[] = [];
  private _initialized = false;

  // Worker state
  private _worker: import('worker_threads').Worker | null = null;
  private _WorkerClass: typeof import('worker_threads').Worker | null = null;
  private _nextId = 0;
  private _parseCount = 0;
  private _pending = new Map<number, PendingParse>();

  constructor(workerPath: string, config?: ParseExecutorConfig) {
    this._workerPath = workerPath;
    this._config = {
      parseTimeoutMs: config?.parseTimeoutMs ?? DEFAULT_PARSE_TIMEOUT_MS,
      workerRecycleInterval: config?.workerRecycleInterval ?? DEFAULT_WORKER_RECYCLE_INTERVAL,
      parserResetInterval: config?.parserResetInterval ?? 5000,
    };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async initialize(languages: Language[], frameworkNames: string[]): Promise<void> {
    if (this._initialized) return;
    this._languages = languages;
    this._frameworkNames = frameworkNames;

    const { Worker } = await import('worker_threads');
    this._WorkerClass = Worker;
    await this._ensureWorker();
    this._initialized = true;
  }

  async dispose(): Promise<void> {
    this._rejectAllPending('Executor disposed');
    this._terminateWorker();
    this._initialized = false;
    this._WorkerClass = null;
  }

  // ── Parse ───────────────────────────────────────────────────────────────

  async parse(request: ParseRequest): Promise<ParseExecutionResult> {
    if (!this._initialized || !this._WorkerClass) {
      throw new Error('WorkerParseExecutor not initialized');
    }

    // Recycle worker periodically
    if (this._parseCount >= this._config.workerRecycleInterval) {
      await this._recycleWorker();
    }

    const worker = await this._ensureWorker();
    const id = this._nextId++;
    this._parseCount++;

    const timeoutMs =
      this._config.parseTimeoutMs +
      Math.floor(request.content.length / 100_000) * 10_000;

    try {
      const result = await new Promise<ExtractionResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          this._pending.delete(id);
          this._worker = null;
          this._parseCount = 0;
          const err = new Error(`Parse timed out after ${timeoutMs}ms`);
          reject(err);
          worker.terminate().catch(() => {});
        }, timeoutMs);

        this._pending.set(id, { resolve, reject, timer });
        worker.postMessage({
          type: 'parse',
          id,
          filePath: request.filePath,
          content: request.content,
          frameworkNames: this._frameworkNames,
        });
      });

      return { result, fromWorker: true, retryCount: 0 };
    } catch (err) {
      // Rethrow so caller can handle retries
      throw err;
    }
  }

  // ── Private: worker management ──────────────────────────────────────────

  private async _ensureWorker(): Promise<import('worker_threads').Worker> {
    if (this._worker) return this._worker;

    this._worker = new this._WorkerClass!(this._workerPath);
    this._attachHandlers(this._worker);

    // Wait for grammar loading
    await new Promise<void>((resolve, reject) => {
      this._worker!.once('message', (msg: WorkerMessage) => {
        if (msg.type === 'grammars-loaded') resolve();
        else reject(new Error(`Unexpected message: ${msg.type}`));
      });
      this._worker!.postMessage({
        type: 'load-grammars',
        languages: this._languages,
      });
    });

    return this._worker;
  }

  private async _recycleWorker(): Promise<void> {
    if (!this._worker) return;
    const w = this._worker;
    this._worker = null;
    this._parseCount = 0;
    w.terminate().catch(() => {});
  }

  private _terminateWorker(): void {
    if (!this._worker) return;
    this._worker.terminate().catch(() => {});
    this._worker = null;
    this._parseCount = 0;
  }

  private _attachHandlers(w: import('worker_threads').Worker): void {
    w.on('message', (msg: WorkerMessage) => {
      if (msg.type === 'parse-result' && msg.id !== undefined) {
        const pending = this._pending.get(msg.id);
        if (pending) {
          clearTimeout(pending.timer);
          this._pending.delete(msg.id);
          pending.resolve(msg.result!);
        }
      }
    });

    w.on('error', (err) => {
      logWarn('Parse worker error', { error: err.message });
      this._rejectAllPending(`Worker error: ${err.message}`);
    });

    w.on('exit', (code) => {
      if (code !== 0 && this._pending.size > 0) {
        logWarn('Parse worker exited unexpectedly', { code });
        this._rejectAllPending(`Worker exited with code ${code}`);
      }
      if (this._worker === w) {
        this._worker = null;
        this._parseCount = 0;
      }
    });
  }

  private _rejectAllPending(reason: string): void {
    for (const [id, pending] of this._pending) {
      clearTimeout(pending.timer);
      this._pending.delete(id);
      pending.reject(new Error(reason));
    }
  }
}
