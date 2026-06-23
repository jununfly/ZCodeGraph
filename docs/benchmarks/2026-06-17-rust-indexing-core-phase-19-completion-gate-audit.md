# Rust Indexing Core Phase 19 Completion Gate Audit

## Scope

This audit checks the clarified PRD completion gate for the Rust opt-in indexing vertical slice. It reuses Phase 17 and Phase 18 evidence and does not run a new benchmark campaign.

Rust remains opt-in. TypeScript remains the product default. This audit does not claim Rust default rollout readiness.

## Gate

The clarified PRD completion gate is evaluated on the required targets, ZCodeGraph and Excalidraw:

- Rust full opt-in path indexes end-to-end without Agent Sufficiency regression.
- The active index produced by Rust is readable by the TypeScript shell / CLI / MCP-compatible graph path.
- Rust wall time is no more than 30% slower than TypeScript.
- Rust peak RSS is no more than 15% higher than TypeScript.

The deeper post-PRD optimization gate remains separate: Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

## Source Evidence

| Evidence | Path |
|---|---|
| PRD | `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md` |
| Phase 19 plan | `docs/plans/2026-06-17-rust-indexing-core-phase-19-prd-completion-gate.md` |
| Phase 17 decision | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md` |
| Phase 18 decision | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md` |
| Phase 16-18 consolidated process evidence | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-16-18-sqlite-scoreboard-cleanup.md` |

## Required Target Audit

Phase 18 required-target after evidence is the latest full-profile required-target run after the kept SQLite PRAGMA candidate.

| Target | TS total | Rust total | Wall delta | Wall gate | TS RSS | Rust RSS | RSS delta | RSS gate | Sufficiency | Active index readable | Completion gate |
|---|---:|---:|---:|---|---:|---:|---:|---|---|---|---|
| zcodegraph | 4,679 ms | 5,877 ms | +25.60% | pass | 57,835,520 | 58,048,512 | +0.37% | pass | passed | yes | pass |
| excalidraw | 3,307 ms | 3,756 ms | +13.58% | pass | 58,277,888 | 55,820,288 | -4.22% | pass | passed | yes | pass |

## GraphStats And Readability

The Phase 18 required-target artifact records `graph available` for both TypeScript and Rust arms and records graphStats through the existing TypeScript-side artifact reader. That is sufficient evidence that the Rust-produced active index is readable by the TypeScript shell / CLI / MCP-compatible graph path for this PRD completion audit.

| Target | TS files | Rust files | TS nodes | Rust nodes | TS edges | Rust edges | Interpretation |
|---|---:|---:|---:|---:|---:|---:|---|
| zcodegraph | 290 | 290 | 4,169 | 14,215 | 17,626 | 31,338 | readable; intentionally not byte-equivalent |
| excalidraw | 34 | 34 | 2,360 | 6,352 | 7,204 | 12,100 | readable; intentionally not byte-equivalent |

The Rust full profile produces a larger graph than the TypeScript path because the Rust JS/TS extraction scope has expanded over prior phases. The PRD accepts semantic sufficiency and readable graph output rather than byte-identical graphStats.

## Sufficiency

Phase 18 required-target gates record Agent Sufficiency as `passed` for both required targets:

| Target | Sufficiency | Regressions |
|---|---|---|
| zcodegraph | passed | none recorded |
| excalidraw | passed | none recorded |

## Audit Result

The clarified PRD completion gate passes on the required targets:

- ZCodeGraph wall-time regression is +25.60%, inside the +30% envelope.
- ZCodeGraph RSS regression is +0.37%, inside the +15% envelope.
- Excalidraw wall-time regression is +13.58%, inside the +30% envelope.
- Excalidraw RSS is 4.22% lower than TypeScript, inside the +15% envelope.
- Agent Sufficiency passed for both required targets.
- Rust-produced graph artifacts were readable by the TypeScript-side artifact reader and graphStats path.

The post-PRD optimization gate is still not met. #165 should be downgraded to a post-PRD optimization tracker, and #193 should remain open as the next concrete result-oriented optimization issue.

No additional targeted product smoke is required for the clarified PRD completion decision.
