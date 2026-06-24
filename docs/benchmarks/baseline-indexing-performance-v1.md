# Baseline: Indexing Performance v1

Status: active

## Purpose

`baseline-indexing-performance-v1` defines the repeatable measurement contract
for `rust-hybrid` indexing performance optimization.

This baseline measures the default `rust-hybrid` full-index path. It is the
comparison standard for #165 follow-up work and for the performance optimization
plan at `docs/plans/2026-06-24-rust-hybrid-performance-optimization-plan.md`.

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
