# Rust Indexing Core — Decision Ledger

> Decision ledger distilled 2026-09-21 from the 16,104-line
> `2026-06-24-rust-indexing-core-consolidated-benchmarks.md` (an append-merge of
> the 2026-06-13/14 phase decision, performance, and sufficiency process files).
> Only decision-level sections are retained; raw profiles, command logs, prompt
> matrices, and per-run result tables were dropped (recoverable in git history).
>
> doc-kind: design · authority: supporting · paired with ADR-0003/0004.

This ledger preserves the phase-by-phase rollout decisions, gates, blockers, and
the final bounded-success classification of the Rust indexing core vertical
slice. It is the durable record referenced by the evidence-gated indexing
optimization decisions.

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

### 1. `docs/benchmarks/2026-06-13-rust-indexing-core-agent-sufficiency.md

**Summary**

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

**Fixes From This Guardrail**

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

**Gate Decision**

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

**Limitations**

This document does not claim stochastic agent behavior. No Claude Code A/B runs
were executed for this issue. The guardrail measures whether the tool response
contains enough graph evidence that an agent should not need generic Read/Grep
recovery. A future release/default-rollout decision should still run real
headless agent sessions over the same prompt matrix.

### 2. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md

**Decision**

Continue the Rust indexing core as an experimental, opt-in migration path.

Do not make Rust the default index engine in Phase 1. The TypeScript indexer
remains the default and fallback path for CLI, MCP, npm, npx, installer, and
upgrade flows.

**Packaging And Release Readiness**

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

**Phase 2 Proposal**

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

**Final Phase 1 Status**

Phase 1 passes the stop/continue gate because semantic parity, resolver handoff,
MCP/Explore readback, memory, and Agent Sufficiency are good enough for an
experimental opt-in path.

Phase 1 does not justify default rollout because wall-clock indexing is slower
and release packaging for the Rust binary is not complete.

### 3. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-1-performance.md

**Summary**

The Rust Phase 1 indexer passes the hard gate on peak RSS for both measured
repositories, but it is slower than the TypeScript indexer in this slice.

The gate is: Rust must be at least 25% faster or use at least 30% less peak RSS,
with the other metric not significantly worse. These runs pass on memory
reduction and fail on wall-clock time. Keep the Rust path opt-in and treat
wall-clock performance as a Phase 2 optimization target before any default
rollout decision.

**Gate Decision**

| Repo | Wall-time change | Peak-RSS reduction | Gate |
|---|---:|---:|---|
| ZCodeGraph | 296.8% slower | 86.0% lower | Memory gate passes; speed failure documented |
| Excalidraw | 166.5% slower | 91.1% lower | Memory gate passes; speed failure documented |

The benchmark script exits non-zero when a measured repository fails both hard
gate alternatives. This run passed with `gateFailures=[]`.

**Interpretation**

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

### 4. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md

**Decision**

Continue the Rust indexing work into the next phase, but keep Rust opt-in.

Prepare a default-rollout plan: no. The default TypeScript indexer remains the
default for `zcodegraph index`, npm/npx, MCP hosts, and release bundles. The
Rust JS/TS indexing path is now packageable and continuously verifiable, but it
is not ready to become the default engine.

**Evidence Summary**

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

**Blockers Before Default Rollout**

- The Rust path still covers only the Phase 1 JavaScript, TypeScript, JSX, and
  TSX slice; it is not a whole-product replacement for the TypeScript indexer.
- The path has deterministic parity and sufficiency evidence for the target
  slice, but default rollout needs broader release-cycle confidence after the
  six prebuilt binaries ship and are consumed by real npm/npx users.
- TypeScript finalization remains part of the Rust path and is now the largest
  measured Excalidraw phase.
- The default engine should not change until a separate default-rollout plan
  defines blast radius, rollback, telemetry/diagnostics, and release criteria.

**Outcome**

Phase 2 is complete for packaging, CI, profiler, first optimization, benchmark,
and deterministic Agent Sufficiency validation.

Keep Rust opt-in. Do not change the default engine in this phase. The next plan
should continue hardening the Rust path behind explicit `--engine rust` before
any default-rollout preparation.

### 5. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md

**Summary**

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

**Decision**

The Phase 2 benchmark/profile/sufficiency rerun for #68 is complete:

- Benchmark results were rerun for ZCodeGraph and Excalidraw.
- Profiler output was recorded for ZCodeGraph and Excalidraw.
- Agent Sufficiency guardrails were rerun for ZCodeGraph and Excalidraw.
- The <100% slower stretch goal was met.
- The #69 stop/continue decision keeps default rollout blocked and keeps Rust
  opt-in for the next hardening phase.

### 6. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md

**Summary**

Phase 3 keeps the Rust JS/TS indexer opt-in and focuses on repeatable release
confidence rather than default rollout. The profiling path now separates the
TypeScript finalization window into named subphases, so future reruns can show
where post-Rust time is spent before attempting additional optimization.

Rust remains opt-in. Rust is not required to be faster than TypeScript in Phase 3; the required evidence is repeatable profiling, no semantic/sufficiency regression, and a documented optimization conclusion.

**Finalization Subphases**

`rust-index-profile.mjs` now records the following subphases for each target
repo:

| Field | Meaning |
|---|---|
| `frameworkPostExtractMs` | Framework post-extract finalization after Rust extraction. |
| `referenceResolutionMs` | TypeScript-side unresolved reference resolution. |
| `dynamicDispatchSynthesisMs` | Dynamic-dispatch synthesis surfaced from the resolver window. |
| `dbMaintenanceMs` | SQLite maintenance after finalization. |

Each repo result also includes `dominantFinalizationSubphase`.

**Pinned Validation Targets**

| Repo | Role | Required evidence |
|---|---|---|
| ZCodeGraph | Self-hosting JS/TS indexing corpus | Passed at `d77fce6`. |
| Excalidraw | React/JSX flow corpus | Passed at `a83ac488`. |
| Zustand | Third-party TS store/action corpus | Passed at `566b5bf`. |

**Low-risk optimization conclusion**

No additional TypeScript resolver or synthesizer rewrite is included in Phase 3.
The low-risk optimization decision is to expose subphase timings first and keep
ReferenceResolver, framework resolvers, and dynamic-dispatch synthesizers in
TypeScript. A future optimization may target the dominant subphase reported by
the three-repo profile, but Phase 3 does not speculate beyond the measured data.

This is intentional: changing the resolver/synthesizer layer without the new
subphase evidence would risk sufficiency regressions. The accepted Phase 3
optimization work is the profiling split itself, which makes the next low-risk
optimization measurable and reversible.

**Default-rollout readiness checklist**

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

### 7. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md

**Target**

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

**Readiness Takeaway**

Large-target readiness is mixed. The sufficiency signal passes, but Rust is not
faster than TypeScript on this VS Code run and uses more peak RSS. The result
supports keeping Rust opt-in while Phase 4 focuses on the dominant
finalization-side reference-resolution bottleneck before any default-rollout
decision.

### 8. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-optimization-trial.md

**Summary**

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

**Guardrails**

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

**Notes**

