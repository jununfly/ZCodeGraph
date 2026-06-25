# Rust-Hybrid First-User Performance Diagnostic Execution Plan

Date: 2026-06-25

Roadmap node: `1-8-3. Bounded optimization execution`

## Goal

Execute the diagnostic-first route selected by `1-8-2`:

`tail diagnostic bucket exposure -> targeted rerun -> candidate/no-go classification`

This plan does not perform a production performance optimization. Its goal is
to make the next bounded optimization choice trustworthy.

## Inputs

- `docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-tail-diagnostic-bucket-contract.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`

## Scope

Allowed changes:

- benchmark runner summary extraction;
- profile artifact summary shape in benchmark outputs;
- deterministic tests for the runner summary contract;
- plan, benchmark, and roadmap documentation.

Disallowed changes:

- resolver semantics;
- indexer semantics;
- database write behavior;
- extractor behavior;
- graph shape;
- fallback taxonomy behavior;
- MCP or Explore output.

If profile artifacts already contain a required diagnostic field, prefer
surfacing it in the baseline runner summary over changing production profile
generation.

## Diagnostic Fields

The runner summary should expose enough of the tail contract to select the next
candidate:

- TypeScript finalization high-level tail:
  - `typescriptFinalizationMs`
  - `finalize.frameworkPostExtractMs`
  - `finalize.referenceResolutionMs`
  - `finalize.dynamicDispatchSynthesisMs`
  - `finalize.dbMaintenanceMs`
- reference-resolution lookup/cache:
  - `candidateLookupMs`
  - `sharedCandidateLookupMs`
  - `candidateLookupCacheHitMs`
  - `nameMatcherCandidateLookupDbMs`
  - `perReferenceDisambiguationMs`
  - `candidateProtocol` summary when available
- reference-resolution database/hydration:
  - `databaseAccessMs`
  - `cacheWarmupDbMs`
  - `refHydrationDbMs`
  - `unresolvedReadDbMs`
  - `edgeMaterializationDbMs`
  - `edgeEndpointValidationDbMs`
- edge write and cleanup:
  - `edgeMaterializationMs`
  - `edgeWriteMs`
  - `edgeWriteDbMs`
  - `edgeInsertCount`
  - `unresolvedCleanupMs`
  - `unresolvedCleanupDbMs`
  - `resolvedCleanupMs`
  - `resolvedCleanupDbMs`
  - `resolvedCleanupRowCount`
  - `intentionallyUnresolvedCleanupMs`
  - `intentionallyUnresolvedCleanupDbMs`
  - `intentionallyUnresolvedCleanupRowCount`
  - `cleanupOwnership`
  - `guardedEdgeWrite`
  - `moduleEdgeWrite`
- semantic replay / matcher safety:
  - `semanticReplay`
  - `candidateReplay*` counters when available
  - `rustMatcher*` counters and fallback reasons when available

Existing high-level fields must remain available.

## Rerun Scope

Required:

- `current-repo`: 3 runs and report median plus variance.

Conditional:

- `vscode-sparse`: run once only if
  `/private/tmp/codegraph-corpus/vscode-sparse` is a valid Git checkout;
- `excalidraw`: run once only if
  `/private/tmp/codegraph-corpus/excalidraw` is a valid Git checkout.

Do not clone missing or invalid corpora. Record `needs-human-setup`.

## Success Classification

Expected classification: `diagnostic-only`.

The plan succeeds when it produces enough evidence to choose exactly one next
bounded optimization candidate, or records a no-go because the evidence remains
insufficient.

No wall-time improvement is required.

## Guardrails

Because this plan should be diagnostic-only:

- graphStats should remain stable;
- fallback taxonomy should remain stable;
- RSS or an unavailable reason must be recorded;
- Agent Sufficiency is not required unless graph semantics, resolver behavior,
  Explore/MCP output, language/framework extraction, or user-facing sufficiency
  claims change.

Any unexpected graphStats or fallback taxonomy movement must be classified as
`needs-human-review` or `no-go` before selecting an optimization candidate.

## Issue Breakdown

### 1. Baseline runner tail diagnostic summary

Expose the tail diagnostic fields in the baseline runner summary and add
deterministic tests for the summary contract.

Acceptance:

- result summaries include the required high-level and tail diagnostic fields
  when present in the profile artifact;
- unavailable nested diagnostics are represented predictably instead of being
  silently confused with zero;
- existing high-level profile summary fields remain compatible;
- deterministic runner tests cover the new summary shape;
- no resolver/indexer/extractor/DB production behavior changes.

### 2. Targeted diagnostic rerun

Run the targeted baseline after the runner summary exposes the tail diagnostics.

Acceptance:

- current repo has 3 runs with median and variance;
- valid VS Code sparse and Excalidraw checkouts run once each;
- invalid or missing real repos are recorded as `needs-human-setup`;
- each run records RSS or unavailable reason, graphStats, fallback taxonomy, and
  tail diagnostic summary;
- artifacts use durable result names or `tmp-` prefixes as appropriate.

### 3. Diagnostic closeout and candidate/no-go classification

Write a durable closeout in `docs/benchmarks/` that classifies the diagnostic
result and routes the next bounded optimization.

Acceptance:

- closeout records result classification, command, commit, corpus status, wall
  time, RSS or unavailable reason, graphStats classification, fallback taxonomy
  classification, and tail bucket ranking;
- closeout chooses exactly one next bounded optimization candidate or records a
  no-go;
- closeout states whether Agent Sufficiency is triggered for the next step;
- roadmap node `1-8-3` is updated with the result.

## Verification

- deterministic runner test for the summary contract;
- roadmap JSON validates;
- roadmap Markdown is rendered from JSON;
- `git diff --check` passes;
- no production indexing files are changed unless a later human decision
  explicitly expands this plan.
