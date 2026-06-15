# Rust Indexing Core Phase 7 Results And Decision

Parent plan: [Rust Indexing Core Phase 7 Guarded Name Matcher Prototype Plan](../plans/2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md)

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

## Classification

Classification: `continue matcher prototype`.

Phase 7 added a guarded Rust-assisted name matcher prototype behind explicit
opt-in. The implementation replaces the actual ReferenceResolver
name-matching subpath only when `ZCODEGRAPH_RUST_NAME_MATCHER=1` is set. The
default TypeScript resolver path remains unchanged.

This phase does not claim default rollout readiness and does not claim that
Rust beats TypeScript end to end.

## What Landed

- A narrow TypeScript-to-Rust batch protocol for name-matcher decisions.
- A Rust core `match-name` command that reads candidate facts from stdin and
  returns matcher decisions and diagnostics.
- Guarded actual resolver integration: TypeScript still performs candidate
  lookup, import/framework orchestration, graph mutation, edge writes, and
  unresolved-reference cleanup.
- TypeScript semantic verification for Rust decisions. Unsupported, unresolved,
  invalid, erroring, or semantic-mismatching Rust decisions fall back to the
  TypeScript matcher.
- Metrics for `rustMatcherMs`, `rustMatcherStartupMs`,
  `rustMatcherSerializationMs`, `rustMatcherEligibleRefs`,
  `rustMatcherHandledRefs`, `rustMatcherFallbackRefs`,
  `rustMatcherSemanticMismatchRefs`, and fallback reason taxonomy.
- RSS evidence or unavailable reason is preserved from the profile harness.

## Reduced Fixture Evidence

Raw artifact: [Phase 7 reduced profile](2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json)

The reduced fixture was run with:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo phase7-reduced=/tmp/zcodegraph-phase7-reduced-wm072R --rust-core target/debug/zcodegraph-core
```

Observed reduced-fixture profile:

- `rustMatcherEligibleRefs`: 12
- `rustMatcherHandledRefs`: 7
- `rustMatcherFallbackRefs`: 5
- `rustMatcherSemanticMismatchRefs`: 0
- `rustMatcherFallbackReasons`: `{ "unresolved": 5 }`
- `rustMatcherMs`: 3
- `rustMatcherStartupMs`: 0
- `rustMatcherSerializationMs`: 0
- `referenceResolutionMs`: 8
- `nameMatchingMs`: 1
- `perReferenceDisambiguationMs`: 1

RSS was unavailable in the profile harness:

- `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

The reduced fixture supports the trend that the guarded path can handle a
subset of JS/TS name-matching references with no semantic mismatches while
surfacing fallback taxonomy. It is not enough to promote the matcher beyond the
prototype path.

## Large-Target Evidence

Phase 7 used a large VS Code JS/TS sparse checkout at commit `4ac5322601c`.
The checkout contained 1,725 JS/TS source files and 1,727 copied JS/TS/config
files in the profile harness.

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-index-profile.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --rust-core target/debug/zcodegraph-core
```

Raw artifact: [Phase 7 VS Code profile](2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json)

Observed VS Code sparse profile:

- `phase1CopiedFiles`: 1,727
- TypeScript engine wall time: 61,521 ms
- Rust engine wall time: 39,343 ms
- Rust profile wall time: 39,309 ms
- `filesIndexed`: 1,725
- `filesErrored`: 3
- `nodesCreated`: 60,929
- `edgesCreated`: 162,438
- `referenceResolutionMs`: 27,903 ms finalization wall bucket
- `rustMatcherEligibleRefs`: 145,320
- `rustMatcherHandledRefs`: 104,375
- `rustMatcherFallbackRefs`: 48,800
- `rustMatcherSemanticMismatchRefs`: 12
- `rustMatcherFallbackReasons`: `{ "unresolved": 48788, "semantic-mismatch": 12 }`
- `rustMatcherMs`: 20,699
- `rustMatcherSerializationMs`: 838
- `nameMatchingMs`: 1,164
- `perReferenceDisambiguationMs`: 1,113
- `dominantReferenceResolutionSubpath`: `rustMatcherMs`

RSS was unavailable in the profile harness:

- `rssUnavailableReason`: `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

## Sufficiency Smoke

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

Raw artifact: [Phase 7 VS Code sufficiency smoke](2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json)

Observed sufficiency smoke:

- `regressions`: `[]`
- Prompt `VS-1` expected symbols were present in both TypeScript and Rust outputs.
- TypeScript output: no Flow section, deterministic Read/Grep fallback risk 1/1,
  classification `graph coverage`.
- Rust output: no Flow section, deterministic Read/Grep fallback risk 1/1,
  classification `graph coverage`.

The smoke does not show a Rust-specific sufficiency regression, but it also does
not prove the VS Code flow is sufficient. Both TypeScript and Rust outputs still
lack a connected Flow section for this prompt.

## Decision

Keep the Rust-assisted matcher behind opt-in and continue the matcher
prototype. The implementation is now wired through the actual resolver
name-matching subpath with guarded fallback, but promotion is blocked by the
large-target Rust matcher overhead, the remaining fallback rate, and observed
semantic mismatches.

Follow-up work should focus on:

- reducing the fallback taxonomy for eligible JS/TS matcher inputs;
- reducing `rustMatcherMs` and serialization overhead on large JS/TS batches;
- driving `rustMatcherSemanticMismatchRefs` to zero before any promotion;
- improving graph coverage for the VS Code sufficiency prompt if this prompt is
  retained as a gate;
- deciding whether to keep expanding the matcher prototype or pivot back to
  TypeScript resolver/data-model optimization.