- This trial is intentionally bounded: it does not move ReferenceResolver,
  framework resolvers, dynamic-dispatch synthesizer implementations, Explore
  planning, or Explore rendering to Rust.
- The optimization does not reduce node coverage, edge coverage, heuristic
  coverage, or Agent Sufficiency policy.
- The improved timing split means later Phase 4 work can distinguish actual
  synthesis time from reference-resolution time instead of treating the shared
  resolver window as one opaque bottleneck.

### 9. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-profile-baseline.md

**Summary**

Phase 4 profiling now records comparable TypeScript and Rust wall-clock/RSS
evidence plus Rust-path finalization subphases. This baseline is the input for
the Phase 4 data-driven optimization trial.

**Finalization Subphases**

| Repo | Framework post-extract | Reference resolution | Dynamic-dispatch synthesis | DB maintenance |
|---|---:|---:|---:|---:|
| ZCodeGraph | 3 ms | 0 ms | 647 ms | 5 ms |
| Excalidraw | 7 ms | 0 ms | 2312 ms | 8 ms |
| Zustand | 1 ms | 0 ms | 73 ms | 3 ms |

**Notes**

- RSS sampling requires access to local process information. In the sandboxed
  development environment, the profiler reports a machine-readable
  `rssUnavailableReason`; the baseline above was collected outside that sandbox
  so `peakRssBytes` is valid for all three hard-gate repositories.
- This baseline does not claim Rust is ready to become the default engine.
  Rust remains opt-in while Phase 4 gathers optimization and rollout-readiness
  evidence.

### 10. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md

**Summary**

Phase 4 readiness refresh keeps the Rust JS/TS indexing path opt-in while
rechecking the non-performance gates: package smoke, CI artifact contract,
failure safety, diagnostics, and default TypeScript safety.

This refresh does not make Rust the default engine.

### 11. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md

**Scope**

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

**Guardrails**

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

**Rollout Decision**

This remains a default-rollout blocker. Phase 4 must stay on the
`continue opt-in + targeted blockers` path until a follow-up optimization shows
that the large-repo reference-resolution database-access cost is reduced while
preserving Explore sufficiency and graph quality.

### 12. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md

**Decision**

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

**Evidence Summary**

Phase 4 results are real local measurements and smoke outputs, not generated
placeholder data. They are still single-run local evidence unless explicitly
called out otherwise.

**Optimization Trend Classification**

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

**Large-Target Readiness Evidence**

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

**Gate Result**

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

### 13. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md

**Summary**

The VS Code readiness smoke was rerun under Node v22.21.1, which is within the
supported package range (`>=20.0.0 <25.0.0`). This confirms the #81 Node 26
large-target conclusion was not just a Node 26 runtime artifact.

The rerun keeps Rust opt-in and does not require Rust to beat TypeScript end to
end.

**Target**

- Repository: `https://github.com/microsoft/vscode`
- Pinned commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Target shape: large VS Code JS/TS sparse checkout, not full VS Code.
- Indexed file count: 11,291 JS/TS/JSX/TSX files.
- Runtime: Node v22.21.1.

### 16. `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md

**Summary**

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

**Classification Table**

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

**Decision Impact**

This taxonomy removed the generic "unknown parse errors" blocker from Phase 4.
#88 later fixed the 16 real supported JS/TS syntax-gap paths; see
[Rust Indexing Core Phase 4 VS Code Syntax Gap Resolution](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md).
Rust still is not ready for default rollout because #87 identified the
large-repo reference-resolution database-access bottleneck as a remaining
default-rollout blocker.

### 22. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-results-and-decision.md

**Decision**

Phase 10 classification: **bounded success with commit drift**.

Phase 10 corrected the VS Code `VS-1` validation target enough to re-baseline the deterministic graph question. The corrected local target used for validation was a large VS Code sparse checkout at commit `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`, not the originally requested `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`. This is explicit commit drift, not hidden equivalence.

On that corrected drift target, all seven `VS-1` expected symbols had indexed candidates and `zcodegraph_explore` produced a connected Flow section. That means the Phase 9/#113 failure mode is reclassified from a proven graph coverage gap to a **corpus problem in the old sparse target**. The remaining deterministic blocker class is `ambiguous-symbol` for `start`, not missing symbols or a missing Flow section.

The corrected-target sufficiency smoke was attempted once, but it produced no machine-readable output before the bounded wait ended and was interrupted. Therefore Phase 10 does not produce a TypeScript-vs-Rust sufficiency comparison on the corrected target.

Phase 10 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

**Corrected Target Contract**

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

**Artifacts**

- Target validator raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json)
- Deterministic probe raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json)
- Sufficiency smoke raw JSON: [2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json)

**Deterministic Probe Result**

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

**Status Of #113**

#113 should be closed or replaced with narrower wording. Its old premise is no longer supported:

- On the old Phase 7/8 sparse target, six of seven `VS-1` symbols were absent, so the old evidence was a corpus problem.
- On the corrected drift target, all seven symbols are present and deterministic Explore produces a connected Flow section.

The remaining useful follow-up is not "VS Code `VS-1` lacks Flow section" as stated in #113. If follow-up is needed, it should be narrower: make corrected-target sufficiency smoke complete within a bounded runtime and then compare TypeScript vs Rust on that target.

**Conclusion**

Phase 10 re-baselined `VS-1` against a target that actually contains the expected symbols. Deterministic graph evidence now connects the flow, so the original #113 graph gap is not reproduced on the corrected target. The next blocker is operational sufficiency-smoke runtime/completion, not symbol coverage or deterministic Explore Flow connectivity.

### 28. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization.md

**Scope**

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

**Blocker Classification**

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

### 31. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md

**Summary**

The 16 real supported JS/TS syntax-gap paths from the VS Code taxonomy are
fixed for the Rust indexing core. A full Rust-core parse rerun on the same
large VS Code JS/TS sparse checkout moved every #88 path out of the parse-error
set.

This does not require VS Code to reach zero parse errors. The remaining 29
parse errors are the malformed fixture, prompt/generated, or colorization
fixture paths already classified by #86 as not representative normal
application source.

**Decision Impact**

#88 is no longer a default-rollout blocker. The Phase 4 decision still stays on
the `continue opt-in + targeted blockers` path because the #87
reference-resolution database-access bottleneck remains unresolved.

### 32. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md

**Change Under Test**

- Group unresolved references by `referenceName`, `referenceKind`, and
  `language` for shared direct candidate lookup while preserving per-reference
  disambiguation.
- Carry unresolved-reference `rowid` through reads and delete processed rows by
  row identity instead of the `(fromNodeId, referenceName, referenceKind)` tuple.
- No SQLite schema migration.

**Classification**

Classification: `still unresolved`.

Reason: reduced-fixture evidence is positive and sufficiency did not regress,
but the required large VS Code JS/TS sparse checkout profile still shows
reference resolution as the dominant finalization blocker. The target
sub-buckets did not drop by at least 15% on the large target, so #94 should not
unlock the optional bounded second-candidate issue.

### 38. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md

**Decision**

Do not proceed to a Rust default-rollout plan.

The #94 implementation preserved sufficiency and produced a useful reduced
fixture improvement, but the final large-target profile did not reduce the
reference-resolution blocker enough. `referenceResolutionMs` remains the
dominant TypeScript finalization subphase on the VS Code sparse checkout, and
the largest remaining subpath is now `nameMatchingMs`.

