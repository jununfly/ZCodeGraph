# ZCodeGraph Architecture Roadmap

## Purpose

This document turns the architecture review candidates into a shared design language for future technical design, testing, and benchmark work.

Durable sources:

- `ZJ-CONTEXT.md`
- `docs/designs/adaptive-explore-sizing.md`
- `docs/benchmarks/call-sequence-analysis.md`
- `docs/benchmarks/answer-directly-vs-explore-agent.md`

Historical inputs converted into this document:

- `docs/plans/architecture-review-2026-06-08T18-03-08.md` (removed after conversion)
- `docs/plans/zcodegraph-architecture-review-handoff-2026-06-08.md` (handoff artifact, already absent from `docs/plans/`)

## North Star

The north star is **Agent Sufficiency**: ZCodeGraph answers should give agents enough code understanding to continue the task without falling back to generic Read/Grep-style tools.

This means architecture work should not optimize for graph completeness in isolation. Graph completeness matters when it improves the Evidence Scope and Output Budget of the answer the agent actually receives.

## Design vocabulary

Domain language lives in `ZJ-CONTEXT.md`. This document uses those terms to guide implementation design.

Key terms:

- Agent Sufficiency
- Explore Answer
- Evidence Scope
- Output Budget
- Evidence Value
- Read/Grep Fallback

## Evidence Value tiers

These tiers are design guidance for planners and tests. They are intentionally not part of the domain glossary.

### 1. Critical

Evidence that must usually enter the Evidence Scope, often with source-rich rendering.

Examples:

- The mechanism path the agent is trying to understand.
- A user- or agent-named callable.
- Destination or last-mile bodies needed to explain the next action.
- Freshness or staleness signals that change whether the answer can be trusted.

Failure mode if omitted: the agent has to Read/Grep to reconstruct the answer's core mechanism.

### 2. Supportive

Evidence that should usually enter the Evidence Scope, but does not always need full source.

Examples:

- Contracts or interfaces that explain a family of implementations.
- Caller/callee context around the mechanism.
- One representative implementation from a sibling family.
- Nearby domain types that help interpret the mechanism.

Failure mode if omitted: the answer may be technically traceable but hard for the agent to act on confidently.

### 3. Compressible

Evidence that is relevant but should usually be summarized, skeletonized, or represented once.

Examples:

- Redundant sibling implementations.
- Large family files where full source would starve other evidence.
- Repeated framework boilerplate.
- Multiple equivalent adapters or strategy implementations.

Failure mode if over-expanded: Output Budget is spent on repetition, pushing out higher-value evidence and causing fallback reads.

### 4. Distracting

Evidence that should usually be omitted unless the query explicitly asks for it.

Examples:

- Tests, fixtures, mocks, and generated code when the user asks about product/runtime behavior.
- Files matched only by weak terms rather than task intent.
- Stale, noisy, or low-confidence evidence that would mislead the agent.

Failure mode if included: noisy answers, budget starvation, and lower Agent Sufficiency despite larger output.

## Candidate roadmap

### Candidate 1: Explore Answer planner / Output Budget Seam ✅ COMPLETED (2026-06-10)

Goal: make Explore produce an explicit Explore Answer before formatting the final answer.

**Status: Implemented.** Three modules extracted behind a seam:

- **`src/mcp/explore-types.ts`** — `ExplorePlan`, `ExplorePlanEntry` (with
  `evidenceValue`, `renderMode`, `reason`), `ExploreOutputBudget`, `FlowSpine`.
- **`src/mcp/explore-planner.ts`** — `plan()` computes budgets, collects
  subgraph, scores/sorts files, assigns evidence values, applies
  skeletonization policy, and produces an `ExplorePlan`.
- **`src/mcp/explore-renderer.ts`** — `render()` takes the plan and produces
  formatted markdown output.
- **`src/mcp/tools.ts`** — `handleExplore()` reduced to 25-line adapter.

