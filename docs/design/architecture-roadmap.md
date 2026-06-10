# ZCodeGraph Architecture Roadmap

## Purpose

This document turns the architecture review candidates into a shared design language for future technical design, testing, and benchmark work.

Durable sources:

- `ZJ-CONTEXT.md`
- `docs/design/adaptive-explore-sizing.md`
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

### Candidate 1: Explore response planner / Output Budget Seam ✅ COMPLETED (2026-06-10)

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

Tests: `__tests__/explore-planner.test.ts` (133 tests),
`__tests__/explore-renderer.test.ts` (4 tests),
`__tests__/explore-types.test.ts` (10 tests). All 147 pass.

Design docs updated: see `docs/design/adaptive-explore-sizing.md#current-code`.

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

### Candidate 2: Dynamic dispatch synthesizer registry / Seam

Goal: turn callback/framework/language-specific edge synthesis into registry entries with explicit precision guards and metadata contracts.

Relationship to Candidate 1:

- Candidate 2 improves graph evidence availability.
- Candidate 1 decides whether that evidence becomes useful answer evidence.

### Candidate 3: Index pipeline Module

Goal: move indexing lifecycle orchestration behind a testable pipeline interface.

### Candidate 4: Extraction parse execution Module

Goal: isolate parse execution behind worker and in-process adapters.

### Candidate 5: CLI command adapter / execution context Seam

Goal: separate command behavior from process-level IO, formatting, and exit handling.

### Candidate 6: Installer target adapter contract hardening

Goal: separate install plan generation from interactive/non-interactive rendering.

### Candidate 7: Query/storage read model Seam

Goal: identify read-model boundaries by caller intent before splitting SQL surfaces.

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
- Do not replace `.codegraph/` with `.zcodegraph/`.
- Do not treat graph completeness as sufficient without agent-facing sufficiency evidence.
- Avoid speculative large refactors. Each seam should be extracted by a small, testable slice.
