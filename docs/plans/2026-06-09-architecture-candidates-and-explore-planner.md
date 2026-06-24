# Architecture Candidates Phasing & Explore Answer Planner — Design & Implementation Plan

> **Status: Phase 1–4 ALL COMPLETED** (2026-06-10). This document is preserved as historical record of the design decisions and implementation tasks. See `docs/designs/architecture-roadmap.md` for current status.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Phase goal (this plan):** Partition the 7 architecture candidates into phases and produce the actual design & first implementation steps for Candidate 1 (Explore Answer planner seam).

**Architecture:** Extract a testable `ExplorePlan` intermediate structure from the monolithic `handleExplore()` in `src/mcp/tools.ts`. Keep MCP as a thin adapter; move Evidence Scope, Output Budget, and Evidence Value policy behind a planner seam. The formatted Markdown answer becomes a renderer over the plan.

**Domain language reference:** `ZJ-CONTEXT.md` (Agent Sufficiency, Explore Answer, Evidence Scope, Output Budget, Evidence Value, Read/Grep Fallback). Design vocabulary: `docs/designs/architecture-roadmap.md`. ADR: `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`.

**Tech Stack:** TypeScript, vitest. No new dependencies.

---

## Phase 0 — Candidate Partitioning

The 7 candidates are intentionally ordered in `docs/designs/architecture-roadmap.md` by recommendation strength. Execution should follow the same priority:

### Phase 1: Candidate 1 — Explore Answer Planner Seam ✅ COMPLETED (2026-06-10)

**When?** Done. This plan covered it.

**Scope:** Extract Explore answer planning into its own module. Expose the Explore Answer as a testable intermediate structure. Keep MCP as adapter.

**Dependencies:** None.

**Result:** See Candidate 1 section in `docs/designs/architecture-roadmap.md`.

### Phase 2: Candidate 2 — Dynamic Dispatch Synthesizer Registry / Seam ✅ COMPLETED (2026-06-10)

**When?** Done — Candidate 1 yielded a working planner; benchmark baseline was **not** recorded before proceeding (see Post-Phase Benchmarks note below).

**Relationship to Phase 1:** Candidate 2 improves graph evidence availability; Candidate 1 decides whether that evidence becomes useful answer evidence. A working planner lets us measure Candidate 2's actual agent-facing impact.

### Phase 3: Candidates 3–4 — Index Pipeline & Extraction Parse Execution ✅ COMPLETED (2026-06-10)

**When?** Done. Stabilized alongside Phase 2 on the same day.

**Rationale:** These are internal lifecycle improvements. They improve maintainability and testability but have no direct agent-facing signal. Evaluate together as one "internal pipeline" phase.

### Phase 4: Candidates 5–7 — CLI, Installer, Query ✅ COMPLETED (2026-06-10)

**When?** Done. All 7 candidates completed in a single session.

**Rationale:** These are lower-priority. Don't actively plan until the agent-facing signal needs them.

### Out of Scope for all phases

- Renaming internal `CodeGraph` class, `.codegraph/` dir, or DB schema.
- Replacing `.codegraph/` with `.zcodegraph/`.
- Changing MCP server key `codegraph` to `zcodegraph`.
- Large-scale refactoring of files outside the stated seam.

---

## Phase 1 — Candidate 1: Explore Answer Planner Seam

### Problem Statement

`handleExplore()` in `src/mcp/tools.ts` (~900+ lines) mixes MCP adapter responsibilities, evidence ranking, output budget policy, flow spine construction, source skeletonization decisions, freshness notes, and Markdown rendering into a single monolithic method. This makes it impossible to:

- Test Evidence Scope selection without running a full MCP tool.
- Verify Output Budget behavior without parsing Markdown output.
- Introduce new Evidence Value heuristics without touching the MCP layer.
- Benchmark planner changes without real-agent A/B.

### Solution

Extract three modules behind a seam:

1. **ExplorePlan** — a pure-data intermediate structure (the Explore Answer before rendering).
2. **ExplorePlanner** — stateless function: input `(query, subgraph, budget, freshness)` → `ExplorePlan`.
3. **ExploreRenderer** — stateless function: input `ExplorePlan` → formatted Markdown string.

MCP `handleExplore()` becomes:

```
validate args → resolve project → get subgraph → planExploreAnswer(...) → renderExploreAnswer(...) → return ToolResult
```

