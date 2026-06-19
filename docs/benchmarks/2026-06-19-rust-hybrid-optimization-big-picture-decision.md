# Rust-Hybrid Optimization Big-Picture Decision

Date: 2026-06-19

Parent tracker: #165

Architecture records:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

Related issues:

- #224 parse-extraction profiling candidate
- #287-#290 first rust-hybrid wall-clock A/B pass
- #291-#294 second rust-hybrid wall-clock A/B pass

## Decision

Stop treating the next optimization as another blind bounded A/B candidate.

Keep the proven production optimizations, preserve the diagnostic tooling, and
split the next work into two tracks:

1. #224 should become an actionable `parseExtractionMs` sub-bucket diagnostic
   issue before any further parse/extraction optimization is selected.
2. TypeScript finalization/reference resolution should be discussed as an
   architecture problem, not as the next small performance patch.

This does not close #165. It changes the next-step framing for #165 from
"find one more local optimization" to "separate proven production mechanics
from architectural bottlenecks."

## System Map

The `rust-hybrid` default full-index path is:

```text
CLI / SDK
  -> TypeScript product shell
  -> Rust core source indexing
       source scan
       JS/TS/Go parse + extraction
       SQLite graph writes
       Rust-owned import/path/local resolution
  -> TypeScript fallback append
  -> TypeScript finalization
       framework post-extract
       reference resolution
       dynamic-dispatch synthesis
       database maintenance
  -> profile / status / doctor / diagnostic bundle
```

Relevant modules:

- Rust source indexing and Rust-owned resolution:
  `crates/zcodegraph-core/src/lib.rs`
- TypeScript orchestration and index lifecycle:
  `src/index.ts`
- TypeScript finalization/reference resolution:
  `src/resolution/index.ts`
- Dynamic-dispatch synthesis:
  `src/resolution/callback-synthesizer.ts`
- Evidence tooling:
  `scripts/rust-indexing-evidence.mjs` and `docs/benchmarks/`

## Optimization Inventory

### Production-Keep: SQLite And Graph-Write Architecture

Status: keep as production direction.

Examples:

- production temp on-disk final-flush path;
- SQLite final-flush / temp DB replacement;
- FTS trigger suspension with one rebuild after bulk writes;
- run-level Rust extraction transaction;
- bounded SQLite write-path PRAGMA and batching work.

Evidence:

- Phase 16 selected SQLite final-flush as the architecture candidate:
  `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- Phase 18 kept a bounded SQLite write-path candidate:
  `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- #211 kept the FTS trigger suspension / rebuild candidate:
  `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md`
- #287-#290 kept run-level Rust extraction writes:
  `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`

Interpretation:

This is the strongest proven optimization family. It improves real wall-clock
or write buckets without changing resolver semantics, language coverage, or
user-visible indexing behavior. Future write-path work should still require
baseline and after evidence, but this direction is no longer speculative.

### Production-Keep: Rust-Owned Lookup And Cleanup Mechanics

Status: keep, but avoid unbounded incremental patching.

Examples:

- local exact reference candidate lookup reuse;
- unresolved-reference cleanup batching;
- edge write validation-path cleanup where graph semantics stay unchanged.

Evidence:

- #193 cleanup batching:
  `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md`
- #209 edge write batching:
  `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md`
- Phase 22 local exact reference optimization:
  `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`

Interpretation:

These candidates are useful when evidence isolates a tight mechanical cost.
However, several of the remaining finalization sub-buckets overlap. Do not keep
stacking small cleanup patches unless a profile isolates a target and the
candidate avoids reference-disambiguation semantics.

### Diagnostic-Keep: Evidence Pipeline And Profile Fields

Status: keep and use as the default optimization gate.

Examples:

- before/after artifact comparison;
- standard decision artifact generation;
- candidate ranking/exclusion notes;
- RSS unavailable reason handling;
- finalization public profile sub-buckets;
- candidate replay equivalence diagnostics.

Evidence:

