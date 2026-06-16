# Phase 15E Handoff — RSS Gate Closure

Date: 2026-06-16 | Source agent session: `@skill:zj-grill-me` + `@skill:zj-handoff`

## Target Audience

Next agent picking up the Rust indexing RSS gate closure work.

## Suggested Skills

- `@skill:zj-tdd` — red-green-refactor loop for all code changes
- `@skill:codegraph-assistant` — project structure / symbol index awareness
- `@skill:surgical-codebase-rewrite` — if moving beyond per-file transactions into in-memory + final flush

## What Just Happened

1. **Decision grilling completed** (`@skill:zj-grill-me`, 13 rounds). Agreed direction:

   - Core direction: **Fix RSS to close the PRD hard gate** (Rust peak RSS must be ≤ TS -30%).
   - Diagnostic tool: **`dhat-rs`** cross-platform heap profiler, gated behind `--features dhat` (default build unchanged).
   - Artifact location: `.workbuddy/profiling/<experimentId>/dhat-heap.json` + auto-generated `dhat-summary.html`.
   - Enablement: CLI `--profile heap` + env `ZCODEGRAPH_PROFILING=heap`, default OFF.
   - Associate with manifest: `experimentId` naming + `profiling.heapReport` field on raw artifact.
   - First optimization: **SQLite per-file transactions + WAL pragma** (lowest risk, not in-memory yet).
   - In-memory + final flush is a **follow-up option** if batching + WAL doesn't close the gap.

2. **Phase 15E plan written**:

   `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`

   Contains: goal, non-goals, hard gates, allowed code changes, success classification (4 outcomes), issue sequence (5 steps), cross-references.

## Current State

