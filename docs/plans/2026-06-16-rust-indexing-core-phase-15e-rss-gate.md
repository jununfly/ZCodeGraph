# Rust Indexing Core Phase 15E Plan: RSS Gate Closure

Date: 2026-06-16

Reference PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on:

- [Phase 14 Experiment Infrastructure Plan](2026-06-15-rust-indexing-core-phase-14-experiment-infrastructure.md)
- [Phase 15 Controlled Performance Gate Plan](2026-06-15-rust-indexing-core-phase-15-controlled-performance-gate.md) (to be authored)
- GitHub tracker: #165 (Phase 15: Controlled performance gate interpretation), #49 (parent PRD)
- Phase 14/15 consolidated historical evidence:
  `docs/benchmarks/2026-06-23-rust-indexing-core-phase-14-15-experiment-artifact-cleanup.md`

## Goal

Phase 14 / 15D confirmed wall-time gate (Rust **-26.44%**) but left the RSS gate
(Rust **+20.08%**) unmet. The PRD hard gate requires RSS to be at least
**30% lower** than TypeScript on the same machine and repository snapshot.

Phase 15E does not jump to "fix RSS by code change". It first builds the
**diagnostic infrastructure** needed to actually see *what* is eating memory in
the Rust path, then applies the **lowest-risk** optimization
(SQLite write batching + WAL pragma), measures the impact with the new
profiler, and only then decides whether further architectural changes
(e.g. in-memory + final flush) are justified.

> Phase 15E builds reusable profiling tooling first, then uses it to drive a
> data-driven RSS burndown. It does not claim default / full-profile rollout
> readiness. TypeScript remains the default indexer.

## Why this phase exists

Phase 14 / 15D stopped at "stress evidence is diagnostic; no rollout claim"
because the raw full-profile gate remains unmet. To close the gate we need to
actually reduce Rust peak RSS below TypeScript. The current Rust RSS is
`62.9MB` versus TypeScript `52.4MB`; the gate target is `<= 36.7MB` (TS -30%).

Without a real heap profile we are guessing. This phase therefore delivers:

1. A **cross-platform heap profiler** (`dhat-rs`) for the Rust indexer that any
   agent or maintainer can re-run on Windows / macOS / Linux.
2. A **bottleneck-driven** first optimization (SQLite batching + WAL pragma).
3. A **data-driven decision** for whether to escalate to in-memory + final
   flush in a follow-up phase.

## Non-Goals

- Do not make Rust the default indexer.
- Do not change the SQLite schema.
- Do not change the user-facing MCP tool surface.
- Do not change `zcodegraph_explore` planner or renderer.
- Do not migrate new languages into Rust.
- Do not delete the TypeScript indexer.
- Do not let Phase 15E declare default / full-profile rollout readiness. That
  remains a separate decision gated on the performance + memory + Agent
  Sufficiency triple.
- Do not change `cargo` workspace structure beyond a single feature flag.

## Hard Gates

Phase 15E must produce evidence for all of these:

- A reproducible way to capture a Rust heap profile for any
  `zcodegraph index --engine rust` run via a single CLI flag
  (`--profile heap`) or env var (`ZCODEGRAPH_PROFILING=heap`).
- A `dhat-heap.json` artifact under
  `.workbuddy/profiling/<experimentId>/` for the VS Code matched-work
  stress rerun3 scope.
- A generated `dhat-summary.html` next to the JSON, with top-N
  allocations by size and by call site. Reviewable without external tools.
- The profiling output is discoverable from the existing
  `scripts/rust-indexing-experiment.mjs` runner via a
  `profiling.heapReport` field on the raw artifact.
- Default behavior (no flag) is unchanged: same binaries, same RSS, no
  `dhat` dependency in the default build.
- After the SQLite batching + WAL pragma change, the same VS Code
  matched-work stress scope is rerun and `peakRssDeltaPct` improves over
  the pre-change baseline. The improvement does not have to fully close
  the gate yet; Phase 15E measures the trajectory and decides next steps.
- The Rust path remains a no-op superseder of any prior good index on
  failure. No regression in the existing failure-safety contract.
