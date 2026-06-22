# Rust-Hybrid Finalization Tail Implementation Sequence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Consolidated decision:
  `docs/benchmarks/2026-06-22-rust-hybrid-architecture-performance-consolidated-decision.md`
- Finalization tail boundary closeout:
  `docs/benchmarks/2026-06-21-finalization-tail-boundary-closeout.md`
- Ownership matrix:
  `docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md`
- Edge write and cleanup boundary:
  `docs/benchmarks/2026-06-21-edge-write-cleanup-ownership-boundary.md`
- Unresolved refs lifecycle contract:
  `docs/benchmarks/2026-06-21-unresolved-refs-lifecycle-contract.md`

## Route Map

The post-decision route has three plans:

1. **Plan A: Finalization Tail Implementation Sequence**
   - Mainline.
   - Pick one bounded finalization-tail mechanics candidate.
   - Preserve semantic target selection.
   - Require graph parity, fallback taxonomy, profile evidence, and fail-closed
     behavior.

2. **Plan B: Resolver Semantic Residuals**
   - Triggered after Plan A closeout.
   - Continue guarded semantic slices within the finalization-tail boundary.
   - Must not broaden into pick-first/source-order tie-breaks or broad
     disambiguation migration.

3. **Plan C: Parse/Extraction Follow-Up**
   - Evidence-gated.
   - Triggered only when fresh profile evidence shows parse/extraction is again
     the best system-level bet.
   - Must keep expensive diagnostics default-off.

This document fully specifies Plan A. Plans B and C are intentionally not
expanded into issue sequences yet because their details depend on Plan A
closeout.

## Goal

Start the finalization-tail implementation sequence with one bounded mechanics
candidate.

Completion means:

- a concrete candidate is selected from the completed tail boundary map;
- the candidate does not alter semantic target selection or every-reference
  disambiguation behavior;
- implementation evidence includes deterministic parity tests, targeted current
  repository evidence, and VS Code sparse evidence when available;
- closeout records `keep`, `no-go`, or `needs-architecture`;
- #165 is updated with the result and the next-route decision.

## Candidate Class

Plan A is mechanics-first.

Allowed candidate classes:

- edge materialization;
- endpoint validation mechanics;
- edge write batching or attribution;
- resolved unresolved-ref cleanup;
- intentionally unresolved cleanup mechanics;
- metadata preservation around write/cleanup mechanics.

Disallowed candidate classes:

- semantic target selection;
- broad reference disambiguation;
- source-order or pick-first routing;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- SQLite schema changes;
- package/release workflow changes.

The exact candidate is selected by issue 1 using the boundary map and baseline
evidence. Plan A must choose exactly one candidate.

## Hard Guardrails

1. No open-ended benchmarking.
   Each issue must name the candidate, success standard, and no-go condition.

2. No semantic shortcut for speed.
   The selected candidate must not change whether a reference resolves, which
   target node id is chosen, edge kind semantics, confidence semantics, or
   resolved-by semantics.

3. Diagnostics must not tax the default path.
   Any new diagnostic field must either reuse existing profile fields or be
   default-off with explicit evidence-tooling activation.

4. Graph parity is required for keep.
   Evidence must include graphStats, edge count by kind/origin where relevant,
   fallback taxonomy, and endpoint validation or unavailable reason.

5. Cleanup must fail closed.
   Unknown lifecycle state must preserve existing TypeScript behavior or keep
   fallback evidence rather than deleting unresolved refs speculatively.

## Success States

`keep`:

- graph parity and fallback taxonomy are preserved;
- the candidate improves the targeted tail sub-bucket or clearly simplifies the
  boundary without adding semantic risk;
- rollback/fail-closed behavior is explainable.

`no-go`:

- the candidate is safe but does not produce a credible trend or simplification;
- complexity exceeds the benefit;
- profile attribution shows the selected mechanism is not meaningful.

`needs-architecture`:

- implementation requires schema changes;
- implementation requires target selection changes;
- implementation requires framework ordering changes;
- implementation exposes a missing protocol or diagnostic contract that cannot
  be safely patched inside the issue.

## Validation

Required:

- deterministic parity tests for the changed mechanics surface;
- targeted current repository profile/evidence;
- targeted VS Code sparse profile/evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- graphStats or graph-visible parity summary;
- fallback taxonomy summary;
- relevant tail sub-buckets;
- RSS or unavailable reason;
- `git diff --check`.

VS Code sparse validation must not clone automatically. If the checkout is
unavailable or not a Git checkout, the evidence issue records human setup
needed.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- release/npm/package smoke;
- multi-run benchmark proof.

## Issue Sequence

### 1. Candidate Selection And Baseline

Purpose:

- select one bounded finalization-tail mechanics candidate from the boundary
  map;
- record baseline profile/parity requirements before implementation;
- state keep/no-go/needs-architecture gates.

Acceptance criteria:

- candidate is selected from allowed mechanics classes only;
- semantic target selection remains out of scope;
- baseline identifies the relevant profile sub-buckets and graph parity checks;
- closeout for this issue names the candidate and why it is the first Plan A
  bet.

### 2. Implement One Bounded Tail Mechanism

Purpose:

- implement the selected mechanics candidate;
- preserve target ids, edge kind semantics, confidence/resolved-by semantics,
  and fallback taxonomy;
- provide fail-closed behavior.

Acceptance criteria:

- exactly one candidate is implemented;
- deterministic parity tests cover the changed mechanics surface;
- unsupported or unknown lifecycle states preserve fallback evidence;
- implementation does not change schema, framework post-extract ordering, or
  dynamic-dispatch synthesis.

### 3. Targeted Evidence

Purpose:

- measure the implemented candidate on current repository and VS Code sparse;
- record graph parity, fallback taxonomy, profile movement, and RSS or
  unavailable reason.

Acceptance criteria:

- current repository evidence is recorded;
- VS Code sparse evidence is recorded when the checkout is available;
- unavailable VS Code sparse setup is documented instead of auto-cloning;
- evidence includes graphStats or graph-visible parity, fallback taxonomy,
  relevant tail sub-buckets, and RSS or unavailable reason;
- no full scoreboard or agent A/B is run by default.

### 4. Plan A Closeout And Next-Route Decision

Purpose:

- decide `keep`, `no-go`, or `needs-architecture`;
- update #165;
- decide whether Plan B starts immediately or whether Plan A exposed an
  architecture prerequisite.

Acceptance criteria:

- closeout artifact exists under `docs/benchmarks/`;
- closeout links plan, issues, candidate, evidence, validation, and decision;
- #165 receives a summary comment;
- closeout states whether the next step is Plan B, another bounded Plan A
  mechanics candidate, or architecture escalation;
- no Plan B/C issues are created by default inside this closeout.

## Closeout Contract

Plan A is complete only when:

- the closeout artifact exists;
- the selected candidate has a three-state decision;
- #165 is updated;
- the next-route decision is explicit.

If the decision is `keep`, the default next route is Plan B unless the closeout
shows that another mechanics candidate is the highest-confidence follow-up.

If the decision is `no-go`, do not automatically try a second candidate. The
closeout must explain whether Plan B should still start or whether a different
Plan A mechanics candidate deserves a new plan.

If the decision is `needs-architecture`, stop implementation sequencing and
write the missing architecture/protocol decision before proceeding.
