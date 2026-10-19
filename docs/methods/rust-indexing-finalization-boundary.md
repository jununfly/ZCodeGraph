# Rust Indexing Finalization Boundary

## Scope

Phase 20 completes Rust indexing data production end-to-end while keeping the TypeScript product shell. This boundary document defines the migration contract between Rust-owned indexing work and TypeScript-owned product integration.

This is not a default rollout plan and not a performance optimization gate.

## Product Shell Boundary

TypeScript remains responsible for:

- CLI entry and engine selection,
- MCP server and tools,
- Explore planning and rendering,
- installer and release integration,
- reading and validating the active index.

Rust owns the indexing data-production chain as it is migrated:

- source scan,
- parse and extraction,
- graph write,
- finalization and reference-resolution slices,
- index metadata,
- failure-safe active-index production.

## Profile Contract

Rust indexing profile artifacts expose a `finalize.boundaryProtocol` object:

```json
{
  "version": 1,
  "productShell": "typescript",
  "rustOwnedStages": ["source-scan", "parse-extraction", "graph-write"]
}
```

`rustOwnedStages` is the public migration seam. New Rust-owned finalization slices must add a stable stage name here after the observable behavior is covered by parity evidence.

Artifacts also expose `finalize.fallbackTaxonomy`:

```json
{
  "totalFallbacks": 1,
  "entries": [
    {
      "stage": "reference-resolution",
      "classification": "known-unsupported",
      "reason": "typescript-finalization-not-yet-migrated",
      "count": 1
    }
  ]
}
```

Fallback entries are required while TypeScript still owns a Phase 20 in-scope finalization stage. Silent fallback is not allowed.

## Difference Taxonomy

Semantic differences must be classified before acceptance:

- `parity-bug`: Rust behavior differs from TypeScript and should be fixed.
- `intentional-improvement-candidate`: Rust exposes a better behavior, but it requires explicit decision before adoption.
- `known-unsupported`: behavior is not yet migrated and must remain visible in fallback taxonomy.

## Validation Contract

A Phase 20 validation artifact must record:

- boundary protocol version,
- Rust-owned stages,
- fallback taxonomy,
- graphStats,
- active-index readability through the TypeScript shell / MCP-compatible path,
- Agent Sufficiency,
- wall time,
- peak RSS or unavailable reason.

No MCP/Explore output change is required for Phase 20. The current product shell should read Rust-produced indexes through existing public paths.
