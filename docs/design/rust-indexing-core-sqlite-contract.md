# Rust Indexing Core SQLite Contract

This document records the Phase 1 Rust indexing core's SQLite write contract.
It belongs to the Rust indexing core vertical slice PRD and phase plan.

## Scope

The Phase 1 Rust path writes the existing `.zcodegraph/zcodegraph.db` schema.
It does not introduce a new schema, database filename, MCP surface, or index
namespace. TypeScript remains responsible for opening the database, status
reporting, MCP tools, graph queries, resolution, synthesizers, and Explore.

## Minimal Metadata Slice

Issue #51 proves the database handoff before semantic extraction exists. The
Rust core currently writes:

- `schema_versions`
  - `version`
  - `applied_at`
  - `description`
- `project_metadata`
  - `indexed_with_engine = rust`
  - `indexed_with_engine_version = <Rust crate version>`
  - `indexed_with_version = <Rust crate version>`
  - `indexed_with_extraction_version = <current extraction version>`

The Rust core creates all tables, indexes, triggers, and virtual tables from the
same schema text used by TypeScript, then stamps the current schema version so
`CodeGraph.open()` does not re-run migrations against already-present columns.

## Tables Reserved For Later Phase 1 Slices

The Rust database contains these existing tables, but issue #51 intentionally
leaves them empty:

- `files`
- `nodes`
- `edges`
- `unresolved_refs`
- `nodes_fts`

Issues #52-#56 fill these tables incrementally. Until then, a Rust-produced
index is valid and inspectable, but it has zero files, nodes, and edges.

## Failure Safety

Rust writes to a temporary database path next to the active index and only moves
it into place after schema and metadata writes succeed. If the Rust process
fails before replacement, the previous active index remains untouched.

Rust uses the existing `.zcodegraph/zcodegraph.lock` project write lock so the
TypeScript and Rust indexers do not write concurrently.