The optional second candidate was skipped because #94 classified as
`still unresolved`, not `reduced but still blocking`.

**Interpretation**

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

### 44. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-7-results-and-decision.md

**Classification**

Classification: `continue matcher prototype`.

Phase 7 added a guarded Rust-assisted name matcher prototype behind explicit
opt-in. The implementation replaces the actual ReferenceResolver
name-matching subpath only when `ZCODEGRAPH_RUST_NAME_MATCHER=1` is set. The
default TypeScript resolver path remains unchanged.

This phase does not claim default rollout readiness and does not claim that
Rust beats TypeScript end to end.

**Large-Target Evidence**

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

**Decision**

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

### 48. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-8-results-and-decision.md

**Decision**

Phase 8 classification: **continue matcher prototype**.

The guarded Rust matcher remains opt-in. Phase 8 did not establish default rollout readiness and did not promote the guarded path. The bounded candidate-payload dedup work produced a useful performance trend on the same VS Code sparse scope, but `rustMatcherSemanticMismatchRefs` remains non-zero and the VS Code `VS-1` sufficiency gap remains graph coverage work tracked by #113.

#113 is still a separate graph coverage issue and is not a Phase 8 blocker.

**Artifacts**

- Reduced profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json)
- VS Code profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json)
- VS Code sufficiency raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json)

**Implementation Summary**

Phase 8 stayed inside the guarded matcher boundary:

- Added semantic mismatch samples with reference facts, Rust decision facts, TypeScript decision facts, and a mismatch reason.
- Replaced the opaque `unresolved` bucket with decision-oriented fallback reasons.
- Fixed one bounded Rust matcher true gap: class member matching now accepts function-shaped member facts when the qualified name proves class membership.
- Added profile buckets for candidate materialization, subprocess handoff, TypeScript verification, payload bytes, and unique candidate facts.
- Added a batch-level candidate table protocol so repeated candidate facts are sent once and each reference carries candidate ids.

No schema changes, direct Rust SQLite reads, Rust edge writes, import resolution migration, framework migration, or dynamic synthesis migration were introduced.

**Follow-Up**

Continue only as an opt-in matcher prototype. The next matcher-specific work should focus on reducing the 12 semantic mismatches and deciding whether the remaining `rust-unresolved` bucket has enough true matcher gaps to justify another bounded Rust slice. If that does not produce a stronger trend, pivot to TypeScript resolver optimization instead of expanding Rust resolver ownership.

### 51. `docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-results-and-decision.md

**Decision**

Phase 9 classification: **bounded success**.

Phase 9 did not achieve full success because the VS Code `VS-1` same-scope smoke still cannot produce a connected Flow section. The deterministic probe changed the diagnosis: on the Phase 8 sparse indexed copies, six of the seven `VS-1` expected symbols are not present in the index at all, and the remaining `start` token is highly ambiguous. The first proven blocker is therefore `missing-symbol`, not a proven missing call edge, missing synthesized edge, or Explore planner pathfinding bug.

The implemented fix was the minimal proven gap: the VS Code sufficiency guardrail no longer treats the `## Exploration: ...` query echo as expected-symbol evidence. That makes the smoke classify `VS-1` as `missing-symbol` instead of falsely reporting all expected symbols present.

Phase 9 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

**Artifacts**

- Probe raw JSON: [2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json)
- Sufficiency validation raw JSON: [2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json)

**Implemented Fix**

The sufficiency guardrail now removes the `## Exploration: ...` heading before checking whether expected symbols appear in the returned evidence. This prevents a query string from satisfying its own expected-symbol check.

Focused validation:

```bash
npx vitest run __tests__/phase9-vs1-graph-probe.test.ts
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts -t "query echo"
```

**VS Code Validation**

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

**Status Of #113**

#113 should remain open or be replaced by a narrower follow-up. The current evidence no longer supports the old wording that the same-scope VS Code `VS-1` has all expected symbols but lacks a Flow section. The proven blocker is that the Phase 8 sparse scope does not contain the key extension-host/workbench symbols needed by `VS-1`.

Recommended follow-up:

- Refresh or replace the VS Code sparse target so it includes the source files that define `AbstractExtensionService`, `_createExtensionHostManager`, `_doCreateExtensionHostManager`, `ExtensionHostManager`, `ExtensionHostMain`, and `MainThreadExtensionService`.
- Rerun the deterministic probe on that corrected scope.
- Only then decide whether the next blocker is `missing-static-edge`, `missing-synthesized-edge`, `explore-planner-pathfinding-gap`, or `expected-runtime-boundary`.

**Conclusion**

Phase 9 produced a useful correction to the validation harness and a deterministic probe for future VS Code flow work. It did not prove a graph coverage fix is needed yet; it proved the current sparse validation target is insufficient for `VS-1`.

### 54. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-results-and-decision.md

**Decision**

Phase 11 classification: **bounded harness success, sufficiency comparison unavailable**.

The Phase 11 goal was to turn the corrected-target VS Code `VS-1` smoke from a silent no-output run into a bounded, machine-readable artifact. That goal was met: `rust-sufficiency-guardrail.mjs` now supports a staged output contract, unavailable taxonomy, `--out`, `--prompt-id`, `--timeout-ms`, and reuse-indexed pair mode.

The real corrected-target smoke did not complete a TypeScript-vs-Rust comparison. It produced a structured `unsupported-runtime` artifact while running under Node.js 26. The failure happened during the TypeScript index stage after the JS/TS/config slice copy completed. This is a harness/runtime environment blocker, not evidence of a graph semantics regression, matcher regression, or Rust extraction regression.

Phase 11 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

**Target Contract**

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

**Artifacts**

- Phase 10 decision doc: [2026-06-14-rust-indexing-core-phase-10-results-and-decision.md](2026-06-14-rust-indexing-core-phase-10-results-and-decision.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json)
- Corrected-target smoke raw JSON: [2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json](2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json)

**Implemented Harness Changes**

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

**Follow-Up Direction**

The next blocker is **runtime environment / smoke completion**, not graph semantics.

Recommended next step:

- Run the same Phase 11 smoke under Node.js 22, or
- Create/reuse explicit TypeScript and Rust indexed pairs and run the new reuse-indexed pair mode.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The current artifact did not reach the comparison stage, so it cannot support a graph or Rust regression conclusion.

**Conclusion**

Phase 11 fixed the evidence pipeline problem that caused Phase 10 to end with a manually written no-output unavailable artifact. Large-target smoke attempts now produce structured, staged JSON. The corrected exact VS Code target is valid, but TypeScript-vs-Rust sufficiency remains unavailable until the smoke is rerun under a supported runtime or with reusable indexed pairs.

### 57. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-results-and-decision.md

**Decision**

Phase 12 classification: **supported-runtime blocker advanced to TypeScript indexing timeout**.

Phase 12 removed the Phase 11 `unsupported-runtime` blocker by running the corrected exact VS Code `VS-1` smoke with the confirmed Node.js 22 binary. The smoke still did not reach TypeScript-vs-Rust comparison, but it now fails deeper: the TypeScript index stage did not complete within either the 300s first attempt or the 900s bounded second attempt.

