# Rust Indexing Core Phase 8 Matcher Viability Hardening And Go/No-Go Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on:

- [Phase 7 Guarded Name Matcher Prototype Plan](2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md)
- [Phase 7 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-7-results-and-decision.md)
- GitHub tracker: #119
- Related graph coverage gap: #113

## Goal

Phase 8 exists to judge whether the guarded Rust matcher is worth continuing.
It is a matcher viability hardening and go/no-go phase, not a resolver migration
phase and not a default rollout phase.

Rust remains opt-in. TypeScript remains the default resolver path. Phase 8
continues the guarded actual resolver path from Phase 7, where TypeScript owns
candidate lookup, import/framework orchestration, graph mutation, edge writes,
unresolved-reference cleanup, and semantic verification.

## Phase 7 Baseline

The Phase 7 large-target baseline is the VS Code sparse checkout at commit `4ac5322601c`, with 1,725 JS/TS source files and 1,727 copied JS/TS/config files in the profile harness.

Baseline profile:

- `rustMatcherMs`: 20,699
- `rustMatcherSerializationMs`: 838
- `rustMatcherEligibleRefs`: 145,320
- `rustMatcherHandledRefs`: 104,375
- `rustMatcherFallbackRefs`: 48,800
- `rustMatcherSemanticMismatchRefs`: 12
- `rustMatcherFallbackReasons`: `{ "unresolved": 48788, "semantic-mismatch": 12 }`
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

Baseline sufficiency smoke:

- No Rust-specific sufficiency regression.
- TypeScript and Rust outputs both lacked a connected Flow section for `VS-1`.
- The missing Flow section is tracked separately in #113 and is not a Phase 8 blocker.

## Non-Goals

- Do not make Rust the default resolver or default index engine.
- Do not claim default rollout readiness.
- Do not change SQLite schema.
- Do not let Rust query project SQLite directly.
- Do not let Rust write edges or delete unresolved references.
- Do not migrate import resolution, framework resolvers, or dynamic-dispatch synthesizers.
- Do not migrate graph traversal, MCP tools, Explore planning, or Explore rendering to Rust.
- Do not change per-reference disambiguation semantics.
- Do not use unguarded Rust matcher output as a product path.
- Do not make #113 a Phase 8 blocker unless root cause is proven matcher-specific.
- Do not require release/npm/package smoke unless packaging, CLI/status, Rust binary discovery, or release-bundle paths change.

## Hard Gates

Phase 8 must produce evidence for all of these:

- `rustMatcherSemanticMismatchRefs` reaches 0 on the reduced fixture and the same VS Code sparse scope, or every mismatch class is downgraded to explicit guarded fallback.
- The fallback taxonomy is decision-oriented and no longer hides tens of thousands of refs in a single opaque `unresolved` bucket.
- At least one true `rust-unresolved` matcher gap is fixed without expanding the architecture boundary.
- Cost attribution separates candidate materialization, JSON serialization, subprocess handoff, Rust matching, and TypeScript verification where feasible.
- Candidate payload dedup is attempted once as a bounded optimization.
- The same VS Code sparse scope is rerun for before/after profile and sufficiency smoke.
- RSS or `rssUnavailableReason` is recorded.

## Allowed Protocol Changes

Phase 8 may change the narrow TypeScript-to-Rust matcher protocol when the
change supports diagnostics, fallback taxonomy, or bounded payload dedup.

Allowed:

- Diagnostic traces for reference facts, candidate facts, TypeScript decisions,
  Rust decisions, confidence, `resolvedBy`, and fallback reason.
- Additional candidate facts, as long as TypeScript still supplies them.
- Batch-level candidate tables with per-reference candidate keys.
- Timing fields for candidate materialization, serialization, subprocess,
  Rust matching, and TypeScript verification.

Not allowed:

- Rust direct SQLite reads.
- Rust graph mutation.
- Rust ownership of import, framework, or dynamic resolver behavior.
- Schema changes.

## Success Classification

Phase 8 ends with exactly one classification:

- `continue matcher prototype`: mismatch reaches zero or explicit fallback,
  fallback taxonomy is interpretable, and cost trend shows a plausible path.
- `abandon Rust matcher`: mismatch remains non-zero, cost remains dominant
  without a plausible optimization path, or complexity is not justified.
- `pivot to TypeScript resolver optimization`: Rust matcher semantics become
  controlled, but evidence shows the cost center is TypeScript candidate
  materialization, protocol shape, or verification rather than Rust matching.
- `promote guarded path`: exceptional only; requires mismatch zero, controlled
  fallback, no sufficiency regression, and `rustMatcherMs` no longer dominant.

Phase 8 cannot pass by claiming default rollout readiness.

## Issue Sequence

### 1. Phase 8 Plan And Guardrails

- Write this plan.
- Add documentation tests that protect Phase 8 boundaries and baseline metrics.
- Reference #113 as separate graph coverage work, not a Phase 8 blocker.

### 2. Semantic Mismatch Taxonomy And Zeroing

- Reproduce the Phase 7 VS Code semantic mismatch classes.
- Add strict diagnostic trace for mismatch reproduction.
- Fix mismatches to behavior-equivalent decisions or downgrade them to guarded fallback.
- Keep guarded default mode safe.

### 3. Fallback Taxonomy And One True-Gap Fix

- Replace the opaque `unresolved` bucket with decision-oriented taxonomy:
  `ts-baseline-unresolved`, `unsupported-reference-shape`,
  `missing-candidate-facts`, `outside-matcher-boundary`, `rust-unresolved`,
  and `semantic-mismatch`.
- Fix at least one true `rust-unresolved` matcher gap.
- Keep import/framework/dynamic behavior in TypeScript.

### 4. Cost Attribution And Candidate Payload Dedup

- Split matcher cost attribution.
- Add batch-level candidate payload dedup or equivalent per-reference candidate keys.
- Record before/after reduced-fixture evidence.
- Stop after one bounded optimization attempt.

### 5. VS Code Before/After Closeout Decision

- Rerun the same VS Code sparse profile.
- Rerun the VS Code `VS-1` sufficiency smoke.
- Record RSS or unavailable reason.
- Publish Phase 8 results and decision with exactly one classification.

## Local Validation

Minimum validation for documentation-only work:

```bash
npx vitest run __tests__/rust-phase8-plan-doc.test.ts
git diff --check
```

Minimum validation for implementation work:

```bash
npm run build
npx vitest run __tests__/rust-name-matcher.test.ts
cargo test --package zcodegraph-core
```

Closeout additionally requires one reduced fixture profile and one same-scope VS
Code sparse profile plus sufficiency smoke.
