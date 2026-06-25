# Rust-Hybrid First-User Performance Candidate Routing Plan

Date: 2026-06-25

Roadmap node: `1-8-2. Candidate selection and bounded optimization routing`

## Goal

Select the next bounded optimization route for first-user `rust-hybrid`
performance without implementing the optimization in this plan.

This plan consumes the `1-8-1` baseline evidence and produces a narrow handoff
for `1-8-3. Bounded optimization execution`.

## Inputs

- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`
- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/graph-semantics-guardrail-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

## Selection Rule

Rank candidates by both:

1. wall-time bucket size;
2. bounded verifiability.

A candidate is eligible for `1-8-3` only if it has:

- an observable profile bucket or a concrete diagnostic gap to add;
- a bounded A/B method;
- graph parity guardrails;
- Agent Sufficiency guardrails or a clear unavailable reason;
- an explicit no-go condition.

## Selected Route

The first route is:

`TypeScript finalization / reference-resolution tail -> diagnostic buckets -> bounded optimization routing`

Reasoning:

- `typescriptFinalizationMs` is the largest measured bucket in the current repo
  baseline, with median `2900 ms`;
- `referenceResolutionMs` is the second largest measured bucket, with median
  `2210 ms`;
- fallback taxonomy is dominated by reference-resolution residuals, especially
  `binding-level-symbol-disambiguation-not-yet-rust-owned`;
- the current buckets are too coarse to choose a specific optimization safely.

This plan does not commit to a full Rust resolver migration, a TypeScript
finalization rewrite, or a specific DB-path optimization. It routes the next
execution step toward diagnostic visibility first, then one bounded optimization
candidate.

## Candidate Shortlist

### 1. Tail diagnostic buckets

Purpose: expose enough profile detail to choose the actual bounded optimization
target.

Required diagnostic contract:

- split TypeScript finalization into framework post-extract, reference
  resolution, dynamic dispatch synthesis, and DB maintenance contribution where
  those sub-stages are observable;
- split reference-resolution tail into candidate lookup/cache, edge write,
  unresolved cleanup, resolved cleanup, name matching, import resolution, and
  framework matching where those sub-stages are observable;
- keep the fields scoped to profile artifacts and diagnostics, not a stable
  public API promise;
- preserve current high-level profile fields for compatibility.

### 2. Reference-resolution database access / cleanup

Purpose: provide a lower-risk bounded optimization candidate if diagnostic
buckets confirm database access or cleanup dominates the tail.

No-go condition: do not proceed if the new diagnostics show this path is not a
meaningful contributor compared with TypeScript finalization or semantic
fallback residuals.

### 3. Rust parse/extraction plus SQLite write

Purpose: preserve a fallback optimization route with clearer semantic safety if
resolver-tail diagnostics are inconclusive.

No-go condition: do not route here if graph parity or sufficiency guardrails
would require broad extractor behavior changes.

### 4. Dynamic dispatch synthesis

Purpose: keep a visible candidate for a measured bucket that can affect agent
sufficiency.

No-go condition: do not use it as the first bounded optimization unless graph
parity and sufficiency guardrails are already explicit. Partial synthesized-flow
coverage can make agent behavior worse.

### 5. Baseline runner diagnostic reliability

Purpose: track evidence-quality gaps separately from performance optimization.

Known gaps:

- RSS is unavailable with `command-wrapper-no-rss`;
- subprocess exit codes reported `1` while profile artifacts completed and
  graphStats were available.

This is not the first performance optimization candidate, but it may need a
separate evidence-tooling issue if future benchmark trust is blocked.

## Issue Breakdown

### 1. Candidate routing plan

Write and commit this plan, update roadmap node `1-8-2`, and keep the scope
limited to selection/routing.

Acceptance:

- plan exists in `docs/plans/`;
- roadmap node `1-8-2` records the selected route and points to the plan;
- no indexing production behavior changes;
- no new benchmark run is required.

### 2. Tail diagnostic bucket contract

Define the diagnostic fields required before `1-8-3` chooses the bounded
optimization. This issue may inspect code and tests, but its output is a
contract and implementation plan, not a production optimization.

Acceptance:

- contract identifies high-level and sub-bucket profile fields;
- contract states which fields are durable profile diagnostics and which are
  issue-scoped evidence;
- contract preserves existing high-level profile fields;
- contract defines graph parity and sufficiency guardrails for later runs.

### 3. Candidate shortlist and `1-8-3` routing closeout

Write the closeout that turns the diagnostic contract into the exact `1-8-3`
execution entrypoint.

Acceptance:

- closeout chooses the first `1-8-3` execution route or records a no-go;
- closeout defines bounded A/B method, corpus scope, RSS/unavailable handling,
  graph parity guardrail, and sufficiency guardrail;
- closeout does not implement the optimization;
- roadmap node `1-8-2` is completed only after this routing closeout exists.

## Verification

This plan changes planning artifacts only. Verification is:

- roadmap decisions are recorded under `1-8-2`;
- roadmap Markdown is rendered from the JSON source of truth;
- roadmap JSON validates;
- `git diff --check` passes;
- GitHub issues, when published, preserve the three-issue dependency order.

No new benchmark is required for `1-8-2`. The next profile rerun belongs to
`1-8-3` after diagnostic implementation exists.

## Non-Goals

- Do not implement a performance optimization in this plan.
- Do not change resolver, indexer, DB write, or extractor production behavior.
- Do not run a new baseline solely for this routing plan.
- Do not claim VS Code sparse or Excalidraw behavior until those corpora are
  valid Git checkouts and rerun successfully.
