# Rust Indexing Core Phase 22/23 Evidence Pipeline Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 22 and Phase 23 durable decisions remain in:

- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`

Generated comparison output, generated decision drafts, experiment manifests,
raw artifacts, summaries, and temporary inventory files can be deleted after
this cleanup because their reusable facts are already captured by the durable
decision artifacts above.

## Consolidated Facts

Phase 22 established the local evidence pipeline and used it for one bounded
optimization candidate:

- the evidence tool is local-only and has no GitHub/network side effects;
- candidate ranking selected `localExactReferenceResolutionMs` after excluding
  #208 candidate replay, #209 edge-write-only, and #211 FTS-trigger bulk write;
- the local exact candidate preserved sufficiency and Rust graphStats on the
  clean external corpora;
- the target bucket improved on ZCodeGraph, Excalidraw, and VS Code sparse;
- the broader required performance gate remained unmet.

Phase 23 cleaned the evidence contract rather than changing runtime behavior:

- comparison output records target status, sufficiency, graphStats parity, RSS
  or unavailable reason, Rust-owned profile buckets, and rollout disclaimer;
- recent performance paths were classified as production path, retained
  diagnostic, or dead candidate;
- default indexing behavior, SQLite schema, MCP behavior, installer, packaging,
  release, status, and npm smoke paths were unchanged;
- the next recommended #165 step was one diagnostic/profiling issue for
  `parseExtractionMs`.

## Deleted Process Artifact Classes

This cleanup deletes:

- generated Phase 22 comparison files;
- generated Phase 22 decision drafts;
- generated Phase 22 local-exact manifest/raw/summary files;
- generated Phase 23 targeted smoke comparison and draft files;
- the Phase 23 temporary experiment inventory.

## Cleanup Boundary

This cleanup does not delete the durable Phase 22/23 decision documents or the
Phase 22/23 plans. It only removes generated process artifacts whose reusable
facts are preserved in the durable decisions and summarized here.