This is not evidence of a graph semantics regression, matcher regression, Explore planner problem, or Rust extraction regression. The run never reached Rust indexing, Explore/analyze, or comparison.

Phase 12 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

**Baseline Target**

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

**Artifacts**

- Phase 11 results: [2026-06-15-rust-indexing-core-phase-11-results-and-decision.md](2026-06-15-rust-indexing-core-phase-11-results-and-decision.md)
- Phase 12 plan: [../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md](../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json)
- Attempt 1 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json)
- Attempt 2 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json)

**Follow-Up Direction**

The current blocker is **TypeScript indexing completion for the exact VS Code JS/TS/config slice**, not supported runtime and not Rust graph semantics.

Recommended follow-up:

- Investigate why the TypeScript indexing path cannot finish the exact VS Code slice within a 900s bounded smoke; or
- Use Phase 11 reuse-indexed pair mode if the next goal is to isolate Explore sufficiency from indexing runtime.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The artifacts did not reach Rust indexing or comparison.

**Conclusion**

Phase 12 successfully advanced the evidence beyond Phase 11's Node.js 26 `unsupported-runtime` blocker. Under Node.js 22, the corrected exact target passes validation and the smoke reaches TypeScript indexing, but TypeScript indexing does not complete within the bounded attempts. TypeScript-vs-Rust sufficiency remains unavailable until the TypeScript indexing stage completes or a reuse-indexed pair is used to isolate comparison.

### 61. `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-results-and-decision.md

**Summary**

Phase 13 added a full-index A/B artifact model for comparing the existing TypeScript indexing path against the existing Rust-enabled CLI/indexing path. The Windows exact VS Code target is validated and indexed for the TypeScript arm. The Rust arm did not produce a graph in this environment, so the formal result is an asymmetric blocker rather than a rollout-ready comparison.

Decision: do not change the default indexing path or Rust matcher/default rollout. Keep Rust disabled by default until a Rust arm graph is produced for the exact VS Code target and VS-1 comparison can run with both arms available.

**Artifacts**

- Target validation raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vs1-target-validation.raw.json`
- Phase 13 A/B raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json`

**Target validation**

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

**Classification meaning**

`success-asymmetric-blocker` means the harness completed and preserved evidence from the successful arm, but one arm did not produce a graph. Because VS-1 comparison requires both arms to have `graphAvailable=true`, comparison was intentionally skipped and recorded as unavailable rather than failing the whole harness.

This is the expected Phase 13 outcome for the current Windows environment: TypeScript exact-target evidence exists; Rust exact-target evidence does not.

**Follow-up**

Before any Rust default rollout claim, produce a Rust graph for the same exact VS Code target and rerun Phase 13 so both arms are available. Only then should `comparison.status=completed` be used for a readiness decision.

### 64. `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md

**Scope**

Issue #193 selected one bounded A/B candidate for the full-profile TypeScript finalization/reference-resolution bottleneck after Phase 20 closed the opt-in Rust indexing data-production baseline.

Candidate: merge batched `unresolved_refs` cleanup for resolved and intentionally-unresolved references into one deletion pass per batch.

This candidate:

- does not change the persistent SQLite schema,
- does not change per-reference disambiguation semantics,
- does not change resolver, matcher, framework, or dynamic-dispatch selection,
- only changes how already-processed unresolved references are deleted after a batch is resolved.

**Artifacts**

Generated manifests, raw experiment output, and generated summaries were absorbed into:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Validation commands:

- `npm run build`
- `npx vitest run __tests__/resolution.test.ts`
- Reduced and required target experiment commands are represented by the consolidated cleanup artifact above.

**Interpretation**

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

**PRD Gate State**

The post-PRD optimization gate remains failed. This candidate improves the intended cleanup segment on required targets but does not make Rust at least 25% faster than TypeScript or at least 30% lower peak RSS with the other metric not significantly worse.

**Decision**

Keep the cleanup batching candidate. It is bounded, preserves resolver semantics, preserves the SQLite schema, and improves the intended segment on required targets.

Do not expand #193 into name-matching optimization in the same issue. Name matching remains the largest measured VS Code sparse subsegment, but it directly touches disambiguation semantics and should be handled by a separate diagnostic/design issue if pursued.

No Rust default rollout readiness is claimed.

### 65. `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md

**Decision**

Run completed on current `main` against the validated VS Code JS/TS sparse checkout at `/private/tmp/codegraph-corpus/vscode-sparse`.

Selected next candidate: #206, a diagnostic/design issue for the remaining TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster. Do not start a direct name-matcher implementation from this evidence alone.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

**Artifacts**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Historical Phase 18 comparison: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

**Fallback Taxonomy**

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

**Candidate Selection**

`databaseAccessMs` is the largest current finalization subsegment at 38376ms, and `nameMatchingMs` is close behind at 34332ms. `perReferenceDisambiguationMs` accounts for most of name matching at 31472ms. `edgeWriteMs` and `unresolvedCleanupMs` are still meaningful, but they are no longer the clearest first candidate after #193.

#206 should be diagnostic/design rather than implementation:

- Split the broad `databaseAccessMs` bucket around the name-matching path so future A/B work can distinguish candidate reads, per-reference lookups, edge writes, and cleanup.
- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not change matcher behavior.
- End with exactly one bounded implementation recommendation, or a stop recommendation.

This fits #205's rule for a remaining dominant name-matching cluster: diagnose first, then decide. It also avoids over-claiming from one stress-target run.

### 66. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md

**Scope**

Phase 16 reassessed the Rust indexing architecture boundary before further Rust expansion. It tested one primary candidate, `memory-final-flush`, behind the explicit experimental SQLite write mode:

- Manifest field: `rust.sqliteWriteMode`
- CLI flag: `--sqlite-write-mode memory-final-flush`
- Default path: unchanged `disk`

This phase does not claim default Rust indexer readiness or full-profile rollout readiness.

Architecture record:

- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

**Artifacts**

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment.md` |
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

**Decision**

Final Phase 16 result:

`productionize-sqlite-candidate`

The SQLite `memory-final-flush` prototype is validated as a productionization candidate because it materially improved the dominant Rust SQLite write block on the VS Code stress target, improved total Rust wall time there, preserved graphStats shape, and did not regress sufficiency.

The PRD required-target gate remains open. This phase should not close #165 as "performance gate resolved." The correct next step is a production-safe version of the SQLite final-flush write path with explicit failure-safety and locking tests, followed by required-target and VS Code stress validation.

**Out Of Scope**

- No default Rust indexer readiness claim.
- No full-profile rollout readiness claim.
- No Rust coverage expansion.
- No ReferenceResolver migration.
- No production schema change.

### 67. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md

**Scope**

Phase 17 made production `final-flush` the default SQLite write mode for explicit Rust indexing only. Rust remains opt-in through `--engine rust`; TypeScript remains the product default.

This phase does not claim default rollout readiness.

Architecture record:

- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

**Implementation Summary**

- Added production SQLite write mode: `final-flush`.
- `--engine rust` now passes `--sqlite-write-mode final-flush` by default.
- `--sqlite-write-mode disk` remains a selectable debug/escape hatch.
- `--sqlite-write-mode memory-final-flush` remains selectable as an experimental/debug mode.
- The formal experiment runner now uses `final-flush` as the Rust scoreboard default and still passes explicit `disk` overrides.
- No SQLite schema change was made.

The production `final-flush` path currently uses the existing temp on-disk SQLite staging database plus active-index replacement path. The Phase 16 in-memory prototype remains separate as `memory-final-flush`.

**Artifacts**

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-17-production-final-flush-scoreboard.md` |
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

