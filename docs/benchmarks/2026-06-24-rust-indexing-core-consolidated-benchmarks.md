# Rust Indexing Core Consolidated Benchmarks And Evidence

Date: 2026-06-24

This file mechanically consolidates the previous `*-rust-indexing-core-*` files in this directory. The original per-phase/process files were removed after consolidation so this file is the single archive entry point for this historical workstream.

## Source Files

- `docs/benchmarks/2026-06-13-rust-indexing-core-agent-sufficiency.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-performance.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-optimization-trial.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-profile-baseline.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`
- `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-hardgate-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-after.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-before.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-issue105-vscode-sufficiency-node24.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-results-and-decision.md`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-results-and-decision.md`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-results-and-decision.md`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-results-and-decision.md`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vs1-target-validation.raw.json`
- `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json`
- `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-completion-gate-audit.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-targeted-smoke.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-boundary-protocol-status.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-completion.experiment.json`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-207-disambiguation-equivalence-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

## Consolidated Contents

## 1. `docs/benchmarks/2026-06-13-rust-indexing-core-agent-sufficiency.md`

# Rust Indexing Core Phase 1 Agent Sufficiency Guardrail

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#58](https://github.com/jununfly/ZCodeGraph/issues/58)

## Summary

The Rust-produced index does not regress the deterministic Explore sufficiency
guardrail against the TypeScript-produced index on the Phase 1 corpus.

- ZCodeGraph self-flow prompts have the same existing graph-coverage gap under
  both engines.
- Excalidraw flow prompts remain connected under both engines after fixing Rust
  extraction for callable arrow fields and class member containment.
- No Rust-only increase was observed in deterministic generic Read/Grep fallback
  risk.

This run is a deterministic tool-surface guardrail, not a stochastic Claude Code
A/B run. It exercises the same MCP `zcodegraph_explore` surface an agent uses
and records whether the answer already includes the expected flow evidence. The
raw JSON is stored outside the repo at
`/tmp/zcodegraph-rust-sufficiency-guardrail-58.json`.

## Method

- Runner: `scripts/rust-sufficiency-guardrail.mjs`
- Command:

```bash
npm run build
cargo build --package zcodegraph-core
/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/rust-sufficiency-guardrail.mjs \
  --repo zcodegraph=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

- Each repository was copied to temporary directories.
- One copy was indexed with the TypeScript engine.
- One copy was indexed with the Rust engine.
- Each prompt was run through `zcodegraph_explore`.
- The script records Flow section connectivity, expected-symbol presence, and a
  deterministic fallback-risk count.

## Environment

| Field | Value |
|---|---|
| Generated | 2026-06-12T18:34:02Z |
| Node | v24.14.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |

## Prompt Matrix

| Repo | Prompt | Symbol bag |
|---|---|---|
| ZCodeGraph | ZCG-1 | `handleExplore plan ExplorePlan render` |
| ZCodeGraph | ZCG-2 | `runIndex CodeGraph.indexAll ExtractionOrchestrator.indexAll ParseStage QueryBuilder.insertNode` |
| ZCodeGraph | ZCG-3 | `ReferenceResolver.resolveAll createSynthesizerRegistry registerFullGraphSynthesizers executeFullGraphSynthesizers QueryBuilder.insertEdge` |
| Excalidraw | EX-1 | `mutateElement triggerUpdate triggerRender render StaticCanvas renderStaticScene` |
| Excalidraw | EX-2 | `Scene.onUpdate triggerUpdate triggerRender render StaticCanvas` |
| Excalidraw | EX-3 | `StaticCanvas renderStaticScene _renderStaticScene drawElementOnCanvas renderElement` |

## Results

| Repo | Commit | Prompt | TS Flow | Rust Flow | TS fallback risk R/G | Rust fallback risk R/G | Classification |
|---|---:|---|---|---|---:|---:|---|
| ZCodeGraph | fc50081 | ZCG-1 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| ZCodeGraph | fc50081 | ZCG-2 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| ZCodeGraph | fc50081 | ZCG-3 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| Excalidraw | a83ac488 | EX-1 | yes | yes | 0 / 0 | 0 / 0 | No regression |
| Excalidraw | a83ac488 | EX-2 | yes | yes | 0 / 0 | 0 / 0 | No regression |
| Excalidraw | a83ac488 | EX-3 | yes | yes | 0 / 0 | 0 / 0 | No regression |

## Fixes From This Guardrail

The first guardrail run caught two Rust-only Excalidraw regressions:

- `EX-3` lost the `renderStaticScene -> _renderStaticScene -> renderElement`
  flow because exported arrow-function constants were indexed as constants, not
  callable functions.
- `EX-2` lost the callback-to-render flow because class field arrow callbacks
  were indexed as fields and TSX class declarations were indexed as components,
  so React render synthesis could not find class-contained methods.

The Rust extractor now:

- indexes arrow-function variable declarators as callable functions;
- indexes class field arrow callbacks as methods;
- keeps TSX class declarations as classes, not components;
- attaches class member `contains` edges to the class node.

## Gate Decision

| Gate | Result |
|---|---|
| This repository indexed with both engines | Pass |
| Excalidraw indexed with both engines | Pass |
| Generic Read fallback does not increase | Pass for deterministic fallback-risk signal |
| Generic Grep/Bash fallback does not increase | Pass for deterministic fallback-risk signal |
| Flow connectivity does not regress | Pass after Rust extractor fixes |
| Differences classified | Pass |
| Compact repo document stored | Pass |
| Script exits non-zero on Rust-only regression | Pass (`regressions=[]`) |

## Limitations

This document does not claim stochastic agent behavior. No Claude Code A/B runs
were executed for this issue. The guardrail measures whether the tool response
contains enough graph evidence that an agent should not need generic Read/Grep
recovery. A future release/default-rollout decision should still run real
headless agent sessions over the same prompt matrix.

## 2. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md`

# Rust Indexing Core Phase 1 Stop/Continue Decision

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#59](https://github.com/jununfly/ZCodeGraph/issues/59)

## Decision

Continue the Rust indexing core as an experimental, opt-in migration path.

Do not make Rust the default index engine in Phase 1. The TypeScript indexer
remains the default and fallback path for CLI, MCP, npm, npx, installer, and
upgrade flows.

## Evidence

| Gate | Evidence | Decision |
|---|---|---|
| Semantic parity for JS/TS/JSX/TSX | Fixture parity and real-repo parity are complete in the phase plan. | Good enough for Phase 1. |
| TypeScript resolver handoff | Rust extraction is followed by existing TypeScript resolution, framework finalization, dynamic-dispatch synthesis, and TypeScript MCP/Explore readback. | Good enough for Phase 1. |
| Performance and memory | [Phase 1 performance gate](2026-06-13-rust-indexing-core-phase-1-performance.md) records ZCodeGraph and Excalidraw baselines. Rust is slower but uses 86.0% and 91.1% less peak RSS. | Memory hard gate passes; speed remains a Phase 2 optimization target. |
| Agent Sufficiency | [Agent Sufficiency guardrail](2026-06-13-rust-indexing-core-agent-sufficiency.md) records no Rust-only Flow, Read-risk, or Grep-risk regression. | Good enough for Phase 1. |

## Packaging And Release Readiness

Local development:

- Build the TypeScript shell with `npm run build`.
- Build the Rust subprocess with `cargo build --package zcodegraph-core`.
- Run the experimental path by setting `ZCODEGRAPH_RUST_CORE_BINARY` to the
  built binary, or by using the default local debug path after the binary exists.
- Validate with `cargo test`, the Rust CLI integration tests, the parity script,
  the benchmark script, and the sufficiency guardrail script before expanding
  the Rust slice.

Release packaging:

- Phase 1 does not change npm install, npx, installer, or upgrade behavior when
  Rust is unused.
- The published npm and npx path must continue to launch the TypeScript indexer
  by default.
- Per-platform bundle inclusion is not complete in Phase 1. The release bundle
  scripts currently package Node, compiled TypeScript, schema, WASM grammars, and
  production dependencies; they do not yet build or include
  `zcodegraph-core`.
- Until per-platform Rust binaries are packaged, the Rust path must remain
  clearly experimental and require an explicit engine selection plus a local
  Rust binary. If the binary is unavailable, the CLI must fail cleanly without
  corrupting the active index.

Unsupported or unavailable Rust path:

- Unsupported platforms should keep the normal TypeScript indexer path
  unchanged.
- `zcodegraph index` without `--engine rust` and without
  `ZCODEGRAPH_INDEX_ENGINE=rust` must keep working through the TypeScript
  indexer.
- `npm install`, `npx @jununfly/zcodegraph`, installer-generated MCP configs,
  and the bundled launcher must not require Rust while the feature is
  experimental.

Rollback:

- Stop using `--engine rust`.
- Unset `ZCODEGRAPH_INDEX_ENGINE`.
- Re-index with the default TypeScript engine using `zcodegraph index -f`.

## Phase 2 Proposal

Open Phase 2 issues before expanding language coverage:

1. Package `zcodegraph-core` into every release bundle and npm platform package.
2. Add CI coverage for `cargo test` plus Rust CLI integration tests on macOS,
   Linux, and Windows.
3. Optimize Rust indexing wall-clock time, focusing on extraction throughput,
   SQLite write batching, subprocess handoff, and remaining TypeScript
   finalization cost.
4. Add a packaged-binary availability test that proves default TypeScript
   indexing still works when the Rust binary is absent.
5. Select the next language slice only after packaged Rust binaries and CI are
   in place; prefer another high-volume tree-sitter language with existing
   parity fixtures and real-repo sufficiency prompts.

## Final Phase 1 Status

Phase 1 passes the stop/continue gate because semantic parity, resolver handoff,
MCP/Explore readback, memory, and Agent Sufficiency are good enough for an
experimental opt-in path.

Phase 1 does not justify default rollout because wall-clock indexing is slower
and release packaging for the Rust binary is not complete.

## 3. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-performance.md`

# Rust Indexing Core Phase 1 Performance Gate

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#57](https://github.com/jununfly/ZCodeGraph/issues/57)

## Summary

The Rust Phase 1 indexer passes the hard gate on peak RSS for both measured
repositories, but it is slower than the TypeScript indexer in this slice.

The gate is: Rust must be at least 25% faster or use at least 30% less peak RSS,
with the other metric not significantly worse. These runs pass on memory
reduction and fail on wall-clock time. Keep the Rust path opt-in and treat
wall-clock performance as a Phase 2 optimization target before any default
rollout decision.

## Method

- Runner: `scripts/rust-index-benchmark.mjs`
- Command:

```bash
npm run build
cargo build --package zcodegraph-core
/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/rust-index-benchmark.mjs \
  --repo zcodegraph=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

- Each repository was copied to temporary directories before indexing.
- The copied benchmark slice includes Phase 1 JS/TS files (`.js`, `.jsx`,
  `.ts`, `.tsx`) plus JS/TS config files (`package.json`, `tsconfig.json`,
  `jsconfig.json`).
- Each run used `zcodegraph init`, then measured `zcodegraph index --force
  --quiet`.
- Peak RSS was sampled from the CLI process tree during indexing.
- Raw JSON was written to `/tmp/zcodegraph-rust-index-benchmark-57.json`.

## Environment

| Field | Value |
|---|---|
| Generated | 2026-06-12T18:39:28.918Z |
| Node | v24.14.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |
| Memory | 16 GiB |

## Results

| Repo | Commit | Slice files | Engine | Wall time | Peak RSS |
|---|---:|---:|---|---:|---:|
| ZCodeGraph | fc50081 | 246 | TypeScript | 1.73s | 1.44 GiB |
| ZCodeGraph | fc50081 | 246 | Rust | 6.85s | 206.30 MiB |
| Excalidraw | a83ac488 | 648 | TypeScript | 5.00s | 3.67 GiB |
| Excalidraw | a83ac488 | 648 | Rust | 13.34s | 334.70 MiB |

## Gate Decision

| Repo | Wall-time change | Peak-RSS reduction | Gate |
|---|---:|---:|---|
| ZCodeGraph | 296.8% slower | 86.0% lower | Memory gate passes; speed failure documented |
| Excalidraw | 166.5% slower | 91.1% lower | Memory gate passes; speed failure documented |

The benchmark script exits non-zero when a measured repository fails both hard
gate alternatives. This run passed with `gateFailures=[]`.

## Interpretation

- The Rust path strongly validates the memory-control motivation.
- The Rust path does not yet validate the indexing-speed motivation.
- The large TypeScript peak RSS likely includes Node, WASM grammar loading, and
  parse worker memory. The Rust subprocess keeps that path out of the hot
  extraction loop.
- The Rust wall-clock loss is acceptable for Phase 1 only because the hard gate
  was explicitly `speed OR memory`. Before expanding scope or considering a
  default rollout, investigate Rust extraction throughput, subprocess handoff
  overhead, SQLite write batching, and the TypeScript finalization cost that
  still runs after Rust extraction.

## 4. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md`

# Rust Indexing Core Phase 2 Stop/Continue Decision

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)
Phase 2 results: [Rust Indexing Core Phase 2 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md)
Issue: [#69](https://github.com/jununfly/ZCodeGraph/issues/69)

## Decision

Continue the Rust indexing work into the next phase, but keep Rust opt-in.

Prepare a default-rollout plan: no. The default TypeScript indexer remains the
default for `zcodegraph index`, npm/npx, MCP hosts, and release bundles. The
Rust JS/TS indexing path is now packageable and continuously verifiable, but it
is not ready to become the default engine.

## Evidence Summary

### Packaging Status

Phase 2 satisfies the six-target Rust binary packaging contract:

| Release target | Bundle path | Status |
|---|---|---|
| `darwin-arm64` | `bin/zcodegraph-core` | Covered |
| `darwin-x64` | `bin/zcodegraph-core` | Covered |
| `linux-x64` | `bin/zcodegraph-core` | Covered |
| `linux-arm64` | `bin/zcodegraph-core` | Covered |
| `win32-x64` | `bin/zcodegraph-core.exe` | Covered |
| `win32-arm64` | `bin/zcodegraph-core.exe` | Covered |

The release workflow builds one `zcodegraph-core` artifact per target, release
bundles require the matching binary, and npm platform packages preserve the
binary from the bundle path.

### npm/npx And Default TypeScript Safety

npm/npx users do not compile Rust locally. Published packages carry prebuilt
Rust binaries through optional platform packages; source development remains
explicit via `cargo build --package zcodegraph-core`.

Default TypeScript indexing remains safe:

- `zcodegraph index` without `--engine rust` still uses the TypeScript indexer.
- Missing Rust binaries fail only the explicit Rust path.
- Explicit Rust failures preserve the previous active index.
- No `postinstall` Rust compilation path was added.

### CI Coverage

CI coverage now includes Rust build/test coverage, Rust CLI integration tests on
macOS, Linux, and Windows, default TypeScript path checks without a Rust binary,
packaged Rust path checks, and release-workflow artifact completeness checks.
There are no remaining platform gaps for the six Phase 2 release targets.

### Benchmark, Profile, And Agent Sufficiency

The Phase 2 benchmark/profile/Agent Sufficiency rerun covered ZCodeGraph and
Excalidraw.

| Repo | Rust wall-clock | Rust peak RSS | Agent Sufficiency |
|---|---:|---:|---|
| ZCodeGraph | 44.4% slower | 39.2% lower | No Rust regression |
| Excalidraw | 18.7% slower | 51.6% lower | No Rust regression |

The <100% slower stretch goal was met on both repositories. The profile shows
the #67 SQLite write batching optimization removed the prior extreme SQLite
write bottleneck. The largest remaining measured Excalidraw phase is
TypeScript finalization.

## Blockers Before Default Rollout

- The Rust path still covers only the Phase 1 JavaScript, TypeScript, JSX, and
  TSX slice; it is not a whole-product replacement for the TypeScript indexer.
- The path has deterministic parity and sufficiency evidence for the target
  slice, but default rollout needs broader release-cycle confidence after the
  six prebuilt binaries ship and are consumed by real npm/npx users.
- TypeScript finalization remains part of the Rust path and is now the largest
  measured Excalidraw phase.
- The default engine should not change until a separate default-rollout plan
  defines blast radius, rollback, telemetry/diagnostics, and release criteria.

## Outcome

Phase 2 is complete for packaging, CI, profiler, first optimization, benchmark,
and deterministic Agent Sufficiency validation.

Keep Rust opt-in. Do not change the default engine in this phase. The next plan
should continue hardening the Rust path behind explicit `--engine rust` before
any default-rollout preparation.

## 5. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md`

# Rust Indexing Core Phase 2 Results

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)
Issue: [#68](https://github.com/jununfly/ZCodeGraph/issues/68)

## Summary

The Phase 2 rerun passes the memory gate and meets the <100% slower stretch goal
on both target repositories after the #67 SQLite write batching optimization.
Agent Sufficiency guardrails reported no Rust-vs-TypeScript regressions.

The explicit Phase 2 stop/continue decision is recorded in
[the #69 decision document](2026-06-13-rust-indexing-core-phase-2-decision.md):
Default rollout remains blocked. The remaining risk is not the stretch goal; it
is whether the opt-in Rust path has enough coverage, repeatability, and release
confidence to be considered for a broader rollout.

Raw JSON was written locally under `/tmp/zcodegraph-phase2-68/`:

- `benchmark.json`
- `profile.json`
- `sufficiency.json`

## Method

Commands:

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-benchmark.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
node scripts/rust-index-profile.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

`rust-index-benchmark.mjs` was run outside the sandbox so process-tree RSS
sampling via `ps` worked. The benchmark copied each repository to temporary
JS/TS slice directories before indexing. The guardrail uses deterministic
`zcodegraph_explore` fallback-risk signals, not stochastic Claude Code
Read/Grep tool calls.

Environment:

| Field | Value |
|---|---|
| Generated | 2026-06-13T07:44:35Z to 2026-06-13T07:45:34Z |
| Node | v26.0.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |

## Benchmark

| Repo | Commit | Slice files | TypeScript wall | Rust wall | Rust slowdown | TypeScript RSS | Rust RSS | RSS reduction | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ZCodeGraph | 85decc7 | 254 | 1.99s | 2.87s | 44.4% slower | 359.39 MiB | 218.46 MiB | 39.2% lower | Pass |
| Excalidraw | a83ac488 | 648 | 5.27s | 6.26s | 18.7% slower | 546.78 MiB | 264.61 MiB | 51.6% lower | Pass |

The <100% slower stretch goal was met on both repositories.

## Profile

| Repo | Commit | Source scan | Parse/extraction | SQLite write | TypeScript finalization | Subprocess handoff |
|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | 85decc7 | 0ms | 845ms | 993ms | 641ms | 3ms |
| Excalidraw | a83ac488 | 2ms | 1431ms | 1652ms | 2330ms | 2ms |

The #67 optimization removed SQLite write time as the extreme bottleneck seen
after #66. The largest remaining Excalidraw phase is TypeScript finalization.

## Agent Sufficiency

| Repo | Prompts | Rust regressions | Notes |
|---|---:|---:|---|
| ZCodeGraph | 3 | 0 | Rust matched TypeScript fallback-risk classification on all prompts; both paths still show graph-coverage residuals for these broad planner/indexing prompts. |
| Excalidraw | 3 | 0 | Rust matched TypeScript clean flow connectivity on all three React canvas prompts. |

The guardrail returned `regressions=[]`.

## Decision

The Phase 2 benchmark/profile/sufficiency rerun for #68 is complete:

- Benchmark results were rerun for ZCodeGraph and Excalidraw.
- Profiler output was recorded for ZCodeGraph and Excalidraw.
- Agent Sufficiency guardrails were rerun for ZCodeGraph and Excalidraw.
- The <100% slower stretch goal was met.
- The #69 stop/continue decision keeps default rollout blocked and keeps Rust
  opt-in for the next hardening phase.

## 6. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md`

# Rust Indexing Core Phase 3 Results

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 3 Production Hardening Plan](../plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md)
Issues: [#71](https://github.com/jununfly/ZCodeGraph/issues/71), [#72](https://github.com/jununfly/ZCodeGraph/issues/72), [#73](https://github.com/jununfly/ZCodeGraph/issues/73), [#74](https://github.com/jununfly/ZCodeGraph/issues/74), [#75](https://github.com/jununfly/ZCodeGraph/issues/75), [#76](https://github.com/jununfly/ZCodeGraph/issues/76), [#77](https://github.com/jununfly/ZCodeGraph/issues/77)

## Summary

Phase 3 keeps the Rust JS/TS indexer opt-in and focuses on repeatable release
confidence rather than default rollout. The profiling path now separates the
TypeScript finalization window into named subphases, so future reruns can show
where post-Rust time is spent before attempting additional optimization.

Rust remains opt-in. Rust is not required to be faster than TypeScript in Phase 3; the required evidence is repeatable profiling, no semantic/sufficiency regression, and a documented optimization conclusion.

## Verification Run

Verification for #76 completed the implementation and local test gates:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-package-smoke.test.ts __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts __tests__/rust-phase3-results-doc.test.ts __tests__/rust-index-profile.test.ts __tests__/status-json.test.ts __tests__/rust-core-discovery.test.ts __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/build-bundle-rust-core.test.ts __tests__/pack-npm-rust-core.test.ts __tests__/ci-rust-packaged-path.test.ts
git diff --check
```

Verification for #77 completed the real three-repository harness run:

```bash
ZCODEGRAPH_PHASE3_BUNDLE_DIR=/tmp/zcodegraph-phase3-bundle/zcodegraph-darwin-arm64 \
ZCODEGRAPH_PHASE3_NPM_ROOT=release/npm \
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --repo zustand=/private/tmp/codegraph-corpus/zustand \
  --out /tmp/zcodegraph-rust-phase3-real/
```

Output:

- raw artifacts, `summary.json`, and `summary.md`:
  `/tmp/zcodegraph-rust-phase3-real/`
- generated at: `2026-06-13T12:09:43.634Z`
- result: all Phase 3 gates passed
- package publishing: not performed
- default rollout: not performed; Rust remains opt-in

## Real Three-Repo Run

| Repo | Commit | Files copied | TypeScript | Rust | Slowdown | Gate |
|---|---|---:|---:|---:|---:|---|
| ZCodeGraph | `d77fce6` | 268 | 2029 ms | 2844 ms | 40.2% | pass |
| Excalidraw | `a83ac488` | 648 | 5229 ms | 6224 ms | 19.0% | pass |
| Zustand | `566b5bf` | 53 | 373 ms | 396 ms | 6.2% | pass |

The Phase 3 benchmark gate is bounded investigation, not a speedup requirement:
Rust must remain below 100% slower, must not show a material RSS regression when
RSS data is available, and must not regress sufficiency. RSS sampling returned
`null` on this macOS run, so no RSS improvement or regression is claimed.

| Gate | Status |
|---|---|
| Benchmark | pass |
| Profile | pass |
| Agent Sufficiency | pass |
| Failure-safety matrix | pass |
| Package smoke | pass |
| Default TypeScript smoke | pass |
| Explicit Rust smoke | pass |
| Diagnostics | pass |

## Repeatable Commands

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-profile.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand \
  --out /tmp/zcodegraph-rust-phase3/
node scripts/rust-package-smoke.mjs \
  --bundle /path/to/extracted/zcodegraph-linux-x64 \
  --npm-root /path/to/release/npm \
  --out /tmp/zcodegraph-rust-package-smoke/
```

The Phase 3 harness writes raw artifacts plus `summary.json` and `summary.md`.
`rust-index-profile.mjs` is still independently runnable for focused profiling.
`rust-package-smoke.mjs` consumes local bundle output and the local
`scripts/pack-npm.sh` output under `release/npm`; it does not publish packages,
create GitHub Releases, push tags, or contact the public npm registry.

## Finalization Subphases

`rust-index-profile.mjs` now records the following subphases for each target
repo:

| Field | Meaning |
|---|---|
| `frameworkPostExtractMs` | Framework post-extract finalization after Rust extraction. |
| `referenceResolutionMs` | TypeScript-side unresolved reference resolution. |
| `dynamicDispatchSynthesisMs` | Dynamic-dispatch synthesis surfaced from the resolver window. |
| `dbMaintenanceMs` | SQLite maintenance after finalization. |

Each repo result also includes `dominantFinalizationSubphase`.

## Pinned Validation Targets

| Repo | Role | Required evidence |
|---|---|---|
| ZCodeGraph | Self-hosting JS/TS indexing corpus | Passed at `d77fce6`. |
| Excalidraw | React/JSX flow corpus | Passed at `a83ac488`. |
| Zustand | Third-party TS store/action corpus | Passed at `566b5bf`. |

## Low-risk optimization conclusion

No additional TypeScript resolver or synthesizer rewrite is included in Phase 3.
The low-risk optimization decision is to expose subphase timings first and keep
ReferenceResolver, framework resolvers, and dynamic-dispatch synthesizers in
TypeScript. A future optimization may target the dominant subphase reported by
the three-repo profile, but Phase 3 does not speculate beyond the measured data.

This is intentional: changing the resolver/synthesizer layer without the new
subphase evidence would risk sufficiency regressions. The accepted Phase 3
optimization work is the profiling split itself, which makes the next low-risk
optimization measurable and reversible.

## Local bundle and packed npm smoke

Package smoke validation is a hard gate for Phase 3. The smoke path verifies:

- an extracted Unix bundle preserves `bin/zcodegraph` and `bin/zcodegraph-core`;
- default TypeScript indexing works from the bundle without invoking Rust;
- explicit `--engine rust` works from the bundle through the packaged Rust core;
- removing `bin/zcodegraph-core` makes explicit Rust indexing fail safely;
- the packed npm main package stays thin and has no `postinstall`;
- the matching optional platform package supplies `bin/zcodegraph-core` or
  `bin/zcodegraph-core.exe`;
- a local npx-like invocation works from the staged packages;
- missing optional platform package behavior is clear and does not attempt local
  Rust compilation.

The packed npm layout should be generated by `scripts/pack-npm.sh` from local
release bundles before running `rust-package-smoke.mjs`.

## Default-rollout readiness checklist

- [x] ZCodeGraph, Excalidraw, and Zustand all have pinned commits in the Phase 3
  harness output.
- [x] Benchmark output shows no Phase 3 bounded-performance regression.
- [x] Profile output includes `frameworkPostExtractMs`, `referenceResolutionMs`,
  `dynamicDispatchSynthesisMs`, `dbMaintenanceMs`, and
  `dominantFinalizationSubphase` for all three repos.
- [x] Agent Sufficiency output shows no Rust-vs-TypeScript regression for all
  three repos.
- [x] Failure-safety matrix output passes all hard-gated cases.
- [x] Local bundle and packed npm smoke output passes without real publishing.
- [x] Local diagnostics output is present in `status --json` and harness
  `summary.json`.
- [x] Default TypeScript indexing behavior is unchanged.
- [x] Rust remains opt-in through explicit `--engine rust` or
  `ZCODEGRAPH_INDEX_ENGINE=rust`.
- [x] No npm package, GitHub Release, tag, or default rollout has been
  performed.

## 7. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md`

# Rust Indexing Core Phase 4 Large-Target Readiness

Issue: #81

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Target

- Repository: https://github.com/microsoft/vscode
- Pinned commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Local target: `/private/tmp/codegraph-corpus/vscode-sparse`
- Checkout shape: blobless sparse checkout of `src`, `extensions`, `build`, `test`, `scripts`, and `.github`.
- Indexed file count: 11,291 JS/TS/JSX/TSX files.
- Acceptance field, indexed file count: 11,291.
- Acceptance field, outside the ordinary quick local test loop: yes.
- Phase 1 copied file count: 11,518 files, including JS/TS source and package/tsconfig/jsconfig files.

This is still the VS Code target, not a same-class replacement. The sparse
checkout keeps the long-running validation focused on the Rust JS/TS indexing
slice while preserving large-repo scale. It remains outside the ordinary quick
local test loop; run it only through the explicit long-running commands below.

## Raw Artifacts

- Profile raw JSON: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`
- Sufficiency raw JSON: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`
- Prompt file: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`

Commands:

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-profile.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse > /tmp/zcodegraph-rust-phase4-vscode-profile.json
node scripts/rust-sufficiency-guardrail.mjs \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-sufficiency.json
```

## Profile Summary

Single-run local profile on Apple M5, macOS Darwin 25.5.0, Node v26.0.0,
Rust 1.95.0. These are real measured results, not generated data, but they are
not a statistical benchmark.

| Engine | wall-clock | peak RSS | indexed files |
| --- | ---: | ---: | ---: |
| TypeScript | 224.8s | 1.30GB | 11,291 |
| Rust opt-in | 256.7s | 1.46GB | 11,291 |

Rust node/edge counts after TypeScript finalization: `557,770` nodes and
`1,648,219` edges. The run reported 46 parse errors in fixture and
prompt-heavy files; indexing still completed successfully.

## Rust Phase Timing

| Phase | time |
| --- | ---: |
| source scan | 204ms |
| parse extraction | 35,600ms |
| SQLite write | 75,859ms |
| TypeScript finalization | 126,948ms |
| subprocess startup / handoff | 5ms |

Finalization subphases:

| Subphase | time |
| --- | ---: |
| framework post-extract | 43ms |
| reference resolution | 115,939ms |
| dynamic dispatch synthesis | 9,805ms |
| DB maintenance | 783ms |

Dominant bottleneck: reference resolution during TypeScript finalization.

## Explore Sufficiency

Probe:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

| Engine | Flow section | Flow connected | missing expected | deterministic Read/Grep fallback risk |
| --- | --- | --- | ---: | ---: |
| TypeScript | yes | yes | 0 | 0 / 0 |
| Rust opt-in | yes | yes | 0 | 0 / 0 |

Conclusion: Rust indexing did not increase generic Read/Grep fallback risk on
the large-target Explore sufficiency probe. The probe is sufficient enough to
return a connected Flow section for both engines.

## Readiness Takeaway

Large-target readiness is mixed. The sufficiency signal passes, but Rust is not
faster than TypeScript on this VS Code run and uses more peak RSS. The result
supports keeping Rust opt-in while Phase 4 focuses on the dominant
finalization-side reference-resolution bottleneck before any default-rollout
decision.

## 8. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-optimization-trial.md`

# Rust Indexing Core Phase 4 Optimization Trial

Parent issue: [#80](https://github.com/jununfly/ZCodeGraph/issues/80)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

Baseline: [Rust Indexing Core Phase 4 Profile Baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)

## Summary

Result classification: `positive`.

The Phase 4 baseline identified `dynamicDispatchSynthesisMs` as the dominant
Rust-path finalization subphase on ZCodeGraph, Excalidraw, and Zustand. The
trial applies a bounded, behavior-equivalent optimization: full-graph dynamic
synthesizers now skip language-specific passes when the indexed project has no
files in those languages. The pass falls back to the historical behavior when
language statistics are unavailable.

The trial also records real dynamic-dispatch synthesis timing separately from
reference resolution timing. Before this change, the Rust finalization profile
conservatively assigned the whole resolver window to
`dynamicDispatchSynthesisMs` whenever any synthesized edge was emitted, which
made the next bottleneck harder to identify.

Rust remains opt-in.

## Hypothesis

Rust Phase 4 validation targets are JavaScript/TypeScript/JSX/TSX slices, but
the dynamic-dispatch finalization pass still ran language-specific full-graph
synthesizers for Go, Dart, C++, Kotlin, React Native native bridges, MyBatis,
Gin, Pascal forms, and other ecosystems that cannot match a JS/TS-only graph.

Skipping impossible language-specific passes should reduce measured
dynamic-dispatch synthesis time without changing graph semantics for applicable
JS/TS synthesizers such as callback channels, EventEmitter, React render, JSX
child, Vue, SvelteKit, and interface/implementation bridges.

## Raw Artifacts And Durability

- Before profile: `/tmp/zcodegraph-rust-phase4-profile-baseline.json` (local-only provenance)
- After profile: `/tmp/zcodegraph-rust-phase4-optimization-after.json` (local-only provenance)
- Sufficiency guardrail:
  `/tmp/zcodegraph-rust-phase4-optimization-sufficiency.json` (local-only provenance)

The `/tmp` raw artifact paths record where the original local runs wrote their
machine-readable outputs. They may not exist outside that machine or after
cleanup. This checked-in document is the durable source of truth for the Phase 4
optimization trial summary when those local-only raw artifacts are unavailable.

After profile generated at: `2026-06-13T13:33:19.761Z`

## Results

| Repo | Before dynamic synthesis | After dynamic synthesis | Drop | Before slowdown | After slowdown | Slowdown delta | Rust RSS before | Rust RSS after |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | 647 ms | 103 ms | 84.1% | 42.9% | 44.7% | 1.9 pp wider | 221,020,160 bytes | 216,399,872 bytes |
| Excalidraw | 2312 ms | 327 ms | 85.9% | 18.5% | 17.5% | 1.0 pp narrower | 303,022,080 bytes | 291,651,584 bytes |
| Zustand | 73 ms | 6 ms | 91.8% | 7.2% | 6.5% | 0.7 pp narrower | 92,880,896 bytes | 93,339,648 bytes |

The trial meets the Phase 4 positive threshold because the target subphase fell
by more than 15% on every hard-gate repository, with no material RSS regression
and no Agent Sufficiency regression detected by the guardrail.

## Guardrails

Targeted validation:

```bash
npm run build
npx vitest run \
  __tests__/callback-synthesizer-language-gating.test.ts \
  __tests__/field-channel-synthesizer.test.ts \
  __tests__/closure-collection-synthesizer.test.ts \
  __tests__/rust-index-engine-cli.test.ts \
  __tests__/rust-parity.test.ts \
  __tests__/rust-index-profile.test.ts
node scripts/rust-sufficiency-guardrail.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --repo zustand=/private/tmp/codegraph-corpus/zustand
```

Result:

- Build passed.
- Targeted Vitest suites passed: 6 test files, 27 tests.
- Sufficiency guardrail completed for ZCodeGraph, Excalidraw, and Zustand with
  no regressions reported.

## Notes

- This trial is intentionally bounded: it does not move ReferenceResolver,
  framework resolvers, dynamic-dispatch synthesizer implementations, Explore
  planning, or Explore rendering to Rust.
- The optimization does not reduce node coverage, edge coverage, heuristic
  coverage, or Agent Sufficiency policy.
- The improved timing split means later Phase 4 work can distinguish actual
  synthesis time from reference-resolution time instead of treating the shared
  resolver window as one opaque bottleneck.

## 9. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-profile-baseline.md`

# Rust Indexing Core Phase 4 Profile Baseline

Parent issue: [#78](https://github.com/jununfly/ZCodeGraph/issues/78)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Summary

Phase 4 profiling now records comparable TypeScript and Rust wall-clock/RSS
evidence plus Rust-path finalization subphases. This baseline is the input for
the Phase 4 data-driven optimization trial.

## Raw Artifacts And Durability

- `/tmp/zcodegraph-rust-phase4-profile-baseline.json` (local-only provenance)

The `/tmp` raw artifact path records where the original local run wrote its
machine-readable output. It may not exist outside that machine or after cleanup.
This checked-in document is the durable source of truth for the Phase 4 profile
baseline summary when the local-only raw artifact is unavailable.

Generated at: `2026-06-13T13:09:24.779Z`

Toolchain:

- Node: `v26.0.0`
- Platform: `darwin arm64`
- Rust: `rustc 1.95.0 (59807616e 2026-04-14)`
- Cargo: `cargo 1.95.0 (f2d3ce0bd 2026-03-21)`
- OS: `Darwin 25.5.0 arm64`
- CPU: `Apple M5`

## Results

| Repo | Commit | Files | TypeScript wall | TypeScript RSS | Rust wall | Rust RSS | Dominant finalization subphase |
|---|---:|---:|---:|---:|---:|---:|---|
| ZCodeGraph | `16c1071` | 269 | 2023 ms | 360,529,920 bytes | 2890 ms | 221,020,160 bytes | `dynamicDispatchSynthesisMs` |
| Excalidraw | `a83ac488` | 648 | 5292 ms | 552,730,624 bytes | 6271 ms | 303,022,080 bytes | `dynamicDispatchSynthesisMs` |
| Zustand | `566b5bf` | 53 | 377 ms | 457,818,112 bytes | 404 ms | 92,880,896 bytes | `dynamicDispatchSynthesisMs` |

## Finalization Subphases

| Repo | Framework post-extract | Reference resolution | Dynamic-dispatch synthesis | DB maintenance |
|---|---:|---:|---:|---:|
| ZCodeGraph | 3 ms | 0 ms | 647 ms | 5 ms |
| Excalidraw | 7 ms | 0 ms | 2312 ms | 8 ms |
| Zustand | 1 ms | 0 ms | 73 ms | 3 ms |

## Notes

- RSS sampling requires access to local process information. In the sandboxed
  development environment, the profiler reports a machine-readable
  `rssUnavailableReason`; the baseline above was collected outside that sandbox
  so `peakRssBytes` is valid for all three hard-gate repositories.
- This baseline does not claim Rust is ready to become the default engine.
  Rust remains opt-in while Phase 4 gathers optimization and rollout-readiness
  evidence.

## 10. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md`

# Rust Indexing Core Phase 4 Readiness Refresh

Parent issue: [#79](https://github.com/jununfly/ZCodeGraph/issues/79)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Summary

Phase 4 readiness refresh keeps the Rust JS/TS indexing path opt-in while
rechecking the non-performance gates: package smoke, CI artifact contract,
failure safety, diagnostics, and default TypeScript safety.

This refresh does not make Rust the default engine.

## Raw Artifacts And Durability

- Package smoke: `/tmp/zcodegraph-rust-phase4-readiness/package-smoke/summary.json` (local-only provenance)
- Failure-safety matrix:
  `/tmp/zcodegraph-rust-phase4-readiness/failure-safety-matrix/summary.json` (local-only provenance)

The `/tmp` raw artifact paths record where the original local runs wrote their
machine-readable outputs. They may not exist outside that machine or after
cleanup. This checked-in document is the durable source of truth for the Phase 4
readiness refresh summary when those local-only raw artifacts are unavailable.

## Package Smoke

Generated at: `2026-06-13T13:17:00.064Z`

| Gate | Status |
|---|---|
| Bundle default TypeScript indexing | pass |
| Bundle explicit Rust indexing | pass |
| Bundle missing Rust binary fails safely | pass |
| Bundle launcher path preserved | pass |
| npm default TypeScript indexing | pass |
| npm explicit Rust indexing | pass |
| npm optional platform Rust core present | pass |
| npm missing optional package fails clearly | pass |
| npm has no postinstall | pass |
| npm does not mention local Rust compilation | pass |
| npx-like local smoke | pass |

Package smoke was local-only: it did not publish packages, create releases,
push tags, or contact the public npm registry.

## Failure-Safety Matrix

Generated at: `2026-06-13T13:17:08.657Z`

| Case | Status |
|---|---|
| `missing-binary` | pass |
| `nonzero-before-index` | pass |
| `malformed-stdout-json` | pass |
| `crash-after-temp-db` | pass |
| `partial-temp-db-then-fail` | pass |
| `lock-contention` | pass |
| `stale-lock-recovery` | pass |
| `packaged-binary-removed` | pass |

Every matrix case preserved the previous TypeScript-produced active index,
avoided activating a partial Rust index, included an actionable next step, and
left default TypeScript indexing working afterward.

## Automated Coverage

Targeted validation run:

```bash
npx vitest run \
  __tests__/rust-phase3-validation.test.ts \
  __tests__/rust-package-smoke.test.ts \
  __tests__/rust-failure-safety-matrix.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/status-json.test.ts
```

Result: 5 test files passed, 19 tests passed.

The validation summary now exposes a `phase4Readiness` object and a human
readable "Phase 4 Readiness" table so package smoke, failure safety,
diagnostics, default TypeScript smoke, Rust smoke, and CI artifact contract
coverage are visible from the top-level artifact.

## 11. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md`

# Rust Indexing Core Phase 4 Reference Resolution Investigation

Issue: [#87](https://github.com/jununfly/ZCodeGraph/issues/87)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Raw profile: [2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json](2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json)

Raw sufficiency guardrail: [2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json](2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json)

## Scope

This is a focused single-run profile on the same large VS Code JS/TS sparse
checkout used by the Phase 4 readiness evidence. It is not a multi-run
benchmark and it does not claim end-to-end improvement over TypeScript.

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Profile date: 2026-06-13 UTC
- Node: `v22.21.1`
- Rust: `rustc 1.95.0`
- Indexed files: 11,291
- Phase 1 copied files: 11,518

## Focused Profile Result

The focused profile confirms that `referenceResolutionMs` remains the dominant
TypeScript finalization subphase on the VS Code target.

| Finalization subphase | Time |
| --- | ---: |
| framework post-extract | 42ms |
| reference resolution | 99,543ms |
| dynamic dispatch synthesis | 8,717ms |
| DB maintenance | 208ms |

The new reference-resolution breakdown identifies the dominant subpath as
`databaseAccessMs`, followed by `nameMatchingMs`.

| Reference-resolution subpath | Time | Interpretation |
| --- | ---: | --- |
| `databaseAccessMs` | 50,614ms | Dominant cost. Includes cache warm-up, unresolved-reference batch reads, edge materialization lookups, edge writes, and unresolved-reference cleanup writes. |
| `nameMatchingMs` | 36,808ms | Second-largest cost. Covers the generic name matcher after framework and import strategies do not return a high-confidence result. |
| `importResolutionMs` | 10,260ms | Material but not dominant. Covers import prefilter checks, JVM import resolution, and JS/TS import-based resolution. |
| `frameworkMatchingMs` | 1,022ms | Not the bottleneck for this VS Code JS/TS sparse checkout. |
| `otherResolutionMs` | 431ms | Built-in/external filtering, broad prefilter checks, and language-specific special cases. |

This answers the #87 taxonomy question: the bottleneck is primarily database
access inside reference resolution, with generic name matching as the next
largest subpath. It is not primarily import resolution or framework matching on
this target.

## Optimization Status

No end-to-end optimization was implemented in this issue. The code change adds
public profiler instrumentation so future optimization attempts can be judged
against the same subpath breakdown instead of treating `referenceResolutionMs`
as an opaque bucket.

Because no optimization was implemented, there is no before/after improvement
claim in this document. The actionable next optimization target is to reduce
the database-access portion of reference resolution first, then re-run this
focused profile and the VS Code sufficiency guardrail.

## Guardrails

The profile completed successfully and produced the same large-target graph
shape as the previous Phase 4 runs:

- Rust result: success.
- Files indexed: 11,291.
- Rust nodes/edges: 557,770 / 1,648,219.
- Parse errors: 46, already covered by the Phase 4 parse-error taxonomy.

RSS sampling was unavailable in this focused run because the local sandbox
blocked `ps` with `EPERM`; the raw profile records the machine-readable
unavailable reason instead of inventing RSS numbers.

The targeted VS Code sufficiency guardrail was re-run after adding the
reference-resolution instrumentation. The configured `VS-1` prompt returned
`no regression` for both TypeScript and Rust indexes, with deterministic
Read/Grep fallback-risk signals of `0 / 0` for both engines.

## Rollout Decision

This remains a default-rollout blocker. Phase 4 must stay on the
`continue opt-in + targeted blockers` path until a follow-up optimization shows
that the large-repo reference-resolution database-access cost is reduced while
preserving Explore sufficiency and graph quality.

## 12. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md`

# Rust Indexing Core Phase 4 Results And Decision

Issue: [#82](https://github.com/jununfly/ZCodeGraph/issues/82)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Decision

Branch B: continue opt-in hardening.

Branch A is not chosen. Phase 4 produced useful readiness evidence, including
valid RSS sampling, a positive bounded optimization trial, package/failure
safety refreshes, and a connected large-target Explore sufficiency probe. The
evidence does not support preparing a default-rollout plan yet.

Phase 4 decision-producing evidence is complete. Branch A/default-rollout gates did not pass.
Phase 4 completes as a stop/continue decision rather than as a default-rollout
readiness approval.

Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows until a later default-rollout plan explicitly changes that.

## Evidence Summary

Phase 4 results are real local measurements and smoke outputs, not generated
placeholder data. They are still single-run local evidence unless explicitly
called out otherwise.

## Evidence Durability Policy

Repo-relative `docs/benchmarks/` raw JSON files are durable checked-in evidence.
`/tmp` raw artifact paths are local-only provenance from the original machine
runs and may be unavailable after that run. When a `/tmp` raw artifact is
unavailable, the checked-in human-readable summary named beside that artifact is
the authoritative durable summary. This document does not invent or rewrite
benchmark numbers; it only records which evidence is checked in and which
evidence is local provenance.

Raw artifact locations:

- Profile baseline: `/tmp/zcodegraph-rust-phase4-profile-baseline.json` (local-only provenance; authoritative summary: [Profile baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md))
- Optimization after-profile: `/tmp/zcodegraph-rust-phase4-optimization-after.json` (local-only provenance; authoritative summary: [Optimization trial](2026-06-13-rust-indexing-core-phase-4-optimization-trial.md))
- Optimization sufficiency: `/tmp/zcodegraph-rust-phase4-optimization-sufficiency.json` (local-only provenance; authoritative summary: [Optimization trial](2026-06-13-rust-indexing-core-phase-4-optimization-trial.md))
- Readiness package smoke: `/tmp/zcodegraph-rust-phase4-readiness/package-smoke/summary.json` (local-only provenance; authoritative summary: [Readiness refresh](2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md))
- Readiness failure-safety matrix: `/tmp/zcodegraph-rust-phase4-readiness/failure-safety-matrix/summary.json` (local-only provenance; authoritative summary: [Readiness refresh](2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md))
- VS Code profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`
- VS Code sufficiency:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`
- VS Code sufficiency prompt:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`
- Supported Node 22 VS Code profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`
- Supported Node 22 VS Code sufficiency:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`
- VS Code reference-resolution focused profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json`
- VS Code reference-resolution sufficiency rerun:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json`
- VS Code syntax-gap targeted rerun:
  `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json`
- VS Code syntax-gap full sparse-checkout rerun:
  `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json`

Human-readable summaries:

- [Profile baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)
- [Optimization trial](2026-06-13-rust-indexing-core-phase-4-optimization-trial.md)
- [Readiness refresh](2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md)
- [Large-target readiness](2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md)
- [Supported Node rerun](2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md)
- [VS Code parse-error taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md)
- [Reference-resolution investigation](2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md)
- [VS Code syntax-gap resolution](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md)

## Benchmark Results And RSS Evidence

Hard-gate baseline profile:

| Repo | Files | TypeScript wall | TypeScript RSS | Rust wall | Rust RSS | Dominant subphase |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| ZCodeGraph | 269 | 2023ms | 360,529,920 bytes | 2890ms | 221,020,160 bytes | `dynamicDispatchSynthesisMs` |
| Excalidraw | 648 | 5292ms | 552,730,624 bytes | 6271ms | 303,022,080 bytes | `dynamicDispatchSynthesisMs` |
| Zustand | 53 | 377ms | 457,818,112 bytes | 404ms | 92,880,896 bytes | `dynamicDispatchSynthesisMs` |

RSS evidence is valid for the local macOS runs above. The profiler now records
machine-readable RSS unavailable reasons when sampling cannot observe a process
tree.

The hard-gate repos showed no Rust RSS material regression in the baseline.
End-to-end wall-clock remained mixed: Rust was close on Zustand and Excalidraw,
but slower on ZCodeGraph.

## Optimization Trend Classification

Optimization trend classification: `positive`.

The bounded optimization skipped impossible language-specific full-graph
dynamic-dispatch synthesizer passes for JS/TS-only graphs and preserved the
previous fallback behavior when language statistics are unavailable.

| Repo | Before dynamic synthesis | After dynamic synthesis | Drop |
| --- | ---: | ---: | ---: |
| ZCodeGraph | 647ms | 103ms | 84.1% |
| Excalidraw | 2312ms | 327ms | 85.9% |
| Zustand | 73ms | 6ms | 91.8% |

Guardrails passed: build, targeted Vitest suites, and the hard-gate
`rust-sufficiency-guardrail.mjs` run reported no regressions.

## Large-Target Readiness Evidence

Phase 4 validated on a large VS Code JS/TS sparse checkout, not on full VS Code.

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Indexed JS/TS/JSX/TSX files: 11,291
- TypeScript profile: 224.8s, peak RSS 1.30GB
- Rust opt-in profile: 256.7s, peak RSS 1.46GB
- Rust node/edge counts: 557,770 / 1,648,219
- Parse errors: 46
- Dominant bottleneck: `referenceResolutionMs`

Large-target finalization subphases:

| Subphase | Time |
| --- | ---: |
| framework post-extract | 43ms |
| reference resolution | 115,939ms |
| dynamic dispatch synthesis | 9,805ms |
| DB maintenance | 783ms |

The Explore sufficiency probe returned connected Flow sections for both
TypeScript and Rust indexes. Deterministic Read/Grep fallback-risk signals were
`0 / 0` for both engines, with no regressions reported.

The supported Node 22 rerun confirmed the same large-target shape:

- Node v22.21.1 is within the supported package range.
- TypeScript profile: 221.4s, peak RSS 1.64GB.
- Rust opt-in profile: 239.7s, peak RSS 1.61GB.
- Rust node/edge counts: 557,770 / 1,648,219.
- Dominant bottleneck: `referenceResolutionMs`.
- Sufficiency probe: connected Flow sections for both engines, with `0 / 0`
  deterministic Read/Grep fallback-risk signals.

The #87 reference-resolution investigation split `referenceResolutionMs` into
subpaths on the same VS Code sparse checkout. The dominant subpath was
`databaseAccessMs` at 50,614ms, followed by `nameMatchingMs` at 36,808ms,
`importResolutionMs` at 10,260ms, `frameworkMatchingMs` at 1,022ms, and
`otherResolutionMs` at 431ms. This keeps reference resolution as a
default-rollout blocker until a targeted optimization reduces the database
access cost without regressing sufficiency.

The matching targeted sufficiency rerun reported `no regression` for both
TypeScript and Rust on the configured VS Code prompt, with deterministic
Read/Grep fallback-risk signals of `0 / 0` for both engines.

The #88 syntax-gap fix removed every real supported JS/TS syntax-gap path from
the VS Code parse-error set. A full Rust-core parse rerun on the same sparse
checkout reduced parse errors from 46 to 29; the remaining errors are the
malformed fixture, prompt/generated, or compiler-scale colorization fixture
paths already classified by the taxonomy.

The #91 reference-resolution database-access optimization added public DB
sub-buckets and attempted bounded optimizations for edge materialization and
unresolved-reference cleanup. The VS Code after-profile preserved sufficiency
but did not reduce `databaseAccessMs` enough to meet the optimization threshold:
`databaseAccessMs` was 53,038ms and `nameMatchingMs` was 53,205ms. The #87
default-rollout blocker is still unresolved.

## Package Smoke, Diagnostics, And Failure-Safety

Package smoke passed for:

- bundle default TypeScript indexing;
- bundle explicit Rust indexing;
- bundle missing Rust binary behavior;
- npm default TypeScript indexing;
- npm explicit Rust indexing;
- optional platform Rust core presence;
- missing optional package diagnostics;
- no local Rust compilation;
- npx-like local smoke.

Diagnostics passed through the Phase 3 validation harness and status JSON
coverage. The validation summary exposes `phase4Readiness` so package smoke,
failure safety, diagnostics, default TypeScript smoke, Rust smoke, and CI
artifact contract coverage are visible from the top-level artifact.

Failure-safety passed for missing binary, nonzero Rust subprocess exit,
malformed Rust stdout JSON, crash-after-temp-db, partial temp DB failure,
lock contention, stale lock recovery, and packaged-binary-removed cases.

## Gate Result

Branch A is blocked.

Blocking gates:

- Large-target performance is not ready: Rust was slower than TypeScript on
  the VS Code sparse checkout and used more peak RSS.
- The large-target dominant bottleneck is TypeScript finalization,
  specifically `referenceResolutionMs`, not Rust parse extraction.
- The supported Node 22 rerun still shows `referenceResolutionMs` as the
  large-target dominant bottleneck, even though Rust wall-clock improved versus
  the original Node 26 evidence.
- The #87 reference-resolution investigation identifies `databaseAccessMs` as
  the dominant subpath inside `referenceResolutionMs`, so the blocker is now
  targeted but not resolved.
- The VS Code parse-error taxonomy found no unknown errors. The later #88
  syntax-gap fix moved all 16 real supported JS/TS paths out of the parse-error
  set, so syntax gaps are no longer a default-rollout blocker.

Follow-up blockers:

- [#85](https://github.com/jununfly/ZCodeGraph/issues/85): completed supported
  Node 22 VS Code readiness smoke.
- [#86](https://github.com/jununfly/ZCodeGraph/issues/86): classify VS Code
  large-target parse errors.
- [#88](https://github.com/jununfly/ZCodeGraph/issues/88): fixed the real
  JS/TS syntax-gap subset surfaced by the taxonomy.
- [#87](https://github.com/jununfly/ZCodeGraph/issues/87): completed
  reference-resolution investigation; `databaseAccessMs` is the largest
  subpath and remains a default-rollout blocker until optimized.
- [#91](https://github.com/jununfly/ZCodeGraph/issues/91): attempted bounded
  reference-resolution DB optimizations; sufficiency stayed green, but the
  default-rollout blocker is still unresolved.

Branch C is not chosen. The Rust path still passes sufficiency checks, package
smoke, failure-safety, diagnostics, and a positive bounded optimization trial.
The evidence supports continued hardening rather than stopping Rust expansion
or reassessing the Rust-core/TypeScript-shell boundary.

## Release-Cycle Evidence

Release-cycle evidence remains future work before any default engine change.
Because Branch A is not chosen, Phase 4 does not schedule a default engine
change.

Before any later default-rollout plan can change the default engine, it still
must account for:

- at least one official release carrying Rust core optional platform packages;
- post-release npm/npx explicit `--engine rust` smoke on macOS, Linux, and
  Windows;
- no unresolved packaging or install blockers from that release;
- bug reports separable by TypeScript/Rust engine metadata;
- a rollback plan that can restore TypeScript as the default without changing
  the MCP protocol or installer surface.

## 13. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md`

# Rust Indexing Core Phase 4 Supported Node Rerun

Issue: [#85](https://github.com/jununfly/ZCodeGraph/issues/85)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

## Summary

The VS Code readiness smoke was rerun under Node v22.21.1, which is within the
supported package range (`>=20.0.0 <25.0.0`). This confirms the #81 Node 26
large-target conclusion was not just a Node 26 runtime artifact.

The rerun keeps Rust opt-in and does not require Rust to beat TypeScript end to
end.

## Target

- Repository: `https://github.com/microsoft/vscode`
- Pinned commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Target shape: large VS Code JS/TS sparse checkout, not full VS Code.
- Indexed file count: 11,291 JS/TS/JSX/TSX files.
- Runtime: Node v22.21.1.

## Raw Artifacts

- Profile raw JSON:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`
- Sufficiency raw JSON:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`
- Prompt file:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`

Commands:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node \
  scripts/rust-index-profile.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-node22-profile.json

/private/tmp/node-v22.21.1-darwin-arm64/bin/node \
  scripts/rust-sufficiency-guardrail.mjs \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-node22-sufficiency.json
```

## Profile Smoke

| Engine | wall-clock | peak RSS | indexed files |
| --- | ---: | ---: | ---: |
| TypeScript | 221.4s | 1.64GB | 11,291 |
| Rust opt-in | 239.7s | 1.61GB | 11,291 |

Rust node/edge counts: `557,770` nodes and `1,648,219` edges. The run reported
46 parse errors, matching the earlier large-target evidence classified by the
[VS Code parse-error taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md).

Finalization subphases:

| Subphase | time |
| --- | ---: |
| framework post-extract | 39ms |
| reference resolution | 93,061ms |
| dynamic dispatch synthesis | 8,125ms |
| DB maintenance | 102ms |

Dominant bottleneck: `referenceResolutionMs`.

## Sufficiency Probe

Probe:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

| Engine | Flow section | Flow connected | missing expected | deterministic Read/Grep fallback-risk |
| --- | --- | --- | ---: | ---: |
| TypeScript | yes | yes | 0 | 0 / 0 |
| Rust opt-in | yes | yes | 0 | 0 / 0 |

The sufficiency probe reported no regressions. Rust indexing did not increase
deterministic Read/Grep fallback-risk under Node 22.

## Node 26 Comparison

The supported-runtime profile materially improves the Rust large-target
wall-clock result compared with the Node 26 #81 run, but it does not change the
Phase 4 decision.

| Runtime | TypeScript wall | Rust wall | Rust RSS | Dominant bottleneck |
| --- | ---: | ---: | ---: | --- |
| Node v26.0.0 | 224.8s | 256.7s | 1.46GB | `referenceResolutionMs` |
| Node v22.21.1 | 221.4s | 239.7s | 1.61GB | `referenceResolutionMs` |

The supported Node result confirms the same rollout blocker: the large-target
dominant cost is still TypeScript finalization, specifically
`referenceResolutionMs`. Phase 4 should continue with opt-in hardening rather
than preparing a default-rollout plan.

## 14. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`

```json
{
  "generatedAt": "2026-06-13T15:46:30.832Z",
  "toolchain": {
    "node": "v22.21.1",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-nlP2Ur",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 221429,
          "peakRssBytes": 1637269504,
          "rssUnavailableReason": null
        },
        "rust": {
          "engine": "rust",
          "wallMs": 239702,
          "peakRssBytes": 1605582848,
          "rssUnavailableReason": null
        }
      },
      "wallMs": 224279,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 46,
        "nodesCreated": 557770,
        "edgesCreated": 1648219,
        "durationMs": 122544,
        "errors": [
          {
            "message": "build/next/index.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/test/copilotCLIPrompt.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/platform/telemetry/common/telemetry.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/code/electron-browser/workbench/workbench.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/browserView/electron-browser/preload-browserView.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/tunnel/test/node/tunnelProxy.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/sessions/electron-browser/sessions.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/issue/browser/issueFormService.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 160,
        "parseExtractionMs": 34293,
        "sqliteWriteMs": 76546,
        "typescriptFinalizationMs": 101685,
        "subprocessStartupHandoffMs": 4
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 39,
        "referenceResolutionMs": 93061,
        "dynamicDispatchSynthesisMs": 8125,
        "dbMaintenanceMs": 102
      },
      "dominantFinalizationSubphase": "referenceResolutionMs"
    }
  ]
}
```

## 15. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-13T15:54:08.264Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v22.21.1",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25197,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 16. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md`

# Rust Indexing Core Phase 4 VS Code Parse-Error Taxonomy

Issue: [#86](https://github.com/jununfly/ZCodeGraph/issues/86)

Source artifact: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`

Parent large-target evidence: [Rust Indexing Core Phase 4 Large-Target Readiness](2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md)

## Summary

The VS Code large-target Rust profile reported 46 parse errors. Phase 4 does
not require zero parse errors on this target, but it does require a taxonomy so
default-rollout decisions do not hide real JS/TS parser coverage gaps.

Taxonomy counts:

| Category | Count | Follow-up |
| --- | ---: | --- |
| Intentional invalid fixture / malformed test input | 15 | none |
| Generated or prompt-heavy source not meant as normal app code | 15 | none |
| Real supported JS/TS syntax gap | 16 | [#88](https://github.com/jununfly/ZCodeGraph/issues/88) |
| Unknown | 0 | none |

Unknown share is 0/46, so the taxonomy itself does not block default rollout.
The real supported JS/TS syntax-gap bucket remains a default rollout blocker
until #88 is resolved or the limitations are explicitly accepted.

## Classification Table

| Path | Category | Rationale |
| --- | --- | --- |
| `build/next/index.ts` | Real supported JS/TS syntax gap | Normal build source; uses supported TypeScript/ESM syntax such as JSON import attributes. |
| `extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/prompt/node/intentDetector.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/test/copilotCLIPrompt.spec.ts` | Generated or prompt-heavy source not meant as normal app code | Prompt-focused test source; useful for prompt rendering, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/panel/search.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts` | Intentional invalid fixture / malformed test input | TypeScript-context fixture source, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts` | Intentional invalid fixture / malformed test input | TypeScript-context fixture source, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts` | Real supported JS/TS syntax gap | Normal TypeScript source; includes namespace/type patterns that should be reduced under #88. |
| `extensions/copilot/src/platform/telemetry/common/telemetry.ts` | Real supported JS/TS syntax gap | Normal TypeScript source with decorators/parameter injection; not a malformed fixture. |
| `extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js` | Intentional invalid fixture / malformed test input | Scenario fixture contains intentionally incomplete JavaScript. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains syntax/lint errors. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains syntax/lint errors. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains TypeScript compiler errors. |
| `extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts` | Generated or prompt-heavy source not meant as normal app code | Copied TypeScript compiler-scale colorization fixture, not normal application source. |
| `src/vs/code/electron-browser/workbench/workbench.ts` | Real supported JS/TS syntax gap | Normal VS Code source; includes type declarations inside an async IIFE. |
| `src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts` | Real supported JS/TS syntax gap | Normal TypeScript source, not an intentionally malformed fixture. |
| `src/vs/platform/browserView/electron-browser/preload-browserView.ts` | Real supported JS/TS syntax gap | Normal TypeScript preload source, not an intentionally malformed fixture. |
| `src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/files/test/node/fixtures/service/deep/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/tunnel/test/node/tunnelProxy.test.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `src/vs/sessions/electron-browser/sessions.ts` | Real supported JS/TS syntax gap | Normal VS Code source; includes type declarations inside an async IIFE. |
| `src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `src/vs/workbench/contrib/issue/browser/issueFormService.ts` | Real supported JS/TS syntax gap | Normal TypeScript source with decorators/parameter injection; not a malformed fixture. |
| `src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts` | Real supported JS/TS syntax gap | Normal TypeScript integration test source, not an intentionally malformed fixture. |
| `src/vs/workbench/services/search/test/node/fixtures/examples/employee.js` | Intentional invalid fixture / malformed test input | Search fixture, not a normal application module. |

## Decision Impact

This taxonomy removed the generic "unknown parse errors" blocker from Phase 4.
#88 later fixed the 16 real supported JS/TS syntax-gap paths; see
[Rust Indexing Core Phase 4 VS Code Syntax Gap Resolution](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md).
Rust still is not ready for default rollout because #87 identified the
large-repo reference-resolution database-access bottleneck as a remaining
default-rollout blocker.

## 17. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-13T14:07:08.492Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-XmLo41",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 224835,
          "peakRssBytes": 1296039936,
          "rssUnavailableReason": null
        },
        "rust": {
          "engine": "rust",
          "wallMs": 256661,
          "peakRssBytes": 1461370880,
          "rssUnavailableReason": null
        }
      },
      "wallMs": 250363,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 46,
        "nodesCreated": 557770,
        "edgesCreated": 1648219,
        "durationMs": 123372,
        "errors": [
          {
            "message": "build/next/index.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/test/copilotCLIPrompt.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/platform/telemetry/common/telemetry.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/code/electron-browser/workbench/workbench.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/browserView/electron-browser/preload-browserView.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/tunnel/test/node/tunnelProxy.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/sessions/electron-browser/sessions.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/issue/browser/issueFormService.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 204,
        "parseExtractionMs": 35600,
        "sqliteWriteMs": 75859,
        "typescriptFinalizationMs": 126948,
        "subprocessStartupHandoffMs": 5
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 43,
        "referenceResolutionMs": 115939,
        "dynamicDispatchSynthesisMs": 9805,
        "dbMaintenanceMs": 783
      },
      "dominantFinalizationSubphase": "referenceResolutionMs"
    }
  ]
}
```

## 18. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json`

```json
{
  "generatedAt": "2026-06-13T16:19:23.276Z",
  "toolchain": {
    "node": "v22.21.1",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode-sparse",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-ZOXPTW",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 215267,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 237108,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 234862,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 46,
        "nodesCreated": 557770,
        "edgesCreated": 1648219,
        "durationMs": 125927,
        "errors": [
          {
            "message": "build/next/index.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/test/copilotCLIPrompt.spec.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/platform/telemetry/common/telemetry.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/code/electron-browser/workbench/workbench.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/browserView/electron-browser/preload-browserView.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/tunnel/test/node/tunnelProxy.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/sessions/electron-browser/sessions.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/issue/browser/issueFormService.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 164,
        "parseExtractionMs": 35475,
        "sqliteWriteMs": 78590,
        "typescriptFinalizationMs": 108891,
        "subprocessStartupHandoffMs": 4
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 42,
        "referenceResolutionMs": 99543,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 10260,
          "nameMatchingMs": 36808,
          "frameworkMatchingMs": 1022,
          "databaseAccessMs": 50614,
          "otherResolutionMs": 431
        },
        "dynamicDispatchSynthesisMs": 8717,
        "dbMaintenanceMs": 208
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 10260,
        "nameMatchingMs": 36808,
        "frameworkMatchingMs": 1022,
        "databaseAccessMs": 50614,
        "otherResolutionMs": 431
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "databaseAccessMs"
    }
  ]
}
```

## 19. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-13T16:29:04.811Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v22.21.1",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25197,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 20. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`

```json
{
  "vscode": [
    {
      "id": "VS-1",
      "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
      "expected": [
        "AbstractExtensionService",
        "_createExtensionHostManager",
        "_doCreateExtensionHostManager",
        "ExtensionHostManager",
        "start",
        "ExtensionHostMain",
        "MainThreadExtensionService"
      ]
    }
  ]
}
```

## 21. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-13T14:17:00.237Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25197,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 22. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-results-and-decision.md`

# Rust Indexing Core Phase 10 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issues: #49, #113

Tracker: #130

Implementation issues: #125, #126, #127, #128, #129

## Decision

Phase 10 classification: **bounded success with commit drift**.

Phase 10 corrected the VS Code `VS-1` validation target enough to re-baseline the deterministic graph question. The corrected local target used for validation was a large VS Code sparse checkout at commit `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`, not the originally requested `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`. This is explicit commit drift, not hidden equivalence.

On that corrected drift target, all seven `VS-1` expected symbols had indexed candidates and `zcodegraph_explore` produced a connected Flow section. That means the Phase 9/#113 failure mode is reclassified from a proven graph coverage gap to a **corpus problem in the old sparse target**. The remaining deterministic blocker class is `ambiguous-symbol` for `start`, not missing symbols or a missing Flow section.

The corrected-target sufficiency smoke was attempted once, but it produced no machine-readable output before the bounded wait ended and was interrupted. Therefore Phase 10 does not produce a TypeScript-vs-Rust sufficiency comparison on the corrected target.

Phase 10 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Corrected Target Contract

Validated local target:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Local path provenance: local-only
- Expected VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Actual VS Code commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Commit drift: explicit and accepted only for this Phase 10 re-baseline evidence
- Sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Copied JS/TS/config file count: 11518
- Indexed JS/TS file count: 11098

The target is larger than the old Phase 7 sparse checkout and includes the workbench/API/extension-host files needed for `VS-1`.

## Checkout Instructions

For an exact-commit corrected target, use:

```bash
git clone --filter=blob:none --sparse https://github.com/microsoft/vscode.git /private/tmp/zcodegraph-phase10-vscode-vs1
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 checkout 4ac5322601c6985aba4cd9349c23f4ef22dc3e65
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 sparse-checkout set .github build extensions scripts src test
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 sparse-checkout list
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 rev-parse HEAD
find /private/tmp/zcodegraph-phase10-vscode-vs1 -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name 'package.json' -o -name 'tsconfig.json' -o -name 'jsconfig.json' \) | wc -l
```

Then index and validate:

```bash
npm run build
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js init /private/tmp/zcodegraph-phase10-vscode-vs1
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js index /private/tmp/zcodegraph-phase10-vscode-vs1 --force --quiet
node scripts/phase10-vs1-target-validator.mjs --repo /private/tmp/zcodegraph-phase10-vscode-vs1 --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json
```

No sufficiency smoke should run unless the validator reports `sufficiencySmokeAllowed: true`.

## Artifacts

- Target validator raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json)
- Deterministic probe raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json)
- Sufficiency smoke raw JSON: [2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json)

## Validator Result

Validator command:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `sufficiencySmokeAllowed`: `true`
- `missingSymbols`: `[]`
- `start` ambiguity count: 138

Per-token candidate count:

| Token | Candidate count |
|---|---:|
| `AbstractExtensionService` | 1 |
| `_createExtensionHostManager` | 1 |
| `_doCreateExtensionHostManager` | 2 |
| `ExtensionHostManager` | 1 |
| `start` | 138 |
| `ExtensionHostMain` | 1 |
| `MainThreadExtensionService` | 1 |

## Deterministic Probe Result

Probe command:

```bash
node scripts/phase9-vs1-graph-probe.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json
```

Probe result:

- Explore output chars: 21857
- Flow section: `true`
- Flow connected: `true`
- Primary classification: `ambiguous-symbol`

Per-token classification:

| Token | Classification | Candidate count |
|---|---|---:|
| `AbstractExtensionService` | `expected-runtime-boundary` | 1 |
| `_createExtensionHostManager` | `expected-runtime-boundary` | 1 |
| `_doCreateExtensionHostManager` | `expected-runtime-boundary` | 2 |
| `ExtensionHostManager` | `expected-runtime-boundary` | 1 |
| `start` | `ambiguous-symbol` | 138 |
| `ExtensionHostMain` | `expected-runtime-boundary` | 1 |
| `MainThreadExtensionService` | `expected-runtime-boundary` | 1 |

## Sufficiency Smoke Result

Smoke command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  > docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json
```

Result:

- `status`: `unavailable`
- Reason: one corrected-target sufficiency smoke was attempted, produced no machine-readable stdout after roughly 4.5 minutes, and was interrupted with SIGINT.
- Flow section: unavailable
- Flow connected: unavailable
- Missing expected symbols: unavailable
- Deterministic Read/Grep fallback risk: unavailable
- Rust-specific regression: unavailable
- TypeScript-vs-Rust comparison: unavailable

This satisfies the Phase 10 bounded smoke requirement by recording an explicit unavailable reason. It does not support any TypeScript-vs-Rust sufficiency claim.

## Status Of #113

#113 should be closed or replaced with narrower wording. Its old premise is no longer supported:

- On the old Phase 7/8 sparse target, six of seven `VS-1` symbols were absent, so the old evidence was a corpus problem.
- On the corrected drift target, all seven symbols are present and deterministic Explore produces a connected Flow section.

The remaining useful follow-up is not "VS Code `VS-1` lacks Flow section" as stated in #113. If follow-up is needed, it should be narrower: make corrected-target sufficiency smoke complete within a bounded runtime and then compare TypeScript vs Rust on that target.

## Conclusion

Phase 10 re-baselined `VS-1` against a target that actually contains the expected symbols. Deterministic graph evidence now connects the flow, so the original #113 graph gap is not reproduced on the corrected target. The next blocker is operational sufficiency-smoke runtime/completion, not symbol coverage or deterministic Explore Flow connectivity.

## 23. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json`

```json
{
  "generatedAt": "2026-06-14T15:26:36.231Z",
  "repo": {
    "path": "/private/tmp/codegraph-corpus/vscode-sparse",
    "commit": "275e1b31"
  },
  "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
  "tokens": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "explore": {
    "outputChars": 21857,
    "hasFlowSection": true,
    "flowConnected": true
  },
  "summary": {
    "primaryClassification": "ambiguous-symbol",
    "taxonomy": [
      "missing-symbol",
      "ambiguous-symbol",
      "missing-static-edge",
      "missing-synthesized-edge",
      "explore-planner-pathfinding-gap",
      "expected-runtime-boundary"
    ]
  },
  "classifications": [
    {
      "token": "AbstractExtensionService",
      "classification": "expected-runtime-boundary",
      "candidateCount": 1,
      "callableCandidateCount": 0,
      "candidates": [
        {
          "id": "class:5614800952da674403f4da9c2457be5d",
          "kind": "class",
          "name": "AbstractExtensionService",
          "qualifiedName": "AbstractExtensionService",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 60,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    },
    {
      "token": "_createExtensionHostManager",
      "classification": "expected-runtime-boundary",
      "candidateCount": 1,
      "callableCandidateCount": 1,
      "candidates": [
        {
          "id": "method:4e7c5f7b23e454b3fa9635eabffe16df",
          "kind": "method",
          "name": "_createExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_createExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 842,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    },
    {
      "token": "_doCreateExtensionHostManager",
      "classification": "expected-runtime-boundary",
      "candidateCount": 2,
      "callableCandidateCount": 2,
      "candidates": [
        {
          "id": "method:75c6a9f14fbd9ad890eb4e443a6d3385",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 864,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "method:df429fc1cbac2b11eca3b2ffadce235d",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "MyTestExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/test/browser/extensionService.test.ts",
          "startLine": 200,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    },
    {
      "token": "ExtensionHostManager",
      "classification": "expected-runtime-boundary",
      "candidateCount": 1,
      "callableCandidateCount": 0,
      "candidates": [
        {
          "id": "class:aa28f1d35cafbd522cede21158da963a",
          "kind": "class",
          "name": "ExtensionHostManager",
          "qualifiedName": "ExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/extensionHostManager.ts",
          "startLine": 58,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    },
    {
      "token": "start",
      "classification": "ambiguous-symbol",
      "candidateCount": 138,
      "callableCandidateCount": 126,
      "candidates": [
        {
          "id": "method:7b404b2424ad94975e97941e0a3a33c7",
          "kind": "method",
          "name": "start",
          "qualifiedName": "activate::Runs::start",
          "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
          "startLine": 131,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "function:e4e6242f8787008c305f86ced2cee776",
              "otherName": "activate",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
              "kind": "calls",
              "line": 175,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": []
        },
        {
          "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
          "kind": "method",
          "name": "start",
          "qualifiedName": "LanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
          "startLine": 323,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:b340f016ad0e753bb4af89c05a531001",
              "otherName": "provideModelProxy",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/externalAgents/node/modelProxyProvider.ts",
              "kind": "calls",
              "line": 19,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "function:ee1838a97dd37d3a37ee85f02ebc4bae",
              "otherName": "startFakeTelemetryServerIfNecessary",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/platform/test/node/telemetryFake.ts",
              "kind": "calls",
              "line": 74,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:78981ced116538f63df3ce1009d4a149",
              "otherName": "trigger",
              "otherKind": "method",
              "otherFilePath": "extensions/github-authentication/src/flows.ts",
              "kind": "calls",
              "line": 358,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/github-authentication/src/test/node/authServer.test.ts",
              "otherName": "authServer.test.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/github-authentication/src/test/node/authServer.test.ts",
              "kind": "calls",
              "line": 16,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/github-authentication/src/test/node/authServer.test.ts",
              "otherName": "authServer.test.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/github-authentication/src/test/node/authServer.test.ts",
              "kind": "calls",
              "line": 74,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:d5e27e6d07b86aae25932231ff2aa943",
              "otherName": "listen",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/snippy/connectionState.ts",
              "kind": "calls",
              "line": 325,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:ab8b97e9a4162d72efdf6a568006a057",
              "otherName": "address",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/test/simulation/fixtures/doc/issue-6406/debugModel.ts",
              "kind": "calls",
              "line": 326,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:b6fc63bc54ee7c9fed94ebf12de13232",
              "otherName": "trace",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chat/vscode-node/test/chatDebugFileLoggerService.spec.ts",
              "kind": "calls",
              "line": 332,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:b060392463bb0c8f89c503a292145620",
              "otherName": "resolve",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessionContext/vscode-node/chatSessionContextProvider.ts",
              "kind": "calls",
              "line": 333,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:c6e06c449351c35f657a71c92550d8bf",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MockLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
          "startLine": 15,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "method:1fc45442df97184181c9f455a534d924",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
          "startLine": 312,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:6bf6769a1b442ed377219aa5a14706ce",
              "otherName": "getLangModelServer",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeCodeAgent.ts",
              "kind": "calls",
              "line": 53,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:2acba4c4357d881c71e6cba6afbfbb6e",
              "otherName": "_getLanguageModelServer",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/claude/vscode-node/slashCommands/terminalCommand.ts",
              "kind": "calls",
              "line": 164,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:d5e27e6d07b86aae25932231ff2aa943",
              "otherName": "listen",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/snippy/connectionState.ts",
              "kind": "calls",
              "line": 319,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:ab8b97e9a4162d72efdf6a568006a057",
              "otherName": "address",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/test/simulation/fixtures/doc/issue-6406/debugModel.ts",
              "kind": "calls",
              "line": 320,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:d73f09887e26bcacb589a9bb3603794f",
              "otherName": "info",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
              "kind": "calls",
              "line": 326,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:66f7469dbc7b5d801c3edd66eba2dd7d",
              "otherName": "resolve",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/claude/node/test/skillConfigLocations.spec.ts",
              "kind": "calls",
              "line": 327,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:3c61c7b006e07030f25212ea9eb50847",
              "otherName": "reject",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/util/async.ts",
              "kind": "calls",
              "line": 331,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "InProcHttpServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
          "startLine": 99,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:69a8f15fd4c0d0a9ac861c4ba8fdd1fb",
              "otherName": "_startFleetAndWaitForIdle",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/node/copilotcliSession.ts",
              "kind": "calls",
              "line": 1893,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:b87616b50aed1d77b41f377ea4ce2a26",
              "otherName": "_startMcpServer",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/contribution.ts",
              "kind": "calls",
              "line": 71,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:32e73dfd145b0a8fe28a748271b2df23",
              "otherName": "debug",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionInitializer.spec.ts",
              "kind": "calls",
              "line": 104,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "constant:09b4e3bf46db0fec51379492253be6b1",
              "otherName": "generateUuid",
              "otherKind": "constant",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/uuid.ts",
              "kind": "calls",
              "line": 107,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:b471653d5b085cd56b804bc47a865958",
              "otherName": "getRandomSocketPath",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
              "kind": "calls",
              "line": 108,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:ffe836b8ae15edc6086f19f10cf7f656",
              "otherName": "trace",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionInitializer.spec.ts",
              "kind": "calls",
              "line": 109,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:1c6900daacc328d8206d0eff265f073a",
              "otherName": "import",
              "otherKind": "method",
              "otherFilePath": "src/vs/workbench/contrib/files/browser/fileImportExport.ts",
              "kind": "calls",
              "line": 112,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:1c6900daacc328d8206d0eff265f073a",
              "otherName": "import",
              "otherKind": "method",
              "otherFilePath": "src/vs/workbench/contrib/files/browser/fileImportExport.ts",
              "kind": "calls",
              "line": 113,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:59b022996840d3429b993c8fa3ea450d",
              "otherName": "use",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p6/source/f2.ts",
              "kind": "calls",
              "line": 119,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:59b022996840d3429b993c8fa3ea450d",
              "otherName": "use",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p6/source/f2.ts",
              "kind": "calls",
              "line": 120,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:2d22088cb2486d635bc44c31a794b39d",
              "otherName": "_authMiddleware",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
              "kind": "calls",
              "line": 121,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:3e632ffc43f878d880e2ff47b39baef3",
              "otherName": "_handlePost",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
              "kind": "calls",
              "line": 124,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:cadf845d5a3f3f3e733afb930231c809",
              "otherName": "_handleGetDelete",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
              "kind": "calls",
              "line": 125,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:cadf845d5a3f3f3e733afb930231c809",
              "otherName": "_handleGetDelete",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
              "kind": "calls",
              "line": 126,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
          "kind": "method",
          "name": "start",
          "qualifiedName": "EmptyRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
          "startLine": 15,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "method:5147c17df2464426057952a3caa4bef3",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FullRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
          "startLine": 118,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "function:3c52dc31579486c53a5b02c93cbb1194",
              "otherName": "recomputeInitiallyAndOnChange",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/observableInternal/utils/utils.ts",
              "kind": "calls",
              "line": 125,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:8a068fafb46e04c2c7535457242ef928",
              "otherName": "mapObservableArrayCached",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/observableInternal/utils/utils.ts",
              "kind": "calls",
              "line": 125,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:0b9a05469cb1e3fb896d44f49e4bed0e",
              "otherName": "add",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/lifecycle.ts",
              "kind": "calls",
              "line": 129,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:b0e8afb488f84c1430a14879b8ba9a08",
              "otherName": "autorunWithChanges",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/platform/inlineEdits/common/utils/observable.ts",
              "kind": "calls",
              "line": 130,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:159b72e1ab1b6dc0d5f6cebcf32ae0e8",
              "otherName": "toString",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/prompt.ts",
              "kind": "calls",
              "line": 141,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:95cf128aeba7e33fa93bb5a792187013",
              "otherName": "updateRecentEdits",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
              "kind": "calls",
              "line": 150,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:95cf128aeba7e33fa93bb5a792187013",
              "otherName": "updateRecentEdits",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
              "kind": "calls",
              "line": 153,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:95cf128aeba7e33fa93bb5a792187013",
              "otherName": "updateRecentEdits",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
              "kind": "calls",
              "line": 157,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:9536e7c01bb10161cff0d6be125de28a",
          "kind": "method",
          "name": "start",
          "qualifiedName": "OpenAILanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
          "startLine": 237,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:d5e27e6d07b86aae25932231ff2aa943",
              "otherName": "listen",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/snippy/connectionState.ts",
              "kind": "calls",
              "line": 244,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:ab8b97e9a4162d72efdf6a568006a057",
              "otherName": "address",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/test/simulation/fixtures/doc/issue-6406/debugModel.ts",
              "kind": "calls",
              "line": 245,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:421606bdaab43ca8078d89ec0cc5b582",
              "otherName": "info",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
              "kind": "calls",
              "line": 251,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:b060392463bb0c8f89c503a292145620",
              "otherName": "resolve",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/chatSessionContext/vscode-node/chatSessionContextProvider.ts",
              "kind": "calls",
              "line": 252,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:3c61c7b006e07030f25212ea9eb50847",
              "otherName": "reject",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/util/async.ts",
              "kind": "calls",
              "line": 256,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "property:1fdfa2d7595b533e17c04fa16c583077",
          "kind": "property",
          "name": "start",
          "qualifiedName": "HistoryItemChangeRange::start",
          "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
          "startLine": 16,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "method:8609d8674f03de2d18d721a127d57fc8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandSessionFactory::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
          "startLine": 62,
          "language": "tsx",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "function:8efc1c82c4b45812b4a904993beeaef1",
              "otherName": "RecentEdits",
              "otherKind": "function",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/components/recentEdits.tsx",
              "kind": "calls",
              "line": 67,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:04fb58bd000aad38ec2d325e44e71a45",
              "otherName": "constructor",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/tools/node/memoryTool.tsx",
              "kind": "calls",
              "line": 158,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:3cdc850be3f9892f101ab5f2ad24d704",
              "otherName": "sendMSFTTelemetryEvent",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/tools/node/test/memoryTool.spec.tsx",
              "kind": "calls",
              "line": 70,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:ad1548ea886ffe5481fd0343a766852f",
              "otherName": "tryMatchExistingConfig",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
              "kind": "calls",
              "line": 80,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:9fc318bb2226c55d2e2df2e455ef4e25",
              "otherName": "convert",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/commandToConfigConverter.tsx",
              "kind": "calls",
              "line": 83,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:3cdc850be3f9892f101ab5f2ad24d704",
              "otherName": "sendMSFTTelemetryEvent",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/tools/node/test/memoryTool.spec.tsx",
              "kind": "calls",
              "line": 104,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:6602c58f666fa3f4f1f61e49359e6155",
              "otherName": "getWorkspaceFolder",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/textDocumentManager.ts",
              "kind": "calls",
              "line": 111,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:2314bcfaa100fd8cdcfca391567bff29",
              "otherName": "ensureTask",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
              "kind": "calls",
              "line": 113,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:2b142f4a79b8085af5a6aa843c90cfd2",
              "otherName": "saveConfigInLRU",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
              "kind": "calls",
              "line": 121,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:04042ccb44a562252e2b6dae16c0672a",
              "otherName": "save",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
              "kind": "calls",
              "line": 123,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:3364681d9999d4190be7745d3f8678c7",
              "otherName": "hasMatchingExtension",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
              "kind": "calls",
              "line": 128,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:1a74d70bd95da66e561ccd1ab73b5d50",
              "otherName": "resolveConfigurationInputs",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode/launchConfigService.ts",
              "kind": "calls",
              "line": 132,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:2b142f4a79b8085af5a6aa843c90cfd2",
              "otherName": "saveConfigInLRU",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
              "kind": "calls",
              "line": 139,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:a3572955ac9066097695c469cd6a7029",
              "otherName": "IStartOptions",
              "otherKind": "interface",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugWorker/shared.ts",
              "kind": "references",
              "line": 62,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
          "kind": "function",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
          "startLine": 169,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:912e08376ff48da82dae3616af15a945",
              "otherName": "warn",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/log/common/logService.ts",
              "kind": "calls",
              "line": 172,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:dcfbd507d35df30d3995eb4f3609d13b",
              "otherName": "getGitHubSession",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/lib/vscode-node/test/getInlineCompletions.spec.ts",
              "kind": "calls",
              "line": 178,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:c188357791bf9200bfa6e7137753478f",
              "otherName": "start",
              "otherKind": "method",
              "otherFilePath": "src/vs/workbench/common/editor.ts",
              "kind": "calls",
              "line": 180,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:f2d79d384bff4e847b024359f4c995c1",
              "otherName": "printLabel",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandHandle.ts",
              "kind": "calls",
              "line": 184,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:7e4e149aba163be9036b2a3a062b5853",
              "otherName": "exit",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandHandle.ts",
              "kind": "calls",
              "line": 185,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:dc8aede561a417dca19f687ae6304c15",
              "otherName": "output",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandHandle.ts",
              "kind": "calls",
              "line": 189,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:222b32cf9aaee4834048b631b8d844ff",
              "otherName": "replaceAll",
              "otherKind": "method",
              "otherFilePath": "src/vs/editor/contrib/find/browser/findController.ts",
              "kind": "calls",
              "line": 189,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:7e4e149aba163be9036b2a3a062b5853",
              "otherName": "exit",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandHandle.ts",
              "kind": "calls",
              "line": 190,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:72c0de7c6bb5a6651f1f3c4c1a40b378",
              "otherName": "then",
              "otherKind": "method",
              "otherFilePath": "src/vs/workbench/services/extensions/common/lazyPromise.ts",
              "kind": "calls",
              "line": 192,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:9cf7ddf2c1cd6adeef3f02fc518a9272",
              "otherName": "confirm",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandHandle.ts",
              "kind": "calls",
              "line": 192,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "constant:ec3c916c63bfd5eadd7d28b0ba09b492",
              "otherName": "startDebugging",
              "otherKind": "constant",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/test/fixtures/editorGroupWatermark.summarized.ts",
              "kind": "calls",
              "line": 194,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:6602c58f666fa3f4f1f61e49359e6155",
              "otherName": "getWorkspaceFolder",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/textDocumentManager.ts",
              "kind": "calls",
              "line": 194,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:5c08e1e93113c11073437f73fa9dae48",
          "kind": "method",
          "name": "start",
          "qualifiedName": "BackgroundSummarizer::start",
          "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
          "startLine": 163,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:7fb6279d2bc24caaf679bd3a04e9ea11",
              "otherName": "_startBackgroundSummarization",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/intents/node/agentIntent.ts",
              "kind": "calls",
              "line": 1152,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:22f54b86083818b025d0d8fd5623b1e7",
              "otherName": "_startPrismBackgroundSummarization",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/extension/intents/node/agentIntent.ts",
              "kind": "calls",
              "line": 1323,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 20,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 31,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 38,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 49,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 62,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 75,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 91,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 97,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 109,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "otherName": "backgroundSummarizer.spec.ts",
              "otherKind": "file",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/test/backgroundSummarizer.spec.ts",
              "kind": "calls",
              "line": 114,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:72c0de7c6bb5a6651f1f3c4c1a40b378",
              "otherName": "then",
              "otherKind": "method",
              "otherFilePath": "src/vs/workbench/services/extensions/common/lazyPromise.ts",
              "kind": "calls",
              "line": 172,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:a00cb83c26a89b04b6eed121301c3018",
              "otherName": "work",
              "otherKind": "method",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/async.ts",
              "kind": "calls",
              "line": 172,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:1aa9fedac8fce3a5b947e2293f48ce5f",
              "otherName": "CancellationToken",
              "otherKind": "interface",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/cancellation.ts",
              "kind": "references",
              "line": 163,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:cb05a261815ae37cdb169db417819ef4",
              "otherName": "IBackgroundSummarizationResult",
              "otherKind": "interface",
              "otherFilePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
              "kind": "references",
              "line": 163,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:1aa9fedac8fce3a5b947e2293f48ce5f",
              "otherName": "CancellationToken",
              "otherKind": "interface",
              "otherFilePath": "extensions/copilot/src/util/vs/base/common/cancellation.ts",
              "kind": "references",
              "line": 163,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "classification": "expected-runtime-boundary",
      "candidateCount": 1,
      "callableCandidateCount": 0,
      "candidates": [
        {
          "id": "class:d213fc3f824486face8858bc52a3f0a6",
          "kind": "class",
          "name": "ExtensionHostMain",
          "qualifiedName": "ExtensionHostMain",
          "filePath": "src/vs/workbench/api/common/extensionHostMain.ts",
          "startLine": 161,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    },
    {
      "token": "MainThreadExtensionService",
      "classification": "expected-runtime-boundary",
      "candidateCount": 1,
      "callableCandidateCount": 0,
      "candidates": [
        {
          "id": "class:2e9d6531a66655d63f6762f0da5b297c",
          "kind": "class",
          "name": "MainThreadExtensionService",
          "qualifiedName": "MainThreadExtensionService",
          "filePath": "src/vs/workbench/api/browser/mainThreadExtensionService.ts",
          "startLine": 34,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        }
      ]
    }
  ]
}
```

## 24. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json`

```json
{
  "generatedAt": "2026-06-14T15:26:23.480Z",
  "target": {
    "localPath": "/private/tmp/codegraph-corpus/vscode-sparse",
    "localPathProvenance": "local-only",
    "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "commit": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0",
    "shortCommit": "275e1b31",
    "commitMatchesExpected": false,
    "commitDrift": {
      "expected": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
      "actual": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0"
    },
    "sparsePatterns": [
      ".github",
      "build",
      "extensions",
      "scripts",
      "src",
      "test"
    ],
    "copiedJsTsConfigFileCount": 11518,
    "indexedJsTsFileCount": 11098
  },
  "expectedSymbols": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "symbols": [
    {
      "token": "AbstractExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:5614800952da674403f4da9c2457be5d",
          "kind": "class",
          "name": "AbstractExtensionService",
          "qualifiedName": "AbstractExtensionService",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 60,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_createExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "method:4e7c5f7b23e454b3fa9635eabffe16df",
          "kind": "method",
          "name": "_createExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_createExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 842,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_doCreateExtensionHostManager",
      "candidateCount": 2,
      "candidates": [
        {
          "id": "method:75c6a9f14fbd9ad890eb4e443a6d3385",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 864,
          "language": "typescript"
        },
        {
          "id": "method:df429fc1cbac2b11eca3b2ffadce235d",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "MyTestExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/test/browser/extensionService.test.ts",
          "startLine": 200,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:aa28f1d35cafbd522cede21158da963a",
          "kind": "class",
          "name": "ExtensionHostManager",
          "qualifiedName": "ExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/extensionHostManager.ts",
          "startLine": 58,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "start",
      "candidateCount": 138,
      "candidates": [
        {
          "id": "method:7b404b2424ad94975e97941e0a3a33c7",
          "kind": "method",
          "name": "start",
          "qualifiedName": "activate::Runs::start",
          "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
          "startLine": 131,
          "language": "typescript"
        },
        {
          "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
          "kind": "method",
          "name": "start",
          "qualifiedName": "LanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
          "startLine": 323,
          "language": "typescript"
        },
        {
          "id": "method:c6e06c449351c35f657a71c92550d8bf",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MockLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:1fc45442df97184181c9f455a534d924",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
          "startLine": 312,
          "language": "typescript"
        },
        {
          "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "InProcHttpServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
          "startLine": 99,
          "language": "typescript"
        },
        {
          "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
          "kind": "method",
          "name": "start",
          "qualifiedName": "EmptyRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:5147c17df2464426057952a3caa4bef3",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FullRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
          "startLine": 118,
          "language": "typescript"
        },
        {
          "id": "method:9536e7c01bb10161cff0d6be125de28a",
          "kind": "method",
          "name": "start",
          "qualifiedName": "OpenAILanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
          "startLine": 237,
          "language": "typescript"
        },
        {
          "id": "property:1fdfa2d7595b533e17c04fa16c583077",
          "kind": "property",
          "name": "start",
          "qualifiedName": "HistoryItemChangeRange::start",
          "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
          "startLine": 16,
          "language": "typescript"
        },
        {
          "id": "method:8609d8674f03de2d18d721a127d57fc8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandSessionFactory::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
          "startLine": 62,
          "language": "tsx"
        },
        {
          "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
          "kind": "function",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
          "startLine": 169,
          "language": "typescript"
        },
        {
          "id": "method:5c08e1e93113c11073437f73fa9dae48",
          "kind": "method",
          "name": "start",
          "qualifiedName": "BackgroundSummarizer::start",
          "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
          "startLine": 163,
          "language": "typescript"
        },
        {
          "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
          "kind": "variable",
          "name": "start",
          "qualifiedName": "start",
          "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
          "startLine": 556,
          "language": "tsx"
        },
        {
          "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MemoryCleanupService::start",
          "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
          "startLine": 94,
          "language": "typescript"
        },
        {
          "id": "property:d953784c7b6f8b9670e08278714980b1",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "property:3840270ac71261ee8013db5d0c832e27",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClassTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 391,
          "language": "typescript"
        },
        {
          "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
          "kind": "method",
          "name": "start",
          "qualifiedName": "TypeTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 423,
          "language": "typescript"
        },
        {
          "id": "method:445a376d30627b1ac94645fbac68895d",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CharacterBudget::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
          "startLine": 1186,
          "language": "typescript"
        },
        {
          "id": "property:635d30fbb0cf1ace26a775219947828e",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Tag::start",
          "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
          "startLine": 10,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:d213fc3f824486face8858bc52a3f0a6",
          "kind": "class",
          "name": "ExtensionHostMain",
          "qualifiedName": "ExtensionHostMain",
          "filePath": "src/vs/workbench/api/common/extensionHostMain.ts",
          "startLine": 161,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "MainThreadExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:2e9d6531a66655d63f6762f0da5b297c",
          "kind": "class",
          "name": "MainThreadExtensionService",
          "qualifiedName": "MainThreadExtensionService",
          "filePath": "src/vs/workbench/api/browser/mainThreadExtensionService.ts",
          "startLine": 34,
          "language": "typescript"
        }
      ]
    }
  ],
  "start": {
    "ambiguityCount": 138,
    "candidates": [
      {
        "id": "method:7b404b2424ad94975e97941e0a3a33c7",
        "kind": "method",
        "name": "start",
        "qualifiedName": "activate::Runs::start",
        "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
        "startLine": 131,
        "language": "typescript"
      },
      {
        "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
        "kind": "method",
        "name": "start",
        "qualifiedName": "LanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
        "startLine": 323,
        "language": "typescript"
      },
      {
        "id": "method:c6e06c449351c35f657a71c92550d8bf",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MockLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:1fc45442df97184181c9f455a534d924",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClaudeLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
        "startLine": 312,
        "language": "typescript"
      },
      {
        "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
        "kind": "method",
        "name": "start",
        "qualifiedName": "InProcHttpServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
        "startLine": 99,
        "language": "typescript"
      },
      {
        "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
        "kind": "method",
        "name": "start",
        "qualifiedName": "EmptyRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:5147c17df2464426057952a3caa4bef3",
        "kind": "method",
        "name": "start",
        "qualifiedName": "FullRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
        "startLine": 118,
        "language": "typescript"
      },
      {
        "id": "method:9536e7c01bb10161cff0d6be125de28a",
        "kind": "method",
        "name": "start",
        "qualifiedName": "OpenAILanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
        "startLine": 237,
        "language": "typescript"
      },
      {
        "id": "property:1fdfa2d7595b533e17c04fa16c583077",
        "kind": "property",
        "name": "start",
        "qualifiedName": "HistoryItemChangeRange::start",
        "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
        "startLine": 16,
        "language": "typescript"
      },
      {
        "id": "method:8609d8674f03de2d18d721a127d57fc8",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandSessionFactory::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
        "startLine": 62,
        "language": "tsx"
      },
      {
        "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
        "kind": "function",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
        "startLine": 169,
        "language": "typescript"
      },
      {
        "id": "method:5c08e1e93113c11073437f73fa9dae48",
        "kind": "method",
        "name": "start",
        "qualifiedName": "BackgroundSummarizer::start",
        "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
        "startLine": 163,
        "language": "typescript"
      },
      {
        "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
        "kind": "variable",
        "name": "start",
        "qualifiedName": "start",
        "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
        "startLine": 556,
        "language": "tsx"
      },
      {
        "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MemoryCleanupService::start",
        "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
        "startLine": 94,
        "language": "typescript"
      },
      {
        "id": "property:d953784c7b6f8b9670e08278714980b1",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "property:3840270ac71261ee8013db5d0c832e27",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClassTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 391,
        "language": "typescript"
      },
      {
        "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
        "kind": "method",
        "name": "start",
        "qualifiedName": "TypeTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 423,
        "language": "typescript"
      },
      {
        "id": "method:445a376d30627b1ac94645fbac68895d",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CharacterBudget::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
        "startLine": 1186,
        "language": "typescript"
      },
      {
        "id": "property:635d30fbb0cf1ace26a775219947828e",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Tag::start",
        "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
        "startLine": 10,
        "language": "typescript"
      }
    ]
  },
  "missingSymbols": [],
  "valid": true,
  "sufficiencySmokeAllowed": true,
  "gate": "All expected VS-1 symbols have candidates; sufficiency smoke may run."
}
```

## 25. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T15:31:42.000Z",
  "status": "unavailable",
  "command": "CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json > docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json",
  "target": {
    "localPath": "/private/tmp/codegraph-corpus/vscode-sparse",
    "localPathProvenance": "local-only",
    "commit": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0",
    "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "commitDrift": {
      "expected": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
      "actual": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0"
    }
  },
  "preconditions": {
    "validatorArtifact": "docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json",
    "validatorPassed": true,
    "probeArtifact": "docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json",
    "probeFlowSection": true,
    "probeFlowConnected": true
  },
  "unavailableReason": "One corrected-target sufficiency smoke was attempted. It produced no machine-readable stdout after an extended bounded wait of roughly 4.5 minutes and was interrupted with SIGINT.",
  "flowSection": null,
  "flowConnected": null,
  "missingExpected": null,
  "deterministicReadGrepFallbackRisk": "unavailable",
  "rustSpecificRegression": "unavailable",
  "typescriptVsRustComparison": "unavailable",
  "defaultRolloutReadinessClaimed": false
}
```

## 26. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T02:45:27.507Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-8PTxc9",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 223599,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 257780,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 251703,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 29,
        "nodesCreated": 559948,
        "edgesCreated": 1654276,
        "durationMs": 123799,
        "errors": [
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 165,
        "parseExtractionMs": 40343,
        "sqliteWriteMs": 71493,
        "typescriptFinalizationMs": 127857,
        "subprocessStartupHandoffMs": 5
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 45,
        "referenceResolutionMs": 118464,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 10111,
          "nameMatchingMs": 53205,
          "frameworkMatchingMs": 1161,
          "databaseAccessMs": 53038,
          "cacheWarmupMs": 1282,
          "unresolvedReadMs": 1539,
          "edgeMaterializationMs": 394,
          "edgeWriteMs": 25940,
          "unresolvedCleanupMs": 23884,
          "otherResolutionMs": 547
        },
        "dynamicDispatchSynthesisMs": 8761,
        "dbMaintenanceMs": 223
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 10111,
        "nameMatchingMs": 53205,
        "frameworkMatchingMs": 1161,
        "databaseAccessMs": 53038,
        "cacheWarmupMs": 1282,
        "unresolvedReadMs": 1539,
        "edgeMaterializationMs": 394,
        "edgeWriteMs": 25940,
        "unresolvedCleanupMs": 23884,
        "otherResolutionMs": 547
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "nameMatchingMs"
    }
  ]
}
```

## 27. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T02:54:13.999Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25197,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 28. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization.md`

# Rust Indexing Core Phase 4 Reference-Resolution Optimization

Issue: [#91](https://github.com/jununfly/ZCodeGraph/issues/91)

Parent investigation: [Rust Indexing Core Phase 4 Reference Resolution Investigation](2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

## Scope

This issue attempted a bounded, data-driven optimization for the Phase 4
reference-resolution database-access bottleneck. It did not move
ReferenceResolver or graph finalization into Rust, did not change the default
TypeScript indexing path, and did not weaken Explore sufficiency.

Implemented changes:

- Added public reference-resolution DB sub-buckets:
  `cacheWarmupMs`, `unresolvedReadMs`, `edgeMaterializationMs`, `edgeWriteMs`,
  and `unresolvedCleanupMs`.
- Replaced per-edge node reads in edge materialization with batched
  node-kind lookup.
- Replaced per-reference unresolved cleanup deletes with chunked tuple deletes.

## Raw Artifacts And Durability

- VS Code after-profile raw JSON:
  [2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json](2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json)
- VS Code sufficiency raw JSON:
  [2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json)
- Local target path: `/private/tmp/codegraph-corpus/vscode-sparse` (local-only provenance)

The repo-relative raw JSON files are durable checked-in evidence. The
`/private/tmp` target path records where the local sparse checkout existed when
the profile and sufficiency smoke ran; it may not exist on another machine.

## Before Source

The coarse large-target before source is the #87 focused profile on the same VS
Code JS/TS sparse checkout:

- `referenceResolutionMs`: 99,543ms
- `databaseAccessMs`: 50,614ms
- dominant reference-resolution subpath: `databaseAccessMs`

That profile predated the new DB sub-buckets, so it cannot show
`edgeMaterializationMs`, `edgeWriteMs`, or `unresolvedCleanupMs`. The #91
after-profile is therefore used to identify the remaining DB shape after the
bounded optimizations.

## VS Code After Profile

Profile date: `2026-06-14T02:45:27.507Z`

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b31`
- Local target: `/private/tmp/codegraph-corpus/vscode-sparse` (local-only provenance)
- Indexed files: 11,291
- Rust nodes/edges: 559,948 / 1,654,276
- TypeScript profile wall: 223.6s
- Rust profile wall: 257.8s
- Rust-core profile wall: 251.7s
- RSS: unavailable; local `ps` sampling returned `spawnSync ps EPERM`

Finalization subphases:

| Subphase | Time |
| --- | ---: |
| framework post-extract | 45ms |
| reference resolution | 118,464ms |
| dynamic dispatch synthesis | 8,761ms |
| DB maintenance | 223ms |

Reference-resolution breakdown:

| Subpath | Time |
| --- | ---: |
| `nameMatchingMs` | 53,205ms |
| `databaseAccessMs` | 53,038ms |
| `edgeWriteMs` | 25,940ms |
| `unresolvedCleanupMs` | 23,884ms |
| `importResolutionMs` | 10,111ms |
| `unresolvedReadMs` | 1,539ms |
| `cacheWarmupMs` | 1,282ms |
| `frameworkMatchingMs` | 1,161ms |
| `otherResolutionMs` | 547ms |
| `edgeMaterializationMs` | 394ms |

The batched edge-materialization lookup landed correctly, but the after-profile
shows that `edgeMaterializationMs` is not a meaningful large-target bottleneck.
The cleanup delete optimization also landed, but `unresolvedCleanupMs` remains a
large DB subpath. Overall `databaseAccessMs` did not meet the required 15%
improvement threshold versus the #87 coarse before profile.

## Sufficiency Smoke

Sufficiency date: `2026-06-14T02:54:13.999Z`

Prompt `VS-1` reported no regression for both TypeScript and Rust:

| Engine | Flow connected | Missing expected | Deterministic Read risk | Deterministic Grep risk | Classification |
| --- | --- | ---: | ---: | ---: | --- |
| TypeScript | yes | 0 | 0 | 0 | no regression |
| Rust | yes | 0 | 0 | 0 | no regression |

## Blocker Classification

Status: `still unresolved`.

The optimization attempts were bounded and preserved sufficiency, but they did
not reduce the large-target `databaseAccessMs` enough to call the #87 blocker
reduced or resolved. The after-profile also shows that `nameMatchingMs` is now
approximately tied with the aggregate DB bucket as the dominant
reference-resolution subpath.

Recommended next blockers:

- optimize reference-resolution name matching on the VS Code sparse checkout;
- split `edgeWriteMs` and `unresolvedCleanupMs` further if DB writes remain a
  blocker after name matching is addressed;
- keep Rust JS/TS indexing opt-in until a later profile reduces
  `referenceResolutionMs` without Explore sufficiency regression.

## 29. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json`

```json
{
  "generatedAt": "2026-06-13T17:05:44.117Z",
  "mode": "full-vscode-sparse-rust-parse-rerun",
  "sourceRepo": "https://github.com/microsoft/vscode",
  "sourceCommit": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0",
  "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
  "indexPath": "/private/tmp/zcodegraph-issue88-vscode-full-jZO0AA/zcodegraph.db",
  "command": [
    "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
    "index",
    "--project-path",
    "/private/tmp/codegraph-corpus/vscode-sparse",
    "--index-path",
    "/private/tmp/zcodegraph-issue88-vscode-full-jZO0AA/zcodegraph.db",
    "--engine",
    "rust",
    "--force"
  ],
  "status": 0,
  "wallMs": 125867,
  "stderr": "",
  "events": [
    {
      "type": "progress",
      "phase": "scanning",
      "current": 0,
      "total": 1
    },
    {
      "type": "result",
      "success": true,
      "filesIndexed": 11291,
      "filesSkipped": 0,
      "filesErrored": 29,
      "nodesCreated": 559948,
      "edgesCreated": 548657,
      "errors": [
        {
          "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
          "severity": "error"
        },
        {
          "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
          "severity": "error"
        },
        {
          "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
          "severity": "error"
        },
        {
          "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
          "severity": "error"
        },
        {
          "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
          "severity": "error"
        },
        {
          "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
          "severity": "error"
        }
      ],
      "durationMs": 125859,
      "profile": {
        "sourceScanMs": 155,
        "parseExtractionMs": 40197,
        "sqliteWriteMs": 73646
      }
    }
  ],
  "result": {
    "type": "result",
    "success": true,
    "filesIndexed": 11291,
    "filesSkipped": 0,
    "filesErrored": 29,
    "nodesCreated": 559948,
    "edgesCreated": 548657,
    "errors": [
      {
        "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
        "severity": "error"
      },
      {
        "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
        "severity": "error"
      },
      {
        "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
        "severity": "error"
      },
      {
        "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
        "severity": "error"
      },
      {
        "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
        "severity": "error"
      },
      {
        "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
        "severity": "error"
      }
    ],
    "durationMs": 125859,
    "profile": {
      "sourceScanMs": 155,
      "parseExtractionMs": 40197,
      "sqliteWriteMs": 73646
    }
  }
}
```

## 30. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json`

```json
{
  "generatedAt": "2026-06-13T17:03:23.174Z",
  "mode": "targeted-vscode-real-syntax-gap-slice",
  "sourceRepo": "https://github.com/microsoft/vscode",
  "sourceCommit": "275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0",
  "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
  "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-issue88-vscode-syntax-jFKI9m",
  "selectedPaths": [
    "build/next/index.ts",
    "extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts",
    "extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts",
    "extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts",
    "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts",
    "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts",
    "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
    "extensions/copilot/src/platform/telemetry/common/telemetry.ts",
    "src/vs/code/electron-browser/workbench/workbench.ts",
    "src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts",
    "src/vs/platform/browserView/electron-browser/preload-browserView.ts",
    "src/vs/platform/tunnel/test/node/tunnelProxy.test.ts",
    "src/vs/sessions/electron-browser/sessions.ts",
    "src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts",
    "src/vs/workbench/contrib/issue/browser/issueFormService.ts",
    "src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts"
  ],
  "command": [
    "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
    "index",
    "--project-path",
    "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-issue88-vscode-syntax-jFKI9m",
    "--index-path",
    "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-issue88-vscode-syntax-jFKI9m/.zcodegraph/zcodegraph.db",
    "--engine",
    "rust",
    "--force"
  ],
  "status": 0,
  "stderr": "",
  "events": [
    {
      "type": "progress",
      "phase": "scanning",
      "current": 0,
      "total": 1
    },
    {
      "type": "result",
      "success": true,
      "filesIndexed": 16,
      "filesSkipped": 0,
      "filesErrored": 0,
      "nodesCreated": 2181,
      "edgesCreated": 2165,
      "errors": [],
      "durationMs": 385,
      "profile": {
        "sourceScanMs": 0,
        "parseExtractionMs": 185,
        "sqliteWriteMs": 179
      }
    }
  ],
  "result": {
    "type": "result",
    "success": true,
    "filesIndexed": 16,
    "filesSkipped": 0,
    "filesErrored": 0,
    "nodesCreated": 2181,
    "edgesCreated": 2165,
    "errors": [],
    "durationMs": 385,
    "profile": {
      "sourceScanMs": 0,
      "parseExtractionMs": 185,
      "sqliteWriteMs": 179
    }
  }
}
```

## 31. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md`

# Rust Indexing Core Phase 4 VS Code Syntax Gap Resolution

Issue: [#88](https://github.com/jununfly/ZCodeGraph/issues/88)

Source taxonomy: [Rust Indexing Core Phase 4 VS Code Parse-Error Taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md)

Raw targeted slice rerun: [2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json)

Raw full sparse-checkout rerun: [2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json)

## Summary

The 16 real supported JS/TS syntax-gap paths from the VS Code taxonomy are
fixed for the Rust indexing core. A full Rust-core parse rerun on the same
large VS Code JS/TS sparse checkout moved every #88 path out of the parse-error
set.

This does not require VS Code to reach zero parse errors. The remaining 29
parse errors are the malformed fixture, prompt/generated, or colorization
fixture paths already classified by #86 as not representative normal
application source.

## Root Syntax Families

The real syntax-gap paths reduced to two parser compatibility families:

| Family | Representative paths | Fix |
| --- | --- | --- |
| Type-only `import("module").Type` queries | `build/next/index.ts`, `src/vs/code/electron-browser/workbench/workbench.ts`, `src/vs/platform/tunnel/test/node/tunnelProxy.test.ts`, `src/vs/workbench/contrib/issue/browser/issueFormService.ts` | Parser-only, byte-length-preserving normalization rewrites unsupported import-type query spans to an identifier before tree-sitter parses. The original source remains the extraction source. |
| Contextual keyword identifiers | `extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts`, `src/vs/platform/browserView/electron-browser/preload-browserView.ts` | Parser-only, byte-length-preserving normalization rewrites `abstract:` property names and `unique.` member receivers only for the parse input. |

The regression coverage uses minimal Rust-core fixtures for both families.

## Rerun Evidence

Targeted #88 path slice:

| Metric | Result |
| --- | ---: |
| Selected real syntax-gap paths | 16 |
| Files indexed | 16 |
| Files errored | 0 |

Full VS Code sparse-checkout Rust-core parse rerun:

| Metric | Before #88 fix | After #88 fix |
| --- | ---: | ---: |
| Indexed JS/TS/JSX/TSX files | 11,291 | 11,291 |
| Parse errors | 46 | 29 |
| Real supported JS/TS syntax-gap errors | 16 | 0 |

## Remaining Parse Errors

The remaining 29 paths are not accepted as normal supported JS/TS syntax gaps
for default-rollout gating. They remain documented as:

- malformed fixture / intentionally invalid test input;
- prompt-generated or prompt-heavy source not representative of normal app
  code;
- copied compiler-scale colorization fixture.

No unknown parse errors remain.

## Decision Impact

#88 is no longer a default-rollout blocker. The Phase 4 decision still stays on
the `continue opt-in + targeted blockers` path because the #87
reference-resolution database-access bottleneck remains unresolved.

## 32. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md`

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

## 33. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-hardgate-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T06:09:29.542Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "zcodegraph",
      "sourcePath": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph",
      "commit": "9923605",
      "prompts": [
        {
          "id": "ZCG-1",
          "query": "handleExplore plan ExplorePlan render",
          "typescript": {
            "outputChars": 14248,
            "hasFlowSection": true,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 21452,
            "hasFlowSection": true,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        },
        {
          "id": "ZCG-2",
          "query": "runIndex CodeGraph.indexAll ExtractionOrchestrator.indexAll ParseStage QueryBuilder.insertNode",
          "typescript": {
            "outputChars": 22370,
            "hasFlowSection": true,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 14677,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        },
        {
          "id": "ZCG-3",
          "query": "ReferenceResolver.resolveAll createSynthesizerRegistry registerFullGraphSynthesizers executeFullGraphSynthesizers QueryBuilder.insertEdge",
          "typescript": {
            "outputChars": 19939,
            "hasFlowSection": true,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 17537,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        }
      ]
    },
    {
      "name": "excalidraw",
      "sourcePath": "/private/tmp/codegraph-corpus/excalidraw",
      "commit": "a83ac488",
      "prompts": [
        {
          "id": "EX-1",
          "query": "mutateElement triggerUpdate triggerRender render StaticCanvas renderStaticScene",
          "typescript": {
            "outputChars": 24251,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 20854,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        },
        {
          "id": "EX-2",
          "query": "Scene.onUpdate triggerUpdate triggerRender render StaticCanvas",
          "typescript": {
            "outputChars": 24887,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 22673,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        },
        {
          "id": "EX-3",
          "query": "StaticCanvas renderStaticScene _renderStaticScene drawElementOnCanvas renderElement",
          "typescript": {
            "outputChars": 15619,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 16310,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    },
    {
      "name": "zustand",
      "sourcePath": "/private/tmp/codegraph-corpus/zustand",
      "commit": "566b5bf",
      "prompts": [
        {
          "id": "ZU-1",
          "query": "createStore setState getState subscribe",
          "typescript": {
            "outputChars": 12778,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 13086,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        },
        {
          "id": "ZU-2",
          "query": "create useStore api setState",
          "typescript": {
            "outputChars": 7834,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 9716,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        },
        {
          "id": "ZU-3",
          "query": "persist createJSONStorage setItem getItem removeItem",
          "typescript": {
            "outputChars": 17023,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 4615,
            "hasFlowSection": true,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 34. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-after.raw.json`

```json
{
  "generatedAt": "2026-06-14T06:17:35.518Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "reduced",
      "sourcePath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcg-phase5-ref-fixture-dDHHVE",
      "commit": null,
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 81,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-reduced-rust-profile-SNsPKb",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 365,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 360,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 275,
      "result": {
        "success": true,
        "filesIndexed": 81,
        "filesSkipped": 0,
        "filesErrored": 0,
        "nodesCreated": 301,
        "edgesCreated": 9980,
        "durationMs": 161,
        "errors": []
      },
      "profile": {
        "sourceScanMs": 0,
        "parseExtractionMs": 80,
        "sqliteWriteMs": 13,
        "typescriptFinalizationMs": 111,
        "subprocessStartupHandoffMs": 2
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 1,
        "referenceResolutionMs": 99,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 9,
          "nameMatchingMs": 7,
          "frameworkMatchingMs": 1,
          "databaseAccessMs": 75,
          "cacheWarmupMs": 1,
          "unresolvedReadMs": 9,
          "candidateLookupMs": 1,
          "sharedCandidateLookupMs": 1,
          "candidateLookupCacheHitMs": 0,
          "perReferenceDisambiguationMs": 7,
          "edgeMaterializationMs": 3,
          "edgeWriteMs": 46,
          "unresolvedCleanupMs": 16,
          "otherResolutionMs": 3
        },
        "dynamicDispatchSynthesisMs": 3,
        "dbMaintenanceMs": 3
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 9,
        "nameMatchingMs": 7,
        "frameworkMatchingMs": 1,
        "databaseAccessMs": 75,
        "cacheWarmupMs": 1,
        "unresolvedReadMs": 9,
        "candidateLookupMs": 1,
        "sharedCandidateLookupMs": 1,
        "candidateLookupCacheHitMs": 0,
        "perReferenceDisambiguationMs": 7,
        "edgeMaterializationMs": 3,
        "edgeWriteMs": 46,
        "unresolvedCleanupMs": 16,
        "otherResolutionMs": 3
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "databaseAccessMs"
    }
  ]
}
```

## 35. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-reduced-before.raw.json`

```json
{
  "generatedAt": "2026-06-14T06:07:42.987Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "reduced",
      "sourcePath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcg-phase5-ref-fixture-dDHHVE",
      "commit": null,
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 81,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-reduced-rust-profile-1mPjGC",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 382,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 373,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 293,
      "result": {
        "success": true,
        "filesIndexed": 81,
        "filesSkipped": 0,
        "filesErrored": 0,
        "nodesCreated": 301,
        "edgesCreated": 9937,
        "durationMs": 161,
        "errors": []
      },
      "profile": {
        "sourceScanMs": 0,
        "parseExtractionMs": 80,
        "sqliteWriteMs": 13,
        "typescriptFinalizationMs": 129,
        "subprocessStartupHandoffMs": 1
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 2,
        "referenceResolutionMs": 116,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 10,
          "nameMatchingMs": 10,
          "frameworkMatchingMs": 0,
          "databaseAccessMs": 92,
          "cacheWarmupMs": 1,
          "unresolvedReadMs": 9,
          "candidateLookupMs": 2,
          "candidateLookupCacheHitMs": 1,
          "perReferenceDisambiguationMs": 8,
          "edgeMaterializationMs": 2,
          "edgeWriteMs": 46,
          "unresolvedCleanupMs": 34,
          "otherResolutionMs": 1
        },
        "dynamicDispatchSynthesisMs": 3,
        "dbMaintenanceMs": 2
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 10,
        "nameMatchingMs": 10,
        "frameworkMatchingMs": 0,
        "databaseAccessMs": 92,
        "cacheWarmupMs": 1,
        "unresolvedReadMs": 9,
        "candidateLookupMs": 2,
        "candidateLookupCacheHitMs": 1,
        "perReferenceDisambiguationMs": 8,
        "edgeMaterializationMs": 2,
        "edgeWriteMs": 46,
        "unresolvedCleanupMs": 34,
        "otherResolutionMs": 1
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "databaseAccessMs"
    }
  ]
}
```

## 36. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T06:38:04.733Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-K4Wq8F",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 230262,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 246196,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 236447,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 29,
        "nodesCreated": 559948,
        "edgesCreated": 1665570,
        "durationMs": 117876,
        "errors": [
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 160,
        "parseExtractionMs": 38548,
        "sqliteWriteMs": 67621,
        "typescriptFinalizationMs": 118521,
        "subprocessStartupHandoffMs": 4
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 45,
        "referenceResolutionMs": 109673,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 9087,
          "nameMatchingMs": 49059,
          "frameworkMatchingMs": 941,
          "databaseAccessMs": 47566,
          "cacheWarmupMs": 1205,
          "unresolvedReadMs": 1656,
          "candidateLookupMs": 5813,
          "sharedCandidateLookupMs": 1974,
          "candidateLookupCacheHitMs": 468,
          "perReferenceDisambiguationMs": 45211,
          "edgeMaterializationMs": 301,
          "edgeWriteMs": 24262,
          "unresolvedCleanupMs": 20145,
          "otherResolutionMs": 355
        },
        "dynamicDispatchSynthesisMs": 8341,
        "dbMaintenanceMs": 110
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 9087,
        "nameMatchingMs": 49059,
        "frameworkMatchingMs": 941,
        "databaseAccessMs": 47566,
        "cacheWarmupMs": 1205,
        "unresolvedReadMs": 1656,
        "candidateLookupMs": 5813,
        "sharedCandidateLookupMs": 1974,
        "candidateLookupCacheHitMs": 468,
        "perReferenceDisambiguationMs": 45211,
        "edgeMaterializationMs": 301,
        "edgeWriteMs": 24262,
        "unresolvedCleanupMs": 20145,
        "otherResolutionMs": 355
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "nameMatchingMs"
    }
  ]
}
```

## 37. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T06:46:12.415Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25197,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 38. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md`

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

## 39. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-issue105-vscode-sufficiency-node24.raw.json`

```json
{
  "generatedAt": "2026-06-14T09:09:50.079Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "runtimeWarnings": [],
  "toolchain": {
    "node": "v24.14.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "copyMode": "js-ts-config-slice",
      "copies": {
        "typescript": {
          "copiedFiles": 11518,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-iahEKT"
        },
        "rust": {
          "copiedFiles": 11518,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-cIiTLA"
        }
      },
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20882,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25190,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 40. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-results-and-decision.md`

# Rust Indexing Core Phase 6 Results And Decision

Date: 2026-06-14

Classification: `ready for end-to-end prototype`.

Rust remains opt-in. Branch/default status: TypeScript remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows. Phase 6 does not claim default rollout readiness.

Next recommended plan: bounded Rust graph-pipeline prototype, starting with the
`name matcher only` boundary recorded in the feasibility decision.

## Raw Artifacts

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-sufficiency.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-issue105-vscode-sufficiency-node24.raw.json`
- `docs/designs/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md`

## Final Large-Target Profile

Target: validated on a large VS Code JS/TS sparse checkout at commit
`275e1b31`, with 11,518 copied JS/TS/config files and 11,291 indexed files.

Runtime: Node v24.14.0 from the Codex bundled runtime. RSS sampling was not
available in the sandbox because `ps` returned `EPERM`, so RSS is recorded as
unavailable rather than inferred.

| Metric | Phase 5 final profile | Phase 6 final profile | Interpretation |
|---|---:|---:|---|
| TypeScript engine wall time | 230,262ms | 212,394ms | no material regression |
| Rust engine wall time | 246,196ms | 232,616ms | no material regression |
| Profile wall time | 236,447ms | 234,294ms | no material regression |
| TypeScript finalization | 118,521ms | 111,754ms | no material regression |
| Reference resolution | 109,673ms | 100,314ms | no material regression |
| Files errored | 29 | 29 | unchanged |

Important Phase 6 reference-resolution sub-buckets:

| Sub-bucket | Phase 6 final profile |
|---|---:|
| `databaseAccessMs` | 49,669ms |
| `nameMatchingMs` | 36,330ms |
| `perReferenceDisambiguationMs` | 32,397ms |
| `edgeWriteMs` | 25,587ms |
| `unresolvedCleanupMs` | 20,783ms |
| `importResolutionMs` | 10,156ms |
| `candidateLookupMs` | 5,953ms |
| `sharedCandidateLookupMs` | 2,025ms |
| `unresolvedReadMs` | 1,629ms |

The Phase 6 profile did not trigger the plan's 10-15% material-regression
threshold for Rust engine wall time or `referenceResolutionMs`. RSS could not
be judged in this sandbox and remains a follow-up validation gap.

## Final Sufficiency Smoke

The original final VS Code sparse-checkout Explore sufficiency smoke completed
under the local Homebrew Node v26.0.0 runtime and reported no deterministic
regressions. Issue #105 then aligned the sufficiency guardrail copy scope with
the profiler's JavaScript/TypeScript/config slice and reproduced the same smoke
under the supported bundled Node v24.14.0 runtime.

Prompt `VS-1` stayed connected for both TypeScript and Rust:

- TypeScript: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Rust: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Supported-runtime rerun: Node v24.14.0, `copyMode=js-ts-config-slice`,
  11,518 copied JS/TS/config files per engine, no deterministic regressions.

The previous Node v24.14.0 failure was specific to the guardrail's full-repo
copy behavior on this large sparse checkout. The #105 rerun did not reproduce
the V8 Wasm `Fatal process out of memory: Zone` failure after the guardrail was
scoped to the JS/TS/config slice.

RSS remains unavailable inside this sandbox when process-list access is denied.
The profiler now documents that limitation in its help text and records a
sandbox-specific `rssUnavailableReason` instead of leaving RSS ambiguity.

## Phase 6 Completion

Phase 6 delivered the intended JS/TS Rust indexing completeness slices:

- TypeScript enum symbol extraction is covered by parity tests.
- HOF-wrapped class-field method detection is covered by parity tests.
- The end-to-end Rust graph pipeline decision is recorded as `prototype-first`.
- The final large-target profile and sufficiency smoke were recorded without
  default-rollout claims.

The final decision is `ready for end-to-end prototype`, not default rollout.
The next plan should test a narrow Rust graph-production boundary, starting
with `name matcher only`, while preserving per-reference disambiguation
semantics and Agent Sufficiency.

## 41. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T08:41:58.814Z",
  "toolchain": {
    "node": "v24.14.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 11518,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-8LWmEU",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 212394,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 232616,
          "peakRssBytes": null,
          "rssUnavailableReason": "spawnSync ps EPERM"
        }
      },
      "wallMs": 234294,
      "result": {
        "success": true,
        "filesIndexed": 11291,
        "filesSkipped": 0,
        "filesErrored": 29,
        "nodesCreated": 561947,
        "edgesCreated": 1678092,
        "durationMs": 122486,
        "errors": [
          {
            "message": "extensions/copilot/src/extension/prompt/node/intentDetector.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/panel/search.tsx: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts: parse error",
            "severity": "error"
          },
          {
            "message": "extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/workbench/services/search/test/node/fixtures/examples/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 166,
        "parseExtractionMs": 41305,
        "sqliteWriteMs": 69251,
        "typescriptFinalizationMs": 111754,
        "subprocessStartupHandoffMs": 4
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 42,
        "referenceResolutionMs": 100314,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 10156,
          "nameMatchingMs": 36330,
          "frameworkMatchingMs": 988,
          "databaseAccessMs": 49669,
          "cacheWarmupMs": 1304,
          "unresolvedReadMs": 1629,
          "candidateLookupMs": 5953,
          "sharedCandidateLookupMs": 2025,
          "candidateLookupCacheHitMs": 441,
          "perReferenceDisambiguationMs": 32397,
          "edgeMaterializationMs": 370,
          "edgeWriteMs": 25587,
          "unresolvedCleanupMs": 20783,
          "otherResolutionMs": 488
        },
        "dynamicDispatchSynthesisMs": 9844,
        "dbMaintenanceMs": 1177
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 10156,
        "nameMatchingMs": 36330,
        "frameworkMatchingMs": 988,
        "databaseAccessMs": 49669,
        "cacheWarmupMs": 1304,
        "unresolvedReadMs": 1629,
        "candidateLookupMs": 5953,
        "sharedCandidateLookupMs": 2025,
        "candidateLookupCacheHitMs": 441,
        "perReferenceDisambiguationMs": 32397,
        "edgeMaterializationMs": 370,
        "edgeWriteMs": 25587,
        "unresolvedCleanupMs": 20783,
        "otherResolutionMs": 488
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "databaseAccessMs"
    }
  ]
}
```

## 42. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T08:52:13.959Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "275e1b31",
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20879,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          },
          "rust": {
            "outputChars": 25190,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [],
            "deterministicGenericRead": 0,
            "deterministicGenericGrep": 0,
            "classification": "no regression"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 43. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T10:28:47.011Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "phase7-reduced",
      "sourcePath": "/tmp/zcodegraph-phase7-reduced-wm072R",
      "commit": null,
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 3,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-phase7-reduced-rust-profile-wR2ESj",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 217,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 107,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        }
      },
      "wallMs": 19,
      "result": {
        "success": true,
        "filesIndexed": 2,
        "filesSkipped": 0,
        "filesErrored": 0,
        "nodesCreated": 10,
        "edgesCreated": 15,
        "durationMs": 5,
        "errors": []
      },
      "profile": {
        "sourceScanMs": 0,
        "parseExtractionMs": 0,
        "sqliteWriteMs": 3,
        "typescriptFinalizationMs": 12,
        "subprocessStartupHandoffMs": 1
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 0,
        "referenceResolutionMs": 8,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 0,
          "nameMatchingMs": 1,
          "frameworkMatchingMs": 0,
          "databaseAccessMs": 2,
          "cacheWarmupMs": 1,
          "unresolvedReadMs": 0,
          "candidateLookupMs": 0,
          "sharedCandidateLookupMs": 0,
          "candidateLookupCacheHitMs": 0,
          "perReferenceDisambiguationMs": 1,
          "rustMatcherMs": 3,
          "rustMatcherStartupMs": 0,
          "rustMatcherSerializationMs": 0,
          "rustMatcherEligibleRefs": 12,
          "rustMatcherHandledRefs": 7,
          "rustMatcherFallbackRefs": 5,
          "rustMatcherSemanticMismatchRefs": 0,
          "rustMatcherFallbackReasons": {
            "unresolved": 5
          },
          "edgeMaterializationMs": 0,
          "edgeWriteMs": 1,
          "unresolvedCleanupMs": 0,
          "otherResolutionMs": 0
        },
        "dynamicDispatchSynthesisMs": 1,
        "dbMaintenanceMs": 0
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 0,
        "nameMatchingMs": 1,
        "frameworkMatchingMs": 0,
        "databaseAccessMs": 2,
        "cacheWarmupMs": 1,
        "unresolvedReadMs": 0,
        "candidateLookupMs": 0,
        "sharedCandidateLookupMs": 0,
        "candidateLookupCacheHitMs": 0,
        "perReferenceDisambiguationMs": 1,
        "rustMatcherMs": 3,
        "rustMatcherStartupMs": 0,
        "rustMatcherSerializationMs": 0,
        "rustMatcherEligibleRefs": 12,
        "rustMatcherHandledRefs": 7,
        "rustMatcherFallbackRefs": 5,
        "rustMatcherSemanticMismatchRefs": 0,
        "rustMatcherFallbackReasons": {
          "unresolved": 5
        },
        "edgeMaterializationMs": 0,
        "edgeWriteMs": 1,
        "unresolvedCleanupMs": 0,
        "otherResolutionMs": 0
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "rustMatcherMs"
    }
  ]
}
```

## 44. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-results-and-decision.md`

# Rust Indexing Core Phase 7 Results And Decision

Parent plan: [Rust Indexing Core Phase 7 Guarded Name Matcher Prototype Plan](../plans/2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md)

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

## Classification

Classification: `continue matcher prototype`.

Phase 7 added a guarded Rust-assisted name matcher prototype behind explicit
opt-in. The implementation replaces the actual ReferenceResolver
name-matching subpath only when `ZCODEGRAPH_RUST_NAME_MATCHER=1` is set. The
default TypeScript resolver path remains unchanged.

This phase does not claim default rollout readiness and does not claim that
Rust beats TypeScript end to end.

## What Landed

- A narrow TypeScript-to-Rust batch protocol for name-matcher decisions.
- A Rust core `match-name` command that reads candidate facts from stdin and
  returns matcher decisions and diagnostics.
- Guarded actual resolver integration: TypeScript still performs candidate
  lookup, import/framework orchestration, graph mutation, edge writes, and
  unresolved-reference cleanup.
- TypeScript semantic verification for Rust decisions. Unsupported, unresolved,
  invalid, erroring, or semantic-mismatching Rust decisions fall back to the
  TypeScript matcher.
- Metrics for `rustMatcherMs`, `rustMatcherStartupMs`,
  `rustMatcherSerializationMs`, `rustMatcherEligibleRefs`,
  `rustMatcherHandledRefs`, `rustMatcherFallbackRefs`,
  `rustMatcherSemanticMismatchRefs`, and fallback reason taxonomy.
- RSS evidence or unavailable reason is preserved from the profile harness.

## Reduced Fixture Evidence

Raw artifact: [Phase 7 reduced profile](2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json)

The reduced fixture was run with:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo phase7-reduced=/tmp/zcodegraph-phase7-reduced-wm072R --rust-core target/debug/zcodegraph-core
```

Observed reduced-fixture profile:

- `rustMatcherEligibleRefs`: 12
- `rustMatcherHandledRefs`: 7
- `rustMatcherFallbackRefs`: 5
- `rustMatcherSemanticMismatchRefs`: 0
- `rustMatcherFallbackReasons`: `{ "unresolved": 5 }`
- `rustMatcherMs`: 3
- `rustMatcherStartupMs`: 0
- `rustMatcherSerializationMs`: 0
- `referenceResolutionMs`: 8
- `nameMatchingMs`: 1
- `perReferenceDisambiguationMs`: 1

RSS was unavailable in the profile harness:

- `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

The reduced fixture supports the trend that the guarded path can handle a
subset of JS/TS name-matching references with no semantic mismatches while
surfacing fallback taxonomy. It is not enough to promote the matcher beyond the
prototype path.

## Large-Target Evidence

Phase 7 used a large VS Code JS/TS sparse checkout at commit `4ac5322601c`.
The checkout contained 1,725 JS/TS source files and 1,727 copied JS/TS/config
files in the profile harness.

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --rust-core target/debug/zcodegraph-core
```

Raw artifact: [Phase 7 VS Code profile](2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json)

Observed VS Code sparse profile:

- `phase1CopiedFiles`: 1,727
- TypeScript engine wall time: 61,521 ms
- Rust engine wall time: 39,343 ms
- Rust profile wall time: 39,309 ms
- `filesIndexed`: 1,725
- `filesErrored`: 3
- `nodesCreated`: 60,929
- `edgesCreated`: 162,438
- `referenceResolutionMs`: 27,903 ms finalization wall bucket
- `rustMatcherEligibleRefs`: 145,320
- `rustMatcherHandledRefs`: 104,375
- `rustMatcherFallbackRefs`: 48,800
- `rustMatcherSemanticMismatchRefs`: 12
- `rustMatcherFallbackReasons`: `{ "unresolved": 48788, "semantic-mismatch": 12 }`
- `rustMatcherMs`: 20,699
- `rustMatcherSerializationMs`: 838
- `nameMatchingMs`: 1,164
- `perReferenceDisambiguationMs`: 1,113
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

RSS was unavailable in the profile harness:

- `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

## Sufficiency Smoke

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

Raw artifact: [Phase 7 VS Code sufficiency smoke](2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json)

Observed sufficiency smoke:

- `regressions`: `[]`
- Prompt `VS-1` expected symbols were present in both TypeScript and Rust outputs.
- TypeScript output: no Flow section, deterministic Read/Grep fallback risk 1/1,
  classification `graph coverage`.
- Rust output: no Flow section, deterministic Read/Grep fallback risk 1/1,
  classification `graph coverage`.

The smoke does not show a Rust-specific sufficiency regression, but it also does
not prove the VS Code flow is sufficient. Both TypeScript and Rust outputs still
lack a connected Flow section for this prompt.

## Decision

Keep the Rust-assisted matcher behind opt-in and continue the matcher
prototype. The implementation is now wired through the actual resolver
name-matching subpath with guarded fallback, but promotion is blocked by the
large-target Rust matcher overhead, the remaining fallback rate, and observed
semantic mismatches.

Follow-up work should focus on:

- reducing the fallback taxonomy for eligible JS/TS matcher inputs;
- reducing `rustMatcherMs` and serialization overhead on large JS/TS batches;
- driving `rustMatcherSemanticMismatchRefs` to zero before any promotion;
- improving graph coverage for the VS Code sufficiency prompt if this prompt is
  retained as a gate;
- deciding whether to keep expanding the matcher prototype or pivot back to
  TypeScript resolver/data-model optimization.

## 45. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T12:10:03.967Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/tmp/zcodegraph-phase7-vscode-sparse",
      "commit": "4ac5322601c",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 1727,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-iDwLZR",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 61521,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 39343,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        }
      },
      "wallMs": 39309,
      "result": {
        "success": true,
        "filesIndexed": 1725,
        "filesSkipped": 0,
        "filesErrored": 3,
        "nodesCreated": 60929,
        "edgesCreated": 162438,
        "durationMs": 11390,
        "errors": [
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 9,
        "parseExtractionMs": 4261,
        "sqliteWriteMs": 5569,
        "typescriptFinalizationMs": 27903,
        "subprocessStartupHandoffMs": 2
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 13,
        "referenceResolutionMs": 27050,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 851,
          "nameMatchingMs": 1164,
          "frameworkMatchingMs": 4,
          "databaseAccessMs": 2629,
          "cacheWarmupMs": 27,
          "unresolvedReadMs": 123,
          "candidateLookupMs": 493,
          "sharedCandidateLookupMs": 69,
          "candidateLookupCacheHitMs": 142,
          "perReferenceDisambiguationMs": 1113,
          "rustMatcherMs": 20699,
          "rustMatcherStartupMs": 0,
          "rustMatcherSerializationMs": 838,
          "rustMatcherEligibleRefs": 145320,
          "rustMatcherHandledRefs": 104375,
          "rustMatcherFallbackRefs": 48800,
          "rustMatcherSemanticMismatchRefs": 12,
          "rustMatcherFallbackReasons": {
            "unresolved": 48788,
            "semantic-mismatch": 12
          },
          "edgeMaterializationMs": 32,
          "edgeWriteMs": 1303,
          "unresolvedCleanupMs": 1144,
          "otherResolutionMs": 29
        },
        "dynamicDispatchSynthesisMs": 799,
        "dbMaintenanceMs": 14
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 851,
        "nameMatchingMs": 1164,
        "frameworkMatchingMs": 4,
        "databaseAccessMs": 2629,
        "cacheWarmupMs": 27,
        "unresolvedReadMs": 123,
        "candidateLookupMs": 493,
        "sharedCandidateLookupMs": 69,
        "candidateLookupCacheHitMs": 142,
        "perReferenceDisambiguationMs": 1113,
        "rustMatcherMs": 20699,
        "rustMatcherStartupMs": 0,
        "rustMatcherSerializationMs": 838,
        "rustMatcherEligibleRefs": 145320,
        "rustMatcherHandledRefs": 104375,
        "rustMatcherFallbackRefs": 48800,
        "rustMatcherSemanticMismatchRefs": 12,
        "rustMatcherFallbackReasons": {
          "unresolved": 48788,
          "semantic-mismatch": 12
        },
        "edgeMaterializationMs": 32,
        "edgeWriteMs": 1303,
        "unresolvedCleanupMs": 1144,
        "otherResolutionMs": 29
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "rustMatcherMs"
    }
  ]
}
```

## 46. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T12:12:32.200Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "runtimeWarnings": [
    "Node.js >=25 is outside the supported runtime range and may trigger V8 Wasm tiering instability on large tree-sitter workloads."
  ],
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/tmp/zcodegraph-phase7-vscode-sparse",
      "commit": "4ac5322601c",
      "copyMode": "js-ts-config-slice",
      "copies": {
        "typescript": {
          "copiedFiles": 1727,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-dSVJm6"
        },
        "rust": {
          "copiedFiles": 1727,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-0La19a"
        }
      },
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 25202,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 25035,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 47. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T13:24:02.226Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "zcodegraph",
      "sourcePath": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph",
      "commit": "1df809d",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 289,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-zcodegraph-rust-profile-MIvMg1",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 4155,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 4440,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        }
      },
      "wallMs": 4414,
      "result": {
        "success": true,
        "filesIndexed": 280,
        "filesSkipped": 0,
        "filesErrored": 1,
        "nodesCreated": 13841,
        "edgesCreated": 30548,
        "durationMs": 2401,
        "errors": [
          {
            "message": "__tests__/explore-planner.test.ts: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 1,
        "parseExtractionMs": 1050,
        "sqliteWriteMs": 1041,
        "typescriptFinalizationMs": 2002,
        "subprocessStartupHandoffMs": 1
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 4,
        "referenceResolutionMs": 1650,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 85,
          "nameMatchingMs": 92,
          "frameworkMatchingMs": 12,
          "databaseAccessMs": 310,
          "cacheWarmupMs": 5,
          "unresolvedReadMs": 37,
          "candidateLookupMs": 56,
          "sharedCandidateLookupMs": 6,
          "candidateLookupCacheHitMs": 19,
          "perReferenceDisambiguationMs": 84,
          "rustMatcherMs": 918,
          "rustMatcherStartupMs": 0,
          "rustMatcherSerializationMs": 79,
          "rustMatcherEligibleRefs": 37332,
          "rustMatcherHandledRefs": 17346,
          "rustMatcherFallbackRefs": 19468,
          "rustMatcherSemanticMismatchRefs": 30,
          "rustMatcherSemanticMismatchSamples": [
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-sdk.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "get",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "method:a88758b2038874051ced456538080316",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "close",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "method:765abd9763f69ff18055bd224d818417",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "match",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
              "tsResolvedBy": "fuzzy",
              "tsConfidence": 0.3,
              "reason": "different-method"
            },
            {
              "referenceName": "basename",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "constant:08467482213fa747f763b7400adbc370",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "release/npm/main/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "scripts/npm-sdk.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "get",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "method:a88758b2038874051ced456538080316",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "close",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "method:765abd9763f69ff18055bd224d818417",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "resolve",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "match",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
              "tsResolvedBy": "fuzzy",
              "tsConfidence": 0.3,
              "reason": "different-method"
            },
            {
              "referenceName": "basename",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "constant:08467482213fa747f763b7400adbc370",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "write",
              "referenceKind": "calls",
              "filePath": "scripts/npm-shim.js",
              "language": "javascript",
              "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.4,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            }
          ],
          "rustMatcherFallbackReasons": {
            "missing-candidate-facts": 17266,
            "rust-unresolved": 220,
            "outside-matcher-boundary": 1952,
            "semantic-mismatch": 30
          },
          "rustMatcherCandidateMaterializationMs": 87,
          "rustMatcherSubprocessMs": 918,
          "rustMatcherTsVerificationMs": 75,
          "rustMatcherPayloadBytes": 38313246,
          "rustMatcherUniqueCandidateFacts": 13692,
          "edgeMaterializationMs": 6,
          "edgeWriteMs": 127,
          "unresolvedCleanupMs": 135,
          "otherResolutionMs": 13
        },
        "dynamicDispatchSynthesisMs": 334,
        "dbMaintenanceMs": 5
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 85,
        "nameMatchingMs": 92,
        "frameworkMatchingMs": 12,
        "databaseAccessMs": 310,
        "cacheWarmupMs": 5,
        "unresolvedReadMs": 37,
        "candidateLookupMs": 56,
        "sharedCandidateLookupMs": 6,
        "candidateLookupCacheHitMs": 19,
        "perReferenceDisambiguationMs": 84,
        "rustMatcherMs": 918,
        "rustMatcherStartupMs": 0,
        "rustMatcherSerializationMs": 79,
        "rustMatcherEligibleRefs": 37332,
        "rustMatcherHandledRefs": 17346,
        "rustMatcherFallbackRefs": 19468,
        "rustMatcherSemanticMismatchRefs": 30,
        "rustMatcherSemanticMismatchSamples": [
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-sdk.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "get",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "method:a88758b2038874051ced456538080316",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "close",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "method:765abd9763f69ff18055bd224d818417",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "match",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
            "tsResolvedBy": "fuzzy",
            "tsConfidence": 0.3,
            "reason": "different-method"
          },
          {
            "referenceName": "basename",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "constant:08467482213fa747f763b7400adbc370",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "release/npm/main/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "scripts/npm-sdk.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "get",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "method:a88758b2038874051ced456538080316",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "close",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "method:765abd9763f69ff18055bd224d818417",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "resolve",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:eb3200953b89192f0de7cf07220f36c9",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "match",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": "function:804c4a98c51559568f5c6f7dcb7ab6cb",
            "tsResolvedBy": "fuzzy",
            "tsConfidence": 0.3,
            "reason": "different-method"
          },
          {
            "referenceName": "basename",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "constant:08467482213fa747f763b7400adbc370",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "write",
            "referenceKind": "calls",
            "filePath": "scripts/npm-shim.js",
            "language": "javascript",
            "rustTargetNodeId": "function:de02329860aeee8e1d94b32cbefa7e0f",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.4,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          }
        ],
        "rustMatcherFallbackReasons": {
          "missing-candidate-facts": 17266,
          "rust-unresolved": 220,
          "outside-matcher-boundary": 1952,
          "semantic-mismatch": 30
        },
        "rustMatcherCandidateMaterializationMs": 87,
        "rustMatcherSubprocessMs": 918,
        "rustMatcherTsVerificationMs": 75,
        "rustMatcherPayloadBytes": 38313246,
        "rustMatcherUniqueCandidateFacts": 13692,
        "edgeMaterializationMs": 6,
        "edgeWriteMs": 127,
        "unresolvedCleanupMs": 135,
        "otherResolutionMs": 13
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "rustMatcherMs"
    }
  ]
}
```

## 48. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-results-and-decision.md`

# Rust Indexing Core Phase 8 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Plan: [Phase 8 matcher viability hardening](../plans/2026-06-14-rust-indexing-core-phase-8-matcher-viability-hardening.md)

Tracker: #119

## Decision

Phase 8 classification: **continue matcher prototype**.

The guarded Rust matcher remains opt-in. Phase 8 did not establish default rollout readiness and did not promote the guarded path. The bounded candidate-payload dedup work produced a useful performance trend on the same VS Code sparse scope, but `rustMatcherSemanticMismatchRefs` remains non-zero and the VS Code `VS-1` sufficiency gap remains graph coverage work tracked by #113.

#113 is still a separate graph coverage issue and is not a Phase 8 blocker.

## Artifacts

- Reduced profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json)
- VS Code profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json)
- VS Code sufficiency raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json)

## Implementation Summary

Phase 8 stayed inside the guarded matcher boundary:

- Added semantic mismatch samples with reference facts, Rust decision facts, TypeScript decision facts, and a mismatch reason.
- Replaced the opaque `unresolved` bucket with decision-oriented fallback reasons.
- Fixed one bounded Rust matcher true gap: class member matching now accepts function-shaped member facts when the qualified name proves class membership.
- Added profile buckets for candidate materialization, subprocess handoff, TypeScript verification, payload bytes, and unique candidate facts.
- Added a batch-level candidate table protocol so repeated candidate facts are sent once and each reference carries candidate ids.

No schema changes, direct Rust SQLite reads, Rust edge writes, import resolution migration, framework migration, or dynamic synthesis migration were introduced.

## Reduced Profile

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo zcodegraph=. --rust-core target/debug/zcodegraph-core
```

Summary:

- Scope: 289 copied JS/TS/config files; 280 indexed JS/TS files.
- TypeScript measured wall: 4,155 ms.
- Rust measured wall: 4,440 ms.
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`.
- RSS: unavailable for both engines; reason was `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Matcher profile:

- `rustMatcherMs`: 918
- `rustMatcherSerializationMs`: 79
- `rustMatcherEligibleRefs`: 37,332
- `rustMatcherHandledRefs`: 17,346
- `rustMatcherFallbackRefs`: 19,468
- `rustMatcherSemanticMismatchRefs`: 30
- `rustMatcherSemanticMismatchSamples`: 30
- `rustMatcherFallbackReasons`: `{ "missing-candidate-facts": 17266, "rust-unresolved": 220, "outside-matcher-boundary": 1952, "semantic-mismatch": 30 }`
- `rustMatcherCandidateMaterializationMs`: 87
- `rustMatcherSubprocessMs`: 918
- `rustMatcherTsVerificationMs`: 75
- `rustMatcherPayloadBytes`: 38,313,246
- `rustMatcherUniqueCandidateFacts`: 13,692

## VS Code Profile

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --rust-core target/debug/zcodegraph-core
```

Scope:

- Repository: `https://github.com/microsoft/vscode`
- Local sparse checkout: `/tmp/zcodegraph-phase7-vscode-sparse`
- Commit: `4ac5322601c`
- Copied JS/TS/config files: 1,727
- Indexed JS/TS files: 1,725
- Files errored: 3

Before/after against Phase 7:

| Metric | Phase 7 | Phase 8 | Interpretation |
|---|---:|---:|---|
| `rustMatcherMs` | 20,699 | 7,972 | Candidate payload dedup and protocol tightening produced a positive trend. |
| `rustMatcherSerializationMs` | 838 | 552 | Serialization improved, but payload size is still large enough to matter. |
| `rustMatcherEligibleRefs` | 145,320 | 145,320 | Same-scope comparison preserved. |
| `rustMatcherHandledRefs` | 104,375 | 104,375 | No handled-volume regression. |
| `rustMatcherFallbackRefs` | 48,800 | 39,384 | Count is now final taxonomy after guarded verification, not the old opaque raw bucket. |
| `rustMatcherSemanticMismatchRefs` | 12 | 12 | Still non-zero; this blocks promotion. |

Phase 8 fallback taxonomy:

- `outside-matcher-boundary`: 13,484
- `missing-candidate-facts`: 24,226
- `rust-unresolved`: 1,662
- `semantic-mismatch`: 12

There is no `unresolved` bucket in the Phase 8 VS Code profile.

Phase 8 cost attribution:

- `rustMatcherCandidateMaterializationMs`: 584
- `rustMatcherSubprocessMs`: 7,972
- `rustMatcherTsVerificationMs`: 1,072
- `rustMatcherPayloadBytes`: 342,838,941
- `rustMatcherUniqueCandidateFacts`: 208,070
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

RSS:

- TypeScript `peakRssBytes`: unavailable.
- TypeScript `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.
- Rust `peakRssBytes`: unavailable.
- Rust `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## VS Code Sufficiency Smoke

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

Result:

- `regressions`: `[]`
- Prompt: `VS-1`
- TypeScript: no Flow section, `flowConnected=false`, classification `graph coverage`.
- Rust: no Flow section, `flowConnected=false`, classification `graph coverage`.
- Missing expected symbols: none for both engines.

This reproduces the Phase 7 conclusion: the VS Code `VS-1` sufficiency gap is not proven matcher-specific. It remains #113 graph coverage work.

## Follow-Up

Continue only as an opt-in matcher prototype. The next matcher-specific work should focus on reducing the 12 semantic mismatches and deciding whether the remaining `rust-unresolved` bucket has enough true matcher gaps to justify another bounded Rust slice. If that does not produce a stronger trend, pivot to TypeScript resolver optimization instead of expanding Rust resolver ownership.

## 49. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json`

```json
{
  "generatedAt": "2026-06-14T13:26:03.936Z",
  "toolchain": {
    "node": "v26.0.0",
    "platform": "darwin",
    "arch": "arm64",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10,
    "totalMemoryBytes": 17179869184
  },
  "rustCore": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/tmp/zcodegraph-phase7-vscode-sparse",
      "commit": "4ac5322601c",
      "profileSource": "docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md#66",
      "phase1CopiedFiles": 1727,
      "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-rust-profile-e7JCNu",
      "engines": {
        "typescript": {
          "engine": "typescript",
          "wallMs": 30031,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        },
        "rust": {
          "engine": "rust",
          "wallMs": 26488,
          "peakRssBytes": null,
          "rssUnavailableReason": "RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)"
        }
      },
      "wallMs": 26297,
      "result": {
        "success": true,
        "filesIndexed": 1725,
        "filesSkipped": 0,
        "filesErrored": 3,
        "nodesCreated": 60929,
        "edgesCreated": 162438,
        "durationMs": 11297,
        "errors": [
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js: parse error",
            "severity": "error"
          },
          {
            "message": "src/vs/platform/files/test/node/fixtures/service/deep/employee.js: parse error",
            "severity": "error"
          }
        ]
      },
      "profile": {
        "sourceScanMs": 11,
        "parseExtractionMs": 4283,
        "sqliteWriteMs": 5482,
        "typescriptFinalizationMs": 14983,
        "subprocessStartupHandoffMs": 2
      },
      "finalizationSubphases": {
        "frameworkPostExtractMs": 13,
        "referenceResolutionMs": 14110,
        "referenceResolutionBreakdown": {
          "importResolutionMs": 939,
          "nameMatchingMs": 1137,
          "frameworkMatchingMs": 3,
          "databaseAccessMs": 2632,
          "cacheWarmupMs": 31,
          "unresolvedReadMs": 154,
          "candidateLookupMs": 505,
          "sharedCandidateLookupMs": 72,
          "candidateLookupCacheHitMs": 147,
          "perReferenceDisambiguationMs": 1079,
          "rustMatcherMs": 7972,
          "rustMatcherStartupMs": 0,
          "rustMatcherSerializationMs": 552,
          "rustMatcherEligibleRefs": 145320,
          "rustMatcherHandledRefs": 104375,
          "rustMatcherFallbackRefs": 39384,
          "rustMatcherSemanticMismatchRefs": 12,
          "rustMatcherSemanticMismatchSamples": [
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "callback",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "getContext",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "callback",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "getContext",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "callback",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "push",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            },
            {
              "referenceName": "getContext",
              "referenceKind": "calls",
              "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
              "language": "javascript",
              "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
              "rustResolvedBy": "exact-match",
              "rustConfidence": 0.7,
              "tsTargetNodeId": null,
              "tsResolvedBy": null,
              "tsConfidence": null,
              "reason": "ts-baseline-unresolved"
            }
          ],
          "rustMatcherFallbackReasons": {
            "outside-matcher-boundary": 13484,
            "missing-candidate-facts": 24226,
            "rust-unresolved": 1662,
            "semantic-mismatch": 12
          },
          "rustMatcherCandidateMaterializationMs": 584,
          "rustMatcherSubprocessMs": 7972,
          "rustMatcherTsVerificationMs": 1072,
          "rustMatcherPayloadBytes": 342838941,
          "rustMatcherUniqueCandidateFacts": 208070,
          "edgeMaterializationMs": 31,
          "edgeWriteMs": 1263,
          "unresolvedCleanupMs": 1153,
          "otherResolutionMs": 36
        },
        "dynamicDispatchSynthesisMs": 816,
        "dbMaintenanceMs": 21
      },
      "referenceResolutionBreakdown": {
        "importResolutionMs": 939,
        "nameMatchingMs": 1137,
        "frameworkMatchingMs": 3,
        "databaseAccessMs": 2632,
        "cacheWarmupMs": 31,
        "unresolvedReadMs": 154,
        "candidateLookupMs": 505,
        "sharedCandidateLookupMs": 72,
        "candidateLookupCacheHitMs": 147,
        "perReferenceDisambiguationMs": 1079,
        "rustMatcherMs": 7972,
        "rustMatcherStartupMs": 0,
        "rustMatcherSerializationMs": 552,
        "rustMatcherEligibleRefs": 145320,
        "rustMatcherHandledRefs": 104375,
        "rustMatcherFallbackRefs": 39384,
        "rustMatcherSemanticMismatchRefs": 12,
        "rustMatcherSemanticMismatchSamples": [
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "callback",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "getContext",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/examples/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "callback",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "getContext",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/resolver/other/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "callback",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "constant:d59a387c4e62185f1b4b3fcf88b25833",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "push",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          },
          {
            "referenceName": "getContext",
            "referenceKind": "calls",
            "filePath": "src/vs/platform/files/test/node/fixtures/service/deep/conway.js",
            "language": "javascript",
            "rustTargetNodeId": "method:f3b7a9c1e511db1504978635f4031507",
            "rustResolvedBy": "exact-match",
            "rustConfidence": 0.7,
            "tsTargetNodeId": null,
            "tsResolvedBy": null,
            "tsConfidence": null,
            "reason": "ts-baseline-unresolved"
          }
        ],
        "rustMatcherFallbackReasons": {
          "outside-matcher-boundary": 13484,
          "missing-candidate-facts": 24226,
          "rust-unresolved": 1662,
          "semantic-mismatch": 12
        },
        "rustMatcherCandidateMaterializationMs": 584,
        "rustMatcherSubprocessMs": 7972,
        "rustMatcherTsVerificationMs": 1072,
        "rustMatcherPayloadBytes": 342838941,
        "rustMatcherUniqueCandidateFacts": 208070,
        "edgeMaterializationMs": 31,
        "edgeWriteMs": 1263,
        "unresolvedCleanupMs": 1153,
        "otherResolutionMs": 36
      },
      "dominantFinalizationSubphase": "referenceResolutionMs",
      "dominantReferenceResolutionSubpath": "rustMatcherMs"
    }
  ]
}
```

## 50. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T13:27:22.187Z",
  "mode": "deterministic-tool-surface",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "runtimeWarnings": [
    "Node.js >=25 is outside the supported runtime range and may trigger V8 Wasm tiering instability on large tree-sitter workloads."
  ],
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/tmp/zcodegraph-phase7-vscode-sparse",
      "commit": "4ac5322601c",
      "copyMode": "js-ts-config-slice",
      "copies": {
        "typescript": {
          "copiedFiles": 1727,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-m6jBjd"
        },
        "rust": {
          "copiedFiles": 1727,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-blhYbR"
        }
      },
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 25202,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          },
          "rust": {
            "outputChars": 25035,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "graph coverage"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 51. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-results-and-decision.md`

# Rust Indexing Core Phase 9 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issue: #113

Tracker: #124

Implementation issues: #120, #121, #122, #123

## Decision

Phase 9 classification: **bounded success**.

Phase 9 did not achieve full success because the VS Code `VS-1` same-scope smoke still cannot produce a connected Flow section. The deterministic probe changed the diagnosis: on the Phase 8 sparse indexed copies, six of the seven `VS-1` expected symbols are not present in the index at all, and the remaining `start` token is highly ambiguous. The first proven blocker is therefore `missing-symbol`, not a proven missing call edge, missing synthesized edge, or Explore planner pathfinding bug.

The implemented fix was the minimal proven gap: the VS Code sufficiency guardrail no longer treats the `## Exploration: ...` query echo as expected-symbol evidence. That makes the smoke classify `VS-1` as `missing-symbol` instead of falsely reporting all expected symbols present.

Phase 9 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Artifacts

- Probe raw JSON: [2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json)
- Sufficiency validation raw JSON: [2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json)

## Probe Result

Probe command:

```bash
node scripts/phase9-vs1-graph-probe.mjs \
  --repo /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-m6jBjd \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json
```

Prompt:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

Primary classification: `missing-symbol`.

Per-token classification:

| Token | Classification | Candidate count |
|---|---:|---:|
| `AbstractExtensionService` | `missing-symbol` | 0 |
| `_createExtensionHostManager` | `missing-symbol` | 0 |
| `_doCreateExtensionHostManager` | `missing-symbol` | 0 |
| `ExtensionHostManager` | `missing-symbol` | 0 |
| `start` | `ambiguous-symbol` | 26 |
| `ExtensionHostMain` | `missing-symbol` | 0 |
| `MainThreadExtensionService` | `missing-symbol` | 0 |

Explore output still had no Flow section, but the probe shows the stronger root cause is missing expected symbols in the indexed sparse scope.

## Implemented Fix

The sufficiency guardrail now removes the `## Exploration: ...` heading before checking whether expected symbols appear in the returned evidence. This prevents a query string from satisfying its own expected-symbol check.

Focused validation:

```bash
npx vitest run __tests__/phase9-vs1-graph-probe.test.ts
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts -t "query echo"
```

## VS Code Validation

Full same-scope sufficiency rerun was attempted with:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

That run did not produce machine-readable output before the extended wait limit and was interrupted with SIGINT. The raw validation artifact records this as:

- `status`: `unavailable`
- `unavailableReason`: `Timed out after extended wait and was interrupted with SIGINT; no machine-readable output was produced.`

To avoid fabricating a full rerun, Phase 9 also re-ran `zcodegraph_explore` against the existing Phase 8 TypeScript and Rust indexed VS Code sparse copies and applied the corrected expected-symbol analysis.

Corrected validation result:

| Engine | Flow section | Flow connected | Classification | Missing expected |
|---|---:|---:|---|---|
| TypeScript | false | false | `missing-symbol` | 6 |
| Rust | false | false | `missing-symbol` | 6 |

Rust-specific regressions: `[]`.

## Status Of #113

#113 should remain open or be replaced by a narrower follow-up. The current evidence no longer supports the old wording that the same-scope VS Code `VS-1` has all expected symbols but lacks a Flow section. The proven blocker is that the Phase 8 sparse scope does not contain the key extension-host/workbench symbols needed by `VS-1`.

Recommended follow-up:

- Refresh or replace the VS Code sparse target so it includes the source files that define `AbstractExtensionService`, `_createExtensionHostManager`, `_doCreateExtensionHostManager`, `ExtensionHostManager`, `ExtensionHostMain`, and `MainThreadExtensionService`.
- Rerun the deterministic probe on that corrected scope.
- Only then decide whether the next blocker is `missing-static-edge`, `missing-synthesized-edge`, `explore-planner-pathfinding-gap`, or `expected-runtime-boundary`.

## Conclusion

Phase 9 produced a useful correction to the validation harness and a deterministic probe for future VS Code flow work. It did not prove a graph coverage fix is needed yet; it proved the current sparse validation target is insufficient for `VS-1`.

## 52. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json`

```json
{
  "generatedAt": "2026-06-14T14:44:53.213Z",
  "repo": {
    "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-m6jBjd",
    "commit": null
  },
  "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
  "tokens": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "explore": {
    "outputChars": 25202,
    "hasFlowSection": false,
    "flowConnected": false
  },
  "summary": {
    "primaryClassification": "missing-symbol",
    "taxonomy": [
      "missing-symbol",
      "ambiguous-symbol",
      "missing-static-edge",
      "missing-synthesized-edge",
      "explore-planner-pathfinding-gap",
      "expected-runtime-boundary"
    ]
  },
  "classifications": [
    {
      "token": "AbstractExtensionService",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    },
    {
      "token": "_createExtensionHostManager",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    },
    {
      "token": "_doCreateExtensionHostManager",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    },
    {
      "token": "ExtensionHostManager",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    },
    {
      "token": "start",
      "classification": "ambiguous-symbol",
      "candidateCount": 26,
      "callableCandidateCount": 24,
      "candidates": [
        {
          "id": "method:6cb12ff3717cb86493d7a9d7f27aa7cc",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ElectronAgentHostStarter::start",
          "filePath": "src/vs/platform/agentHost/electron-main/electronAgentHostStarter.ts",
          "startLine": 55,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:b1c28eb493cb482da94bb6b1eab74dcc",
              "otherName": "start",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/extensions/electron-main/extensionHostStarter.ts",
              "kind": "calls",
              "line": 114,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:d866fb87d863d56ac8dcbced297169fd",
              "otherName": "createUtilityProcess",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/sharedProcess/electron-main/sharedProcess.ts",
              "kind": "calls",
              "line": 171,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "function:7adec869189c8442fe21d282c31a2edb",
              "otherName": "parseAgentHostDebugPort",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/environment/node/environmentService.ts",
              "kind": "calls",
              "line": 59,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:e86e124aaf902370fe86079f32f9ba5b",
              "otherName": "_resolveShellEnv",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/electron-main/electronAgentHostStarter.ts",
              "kind": "calls",
              "line": 67,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:31a9449dadbed5ad7e22434938c8e0a8",
              "otherName": "buildAgentSdkEnv",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/agentHost/common/agentService.ts",
              "kind": "calls",
              "line": 72,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 73,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 74,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 75,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 76,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 77,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:772caa04469e95884f7ae335269455cc",
              "otherName": "buildAgentHostOTelEnv",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/agentHost/common/agentService.ts",
              "kind": "calls",
              "line": 83,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 84,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 85,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 86,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:312eb22e002c5d1b561176dbd59bdb5b",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeProxyService::start",
          "filePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
          "startLine": 148,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:0d832b2ce790050d075a535ab9f8c71b",
              "otherName": "_start",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/agentHostService.ts",
              "kind": "calls",
              "line": 57,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:3c8b705d905b7616a7030883f1331262",
              "otherName": "authenticate",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeAgent.ts",
              "kind": "calls",
              "line": 288,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeAgent.integrationTest.ts",
              "otherName": "claudeAgent.integrationTest.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeAgent.integrationTest.ts",
              "kind": "calls",
              "line": 680,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 342,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 359,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 360,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 375,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 380,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 387,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 388,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 403,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "file:src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "otherName": "claudeProxyService.test.ts",
              "otherKind": "file",
              "otherFilePath": "src/vs/platform/agentHost/test/node/claudeProxyService.test.ts",
              "kind": "calls",
              "line": 408,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:8a98699597e7401e0a3b5933f547f41b",
              "otherName": "_ensureRuntime",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "calls",
              "line": 153,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:919c7332229b59a5af7b6954778dbbef",
              "otherName": "_releaseHandle",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "calls",
              "line": 177,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 148,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 148,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 169,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:e689ceff2c3a823b49edb219018cb265",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CodexProxyService::start",
          "filePath": "src/vs/platform/agentHost/node/codex/codexProxyService.ts",
          "startLine": 153,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:f617e66e9a8683d396081bdca890d9b4",
              "otherName": "_startConnection",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/codex/codexAgent.ts",
              "kind": "calls",
              "line": 560,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:e3c8a4085236bc66fb6704de72550477",
              "otherName": "_ensureRuntime",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/codex/codexProxyService.ts",
              "kind": "calls",
              "line": 157,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:c06f8505a605b52b31428fd556852043",
              "otherName": "_releaseHandle",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/codex/codexProxyService.ts",
              "kind": "calls",
              "line": 183,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:38dceb274440e28c92de13d20819983b",
              "otherName": "ICodexProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/codex/codexProxyService.ts",
              "kind": "references",
              "line": 153,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:38dceb274440e28c92de13d20819983b",
              "otherName": "ICodexProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/codex/codexProxyService.ts",
              "kind": "references",
              "line": 153,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "property:62bff979c4872b24f2eee66af348e52e",
          "kind": "property",
          "name": "start",
          "qualifiedName": "ByteRange::start",
          "filePath": "src/vs/platform/agentHost/node/codex/protocol/generated/v2/ByteRange.ts",
          "startLine": 9,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "property:412e4778d3631868de0f814cda5dd82b",
          "kind": "property",
          "name": "start",
          "qualifiedName": "TextRange::start",
          "filePath": "src/vs/platform/agentHost/node/codex/protocol/generated/v2/TextRange.ts",
          "startLine": 11,
          "language": "typescript",
          "incoming": [],
          "outgoing": []
        },
        {
          "id": "method:6a80e27a7ff4bda36d0097d6533606d5",
          "kind": "method",
          "name": "start",
          "qualifiedName": "NodeAgentHostStarter::start",
          "filePath": "src/vs/platform/agentHost/node/nodeAgentHostStarter.ts",
          "startLine": 65,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:35932a17707a06fd222f4ffe709d9da7",
              "otherName": "_resolveShellEnv",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/nodeAgentHostStarter.ts",
              "kind": "calls",
              "line": 68,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:31a9449dadbed5ad7e22434938c8e0a8",
              "otherName": "buildAgentSdkEnv",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/agentHost/common/agentService.ts",
              "kind": "calls",
              "line": 80,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 81,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 82,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 83,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 84,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 85,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:772caa04469e95884f7ae335269455cc",
              "otherName": "buildAgentHostOTelEnv",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/agentHost/common/agentService.ts",
              "kind": "calls",
              "line": 92,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 93,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 94,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 95,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:4a19d04ef9aa6196b036ed468621e27d",
              "otherName": "getValue",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/test/electron-browser/remoteAgentHostService.test.ts",
              "kind": "calls",
              "line": 96,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:856734792b49032a880cf2762c1f88f8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FakeClaudeProxyService::start",
          "filePath": "src/vs/platform/agentHost/test/node/claudeAgent.test.ts",
          "startLine": 98,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:f32c5dee42491a82054d0f6388ea0e8d",
              "otherName": "push",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudePromptQueue.ts",
              "kind": "calls",
              "line": 99,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 98,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 98,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:ee96e9c6a263b5018890c0ffd329b649",
          "kind": "method",
          "name": "start",
          "qualifiedName": "RecordingProxyService::start",
          "filePath": "src/vs/platform/agentHost/test/node/claudeAgent.test.ts",
          "startLine": 3105,
          "language": "typescript",
          "incoming": [],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 3105,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:39b109b0cbb8aa5c7812614511423a95",
              "otherName": "IClaudeProxyHandle",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/agentHost/node/claude/claudeProxyService.ts",
              "kind": "references",
              "line": 3105,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:789b7f8734374520e80f9f49d0452cdc",
          "kind": "method",
          "name": "start",
          "qualifiedName": "TestCopilotClient::start",
          "filePath": "src/vs/platform/agentHost/test/node/copilotAgent.test.ts",
          "startLine": 215,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:dc9c374b1d5acabbdec0c15a90296270",
              "otherName": "_ensureClient",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/agentHost/node/copilot/copilotAgent.ts",
              "kind": "calls",
              "line": 637,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": []
        },
        {
          "id": "method:8245b1fbac423bd562e8e6d64a5d6cf2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ElementPicker::start",
          "filePath": "src/vs/platform/browserView/electron-browser/preload-browserView.ts",
          "startLine": 389,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "function:3545750694f7c95c43e2267937d8d1e8",
              "otherName": "init",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/browserView/electron-browser/preload-browserView.ts",
              "kind": "calls",
              "line": 169,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:e61c0918f875b2d05bdf6615b4cd2905",
              "otherName": "acquire",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/browserView/electron-main/browserSessionRemote.ts",
              "kind": "calls",
              "line": 145,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:59b77ed99175b8d25f21f78973bd30ec",
              "otherName": "toggleElementSelection",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/browserView/electron-main/browserViewInspector.ts",
              "kind": "calls",
              "line": 292,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "incoming",
              "otherNodeId": "method:3e5bd8ddbd9cb2753f16c156f9dfeeb2",
              "otherName": "toggleAreaSelection",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/browserView/electron-main/browserViewInspector.ts",
              "kind": "calls",
              "line": 339,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": []
        },
        {
          "id": "method:9d210a63790edfdc0082ebab3c1d1853",
          "kind": "method",
          "name": "start",
          "qualifiedName": "AreaPicker::start",
          "filePath": "src/vs/platform/browserView/electron-browser/preload-browserView.ts",
          "startLine": 821,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "function:3545750694f7c95c43e2267937d8d1e8",
              "otherName": "init",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/browserView/electron-browser/preload-browserView.ts",
              "kind": "calls",
              "line": 175,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:14a5ffc44ca3f0ca958e381620028a89",
              "otherName": "setAttribute",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/quickinput/browser/quickInputBox.ts",
              "kind": "calls",
              "line": 832,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        },
        {
          "id": "method:686df1e90ddb5125cddeef62450b3de6",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ExtensionsLifecycle::start",
          "filePath": "src/vs/platform/extensionManagement/node/extensionLifecycle.ts",
          "startLine": 103,
          "language": "typescript",
          "incoming": [
            {
              "direction": "incoming",
              "otherNodeId": "method:109f3b2a5e77f395d9c3c8a441799714",
              "otherName": "runLifecycleHook",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/extensionManagement/node/extensionLifecycle.ts",
              "kind": "calls",
              "line": 67,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ],
          "outgoing": [
            {
              "direction": "outgoing",
              "otherNodeId": "method:b4435ad3718e7b03dfe56a288f769fd4",
              "otherName": "onStdout",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/utilityProcess/electron-main/utilityProcess.ts",
              "kind": "calls",
              "line": 119,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:3c168c3254221d0f2b0e63b74f0eda38",
              "otherName": "info",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/terminal/test/common/terminalTestHelpers.ts",
              "kind": "calls",
              "line": 119,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "method:8e17b9a5390f64b8d52efe10d857904b",
              "otherName": "onStderr",
              "otherKind": "method",
              "otherFilePath": "src/vs/platform/utilityProcess/electron-main/utilityProcess.ts",
              "kind": "calls",
              "line": 120,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "function:dcb04322369826579a639932951dfc5a",
              "otherName": "error",
              "otherKind": "function",
              "otherFilePath": "src/vs/platform/terminal/test/common/terminalTestHelpers.ts",
              "kind": "calls",
              "line": 120,
              "edgeOrigin": null,
              "synthesizedBy": null
            },
            {
              "direction": "outgoing",
              "otherNodeId": "interface:6cc665f0975036d7d215c88dfbe25fe7",
              "otherName": "ILocalExtension",
              "otherKind": "interface",
              "otherFilePath": "src/vs/platform/extensionManagement/common/extensionManagement.ts",
              "kind": "references",
              "line": 103,
              "edgeOrigin": null,
              "synthesizedBy": null
            }
          ]
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    },
    {
      "token": "MainThreadExtensionService",
      "classification": "missing-symbol",
      "candidateCount": 0,
      "callableCandidateCount": 0,
      "candidates": []
    }
  ]
}
```

## 53. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T14:53:01.831Z",
  "source": "Phase 9 corrected-analysis validation over Phase 8 indexed VS Code sparse copies",
  "fullRerunAttempt": {
    "command": "ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json",
    "status": "unavailable",
    "unavailableReason": "Timed out after extended wait and was interrupted with SIGINT; no machine-readable output was produced."
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/tmp/zcodegraph-phase7-vscode-sparse",
      "commit": "4ac5322601c",
      "copyMode": "existing-phase8-indexed-js-ts-config-slice",
      "copies": {
        "typescript": {
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-m6jBjd"
        },
        "rust": {
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-blhYbR"
        }
      },
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 25202,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [
              "AbstractExtensionService",
              "_createExtensionHostManager",
              "_doCreateExtensionHostManager",
              "ExtensionHostManager",
              "ExtensionHostMain",
              "MainThreadExtensionService"
            ],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "missing-symbol"
          },
          "rust": {
            "outputChars": 25035,
            "hasFlowSection": false,
            "flowConnected": false,
            "missingExpected": [
              "AbstractExtensionService",
              "_createExtensionHostManager",
              "_doCreateExtensionHostManager",
              "ExtensionHostManager",
              "ExtensionHostMain",
              "MainThreadExtensionService"
            ],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "missing-symbol"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 54. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-results-and-decision.md`

# Rust Indexing Core Phase 11 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issues: #49, #130

Tracker: #136

Implementation issues: #131, #132, #133, #134, #135

## Decision

Phase 11 classification: **bounded harness success, sufficiency comparison unavailable**.

The Phase 11 goal was to turn the corrected-target VS Code `VS-1` smoke from a silent no-output run into a bounded, machine-readable artifact. That goal was met: `rust-sufficiency-guardrail.mjs` now supports a staged output contract, unavailable taxonomy, `--out`, `--prompt-id`, `--timeout-ms`, and reuse-indexed pair mode.

The real corrected-target smoke did not complete a TypeScript-vs-Rust comparison. It produced a structured `unsupported-runtime` artifact while running under Node.js 26. The failure happened during the TypeScript index stage after the JS/TS/config slice copy completed. This is a harness/runtime environment blocker, not evidence of a graph semantics regression, matcher regression, or Rust extraction regression.

Phase 11 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Target Contract

The VS Code target was upgraded after Phase 10 from explicit drift to the exact requested commit.

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Local path provenance: local-only
- Expected VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Actual VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Commit drift: none
- Sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Copied JS/TS/config file count: 11518
- Indexed JS/TS file count in the pre-existing local index: 11098

## Artifacts

- Phase 10 decision doc: [2026-06-14-rust-indexing-core-phase-10-results-and-decision.md](2026-06-14-rust-indexing-core-phase-10-results-and-decision.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json)
- Corrected-target smoke raw JSON: [2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json](2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json)

## Implemented Harness Changes

`scripts/rust-sufficiency-guardrail.mjs` now has a Phase 11 evidence contract:

- `status`: `completed`, `failed`, or `unavailable`
- `unavailableKind`: one of `copy-timeout`, `typescript-index-timeout`, `rust-index-timeout`, `explore-timeout`, `missing-index`, `validator-failed`, `process-error`, or `unsupported-runtime`
- staged records for `copy`, `typescriptIndex`, `rustIndex`, `exploreAnalyze`, and `comparison`
- elapsedMs, command provenance, stderr tail or unavailable reason, runtime warnings, partial paths, and default rollout disclaimer
- `--out` for writing the final or partial artifact
- `--prompt-id` for bounded single-prompt smokes such as `VS-1`
- `--timeout-ms` for bounded stage execution
- `--repo-pair name:typescript=...` and `--repo-pair name:rust=...` for reuse-indexed pair mode

Default stdout JSON behavior remains compatible when no new output file option is supplied.

Focused validation:

```bash
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts
npm run build
```

## Validator Result

Validator command:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `sufficiencySmokeAllowed`: `true`
- `commitMatchesExpected`: `true`
- `missingSymbols`: `[]`
- `start` ambiguity count: 138

## Sufficiency Smoke Result

Smoke command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 300000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `unsupported-runtime`
- copy stage: `completed` in 2343ms
- TypeScript index stage: `unavailable` after 295037ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending
- runtime warning: Node.js 26 is outside the supported runtime range

The artifact preserved command provenance, stage elapsedMs, partial temp path, and stderr tail. It did not produce Flow section, `flowConnected`, missing expected symbols, deterministic Read/Grep fallback risk, Rust-specific regression, or TypeScript-vs-Rust comparison status because indexing did not reach Explore.

## Follow-Up Direction

The next blocker is **runtime environment / smoke completion**, not graph semantics.

Recommended next step:

- Run the same Phase 11 smoke under Node.js 22, or
- Create/reuse explicit TypeScript and Rust indexed pairs and run the new reuse-indexed pair mode.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The current artifact did not reach the comparison stage, so it cannot support a graph or Rust regression conclusion.

## Conclusion

Phase 11 fixed the evidence pipeline problem that caused Phase 10 to end with a manually written no-output unavailable artifact. Large-target smoke attempts now produce structured, staged JSON. The corrected exact VS Code target is valid, but TypeScript-vs-Rust sufficiency remains unavailable until the smoke is rerun under a supported runtime or with reusable indexed pairs.

## 55. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json`

```json
{
  "generatedAt": "2026-06-14T16:36:18.717Z",
  "target": {
    "localPath": "/private/tmp/codegraph-corpus/vscode-sparse",
    "localPathProvenance": "local-only",
    "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "commit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "shortCommit": "4ac53226",
    "commitMatchesExpected": true,
    "commitDrift": null,
    "sparsePatterns": [
      ".github",
      "build",
      "extensions",
      "scripts",
      "src",
      "test"
    ],
    "copiedJsTsConfigFileCount": 11518,
    "indexedJsTsFileCount": 11098
  },
  "expectedSymbols": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "symbols": [
    {
      "token": "AbstractExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:5614800952da674403f4da9c2457be5d",
          "kind": "class",
          "name": "AbstractExtensionService",
          "qualifiedName": "AbstractExtensionService",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 60,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_createExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "method:4e7c5f7b23e454b3fa9635eabffe16df",
          "kind": "method",
          "name": "_createExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_createExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 842,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_doCreateExtensionHostManager",
      "candidateCount": 2,
      "candidates": [
        {
          "id": "method:75c6a9f14fbd9ad890eb4e443a6d3385",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 864,
          "language": "typescript"
        },
        {
          "id": "method:df429fc1cbac2b11eca3b2ffadce235d",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "MyTestExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/test/browser/extensionService.test.ts",
          "startLine": 200,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:aa28f1d35cafbd522cede21158da963a",
          "kind": "class",
          "name": "ExtensionHostManager",
          "qualifiedName": "ExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/extensionHostManager.ts",
          "startLine": 58,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "start",
      "candidateCount": 138,
      "candidates": [
        {
          "id": "method:7b404b2424ad94975e97941e0a3a33c7",
          "kind": "method",
          "name": "start",
          "qualifiedName": "activate::Runs::start",
          "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
          "startLine": 131,
          "language": "typescript"
        },
        {
          "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
          "kind": "method",
          "name": "start",
          "qualifiedName": "LanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
          "startLine": 323,
          "language": "typescript"
        },
        {
          "id": "method:c6e06c449351c35f657a71c92550d8bf",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MockLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:1fc45442df97184181c9f455a534d924",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
          "startLine": 312,
          "language": "typescript"
        },
        {
          "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "InProcHttpServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
          "startLine": 99,
          "language": "typescript"
        },
        {
          "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
          "kind": "method",
          "name": "start",
          "qualifiedName": "EmptyRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:5147c17df2464426057952a3caa4bef3",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FullRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
          "startLine": 118,
          "language": "typescript"
        },
        {
          "id": "method:9536e7c01bb10161cff0d6be125de28a",
          "kind": "method",
          "name": "start",
          "qualifiedName": "OpenAILanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
          "startLine": 237,
          "language": "typescript"
        },
        {
          "id": "property:1fdfa2d7595b533e17c04fa16c583077",
          "kind": "property",
          "name": "start",
          "qualifiedName": "HistoryItemChangeRange::start",
          "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
          "startLine": 16,
          "language": "typescript"
        },
        {
          "id": "method:8609d8674f03de2d18d721a127d57fc8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandSessionFactory::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
          "startLine": 62,
          "language": "tsx"
        },
        {
          "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
          "kind": "function",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
          "startLine": 169,
          "language": "typescript"
        },
        {
          "id": "method:5c08e1e93113c11073437f73fa9dae48",
          "kind": "method",
          "name": "start",
          "qualifiedName": "BackgroundSummarizer::start",
          "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
          "startLine": 163,
          "language": "typescript"
        },
        {
          "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
          "kind": "variable",
          "name": "start",
          "qualifiedName": "start",
          "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
          "startLine": 556,
          "language": "tsx"
        },
        {
          "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MemoryCleanupService::start",
          "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
          "startLine": 94,
          "language": "typescript"
        },
        {
          "id": "property:d953784c7b6f8b9670e08278714980b1",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "property:3840270ac71261ee8013db5d0c832e27",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClassTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 391,
          "language": "typescript"
        },
        {
          "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
          "kind": "method",
          "name": "start",
          "qualifiedName": "TypeTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 423,
          "language": "typescript"
        },
        {
          "id": "method:445a376d30627b1ac94645fbac68895d",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CharacterBudget::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
          "startLine": 1186,
          "language": "typescript"
        },
        {
          "id": "property:635d30fbb0cf1ace26a775219947828e",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Tag::start",
          "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
          "startLine": 10,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:d213fc3f824486face8858bc52a3f0a6",
          "kind": "class",
          "name": "ExtensionHostMain",
          "qualifiedName": "ExtensionHostMain",
          "filePath": "src/vs/workbench/api/common/extensionHostMain.ts",
          "startLine": 161,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "MainThreadExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:2e9d6531a66655d63f6762f0da5b297c",
          "kind": "class",
          "name": "MainThreadExtensionService",
          "qualifiedName": "MainThreadExtensionService",
          "filePath": "src/vs/workbench/api/browser/mainThreadExtensionService.ts",
          "startLine": 34,
          "language": "typescript"
        }
      ]
    }
  ],
  "start": {
    "ambiguityCount": 138,
    "candidates": [
      {
        "id": "method:7b404b2424ad94975e97941e0a3a33c7",
        "kind": "method",
        "name": "start",
        "qualifiedName": "activate::Runs::start",
        "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
        "startLine": 131,
        "language": "typescript"
      },
      {
        "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
        "kind": "method",
        "name": "start",
        "qualifiedName": "LanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
        "startLine": 323,
        "language": "typescript"
      },
      {
        "id": "method:c6e06c449351c35f657a71c92550d8bf",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MockLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:1fc45442df97184181c9f455a534d924",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClaudeLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
        "startLine": 312,
        "language": "typescript"
      },
      {
        "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
        "kind": "method",
        "name": "start",
        "qualifiedName": "InProcHttpServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
        "startLine": 99,
        "language": "typescript"
      },
      {
        "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
        "kind": "method",
        "name": "start",
        "qualifiedName": "EmptyRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:5147c17df2464426057952a3caa4bef3",
        "kind": "method",
        "name": "start",
        "qualifiedName": "FullRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
        "startLine": 118,
        "language": "typescript"
      },
      {
        "id": "method:9536e7c01bb10161cff0d6be125de28a",
        "kind": "method",
        "name": "start",
        "qualifiedName": "OpenAILanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
        "startLine": 237,
        "language": "typescript"
      },
      {
        "id": "property:1fdfa2d7595b533e17c04fa16c583077",
        "kind": "property",
        "name": "start",
        "qualifiedName": "HistoryItemChangeRange::start",
        "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
        "startLine": 16,
        "language": "typescript"
      },
      {
        "id": "method:8609d8674f03de2d18d721a127d57fc8",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandSessionFactory::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
        "startLine": 62,
        "language": "tsx"
      },
      {
        "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
        "kind": "function",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
        "startLine": 169,
        "language": "typescript"
      },
      {
        "id": "method:5c08e1e93113c11073437f73fa9dae48",
        "kind": "method",
        "name": "start",
        "qualifiedName": "BackgroundSummarizer::start",
        "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
        "startLine": 163,
        "language": "typescript"
      },
      {
        "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
        "kind": "variable",
        "name": "start",
        "qualifiedName": "start",
        "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
        "startLine": 556,
        "language": "tsx"
      },
      {
        "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MemoryCleanupService::start",
        "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
        "startLine": 94,
        "language": "typescript"
      },
      {
        "id": "property:d953784c7b6f8b9670e08278714980b1",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "property:3840270ac71261ee8013db5d0c832e27",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClassTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 391,
        "language": "typescript"
      },
      {
        "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
        "kind": "method",
        "name": "start",
        "qualifiedName": "TypeTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 423,
        "language": "typescript"
      },
      {
        "id": "method:445a376d30627b1ac94645fbac68895d",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CharacterBudget::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
        "startLine": 1186,
        "language": "typescript"
      },
      {
        "id": "property:635d30fbb0cf1ace26a775219947828e",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Tag::start",
        "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
        "startLine": 10,
        "language": "typescript"
      }
    ]
  },
  "missingSymbols": [],
  "valid": true,
  "sufficiencySmokeAllowed": true,
  "gate": "All expected VS-1 symbols have candidates; sufficiency smoke may run."
}
```

## 56. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-14T16:41:39.038Z",
  "status": "unavailable",
  "mode": "deterministic-tool-surface",
  "command": "/opt/homebrew/Cellar/node/26.0.0/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 300000 --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json",
  "timeoutMs": 300000,
  "unavailableKind": "unsupported-runtime",
  "unavailableReason": "/opt/homebrew/Cellar/node/26.0.0/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-X1x9HL --force --quiet failed in /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-X1x9HL\n------------------------------------------------------------------------\n[CodeGraph] Unsupported Node.js version: 26.0.0\n------------------------------------------------------------------------\nNode.js 25.x has a V8 WASM JIT (turboshaft) Zone allocator bug that\ncrashes with `Fatal process out of memory: Zone` when CodeGraph\ncompiles tree-sitter grammars. CodeGraph WILL crash on this Node\nversion mid-indexing. See https://github.com/colbymchenry/codegraph/issues/81\n\nFix: install Node.js 22 LTS:\n  nvm install 22 && nvm use 22                          # nvm\n  brew install node@22 && brew link --overwrite --force node@22  # Homebrew\n\nTo override (NOT recommended - you will likely OOM):\n  CODEGRAPH_ALLOW_UNSAFE_NODE=1 zcodegraph ...\n------------------------------------------------------------------------\n",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "unavailableTaxonomy": [
    "copy-timeout",
    "typescript-index-timeout",
    "rust-index-timeout",
    "explore-timeout",
    "missing-index",
    "validator-failed",
    "process-error",
    "unsupported-runtime"
  ],
  "defaultRolloutReadinessClaimed": false,
  "runtimeWarnings": [
    "Node.js >=25 is outside the supported runtime range and may trigger V8 Wasm tiering instability on large tree-sitter workloads."
  ],
  "stages": {
    "copy": {
      "status": "completed",
      "elapsedMs": 2343,
      "mode": "js-ts-config-slice"
    },
    "typescriptIndex": {
      "status": "unavailable",
      "elapsedMs": 295037,
      "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-X1x9HL",
      "stderrTail": "------------------------------------------------------------------------\n[CodeGraph] Unsupported Node.js version: 26.0.0\n------------------------------------------------------------------------\nNode.js 25.x has a V8 WASM JIT (turboshaft) Zone allocator bug that\ncrashes with `Fatal process out of memory: Zone` when CodeGraph\ncompiles tree-sitter grammars. CodeGraph WILL crash on this Node\nversion mid-indexing. See https://github.com/colbymchenry/codegraph/issues/81\n\nFix: install Node.js 22 LTS:\n  nvm install 22 && nvm use 22                          # nvm\n  brew install node@22 && brew link --overwrite --force node@22  # Homebrew\n\nTo override (NOT recommended - you will likely OOM):\n  CODEGRAPH_ALLOW_UNSAFE_NODE=1 zcodegraph ...\n------------------------------------------------------------------------\n"
    },
    "rustIndex": {
      "status": "pending",
      "elapsedMs": 0
    },
    "exploreAnalyze": {
      "status": "pending",
      "elapsedMs": 0
    },
    "comparison": {
      "status": "pending",
      "elapsedMs": 0
    }
  },
  "toolchain": {
    "node": "v26.0.0",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [],
  "regressions": []
}
```

## 57. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-results-and-decision.md`

# Rust Indexing Core Phase 12 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issue: #49

Tracker: #141

Implementation issues: #137, #138, #139, #140

## Decision

Phase 12 classification: **supported-runtime blocker advanced to TypeScript indexing timeout**.

Phase 12 removed the Phase 11 `unsupported-runtime` blocker by running the corrected exact VS Code `VS-1` smoke with the confirmed Node.js 22 binary. The smoke still did not reach TypeScript-vs-Rust comparison, but it now fails deeper: the TypeScript index stage did not complete within either the 300s first attempt or the 900s bounded second attempt.

This is not evidence of a graph semantics regression, matcher regression, Explore planner problem, or Rust extraction regression. The run never reached Rust indexing, Explore/analyze, or comparison.

Phase 12 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Runtime Confirmation

Confirmed Node.js 22 binary from #137:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node -v
# v22.21.1
```

The default shell `node` remained Node.js 26 and was not used for the Phase 12 smoke attempts.

## Baseline Target

The Phase 12 baseline is the exact VS Code sparse checkout:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Expected VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Actual VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Commit drift: none
- Sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Copied JS/TS/config file count: 11518
- Indexed JS/TS file count in the pre-existing local index: 11098

The Phase 10 drift-target wording is historical. Phase 12 and later should use this exact target baseline.

## Artifacts

- Phase 11 results: [2026-06-15-rust-indexing-core-phase-11-results-and-decision.md](2026-06-15-rust-indexing-core-phase-11-results-and-decision.md)
- Phase 12 plan: [../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md](../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json)
- Attempt 1 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json)
- Attempt 2 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json)

## Validator Result

Validator command:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `commitMatchesExpected`: `true`
- `missingSymbols`: `[]`
- `sufficiencySmokeAllowed`: `true`
- `start` ambiguity count: 138

The validator hard gate passed before any smoke attempt ran.

## Attempt 1

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  /private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 300000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `typescript-index-timeout`
- runtime: `v22.21.1`
- copy stage: `completed` in 2362ms
- TypeScript index stage: `unavailable` after 294880ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending

Attempt 1 failed before comparison, so Phase 12 allowed exactly one second attempt.

## Attempt 2

Changed variable: timeout only.

Reason: Attempt 1 reached the TypeScript index stage under the supported runtime but timed out at the 300s bound. Increasing the timeout was the smallest allowed variable change to test whether indexing needed more time.

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  /private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 900000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `typescript-index-timeout`
- runtime: `v22.21.1`
- copy stage: `completed` in 1356ms
- TypeScript index stage: `unavailable` after 896017ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending

No additional attempts were run.

## Follow-Up Direction

The current blocker is **TypeScript indexing completion for the exact VS Code JS/TS/config slice**, not supported runtime and not Rust graph semantics.

Recommended follow-up:

- Investigate why the TypeScript indexing path cannot finish the exact VS Code slice within a 900s bounded smoke; or
- Use Phase 11 reuse-indexed pair mode if the next goal is to isolate Explore sufficiency from indexing runtime.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The artifacts did not reach Rust indexing or comparison.

## Conclusion

Phase 12 successfully advanced the evidence beyond Phase 11's Node.js 26 `unsupported-runtime` blocker. Under Node.js 22, the corrected exact target passes validation and the smoke reaches TypeScript indexing, but TypeScript indexing does not complete within the bounded attempts. TypeScript-vs-Rust sufficiency remains unavailable until the TypeScript indexing stage completes or a reuse-indexed pair is used to isolate comparison.

## 58. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json`

```json
{
  "generatedAt": "2026-06-14T17:22:40.691Z",
  "target": {
    "localPath": "/private/tmp/codegraph-corpus/vscode-sparse",
    "localPathProvenance": "local-only",
    "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "commit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "shortCommit": "4ac53226",
    "commitMatchesExpected": true,
    "commitDrift": null,
    "sparsePatterns": [
      ".github",
      "build",
      "extensions",
      "scripts",
      "src",
      "test"
    ],
    "copiedJsTsConfigFileCount": 11518,
    "indexedJsTsFileCount": 11098
  },
  "expectedSymbols": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "symbols": [
    {
      "token": "AbstractExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:5614800952da674403f4da9c2457be5d",
          "kind": "class",
          "name": "AbstractExtensionService",
          "qualifiedName": "AbstractExtensionService",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 60,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_createExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "method:4e7c5f7b23e454b3fa9635eabffe16df",
          "kind": "method",
          "name": "_createExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_createExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 842,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_doCreateExtensionHostManager",
      "candidateCount": 2,
      "candidates": [
        {
          "id": "method:75c6a9f14fbd9ad890eb4e443a6d3385",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 864,
          "language": "typescript"
        },
        {
          "id": "method:df429fc1cbac2b11eca3b2ffadce235d",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "MyTestExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/test/browser/extensionService.test.ts",
          "startLine": 200,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:aa28f1d35cafbd522cede21158da963a",
          "kind": "class",
          "name": "ExtensionHostManager",
          "qualifiedName": "ExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/extensionHostManager.ts",
          "startLine": 58,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "start",
      "candidateCount": 138,
      "candidates": [
        {
          "id": "method:7b404b2424ad94975e97941e0a3a33c7",
          "kind": "method",
          "name": "start",
          "qualifiedName": "activate::Runs::start",
          "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
          "startLine": 131,
          "language": "typescript"
        },
        {
          "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
          "kind": "method",
          "name": "start",
          "qualifiedName": "LanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
          "startLine": 323,
          "language": "typescript"
        },
        {
          "id": "method:c6e06c449351c35f657a71c92550d8bf",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MockLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:1fc45442df97184181c9f455a534d924",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
          "startLine": 312,
          "language": "typescript"
        },
        {
          "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "InProcHttpServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
          "startLine": 99,
          "language": "typescript"
        },
        {
          "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
          "kind": "method",
          "name": "start",
          "qualifiedName": "EmptyRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:5147c17df2464426057952a3caa4bef3",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FullRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
          "startLine": 118,
          "language": "typescript"
        },
        {
          "id": "method:9536e7c01bb10161cff0d6be125de28a",
          "kind": "method",
          "name": "start",
          "qualifiedName": "OpenAILanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
          "startLine": 237,
          "language": "typescript"
        },
        {
          "id": "property:1fdfa2d7595b533e17c04fa16c583077",
          "kind": "property",
          "name": "start",
          "qualifiedName": "HistoryItemChangeRange::start",
          "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
          "startLine": 16,
          "language": "typescript"
        },
        {
          "id": "method:8609d8674f03de2d18d721a127d57fc8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandSessionFactory::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
          "startLine": 62,
          "language": "tsx"
        },
        {
          "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
          "kind": "function",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
          "startLine": 169,
          "language": "typescript"
        },
        {
          "id": "method:5c08e1e93113c11073437f73fa9dae48",
          "kind": "method",
          "name": "start",
          "qualifiedName": "BackgroundSummarizer::start",
          "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
          "startLine": 163,
          "language": "typescript"
        },
        {
          "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
          "kind": "variable",
          "name": "start",
          "qualifiedName": "start",
          "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
          "startLine": 556,
          "language": "tsx"
        },
        {
          "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MemoryCleanupService::start",
          "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
          "startLine": 94,
          "language": "typescript"
        },
        {
          "id": "property:d953784c7b6f8b9670e08278714980b1",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "property:3840270ac71261ee8013db5d0c832e27",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClassTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 391,
          "language": "typescript"
        },
        {
          "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
          "kind": "method",
          "name": "start",
          "qualifiedName": "TypeTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 423,
          "language": "typescript"
        },
        {
          "id": "method:445a376d30627b1ac94645fbac68895d",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CharacterBudget::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
          "startLine": 1186,
          "language": "typescript"
        },
        {
          "id": "property:635d30fbb0cf1ace26a775219947828e",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Tag::start",
          "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
          "startLine": 10,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:d213fc3f824486face8858bc52a3f0a6",
          "kind": "class",
          "name": "ExtensionHostMain",
          "qualifiedName": "ExtensionHostMain",
          "filePath": "src/vs/workbench/api/common/extensionHostMain.ts",
          "startLine": 161,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "MainThreadExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:2e9d6531a66655d63f6762f0da5b297c",
          "kind": "class",
          "name": "MainThreadExtensionService",
          "qualifiedName": "MainThreadExtensionService",
          "filePath": "src/vs/workbench/api/browser/mainThreadExtensionService.ts",
          "startLine": 34,
          "language": "typescript"
        }
      ]
    }
  ],
  "start": {
    "ambiguityCount": 138,
    "candidates": [
      {
        "id": "method:7b404b2424ad94975e97941e0a3a33c7",
        "kind": "method",
        "name": "start",
        "qualifiedName": "activate::Runs::start",
        "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
        "startLine": 131,
        "language": "typescript"
      },
      {
        "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
        "kind": "method",
        "name": "start",
        "qualifiedName": "LanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
        "startLine": 323,
        "language": "typescript"
      },
      {
        "id": "method:c6e06c449351c35f657a71c92550d8bf",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MockLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:1fc45442df97184181c9f455a534d924",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClaudeLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
        "startLine": 312,
        "language": "typescript"
      },
      {
        "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
        "kind": "method",
        "name": "start",
        "qualifiedName": "InProcHttpServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
        "startLine": 99,
        "language": "typescript"
      },
      {
        "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
        "kind": "method",
        "name": "start",
        "qualifiedName": "EmptyRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:5147c17df2464426057952a3caa4bef3",
        "kind": "method",
        "name": "start",
        "qualifiedName": "FullRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
        "startLine": 118,
        "language": "typescript"
      },
      {
        "id": "method:9536e7c01bb10161cff0d6be125de28a",
        "kind": "method",
        "name": "start",
        "qualifiedName": "OpenAILanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
        "startLine": 237,
        "language": "typescript"
      },
      {
        "id": "property:1fdfa2d7595b533e17c04fa16c583077",
        "kind": "property",
        "name": "start",
        "qualifiedName": "HistoryItemChangeRange::start",
        "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
        "startLine": 16,
        "language": "typescript"
      },
      {
        "id": "method:8609d8674f03de2d18d721a127d57fc8",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandSessionFactory::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
        "startLine": 62,
        "language": "tsx"
      },
      {
        "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
        "kind": "function",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
        "startLine": 169,
        "language": "typescript"
      },
      {
        "id": "method:5c08e1e93113c11073437f73fa9dae48",
        "kind": "method",
        "name": "start",
        "qualifiedName": "BackgroundSummarizer::start",
        "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
        "startLine": 163,
        "language": "typescript"
      },
      {
        "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
        "kind": "variable",
        "name": "start",
        "qualifiedName": "start",
        "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
        "startLine": 556,
        "language": "tsx"
      },
      {
        "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MemoryCleanupService::start",
        "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
        "startLine": 94,
        "language": "typescript"
      },
      {
        "id": "property:d953784c7b6f8b9670e08278714980b1",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "property:3840270ac71261ee8013db5d0c832e27",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClassTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 391,
        "language": "typescript"
      },
      {
        "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
        "kind": "method",
        "name": "start",
        "qualifiedName": "TypeTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 423,
        "language": "typescript"
      },
      {
        "id": "method:445a376d30627b1ac94645fbac68895d",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CharacterBudget::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
        "startLine": 1186,
        "language": "typescript"
      },
      {
        "id": "property:635d30fbb0cf1ace26a775219947828e",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Tag::start",
        "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
        "startLine": 10,
        "language": "typescript"
      }
    ]
  },
  "missingSymbols": [],
  "valid": true,
  "sufficiencySmokeAllowed": true,
  "gate": "All expected VS-1 symbols have candidates; sufficiency smoke may run."
}
```

## 59. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json`

```json
{
  "generatedAt": "2026-06-14T17:27:53.778Z",
  "status": "unavailable",
  "mode": "deterministic-tool-surface",
  "command": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 300000 --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json",
  "timeoutMs": 300000,
  "unavailableKind": "typescript-index-timeout",
  "unavailableReason": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-nD1JSC --force --quiet failed in /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-nD1JSC\n(node:71102) ExperimentalWarning: SQLite is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)\n",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "unavailableTaxonomy": [
    "copy-timeout",
    "typescript-index-timeout",
    "rust-index-timeout",
    "explore-timeout",
    "missing-index",
    "validator-failed",
    "process-error",
    "unsupported-runtime"
  ],
  "defaultRolloutReadinessClaimed": false,
  "runtimeWarnings": [],
  "stages": {
    "copy": {
      "status": "completed",
      "elapsedMs": 2362,
      "mode": "js-ts-config-slice"
    },
    "typescriptIndex": {
      "status": "unavailable",
      "elapsedMs": 294880,
      "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-nD1JSC",
      "stderrTail": "(node:71102) ExperimentalWarning: SQLite is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)\n"
    },
    "rustIndex": {
      "status": "pending",
      "elapsedMs": 0
    },
    "exploreAnalyze": {
      "status": "pending",
      "elapsedMs": 0
    },
    "comparison": {
      "status": "pending",
      "elapsedMs": 0
    }
  },
  "toolchain": {
    "node": "v22.21.1",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [],
  "regressions": []
}
```

## 60. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json`

```json
{
  "generatedAt": "2026-06-14T17:43:21.785Z",
  "status": "unavailable",
  "mode": "deterministic-tool-surface",
  "command": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 900000 --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json",
  "timeoutMs": 900000,
  "unavailableKind": "typescript-index-timeout",
  "unavailableReason": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-Hoim43 --force --quiet failed in /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-Hoim43\n(node:73871) ExperimentalWarning: SQLite is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)\n",
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "unavailableTaxonomy": [
    "copy-timeout",
    "typescript-index-timeout",
    "rust-index-timeout",
    "explore-timeout",
    "missing-index",
    "validator-failed",
    "process-error",
    "unsupported-runtime"
  ],
  "defaultRolloutReadinessClaimed": false,
  "runtimeWarnings": [],
  "stages": {
    "copy": {
      "status": "completed",
      "elapsedMs": 1356,
      "mode": "js-ts-config-slice"
    },
    "typescriptIndex": {
      "status": "unavailable",
      "elapsedMs": 896017,
      "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-Hoim43",
      "stderrTail": "(node:73871) ExperimentalWarning: SQLite is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)\n"
    },
    "rustIndex": {
      "status": "pending",
      "elapsedMs": 0
    },
    "exploreAnalyze": {
      "status": "pending",
      "elapsedMs": 0
    },
    "comparison": {
      "status": "pending",
      "elapsedMs": 0
    }
  },
  "toolchain": {
    "node": "v22.21.1",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [],
  "regressions": []
}
```

## 61. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-results-and-decision.md`

# Rust Indexing Core Phase 13 Results and Decision

Date: 2026-06-15

## Summary

Phase 13 added a full-index A/B artifact model for comparing the existing TypeScript indexing path against the existing Rust-enabled CLI/indexing path. The Windows exact VS Code target is validated and indexed for the TypeScript arm. The Rust arm did not produce a graph in this environment, so the formal result is an asymmetric blocker rather than a rollout-ready comparison.

Decision: do not change the default indexing path or Rust matcher/default rollout. Keep Rust disabled by default until a Rust arm graph is produced for the exact VS Code target and VS-1 comparison can run with both arms available.

## Artifacts

- Target validation raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vs1-target-validation.raw.json`
- Phase 13 A/B raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json`

## Target validation

The Phase 12 exact VS Code target was validated on Windows before the Phase 13 run.

| Field | Value |
|---|---:|
| Target path | `C:\workspace\github\corpus\vscode-sparse` |
| Expected commit | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |
| Actual commit | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |
| Commit matches expected | `true` |
| JS/TS/config files in target slice | `11518` |
| Indexed JS/TS files | `11098` |
| Missing expected VS-1 symbols | `[]` |
| Validator valid | `true` |
| Sufficiency smoke allowed | `true` |

## Phase 13 A/B result

The raw artifact uses the new Phase 13 schema while retaining the older consumer-facing fields.

| Field | Value |
|---|---|
| `experimentMode` | `full-index-ab` |
| `executionModel` | `sequential` |
| `mode` | `deterministic-tool-surface-reuse-indexed-arm` |
| `status` | `completed` |
| `classification` | `success-asymmetric-blocker` |
| `comparison.status` | `unavailable` |
| `comparison.reason` | `comparison requires both arms to have graphAvailable=true` |
| `defaultRolloutReadinessClaimed` | `false` |

### TypeScript arm

| Field | Value |
|---|---:|
| Source copy mode | `reuse-indexed-arm` |
| Graph available | `true` |
| Node count | `330853` |
| Edge count | `1515830` |
| File count | `11382` |

### Rust arm

| Field | Value |
|---|---|
| Source copy | `null` |
| Graph available | `false` |
| Diagnostic kind | `missing-index` |
| Diagnostic message | `Missing indexed project for vscode: rust` |

## Classification meaning

`success-asymmetric-blocker` means the harness completed and preserved evidence from the successful arm, but one arm did not produce a graph. Because VS-1 comparison requires both arms to have `graphAvailable=true`, comparison was intentionally skipped and recorded as unavailable rather than failing the whole harness.

This is the expected Phase 13 outcome for the current Windows environment: TypeScript exact-target evidence exists; Rust exact-target evidence does not.

## Implementation notes

The guardrail now records:

- Phase 13 artifact fields: `experimentMode`, `executionModel`, `target`, `arms`, `comparison`, `classification`.
- Per-arm command provenance with an env allowlist.
- Independent source-copy metadata for full A/B runs.
- Sequential arm execution where one arm failure does not discard the other arm's evidence.
- Conditional comparison: run VS-1 only when both arms have graphs.
- Single-arm reuse mode for formal asymmetric evidence when an already indexed exact target exists for only one arm.

The older artifact fields remain present for compatibility: `mode`, `stages`, `results`, `regressions`, `unavailableKind`, and `defaultRolloutReadinessClaimed`.

## Verification

Commands run after implementation:

```bash
npm run build
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts
```

Focused regression result:

```text
Test Files  1 passed (1)
Tests       7 passed | 2 skipped (9)
```

Full build result: passed.

## Follow-up

Before any Rust default rollout claim, produce a Rust graph for the same exact VS Code target and rerun Phase 13 so both arms are available. Only then should `comparison.status=completed` be used for a readiness decision.

## 62. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vs1-target-validation.raw.json`

```json
{
  "generatedAt": "2026-06-15T06:38:48.816Z",
  "target": {
    "localPath": "C:\\workspace\\github\\corpus\\vscode-sparse",
    "localPathProvenance": "local-only",
    "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "commit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
    "shortCommit": "4ac5322601c",
    "commitMatchesExpected": true,
    "commitDrift": null,
    "sparsePatterns": [
      ".github",
      "build",
      "extensions",
      "scripts",
      "src",
      "test"
    ],
    "copiedJsTsConfigFileCount": 11518,
    "indexedJsTsFileCount": 11098
  },
  "expectedSymbols": [
    "AbstractExtensionService",
    "_createExtensionHostManager",
    "_doCreateExtensionHostManager",
    "ExtensionHostManager",
    "start",
    "ExtensionHostMain",
    "MainThreadExtensionService"
  ],
  "symbols": [
    {
      "token": "AbstractExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:5614800952da674403f4da9c2457be5d",
          "kind": "class",
          "name": "AbstractExtensionService",
          "qualifiedName": "AbstractExtensionService",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 60,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_createExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "method:4e7c5f7b23e454b3fa9635eabffe16df",
          "kind": "method",
          "name": "_createExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_createExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 842,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "_doCreateExtensionHostManager",
      "candidateCount": 2,
      "candidates": [
        {
          "id": "method:75c6a9f14fbd9ad890eb4e443a6d3385",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "AbstractExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/abstractExtensionService.ts",
          "startLine": 864,
          "language": "typescript"
        },
        {
          "id": "method:df429fc1cbac2b11eca3b2ffadce235d",
          "kind": "method",
          "name": "_doCreateExtensionHostManager",
          "qualifiedName": "MyTestExtensionService::_doCreateExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/test/browser/extensionService.test.ts",
          "startLine": 200,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostManager",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:aa28f1d35cafbd522cede21158da963a",
          "kind": "class",
          "name": "ExtensionHostManager",
          "qualifiedName": "ExtensionHostManager",
          "filePath": "src/vs/workbench/services/extensions/common/extensionHostManager.ts",
          "startLine": 58,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "start",
      "candidateCount": 138,
      "candidates": [
        {
          "id": "method:7b404b2424ad94975e97941e0a3a33c7",
          "kind": "method",
          "name": "start",
          "qualifiedName": "activate::Runs::start",
          "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
          "startLine": 131,
          "language": "typescript"
        },
        {
          "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
          "kind": "method",
          "name": "start",
          "qualifiedName": "LanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
          "startLine": 323,
          "language": "typescript"
        },
        {
          "id": "method:c6e06c449351c35f657a71c92550d8bf",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MockLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:1fc45442df97184181c9f455a534d924",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClaudeLanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
          "startLine": 312,
          "language": "typescript"
        },
        {
          "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
          "kind": "method",
          "name": "start",
          "qualifiedName": "InProcHttpServer::start",
          "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
          "startLine": 99,
          "language": "typescript"
        },
        {
          "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
          "kind": "method",
          "name": "start",
          "qualifiedName": "EmptyRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
          "startLine": 15,
          "language": "typescript"
        },
        {
          "id": "method:5147c17df2464426057952a3caa4bef3",
          "kind": "method",
          "name": "start",
          "qualifiedName": "FullRecentEditsProvider::start",
          "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
          "startLine": 118,
          "language": "typescript"
        },
        {
          "id": "method:9536e7c01bb10161cff0d6be125de28a",
          "kind": "method",
          "name": "start",
          "qualifiedName": "OpenAILanguageModelServer::start",
          "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
          "startLine": 237,
          "language": "typescript"
        },
        {
          "id": "property:1fdfa2d7595b533e17c04fa16c583077",
          "kind": "property",
          "name": "start",
          "qualifiedName": "HistoryItemChangeRange::start",
          "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
          "startLine": 16,
          "language": "typescript"
        },
        {
          "id": "method:8609d8674f03de2d18d721a127d57fc8",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandSessionFactory::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
          "startLine": 62,
          "language": "tsx"
        },
        {
          "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
          "kind": "function",
          "name": "start",
          "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
          "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
          "startLine": 169,
          "language": "typescript"
        },
        {
          "id": "method:5c08e1e93113c11073437f73fa9dae48",
          "kind": "method",
          "name": "start",
          "qualifiedName": "BackgroundSummarizer::start",
          "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
          "startLine": 163,
          "language": "typescript"
        },
        {
          "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
          "kind": "variable",
          "name": "start",
          "qualifiedName": "start",
          "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
          "startLine": 556,
          "language": "tsx"
        },
        {
          "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
          "kind": "method",
          "name": "start",
          "qualifiedName": "MemoryCleanupService::start",
          "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
          "startLine": 94,
          "language": "typescript"
        },
        {
          "id": "property:d953784c7b6f8b9670e08278714980b1",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "property:3840270ac71261ee8013db5d0c832e27",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Range::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
          "startLine": 44,
          "language": "typescript"
        },
        {
          "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
          "kind": "method",
          "name": "start",
          "qualifiedName": "ClassTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 391,
          "language": "typescript"
        },
        {
          "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
          "kind": "method",
          "name": "start",
          "qualifiedName": "TypeTraversal::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
          "startLine": 423,
          "language": "typescript"
        },
        {
          "id": "method:445a376d30627b1ac94645fbac68895d",
          "kind": "method",
          "name": "start",
          "qualifiedName": "CharacterBudget::start",
          "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
          "startLine": 1186,
          "language": "typescript"
        },
        {
          "id": "property:635d30fbb0cf1ace26a775219947828e",
          "kind": "property",
          "name": "start",
          "qualifiedName": "Tag::start",
          "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
          "startLine": 10,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "ExtensionHostMain",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:d213fc3f824486face8858bc52a3f0a6",
          "kind": "class",
          "name": "ExtensionHostMain",
          "qualifiedName": "ExtensionHostMain",
          "filePath": "src/vs/workbench/api/common/extensionHostMain.ts",
          "startLine": 161,
          "language": "typescript"
        }
      ]
    },
    {
      "token": "MainThreadExtensionService",
      "candidateCount": 1,
      "candidates": [
        {
          "id": "class:2e9d6531a66655d63f6762f0da5b297c",
          "kind": "class",
          "name": "MainThreadExtensionService",
          "qualifiedName": "MainThreadExtensionService",
          "filePath": "src/vs/workbench/api/browser/mainThreadExtensionService.ts",
          "startLine": 34,
          "language": "typescript"
        }
      ]
    }
  ],
  "start": {
    "ambiguityCount": 138,
    "candidates": [
      {
        "id": "method:7b404b2424ad94975e97941e0a3a33c7",
        "kind": "method",
        "name": "start",
        "qualifiedName": "activate::Runs::start",
        "filePath": "extensions/copilot/.vscode/extensions/test-extension/main.ts",
        "startLine": 131,
        "language": "typescript"
      },
      {
        "id": "method:5d5c5aedd9fafb9d24d2129ec296cfda",
        "kind": "method",
        "name": "start",
        "qualifiedName": "LanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/langModelServer.ts",
        "startLine": 323,
        "language": "typescript"
      },
      {
        "id": "method:c6e06c449351c35f657a71c92550d8bf",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MockLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/agents/node/test/mockLanguageModelServer.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:1fc45442df97184181c9f455a534d924",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClaudeLanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/claude/node/claudeLanguageModelServer.ts",
        "startLine": 312,
        "language": "typescript"
      },
      {
        "id": "method:ced01a3b1c556af955a2fbe92bda0ed2",
        "kind": "method",
        "name": "start",
        "qualifiedName": "InProcHttpServer::start",
        "filePath": "extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/inProcHttpServer.ts",
        "startLine": 99,
        "language": "typescript"
      },
      {
        "id": "method:d3a7a9e6f9d51a03e73a3ee4ee4b240e",
        "kind": "method",
        "name": "start",
        "qualifiedName": "EmptyRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/emptyRecentEditsProvider.ts",
        "startLine": 15,
        "language": "typescript"
      },
      {
        "id": "method:5147c17df2464426057952a3caa4bef3",
        "kind": "method",
        "name": "start",
        "qualifiedName": "FullRecentEditsProvider::start",
        "filePath": "extensions/copilot/src/extension/completions-core/vscode-node/lib/src/prompt/recentEdits/recentEditsProvider.ts",
        "startLine": 118,
        "language": "typescript"
      },
      {
        "id": "method:9536e7c01bb10161cff0d6be125de28a",
        "kind": "method",
        "name": "start",
        "qualifiedName": "OpenAILanguageModelServer::start",
        "filePath": "extensions/copilot/src/extension/externalAgents/node/oaiLanguageModelServer.ts",
        "startLine": 237,
        "language": "typescript"
      },
      {
        "id": "property:1fdfa2d7595b533e17c04fa16c583077",
        "kind": "property",
        "name": "start",
        "qualifiedName": "HistoryItemChangeRange::start",
        "filePath": "extensions/copilot/src/extension/git/vscode/mergeConflictServiceImpl.ts",
        "startLine": 16,
        "language": "typescript"
      },
      {
        "id": "method:8609d8674f03de2d18d721a127d57fc8",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandSessionFactory::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/node/copilotDebugCommandSessionFactory.tsx",
        "startLine": 62,
        "language": "tsx"
      },
      {
        "id": "function:a43f6814e248d8ee5dcb131c6f063f0c",
        "kind": "function",
        "name": "start",
        "qualifiedName": "CopilotDebugCommandContribution::handleUri::start",
        "filePath": "extensions/copilot/src/extension/onboardDebug/vscode-node/copilotDebugCommandContribution.ts",
        "startLine": 169,
        "language": "typescript"
      },
      {
        "id": "method:5c08e1e93113c11073437f73fa9dae48",
        "kind": "method",
        "name": "start",
        "qualifiedName": "BackgroundSummarizer::start",
        "filePath": "extensions/copilot/src/extension/prompts/node/agent/backgroundSummarizer.ts",
        "startLine": 163,
        "language": "typescript"
      },
      {
        "id": "variable:a6ddbb4c320e34a3bfefea7890c4507d",
        "kind": "variable",
        "name": "start",
        "qualifiedName": "start",
        "filePath": "extensions/copilot/src/extension/prompts/node/codeMapper/patchEditGeneration.tsx",
        "startLine": 556,
        "language": "tsx"
      },
      {
        "id": "method:50a58e7278cc7d4d12dd1d973440cbf0",
        "kind": "method",
        "name": "start",
        "qualifiedName": "MemoryCleanupService::start",
        "filePath": "extensions/copilot/src/extension/tools/common/memoryCleanupService.ts",
        "startLine": 94,
        "language": "typescript"
      },
      {
        "id": "property:d953784c7b6f8b9670e08278714980b1",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/common/serverProtocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "property:3840270ac71261ee8013db5d0c832e27",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Range::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/protocol.ts",
        "startLine": 44,
        "language": "typescript"
      },
      {
        "id": "method:c01fb58f727d1f6b5c7f6a4ce04375be",
        "kind": "method",
        "name": "start",
        "qualifiedName": "ClassTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 391,
        "language": "typescript"
      },
      {
        "id": "method:33d1fa2fe44b96120e89d013d7d3db20",
        "kind": "method",
        "name": "start",
        "qualifiedName": "TypeTraversal::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts",
        "startLine": 423,
        "language": "typescript"
      },
      {
        "id": "method:445a376d30627b1ac94645fbac68895d",
        "kind": "method",
        "name": "start",
        "qualifiedName": "CharacterBudget::start",
        "filePath": "extensions/copilot/src/extension/typescriptContext/vscode-node/languageContextService.ts",
        "startLine": 1186,
        "language": "typescript"
      },
      {
        "id": "property:635d30fbb0cf1ace26a775219947828e",
        "kind": "property",
        "name": "start",
        "qualifiedName": "Tag::start",
        "filePath": "extensions/copilot/src/extension/xtab/common/tags.ts",
        "startLine": 10,
        "language": "typescript"
      }
    ]
  },
  "missingSymbols": [],
  "valid": true,
  "sufficiencySmokeAllowed": true,
  "gate": "All expected VS-1 symbols have candidates; sufficiency smoke may run."
}
```

## 63. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json`

```json
{
  "generatedAt": "2026-06-15T07:35:10.773Z",
  "status": "completed",
  "mode": "deterministic-tool-surface-reuse-indexed-arm",
  "experimentMode": "full-index-ab",
  "executionModel": "sequential",
  "command": "C:\\Users\\victo\\.workbuddy\\binaries\\node\\versions\\22.22.2\\node.exe C:\\workspace\\github\\jununfly\\ZCodeGraph\\scripts\\rust-sufficiency-guardrail.mjs --repo vscode=C:\\workspace\\github\\corpus\\vscode-sparse --repo-arm vscode:typescript=C:\\workspace\\github\\corpus\\vscode-sparse --prompts C:/workspace/github/jununfly/ZCodeGraph/docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 900000 --out C:/workspace/github/jununfly/ZCodeGraph/docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json",
  "timeoutMs": 900000,
  "target": {
    "name": "vscode",
    "sourcePath": "C:\\workspace\\github\\corpus\\vscode-sparse"
  },
  "arms": {
    "typescript": {
      "engine": "typescript",
      "sourceCopy": {
        "path": "C:\\workspace\\github\\corpus\\vscode-sparse",
        "mode": "reuse-indexed-arm",
        "skipped": true
      },
      "indexing": {
        "status": "skipped",
        "elapsedMs": 0,
        "reason": "reuse-indexed-arm",
        "projectPath": "C:\\workspace\\github\\corpus\\vscode-sparse"
      },
      "graphAvailable": true,
      "graphStats": {
        "nodeCount": 330853,
        "edgeCount": 1515830,
        "fileCount": 11382,
        "nodesByKind": {
          "class": 13300,
          "component": 10,
          "constant": 13789,
          "enum": 2001,
          "enum_member": 12808,
          "field": 13,
          "file": 11345,
          "function": 21697,
          "import": 107153,
          "interface": 13303,
          "method": 123872,
          "module": 3,
          "namespace": 13,
          "property": 6368,
          "route": 1,
          "struct": 6,
          "trait": 2,
          "type_alias": 4444,
          "variable": 725
        },
        "edgesByKind": {
          "calls": 593766,
          "contains": 319314,
          "decorates": 760,
          "extends": 6301,
          "implements": 4756,
          "imports": 271571,
          "instantiates": 54956,
          "references": 264406
        },
        "filesByLanguage": {
          "c": 1,
          "cpp": 22,
          "csharp": 16,
          "dart": 1,
          "go": 4,
          "java": 7,
          "javascript": 128,
          "jsx": 1,
          "lua": 1,
          "objc": 2,
          "php": 3,
          "python": 73,
          "razor": 1,
          "ruby": 5,
          "rust": 4,
          "swift": 1,
          "tsx": 263,
          "typescript": 10782,
          "xml": 31,
          "yaml": 36
        },
        "dbSizeBytes": 1058672640,
        "lastUpdated": 1781508910717
      },
      "lastProgress": null,
      "command": {
        "executable": "C:\\Users\\victo\\.workbuddy\\binaries\\node\\versions\\22.22.2\\node.exe",
        "args": [
          "C:\\workspace\\github\\jununfly\\ZCodeGraph\\dist\\bin\\zcodegraph.js",
          "index",
          "C:\\workspace\\github\\corpus\\vscode-sparse",
          "--force",
          "--quiet"
        ],
        "cwd": "C:\\workspace\\github\\corpus\\vscode-sparse",
        "nodeVersion": "v22.22.2",
        "scriptVersion": "phase13-ab-v1",
        "gitSha": "0d1627b70f8fbb02dc39ecd358bc44eca7eb26f8",
        "env": {
          "CODEGRAPH_ALLOW_UNSAFE_NODE": "1",
          "CODEGRAPH_NO_DAEMON": "1",
          "CODEGRAPH_NO_RELAUNCH": "1"
        }
      },
      "diagnostics": []
    },
    "rust": {
      "engine": "rust",
      "sourceCopy": null,
      "indexing": {
        "status": "unavailable",
        "elapsedMs": 0,
        "reason": "Missing indexed project for vscode: rust"
      },
      "graphAvailable": false,
      "graphStats": null,
      "lastProgress": null,
      "command": null,
      "diagnostics": [
        {
          "kind": "missing-index",
          "message": "Missing indexed project for vscode: rust",
          "stderrTail": ""
        }
      ]
    }
  },
  "comparison": {
    "status": "unavailable",
    "elapsedMs": 0,
    "reason": "comparison requires both arms to have graphAvailable=true"
  },
  "classification": "success-asymmetric-blocker",
  "unavailableKind": null,
  "unavailableReason": null,
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "unavailableTaxonomy": [
    "copy-timeout",
    "typescript-index-timeout",
    "rust-index-timeout",
    "explore-timeout",
    "missing-index",
    "validator-failed",
    "process-error",
    "unsupported-runtime"
  ],
  "defaultRolloutReadinessClaimed": false,
  "runtimeWarnings": [],
  "stages": {
    "copy": {
      "status": "skipped",
      "elapsedMs": 0,
      "reason": "reuse-indexed-arm"
    },
    "typescriptIndex": {
      "status": "skipped",
      "elapsedMs": 0,
      "reason": "reuse-indexed-arm"
    },
    "rustIndex": {
      "status": "unavailable",
      "elapsedMs": 0,
      "reason": "Missing indexed project for vscode: rust"
    },
    "exploreAnalyze": {
      "status": "pending",
      "elapsedMs": 0
    },
    "comparison": {
      "status": "unavailable",
      "elapsedMs": 0,
      "reason": "comparison requires both arms to have graphAvailable=true"
    }
  },
  "toolchain": {
    "node": "v22.22.2",
    "rustc": "rustc 1.96.0 (ac68faa20 2026-05-25)",
    "cargo": "cargo 1.96.0 (30a34c682 2026-05-25)",
    "os": "Windows_NT 10.0.26200 x64",
    "cpu": "AMD Ryzen AI 9 HX 370 w/ Radeon 890M           ",
    "cpuCount": 24
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "C:\\workspace\\github\\corpus\\vscode-sparse",
      "commit": "4ac5322601c",
      "copyMode": "reuse-indexed-arm",
      "copies": {
        "typescript": {
          "copiedFiles": 0,
          "tempProjectPath": "C:\\workspace\\github\\corpus\\vscode-sparse",
          "skipped": true
        },
        "rust": {
          "copiedFiles": 0,
          "tempProjectPath": null,
          "skipped": true
        }
      },
      "reuseIndexedPair": null,
      "prompts": []
    }
  ],
  "regressions": []
}
```

## 64. `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md`

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

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

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

## 65. `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`

# Issue #205 VS Code Sparse Finalization Profile Selection

Date: 2026-06-17

## Decision

Run completed on current `main` against the validated VS Code JS/TS sparse checkout at `/private/tmp/codegraph-corpus/vscode-sparse`.

Selected next candidate: #206, a diagnostic/design issue for the remaining TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster. Do not start a direct name-matcher implementation from this evidence alone.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Historical Phase 18 comparison: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T15:39:08.808Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| Experiment classification | stress-only-targets-completed-with-nonblocking-failures |
| Target classification | target-failed-performance-gate-unmet |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 454674 | 572005 |
| Index ms | 235072 | 355898 |
| Peak RSS bytes | 49725440 | 43417600 |
| graphStats ms | 67 | 75 |

Sufficiency: passed.

Performance gate: unavailable / unmet. Rust remains slower end-to-end on this stress target, with the largest Rust-over-TypeScript wall-time delta in `index`.

## Rust Finalization Subsegments

| Segment | Current ms | Phase 18 ms | Direction |
|---|---:|---:|---|
| referenceResolutionMs | 85884 | 127909 | down |
| importResolutionMs | 9976 | 10029 | flat |
| nameMatchingMs | 34332 | 54645 | down |
| frameworkMatchingMs | 827 | 1270 | down |
| databaseAccessMs | 38376 | 57706 | down |
| unresolvedReadMs | 998 | 2442 | down |
| candidateLookupMs | 4137 | 8456 | down |
| sharedCandidateLookupMs | 1279 | 2949 | down |
| perReferenceDisambiguationMs | 31472 | 49133 | down |
| edgeMaterializationMs | 263 | 400 | down |
| edgeWriteMs | 20466 | 29293 | down |
| unresolvedCleanupMs | 16260 | 24231 | down |
| dynamicDispatchSynthesisMs | 9422 | 11125 | down |
| dbMaintenanceMs | 108 | 2237 | down |

Qualitative comparison only: this is a fresh single-run current-main profile, not a multi-run benchmark claim. The main trend is positive across finalization subsegments after the Phase 18 and #193 work, but the remaining large cluster is still broad database access plus name matching / per-reference disambiguation.

## Rust Core Segments

| Segment | Current ms |
|---|---:|
| sourceScanMs | 81 |
| parseExtractionMs | 39032 |
| sqliteWriteMs | 138150 |
| importPathAliasResolutionMs | 6160 |
| esmNamedImportExportResolutionMs | 13131 |
| localExactReferenceResolutionMs | 48582 |
| subprocessStartupHandoffMs | 13 |
| typescriptFinalizationMs | 98673 |

## Graph Stats

| Metric | TypeScript | Rust |
|---|---:|---:|
| fileCount | 11098 | 11291 |
| nodeCount | 329355 | 561906 |
| edgeCount | 1512994 | 1626117 |
| dbSizeBytes | 1057366016 | 1216704512 |

Rust edge kinds:

| Edge kind | Count |
|---|---:|
| calls | 747730 |
| contains | 550659 |
| exports | 7466 |
| imports | 264603 |
| instantiates | 54324 |
| references | 1335 |

## Fallback Taxonomy

| Stage | Classification | Reason | Count |
|---|---|---|---:|
| framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 149517 |
| reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 554 |
| reference-resolution | known-unsupported | unresolved-file-level-import-target | 81783 |

Total fallbacks: 231858.

## Candidate Selection

`databaseAccessMs` is the largest current finalization subsegment at 38376ms, and `nameMatchingMs` is close behind at 34332ms. `perReferenceDisambiguationMs` accounts for most of name matching at 31472ms. `edgeWriteMs` and `unresolvedCleanupMs` are still meaningful, but they are no longer the clearest first candidate after #193.

#206 should be diagnostic/design rather than implementation:

- Split the broad `databaseAccessMs` bucket around the name-matching path so future A/B work can distinguish candidate reads, per-reference lookups, edge writes, and cleanup.
- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not change matcher behavior.
- End with exactly one bounded implementation recommendation, or a stop recommendation.

This fits #205's rule for a remaining dominant name-matching cluster: diagnose first, then decide. It also avoids over-claiming from one stress-target run.

## 66. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`

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
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

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

## 67. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

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
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

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

## 68. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`

# Rust Indexing Core Phase 18 Results And Decision

## Scope

Phase 18 segmented the full-profile end-to-end path and tried one bounded Rust SQLite write-path A/B optimization. Rust remains opt-in. TypeScript remains the product default.

This phase does not claim default rollout readiness and does not close #165.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Candidate

Candidate: `final-flush` staging database fast-write PRAGMAs.

The candidate changes only the temporary staging database used by Rust `final-flush`:

- use faster staging-local journal/synchronous/temp-store/locking settings while writing,
- restore the active-index connection settings before promotion,
- keep the active index readable with WAL mode,
- preserve the existing SQLite schema.

No SQLite schema change was made. No resolver/finalization optimization was implemented.

## Artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-18-full-profile-bottleneck-ab.md` |
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

## Validation

| Check | Result |
|---|---|
| `cargo test --package zcodegraph-core` | passed |
| `npx vitest run __tests__/rust-indexing-experiment.test.ts -t "records Rust index profile breakdown"` | passed |
| Reduced full-profile A/B | completed |
| Required-target full-profile after | completed |
| VS Code sparse full-profile final after | completed |

The CLI and benchmark commands were run under Node `v26.0.0` with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, matching the existing local validation pattern for this thread.

## Segmentation Harness

The experiment summary now includes `## Full-profile end-to-end segments`, generated from run artifacts rather than hand-maintained prose.

Segments include:

- Rust source scan.
- Rust parse extraction.
- Rust SQLite write.
- Rust subprocess startup/handoff.
- TypeScript finalization.
- Reference resolution.
- Dynamic-dispatch synthesis.
- DB maintenance.
- graphStats measurement.
- sufficiency measurement availability.

## Reduced A/B Result

Fixture: `/private/tmp/zcodegraph-phase18-reduced-fixture`

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Rust total | 2,732 ms | 2,501 ms | -231 ms |
| Rust SQLite write | 786 ms | 549 ms | -237 ms |
| Rust parse extraction | 254 ms | 255 ms | +1 ms |
| TypeScript finalization | 87 ms | 88 ms | +1 ms |
| Reference resolution | 57 ms | 58 ms | +1 ms |
| Rust RSS | 56,868,864 | 56,786,944 | -81,920 |
| Sufficiency | passed | passed | no regression |

Reduced interpretation:

- The candidate improved the intended segment.
- graphStats remained stable for the reduced fixture.
- Sufficiency did not regress.

## Required Target Result

Phase 18 after is compared against the Phase 17 full-profile baseline.

| Target | Phase 17 Rust total | Phase 18 Rust total | Phase 17 SQLite write | Phase 18 SQLite write | Sufficiency | Gate |
|---|---:|---:|---:|---:|---|---|
| zcodegraph | 6,423 ms | 5,877 ms | 1,693 ms | 1,296 ms | passed | failed |
| excalidraw | 4,004 ms | 3,756 ms | 667 ms | 519 ms | passed | failed |

Required target interpretation:

- The candidate improved the Rust SQLite write segment on both required targets.
- The PRD required performance gate still fails.
- #165 remains open.

## VS Code Sparse Final After

Phase 18 after is compared against the Phase 17 full-profile baseline.

| Target | Phase 17 Rust total | Phase 18 Rust total | Phase 17 SQLite write | Phase 18 SQLite write | Phase 17 reference resolution | Phase 18 reference resolution | Sufficiency |
|---|---:|---:|---:|---:|---:|---:|---|
| vscode sparse | 606,168 ms | 599,881 ms | 160,722 ms | 153,186 ms | 124,152 ms | 127,909 ms | passed |

VS Code interpretation:

- The candidate improved Rust SQLite write time by 7,536 ms in this single final-after run.
- The full-profile wall-time gate remains failed.
- TypeScript finalization/reference resolution remains a major blocker and did not improve.

## Decision

Keep the SQLite PRAGMA candidate. It is bounded, preserves the schema, preserves active-index WAL behavior, and improves the intended write segment.

Do not treat this as sufficient for rollout readiness. The improvement is not large enough to close the PRD required-target gate.

#165 remains open.

Next largest blocker: TypeScript finalization/reference resolution in the full-profile path.

Recommended next slice: bounded full-profile finalization/reference-resolution segmentation and first A/B optimization, with resolver semantics and sufficiency protected by tests.

## 69. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-completion-gate-audit.md`

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
| Phase 16-18 consolidated process evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

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

## 70. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-decision.md`

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

## 71. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-targeted-smoke.md`

# Rust Indexing Core Phase 19 Targeted Smoke

## Scope

Phase 19 allowed targeted product smoke only for evidence missing from the completion gate audit. No new full benchmark campaign was allowed.

## Missing Evidence Review

The Phase 19 completion audit found no missing required-target evidence:

| Evidence row | Status | Source |
|---|---|---|
| ZCodeGraph wall time | present | Phase 18 required-target artifact |
| ZCodeGraph RSS | present | Phase 18 required-target artifact |
| ZCodeGraph Agent Sufficiency | present | Phase 18 required-target artifact |
| ZCodeGraph active-index readability | present | Phase 18 graph availability and graphStats artifact |
| Excalidraw wall time | present | Phase 18 required-target artifact |
| Excalidraw RSS | present | Phase 18 required-target artifact |
| Excalidraw Agent Sufficiency | present | Phase 18 required-target artifact |
| Excalidraw active-index readability | present | Phase 18 graph availability and graphStats artifact |

## Decision

No additional targeted smoke was run.

Reason: existing Phase 17 and Phase 18 artifacts are sufficient to decide the clarified PRD completion gate. Running new smoke would add churn without answering a missing gate question.

No VS Code sparse rerun was required. VS Code sparse remains stress evidence, not a required-target completion gate.

No release/npm smoke was required. Phase 19 did not touch packaging, CLI status, or release paths.

## 72. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-boundary-protocol-status.md`

# Rust Indexing Core Phase 20 Boundary Protocol Status

## Scope

This artifact records the first Phase 20 implementation step: the Rust/TypeScript finalization boundary protocol and parity artifact seam.

It does not claim that Rust finalization/reference-resolution migration is complete.

## Completed

Phase 20 now has a public artifact protocol for Rust finalization ownership and fallback taxonomy.

The Rust index profile can expose:

- `finalize.boundaryProtocol.version`
- `finalize.boundaryProtocol.productShell`
- `finalize.boundaryProtocol.rustOwnedStages`
- `finalize.fallbackTaxonomy.totalFallbacks`
- `finalize.fallbackTaxonomy.entries[]`

The formal experiment summary renders:

- `## Rust finalization boundary`
- `## Rust finalization fallback taxonomy`

The TypeScript product shell remains responsible for CLI, MCP, Explore, installer, and release integration.

## Current Baseline

The current real Rust opt-in indexing path owns:

- source scan,
- parse extraction,
- graph write.

The current TypeScript-side finalization path still owns:

- framework post-extract finalization,
- reference resolution,
- dynamic-dispatch synthesis,
- DB maintenance.

Those stages are now visible as `known-unsupported` fallback taxonomy entries rather than silent fallback.

## Blocker For The Next Slice

The next planned slice, Rust import/path-alias resolution, requires a real Rust resolver/finalization command or embedded DB-read contract. The current Rust core has extraction/write support and a standalone Rust name matcher helper, but it does not yet have a Rust-owned finalization command that can:

- read nodes/files/unresolved references from the active SQLite index,
- load tsconfig/jsconfig path aliases,
- resolve import/path-alias references with TypeScript parity,
- write resolved edges or return a persistable edge set,
- emit per-stage fallback taxonomy.

Therefore #199 should not be closed until that Rust resolver substrate exists and the import/path-alias slice is migrated through it.

## Validation

Commands run:

- `npx vitest run __tests__/rust-indexing-experiment.test.ts`
- `npm run build`

Both passed.

## Decision

#198 can be closed as complete.

#199, #200, #201, and #202 should remain open. Their implementation depends on the Rust resolver/finalization substrate described above.

No Rust default rollout readiness is claimed.

## 73. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-completion.experiment.json`

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-20-completion",
  "kind": "indexing-ab",
  "arms": ["typescript", "rust"],
  "sourceCopy": {
    "mode": "js-ts-config-slice",
    "isolation": "per-arm"
  },
  "rust": {
    "graphWorkProfile": "full",
    "sqliteWriteMode": "final-flush"
  },
  "targets": [
    {
      "name": "zcodegraph",
      "pathFallback": ".",
      "targetClass": "required",
      "requiredForDecision": true,
      "expectedCommit": null,
      "allowDirty": true,
      "promptIds": ["ZCG-1", "ZCG-2", "ZCG-3"]
    },
    {
      "name": "excalidraw",
      "pathEnv": "ZCODEGRAPH_CORPUS_EXCALIDRAW",
      "pathFallback": "/private/tmp/codegraph-corpus/excalidraw",
      "targetClass": "required",
      "requiredForDecision": true,
      "expectedCommit": null,
      "allowDirty": false,
      "promptIds": ["EX-1", "EX-2", "EX-3"]
    },
    {
      "name": "vscode-sparse",
      "pathEnv": "ZCODEGRAPH_CORPUS_VSCODE_SPARSE",
      "pathFallback": "/private/tmp/codegraph-corpus/vscode-sparse",
      "targetClass": "stress",
      "requiredForDecision": false,
      "expectedCommit": null,
      "allowDirty": true,
      "promptIds": ["VS-1"]
    }
  ],
  "metrics": {
    "thresholds": {
      "wallTimeImprovementPct": 0,
      "peakRssReductionPct": 0,
      "maxOtherMetricRegressionPct": 100
    }
  },
  "outputs": {}
}
```

## 74. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`

# Rust Indexing Core Phase 20 Decision

## Scope

This record covers Phase 20 issues #199-#204 after adding four Rust-owned finalization slices:

- `import-path-alias-resolution`
- `esm-named-import-export-resolution`
- `esm-one-hop-reexport-resolution`
- `local-exact-reference-resolution`

This is not a Rust default rollout decision and does not close the post-PRD performance/RSS optimization targets in #165 or #193.

## Implementation Evidence

Rust now writes finalization edges directly into the existing SQLite schema without adding a persistent schema migration.

The implemented slices are:

- JS/TS relative and root `tsconfig.json` / `jsconfig.json` `compilerOptions.paths` file-level import resolution.
- Direct same-name ESM named import/export symbol disambiguation for already resolved relative and `paths` alias file targets.
- One-hop direct same-name ESM named re-export disambiguation for already resolved relative and `paths` alias file targets, with edges written to the leaf exported symbol.
- Same-file exact callable reference resolution for unambiguous `calls` and `instantiates` references.

Unsupported resolver behavior remains explicit fallback:

- imported binding forms outside direct same-name ESM named imports,
- re-export forms outside direct same-name one-hop ESM named re-exports,
- package/import forms outside the file-level relative/path-alias slice,
- unresolved file-level import targets,
- framework post-extract finalization,
- broader reference resolution,
- dynamic-dispatch synthesis,
- DB maintenance.

## Validation

Commands run:

- `cargo test --package zcodegraph-core`
- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves JS/TS relative and paths-alias imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "same-file exact callable"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "direct ESM named imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "paths-alias ESM named imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "one-hop ESM named re-exports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "paths-alias one-hop ESM named re-exports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts`
- `/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-indexing-experiment.mjs --experiment docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json --summary-out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`
- `/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 900000 --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`

The latest required-target and VS Code sparse smoke artifacts used Node `v22.21.1`.

## Required Target Results

Required-only validation completed for ZCodeGraph and Excalidraw.

| Target | TS wall ms | Rust wall ms | TS peak RSS | Rust peak RSS | Rust-owned stages | Sufficiency |
|---|---:|---:|---:|---:|---|---|
| zcodegraph | 4768 | 8079 | 44560384 | 47910912 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | passed |
| excalidraw | 3258 | 4959 | 48123904 | 48123904 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | passed |

Both Rust arms produced active indexes readable by the TypeScript shell and graphStats collection.

## Fallback Taxonomy

Fallback is visible and non-zero.

| Target | Total fallback | Main remaining categories |
|---|---:|---|
| zcodegraph | 1507 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |
| excalidraw | 2400 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |

Issue #204 resolved 279 one-hop ESM named re-export references on ZCodeGraph and reduced its binding-level fallback from 1460 to 1445. Excalidraw had no matching one-hop direct named re-export hits in this required-only slice, so its binding-level fallback stayed at 1705.

The fallback taxonomy artifact is `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`.

Follow-up fallback audit: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md`.

## VS Code Sparse

The broad Phase 20 manifest includes VS Code sparse at `/private/tmp/codegraph-corpus/vscode-sparse`, but the full three-target smoke did not complete in a bounded local run and was interrupted. That broad run remains unavailable with reason: local broad smoke timeout under Node 26 override.

A bounded Node 22 sufficiency smoke completed afterward:

- Artifact: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`
- Commit: `4ac53226`
- Copied files: 11518 per arm
- TypeScript index: 246553 ms
- Rust index: 441770 ms
- Explore analyze: 13910 ms
- Classification: `success-comparison-completed`
- Regression count: 0
- Default rollout readiness claimed: false

Manifest kept for rerun:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-completion.experiment.json`

## Decision

Phase 20 is accepted as opt-in end-to-end Rust indexing data production complete with known-unsupported taxonomy.

This acceptance is deliberately narrow:

- Rust is not the default indexing engine.
- The post-PRD performance/RSS targets remain open under #165 and #193.
- Broader JS/TS reference resolution, framework post-extract finalization, dynamic-dispatch synthesis, and DB maintenance remain hybrid or TypeScript-owned.
- The accepted fallback taxonomy is visible and non-zero rather than eliminated.

What is complete:

- #199 import/path-alias file-level slice is implemented and covered by public `--engine rust` integration behavior.
- #200 has one bounded expansion beyond import/path-alias: same-file exact callable reference resolution.
- #203 has one bounded symbol-level import expansion: direct same-name ESM named import/export resolution.
- #204 has one bounded re-export expansion: one-hop direct same-name ESM named re-export resolution for relative and existing `paths` alias targets.
- #201 has explicit fallback taxonomy evidence for required targets.
- #202 has final validation and decision evidence for required targets and VS Code sparse bounded smoke.

What remains:

- Binding-level import/export symbol disambiguation is partially Rust-owned; non-direct named import/export forms remain known-unsupported.
- Broad JS/TS reference resolution remains hybrid.
- Framework post-extract finalization, dynamic-dispatch synthesis, and DB maintenance remain TypeScript-owned.
- Performance remains outside the PRD completion envelope and should be handled by #165/#193 rather than expanding Phase 20.

The fallback audit found no strong next import/export micro-slice after #204. It also found that the largest Rust-core-only unresolved surface is broad JS/TS reference resolution, and that some Excalidraw file-level fallback is affected by required-target copy incompleteness rather than resolver behavior. Therefore the accepted path is to close #202 and carry deeper completeness or optimization work outside Phase 20.

No Rust default rollout readiness is claimed.

## 75. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md`

# Rust Indexing Core Phase 20 Fallback Audit

## Purpose

This audit inspects the remaining fallback surface after #204, before deciding whether #202 can close or needs another implementation slice.

The audit is not a resolver implementation and does not claim Rust default rollout readiness.

## Inputs

- Decision record: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`
- Required-target artifact: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json`
- Rust core rerun against the required-target temporary copies to inspect pre-TypeScript-finalization `unresolved_refs`.

Rust core-only rerun commands:

```bash
target/debug/zcodegraph-core index \
  --project-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0 \
  --index-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0/.zcodegraph/audit-rust-core.db \
  --engine rust \
  --force \
  --graph-work-profile full

target/debug/zcodegraph-core index \
  --project-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA \
  --index-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA/.zcodegraph/audit-rust-core.db \
  --engine rust \
  --force \
  --graph-work-profile full
```

The rerun profile matched the #204 required-target artifact closely enough for taxonomy inspection:

| Target | Import/path fallback | ESM named fallback | One-hop refs | Local exact fallback |
|---|---:|---:|---:|---:|
| zcodegraph | 2380 | 1445 | 279 | 28594 |
| excalidraw | 2425 | 1705 | 0 | 16213 |

## Boundary Taxonomy After #204

The Phase 20 decision boundary currently reports:

| Target | Total fallback | Binding-level import fallback | Unsupported import form | Unresolved file-level target |
|---|---:|---:|---:|---:|
| zcodegraph | 1507 | 1445 | 44 | 14 |
| excalidraw | 2400 | 1705 | 6 | 685 |

This boundary taxonomy does not include the full Rust core-only unresolved surface. It only records the finalization boundary categories currently surfaced by the TypeScript shell profile.

## Rust Core-Only Unresolved Surface

Before TypeScript finalization, the Rust core-only DB still has a much larger unresolved reference surface:

| Target | Total unresolved refs | calls | imports | exports | instantiates | references |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 32239 | 27879 | 1503 | 2142 | 715 | 0 |
| excalidraw | 19787 | 15972 | 2396 | 1004 | 241 | 174 |

This confirms that Phase 20 is not merely missing one more import/export special case. The largest Rust-core-only gap is broad JS/TS reference resolution, especially local/member/test/stdlib call references.

## Import Fallback Shape

Import-only unresolved refs from the Rust core-only DB:

| Target | Shape | Count |
|---|---|---:|
| zcodegraph | named binding or package root | 825 |
| zcodegraph | Node builtin bare specifier | 381 |
| zcodegraph | type-only binding | 216 |
| zcodegraph | Node builtin `node:` specifier | 42 |
| zcodegraph | PascalCase binding | 15 |
| zcodegraph | relative/absolute file specifier | 9 |
| zcodegraph | aliased named binding | 5 |
| zcodegraph | namespace binding | 4 |
| zcodegraph | package subpath specifier | 3 |
| zcodegraph | scoped package specifier | 2 |
| zcodegraph | default binding | 1 |
| excalidraw | named binding or package root | 943 |
| excalidraw | relative/absolute file specifier | 470 |
| excalidraw | type-only binding | 418 |
| excalidraw | PascalCase binding | 340 |
| excalidraw | `@excalidraw/*` workspace package alias specifier | 202 |
| excalidraw | package subpath specifier | 10 |
| excalidraw | default binding | 9 |
| excalidraw | scoped package specifier | 3 |
| excalidraw | aliased named binding | 1 |

Samples:

| Shape | Sample |
|---|---|
| External package named import | `import { defineConfig } from 'vitest/config';` |
| Node builtin namespace import | `import * as path from 'path';` |
| Type-only import | `import type { ShimmerWorkerMessage } from './types';` |
| Workspace package alias | `import { ... } from "@excalidraw/excalidraw";` |
| Relative default import | `import CustomStats from "./CustomStats";` |

## Interpretation

ZCodeGraph's remaining import fallback is mostly not a strong implementation target:

- Many entries are external packages, Node builtins, test framework imports, and type-only imports.
- Relative unresolved file-level imports are only 9 in the required slice.
- #203 and #204 already burned down the highest-confidence same-name direct import/export paths.

Excalidraw has a larger file-level unresolved target count, but the audit found that required-target copy incompleteness contributes materially. For example, `excalidraw-app/App.tsx` imports `./CustomStats`, but the required-target temporary copy only contains `excalidraw-app/App.tsx` in that directory. That means a resolver implementation cannot close that class of fallback without changing the corpus copy/slice or validation setup.

The broad Rust core-only unresolved surface is dominated by calls and instantiations:

- ZCodeGraph: 27879 unresolved calls and 715 unresolved instantiations before TypeScript finalization.
- Excalidraw: 15972 unresolved calls and 241 unresolved instantiations before TypeScript finalization.

Many top call names are test framework or builtin/member-style calls (`expect`, `toBe`, `join`, `map`, `filter`, `push`, `Set`, `Map`). Blindly migrating these would risk graph noise and node explosion unless the target semantics are narrowed carefully.

## Recommendation

Do not create another import/export micro-slice from this audit alone.

The next decision should be one of:

1. Accept the current known-unsupported taxonomy and close #202 as Phase 20 end-to-end opt-in complete, with #165/#193 carrying performance and deeper completeness work.
2. If Phase 20 must burn down more functionality before closure, create exactly one issue for a diagnostic slice, not implementation first: "representative missing-flow selection for broad JS/TS reference resolution." That issue should pick concrete flow prompts and identify which unresolved calls actually affect Agent Sufficiency.

Recommended answer: choose option 1 unless the maintainer requires Phase 20 to own broad JS/TS reference resolution before closure.

No Rust default rollout readiness is claimed.

## 76. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json`

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-20-required-only",
  "kind": "indexing-ab",
  "arms": ["typescript", "rust"],
  "sourceCopy": {
    "mode": "js-ts-config-slice",
    "isolation": "per-arm"
  },
  "rust": {
    "graphWorkProfile": "full",
    "sqliteWriteMode": "final-flush"
  },
  "targets": [
    {
      "name": "zcodegraph",
      "pathFallback": ".",
      "targetClass": "required",
      "requiredForDecision": true,
      "expectedCommit": null,
      "allowDirty": true,
      "promptIds": ["ZCG-1", "ZCG-2", "ZCG-3"]
    },
    {
      "name": "excalidraw",
      "pathEnv": "ZCODEGRAPH_CORPUS_EXCALIDRAW",
      "pathFallback": "/private/tmp/codegraph-corpus/excalidraw",
      "targetClass": "required",
      "requiredForDecision": true,
      "expectedCommit": null,
      "allowDirty": false,
      "promptIds": ["EX-1", "EX-2", "EX-3"]
    }
  ],
  "metrics": {
    "thresholds": {
      "wallTimeImprovementPct": 0,
      "peakRssReductionPct": 0,
      "maxOtherMetricRegressionPct": 100
    }
  },
  "outputs": {}
}
```

## 77. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`

# Rust Indexing Core Phase 20 Required-Only Validation Summary

Experiment: rust-indexing-core-phase-20-required-only
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| zcodegraph | full | experiment |
| excalidraw | full | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| zcodegraph | final-flush | experiment |
| excalidraw | final-flush | experiment |

`final-flush` is the production Rust opt-in write path. `disk` remains a debug escape hatch, and `memory-final-flush` remains an explicit experimental prototype that does not claim production rollout readiness.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4174,"edgeCount":17662,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1098,"import":1201,"interface":165,"method":815,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7629,"contains":3884,"extends":8,"implements":21,"imports":2909,"instantiates":416,"references":2795},"dbSizeBytes":17342464}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14283,"edgeCount":30075,"nodeKinds":{"class":59,"constant":8026,"export":50,"field":233,"file":290,"function":2422,"import":1197,"interface":165,"method":725,"type_alias":38,"variable":1078},"edgeKinds":{"calls":13364,"contains":13993,"exports":186,"imports":2363,"instantiates":169},"dbSizeBytes":25931776}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":11537,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":3875,"contains":6318,"exports":140,"imports":1141,"instantiates":35,"references":28},"dbSizeBytes":13946880}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4174 → 14283 (+10109); edges 17662 → 30075 (+12413).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 8026 | +7556 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 290 | 290 | 0 |
| function | 1098 | 2422 | +1324 |
| import | 1201 | 1197 | -4 |
| interface | 165 | 165 | 0 |
| method | 815 | 725 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1078 | +1040 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7629 | 13364 | +5735 |
| contains | 3884 | 13993 | +10109 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2909 | 2363 | -546 |
| instantiates | 416 | 169 | -247 |
| references | 2795 | 0 | -2795 |

### excalidraw graphStats parity

Totals: files 34 → 34 (0); nodes 2360 → 6352 (+3992); edges 7204 → 11537 (+4333).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 11 | 11 | 0 |
| component | 0 | 158 | +158 |
| constant | 297 | 3525 | +3228 |
| field | 0 | 81 | +81 |
| file | 34 | 34 | 0 |
| function | 532 | 851 | +319 |
| import | 757 | 757 | 0 |
| interface | 11 | 11 | 0 |
| method | 388 | 364 | -24 |
| property | 208 | 0 | -208 |
| type_alias | 105 | 106 | +1 |
| variable | 17 | 454 | +437 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 2729 | 3875 | +1146 |
| contains | 2326 | 6318 | +3992 |
| exports | 0 | 140 | +140 |
| imports | 1175 | 1141 | -34 |
| instantiates | 95 | 35 | -60 |
| references | 879 | 28 | -851 |

## Metrics

- zcodegraph: wallTimeDeltaPct=69.44211409395973, peakRssDeltaPct=0.28355387523629494
- excalidraw: wallTimeDeltaPct=52.20994475138122, peakRssDeltaPct=0

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 66 | 2239 | 2463 | 22 | 4768 |
| zcodegraph | rust | 36 | 2209 | 5833 | 24 | 8079 |
| excalidraw | typescript | 29 | 1616 | 1613 | 20 | 3258 |
| excalidraw | rust | 9 | 1600 | 3350 | 23 | 4959 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 1 |
| zcodegraph | parseExtractionMs | 1096 |
| zcodegraph | sqliteWriteMs | 1429 |
| zcodegraph | importPathAliasResolutionMs | 93 |
| zcodegraph | importPathAliasResolvedRefs | 616 |
| zcodegraph | importPathAliasFallbackRefs | 2380 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2322 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | esmNamedImportExportResolutionMs | 432 |
| zcodegraph | esmNamedImportExportResolvedRefs | 2799 |
| zcodegraph | esmNamedImportExportFallbackRefs | 1445 |
| zcodegraph | esmOneHopReexportResolvedRefs | 279 |
| zcodegraph | localExactReferenceResolutionMs | 1539 |
| zcodegraph | localExactReferenceResolvedRefs | 3580 |
| zcodegraph | localExactReferenceFallbackRefs | 28594 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 4 |
| zcodegraph | referenceResolutionMs | 430 |
| zcodegraph | dynamicDispatchSynthesisMs | 334 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 812 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 820 |
| excalidraw | sqliteWriteMs | 543 |
| excalidraw | importPathAliasResolutionMs | 19 |
| excalidraw | importPathAliasResolvedRefs | 46 |
| excalidraw | importPathAliasFallbackRefs | 2425 |
| excalidraw | importPathAliasBindingFallbackRefs | 1734 |
| excalidraw | importPathAliasUnsupportedFallbackRefs | 221 |
| excalidraw | importPathAliasUnresolvedFallbackRefs | 470 |
| excalidraw | esmNamedImportExportResolutionMs | 123 |
| excalidraw | esmNamedImportExportResolvedRefs | 30 |
| excalidraw | esmNamedImportExportFallbackRefs | 1705 |
| excalidraw | esmOneHopReexportResolvedRefs | 0 |
| excalidraw | localExactReferenceResolutionMs | 1039 |
| excalidraw | localExactReferenceResolvedRefs | 2092 |
| excalidraw | localExactReferenceFallbackRefs | 16213 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 4 |
| excalidraw | referenceResolutionMs | 254 |
| excalidraw | dynamicDispatchSynthesisMs | 341 |
| excalidraw | dbMaintenanceMs | 6 |
| excalidraw | typescriptFinalizationMs | 631 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 1507 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | 2400 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| zcodegraph | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1445 |
| zcodegraph | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 44 |
| zcodegraph | reference-resolution | known-unsupported | unresolved-file-level-import-target | 14 |
| excalidraw | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1705 |
| excalidraw | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 6 |
| excalidraw | reference-resolution | known-unsupported | unresolved-file-level-import-target | 685 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| zcodegraph | Rust source scan | 1 | measured |
| zcodegraph | Rust parse extraction | 1096 | measured |
| zcodegraph | Rust SQLite write | 1429 | measured |
| zcodegraph | Rust subprocess startup/handoff | 3 | measured |
| zcodegraph | TypeScript finalization | 812 | measured |
| zcodegraph | Reference resolution | 430 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 334 | measured |
| zcodegraph | DB maintenance | 5 | measured |
| zcodegraph | graphStats measurement | 24 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 0 | measured |
| excalidraw | Rust parse extraction | 820 | measured |
| excalidraw | Rust SQLite write | 543 | measured |
| excalidraw | Rust subprocess startup/handoff | 3 | measured |
| excalidraw | TypeScript finalization | 631 | measured |
| excalidraw | Reference resolution | 254 | measured |
| excalidraw | Dynamic-dispatch synthesis | 341 | measured |
| excalidraw | DB maintenance | 6 | measured |
| excalidraw | graphStats measurement | 23 | measured |
| excalidraw | sufficiency measurement | unavailable | unavailable |

## Gates

- zcodegraph: sufficiency=passed; performance=unavailable
- excalidraw: sufficiency=passed; performance=unavailable

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded

## Classifications

- zcodegraph: target-failed-performance-gate-unmet
- excalidraw: target-failed-performance-gate-unmet
- experiment: failed-required-performance-gate-unmet

## Rollout recommendation draft

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.

## 78. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json`

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-20-required-only",
  "kind": "indexing-ab",
  "generatedAt": "2026-06-17T13:37:46.001Z",
  "arms": [
    "typescript",
    "rust"
  ],
  "sourceCopy": {
    "mode": "js-ts-config-slice",
    "isolation": "per-arm"
  },
  "rust": {
    "graphWorkProfile": "full",
    "sqliteWriteMode": "final-flush"
  },
  "profiling": {
    "heap": false,
    "summaryHtml": false
  },
  "manifest": {
    "path": "docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json",
    "unknownFields": []
  },
  "preflight": {
    "status": "completed",
    "diagnostics": [],
    "toolchain": {
      "node": "v22.21.1",
      "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
      "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
      "os": "Darwin 25.5.0 arm64"
    },
    "rustCore": {
      "path": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
      "available": true
    }
  },
  "targets": [
    {
      "name": "zcodegraph",
      "targetClass": "required",
      "requiredForDecision": true,
      "requiredAfterPrdCompletion": false,
      "sparsePatterns": [],
      "path": {
        "configuredPathEnv": null,
        "configuredPathFallback": ".",
        "resolvedPath": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph",
        "pathSource": "fallback"
      },
      "preflight": {
        "status": "available",
        "kind": null,
        "diagnostics": [],
        "commit": "23e7c1770e21c9deb6883e7343f58355ebf8f172",
        "dirty": true,
        "promptIds": [
          "ZCG-1",
          "ZCG-2",
          "ZCG-3"
        ]
      },
      "arms": {
        "typescript": {
          "engine": "typescript",
          "graphWorkProfile": null,
          "sqliteWriteMode": null,
          "preflight": {
            "status": "available",
            "kind": null,
            "diagnostics": []
          },
          "execution": {
            "status": "completed",
            "elapsedMs": 4768,
            "peakRssBytes": 52002816,
            "timingsMs": {
              "sourceCopy": 66,
              "init": 2239,
              "index": 2463,
              "graphStats": 22,
              "total": 4768
            },
            "indexProfile": null,
            "profiling": {
              "heapReport": null,
              "heapSummaryHtml": null
            },
            "diagnostics": []
          },
          "indexing": {
            "status": "completed"
          },
          "sourceCopy": {
            "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-3kHfLd",
            "copiedFiles": 299,
            "mode": "js-ts-config-slice",
            "skipped": false
          },
          "graphAvailable": true,
          "graphStats": {
            "fileCount": 290,
            "nodeCount": 4174,
            "edgeCount": 17662,
            "nodeKinds": {
              "class": 60,
              "constant": 470,
              "file": 290,
              "function": 1098,
              "import": 1201,
              "interface": 165,
              "method": 815,
              "property": 2,
              "type_alias": 35,
              "variable": 38
            },
            "edgeKinds": {
              "calls": 7629,
              "contains": 3884,
              "extends": 8,
              "implements": 21,
              "imports": 2909,
              "instantiates": 416,
              "references": 2795
            },
            "dbSizeBytes": 17342464
          },
          "command": {
            "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
            "args": [
              "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
              "index",
              "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-3kHfLd",
              "--force",
              "--quiet"
            ],
            "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-3kHfLd",
            "nodeVersion": "v22.21.1",
            "env": {}
          }
        },
        "rust": {
          "engine": "rust",
          "graphWorkProfile": {
            "configured": "full",
            "effective": "full",
            "source": "experiment"
          },
          "sqliteWriteMode": {
            "configured": "final-flush",
            "effective": "final-flush",
            "source": "experiment"
          },
          "preflight": {
            "status": "available",
            "kind": null,
            "diagnostics": []
          },
          "execution": {
            "status": "completed",
            "elapsedMs": 8079,
            "peakRssBytes": 52150272,
            "timingsMs": {
              "sourceCopy": 36,
              "init": 2209,
              "index": 5833,
              "graphStats": 24,
              "total": 8079
            },
            "indexProfile": {
              "rustCore": {
                "sourceScanMs": 1,
                "parseExtractionMs": 1096,
                "sqliteWriteMs": 1429,
                "importPathAliasResolutionMs": 93,
                "importPathAliasResolvedRefs": 616,
                "importPathAliasFallbackRefs": 2380,
                "importPathAliasBindingFallbackRefs": 2322,
                "importPathAliasUnsupportedFallbackRefs": 49,
                "importPathAliasUnresolvedFallbackRefs": 9,
                "esmNamedImportExportResolutionMs": 432,
                "esmNamedImportExportResolvedRefs": 2799,
                "esmNamedImportExportFallbackRefs": 1445,
                "esmOneHopReexportResolvedRefs": 279,
                "localExactReferenceResolutionMs": 1539,
                "localExactReferenceResolvedRefs": 3580,
                "localExactReferenceFallbackRefs": 28594,
                "subprocessStartupHandoffMs": 3
              },
              "finalize": {
                "frameworkPostExtractMs": 4,
                "referenceResolutionMs": 430,
                "referenceResolutionBreakdown": {
                  "importResolutionMs": 57,
                  "nameMatchingMs": 80,
                  "frameworkMatchingMs": 13,
                  "databaseAccessMs": 245,
                  "cacheWarmupMs": 6,
                  "unresolvedReadMs": 24,
                  "candidateLookupMs": 19,
                  "sharedCandidateLookupMs": 7,
                  "candidateLookupCacheHitMs": 7,
                  "perReferenceDisambiguationMs": 68,
                  "rustMatcherMs": 0,
                  "rustMatcherStartupMs": 0,
                  "rustMatcherSerializationMs": 0,
                  "rustMatcherEligibleRefs": 0,
                  "rustMatcherHandledRefs": 0,
                  "rustMatcherFallbackRefs": 0,
                  "rustMatcherSemanticMismatchRefs": 0,
                  "rustMatcherSemanticMismatchSamples": [],
                  "rustMatcherFallbackReasons": {},
                  "rustMatcherCandidateMaterializationMs": 0,
                  "rustMatcherSubprocessMs": 0,
                  "rustMatcherTsVerificationMs": 0,
                  "rustMatcherPayloadBytes": 0,
                  "rustMatcherUniqueCandidateFacts": 0,
                  "edgeMaterializationMs": 4,
                  "edgeWriteMs": 73,
                  "unresolvedCleanupMs": 138,
                  "otherResolutionMs": 5
                },
                "dynamicDispatchSynthesisMs": 334,
                "dbMaintenanceMs": 5,
                "boundaryProtocol": {
                  "version": 1,
                  "productShell": "typescript",
                  "rustOwnedStages": [
                    "source-scan",
                    "parse-extraction",
                    "graph-write",
                    "import-path-alias-resolution",
                    "esm-named-import-export-resolution",
                    "esm-one-hop-reexport-resolution",
                    "local-exact-reference-resolution"
                  ]
                },
                "fallbackTaxonomy": {
                  "totalFallbacks": 1507,
                  "entries": [
                    {
                      "stage": "framework-post-extract",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "dynamic-dispatch-synthesis",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "db-maintenance",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
                      "count": 1445
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "unsupported-import-form-not-yet-rust-owned",
                      "count": 44
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "unresolved-file-level-import-target",
                      "count": 14
                    }
                  ]
                }
              },
              "typescriptFinalizationMs": 812
            },
            "profiling": {
              "heapReport": null,
              "heapSummaryHtml": null
            },
            "diagnostics": []
          },
          "indexing": {
            "status": "completed"
          },
          "sourceCopy": {
            "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0",
            "copiedFiles": 299,
            "mode": "js-ts-config-slice",
            "skipped": false
          },
          "graphAvailable": true,
          "graphStats": {
            "fileCount": 290,
            "nodeCount": 14283,
            "edgeCount": 30075,
            "nodeKinds": {
              "class": 59,
              "constant": 8026,
              "export": 50,
              "field": 233,
              "file": 290,
              "function": 2422,
              "import": 1197,
              "interface": 165,
              "method": 725,
              "type_alias": 38,
              "variable": 1078
            },
            "edgeKinds": {
              "calls": 13364,
              "contains": 13993,
              "exports": 186,
              "imports": 2363,
              "instantiates": 169
            },
            "dbSizeBytes": 25931776
          },
          "command": {
            "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
            "args": [
              "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
              "index",
              "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0",
              "--force",
              "--quiet",
              "--engine",
              "rust",
              "--graph-work-profile",
              "full",
              "--sqlite-write-mode",
              "final-flush"
            ],
            "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0",
            "nodeVersion": "v22.21.1",
            "env": {
              "ZCODEGRAPH_RUST_CORE_BINARY": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
              "ZCODEGRAPH_INDEX_PROFILE_OUT": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0/.zcodegraph/rust-index-profile.json"
            }
          }
        }
      },
      "gates": {
        "sufficiency": {
          "status": "passed",
          "regressions": []
        },
        "performance": {
          "status": "unavailable",
          "wallTimeDeltaPct": 69.44211409395973,
          "peakRssDeltaPct": 0.28355387523629494,
          "diagnostics": [
            {
              "kind": "wall-time-phase-dominant",
              "message": "Dominant Rust wall-time phase is index",
              "arm": "rust",
              "phase": "index",
              "elapsedMs": 5833
            },
            {
              "kind": "wall-time-phase-dominant",
              "message": "Dominant TypeScript wall-time phase is index",
              "arm": "typescript",
              "phase": "index",
              "elapsedMs": 2463
            },
            {
              "kind": "wall-time-regression-source",
              "message": "Largest Rust-over-TypeScript wall-time delta is index",
              "phase": "index",
              "typescriptMs": 2463,
              "rustMs": 5833,
              "deltaMs": 3370
            }
          ]
        }
      },
      "classification": "target-failed-performance-gate-unmet"
    },
    {
      "name": "excalidraw",
      "targetClass": "required",
      "requiredForDecision": true,
      "requiredAfterPrdCompletion": false,
      "sparsePatterns": [],
      "path": {
        "configuredPathEnv": "ZCODEGRAPH_CORPUS_EXCALIDRAW",
        "configuredPathFallback": "/private/tmp/codegraph-corpus/excalidraw",
        "resolvedPath": "/private/tmp/codegraph-corpus/excalidraw",
        "pathSource": "fallback"
      },
      "preflight": {
        "status": "available",
        "kind": null,
        "diagnostics": [],
        "commit": null,
        "dirty": false,
        "promptIds": [
          "EX-1",
          "EX-2",
          "EX-3"
        ]
      },
      "arms": {
        "typescript": {
          "engine": "typescript",
          "graphWorkProfile": null,
          "sqliteWriteMode": null,
          "preflight": {
            "status": "available",
            "kind": null,
            "diagnostics": []
          },
          "execution": {
            "status": "completed",
            "elapsedMs": 3258,
            "peakRssBytes": 52199424,
            "timingsMs": {
              "sourceCopy": 29,
              "init": 1616,
              "index": 1613,
              "graphStats": 20,
              "total": 3258
            },
            "indexProfile": null,
            "profiling": {
              "heapReport": null,
              "heapSummaryHtml": null
            },
            "diagnostics": []
          },
          "indexing": {
            "status": "completed"
          },
          "sourceCopy": {
            "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-pePjjK",
            "copiedFiles": 34,
            "mode": "js-ts-config-slice",
            "skipped": false
          },
          "graphAvailable": true,
          "graphStats": {
            "fileCount": 34,
            "nodeCount": 2360,
            "edgeCount": 7204,
            "nodeKinds": {
              "class": 11,
              "constant": 297,
              "file": 34,
              "function": 532,
              "import": 757,
              "interface": 11,
              "method": 388,
              "property": 208,
              "type_alias": 105,
              "variable": 17
            },
            "edgeKinds": {
              "calls": 2729,
              "contains": 2326,
              "imports": 1175,
              "instantiates": 95,
              "references": 879
            },
            "dbSizeBytes": 11526144
          },
          "command": {
            "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
            "args": [
              "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
              "index",
              "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-pePjjK",
              "--force",
              "--quiet"
            ],
            "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-typescript-pePjjK",
            "nodeVersion": "v22.21.1",
            "env": {}
          }
        },
        "rust": {
          "engine": "rust",
          "graphWorkProfile": {
            "configured": "full",
            "effective": "full",
            "source": "experiment"
          },
          "sqliteWriteMode": {
            "configured": "final-flush",
            "effective": "final-flush",
            "source": "experiment"
          },
          "preflight": {
            "status": "available",
            "kind": null,
            "diagnostics": []
          },
          "execution": {
            "status": "completed",
            "elapsedMs": 4959,
            "peakRssBytes": 52199424,
            "timingsMs": {
              "sourceCopy": 9,
              "init": 1600,
              "index": 3350,
              "graphStats": 23,
              "total": 4959
            },
            "indexProfile": {
              "rustCore": {
                "sourceScanMs": 0,
                "parseExtractionMs": 820,
                "sqliteWriteMs": 543,
                "importPathAliasResolutionMs": 19,
                "importPathAliasResolvedRefs": 46,
                "importPathAliasFallbackRefs": 2425,
                "importPathAliasBindingFallbackRefs": 1734,
                "importPathAliasUnsupportedFallbackRefs": 221,
                "importPathAliasUnresolvedFallbackRefs": 470,
                "esmNamedImportExportResolutionMs": 123,
                "esmNamedImportExportResolvedRefs": 30,
                "esmNamedImportExportFallbackRefs": 1705,
                "esmOneHopReexportResolvedRefs": 0,
                "localExactReferenceResolutionMs": 1039,
                "localExactReferenceResolvedRefs": 2092,
                "localExactReferenceFallbackRefs": 16213,
                "subprocessStartupHandoffMs": 3
              },
              "finalize": {
                "frameworkPostExtractMs": 4,
                "referenceResolutionMs": 254,
                "referenceResolutionBreakdown": {
                  "importResolutionMs": 88,
                  "nameMatchingMs": 40,
                  "frameworkMatchingMs": 5,
                  "databaseAccessMs": 97,
                  "cacheWarmupMs": 3,
                  "unresolvedReadMs": 14,
                  "candidateLookupMs": 15,
                  "sharedCandidateLookupMs": 4,
                  "candidateLookupCacheHitMs": 1,
                  "perReferenceDisambiguationMs": 29,
                  "rustMatcherMs": 0,
                  "rustMatcherStartupMs": 0,
                  "rustMatcherSerializationMs": 0,
                  "rustMatcherEligibleRefs": 0,
                  "rustMatcherHandledRefs": 0,
                  "rustMatcherFallbackRefs": 0,
                  "rustMatcherSemanticMismatchRefs": 0,
                  "rustMatcherSemanticMismatchSamples": [],
                  "rustMatcherFallbackReasons": {},
                  "rustMatcherCandidateMaterializationMs": 0,
                  "rustMatcherSubprocessMs": 0,
                  "rustMatcherTsVerificationMs": 0,
                  "rustMatcherPayloadBytes": 0,
                  "rustMatcherUniqueCandidateFacts": 0,
                  "edgeMaterializationMs": 3,
                  "edgeWriteMs": 22,
                  "unresolvedCleanupMs": 55,
                  "otherResolutionMs": 1
                },
                "dynamicDispatchSynthesisMs": 341,
                "dbMaintenanceMs": 6,
                "boundaryProtocol": {
                  "version": 1,
                  "productShell": "typescript",
                  "rustOwnedStages": [
                    "source-scan",
                    "parse-extraction",
                    "graph-write",
                    "import-path-alias-resolution",
                    "esm-named-import-export-resolution",
                    "local-exact-reference-resolution"
                  ]
                },
                "fallbackTaxonomy": {
                  "totalFallbacks": 2400,
                  "entries": [
                    {
                      "stage": "framework-post-extract",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "dynamic-dispatch-synthesis",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "db-maintenance",
                      "classification": "known-unsupported",
                      "reason": "typescript-finalization-not-yet-migrated",
                      "count": 1
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
                      "count": 1705
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "unsupported-import-form-not-yet-rust-owned",
                      "count": 6
                    },
                    {
                      "stage": "reference-resolution",
                      "classification": "known-unsupported",
                      "reason": "unresolved-file-level-import-target",
                      "count": 685
                    }
                  ]
                }
              },
              "typescriptFinalizationMs": 631
            },
            "profiling": {
              "heapReport": null,
              "heapSummaryHtml": null
            },
            "diagnostics": []
          },
          "indexing": {
            "status": "completed"
          },
          "sourceCopy": {
            "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA",
            "copiedFiles": 34,
            "mode": "js-ts-config-slice",
            "skipped": false
          },
          "graphAvailable": true,
          "graphStats": {
            "fileCount": 34,
            "nodeCount": 6352,
            "edgeCount": 11537,
            "nodeKinds": {
              "class": 11,
              "component": 158,
              "constant": 3525,
              "field": 81,
              "file": 34,
              "function": 851,
              "import": 757,
              "interface": 11,
              "method": 364,
              "type_alias": 106,
              "variable": 454
            },
            "edgeKinds": {
              "calls": 3875,
              "contains": 6318,
              "exports": 140,
              "imports": 1141,
              "instantiates": 35,
              "references": 28
            },
            "dbSizeBytes": 13946880
          },
          "command": {
            "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
            "args": [
              "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
              "index",
              "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA",
              "--force",
              "--quiet",
              "--engine",
              "rust",
              "--graph-work-profile",
              "full",
              "--sqlite-write-mode",
              "final-flush"
            ],
            "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA",
            "nodeVersion": "v22.21.1",
            "env": {
              "ZCODEGRAPH_RUST_CORE_BINARY": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core",
              "ZCODEGRAPH_INDEX_PROFILE_OUT": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA/.zcodegraph/rust-index-profile.json"
            }
          }
        }
      },
      "gates": {
        "sufficiency": {
          "status": "passed",
          "regressions": []
        },
        "performance": {
          "status": "unavailable",
          "wallTimeDeltaPct": 52.20994475138122,
          "peakRssDeltaPct": 0,
          "diagnostics": [
            {
              "kind": "wall-time-phase-dominant",
              "message": "Dominant Rust wall-time phase is index",
              "arm": "rust",
              "phase": "index",
              "elapsedMs": 3350
            },
            {
              "kind": "wall-time-phase-dominant",
              "message": "Dominant TypeScript wall-time phase is init",
              "arm": "typescript",
              "phase": "init",
              "elapsedMs": 1616
            },
            {
              "kind": "wall-time-regression-source",
              "message": "Largest Rust-over-TypeScript wall-time delta is index",
              "phase": "index",
              "typescriptMs": 1613,
              "rustMs": 3350,
              "deltaMs": 1737
            }
          ]
        }
      },
      "classification": "target-failed-performance-gate-unmet"
    }
  ],
  "classification": "failed-required-performance-gate-unmet",
  "decisionReadiness": {
    "sufficiencyPassed": true,
    "performancePassed": false,
    "requiredTargetsPassed": false,
    "rolloutReadinessClaimed": false
  }
}
```

## 79. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`

```json
{
  "generatedAt": "2026-06-17T13:51:04.286Z",
  "status": "completed",
  "mode": "deterministic-tool-surface",
  "experimentMode": "full-index-ab",
  "executionModel": "sequential",
  "command": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 900000 --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json",
  "timeoutMs": 900000,
  "target": {
    "name": "vscode",
    "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse"
  },
  "arms": {
    "typescript": {
      "engine": "typescript",
      "sourceCopy": {
        "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL",
        "mode": "js-ts-config-slice",
        "copiedFiles": 11518,
        "skipped": false
      },
      "indexing": {
        "status": "completed",
        "elapsedMs": 246553,
        "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL"
      },
      "graphAvailable": true,
      "graphStats": {
        "nodeCount": 329355,
        "edgeCount": 1512994,
        "fileCount": 11098,
        "nodesByKind": {
          "class": 13204,
          "component": 9,
          "constant": 13580,
          "enum": 1999,
          "enum_member": 12799,
          "file": 11098,
          "function": 21411,
          "import": 106827,
          "interface": 13284,
          "method": 123696,
          "property": 6368,
          "route": 1,
          "type_alias": 4428,
          "variable": 651
        },
        "edgesByKind": {
          "calls": 592880,
          "contains": 318058,
          "decorates": 756,
          "extends": 6286,
          "implements": 4753,
          "imports": 271051,
          "instantiates": 54921,
          "references": 264289
        },
        "filesByLanguage": {
          "javascript": 121,
          "jsx": 1,
          "tsx": 263,
          "typescript": 10713
        },
        "dbSizeBytes": 1054994432,
        "lastUpdated": 1781703808429
      },
      "lastProgress": null,
      "command": {
        "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
        "args": [
          "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
          "index",
          "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL",
          "--force",
          "--quiet"
        ],
        "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL",
        "nodeVersion": "v22.21.1",
        "scriptVersion": "phase13-ab-v1",
        "gitSha": "23e7c1770e21c9deb6883e7343f58355ebf8f172",
        "env": {
          "CODEGRAPH_ALLOW_UNSAFE_NODE": "1",
          "CODEGRAPH_NO_DAEMON": "1",
          "CODEGRAPH_NO_RELAUNCH": "1"
        }
      },
      "diagnostics": []
    },
    "rust": {
      "engine": "rust",
      "sourceCopy": {
        "path": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX",
        "mode": "js-ts-config-slice",
        "copiedFiles": 11518,
        "skipped": false
      },
      "indexing": {
        "status": "completed",
        "elapsedMs": 441770,
        "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX"
      },
      "graphAvailable": true,
      "graphStats": {
        "nodeCount": 561906,
        "edgeCount": 1626117,
        "fileCount": 11291,
        "nodesByKind": {
          "class": 12680,
          "component": 202,
          "constant": 208276,
          "enum": 1999,
          "export": 1012,
          "field": 43691,
          "file": 11291,
          "function": 40037,
          "import": 107519,
          "interface": 13438,
          "method": 88931,
          "type_alias": 4948,
          "variable": 27882
        },
        "edgesByKind": {
          "calls": 747730,
          "contains": 550659,
          "exports": 7466,
          "imports": 264603,
          "instantiates": 54324,
          "references": 1335
        },
        "filesByLanguage": {
          "javascript": 136,
          "jsx": 1,
          "tsx": 263,
          "typescript": 10891
        },
        "dbSizeBytes": 1216704512,
        "lastUpdated": 1781704250362
      },
      "lastProgress": null,
      "command": {
        "executable": "/private/tmp/node-v22.21.1-darwin-arm64/bin/node",
        "args": [
          "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js",
          "index",
          "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX",
          "--force",
          "--quiet",
          "--engine",
          "rust"
        ],
        "cwd": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX",
        "nodeVersion": "v22.21.1",
        "scriptVersion": "phase13-ab-v1",
        "gitSha": "23e7c1770e21c9deb6883e7343f58355ebf8f172",
        "env": {
          "CODEGRAPH_ALLOW_UNSAFE_NODE": "1",
          "CODEGRAPH_NO_DAEMON": "1",
          "CODEGRAPH_NO_RELAUNCH": "1",
          "ZCODEGRAPH_RUST_CORE_BINARY": "/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core"
        }
      },
      "diagnostics": []
    }
  },
  "comparison": {
    "status": "completed",
    "elapsedMs": 0,
    "regressionCount": 0
  },
  "classification": "success-comparison-completed",
  "unavailableKind": null,
  "unavailableReason": null,
  "note": "Counts are deterministic fallback-risk signals from zcodegraph_explore output, not stochastic Claude Code Read/Grep tool calls.",
  "unavailableTaxonomy": [
    "copy-timeout",
    "typescript-index-timeout",
    "rust-index-timeout",
    "explore-timeout",
    "missing-index",
    "validator-failed",
    "process-error",
    "unsupported-runtime"
  ],
  "defaultRolloutReadinessClaimed": false,
  "runtimeWarnings": [],
  "stages": {
    "copy": {
      "status": "completed",
      "elapsedMs": 2583,
      "mode": "js-ts-config-slice"
    },
    "typescriptIndex": {
      "status": "completed",
      "elapsedMs": 246553,
      "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL"
    },
    "rustIndex": {
      "status": "completed",
      "elapsedMs": 441770,
      "projectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX"
    },
    "exploreAnalyze": {
      "status": "completed",
      "elapsedMs": 13910
    },
    "comparison": {
      "status": "completed",
      "elapsedMs": 0,
      "regressionCount": 0
    }
  },
  "toolchain": {
    "node": "v22.21.1",
    "rustc": "rustc 1.95.0 (59807616e 2026-04-14)",
    "cargo": "cargo 1.95.0 (f2d3ce0bd 2026-03-21)",
    "os": "Darwin 25.5.0 arm64",
    "cpu": "Apple M5",
    "cpuCount": 10
  },
  "results": [
    {
      "name": "vscode",
      "sourcePath": "/private/tmp/codegraph-corpus/vscode-sparse",
      "commit": "4ac53226",
      "copyMode": "js-ts-config-slice",
      "copies": {
        "typescript": {
          "copiedFiles": 11518,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-un0XJL"
        },
        "rust": {
          "copiedFiles": 11518,
          "tempProjectPath": "/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-rust-7pWBcX"
        }
      },
      "reuseIndexedPair": null,
      "prompts": [
        {
          "id": "VS-1",
          "query": "AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService",
          "typescript": {
            "outputChars": 20882,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [
              "MainThreadExtensionService"
            ],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "scope shallow"
          },
          "rust": {
            "outputChars": 25212,
            "hasFlowSection": true,
            "flowConnected": true,
            "missingExpected": [
              "AbstractExtensionService",
              "MainThreadExtensionService"
            ],
            "deterministicGenericRead": 1,
            "deterministicGenericGrep": 1,
            "classification": "scope shallow"
          }
        }
      ]
    }
  ],
  "regressions": []
}
```

## 80. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

# Issue #206 Finalization Diagnostics Decision

Date: 2026-06-18

## Decision

#206 completed the diagnostic slice for the VS Code sparse TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster.

Selected next candidate: #207, a follow-up design/prototype issue for semantic-equivalent per-reference disambiguation work. Do not directly optimize matcher behavior yet.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior comparison: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T16:26:34.905Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| VS Code sparse dirty | false |
| Copied files per arm | 11518 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| Experiment classification | stress-only-targets-completed-with-nonblocking-failures |
| Target classification | target-failed-performance-gate-unmet |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 455709 | 567944 |
| Index ms | 234579 | 349211 |
| Peak RSS bytes | 44810240 | 46071808 |
| graphStats ms | 66 | 78 |

Sufficiency: passed.

Performance gate: unavailable / unmet. The post-PRD optimization gate remains open.

## Graph Stats

| Metric | TypeScript | Rust |
|---|---:|---:|
| fileCount | 11098 | 11291 |
| nodeCount | 329355 | 561906 |
| edgeCount | 1512994 | 1626117 |
| dbSizeBytes | 1057366016 | 1216704512 |

Rust edge kinds:

| Edge kind | Count |
|---|---:|
| calls | 747730 |
| contains | 550659 |
| exports | 7466 |
| imports | 264603 |
| instantiates | 54324 |
| references | 1335 |

## Finalization Diagnostics

Single-run qualitative comparison only. #206 adds new public profile diagnostic fields for benchmark artifacts; they are not user-facing API and not an MCP contract.

| Segment | #206 ms | #205 ms | Notes |
|---|---:|---:|---|
| referenceResolutionMs | 85127 | 85884 | flat/down |
| importResolutionMs | 9477 | 9976 | flat/down |
| nameMatchingMs | 34539 | 34332 | flat |
| frameworkMatchingMs | 872 | 827 | flat |
| databaseAccessMs | 37875 | 38376 | flat/down |
| cacheWarmupDbMs | 271 | n/a | new #206 diagnostic |
| refHydrationDbMs | 51 | n/a | new #206 diagnostic |
| cacheWarmupMs | 322 | 389 | flat/down |
| unresolvedReadMs | 993 | 998 | flat |
| unresolvedReadDbMs | 993 | n/a | new #206 diagnostic |
| candidateLookupMs | 4129 | 4137 | flat |
| sharedCandidateLookupMs | 1258 | 1279 | flat |
| candidateLookupCacheHitMs | 471 | 416 | flat |
| nameMatcherCandidateLookupDbMs | 3669 | n/a | new #206 diagnostic |
| perReferenceDisambiguationMs | 31666 | 31472 | flat |
| edgeMaterializationMs | 259 | 263 | flat |
| edgeMaterializationDbMs | 259 | n/a | new #206 diagnostic |
| edgeWriteMs | 20167 | 20466 | flat/down |
| edgeWriteDbMs | 20167 | n/a | new #206 diagnostic |
| unresolvedCleanupMs | 16135 | 16260 | flat |
| unresolvedCleanupDbMs | 16135 | n/a | new #206 diagnostic |
| dynamicDispatchSynthesisMs | 9374 | 9422 | flat |
| dbMaintenanceMs | 114 | 108 | flat |

## Interpretation

The broad `databaseAccessMs` bucket is now separable enough to avoid guessing. Its largest DB subpaths are:

| DB subpath | #206 ms |
|---|---:|
| edgeWriteDbMs | 20167 |
| unresolvedCleanupDbMs | 16135 |
| nameMatcherCandidateLookupDbMs | 3669 |
| unresolvedReadDbMs | 993 |
| cacheWarmupDbMs | 271 |
| edgeMaterializationDbMs | 259 |
| refHydrationDbMs | 51 |

However, the largest single semantic subpath remains `perReferenceDisambiguationMs` at 31666ms. Because this path determines each reference's candidate choice, it is not safe to turn #206 directly into an implementation optimization.

`edgeWriteDbMs` and `unresolvedCleanupDbMs` are meaningful runner-up DB write paths, but they are not the selected next candidate because #206 shows the name-matcher disambiguation work is still the largest individual decision path.

## Fallback Taxonomy

| Stage | Classification | Reason | Count |
|---|---|---|---:|
| framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 149517 |
| reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 554 |
| reference-resolution | known-unsupported | unresolved-file-level-import-target | 81783 |

Total fallbacks: 231858.

## Next Candidate

Open #207 for semantic-equivalent per-reference disambiguation design/prototype.

Required constraints for that issue:

- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not directly replace the name matcher.
- Evaluate candidate reuse, batching, or cache-key design only if the output for each reference remains identical.
- Use focused fixtures for equivalence checks.
- End with one bounded A/B implementation recommendation, or explicitly stop.

This keeps the post-PRD optimization work data-driven without hiding a semantic change inside a performance issue.

## 81. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-207-disambiguation-equivalence-decision.md`

# Issue #207 Disambiguation Equivalence Decision

Date: 2026-06-18

## Decision

#207 completed a focused semantic-equivalence design/prototype slice for TypeScript finalization's per-reference disambiguation path.

Selected next candidate: #208, a bounded A/B implementation issue for a guarded candidate-set replay / grouping path with a semantic verifier. Do not directly replace the production name matcher without per-reference equivalence checks.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Background

#206 showed that the largest remaining single semantic path on the VS Code sparse profile was:

| Segment | Duration ms |
|---|---:|
| perReferenceDisambiguationMs | 31666 |
| edgeWriteDbMs | 20167 |
| unresolvedCleanupDbMs | 16135 |
| nameMatcherCandidateLookupDbMs | 3669 |

The largest path is semantic-sensitive because it decides each reference's exact target. #207 therefore used a diagnostic-only prototype instead of changing production resolver behavior.

## Prototype

The prototype adds `compareNameMatcherCandidateReplay()` in `src/resolution/rust-name-matcher.ts`.

It compares two decisions per unresolved reference:

1. Baseline: `matchReference(ref, originalContext)`.
2. Replay: `matchReference(ref, candidateSetContext)`, where `candidateSetContext` is backed only by the candidate facts collected for that reference.

The comparison is per-reference and exact over:

- target node id;
- resolution method;
- confidence;
- resolved vs unresolved state.

Mismatch taxonomy:

- `different-target`
- `different-method`
- `different-confidence`
- `baseline-unresolved`
- `replay-unresolved`

The prototype is diagnostic-only. Production `ReferenceResolver` does not call it, and resolver/name-matcher behavior is unchanged.

## Evidence

Automated fixture:

`npx vitest run __tests__/rust-name-matcher.test.ts`

Result: 10 tests passed.

Focused equivalence case:

| Metric | Value |
|---|---:|
| totalRefs | 3 |
| eligibleRefs | 3 |
| replayedRefs | 3 |
| equivalentRefs | 3 |
| mismatchCount | 0 |

The focused fixture covers:

- exact name resolution;
- instance-method resolution through receiver/class candidate facts;
- fuzzy lowercase resolution.

Scope guard:

| Metric | Value |
|---|---:|
| totalRefs | 2 |
| eligibleRefs | 1 |
| replayedRefs | 1 |
| mismatchCount | 0 |

The scope guard confirms the prototype remains limited to JS/TS-family references and does not pull unrelated language refs into this path.

Build verification:

- `npm run build`
- `npx vitest run __tests__/rust-name-matcher.test.ts`

## Interpretation

Candidate-set replay is a plausible optimization seam because it can reuse pre-collected facts while still running the same matcher logic. The focused fixture produced zero mismatches, which is enough to justify one bounded A/B implementation issue.

This is not enough evidence to enable a production fast path by default. A larger implementation issue must carry a semantic verifier that compares baseline and candidate decisions before claiming improvement.

## Next Candidate

Open #208 for guarded candidate-set replay / grouping.

Required constraints for that issue:

- Preserve every per-reference disambiguation semantic.
- Keep SQLite schema unchanged.
- Keep the baseline matcher as the authority during the A/B.
- Record mismatch count and mismatch taxonomy.
- Run focused fixtures first.
- Run one final VS Code sparse profile/smoke if the implementation passes focused equivalence.
- Choose either keep the implementation candidate or stop; do not branch into multiple optimization tracks.

Runner-up paths remain `edgeWriteDbMs` and `unresolvedCleanupDbMs`, but they are not selected by #207 because #206 identified `perReferenceDisambiguationMs` as the largest single semantic path and #207 found a plausible equivalence seam for that path.

## 82. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md`

# Issue #208 Candidate Replay A/B Decision

Date: 2026-06-18

## Decision

#208 completed a guarded candidate-set replay A/B for the TypeScript finalization name-matching path.

Decision: stop this candidate as the next performance implementation path. Keep the guarded replay verifier as diagnostic instrumentation, but do not promote candidate-set replay to a production fast path from this evidence.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## What Changed

- Added `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB=1` to enable guarded candidate replay A/B.
- Added per-reference A/B counters to the Rust index profile artifact:
  - `candidateReplayEligibleRefs`
  - `candidateReplayComparedRefs`
  - `candidateReplayEquivalentRefs`
  - `candidateReplayMismatchRefs`
  - `candidateReplayMismatchReasons`
  - `candidateReplayMismatchSamples`
- Kept baseline `matchReference(ref, originalContext)` as the authority.
- Candidate replay is never returned instead of baseline by this issue.
- SQLite schema is unchanged.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T17:13:11.468Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| VS Code sparse dirty | false |
| Copied files per arm | 11518 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| A/B flag | `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB=1` |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 528387 | 628564 |
| Peak RSS bytes | 45907968 | 39960576 |
| graphStats files | 11098 | 11291 |
| graphStats nodes | 329355 | 561906 |
| graphStats edges | 1512994 | 1626117 |

Sufficiency: passed.

Performance gate: unavailable / unmet.

## A/B Equivalence

| Metric | Value |
|---|---:|
| candidateReplayEligibleRefs | 933914 |
| candidateReplayComparedRefs | 933914 |
| candidateReplayEquivalentRefs | 933914 |
| candidateReplayMismatchRefs | 0 |

Mismatch reasons: none.

Mismatch samples: none.

This is strong semantic evidence: candidate-set replay can reproduce baseline decisions for this VS Code sparse run when used as a verifier.

## Performance Effect

Single-run qualitative comparison only.

| Segment | #208 A/B ms | #206 baseline ms | Direction |
|---|---:|---:|---|
| referenceResolutionMs | 117657 | 85127 | worse |
| nameMatchingMs | 66627 | 34539 | worse |
| candidateLookupMs | 7228 | 4129 | worse |
| nameMatcherCandidateLookupDbMs | 5963 | 3669 | worse |
| perReferenceDisambiguationMs | 60529 | 31666 | worse |
| edgeWriteDbMs | 20447 | 20167 | flat |
| unresolvedCleanupDbMs | 16202 | 16135 | flat |
| dynamicDispatchSynthesisMs | 9461 | 9374 | flat |
| dbMaintenanceMs | 121 | 114 | flat |

The A/B verifier roughly doubles the semantic disambiguation work, which is expected because it runs baseline and replay. More importantly, the replay candidate still needs candidate materialization and does not show a clear path to reducing the bottleneck by itself.

## Interpretation

The candidate is semantically promising but not a good next performance implementation path in its current shape.

What to keep:

- the guarded verifier;
- the mismatch taxonomy;
- the ability to use candidate replay as a future safety check.

What not to do next:

- do not promote candidate-set replay as a production fast path;
- do not continue optimizing this path without a new, more specific hypothesis that avoids duplicating the baseline work;
- do not claim performance improvement from the #208 run.

## Stop Rationale

#208 required a keep-vs-stop decision. The decision is stop for this candidate as the next implementation path.

Reason:

- semantic equivalence is excellent (`mismatchCount=0`);
- the A/B path adds too much verifier overhead;
- the candidate does not yet remove enough work from `perReferenceDisambiguationMs`;
- continuing here would likely turn into broad matcher redesign, which is outside #208.

#165 should remain open for post-PRD optimization. The next optimization selection should use the existing tracker rather than automatically continuing candidate replay.

## 83. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md`

# Issue #209 Edge Write Batching A/B Decision

Date: 2026-06-18

## Decision

#209 completed one bounded TypeScript finalization resolved-edge write A/B.

Decision: keep the implementation as a low-risk cleanup of the finalization write path, but do not continue optimizing this candidate as the next #165 path without a new hypothesis that improves `edgeMaterializationDbMs + edgeWriteDbMs` together.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## What Changed

- Added a prevalidated edge batch writer for callers that have already checked edge endpoints against the current `nodes` table.
- Kept the existing safe `insertEdges()` behavior for general callers; it still validates endpoints before writing.
- Changed TypeScript finalization persistence to validate endpoints during edge materialization and then write through the prevalidated batch writer.
- Kept resolver, name-matcher, and per-reference disambiguation semantics unchanged.
- SQLite schema is unchanged.
- Rust/TypeScript ownership boundaries are unchanged.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior VS Code comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

## Validation

Commands run:

- `npm run build`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts -t "prevalidated|edge materialization|insertEdges endpoint validation"`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts __tests__/rust-name-matcher.test.ts __tests__/rust-index-profile.test.ts __tests__/rust-index-engine-cli.test.ts`
- Generated experiment commands are represented by the consolidated cleanup artifact above.

Focused tests passed. The broader focused suite passed: 5 files, 118 tests.

## Required Target Evidence

The ZCodeGraph required-target A/B used the same source checkout for before and after:

- before source: `/private/tmp/zcodegraph-issue209-baseline`
- after source: `/private/tmp/zcodegraph-issue209-baseline`
- source commit: `147271ec36eef0befe344c18de0b65d20bf1d0b8`

Excalidraw was unavailable as useful required-target evidence in this local environment because `/private/tmp/codegraph-corpus/excalidraw` contained no working-tree source files; both arms copied 0 files and produced 0 graph nodes.

| ZCodeGraph metric | Before | After | Direction |
|---|---:|---:|---|
| Sufficiency | passed | passed | unchanged |
| Rust total elapsed ms | 8051 | 7604 | better |
| Rust peak RSS bytes | 52297728 | 52150272 | better |
| graphStats files | 288 | 288 | unchanged |
| graphStats nodes | 14270 | 14270 | unchanged |
| graphStats edges | 30083 | 30083 | unchanged |
| referenceResolutionMs | 352 | 362 | worse |
| edgeMaterializationDbMs | 2 | 10 | worse |
| edgeWriteDbMs | 60 | 53 | better |
| unresolvedCleanupDbMs | 117 | 121 | worse |

Interpretation: the targeted `edgeWriteDbMs` bucket improved on ZCodeGraph, while the endpoint validation work moved into `edgeMaterializationDbMs`. GraphStats and sufficiency stayed unchanged.

## VS Code Sparse Evidence

The final stress smoke ran on the validated VS Code sparse checkout:

- path: `/private/tmp/codegraph-corpus/vscode-sparse`
- commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- dirty: false
- copied files per arm: 11518
- sufficiency: passed

| VS Code metric | #206 prior | #209 after | Direction |
|---|---:|---:|---|
| Rust total elapsed ms | 567944 | 562847 | better |
| Rust peak RSS bytes | 46071808 | 45776896 | better |
| referenceResolutionMs | 85127 | 84645 | better |
| edgeMaterializationDbMs | 259 | 1052 | worse |
| edgeWriteDbMs | 20167 | 19273 | better |
| unresolvedCleanupDbMs | 16135 | 16051 | better |

Interpretation: VS Code shows the same shape as the focused target. `edgeWriteDbMs` improves, but most of that improvement is offset by endpoint validation moving into `edgeMaterializationDbMs`. The combined materialization plus write bucket is effectively flat.

## Keep Rationale

Keep this implementation because:

- it preserves graph semantics in focused integration coverage;
- it keeps the default `insertEdges()` endpoint validation contract for general callers;
- it removes duplicated endpoint validation from the finalization write call itself;
- it produces modest positive direction in the targeted `edgeWriteDbMs` bucket on ZCodeGraph and VS Code sparse;
- it does not change SQLite schema, resolver semantics, or Rust ownership.

Do not continue this exact candidate as the next #165 optimization path because:

- the improvement is mostly a bucket shift from `edgeWriteDbMs` to `edgeMaterializationDbMs`;
- required-target evidence is incomplete because Excalidraw is locally unavailable as a useful corpus;
- the post-PRD gate remains far from closed;
- the next optimization should evaluate combined segment cost, not a single shifted bucket.

## Follow-up Guidance

#165 should remain open. The next optimization selection should use fresh end-to-end evidence and treat `edgeMaterializationDbMs + edgeWriteDbMs` as a combined segment if it revisits finalization writes.

No Rust default rollout readiness is claimed.

## 84. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md`

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

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
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

## 85. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`

# Issue #211 Rust Core Graph-Write A/B Decision

## Scope

This issue tested one bounded implementation candidate from #210: reduce Rust-owned graph-write time measured by `rustCore.sqliteWriteMs`.

No Rust default rollout readiness is claimed.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Implementation

The Rust core now suspends node FTS triggers during fresh bulk graph writes, writes the extracted graph, rebuilds `nodes_fts` once from the completed `nodes` table, and restores the triggers before the index is finalized.

This does not change the database schema or graph semantics. It changes when FTS maintenance happens during a fresh Rust-produced index.

## Reduced Fixture A/B

Representative reduced fixture:

- 80 TypeScript files
- 500 exported functions per file
- 40080 Rust-created nodes
- `sqliteWriteMode=final-flush`

| Run | sqliteWriteMs | parseExtractionMs | durationMs |
|---|---:|---:|---:|
| Before | 2313 | 945 | 3355 |
| After | 1628 | 906 | 2659 |

Reduced-fixture result: `sqliteWriteMs` improved by about 30%.

The regression test also verifies that the final `nodes_fts` row count equals the final `nodes` row count after the rebuild.

## Final After Scoreboard

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Before artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md`

| Target | Sufficiency | Rust graphStats | Before sqliteWriteMs | After sqliteWriteMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | unchanged | 1356 | 1038 | -23.45% | 7649 | 7579 | -0.92% |
| Excalidraw | passed | unchanged | 2411 | 1831 | -24.06% | 14979 | 14020 | -6.40% |
| VS Code sparse | passed | unchanged | 133042 | 126307 | -5.06% | 570731 | 577634 | +1.21% |

Experiment classification remains `failed-required-performance-gate-unmet`.

## Interpretation

The candidate is valid and safe to keep:

- It improves the targeted `rustCore.sqliteWriteMs` bucket on all three measured corpora.
- It preserves graphStats parity for Rust outputs.
- It preserves sufficiency across ZCodeGraph, Excalidraw, and VS Code sparse.

The candidate is not enough to satisfy the broader required performance gate:

- ZCodeGraph and Excalidraw still fail required performance.
- VS Code sparse improves in the targeted bucket but not in total Rust wall time in this single after run.
- Remaining large buckets include Rust core `localExactReferenceResolutionMs`, Rust core `parseExtractionMs`, TypeScript finalization reference resolution, and finalization DB work.

## Recommendation

Close #211 as completed because the bounded candidate was implemented, verified, and measured.

Keep #165 open. The next performance issue should select a different dominant bucket rather than continuing this exact FTS-trigger candidate. Based on this run, the strongest remaining Rust-owned candidate is `localExactReferenceResolutionMs` on VS Code sparse, with explicit graphStats/sufficiency parity checks.

#185 remains unchanged because this issue did not touch packaging, CLI status, release, or npm smoke paths.

## 86. `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`

# Rust Indexing Core Phase 22 Decision

## Scope

Phase 22 built the local evidence pipeline for post-PRD Rust indexing optimization, used it to run one bounded optimization candidate, and performed a narrow cleanup of the new performance-evidence path.

No Rust default rollout readiness is claimed.

Architecture record:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

## Pipeline Artifacts

- Plan: `docs/plans/2026-06-18-rust-indexing-core-phase-22-evidence-pipeline-and-optimization-loop.md`
- Evidence tool: `scripts/rust-indexing-evidence.mjs`
- Tool tests: `__tests__/rust-indexing-evidence.test.ts`
- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

The evidence tool is local-only. It does not call GitHub, update issues, close issues, edit labels, or require network access.

## Candidate Selection

The Phase 22 ranking output selected `localExactReferenceResolutionMs` as the next bounded candidate after excluding already-tested directions:

- #208 candidate replay verifier.
- #209 TypeScript finalization edge-write-only.
- #211 FTS-trigger bulk write.

The selected optimization reuses same-file local exact candidate lookup results by `(file_path, reference_name, reference_kind)` and tracks existing Rust finalization edges in memory instead of querying SQLite for each reference. This preserves per-reference disambiguation semantics because every reference still checks whether its candidate set is uniquely resolvable.

## Reduced Fixture Evidence

Representative reduced fixture:

- 1 TypeScript file.
- 1 local helper function.
- 900 exported caller functions calling the helper.
- 900 resolved local exact references.

| Run | localExactReferenceResolutionMs | resolved refs | fallback refs | durationMs |
|---|---:|---:|---:|---:|
| Before | 233 | 900 | 0 | 272 |
| After | 66 | 900 | 0 | 124 |

The reduced fixture shows the target bucket moving in the intended direction without changing resolved/fallback counts.

## Final After Scoreboard

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Comparison baseline: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`.

| Target | Sufficiency | Rust graphStats | Before localExactMs | After localExactMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | changed | 1532 | 484 | -68.41% | 7579 | 6747 | -10.98% |
| Excalidraw | passed | unchanged | 1565 | 720 | -53.99% | 14020 | 13427 | -4.23% |
| VS Code sparse | passed | unchanged | 50877 | 34485 | -32.22% | 577634 | 622492 | +7.77% |

ZCodeGraph graphStats changed because the local working tree target was dirty and this phase added source files before the final scoreboard. The source slice changed from the #211 artifact to the Phase 22 artifact. Excalidraw and VS Code sparse were clean fixed external corpora and preserved Rust graphStats.

## Decision

Keep the implementation.

Rationale:

- The selected target bucket improved on all three scoreboard targets.
- Excalidraw and VS Code sparse preserved Rust graphStats exactly.
- Sufficiency passed on all three targets.
- The reduced fixture preserved resolved/fallback counts.
- The implementation does not change SQLite schema.
- The implementation does not change resolver semantics; it reuses shared candidate lookup results and in-memory duplicate-edge tracking for the same decisions.

The broader required performance gate remains unmet:

- Required targets still classify as `target-failed-performance-gate-unmet`.
- VS Code sparse Rust wall time regressed in this single after run despite the targeted local exact bucket improvement.
- Remaining large buckets include parse extraction, SQLite write, TypeScript finalization, and finalization DB/name-matching work.

## Cleanup Result

The final cleanup kept Phase 22 scoped:

- Comparison, ranking, and decision draft generation live in one local evidence tool.
- Fixture tests cover comparison, ranking, exclusion notes, and decision draft output through the CLI.
- Non-numeric finalization breakdown fields are filtered out of markdown output instead of rendering noisy object strings.
- GitHub workflow remains outside the tool.

No repo-wide architecture cleanup was performed.

## Tracker Update Draft

- Phase 22 evidence pipeline is complete.
- #213 comparison generator, #214 candidate ranking, and #215 decision draft generation are implemented in `scripts/rust-indexing-evidence.mjs`.
- #216 selected and ran `localExactReferenceResolutionMs`; target bucket improved on ZCodeGraph, Excalidraw, and VS Code sparse.
- #217 cleanup removed noisy non-numeric breakdown output and kept the pipeline local-only.
- Required performance remains unmet.
- Rust default rollout readiness is not claimed.

## Next Recommendation

Keep #165 open.

The next post-Phase 22 optimization should use the new evidence tool rather than hand-written comparison tables. Based on the Phase 22 final comparison, `parseExtractionMs` is the next highest Rust-owned ranked bucket, but it should be confirmed against the latest artifact pair before creating the next implementation issue.

## 87. `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`

# Rust Indexing Core Phase 23 Closeout Decision

## Scope

Phase 23 cleaned up the Rust indexing optimization evidence contract, classified recent performance experiment paths, performed narrow benchmark/evidence boundary cleanup, and selected the next #165 step.

No Rust default rollout readiness is claimed. #165 remains open.

Architecture record:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

## Evidence Contract Cleanup

The evidence generator now emits an explicit `Evidence Contract` section in comparison output.

The contract records:

- local-only scope with no GitHub or network side effects,
- target status fields: required/stress classification, empty-corpus status, sufficiency, and Rust graphStats parity,
- Rust arm wall-time comparison semantics,
- RSS bytes or unavailable reason,
- Rust-owned profile buckets, TypeScript finalization total, and numeric finalization breakdown fields,
- rollout-readiness disclaimer.

The RSS table now includes unavailable-reason columns instead of only rendering `n/a` when RSS is absent.

## Inventory Classification

Inventory details were absorbed into:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Classification summary:

- Production paths: Rust opt-in `final-flush`, Rust core FTS-trigger suspension/rebuild, Rust core local exact reference lookup cache.
- Retained diagnostics: `disk` and `memory-final-flush` write modes, finalization/reference-resolution profile buckets, candidate replay/equivalence verifier, evidence generator, empty-corpus validation, #185 environment validation reserve.
- Dead candidates: candidate replay as a production optimization, TypeScript finalization edge-write-only as originally framed, FTS-trigger bulk write as a future repeated candidate.

The inventory keeps evidence in `docs/benchmarks/` while making it clear which paths are production behavior, diagnostic-only, or no longer valid as future candidate framing.

## Production Boundary Cleanup

The implementation cleanup stayed on the benchmark/evidence boundary:

- RSS unavailable reasons are now normalized into the generated evidence row.
- The generated comparison contract is explicit and reusable.
- Candidate exclusion remains visible in ranking output.

No default indexing behavior changed.

Unchanged:

- SQLite schema.
- MCP behavior.
- Installer, packaging, release, status, and npm smoke paths.
- Rust core graph semantics.
- Resolver semantics.

Rust core production paths were not refactored in this phase because the inventory did not identify a safe cleanup that would improve diagnostic clarity without risking behavior churn.

## Validation

Commands run:

- `npx vitest run __tests__/rust-indexing-evidence.test.ts`
- `npx vitest run __tests__/rust-indexing-evidence.test.ts __tests__/rust-indexing-experiment.test.ts`
- `npm run build`

Targeted smoke/profile artifacts generated from existing Phase 22 evidence:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Smoke source artifacts:

- Before: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`
- After: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`

Smoke result:

| Target | Sufficiency | Rust graphStats | RSS result |
|---|---|---|---|
| ZCodeGraph | passed | changed | recorded |
| Excalidraw | passed | unchanged | recorded |
| VS Code sparse | passed | unchanged | recorded |

ZCodeGraph graphStats changed because the Phase 22 local working-tree corpus changed between the #211 and #216 artifacts. This was already documented in the Phase 22 decision as corpus drift, not a semantic claim. Excalidraw and VS Code sparse were clean external corpora and remained unchanged.

A full VS Code sparse scoreboard was not run. The Phase 23 plan explicitly defaults to targeted smoke/profile unless cleanup changes final-evidence semantics or default behavior.

## Next #165 Step

Recommended next step: [#224](https://github.com/jununfly/ZCodeGraph/issues/224), one profiling issue for `parseExtractionMs`.

Rationale:

- The cleaned Phase 23 smoke comparison ranks `parseExtractionMs` as the top Rust-owned bucket after Phase 22.
- The bucket is large on VS Code sparse and visible on required targets.
- Phase 23 did not run a fresh full scoreboard, so jumping directly to implementation would overstate confidence.
- A profiling issue should first split `parseExtractionMs` into actionable parser/extraction subsegments and confirm whether the cost is implementation-owned, grammar/parser-owned, source-shape-driven, or orchestration-driven.

The next issue should be diagnostic/profiling first, not a bounded optimization implementation issue.

## Tracker Update Draft

- Phase 23 is complete.
- Evidence output now includes an explicit local-only contract and RSS unavailable-reason columns.
- Performance experiment paths are classified as production path, retained diagnostic, or dead candidate.
- Production cleanup stayed on the evidence/benchmark boundary and did not change default indexing behavior.
- Targeted smoke/profile generated valid artifacts from existing Phase 22 evidence.
- RSS was recorded in the smoke artifacts.
- Sufficiency passed on all compared targets.
- Excalidraw and VS Code sparse graphStats were unchanged; ZCodeGraph changed due already-documented local corpus drift.
- Next #165 step: #224, one `parseExtractionMs` profiling issue.
- #165 remains open.
- Rust default rollout readiness is not claimed.

## 88. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

# Rust Indexing Core Issue-Level Optimization Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Issue-level optimization decisions from #193, #205, #206, #208, #209, #210,
and #211 remain as durable decision artifacts. Their generated raw experiment
files, manifests, and generated summaries can be deleted after this cleanup.

## Consolidated Issue Map

| Issue | Durable decision artifact | Cleanup interpretation |
| --- | --- | --- |
| #193 | `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md` | Cleanup A/B evidence was useful but did not resolve the larger performance target. |
| #205 | `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md` | Selected #206 as the next diagnostic/design issue for TypeScript finalization. |
| #206 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md` | Finalization diagnostics identified `databaseAccessMs` + `nameMatchingMs` as the cluster to reason about. |
| #208 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md` | Candidate replay A/B did not become the main standalone optimization direction. |
| #209 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md` | Edge-write batching preserved the diagnostic trail but did not close the broader gate alone. |
| #210 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md` | Post-#209 scoreboard showed the remaining performance gate was still unmet. |
| #211 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md` | Rust core SQLite write optimization became durable evidence for staged SQLite write paths. |

## Deleted Process Artifact Classes

This cleanup deletes:

- issue-level generated `.experiment.json` files;
- issue-level generated `.raw.json` files;
- issue-level generated `*-summary.md` files.

## Durable Follow-On Artifacts

Keep these as the reusable architecture/performance trail:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

## Cleanup Boundary

This cleanup does not delete the durable issue decision documents themselves.
It only removes generated process evidence whose reusable facts are captured in
those decision documents and in the ADRs above.

## 89. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

# Rust Indexing Core Phase 14/15 Experiment Artifact Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

The Phase 14/15 required-target and VS Code matched-work experiment files were
temporary generated process artifacts. Their reusable conclusions are
consolidated here; the individual raw rerun JSON files and generated
`decision-summary-draft` files can be deleted.

## Consolidated Findings

### Phase 14 Required-Only Full Profile

The initial required-only runs went through several unavailable or failed
attempts before producing a completed full-profile rerun.

Reusable conclusion:

- Both required targets eventually produced TypeScript and Rust graphs.
- Sufficiency passed on the completed run.
- The original performance gate was not met.
- Full-profile Rust graph output was materially different from the TypeScript
  arm, especially node/edge volume, so raw wall-clock comparison was not enough
  to explain product readiness.

Most useful completed-run summary:

| Target | TypeScript ms | Rust ms | Wall delta | Classification |
| --- | ---: | ---: | ---: | --- |
| zcodegraph | 9,818 | 11,072 | +12.77% | performance gate unmet |
| excalidraw | 25,672 | 26,408 | +2.87% | performance gate unmet |

### Phase 15 Required-Only Matched Work

The matched-work rerun controlled the most obvious graph-work mismatch from the
full-profile run.

Reusable conclusion:

- Both required targets produced TypeScript and Rust graphs.
- Sufficiency passed.
- Matched-work Rust was faster on wall time for both required targets.
- The original raw PRD performance gate was still not redefined by this
  experiment.
- The evidence changed the causal interpretation: prior full-profile results
  were materially affected by Rust doing different graph work.

Most useful matched-work summary:

| Target | Full-profile Rust delta | Matched-work Rust delta | Classification |
| --- | ---: | ---: | --- |
| zcodegraph | +12.77% | -14.95% | original gate still unmet |
| excalidraw | +2.87% | -21.99% | original gate still unmet |

### Phase 15D VS Code Matched-Work Stress

The VS Code sparse matched-work stress run eventually completed after earlier
preflight/unavailable attempts.

Reusable conclusion:

- VS Code sparse produced TypeScript and Rust graphs in the completed stress
  rerun.
- Sufficiency passed.
- Rust was faster on wall time under matched-work control.
- RSS regressed, so this was not a rollout greenlight.
- The result remained stress evidence, not a required-target completion gate.

Most useful completed-run summary:

| Target | TypeScript ms | Rust ms | Wall delta | RSS delta | Classification |
| --- | ---: | ---: | ---: | ---: | --- |
| vscode sparse | 1,046,846 | 770,037 | -26.44% | +20.08% | performance gate unmet |

## Deleted Process Artifact Classes

The cleanup removes these process artifact classes from the Phase 14/15 cluster:

- early unavailable required-only raw reruns;
- generated required-only `decision-summary-draft` files;
- generated matched-work `decision-summary-draft` files;
- early unavailable VS Code stress raw reruns;
- generated VS Code stress `decision-summary-draft` files.

## Durable Follow-On Artifacts

Later work superseded the deleted process files and remains the reusable
decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`

## Cleanup Boundary

This cleanup does not delete active release, resolver, or Rust-hybrid
architecture evidence. It only removes process artifacts whose decision value is
captured above or superseded by later durable documents.

## Remaining Documentation Cleanup Todolist

The repository still has historical process artifacts that may be consolidated
in later cleanup passes. Do not delete them blindly; first absorb their useful
facts into durable closeout/decision artifacts and update references.

Recommended next clusters:

1. Phase 15E/15F RSS gate and heap-profile artifacts.
   Keep active dhat/profile evidence until the RSS-gate story is consolidated.
2. Phase 16/17/18 SQLite write-path and scoreboard artifacts.
   Consolidate only after preserving the before/after wall-clock, RSS,
   graphStats, and decision classifications already used by ADR ZJ-0004.
3. Issues #193, #205, #206, #208, #209, #210, and #211 optimization evidence.
   These are candidates for a single optimization-evidence index, but several
   still support ADR ZJ-0003/ZJ-0004 and #165.
4. Phase 22/23 evidence-pipeline cleanup drafts.
   These should be merged only after checking whether their decision value is
   already represented in `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`.
5. Rust-native module-resolution profile/oracle artifacts from 2026-06-22 and
   2026-06-23.
   Keep current resolver-roadmap evidence until the semantic-frontier decision
   pack decides what is still live.

## 90. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

# Rust Indexing Core Phase 15E/15F RSS Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 15E/15F RSS work has durable conclusions in the plans and this cleanup
artifact. The generated raw experiment files, experiment manifests, summary
drafts, and copied `dhat` heap report can be deleted after this consolidation.

## Phase 15E Consolidated Finding

Phase 15E built reusable heap-profiling infrastructure and ran a VS Code
matched-work stress profile with `dhat` enabled.

Reusable conclusion:

- `dhat-rs` heap profiling and summary generation were useful diagnostic
  tooling.
- SQLite write batching moved the VS Code matched-work RSS trend favorably.
- The profiled run was not a rollout-readiness signal because `dhat` changes
  runtime behavior and wall time.
- The RSS gate still did not close.

Key result:

| Evidence | Before | After |
| --- | ---: | ---: |
| VS Code matched-work RSS delta | +20.08% | -21.41% |

Interpretation: favorable trend, not a default-rollout greenlight.

## Phase 15F Consolidated Finding

Phase 15F reran production-like VS Code sparse matched-work smoke without the
`dhat` profiler and tried one bounded second candidate after lazy
normalization.

Reusable conclusion:

- Baseline: Rust wall time improved but RSS regressed.
- Lazy normalization: worth keeping; removes avoidable source copies and moved
  the single-run RSS delta from `+30.45%` to `-5.05%`.
- Borrowed-ID cleanup: no material RSS improvement; Rust peak RSS stayed around
  `38.2 MB`.
- The PRD RSS gate was still unmet; Phase 15F stopped instead of pivoting to a
  broad SQLite in-memory/final-flush rewrite.

Key production-like VS Code sparse results:

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | Classification |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | gate unmet |
| Lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | gate unmet |
| Borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | gate unmet |

Rust profile trend:

| Run | parseExtractionMs | sqliteWriteMs | referenceResolutionMs | typescriptFinalizationMs |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 37,195 | 62,635 | 21,549 | 28,599 |
| Lazy normalization | 36,831 | 61,339 | 21,026 | 27,976 |
| Borrowed-ID cleanup | 35,736 | 61,108 | 21,111 | 28,099 |

## Deleted Process Artifact Classes

This cleanup deletes:

- Phase 15E copied `dhat` heap JSON/HTML evidence and generated rerun4
  raw/manifest/draft files;
- Phase 15F generated raw experiment files;
- Phase 15F generated experiment manifests;
- Phase 15F generated summary files;
- Phase 15F reduced smoke JSON.

## Durable Follow-On Artifacts

Keep these as the reusable decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

## Cleanup Boundary

This cleanup only removes local process evidence for the old RSS-gate
investigation. It does not remove the profiling implementation, tests, scripts,
or later architecture/performance decision artifacts.

## 91. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

# Rust Indexing Core Phase 16-18 SQLite And Scoreboard Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 16-18 durable conclusions remain in their result/decision documents.
Generated raw experiment files, experiment manifests, and generated summaries
can be deleted after this cleanup because their reusable facts are already
captured in the Phase 16, Phase 17, and Phase 18 decision artifacts.

## Consolidated Findings

### Phase 16

Decision: `productionize-sqlite-candidate`.

Reusable conclusion:

- `memory-final-flush` validated the SQLite write/finalization boundary as a
  productionization candidate.
- VS Code sparse stress showed a large `sqliteWriteMs` drop:
  `66,317 ms -> 22,774 ms`.
- Required-target gates still failed.
- The correct next step was a production-safe final-flush path, not rollout.

### Phase 17

Decision: keep `final-flush` as the default Rust opt-in write mode.

Reusable conclusion:

- Production `final-flush` became the default for explicit Rust indexing.
- `disk` remained a debug escape hatch; `memory-final-flush` stayed
  experimental.
- Agent sufficiency smoke passed.
- Required-target performance gates still failed.
- Full profile exposed larger Rust graph work and TypeScript
  finalization/reference-resolution as the next blocker.

### Phase 18

Decision: keep staging-database fast-write PRAGMAs.

Reusable conclusion:

- The bounded SQLite PRAGMA candidate improved the intended write segment.
- Reduced fixture `sqliteWriteMs`: `786 ms -> 549 ms`.
- Required target `sqliteWriteMs` improved:
  - zcodegraph: `1,693 ms -> 1,296 ms`;
  - excalidraw: `667 ms -> 519 ms`.
- VS Code sparse `sqliteWriteMs`: `160,722 ms -> 153,186 ms`.
- Full-profile wall-time gate still failed.
- TypeScript finalization/reference resolution remained the next major blocker.

## Deleted Process Artifact Classes

This cleanup deletes:

- Phase 16 baseline and candidate raw/manifest/summary files;
- Phase 16 reduced smoke JSON;
- Phase 17 matched/full scoreboard raw/manifest/summary files;
- Phase 18 reduced/required/VS Code raw/manifest/summary files.

## Durable Follow-On Artifacts

Keep these as the reusable decision trail:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Cleanup Boundary

This cleanup does not remove the durable decision artifacts, plans, ADRs, or
later optimization evidence. It only removes generated files whose reusable
facts are already summarized above and in the kept decision artifacts.

## 92. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

# Rust Indexing Core Phase 22/23 Evidence Pipeline Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 22 and Phase 23 durable decisions remain in:

- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`

Generated comparison output, generated decision drafts, experiment manifests,
raw artifacts, summaries, and temporary inventory files can be deleted after
this cleanup because their reusable facts are already captured by the durable
decision artifacts above.

## Consolidated Facts

Phase 22 established the local evidence pipeline and used it for one bounded
optimization candidate:

- the evidence tool is local-only and has no GitHub/network side effects;
- candidate ranking selected `localExactReferenceResolutionMs` after excluding
  #208 candidate replay, #209 edge-write-only, and #211 FTS-trigger bulk write;
- the local exact candidate preserved sufficiency and Rust graphStats on the
  clean external corpora;
- the target bucket improved on ZCodeGraph, Excalidraw, and VS Code sparse;
- the broader required performance gate remained unmet.

Phase 23 cleaned the evidence contract rather than changing runtime behavior:

- comparison output records target status, sufficiency, graphStats parity, RSS
  or unavailable reason, Rust-owned profile buckets, and rollout disclaimer;
- recent performance paths were classified as production path, retained
  diagnostic, or dead candidate;
- default indexing behavior, SQLite schema, MCP behavior, installer, packaging,
  release, status, and npm smoke paths were unchanged;
- the next recommended #165 step was one diagnostic/profiling issue for
  `parseExtractionMs`.

## Deleted Process Artifact Classes

This cleanup deletes:

- generated Phase 22 comparison files;
- generated Phase 22 decision drafts;
- generated Phase 22 local-exact manifest/raw/summary files;
- generated Phase 23 targeted smoke comparison and draft files;
- the Phase 23 temporary experiment inventory.

## Cleanup Boundary

This cleanup does not delete the durable Phase 22/23 decision documents or the
Phase 22/23 plans. It only removes generated process artifacts whose reusable
facts are preserved in the durable decisions and summarized here.
