# Rust-Hybrid First-User Performance Baseline Closeout Decision

Date: 2026-06-25

Baseline: `baseline-indexing-performance-v1`

Roadmap node: `1-8-1. Fact base and targeted baseline evidence`

Result artifact:
`docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`

Profile artifacts:

- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-baseline-result/current-repo-run1.profile.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-baseline-result/current-repo-run2.profile.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-baseline-result/current-repo-run3.profile.json`

## Classification

`baseline-partial-needs-human-setup`

The current repository baseline completed 3 runs. The real repo smoke targets
were not run because both configured corpus paths were present but not valid Git
checkouts:

- `vscode-sparse`: `/private/tmp/codegraph-corpus/vscode-sparse`
- `excalidraw`: `/private/tmp/codegraph-corpus/excalidraw`

This follows the plan constraint: do not clone missing or invalid corpora during
the baseline evidence step. Record `needs-human-setup` instead.

## Command

```bash
node scripts/rust-hybrid-baseline.mjs \
  --out docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json \
  --repo current-repo=. \
  --runs 3 \
  --repo vscode-sparse=/private/tmp/codegraph-corpus/vscode-sparse \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

ZCodeGraph commit: `ae8f39e`

Runtime: Node `v26.0.0`, macOS Darwin `25.5.0`, arm64, Apple M5.

## Current Repo Result

Wall time:

- runs: `7887 ms`, `7847 ms`, `7564 ms`
- median: `7847 ms`

RSS:

- unavailable
- unavailable kind: `command-wrapper-no-rss`
- reason: `command RSS sampling did not report maximum resident set size`

Important caveat: all 3 `zcodegraph index` subprocesses reported `exitCode: 1`,
while the profile artifact reached `profile.completed` and graph stats were
available. Treat this as a diagnostic reliability gap for the runner or command
wrapper, not as a performance optimization candidate.

Graph stats were stable across the 3 runs:

- files: `380`
- nodes: `17218`
- edges: `40600`
- database size: `35381248` bytes
- languages: `javascript`, `json`, `rust`, `typescript`, `yaml`

Hybrid fallback state:

- fallback state: `degraded`
- fallback files: `5`
- fallback reason taxonomy: `language-level-typescript-fallback: 5`
- fallback by language: `yaml: 3`, `rust: 2`

## Phase Bucket Ranking

Median phase buckets from the current repo runs:

| Rank | Bucket | Median |
| --- | --- | ---: |
| 1 | TypeScript finalization | `2900 ms` |
| 2 | Reference resolution | `2210 ms` |
| 3 | Rust parse/extraction | `1191 ms` |
| 4 | Rust SQLite write | `670 ms` |
| 5 | Dynamic dispatch synthesis | `608 ms` |
| 6 | TypeScript fallback append | `247 ms` |

Reference-resolution median sub-buckets:

| Bucket | Median |
| --- | ---: |
| database access | `405 ms` |
| unresolved cleanup | `208 ms` |
| edge write | `131 ms` |
| resolved cleanup | `109 ms` |
| name matching | `110 ms` |
| import resolution | `73 ms` |
| framework matching | `66 ms` |

## Fallback Taxonomy

Total profile fallback taxonomy count: `2645`.

| Stage | Reason | Count |
| --- | --- | ---: |
| reference-resolution | `binding-level-symbol-disambiguation-not-yet-rust-owned` | `2586` |
| reference-resolution | `unsupported-import-form-not-yet-rust-owned` | `50` |
| reference-resolution | `unresolved-file-level-import-target` | `5` |
| framework-post-extract | `typescript-finalization-not-yet-migrated` | `1` |
| reference-resolution | `typescript-finalization-not-yet-migrated` | `1` |
| dynamic-dispatch-synthesis | `typescript-finalization-not-yet-migrated` | `1` |
| db-maintenance | `typescript-finalization-not-yet-migrated` | `1` |

## Candidate Routing Input For `1-8-2`

This closeout does not choose the final optimization candidate. It provides a
shortlist for `1-8-2. Candidate selection and bounded optimization routing`.

Recommended shortlist:

1. TypeScript finalization / reference-resolution tail.
   This is the largest measured bucket and the dominant fallback taxonomy source.
   It is also architectural, so `1-8-2` should decide whether the next bounded
   step is a semantic migration slice, a diagnostic split, or a no-go for the
   first optimization pass.
2. Reference-resolution database access and cleanup sub-buckets.
   These are smaller than the whole finalization tail but are concrete enough
   for a bounded A/B optimization if semantic migration is deferred.
3. Rust parse/extraction plus SQLite write path.
   This is a non-trivial measured cost and may be more isolated than resolver
   semantics. It should be considered if `1-8-2` wants a lower semantic-risk
   candidate.
4. Dynamic dispatch synthesis.
   This is measurable but should be attempted only with graph parity and Agent
   Sufficiency guardrails, because partial synthesized-flow coverage can make
   agent behavior worse.
5. Baseline runner diagnostic reliability.
   RSS is unavailable and subprocess exit codes disagree with completed profile
   artifacts. This is not a performance optimization target, but it affects the
   trustworthiness of future optimization evidence.

## Decision

`1-8-1` is complete.

The baseline has enough current-repo evidence to proceed to candidate selection,
but not enough real-corpus evidence to claim VS Code sparse or Excalidraw
performance behavior. Those corpora remain `needs-human-setup` for a future
baseline rerun.

Final candidate selection is deferred to `1-8-2`.