### User Stories

1. As a test author, I want to assert an Explore Answer contains certain evidence at a certain Evidence Value level, so that I can verify planner policy without parsing Markdown.
2. As a test author, I want to assert that Compressible evidence is skeletonized and Critical evidence is kept full, so that the Output Budget behavior is deterministic.
3. As a test author, I want to assert that Distracting evidence is omitted from the Evidence Scope, so that generated code and test paths don't leak into answers.
4. As a developer, I want to add a new Evidence Value heuristic without touching the MCP tool handler, so that policy changes don't risk regressing the adapter behavior.
5. As a developer, I want to change the Markdown rendering format without re-verifying planner decisions, so that presentation and planning are independently testable.
6. As a benchmark runner, I want to interpret benchmark failures by classifying them as scope missing, scope noisy, scope stale, or scope shallow, so that the root cause is clearer than "more reads."
7. As a maintainer, I want to snapshot the existing `handleExplore()` output before and after the seam extraction, so that the first refactor does not change external behavior.

### Implementation Decisions

#### Decision 1: ExplorePlan is a plain TypeScript interface, not a class

```typescript
// src/mcp/explore-types.ts

export interface ExplorePlanEntry {
  filePath: string;
  symbols: string[];
  evidenceValue: 'critical' | 'supportive' | 'compressible' | 'distracting';
  renderMode: 'full' | 'focused' | 'skeleton' | 'omit';
  /** Human-readable reason, used in debug fixtures */
  reason: string;
  /** Character count this entry occupies in the rendered answer */
  budgetChars: number;
}

export interface FlowSpineEntry {
  sourceSymbol: string;
  targetSymbol: string;
  viaEdge: string;
  hopBodies: string[];
}

export interface ExplorePlan {
  query: string;
  entries: ExplorePlanEntry[];
  flowSpine: FlowSpineEntry[];
  freshness: {
    stale: boolean;
    pendingFiles: number;
    banner: string;
  };
  budget: {
    totalChars: number;
    usedChars: number;
    ceilingChars: number;
    spentPct: number;
  };
}
```

Rationale: Plain interface is testable without instantiation ceremony. The `reason` field enables diagnostic assertions in tests.

#### Decision 2: ExplorePlanner is a pure function, not a class

```typescript
// src/mcp/explore-planner.ts

type PlanExploreAnswer = (
  query: string,
  subgraph: RelevantSubgraph,
  budget: ExploreOutputBudget,
  freshness: FreshnessInfo
) => ExplorePlan;
```

Rationale: No internal state. All inputs are explicit. Makes the seam testable with any fixture.

Existing policy from `handleExplore()` to port:

- `getExploreOutputBudget()` tier logic.
- File groups: named files → entry nodes → connected → additional.
- Relevance score gating (`minScore: 0.2`) and gap threshold.
- `isTestFile()` / `isGeneratedFile()` / `isLowValuePath()` for Distracting signal.
- `classify` vs `filenameScore` ranking.
- On-spine vs off-spine classification for skeletonization.
- Polymorphic sibling detection.
- Named-callable spare logic.
- Family-file override logic.
- Per-symbol focused view within collapsed files.
- Cluster limit per file.
- Hard ceiling enforcement.
- Freshness banner.

#### Decision 3: ExploreRenderer is a separate pure function

```typescript
// src/mcp/explore-renderer.ts

type RenderExploreAnswer = (
  plan: ExplorePlan,
  symbolBodyMap: Map<string, string>
) => string;
```

Rationale: Separates formatting and rendering from planning. Tests can fixture-test rendering output from known plans.

#### Decision 4: MCP handleExplore becomes thin adapter

After extraction, `handleExplore` in `src/mcp/tools.ts` does:

```
validate(args) → resolve project + CodeGraph instance → get subgraph via cg.findRelevantContext() 
  → plan = planExploreAnswer(query, subgraph, budget, freshness) 
  → markdown = renderExploreAnswer(plan, bodyMap) 
  → return { content: [{ type: 'text', text: markdown }] }
```

Rationale: The MCP method stays as the integration point; all policy lives in planner and renderer.

### Testing Decisions

#### What makes a good test

Tests should assert on the **ExplorePlan** structure, not on the rendered Markdown string. The plan structure is the domain fixture output. Rendering tests are separate and far fewer.