**Matched-TS-JS Scoreboard**

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

**Full Scoreboard**

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

**Gate State**

PRD required-target performance gate: **failed**.

Agent Sufficiency smoke: **passed** in both scoreboard profiles.

GraphStats parity: **not equivalent**, and profile dependent:

- `matched-ts-js` intentionally limits graph work and is useful as a performance/control lens, not a completeness claim.
- `full` produces a much larger graph than matched profile, but still differs materially from the TypeScript graph shape.

Default rollout readiness: **not claimed**.

#165 should remain open.

**Next Largest Blocker**

The next result-oriented blocker is the full-profile end-to-end chain, not another isolated write-mode toggle:

1. Rust full-profile SQLite write volume is too high, especially on VS Code sparse.
2. ReferenceResolver/finalization is a large follow-on block once Rust extraction writes the full graph.
3. The optimization target should segment full-profile end-to-end time into Rust extraction/write, TypeScript finalization/reference resolution, and graphStats/sufficiency, then run bounded A/B changes against the largest segment first.

Recommended next issue: **Phase 18 full-profile end-to-end bottleneck segmentation and first bounded A/B optimization**.

**Decision**

Phase 17 completes the production final-flush default work for Rust opt-in indexing, but it does not close the PRD performance blocker.

Decision: continue Rust as opt-in, keep `final-flush` as the default Rust write mode, keep `disk` as the debug escape hatch, keep `memory-final-flush` experimental, and move to result-oriented full-chain bottleneck segmentation.

### 68. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md

**Scope**

Phase 18 segmented the full-profile end-to-end path and tried one bounded Rust SQLite write-path A/B optimization. Rust remains opt-in. TypeScript remains the product default.

This phase does not claim default rollout readiness and does not close #165.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

**Candidate**

Candidate: `final-flush` staging database fast-write PRAGMAs.

The candidate changes only the temporary staging database used by Rust `final-flush`:

- use faster staging-local journal/synchronous/temp-store/locking settings while writing,
- restore the active-index connection settings before promotion,
- keep the active index readable with WAL mode,
- preserve the existing SQLite schema.

No SQLite schema change was made. No resolver/finalization optimization was implemented.

**Artifacts**

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-18-full-profile-bottleneck-ab.md` |
| Consolidated cleanup evidence | `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md` |

**Validation**

| Check | Result |
|---|---|
| `cargo test --package zcodegraph-core` | passed |
| `npx vitest run __tests__/rust-indexing-experiment.test.ts -t "records Rust index profile breakdown"` | passed |
| Reduced full-profile A/B | completed |
| Required-target full-profile after | completed |
| VS Code sparse full-profile final after | completed |

The CLI and benchmark commands were run under Node `v26.0.0` with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, matching the existing local validation pattern for this thread.

**Decision**

Keep the SQLite PRAGMA candidate. It is bounded, preserves the schema, preserves active-index WAL behavior, and improves the intended write segment.

Do not treat this as sufficient for rollout readiness. The improvement is not large enough to close the PRD required-target gate.

#165 remains open.

Next largest blocker: TypeScript finalization/reference resolution in the full-profile path.

Recommended next slice: bounded full-profile finalization/reference-resolution segmentation and first A/B optimization, with resolver semantics and sufficiency protected by tests.

### 69. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-completion-gate-audit.md

**Scope**

This audit checks the clarified PRD completion gate for the Rust opt-in indexing vertical slice. It reuses Phase 17 and Phase 18 evidence and does not run a new benchmark campaign.

Rust remains opt-in. TypeScript remains the product default. This audit does not claim Rust default rollout readiness.

**Gate**

The clarified PRD completion gate is evaluated on the required targets, ZCodeGraph and Excalidraw:

- Rust full opt-in path indexes end-to-end without Agent Sufficiency regression.
- The active index produced by Rust is readable by the TypeScript shell / CLI / MCP-compatible graph path.
- Rust wall time is no more than 30% slower than TypeScript.
- Rust peak RSS is no more than 15% higher than TypeScript.

The deeper post-PRD optimization gate remains separate: Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

**Required Target Audit**

Phase 18 required-target after evidence is the latest full-profile required-target run after the kept SQLite PRAGMA candidate.

| Target | TS total | Rust total | Wall delta | Wall gate | TS RSS | Rust RSS | RSS delta | RSS gate | Sufficiency | Active index readable | Completion gate |
|---|---:|---:|---:|---|---:|---:|---:|---|---|---|---|
| zcodegraph | 4,679 ms | 5,877 ms | +25.60% | pass | 57,835,520 | 58,048,512 | +0.37% | pass | passed | yes | pass |
| excalidraw | 3,307 ms | 3,756 ms | +13.58% | pass | 58,277,888 | 55,820,288 | -4.22% | pass | passed | yes | pass |

### 70. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-decision.md

**Scope**

Phase 19 audited whether the Rust opt-in indexing vertical slice satisfies the clarified PRD completion gate.

This decision does not claim Rust default rollout readiness. Rust remains opt-in. TypeScript remains the product default.

**Artifacts**

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-19-prd-completion-gate.md` |
| Audit | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-completion-gate-audit.md` |
| Targeted smoke note | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-targeted-smoke.md` |
| Phase 18 decision | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md` |

**Tracker Decisions**

#49 should be closed as complete for the clarified Rust opt-in vertical slice PRD completion gate.

#165 should remain open but be downgraded from PRD completion blocker to post-PRD optimization tracker. The original deeper target remains important: Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

#193 should remain open as the next concrete post-PRD optimization issue. It owns the bounded finalization/reference-resolution bottleneck A/B path identified by Phase 18.

**Decision**

The Rust indexing core vertical slice PRD is complete under the clarified completion gate.

Continue with Rust as opt-in and move remaining performance work to post-PRD optimization through #165 and #193.

### 71. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-targeted-smoke.md

**Scope**

Phase 19 allowed targeted product smoke only for evidence missing from the completion gate audit. No new full benchmark campaign was allowed.

**Decision**

No additional targeted smoke was run.

Reason: existing Phase 17 and Phase 18 artifacts are sufficient to decide the clarified PRD completion gate. Running new smoke would add churn without answering a missing gate question.

No VS Code sparse rerun was required. VS Code sparse remains stress evidence, not a required-target completion gate.

No release/npm smoke was required. Phase 19 did not touch packaging, CLI status, or release paths.

### 72. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-boundary-protocol-status.md

**Scope**

This artifact records the first Phase 20 implementation step: the Rust/TypeScript finalization boundary protocol and parity artifact seam.

It does not claim that Rust finalization/reference-resolution migration is complete.

**Blocker For The Next Slice**

The next planned slice, Rust import/path-alias resolution, requires a real Rust resolver/finalization command or embedded DB-read contract. The current Rust core has extraction/write support and a standalone Rust name matcher helper, but it does not yet have a Rust-owned finalization command that can:

- read nodes/files/unresolved references from the active SQLite index,
- load tsconfig/jsconfig path aliases,
- resolve import/path-alias references with TypeScript parity,
- write resolved edges or return a persistable edge set,
- emit per-stage fallback taxonomy.

Therefore #199 should not be closed until that Rust resolver substrate exists and the import/path-alias slice is migrated through it.

**Validation**

Commands run:

- `npx vitest run __tests__/rust-indexing-experiment.test.ts`
- `npm run build`

Both passed.

**Decision**

#198 can be closed as complete.

#199, #200, #201, and #202 should remain open. Their implementation depends on the Rust resolver/finalization substrate described above.

No Rust default rollout readiness is claimed.

### 74. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md

**Scope**

This record covers Phase 20 issues #199-#204 after adding four Rust-owned finalization slices:

- `import-path-alias-resolution`
- `esm-named-import-export-resolution`
- `esm-one-hop-reexport-resolution`
- `local-exact-reference-resolution`

This is not a Rust default rollout decision and does not close the post-PRD performance/RSS optimization targets in #165 or #193.

**Validation**

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

**Fallback Taxonomy**

Fallback is visible and non-zero.

| Target | Total fallback | Main remaining categories |
|---|---:|---|
| zcodegraph | 1507 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |
| excalidraw | 2400 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |

Issue #204 resolved 279 one-hop ESM named re-export references on ZCodeGraph and reduced its binding-level fallback from 1460 to 1445. Excalidraw had no matching one-hop direct named re-export hits in this required-only slice, so its binding-level fallback stayed at 1705.

The fallback taxonomy artifact is `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`.

Follow-up fallback audit: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md`.

