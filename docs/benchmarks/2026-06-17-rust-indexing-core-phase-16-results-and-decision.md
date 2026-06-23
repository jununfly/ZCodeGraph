# Rust Indexing Core Phase 16 Results And Decision

## Scope

Phase 16 reassessed the Rust indexing architecture boundary before further Rust expansion. It tested one primary candidate, `memory-final-flush`, behind the explicit experimental SQLite write mode:

- Manifest field: `rust.sqliteWriteMode`
- CLI flag: `--sqlite-write-mode memory-final-flush`
- Default path: unchanged `disk`

This phase does not claim default Rust indexer readiness or full-profile rollout readiness.

Architecture record:

- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment.md` |
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-16-18-sqlite-scoreboard-cleanup.md` |

## Implementation

The Rust core now supports two SQLite write modes:

- `disk`: the existing default active-index path.
- `memory-final-flush`: an explicit experimental prototype that writes into an in-memory SQLite connection, exports that database to the existing temp index path, then reuses the existing atomic replace step.

The TypeScript CLI and formal experiment runner can pass the mode explicitly. If the flag or manifest field is absent, the Rust subprocess receives no `--sqlite-write-mode` argument and the Rust core uses `disk`.

## Reduced Smoke

`memory-final-flush` produced a readable Rust index for a reduced TypeScript fixture:

- fileCount: 1
- nodeCount: 3
- edgeCount: 3
- dbSizeBytes: 143,360
- journalMode: `wal`
- indexed engine: `rust`

## Required Target Results

These single runs are trend evidence, not statistical benchmark proof.

| Target | Mode | TS RSS | Rust RSS | RSS delta | TS total | Rust total | Wall delta | Rust sqliteWriteMs | Sufficiency |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| zcodegraph | disk | 48,840,704 | 51,380,224 | +5.20% | 4,519 ms | 4,150 ms | -8.17% | 462 | passed |
| zcodegraph | memory-final-flush | 46,186,496 | 50,905,088 | +10.22% | 4,110 ms | 3,878 ms | -5.64% | 219 | passed |
| excalidraw | disk | 45,432,832 | 48,840,704 | +7.50% | 3,627 ms | 3,325 ms | -8.33% | 304 | passed |
| excalidraw | memory-final-flush | 44,269,568 | 48,922,624 | +10.51% | 3,149 ms | 2,967 ms | -5.78% | 226 | passed |

Required target interpretation:

- The PRD hard gate remains unmet: Rust did not become at least 25% faster or at least 30% lower RSS on the required targets.
- The SQLite candidate did not harm sufficiency.
- On small required targets, `sqliteWriteMs` improved but the total run is dominated by fixed init/index/finalization overhead, so this is not enough to close the PRD gate.

## VS Code Sparse Stress Result

| Mode | TS RSS | Rust RSS | RSS delta | TS total | Rust total | Wall delta | Rust sqliteWriteMs | Rust parseExtractionMs | Rust finalizationMs | Sufficiency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| disk | 9,895,936 | 12,861,440 | +29.97% | 504,394 ms | 385,397 ms | -23.59% | 66,317 | 40,557 | 33,344 | passed |
| memory-final-flush | 20,398,080 | 20,742,144 | +1.69% | 478,310 ms | 329,467 ms | -31.12% | 22,774 | 36,706 | 28,959 | passed |

VS Code stress interpretation:

- `sqliteWriteMs` dropped from 66,317 ms to 22,774 ms.
- Rust total time improved from 385,397 ms to 329,467 ms.
- Rust-over-TypeScript RSS moved from +29.97% to +1.69%, but this remains a single-run trend and does not prove RSS superiority.
- The stress target strongly validates the SQLite write/finalization boundary as a productionization candidate.

## Orchestration Audit

The source-copy/subprocess boundary was audited from the Phase 16 artifacts.

| Target | Mode | Rust sourceCopy | Rust init | Rust subprocessStartupHandoffMs | Rust index |
|---|---|---:|---:|---:|---:|
| zcodegraph | disk | 38 ms | 1,869 ms | 3 ms | 2,243 ms |
| zcodegraph | memory-final-flush | 34 ms | 1,893 ms | 3 ms | 1,950 ms |
| excalidraw | disk | 11 ms | 1,714 ms | 3 ms | 1,600 ms |
| excalidraw | memory-final-flush | 8 ms | 1,457 ms | 3 ms | 1,502 ms |
| vscode | disk | 2,918 ms | 230,091 ms | 4 ms | 152,388 ms |
| vscode | memory-final-flush | 3,066 ms | 226,200 ms | 3 ms | 100,200 ms |

Audit conclusion:

- Source copy is not the next bounded candidate: it is tiny on required targets and about 3 seconds on the VS Code sparse stress target.
- Rust subprocess startup/handoff is not a blocker: it is 3-4 ms.
- VS Code `init` remains very large, but the artifacts do not isolate a low-risk code change inside this issue. It likely includes product initialization and existing CLI setup, not a narrowly attributable source-copy or subprocess issue.
- No orchestration/source-copy candidate was attempted in Phase 16. The audit did not justify a bounded code change.

## Decision

Final Phase 16 result:

`productionize-sqlite-candidate`

The SQLite `memory-final-flush` prototype is validated as a productionization candidate because it materially improved the dominant Rust SQLite write block on the VS Code stress target, improved total Rust wall time there, preserved graphStats shape, and did not regress sufficiency.

The PRD required-target gate remains open. This phase should not close #165 as "performance gate resolved." The correct next step is a production-safe version of the SQLite final-flush write path with explicit failure-safety and locking tests, followed by required-target and VS Code stress validation.

## Out Of Scope

- No default Rust indexer readiness claim.
- No full-profile rollout readiness claim.
- No Rust coverage expansion.
- No ReferenceResolver migration.
- No production schema change.