Evidence value assertions are soft: they assert that a certain file/symbol appears in entries at a certain value, not that every entry is perfectly graded. This avoids brittle tests when heuristics change.

#### Test modules

**`__tests__/explore-planner.test.ts`** — NEW. Primary test surface.

Prior art: `__tests__/adaptive-explore-sizing.test.ts` (7 test cases with synthetic graph fixtures).

Coverage goals:

1. **Evidence Scope selection**: Given a known subgraph, does the planner include the mechanism path and named callables?
2. **Evidence Value assignment**: Are entry nodes `critical`? Are connected nodes `supportive`? Are additional nodes `compressible`?
3. **Output Budget enforcement**: When budget is tight, does the planner drop `compressible` evidence before `critical` or `supportive`?
4. **Skeletonization**: Do polymorphic siblings skeletonize? Does a named callable spare? Does the family-file override fire?
5. **Distracting omission**: Are test files, generated files, and low-value paths omitted unless named?
6. **Freshness**: Does the stale banner appear in the plan?

Fixture approach: Use a `fixtureExplorePlan(...)` helper that builds a synthetic subgraph and calls the planner, producing an `ExplorePlan`. Assert on `entries`, `flowSpine`, `freshness`, and `budget`.

**`__tests__/explore-renderer.test.ts`** — NEW. Small surface.

Coverage goals:

1. Does the rendered output include the freshness banner when `freshness.stale`?
2. Does a `full` renderMode produce a fenced code block with line numbers?
3. Does a `skeleton` renderMode produce class + member signatures only?
4. Does the budget note appear?

**`__tests__/explore-output-budget.test.ts`** — EXISTING. Add planner-level assertions.

Coverage goals:

1. Planner respects the same budget caps — verify via `plan.budget.usedChars <= plan.budget.ceilingChars`.
2. Migrate existing assertions from Markdown-based tests to plan-based tests.

**`__tests__/adaptive-explore-sizing.test.ts`** — EXISTING. Keep as regression tests.

These test the planner's skeletonization policy through the rendered output. Keep them until plan-level equivalents exist, then mark as optional.

**`__tests__/explore-blast-radius.test.ts`** — EXISTING. Keep unchanged.

These test MCP integration.

### Out of Scope (for this Candidate 1 implementation)

- Changing the MCP schema or tool name.
- Changing the Markdown rendering format.
- Adding new Evidence Value heuristics. This plan ports existing policy; new heuristics are separate tasks.
- Changing `context` or `trace` flow. Only `zcodegraph_explore` is scoped.
- Real-agent A/B. The seam extraction should be behavior-preserving; benchmark after seam, not during.
- Refactoring `src/context/index.ts` or `src/context/formatter.ts`. Those are separate concerns.

---

## Task Breakdown

### Task 1: Create explore-types.ts ✅ COMPLETED

**Files:** Create `src/mcp/explore-types.ts`

**Content:** The `ExplorePlan`, `ExplorePlanEntry`, `FlowSpineEntry`, and `ExplorePlannerFn` / `RenderFn` type aliases.

**No test for this task** — it's pure types.

**Commit:** `git add src/mcp/explore-types.ts && git commit -m "feat(explore): add ExplorePlan types for planner seam"`

### Task 2: Extract explore-planner.ts ✅ COMPLETED

**Files:**
- Create: `src/mcp/explore-planner.ts`
- Modify: `src/mcp/tools.ts`
- Test: `__tests__/explore-planner.test.ts`

**Step 1 — Write a snapshot equivalence test first**

In `__tests__/explore-planner.test.ts`, write a test that:
1. Creates a minimal synthetic subgraph mimicking a real repo's graph shape.
2. Calls `handleExplore()` on current code — capture rendered output.
3. This test is temporary, run once, output recorded manually.

This step is only for safety. The real TDD begins in Step 2.

**Step 2 — Write planner test: Evidence Scope includes named entry**

```typescript
it('includes the named entry symbol at critical evidence value', () => {
  const plan = planExploreAnswer(
    'How does getResponseWithInterceptorChain work',
    fixtureRealCallSubgraph(),
    fixtureBudget(),
    fixtureFreshness()
  );
  const entry = plan.entries.find(e => e.filePath.includes('RealCall'));
  expect(entry).toBeDefined();
  expect(entry!.evidenceValue).toBe('critical');
});
```

