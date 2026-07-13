# ZJ-0006: Lazy SQLite corruption recovery for MCP daemon

## Status

Accepted

## Context

The MCP daemon holds a long-lived `CodeGraph` instance. When the CLI rebuilds
the database externally (e.g. `zcodegraph index` recreates `zcodegraph.db`),
the daemon's existing SQLite handle becomes stale. The next MCP tool call
fails with errors like `file is not a database` or `SQLITE_CORRUPT`.

This is not actual database corruption — it is a stale-handle mismatch
between two processes sharing the same SQLite file. The data is intact; only
the connection is invalid.

Supporting evidence:

- Issue #679 — MCP SQLite stale connection recovery
- PR #683 — TDD implementation (merged)

## Decision

Use lazy detection: in the MCP tool `execute()` catch block, detect whether
the error matches SQLite corruption signatures (`malformed`, `SQLITE_CORRUPT`,
`file is not a database`). If so, reopen the database connection and retry
the operation once. If the retry also fails, propagate the error normally.

The durable direction is:

- detect corruption-like errors in the catch block, not before every call;
- reopen via `CodeGraph.reopen()` which reuses the existing
  `reopenDatabaseAfterExternalIndex()` logic;
- retry the original operation exactly once;
- if the retry fails, let the error propagate — no silent swallowing.

## Consequences

- MCP tool calls recover transparently from stale-handle mismatches without
  requiring a manual daemon restart.
- Per-call overhead is zero in the common case (no error → no detection cost).
- The single-retry limit prevents infinite loops on persistent corruption.
- `CodeGraph.reopen()` is now a public method, usable by both CLI and MCP
  paths for database reconnection.
- Future improvements could add health metrics or a background heartbeat, but
  those are not required for correctness.

## Alternatives considered

### Proactive integrity_check before every MCP call

Rejected. Running `PRAGMA integrity_check` on every call adds latency to the
common path for a rare event. The stale-handle scenario does not corrupt
data — it invalidates the connection — so integrity checking is the wrong
tool.

### Periodic timer-based reopen

Rejected. A background timer that reopens the connection periodically adds
timing coordination complexity and races with in-flight queries. It also
reopens even when no external rebuild has occurred, wasting resources.

### Propagate error and require manual daemon restart

Rejected. Poor user experience — the agent receives an opaque SQLite error
and must know to restart the daemon. Lazy recovery is strictly better when
the data is intact.
