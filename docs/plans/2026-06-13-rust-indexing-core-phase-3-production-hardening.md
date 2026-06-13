# Rust Indexing Core Phase 3 Production Hardening Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)

Phase 2 decision: [Rust Indexing Core Phase 2 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md)

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

- [ ] A single-command validation harness runs benchmark, profile, Agent
  Sufficiency, smoke, and diagnostics checks for ZCodeGraph, Excalidraw, and
  Zustand.
- [ ] The harness writes raw artifacts plus `summary.json` and `summary.md`.
- [ ] The harness is thin: it delegates benchmark/profile/sufficiency work to
  the existing scripts rather than duplicating their logic.
- [ ] The Rust path failure-safety matrix has explicit tests and pass/fail
  reporting.
- [ ] `zcodegraph status --json` exposes local Rust readiness diagnostics
  without making normal status output noisy.
- [ ] Explicit Rust indexing failures include actionable local diagnostics and
  confirm whether the active index was preserved.
- [ ] Local release bundle smoke verifies default TypeScript indexing, explicit
  Rust indexing, and missing packaged binary behavior.
- [ ] Local packed npm package smoke verifies default TypeScript indexing,
  explicit Rust indexing, optional platform package wiring, and no local Rust
  compilation.
- [ ] Finalization subphase profiling separates framework finalization,
  reference resolution, dynamic-dispatch synthesis, and DB maintenance.
- [ ] At least one low-risk finalization optimization is attempted or a
  documented reason is recorded for why no safe optimization is available.
- [ ] Benchmark/profile/Agent Sufficiency results show no regression against
  Phase 2 gates: Rust remains below 100% slower on all three validation repos,
  peak RSS does not materially regress, and Rust does not increase sufficiency
  fallback risk.
- [ ] Default TypeScript indexing remains unchanged and safe.
- [ ] A default-rollout readiness checklist is recorded, without changing the
  default engine and without preparing a rollout plan.

## Validation Targets

| Repo | Role | Requirement |
|---|---|---|
| ZCodeGraph | Self-hosting / CLI and indexing-code corpus | Required |
| Excalidraw | React app / JSX canvas flow corpus | Required |
| Zustand | Third-party TS-heavy store/action corpus | Required |

Zustand must be pinned to an exact commit in the Phase 3 results document. If
the repository cannot be fetched or prepared locally, record that as a blocker
instead of silently skipping the third validation target.

## Phase 3 Checklist

### 1. Validation Harness

- [ ] Add `scripts/rust-phase3-validation.mjs`.
- [ ] Support explicit repo inputs:
  `--repo zcodegraph=<path> --repo excalidraw=<path> --repo zustand=<path>`.
- [ ] Support `--out <dir>` and write all artifacts there.
- [ ] Require all three repo names unless an explicit `--allow-missing-repo`
  style debug flag is added for local development.
- [ ] Run `scripts/rust-index-benchmark.mjs` through the harness.
- [ ] Run `scripts/rust-index-profile.mjs` through the harness.
- [ ] Run `scripts/rust-sufficiency-guardrail.mjs` through the harness.
- [ ] Run default TypeScript path smoke through the harness.
- [ ] Run explicit Rust path smoke through the harness.
- [ ] Run diagnostics collection through the harness.
- [ ] Preserve raw stdout/stderr or raw JSON from each delegated script.
- [ ] Write `summary.json` with toolchain metadata, repo commits, pass/fail
  gates, benchmark/profile/sufficiency summary, diagnostics summary, and smoke
  summary.
- [ ] Write `summary.md` as a compact human-readable report.
- [ ] Exit non-zero when any hard gate fails.
- [ ] Keep the existing benchmark/profile/sufficiency scripts independently
  runnable.
- [ ] Add tests for harness help text, required arguments, raw artifact layout,
  summary shape, and failure exit behavior.

### 2. Failure Safety Matrix

