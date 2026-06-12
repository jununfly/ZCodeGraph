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
- [ ] Add status metadata display for the engine that produced the index.

### 3. SQLite Contract And Metadata

- [ ] Document the SQLite tables Phase 1 Rust will write.
- [ ] Document the columns Rust must preserve exactly.
- [ ] Document which ordering differences are irrelevant.
- [ ] Write files records for indexed JS/TS/JSX/TSX files.
- [ ] Write node records using stable IDs compatible with TypeScript readers.
- [ ] Write intra-file edges such as `contains`, local `calls`, `imports`, and
  `exports` where Phase 1 extraction supports them.
- [ ] Write unresolved references needed by the existing TypeScript resolver.
- [ ] Write index engine metadata, including engine name and engine version.
- [ ] Preserve existing schema version and extraction version semantics.
- [ ] Ensure TypeScript `CodeGraph` can open and query a Rust-written index.

### 4. Locking And Failure Safety

- [ ] Reuse the existing project write lock location and semantics.
- [ ] Add a Rust-side lock acquisition test.
- [ ] Add a cross-process test showing TypeScript and Rust do not write at the
  same time.
- [ ] Ensure Rust indexing writes to a temporary or otherwise failure-safe
  target.
- [ ] Ensure a Rust indexing failure leaves the previous good index active.
- [ ] Ensure partial Rust output is not mistaken for a complete index.
- [ ] Ensure Ctrl-C or subprocess termination does not leave a permanently
  locked index.

### 5. Native Tree-Sitter JS/TS Parser

- [ ] Add Rust tree-sitter dependencies for JavaScript and TypeScript grammars.
- [ ] Support `.js`, `.jsx`, `.ts`, and `.tsx` detection.
- [ ] Parse files without using Node `web-tree-sitter` or WebAssembly.
- [ ] Bound parser concurrency so peak RSS can be controlled.
- [ ] Release AST/parser resources promptly after each file or batch.
- [ ] Add parser unit tests for each supported extension.
- [ ] Add error handling for parse failures that mirrors existing indexer
  behavior.

### 6. JS/TS/JSX/TSX Extraction Slice

- [ ] Extract file nodes.
- [ ] Extract modules where applicable.
- [ ] Extract exported and non-exported functions.
- [ ] Extract classes.
- [ ] Extract methods.
- [ ] Extract constructors.
- [ ] Extract properties and fields where supported by Phase 1.
- [ ] Extract variables and constants needed by current JS/TS graph behavior.
- [ ] Extract type aliases and interfaces.
- [ ] Extract imports and exports.
- [ ] Extract JSX components and component usages needed by existing behavior.
- [ ] Extract object-literal methods used by store/action patterns.
- [ ] Extract local call references.
- [ ] Extract unresolved references for TypeScript resolver follow-up.
- [ ] Preserve language values expected by TypeScript readers.
- [ ] Preserve source line and column ranges well enough for Explore source
  rendering and blast-radius output.

### 7. TypeScript Resolver Handoff

- [ ] After Rust extraction completes, run existing TypeScript resolver steps.
- [ ] Run existing post-extract framework finalization where applicable.
- [ ] Run existing batched reference resolution.
- [ ] Run existing dynamic-dispatch synthesizers.
- [ ] Ensure resolver output is not skipped because the index metadata says
  Rust produced extraction data.
- [ ] Add an integration test where Rust extraction plus TypeScript resolution
  produces cross-file references usable by graph queries.

### 8. Semantic Parity Tests

- [ ] Build a parity comparator that compares TypeScript and Rust extraction
  semantically.
- [ ] Compare file nodes.
- [ ] Compare named functions/classes/methods/components.
- [ ] Compare imports and exports.
- [ ] Compare `contains` edges.
- [ ] Compare local calls and unresolved references.
- [ ] Compare source locations within an acceptable tolerance.
- [ ] Categorize differences as expected, acceptable, or blocking.
- [ ] Add fixture parity tests for plain JavaScript.
- [ ] Add fixture parity tests for TypeScript.
- [ ] Add fixture parity tests for JSX.
- [ ] Add fixture parity tests for TSX.
- [ ] Add fixture parity tests for object-literal methods.
- [ ] Add fixture parity tests for imports, exports, and re-exports.
- [ ] Add fixture parity tests for component usage.
- [ ] Add real-repo parity checks for this repository.
- [ ] Add real-repo parity checks for Excalidraw.

### 9. CLI Integration Tests

- [ ] Test that `zcodegraph index` still uses the TypeScript indexer by
  default.
- [ ] Test that `zcodegraph index --engine rust` invokes the Rust subprocess.
- [ ] Test that environment engine selection invokes the Rust subprocess.
- [ ] Test that unsupported files/languages still have a clear behavior under
  the Phase 1 Rust engine.
