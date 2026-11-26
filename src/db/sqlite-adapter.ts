/**
 * SQLite Adapter
 *
 * Thin wrapper over Node's built-in `node:sqlite` (`DatabaseSync`), exposed
 * through a small better-sqlite3-shaped interface so the rest of the codebase
 * is storage-agnostic.
 *
 * CodeGraph ships with a bundled Node runtime, so `node:sqlite` (real SQLite,
 * with WAL + FTS5) is always available — there is no native build step and no
 * wasm fallback. When run from source instead, it requires Node >= 22.5.
 */

export interface SqliteStatement {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
  /**
   * Lazily yield result rows one at a time instead of materializing the whole
   * set with `all()`. Use for unbounded scans (e.g. every function/method node)
   * so memory stays O(1) in the row count rather than O(rows) — see #610, where
   * `all()`-ing every symbol on a dense project spiked the heap into an OOM.
   */
  iterate(...params: any[]): IterableIterator<any>;
}

export interface SqliteCommitIdentity {
  connectionId: string;
  runId: string;
  passId: string;
}

export interface SqliteCommitReceipt extends SqliteCommitIdentity {
  commitOrdinal: number;
}

/** Private evaluation handoff; this is not a package/public protocol. */
export interface SqliteTransactionObserver {
  observeCommit<T>(
    statements: T[],
    onCommitted: (receipt: SqliteCommitReceipt & { statements: T[] }) => void,
  ): void;
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  pragma(str: string, options?: { simple?: boolean }): any;
  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T;
  close(): void;
  /** Guard-only operation; ordinary adapters need not expose deferred opens. */
  openConnection?(): void;
  readonly open: boolean;
}

/**
 * The active SQLite backend. Only one now (`node:sqlite`); kept as a named type
 * so `zcodegraph status` and the per-instance reporting have a stable shape.
 */
export type SqliteBackend = 'node-sqlite';

/** Internal evaluation composition only; production uses the default factory. */
export type SqliteDatabaseFactory = (
  dbPath: string,
  options?: SqliteAdapterOptions,
) => { db: SqliteDatabase; backend: SqliteBackend };

/**
 * Wraps Node's built-in `node:sqlite` (`DatabaseSync`) to match the
 * better-sqlite3 interface the rest of the code expects.
 *
 * node:sqlite is real SQLite compiled into Node, so it supports WAL, FTS5,
 * mmap, and `@named` params natively — the only shims needed are the
 * better-sqlite3 conveniences node:sqlite omits: a `.pragma()` helper, a
 * `.transaction()` helper, and `open` (node:sqlite exposes `isOpen`).
 */
/**
 * Construction options for the node:sqlite adapter.
 *
 * `allowExtension` gates `DatabaseSync`'s extension-loading capability
 * (`db.loadExtension(...)`). It defaults to `false` so a stray `loadExtension`
 * call in un-privileged code paths fails closed; opt in only on paths that
 * need to load a vetted extension binary (e.g. sqlite-vec's `vec0` for the
 * P2 optional local hybrid semantic retrieval spike — see
 * docs/decisions/ZJ-0009-async-embedding-pipeline.md). Callers that enable
 * this MUST re-disable via `db.enableLoadExtension(false)` immediately after
 * loading the intended extension to shrink the attack surface.
 */
export interface SqliteAdapterOptions {
  allowExtension?: boolean;
  /** Internal lifecycle guard only: never create or mutate a database. */
  readOnly?: boolean;
  open?: boolean;
  /** Internal evaluation observation only; absent in production composition. */
  onExec?: (sql: string) => void;
  observation?: SqliteCommitIdentity;
}

class NodeSqliteAdapter implements SqliteDatabase {
  private _db: any;
  private onExec?: (sql: string) => void;
  private observation?: SqliteCommitIdentity;
  private transactionDepth = 0;
  private edgeCommitOrdinal = 0;
  private pendingCommit?: {
    statements: unknown[];
    onCommitted: (
      receipt: SqliteCommitReceipt & { statements: unknown[] },
    ) => void;
  };

  constructor(dbPath: string, options: SqliteAdapterOptions = {}) {
    this.onExec = options.onExec;
    this.observation = options.observation;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    // node:sqlite (Node 22.13+) gates extension loading behind the
    // `allowExtension` constructor flag; pass it through verbatim. When the
    // flag is omitted we rely on node:sqlite's default (disabled).
    this._db = new DatabaseSync(dbPath, {
      allowExtension: options.allowExtension ?? false,
      readOnly: options.readOnly ?? false,
      open: options.open ?? true,
    });
  }

  get open(): boolean {
    return this._db.isOpen;
  }

  openConnection(): void {
    this._db.open();
  }

