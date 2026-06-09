# Explore Answer Planner Handoff — 2026-06-09

## Purpose

This handoff is for a fresh agent continuing the architecture work after the Agent Sufficiency documentation pass.

Do not duplicate the source artifacts below. Read them in this order:

1. `ZJ-CONTEXT.md` — domain language.
2. `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md` — accepted top-level ADR.
3. `docs/design/architecture-roadmap.md` — candidate roadmap, Evidence Value tiers, benchmark interpretation.
4. `docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md` — concrete plan to execute next.

## Current repository state

As of this handoff:

- `main` is synced with `origin/main` at commit `41b3220 docs: establish architecture domain language, roadmap, and ADR`.
- Working tree has uncommitted docs:
  - `docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md`
  - this handoff file.
- `.workbuddy/` is intentionally ignored by `.gitignore`; do not delete it.
- Remotes are configured as:
  - `origin` → `git@github.com:jununfly/ZCodeGraph.git`
  - `upstream` → `git@github.com:colbymchenry/codegraph.git`

## What was completed in this session

### Repo hygiene

- Inspected issues and branches.
- Confirmed ZCodeGraph migration/issues #1–#7 are closed.
- Chose independent-fork remote strategy:
  - `origin` is now `jununfly/ZCodeGraph`.
  - upstream CodeGraph is now `upstream`.
- Added `.workbuddy/` to `.gitignore` and pushed commit:
  - `b942dd8 chore: ignore WorkBuddy local data`

### Domain language and design docs

Pushed commit:

- `41b3220 docs: establish architecture domain language, roadmap, and ADR`

This added:

- `ZJ-CONTEXT.md`
- `docs/design/architecture-roadmap.md`
- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`

And removed temporary planning artifacts:

- `docs/plans/architecture-review-2026-06-08T18-03-08.md`
- `docs/plans/zcodegraph-architecture-review-handoff-2026-06-08.md`

### Key decisions already made

Treat these as accepted unless the user explicitly reopens them:

- North star: **Agent Sufficiency**.
- Core term: **Explore Answer** (not "Explore Scoped Supposition").
- Evidence Scope means answer evidence, not full graph evidence.
- Output Budget means Agent-Step budget, not raw token/char/file budget.
- Evidence Value belongs in `ZJ-CONTEXT.md` only abstractly; Critical/Supportive/Compressible/Distracting tiers belong in tech design docs.
- Read/Grep Fallback boundary:
  - `Read/Grep Fallback = expected answer evidence recovery`
  - `Legitimate Deepening Read = beyond-contract next-step inspection`
- ZJ-0001 stays as one top-level ADR; do not split concept-level ADRs until independently reversible implementation trade-offs appear.

## Plan created for next work

The next concrete plan is:

- `docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md`

It partitions the 7 candidates into phases and starts actual design for Candidate 1.

High-level partition:

1. Phase 1: Candidate 1 — Explore Answer Planner Seam.
2. Phase 2: Candidate 2 — Dynamic Dispatch Synthesizer Registry / Seam.
3. Phase 3: Candidates 3–4 — Index Pipeline + Extraction Parse Execution.
4. Phase 4: Candidates 5–7 — CLI / Installer / Query.

Candidate 1 implementation plan creates/extracts:

- `src/mcp/explore-types.ts`
- `src/mcp/explore-planner.ts`
- `src/mcp/explore-renderer.ts`
- `__tests__/explore-planner.test.ts`
- `__tests__/explore-renderer.test.ts`

The plan currently has 9 tasks:

1. Create ExplorePlan types.
2. Extract ExplorePlanner.
3. Extract ExploreRenderer.
4. Port Evidence Value assignment.
5. Port skeletonization policy.
6. Port Output Budget enforcement.
7. Port freshness banner.
8. Cleanup and final verification.
9. Update design docs.

## Current code understanding to reuse

Main target file:

- `src/mcp/tools.ts`

Current `handleExplore()` mixes these responsibilities:

- MCP adapter and argument validation.
- CodeGraph instance/project resolution.
- Relevant subgraph query.
- Evidence Scope selection.
- Evidence Value/ranking heuristics.
- Output Budget selection and enforcement.
- Flow spine construction.
- Adaptive skeletonization / focused rendering decisions.
- Freshness/staleness notes.
- Markdown rendering.

Supporting files:

- `src/context/index.ts`
- `src/context/formatter.ts`
- `docs/design/adaptive-explore-sizing.md`
- `docs/benchmarks/call-sequence-analysis.md`
- `docs/benchmarks/answer-directly-vs-explore-agent.md`

Existing tests to preserve:

- `__tests__/explore-output-budget.test.ts`
- `__tests__/adaptive-explore-sizing.test.ts`
- `__tests__/explore-blast-radius.test.ts`

## Suggested next move

1. Review `docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md` for correctness.
2. If acceptable, commit the plan + this handoff.
3. Start Candidate 1 implementation from Task 1 using the plan.
4. Keep first implementation behavior-preserving. Do not add new planner heuristics during the extraction.

## Suggested skills

Use these as appropriate:

- `executing-plans` — if executing the plan in a separate session.
- `subagent-driven-development` — if executing task-by-task in this session.
- `zj-tdd` — for implementation slices and tests.
- `surgical-codebase-rewrite` — for minimal-invasive extraction from `handleExplore()`.
- `verification-before-completion` — before claiming completion, committing, or pushing.
- `requesting-code-review` — after the planner seam extraction is complete.

## Guardrails

- Do not rename internal `CodeGraph` API/domain names.
- Do not replace `.codegraph/` with `.zcodegraph/`.
- Do not change MCP server key `codegraph`.
- Do not change external MCP schema during Candidate 1.
- Do not optimize for zero Read. Optimize for fewer fallback reads while preserving legitimate deepening, edit-prep, and verification reads.
- Do not treat deterministic probes as sufficient benchmark evidence. Real-agent A/B is still required for policy changes.
- Do not implement Candidate 2 until Candidate 1 has a planner seam and a benchmark baseline.
