# Baseline: Indexing Performance v1

Status: active

## Purpose

`baseline-indexing-performance-v1` defines the repeatable measurement contract
for `rust-hybrid` indexing performance optimization.

This baseline measures the default `rust-hybrid` full-index path. It is the
comparison standard for #165 follow-up work and for the performance optimization
history consolidated at
`docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`.

## Scope

Primary metrics:

- wall time;
- peak RSS, or a precise unavailable reason.

Guardrail and diagnostic metrics:

- profile bucket summary;
- graphStats;
- fallback taxonomy;
- runtime and corpus identity;
- result classification.

This baseline does not require Agent Sufficiency A/B. Use
`baseline-agent-sufficiency-v1` when an optimization touches graph semantics,
resolver/finalization behavior, Explore output, MCP tools, language/framework
extraction, or user-facing sufficiency claims.

## Corpus Set

Required corpora:

- `current-repo`: this ZCodeGraph checkout, run 3 times and report median plus
  variance;
- `excalidraw`: `/private/tmp/codegraph-corpus/excalidraw`, run once;
- `vscode-sparse`: `/private/tmp/codegraph-corpus/vscode-sparse`, run once.

If Excalidraw or VS Code sparse is missing or is not a Git checkout, record a
`needs-human-setup` result for that corpus. Do not clone automatically.

Gin and Python are not default corpus targets for this baseline. Add them only
when the optimization touches language-specific Go or Python paths.

## Required Result Fields

Each `*-result.*` artifact must record:

- baseline id and version;
- generated timestamp;
- ZCodeGraph git commit;
- command invocation;
- runtime environment and relevant Node/Rust versions;
- corpus name, path, and git commit or unavailable reason;
- run count;
- per-run wall time;
- per-run peak RSS or unavailable reason;
- profile artifact path for each run;
- profile bucket summary;
- graphStats from `zcodegraph status --json`;
- fallback taxonomy from the profile artifact when available;
- timeout progress snapshots for timed-out runs, when available;
- median wall time for repeated corpora;
- RSS summary;
- result classification.

Timeout snapshots are benchmark-artifact diagnostics, not stable user-facing
API. They are runner-owned samples intended to explain large-repo timeout
progress when a complete profile artifact is not written. They should use
`zcodegraph status --json` as the graph diagnostic boundary and may include
elapsed time, graphStats, profile artifact existence/stat data, stdout/stderr
byte counts or tails, and RSS or unavailable reason.

## Ownership Slice Trend Recording

Every ownership migration slice that changes the default `rust-hybrid`
indexing path should record a lightweight performance trend, even when the
slice is not intended as a performance optimization. The goal is trend evidence,
not plan-level benchmark proof.

An ownership slice closeout should record:

- roadmap node and issue identity;
- ZCodeGraph git commit;
- targeted corpus or fixture identity;
- command invocation;
- wall time;
- peak RSS or `rssUnavailableReason`;
- profile bucket summary;
- graphStats;
- fallback taxonomy;
- whether the `baseline-agent-sufficiency-v1` Trigger Matrix requires Agent
  Sufficiency evidence;
- final classification.

Use targeted fixture/profile evidence by default. Keep temporary profiles,
intermediate measurements, and process evidence with the issue or plan closeout.
Only durable result/decision artifact records that need long-term reference
belong in `docs/benchmarks/`.

Upgrade to real repo smoke when any of these triggers apply:

- the change affects the default `rust-hybrid` full-index path broadly;
- the change modifies resolver/finalization/edge-write fan-out or cleanup behavior
  in a way that can move many graph rows;
- targeted fixture/profile evidence shows wall time, RSS, or phase-bucket
  movement that is material but not explained;
- graphStats or fallback taxonomy is `changed-unexpected`, `unavailable`, or
  `needs-human-review`;
- the slice supports README, release, user-visible usability, or roadmap
  closeout claims.

## Bounded Optimization Protocol

Bounded optimization is allowed only when evidence shows that performance work
supports ownership migration or first-user usability. Do not optimize every
slow-looking bucket by default.

Enter bounded optimization when at least one trigger applies:

- ownership progress blocker: a slice is functionally correct, but wall time,
  RSS, or a phase bucket blocks expanding ownership safely;
- trend signal: targeted fixture/profile evidence shows a material movement
  that points to a bounded candidate;
- user usability risk: the default `rust-hybrid` path creates a speed or
  resource risk for first-user workflows, and the candidate is narrow.

Run one bounded candidate by default. If that candidate is no-go, one second candidate
may be attempted in the same effort only when it is independently scoped and
measured. Do not mix unrelated optimization directions in one issue.

Classify the result as one of:

- `keep`: at least one key metric shows a credible improvement trend while
  graphStats, fallback taxonomy, and Agent Sufficiency trigger requirements
  remain acceptable;
- `no-go`: no credible improvement appears, or the improvement creates an
  unacceptable semantic or guardrail risk;
- `diagnostic-only`: the attempt does not produce a kept optimization but does
  identify a bottleneck, prerequisite, or next bounded candidate;
- `needs-human-review`: evidence is complete, but accepting the tradeoff
  depends on product judgment.

A bounded optimization does not need to reach the 10% plan-level success threshold.
Trend evidence is valid when it is clearly measured and its graph/semantic
guardrails are reported.

Keep temporary profiles, intermediate measurements, and process evidence with
the issue or plan closeout. Checked-in temporary files must use a `tmp-` prefix.
Only a durable result/decision artifact that should remain useful after the
issue closes belongs in `docs/benchmarks/`.

## Threshold Interpretation

Use two thresholds:

- 5% wall time or RSS movement is a candidate signal.
- 10% wall time or RSS movement is required for a plan-level success or
  significant-regression claim.

A plan-level success claim requires at least one primary metric to improve by
10% or more while the other primary metric does not degrade by 10% or more.

Weak, noisy, or negative results are still valid when they produce a clear
keep, no-go, diagnostic-only, or prerequisite decision.

## Recommended Command Shape

Use the repository baseline runner:

```bash
node scripts/rust-hybrid-baseline.mjs \
  --out docs/benchmarks/<name>-result.json \
  --repo current-repo=. --runs 3 \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --repo vscode-sparse=/private/tmp/codegraph-corpus/vscode-sparse
```

The runner records process-tree RSS when available and records an unavailable
reason when the host or sandbox blocks RSS sampling.
