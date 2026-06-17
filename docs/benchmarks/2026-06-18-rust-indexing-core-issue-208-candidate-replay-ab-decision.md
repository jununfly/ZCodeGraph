# Issue #208 Candidate Replay A/B Decision

Date: 2026-06-18

## Decision

#208 completed a guarded candidate-set replay A/B for the TypeScript finalization name-matching path.

Decision: stop this candidate as the next performance implementation path. Keep the guarded replay verifier as diagnostic instrumentation, but do not promote candidate-set replay to a production fast path from this evidence.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## What Changed

- Added `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB=1` to enable guarded candidate replay A/B.
- Added per-reference A/B counters to the Rust index profile artifact:
  - `candidateReplayEligibleRefs`
  - `candidateReplayComparedRefs`
  - `candidateReplayEquivalentRefs`
  - `candidateReplayMismatchRefs`
  - `candidateReplayMismatchReasons`
  - `candidateReplayMismatchSamples`
- Kept baseline `matchReference(ref, originalContext)` as the authority.
- Candidate replay is never returned instead of baseline by this issue.
- SQLite schema is unchanged.

## Artifacts

- Manifest: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-vscode-candidate-replay-ab.experiment.json`
- Raw artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-vscode-candidate-replay-ab.raw.json`
- Generated summary: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-vscode-candidate-replay-ab-summary.md`
- Prior comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-vscode-finalization-diagnostics.raw.json`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T17:13:11.468Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| VS Code sparse dirty | false |
| Copied files per arm | 11518 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| A/B flag | `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB=1` |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 528387 | 628564 |
| Peak RSS bytes | 45907968 | 39960576 |
| graphStats files | 11098 | 11291 |
| graphStats nodes | 329355 | 561906 |
| graphStats edges | 1512994 | 1626117 |

Sufficiency: passed.

Performance gate: unavailable / unmet.

## A/B Equivalence

| Metric | Value |
|---|---:|
| candidateReplayEligibleRefs | 933914 |
| candidateReplayComparedRefs | 933914 |
| candidateReplayEquivalentRefs | 933914 |
| candidateReplayMismatchRefs | 0 |

Mismatch reasons: none.

Mismatch samples: none.

This is strong semantic evidence: candidate-set replay can reproduce baseline decisions for this VS Code sparse run when used as a verifier.

## Performance Effect

Single-run qualitative comparison only.

| Segment | #208 A/B ms | #206 baseline ms | Direction |
|---|---:|---:|---|
| referenceResolutionMs | 117657 | 85127 | worse |
| nameMatchingMs | 66627 | 34539 | worse |
| candidateLookupMs | 7228 | 4129 | worse |
| nameMatcherCandidateLookupDbMs | 5963 | 3669 | worse |
| perReferenceDisambiguationMs | 60529 | 31666 | worse |
| edgeWriteDbMs | 20447 | 20167 | flat |
| unresolvedCleanupDbMs | 16202 | 16135 | flat |
| dynamicDispatchSynthesisMs | 9461 | 9374 | flat |
| dbMaintenanceMs | 121 | 114 | flat |

The A/B verifier roughly doubles the semantic disambiguation work, which is expected because it runs baseline and replay. More importantly, the replay candidate still needs candidate materialization and does not show a clear path to reducing the bottleneck by itself.

## Interpretation

The candidate is semantically promising but not a good next performance implementation path in its current shape.

What to keep:

- the guarded verifier;
- the mismatch taxonomy;
- the ability to use candidate replay as a future safety check.

What not to do next:

- do not promote candidate-set replay as a production fast path;
- do not continue optimizing this path without a new, more specific hypothesis that avoids duplicating the baseline work;
- do not claim performance improvement from the #208 run.

## Stop Rationale

#208 required a keep-vs-stop decision. The decision is stop for this candidate as the next implementation path.

Reason:

- semantic equivalence is excellent (`mismatchCount=0`);
- the A/B path adds too much verifier overhead;
- the candidate does not yet remove enough work from `perReferenceDisambiguationMs`;
- continuing here would likely turn into broad matcher redesign, which is outside #208.

#165 should remain open for post-PRD optimization. The next optimization selection should use the existing tracker rather than automatically continuing candidate replay.
