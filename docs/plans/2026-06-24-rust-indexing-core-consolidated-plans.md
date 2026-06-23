# Rust Indexing Core Consolidated Plans

Date: 2026-06-24

This file mechanically consolidates the previous `*-rust-indexing-core-*` files in this directory. The original per-phase/process files were removed after consolidation so this file is the single archive entry point for this historical workstream.

## Source Files

- `docs/plans/2026-06-12-rust-indexing-core-phase-1.md`
- `docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md`
- `docs/plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md`
- `docs/plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md`
- `docs/plans/2026-06-14-rust-indexing-core-phase-5-reference-resolution-bottleneck-burndown.md`
- `docs/plans/2026-06-14-rust-indexing-core-phase-6-js-ts-completeness.md`
- `docs/plans/2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md`
- `docs/plans/2026-06-14-rust-indexing-core-phase-8-matcher-viability-hardening.md`
- `docs/plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md`
- `docs/plans/2026-06-15-rust-indexing-core-phase-14-experiment-infrastructure.md`
- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-handoff.md`
- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-17-production-final-flush-scoreboard.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-18-full-profile-bottleneck-ab.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-19-prd-completion-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-20-end-to-end-completion.md`
- `docs/plans/2026-06-18-rust-indexing-core-phase-22-evidence-pipeline-and-optimization-loop.md`
- `docs/plans/2026-06-18-rust-indexing-core-phase-23-optimization-architecture-cleanup.md`

## Consolidated Contents

## 1. `docs/plans/2026-06-12-rust-indexing-core-phase-1.md`

# Rust Indexing Core Phase 1 Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Published issue: [#49 — PRD: Rust indexing core vertical slice](https://github.com/jununfly/ZCodeGraph/issues/49)

## Goal

Build an opt-in Rust indexing core vertical slice for JavaScript,
TypeScript, JSX, and TSX files. The Rust core should remove the
Node/WebAssembly parser hot path for this slice, write the existing SQLite
index schema directly, and leave the TypeScript product shell responsible for
CLI orchestration, MCP tools, resolution, synthesizers, Explore planning, and
installer behavior.

The first phase is a proof gate, not a default rollout. Continue only if the
Rust path proves semantic extraction parity, preserves Agent Sufficiency, and
wins on indexing time or peak memory on real repositories.

## Current Decisions

- [x] Use the incremental migration route: Rust indexing core plus TypeScript
  product shell.
- [x] Keep TypeScript as the default index engine.
- [x] Enable Rust only through an explicit engine flag or environment variable.
- [x] Place the Rust core in the same repository as a Cargo workspace.
- [x] Start with one crate for the core.
- [x] Use subprocess execution from TypeScript to Rust.
- [x] Let Rust write the existing SQLite schema directly.
- [x] Limit Phase 1 language coverage to JavaScript, TypeScript, JSX, and TSX.
- [x] Keep TypeScript `ReferenceResolver`, framework resolvers,
  dynamic-dispatch synthesizers, graph traversal, MCP tools, and Explore
  planning in TypeScript.
- [x] Use semantic parity, not byte-identical database parity.
- [x] Treat performance and memory as hard gates before expansion.

## Non-Goals

- [ ] Do not rewrite the MCP server in Rust.
- [ ] Do not rewrite the installer, upgrade flow, npm shim, or agent config
  writers in Rust.
- [ ] Do not rewrite Explore planner, renderer, or Agent Sufficiency policy in
  Rust.
- [ ] Do not migrate `ReferenceResolver`, framework resolvers, or synthesizers
  in Phase 1.
- [ ] Do not migrate languages beyond JavaScript, TypeScript, JSX, and TSX in
  Phase 1.
- [ ] Do not make Rust the default index engine in Phase 1.
- [ ] Do not change the public MCP tool surface.
- [ ] Do not change the SQLite schema except for minimal index-engine metadata
  unless a separate migration decision is made.

## Architecture Boundary

```text
TypeScript CLI / MCP / installer / Explore
  -> explicit opt-in engine selection
  -> spawn Rust zcodegraph-core subprocess
      -> scan JS/TS/JSX/TSX files
      -> parse with native tree-sitter
      -> extract files/nodes/intra-file edges/unresolved refs
      -> write existing SQLite schema directly
  -> TypeScript resolver and synthesizers complete cross-file graph
  -> TypeScript MCP/Explore reads the same SQLite index
```

## Phase 1 Checklist

### 1. Workspace And Core Skeleton

- [x] Add root Cargo workspace.
- [x] Add one Rust crate for the indexing core.
- [x] Add a Rust CLI entrypoint that can be invoked as a subprocess.
- [x] Add a Rust library entrypoint for unit/integration tests.
- [x] Add a minimal command contract for project path, index path or DB path,
  engine mode, and force/fresh-index behavior.
- [x] Add machine-readable stdout events for progress and final result.
- [x] Add machine-readable stderr or structured error output for failures.
- [x] Add `cargo test` to local validation documentation.
- [x] Decide whether CI should run `cargo test` immediately or only after the
  first working Rust slice lands.

### 2. TypeScript Engine Selection Seam

- [x] Add a TypeScript index-engine abstraction at the highest CLI/index
  orchestration seam.
- [x] Keep the current TypeScript indexer as the default implementation.
- [x] Add explicit CLI selection, for example `zcodegraph index --engine rust`.
- [x] Add explicit environment selection, for example
  `ZCODEGRAPH_INDEX_ENGINE=rust`.
- [x] Reject or clearly warn on unsupported engine values.
- [x] Ensure MCP and normal CLI behavior remain TypeScript-indexer by default.
- [x] Ensure an unavailable Rust binary fails cleanly and does not corrupt the
  active index.
- [x] Add status metadata display for the engine that produced the index.

### 3. SQLite Contract And Metadata

- [x] Document the SQLite tables Phase 1 Rust will write.
- [x] Document the columns Rust must preserve exactly.
- [x] Document which ordering differences are irrelevant.
- [x] Write files records for indexed JS files.
- [x] Write node records for JS file/function/class symbols using stable IDs
  compatible with TypeScript readers.
- [x] Write intra-file `contains` edges for JS file/function/class symbols.
- [x] Write files records for indexed TS/JSX/TSX files.
- [x] Write node records for TS/JSX/TSX symbols using stable IDs compatible
  with TypeScript readers.
- [x] Write intra-file `contains` edges for TS/JSX/TSX file/symbol nodes.
- [x] Write unresolved references for local `calls`, `imports`, and `exports`
  where Phase 1 extraction supports them.
- [x] Write unresolved references needed by the existing TypeScript resolver.
- [x] Write index engine metadata, including engine name and engine version.
- [x] Preserve existing schema version and extraction version semantics.
- [x] Ensure TypeScript `CodeGraph` can open and query a Rust-written index.

### 4. Locking And Failure Safety

- [x] Reuse the existing project write lock location and semantics.
- [x] Add a Rust-side lock acquisition test.
- [x] Add a cross-process test showing TypeScript and Rust do not write at the
  same time.
- [x] Ensure Rust indexing writes to a temporary or otherwise failure-safe
  target.
- [x] Ensure a Rust indexing failure leaves the previous good index active.
- [x] Ensure partial Rust output is not mistaken for a complete index.
- [x] Ensure Ctrl-C or subprocess termination does not leave a permanently
  locked index.

### 5. Native Tree-Sitter JS/TS Parser

- [x] Add Rust tree-sitter dependencies for JavaScript grammar.
- [x] Add Rust tree-sitter dependencies for TypeScript grammar.
- [x] Support `.js` detection.
- [x] Support `.jsx`, `.ts`, and `.tsx` detection.
- [x] Parse JS/TS/JSX/TSX files without using Node `web-tree-sitter` or
  WebAssembly.
- [x] Bound parser concurrency so peak RSS can be controlled.
- [x] Release AST/parser resources promptly after each file or batch.
- [x] Add parser integration coverage for `.js`.
- [x] Add parser integration coverage for `.jsx`, `.ts`, and `.tsx`.
- [x] Add error handling for parse failures that mirrors existing indexer
  behavior.

### 6. JS/TS/JSX/TSX Extraction Slice

- [x] Extract JS/TS/JSX/TSX file nodes.
- [x] Document that JS/TS Phase 1 does not add `module` nodes because the
  existing JS/TS extractor does not emit ES module nodes.
- [x] Extract JS/TS/JSX/TSX exported and non-exported function declarations.
- [x] Extract JS/TS/JSX/TSX class declarations.
- [x] Extract methods.
- [x] Extract constructors as method nodes.
- [x] Extract properties and fields where supported by Phase 1.
- [x] Extract variables and constants needed by current JS/TS graph behavior.
- [x] Extract type aliases and interfaces.
- [x] Extract imports and exports.
- [x] Extract JSX/TSX component declarations needed by existing behavior.
- [x] Extract JSX/TSX component usages needed by existing behavior.
- [x] Extract object-literal methods used by store/action patterns.
- [x] Extract local call references.
- [x] Extract unresolved references for TypeScript resolver follow-up.
- [x] Preserve language values expected by TypeScript readers.
- [x] Preserve source line and column ranges well enough for Explore source
  rendering and blast-radius output.

### 7. TypeScript Resolver Handoff

- [x] After Rust extraction completes, run existing TypeScript resolver steps.
- [x] Run existing post-extract framework finalization where applicable.
- [x] Run existing batched reference resolution.
- [x] Run existing dynamic-dispatch synthesizers.
- [x] Ensure resolver output is not skipped because the index metadata says
  Rust produced extraction data.
- [x] Add an integration test where Rust extraction plus TypeScript resolution
  produces cross-file references usable by graph queries.

### 8. Semantic Parity Tests

- [x] Build a parity comparator that compares TypeScript and Rust extraction
  semantically.
- [x] Compare file nodes.
- [x] Compare named functions/classes/methods/components.
- [x] Compare imports and exports.
- [x] Compare `contains` edges.
- [x] Compare local calls and unresolved references.
- [x] Compare source locations within an acceptable tolerance.
- [x] Categorize differences as expected, acceptable, or blocking.
- [x] Add fixture parity tests for plain JavaScript.
- [x] Add fixture parity tests for TypeScript.
- [x] Add fixture parity tests for JSX.
- [x] Add fixture parity tests for TSX.
- [x] Add fixture parity tests for object-literal methods.
- [x] Add fixture parity tests for imports, exports, and re-exports.
- [x] Add fixture parity tests for component usage.
- [x] Add real-repo parity checks for this repository.
- [x] Add real-repo parity checks for Excalidraw.

### 9. CLI Integration Tests

- [x] Test that `zcodegraph index` still uses the TypeScript indexer by
  default.
- [x] Test that `zcodegraph index --engine rust` invokes the Rust subprocess.
- [x] Test that environment engine selection invokes the Rust subprocess.
- [x] Test that unsupported files/languages still have a clear behavior under
  the Phase 1 Rust engine.
- [x] Test that Rust subprocess failure is rendered as a normal CLI error.
- [x] Test that status reports the index engine metadata.
- [x] Test that TypeScript MCP tools can query a Rust-produced index.

### 10. Performance And Memory Benchmarks

- [x] Establish TypeScript indexer baseline for this repository.
- [x] Establish Rust indexer baseline for this repository.
- [x] Establish TypeScript indexer baseline for Excalidraw.
- [x] Establish Rust indexer baseline for Excalidraw.
- [x] Capture wall-clock indexing time.
- [x] Capture peak RSS.
- [x] Record Node version, Rust version, OS, CPU, and repo commit.
- [x] Verify Rust is at least 25% faster or at least 30% lower peak RSS on this
  repository, with the other metric not significantly worse.
- [x] Verify Rust is at least 25% faster or at least 30% lower peak RSS on
  Excalidraw, with the other metric not significantly worse.
- [x] Store benchmark results in a compact repo document.
- [ ] If the hard gate fails, stop expansion and document why.

### 11. Agent Sufficiency Guardrails

- [x] Index this repository with the TypeScript engine and run representative
  ZCodeGraph flow prompts.
- [x] Index this repository with the Rust engine and run the same ZCodeGraph
  flow prompts.
- [x] Index Excalidraw with the TypeScript engine and run representative
  Excalidraw flow prompts.
- [x] Index Excalidraw with the Rust engine and run the same Excalidraw flow
  prompts.
- [x] Verify generic Read fallback does not increase.
- [x] Verify generic Grep/Bash fallback does not increase.
- [x] Verify Flow section connectivity does not regress for prompts that were
  already connected.
- [x] Record any differences as graph coverage, scope shallow, scope noisy, or
  agent ignored evidence.
- [x] Store guardrail results in a compact repo document.

### 12. Packaging And Release Readiness

- [x] Decide how the Rust binary is built for local development.
- [x] Decide how the Rust binary is included in per-platform bundles.
- [x] Ensure npm install and npx behavior remain unchanged when Rust is unused.
- [x] Ensure the experimental Rust path is absent or clearly unavailable on
  unsupported platforms.
- [x] Add documentation for the experimental flag and rollback path.
- [x] Add a changelog entry only when the feature becomes user-visible.

### 13. Stop / Continue Decision

- [x] Confirm semantic parity is good enough for JS/TS/JSX/TSX.
- [x] Confirm TypeScript resolver handoff works.
- [x] Confirm TypeScript MCP/Explore can use Rust-produced indexes.
- [x] Confirm performance or memory hard gates pass on this repository.
- [x] Confirm performance or memory hard gates pass on Excalidraw.
- [x] Confirm Agent Sufficiency guardrails do not regress.
- [x] If all checks pass, propose Phase 2 language expansion issues.
- [x] If any hard gate fails, document the failure and keep Rust indexer
  experimental/off by default.

## Original Issue Breakdown

This original breakdown is complete; later GitHub issue numbers map to these
work items rather than the A-L labels.

- [x] Issue A: Add Cargo workspace and Rust core CLI skeleton.
- [x] Issue B: Add TypeScript index-engine selection seam and opt-in flag/env.
- [x] Issue C: Define Rust subprocess protocol, progress events, and error
  contract.
- [x] Issue D: Implement SQLite writer, metadata, lock discipline, and
  failure-safe writes.
- [x] Issue E: Implement native tree-sitter parser for JS/TS/JSX/TSX.
- [x] Issue F: Port semantic extraction slice for JS/TS/JSX/TSX.
- [x] Issue G: Wire Rust extraction to existing TypeScript resolver handoff.
- [x] Issue H: Add semantic parity comparator and fixture suite.
- [x] Issue I: Add CLI/MCP integration tests for Rust-produced indexes.
- [x] Issue J: Run performance and memory benchmark gates.
- [x] Issue K: Run Agent Sufficiency guardrail matrix.
- [x] Issue L: Document stop/continue decision and next phase.

## Agent Handoff Notes

- Prefer the existing public seams first: CLI `index`, SQLite index readability,
  MCP `zcodegraph_explore`, and existing graph/query APIs.
- Do not start by migrating all languages. The first useful slice is JS/TS only.
- Do not bypass the TypeScript resolver in Phase 1. The Rust core should produce
  extraction data that the existing resolver can finish.
- Do not optimize for byte-identical output. Optimize for stable semantic
  contract, Agent Sufficiency, and the hard performance/memory gates.
- Keep the Rust engine opt-in after Phase 1; the stop/continue decision allows
  more experimental work, not default rollout.
- Phase 1 stop/continue decision:
  [Rust Indexing Core Phase 1 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md).

## Local Validation