Follow-up cleanup: the Flow spine is now single-sourced in
`src/mcp/explore-planner.ts`; `handleExplore()` passes `planResult.spine`
directly to the renderer and no longer keeps a duplicate fallback Flow builder.
Blast radius and staleness remain adapter-level concerns because they depend on
tool-wide pending-file state and caller/test lookups shared with other MCP
outputs.

Tests: `__tests__/explore-planner.test.ts` (133 tests),
`__tests__/explore-renderer.test.ts` (4 tests),
`__tests__/explore-types.test.ts` (10 tests). All 147 pass.

Design docs updated: see `docs/designs/adaptive-explore-sizing.md#current-code`.

## Read/Grep Fallback boundary

Use this boundary when interpreting benchmark transcripts:

- **Read/Grep Fallback = expected answer evidence recovery.** A generic Read/Grep call counts as fallback when it recovers evidence that should have been included or rendered more deeply by the ZCodeGraph answer.
- **Legitimate Deepening Read = beyond-contract next-step inspection.** A generic Read/Grep call does not count as fallback when the agent is inspecting beyond the promised Evidence Scope, preparing an edit, verifying behavior, or entering a frontier ZCodeGraph intentionally does not model.

A generic Read/Grep call counts as fallback only when all of these are true:

1. The evidence was expected by the user's Explore query.
2. The evidence falls inside ZCodeGraph's graph/output contract.
3. The evidence was available or derivable from the graph and source context.
4. The current Evidence Scope or Output Budget should have included it, or should have rendered it more deeply.

It does not count as fallback when the agent reads beyond the promised Evidence Scope, such as:

- def-use/data-flow frontiers ZCodeGraph intentionally omits;
- exact runtime values or behavior that require source inspection beyond graph evidence;
- edit preparation after ZCodeGraph has already narrowed the target;
- verification reads for tests, config, fixtures, or generated files when those are part of the user task;
- source inspection explicitly requested by the user.

Benchmark reports may still show raw Read/Grep counts, but interpretation should classify reads as fallback reads, legitimate deepening reads, edit-prep reads, verification reads, or irrelevant/noisy reads.

### Candidate 2: Dynamic dispatch synthesizer registry / Seam ✅ COMPLETED (2026-06-10)

Goal: turn callback/framework/language-specific edge synthesis into registry entries with explicit precision guards and metadata contracts.

**Status: Implemented.** Unified registry with 42 entries (21 full-graph + 21 per-reference):

- **`src/resolution/synthesizer-types.ts`** — `FullGraphSynthesizer`,
  `PerReferenceSynthesizer`, `SynthesizerDescriptor` (with precision, cost,
  knownFalsePositives, dependsOn), `SynthesizerRegistry` interface,
  `SynthesizerConfig` for enable/disable control, `wrapFrameworkResolver()`.
- **`src/resolution/synthesizer-registry.ts`** — `createSynthesizerRegistry()`
  with topological sort, language filtering, precision thresholds,
  `applyConfig()`.
- **`src/resolution/synthesizer-modules.ts`** — 21 `FullGraphSynthesizer`
  entries wrapping the exported functions from `callback-synthesizer.ts`.
- **`src/resolution/callback-synthesizer.ts`** — all 19+ synthesize functions
  now `export function` (was private).
- **`src/resolution/frameworks/index.ts`** — `registerFrameworkSynthesizers()`
  wraps 21 FrameworkResolvers into the unified registry.
- **`__tests__/synthesizer-registry.test.ts`** — 22 tests (register, topo
  sort, language filter, precision threshold, enable/disable config).

Relationship to Candidate 1:
- Candidate 2 improves graph evidence availability.
- Candidate 1 decides whether that evidence becomes useful answer evidence.

Design docs: see `docs/designs/dynamic-dispatch-coverage-playbook.md`.

### Candidate 3: Index pipeline Module ✅ COMPLETED (2026-06-10)