- Existing parity tests still pass on the same fixtures.

## Allowed Code Changes

Phase 15E may:

- Add `dhat` as a **non-default Cargo feature** in
  `crates/zcodegraph-core`.
- Add a CLI flag and env var in the TypeScript CLI shell
  (`src/bin/zcodegraph.ts`) that propagate through to the Rust subprocess.
- Add a `profiling.heapReport` field to the experiment raw artifact
  schema and to the runner's output in
  `scripts/rust-indexing-experiment.mjs`.
- Wrap the Rust SQLite writes into per-file transactions with
  `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` on the
  per-file path.
- Add a small standalone script
  (`scripts/summarize-dhat.mjs`) that reads `dhat-heap.json` and
  produces `dhat-summary.html`. No external viewer dependency.
- Add tests in `__tests__/dhat-profiling.test.ts` and
  `__tests__/rust-sqlite-batching.test.ts` covering the contract
  boundaries (profiling flag wiring, WAL pragma presence, transaction
  boundaries).

Not allowed:

- Rewriting the Rust connection lifecycle into in-memory + final flush
  in this phase. That is a possible follow-up if batching + WAL does not
  close the gap.
- Changing the SQLite schema or extraction version.
- Enabling `dhat` in default builds.

## Success Classification

Phase 15E ends with exactly one classification:

- `continue-with-in-memory-pivot`: batching + WAL closed the gap or made
  significant measurable progress, and in-memory + final flush is the
  next logical step.
- `continue-with-batching-only`: batching + WAL meaningfully reduced
  RSS but the gate is still not closed; another iteration of
  batching / AST lifetime tuning is needed before in-memory pivot.
- `reassess-rust-architecture`: profiling shows the RSS cost is
  dominated by something batching + WAL cannot fix (e.g. tree-sitter
  AST lifetime, or per-file parse buffer), and the architecture
  boundary itself is the bottleneck. Phase 15E must propose what to
  change next.
- `abandon-rust-migration`: profiling shows the Rust path cannot
  plausibly close the RSS gap on real repositories; PRD stop-and-reassess
  branch is triggered.

Phase 15E cannot pass by claiming default / full-profile rollout
readiness. That requires an additional phase that re-runs the
required-target (`zcodegraph` + `excalidraw`) full-profile gate.

## Issue Sequence

### 1. Phase 15E Plan And Guardrails

- [x] This plan document
  (`docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`)
- [x] Open GitHub issue for dhat-rs integration (Phase 15E.1, ready-for-agent)
- [x] Open GitHub issue for SQLite batching + WAL pragma (Phase 15E.2, ready-for-agent)
- [x] Open GitHub issue for dhat summary HTML report (Phase 15E.3, ready-for-agent)
- [x] Post this plan as a comment on #49 (parent PRD) and #165 (controlled
      performance gate interpretation)

### 2. Phase 15E.1 dhat-rs Integration

- Add `dhat = { version = "...", optional = true }` to
  `crates/zcodegraph-core/Cargo.toml` under `[dependencies]` and
  `dhat = ["dep:dhat"]` under `[features]`.
- In `crates/zcodegraph-core/src/lib.rs`, add a module-level
  `#[cfg(feature = "dhat")]` global allocator block and start a
  `dhat::Profiler` guard for heap profiling runs.
- In `src/bin/zcodegraph.ts`, read
  `ZCODEGRAPH_PROFILING` env var and the `--profile <mode>` CLI flag.
  Only `mode=heap` is supported in this phase.
- Propagate `ZCODEGRAPH_PROFILING=heap` to the Rust subprocess via
  `src/indexing/rust-indexer.ts`.
- In `scripts/rust-indexing-experiment.mjs`, detect the env var and
  automatically enable it when the manifest has
  `"profiling": { "heap": true }` set.
- Output path: `.workbuddy/profiling/<experimentId>/dhat-heap.json`,
  created by the Rust subprocess on exit (dhat's default behavior when
  the global allocator is installed).
- Verify: build the project twice — once default, once with
  `--features dhat` — and confirm RSS is identical in the default
  build. Capture dhat JSON in the feature build.

