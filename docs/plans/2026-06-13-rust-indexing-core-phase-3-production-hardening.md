# Rust Indexing Core Phase 3 Production Hardening Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)

Phase 2 decision: [Rust Indexing Core Phase 2 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md)

Phase 3 results: [Rust Indexing Core Phase 3 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md)

Phase 3 verification status:

- [x] [#76](https://github.com/jununfly/ZCodeGraph/issues/76) implementation
  and local test gates reviewed.
- [x] Implementation gates: pass for harness, diagnostics, failure-safety
  matrix, package smoke, finalization profiling, default TypeScript safety, and
  Rust opt-in behavior.
- [x] Real three-repo validation completed for
  [#77](https://github.com/jununfly/ZCodeGraph/issues/77). The harness passed
  for ZCodeGraph `d77fce6`, Excalidraw `a83ac488`, and Zustand `566b5bf`.
  Raw artifacts, `summary.json`, and `summary.md` are preserved under
  `/tmp/zcodegraph-rust-phase3-real/`.
- [x] Local validation completed:
  `npm run build`,
  `cargo test --package zcodegraph-core`,
  `npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts`,
  Phase 3 targeted Vitest suites, package smoke suites, and `git diff --check`.
- [x] Default TypeScript indexing remains the default; Rust remains opt-in via
  `--engine rust` or `ZCODEGRAPH_INDEX_ENGINE=rust`.

## Goal

Harden the opt-in JavaScript, TypeScript, JSX, and TSX Rust indexing path so it
is easier to validate, diagnose, and support in production-like local release
flows while preserving the TypeScript indexer as the default.

Phase 3 is not a language-expansion phase and not a default-rollout phase. It
keeps Rust behind explicit `--engine rust` or `ZCODEGRAPH_INDEX_ENGINE=rust`,
adds repeatable validation and diagnostics, broadens failure-safety coverage,
and profiles the remaining TypeScript finalization cost without rewriting the
TypeScript resolver/synthesizer layer.

## Current Decisions

- [x] Continue Rust indexing work from Phase 2.
- [x] Keep Rust opt-in.
- [x] Do not expand beyond JavaScript, TypeScript, JSX, and TSX.
- [x] Do not write a default-rollout plan in Phase 3.
- [x] Write only a default-rollout readiness checklist.
- [x] Make release confidence, diagnostics, failure safety, and repeatable
  validation the Phase 3 hard gates.
- [x] Treat performance as investigation plus bounded optimization, not a
  default-rollout gate.
- [x] Add Zustand as a third pinned JS/TS validation target alongside ZCodeGraph
  and Excalidraw.
- [x] Build a thin validation harness over the existing benchmark, profile, and
  sufficiency scripts instead of replacing those scripts.
- [x] Add local machine-readable diagnostics through `status --json` and the
  validation harness.
- [x] Add local bundle and packed npm-package smoke validation.
- [x] Do not publish npm packages or trigger GitHub Releases in Phase 3.

## Non-Goals

- Do not migrate additional languages.
- Do not make Rust the default index engine.
- Do not write a default-rollout plan.
- Do not add telemetry or upload diagnostics.
- Do not add a new MCP tool or change the MCP protocol.
- Do not rewrite ReferenceResolver, framework resolvers, dynamic-dispatch
  synthesizers, Explore planning, or Explore rendering in Rust.
- Do not require Rust, Cargo, Rustup, native toolchains, or `postinstall`
  compilation for npm/npx users.
- Do not publish npm packages, create GitHub Releases, or push release tags.

## Hard Gates

Phase 3 is complete only when all hard gates pass:

- [x] A single-command validation harness runs benchmark, profile, Agent
  Sufficiency, smoke, and diagnostics checks for ZCodeGraph, Excalidraw, and
  Zustand.
- [x] The harness writes raw artifacts plus `summary.json` and `summary.md`.
- [x] The harness is thin: it delegates benchmark/profile/sufficiency work to
  the existing scripts rather than duplicating their logic.
- [x] The Rust path failure-safety matrix has explicit tests and pass/fail
  reporting.
- [x] `zcodegraph status --json` exposes local Rust readiness diagnostics
  without making normal status output noisy.
- [x] Explicit Rust indexing failures include actionable local diagnostics and
  confirm whether the active index was preserved.
- [x] Local release bundle smoke verifies default TypeScript indexing, explicit
  Rust indexing, and missing packaged binary behavior.
- [x] Local packed npm package smoke verifies default TypeScript indexing,
  explicit Rust indexing, optional platform package wiring, and no local Rust
  compilation.
- [x] Finalization subphase profiling separates framework finalization,
  reference resolution, dynamic-dispatch synthesis, and DB maintenance.
- [x] At least one low-risk finalization optimization is attempted or a
  documented reason is recorded for why no safe optimization is available.
- [x] Benchmark/profile/Agent Sufficiency results show no regression against
  Phase 3 bounded gates: Rust remains below 100% slower on all three validation repos,
  peak RSS does not materially regress, and Rust does not increase sufficiency
  fallback risk.
- [x] Default TypeScript indexing remains unchanged and safe.
- [x] A default-rollout readiness checklist is recorded, without changing the
  default engine and without preparing a rollout plan.

## Validation Targets

| Repo | Role | Requirement |
|---|---|---|
| ZCodeGraph | Self-hosting / CLI and indexing-code corpus | Passed at `d77fce6` |
| Excalidraw | React app / JSX canvas flow corpus | Passed at `a83ac488` |
| Zustand | Third-party TS-heavy store/action corpus | Passed at `566b5bf` |

Zustand is pinned to `566b5bf` in the Phase 3 results document and harness
output.

## Phase 3 Checklist

### 1. Validation Harness

- [x] Add `scripts/rust-phase3-validation.mjs`.
- [x] Support explicit repo inputs:
  `--repo zcodegraph=<path> --repo excalidraw=<path> --repo zustand=<path>`.
- [x] Support `--out <dir>` and write all artifacts there.
- [x] Require all three repo names unless an explicit `--allow-missing-repo`
  style debug flag is added for local development.
- [x] Run `scripts/rust-index-benchmark.mjs` through the harness.
- [x] Run `scripts/rust-index-profile.mjs` through the harness.
- [x] Run `scripts/rust-sufficiency-guardrail.mjs` through the harness.
- [x] Run default TypeScript path smoke through the harness.
- [x] Run explicit Rust path smoke through the harness.
- [x] Run diagnostics collection through the harness.
- [x] Preserve raw stdout/stderr or raw JSON from each delegated script.
- [x] Write `summary.json` with toolchain metadata, repo commits, pass/fail
  gates, benchmark/profile/sufficiency summary, diagnostics summary, and smoke
  summary.
- [x] Write `summary.md` as a compact human-readable report.
- [x] Exit non-zero when any hard gate fails.
- [x] Keep the existing benchmark/profile/sufficiency scripts independently
  runnable.
- [x] Add tests for harness help text, required arguments, raw artifact layout,
  summary shape, and failure exit behavior.

### 2. Failure Safety Matrix

- [x] Define a Phase 3 Rust failure-safety matrix in code or a test fixture.
- [x] Cover missing Rust core binary.
- [x] Cover Rust core exits non-zero before writing an index.
- [x] Cover Rust core emits malformed stdout JSON.
- [x] Cover Rust core crashes after creating a temporary DB.
- [x] Cover Rust core writes a partial DB and then fails.
- [x] Cover lock contention between TypeScript and Rust indexing.
- [x] Cover stale Rust-side lock recovery or clear stale-lock behavior.
- [x] Cover packaged Rust binary removed after bundle extraction.
- [x] For each case, verify the previous active index remains readable.
- [x] For each case, verify no mixed or partial index becomes active.
- [x] For each case, verify the error message includes a next action.
- [x] For each case, verify default TypeScript indexing still works afterward.
- [x] Expose matrix results in the Phase 3 validation harness summary.

### 3. Local Diagnostics

- [x] Extend `zcodegraph status --json` with local Rust readiness diagnostics.
- [x] Report configured engine source: default, CLI/env Rust selection, or
  unavailable.
- [x] Report Rust core discovery source: env override, packaged binary,
  source-debug binary, source `cargo run`, or missing.
- [x] Report attempted binary path or command.
- [x] Report executable/version check result where available.
- [x] Report last index engine and engine version.
- [x] Report the latest local Rust profile summary when available.
- [x] Keep normal non-JSON `zcodegraph status` quiet unless an existing verbose
  or diagnostic mode is explicitly used.
- [x] Improve `zcodegraph index --engine rust` failure output with discovery
  source, attempted command/path, exit code or signal, active-index preservation
  status, and next action.
- [x] Ensure diagnostics are local-only and do not introduce telemetry.
- [x] Ensure diagnostics do not add or change MCP tools.
- [x] Add tests for JSON shape, missing binary diagnostics, packaged binary
  diagnostics, env override diagnostics, and Rust failure diagnostics.
- [x] Collect diagnostics into the Phase 3 validation harness `summary.json`.

### 4. Installed Package Smoke

- [x] Add local release bundle smoke that builds or stages a bundle artifact
  without publishing.
- [x] Extract a Unix bundle and run default TypeScript indexing.
- [x] Extract a Unix bundle and run explicit `--engine rust` indexing.
- [x] Remove `bin/zcodegraph-core` from an extracted Unix bundle and verify
  explicit Rust indexing fails safely.
- [x] Verify bundle smoke preserves launcher path conventions.
- [x] Add local packed npm package smoke using `scripts/pack-npm.sh`.
- [x] Install the packed main package into a temporary project.
- [x] Verify the optional platform package supplies `bin/zcodegraph-core` or
  `bin/zcodegraph-core.exe`.
- [x] Verify default TypeScript indexing works without invoking Rust.
- [x] Verify explicit Rust indexing works through the packed package path.
- [x] Verify missing optional platform package behavior is clear and does not
  attempt local Rust compilation.
- [x] Verify package metadata does not add `postinstall`.
- [x] Add an npx-like local smoke using packed packages or a temporary install,
  without contacting the public npm registry.
- [x] Feed smoke results into the Phase 3 validation harness.

### 5. Finalization Profile And Low-Risk Optimization

- [x] Extend Rust-path profiling to separate TypeScript finalization subphases:
  framework post-extract, reference resolution, dynamic-dispatch synthesis, and
  DB maintenance.
- [x] Record finalization subphase profiles for ZCodeGraph, Excalidraw, and
  Zustand.
- [x] Identify the dominant finalization subphase per repo.
- [x] Attempt one low-risk optimization based on the profile, or document why no
  safe low-risk optimization is available.
- [x] Keep ReferenceResolver, framework resolvers, and dynamic-dispatch
  synthesizers in TypeScript.
- [x] Do not require Rust to become faster than TypeScript in Phase 3.
- [x] Verify the optimization does not change the default TypeScript path.
- [x] Verify semantic parity does not regress for JS/TS/JSX/TSX.
- [x] Verify Agent Sufficiency does not regress on ZCodeGraph, Excalidraw, and
  Zustand.
- [x] Verify peak RSS does not materially regress from Phase 2.
- [x] Record benchmark/profile/sufficiency results in a compact Phase 3 results
  document.
- [x] Write a default-rollout readiness checklist that lists remaining evidence
  needed before any future rollout plan.

## Local Validation

Minimum local validation for Phase 3 work:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand \
  --out /tmp/zcodegraph-rust-phase3/
```

The Phase 3 harness should call the existing benchmark/profile/sufficiency
scripts internally, but those scripts remain supported for focused diagnosis.

## Agent Handoff Notes

- Start with the validation harness and diagnostics shape before optimizing
  finalization; otherwise later agents will not have a stable way to compare
  results.
- Keep every change behind explicit Rust opt-in paths.
- Treat default TypeScript behavior as the protected path.
- Do not use Zustand as a reason to expand language coverage; it is a third
  JS/TS validation target only.
- Keep failure-safety tests behavioral: active index readable, partial index not
  active, clear next action, default TypeScript path still works.
- Keep installed-package smoke local: no npm publish, no GitHub Release, no
  release tags.
