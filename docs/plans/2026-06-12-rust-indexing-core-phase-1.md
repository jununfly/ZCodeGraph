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
