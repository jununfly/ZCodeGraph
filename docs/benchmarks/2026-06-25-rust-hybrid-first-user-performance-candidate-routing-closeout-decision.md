# Rust-Hybrid First-User Performance Candidate Routing Closeout Decision

Date: 2026-06-25

Roadmap node: `1-8-2. Candidate selection and bounded optimization routing`

Issues: #551, #552, #553

## Inputs

- `docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-tail-diagnostic-bucket-contract.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`

## Routing Decision

The first `1-8-3` execution route is:

`Implement tail diagnostic bucket exposure -> rerun targeted current-repo profile -> select one bounded optimization candidate or record no-go`

This is a diagnostic-first execution route. It is not a production performance
optimization yet.

## Why This Route

The current baseline shows:

- `typescriptFinalizationMs` median: `2900 ms`;
- `finalize.referenceResolutionMs` median: `2210 ms`;
- fallback taxonomy dominated by
  `binding-level-symbol-disambiguation-not-yet-rust-owned`;
- current-repo graphStats stable across 3 runs;
- RSS unavailable with `command-wrapper-no-rss`;
- VS Code sparse and Excalidraw unavailable as valid Git checkouts.

The largest bucket is real, but too coarse to pick a concrete optimization
target safely. The next execution slice should increase diagnostic resolution
before altering resolver, indexer, DB write, extractor, or graph semantics.

## `1-8-3` Entry Issue Shape

The next implementation issue should build the narrowest path that satisfies
the tail diagnostic contract:

- expose or summarize the required tail diagnostic groups in profile artifacts
  and baseline result summaries;
- preserve existing high-level profile fields;
- avoid resolver/indexer semantic behavior changes;
- rerun targeted current-repo baseline after diagnostics exist;
- classify the next bounded optimization candidate from the new evidence.

## Bounded A/B Method

For the diagnostic implementation:

1. Run the existing current-repo baseline or targeted profile before the change
   if the existing `1-8-1` artifact is insufficient for comparison.
2. Implement only diagnostic exposure or runner-summary extraction.
3. Run current-repo baseline again.
4. Compare:
   - wall time;
   - RSS or unavailable reason;
   - `typescriptFinalizationMs`;
   - `finalize.referenceResolutionMs`;
   - reference-resolution sub-buckets;
   - graphStats;
   - fallback taxonomy.

The diagnostic implementation itself does not need to improve wall time. Its
success criterion is trustworthy routing evidence.

## Corpus Scope

Required:

- `current-repo`: 3 runs if using the baseline runner; 1 targeted profile is
  acceptable only for a diagnostic smoke that does not make performance claims.

Conditional:

- `vscode-sparse`: run only if `/private/tmp/codegraph-corpus/vscode-sparse` is
  a valid Git checkout;
- `excalidraw`: run only if `/private/tmp/codegraph-corpus/excalidraw` is a
  valid Git checkout.

Do not clone missing or invalid corpora during the execution issue. Record
`needs-human-setup`.

## RSS Handling

Every result must record peak RSS or an unavailable reason. The current known
unavailable reason is `command-wrapper-no-rss`.

If RSS remains unavailable, the execution issue may still complete as
`diagnostic-only` if wall/profile/graph/fallback evidence is otherwise
trustworthy.

## Graph Parity Guardrail

The diagnostic implementation should be graph-invisible.

Required evidence:

- graphStats before/after or current-run graphStats classification;
- fallback taxonomy classification;
- explicit statement that resolver/finalization semantics did not change.

Expected classification:

- graphStats: `stable`;
- fallback taxonomy: `stable`.

If either moves unexpectedly, classify the result as `needs-human-review` or
`no-go` before selecting a bounded optimization.

## Agent Sufficiency Guardrail

Agent Sufficiency is not required for the diagnostic-only implementation if:

- graph semantics do not change;
- resolver/finalization behavior does not change;
- Explore/MCP output does not change;
- no user-facing sufficiency claim is updated.

Agent Sufficiency becomes required for the next bounded optimization if it
changes graph semantics, resolver/finalization behavior, Explore output, MCP
tool output, language/framework extraction, or a sufficiency claim.

## Candidate Selection After Diagnostics

After the diagnostic rerun, select exactly one primary bounded candidate:

1. reference-resolution candidate lookup/cache;
2. reference-resolution DB access/hydration;
3. edge write or cleanup;
4. Rust parse/extraction plus SQLite write;
5. dynamic dispatch synthesis.

Use no-go if the new diagnostics still do not identify a bounded target.

Do not mix unrelated optimization directions in one issue. If the first
candidate is no-go, a second candidate may be proposed only as a separate
bounded slice.

## Decision

`1-8-2` is complete.

It selects a diagnostic-first `1-8-3` route rather than a direct production
optimization. This avoids choosing between semantic migration, DB/cache cleanup,
Rust parse/write, and dynamic dispatch work with overly coarse profile evidence.
