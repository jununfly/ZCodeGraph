# Rust-Hybrid Candidate Protocol Routing A/B Result

Date: 2026-06-24

Issue:

- #515

Plan:

- `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`

Inputs:

- Baseline contract: #513
- Shape decision: #514
- Shape decision artifact:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-shape-diagnostics-decision.md`

Raw results:

- Candidate routing enabled:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-result.json`
- VS Code sparse routing disabled comparison:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result.json`

## Decision

`no-go` as a default-path performance optimization.

Keep the guarded local-config candidate producer routing mechanism as a
diagnostic and semantic-safety tool, but do not promote this bounded routing
slice as the next performance optimization.

## Current Repository Result

| Run | Routing | wallMs | referenceResolutionMs | nameMatchingMs | databaseAccessMs | graph |
|---|---|---:|---:|---:|---:|---|
| #513 baseline | absent/default | 6224 | 776 | 121 | 455 | 379 files / 16943 nodes / 39875 edges |
| #515 candidate | enabled | 13170 | 6628 | 4157 | 415 | 379 files / 16943 nodes / 39875 edges |

RSS for both runs was unavailable with
`command-wrapper-no-rss`.

Interpretation:

- graphStats stayed stable;
- routing did not change graph shape;
- candidate routing substantially worsened wall time and name-matching time on
  the current repository.

## VS Code Sparse Result

| Run | Routing | status | wallMs | referenceResolutionMs | nameMatchingMs | databaseAccessMs | graph |
|---|---|---|---:|---:|---:|---:|---|
| disabled comparison | false | completed | 210933 | 35934 | 15591 | 16608 | 5780 files / 327425 nodes / 906683 edges |
| candidate | true | timed-out | 314868 | 96094 | 55066 | 16777 | 5780 files / 327425 nodes / 906683 edges |

RSS for both runs was unavailable with
`command-wrapper-no-rss`.

Interpretation:

- graphStats stayed stable;
- routing true did not produce a large-corpus performance win;
- the enabled candidate timed out while the disabled comparison completed;
- `databaseAccessMs` stayed roughly flat, so the candidate did not solve the
  dominant cost by moving work out of DB access;
- `nameMatchingMs` and `referenceResolutionMs` worsened materially.

## Shape Diagnostics

VS Code sparse, routing disabled:

- configured: false;
- active: false;
- on-demand lookup count: 0;
- candidate protocol DB lookups: 38104;
- `FileNodes` requested: 1516;
- `FileNodes` reused: 218;
- `FileNodes` missed: 1298;
- `FileNodes.lookupMs`: 352.

VS Code sparse, routing enabled:

- configured: true;
- active: true;
- active shapes: `ExactName`, `KnownNamePresence`, `LowerName`,
  `QualifiedName`, `FileNodes`;
- fallback reason: null;
- mismatch count: 0;
- on-demand lookup count: 1263;
- on-demand shape counts:
  - `LowerName`: 1;
  - `QualifiedName`: 19;
  - `FileNodes`: 1243;
- candidate protocol DB lookups: 7794;
- `FileNodes` requested: 1516;
- `FileNodes` reused: 1516;
- `FileNodes` missed: 0;
- `FileNodes.lookupMs`: 38256.

The mechanism works semantically and reduces DB lookup count, but the on-demand
Rust producer/hydration path is too expensive in this shape. The strongest
signal is `FileNodes`: it improves reuse/miss counters but makes lookup time
far worse.

## Guardrails

- No SQLite schema changed.
- No reference target-selection semantics changed.
- No Agent Sufficiency A/B was required because the graph shape and semantics
  were unchanged.
- VS Code sparse checkout remained available at
  `/private/tmp/codegraph-corpus/vscode-sparse`, commit `4a6e32fc1f0`.

## Next Candidate

Do not continue with candidate producer routing as a performance path unless it
is reframed to avoid expensive per-key subprocess/on-demand work.

The next performance candidate should be selected from the closeout queue:

- revisit finalization/reference-resolution with a lower-overhead candidate
  materialization design; or
- move to parse/extraction or SQLite/write-path only if the closeout evidence
  shows those lanes now pass the evidence gate.