For the Phase 1 skeleton slice, run:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/rust-parity.test.ts
cargo test
node scripts/rust-parity-check.mjs --repo .
node scripts/rust-parity-check.mjs --repo /path/to/excalidraw
node scripts/rust-index-benchmark.mjs --repo zcodegraph=. --repo excalidraw=/path/to/excalidraw
node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/path/to/excalidraw
```

CI decision for the skeleton: keep `cargo test` as local validation until the
first Rust write/read slice lands. Once the Rust core writes metadata safely and
TypeScript can read it back, add `cargo test` to CI with the matching CLI
integration coverage.

## 2. `docs/plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md`

# Rust Indexing Core Phase 2 Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 1 Plan](2026-06-12-rust-indexing-core-phase-1.md)

Phase 1 decision: [Rust Indexing Core Phase 1 Stop/Continue Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-1-decision.md)

Phase 2 status: complete

Phase 2 results: [Rust Indexing Core Phase 2 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md)

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
  default rollout remains blocked by the #69 decision.

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
- [x] [#70](https://github.com/jununfly/ZCodeGraph/issues/70): Track and close
  the Phase 2 packaging, CI, and performance-hardening plan.

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

Bundle and npm smoke validation was added during Phase 2 as part of the release
bundle and npm platform package packaging stages.

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

## 3. `docs/plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md`

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

## 4. `docs/plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md`

# Rust Indexing Core Phase 4 Default Rollout Readiness Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 3 Production Hardening Plan](2026-06-13-rust-indexing-core-phase-3-production-hardening.md)

Phase 3 results: [Rust Indexing Core Phase 3 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md)

Phase 4 results and decision: [Rust Indexing Core Phase 4 Results And Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Phase 4 decision-producing work is complete. Branch B, continue opt-in hardening.
Rust remains opt-in. Branch A/default-rollout gates did not pass. Branch A is blocked.
The follow-up rollout blockers named in the decision document must be addressed
before Branch A can be reconsidered.

## Goal

Phase 4 aims to collect the missing rollout-readiness evidence and perform one
bounded optimization so that, if the gates pass, the next artifact can be a
Rust default-rollout plan.

Rust remains opt-in throughout Phase 4. The TypeScript indexer remains the
default for `zcodegraph index`, npm/npx users, MCP hosts, release bundles, and
all existing install flows.

## Current Evidence

Phase 3 established that the opt-in Rust JavaScript, TypeScript, JSX, and TSX
indexing path is packageable, locally diagnosable, failure-safe, and sufficient
on the pinned ZCodeGraph, Excalidraw, and Zustand validation targets.

The remaining rollout-readiness gaps are:

- Phase 3 did not require Rust to be faster than TypeScript end-to-end.
- Phase 3 macOS peak-RSS sampling returned `null`, so memory evidence must be
  made repeatable before using RSS as a rollout argument.
- The Rust path still pays TypeScript-side finalization costs for framework
  post-extract work, reference resolution, dynamic-dispatch synthesis, and DB
  maintenance.
- The validation set needs one larger JavaScript/TypeScript target to expose
  finalization and RSS behavior at a scale beyond Excalidraw.
- Real release-cycle npm/npx consumption evidence is still a prerequisite for a
  future default-rollout plan, but it is not a Phase 4 completion gate.

## Current Decisions

- [ ] Target decision branch A: prepare a default-rollout plan only if Phase 4
  evidence supports it.
- [ ] Keep Rust opt-in for the whole phase.
- [ ] Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX,
  and TSX.
- [ ] Improve measurement before making optimization claims.
- [ ] Require one bounded, data-driven optimization trial.
- [ ] Require matching tests and benchmark/profile evidence for every Phase 4
  implementation issue.
- [ ] Use ZCodeGraph, Excalidraw, and Zustand as hard-gate repositories.
- [ ] Use VS Code as the default large JavaScript/TypeScript readiness target,
  with a documented same-class replacement allowed if VS Code is too expensive
  for the local validation environment.
- [ ] Do not publish npm packages, trigger GitHub Releases, push release tags,
  or change the default engine in Phase 4.

## Non-Goals

- Do not make Rust the default index engine.
- Do not write or execute the default-rollout plan during Phase 4.
- Do not migrate additional languages.
- Do not rewrite MCP, installer, Explore planning, Explore rendering, or MCP
  tool surfaces.
- Do not migrate ReferenceResolver, framework resolvers, or dynamic-dispatch
  synthesizers to Rust.
- Do not change graph semantics to trade coverage or Agent Sufficiency for
  speed.
- Do not remove heuristic edges, reduce symbol coverage, or weaken Explore
  sufficiency as an optimization tactic.
- Do not add telemetry or upload diagnostics.
- Do not require npm/npx users to compile Rust locally.

## Branch A Hard Gates

These hard gates decide whether Phase 4 evidence can support Branch A, a later
default-rollout plan. They are not the completion definition for the Phase 4
decision-producing work. Phase 4 can complete with Branch B or Branch C when the
evidence is sufficient to reject Branch A for now and identify the blocking
gates.

- ZCodeGraph, Excalidraw, and Zustand semantic parity remains acceptable for
  the Rust JS/TS/JSX/TSX slice.
- Agent Sufficiency guardrails show no increased generic Read/Grep fallback risk
  after Rust indexing on the three hard-gate repositories.
- Rust end-to-end wall-clock indexing is no more than 25% slower than
  TypeScript on each hard-gate repository.
- VS Code or the documented same-class large target has a readiness profile
  where Rust is no more than 50% slower than TypeScript.
- At least one reliable platform records valid peak-RSS data for TypeScript and
  Rust indexing; unavailable RSS must include a machine-readable reason rather
  than an unexplained `null`.
- Rust peak RSS shows no material regression against TypeScript and should show
  a clear reduction on at least one pressure repository.
- The data-driven optimization trial is `positive`, or it is `neutral but
  informative` and names the remaining rollout-blocking optimization target. A
  `negative` trial blocks branch A.
- Phase 3 package smoke, packed npm smoke, CI artifact contract, failure-safety
  matrix, local diagnostics, and default TypeScript safety checks continue to
  pass.
- Every implementation issue includes aligned tests and benchmark/profile
  evidence in the same branch of work.
- Rust remains opt-in through explicit `--engine rust` or
  `ZCODEGRAPH_INDEX_ENGINE=rust`.

## Validation Targets

| Repo | Role | Requirement |
|---|---|---|
| ZCodeGraph | Self-hosting JS/TS indexing corpus | Hard gate |
| Excalidraw | React/JSX flow and canvas corpus | Hard gate |
| Zustand | TS store/action corpus | Hard gate |
| VS Code | Large JS/TS readiness target | Readiness evidence |

VS Code is the default large target. If it is too expensive for a local
validation environment, Phase 4 may use a same-class large JavaScript/TypeScript
repository instead. The replacement must record the reason, repository URL,
commit, indexed file count, TypeScript/Rust profile, and sufficiency prompt.

## Phase 4 Execution Status

This table is the execution-status index for the original checklist below. The
checklist records planned scope; this table records what happened, where the
evidence lives, and which results block Branch A/default rollout. Phase 4 did
not choose default rollout, and Rust remains opt-in.

| Plan item | Status | Evidence |
|---|---|---|
| Profiling and RSS evidence baseline | Completed | [Profile baseline](../benchmarks/2026-06-13-rust-indexing-core-phase-4-profile-baseline.md), [Phase 4 results and decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md) |
| Data-driven optimization trial | Completed | [Optimization trial](../benchmarks/2026-06-13-rust-indexing-core-phase-4-optimization-trial.md) |
| Finalization follow-up | Completed; Branch A blocker remains | [#87](https://github.com/jununfly/ZCodeGraph/issues/87), [#91](https://github.com/jununfly/ZCodeGraph/issues/91), [Reference-resolution investigation](../benchmarks/2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md) |
| Large-target readiness validation | Completed; Branch A blocker remains | [Large-target readiness](../benchmarks/2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md), [Supported Node rerun](../benchmarks/2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md), [VS Code syntax-gap resolution](../benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md) |
| Release and packaging readiness refresh | Completed | [Readiness refresh](../benchmarks/2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md) |
| Decision document | Completed | [Phase 4 results and decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md) |
| Release-cycle npm/npx default-rollout evidence | Deferred / not a Phase 4 gate | [Phase 4 results and decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md) |

## Phase 4 Checklist

### 1. Profiling And RSS Evidence Baseline

- [ ] Extend `scripts/rust-index-profile.mjs` or the Phase 3 validation harness
  so peak RSS is reliable on at least one supported platform.
- [ ] When RSS is unavailable, emit a machine-readable reason instead of a bare
  `null`.
- [ ] Record TypeScript and Rust wall-clock time, peak RSS, source scanning,
  parsing/extraction, SQLite writing, subprocess handoff, and TypeScript
  finalization subphases.
- [ ] Record repository commit, file count, CLI version, Rust core version, Node
  version, OS, and architecture.
- [ ] Produce comparable before baselines for ZCodeGraph, Excalidraw, and
  Zustand.
- [ ] Add tests for profile JSON shape, RSS unavailable reasons, and summary
  artifact layout.
- [ ] Record benchmark/profile outputs in a Phase 4 results document or raw
  artifact directory referenced by the results document.

### 2. Data-Driven Optimization Trial

- [ ] Pick one measured Rust-path bottleneck from the Phase 4 baseline.
- [ ] Write the optimization hypothesis before implementation: which metric
  should improve and why.
- [ ] Implement one bounded optimization that is locally reversible and does not
  change graph semantics.
- [ ] Measure before/after on ZCodeGraph, Excalidraw, and Zustand.
- [ ] If the large target is ready, run the same readiness profile on VS Code or
  its documented replacement.
- [ ] Classify the result as:
  - `positive`: the target subphase drops at least 15% on one pressure repo, or
    Rust-vs-TypeScript slowdown narrows by at least 10 percentage points, with
    no parity or sufficiency regression.
  - `neutral`: the metrics do not materially improve, but the run identifies
    the next bottleneck or proves this direction is not worth expanding.
  - `negative`: the optimization regresses parity, sufficiency, RSS,
    wall-clock, or maintainability; the optimization must be reverted or
    quarantined.
- [ ] Add tests that protect the optimized behavior and prevent default
  TypeScript regressions.
- [ ] Add benchmark/profile evidence showing the trend classification.

### 3. Finalization Follow-Up

- [ ] If the optimization trial identifies a safe finalization target, perform
  one follow-up that reduces repeated DB queries, repeated scans, or unbatched
  resolver work.
- [ ] Keep ReferenceResolver, framework resolvers, dynamic-dispatch
  synthesizers, Explore planning, and Explore rendering in TypeScript.
- [ ] Verify semantic parity and Agent Sufficiency after the change.
- [ ] Verify default TypeScript indexing still behaves the same.
- [ ] If no safe finalization optimization remains, document the blocking
  reason and the next architectural decision that would be required.

### 4. Large Target Readiness Validation

- [ ] Pin a VS Code commit, or document the same-class replacement.
- [ ] Run TypeScript and Rust index profiles on the large target.
- [ ] Record wall-clock, peak RSS, finalization subphases, node/edge counts, and
  dominant bottleneck.
- [ ] Run at least one Explore sufficiency probe against the large target.
- [ ] Confirm Rust indexing does not increase generic Read/Grep fallback risk.
- [ ] Store raw artifacts plus a compact summary.
- [ ] Keep the large target out of the ordinary local test loop unless an
  explicit long-running validation command is used.

### 5. Release And Packaging Readiness Refresh

- [ ] Re-run local release bundle smoke for default TypeScript indexing,
  explicit Rust indexing, and missing packaged Rust binary behavior.
- [ ] Re-run packed npm smoke for optional platform package wiring, explicit
  Rust indexing, default TypeScript indexing, and no local Rust compilation.
- [ ] Re-run the Rust failure-safety matrix.
- [ ] Re-run CI artifact contract tests for all six release targets.
- [ ] Verify `zcodegraph status --json` still reports Rust readiness,
  discovery, last index engine, and latest local profile summary.
- [ ] Add or update tests for any changed package, bundle, or diagnostics
  behavior.
- [ ] Record benchmark/smoke outputs in the Phase 4 results artifacts.

### 6. Decision Document

- [ ] Write a Phase 4 results document with raw artifact locations, benchmark
  summary, RSS summary, optimization trend classification, large-target
  readiness evidence, package smoke results, and failure-safety results.
- [ ] Write a Phase 4 stop/continue decision.
- [ ] Choose one branch:
  - Branch A: prepare a default-rollout plan.
  - Branch B: continue opt-in hardening.
  - Branch C: stop Rust expansion and reassess the Rust-core/TypeScript-shell
    boundary.
- [ ] If choosing branch A, list the release-cycle evidence still required
  before changing the default engine.
- [ ] If choosing branch B or C, explain which gate blocked branch A.

## Default Rollout Readiness Criteria

Branch A is allowed only when Phase 4 evidence supports it:

- Hard-gate repositories pass semantic parity and Agent Sufficiency.
- Rust is no more than 25% slower than TypeScript on each hard-gate repository.
- The large target is no more than 50% slower.
- RSS evidence is valid, shows no material regression, and preferably shows a
  clear Rust advantage on at least one pressure repository.
- The optimization trial is `positive`, or `neutral but informative` with a
  concrete next optimization that can be included in the rollout plan.
- Package smoke, failure safety, CI artifact, diagnostics, and default
  TypeScript safety all pass.
- Release-cycle evidence can be scheduled without adding new infrastructure.

Release-cycle evidence remains outside the Phase 4 completion gate. Before a
future default engine change, the project still needs:

- At least one official release carrying Rust core optional platform packages.
- Post-release npm/npx explicit `--engine rust` smoke on macOS, Linux, and
  Windows.
- No unresolved packaging or install blockers from that release.
- Bug reports that can be separated by TypeScript/Rust engine metadata.
- A rollback plan that can restore TypeScript as the default without changing
  the MCP protocol or installer surface.

## Local Validation

Minimum local validation for Phase 4 implementation work:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts
node scripts/rust-index-profile.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand \
  --out /tmp/zcodegraph-rust-phase4/
```

Long-running readiness validation should additionally profile VS Code or the
documented same-class replacement and run the package smoke path:

```bash
node scripts/rust-index-profile.mjs \
  --repo vscode=/path/to/vscode
node scripts/rust-package-smoke.mjs \
  --bundle /path/to/extracted/zcodegraph-linux-x64 \
  --npm-root /path/to/release/npm \
  --out /tmp/zcodegraph-rust-phase4-package-smoke/
```

Any implementation issue that changes Rust indexing, TypeScript finalization,
packaging, diagnostics, or validation scripts must include both:

- targeted automated tests for the changed contract;
- benchmark/profile evidence showing the expected trend or explaining why the
  result is neutral/negative.

## Agent Handoff Notes

- Start with profiling and RSS evidence; do not optimize against a missing or
  unexplained baseline.
- Keep Rust opt-in until a later default-rollout plan explicitly changes that
  decision.
- Protect Agent Sufficiency first. A faster index that causes agents to Read or
  Grep more is a regression.
- Keep optimization bounded and reversible. If the data points toward a deeper
  resolver/synthesizer migration, record that as an architectural decision
  rather than slipping it into Phase 4.
- Treat VS Code as readiness evidence, not as part of the ordinary quick local
  test loop.
- Do not publish npm packages, trigger GitHub Releases, push tags, or change the
  default engine as part of Phase 4.

## 5. `docs/plans/2026-06-14-rust-indexing-core-phase-5-reference-resolution-bottleneck-burndown.md`

# Rust Indexing Core Phase 5 Reference Resolution Bottleneck Burndown Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

