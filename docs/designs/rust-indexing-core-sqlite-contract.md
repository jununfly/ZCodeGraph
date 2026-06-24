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

## JavaScript File Slice

Issue #52 adds the first semantic write path. For `.js` files, the Rust core
now writes:

- `files`
  - `path`
  - `content_hash`
  - `language = javascript`
  - `size`
  - `modified_at`
  - `indexed_at`
  - `node_count`
  - `errors`
- `nodes`
  - `file` nodes for indexed JavaScript files
  - `function` nodes for `function_declaration`
  - `class` nodes for `class_declaration`
  - stable IDs generated from `filePath:kind:name:line`, matching the
    TypeScript ID contract
  - one-indexed line ranges and zero-indexed columns for TypeScript readers
- `edges`
  - `contains` edges from the file node to extracted function/class nodes

The parser is native Rust tree-sitter JavaScript. It does not use Node,
`web-tree-sitter`, or WebAssembly.

## TypeScript, JSX, And TSX Slice

Issue #53 expands the same file/node/contains-edge contract to `.ts`, `.jsx`,
and `.tsx`.

The Rust core now writes:

- `files`
  - `language = typescript` for `.ts`
  - `language = jsx` for `.jsx`
  - `language = tsx` for `.tsx`
- `nodes`
  - `file` nodes for each indexed source file
  - `function` nodes for function declarations
  - `class` nodes for class declarations
  - `method` nodes for method definitions
  - `field` nodes for supported field declarations
  - `interface` nodes for TypeScript interfaces
  - `type_alias` nodes for TypeScript type aliases
  - `constant` / `variable` nodes for variable declarations
  - `component` nodes for PascalCase JSX/TSX function, class, and variable
    declarations
  - `import` / `export` nodes for module source declarations
- `edges`
  - `contains` edges from file nodes to extracted symbol nodes
- `unresolved_refs`
  - `imports` references for import module sources
  - `exports` references for re-export module sources
  - `calls` references for local call expressions
  - `instantiates` references for constructor calls
  - `references` references for PascalCase JSX/TSX component usages

The parser is native Rust tree-sitter JavaScript / TypeScript / TSX. It does
not use Node, `web-tree-sitter`, or WebAssembly.

The JS/TS Phase 1 slice does not add `module` nodes. The existing TypeScript
JS/TS extractor does not emit ES module nodes, so preserving reader expectations
means recording file nodes plus import/export nodes and references instead.

`nodes_fts` is populated by the existing SQLite triggers when Rust inserts
nodes, so Rust does not write that virtual table directly.

After a Rust extraction run, the TypeScript CLI reopens the same index and runs
the existing post-extract framework finalization, batched reference resolution,
and dynamic-dispatch synthesizers. The index remains marked as Rust-built; the
TypeScript pass only completes graph edges and maintenance.

Issues #55-#56 extend this output with semantic parity comparison and CLI/MCP
integration coverage.

## Failure Safety

Rust writes to a temporary database path next to the active index and only moves
it into place after schema and metadata writes succeed. If the Rust process
fails before replacement, the previous active index remains untouched.

Rust uses the existing `.zcodegraph/zcodegraph.lock` project write lock so the
TypeScript and Rust indexers do not write concurrently.
