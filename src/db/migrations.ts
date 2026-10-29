/**
 * Database Migrations
 *
 * Schema versioning and migration support.
 */

import { SqliteDatabase } from './sqlite-adapter';

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 7;

/**
 * Migration definition
 */
interface Migration {
  version: number;
  description: string;
  up: (db: SqliteDatabase) => void;
}

/**
 * All migrations in order
 *
 * Note: Version 1 is the initial schema, handled by schema.sql
 * Future migrations go here.
 */
const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add project metadata, edge origin tracking, and unresolved ref context',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        ALTER TABLE unresolved_refs ADD COLUMN file_path TEXT NOT NULL DEFAULT '';
        ALTER TABLE unresolved_refs ADD COLUMN language TEXT NOT NULL DEFAULT 'unknown';
        ALTER TABLE edges ADD COLUMN edgeOrigin TEXT DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_unresolved_file_path ON unresolved_refs(file_path);
        CREATE INDEX IF NOT EXISTS idx_edges_edgeOrigin ON edges(edgeOrigin);
      `);
    },
  },
  {
    version: 3,
    description: 'Add lower(name) expression index for memory-efficient case-insensitive lookups',
    up: (db) => {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_nodes_lower_name ON nodes(lower(name));
      `);
    },
  },
  {
    version: 4,
    description:
      'Drop redundant idx_edges_source / idx_edges_target (covered by source_kind / target_kind composites)',
    up: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_edges_source;
        DROP INDEX IF EXISTS idx_edges_target;
      `);
    },
  },
  {
    version: 5,
    description:
      'Add bean NodeKind and injects EdgeKind for Spring DI semantics (roadmap 1-3-3). ' +
      'Old-CLI compat: read-only compatible — older binaries can open a v5 database and read all ' +
      'pre-existing nodes/edges; new bean/injects rows are silently ignored (they simply do not ' +
      'match any query filter from an older binary). No new columns or indexes; only new enum ' +
      'values in existing TEXT columns.',
    up: (_db) => {
      // No DDL changes required — bean/injects are new enum values in existing
      // TEXT columns (nodes.kind, edges.kind). The migration exists solely to
      // bump the schema version and record the compat strategy per
      // schema-evolution-and-mcp-tool-cap-v1 clause 1.
    },
  },
  {
    version: 6,
    description:
      'Add embedding_queue table for the P2 async embedding pipeline (roadmap 1-4-28, ADR-0009 D5). ' +
      'Old-CLI compat: read-only compatible — older binaries open a v6 database and read all ' +
      'pre-existing nodes/edges; embedding_queue rows are ignored (no query in the older binary ' +
      'references the table). New binaries lazily create the vec_embeddings vec0 virtual table at ' +
      'worker startup (NOT in this migration) so that binaries without sqlite-vec can still open ' +
      'the database. vec_embeddings is therefore intentionally absent from schema.sql — its ' +
      'presence is gated on the vec0 extension being loadable.',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS embedding_queue (
          file_path TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending','in_progress','done','failed'))
               NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          model_version TEXT,
          enqueued_at INTEGER NOT NULL,
          started_at INTEGER,
          finished_at INTEGER,
          PRIMARY KEY (file_path, content_hash)
        );
        CREATE INDEX IF NOT EXISTS idx_embedding_queue_status_started
          ON embedding_queue(status, started_at);
        CREATE INDEX IF NOT EXISTS idx_embedding_queue_enqueued
          ON embedding_queue(enqueued_at);
      `);
    },
  },
  {
    version: 7,
    description:
      'Add durable owner and heartbeat leases to embedding_queue so watchdog recovery ' +
      'cannot steal a live worker batch. Existing rows use started_at as their initial heartbeat.',
    up: (db) => {
      db.exec(`
        ALTER TABLE embedding_queue ADD COLUMN worker_id TEXT;
        ALTER TABLE embedding_queue ADD COLUMN heartbeat_at INTEGER;
        UPDATE embedding_queue SET heartbeat_at = started_at
          WHERE status = 'in_progress' AND heartbeat_at IS NULL;
      `);
    },
  },
];
export function getCurrentVersion(db: SqliteDatabase): number {
  try {
    const row = db
      .prepare('SELECT MAX(version) as version FROM schema_versions')
      .get() as { version: number | null } | undefined;
    return row?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Record a migration as applied
 */
function recordMigration(db: SqliteDatabase, version: number, description: string): void {
  db.prepare(
    'INSERT INTO schema_versions (version, applied_at, description) VALUES (?, ?, ?)'
  ).run(version, Date.now(), description);
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: SqliteDatabase, fromVersion: number): void {
  const pending = migrations.filter((m) => m.version > fromVersion);

  if (pending.length === 0) {
    return;
  }

  // Sort by version
  pending.sort((a, b) => a.version - b.version);

  // Run each migration in a transaction
  for (const migration of pending) {
    db.transaction(() => {
      migration.up(db);
      recordMigration(db, migration.version, migration.description);
    })();
  }
}

/**
 * Check if the database needs migration
 */
export function needsMigration(db: SqliteDatabase): boolean {
  const current = getCurrentVersion(db);
  return current < CURRENT_SCHEMA_VERSION;
}

/**
 * Get list of pending migrations
 */
export function getPendingMigrations(db: SqliteDatabase): Migration[] {
  const current = getCurrentVersion(db);
  return migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);
}

/**
 * Get migration history from database
 */
export function getMigrationHistory(
  db: SqliteDatabase
): Array<{ version: number; appliedAt: number; description: string | null }> {
  const rows = db
    .prepare('SELECT version, applied_at, description FROM schema_versions ORDER BY version')
    .all() as Array<{ version: number; applied_at: number; description: string | null }>;

  return rows.map((row) => ({
    version: row.version,
    appliedAt: row.applied_at,
    description: row.description,
  }));
}
