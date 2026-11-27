/**
 * Database Layer
 *
 * Handles SQLite database initialization and connection management.
 */

import { SqliteDatabase, SqliteBackend, SqliteDatabaseFactory, createDatabase } from './sqlite-adapter';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaVersion } from '../types';
import { runMigrations, getCurrentVersion, CURRENT_SCHEMA_VERSION } from './migrations';

export { SqliteDatabase, SqliteBackend } from './sqlite-adapter';

const JAVA_FINALIZATION_KEY = 'java_finalization_state';
const JAVA_FACT_GENERATION_KEY = 'java_fact_generation';
const JAVA_FACT_GENERATION_V1 = 'p0b-java-v1';
const JAVA_FINALIZATION_RUN_KEY = 'java_finalization_run';
const JAVA_FINALIZATION_PASS_KEY = 'java_finalization_pass';
const javaFinalizationTokenBrand: unique symbol = Symbol('javaFinalizationToken');

export type JavaFinalizationToken = {
  readonly [javaFinalizationTokenBrand]: true;
  readonly runId: string;
  readonly passId: string;
};

/** Internal index composition only: this is not a package/public graph API. */
export function issueJavaFinalizationToken(
  runId: string,
  passId: string,
): JavaFinalizationToken {
  return { [javaFinalizationTokenBrand]: true, runId, passId };
}

function readJavaFinalizationMetadata(db: SqliteDatabase): Map<string, string> {
  const rows = db.prepare(
    'SELECT key, value FROM project_metadata WHERE key IN (?, ?, ?, ?)'
  ).all(
    JAVA_FINALIZATION_KEY,
    JAVA_FACT_GENERATION_KEY,
    JAVA_FINALIZATION_RUN_KEY,
    JAVA_FINALIZATION_PASS_KEY,
  ) as Array<{ key: string; value: string }>;
  return new Map(rows.map((row) => [row.key, row.value]));
}

function assertPrivateJavaFinalization(
  db: SqliteDatabase,
  token: JavaFinalizationToken,
): void {
  const values = readJavaFinalizationMetadata(db);
  if (
    values.get(JAVA_FACT_GENERATION_KEY) !== JAVA_FACT_GENERATION_V1 ||
    values.get(JAVA_FINALIZATION_KEY) !== 'required' ||
    values.get(JAVA_FINALIZATION_RUN_KEY) !== token.runId ||
    values.get(JAVA_FINALIZATION_PASS_KEY) !== token.passId
  ) {
    throw new Error(
      'Java finalization requires exact p0b-java-v1 generation, required state, ' +
      'and a run/pass token matching the promoted graph ' +
      `(observed generation=${values.get(JAVA_FACT_GENERATION_KEY) ?? '<missing>'}, ` +
      `state=${values.get(JAVA_FINALIZATION_KEY) ?? '<missing>'}, ` +
      `runMatch=${values.get(JAVA_FINALIZATION_RUN_KEY) === token.runId}, ` +
      `passMatch=${values.get(JAVA_FINALIZATION_PASS_KEY) === token.passId}).`
    );
  }
}

function assertOrdinaryJavaFinalization(db: SqliteDatabase): string | undefined {
  const rows = readJavaFinalizationMetadata(db);
  const state = rows.get(JAVA_FINALIZATION_KEY);
  const generation = rows.get(JAVA_FACT_GENERATION_KEY);
  if (generation !== undefined || state !== undefined) {
    if (generation !== JAVA_FACT_GENERATION_V1) {
      const stateSuffix = state === undefined ? '' : ` (state=${state})`;
      throw new Error(`Java fact generation is missing or invalid${stateSuffix}; a clean full rebuild is required.`);
    }
    if (state === undefined) {
      throw new Error('Java graph finalization state is missing; a clean full rebuild is required.');
    }
  }
  if (state !== undefined && state !== 'complete') {
    throw new Error(
      `Java graph finalization is ${state || 'invalid'}; ` +
      'a clean full rebuild is required before ordinary access.'
    );
  }
  return state;
}

/**
 * Inspect the Java lifecycle marker without creating/configuring/migrating the
 * database. No writable connection is opened for an unfinalized graph.
 */