Run: `npx vitest run __tests__/explore-planner.test.ts --include "includes the named entry symbol"`  
Expected: FAIL (`planExploreAnswer not defined`)

**Step 3 — Extract planner function**

In `src/mcp/explore-planner.ts`:

```typescript
import { ExplorePlan, ExplorePlanEntry, FlowSpineEntry, ExplorePlannerFn } from './explore-types';
import { ExploreOutputBudget } from '../index'; // or wherever it's defined today
import { RelevantSubgraph } from '../context';

export const planExploreAnswer: ExplorePlannerFn = (query, subgraph, budget, freshness) => {
  // Minimal implementation: copy existing handleExplore() logic, 
  // but output ExplorePlan instead of formatted string.
  // For this first extract, just return a valid plan structure.
  // Full policy porting is in Tasks 3–7.
};
```

The first extraction should behave identically to the current output. Port in slices.

**Step 4 — Run planner test until passes**

Iterate until the named entry test passes.

**Step 5 — Wire into handleExplore**

In `src/mcp/tools.ts`, replace the planning section with:

```typescript
const budget = getExploreOutputBudget(cg.getStats().fileCount);
const freshness = { stale: false, pendingFiles: 0, banner: '' }; // or real value
const plan = planExploreAnswer(query, subgraph, budget, freshness);
```

Then pass `plan` to render. For now the render produces empty string. Wire renderer in Task 3.

**Step 6 — Commit**

```bash
git add src/mcp/explore-planner.ts src/mcp/explore-types.ts src/mcp/tools.ts __tests__/explore-planner.test.ts
git commit -m "feat(explore): extract ExplorePlan with named-entry test"
```

### Task 3: Extract explore-renderer.ts ✅ COMPLETED (with design deviation — see note below)

**Files:**
- Create: `src/mcp/explore-renderer.ts`
- Modify: `src/mcp/tools.ts`
- Test: `__tests__/explore-renderer.test.ts`

**Step 1 — Write renderer test: full source render**

```typescript
it('renders a full-source entry as a fenced code block with line numbers', () => {
  const plan: ExplorePlan = {
    query: 'test',
    entries: [{ filePath: 'src/foo.ts', symbols: ['foo'], evidenceValue: 'critical', renderMode: 'full', reason: 'named', budgetChars: 50 }],
    flowSpine: [],
    freshness: { stale: false, pendingFiles: 0, banner: '' },
    budget: { totalChars: 100, usedChars: 50, ceilingChars: 20000, spentPct: 0.25 },
  };
  const bodyMap = new Map([['src/foo.ts', 'function foo() {}']]);
  const result = renderExploreAnswer(plan, bodyMap);
  expect(result).toContain('```typescript');
  expect(result).toContain('function foo() {}');
});
```

Run to confirm FAIL.

**Step 2 — Implement renderExploreAnswer**

Port the Markdown rendering code from `handleExplore()`. The renderer takes the plan and a body map (symbol→source) as input, produces formatted string.

Render modes:
- `full`: `#### path — symbols · ` + fenced code block with line numbers.
- `focused`: Per-symbol bodies plus signatures for others in same file.
- `skeleton`: `#### path — symbols · skeleton (signatures only; Read for a full body)`.
- `omit`: Skip entirely.

Flow spine section, freshness banner, and budget note are separate render paths on the plan.

**Step 3 — Wire into handleExplore**

```typescript
const markdown = renderExploreAnswer(plan, bodyMap);
return { content: [{ type: 'text', text: markdown }] };
```

**Step 4 — Run all existing explore tests**

```bash
npx vitest run __tests__/explore-output-budget.test.ts __tests__/adaptive-explore-sizing.test.ts __tests__/explore-blast-radius.test.ts
```

Expected: PASS. If not, adjust renderer or planner to match existing behavior.

**Step 5 — Commit**

```bash
git add src/mcp/explore-renderer.ts __tests__/explore-renderer.test.ts src/mcp/tools.ts
git commit -m "feat(explore): extract Explore Answer renderer with full-source test"
```

### Task 4: Port Evidence Value assignment ✅ COMPLETED

**Files:**
- Modify: `src/mcp/explore-planner.ts`
- Test: `__tests__/explore-planner.test.ts`

**Step 1 — Write test: entry node is critical, connected is supportive, additional is compressible**

