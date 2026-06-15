# Rust Indexing Core Phase 8 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Plan: [Phase 8 matcher viability hardening](../plans/2026-06-14-rust-indexing-core-phase-8-matcher-viability-hardening.md)

Tracker: #119

## Decision

Phase 8 classification: **continue matcher prototype**.

The guarded Rust matcher remains opt-in. Phase 8 did not establish default rollout readiness and did not promote the guarded path. The bounded candidate-payload dedup work produced a useful performance trend on the same VS Code sparse scope, but `rustMatcherSemanticMismatchRefs` remains non-zero and the VS Code `VS-1` sufficiency gap remains graph coverage work tracked by #113.

#113 is still a separate graph coverage issue and is not a Phase 8 blocker.

## Artifacts

- Reduced profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json)
- VS Code profile raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json)
- VS Code sufficiency raw JSON: [2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json)

## Implementation Summary

Phase 8 stayed inside the guarded matcher boundary:

- Added semantic mismatch samples with reference facts, Rust decision facts, TypeScript decision facts, and a mismatch reason.
- Replaced the opaque `unresolved` bucket with decision-oriented fallback reasons.
- Fixed one bounded Rust matcher true gap: class member matching now accepts function-shaped member facts when the qualified name proves class membership.
- Added profile buckets for candidate materialization, subprocess handoff, TypeScript verification, payload bytes, and unique candidate facts.
- Added a batch-level candidate table protocol so repeated candidate facts are sent once and each reference carries candidate ids.

No schema changes, direct Rust SQLite reads, Rust edge writes, import resolution migration, framework migration, or dynamic synthesis migration were introduced.

## Reduced Profile

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo zcodegraph=. --rust-core target/debug/zcodegraph-core
```

Summary:

- Scope: 289 copied JS/TS/config files; 280 indexed JS/TS files.
- TypeScript measured wall: 4,155 ms.
- Rust measured wall: 4,440 ms.
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`.
- RSS: unavailable for both engines; reason was `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Matcher profile:

- `rustMatcherMs`: 918
- `rustMatcherSerializationMs`: 79
- `rustMatcherEligibleRefs`: 37,332
- `rustMatcherHandledRefs`: 17,346
- `rustMatcherFallbackRefs`: 19,468
- `rustMatcherSemanticMismatchRefs`: 30
- `rustMatcherSemanticMismatchSamples`: 30
- `rustMatcherFallbackReasons`: `{ "missing-candidate-facts": 17266, "rust-unresolved": 220, "outside-matcher-boundary": 1952, "semantic-mismatch": 30 }`
- `rustMatcherCandidateMaterializationMs`: 87
- `rustMatcherSubprocessMs`: 918
- `rustMatcherTsVerificationMs`: 75
- `rustMatcherPayloadBytes`: 38,313,246
- `rustMatcherUniqueCandidateFacts`: 13,692

## VS Code Profile

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --rust-core target/debug/zcodegraph-core
```

Scope:

- Repository: `https://github.com/microsoft/vscode`
- Local sparse checkout: `/tmp/zcodegraph-phase7-vscode-sparse`
- Commit: `4ac5322601c`
- Copied JS/TS/config files: 1,727
- Indexed JS/TS files: 1,725
- Files errored: 3

Before/after against Phase 7:

| Metric | Phase 7 | Phase 8 | Interpretation |
|---|---:|---:|---|
| `rustMatcherMs` | 20,699 | 7,972 | Candidate payload dedup and protocol tightening produced a positive trend. |
| `rustMatcherSerializationMs` | 838 | 552 | Serialization improved, but payload size is still large enough to matter. |
| `rustMatcherEligibleRefs` | 145,320 | 145,320 | Same-scope comparison preserved. |
| `rustMatcherHandledRefs` | 104,375 | 104,375 | No handled-volume regression. |
| `rustMatcherFallbackRefs` | 48,800 | 39,384 | Count is now final taxonomy after guarded verification, not the old opaque raw bucket. |
| `rustMatcherSemanticMismatchRefs` | 12 | 12 | Still non-zero; this blocks promotion. |

Phase 8 fallback taxonomy:

- `outside-matcher-boundary`: 13,484
- `missing-candidate-facts`: 24,226
- `rust-unresolved`: 1,662
- `semantic-mismatch`: 12

There is no `unresolved` bucket in the Phase 8 VS Code profile.

Phase 8 cost attribution:

- `rustMatcherCandidateMaterializationMs`: 584
- `rustMatcherSubprocessMs`: 7,972
- `rustMatcherTsVerificationMs`: 1,072
- `rustMatcherPayloadBytes`: 342,838,941
- `rustMatcherUniqueCandidateFacts`: 208,070
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

RSS:

- TypeScript `peakRssBytes`: unavailable.
- TypeScript `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.
- Rust `peakRssBytes`: unavailable.
- Rust `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## VS Code Sufficiency Smoke

Command:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

Result:

- `regressions`: `[]`
- Prompt: `VS-1`
- TypeScript: no Flow section, `flowConnected=false`, classification `graph coverage`.
- Rust: no Flow section, `flowConnected=false`, classification `graph coverage`.
- Missing expected symbols: none for both engines.

This reproduces the Phase 7 conclusion: the VS Code `VS-1` sufficiency gap is not proven matcher-specific. It remains #113 graph coverage work.

## Follow-Up

Continue only as an opt-in matcher prototype. The next matcher-specific work should focus on reducing the 12 semantic mismatches and deciding whether the remaining `rust-unresolved` bucket has enough true matcher gaps to justify another bounded Rust slice. If that does not produce a stronger trend, pivot to TypeScript resolver optimization instead of expanding Rust resolver ownership.