function guardJavaFinalizationBeforeConfiguration(
  dbPath: string,
  token?: JavaFinalizationToken,
  databaseFactory: SqliteDatabaseFactory = createDatabase,
): boolean {
  const { db } = databaseFactory(dbPath, { readOnly: true, open: false });
  let hasGuardError = false;
  try {
    db.openConnection?.();
    const schemaTable = db.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'schema_versions'"
    ).get() as { present: number } | undefined;
    if (schemaTable) {
      const row = db.prepare(
        'SELECT version FROM schema_versions ORDER BY version DESC LIMIT 2'
      ).all() as Array<{ version: number }>;
      if (row[0]?.version !== CURRENT_SCHEMA_VERSION) {
        throw new Error(
          `Database schema version must be exactly ${CURRENT_SCHEMA_VERSION}; ` +
          'an inconsistent graph requires a clean rebuild.'
        );
      }
    }

    const metadataTable = db.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'project_metadata'"
    ).get() as { present: number } | undefined;
    if (!metadataTable) return false;

    if (token) {
      assertPrivateJavaFinalization(db, token);
      return false;
    }

    return assertOrdinaryJavaFinalization(db) === 'complete';
  } catch (error) {
    hasGuardError = true;
    throw error;
  } finally {
    if (db.open) {
      try {
        db.close();
      } catch (error) {
        // A lifecycle rejection must not be replaced by its read-only cleanup.
        if (!hasGuardError) throw error;
      }
    }
  }
}

/**
 * Apply connection-level PRAGMAs. Shared by `initialize` and `open` so the two
 * paths can't drift.
 *
 * `busy_timeout` is set FIRST, before any pragma that might touch the database
 * file (notably `journal_mode`). If another process holds a write lock at open
 * time, the later pragmas — and the connection's first query — then wait out
 * the lock instead of throwing "database is locked" immediately. See issue #238.
 *
 * The 5s window (was 120s) rides out a normal incremental sync; the old
 * 2-minute wait presented as a frozen, hung agent. With WAL, reads never block
 * on a writer, so this timeout only governs cross-process write contention
 * (e.g. the git-hook `zcodegraph sync` running while the MCP server writes).
 */
function configureConnection(db: SqliteDatabase, options: { wal?: boolean } = {}): void {
  db.pragma('busy_timeout = 5000');      // MUST be first — see above
  db.pragma('foreign_keys = ON');
  // A complete v1 graph has no remaining writer. In particular, do not rewrite
  // a DELETE-mode final marker database merely to reopen its public readers.
  if (options.wal ?? true) db.pragma('journal_mode = WAL'); // node:sqlite supports WAL on every platform
  db.pragma('synchronous = NORMAL');     // safe with WAL mode
  db.pragma('cache_size = -64000');      // 64 MB page cache
  db.pragma('temp_store = MEMORY');      // temp tables in memory
  db.pragma('mmap_size = 268435456');    // 256 MB memory-mapped I/O
}

/**
 * Database connection wrapper with lifecycle management
 */
export class DatabaseConnection {
  private db: SqliteDatabase;
  private dbPath: string;
  private backend: SqliteBackend;
  private javaFinalizationToken?: JavaFinalizationToken;
  /** Internal evaluation sink; production composition leaves it absent. */
  onJavaFinalizationCommit?: (
    receipt: import('./sqlite-adapter').SqliteCommitReceipt & {
      statements: Array<{ state: string; changes: number }>;
    },
  ) => void;

  private constructor(
    db: SqliteDatabase,
    dbPath: string,
    backend: SqliteBackend,
    javaFinalizationToken?: JavaFinalizationToken,
  ) {
    this.db = db;
    this.dbPath = dbPath;
    this.backend = backend;
    this.javaFinalizationToken = javaFinalizationToken;
  }

  /**
   * Initialize a new database at the given path
   */
  static initialize(dbPath: string): DatabaseConnection {
    // Ensure parent directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create and configure database
    const { db, backend } = createDatabase(dbPath);

    configureConnection(db);

    // Run schema initialization
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Record current schema version so migrations aren't re-applied on open
    const currentVersion = getCurrentVersion(db);
    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      db.prepare(
        'INSERT OR IGNORE INTO schema_versions (version, applied_at, description) VALUES (?, ?, ?)'
      ).run(CURRENT_SCHEMA_VERSION, Date.now(), 'Initial schema includes all migrations');
    }

