# Finalization Tail Plan A Candidate Selection

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #416, #417, #418, #419
- Boundary:
  `docs/benchmarks/2026-06-21-edge-write-cleanup-ownership-boundary.md`
- Lifecycle contract:
  `docs/benchmarks/2026-06-21-unresolved-refs-lifecycle-contract.md`

## Selected Candidate

Plan A selects **intentionally-unresolved cleanup rowid-range mechanics**.

The selected candidate changes the batched finalization cleanup helper for
intentionally-unresolved refs so it uses the same rowid-range deletion helper
already used by resolved refs.

This is a finalization-tail mechanics candidate because it only changes how
terminal unresolved-ref rows are deleted after reference resolution has already
classified them as unresolved for this pass.

## Why This Candidate

Rejected first candidates:

- Edge write batching was already covered by
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`.
- Resolved cleanup rowid-range mechanics already exists on the batched resolved
  cleanup path.
- Semantic target selection, framework post-extract migration, and
  dynamic-dispatch migration are out of scope for Plan A.

Selected first candidate:

- intentionally-unresolved cleanup still used direct rowid-list deletion;
- the rowid-range helper already exists, has deterministic DB coverage, and is
  schema-preserving;
- the change is bounded to cleanup mechanics and can be tested without changing
  target ids, edge kinds, confidence, or resolved-by semantics.

## Semantic Boundary

Out of scope:

- whether a reference resolves;
- which target node id is selected;
- edge kind semantics;
- confidence and resolved-by semantics;
- framework post-extract ordering;
- dynamic-dispatch synthesis;
- SQLite schema changes.

The implementation must preserve fallback taxonomy visibility. Unknown,
unsupported, or stale refs must not be deleted by this candidate unless the
existing TypeScript finalization pass already classified them as terminal for
the current batch.

## Baseline Fields

The targeted evidence must record:

- `edgeMaterializationMs`
- `edgeWriteMs`
- `edgeWriteDbMs`
- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`
- `resolvedCleanupMs`
- `resolvedCleanupDbMs`
- `resolvedCleanupRowCount`
- `intentionallyUnresolvedCleanupMs`
- `intentionallyUnresolvedCleanupDbMs`
- `intentionallyUnresolvedCleanupRowCount`
- fallback taxonomy entries
- graphStats or graph-visible parity summary
- RSS or unavailable reason

Historical baseline evidence shows intentionally-unresolved cleanup can be a
visible part of the VS Code sparse finalization tail, for example:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
  recorded `intentionallyUnresolvedCleanupMs: 2345` and
  `intentionallyUnresolvedCleanupRowCount: 155983`.
- `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`
  recorded `intentionallyUnresolvedCleanupMs: 2230` and
  `intentionallyUnresolvedCleanupRowCount: 155983`.

## Gates

`keep`:

- deterministic cleanup contract confirms intentionally-unresolved rowids use
  the rowid-range cleanup helper;
- graphStats and fallback taxonomy remain explainable;
- targeted current-repo and VS Code sparse evidence show the cleanup sub-bucket
  is preserved or trends favorably;
- no semantic target selection behavior changes.

`no-go`:

- the change is safe but profile evidence shows no credible trend and no useful
  simplification;
- cleanup behavior becomes harder to explain than the previous direct rowid
  deletion path.

`needs-architecture`:

- implementation requires schema changes;
- implementation requires target selection changes;
- lifecycle categories cannot be reconstructed safely;
- profile evidence cannot distinguish cleanup movement from unrelated
  finalization work.

