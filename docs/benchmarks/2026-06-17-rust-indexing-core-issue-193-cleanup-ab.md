# Rust Indexing Core Issue 193 Cleanup A/B

## Scope

Issue #193 selected one bounded A/B candidate for the full-profile TypeScript finalization/reference-resolution bottleneck after Phase 20 closed the opt-in Rust indexing data-production baseline.

Candidate: merge batched `unresolved_refs` cleanup for resolved and intentionally-unresolved references into one deletion pass per batch.

This candidate:

- does not change the persistent SQLite schema,
- does not change per-reference disambiguation semantics,
- does not change resolver, matcher, framework, or dynamic-dispatch selection,
- only changes how already-processed unresolved references are deleted after a batch is resolved.

## Artifacts

Generated manifests, raw experiment output, and generated summaries were absorbed into:

- `docs/benchmarks/2026-06-23-rust-indexing-core-issue-optimization-evidence-cleanup.md`

Validation commands:

- `npm run build`
- `npx vitest run __tests__/resolution.test.ts`
- Reduced and required target experiment commands are represented by the consolidated cleanup artifact above.

## Segment Evidence

| Target | Arm | Rust total ms | Rust RSS | Reference resolution ms | DB access ms | Cleanup ms | Edge write ms | Sufficiency |
|---|---|---:|---:|---:|---:|---:|---:|---|
| phase18-reduced | before | 1928 | 50921472 | 14 | 9 | 3 | 0 | passed |
| phase18-reduced | after | 1919 | 51003392 | 16 | 9 | 4 | 0 | passed |
| zcodegraph | before | 7622 | 52674560 | 367 | 230 | 131 | 67 | passed |
| zcodegraph | after | 7620 | 52543488 | 343 | 207 | 115 | 59 | passed |
| excalidraw | before | 4691 | 52756480 | 239 | 93 | 54 | 21 | passed |
| excalidraw | after | 4694 | 52625408 | 228 | 87 | 40 | 27 | passed |

## GraphStats

| Target | Arm | Files | Nodes | Edges |
|---|---|---:|---:|---:|
| phase18-reduced | before | 120 | 12360 | 12480 |
| phase18-reduced | after | 120 | 12360 | 12480 |
| zcodegraph | before | 290 | 14283 | 30075 |
| zcodegraph | after | 290 | 14283 | 30074 |
| excalidraw | before | 34 | 6352 | 11537 |
| excalidraw | after | 34 | 6352 | 11537 |

The reduced fixture and Excalidraw graphStats stayed stable. ZCodeGraph differed by one Rust edge in a dirty self-indexing run; sufficiency still passed and the candidate does not change edge selection logic.

## Interpretation

Reduced fixture evidence is too small to be meaningful for this candidate: cleanup was 3 ms before and 4 ms after.

Required-target evidence supports keeping the candidate:

- ZCodeGraph cleanup improved from 131 ms to 115 ms.
- ZCodeGraph database access improved from 230 ms to 207 ms.
- ZCodeGraph reference resolution improved from 367 ms to 343 ms.
- Excalidraw cleanup improved from 54 ms to 40 ms.
- Excalidraw database access improved from 93 ms to 87 ms.
- Excalidraw reference resolution improved from 239 ms to 228 ms.
- RSS was recorded and did not materially regress.
- Sufficiency passed for both required targets.

The improvement is intentionally modest. It does not address the larger VS Code sparse profile where name matching, edge writes, cleanup, and broad database access dominate the finalization path.

## PRD Gate State

The post-PRD optimization gate remains failed. This candidate improves the intended cleanup segment on required targets but does not make Rust at least 25% faster than TypeScript or at least 30% lower peak RSS with the other metric not significantly worse.

## Decision

Keep the cleanup batching candidate. It is bounded, preserves resolver semantics, preserves the SQLite schema, and improves the intended segment on required targets.

Do not expand #193 into name-matching optimization in the same issue. Name matching remains the largest measured VS Code sparse subsegment, but it directly touches disambiguation semantics and should be handled by a separate diagnostic/design issue if pursued.

No Rust default rollout readiness is claimed.