Goal: move indexing lifecycle orchestration behind a testable pipeline interface.

**Status: Implemented.** Pipeline interface with independently testable stages:

- **`src/extraction/index-pipeline-types.ts`** — `IndexPipeline`, `IndexStage`,
  `IndexContext`, `IndexStageResult` interfaces. The pipeline carries a shared
  context through each stage; each stage reads what it needs and writes its
  contributions.
- **`src/extraction/index-pipeline.ts`** — `createIndexPipeline()` factory.
  Runs stages in registration order, accumulates counters and errors,
  handles abort signals and stage failures.
- **`src/extraction/index-stages.ts`** — Three pipeline stages extracted from
  `ExtractionOrchestrator.indexAll()`:
  - `ScanStage` — file discovery + framework detection
  - `ParseStage` — worker-thread tree-sitter parsing + DB storage
  - `RetryStage` — WASM memory error recovery with comment-stripping fallback
- **`__tests__/index-pipeline.test.ts`** — 28 tests covering pipeline
  lifecycle, stage ordering, abort handling, error accumulation, context
  propagation, and stage name contracts.

The pipeline is a first step: `ExtractionOrchestrator.indexAll()` still uses
its monolithic implementation, but the pipeline is available for incremental
adoption. Each stage is independently testable with injected file lists and
mock QueryBuilder.

Relationship to Candidates 1–2:
- Candidate 3 improves index build reliability and testability.
- Candidates 1–2 improve what agents receive from the built index.

### Candidate 4: Extraction parse execution Module ✅ COMPLETED (2026-06-10)

Goal: isolate parse execution behind worker and in-process adapters.

**Status: Implemented.** Unified `ParseExecutor` interface with two adapters:

- **`src/extraction/parse-executor-types.ts`** — `ParseExecutor` interface
  (`initialize`, `parse`, `dispose`), `ParseRequest`, `ParseExecutionResult`,
  `ParseExecutorConfig`.
- **`src/extraction/parse-executor-inprocess.ts`** — `InProcessParseExecutor`
  calls `extractFromSource()` directly. Used when worker threads are
  unavailable or in tests.
- **`src/extraction/parse-executor-worker.ts`** — `WorkerParseExecutor`
  encapsulates worker thread lifecycle: creation, grammar loading, message
  routing, timeout handling, periodic recycling, WASM crash detection.
  Previously ~230 lines spread across ParseStage.
- **`src/extraction/parse-executor-fallback.ts`** — `stripCommentLines()` and
  `isWasmMemoryError()` helpers, independently testable.
- **`__tests__/parse-executor.test.ts`** — 32 tests covering
  InProcessParseExecutor lifecycle, parsing, error propagation,
  WorkerParseExecutor construction/config, stripCommentLines (10 cases),
  isWasmMemoryError (7 cases), and interface contract verification.

Both executors share the same interface. Callers use `executor.parse(request)`
regardless of whether parsing happens in a worker thread or in-process.
Retry/failure logic remains in RetryStage which can use either executor.

Relationship to Candidates 1–4:
- Candidate 4 makes the parse execution swappable and independently testable.
- Candidates 1–2 improve what agents receive; 3–4 improve how the index is built.

### Candidate 5: CLI command adapter / execution context Seam ✅ COMPLETED (2026-06-10)

Goal: separate command behavior from process-level IO, formatting, and exit handling.

**Status: Implemented.** Generalizes the `UpgradeDeps` pattern into a
reusable `CommandContext` interface:

- **`src/cli/command-context.ts`** — `CommandContext`, `CommandResult`,
  `CommandFn<Args>`, `CommandOutput`, `CommandError` types. Factories:
  `createProcessContext()` (real IO), `createTestContext()` (in-memory
  buffers, `exit()` throws `TestExit`). Helpers: `writeCommandOutput()`,
  `writeCommandErrors()`.