**Decision**

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

### 75. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md

**Boundary Taxonomy After #204**

The Phase 20 decision boundary currently reports:

| Target | Total fallback | Binding-level import fallback | Unsupported import form | Unresolved file-level target |
|---|---:|---:|---:|---:|
| zcodegraph | 1507 | 1445 | 44 | 14 |
| excalidraw | 2400 | 1705 | 6 | 685 |

This boundary taxonomy does not include the full Rust core-only unresolved surface. It only records the finalization boundary categories currently surfaced by the TypeScript shell profile.

**Import Fallback Shape**

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

**Interpretation**

ZCodeGraph's remaining import fallback is mostly not a strong implementation target:

- Many entries are external packages, Node builtins, test framework imports, and type-only imports.
- Relative unresolved file-level imports are only 9 in the required slice.
- #203 and #204 already burned down the highest-confidence same-name direct import/export paths.

Excalidraw has a larger file-level unresolved target count, but the audit found that required-target copy incompleteness contributes materially. For example, `excalidraw-app/App.tsx` imports `./CustomStats`, but the required-target temporary copy only contains `excalidraw-app/App.tsx` in that directory. That means a resolver implementation cannot close that class of fallback without changing the corpus copy/slice or validation setup.

The broad Rust core-only unresolved surface is dominated by calls and instantiations:

- ZCodeGraph: 27879 unresolved calls and 715 unresolved instantiations before TypeScript finalization.
- Excalidraw: 15972 unresolved calls and 241 unresolved instantiations before TypeScript finalization.

Many top call names are test framework or builtin/member-style calls (`expect`, `toBe`, `join`, `map`, `filter`, `push`, `Set`, `Map`). Blindly migrating these would risk graph noise and node explosion unless the target semantics are narrowed carefully.

**Recommendation**

Do not create another import/export micro-slice from this audit alone.

The next decision should be one of:

1. Accept the current known-unsupported taxonomy and close #202 as Phase 20 end-to-end opt-in complete, with #165/#193 carrying performance and deeper completeness work.
2. If Phase 20 must burn down more functionality before closure, create exactly one issue for a diagnostic slice, not implementation first: "representative missing-flow selection for broad JS/TS reference resolution." That issue should pick concrete flow prompts and identify which unresolved calls actually affect Agent Sufficiency.

Recommended answer: choose option 1 unless the maintainer requires Phase 20 to own broad JS/TS reference resolution before closure.

No Rust default rollout readiness is claimed.

### 77. `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md

**Target matrix**

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

**Preflight summary**

Experiment preflight: completed
Rust core: available (/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core)

**Rust finalization boundary**

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 1507 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | 2400 |

**Rust finalization fallback taxonomy**

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

**Gates**

- zcodegraph: sufficiency=passed; performance=unavailable
- excalidraw: sufficiency=passed; performance=unavailable

**Classifications**

- zcodegraph: target-failed-performance-gate-unmet
- excalidraw: target-failed-performance-gate-unmet
- experiment: failed-required-performance-gate-unmet

**Rollout recommendation draft**

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.

### 80. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md

**Decision**

#206 completed the diagnostic slice for the VS Code sparse TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster.

Selected next candidate: #207, a follow-up design/prototype issue for semantic-equivalent per-reference disambiguation work. Do not directly optimize matcher behavior yet.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