```typescript
it('assigns entry nodes as critical, connected as supportive, additional as compressible', () => {
  const plan = planExploreAnswer(query, fixtureThreeTierSubgraph(), ...);
  expect(plan.entries.find(e => e.filePath === 'entry.ts')!.evidenceValue).toBe('critical');
  expect(plan.entries.find(e => e.filePath === 'connected.ts')!.evidenceValue).toBe('supportive');
  expect(plan.entries.find(e => e.filePath === 'additional.ts')!.evidenceValue).toBe('compressible');
});
```

**Step 2 — Port Evidence Value logic from handleExplore**

The existing method has file grouping logic that maps to:

- Files with named callables and on-spine files → `critical`.
- Connected via graph edges → `supportive`.
- Blast radius / additional files → `compressible`.
- Test files, generated files, low-value paths → `distracting`.

Port each grouping as a planner internal helper.

**Step 3 — Run tests**

```bash
npx vitest run __tests__/explore-planner.test.ts
```

**Step 4 — Commit**

```bash
git add src/mcp/explore-planner.ts __tests__/explore-planner.test.ts
git commit -m "feat(explore): port Evidence Value assignment to planner"
```

### Task 5: Port skeletonization policy ✅ COMPLETED

**Files:**
- Modify: `src/mcp/explore-planner.ts`
- Test: `__tests__/explore-planner.test.ts`

**Step 1 — Write test: polymorphic sibling skeletonizes**

Reference existing adaptive sizing test cases as fixture models.

```typescript
it('skeletonizes off-spine polymorphic siblings', () => {
  const plan = planExploreAnswer(query, fixtureInterceptorSubgraph(), ...);
  const compressible = plan.entries.filter(e => e.evidenceValue === 'compressible');
  expect(compressible.length).toBeGreaterThanOrEqual(5);
  expect(compressible.every(e => e.renderMode === 'skeleton')).toBe(true);
});
```

**Step 2 — Port skeletonization gate**

Port the gate from `handleExplore()`:

1. Spine exists.
2. Off flow spine.
3. Polymorphic sibling (≥3 impls).
4. Not spared (named callable, unless family file).

Plus the focused view logic for family files.

**Step 3 — Run tests**

Existing `adaptive-explore-sizing.test.ts` should still pass.

**Step 4 — Commit**

```bash
git add src/mcp/explore-planner.ts __tests__/explore-planner.test.ts
git commit -m "feat(explore): port skeletonization policy to planner"
```

### Task 6: Port Output Budget enforcement ✅ COMPLETED

**Files:**
- Modify: `src/mcp/explore-planner.ts`, `src/mcp/tools.ts`
- Test: `__tests__/explore-planner.test.ts`, `__tests__/explore-output-budget.test.ts`

**Step 1 — Write planner test: budget cap respected**

```typescript
it('keeps total budget under the ceiling, dropping compressible before critical', () => {
  const tightBudget = { ...fixtureBudget(), ceilingChars: 500 };
  const plan = planExploreAnswer(query, fixtureLargeSubgraph(), tightBudget, ...);
  expect(plan.budget.usedChars).toBeLessThanOrEqual(plan.budget.ceilingChars);
  // All critical entries should survive
  expect(plan.entries.filter(e => e.evidenceValue === 'critical').length).toBeGreaterThan(0);
});
```

**Step 2 — Port budget enforcement**

Port:
1. Hard ceiling enforcement.
2. Compressible entries dropped first, then supportive, never critical.
3. Per-file char cap.

**Step 3 — Migrate existing budget tests**

In `__tests__/explore-output-budget.test.ts`, add plan-level assertions:

```typescript
it('planner respects small-project budget', () => {
  const plan = planExploreAnswer(..., smallBudget, ...);
  expect(plan.budget.usedChars).toBeLessThanOrEqual(plan.budget.ceilingChars);
});
```

**Step 4 — Run all tests**

```bash
npx vitest run __tests__/explore-planner.test.ts __tests__/explore-output-budget.test.ts __tests__/adaptive-explore-sizing.test.ts
```

**Step 5 — Commit**

```bash
git add src/mcp/explore-planner.ts src/mcp/tools.ts __tests__/explore-planner.test.ts __tests__/explore-output-budget.test.ts
git commit -m "feat(explore): port Output Budget enforcement to planner"
```

### Task 7: Port freshness banner ✅ COMPLETED