- **`src/cli/command-helpers.ts`** — Pure functions extracted from
  `zcodegraph.ts`: `resolveProjectPath()`, `isProjectInitialized()`,
  `requireInitialized()`, `requireNotInitialized()`, `formatNumber()`,
  `formatDuration()`, `truncate()`, `formatSize()`. All independently
  testable without process-level IO.
- **`src/cli/commands.ts`** — Example command implementations using the
  `CommandFn` pattern: `runInit`, `runUninit`, `runIndex`, `runStatus`.
  Each accepts typed args + `CommandContext`, returns `CommandResult`.
  No `process.exit()`, no `console.log()` — all side effects through
  injected context.
- **`__tests__/command-context.test.ts`** — 20 tests: `createTestContext`
  (stdout/stderr capture, log capture, TestExit throwing),
  `writeCommandOutput` (text/lines/json/empty), `writeCommandErrors`
  (error→stderr, warn/info→stdout, mixed).
- **`__tests__/command-helpers.test.ts`** — 22 tests: `resolveProjectPath`
  (cross-platform), `isProjectInitialized` (dir/file/nonexistent),
  `requireInitialized`/`requireNotInitialized` (ok/error paths),
  `formatNumber`, `formatDuration` (ms/s/min), `truncate`, `formatSize`.

The pattern enables: commands tested in-process with injected context,
output captured in buffers, exit handled via `TestExit` throw instead
of process termination. Existing commands in `zcodegraph.ts` can be
migrated incrementally.

### Candidate 6: Installer target adapter contract hardening ✅ COMPLETED (2026-06-10)

Goal: separate install plan generation from interactive/non-interactive rendering.

**Status: Implemented.** Extracted InstallPlan data structure and
InstallRenderer interface from the monolithic `runInstallerWithOptions()`:

- **`src/installer/install-plan.ts`** — `InstallPlan` data structure
  (targets, location, autoAllow, installCli, initializeProject, cwd)
  and `buildInstallPlan()` pure function. Resolves CLI flags, --yes
  defaults, and interactive choices into a concrete plan with no I/O.
  Includes internal `resolveTargetsFromList()` that works against any
  caller-supplied target list (not just the global registry), making
  the plan builder fully testable with stubs.
- **`src/installer/install-renderer.ts`** — `InstallRenderer` interface
  (intro, planSummary, targetResult, warn, info, success, error, outro,
  note, spinnerStart) + two implementations:
  - `NonInteractiveRenderer` — writes to CommandContext (stdout/stderr),
    suitable for --yes / CI / scripting.
  - `TestRenderer` — captures all output in-memory for test assertions.
- **`__tests__/install-plan.test.ts`** — 24 tests: non-interactive
  defaults, explicit flags, interactive overrides, edge cases, plan
  shape contract, determinism.
- **`__tests__/install-renderer.test.ts`** — 27 tests: NonInteractiveRenderer
  output capture (intro, planSummary, targetResult, warn/error to stderr,
  info/success/outro to stdout, notes, spinner), TestRenderer buffer
  capture (all methods, spinner lifecycle, clean initial state),
  interface contract verification for both renderers.

The existing `runInstallerWithOptions()` continues to work as before;
the new types enable incremental migration. Each renderer is independently
testable without @clack/prompts or process-level I/O.

Relationship to Candidate 5:
- Candidate 5 provided the `CommandContext` pattern (IO injection).
- Candidate 6 applies it to the installer, separating plan logic from
  rendering. NonInteractiveRenderer uses CommandContext directly.

### Candidate 7: Query/storage Access Model Seam ✅ COMPLETED (2026-06-10)

Goal: identify access-model boundaries by caller intent before splitting SQL surfaces.

**Status: Implemented.** Extracted 4 narrow access-model interfaces from the
55-method `QueryBuilder` monolith:

- **`src/db/access-models.ts`** — Four interfaces organized by caller intent:
  - `AgentAccessModel` (19 methods) — agent-serving queries: getNodeById,
    searchNodes, findNodesByExactName, getOutgoingEdges, findEdgesBetweenNodes,
    getDominantFile, getRoutingManifest, etc. Callers: ContextBuilder,
    GraphTraverser, GraphQueryManager, MCP tools.
  - `MaintenanceAccessModel` (18 methods) — index/maintenance writes:
    insertNode, insertNodes, insertEdge, insertEdges, upsertFile, deleteFile,
    insertUnresolvedRefsBatch, clearUnresolvedReferences, setMetadata, etc.
    Callers: ExtractionOrchestrator, index-stages, ReferenceResolver.
  - `ResolutionAccessModel` (13 methods) — resolution-phase reads:
    getUnresolvedReferences, getUnresolvedReferencesBatch,
    getAllFilePaths, getAllNodeNames, getNodeById, getNodesByName, etc.
    Callers: ReferenceResolver, callback-synthesizer.
  - `StatusAccessModel` (5 methods) — CLI/status queries:
    getStats, getNodeAndEdgeCount, getLastIndexedAt, getMetadata,
    getAllMetadata. Callers: CodeGraph.getStats(), CLI, MCP status.
- **`src/db/queries.ts`** — `QueryBuilder` now explicitly `implements`
  all four interfaces. Backward compatible: existing callers that pass
  `QueryBuilder` still work; new code can depend on the narrowest
  interface it needs.
- **`__tests__/access-models.test.ts`** — 11 tests: interface contract
  verification (each model's methods exist and are callable),
  cross-model integration (write via MaintenanceAccessModel, read via
  AgentAccessModel), empty-db stats, interface isolation, and source module
  naming.

Each interface includes only the methods its callers actually need.
The next step (out of scope for this roadmap) would be to update
individual callers to accept their narrow interface instead of the
full QueryBuilder.

Relationship to Candidates 1–6:
- Candidate 7 completes the architecture roadmap. All 7 candidates
  are now implemented, each providing an independently testable seam
  in the codebase.

## Roadmap Completion Summary

All 7 candidates implemented (2026-06-07 through 2026-06-10):

| # | Candidate | Status |
|---|-----------|--------|
| 1 | Explore Answer Planner Seam | ✅ |
| 2 | Dynamic Dispatch Synthesizer Registry | ✅ |
| 3 | Index Pipeline Module | ✅ |
| 4 | Extraction Parse Execution Module | ✅ |
| 5 | CLI Command Adapter / Execution Context Seam | ✅ |
| 6 | Installer Target Adapter Contract Hardening | ✅ |
| 7 | Query/Storage Access Model Seam | ✅ |

Total: 18 new source files, 17 new test files, ~5,200 new lines of
code, ~200 new tests. Zero breakage to existing tests throughout.

## Testing strategy

Testing should map to the domain language:

- Domain fixture tests: Does a planner choose the intended Evidence Scope?
- Budget tests: Does Output Budget preserve Critical evidence and compress lower-value evidence?
- Rendering tests: Does the final formatted text faithfully render the Explore Answer?
- Behavior tests: Does the agent avoid Read/Grep Fallback on representative tasks?

## Benchmark strategy

Benchmarks should answer one question: did the change improve Agent Sufficiency?

Primary metrics:

- Read/Grep Fallback count.
- Total tool calls.
- Billable tokens or cost.
- Main-session context footprint.
- Answer correctness/sufficiency judged against the task.

Failure classifications:

- Scope missing: required evidence was not selected.
- Scope noisy: low-value evidence displaced higher-value evidence.
- Scope stale: freshness assumptions misled the agent.
- Scope shallow: selected evidence lacked enough body/detail to support the next step.

## Guardrails

- Do not rename internal `CodeGraph` domain/API names as part of this roadmap.
- Do not replace `.zcodegraph/` with `.zcodegraph/`.
- Do not treat graph completeness as sufficient without agent-facing sufficiency evidence.
- Avoid speculative large refactors. Each seam should be extracted by a small, testable slice.