Phase 4 results and decision: [Rust Indexing Core Phase 4 Results And Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Tracker issue: [#95](https://github.com/jununfly/ZCodeGraph/issues/95)

Primary blocker issue: [#94](https://github.com/jununfly/ZCodeGraph/issues/94)

## Goal

Phase 5 reduces the remaining TypeScript finalization blocker that prevents a
Rust default rollout, starting with reference-resolution name matching and
unresolved-reference cleanup.

Phase 5 is a targeted blocker-reduction phase, not a default-rollout readiness
phase. Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows unless a later default-rollout plan explicitly changes that.

Phase 5 may produce a later default-rollout plan only if reference-resolution
cost is materially reduced, Agent Sufficiency stays green, and the final
decision classifies the Branch A blocker as resolved.

## Current Evidence

Phase 4 completed as Branch B: continue opt-in hardening. Branch A/default
rollout was not chosen.

The large-target evidence was validated on a large VS Code JS/TS sparse
checkout. It showed that the dominant blocker is TypeScript finalization,
specifically `referenceResolutionMs`, not Rust parse extraction.

The #87 investigation split `referenceResolutionMs` and identified
`databaseAccessMs` as the largest subpath in the VS Code sparse-checkout
profile. The #91 bounded optimization added public DB sub-buckets and attempted
edge-materialization and unresolved-cleanup optimizations, but it did not reduce
the large-target blocker enough to change the decision. The #91 after-profile
left `databaseAccessMs` and `nameMatchingMs` as the clearest remaining targets.

The next planned slice is #94: reduce repeated candidate lookup with grouped
name matching and replace unresolved-reference cleanup by text tuple with
rowid-based cleanup.

## Non-Goals

- Do not make Rust the default index engine.
- Do not write or execute a default-rollout plan during Phase 5 unless the
  Phase 5 decision first classifies the blocker as resolved.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and
  TSX.
- Do not migrate ReferenceResolver, framework resolvers, dynamic-dispatch
  synthesizers, Explore planning, or Explore rendering to Rust.
- Do not change graph semantics, edge kinds, node coverage, unresolved-reference
  behavior, or Agent Sufficiency behavior to win speed.
- Do not drop ambiguous references, skip per-reference disambiguation, or reduce
  candidate sets in a way that changes resolver behavior.
- Do not change the SQLite schema for unresolved-reference cleanup.
- Do not require release/npm/package smoke by default unless Phase 5 changes
  packaging, CLI engine selection, status diagnostics, Rust binary discovery, or
  release-bundle layout.
- Do not require multi-run benchmark statistics, end-to-end Rust over TypeScript
  wins, or zero parse errors as Phase 5 gates.

## Hard Constraints

- Grouped name matching may share candidate lookup across equivalent references,
  but each reference must still run the same per-reference disambiguation
  semantics as before.
- The default grouping key starts with `referenceName`, `referenceKind`, and
  `language`. If scope or context is required to preserve semantics, the group
  key must include that dimension rather than weakening resolution.
- Unresolved-reference cleanup should use SQLite `rowid` as an internal query
  projection and delete identity. It must not add a schema column or bump schema
  version.
- Any optimization must preserve import resolution, framework resolution,
  dynamic-dispatch synthesis, edge kind selection, target selection, and
  unresolved-reference retention behavior.
- Agent Sufficiency is a hard guardrail. Faster indexing that increases generic
  Read/Grep fallback risk is a regression.
- Every implementation issue must include aligned tests and benchmark/profile
  evidence sufficient to judge the trend.

## Required Profile Sub-Buckets

Phase 5 must make the reference-resolution cost breakdown public enough to judge
whether grouped lookup and cleanup changes worked.

The exact names can follow the local profiling style, but the profile artifact
must distinguish these concepts:

- shared candidate lookup;
- per-reference disambiguation;
- candidate lookup cache hit or reuse time, if represented separately;
- unresolved-reference batch reads;
- edge materialization;
- edge writes;
- unresolved-reference cleanup;
- total name matching;
- total database access;
- total reference resolution.

The raw JSON artifacts and human-readable summaries must expose enough of these
sub-buckets to classify the Phase 5 result without relying on ad hoc logs.

## Validation Matrix

### Reduced Fixture

Reduced fixture validation is required for the inner loop.

The fixture should create repeated unresolved references that stress repeated
candidate lookup and cleanup pressure. It must record before/after evidence
showing whether grouped candidate lookup and rowid cleanup improve the intended
sub-buckets.

### Hard-Gate Repo Smoke

ZCodeGraph, Excalidraw, and Zustand remain the hard-gate smoke repositories.

Phase 5 does not require full multi-run benchmarks on these repositories, but it
must run enough targeted tests, parity checks, or Agent Sufficiency guardrails to
show graph semantics and sufficiency did not regress.

### Large Target Final Validation

Phase 5 requires one final VS Code JS/TS sparse-checkout after-profile and one
Explore sufficiency smoke after the primary #94 work and any allowed second
candidate.

The large-target evidence must keep the downgraded wording:

> validated on a large VS Code JS/TS sparse checkout

It must not claim validation on full VS Code unless full VS Code is actually
used. It must not require zero parse errors.

### Conditional Packaging Smoke

Release/npm/package smoke is not a default Phase 5 gate. It becomes required
only if a Phase 5 issue changes packaging, CLI engine selection, status
diagnostics, Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 5 ends with exactly one classification:

- `resolved`: `referenceResolutionMs` is no longer the large-target dominant
  bottleneck, Agent Sufficiency stays green, graph semantics are preserved, and
  the remaining Rust-vs-TypeScript large-target gap is close enough to support a
  later default-rollout plan.
- `reduced but still blocking`: at least one target sub-bucket, such as
  `nameMatchingMs`, `databaseAccessMs`, or unresolved cleanup, drops by at least
  15% with no sufficiency or semantics regression, but Branch A/default rollout
  remains blocked.
- `still unresolved`: the target sub-buckets do not drop by at least 15%, or the
  after-profile does not provide enough rollout confidence.
- `regressed`: graph semantics, Agent Sufficiency, wall-clock, RSS, packaging
  safety, or maintainability regresses. The change must be reverted or
  quarantined before continuing.

Phase 5 does not pass by claiming end-to-end Rust is faster than TypeScript. It
passes by producing trustworthy blocker-reduction evidence and an honest
stop/continue decision.

## Issue Sequence

### 1. Phase 5 Plan And Doc Guardrails

- Write this Phase 5 plan.
- Add focused documentation tests that protect the Phase 5 positioning:
  targeted blocker reduction, Rust remains opt-in, no default-rollout claim, and
  validation on a large VS Code JS/TS sparse checkout.
- Create a Phase 5 tracker issue.

### 2. Reference-Resolution Profile Sub-Buckets

- Extend public profile output so reference-resolution cost can be interpreted.
- Distinguish shared candidate lookup, per-reference disambiguation,
  unresolved-reference reads, edge writes, cleanup, total name matching, total
  database access, and total reference resolution as far as the implementation
  can measure them.
- Add tests for profile JSON shape and summary rendering.
- Do not optimize resolver behavior in this issue beyond instrumentation needed
  to make the next issue measurable.

### 3. Grouped Name Matching And Rowid Cleanup

- Implement #94.
- Group unresolved references enough to share candidate lookup across equivalent
  `referenceName`, `referenceKind`, and `language` groups while preserving
  per-reference disambiguation semantics.
- Expose internal unresolved-reference `rowid` in batch reads and delete
  processed unresolved-reference rows by row identity.
- Do not change SQLite schema or unresolved-reference semantics.
- Use reduced fixture before/after evidence for quick iteration.
- Run hard-gate repo smoke.
- Run one final VS Code JS/TS sparse-checkout after-profile and Explore
  sufficiency smoke.
- Classify #94 as `resolved`, `reduced but still blocking`, `still unresolved`,
  or `regressed` before deciding whether to continue.

### 4. Optional Bounded Second Candidate

This issue exists only if #94 is `reduced but still blocking` and the
after-profile clearly identifies one largest remaining actionable sub-bucket.

- The second candidate must be one bounded issue.
- It must start with a written hypothesis.
- It must use a reduced fixture for quick iteration.
- It must preserve graph semantics and Agent Sufficiency.
- It must end with one final VS Code JS/TS sparse-checkout after-profile and
  Explore sufficiency smoke.
- If #94 is `resolved`, `still unresolved`, or `regressed`, skip this issue and
  move directly to the Phase 5 decision.

### 5. Phase 5 Results And Decision

- Write `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md`.
- Record reduced fixture evidence, hard-gate smoke results, VS Code
  sparse-checkout profile, sufficiency smoke, profile sub-bucket interpretation,
  and raw artifact locations.
- Classify Phase 5 as `resolved`, `reduced but still blocking`,
  `still unresolved`, or `regressed`.
- State whether Branch A/default rollout remains blocked.
- If the blocker is resolved, authorize a later default-rollout plan rather than
  changing the default engine directly.
- If the blocker remains, name the next bottleneck or architectural decision.
- Update this plan's execution status section.
- Lightly link Phase 4 historical docs to the Phase 5 follow-up if needed, but
  do not rewrite Phase 4's Branch B decision.

## Phase 5 Execution Status

| Plan item | Status | Evidence |
|---|---|---|
| Phase 5 plan and tracker | Completed | This plan, [#95](https://github.com/jununfly/ZCodeGraph/issues/95) |
| Reference-resolution profile sub-buckets | Completed | [#96](https://github.com/jununfly/ZCodeGraph/issues/96); profiler artifacts expose `candidateLookupMs`, `sharedCandidateLookupMs`, `candidateLookupCacheHitMs`, `perReferenceDisambiguationMs`, `unresolvedReadMs`, `edgeWriteMs`, `unresolvedCleanupMs`, `nameMatchingMs`, `databaseAccessMs`, and `referenceResolutionMs` |
| Grouped name matching and rowid cleanup | Completed | [#94](https://github.com/jununfly/ZCodeGraph/issues/94); classified `still unresolved` in `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md` |
| Optional bounded second candidate | Skipped | #94 did not classify as `reduced but still blocking` |
| Phase 5 results and decision | Completed | `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md`; classified `still unresolved`, Branch A/default rollout remains blocked |

## Local Validation

Minimum validation for Phase 5 documentation-only work:

```bash
npx vitest run __tests__/rust-phase4-*.test.ts
git diff --check
```

Minimum validation for Phase 5 implementation work:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts
node scripts/rust-sufficiency-guardrail.mjs
```

Implementation issues must additionally run their reduced fixture
before/after, hard-gate smoke, and the final VS Code JS/TS sparse-checkout
profile plus Explore sufficiency smoke required by this plan.

## Agent Handoff Notes

- Start with profile visibility. Do not optimize against a sub-bucket that is
  not visible in durable artifacts.
- Treat #94 as the primary Phase 5 implementation slice.
- Preserve resolver semantics. Shared lookup is allowed; weakened
  disambiguation is not.
- Keep Rust opt-in. Do not claim default rollout readiness from partial
  blocker-reduction evidence.
- Stop after one bounded second candidate at most.
- Record a decision even if the result is negative or unresolved.

## 6. `docs/plans/2026-06-14-rust-indexing-core-phase-6-js-ts-completeness.md`

# Rust Indexing Core Phase 6 JS/TS Completeness Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 5 Reference Resolution Bottleneck Burndown Plan](2026-06-14-rust-indexing-core-phase-5-reference-resolution-bottleneck-burndown.md)

Phase 5 results and decision: [Rust Indexing Core Phase 5 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md)

## Goal

Phase 6 is a JS/TS Rust indexing completeness phase.

The goal is to make the opt-in Rust indexing path more complete and trustworthy
for JavaScript, TypeScript, JSX, and TSX extraction while preserving the
TypeScript product shell. Phase 6 does not try to make Rust the default engine.
It does not migrate ReferenceResolver, framework resolvers, dynamic-dispatch
synthesizers, graph traversal, MCP tools, Explore planning, or Explore
rendering to Rust.

Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows unless a later default-rollout plan explicitly changes that.

Phase 6 also produces a Rust end-to-end graph pipeline feasibility decision.
That decision should answer whether the next planning step should be a
prototype for migrating more of the graph production pipeline to Rust, but Phase
6 itself does not implement that end-to-end migration.

## Current Evidence

The PRD chose a narrow Rust indexing core vertical slice: JavaScript,
TypeScript, JSX, and TSX extraction in Rust, with the TypeScript shell still
owning resolution, dynamic synthesis, Explore, MCP, installer behavior, and
release orchestration.

Phase 5 classified the reference-resolution blocker as `still unresolved`.
The large-target evidence was validated on a large VS Code JS/TS sparse
checkout. It showed that the remaining bottleneck is not Rust parse extraction;
it is TypeScript finalization, specifically `referenceResolutionMs`, with
`nameMatchingMs` and `perReferenceDisambiguationMs` as the clearest subpaths.

That evidence makes a default-rollout readiness plan premature. It also makes a
direct resolver rewrite premature. Phase 6 therefore focuses on finishing the
current Rust indexing slice and producing better evidence for whether an
end-to-end graph pipeline prototype is worth opening next.

## Non-Goals

- Do not make Rust the default index engine.
- Do not claim default rollout readiness.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and TSX.
- Do not migrate ReferenceResolver, name matching, framework resolvers,
  dynamic-dispatch synthesizers, graph traversal, MCP tools, Explore planning,
  or Explore rendering to Rust.
- Do not change graph semantics, edge kinds, unresolved-reference behavior, or
  Agent Sufficiency behavior to make metrics look better.
- Do not require Rust to beat TypeScript end-to-end in Phase 6.
- Do not require release/npm/package smoke by default unless a Phase 6 issue
  changes packaging, CLI engine selection, status diagnostics, Rust binary
  discovery, or release-bundle layout.
- Do not require zero parse errors on large real repositories.

## Scope

Phase 6 prioritizes:

1. Extraction semantic coverage.
2. Benchmark and diagnostic completeness.
3. Operational completeness.

The implementation order is A -> C -> B from the planning discussion:

- A: JS/TS/JSX/TSX Rust extraction coverage and semantic parity.
- C: diagnostics, benchmark attribution, snapshot comparison, and feasibility
  decision evidence.
- B: operational hardening for the opt-in Rust path.

## Hard Constraints

- Rust remains opt-in throughout Phase 6.
- The graph semantic schema remains stable. Phase 6 may add or extend durable
  diagnostic artifacts or metadata, but it must not change node, edge, or
  unresolved-reference semantics without a separate explicit migration
  decision.
- Any metadata addition must be non-disruptive for existing TypeScript readers.
- Agent Sufficiency must not regress.
- JS/TS semantic parity must not regress.
- A final large-target profile and sufficiency smoke are required, using the
  wording: validated on a large VS Code JS/TS sparse checkout.
- Completeness + minimum performance floor: Phase 6 does not require Rust to
  exceed TypeScript, but Rust engine wall time, `referenceResolutionMs`, and RSS
  should not regress materially, with a default investigation threshold of
  10-15% unless the issue records a concrete explanation and follow-up.

## Validation Matrix

### Semantic Coverage

Rust extraction coverage should be compared through semantic parity, not
byte-identical database output. The important facts are symbols, imports,
exports, calls, contains edges, unresolved references, components, class fields,
object-literal methods, and JS/TS/JSX/TSX file behavior that downstream
TypeScript resolution expects.

### Agent Sufficiency

Representative Explore sufficiency prompts must remain green. A faster or more
complete Rust index that increases generic Read/Grep fallback risk is a
regression.

### Large Target

Phase 6 requires one final profile and one final sufficiency smoke validated on
a large VS Code JS/TS sparse checkout.

The large-target gate records trend evidence. It does not require Rust to beat
TypeScript, and it does not authorize default rollout.

### Packaging And Release

Release/npm/package smoke is not a default Phase 6 gate. It becomes required
only for issues that change packaging, CLI engine selection, status diagnostics,
Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 6 ends with exactly one classification:

- `ready for end-to-end prototype`: JS/TS Rust indexing completeness is strong
  enough, sufficiency stays green, operational risk is controlled, and the
  feasibility decision recommends a bounded Rust graph-pipeline prototype.
- `continue Rust indexing completeness`: the Rust indexing path improves, but
  coverage, diagnostics, or operational gaps remain before an end-to-end
  prototype is justified.
- `stop Rust expansion`: evidence shows that expanding Rust scope is not
  currently justified compared with improving the TypeScript resolver or other
  product work.
- `regressed`: semantic parity, Agent Sufficiency, failure safety, wall time,
  RSS, packaging safety, or maintainability regresses.

Phase 6 does not pass by claiming default rollout readiness. It passes by
making the opt-in JS/TS Rust indexing path more complete and by producing a
clear stop/continue/prototype decision.

## Issue Sequence

### 1. Phase 6 Plan And Doc Guardrails

- Write this Phase 6 plan.
- Add focused documentation tests that protect the Phase 6 positioning:
  JS/TS Rust indexing completeness, Rust remains opt-in, no default rollout
  claim, no Rust end-to-end graph migration during Phase 6, and validation on a
  large VS Code JS/TS sparse checkout.
- Create a Phase 6 tracker issue.

### 2. Extraction Semantic Coverage: Symbols And References

- Improve JS/TS/JSX/TSX Rust extraction coverage for symbol and reference facts
  that TypeScript downstream resolution expects.
- Focus on modules, exports, imports, unresolved references, class fields, and
  object-literal method facts where parity gaps are observable.
- Add semantic parity tests through public CLI/indexing seams.
- Do not change resolver semantics.

### 3. Extraction Semantic Coverage: Edges And Components

- Improve JS/TS/JSX/TSX Rust extraction coverage for graph-producing facts such
  as calls, contains edges, JSX/component facts, and edge prerequisites used by
  later TypeScript synthesis.
- Add semantic parity and sufficiency guardrails for the affected behavior.
- Do not migrate dynamic-dispatch synthesis to Rust in this phase.

### 4. Diagnostics, Benchmark Attribution, And Feasibility Decision

- Improve durable diagnostics and benchmark attribution enough to judge the
  Rust indexing path without ad hoc logs.
- Record final profile evidence, snapshot/parity interpretation, and sufficiency
  evidence.
- Write a Rust end-to-end graph pipeline feasibility decision that answers
  `go`, `no-go`, or `prototype-first`, and lists candidate migration boundaries
  such as name matcher only, reference resolver only, and dynamic synthesizers
  later.
- Do not implement the end-to-end Rust graph pipeline in this issue.

### 5. Operational Completeness Closeout

- Close operational gaps for the opt-in Rust indexing path that remain after the
  coverage and diagnostics slices.
- Run one final large VS Code JS/TS sparse-checkout profile and sufficiency
  smoke.
- Run package/release smoke only if the implementation changed packaging, CLI
  engine selection, status diagnostics, Rust binary discovery, or release-bundle
  layout.
- Write the Phase 6 results-and-decision document.
- Classify Phase 6 as `ready for end-to-end prototype`, `continue Rust indexing
  completeness`, `stop Rust expansion`, or `regressed`.

## Local Validation

Minimum validation for Phase 6 documentation-only work:

```bash
npx vitest run __tests__/rust-phase6-plan-doc.test.ts
git diff --check
```

Minimum validation for Phase 6 implementation work:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-index-profile.test.ts
```

Implementation issues must additionally run their targeted parity/sufficiency
tests and any final large-target profile or sufficiency smoke required by their
acceptance criteria.

## Agent Handoff Notes

- Keep Phase 6 scoped to JS/TS/JSX/TSX Rust indexing completeness.
- Treat end-to-end Rust graph pipeline migration as a future feasibility
  decision, not an implementation task in Phase 6.
- Preserve graph semantics and Agent Sufficiency.
- Keep Rust opt-in.
- Do not turn large-target trend evidence into a default rollout claim.

## 7. `docs/plans/2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md`

# Rust Indexing Core Phase 7 Guarded Name Matcher Prototype Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on:

- [Rust Indexing Core Phase 6 JS/TS Completeness Plan](2026-06-14-rust-indexing-core-phase-6-js-ts-completeness.md)
- [Rust Indexing Core Phase 6 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-6-results-and-decision.md)
- [Rust End-To-End Graph Pipeline Feasibility Decision](../design/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md)

## Goal

Phase 7 is a guarded Rust-assisted name matcher prototype.

The goal is to replace the actual ReferenceResolver name-matching subpath for a
bounded JS/TS/JSX/TSX subset behind an explicit opt-in flag, while preserving
the TypeScript resolver orchestration, candidate lookup, graph mutation,
framework resolvers, dynamic-dispatch synthesizers, MCP tools, Explore
planning, and Explore rendering.

Rust remains opt-in. TypeScript remains the default resolver path unless a
later plan explicitly promotes the guarded Rust matcher. Phase 7 does not claim
default rollout readiness.

## Current Evidence

The PRD chose a narrow Rust indexing core vertical slice and explicitly kept
ReferenceResolver, framework resolvers, dynamic-dispatch synthesizers, MCP, and
Explore in TypeScript for the first migration stage.

Phase 5 showed that the remaining large-target blocker is TypeScript
finalization, especially `referenceResolutionMs`, with `nameMatchingMs`,
`databaseAccessMs`, and `perReferenceDisambiguationMs` as important subpaths.

Phase 6 improved JS/TS Rust extraction completeness and classified the next
step as `ready for end-to-end prototype`, but not default rollout. The
feasibility decision selected `prototype-first`, with `name matcher only` as
the first candidate migration boundary.

## Non-Goals

- Do not make Rust the default resolver or default index engine.
- Do not claim default rollout readiness.
- Do not change SQLite schema.
- Do not migrate ReferenceResolver orchestration wholesale.
- Do not migrate import resolution, framework resolvers, dynamic-dispatch
  synthesizers, graph traversal, MCP tools, Explore planning, or Explore
  rendering to Rust.
- Do not let Rust write edges or delete unresolved references.
- Do not let Rust query project SQLite directly in Phase 7.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and
  TSX.
- Do not improve matcher semantics in Phase 7. This phase is a
  behavior-preserving port of the existing matcher heuristics.
- Do not require Rust to beat TypeScript end-to-end.
- Do not require RSS improvement, only RSS evidence or an unavailable reason.
- Do not require release/npm/package smoke unless packaging, CLI/status, Rust
  binary discovery, or release-bundle paths are changed.

## Hard Constraints

- Rust remains opt-in.
- Phase 7 uses a guarded actual resolver path, not shadow-only mode.
- TypeScript performs candidate lookup and passes candidate facts to Rust.
- Rust receives a narrow batch protocol and returns only matcher decisions and
  diagnostics.
- TypeScript remains responsible for edge writes and unresolved-reference
  cleanup.
- Per-reference disambiguation semantics must not change.
- Existing matcher heuristics must be ported behavior-preservingly.
- Unsupported, ambiguous, erroring, or semantic-mismatching Rust results must
  fall back to the TypeScript matcher in the default guarded mode.
- A strict development mode may fail on semantic mismatch, but unguarded Rust
  matcher output is not a Phase 7 product path.
- Batch subprocess is allowed; per-reference subprocess is not allowed.
- A long-running Rust matcher daemon is out of scope.

## Narrow Protocol

Phase 7 may add a narrow TypeScript-to-Rust batch protocol.

TypeScript sends:

- unresolved reference facts;
- exact-name, qualified-name, lower-name, and other candidate sets already
  selected by the TypeScript resolver context;
- file and language context required by the existing matcher heuristics;
- the minimal node facts required for behavior-preserving disambiguation.

Rust returns:

- `targetNodeId | null`;
- `confidence`;
- `resolvedBy`;
- `fallbackReason?`;
- per-batch and per-reference timing diagnostics.

Rust must not:

- query SQLite directly;
- write graph edges;
- delete unresolved references;
- invoke import, framework, dynamic synthesis, MCP, or Explore code.

## Matcher Coverage Strategy

Phase 7's end goal is complete matcher coverage within the narrow candidate
protocol boundary. Implementation should still proceed as tracer bullets:

1. Exact-name and qualified-name matcher path.
2. Method/member and path-proximity disambiguation.
3. File-path, partial-qualified, lower-name, and remaining matcher branches
   that do not require expanding the boundary.
4. Full guarded matcher coverage gate and fallback taxonomy.

If a matcher branch requires importing a broader resolver responsibility, that
branch must stay in TypeScript and record a fallback reason.

## Metrics

Primary metrics:

- `nameMatchingMs`;
- `perReferenceDisambiguationMs`;
- `rustMatcherHandledRefs / rustMatcherEligibleRefs`.

Required Rust matcher diagnostics:

- `rustMatcherMs`;
- `rustMatcherStartupMs`;
- `rustMatcherSerializationMs`;
- `rustMatcherEligibleRefs`;
- `rustMatcherHandledRefs`;
- `rustMatcherFallbackRefs`;
- `rustMatcherSemanticMismatchRefs`;
- fallback reason taxonomy.

Secondary metrics:

- `referenceResolutionMs`;
- `candidateLookupMs`;
- `databaseAccessMs`;
- Rust engine wall time;
- RSS or `rssUnavailableReason`.

Safety metrics:

- semantic mismatch count;
- fallback count by reason;
- resolved edge count delta;
- unresolved reference count delta;
- deterministic sufficiency Read/Grep fallback signals.

## Validation Matrix

### Semantic Equivalence

Targeted semantic snapshots must compare Rust-enabled guarded matcher output
against the TypeScript matcher baseline. Resolved edges and unresolved
references must not change unless a later explicit resolver-semantics issue
allows it.

### Agent Sufficiency

Representative Explore sufficiency prompts must stay green. A faster matcher
that increases deterministic Read/Grep fallback risk is a regression.

### Performance Attribution

Reduced fixtures are the inner loop for performance and semantic debugging.
They must show whether Rust matcher handling, fallback, startup, and
serialization costs explain the trend.

### Large Target

Phase 7 requires one final profile and one final sufficiency smoke validated on a large VS Code JS/TS sparse checkout.

The large-target gate records trend evidence. It does not require end-to-end
Rust to beat TypeScript and does not authorize default rollout.

### RSS

RSS improvement is not required. RSS or `rssUnavailableReason` must be recorded.
Material RSS regression should be explained and tracked, but RSS alone should
not fail Phase 7 unless it causes runtime instability.

### Packaging And Release

Release/npm/package smoke is not a default Phase 7 gate. It becomes required
only if implementation changes packaging, CLI engine selection, status
diagnostics, Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 7 ends with exactly one classification:

- `promote to guarded resolver path`: Rust matcher semantics are equivalent,
  fallback and mismatch rates are controlled, reduced fixture trends improve,
  VS Code sparse sufficiency stays green, and large-target evidence supports
  keeping or expanding the guarded path.
- `continue matcher prototype`: semantics are mostly controlled, but coverage,
  startup/serialization overhead, branch support, or memory/runtime evidence
  blocks promotion.
- `abandon Rust matcher`: behavior-preserving Rust matcher cost or complexity
  is not justified compared with TypeScript resolver/data-model optimization.
- `regressed`: semantic snapshots, Agent Sufficiency, runtime stability, wall
  time, RSS, or maintainability regresses.

Phase 7 cannot pass by claiming default rollout readiness. It passes by
answering whether a guarded Rust matcher path should be promoted, continued, or
abandoned.

## Issue Sequence

### 1. Phase 7 Plan And Guardrails

- Write this Phase 7 plan.
- Add focused documentation tests that protect the Phase 7 positioning:
  guarded actual resolver path, Rust remains opt-in, narrow protocol, no schema
  change, no default rollout, and validation on a large VS Code JS/TS sparse
  checkout.
- Create a Phase 7 tracker issue.

### 2. Narrow Protocol And Exact/Qualified Tracer Bullet

- Add the TypeScript-to-Rust batch protocol behind an opt-in flag.
- Implement exact-name and qualified-name matcher support as the first
  behavior-preserving Rust matcher slice.
- Add semantic snapshot tests and unsupported fallback tests.
- Do not change graph mutation semantics.

### 3. Complete Matcher Branches Within The Narrow Boundary

- Port remaining matcher branches that fit the narrow candidate protocol:
  method/member, path proximity, partial-qualified, file-path, lower-name, and
  related existing heuristics.
- Keep import, framework, dynamic synthesis, and broader resolver behavior in
  TypeScript.
- Record fallback reasons for branches outside the boundary.

### 4. Guarded Actual Resolver Integration

- Wire the guarded Rust matcher into the actual resolver path under an opt-in
  flag.
- Add fallback behavior for unsupported, ambiguous, error, and semantic
  mismatch outcomes.
- Add counters for handled refs, eligible refs, fallback refs, mismatch refs,
  and fallback reasons.
- Verify that default TypeScript resolver behavior remains unchanged.

### 5. Benchmark Attribution And Reduced Fixture Optimization

- Add durable profile buckets for Rust matcher startup, serialization, matcher
  execution, handled refs, fallback refs, mismatch refs, and coverage.
- Run reduced fixture profiles to judge whether Rust matcher work moves the
  intended subpaths.
- Keep evidence trend-based; do not require end-to-end TypeScript defeat.

### 6. Large-Target Closeout Decision

- Run one final large VS Code JS/TS sparse-checkout profile.
- Run one final large VS Code JS/TS sparse-checkout sufficiency smoke.
- Record raw artifacts and a Phase 7 results-and-decision document.
- Classify Phase 7 as `promote to guarded resolver path`, `continue matcher
  prototype`, `abandon Rust matcher`, or `regressed`.

### 7. Tracker

- Track the six implementation issues.
- Link final artifacts and classification.

## Local Validation

Minimum validation for Phase 7 documentation-only work:

```bash
npx vitest run __tests__/rust-phase7-plan-doc.test.ts
git diff --check
```

Minimum validation for Phase 7 implementation work:

```bash
npm run build
npx vitest run __tests__/resolution.test.ts
npx vitest run __tests__/rust-index-profile.test.ts
```

Implementation issues must additionally run targeted semantic snapshot tests,
Rust matcher tests, focused profile tests, and any final large-target profile
or sufficiency smoke required by their acceptance criteria.

## Agent Handoff Notes

- Keep Phase 7 scoped to a guarded Rust-assisted name matcher.
- Preserve the actual resolver path only through the guarded opt-in integration.
- Preserve per-reference disambiguation semantics.
- Keep candidate lookup in TypeScript.
- Keep graph mutation in TypeScript.
- Use fallback instead of semantic drift.
- Do not turn prototype evidence into a default rollout claim.

## 8. `docs/plans/2026-06-14-rust-indexing-core-phase-8-matcher-viability-hardening.md`

# Rust Indexing Core Phase 8 Matcher Viability Hardening And Go/No-Go Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on:

- [Phase 7 Guarded Name Matcher Prototype Plan](2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md)
- [Phase 7 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-7-results-and-decision.md)
- GitHub tracker: #119
- Related graph coverage gap: #113

## Goal

Phase 8 exists to judge whether the guarded Rust matcher is worth continuing.
It is a matcher viability hardening and go/no-go phase, not a resolver migration
phase and not a default rollout phase.

Rust remains opt-in. TypeScript remains the default resolver path. Phase 8
continues the guarded actual resolver path from Phase 7, where TypeScript owns
candidate lookup, import/framework orchestration, graph mutation, edge writes,
unresolved-reference cleanup, and semantic verification.

## Phase 7 Baseline

The Phase 7 large-target baseline is the VS Code sparse checkout at commit `4ac5322601c`, with 1,725 JS/TS source files and 1,727 copied JS/TS/config files in the profile harness.

Baseline profile:

- `rustMatcherMs`: 20,699
- `rustMatcherSerializationMs`: 838
- `rustMatcherEligibleRefs`: 145,320
- `rustMatcherHandledRefs`: 104,375
- `rustMatcherFallbackRefs`: 48,800
- `rustMatcherSemanticMismatchRefs`: 12
- `rustMatcherFallbackReasons`: `{ "unresolved": 48788, "semantic-mismatch": 12 }`
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

Baseline sufficiency smoke:

- No Rust-specific sufficiency regression.
- TypeScript and Rust outputs both lacked a connected Flow section for `VS-1`.
- The missing Flow section is tracked separately in #113 and is not a Phase 8 blocker.

## Non-Goals

- Do not make Rust the default resolver or default index engine.
- Do not claim default rollout readiness.
- Do not change SQLite schema.
- Do not let Rust query project SQLite directly.
- Do not let Rust write edges or delete unresolved references.
- Do not migrate import resolution, framework resolvers, or dynamic-dispatch synthesizers.
- Do not migrate graph traversal, MCP tools, Explore planning, or Explore rendering to Rust.
- Do not change per-reference disambiguation semantics.
- Do not use unguarded Rust matcher output as a product path.
- Do not make #113 a Phase 8 blocker unless root cause is proven matcher-specific.
- Do not require release/npm/package smoke unless packaging, CLI/status, Rust binary discovery, or release-bundle paths change.

## Hard Gates

Phase 8 must produce evidence for all of these:

- `rustMatcherSemanticMismatchRefs` reaches 0 on the reduced fixture and the same VS Code sparse scope, or every mismatch class is downgraded to explicit guarded fallback.
- The fallback taxonomy is decision-oriented and no longer hides tens of thousands of refs in a single opaque `unresolved` bucket.
- At least one true `rust-unresolved` matcher gap is fixed without expanding the architecture boundary.
- Cost attribution separates candidate materialization, JSON serialization, subprocess handoff, Rust matching, and TypeScript verification where feasible.
- Candidate payload dedup is attempted once as a bounded optimization.
- The same VS Code sparse scope is rerun for before/after profile and sufficiency smoke.
- RSS or `rssUnavailableReason` is recorded.

## Allowed Protocol Changes

Phase 8 may change the narrow TypeScript-to-Rust matcher protocol when the
change supports diagnostics, fallback taxonomy, or bounded payload dedup.

Allowed:

- Diagnostic traces for reference facts, candidate facts, TypeScript decisions,
  Rust decisions, confidence, `resolvedBy`, and fallback reason.
- Additional candidate facts, as long as TypeScript still supplies them.
- Batch-level candidate tables with per-reference candidate keys.
- Timing fields for candidate materialization, serialization, subprocess,
  Rust matching, and TypeScript verification.

Not allowed:

- Rust direct SQLite reads.
- Rust graph mutation.
- Rust ownership of import, framework, or dynamic resolver behavior.
- Schema changes.

## Success Classification

Phase 8 ends with exactly one classification:

- `continue matcher prototype`: mismatch reaches zero or explicit fallback,
  fallback taxonomy is interpretable, and cost trend shows a plausible path.
- `abandon Rust matcher`: mismatch remains non-zero, cost remains dominant
  without a plausible optimization path, or complexity is not justified.
- `pivot to TypeScript resolver optimization`: Rust matcher semantics become
  controlled, but evidence shows the cost center is TypeScript candidate
  materialization, protocol shape, or verification rather than Rust matching.
- `promote guarded path`: exceptional only; requires mismatch zero, controlled
  fallback, no sufficiency regression, and `rustMatcherMs` no longer dominant.

Phase 8 cannot pass by claiming default rollout readiness.

## Issue Sequence

### 1. Phase 8 Plan And Guardrails

- Write this plan.
- Add documentation tests that protect Phase 8 boundaries and baseline metrics.
- Reference #113 as separate graph coverage work, not a Phase 8 blocker.

### 2. Semantic Mismatch Taxonomy And Zeroing

- Reproduce the Phase 7 VS Code semantic mismatch classes.
- Add strict diagnostic trace for mismatch reproduction.
- Fix mismatches to behavior-equivalent decisions or downgrade them to guarded fallback.
- Keep guarded default mode safe.

### 3. Fallback Taxonomy And One True-Gap Fix

- Replace the opaque `unresolved` bucket with decision-oriented taxonomy:
  `ts-baseline-unresolved`, `unsupported-reference-shape`,
  `missing-candidate-facts`, `outside-matcher-boundary`, `rust-unresolved`,
  and `semantic-mismatch`.
- Fix at least one true `rust-unresolved` matcher gap.
- Keep import/framework/dynamic behavior in TypeScript.

### 4. Cost Attribution And Candidate Payload Dedup

- Split matcher cost attribution.
- Add batch-level candidate payload dedup or equivalent per-reference candidate keys.
- Record before/after reduced-fixture evidence.
- Stop after one bounded optimization attempt.

### 5. VS Code Before/After Closeout Decision

- Rerun the same VS Code sparse profile.
- Rerun the VS Code `VS-1` sufficiency smoke.
- Record RSS or unavailable reason.
- Publish Phase 8 results and decision with exactly one classification.

## Local Validation

Minimum validation for documentation-only work:

```bash
npx vitest run __tests__/rust-phase8-plan-doc.test.ts
git diff --check
```

Minimum validation for implementation work:

```bash
npm run build
npx vitest run __tests__/rust-name-matcher.test.ts
cargo test --package zcodegraph-core
```

Closeout additionally requires one reduced fixture profile and one same-scope VS
Code sparse profile plus sufficiency smoke.

## 9. `docs/plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md`

# Rust Indexing Core Phase 12 Supported Runtime Sufficiency Completion

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

## Background

Phase 11 fixed the VS Code `VS-1` sufficiency smoke evidence pipeline: large-target runs now produce staged, machine-readable JSON instead of silent empty output. The corrected exact VS Code target is valid, but the real smoke did not reach TypeScript-vs-Rust comparison because it ran under Node.js 26 and stopped during TypeScript indexing with `unsupported-runtime`.

Phase 12 consumes the Phase 11 harness under a supported runtime. Its purpose is to advance the evidence from `unsupported-runtime` to an actual sufficiency comparison, or to a deeper, stage-specific blocker.

## Goal

Run the corrected exact VS Code `VS-1` sufficiency smoke under Node.js 22 and produce a machine-readable artifact that reaches the comparison stage, or records a deeper unavailable stage than `unsupported-runtime`.

The goal is evidence completion, not rollout readiness.

## Baseline Target

From Phase 12 onward, the VS Code sufficiency baseline is the exact target:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Expected commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Required sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Required `VS-1` tokens:
  - `AbstractExtensionService`
  - `_createExtensionHostManager`
  - `_doCreateExtensionHostManager`
  - `ExtensionHostManager`
  - `start`
  - `ExtensionHostMain`
  - `MainThreadExtensionService`

Phase 10 drift-target wording is historical only. New Phase 12 artifacts and docs should not describe the baseline as a drift target.

## Scope

In scope:

- Human confirmation of a Node.js 22 runtime or Node 22 binary path.
- Re-running the exact target validator as a hard gate before smoke.
- One bounded full source smoke under Node 22.
- At most one bounded second attempt if the first attempt fails before comparison.
- Recording stage elapsedMs, command provenance, runtime, artifact status, and follow-up classification.
- Writing a Phase 12 results-and-decision document.

Out of scope:

- Resolver changes.
- Matcher changes.
- Explore planner or renderer changes.
- Rust extraction semantics changes.
- Rust performance optimization.
- Changing default rollout status.
- Rewriting Phase 11 historical results.
- Re-running Node 26 as a comparison.

Harness bug fixes are allowed only if the Node 22 run exposes a clear Phase 11 harness bug, such as missing artifacts, incorrect prompt filtering, or wrong stage taxonomy. Do not add new harness modes in Phase 12.

## Node 22 HITL Gate

Phase 12 starts with a HITL gate. The maintainer must provide one of:

- `node -v` showing `v22.x`, with that `node` first on PATH for the run; or
- an explicit Node 22 binary path to use for the smoke command.

The agent must not install Node 22 or change the user's global Node runtime as part of this phase.

If Node 22 is not available, Phase 12 stops at the HITL gate and records that no supported-runtime smoke was attempted.

## Validator Hard Gate

Before any smoke attempt, run:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json
```

The smoke must not run unless the validator reports:

- `commitMatchesExpected: true`
- `missingSymbols: []`
- `sufficiencySmokeAllowed: true`

If validation fails, write the validator artifact and classify Phase 12 as blocked by `validator-failed`.

## Smoke Attempts

Attempt 1:

- Run the corrected exact target `VS-1` smoke under Node 22.
- Use the Phase 11 harness options: `--prompt-id VS-1`, `--timeout-ms`, and `--out`.
- Save a raw artifact under `docs/benchmarks`.

Attempt 2:

- Allowed only if Attempt 1 fails before comparison.
- Must change exactly one explicit variable:
  - increase timeout; or
  - use reuse-indexed pair mode; or
  - rerun only the failed stage if the harness supports that without adding a new mode.
- Must record why that variable was chosen.

No further attempts are allowed in Phase 12. Do not keep rerunning until a favorable result appears.

## Success Criteria

Phase 12 succeeds if it produces one of:

- A comparison-stage artifact with TypeScript and Rust `VS-1` results, including Flow section, `flowConnected`, missing expected symbols, deterministic Read/Grep fallback risk, and Rust-specific regression status; or
- A deeper unavailable artifact than Phase 11, such as `typescript-index-timeout`, `rust-index-timeout`, `explore-timeout`, or `process-error`, with stage elapsedMs and stderr tail.

Phase 12 does not require the TypeScript-vs-Rust comparison to pass.

Phase 12 fails if the only result remains `unsupported-runtime` after a Node 22 runtime was supposedly confirmed.

## Results Document

Write a Phase 12 results-and-decision document under `docs/benchmarks` or `docs/design`.

It must include:

- Link to Phase 11 results.
- Node 22 runtime confirmation.
- Exact target validator artifact.
- Attempt 1 raw artifact.
- Attempt 2 raw artifact if used.
- Final classification.
- Follow-up direction.
- Explicit statement that Phase 12 does not change Rust matcher opt-in/default status or default rollout readiness.

## Issue Sequence

1. HITL: confirm Node.js 22 runtime or binary path.
2. AFK: exact target validator hard gate and smoke Attempt 1.
3. AFK: bounded second attempt if Attempt 1 fails before comparison.
4. AFK: Phase 12 results-and-decision document and tracker closeout.

## 10. `docs/plans/2026-06-15-rust-indexing-core-phase-14-experiment-infrastructure.md`

# Rust Indexing Core Phase 14 Plan: Experiment Infrastructure

Date: 2026-06-15

Reference PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Purpose

Phase 14 should not jump directly to producing a Rust graph for the VS Code stress target. Phase 13 proved that the A/B harness can preserve asymmetric evidence, but it also exposed that the experiment infrastructure is not complete enough for reliable PRD gate decisions.

Phase 14 therefore focuses on making the Rust indexing experiment capability complete and reproducible:

> Any supported repo / prompt / engine-arm combination should produce bounded, reproducible, comparable, and diagnosable evidence. If copy, preflight, indexing, or comparison fails, the artifact must still explain what happened without forcing the next agent to guess.

## Confirmed decisions

### Scope

- Build complete experiment infrastructure first.
- Do not make Rust default.
- Do not rewrite product CLI behavior by default.
- Product CLI changes are out of scope unless the guardrail cannot obtain necessary facts through existing CLI behavior; such gaps should first be recorded as blockers/follow-up issues.

### Required and stress targets

Required decision targets return to the PRD baseline:

- `zcodegraph`
- `excalidraw`

VS Code remains a stress target / optional extended evidence:

- `vscode`
- `requiredForDecision: false`
- `requiredAfterPrdCompletion: true`

After the required targets produce complete evidence, the PRD completion flow must run at least one VS Code stress validation. The stress run does not block the required-target decision, but it must produce artifact evidence and should create follow-up issues for newly exposed blockers.

### Metrics and gates

Benchmark metrics are part of the core experiment capability.

Required:

- per-stage and per-arm `elapsedMs`
- graph/file count where available
- file throughput when derivable

Best-effort optional:

- `peakRssBytes`

Peak RSS absence does not fail the experiment. It records `null` plus diagnostics.

Performance threshold defaults come from the PRD and can be overridden by manifest:

```json
{
  "metrics": {
    "thresholds": {
      "wallTimeImprovementPct": 25,
      "peakRssReductionPct": 30,
      "maxOtherMetricRegressionPct": 10
    }
  }
}
```

Performance gate passes if either:

- wall time improves by at least 25% and RSS does not regress by more than 10%, or
- peak RSS reduces by at least 30% and wall time does not regress by more than 10%.

If RSS is missing:

- wall time passes -> performance may pass with an RSS diagnostic.
- wall time does not pass -> performance is `unavailable`, not `failed`.

### Independent gates

Agent Sufficiency and performance are separate gates.

Target-level gate shape:

```json
{
  "gates": {
    "sufficiency": {
      "status": "passed | failed | unavailable",
      "regressions": []
    },
    "performance": {
      "status": "passed | failed | unavailable",
      "wallTimeDeltaPct": null,
      "peakRssDeltaPct": null,
      "diagnostics": []
    }
  }
}
```

Experiment-level decision readiness summarizes these gates:

```json
{
  "decisionReadiness": {
    "sufficiencyPassed": false,
    "performancePassed": false,
    "requiredTargetsPassed": false,
    "rolloutReadinessClaimed": false
  }
}
```

`rolloutReadinessClaimed` must default to `false`. The runner may generate a recommendation draft, but it must not automatically claim Rust default rollout readiness.

## Formal manifest

Formal experiments must use a manifest. Existing CLI flags remain for ad hoc probes/debugging.

Command shape:

```bash
node scripts/rust-indexing-experiment.mjs \
  --experiment docs/benchmarks/rust-indexing-core-phase-14.experiment.json \
  --out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14.raw.json \
  --summary-out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14-decision-summary-draft.md
```

### Manifest schema direction

The manifest is a generic experiment schema, but Phase 14 only implements the fields needed for `kind=indexing-ab`.

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-14",
  "kind": "indexing-ab",
  "arms": ["typescript", "rust"],
  "sourceCopy": {
    "mode": "js-ts-config-slice",
    "isolation": "per-arm"
  },
  "targets": [],
  "metrics": {},
  "outputs": {}
}
```

Phase 14 implementation rules:

- `kind` must be exactly `indexing-ab`.
- `arms` must contain exactly `typescript` and `rust`.
- Arm order is ignored and normalized to `typescript`, `rust`.
- Unsupported, missing, or extra arms are manifest validation errors.
- Unknown fields may be preserved but are not interpreted.
- `sourceCopy.mode` must be `js-ts-config-slice`.
- `sourceCopy.isolation` must be `per-arm`.
- Reuse modes remain ad hoc CLI behavior and are not allowed in formal manifest runs.

### Target path resolution

Targets use `pathEnv` / `pathFallback` so committed manifests are not hard-bound to one machine.

```json
{
  "name": "excalidraw",
  "pathEnv": "ZCODEGRAPH_CORPUS_EXCALIDRAW",
  "pathFallback": "C:/workspace/github/corpus/excalidraw"
}
```

Resolution rules:

1. If `pathEnv` exists and the environment variable has a value, use it.
2. Otherwise use `pathFallback`.
3. If neither resolves, target preflight is unavailable with `missing-target-path`.
4. The artifact records:
   - `configuredPathEnv`
   - `configuredPathFallback`
   - `resolvedPath`
   - `pathSource: "env" | "fallback"`

### Target validation

Targets may specify `expectedCommit`, `allowDirty`, and `sparsePatterns`.

Rules:

- `expectedCommit` set and actual HEAD differs -> target unavailable with `target-drift`.
- `allowDirty=false` and working tree dirty -> target unavailable with `target-dirty`.
- `expectedCommit=null` -> record actual commit, but do not gate.
- `sparsePatterns` are metadata only in v1; record them but do not hard-gate.

Example target entries:

```json
{
  "name": "zcodegraph",
  "pathFallback": ".",
  "targetClass": "required",
  "requiredForDecision": true,
  "expectedCommit": null,
  "allowDirty": true,
  "promptIds": ["ZCG-1", "ZCG-2", "ZCG-3"]
}
```

```json
{
  "name": "vscode",
  "pathEnv": "ZCODEGRAPH_CORPUS_VSCODE",
  "pathFallback": "C:/workspace/github/corpus/vscode-sparse",
  "targetClass": "stress",
  "requiredForDecision": false,
  "requiredAfterPrdCompletion": true,
  "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
  "allowDirty": false,
  "sparsePatterns": [".github", "build", "extensions", "scripts", "src", "test"],
  "promptIds": ["VS-1"]
}
```

## Runner design

Add a new formal runner instead of growing the legacy guardrail script:

```text
scripts/rust-indexing-experiment.mjs
```

The existing script remains for legacy/ad hoc behavior:

```text
scripts/rust-sufficiency-guardrail.mjs
```

Implementation strategy:

- The new runner can be self-contained in v1.
- Small duplication is allowed to keep old and new schemas decoupled.
- Only extract stable pure functions when clearly useful.
- Do not force DRY if it tangles Phase 13 compatibility with Phase 14 formal schema.

Likely stable utilities that can be copied first and extracted later:

- command runner
- `tail()`
- base env allowlist
- JS/TS/config source-copy slice
- Explore execution and prompt analysis
- graph stats collection

## Preflight model

Phase 14 uses two preflight layers:

1. experiment preflight
2. target / arm preflight

Experiment preflight checks:

- manifest shape
- output path writeability
- toolchain facts
- global Rust binary discovery

Fatal experiment-level errors abort immediately if no artifact can be produced:

- invalid JSON manifest
- unsupported experiment kind
- duplicate target names
- invalid outputs

Global Rust binary missing does not abort. It materializes into each Rust arm preflight as unavailable.

Target preflight checks:

- path resolution
- target exists
- git commit
- dirty tree
- prompt selection

Arm preflight checks:

- engine-specific readiness
- Rust binary executable/version when engine is Rust

Rules:

- target unavailable -> both arms skipped for that target.
- arm unavailable -> only that arm skipped.
- target/arm/prompt failures do not abort other targets.

## Arm model

Arm failure must distinguish preflight unavailability from execution failure.

```json
{
  "engine": "rust",
  "preflight": {
    "status": "available | unavailable",
    "kind": null,
    "diagnostics": []
  },
  "execution": {
    "status": "pending | running | completed | failed | skipped | timeout",
    "elapsedMs": 0,
    "diagnostics": []
  },
  "indexing": {
    "status": "summary/legacy alias"
  },
  "graphAvailable": false,
  "graphStats": null
}
```

`preflight unavailable` means the arm was not eligible to run.
`execution failed` means the runner attempted indexing and the process failed or timed out.

## Artifact output

Formal output is one total raw artifact and one total decision summary draft.

Target-level details are embedded inside the raw artifact.

Top-level shape:

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-14",
  "kind": "indexing-ab",
  "generatedAt": "...",
  "preflight": {},
  "targets": [],
  "classification": "...",
  "decisionReadiness": {
    "sufficiencyPassed": false,
    "performancePassed": false,
    "requiredTargetsPassed": false,
    "rolloutReadinessClaimed": false
  }
}
```

### Progress and partial artifact

When `--out` is provided, the runner must keep the raw artifact valid after each major transition:

- after experiment preflight
- after each target preflight
- after source copy
- after each arm starts
- after each arm completes/fails/skips
- after comparison starts/completes/fails/skips
- after classification

Partial artifacts must preserve latest known per-arm status, diagnostics, command provenance, and metrics.

## Classification

Use two classification layers:

- `target.classification`
- `experiment.classification`

Do not reuse Phase 13 mixed names such as `success-asymmetric-blocker` in the formal manifest path.

Target-level taxonomy:

```text
target-success-comparison-completed
target-failed-preflight
target-failed-arm-unavailable
target-failed-comparison-regression
target-skipped
```

Experiment-level taxonomy:

```text
success-required-targets-passed
success-required-targets-passed-with-stress-failures
failed-required-target-unavailable
failed-required-arm-unavailable
failed-required-comparison-regression
failed-manifest-invalid
failed-experiment-preflight
```

## Continue-across-targets policy

The runner should maximize evidence.

Rules:

- Manifest/schema-level fatal errors abort.
- Target/arm/prompt-level errors are recorded and other targets continue.
- Final classification summarizes required and stress target outcomes.

Required target unavailable or required arm unavailable should cause experiment-level failure classification, but should not prevent other targets from running.

## Exit codes

Default:

```text
0 = raw artifact + summary draft successfully produced
1 = fatal error prevents artifact/summary
```

Optional CI gate:

```text
--fail-on-required-gate-failure
  2 = experiment completed, but experiment.classification starts with failed-required-
```

By default, a failed gate is represented in the artifact, not process exit status.

## Decision summary draft

The runner must produce a Markdown decision summary draft. It is not the final decision.

The summary draft should include:

- experiment id and manifest path
- target matrix
- preflight summary
- per-target arm availability
- graph stats
- elapsed metrics
- peak RSS metrics or diagnostics
- sufficiency gate status
- performance gate status
- regressions
- target classifications
- experiment classification
- rollout recommendation draft

Default rollout recommendation draft:

```text
Rust default rollout readiness is not claimed by this generated draft.
```

A maintainer must review or modify the draft before any final rollout decision.

## Canonical files to add

```text
scripts/rust-indexing-experiment.mjs
docs/benchmarks/rust-indexing-core-phase-14.experiment.json
docs/benchmarks/rust-indexing-core-phase-14-experiment.md
```

The companion doc should explain:

- env vars
- fallback path semantics
- target classes
- gates
- exit codes
- run commands
- output files
- VS Code stress validation trigger

## Non-goals

- Do not make Rust the default indexer.
- Do not rewrite MCP tools.
- Do not rewrite resolver/synthesizer behavior.
- Do not change product CLI behavior unless proven necessary and separately approved.
- Do not require VS Code stress target to pass for required-target decision readiness.
- Do not allow reuse-indexed mode in formal manifest v1.
- Do not auto-claim rollout readiness.

## Draft issue breakdown

This is a draft only. Do not create these issues until the plan is reviewed.

### 1. Phase 14: add formal experiment manifest parser and validator

Type: AFK

Blocked by: None

What to build:

- Add `scripts/rust-indexing-experiment.mjs` with `--experiment`, `--out`, and `--summary-out` arguments.
- Parse and validate generic manifest schema v1 for `kind=indexing-ab`.
- Validate exact TypeScript/Rust arms, source copy mode/isolation, duplicate target names, target path configuration, and output arguments.

Acceptance criteria:

- Invalid manifest JSON exits with fatal classification and no misleading partial run.
- Unsupported kind, unsupported arms, duplicate target names, and invalid sourceCopy are rejected with clear diagnostics.
- Valid canonical manifest is accepted.
- Focused tests cover success and validation failures.

### 2. Phase 14: implement experiment and target/arm preflight artifact model

Type: AFK

Blocked by: issue 1

What to build:

- Implement experiment preflight and target/arm preflight in the new runner.
- Resolve `pathEnv/pathFallback`.
- Validate commit and dirty-tree rules.
- Propagate global Rust binary readiness into Rust arm preflight.

Acceptance criteria:

- Missing target path records target unavailable and continues other targets.
- Target drift and target dirty are classified at target preflight.
- Missing Rust binary marks Rust arms unavailable without aborting the experiment.
- Artifact records path resolution provenance.

### 3. Phase 14: implement formal per-arm source copy and execution snapshots

Type: AFK

Blocked by: issue 2

What to build:

- Implement formal `js-ts-config-slice` + per-arm isolation only.
- Execute TypeScript and Rust arms independently through the existing CLI path.
- Write valid partial artifacts after each major transition.

Acceptance criteria:

- Reuse-indexed modes are rejected in formal manifest path.
- Per-arm temp workspaces are distinct.
- `.zcodegraph` from source is not copied.
- One arm unavailable/failed does not discard the other arm's evidence.
- Partial artifacts are valid JSON at each snapshot point.

### 4. Phase 14: implement sufficiency and performance gates

Type: AFK

Blocked by: issue 3

What to build:

- Run prompt comparisons only when both arms are graph-available.
- Record sufficiency gate separately from performance gate.
- Compute elapsed deltas, file throughput, and best-effort peak RSS diagnostics.
- Apply default PRD thresholds with manifest override support.

Acceptance criteria:

- Sufficiency and performance gates are independently recorded.
- Required target gate failures affect experiment classification.
- Missing RSS follows the confirmed optional-RSS rules.
- Regressions are listed without overwriting arm evidence.

### 5. Phase 14: implement experiment/target classification and exit-code policy

Type: AFK

Blocked by: issue 4

What to build:

- Add target-level and experiment-level classification.
- Implement continue-across-targets behavior.
- Implement default exit code and optional `--fail-on-required-gate-failure` behavior.

Acceptance criteria:

- Target failures do not abort other targets.
- Required target failures classify the experiment as failed-required-*.
- Stress target failures can classify as success-required-targets-passed-with-stress-failures when required targets pass.
- Default exit code is 0 when raw artifact and summary draft are produced.
- Optional gate-failure flag returns 2 for failed-required-* classifications.

### 6. Phase 14: generate decision summary draft and companion docs

Type: AFK

Blocked by: issue 5

What to build:

- Generate a Markdown decision summary draft from the raw artifact.
- Add canonical manifest and companion documentation.

Acceptance criteria:

- Summary draft includes preflight, target matrix, arm availability, graph stats, metrics, gates, regressions, classifications, and rollout recommendation draft.
- Draft states that Rust default rollout readiness is not automatically claimed.
- Companion doc explains env vars, fallback paths, target classes, gates, exit codes, output files, and VS Code stress validation trigger.

### 7. Phase 14: run required targets and then one VS Code stress validation

Type: HITL

Blocked by: issue 6

What to build:

- Run the canonical formal experiment for ZCodeGraph and Excalidraw.
- If required targets meet the confirmed trigger condition, run at least one VS Code stress validation.
- Review the generated decision summary draft.

Acceptance criteria:

- Required-target raw artifact and summary draft are produced.
- VS Code stress artifact is produced after trigger conditions are met.
- Stress target failures do not block required-target decision readiness.
- New blockers exposed by stress validation are captured as follow-up issues.

## Open implementation notes

- The runner may initially duplicate some helper logic from `rust-sufficiency-guardrail.mjs` to keep schema boundaries clean.
- If helper duplication becomes noisy, extract stable pure utilities only after their boundary is obvious.
- Peak RSS collection should be best effort and should not dominate Phase 14 scope.

## 11. `docs/plans/2026-06-16-rust-indexing-core-phase-15e-handoff.md`

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
| Phase 14/15 historical evidence | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-14-15-experiment-artifact-cleanup.md` |
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

## 12. `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`

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

## 13. `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`

# Rust Indexing Core Phase 15F: Production-Like RSS Gate Cleanup

## Scope

Phase 15F follows up the Phase 15E RSS gate with a narrower production-like run shape:

- Use the supported bundled Node runtime, not the local Node 26 runtime.
- Use a non-`dhat` Rust core binary.
- Run the VS Code sparse checkout matched-work profile as a completed two-arm comparison.
- Try lazy TypeScript/JavaScript normalization first.
- If the lazy normalization result is insufficient, try exactly one bounded second candidate: `visit_js_node` borrowed-ID cleanup.

This phase does not claim Rust default indexer readiness or full-profile rollout readiness.

## Target

- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Dirty state: `true`, expected `.zcodegraph/` working directory noise
- Runtime: `/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
- Node version: `v24.14.0`
- Rust core: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core`
- Rust graph work profile: `matched-ts-js`

## Issues

- #174: production-like VS Code RSS baseline
- #175: lazy TypeScript normalization allocation cleanup
- #176: production-like after-smoke and bounded second-candidate decision
- #177: Phase 15F tracker
- Parent blockers: #49, #165

## Implementation Summary

The lazy normalization slice changes `normalize_source_for_parser` to return borrowed input when no parser compatibility rewrite is needed. JavaScript and JSX sources now stay borrowed. TypeScript and TSX sources use a single lazy normalization pass that only allocates after the first rewrite and handles import type query normalization plus contextual keyword normalization in the same buffer.

The bounded second candidate changes the `visit_js_node` traversal path so the current child source ID is borrowed unless a newly extracted symbol changes the scope. This avoids one hot-path clone but intentionally does not change extraction semantics or graph shape.

## Validation Artifacts

| Run | Evidence |
|---|---|
| Baseline | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-15e-15f-rss-evidence-cleanup.md` |
| Lazy normalization after-smoke | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-15e-15f-rss-evidence-cleanup.md` |
| Borrowed-ID after-smoke | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-15e-15f-rss-evidence-cleanup.md` |
| Reduced smoke | `docs/benchmarks/2026-06-23-rust-indexing-core-phase-15e-15f-rss-evidence-cleanup.md` |

## Production-Like VS Code Results

Each row is a completed TypeScript vs Rust comparison on the same sparse checkout shape. These are single smoke runs, so they are trend evidence rather than a statistically stable benchmark.

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | TS elapsed | Rust elapsed | Classification |
|---|---:|---:|---:|---:|---:|---:|---|
| Baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | 457,697 ms | 355,602 ms | `target-failed-performance-gate-unmet` |
| Lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | 461,307 ms | 354,297 ms | `target-failed-performance-gate-unmet` |
| Borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | 466,592 ms | 352,075 ms | `target-failed-performance-gate-unmet` |

## Rust Profile Trend

| Run | parseExtractionMs | sqliteWriteMs | referenceResolutionMs | typescriptFinalizationMs |
|---|---:|---:|---:|---:|
| Baseline | 37,195 | 62,635 | 21,549 | 28,599 |
| Lazy normalization | 36,831 | 61,339 | 21,026 | 27,976 |
| Borrowed-ID cleanup | 35,736 | 61,108 | 21,111 | 28,099 |

## Decision

Final #176 result: `stop-and-reassess-before-in-memory-pivot`.

Lazy normalization is worth keeping because it removes avoidable source copies without changing parser semantics and the production-like smoke moved the RSS delta from `+30.45%` to `-5.05%`. The comparison is not strong enough to claim the `<= -30%` RSS gate because TypeScript arm RSS varied materially between single runs.

The bounded `visit_js_node` borrowed-ID candidate did not materially lower Rust peak RSS: Rust moved from `38,223,872` bytes to `38,191,104` bytes, while the comparison delta returned to `+31.10%` because the TypeScript arm returned to its lower RSS band. This candidate does not close the RSS gate.

Phase 15F stops here. The next optimization should be planned as a separate issue rather than expanding #176 into SQLite in-memory/final-flush work.

## Tracker Status

- #174: complete, baseline artifact captured with supported Node, non-`dhat` Rust core, both arms completed, and dirty sparse checkout state recorded.
- #175: complete, lazy normalization implemented and covered by focused Rust tests plus reduced smoke.
- #176: complete, lazy after-smoke and one bounded second candidate after-smoke recorded; RSS gate remains unmet.
- #177: complete as a tracker once #49 and #165 are updated with this result.

## Out Of Scope

- No default Rust indexer readiness claim.
- No full-profile rollout readiness claim.
- No additional Phase 15F optimization candidate beyond borrowed-ID cleanup.
- No SQLite in-memory/final-flush pivot in this issue sequence.

## 14. `docs/plans/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment.md`

# Rust Indexing Core Phase 16: Architecture Reassessment Before Further Rust Expansion

## Context

Phase 15F ended with `stop-and-reassess-before-in-memory-pivot`.

The Rust indexing core still satisfies important product constraints: it stays opt-in, preserves the TypeScript product shell, avoids the Node/WASM parser hot path for JS/TS parsing, and produces indexes readable by the existing MCP and Explore layers. However, the latest production-like VS Code sparse matched-work runs did not close the RSS gate:

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | Classification |
|---|---:|---:|---:|---:|---|
| Phase 15F baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | `target-failed-performance-gate-unmet` |
| Phase 15F lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | `target-failed-performance-gate-unmet` |
| Phase 15F borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | `target-failed-performance-gate-unmet` |

This triggers the PRD's stop/continue clause: if the Rust slice fails the hard performance or memory gate, stop expanding Rust coverage and reassess whether the architecture boundary is wrong, the implementation is immature, or the migration is not justified.

## Goal

Phase 16 formally reassesses the current architecture boundary before further Rust expansion.

The phase validates one primary architecture candidate and one secondary boundary:

1. Primary: SQLite write/finalization boundary.
2. Secondary: subprocess/source-copy orchestration boundary.

The goal is not to claim default rollout readiness. The goal is to produce a defensible go/no-go decision for the next stage:

- productionize the SQLite candidate,
- investigate an orchestration blocker,
- or stop Rust expansion and reassess migration value.

## Non-Goals

- Do not make the Rust indexer default.
- Do not claim full-profile rollout readiness.
- Do not expand Rust language coverage beyond JS/TS/JSX/TSX.
- Do not migrate ReferenceResolver, framework resolvers, dynamic-dispatch synthesizers, MCP tools, or Explore rendering into Rust.
- Do not change the production SQLite schema.
- Do not change default active-index failure-safety or locking behavior for the prototype.
- Do not hide single-run evidence as a statistically stable benchmark.

## Architecture Hypotheses

### H1: SQLite write/finalization boundary is hiding Rust's benefit

The Rust core currently parses and writes SQLite directly, then the TypeScript shell continues finalization, reference resolution, dynamic-dispatch synthesis, and DB maintenance. Phase 15F profile evidence still showed a large Rust-side SQLite write block, around 61 seconds on the VS Code sparse matched-work runs.

Hypothesis: a temp/in-memory/final-flush SQLite prototype can reduce write churn enough to justify a production-safe follow-up.

### H2: Subprocess/source-copy orchestration is diluting end-to-end gains

The experiment runner copies source slices and measures init/subprocess handoff as part of the end-to-end run. Some of this may be experiment-only overhead; some may expose product-path overhead.

Hypothesis: a targeted audit can separate experiment harness cost from production CLI cost, and may reveal one low-risk candidate worth testing independently.

## Primary Candidate

Implement a SQLite temp/in-memory final-flush prototype behind an explicit experimental flag or manifest option.

Requirements:

- Default Rust indexing behavior stays unchanged.
- Prototype runs only under explicit experiment control.
- Active production index failure-safety remains unchanged.
- The final output must remain compatible with the existing production schema.
- Prototype-internal temp DBs, in-memory DBs, temporary tables, or backup/flush mechanics are allowed only as implementation details.
- The result must be measured against the same graph work profile and corpus shape.

This candidate answers whether the SQLite write/finalization boundary is worth productionizing. It does not need to be production-safe in Phase 16, but it must not put the normal active index path at risk.

## Secondary Boundary

Run a subprocess/source-copy orchestration audit after the SQLite candidate evidence.

Requirements:

- Audit is mandatory.
- Code change is conditional.
- At most one bounded orchestration/source-copy candidate may be implemented.
- A candidate is allowed only if the audit identifies a clear low-risk, independently attributable issue.
- Do not combine the orchestration candidate with the SQLite candidate in a single benchmark comparison.

Possible audit topics:

- source copy time and duplicate copy behavior,
- init timing split,
- Rust subprocess startup/handoff timing,
- experiment-runner-only overhead vs production CLI overhead,
- whether more public profile sub-buckets are needed to interpret the boundary.

## Target Matrix

Phase 16 keeps both PRD required targets and the VS Code sparse stress target, but they have different roles.

| Target | Role | Interpretation |
|---|---|---|
| ZCodeGraph | PRD required target | Used for PRD hard gate evidence. |
| Excalidraw | PRD required target | Used for PRD hard gate evidence. |
| VS Code sparse checkout | Stress/confidence target | Used for large-repo confidence and blocker interpretation; does not by itself claim rollout readiness. |

VS Code sparse checkout should continue using the previously fixed corpus shape unless a later plan explicitly updates it:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Dirty `.zcodegraph/` noise is acceptable only if recorded.

## Profile And Measurement Rules

- Main comparison profile: `matched-ts-js`.
- Full-profile rollout readiness is out of scope.
- Locked baseline and SQLite candidate evidence:
  `docs/benchmarks/2026-06-23-rust-indexing-core-phase-16-18-sqlite-scoreboard-cleanup.md`.
- Experimental SQLite write mode field: `rust.sqliteWriteMode`.
- Supported SQLite write modes: `disk`, `memory-final-flush`.
- Each key candidate requires one completed production-like smoke on the relevant targets.
- Single-run results are trend evidence, not statistical proof.
- Every production-like smoke must record:
  - Node runtime and Rust core binary shape,
  - command and environment evidence,
  - peak RSS for both arms,
  - wall time for both arms,
  - `sourceCopy`, `init`, `index`, `graphStats`, and total timings,
  - Rust profile sub-buckets including `parseExtractionMs`, `sqliteWriteMs`, `typescriptFinalizationMs`, and reference-resolution timing,
  - graphStats and sufficiency status.

## Acceptance Criteria

Phase 16 is complete when:

- The architecture reassessment plan and experiment shape are documented.
- The SQLite temp/in-memory final-flush prototype is implemented behind an explicit experimental flag or manifest option.
- Reduced fixture validation proves the prototype can produce a readable graph without changing default behavior.
- Required targets and VS Code sparse stress target have completed candidate smoke evidence, or a documented unavailable reason.
- The orchestration/source-copy audit is complete.
- Any orchestration candidate, if attempted, is isolated from the SQLite candidate evidence and bounded to one low-risk change.
- The final decision states one of:
  - `productionize-sqlite-candidate`,
  - `investigate-orchestration-blocker`,
  - `stop-rust-expansion-and-reassess-migration-value`.

## Decision Rules

### SQLite candidate validated

If `sqliteWriteMs` clearly improves and end-to-end wall time does not regress while RSS does not significantly worsen, Phase 16 may conclude:

`productionize-sqlite-candidate`

This conclusion is valid even if the final PRD performance/RSS gate remains open. It means the architecture candidate is worth turning into a production-safe implementation in a later phase.

### SQLite candidate not validated

If the SQLite candidate does not materially improve write/finalization trend, complete the orchestration/source-copy audit. Only implement the bounded candidate if the audit identifies a clear, low-risk, attributable issue.

### No validated boundary

If neither SQLite write/finalization nor orchestration/source-copy evidence identifies a useful path, Phase 16 should conclude:

`stop-rust-expansion-and-reassess-migration-value`

That conclusion means the current Rust indexing boundary should not keep expanding without a broader architecture or product-value reassessment.

## Issue Plan

1. Phase 16.1: architecture reassessment baseline and experiment shape.
2. Phase 16.2: SQLite temp/in-memory final-flush prototype behind experimental flag.
3. Phase 16.3: required targets and VS Code sparse candidate smoke evidence.
4. Phase 16.4: orchestration/source-copy audit plus conditional bounded candidate.
5. Phase 16 tracker: final decision against PRD stop/continue criteria.

## 15. `docs/plans/2026-06-17-rust-indexing-core-phase-17-production-final-flush-scoreboard.md`

# Rust Indexing Core Phase 17: Production Final-Flush Default + End-to-End Scoreboard

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Open performance gate blocker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Previous phase decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`

## Context

Phase 16 showed that the SQLite write/finalization boundary is the clearest productionization candidate. The experimental `memory-final-flush` mode materially reduced `sqliteWriteMs` and improved VS Code sparse stress wall time, while preserving graphStats shape and sufficiency smoke results. It did not close the PRD required-target gate on ZCodeGraph and Excalidraw.

The next phase shifts from pure forward implementation to result-oriented convergence:

1. Finish the opt-in Rust end-to-end path enough that the best known write strategy is the normal Rust path.
2. Build a scoreboard that reports the whole chain instead of isolated local improvements.
3. Use that scoreboard to identify the next largest blocker by segment and keep future A/B work bounded.

This phase does not claim default rollout readiness. The TypeScript indexer remains the product default. Rust remains explicit opt-in through `--engine rust` or the existing environment path.

## Goal

Make production-safe final-flush the default write path for `--engine rust`, keep a disk write escape hatch for debugging, and produce an end-to-end scoreboard that states:

- whether the PRD required gate passes or fails,
- whether graphStats parity and sufficiency remain acceptable,
- what the next largest blocker or segment appears to be.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim full default rollout readiness.
- Do not remove the TypeScript indexer or disk write escape hatch.
- Do not change the SQLite schema.
- Do not migrate ReferenceResolver, framework resolvers, synthesizers, MCP tools, or Explore rendering to Rust.
- Do not treat VS Code sparse as a replacement for required-target gate evidence.
- Do not run a packaging redesign; only smoke the affected CLI/packaging path.

## Decisions

### Rust final-flush default

`--engine rust` should use a production final-flush write path by default.

The production default must be safer than the Phase 16 experimental in-memory prototype:

- write into a temporary on-disk staging database,
- complete the Rust index into that staging database,
- atomically replace the active project index only after the staging database is valid,
- preserve the previous good index on failure.

The existing `disk` write mode remains available as a debug and escape hatch path, but it is not the scoreboard path. `memory-final-flush` can remain as an experimental/debug mode, but it must not become the production default.

### Required targets and stress target

The PRD required gate remains anchored on ZCodeGraph and Excalidraw:

- Rust must be at least 25% faster or at least 30% lower peak RSS than TypeScript.
- The other metric must not be significantly worse.
- Agent Sufficiency must not regress.

VS Code sparse remains a large-repo stress and confidence target. Evidence from VS Code can justify next optimization direction, but it cannot by itself close the PRD required gate.

### Scoreboard profiles

The scoreboard must run both profiles:

- `matched-ts-js`: performance/control baseline for the Rust JS/TS slice.
- `full`: readiness/completeness lens for the current end-to-end product path.

The scoreboard must report these separately. A `matched-ts-js` improvement does not imply full readiness; a `full` gap may point to remaining completeness or resolver/sufficiency work rather than just raw indexing performance.

### Scoreboard dimensions

The scoreboard must include:

- performance: wall time, peak RSS or unavailable reason, and relevant phase timing buckets,
- graphStats parity: files, nodes, edges, unresolved references, and indexed engine metadata,
- sufficiency: representative probe/smoke outcomes for required targets and VS Code sparse where applicable.

The output must make the gate state explicit: pass, fail, or inconclusive with reason.

### Cross-platform validation

Phase 17 must validate the production final-flush path with focused cross-platform coverage:

- macOS: required.
- Linux Docker: required for focused validation.
- Windows: required only if the implementation changes platform-sensitive replace, locking, path, or file-handle behavior; otherwise record why Windows was not required/unavailable for this phase.

Packaging/release validation defaults to smoke only. Run deeper release/npm smoke only if the implementation touches packaging, bundled binary selection, CLI status, or related release paths.

## Issue Sequence

### 17.1 Final-flush default path design and failure-safety tests

Specify the production final-flush contract and add tests that fail before implementation. Cover staging database validation, atomic active-index replacement, previous-good-index preservation, metadata readability, and disk fallback availability.

Type: AFK

Blocked by: none

### 17.2 Production final-flush default for Rust opt-in indexing

Implement the production temp on-disk final-flush path and make it the default for `--engine rust`. Keep `--sqlite-write-mode disk` as a debug escape hatch and keep `memory-final-flush` experimental/debug only.

Type: AFK

Blocked by: 17.1

### 17.3 Cross-platform focused validation and packaging/CLI smoke

Run focused validation for the production final-flush path on macOS and Linux Docker. Validate Windows only if platform-sensitive replace/locking/file-handle behavior changed, otherwise document the reason it was not required. Run packaging/CLI smoke for the affected path.

Type: AFK

Blocked by: 17.2

### 17.4 End-to-end scoreboard across matched-ts-js and full profiles

Produce the scoreboard across required targets and VS Code sparse for both `matched-ts-js` and `full` profiles. Report performance, graphStats parity, sufficiency, required gate state, and next largest blocker/segment.

Type: AFK

Blocked by: 17.2 and 17.3

### 17.5 Tracker and decision record

Track Phase 17 completion, link all artifacts, record the final gate state, decide whether #165 remains open, and name the next result-oriented blocker slice.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 17.4

## Acceptance Criteria

- `--engine rust` defaults to production temp on-disk final-flush.
- `--sqlite-write-mode disk` remains available as a debug/escape hatch path.
- Experimental `memory-final-flush` is not the production default.
- Failure-safety tests prove a failed Rust index does not replace the previous good index.
- macOS and Linux Docker focused validation results are recorded.
- Windows validation is either run or explicitly marked not required/unavailable with reason.
- Packaging/CLI smoke for the affected path is recorded.
- Scoreboard reports `matched-ts-js` and `full` separately.
- Scoreboard includes performance, graphStats parity, sufficiency, required gate pass/fail, and next blocker/segment.
- Phase 17 decision does not claim Rust default rollout readiness unless the PRD gates actually pass.

## Expected Artifacts

- Production final-flush implementation and tests.
- Focused validation notes for macOS, Linux Docker, and Windows if required.
- Scoreboard raw/summary artifacts under `docs/benchmarks/`.
- Phase 17 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49 and #165.

## 16. `docs/plans/2026-06-17-rust-indexing-core-phase-18-full-profile-bottleneck-ab.md`

# Rust Indexing Core Phase 18: Full-Profile Bottleneck Segmentation And First Bounded A/B

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Open performance gate blocker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Phase 17 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

## Context

Phase 17 completed the production `final-flush` default for explicit Rust indexing and produced matched/full scoreboard evidence. Rust remains opt-in. TypeScript remains the product default.

The Phase 17 gate state is:

- PRD required-target performance gate: failed.
- Agent Sufficiency smoke: passed in both `matched-ts-js` and `full` profiles.
- Default rollout readiness: not claimed.
- #165 remains open.
- #185 remains open as retained Linux Docker focused validation coverage, but it is a system-environment validation item and does not block current project progress.

The key Phase 17 performance signal is that `matched-ts-js` is not enough to close the required gate, and `full` profile exposes larger end-to-end costs:

- ZCodeGraph full: TypeScript 4,987 ms, Rust 6,423 ms.
- Excalidraw full: TypeScript 3,426 ms, Rust 4,004 ms.
- VS Code sparse full: TypeScript 536,281 ms, Rust 606,168 ms.
- VS Code sparse full Rust core `sqliteWriteMs`: 160,722 ms.
- VS Code sparse full TypeScript finalization: 135,598 ms, including 124,152 ms of reference resolution.

Phase 18 changes the mode from forward feature completion to result-oriented convergence: segment the full profile end-to-end path, pick the largest eligible segment, and run one bounded A/B optimization with decision-grade evidence.

## Goal

Produce a full-profile end-to-end bottleneck map and attempt one bounded A/B optimization against the first selected segment: Rust full-profile SQLite write volume / transaction path.

The phase succeeds if it produces trustworthy trend evidence and a clear next blocker decision. It does not need to close the PRD gate.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not change the SQLite schema.
- Do not migrate or rewrite ReferenceResolver.
- Do not implement a TypeScript finalization/reference-resolution optimization in this phase.
- Do not change MCP tools, Explore rendering, installer behavior, release flow, or packaging architecture.
- Do not require multi-run benchmark proof.
- Do not close #165 unless the PRD required-target gate actually passes.

## Decisions

### Primary axis

Phase 18 chooses full-profile end-to-end bottleneck segmentation plus one bounded A/B optimization.

It is not a general completeness phase. Completeness work can resume after the project has a clearer model for how full-profile work affects the required performance gate.

### First A/B candidate

The first implementation candidate is Rust full-profile SQLite write volume / transaction path.

Allowed changes include:

- Rust write ordering.
- Batching.
- Prepared statement reuse.
- Transaction scope.
- SQLite PRAGMA choices local to the Rust staging database.
- Index creation timing.
- Temporary staging database build strategy.

Disallowed changes include:

- `schema.sql` changes.
- Persistent schema migration.
- Field removal or semantic changes.
- Edge meaning changes.
- MCP or TypeScript query contract changes.

If the investigation shows that the schema itself is the limiting factor, Phase 18 should record a schema-bound blocker and create follow-up work rather than changing the schema in this phase.

### Resolver/finalization boundary

Phase 18 must measure TypeScript finalization/reference resolution as a segment, but it must not implement resolver optimization.

If the SQLite A/B does not produce enough improvement, the correct outcome is a decision that the next largest blocker is TypeScript finalization/reference resolution, plus a follow-up issue. Mixing SQLite and resolver implementation in one phase would make the A/B evidence hard to interpret.

### Validation scale

Use three validation layers:

1. Reduced fixture inner loop.
2. Required targets: ZCodeGraph and Excalidraw full profile before/after.
3. Stress target: VS Code sparse full profile final after, or a concrete unavailable reason.

Do not require multiple benchmark runs. Record this as trend evidence, not statistical proof.

Every validation artifact must record RSS, or a specific unavailable reason.

Agent Sufficiency must not regress.

## Issue Sequence

### 18.1 Full-profile segmentation harness

Add or refine artifact output so the full-profile scoreboard clearly separates:

- Rust source scan / parse extraction.
- Rust SQLite write.
- Rust subprocess startup/handoff.
- TypeScript finalization.
- Reference resolution and its public sub-buckets.
- Dynamic-dispatch synthesis.
- DB maintenance.
- graphStats/sufficiency measurement overhead.

Type: AFK

Blocked by: none

### 18.2 Reduced SQLite write-path A/B candidate

Use a representative reduced full-profile fixture to try one bounded Rust SQLite write-path optimization. The issue must produce before/after evidence and preserve graphStats and sufficiency smoke.

Type: AFK

Blocked by: 18.1

### 18.3 Required-target full-profile A/B

Run full-profile before/after on ZCodeGraph and Excalidraw. Report wall time, RSS, graphStats parity, sufficiency, and segment deltas.

Type: AFK

Blocked by: 18.2

### 18.4 VS Code sparse final after and decision evidence

Run one VS Code sparse full-profile final-after validation, or record a concrete unavailable reason. Compare against the Phase 17 full-profile baseline and the Phase 18 required-target evidence.

Type: AFK

Blocked by: 18.3

### 18.5 Tracker and next blocker

Record the final Phase 18 decision:

- whether the SQLite A/B should be kept,
- whether #165 remains open,
- whether the next largest blocker is Rust write volume, TypeScript finalization/reference resolution, schema-bound design, or something else,
- which follow-up issue should own the next result-oriented slice.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 18.4

## Acceptance Criteria

- Full-profile segmentation table exists and is grounded in actual artifacts.
- One bounded Rust SQLite write-path A/B is attempted.
- No SQLite schema change is made.
- No resolver/finalization optimization is implemented in this phase.
- Reduced fixture before/after evidence is recorded.
- ZCodeGraph and Excalidraw full-profile before/after evidence is recorded.
- VS Code sparse full-profile final-after evidence is recorded, or unavailable reason is explicit.
- RSS is recorded or unavailable reason is explicit.
- graphStats and sufficiency are recorded for relevant runs.
- Required gate state is stated as pass, fail, or inconclusive with reason.
- #165 is kept open unless the PRD required-target gate actually passes.
- The next largest blocker is named with enough specificity to create the next issue sequence.

## Expected Artifacts

- Phase 18 reduced A/B raw and summary artifacts under `docs/benchmarks/`.
- Phase 18 required-target raw and summary artifacts under `docs/benchmarks/`.
- Phase 18 VS Code sparse final-after artifact or unavailable note under `docs/benchmarks/`.
- Phase 18 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49 and #165.

## Stop Conditions

Stop and write a decision instead of continuing implementation if:

- The first SQLite A/B candidate does not produce a meaningful segment improvement on the reduced fixture.
- The candidate improves SQLite write time but regresses graphStats or sufficiency.
- The candidate requires schema changes to show value.
- Required targets show no meaningful direction after the bounded A/B.
- The largest blocker clearly moves to TypeScript finalization/reference resolution.

## 17. `docs/plans/2026-06-17-rust-indexing-core-phase-19-prd-completion-gate.md`

# Rust Indexing Core Phase 19: PRD Completion Gate Audit

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Post-PRD optimization tracker to downgrade if this phase passes: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Next concrete optimization issue to keep open after PRD completion: [#193](https://github.com/jununfly/ZCodeGraph/issues/193)
- Phase 18 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

Phase 18 produced full-profile segmentation and one bounded SQLite write-path A/B. The candidate improved the intended SQLite write segment and preserved sufficiency, but it did not close the original deep performance target.

The PRD completion gate has now been clarified:

- Required targets: ZCodeGraph and Excalidraw.
- Rust remains explicit opt-in.
- TypeScript remains the product default.
- Rust full opt-in path must index end-to-end without Agent Sufficiency regression.
- The active index produced by Rust must be readable by the TypeScript shell and MCP tools.
- Rust wall time must be no more than 30% slower than TypeScript on required targets.
- Rust peak RSS must be no more than 15% higher than TypeScript on required targets.

The original deeper target remains important, but it is no longer the PRD completion gate. It becomes the post-PRD optimization gate:

- Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

Phase 19 is therefore a closeout and evidence-audit phase, not another optimization phase. It should decide whether the opt-in Rust vertical slice is complete under the clarified PRD gate, and it should preserve unresolved performance work in #165 and #193.

## Goal

Produce a decision-grade PRD completion audit for the Rust opt-in vertical slice.

The phase succeeds if it can clearly state one of:

- PRD completion gate passed, with evidence links and remaining optimization work downgraded to post-PRD follow-up.
- PRD completion gate failed, with the exact missing evidence or failing requirement named.
- PRD completion gate is inconclusive, with the smallest targeted smoke or artifact needed to make it conclusive.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not run a new full multi-run benchmark campaign.
- Do not implement another performance optimization in this phase.
- Do not close #165 as "fully optimized"; downgrade it only if the clarified PRD completion gate passes.
- Do not close #193; it remains the next concrete post-PRD optimization issue.
- Do not change SQLite schema, resolver semantics, MCP tool behavior, installer behavior, or packaging/release flow.
- Do not require VS Code sparse to pass the required-target completion gate; it remains stress evidence only.

## Decisions

### Evidence reuse

Phase 19 should reuse Phase 17 and Phase 18 artifacts wherever they already answer the clarified PRD gate. It should not rerun expensive full benchmarks merely to restate numbers already captured on the same local environment and repository snapshots.

Required reusable evidence includes:

- Phase 17 production final-flush validation and decision.
- Phase 18 full-profile required-target after artifacts.
- Phase 18 VS Code sparse final-after stress artifact.
- Existing sufficiency smoke results from the full profile.
- Existing active-index readability evidence from final-flush and CLI/MCP-compatible status/query paths.

### Targeted smoke only

If evidence is missing, Phase 19 should run the smallest targeted smoke that answers the missing question.

Allowed targeted smokes include:

- `--engine rust` index on required targets using the current full opt-in path.
- Active index readability via the TypeScript shell, CLI status/query, or MCP-compatible graph query surface.
- Agent Sufficiency smoke for the required targets.
- RSS availability check or explicit unavailable reason.

Disallowed validation expansion:

- No complete multi-run benchmark campaign.
- No new VS Code sparse rerun unless required evidence is missing and cannot be answered from Phase 18.
- No release/npm smoke unless packaging, CLI status, or release paths are touched by this phase.

### Gate semantics

The phase must separate three states:

- PRD completion gate: the opt-in Rust vertical slice is complete enough under the clarified 30% wall-time / 15% RSS regression envelope.
- Post-PRD optimization gate: the original 25% faster or 30% lower RSS target.
- Default rollout readiness: not claimed by this PRD unless separately proven.

If the PRD completion gate passes but the post-PRD optimization gate fails, #165 should be updated as a post-PRD optimization tracker rather than kept as a blocker to PRD completion. #193 should remain open as the next concrete result-oriented optimization issue.

### Decision record

The final decision record must be explicit about:

- required-target wall-time comparison,
- required-target RSS comparison or unavailable reason,
- graphStats and active-index readability,
- Agent Sufficiency,
- whether #165 is downgraded,
- why #193 remains open,
- why Rust remains opt-in,
- why no default rollout readiness is claimed.

## Issue Sequence

### 19.1 Completion gate evidence audit

Audit existing Phase 17 and Phase 18 artifacts against the clarified PRD completion gate. Produce a table covering ZCodeGraph and Excalidraw:

- TypeScript full wall time.
- Rust full wall time.
- Rust wall-time regression percentage.
- TypeScript peak RSS.
- Rust peak RSS.
- Rust RSS regression percentage or unavailable reason.
- graphStats parity.
- active-index readability.
- Agent Sufficiency.
- source artifact links.

Type: AFK

Blocked by: none

### 19.2 Targeted product smoke for missing evidence

Run only the minimal targeted smoke needed for any missing audit row from 19.1. Prefer required targets over VS Code sparse. Do not rerun a full benchmark campaign.

Type: AFK

Blocked by: 19.1

### 19.3 PRD decision and tracker updates

Write the Phase 19 decision record. If the clarified PRD completion gate passes, update #49 with the completion evidence, downgrade #165 to post-PRD optimization, and keep #193 open as the next concrete optimization issue. If the gate fails or is inconclusive, state the smallest next blocker.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 19.1 and 19.2 if targeted smoke is needed

### 19.4 Phase 19 tracker

Track the Phase 19 plan, issue sequence, evidence audit, targeted smoke status, and final decision links.

Type: AFK

Blocked by: none

## Acceptance Criteria

- Phase 19 audit table exists and is grounded in actual artifacts.
- ZCodeGraph and Excalidraw are evaluated against the clarified PRD completion gate.
- Wall-time comparison uses the 30% slower envelope.
- RSS comparison uses the 15% higher envelope, or records a concrete unavailable reason.
- Agent Sufficiency is recorded for required targets.
- Active-index readability by the TypeScript shell / CLI / MCP-compatible path is recorded.
- Any new validation is targeted smoke only.
- No new performance optimization is implemented in this phase.
- #165 is downgraded only if the clarified PRD completion gate passes.
- #193 remains open as the next concrete post-PRD optimization issue.
- The final decision does not claim Rust default rollout readiness.

## Expected Artifacts

- Phase 19 audit artifact under `docs/benchmarks/`.
- Targeted smoke artifact under `docs/benchmarks/`, only if missing evidence requires it.
- Phase 19 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49, #165, and #193.

## Stop Conditions

Stop and write a decision instead of continuing validation if:

- Existing evidence already proves the clarified PRD completion gate passes.
- Existing evidence already proves the clarified PRD completion gate fails.
- The only missing work is the post-PRD optimization gate.
- A requested smoke expands into a full benchmark campaign.
- A default rollout readiness question appears; record it as out of scope for this PRD.

## 18. `docs/plans/2026-06-17-rust-indexing-core-phase-20-end-to-end-completion.md`

# Rust Indexing Core Phase 20: End-to-End Completion

## Parent

- Completed PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Deferred concrete optimization issue: [#193](https://github.com/jununfly/ZCodeGraph/issues/193)
- Phase 19 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-decision.md`
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

Phase 19 closed the original Rust indexing core vertical slice PRD under the clarified completion gate. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

The remaining post-PRD optimization target is still open:

- Rust indexing should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

However, the next plan intentionally changes strategy. Instead of continuing to optimize isolated segments while the indexing data-production chain is still hybrid, Phase 20 first completes Rust indexing end-to-end. After that, performance, RSS, and other metrics can be optimized against a complete Rust indexing baseline.

This is a new independent plan after the completed PRD, not a continuation of the PRD completion gate and not a default rollout plan.

## Goal

Complete the Rust indexing data-production chain end-to-end for the current JavaScript and TypeScript support scope.

For this plan, "end-to-end Rust indexing" means Rust owns the indexing data-production path:

- source scan,
- parse and extraction,
- graph write,
- finalization and reference-resolution work needed to produce a usable project index,
- index metadata,
- failure-safe active-index production.

The TypeScript product shell remains responsible for:

- CLI entry and engine selection,
- MCP server and tools,
- Explore planning and rendering,
- installer and release glue,
- product integration around the generated index.

Performance and RSS must be recorded as baseline evidence, but they are not the pass/fail gate for Phase 20.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not optimize for the post-PRD 25% faster / 30% lower RSS target in this phase.
- Do not rewrite CLI, MCP, Explore, installer, release flow, or npm packaging in Rust.
- Do not change MCP tool behavior or Explore output by default.
- Do not change the persistent SQLite schema by default.
- Do not change resolver or finalization semantics silently.
- Do not migrate non-JS/TS languages in this phase.
- Do not run a broad multi-repo framework validation campaign.

## Decisions

### Completeness before optimization

Phase 20 is a completeness phase. It should produce a complete Rust indexing baseline before the project returns to unified metric optimization.

Wall time and peak RSS must still be recorded for every validation run, but they are baseline data for later optimization, not a Phase 20 completion gate.

### Product-shell boundary

Rust should complete the indexing data-production chain. TypeScript remains the product integration layer.

This keeps the plan focused on indexing completeness while preserving compatibility with current CLI, MCP, Explore, installer, and release behavior.

### Resolver and finalization semantics

Resolver and finalization migration must be parity-first.

Rust must not silently change reference-resolution semantics. Differences must be classified before being accepted:

- `parity-bug`: Rust behavior differs from TypeScript and should be fixed.
- `intentional-improvement-candidate`: Rust exposes a better behavior, but it requires explicit decision before adoption.
- `known-unsupported`: behavior is not yet migrated and must be counted in fallback taxonomy.

Semantic parity and Agent Sufficiency matter more than byte-identical graphStats.

### First implementation slice

The first real migration slice is import and path-alias resolution.

Rationale:

- It is an entry layer for reference resolution.
- It has relatively clear inputs and outputs.
- It affects many downstream references.
- It is a good way to prove the Rust/TypeScript finalization boundary protocol without taking on the entire name matcher first.

NameMatcher, framework resolvers, and dynamic-dispatch synthesis are intentionally not the first slice.

### Transitional TypeScript fallback

Phase 20 may keep transitional TypeScript fallback while the Rust indexing chain is being completed.

Fallback is allowed only as a migration guard, not as the long-term architecture. Every fallback must have telemetry and taxonomy. The completion gate requires fallback count to be zero, or every remaining fallback to be explicitly classified as `known-unsupported`.

Silent fallback is not allowed.

### Validation scope

Phase 20 validation must include:

- ZCodeGraph required target.
- Excalidraw required target.
- VS Code sparse stress target.

Each target should have at least one full Rust indexing end-to-end run. Multi-run benchmark proof is not required because this plan is not a performance optimization gate.

Every validation run must record:

- wall time,
- peak RSS or unavailable reason,
- fallback taxonomy,
- graphStats,
- active-index readability by the TypeScript shell / MCP-compatible path,
- Agent Sufficiency.

### Relationship to #165 and #193

#165 remains the post-PRD optimization tracker.

#193 remains open but is deferred as the immediate optimization path until Phase 20 produces a complete Rust indexing baseline. After Phase 20, #193 should be re-evaluated against the new complete baseline and either resumed, rewritten, or superseded by a more accurate optimization slice.

## Issue Sequence

### 20.1 Rust/TypeScript finalization boundary protocol and parity harness

Define the narrow protocol for Rust-owned finalization/reference-resolution work to interoperate with the TypeScript shell. Add a parity harness that can compare Rust and TypeScript behavior through observable index output and sufficiency-relevant queries, not private implementation details.

The protocol should support migration by slices and must expose fallback taxonomy.

Type: AFK

Blocked by: none

### 20.2 Rust import/path-alias resolution vertical slice

Implement the first real Rust finalization/reference-resolution slice: import and path-alias resolution for the current JS/TS support scope.

The slice must use the Phase 20 boundary protocol, preserve TypeScript semantics, record fallback taxonomy, and keep TypeScript fallback available only as a migration guard.

Type: AFK

Blocked by: 20.1

### 20.3 Rust JS/TS reference-resolution and finalization expansion

Expand Rust-owned indexing finalization beyond the import/path-alias slice toward the complete JS/TS reference-resolution/finalization chain needed to produce a usable project index.

This issue should migrate behavior incrementally behind the same protocol and parity harness. It should classify every semantic difference as `parity-bug`, `intentional-improvement-candidate`, or `known-unsupported`.

Type: AFK

Blocked by: 20.2

### 20.4 Fallback taxonomy and elimination gate

Make transitional fallback explicit, measurable, and decision-ready.

The issue should produce a fallback taxonomy artifact and drive fallback count to zero where behavior is in scope. Any non-zero remaining fallback must be classified as `known-unsupported`, with a clear reason and follow-up path.

Type: AFK

Blocked by: 20.3

### 20.5 End-to-end validation and decision tracker

Run the Phase 20 validation matrix on ZCodeGraph, Excalidraw, and VS Code sparse. Record wall time, peak RSS or unavailable reason, fallback taxonomy, graphStats, active-index readability, and Agent Sufficiency.

Write the final Phase 20 decision:

- whether Rust indexing data production is end-to-end complete,
- what fallback or unsupported taxonomy remains,
- whether Agent Sufficiency regressed,
- what the baseline wall/RSS metrics are,
- how #165 and #193 should be redefined after the complete baseline,
- what optimization backlog should come next.

Type: HITL for final decision wording; AFK for validation and draft artifacts.

Blocked by: 20.4

## Acceptance Criteria

- Rust owns the JS/TS indexing data-production chain end-to-end for the Phase 20 scope.
- TypeScript shell, CLI, MCP, Explore, and installer remain the product integration layer.
- The Rust-produced active index is readable by the TypeScript shell and MCP-compatible graph path.
- Resolver/finalization migration is parity-first.
- Semantic differences are classified before acceptance.
- Transitional TypeScript fallback is measured and classified.
- Fallback count is zero, or all remaining fallback is explicitly `known-unsupported`.
- Agent Sufficiency does not regress on required targets.
- ZCodeGraph, Excalidraw, and VS Code sparse each have at least one validation run.
- Wall time and peak RSS are recorded or have explicit unavailable reasons.
- GraphStats are recorded.
- No MCP/Explore behavior change is required for the phase to pass.
- No persistent SQLite schema change is made unless a separate schema decision issue is created.
- No Rust default rollout readiness is claimed.
- #165 and #193 are re-evaluated against the complete Rust indexing baseline.

## Expected Artifacts

- Rust/TypeScript finalization boundary protocol notes.
- Parity harness tests and fixtures.
- Import/path-alias resolution migration evidence.
- Rust JS/TS finalization/reference-resolution expansion evidence.
- Fallback taxonomy artifact.
- Required-target validation artifacts under `docs/benchmarks/`.
- VS Code sparse validation artifact under `docs/benchmarks/`.
- Phase 20 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #165 and #193.

## Stop Conditions

Stop and write a decision instead of continuing implementation if:

- The boundary protocol requires a persistent SQLite schema change.
- The first import/path-alias slice cannot preserve TypeScript semantics without broad resolver redesign.
- Agent Sufficiency regresses and the regression cannot be isolated to a known parity bug.
- Fallback taxonomy shows that most finalization work remains in TypeScript after the planned migration slice.
- Validation cannot produce active indexes readable by the TypeScript shell / MCP-compatible path.
- The work drifts into CLI/MCP/Explore/installer rewrite or default rollout readiness.

## 19. `docs/plans/2026-06-18-rust-indexing-core-phase-22-evidence-pipeline-and-optimization-loop.md`

# Rust Indexing Core Phase 22: Evidence Pipeline and Optimization Loop

## Parent

- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Empty-corpus evidence repair and next-candidate selection: [#210](https://github.com/jununfly/ZCodeGraph/issues/210)
- Rust core graph-write bounded A/B: [#211](https://github.com/jununfly/ZCodeGraph/issues/211)
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

The Rust indexing PRD has moved into post-PRD optimization. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

#210 and #211 showed two things at once:

- The required-target gate is improving in specific buckets, and the evidence is now more trustworthy.
- The optimization loop itself has become too manual: each candidate requires hand-written manifests, raw artifact inspection, before/after number extraction, decision-doc writing, and tracker updates.

Continuing one-off performance issues without improving this evidence pipeline risks slow iteration and inconsistent decisions. Starting unrelated new feature work would also leave the optimization loop more expensive than it needs to be.

Phase 22 is therefore a technical-debt governance phase for the performance optimization loop. It should make each future candidate easier to validate, compare, decide, and archive.

## Goal

Create a repeatable evidence pipeline for post-PRD Rust indexing optimization, then use it once on a bounded candidate and finish with a narrow architecture cleanup of the performance-related code touched by this phase.

After this phase, a future performance candidate should have a standard path:

1. Run or provide before/after experiment artifacts.
2. Generate a standard comparison markdown.
3. Rank the next candidate using explicit rules.
4. Generate a decision artifact draft.
5. Update #165 manually using a concise tracker-update section.
6. Keep or reject the implementation based on sufficiency, graphStats parity, target-bucket movement, and performance-gate status.

## Non-Goals

- Do not make Rust the default indexer.
- Do not claim Rust default rollout readiness.
- Do not require the required performance gate to pass in this phase.
- Do not add GitHub API integration to the tooling.
- Do not auto-create, auto-comment, auto-label, or auto-close GitHub issues.
- Do not change persistent SQLite schema.
- Do not change resolver semantics silently.
- Do not change MCP tool behavior.
- Do not change installer, packaging, release, or npm smoke paths.
- Do not do general repository-wide architecture cleanup.
- Do not turn this phase into an open-ended benchmark platform rewrite.

## Decisions

### Technical debt before the next isolated optimization

The next work should reduce the cost of validating and judging performance candidates before running another full candidate sequence.

This is not a pause on performance work. It is a way to make the next performance issue more disciplined and cheaper to evaluate.

### Evidence pipeline first

The first optimization target is the workflow, not Rust core internals.

The most expensive repeated work is currently:

- copying or adapting experiment manifests,
- extracting before/after numbers from raw JSON,
- checking sufficiency and graphStats parity,
- identifying the real target bucket,
- writing decision docs,
- updating #165 in a consistent style.

Phase 22 should turn these into repeatable artifacts before doing another implementation candidate.

### GitHub remains outside the tooling

Direct GitHub operations are part of the maintainer/agent workflow, not part of the evidence tooling.

The tooling may generate a tracker update draft, but it must not call GitHub APIs, run `gh`, close issues, edit labels, or require network access.

### Candidate choice is rule-driven, not pre-fixed

The default candidate after #211 is `localExactReferenceResolutionMs`, but Phase 22 should not hard-code it as the required implementation candidate before the comparison/ranking pipeline exists.

The new ranking output must confirm the candidate before the implementation issue starts.

Candidate ranking rules:

1. Prefer Rust-owned buckets before expanding TypeScript finalization dependence.
2. Exclude already-tested directions unless materially reframed:
   - #208 candidate replay verifier.
   - #209 TypeScript finalization edge-write-only hypothesis.
   - #211 FTS-trigger bulk-write optimization.
3. Prefer buckets visible on required targets and large on VS Code sparse.
4. Prefer candidates that allow bounded A/B on a reduced fixture.
5. Do not select candidates that require SQLite schema changes.
6. Do not select candidates that change resolver or graph semantics without a separate parity decision.

### Validation is tiered

Full VS Code sparse scoreboard should not run for every slice.

Tooling slices should use fixture raw artifacts and existing real artifacts. The implementation slice should use a reduced fixture for the inner loop and exactly one final after scoreboard across ZCodeGraph, Excalidraw, and VS Code sparse.

### Final cleanup is narrow

The architecture cleanup at the end is required, but scoped only to performance-related code touched by this phase.

Allowed cleanup:

- benchmark comparison tooling,
- decision artifact generation,
- Rust indexing profile field organization,
- Rust core performance helpers modified in this phase,
- duplication introduced by this phase,
- temporary scripts or unclear names introduced by this phase.

Not allowed:

- repo-wide cleanup,
- extraction/resolution architecture rewrite,
- database schema changes,
- MCP behavior changes,
- installer, packaging, release, or npm smoke changes,
- changes to graph semantics for elegance.

## Issue Sequence

### 22.1 Before/after experiment artifact comparison generator

Build a local tool that accepts a before raw experiment artifact and an after raw experiment artifact, then emits a standard markdown comparison.

The comparison must extract at least:

- target matrix,
- required vs stress classification,
- sufficiency status,
- graphStats parity status,
- wall time and wall delta,
- peak RSS and RSS delta or unavailable reason,
- Rust core profile buckets,
- TypeScript finalization total,
- finalization reference-resolution breakdown,
- empty-corpus validation status,
- experiment classification and rollout-readiness disclaimer.

Type: AFK

Blocked by: none

Validation:

- Unit/fixture tests with small synthetic artifacts.
- Smoke against #210 and #211 raw artifacts.
- No new VS Code sparse run required.

### 22.2 Candidate ranking and exclusion notes

Extend the comparison output with candidate ranking and exclusion notes.

The output should identify dominant buckets and produce a concise next-candidate recommendation or a pause recommendation. It must also explicitly list excluded candidates and why they are excluded.

The first default recommendation may be `localExactReferenceResolutionMs`, but only if the ranking rules still support it from the comparison data.

Type: AFK

Blocked by: 22.1

Validation:

- Fixture tests for ranking order.
- Fixture tests for exclusion of #208, #209, and #211 directions.
- Smoke against #210/#211 artifacts.
- No new VS Code sparse run required.

### 22.3 Decision artifact generator

Generate a standard decision document draft from the comparison output.

The draft must include:

- implementation or candidate scope,
- artifact links,
- before/after table,
- target bucket movement,
- graphStats parity result,
- sufficiency result,
- performance-gate status,
- RSS result or unavailable reason,
- keep/revert/pause recommendation,
- tracker update draft for #165,
- explicit statement that Rust default rollout readiness is not claimed.

The generated output is a local artifact. It must not update GitHub directly.

Type: AFK

Blocked by: 22.2

Validation:

- Snapshot-style fixture tests for decision markdown shape.
- Smoke generation from #210/#211 artifacts.
- No new VS Code sparse run required.

### 22.4 One bounded optimization using the new pipeline

Use the Phase 22 comparison and ranking pipeline to select exactly one bounded optimization candidate, then implement and measure it.

Default candidate: `localExactReferenceResolutionMs`, subject to confirmation by the new ranking output.

Requirements:

- Inner loop uses a representative reduced fixture.
- Final validation runs exactly one after scoreboard across:
  - ZCodeGraph required target,
  - Excalidraw required target,
  - VS Code sparse stress target.
- Use the new comparison generator and decision artifact generator for the final evidence.
- Preserve graphStats parity and sufficiency.
- Do not change SQLite schema.
- Do not change resolver semantics without an explicit parity decision.
- Do not claim Rust default rollout readiness.

Type: AFK for implementation and artifact draft; HITL if the ranking output recommends pausing or if the candidate requires semantic tradeoffs.

Blocked by: 22.3

### 22.5 Performance-related architecture cleanup

Clean up the evidence pipeline and performance-related code touched by Phase 22.

The cleanup should make the resulting design simpler and easier to extend for the next candidate. It should remove duplicated artifact parsing, unclear names, temporary structures, and phase-specific one-off code introduced during the phase.

This issue must stay narrow. It is not a license to redesign the whole indexing architecture.

Type: AFK

Blocked by: 22.4

Validation:

- Relevant unit/integration tests for touched tooling.
- Rust core tests if Rust performance code is touched.
- Targeted smoke only if cleanup touches benchmark runner or Rust performance paths.
- No default full VS Code sparse rerun unless cleanup changes final-evidence behavior.

## Acceptance Criteria

- A before/after raw artifact comparison tool exists and is tested.
- The comparison output includes wall time, RSS, sufficiency, graphStats parity, Rust core buckets, TypeScript finalization, finalization breakdown, empty-corpus validation, and classification.
- Candidate ranking rules are implemented or encoded in the generated output.
- Already-tested directions from #208, #209, and #211 are explicitly excluded unless materially reframed.
- A standard decision artifact draft can be generated from comparison output.
- The tooling does not call GitHub or require network access.
- One bounded optimization candidate is selected using the new pipeline.
- The bounded candidate has reduced-fixture evidence and one final after scoreboard across ZCodeGraph, Excalidraw, and VS Code sparse.
- GraphStats parity and sufficiency are preserved for the bounded candidate, or the issue stops with a decision artifact explaining why not.
- #165 receives a concise manual tracker update generated from the evidence.
- A final architecture cleanup removes phase-local redundancy in performance-related code.
- No Rust default rollout readiness is claimed.

## Expected Artifacts

- Comparison tool source and tests.
- Fixture raw artifacts for comparison/ranking tests.
- Generated comparison markdown for #210/#211 evidence.
- Candidate ranking output.
- Decision artifact draft generated by the new pipeline.
- Bounded optimization before/after evidence under `docs/benchmarks/`.
- Final Phase 22 decision artifact under `docs/benchmarks/`.
- Manual #165 tracker update comment generated from the final decision.

## Stop Conditions

Stop and write a decision instead of continuing if:

- The comparison/ranking tool needs GitHub integration to be useful.
- The ranking output cannot produce a clear next candidate or pause recommendation from #210/#211 evidence.
- The selected bounded candidate requires a SQLite schema change.
- The selected bounded candidate requires changing resolver semantics without a separate parity decision.
- The final after scoreboard cannot produce valid non-empty corpora for ZCodeGraph and Excalidraw.
- The cleanup work expands into unrelated architecture cleanup.
- The phase starts implying Rust default rollout readiness.

## 20. `docs/plans/2026-06-18-rust-indexing-core-phase-23-optimization-architecture-cleanup.md`

# Rust Indexing Core Phase 23: Optimization Architecture Cleanup

## Parent

- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Phase 23 tracker: [#218](https://github.com/jununfly/ZCodeGraph/issues/218)
- Phase 22 evidence pipeline decision: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Published Issues

- [#219](https://github.com/jununfly/ZCodeGraph/issues/219) - Phase 23.1: Clean up evidence pipeline contract
- [#220](https://github.com/jununfly/ZCodeGraph/issues/220) - Phase 23.2: Inventory performance experiment candidates
- [#221](https://github.com/jununfly/ZCodeGraph/issues/221) - Phase 23.3: Clean up performance production boundaries
- [#222](https://github.com/jununfly/ZCodeGraph/issues/222) - Phase 23.4: Run targeted optimization cleanup smoke
- [#223](https://github.com/jununfly/ZCodeGraph/issues/223) - Phase 23.5: Decide next post-PRD optimization step

## Context

The Rust indexing PRD has completed its opt-in vertical slice. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

The post-PRD optimization tracker remains open because the deeper target is still unmet: Rust indexing should become at least 25% faster than TypeScript or at least 30% lower peak RSS on required targets, with the other metric not significantly worse.

Recent optimization work produced useful targeted improvements, but it also exposed a process and architecture problem:

- Some individual buckets improve while end-to-end wall time remains flat or regresses on large stress targets.
- Candidate outcomes are scattered across issue comments, benchmark artifacts, retained flags, production paths, and diagnostic-only code.
- The benchmark/evidence path is now central to decision-making, but its contract and candidate lifecycle need to be tightened before another round of optimization.
- Continuing isolated performance issues now risks stacking patches without improving the ability to choose the right next candidate.

Phase 23 is therefore a technical-debt governance phase for the Rust indexing optimization architecture. Its goal is not to produce a performance win directly. Its goal is to make the next #165 optimization iteration faster, clearer, and more likely to target the real blocker.

## Goal

Clean up the Rust indexing performance optimization architecture so the next post-PRD candidate can be selected and evaluated with less ambiguity.

After this phase, the project should have:

1. A clearer evidence pipeline contract for comparing raw artifacts and generating decision drafts.
2. An inventory of performance-related experiment paths and flags, classified as production path, retained diagnostic, or dead candidate.
3. Cleaner production-code boundaries around performance profile/reporting, Rust core graph-write/finalization helpers, and TypeScript orchestration seams touched by previous optimization phases.
4. Targeted validation showing that sufficiency, artifact generation, profile fields, RSS diagnostics, and basic Rust indexing behavior remain intact.
5. A concrete next-candidate decision for #165, or an explicit no-go/profiling recommendation.

## Non-Goals

- Do not make Rust the default indexer.
- Do not claim Rust default rollout readiness.
- Do not close #165.
- Do not require the post-PRD performance target to pass.
- Do not pursue performance improvement as a Phase 23 pass condition.
- Do not run a full VS Code sparse scoreboard by default.
- Do not change default user-visible indexing behavior.
- Do not change MCP behavior.
- Do not change persistent SQLite schema.
- Do not change installer, packaging, release, status, or npm smoke paths.
- Do not add GitHub API integration to benchmark/evidence tooling.
- Do not auto-create, auto-comment, auto-label, or auto-close GitHub issues from tooling.
- Do not turn this into general repository-wide cleanup.
- Do not start an unrelated new feature.

## Decisions

### Choose technical debt governance before another direct optimization

The next direction should be technical debt governance, not another immediate performance candidate and not new feature work.

This is not a pause on #165. It is a control phase to make the next #165 candidate selection more reliable.

### Optimize for the next optimization loop

The primary objective is to make the next performance optimization faster and more accurate.

Long-term maintainability matters, but it is secondary. Phase 23 should prioritize debt that directly affects:

- profile interpretation,
- artifact comparison,
- candidate ranking,
- experiment flag lifecycle,
- Rust/TypeScript performance boundary clarity,
- sufficiency and graphStats trust,
- next-candidate selection.

### Production code can change, but behavior cannot

Phase 23 may modify production code when that makes boundaries clearer or diagnostics more trustworthy.

Allowed production-code changes:

- refactor performance/profile helpers,
- consolidate duplicated diagnostic plumbing,
- clarify Rust core profile/reporting structures,
- isolate retained diagnostic paths from production hot-path logic,
- simplify finalization or graph-write helper boundaries without changing behavior,
- remove dead candidate code from runtime paths when evidence shows it has no continuing diagnostic value.

Not allowed:

- changing default indexing behavior,
- changing graph semantics,
- changing resolver semantics,
- changing SQLite schema,
- changing MCP output or tool behavior,
- making performance improvement the reason to accept the phase.

### Classify experiment paths instead of deleting blindly

Performance-related flags and candidate code must be classified before removal or retention.

Categories:

- `production path`: a candidate that is now part of the normal implementation and should be kept, named clearly, and tested as normal behavior.
- `retained diagnostic`: a path that is not a production optimization but remains useful for profile artifacts, semantic verification, or candidate analysis. It should be isolated, named as diagnostic, and documented as not a stable public API unless separately promoted.
- `dead candidate`: a path that has no continuing implementation or diagnostic value. Evidence should remain in `docs/benchmarks/`, but runtime code and confusing flags should be removed or retired.

Closing this phase does not require deleting many things. It requires that future agents can tell why each retained performance path exists and whether it may be used for the next optimization.

### Evidence/tooling first, production cleanup second

The order matters:

1. Stabilize the evidence pipeline contract.
2. Inventory and classify experiment/candidate paths.
3. Clean up production-code boundaries using that inventory.
4. Validate with targeted tests and smoke/profile only.
5. Select the next #165 candidate or no-go.

The evidence pipeline is now the entry point for post-PRD optimization. If its artifact contract, RSS/unavailable handling, ranking, decision draft, and empty-corpus/status language are unclear, later production changes become harder to judge.

### Default validation is targeted smoke/profile, not full scoreboard

Phase 23 should not run a full VS Code sparse scoreboard by default.

Default validation:

- unit/integration tests for touched tooling,
- Rust core tests if Rust performance code is touched,
- targeted fixture smoke for evidence comparison/ranking/decision generation,
- targeted smoke/profile when Rust core profile/reporting or TypeScript orchestration paths are touched,
- RSS recorded or an unavailable reason recorded,
- sufficiency checked when the touched path can affect index/read/explore behavior.

Run a full VS Code sparse scoreboard only if the cleanup changes final-evidence semantics or materially changes behavior in a way targeted smoke/profile cannot cover.

### Phase 23 must select the next #165 step

Phase 23 must end with a next-candidate decision.

Allowed decisions:

- create or recommend one bounded optimization candidate,
- create or recommend one profiling issue if evidence is insufficient,
- identify an architecture blocker that must be handled before more performance work,
- explicitly no-go direct optimization until a named diagnostic gap is closed.

The decision must not be vague. It should say what #165 should do next and why.

### #165 remains open

Phase 23 should update #165 with the completed governance result and next step, but it should not close #165.

The post-PRD optimization gate remains the responsibility of #165 until separate evidence proves the deeper target is met or the maintainer explicitly changes the target.

## Issue Sequence

### 23.1 Evidence pipeline contract cleanup

Tighten the benchmark/evidence tooling contract introduced in Phase 22.

Scope:

- consolidate duplicated artifact parsing and comparison helpers,
- make comparison/ranking/decision draft output easier to reuse,
- normalize target status, required/stress classification, empty-corpus status, sufficiency, graphStats parity, wall time, RSS, and unavailable reasons,
- keep rollout-readiness disclaimers explicit,
- keep the tool local-only with no GitHub/network behavior,
- avoid adding new benchmark dimensions unless they directly support candidate selection.

Type: AFK

Blocked by: none

Validation:

- fixture tests for artifact parsing and comparison output,
- fixture tests for ranking and decision draft output,
- smoke generation using existing Phase 22 artifacts,
- no full VS Code sparse scoreboard.

### 23.2 Experiment and candidate inventory

Create an inventory of performance-related production paths, diagnostic paths, experiment flags, and dead candidates.

The inventory should classify at least the recent optimization line:

- final-flush / SQLite write-mode paths,
- Rust core graph-write and FTS rebuild paths,
- finalization/reference-resolution diagnostic fields,
- candidate replay or equivalence diagnostics,
- edge materialization/write candidates,
- local exact reference lookup cache,
- evidence pipeline scripts and generated artifacts,
- any retained environment validation item that is relevant to interpreting optimization work.

For each entry, record:

- category: production path, retained diagnostic, or dead candidate,
- owning issue or artifact,
- why it exists,
- whether it can affect default behavior,
- whether it can be used for future #165 optimization,
- what cleanup or documentation is needed.

Type: AFK

Blocked by: 23.1

Validation:

- inventory document committed under `docs/benchmarks/` or `docs/design/`,
- inventory references the relevant issue/artifact numbers,
- #185 remains untouched unless packaging/CLI/status/release/npm smoke paths are actually touched.

### 23.3 Production boundary cleanup for performance paths

Use the inventory to make narrow production-code cleanup changes in performance-related paths.

Allowed areas:

- Rust core profile/reporting structures,
- Rust core graph-write or finalization helper boundaries touched by prior optimization phases,
- TypeScript Rust indexing orchestration profile handling,
- benchmark runner profile/artifact handling,
- retained diagnostic isolation,
- removal of dead candidate runtime paths when evidence supports removal.

Constraints:

- no default behavior change,
- no graph semantic change,
- no resolver semantic change,
- no SQLite schema change,
- no MCP behavior change,
- no installer, packaging, release, status, or npm smoke path changes,
- no performance claim as a pass condition.

Type: AFK; HITL if cleanup would remove a diagnostic path whose future value is ambiguous.

Blocked by: 23.2

Validation:

- targeted TypeScript tests for touched orchestration/tooling,
- `cargo test -p zcodegraph-core` if Rust core is touched,
- `cargo fmt -p zcodegraph-core --check` if Rust core is touched,
- build if TypeScript production paths are touched.

### 23.4 Targeted smoke/profile validation

Validate that Phase 23 cleanup preserved the evidence loop and basic Rust indexing behavior.

Required validation:

- evidence comparison/ranking/decision fixture tests pass,
- targeted smoke/profile produces valid artifacts after cleanup,
- RSS is recorded or an unavailable reason is recorded,
- sufficiency is checked if touched paths can affect index/read/explore behavior,
- graphStats or an equivalent semantic parity signal is recorded when the smoke writes an index,
- no Rust default rollout readiness is claimed.

Default: do not run a full VS Code sparse scoreboard.

Run a full VS Code sparse scoreboard only if 23.3 changes final-evidence semantics or behavior in a way targeted smoke/profile cannot validate.

Type: AFK

Blocked by: 23.3

### 23.5 Next-candidate decision and #165 update

Write the Phase 23 closeout decision and update #165 manually.

The closeout must include:

- what evidence/tooling contract changed,
- what inventory entries were classified,
- what production cleanup was performed,
- what validation ran,
- whether RSS was recorded or why unavailable,
- whether sufficiency was checked or why not applicable,
- what the next #165 step is,
- explicit statement that #165 remains open,
- explicit statement that Rust default rollout readiness is not claimed.

The next step must be one of:

- one bounded optimization candidate,
- one profiling issue,
- one architecture blocker,
- no-go direct optimization until a named diagnostic gap is closed.

Type: HITL for final next-candidate choice if evidence points to multiple plausible directions; otherwise AFK.

Blocked by: 23.4

### 23.6 Phase 23 tracker

Track the phase sequence and guardrails.

The tracker should link the five implementation issues and keep the phase scoped to optimization architecture cleanup.

It should not replace #165. It should report back to #165 when complete.

Type: AFK

Blocked by: none

## Acceptance Criteria

- The Phase 23 evidence pipeline contract is cleaned up and tested.
- A performance experiment/candidate inventory exists.
- Inventory entries are classified as production path, retained diagnostic, or dead candidate.
- Retained diagnostics are named and isolated clearly enough that they are not mistaken for default behavior.
- Dead candidates are removed from runtime paths or explicitly justified as retained diagnostics.
- Production-code cleanup, if any, stays within performance-related boundaries.
- Default user-visible indexing behavior is unchanged.
- SQLite schema is unchanged.
- MCP behavior is unchanged.
- Installer, packaging, release, status, and npm smoke paths are unchanged unless explicitly brought into scope by a separate decision.
- Targeted smoke/profile evidence confirms artifact generation and diagnostic continuity.
- RSS is recorded or an unavailable reason is recorded.
- Sufficiency is checked when relevant.
- A next-candidate decision for #165 is produced.
- #165 is updated manually and remains open.
- No Rust default rollout readiness is claimed.

## Expected Artifacts

- Updated evidence pipeline tool/tests, if cleanup requires code changes.
- Experiment/candidate inventory document.
- Production boundary cleanup diff, if justified by the inventory.
- Targeted smoke/profile artifact or documented smoke output.
- Phase 23 closeout decision under `docs/benchmarks/`.
- Manual #165 tracker update.

## Stop Conditions

Stop and write a decision instead of continuing if:

- The cleanup would change default indexing behavior.
- The cleanup requires changing SQLite schema.
- The cleanup would change MCP behavior.
- The cleanup starts depending on GitHub/network integration inside evidence tooling.
- Candidate classification cannot separate production paths from diagnostics.
- A retained diagnostic is too ambiguous to keep without maintainer input.
- Targeted smoke/profile cannot produce trustworthy artifacts.
- The phase expands into unrelated repository-wide cleanup.
- The phase starts implying Rust default rollout readiness.