- [ ] Test that Rust subprocess failure is rendered as a normal CLI error.
- [ ] Test that status reports the index engine metadata.
- [ ] Test that TypeScript MCP tools can query a Rust-produced index.

### 10. Performance And Memory Benchmarks

- [ ] Establish TypeScript indexer baseline for this repository.
- [ ] Establish Rust indexer baseline for this repository.
- [ ] Establish TypeScript indexer baseline for Excalidraw.
- [ ] Establish Rust indexer baseline for Excalidraw.
- [ ] Capture wall-clock indexing time.
- [ ] Capture peak RSS.
- [ ] Record Node version, Rust version, OS, CPU, and repo commit.
- [ ] Verify Rust is at least 25% faster or at least 30% lower peak RSS on this
  repository, with the other metric not significantly worse.
- [ ] Verify Rust is at least 25% faster or at least 30% lower peak RSS on
  Excalidraw, with the other metric not significantly worse.
- [ ] Store benchmark results in a compact repo document.
- [ ] If the hard gate fails, stop expansion and document why.

### 11. Agent Sufficiency Guardrails

- [ ] Index this repository with the TypeScript engine and run representative
  ZCodeGraph flow prompts.
- [ ] Index this repository with the Rust engine and run the same ZCodeGraph
  flow prompts.
- [ ] Index Excalidraw with the TypeScript engine and run representative
  Excalidraw flow prompts.
- [ ] Index Excalidraw with the Rust engine and run the same Excalidraw flow
  prompts.
- [ ] Verify generic Read fallback does not increase.
- [ ] Verify generic Grep/Bash fallback does not increase.
- [ ] Verify Flow section connectivity does not regress for prompts that were
  already connected.
- [ ] Record any differences as graph coverage, scope shallow, scope noisy, or
  agent ignored evidence.
- [ ] Store guardrail results in a compact repo document.

### 12. Packaging And Release Readiness

- [ ] Decide how the Rust binary is built for local development.
- [ ] Decide how the Rust binary is included in per-platform bundles.
- [ ] Ensure npm install and npx behavior remain unchanged when Rust is unused.
- [ ] Ensure the experimental Rust path is absent or clearly unavailable on
  unsupported platforms.
- [ ] Add documentation for the experimental flag and rollback path.
- [ ] Add a changelog entry only when the feature becomes user-visible.

### 13. Stop / Continue Decision

- [ ] Confirm semantic parity is good enough for JS/TS/JSX/TSX.
- [ ] Confirm TypeScript resolver handoff works.
- [ ] Confirm TypeScript MCP/Explore can use Rust-produced indexes.
- [ ] Confirm performance or memory hard gates pass on this repository.
- [ ] Confirm performance or memory hard gates pass on Excalidraw.
- [ ] Confirm Agent Sufficiency guardrails do not regress.
- [ ] If all checks pass, propose Phase 2 language expansion issues.
- [ ] If any hard gate fails, document the failure and keep Rust indexer
  experimental/off by default.

## Suggested Issue Breakdown

- [ ] Issue A: Add Cargo workspace and Rust core CLI skeleton.
- [ ] Issue B: Add TypeScript index-engine selection seam and opt-in flag/env.
- [ ] Issue C: Define Rust subprocess protocol, progress events, and error
  contract.
- [ ] Issue D: Implement SQLite writer, metadata, lock discipline, and
  failure-safe writes.
- [ ] Issue E: Implement native tree-sitter parser for JS/TS/JSX/TSX.
- [ ] Issue F: Port semantic extraction slice for JS/TS/JSX/TSX.
- [ ] Issue G: Wire Rust extraction to existing TypeScript resolver handoff.
- [ ] Issue H: Add semantic parity comparator and fixture suite.
- [ ] Issue I: Add CLI/MCP integration tests for Rust-produced indexes.
- [ ] Issue J: Run performance and memory benchmark gates.
- [ ] Issue K: Run Agent Sufficiency guardrail matrix.
- [ ] Issue L: Document stop/continue decision and next phase.

## Agent Handoff Notes

- Prefer the existing public seams first: CLI `index`, SQLite index readability,
  MCP `zcodegraph_explore`, and existing graph/query APIs.
- Do not start by migrating all languages. The first useful slice is JS/TS only.
- Do not bypass the TypeScript resolver in Phase 1. The Rust core should produce
  extraction data that the existing resolver can finish.
- Do not optimize for byte-identical output. Optimize for stable semantic
  contract, Agent Sufficiency, and the hard performance/memory gates.
- Keep the Rust engine opt-in until the stop/continue checklist passes.

## Local Validation

For the Phase 1 skeleton slice, run:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts
cargo test
```

CI decision for the skeleton: keep `cargo test` as local validation until the
first Rust write/read slice lands. Once the Rust core writes metadata safely and
TypeScript can read it back, add `cargo test` to CI with the matching CLI
integration coverage.