### 3. Phase 15E.3 dhat Summary HTML Report

- Author `scripts/summarize-dhat.mjs` that reads
  `.workbuddy/profiling/<experimentId>/dhat-heap.json` and produces
  `dhat-summary.html` next to it.
- Sections in the report: total allocations, peak heap, top 20
  allocations by size, top 20 allocations by call site, file/line
  linkage. Pure static HTML; no external CSS/JS CDN.
- Add a focused test
  (`__tests__/dhat-summary-html.test.ts`) using a fixture JSON
  asserting the report contains the expected sections.
- Add a manifest field `"profiling": { "heap": true, "summaryHtml":
  true }` so the runner invokes the summarizer automatically.

### 4. Phase 15E.2 SQLite Batching + WAL Pragma

- In `crates/zcodegraph-core/src/lib.rs`, ensure each file indexing
  step wraps its `INSERT` into
  `Connection::transaction()`. Keep per-file commit granularity
  (i.e. do **not** batch across files in this phase).
- Apply
  `PRAGMA journal_mode=WAL` and
  `PRAGMA synchronous=NORMAL` on the connection.
- Keep all failure-safety semantics intact: failed indexing still
  leaves the previous good index in place.
- Add a focused test
  (`__tests__/rust-sqlite-batching.test.ts`) using a fixture SQLite
  file verifying that the emitted Rust index remains readable and
  durable in WAL mode. Connection-level `PRAGMA synchronous=NORMAL`
  and per-file transaction boundaries are verified in Rust core tests,
  because `synchronous` is not a persistent DB-file property on a later
  connection.
- Re-run the Phase 15D VS Code matched-work stress rerun3 scope
  (`docs/benchmarks/...-stress-rerun3`) and capture:
  - `peakRssDeltaPct`
  - `profiling.heapReport` path
  - the dhat summary HTML
- Compare against the pre-change baseline. Record a new rerun4
  artifact with these metrics.

### 5. Decision And Hand-off

- Decide success classification based on the rerun4 metrics and the
  dhat profile.
- If the gap is not closed:
  - Open a follow-up issue (Phase 15F) for the next optimization
    branch (likely in-memory + final flush, or tree-sitter AST
    lifetime changes).
  - Do not close #165 until the gate is closed or the architecture is
    reassessed.
- If the gap is closed on required targets:
  - Re-run the required full-profile scope (`zcodegraph` +
    `excalidraw`) and verify gate on those.
  - Then, and only then, evaluate default / full-profile rollout
    readiness as a separate phase.
- Update this plan's "Decision" section with the final
  classification, the rerun4 metrics, and the dhat summary HTML
  path.

## Cross-References

- Parent PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`
- Phase 14/15 historical stress and required-target evidence:
  `docs/benchmarks/2026-06-23-rust-indexing-core-phase-14-15-experiment-artifact-cleanup.md`
- Parent tracking issues: #49 (PRD), #165 (Phase 15 controlled gate interpretation)

## Decision

Classification: `continue-with-batching-only`.

Phase 15E produced reusable heap profiling and a durable VS Code matched-work
stress rerun4 artifact:

- Consolidated RSS evidence:
  `docs/benchmarks/2026-06-23-rust-indexing-core-phase-15e-15f-rss-evidence-cleanup.md`

Compared with Phase 15D rerun3, the VS Code matched-work stress RSS trend moved
from Rust `+20.08%` versus TypeScript to Rust `-21.41%` versus TypeScript.
That is a real directional improvement, but it still does not meet the PRD RSS
gate of Rust at least 30% lower than TypeScript.

The rerun4 wall-time result is not a rollout-readiness signal because the Rust
arm was intentionally run with `dhat` heap profiling enabled. The stress target
reported sufficiency as passed, performance as unavailable, and classification
as `target-failed-performance-gate-unmet`.

Next step: keep #165 open and continue with a narrower batching / AST lifetime
iteration before escalating to an in-memory + final-flush architecture pivot.
Do not claim default or full-profile rollout readiness from Phase 15E.
