# Rust Indexing Core Phase 5 Issue #94 Grouped Name Matching And Rowid Cleanup

Date: 2026-06-14

Status: `still unresolved`.

This issue produced useful reduced-fixture evidence, but it did not reduce the
large-target reference-resolution blocker enough to continue into the optional
second-candidate issue. Rust remains opt-in, and this document does not claim
default rollout readiness.

## Change Under Test

- Group unresolved references by `referenceName`, `referenceKind`, and
  `language` for shared direct candidate lookup while preserving per-reference
  disambiguation.
- Carry unresolved-reference `rowid` through reads and delete processed rows by
  row identity instead of the `(fromNodeId, referenceName, referenceKind)` tuple.
- No SQLite schema migration.

## Reduced Fixture Trend

Raw artifacts:

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-before.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-after.raw.json`

| Metric | Before | After | Result |
|---|---:|---:|---|
| Wall time | 293ms | 275ms | lower |
| TypeScript finalization | 129ms | 111ms | lower |
| Reference resolution | 116ms | 99ms | lower |
| `databaseAccessMs` | 92ms | 75ms | lower |
| `nameMatchingMs` | 10ms | 7ms | lower |
| `unresolvedCleanupMs` | 34ms | 16ms | lower |
| Edges created | 9,937 | 9,980 | higher |

The edge-count increase is expected from row identity cleanup: distinct
same-tuple unresolved-reference rows are no longer deleted together.

## Hard-Gate Sufficiency Smoke

Raw artifact:

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-hardgate-sufficiency.raw.json`

The hard-gate smoke ran ZCodeGraph, Excalidraw, and Zustand. The deterministic
tool-surface guardrail reported no regressions. Excalidraw flow prompts stayed
connected on both TypeScript and Rust. ZCodeGraph and Zustand remained in the
existing graph-coverage classification on both engines, with no missing expected
symbols.

## VS Code Sparse Checkout Final Profile

Raw artifact:

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-profile.raw.json`

Target: validated on a large VS Code JS/TS sparse checkout at commit
`275e1b31`, with 11,518 copied JS/TS/config files and 11,291 indexed files.

| Metric | Phase 4 reference profile | #94 after profile |
|---|---:|---:|
| Rust CLI wall time | 237,108ms | 246,196ms |
| Profile wall time | 234,862ms | 236,447ms |
| TypeScript finalization | 108,891ms | 118,521ms |
| Reference resolution | 99,543ms | 109,673ms |
| `databaseAccessMs` | 50,614ms | 47,566ms |
| `nameMatchingMs` | 36,808ms | 49,059ms |
| `dynamicDispatchSynthesisMs` | 8,717ms | 8,341ms |
| Files errored | 46 | 29 |

The large target did not meet the 15% target-sub-bucket reduction bar. The
largest reference-resolution subpath after #94 is `nameMatchingMs`, and
`referenceResolutionMs` remains the dominant finalization subphase.

## VS Code Sparse Checkout Sufficiency Smoke

Raw artifact:

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-sufficiency.raw.json`

Prompt `VS-1` stayed connected for both TypeScript and Rust:

- TypeScript: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Rust: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.

## Classification

Classification: `still unresolved`.

Reason: reduced-fixture evidence is positive and sufficiency did not regress,
but the required large VS Code JS/TS sparse checkout profile still shows
reference resolution as the dominant finalization blocker. The target
sub-buckets did not drop by at least 15% on the large target, so #94 should not
unlock the optional bounded second-candidate issue.