| Item | State |
|---|---|
| `main` branch (local + origin) | `730c39f` — clean |
| Git worktree | Empty (one commit `38cf30d` removed superseded Phase 12 doc, merged and pushed) |
| #169 (VS Code stress) | **CLOSED** — accepted matched-work stress evidence |
| #161 (HITL validation) | **CLOSED** — rollout readiness NOT claimed, controlled-variable evidence documented |
| #154 (Phase 14 parent) | **CLOSED** — all child issues closed, Phase 14 accepted |
| #165 (controlled performance gate) | **OPEN** — RSS gate unmet, this is the next tracking container |
| #49 (parent PRD) | **OPEN** — `ready-for-agent` |
| Phase 15E issues (#170–#172) | **NOT YET CREATED** — need to be opened |

## What The Next Agent Must Do

### Step 1 — Open GitHub Issues

Three issues to create under #49 parent PRD, label: `enhancement` + `ready-for-agent`:

| # | Title | Scope |
|---|---|---|
| #170 | Phase 15E.1: dhat-rs heap profiler integration | Cargo feature flag, CLI + env var wiring, TypeScript→Rust propagation, experimentId output path |
| #171 | Phase 15E.2: SQLite batching + WAL pragma for Rust indexer | Per-file `Connection::transaction()`, `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL` |
| #172 | Phase 15E.3: dhat-heap.json → HTML summary report | `scripts/summarize-dhat.mjs` that consumes dhat JSON and outputs static `dhat-summary.html` |

Body: reference this plan (`docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`), include the issue-sequence scope from the plan's "Issue Sequence / 2/3/4" sections.

Post a comment on #165 and #49 linking the plan + the three new issues.

### Step 2 — Implement #170 (dhat-rs Integration)

Files to touch:

- `crates/zcodegraph-core/Cargo.toml` — add `dhat = { version = "0.3", optional = true }` + `[features] default = []` + `dhat = ["dep:dhat"]`
- `crates/zcodegraph-core/src/lib.rs` — add `#[cfg(feature = "dhat")]` block that calls `dhat::Dhat::default().as_global_allocator()`. Output to `.workbuddy/profiling/<experimentId>/dhat-heap.json` (use `std::env::var("ZCODEGRAPH_EXPERIMENT_ID")` to get the experimentId).
- `src/bin/zcodegraph.ts` — parse `--profile <mode>` CLI flag. Only `heap` supported.
- `src/indexing/rust-indexer.ts` — read `ZCODEGRAPH_PROFILING` env and pass to subprocess.
- `scripts/rust-indexing-experiment.mjs` — add `profiling.heapReport` field to raw artifact schema; auto-detect when manifest `profiling.heap` is `true`.

Tests:

- `__tests__/dhat-profiling.test.ts` — CLI flag parsing, env propagation, artifact field presence.

### Step 3 — Implement #172 (HTML Summary Report)

- Author `scripts/summarize-dhat.mjs` that reads dhat JSON and outputs static HTML.
- Sections: total allocations, peak heap, top 20 by size, top 20 by call site.
- Test: `__tests__/dhat-summary-html.test.ts` — fixture JSON → HTML assertions.

### Step 4 — Implement #171 (SQLite Batching + WAL)

Files to touch:

- `crates/zcodegraph-core/src/lib.rs` — wrap `INSERT` calls within `index_javascript_files` in `conn.transaction()`. Preserve per-file commit boundary. Apply WAL + synchronous pragma.

Tests:

- `__tests__/rust-sqlite-batching.test.ts` — verify journal mode = WAL and per-file transaction count.

### Step 5 — Rerun VS Code Stress (rerun4)

- Re-run Phase 15D scope (VS Code matched-work stress rerun3 equivalent) with `--profile heap`.
- Capture: `peakRssDeltaPct`, `dhat-heap.json`, `dhat-summary.html`.
- Save as `docs/benchmarks/2026-06-16-rust-indexing-core-phase-15e-vscode-rss-batching-rerun4.*`.
- Compare against rerun3 baseline (RSS +20.08%).

### Step 6 — Decide Success Classification

From the plan's "Success Classification" section:

- `continue-with-in-memory-pivot` — batching moved the needle enough; escalate.
- `continue-with-batching-only` — needle moved but not enough; iterate batching.
- `reassess-rust-architecture` — dhat profile shows batching can't fix the dominant cost.
- `abandon-rust-migration` — RSS gap is structural.

Open or update #165 with the decision. Do NOT close #165 until the full-profile gate is closed.

## Key Artifacts (reference, do not duplicate)

| Artifact | Path |
|---|---|
| PRD | `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md` |
| Phase 14 plan | `docs/plans/2026-06-15-rust-indexing-core-phase-14-experiment-infrastructure.md` |
| Phase 15E plan | `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md` |
| Phase 15E handoff (this file) | `docs/plans/2026-06-16-rust-indexing-core-phase-15e-handoff.md` |
| VS Code stress rerun3 baseline | `docs/benchmarks/2026-06-16-rust-indexing-core-phase-15d-vscode-matched-work-stress-rerun3.raw.json` |
| Required full-profile rerun5 | `docs/benchmarks/2026-06-16-rust-indexing-core-phase-14-required-only-rerun5.raw.json` |
| Experiment runner | `scripts/rust-indexing-experiment.mjs` |
| Rust core | `crates/zcodegraph-core/src/lib.rs` (82KB, ~2100 lines) |
| Rust entrypoint | `crates/zcodegraph-core/src/main.rs` |
| TS CLI wiring | `src/bin/zcodegraph.ts` |
| TS Rust indexer bridge | `src/indexing/rust-indexer.ts` |

## RSS Baseline Numbers

| Metric | TypeScript | Rust (rerun3) | Gate Target |
|---|---|---|---|
| peakRssBytes | 52,416,512 | 62,939,136 **(+20.08%)** | ≤ 36,691,558 (-30%) |
| wallTimeMs | 1,046,846 | 770,037 **(-26.44%)** | — (already passes) |

Gap to close: **26.2MB**. Rust needs to go from 62.9MB → 36.7MB or below.

## Running the Profiler (for the next agent)

```bash
# Build with dhat
cd crates/zcodegraph-core
cargo build --features dhat --release

# Profile a single run
ZCODEGRAPH_PROFILING=heap ZCODEGRAPH_EXPERIMENT_ID=phase-15e-local-test \
  node dist/bin/zcodegraph.js index --engine rust --profile heap

# Output lands at:
# .workbuddy/profiling/phase-15e-local-test/dhat-heap.json

# Generate summary HTML
node scripts/summarize-dhat.mjs .workbuddy/profiling/phase-15e-local-test/dhat-heap.json
# Output: .workbuddy/profiling/phase-15e-local-test/dhat-summary.html
```

## GitHub Credential Notes

- GitHub CLI works with `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY gh ...` to bypass proxy TLS issues.
- Personal access token via `gh_auth_status` is already configured.

## Things NOT To Do

- Do NOT claim default / full-profile rollout readiness.
- Do NOT change the SQLite schema.
- Do NOT make the Rust indexer default.
- Do NOT delete the TypeScript indexer.
- Do NOT close #165 until the RSS gate is actually closed on required targets.
