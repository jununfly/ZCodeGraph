# Rust Indexing Core Phase 2 Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 1 Plan](2026-06-12-rust-indexing-core-phase-1.md)

Phase 1 decision: [Rust Indexing Core Phase 1 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md)

Phase 2 decision: [Rust Indexing Core Phase 2 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-2-decision.md)

Published tracking issue: [#70 — Plan: Rust indexing core Phase 2 packaging, CI, and performance hardening](https://github.com/jununfly/ZCodeGraph/issues/70)

## Goal

Make the Phase 1 JavaScript, TypeScript, JSX, and TSX Rust indexing slice
release-packageable and continuously verifiable without expanding language
coverage or making Rust the default engine.

Phase 2 is a packaging, CI, and performance-hardening phase. It must prove that
prebuilt `zcodegraph-core` binaries can ship through the existing GitHub Release,
npm optional platform package, npx, and standalone bundle paths while preserving
the default TypeScript indexer behavior. Performance work in this phase must
produce repeatable profiling evidence, at least one low-risk optimization
attempt, and fresh benchmark results, but speed improvement is not the release
packaging hard gate.

## Current Decisions

- [x] Do not expand to a second language in Phase 2.
- [x] Do not make Rust the default index engine in Phase 2.
- [x] Use one Phase 2 plan with five internal stages.
- [x] Treat release packaging and CI verification as the Phase 2 hard gate.
- [x] Treat Rust wall-clock speed as an investigation and improvement gate, not
  as the packaging completion gate.
- [x] Ship prebuilt Rust binaries in release bundles and npm platform packages.
- [x] Do not add npm `postinstall` compilation.
- [x] Do not require Rust or Cargo for npm/npx users.
- [x] Keep source-development builds explicit: `cargo build --package
  zcodegraph-core`.
- [x] Cover the same six release targets as the current bundle workflow:
  `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `win32-x64`, and
  `win32-arm64`.
- [x] Do not accept platform coverage gaps. If Windows ARM64 or another target
  needs runner/cross-compile research, track that as a blocker issue, but keep
  six-target coverage as the Phase 2 hard gate.
- [x] Put the packaged Rust binary next to the launcher:
  `bin/zcodegraph-core` on Unix and `bin/zcodegraph-core.exe` on Windows.

## Non-Goals

- [ ] Do not migrate languages beyond JavaScript, TypeScript, JSX, and TSX.
- [ ] Do not default `zcodegraph index` to Rust.
- [ ] Do not require Cargo, Rustup, Visual Studio Build Tools, Xcode, or a C
  toolchain for npm/npx users.
- [ ] Do not rewrite the MCP server, installer, upgrade flow, npm shim,
  ReferenceResolver, framework resolvers, dynamic-dispatch synthesizers, Explore
  planner, or Explore renderer in Rust.
- [ ] Do not change the MCP tool surface.
- [ ] Do not publish a release path where one of the six existing platform
  packages lacks a Rust binary while claiming Rust packaging is complete.
- [ ] Do not treat the performance stretch goal as permission to default Rust.

## Hard Gates

- [x] Phase 2 stop/continue decision recorded: continue Rust hardening, keep
  Rust opt-in, and do not prepare default rollout in this phase.

Phase 2 is complete only when all hard gates pass:

- [x] Every release target has a prebuilt `zcodegraph-core` artifact.
- [x] Every GitHub Release bundle includes the matching Rust binary at
  `bin/zcodegraph-core` or `bin/zcodegraph-core.exe`.
- [x] Every npm platform package includes the matching Rust binary.
- [x] `zcodegraph index` without `--engine rust` and without
  `ZCODEGRAPH_INDEX_ENGINE=rust` still uses the TypeScript indexer and does not
  require the Rust binary.
- [x] `zcodegraph index --engine rust` finds the packaged Rust binary on every
  supported target.
- [x] A missing packaged Rust binary fails only the explicit Rust path, with a
  clear error and no active-index corruption.
- [x] CI verifies Rust build/test/CLI behavior on macOS, Linux, and Windows.
- [x] The release workflow fails if any target lacks a Rust binary artifact.
- [x] The existing benchmark and Agent Sufficiency guardrails still pass their
  Phase 1 non-regression bars after packaging changes.

## Performance Gate

Phase 2 must produce performance evidence, not necessarily a speed win:

- [x] Add or extend profiling so a run can separate Rust extraction time, SQLite
  write time, TypeScript finalization time, and subprocess startup/handoff time.
- [x] Record profiles for this repository and Excalidraw.
- [x] Attempt at least one low-risk optimization based on the profile.
- [x] Rerun `scripts/rust-index-benchmark.mjs` after the optimization attempt.
- [x] Confirm peak RSS does not regress materially against Phase 1.
- [x] Record remaining speed blockers if Rust is still slower.

Stretch goal: reduce Rust slowdown from the Phase 1 range of 166-297% slower to
less than 100% slower on both ZCodeGraph and Excalidraw. Missing this stretch
goal does not block Phase 2 packaging completion, but it continues to block any
default-rollout decision.

## Architecture Boundary

```text
Release workflow / CI
  -> build zcodegraph-core for each release target
  -> upload target-named Rust binary artifacts
  -> bundle job downloads artifacts
  -> build-bundle.sh copies bin/zcodegraph-core(.exe) into each bundle
  -> pack-npm.sh preserves bin/ in each platform package
  -> npm-shim / bundled launcher continue launching zcodegraph normally
      -> default index path remains TypeScript
      -> explicit Rust engine discovers packaged binary
```

The TypeScript product shell remains responsible for CLI orchestration, MCP
server behavior, installer and upgrade flows, resolution, synthesizers, Explore
planning, and rendering.

## Rust Binary Artifact Contract

Issue #60 resolves the build strategy contract. The machine-readable source is
`scripts/rust-core-artifact-contract.mjs`; release and packaging work should
consume or mirror that contract instead of inventing another target matrix.

| Release target | Rust target triple | Runner | Strategy | Artifact | Bundle path |
| --- | --- | --- | --- | --- | --- |
| `darwin-arm64` | `aarch64-apple-darwin` | `macos-14` | native GitHub-hosted runner | `zcodegraph-core-darwin-arm64` | `bin/zcodegraph-core` |
| `darwin-x64` | `x86_64-apple-darwin` | `macos-13` | native GitHub-hosted runner | `zcodegraph-core-darwin-x64` | `bin/zcodegraph-core` |
| `linux-x64` | `x86_64-unknown-linux-gnu` | `ubuntu-24.04` | native GitHub-hosted runner | `zcodegraph-core-linux-x64` | `bin/zcodegraph-core` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `ubuntu-24.04-arm` | native GitHub-hosted runner | `zcodegraph-core-linux-arm64` | `bin/zcodegraph-core` |
| `win32-x64` | `x86_64-pc-windows-msvc` | `windows-2025` | native GitHub-hosted runner | `zcodegraph-core-win32-x64` | `bin/zcodegraph-core.exe` |
| `win32-arm64` | `aarch64-pc-windows-msvc` | `windows-2025` | cross-compile from Windows x64 MSVC runner after `rustup target add aarch64-pc-windows-msvc` | `zcodegraph-core-win32-arm64` | `bin/zcodegraph-core.exe` |

Every target uses:

```bash
cargo build --release --package zcodegraph-core --target <rust-target-triple>
```

The expected output is
`target/<rust-target-triple>/release/zcodegraph-core` on Unix and
`target/<rust-target-triple>/release/zcodegraph-core.exe` on Windows.

npm and npx users must receive these binaries through the release bundle and
platform package path. The contract does not allow `postinstall` compilation,
local Rust/Rustup/Cargo requirements for npm users, or a source build fallback
inside published packages. Source development remains explicit:
`cargo build --package zcodegraph-core`.

## Phase 2 Checklist

### 1. Artifact Contract

- [x] Define target-to-binary artifact names for all six release targets.
- [x] Define packaged binary paths:
  - [x] Unix: `bin/zcodegraph-core`
  - [x] Windows: `bin/zcodegraph-core.exe`
- [x] Document that npm/npx users never compile Rust locally.
- [x] Document that source developers run `cargo build --package
  zcodegraph-core`.
- [x] Add packaged-binary discovery to the TypeScript Rust indexer path.
- [x] Preserve `ZCODEGRAPH_RUST_CORE_BINARY` as the explicit override for tests
  and local experiments.
- [x] Preserve repo-dev discovery through `target/debug/zcodegraph-core` or
  `cargo run` when running from source.
- [x] Ensure packaged-binary discovery works from compiled `dist/` inside a
  release bundle and npm platform package.
- [x] Add tests for discovery precedence: env override, packaged binary,
  source-debug binary, source `cargo run`, unavailable.
- [x] Add a test proving the default TypeScript indexer does not require any
  Rust binary.
- [x] Add a test proving explicit Rust engine failure leaves the previous good
  index active.

### 2. Release Bundle Packaging

- [x] Decide and implement the release artifact staging directory for Rust
  binaries.
- [x] Update `scripts/build-bundle.sh` to require and copy the target-matching
  Rust binary into `bin/`.
- [x] Make `scripts/build-bundle.sh` fail if the target Rust binary is missing.
- [x] Preserve the existing launcher paths:
  - [x] Unix: `bin/zcodegraph`
  - [x] Windows: `bin/zcodegraph.cmd`
- [x] Verify generated `.tar.gz` and `.zip` archives contain the Rust binary.
- [x] Add bundle smoke tests that extract an archive and run the bundled
  launcher with default TypeScript indexing.
- [x] Add bundle smoke tests that extract an archive and run explicit
  `--engine rust` indexing.
- [x] Add a bundle smoke test for missing Rust binary behavior if the binary is
  removed after extraction.
- [x] Keep standalone install behavior unchanged when Rust is unused.

### 3. NPM Platform Package Packaging

- [x] Ensure `scripts/pack-npm.sh` preserves `bin/zcodegraph-core(.exe)` from
  each release bundle into each platform package.
- [x] Ensure generated platform package `files` includes the Rust binary path.
- [x] Confirm the main shim package remains thin and does not include the Rust
  binary directly.
- [x] Confirm optionalDependencies still map exactly to the six platform
  packages.
- [x] Add npm tarball smoke tests from generated `release/npm/*` packages.
- [x] Test `npx` or packed-main-package execution uses the platform package and
  keeps default TypeScript indexing working.
- [x] Test explicit `--engine rust` through the packed npm path.
- [x] Test missing optional platform package/self-heal behavior remains focused
  on bundle acquisition, not Rust compilation.
- [x] Confirm no `postinstall` or local Rust build step is introduced.

### 4. CI And Release Workflow

- [x] Add a Rust binary build matrix for all six release targets.
- [x] Ensure each target runs `cargo build --release --package
  zcodegraph-core` or an explicitly documented equivalent.
- [x] Upload one named Rust binary artifact per release target.
- [x] Resolve the Windows ARM64 build path; do not mark Phase 2 complete until a
  real artifact is produced.
- [x] Update the release packaging job to download all Rust binary artifacts.
- [x] Make the release workflow fail if any expected artifact is missing.
- [x] Add CI coverage for `cargo test`.
- [x] Add CI coverage for Rust CLI integration tests on macOS, Linux, and
  Windows.
- [x] Add CI coverage proving default TypeScript indexing works when no Rust
  binary is available.
- [x] Add CI coverage proving packaged Rust indexing works where the binary is
  available.
- [x] Keep release-note promotion, GitHub Release creation, npm publish, and
  npmmirror sync behavior intact.
- [x] Update release workflow comments that currently say there is no native
  compilation.

### 5. Performance Hardening

- [x] Add profiling output or a profiling script that separates:
  - [x] Rust source scan time
  - [x] Rust parse/extraction time
  - [x] SQLite write time
  - [x] TypeScript finalization/resolution/synthesis time
  - [x] subprocess startup and handoff time
- [x] Run the profile on this repository.
- [x] Run the profile on Excalidraw.
- [x] Choose one low-risk optimization based on the profile.
- [x] Implement the optimization behind the existing Rust path without changing
  default TypeScript behavior.
- [x] Add regression coverage for the optimized behavior if it changes observable
  output or failure safety.
- [x] Rerun `scripts/rust-index-benchmark.mjs` on this repository and
  Excalidraw.
- [x] Rerun `scripts/rust-sufficiency-guardrail.mjs` on this repository and
  Excalidraw.
- [x] Record the new benchmark/profile results in a compact repo document.
- [x] State whether the <100% slower stretch goal was met.
- [x] Stretch goal was met, so no missed-stretch bottleneck record is needed;
  default rollout remains blocked pending #69.

#67 optimization evidence: the first repository profile after #66 showed
SQLite writing as the dominant Rust-side phase (`sqliteWriteMs=5136ms` versus
`parseExtractionMs=843ms` on this repository). The low-risk optimization is to
batch Rust core SQLite writes in one transaction. After the change, the same
local profile on this repository reported `sqliteWriteMs=1074ms`, and the local
benchmark reported Rust peak RSS below the TypeScript path (`217415680` bytes
versus `356696064` bytes). Full Excalidraw reruns and benchmark result recording
remain in #68.

## Published Issue Breakdown

- [x] [#60](https://github.com/jununfly/ZCodeGraph/issues/60): Resolve
  six-target Rust binary build strategy.
- [x] [#61](https://github.com/jununfly/ZCodeGraph/issues/61): Define packaged
  Rust binary artifact contract and discovery
  precedence.
- [x] [#62](https://github.com/jununfly/ZCodeGraph/issues/62): Package
  `zcodegraph-core` into GitHub Release bundles.
- [x] [#63](https://github.com/jununfly/ZCodeGraph/issues/63): Preserve
  packaged Rust binary through npm platform packages and packed npm smoke tests.
- [x] [#64](https://github.com/jununfly/ZCodeGraph/issues/64): Add release/CI
  matrix for six Rust binary artifacts, including Windows ARM64 resolution.
- [x] [#65](https://github.com/jununfly/ZCodeGraph/issues/65): Add
  cross-platform CI for Rust tests, CLI integration, default TS path, and
  packaged Rust path.
- [x] [#66](https://github.com/jununfly/ZCodeGraph/issues/66): Add performance
  profiling for Rust indexing phases.
- [x] [#67](https://github.com/jununfly/ZCodeGraph/issues/67): Apply one
  low-risk Rust indexing performance optimization.
- [x] [#68](https://github.com/jununfly/ZCodeGraph/issues/68): Rerun benchmark
  and Agent Sufficiency guardrails and record Phase 2 results.
- [x] [#69](https://github.com/jununfly/ZCodeGraph/issues/69): Make the Phase 2
  stop/continue decision for default-rollout readiness.

## Local Validation

Minimum local validation before opening Phase 2 issues:

```bash
npm run build
cargo test
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts __tests__/status-json.test.ts
node scripts/rust-parity-check.mjs --repo .
node scripts/rust-index-benchmark.mjs --repo zcodegraph=. --repo excalidraw=/path/to/excalidraw
node scripts/rust-index-profile.mjs --repo zcodegraph=. --repo excalidraw=/path/to/excalidraw
node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/path/to/excalidraw
```

Bundle and npm smoke validation should be added during Phase 2 once packaged
binary support exists.

## Agent Handoff Notes

- Start with binary discovery and packaging tests before editing the release
  workflow. Otherwise failures will be hard to diagnose.
- Treat Windows ARM64 as a first-class release target, not an optional cleanup.
- Do not add npm `postinstall` compilation.
- Do not require Rust for npm/npx users.
- Preserve the default TypeScript indexer as the safe path.
- Keep Rust opt-in until a later default-rollout decision explicitly changes it.
- Performance profiling should explain the slowdown before optimization work
  broadens.
