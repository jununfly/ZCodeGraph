# Rust Indexing Core Phase 19 Decision

## Scope

Phase 19 audited whether the Rust opt-in indexing vertical slice satisfies the clarified PRD completion gate.

This decision does not claim Rust default rollout readiness. Rust remains opt-in. TypeScript remains the product default.

## Artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-19-prd-completion-gate.md` |
| Audit | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-completion-gate-audit.md` |
| Targeted smoke note | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-targeted-smoke.md` |
| Phase 18 decision | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md` |

## Required Target Result

| Target | TS total | Rust total | Wall delta | TS RSS | Rust RSS | RSS delta | Sufficiency | Active index readable | Completion gate |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| zcodegraph | 4,679 ms | 5,877 ms | +25.60% | 57,835,520 | 58,048,512 | +0.37% | passed | yes | pass |
| excalidraw | 3,307 ms | 3,756 ms | +13.58% | 58,277,888 | 55,820,288 | -4.22% | passed | yes | pass |

The clarified PRD completion gate passes. Both required targets stay inside the +30% wall-time and +15% RSS envelopes, Agent Sufficiency passed, and Rust-produced graph artifacts were readable by the TypeScript-side graphStats path.

## GraphStats

GraphStats are readable but not byte-equivalent:

| Target | TS files | Rust files | TS nodes | Rust nodes | TS edges | Rust edges |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 290 | 290 | 4,169 | 14,215 | 17,626 | 31,338 |
| excalidraw | 34 | 34 | 2,360 | 6,352 | 7,204 | 12,100 |

This is acceptable for the PRD completion gate because the PRD is based on opt-in end-to-end readability and Agent Sufficiency, not byte-identical graph shape.

## Tracker Decisions

#49 should be closed as complete for the clarified Rust opt-in vertical slice PRD completion gate.

#165 should remain open but be downgraded from PRD completion blocker to post-PRD optimization tracker. The original deeper target remains important: Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

#193 should remain open as the next concrete post-PRD optimization issue. It owns the bounded finalization/reference-resolution bottleneck A/B path identified by Phase 18.

## Non-Claims

- No Rust default rollout readiness is claimed.
- No TypeScript default replacement is claimed.
- No post-PRD optimization gate closure is claimed.
- No new full benchmark campaign was run in Phase 19.

## Decision

The Rust indexing core vertical slice PRD is complete under the clarified completion gate.

Continue with Rust as opt-in and move remaining performance work to post-PRD optimization through #165 and #193.