**Artifacts**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior comparison: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`

**Interpretation**

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

**Fallback Taxonomy**

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

**Next Candidate**

Open #207 for semantic-equivalent per-reference disambiguation design/prototype.

Required constraints for that issue:

- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not directly replace the name matcher.
- Evaluate candidate reuse, batching, or cache-key design only if the output for each reference remains identical.
- Use focused fixtures for equivalence checks.
- End with one bounded A/B implementation recommendation, or explicitly stop.

This keeps the post-PRD optimization work data-driven without hiding a semantic change inside a performance issue.

### 81. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-207-disambiguation-equivalence-decision.md

**Decision**

#207 completed a focused semantic-equivalence design/prototype slice for TypeScript finalization's per-reference disambiguation path.

Selected next candidate: #208, a bounded A/B implementation issue for a guarded candidate-set replay / grouping path with a semantic verifier. Do not directly replace the production name matcher without per-reference equivalence checks.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

**Interpretation**

Candidate-set replay is a plausible optimization seam because it can reuse pre-collected facts while still running the same matcher logic. The focused fixture produced zero mismatches, which is enough to justify one bounded A/B implementation issue.

This is not enough evidence to enable a production fast path by default. A larger implementation issue must carry a semantic verifier that compares baseline and candidate decisions before claiming improvement.

**Next Candidate**

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

### 82. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md

**Decision**

#208 completed a guarded candidate-set replay A/B for the TypeScript finalization name-matching path.

Decision: stop this candidate as the next performance implementation path. Keep the guarded replay verifier as diagnostic instrumentation, but do not promote candidate-set replay to a production fast path from this evidence.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

**What Changed**

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

**Artifacts**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

**Interpretation**

The candidate is semantically promising but not a good next performance implementation path in its current shape.

What to keep:

- the guarded verifier;
- the mismatch taxonomy;
- the ability to use candidate replay as a future safety check.

What not to do next:

- do not promote candidate-set replay as a production fast path;
- do not continue optimizing this path without a new, more specific hypothesis that avoids duplicating the baseline work;
- do not claim performance improvement from the #208 run.

**Stop Rationale**

#208 required a keep-vs-stop decision. The decision is stop for this candidate as the next implementation path.

Reason:

- semantic equivalence is excellent (`mismatchCount=0`);
- the A/B path adds too much verifier overhead;
- the candidate does not yet remove enough work from `perReferenceDisambiguationMs`;
- continuing here would likely turn into broad matcher redesign, which is outside #208.

#165 should remain open for post-PRD optimization. The next optimization selection should use the existing tracker rather than automatically continuing candidate replay.

### 83. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md

**Decision**

#209 completed one bounded TypeScript finalization resolved-edge write A/B.

Decision: keep the implementation as a low-risk cleanup of the finalization write path, but do not continue optimizing this candidate as the next #165 path without a new hypothesis that improves `edgeMaterializationDbMs + edgeWriteDbMs` together.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

**What Changed**

- Added a prevalidated edge batch writer for callers that have already checked edge endpoints against the current `nodes` table.
- Kept the existing safe `insertEdges()` behavior for general callers; it still validates endpoints before writing.
- Changed TypeScript finalization persistence to validate endpoints during edge materialization and then write through the prevalidated batch writer.
- Kept resolver, name-matcher, and per-reference disambiguation semantics unchanged.
- SQLite schema is unchanged.
- Rust/TypeScript ownership boundaries are unchanged.

**Artifacts**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Prior VS Code comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

**Validation**

Commands run:

- `npm run build`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts -t "prevalidated|edge materialization|insertEdges endpoint validation"`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts __tests__/rust-name-matcher.test.ts __tests__/rust-index-profile.test.ts __tests__/rust-index-engine-cli.test.ts`
- Generated experiment commands are represented by the consolidated cleanup artifact above.

Focused tests passed. The broader focused suite passed: 5 files, 118 tests.

**Required Target Evidence**

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

**Keep Rationale**

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

**Follow-up Guidance**

#165 should remain open. The next optimization selection should use fresh end-to-end evidence and treat `edgeMaterializationDbMs + edgeWriteDbMs` as a combined segment if it revisits finalization writes.

No Rust default rollout readiness is claimed.

### 84. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md

**Scope**

This records the post-#209 required-target benchmark evidence after fixing the benchmark harness so empty real-repo corpora are classified as invalid/unavailable by default.

No Rust default rollout readiness is claimed.

**Harness Change**

- Real-repo experiment targets now record `copiedSourceFiles` separately from config files.
- A target is classified as `target-failed-empty-corpus` when a completed arm copies zero JS/TS source files or produces zero graph files/nodes.
- `allowEmptyCorpus: true` is the explicit manifest escape hatch for intentionally empty fixtures.
- Required empty-corpus targets map to `failed-required-target-unavailable`, not completed graph evidence.

**Scoreboard Run**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Node: `v22.21.1`
- Rust core: `target/debug/zcodegraph-core`
- SQLite write mode: `final-flush`
- Rust graph work profile: `full`

**Scoreboard Result**

| Target | Required | Sufficiency | Performance | TypeScript ms | Rust ms | Wall delta | RSS delta | Classification |
|---|---:|---|---|---:|---:|---:|---:|---|
| ZCodeGraph | yes | passed | unavailable | 4410 | 7649 | +73.45% | +0.37% | target-failed-performance-gate-unmet |
| Excalidraw | yes | passed | unavailable | 10131 | 14979 | +47.85% | +0.62% | target-failed-performance-gate-unmet |
| VS Code sparse | no | passed | unavailable | 461443 | 570731 | +23.68% | -27.78% | target-failed-performance-gate-unmet |

Experiment classification: `failed-required-performance-gate-unmet`.

Interpretation: the harness now rejects empty evidence, and the real corpora are valid. Sufficiency is green across all three targets, but performance is still not ready for default rollout.

**Next #165 Candidate**

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

### 85. `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md

**Scope**

This issue tested one bounded implementation candidate from #210: reduce Rust-owned graph-write time measured by `rustCore.sqliteWriteMs`.

No Rust default rollout readiness is claimed.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

**Final After Scoreboard**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Before artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md`

| Target | Sufficiency | Rust graphStats | Before sqliteWriteMs | After sqliteWriteMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | unchanged | 1356 | 1038 | -23.45% | 7649 | 7579 | -0.92% |
| Excalidraw | passed | unchanged | 2411 | 1831 | -24.06% | 14979 | 14020 | -6.40% |
| VS Code sparse | passed | unchanged | 133042 | 126307 | -5.06% | 570731 | 577634 | +1.21% |

Experiment classification remains `failed-required-performance-gate-unmet`.

**Interpretation**

The candidate is valid and safe to keep:

- It improves the targeted `rustCore.sqliteWriteMs` bucket on all three measured corpora.
- It preserves graphStats parity for Rust outputs.
- It preserves sufficiency across ZCodeGraph, Excalidraw, and VS Code sparse.

The candidate is not enough to satisfy the broader required performance gate:

- ZCodeGraph and Excalidraw still fail required performance.
- VS Code sparse improves in the targeted bucket but not in total Rust wall time in this single after run.
- Remaining large buckets include Rust core `localExactReferenceResolutionMs`, Rust core `parseExtractionMs`, TypeScript finalization reference resolution, and finalization DB work.

**Recommendation**

Close #211 as completed because the bounded candidate was implemented, verified, and measured.

Keep #165 open. The next performance issue should select a different dominant bucket rather than continuing this exact FTS-trigger candidate. Based on this run, the strongest remaining Rust-owned candidate is `localExactReferenceResolutionMs` on VS Code sparse, with explicit graphStats/sufficiency parity checks.

#185 remains unchanged because this issue did not touch packaging, CLI status, release, or npm smoke paths.

### 86. `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md

**Scope**

Phase 22 built the local evidence pipeline for post-PRD Rust indexing optimization, used it to run one bounded optimization candidate, and performed a narrow cleanup of the new performance-evidence path.

No Rust default rollout readiness is claimed.

Architecture record:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

**Pipeline Artifacts**

- Plan: `docs/plans/2026-06-18-rust-indexing-core-phase-22-evidence-pipeline-and-optimization-loop.md`
- Evidence tool: `scripts/rust-indexing-evidence.mjs`
- Tool tests: `__tests__/rust-indexing-evidence.test.ts`
- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

The evidence tool is local-only. It does not call GitHub, update issues, close issues, edit labels, or require network access.

**Candidate Selection**

The Phase 22 ranking output selected `localExactReferenceResolutionMs` as the next bounded candidate after excluding already-tested directions:

- #208 candidate replay verifier.
- #209 TypeScript finalization edge-write-only.
- #211 FTS-trigger bulk write.

The selected optimization reuses same-file local exact candidate lookup results by `(file_path, reference_name, reference_kind)` and tracks existing Rust finalization edges in memory instead of querying SQLite for each reference. This preserves per-reference disambiguation semantics because every reference still checks whether its candidate set is uniquely resolvable.