- Phase 22:
  `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- Phase 23:
  `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`
- #206 finalization diagnostics:
  `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`
- #207/#208 semantic-equivalence diagnostics:
  `docs/benchmarks/2026-06-18-rust-indexing-core-issue-207-disambiguation-equivalence-decision.md`
  and `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md`

Interpretation:

This work does not directly make indexing faster, but it makes optimization
decisions more trustworthy. It should remain the entry point before any new
performance implementation issue. A weak or noisy result is a valid output.

### Weak-Keep: Parser Reuse During Rust Extraction

Status: keep because it is low risk, but do not treat it as a meaningful parse
breakthrough.

Evidence:

- #291-#294:
  `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`

Observed result:

- ZCodeGraph wall-clock: 4.88s -> 4.76s.
- VS Code sparse wall-clock: 295.14s -> 286.66s.
- VS Code sparse `rustCore.parseExtractionMs`: 40,052ms -> 39,996ms.

Interpretation:

The implementation is narrow and semantics-preserving, so it can remain. But it
did not materially move the large-corpus parse bucket. The result argues
against more intuition-driven parse micro-optimizations.

### Diagnostic-Next: #224 Parse Extraction Sub-Buckets

Status: next diagnostic issue, not direct optimization.

Current framing:

#224 should split `rustCore.parseExtractionMs` into actionable sub-buckets
before choosing another parse/extraction candidate. At minimum, the diagnostic
should separate:

- source read;
- TypeScript source normalization;
- tree-sitter parse;
- AST walk / extraction;
- per-language extractor cost;
- parser setup if still worth tracking.

Interpretation:

`parseExtractionMs` remains visible, but parser reuse showed that parser setup
was not a major large-corpus cost. The next parse issue should first identify
where time actually goes.

### Architecture-Level-Next: TypeScript Finalization / Reference Resolution

Status: architecture discussion required before more implementation.

Evidence pattern:

Across recent VS Code sparse profiles, the largest end-to-end bucket remains
TypeScript finalization/reference resolution:

- `typescriptFinalizationMs`;
- `finalize.referenceResolutionMs`;
- `nameMatchingMs`;
- `databaseAccessMs`;
- `perReferenceDisambiguationMs`;
- `edgeWriteDbMs`;
- `unresolvedCleanupDbMs`;
- `dynamicDispatchSynthesisMs`.

Recent examples:

- #287-#290 after profile:
  `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`
- #291-#294 after profile:
  `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`
- #205/#206 finalization diagnostics:
  `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`
  and `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

Decision:

Do not treat TypeScript finalization/reference resolution as the next bounded
micro-optimization by default. It should be re-opened as an architecture
problem because it sits at the hybrid boundary:

- Rust core produces graph facts and some Rust-owned resolution.
- TypeScript finalization still owns framework post-extract, broad reference
  resolution, dynamic-dispatch synthesis, and database cleanup.
- The largest remaining end-to-end costs live in that TypeScript-owned tail.

Questions for the architecture discussion:

- Which finalization responsibilities should remain in the TypeScript product
  shell, and which should move behind Rust-owned stages?
- Is the current boundary forcing duplicate data hydration or repeated DB
  access?
- Can we define a narrow protocol that preserves every-reference
  disambiguation semantics while reducing cross-boundary work?
- Should dynamic-dispatch synthesis stay TypeScript-owned, move to Rust, or be
  split by language/framework?
- What evidence would prove that a finalization architecture change preserves
  graph semantics, sufficiency, and diagnostic trust?

Guardrail:

Do not change every-reference disambiguation semantics as a performance patch.
Any finalization architecture plan must include explicit semantic parity,
fallback taxonomy, graphStats, and representative corpus evidence.

## Recommended Next Steps

1. Keep #165 open as the post-PRD optimization tracker.
2. Keep #224 open, but narrow it to parse/extraction sub-bucket diagnostics.
3. Create a new architecture discussion/plan for TypeScript
   finalization/reference resolution as the hybrid-boundary bottleneck.
4. Do not create another generic "one bounded A/B" performance issue until
   either #224 or the finalization architecture discussion selects a concrete
   candidate.

## Non-Decisions

- This does not claim Rust default rollout readiness.
- This does not claim the strict post-PRD performance target is met.
- This does not require full benchmark scoreboard work before the next
  diagnostic issue.
- This does not close #224.
- This does not prescribe a Rust rewrite of TypeScript finalization; it only
  says the topic is now architectural rather than a small patch.
