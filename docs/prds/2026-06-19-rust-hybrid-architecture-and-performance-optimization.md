# Rust-Hybrid Architecture And Performance Optimization PRD

Date: 2026-06-19

Parent PRD issue: #295

Parent direction: #165

Related work:

- #224 parse/extraction profiling candidate
- Rust-hybrid optimization big-picture decision, 2026-06-19

## Problem Statement

The first-user `rust-hybrid` release path is now usable enough to move beyond
release polish, but the remaining performance work is no longer well served by
repeated local A/B patches.

Recent evidence shows two different classes of remaining work:

1. Rust source indexing still needs sharper parse/extraction diagnostics before
   another parse optimization can be chosen with confidence.
2. The largest remaining end-to-end cost is in the TypeScript-owned
   finalization and reference-resolution tail, which sits at the hybrid
   boundary between Rust-owned graph facts and the TypeScript product shell.

The user problem is not just "indexing is slower than desired." The deeper
problem is that maintainers need to know which remaining costs are local
mechanical costs, which are architecture-boundary costs, and which are
technology-choice problems that should not be hidden behind another small
optimization patch.

This PRD defines an architecture-first performance version. Its goal is
decision quality plus verifiable trend evidence, not a promise that this version
will hit a final strict performance target.

## Solution

Run a focused architecture and performance optimization cycle for the
`rust-hybrid` default path.

The cycle has four coordinated tracks:

1. Keep #165 as the overall post-release optimization tracker and record the
   big-picture direction there.
2. Keep #224 as the parse/extraction diagnostic track, narrowing it to
   actionable `parseExtractionMs` sub-buckets before selecting another
   parse/extraction optimization.
3. Treat TypeScript finalization and reference resolution as an architecture
   problem at the hybrid boundary, producing an architecture decision before
   further implementation patches.
4. Select and attempt one architecture-backed implementation slice after the
   architecture discussion identifies a safe candidate.

The expected outcome is a set of evidence-backed decisions:

- proceed with a concrete optimization slice;
- keep a low-risk implementation that improves or clarifies the path;
- record no-go when evidence shows a candidate is not worth pursuing;
- escalate a technical architecture or technology-choice issue when local
  optimization exposes a deeper boundary problem.

## User Stories

1. As a maintainer, I want the next performance version to distinguish local
   optimization from architecture-boundary problems, so that we stop stacking
   patches without changing the shape of the system.
2. As a maintainer, I want #165 to remain the overall optimization tracker, so
   that the project keeps one durable map of post-release performance work.
3. As a maintainer, I want #224 narrowed to parse/extraction diagnostics, so
   that the next parse optimization is selected from evidence rather than
   intuition.
4. As a maintainer, I want `parseExtractionMs` split into useful sub-buckets, so
   that I can tell whether source read, normalization, parse, AST walk,
   extractor logic, or parser setup is the actual cost.
5. As a maintainer, I want the TypeScript finalization tail analyzed as an
   architecture boundary, so that we know whether the TS/Rust split itself is
   causing repeated work or slow data movement.
6. As a maintainer, I want reference resolution treated as a semantic system,
   so that performance changes do not silently alter reference disambiguation.
7. As a maintainer, I want dynamic-dispatch synthesis ownership discussed
   explicitly, so that framework coverage does not become an accidental
   side-effect of whichever runtime owns finalization.
8. As a maintainer, I want an architecture escalation gate, so that local
   optimization issues can stop and produce architecture notes when they expose
   deeper design or technology-choice problems.
9. As a maintainer, I want at least one architecture-backed implementation slice
   attempted, so that the version produces production learning instead of only
   documentation.
10. As a maintainer, I want the implementation slice to preserve default user
    behavior, so that users do not experience a behavior change as a side-effect
    of performance work.
11. As a maintainer, I want before/after profile artifacts for any production
    optimization, so that keep, rollback, and no-go decisions are reviewable.
12. As a maintainer, I want graph parity and graphStats recorded for
    architecture-backed changes, so that faster indexing does not mean a weaker
    graph.
13. As a maintainer, I want fallback taxonomy recorded for every relevant
    experiment, so that hybrid health remains explainable.
14. As a maintainer, I want RSS recorded or explicitly marked unavailable, so
    that speed improvements do not hide unacceptable resource movement.
15. As a maintainer, I want VS Code sparse checkout targeted profiling used for
    large-corpus evidence, so that decisions reflect a realistic large JS/TS
    codebase without requiring a full scoreboard.
16. As a maintainer, I want real repo smoke only when graph semantics or
    language coverage changes, so that optimization issues do not become
    unnecessary agent A/B campaigns.
17. As a maintainer, I want weak or noisy results accepted as valid evidence, so
    that a no-go result still improves the decision map.
18. As a maintainer, I want the project to avoid claiming strict performance
    target closure from this PRD, so that release messaging stays honest.
19. As a future contributor, I want the finalization architecture decision to
    name which responsibilities stay TypeScript-owned, so that I do not migrate
    semantics accidentally.
20. As a future contributor, I want the finalization architecture decision to
    name which responsibilities can become Rust-owned or protocol-owned, so
    that implementation issues are independently grabbable.
21. As a future contributor, I want technical architecture and technology-choice
    problems raised during optimization to be discussed explicitly, so that
    performance work can improve the system shape rather than just the numbers.