    return new DatabaseConnection(db, dbPath, backend);
  }

  /**
   * Open an existing database
   */
  static open(
    dbPath: string,
    databaseFactory: SqliteDatabaseFactory = createDatabase,
  ): DatabaseConnection {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database not found: ${dbPath}`);
    }

    const completeJavaGraph = guardJavaFinalizationBeforeConfiguration(dbPath, undefined, databaseFactory);

    const { db, backend } = databaseFactory(dbPath);
    try {
      configureConnection(db, { wal: !completeJavaGraph });

      // A complete v1 graph was admitted only with the exact current schema.
      // Reopening its readers must not perform configuration or migration writes.
      if (completeJavaGraph) return new DatabaseConnection(db, dbPath, backend);

      // Check and run migrations if needed
      const conn = new DatabaseConnection(db, dbPath, backend);
      const currentVersion = getCurrentVersion(db);

      if (currentVersion < CURRENT_SCHEMA_VERSION) {
        runMigrations(db, currentVersion);
      }

      return conn;
    } catch (error) {
      try {
        if (db.open) db.close();
      } catch {
        // The reader configuration failure remains the primary error.
      }
      throw error;
    }
  }

  /**
   * Open the one promoted graph owned by this run/pass. The private guard must
   * finish before a writable connection is configured or migration can run.
   */
  static openForJavaFinalization(
    dbPath: string,
    token: JavaFinalizationToken,
    databaseFactory: SqliteDatabaseFactory = createDatabase,
  ): DatabaseConnection {
    guardJavaFinalizationBeforeConfiguration(dbPath, token, databaseFactory);
    const { db, backend } = databaseFactory(dbPath);
    try {
      configureConnection(db);
      return new DatabaseConnection(db, dbPath, backend, token);
    } catch (error) {
      try {
        if (db.open) db.close();
      } catch {
        // The reader configuration failure remains the primary error.
      }
      throw error;
    }
  }

  /** A fresh committed reader; this never becomes the named marker writer. */
  static openForJavaFinalizationVerification(
    dbPath: string,
    token: JavaFinalizationToken,
    databaseFactory: SqliteDatabaseFactory = createDatabase,
  ): DatabaseConnection {
    guardJavaFinalizationBeforeConfiguration(dbPath, token, databaseFactory);
    const { db, backend } = databaseFactory(dbPath, { readOnly: true });
    try {
      configureConnection(db, { wal: false });
      return new DatabaseConnection(db, dbPath, backend, token);
    } catch (error) {
      try {
        if (db.open) db.close();
      } catch {
        // The verifier configuration failure remains the primary error.
      }
      throw error;
    }
  }

  /**
   * Get the underlying database instance
   */
  getDb(): SqliteDatabase {
    if (this.javaFinalizationToken) {
      assertPrivateJavaFinalization(this.db, this.javaFinalizationToken);
    } else {
      assertOrdinaryJavaFinalization(this.db);
    }
    return this.db;
  }

  /** The sole private marker writer commits after all other finalization work. */
  private commitJavaFinalizationState(state: 'complete' | 'failed'): { changes: number } {
    const token = this.javaFinalizationToken;
    if (!token) {
      throw new Error('Java finalization marker writes require a run/pass token.');
    }
    const receipt = this.db.transaction((transactionObserver?: import('./sqlite-adapter').SqliteTransactionObserver) => {
      const result = this.db.prepare(
        'UPDATE project_metadata SET value = ? ' +
        'WHERE key = ? AND value = ? AND EXISTS (' +
        'SELECT 1 FROM project_metadata AS identity_facts ' +
        'WHERE identity_facts.key = ? AND identity_facts.value = ?' +
        ') AND EXISTS (' +
        'SELECT 1 FROM project_metadata AS run_facts ' +
        'WHERE run_facts.key = ? AND run_facts.value = ?' +
        ') AND EXISTS (' +
        'SELECT 1 FROM project_metadata AS pass_facts ' +
        'WHERE pass_facts.key = ? AND pass_facts.value = ?)',
      ).run(
        state, JAVA_FINALIZATION_KEY, 'required',
        JAVA_FACT_GENERATION_KEY, JAVA_FACT_GENERATION_V1,
        JAVA_FINALIZATION_RUN_KEY, token.runId,
        JAVA_FINALIZATION_PASS_KEY, token.passId,
      );
      if (transactionObserver) {
        transactionObserver.observeCommit([{ state, changes: result.changes }], (receipt) => {
          // Internal evaluation evidence only; this is not a public observer API.
          this.onJavaFinalizationCommit?.(receipt);
        });
      }
      return result;
    })();
    if (receipt.changes !== 1) {
      throw new Error(
        'Java finalization marker must change exactly one required row for this run/pass.',
      );
    }
    return { changes: receipt.changes };
  }

  commitJavaFinalizationComplete(): { changes: number } {
    return this.commitJavaFinalizationState('complete');
  }

  commitJavaFinalizationFailed(): { changes: number } {
    return this.commitJavaFinalizationState('failed');
  }

  /**
   * Get the SQLite backend serving this connection. Per-instance so
   * MCP cross-project queries report the right backend even when
   * multiple project DBs are open in the same process.
   */
  getBackend(): SqliteBackend {
    return this.backend;
  }

  /**
   * Get database file path
   */
  getPath(): string {
    return this.dbPath;
  }

  /**
   * The journal mode actually in effect (e.g. 'wal', 'delete').
   *
   * SQLite silently keeps the prior mode if WAL can't be enabled — e.g. on
   * filesystems without shared-memory support (some network/virtualized mounts,
   * WSL2 /mnt), and always on the wasm backend. So the effective mode can differ
   * from what `configureConnection` requested. Surfaced in `zcodegraph status` so
   * a "database is locked" report is triageable: 'wal' ⇒ readers never block on a
   * writer; anything else ⇒ they can. See issue #238.
   */
  getJournalMode(): string {
    const raw = this.db.pragma('journal_mode');
    const row = Array.isArray(raw) ? raw[0] : raw;
    const mode = row && typeof row === 'object'
      ? (row as Record<string, unknown>).journal_mode
      : row;
    return String(mode ?? '').toLowerCase();
  }

  /**
   * Get current schema version
   */
  getSchemaVersion(): SchemaVersion | null {
    const row = this.db
      .prepare('SELECT version, applied_at, description FROM schema_versions ORDER BY version DESC LIMIT 1')
      .get() as { version: number; applied_at: number; description: string | null } | undefined;

    if (!row) return null;

    return {
      version: row.version,
      appliedAt: row.applied_at,
      description: row.description ?? undefined,
    };
  }

  /**
   * Execute a function within a transaction
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Get database file size in bytes
   */
  getSize(): number {
    const stats = fs.statSync(this.dbPath);
    return stats.size;
  }

  /**
   * Optimize database (vacuum and analyze)
   */
  optimize(): void {
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
  }

  /**
   * Lightweight, non-blocking maintenance to run after bulk writes
   * (indexAll, sync). Two operations:
   *
   *   - `PRAGMA optimize` — incremental ANALYZE; SQLite only re-analyzes
   *     tables whose row counts changed materially since the last
   *     ANALYZE. Without it, the query planner has no statistics on the
   *     freshly-bulk-loaded tables and can pick suboptimal indexes.
   *
   *   - `PRAGMA wal_checkpoint(PASSIVE)` — fold pending WAL pages back
   *     into the main database file so the WAL file doesn't grow
   *     unboundedly between automatic checkpoints (auto-fires at 1000
   *     pages by default; large indexAll runs blow past that).
   *
   * Both operations are silently swallowed on failure — they're a
   * best-effort optimization, never load-bearing for correctness.
   */
  runMaintenance(): void {
    try {
      this.db.exec('PRAGMA optimize');
    } catch {
      // ignore
    }
    try {
      this.db.exec('PRAGMA wal_checkpoint(PASSIVE)');
    } catch {
      // ignore (e.g., not in WAL mode)
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Check if the database connection is open
   */
  isOpen(): boolean {
    return this.db.open;
  }
}

/**
 * Default database filename
 */
export const DATABASE_FILENAME = 'zcodegraph.db';

/**
 * Get the default database path for a project
 */
export function getDatabasePath(projectRoot: string): string {
  return path.join(projectRoot, '.zcodegraph', DATABASE_FILENAME);
}