- [ ] Define a Phase 3 Rust failure-safety matrix in code or a test fixture.
- [ ] Cover missing Rust core binary.
- [ ] Cover Rust core exits non-zero before writing an index.
- [ ] Cover Rust core emits malformed stdout JSON.
- [ ] Cover Rust core crashes after creating a temporary DB.
- [ ] Cover Rust core writes a partial DB and then fails.
- [ ] Cover lock contention between TypeScript and Rust indexing.
- [ ] Cover stale Rust-side lock recovery or clear stale-lock behavior.
- [ ] Cover packaged Rust binary removed after bundle extraction.
- [ ] For each case, verify the previous active index remains readable.
- [ ] For each case, verify no mixed or partial index becomes active.
- [ ] For each case, verify the error message includes a next action.
- [ ] For each case, verify default TypeScript indexing still works afterward.
- [ ] Expose matrix results in the Phase 3 validation harness summary.

### 3. Local Diagnostics

- [ ] Extend `zcodegraph status --json` with local Rust readiness diagnostics.
- [ ] Report configured engine source: default, CLI/env Rust selection, or
  unavailable.
- [ ] Report Rust core discovery source: env override, packaged binary,
  source-debug binary, source `cargo run`, or missing.
- [ ] Report attempted binary path or command.
- [ ] Report executable/version check result where available.
- [ ] Report last index engine and engine version.
- [ ] Report the latest local Rust profile summary when available.
- [ ] Keep normal non-JSON `zcodegraph status` quiet unless an existing verbose
  or diagnostic mode is explicitly used.
- [ ] Improve `zcodegraph index --engine rust` failure output with discovery
  source, attempted command/path, exit code or signal, active-index preservation
  status, and next action.
- [ ] Ensure diagnostics are local-only and do not introduce telemetry.
- [ ] Ensure diagnostics do not add or change MCP tools.
- [ ] Add tests for JSON shape, missing binary diagnostics, packaged binary
  diagnostics, env override diagnostics, and Rust failure diagnostics.
- [ ] Collect diagnostics into the Phase 3 validation harness `summary.json`.

### 4. Installed Package Smoke

- [ ] Add local release bundle smoke that builds or stages a bundle artifact
  without publishing.
- [ ] Extract a Unix bundle and run default TypeScript indexing.
- [ ] Extract a Unix bundle and run explicit `--engine rust` indexing.
- [ ] Remove `bin/zcodegraph-core` from an extracted Unix bundle and verify
  explicit Rust indexing fails safely.
- [ ] Verify bundle smoke preserves launcher path conventions.
- [ ] Add local packed npm package smoke using `scripts/pack-npm.sh`.
- [ ] Install the packed main package into a temporary project.
- [ ] Verify the optional platform package supplies `bin/zcodegraph-core` or
  `bin/zcodegraph-core.exe`.
- [ ] Verify default TypeScript indexing works without invoking Rust.
- [ ] Verify explicit Rust indexing works through the packed package path.
- [ ] Verify missing optional platform package behavior is clear and does not
  attempt local Rust compilation.
- [ ] Verify package metadata does not add `postinstall`.
- [ ] Add an npx-like local smoke using packed packages or a temporary install,
  without contacting the public npm registry.
- [ ] Feed smoke results into the Phase 3 validation harness.

### 5. Finalization Profile And Low-Risk Optimization

- [ ] Extend Rust-path profiling to separate TypeScript finalization subphases:
  framework post-extract, reference resolution, dynamic-dispatch synthesis, and
  DB maintenance.
- [ ] Record finalization subphase profiles for ZCodeGraph, Excalidraw, and
  Zustand.
- [ ] Identify the dominant finalization subphase per repo.
- [ ] Attempt one low-risk optimization based on the profile, or document why no
  safe low-risk optimization is available.
- [ ] Keep ReferenceResolver, framework resolvers, and dynamic-dispatch
  synthesizers in TypeScript.
- [ ] Do not require Rust to become faster than TypeScript in Phase 3.
- [ ] Verify the optimization does not change the default TypeScript path.
- [ ] Verify semantic parity does not regress for JS/TS/JSX/TSX.
- [ ] Verify Agent Sufficiency does not regress on ZCodeGraph, Excalidraw, and
  Zustand.
- [ ] Verify peak RSS does not materially regress from Phase 2.
- [ ] Record benchmark/profile/sufficiency results in a compact Phase 3 results
  document.
- [ ] Write a default-rollout readiness checklist that lists remaining evidence
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
