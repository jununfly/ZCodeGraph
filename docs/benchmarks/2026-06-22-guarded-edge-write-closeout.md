# Guarded Edge-Write Closeout

Date: 2026-06-22

Issue: #445

Roadmap node: `3-13. guarded edge-write slice`

## Decision

Completed for Rust-native TypeScript moduleResolution file-level import edges.

This slice adds a centralized guard before writing file-level `imports` edges
from Rust finalization. The guard is deliberately scoped to moduleResolution
file targets:

- relative imports
- tsconfig `paths`
- conventional aliases
- workspace package imports
- `rootDirs`
- package self-name / package exports
- package imports `#...`

The runtime guard uses Rust-owned taxonomy and target checks only. It does not
depend on the TypeScript compiler oracle or any external parity artifact.

## Behavior

For each moduleResolution file-level target decision, the guard records:

- attempted edge-write decisions
- written edge-write decisions
- skipped edge-write decisions
- skipped reasons

Weak/no-go decisions skip only that edge and continue indexing. They do not
fail the full index.

Currently exposed profile fields:

- `moduleResolutionGuardedEdgeWriteAttemptedRefs`
- `moduleResolutionGuardedEdgeWriteWrittenRefs`
- `moduleResolutionGuardedEdgeWriteSkippedRefs`
- `moduleResolutionGuardedEdgeWriteSkippedCounts`

These are public diagnostic fields in profile artifacts, but they are narrow
diagnostics rather than a long-term stable API commitment.

## Evidence

Deterministic Rust fixture:

- `rust_guarded_file_import_edge_writes_record_write_and_skip_decisions`

The fixture covers:

- successful file-level import edge write
- missing target skip
- file-node-not-found skip
- continued indexing after skipped edges
- public profile diagnostics

Current-repo smoke artifacts:

- `docs/benchmarks/2026-06-22-guarded-edge-write-current.profile.json`
- `docs/benchmarks/2026-06-22-guarded-edge-write-current-oracle.json`
- `docs/benchmarks/2026-06-22-guarded-edge-write-current-oracle.md`

Current-repo profile summary:

- `moduleResolutionGuardedEdgeWriteAttemptedRefs`: 663
- `moduleResolutionGuardedEdgeWriteWrittenRefs`: 662
- `moduleResolutionGuardedEdgeWriteSkippedRefs`: 1
- `moduleResolutionGuardedEdgeWriteSkippedCounts`: `{ "file-node-not-found": 1 }`

Current-repo oracle summary:

- Rows inspected: 336
- Parity statuses: 336 `match`

## Roadmap Update

- `1-7-1. file-level imports edges`: complete
- `3-13. guarded edge-write slice`: complete
- `1-7. Guarded graph writing`: still partial
- `1-7-4. rollback/no-go when parity is weak`: still partial

## Non-Goals

This does not guard every Rust finalization edge type. Explicitly out of scope:

- ESM named symbol edges
- one-hop re-export edges
- local exact callable refs
- all-purpose finalization-edge policy platform
- production dependency on TypeScript compiler oracle parity
- full-index fail-fast on individual moduleResolution no-go decisions