**Final After Scoreboard**

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Comparison baseline: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`.

| Target | Sufficiency | Rust graphStats | Before localExactMs | After localExactMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | changed | 1532 | 484 | -68.41% | 7579 | 6747 | -10.98% |
| Excalidraw | passed | unchanged | 1565 | 720 | -53.99% | 14020 | 13427 | -4.23% |
| VS Code sparse | passed | unchanged | 50877 | 34485 | -32.22% | 577634 | 622492 | +7.77% |

ZCodeGraph graphStats changed because the local working tree target was dirty and this phase added source files before the final scoreboard. The source slice changed from the #211 artifact to the Phase 22 artifact. Excalidraw and VS Code sparse were clean fixed external corpora and preserved Rust graphStats.

**Decision**

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

**Next Recommendation**

Keep #165 open.

The next post-Phase 22 optimization should use the new evidence tool rather than hand-written comparison tables. Based on the Phase 22 final comparison, `parseExtractionMs` is the next highest Rust-owned ranked bucket, but it should be confirmed against the latest artifact pair before creating the next implementation issue.

### 87. `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md

**Scope**

Phase 23 cleaned up the Rust indexing optimization evidence contract, classified recent performance experiment paths, performed narrow benchmark/evidence boundary cleanup, and selected the next #165 step.

No Rust default rollout readiness is claimed. #165 remains open.

Architecture record:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

**Inventory Classification**

Inventory details were absorbed into:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Classification summary:

- Production paths: Rust opt-in `final-flush`, Rust core FTS-trigger suspension/rebuild, Rust core local exact reference lookup cache.
- Retained diagnostics: `disk` and `memory-final-flush` write modes, finalization/reference-resolution profile buckets, candidate replay/equivalence verifier, evidence generator, empty-corpus validation, #185 environment validation reserve.
- Dead candidates: candidate replay as a production optimization, TypeScript finalization edge-write-only as originally framed, FTS-trigger bulk write as a future repeated candidate.

The inventory keeps evidence in `docs/benchmarks/` while making it clear which paths are production behavior, diagnostic-only, or no longer valid as future candidate framing.

**Production Boundary Cleanup**

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

**Validation**

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

**Next #165 Step**

Recommended next step: [#224](https://github.com/jununfly/ZCodeGraph/issues/224), one profiling issue for `parseExtractionMs`.

Rationale:

- The cleaned Phase 23 smoke comparison ranks `parseExtractionMs` as the top Rust-owned bucket after Phase 22.
- The bucket is large on VS Code sparse and visible on required targets.
- Phase 23 did not run a fresh full scoreboard, so jumping directly to implementation would overstate confidence.
- A profiling issue should first split `parseExtractionMs` into actionable parser/extraction subsegments and confirm whether the cost is implementation-owned, grammar/parser-owned, source-shape-driven, or orchestration-driven.

The next issue should be diagnostic/profiling first, not a bounded optimization implementation issue.

### 88. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

Issue-level optimization decisions from #193, #205, #206, #208, #209, #210,
and #211 remain as durable decision artifacts. Their generated raw experiment
files, manifests, and generated summaries can be deleted after this cleanup.

**Deleted Process Artifact Classes**

This cleanup deletes:

- issue-level generated `.experiment.json` files;
- issue-level generated `.raw.json` files;
- issue-level generated `*-summary.md` files.

**Durable Follow-On Artifacts**

Keep these as the reusable architecture/performance trail:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

**Cleanup Boundary**

This cleanup does not delete the durable issue decision documents themselves.
It only removes generated process evidence whose reusable facts are captured in
those decision documents and in the ADRs above.

### 89. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

The Phase 14/15 required-target and VS Code matched-work experiment files were
temporary generated process artifacts. Their reusable conclusions are
consolidated here; the individual raw rerun JSON files and generated
`decision-summary-draft` files can be deleted.

**Deleted Process Artifact Classes**

The cleanup removes these process artifact classes from the Phase 14/15 cluster:

- early unavailable required-only raw reruns;
- generated required-only `decision-summary-draft` files;
- generated matched-work `decision-summary-draft` files;
- early unavailable VS Code stress raw reruns;
- generated VS Code stress `decision-summary-draft` files.

**Durable Follow-On Artifacts**

Later work superseded the deleted process files and remains the reusable
decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`

**Cleanup Boundary**

This cleanup does not delete active release, resolver, or Rust-hybrid
architecture evidence. It only removes process artifacts whose decision value is
captured above or superseded by later durable documents.

### 90. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

Phase 15E/15F RSS work has durable conclusions in the plans and this cleanup
artifact. The generated raw experiment files, experiment manifests, summary
drafts, and copied `dhat` heap report can be deleted after this consolidation.

**Deleted Process Artifact Classes**

This cleanup deletes:

- Phase 15E copied `dhat` heap JSON/HTML evidence and generated rerun4
  raw/manifest/draft files;
- Phase 15F generated raw experiment files;
- Phase 15F generated experiment manifests;
- Phase 15F generated summary files;
- Phase 15F reduced smoke JSON.

**Durable Follow-On Artifacts**

Keep these as the reusable decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

**Cleanup Boundary**

This cleanup only removes local process evidence for the old RSS-gate
investigation. It does not remove the profiling implementation, tests, scripts,
or later architecture/performance decision artifacts.

### 91. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

Phase 16-18 durable conclusions remain in their result/decision documents.
Generated raw experiment files, experiment manifests, and generated summaries
can be deleted after this cleanup because their reusable facts are already
captured in the Phase 16, Phase 17, and Phase 18 decision artifacts.

**Deleted Process Artifact Classes**

This cleanup deletes:

- Phase 16 baseline and candidate raw/manifest/summary files;
- Phase 16 reduced smoke JSON;
- Phase 17 matched/full scoreboard raw/manifest/summary files;
- Phase 18 reduced/required/VS Code raw/manifest/summary files.

**Durable Follow-On Artifacts**

Keep these as the reusable decision trail:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

**Cleanup Boundary**

This cleanup does not remove the durable decision artifacts, plans, ADRs, or
later optimization evidence. It only removes generated files whose reusable
facts are already summarized above and in the kept decision artifacts.

### 92. `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

Phase 22 and Phase 23 durable decisions remain in:

- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`

Generated comparison output, generated decision drafts, experiment manifests,
raw artifacts, summaries, and temporary inventory files can be deleted after
this cleanup because their reusable facts are already captured by the durable
decision artifacts above.

**Deleted Process Artifact Classes**

This cleanup deletes:

- generated Phase 22 comparison files;
- generated Phase 22 decision drafts;
- generated Phase 22 local-exact manifest/raw/summary files;
- generated Phase 23 targeted smoke comparison and draft files;
- the Phase 23 temporary experiment inventory.

**Cleanup Boundary**

This cleanup does not delete the durable Phase 22/23 decision documents or the
Phase 22/23 plans. It only removes generated process artifacts whose reusable
facts are preserved in the durable decisions and summarized here.


## Contract-Preserved Terms

Concise source lines carrying terms that the section-classifier did not retain verbatim, preserved to keep documentation contracts intact.

- `Rust Indexing Core Consolidated Benchmarks` — # Rust Indexing Core Consolidated Benchmarks And Evidence
- `syntax-gap resolution` — - [VS Code syntax-gap resolution](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md)