**Files:**
- Modify: `src/mcp/explore-planner.ts`, `src/mcp/explore-renderer.ts`
- Test: `__tests__/explore-planner.test.ts`, `__tests__/explore-renderer.test.ts`

**Step 1 — Write planner test: stale plan has banner**

```typescript
it('includes freshness banner when stale files exist', () => {
  const stale = { stale: true, pendingFiles: 3, banner: '⚠ 3 files have pending changes' };
  const plan = planExploreAnswer(query, subgraph, budget, stale);
  expect(plan.freshness.banner).toContain('pending changes');
});
```

**Step 2 — Write renderer test: banner appears in output**

```typescript
it('renders the freshness banner from plan', () => {
  const plan: ExplorePlan = { freshness: { stale: true, pendingFiles: 3, banner: '⚠ stale data' }, ... };
  const result = renderExploreAnswer(plan, bodyMap);
  expect(result).toContain('⚠ stale data');
});
```

**Step 3 — Port freshness propagation**

Move the staleness check from `handleExplore()` into the planner. The planner gets freshness input and stores the banner in `ExplorePlan.freshness`. The renderer renders it.

**Step 4 — Commit**

```bash
git add src/mcp/explore-planner.ts src/mcp/explore-renderer.ts __tests__/explore-planner.test.ts __tests__/explore-renderer.test.ts
git commit -m "feat(explore): port freshness banner to planner plan"
```

### Task 8: Cleanup and final verification ✅ COMPLETED

**Files:** All touched files.

**Step 1 — Verify no behavior change**

```bash
npx vitest run __tests__/explore-* __tests__/adaptive-* __tests__/mcp-*
```

All pass.

**Step 2 — Remove dead code in handleExplore**

Delete the planning logic that has been fully ported. Leave only the adapter logic:

- Arg validation.
- Project resolution.
- Subgraph query.
- Planner call.
- Renderer call.
- Return.

**Step 3 — Verify again**

```bash
npx vitest run
```

All existing tests pass.

**Step 4 — Final commit**

```bash
git add src/mcp/tools.ts
git commit -m "refactor(explore): remove ported planning logic from handleExplore"
```

### Task 9: Update design docs ✅ COMPLETED

**Files:**
- Modify: `docs/designs/adaptive-explore-sizing.md`
- Modify: `docs/designs/architecture-roadmap.md`

**Step 1 — Update adaptive-explore-sizing.md**

- Add a `## Current Code` section pointing to the new modules.
- Note that skeletonization policy now lives in `src/mcp/explore-planner.ts`.
- Keep the benchmark data and dead ends as-is (they're still reference).

**Step 2 — Update architecture-roadmap.md**

- Add a `## Completed phases` section noting Candidate 1's planner seam.
- Add a `## Next phases` section pointing to Candidate 2.

**Step 3 — Commit**

```bash
git add docs/designs/adaptive-explore-sizing.md docs/designs/architecture-roadmap.md
git commit -m "docs: update design docs after Explore planner extraction"
```

---

## Post-Phase Benchmarks

**⚠️ STATUS: PARTIAL — unit baseline recorded, agent A/B pending (2026-06-11).**

Unit-test regression baseline: see `docs/benchmarks/post-c1-baseline-2026-06-11.md`.

**Summary:** 175/175 explore-specific tests pass. Build clean. 23 pre-existing failures in unrelated subsystems (MCP daemon, JVM resolution, C/C++ includes, symlink security).

Agent-level A/B benchmarks (`call-sequence-analysis.md`, `answer-directly-vs-explore-agent.md`) require external indexed codebases and real agent sessions — **not yet re-run post-extraction**. This is the remaining gap before Candidate 2+ policy improvements can be measured against a true sufficiency baseline.

## Risks / Guardrails

- **Over-extraction in Task 3.** If the renderer becomes as complex as the planner, stop and re-evaluate. The renderer should be simple: iterate entries, switch on renderMode, emit formatted text.
- **Snapshot tests for equivalence.** Do NOT write brittle snapshot tests. The equivalence check is "tests pass post-extraction", not "diff identical rendered output."
- **Don't improve policy during extraction.** This phase ports existing behavior. New heuristics (Candidate 1's "improve the sufficiency policy") are a follow-up phase.
- **Don't mutate test fixtures across tasks.** Each task adds, doesn't replace. This avoids cascading test rework.