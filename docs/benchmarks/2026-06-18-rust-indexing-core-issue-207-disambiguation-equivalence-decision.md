# Issue #207 Disambiguation Equivalence Decision

Date: 2026-06-18

## Decision

#207 completed a focused semantic-equivalence design/prototype slice for TypeScript finalization's per-reference disambiguation path.

Selected next candidate: #208, a bounded A/B implementation issue for a guarded candidate-set replay / grouping path with a semantic verifier. Do not directly replace the production name matcher without per-reference equivalence checks.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Background

#206 showed that the largest remaining single semantic path on the VS Code sparse profile was:

| Segment | Duration ms |
|---|---:|
| perReferenceDisambiguationMs | 31666 |
| edgeWriteDbMs | 20167 |
| unresolvedCleanupDbMs | 16135 |
| nameMatcherCandidateLookupDbMs | 3669 |

The largest path is semantic-sensitive because it decides each reference's exact target. #207 therefore used a diagnostic-only prototype instead of changing production resolver behavior.

## Prototype

The prototype adds `compareNameMatcherCandidateReplay()` in `src/resolution/rust-name-matcher.ts`.

It compares two decisions per unresolved reference:

1. Baseline: `matchReference(ref, originalContext)`.
2. Replay: `matchReference(ref, candidateSetContext)`, where `candidateSetContext` is backed only by the candidate facts collected for that reference.

The comparison is per-reference and exact over:

- target node id;
- resolution method;
- confidence;
- resolved vs unresolved state.

Mismatch taxonomy:

- `different-target`
- `different-method`
- `different-confidence`
- `baseline-unresolved`
- `replay-unresolved`

The prototype is diagnostic-only. Production `ReferenceResolver` does not call it, and resolver/name-matcher behavior is unchanged.

## Evidence

Automated fixture:

`npx vitest run __tests__/rust-name-matcher.test.ts`

Result: 10 tests passed.

Focused equivalence case:

| Metric | Value |
|---|---:|
| totalRefs | 3 |
| eligibleRefs | 3 |
| replayedRefs | 3 |
| equivalentRefs | 3 |
| mismatchCount | 0 |

The focused fixture covers:

- exact name resolution;
- instance-method resolution through receiver/class candidate facts;
- fuzzy lowercase resolution.

Scope guard:

| Metric | Value |
|---|---:|
| totalRefs | 2 |
| eligibleRefs | 1 |
| replayedRefs | 1 |
| mismatchCount | 0 |

The scope guard confirms the prototype remains limited to JS/TS-family references and does not pull unrelated language refs into this path.

Build verification:

- `npm run build`
- `npx vitest run __tests__/rust-name-matcher.test.ts`

## Interpretation

Candidate-set replay is a plausible optimization seam because it can reuse pre-collected facts while still running the same matcher logic. The focused fixture produced zero mismatches, which is enough to justify one bounded A/B implementation issue.

This is not enough evidence to enable a production fast path by default. A larger implementation issue must carry a semantic verifier that compares baseline and candidate decisions before claiming improvement.

## Next Candidate

Open #208 for guarded candidate-set replay / grouping.

Required constraints for that issue:

- Preserve every per-reference disambiguation semantic.
- Keep SQLite schema unchanged.
- Keep the baseline matcher as the authority during the A/B.
- Record mismatch count and mismatch taxonomy.
- Run focused fixtures first.
- Run one final VS Code sparse profile/smoke if the implementation passes focused equivalence.
- Choose either keep the implementation candidate or stop; do not branch into multiple optimization tracks.

Runner-up paths remain `edgeWriteDbMs` and `unresolvedCleanupDbMs`, but they are not selected by #207 because #206 identified `perReferenceDisambiguationMs` as the largest single semantic path and #207 found a plausible equivalence seam for that path.
