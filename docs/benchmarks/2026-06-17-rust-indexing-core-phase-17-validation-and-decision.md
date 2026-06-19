# Rust Indexing Core Phase 17 Validation And Decision

## Scope

Phase 17 made production `final-flush` the default SQLite write mode for explicit Rust indexing only. Rust remains opt-in through `--engine rust`; TypeScript remains the product default.

This phase does not claim default rollout readiness.

Architecture record:

- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Implementation Summary

- Added production SQLite write mode: `final-flush`.
- `--engine rust` now passes `--sqlite-write-mode final-flush` by default.
- `--sqlite-write-mode disk` remains a selectable debug/escape hatch.
- `--sqlite-write-mode memory-final-flush` remains selectable as an experimental/debug mode.
- The formal experiment runner now uses `final-flush` as the Rust scoreboard default and still passes explicit `disk` overrides.
- No SQLite schema change was made.

The production `final-flush` path currently uses the existing temp on-disk SQLite staging database plus active-index replacement path. The Phase 16 in-memory prototype remains separate as `memory-final-flush`.

## Artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-17-production-final-flush-scoreboard.md` |
| Matched profile manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-matched-ts-js.experiment.json` |
| Matched profile raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-matched-ts-js.raw.json` |
| Matched profile summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-matched-ts-js-summary.md` |
| Full profile manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-full.experiment.json` |
| Full profile raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-full.raw.json` |
| Full profile summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-full-summary.md` |

## Test And Smoke Results

| Check | Result |
|---|---|
| `cargo test --package zcodegraph-core` | passed |
| `npm run build` | passed |
| `npx vitest run __tests__/rust-index-engine-cli.test.ts` | passed |
| `npx vitest run __tests__/rust-indexing-experiment.test.ts` | passed |
| macOS CLI smoke: default `--engine rust` final-flush | passed; status reported `index.engine = rust` |
| macOS CLI smoke: `--sqlite-write-mode disk` escape hatch | passed; status reported `index.engine = rust` |
| Linux Docker focused validation | not run; `docker --version` returned `command not found` in this environment |
| Windows focused validation | not required; this phase did not change replace, locking, path, or file-handle semantics |
| Packaging/release smoke | limited to `npm run build`; no packaging or bundled binary selection path was changed |

The CLI smoke commands were run under `CODEGRAPH_ALLOW_UNSAFE_NODE=1` because this machine is using Node `v26.0.0`, which triggers the repository's Node version warning.

## Matched-TS-JS Scoreboard

Profile: `matched-ts-js`

SQLite write mode: `final-flush`

Classification: `failed-required-performance-gate-unmet`

| Target | Class | Sufficiency | TS total | Rust total | Wall delta | TS RSS | Rust RSS | RSS delta | Classification |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| zcodegraph | required | passed | 4,896 ms | 4,755 ms | -2.88% | 58,130,432 | 58,359,808 | +0.39% | failed performance gate |
| excalidraw | required | passed | 3,450 ms | 3,408 ms | -1.22% | 58,589,184 | 56,049,664 | -4.33% | failed performance gate |
| vscode sparse | stress | passed | 555,364 ms | 420,732 ms | -24.24% | 13,991,936 | 18,923,520 | +35.25% | failed performance gate |

Matched profile interpretation:

- Required targets still do not meet the PRD hard gate.
- VS Code sparse is very close to the 25% wall-time threshold, but it does not pass and RSS regresses substantially in this single run.
- The next largest matched-profile blocker is still not source copy or subprocess startup; on VS Code sparse, Rust `init` and the Rust core SQLite/write/finalization path dominate the remaining gap.

## Full Scoreboard

Profile: `full`

SQLite write mode: `final-flush`

Classification: `failed-required-performance-gate-unmet`

| Target | Class | Sufficiency | TS total | Rust total | Wall delta | TS RSS | Rust RSS | RSS delta | Classification |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| zcodegraph | required | passed | 4,987 ms | 6,423 ms | +28.79% | 58,163,200 | 58,343,424 | +0.31% | failed performance gate |
| excalidraw | required | passed | 3,426 ms | 4,004 ms | +16.87% | 58,556,416 | 55,902,208 | -4.53% | failed performance gate |
| vscode sparse | stress | passed | 536,281 ms | 606,168 ms | +13.03% | 19,955,712 | 19,660,800 | -1.48% | failed performance gate |

Full profile interpretation:

- Full profile is not ready as a performance path.
- The full-profile cost is materially worse than matched-ts-js because expanded Rust graph work increases SQLite writes and TypeScript finalization work.
- On VS Code sparse full profile, Rust core `sqliteWriteMs` was 160,722 ms and TypeScript finalization was 135,598 ms, including 124,152 ms of reference resolution.

## Gate State

PRD required-target performance gate: **failed**.

Agent Sufficiency smoke: **passed** in both scoreboard profiles.

GraphStats parity: **not equivalent**, and profile dependent:

- `matched-ts-js` intentionally limits graph work and is useful as a performance/control lens, not a completeness claim.
- `full` produces a much larger graph than matched profile, but still differs materially from the TypeScript graph shape.

Default rollout readiness: **not claimed**.

#165 should remain open.

## Next Largest Blocker

The next result-oriented blocker is the full-profile end-to-end chain, not another isolated write-mode toggle:

1. Rust full-profile SQLite write volume is too high, especially on VS Code sparse.
2. ReferenceResolver/finalization is a large follow-on block once Rust extraction writes the full graph.
3. The optimization target should segment full-profile end-to-end time into Rust extraction/write, TypeScript finalization/reference resolution, and graphStats/sufficiency, then run bounded A/B changes against the largest segment first.

Recommended next issue: **Phase 18 full-profile end-to-end bottleneck segmentation and first bounded A/B optimization**.

## Decision

Phase 17 completes the production final-flush default work for Rust opt-in indexing, but it does not close the PRD performance blocker.

Decision: continue Rust as opt-in, keep `final-flush` as the default Rust write mode, keep `disk` as the debug escape hatch, keep `memory-final-flush` experimental, and move to result-oriented full-chain bottleneck segmentation.
