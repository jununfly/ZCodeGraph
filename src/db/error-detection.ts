/**
 * SQLite corruption error detection
 *
 * Used by {@link ToolHandler.execute} to detect stale-connection errors
 * after CLI `zcodegraph index` rebuilds the database file out from under
 * the MCP server's long-lived CodeGraph instance. When such an error is
 * detected, the handler can reopen the connection and retry the tool call.
 */

/**
 * Error message substrings that indicate SQLite database corruption or
 * a stale file handle — the DB file was replaced/rebuilt while the
 * connection was still open.
 *
 * Sources:
 * - `database disk image is malformed` — SQLite SQLITE_CORRUPT
 * - `file is not a database` — SQLite SQLITE_NOTADB
 * - `SQLITE_CORRUPT` — raw SQLite error code name (some Node bindings)
 */
const CORRUPTION_PATTERNS: readonly string[] = [
  'database disk image is malformed',
  'file is not a database',
  'SQLITE_CORRUPT',
];

/**
 * Returns `true` when the given error looks like a SQLite corruption or
 * stale-handle error — the kind that happens when `zcodegraph index`
 * rebuilds the `.codegraph/codegraph.db` file while the MCP server's
 * `CodeGraph` instance still holds the old connection.
 *
 * @param err — any caught error (may be non-Error)
 */
export function isSqliteCorruptionError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return CORRUPTION_PATTERNS.some((p) => msg.includes(p.toLowerCase()));
  }
  const str = String(err ?? '').toLowerCase();
  return CORRUPTION_PATTERNS.some((p) => str.includes(p.toLowerCase()));
}