  prepare(sql: string): SqliteStatement {
    // node:sqlite matches better-sqlite3's calling convention (variadic
    // positional args, or a single object for @named params), so params forward
    // through unchanged.
    const stmt = this._db.prepare(sql);
    return {
      run(...params: any[]) {
        const r = stmt.run(...params);
        return {
          changes: Number(r?.changes ?? 0),
          lastInsertRowid: r?.lastInsertRowid ?? 0,
        };
      },
      get(...params: any[]) {
        return stmt.get(...params);
      },
      all(...params: any[]) {
        return stmt.all(...params);
      },
      iterate(...params: any[]) {
        return stmt.iterate(...params);
      },
    };
  }

  exec(sql: string): void {
    this.onExec?.(sql);
    this._db.exec(sql);
  }

  pragma(str: string, options?: { simple?: boolean }): any {
    const trimmed = str.trim();
    // Write pragma ("key = value"): node:sqlite is real SQLite, so every pragma
    // (WAL, mmap, synchronous, …) applies as-is.
    if (trimmed.includes('=')) {
      this._db.exec(`PRAGMA ${trimmed}`);
      return;
    }
    // Read pragma. Default: the row object (e.g. { journal_mode: 'wal' }).
    // `{ simple: true }` returns just the single column value, like better-sqlite3.
    const row = this._db.prepare(`PRAGMA ${trimmed}`).get();
    if (options?.simple) {
      return row && typeof row === 'object' ? Object.values(row)[0] : row;
    }
    return row;
  }

  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return (...args: any[]) => {
      const outermost = this.transactionDepth === 0;
      let pending: NodeSqliteAdapter['pendingCommit'];
      let transactionObserver: SqliteTransactionObserver | undefined;
      if (this.observation) {
        if (outermost) {
          pending = undefined;
        }
        // Nested helpers may run before their outer transaction registers a
        // receipt; observeCommit enforces the one-batch owner when invoked.
        transactionObserver = {
          observeCommit: (statements, onCommitted) => {
            if (pending || (!outermost && this.pendingCommit)) {
              throw new Error('A transaction may own only one observed edge-write batch.');
            }
            const committed = onCommitted as (
              receipt: SqliteCommitReceipt & { statements: unknown[] },
            ) => void;
            if (outermost) {
              pending = { statements, onCommitted: committed };
            } else {
              this.pendingCommit = { statements, onCommitted: committed };
            }
          },
        };
      }
      this.transactionDepth++;
      if (outermost) this.exec('BEGIN');
      try {
        let result: T;
        try {
          result = transactionObserver
            ? fn(...args, transactionObserver)
            : fn(...args);
          if (outermost) {
            this.pendingCommit = pending;
            this.exec('COMMIT');
            pending = undefined;
          }
        } catch (error) {
          this.pendingCommit = undefined;
          if (outermost) {
            try {
              this.exec('ROLLBACK');
            } catch {
              // The transaction or COMMIT failure remains the primary error.
            }
          }
          throw error;
        } finally {
          this.transactionDepth--;
        }
        const committed = this.pendingCommit;
        this.pendingCommit = undefined;
        if (committed) {
          if (!this.observation) {
            throw new Error('Observed Java edge writes have no connection identity.');
          }
          const { statements, ...commitReceipt } = {
            ...this.observation,
            commitOrdinal: ++this.edgeCommitOrdinal,
            statements: committed.statements,
          };
          committed.onCommitted({ ...commitReceipt, statements });
        }
        return result;
      } catch (error) {
        this.transactionDepth = 0;
        this.pendingCommit = undefined;
        throw error;
      }
    };
  }

  close(): void {
    // node:sqlite's DatabaseSync.close() throws if already closed; make it
    // idempotent to match better-sqlite3 (callers may close more than once).
    if (this._db.isOpen) this._db.close();
  }
}

/**
 * Create a database connection backed by `node:sqlite`.
 *
 * Returns the active backend alongside the db so each `DatabaseConnection` can
 * report it per-instance — MCP can open multiple project DBs in one process, so
 * a process-global would race.
 */
export function createDatabase(
  dbPath: string,
  options: SqliteAdapterOptions = {},
): { db: SqliteDatabase; backend: SqliteBackend } {
  try {
    return { db: new NodeSqliteAdapter(dbPath, options), backend: 'node-sqlite' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Failed to open SQLite via the built-in node:sqlite module.\n' +
      'CodeGraph requires node:sqlite (Node.js 22.5+). Install the self-contained\n' +
      'CodeGraph release (it bundles a compatible Node), or run on Node 22.5+.\n' +
      `Underlying error: ${msg}`
    );
  }
}
