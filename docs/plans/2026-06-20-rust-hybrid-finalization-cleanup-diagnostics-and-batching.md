# Rust-hybrid finalization cleanup diagnostics and batching

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #165 optimization tracker

## Decision

The next resolver-migration implementation slice should target the
TypeScript-owned finalization write/cleanup tail, not broader candidate producer
routing.

The previous Rust candidate producer routing slice proved a safe, gated
main-path experiment for `ExactName` and `KnownNamePresence`, but it did not
establish candidate routing as the highest-leverage next optimization. The
latest VS Code sparse profile still shows the larger remaining tail in
reference-resolution database work, per-reference disambiguation, edge writing,
and unresolved-reference cleanup.

This plan therefore creates a **diagnostics-first cleanup slice**:

1. split finalization write/cleanup profile buckets enough to see the real cost;
2. add deterministic cleanup contract tests;
3. attempt one bounded resolved-reference cleanup batching/SQL-shape
   optimization;
4. record targeted current-repo and VS Code sparse evidence with a keep/no-go/
   prerequisite closeout.

## Why This Slice

The latest VS Code sparse routing profile reported:

- `referenceResolutionMs`: 65473ms;
- `databaseAccessMs`: 21838ms;
- `candidateLookupMs`: 2400ms;
- `perReferenceDisambiguationMs`: 19401ms;
- `edgeWriteMs`: 11147ms;
- `unresolvedCleanupMs`: 9108ms.

That evidence says expanding candidate producer routing is not the clearest
next lever. The finalization tail needs sharper segmentation before the project
can make a high-quality Rust-ownership or protocol-ownership decision.

Cleanup is a good bounded first optimization because it is narrower than edge
write ownership and does not require changing reference disambiguation
semantics.

## Scope

### In Scope

- Split finalization profile diagnostics for write/cleanup work.
- Record row/edge counts tied to those diagnostics.
- Keep `edgeMaterializationMs`, `edgeWriteMs`, and `unresolvedCleanupMs`
  compatible while adding more specific sub-buckets.
- Add deterministic cleanup contract tests.
- Implement one bounded TypeScript-side resolved cleanup batching/SQL-shape
  optimization.
- Preserve graph output, fallback taxonomy, and user-visible behavior.
- Run targeted current-repo and VS Code sparse profiles.
- Record RSS or unavailable reason.
- Produce a closeout decision with one of:
  - `keep`;
  - `no-go`;
  - `prerequisite`.

### Out of Scope

- Do not introduce a Rust subprocess for cleanup.
- Do not make cleanup Rust-owned in this slice.
- Do not change SQLite schema.
- Do not change unresolved reference write format.
- Do not change which references are deleted.
- Do not change reference disambiguation, ranking, confidence, `resolvedBy`,
  import resolution, framework resolution, or dynamic-dispatch synthesis.
- Do not optimize or rewrite edge insert ownership in this slice.
- Do not broaden into intentionally unresolved cleanup optimization.
- Do not run full scoreboard or agent A/B.
- Do not update README metrics.

## Diagnostics Contract

Profile diagnostics should answer:

- How much time is spent materializing edges?
- How much time is spent validating edge endpoints?
- How much time is spent inserting edges?
- How much time is spent cleaning up resolved references?
- How much time is spent cleaning up intentionally unresolved references?
- How many edges were inserted?
- How many resolved unresolved-reference rows were deleted?
- How many intentionally unresolved rows were deleted?
- How much of `databaseAccessMs` is explained by write/cleanup sub-buckets?

Suggested profile fields:

- `edgeMaterializationMs`;
- `edgeEndpointValidationDbMs`;
- `edgeInsertDbMs`;
- `resolvedCleanupMs`;
- `resolvedCleanupDbMs`;
- `resolvedCleanupRowCount`;
- `intentionallyUnresolvedCleanupMs`;
- `intentionallyUnresolvedCleanupDbMs`;
- `intentionallyUnresolvedCleanupRowCount`;
- `edgeInsertCount`.

Exact names may evolve during implementation, but the closeout must make the
same questions answerable.

## Bounded Optimization

The only optimization attempted in this plan is resolved-reference cleanup
batching / SQL-shape improvement.

Constraints:

- input remains the set of resolved unresolved-reference rows;
- deletion semantics remain unchanged;
- unresolved references that were not resolved remain present unless the
  existing intentionally-unresolved cleanup path deletes them;
- chunk boundaries must be deterministic and tested;
- failures must not leave graph output silently inconsistent.

If resolved cleanup is not material in the profile or the bounded optimization
does not improve/explain the target bucket, stop and record `no-go`. Do not
automatically expand to edge-write ownership or intentionally unresolved cleanup.

## Implementation Slices

### 1. Split finalization write/cleanup profile diagnostics

Add profile sub-buckets and counts for the finalization write/cleanup tail while
preserving existing high-level fields.

Acceptance evidence:

- deterministic profile-shape test;
- existing profile consumers continue to pass;
- current fields remain present.

### 2. Add deterministic cleanup contract tests

Add focused tests that prove cleanup behavior does not change.

Acceptance evidence:

- resolved references are deleted;
- unresolved references are retained;
- intentionally unresolved cleanup keeps existing behavior;
- chunk/batch boundary behavior is covered.

### 3. Implement bounded resolved cleanup batching optimization

Change only the resolved-reference cleanup path's batching or SQL shape.

Acceptance evidence:

- cleanup contract tests pass;
- graph output is stable;
- fallback taxonomy is stable;
- no schema change;
- no disambiguation behavior change.

### 4. Run targeted profile closeout

Run current-repo and VS Code sparse targeted profiles and write a closeout
decision.

Acceptance evidence:

- current-repo profile;
- VS Code sparse profile using `/private/tmp/codegraph-corpus/vscode-sparse`
  if it is present, a Git checkout, and hydrated with `src/vs/workbench`,
  `src/vs/platform`, and `src/vs/base`;
- RSS or unavailable reason;
- graph stats;
- fallback taxonomy;
- keep/no-go/prerequisite decision.

Do not clone a replacement VS Code corpus automatically if the required checkout
is missing or incomplete.

## No-Go Criteria

Stop treating resolved cleanup batching as a useful next performance lever if:

- resolved cleanup is not material in current-repo and VS Code sparse profiles;
- the optimization does not reduce or clarify the target bucket;
- graph output changes;
- fallback taxonomy changes unexpectedly;
- cleanup correctness requires schema changes;
- implementation pressure starts pulling in edge write ownership or Rust
  subprocess execution.

## Expected Outcome

This plan should leave the project with clearer finalization-tail diagnostics
and one bounded cleanup optimization attempt. A successful result can justify a
later write/cleanup protocol plan. A no-go result should redirect the resolver
migration program toward a larger disambiguation or edge-write ownership slice
with better evidence.
