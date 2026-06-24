# Rust-Hybrid Comprehensive Performance Baseline Result

Date: 2026-06-24

Plan:

- `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`

Issue:

- #513

Baseline:

- `docs/benchmarks/baseline-indexing-performance-v1.md`

Raw result:

- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.json`

## Classification

`baseline-partial-timeout`

The current repository completed. The VS Code sparse checkout produced a
profile and graph stats but hit the bounded 300s timeout window, so this result
is usable as a large-corpus partial baseline rather than a green performance
claim.

## Corpus

| Corpus | Path | Commit | Status |
|---|---|---:|---|
| zcodegraph | `.` | `40a58b9` | completed |
| vscode-sparse | `/private/tmp/codegraph-corpus/vscode-sparse` | `4a6e32fc1f0` | timed-out |

The VS Code sparse path was a valid Git checkout. No corpus was cloned by the
baseline runner.

## Results

| Corpus | wallMs | RSS | files | nodes | edges |
|---|---:|---|---:|---:|---:|
| zcodegraph | 6224 | unavailable: command-wrapper-no-rss | 379 | 16943 | 39875 |
| vscode-sparse | 310581 | unavailable: command-wrapper-no-rss | 5780 | 327425 | 906683 |

RSS unavailable reason for both runs:

`command RSS sampling did not report maximum resident set size`

## Phase Buckets

| Corpus | parseExtractionMs | sqliteWriteMs | finalization referenceResolutionMs | nameMatchingMs | databaseAccessMs | edgeWriteMs |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 1167 | 667 | 776 | 121 | 455 | 160 |
| vscode-sparse | 22287 | 24911 | 93050 | 53340 | 16559 | 7587 |

## Decision

Keep this as the baseline result for the first comprehensive performance
roadmap issue sequence.

The evidence supports the planned mainline:

- VS Code sparse still shows the largest high-level tail in finalization
  reference resolution;
- `nameMatchingMs` remains the largest public sub-bucket inside that tail;
- `databaseAccessMs` and `edgeWriteMs` are also large enough to keep visible;
- parse/extraction and SQLite write remain material lanes, but they should not
  displace the candidate lookup/cache protocol mainline without a new
  evidence-gated decision.

## Guardrails

- Agent Sufficiency A/B was not required for this baseline-only issue.
- Excalidraw was not required because no graph semantics changed.
- Full README repo scoreboard was not required.
- Process-only profile artifacts were generated under a `tmp-*` directory and
  are intentionally not retained as durable benchmark artifacts.
