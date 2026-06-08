# ZCodeGraph architecture review handoff

## Purpose

This handoff is for a fresh agent continuing the architecture-improvement work that corresponds to:

- `docs/plans/architecture-review-2026-06-08T18-03-08.md`

Do not duplicate that plan in full. Treat it as the source artifact for the architecture candidates and read it before continuing.

Important cleanup rule from the user: after the architecture-review plan has been completed or converted into durable follow-up artifacts, `docs/plans/architecture-review-2026-06-08T18-03-08.md` should be deleted as a temporary planning artifact.

## Current repository state

Recent completed commits:

- `401dca7 docs: update ZCodeGraph identity` — closes GitHub issue #3.
- `58d1f37 chore: rename MCP tool contract to zcodegraph` — closes GitHub issue #2.
- `23500b5 docs: add ZCodeGraph migration plan`.
- `f1c74cb chore: migrate package and CLI identity to ZCodeGraph` — closes GitHub issue #1.
- `6b1b748 Add field channel regression plan`.

Current `git status --short` at handoff time showed only:

```text
?? .workbuddy/
```

Do not delete `.workbuddy/`; it stores project memory and local WorkBuddy state.

## Completed related work

### Brand / identity migration

The user chose full external identity migration while preserving internal domain model terms.

Completed issues:

1. Issue #1: package and CLI identity
   - npm package: `@jununfly/zcodegraph`
   - CLI binary: `zcodegraph`
   - CLI entry file: `src/bin/zcodegraph.ts`
   - build output: `dist/bin/zcodegraph.js`

2. Issue #2: MCP tool contract
   - MCP tools migrated from `codegraph_*` to `zcodegraph_*`.
   - MCP server key remains `codegraph`, so permissions use forms like `mcp__codegraph__zcodegraph_search`.
   - Old tool names are intentionally not supported as aliases.

3. Issue #3: docs / installer / benchmark identity
   - README, site docs, CLAUDE.md, site links, and agent-eval scripts now use ZCodeGraph identity.
   - Added `__tests__/docs-identity.test.ts`.
   - Full test evidence for issue #3: `npm test` passed with `67 passed`, `1270 passed | 2 skipped`.

Preserved exceptions:

- `CodeGraph` class and internal API names.
- `.codegraph/` index directory and `codegraph.db`.
- Conceptual “code graph” domain term.
- MCP server key `codegraph`.
- Parser compatibility for historical benchmark logs containing `mcp__codegraph__codegraph_`.

## Architecture review plan to continue

Source plan:

- `docs/plans/architecture-review-2026-06-08T18-03-08.md`

The plan’s top recommendation is **Candidate 1: Explore response planner / output budget Seam**.

Plan summary only:

1. Explore response planner / output budget seam — strong recommendation.
2. Dynamic dispatch synthesizer registry / seam — strong recommendation.
3. Index pipeline module — worth exploring.
4. Extraction parse execution module — worth exploring.
5. CLI command adapter / execution context seam — worth exploring.
6. Installer target adapter contract hardening — speculative.
7. Query/storage read model seam — speculative.

The plan’s north star is not “more graph completeness” by itself; it is whether ZCodeGraph output is sufficient enough that agents stop falling back to Read/Grep.

## Suggested next move

Start with Candidate 1 unless the user chooses otherwise.

Recommended approach:

1. Re-read `docs/plans/architecture-review-2026-06-08T18-03-08.md`, especially Candidate 1.
2. Inspect current Explore path:
   - `src/mcp/tools.ts`
   - `src/context/index.ts`
   - `src/context/formatter.ts`
   - `docs/design/adaptive-explore-sizing.md`
   - `docs/benchmarks/call-sequence-analysis.md`
3. Convert Candidate 1 into a concrete implementation plan or GitHub issues before changing code.
4. If the user asks to implement, use TDD and vertical tracer bullets:
   - first test an observable Explore output behavior;
   - then extract minimal planner seam;
   - keep MCP as adapter.
5. After the architecture plan is completed or converted into durable issues/ADRs, delete `docs/plans/architecture-review-2026-06-08T18-03-08.md` per user instruction.

## Suggested skills

Invoke these as appropriate:

- `zj-grill-with-docs` — if the user wants to sharpen the architecture candidate against project docs before implementation.
- `zj-to-issues` — if converting the architecture review plan into independently grabbable GitHub issues.
- `zj-tdd` — if implementing any candidate.
- `surgical-codebase-rewrite` — for minimal-invasive refactoring once the seam is agreed.
- `requesting-code-review` and `verification-before-completion` — before committing any substantive implementation.

## Risks / guardrails

- Do not rename internal `CodeGraph` domain/API names while working on architecture candidates unless the user explicitly reopens identity scope.
- Do not replace `.codegraph/` with `.zcodegraph/`; `.codegraph/` remains the index directory.
- Do not migrate MCP server key from `codegraph` to `zcodegraph` in this thread unless the user explicitly asks; issue #2 intentionally kept server key stable.
- Avoid speculative large refactors. The user prefers TDD, small slices, verification evidence, and checklist tracking.
- Before claiming completion, run fresh verification and report exact evidence.

## Cleanup checklist

When this handoff has served its purpose:

- This temporary handoff file can be discarded.
- After the architecture-review plan itself is completed or converted into durable artifacts, delete:
  - `docs/plans/architecture-review-2026-06-08T18-03-08.md`
