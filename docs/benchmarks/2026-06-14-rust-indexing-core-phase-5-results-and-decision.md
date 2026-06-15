# Rust Indexing Core Phase 5 Results And Decision

Date: 2026-06-14

Classification: `still unresolved`.

Branch A/default rollout remains blocked. Rust remains opt-in for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows.

Phase 5 was a targeted blocker-reduction phase for the remaining Rust indexing
core blocker: TypeScript finalization, specifically `referenceResolutionMs`.
It did not try to make Rust the default engine, and it did not claim validation
on full VS Code. The large-target evidence below is validated on a large VS Code
JS/TS sparse checkout.

## Decision

Do not proceed to a Rust default-rollout plan.

The #94 implementation preserved sufficiency and produced a useful reduced
fixture improvement, but the final large-target profile did not reduce the
reference-resolution blocker enough. `referenceResolutionMs` remains the
dominant TypeScript finalization subphase on the VS Code sparse checkout, and
the largest remaining subpath is now `nameMatchingMs`.

The optional second candidate was skipped because #94 classified as
`still unresolved`, not `reduced but still blocking`.

## Raw Artifacts

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-before.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-after.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-hardgate-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md`

## Reduced Fixture Evidence

The reduced fixture showed that grouped direct candidate lookup and rowid cleanup
can improve the intended local pressure points.

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

## Hard-Gate Repo Smoke

The hard-gate sufficiency smoke ran on ZCodeGraph, Excalidraw, and Zustand.
The deterministic tool-surface guardrail reported no regressions.

- Excalidraw flow prompts stayed connected on both TypeScript and Rust.
- ZCodeGraph and Zustand remained in the existing graph-coverage
  classification on both engines, with no missing expected symbols.

## VS Code Sparse Checkout Profile

Target: validated on a large VS Code JS/TS sparse checkout at commit
`275e1b31`, with 11,518 copied JS/TS/config files and 11,291 indexed files.

| Metric | Phase 4 reference profile | Phase 5 final profile |
|---|---:|---:|
| TypeScript engine wall time | 215,267ms | 230,262ms |
| Rust engine wall time | 237,108ms | 246,196ms |
| Profile wall time | 234,862ms | 236,447ms |
| TypeScript finalization | 108,891ms | 118,521ms |
| Reference resolution | 99,543ms | 109,673ms |
| `databaseAccessMs` | 50,614ms | 47,566ms |
| `nameMatchingMs` | 36,808ms | 49,059ms |
| `dynamicDispatchSynthesisMs` | 8,717ms | 8,341ms |
| Files errored | 46 | 29 |

The final profile does not meet the 15% target-sub-bucket reduction bar.
`referenceResolutionMs` remains the dominant finalization subphase, and
`nameMatchingMs` is now the dominant reference-resolution subpath.

Important final reference-resolution sub-buckets:

| Sub-bucket | Phase 5 final profile |
|---|---:|
| `nameMatchingMs` | 49,059ms |
| `databaseAccessMs` | 47,566ms |
| `perReferenceDisambiguationMs` | 45,211ms |
| `edgeWriteMs` | 24,262ms |
| `unresolvedCleanupMs` | 20,145ms |
| `importResolutionMs` | 9,087ms |
| `candidateLookupMs` | 5,813ms |
| `sharedCandidateLookupMs` | 1,974ms |
| `unresolvedReadMs` | 1,656ms |

## VS Code Sparse Checkout Sufficiency Smoke

Prompt `VS-1` stayed connected for both TypeScript and Rust:

- TypeScript: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Rust: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.

Sufficiency stayed green, so the stop decision is performance-based rather than
a graph semantics or tool-surface regression.

## Interpretation

Phase 5 produced trustworthy negative evidence. The local reduced fixture
improved, but the same strategy did not move the large target enough to support
continuing toward default rollout.

The remaining blocker is not Rust parse extraction. The next bottleneck is
name matching policy and per-reference disambiguation cost inside the
TypeScript finalization path. A follow-up plan should decide whether to redesign
that resolver path, change the data model available to it, or keep Rust
indexing opt-in while prioritizing other product work.

Phase 4 remains historical Branch B evidence: continue opt-in hardening with
targeted blockers. Phase 5 does not rewrite that decision; it adds evidence
that the reference-resolution blocker remains after #94.