22. As a future agent, I want the PRD to define testing seams clearly, so that I
    can validate behavior at the highest reliable boundary.
23. As a user, I want the default `rust-hybrid` path to keep producing a
    trustworthy graph, so that performance work does not reduce agent
    sufficiency.
24. As a user, I want diagnostics to remain privacy-conscious and actionable, so
    that I can report slow or degraded indexing without exposing source by
    default.

## Implementation Decisions

- This PRD is architecture-first and performance-oriented. It does not define a
  new user-facing feature.
- #165 remains the overall optimization tracker. It should receive summary
  comments when architecture decisions or evidence closeouts change the
  big-picture direction.
- #224 remains open and becomes the parse/extraction diagnostic track. Its
  closeout should identify a next parse/extraction candidate or record no-go.
- TypeScript finalization and reference resolution must be reopened as a
  hybrid-boundary architecture problem before additional local implementation
  patches in that area.
- The finalization architecture decision must classify current responsibilities:
  framework post-extract, broad reference resolution, dynamic-dispatch
  synthesis, database maintenance, fallback cleanup, and diagnostics.
- The finalization architecture decision must classify each responsibility as
  TypeScript-owned, Rust-owned, protocol-owned, or intentionally deferred.
- Any architecture-backed implementation slice must preserve existing default
  user behavior.
- Any architecture-backed implementation slice must preserve every-reference
  disambiguation semantics unless a separate product/architecture decision
  explicitly changes the semantics.
- The implementation slice should be selected only after diagnostics or
  architecture analysis identifies a concrete candidate.
- Acceptable implementation slices include reducing repeated finalization
  hydration, protocolizing a narrow read-only candidate lookup, short-circuiting
  work already fully owned by Rust facts, or moving cleanup/write work to a
  clearer boundary.
- If no safe implementation slice exists, the version may close that track with
  a no-go decision and a smaller prerequisite issue.
- The architecture escalation gate is mandatory. A local optimization must
  escalate when it requires changing TS/Rust ownership, reference
  disambiguation semantics, the diagnostic contract, or the underlying database
  access model.
- Architecture escalation outcomes are three-state: proceed, needs architecture
  plan, or no-go.
- Performance work should continue to use data-driven before/after evidence.
  A non-improving result is acceptable when it produces a trustworthy decision.
- The PRD does not require a full Rust rewrite of TypeScript finalization.
- The PRD does not require solving all dynamic-dispatch synthesis ownership in
  one step.
- The PRD does not require package or release workflow changes.
- The PRD does not change the current `rust-hybrid` default user path.
- README updates are not default. They are required only if user-facing claims
  or release-facing metrics change.
- CHANGELOG updates are required only for production code changes.

## Testing Decisions

- Test at the highest reliable seam first: the `rust-hybrid` full-index path
  through CLI and SDK behavior.
- Diagnostic fields are part of the testable behavior for this PRD. Tests should
  assert that public profile artifacts can explain the relevant bucket rather
  than asserting private helper internals.
- #224 tests should validate parse/extraction sub-buckets through Rust core
  profile output and the propagated `rust-hybrid` profile artifact.
- Architecture-backed implementation tests should validate graph parity,
  graphStats, fallback taxonomy, and status/doctor visibility where relevant.
- Reference-resolution tests should focus on externally visible graph behavior:
  nodes, edges, fallback categories, and Explore/node sufficiency effects when
  semantics are touched.
- Evidence tooling tests should cover before/after or no-go artifact generation
  where the implementation changes the decision artifact contract.
- Representative large-corpus validation should use the existing VS Code sparse
  checkout at the human-provided corpus path. If that checkout is unavailable or
  is not a Git checkout, the relevant issue should be marked as needing human
  setup rather than cloning a new corpus automatically.
- The required large-corpus validation is targeted profile/smoke, not a full
  scoreboard.
- Agent A/B is not required by default. It is required only when a change affects
  graph semantics, language coverage, or user-facing sufficiency claims.
- Real Go/Gin or JS/TS smoke should be added only when the selected
  implementation slice changes those semantic surfaces.
- RSS must be recorded for performance evidence, or the artifact must explain
  why RSS was unavailable.
- `git diff --check`, relevant deterministic unit/integration tests, and
  targeted profile evidence are sufficient by default unless a slice changes
  packaging, CLI release behavior, or MCP tool semantics.

## Out of Scope

- Hitting the final strict post-PRD performance target in this single version.
- A full benchmark scoreboard across all README repos.
- A full agent A/B campaign for every optimization issue.
- A full Rust rewrite of TypeScript finalization.
- A wholesale rewrite of reference resolution.
- Changing every-reference disambiguation semantics as a performance shortcut.
- New language coverage.
- New user-facing product features.
- Release publishing, package workflow changes, or npm smoke unless the selected
  implementation slice touches those surfaces.
- README metric refresh unless user-facing claims change.

## Further Notes

The important shift in this PRD is from local optimization hunting to
architecture-aware performance work.

The project already has evidence that SQLite/write-path mechanics and selected
Rust-owned lookup cleanup can improve real indexing behavior. It also has
evidence that some low-risk local optimizations are weak but worth keeping. The
next useful step is to stop treating the TypeScript finalization tail as another
isolated performance bucket and instead decide whether the current hybrid
boundary is the right architecture.

The desired completion state is a clearer map:

- what to keep;
- what to optimize next;
- what to stop trying;
- what to redesign before touching implementation again.
