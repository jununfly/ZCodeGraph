# Issue #210 Post-#209 Scoreboard Decision

## Scope

This records the post-#209 required-target benchmark evidence after fixing the benchmark harness so empty real-repo corpora are classified as invalid/unavailable by default.

No Rust default rollout readiness is claimed.

## Harness Change

- Real-repo experiment targets now record `copiedSourceFiles` separately from config files.
- A target is classified as `target-failed-empty-corpus` when a completed arm copies zero JS/TS source files or produces zero graph files/nodes.
- `allowEmptyCorpus: true` is the explicit manifest escape hatch for intentionally empty fixtures.
- Required empty-corpus targets map to `failed-required-target-unavailable`, not completed graph evidence.

## Scoreboard Run

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-23-rust-indexing-core-issue-optimization-evidence-cleanup.md`
- Node: `v22.21.1`
- Rust core: `target/debug/zcodegraph-core`
- SQLite write mode: `final-flush`
- Rust graph work profile: `full`

## Corpus Validation

| Target | Class | Commit | Dirty | Copied source files | Empty corpus |
|---|---|---|---:|---:|---|
| ZCodeGraph | required | `6c8b3eddaa9b2a2d102397f9d80246f907e12360` | yes | 290 | valid |
| Excalidraw | required | `28a9b1711dc0625b8ab5d643dc871810ee13642f` | no | 627 | valid |
| VS Code sparse | stress | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` | no | 11291 | valid |

The ZCodeGraph target is dirty because this issue's harness and benchmark artifacts were in progress. The manifest intentionally allows dirty for the local repository target. Excalidraw and VS Code sparse are clean working trees at the expected commits.

## Scoreboard Result

| Target | Required | Sufficiency | Performance | TypeScript ms | Rust ms | Wall delta | RSS delta | Classification |
|---|---:|---|---|---:|---:|---:|---:|---|
| ZCodeGraph | yes | passed | unavailable | 4410 | 7649 | +73.45% | +0.37% | target-failed-performance-gate-unmet |
| Excalidraw | yes | passed | unavailable | 10131 | 14979 | +47.85% | +0.62% | target-failed-performance-gate-unmet |
| VS Code sparse | no | passed | unavailable | 461443 | 570731 | +23.68% | -27.78% | target-failed-performance-gate-unmet |

Experiment classification: `failed-required-performance-gate-unmet`.

Interpretation: the harness now rejects empty evidence, and the real corpora are valid. Sufficiency is green across all three targets, but performance is still not ready for default rollout.

## Profile Signals

| Target | parseExtractionMs | rust sqliteWriteMs | pathAliasMs | esmNamedMs | localExactMs | TS finalization ms | finalize referenceResolutionMs |
|---|---:|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | 1059 | 1356 | 90 | 386 | 1525 | 725 | 350 |
| Excalidraw | 1686 | 2411 | 456 | 1216 | 1570 | 2010 | 1526 |
| VS Code sparse | 39445 | 133042 | 4595 | 11572 | 50967 | 97554 | 84720 |

The largest VS Code sparse Rust-owned single bucket is `sqliteWriteMs` at 133042 ms. This is not the #209 finalization `edgeWriteDbMs` candidate; it is the Rust core graph-write path before TypeScript finalization. It is also visible on the smaller required targets, though at smaller scale.

## Next #165 Candidate

Select exactly one next implementation candidate:

**Optimize Rust core graph-write `sqliteWriteMs` with a bounded A/B.**

Expected scope:

- Target the Rust core SQLite graph-write path measured as `rustCore.sqliteWriteMs`.
- Preserve graphStats parity and sufficiency.
- Use a reduced fixture for inner-loop iteration.
- Finish with one after-run on ZCodeGraph, Excalidraw, and VS Code sparse using the #210 scoreboard manifest shape.
- Do not repeat the #208 candidate replay verifier.
- Do not repeat the #209 TypeScript finalization edge-write-only hypothesis unless it is materially reframed outside this candidate.

Do not select default rollout readiness from this evidence. Keep #165 open.

## #185 Status

#185 remains an environment validation reserve item. This issue did not change packaging, CLI status, release, or npm smoke paths, so #185 is not updated or closed here.
