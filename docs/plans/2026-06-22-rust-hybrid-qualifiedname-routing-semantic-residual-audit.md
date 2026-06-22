# Rust-Hybrid QualifiedName Routing Semantic Residual Audit

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Prior route decision:
  `docs/benchmarks/2026-06-22-rust-hybrid-architecture-performance-consolidated-decision.md`
- Plan A closeout:
  `docs/benchmarks/2026-06-22-finalization-tail-plan-a-closeout-decision.md`
- Candidate producer routing boundary:
  `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`

## Position In Route

This is **PlanB-1** in the resolver semantic residual route.

Plan A completed a finalization-tail mechanics slice and decided to proceed to
Resolver Semantic Residuals. PlanB-1 is deliberately narrower than "finish the
resolver": it validates exactly one residual slice and uses the closeout to map
how many remaining slices are likely needed.

## Goal

Audit the `QualifiedName` candidate-producer on-demand routing shape as a
resolver semantic residual.

The default outcome is an evidence-backed decision, not a production behavior
change. Production code may change only when the current diagnostics or tests
are insufficient to make the decision, and any such change must be narrow,
default-safe, and semantics-preserving.

Completion means:

- `QualifiedName` routing evidence is collected from the current repository;
- VS Code sparse evidence is collected when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- evidence reports routing shape hits, mismatch count/samples, fallback
  taxonomy, graph-readable status, and RSS or unavailable reason;
- closeout decides `keep`, `no-go`, or `needs-architecture`;
- closeout maps remaining resolver semantic residuals into:
  `closed/keep`, `needs slice`, and `needs architecture`;
- closeout gives a bounded estimate for remaining slices. Default expectation:
  **2-4 additional slices** unless this audit exposes an architecture blocker.

## Why QualifiedName First

`QualifiedName` is the best first resolver semantic residual because:

- candidate producer routing already supports it on demand;
- existing tests cover fail-closed behavior when producer output mismatches or
  is incomplete;
- it is more semantic than generic `LowerName` lookup;
- it is less likely than `FileNodes` to pull the plan into import/export,
  package resolution, or file-level resolver migration;
- it does not require framework post-extract, dynamic-dispatch synthesis, or
  broad disambiguation migration.

## Current Code Read

The current candidate protocol has these relevant properties:

- pre-collected routing lookups include `ExactName`, `KnownNamePresence`, and
  `LowerName`;
- on-demand routing can handle `ExactName`, `LowerName`, `QualifiedName`, and
  `FileNodes`;
- diagnostics expose routed shape information through
  `candidateProtocol.rustCandidateProducer.routing`;
- local project config can enable or disable experimental Rust candidate
  producer routing;
- fail-closed behavior returns to TypeScript baseline when the Rust producer
  mismatches, omits required candidates, or cannot hydrate node ids.

PlanB-1 should validate whether the existing `QualifiedName` routing path is
clean enough to count as a kept semantic residual slice.

## Hard Guardrails

1. Evidence-only by default.
   Do not implement new resolver semantics unless the evidence path itself is
   blocked by missing diagnostics or missing deterministic tests.

2. No semantic shortcut for speed.
   Do not change which reference resolves, which target node id is selected,
   edge kind semantics, confidence, or resolved-by semantics.

3. Fail closed.
   Any mismatch, missing Rust result, node hydration miss, invalid response, or
   unavailable Rust producer must preserve the TypeScript baseline route.

4. No schema or package-resolution expansion.
   Do not change SQLite schema. Do not add package resolution, framework
   post-extract migration, or dynamic-dispatch migration.

5. No broad disambiguation.
   Do not introduce source-order, pick-first, or general overload/type-value
   tie-break behavior.

6. No open-ended benchmarking.
   Use targeted current-repo and VS Code sparse profile/smoke only. Do not run
   full scoreboard or agent A/B by default.

## Required Evidence

For each available target, record:

- profile artifact path;
- graph-readable status or unavailable reason;
- `candidateProtocol.rustCandidateProducer.routing.active`;
- `activeShapes`;
- `onDemandLookupShapeCounts.QualifiedName`;
- mismatch count and samples;
- fallback reason, if any;
- fallback taxonomy entries;
- relevant reference-resolution profile fields;
- RSS or unavailable reason.

Targets:

- current repository: required;
- VS Code sparse checkout: required only if
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.
  Do not clone automatically.

## Success States

`keep`:

- `QualifiedName` routing is exercised or convincingly shown to be irrelevant
  in current evidence;
- mismatch count is zero or explainable with fail-closed behavior;
- fallback taxonomy remains visible and explainable;
- graph-readable status is preserved;
- no resolver semantic behavior changes are needed.

`no-go`:

- `QualifiedName` routing is safe but not useful enough to treat as a
  meaningful residual slice;
- evidence shows the shape rarely appears or does not affect the remaining
  residuals;
- diagnostics are sufficient to make that call.

`needs-architecture`:

- parity cannot be judged from current diagnostics;
- the shape requires broader disambiguation, package resolution, or source-order
  tie-break behavior;
- fail-closed behavior cannot distinguish a safe mismatch from a missing
  protocol contract.

## Issue Sequence

### 1. QualifiedName Residual Baseline And Audit Contract

Purpose:

- confirm the exact `QualifiedName` routing surface already present in code;
- define the audit fields and keep/no-go/needs-architecture gates;
- avoid accidental broad resolver implementation.

Acceptance criteria:

- baseline artifact names the current routing behavior;
- out-of-scope semantic changes are explicitly listed;
- required evidence fields are listed;
- decision gates are clear enough for an AFK agent.

### 2. QualifiedName Targeted Profile Evidence

Purpose:

- collect current-repo and VS Code sparse targeted evidence;
- record graph-readable status, fallback taxonomy, routed shape counts,
  mismatch diagnostics, and RSS or unavailable reason.

Acceptance criteria:

- current-repo evidence is recorded;
- VS Code sparse evidence is recorded when the checkout is available;
- no automatic clone is attempted when the checkout is unavailable;
- evidence includes `onDemandLookupShapeCounts.QualifiedName`, mismatch count,
  fallback taxonomy, and RSS or unavailable reason;
- no full scoreboard or agent A/B is run.

### 3. QualifiedName Decision Closeout

Purpose:

- decide `keep`, `no-go`, or `needs-architecture` for the `QualifiedName`
  routing residual.

Acceptance criteria:

- closeout artifact links the plan, issues, and evidence;
- decision is one of `keep`, `no-go`, or `needs-architecture`;
- any production/test changes, if made, are justified as diagnostic/test
  support rather than semantic expansion;
- #165 is updated with the result.

### 4. Resolver Residual Map And Next-Slice Estimate

Purpose:

- classify remaining resolver semantic residuals after the `QualifiedName`
  decision;
- estimate how many slices remain.

Acceptance criteria:

- residual map has three buckets: `closed/keep`, `needs slice`, and
  `needs architecture`;
- closeout gives a bounded estimate, defaulting to 2-4 additional slices unless
  evidence proves otherwise;
- next recommended slice is named;
- no PlanB-2 issues are created by default inside this issue.

