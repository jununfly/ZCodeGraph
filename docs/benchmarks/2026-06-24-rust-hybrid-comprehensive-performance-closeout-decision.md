# Rust-Hybrid Comprehensive Performance Closeout Decision

Date: 2026-06-24

Issues:

- #513
- #514
- #515
- #516

Plan:

- `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`

Roadmap:

- The completed roadmap process files were merged into
  `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`
  and removed.

## Decision

This comprehensive optimization cycle is complete.

The bounded candidate protocol routing slice is a `no-go` as a default-path
performance optimization. Keep it as guarded local-config diagnostics and
semantic-safety tooling, but do not promote it as the next performance
mainline.

Next candidate:

1. Design a lower-overhead finalization/reference-resolution candidate
   materialization path that avoids expensive per-key subprocess/on-demand
   work.
2. Re-run the baseline evidence gate before implementing parse/extraction or
   SQLite/write-path work.
3. Use Agent Sufficiency guardrails only when graph semantics, Explore output,
   language coverage, or user-facing sufficiency claims change.

## Evidence Summary

### #513 Baseline

Artifacts:

- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.json`

Result:

- classification: `baseline-partial-timeout`;
- current repository completed in `6224ms`;
- current repository graphStats:
  `379 files / 16943 nodes / 39875 edges`;
- VS Code sparse timed out at `310581ms`;
- VS Code sparse graphStats:
  `5780 files / 327425 nodes / 906683 edges`;
- VS Code sparse commit: `4a6e32fc1f0`;
- RSS unavailable reason: `command-wrapper-no-rss`.

Conclusion:

The baseline is good enough to support bounded candidate decisions, but not a
full green performance gate. VS Code sparse remains the large-corpus pressure
test.

### #514 Shape Decision

Artifact:

- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-shape-diagnostics-decision.md`

Decision:

- include `LowerName` with caveat;
- include `QualifiedName`;
- include `FileNodes` with separate accounting;
- preserve TypeScript-owned final per-reference disambiguation;
- do not change SQLite schema, package resolution, framework resolution,
  dynamic-dispatch synthesis, or target-selection semantics.

Conclusion:

The selected slice was narrow enough to test routing and diagnostics without
changing reference-resolution semantics.

### #515 Candidate Protocol A/B

Artifacts:

- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-ab-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result.json`

Current repository:

| Run | Routing | wallMs | referenceResolutionMs | nameMatchingMs | databaseAccessMs | graph |
|---|---|---:|---:|---:|---:|---|
| #513 baseline | absent/default | 6224 | 776 | 121 | 455 | 379 files / 16943 nodes / 39875 edges |
| #515 candidate | enabled | 13170 | 6628 | 4157 | 415 | 379 files / 16943 nodes / 39875 edges |

VS Code sparse:

| Run | Routing | status | wallMs | referenceResolutionMs | nameMatchingMs | databaseAccessMs | graph |
|---|---|---|---:|---:|---:|---:|---|
| disabled comparison | false | completed | 210933 | 35934 | 15591 | 16608 | 5780 files / 327425 nodes / 906683 edges |
| candidate | true | timed-out | 314868 | 96094 | 55066 | 16777 | 5780 files / 327425 nodes / 906683 edges |

Shape diagnostics:

- routing enabled kept graphStats stable;
- routing enabled produced `0` mismatches;
- VS Code sparse DB lookups dropped from `38104` to `7794`;
- `FileNodes` reuse improved from `218 / 1516` to `1516 / 1516`;
- `FileNodes.lookupMs` worsened from `352` to `38256`;
- RSS unavailable reason: `command-wrapper-no-rss`.

Conclusion:

The routing mechanism works semantically and improves some counters, but the
current on-demand candidate producer/hydration shape is too expensive. The
strongest negative signal is `FileNodes`: reuse improves, but lookup time
dominates the benefit.

## Lane Closeout

### Finalization And Reference Resolution

Status: `next`.

This remains the strongest lane, but not through the tested per-key on-demand
routing shape.

Next work should test a lower-overhead materialization design. The design must
keep final per-reference disambiguation semantics stable and should avoid
subprocess or hydration costs proportional to candidate keys.

### Parse And Extraction

Status: `defer`.

Do not open an implementation slice from this roadmap yet. Revisit only if a
fresh baseline shows parse/extraction as a top bucket and there is a bounded
A/B candidate.

### SQLite And Graph Write

Status: `defer`.

SQLite/write-path remains a plausible future lane, but this cycle did not
select it. Keep `ZJ-0004` as the write-path boundary. Do not change the SQLite
schema as part of this roadmap.

### RSS And Process Overhead

Status: `keep as evidence requirement`.

Every optimization result must record RSS or an unavailable reason. In this
cycle RSS remained unavailable with `command-wrapper-no-rss`. The candidate
result still gives a useful process/on-demand overhead signal through the
worsened `FileNodes.lookupMs`, `referenceResolutionMs`, and `nameMatchingMs`.

### Agent Sufficiency

Status: `defer`.

Agent Sufficiency A/B was not required because the bounded candidate preserved
graph shape and reference-resolution semantics, and did not change Explore
output or user-facing claims. Re-enable Excalidraw or broader sufficiency
guardrails when semantics or claims change.

## Artifact Hygiene

Kept durable artifacts:

- baseline result JSON and Markdown;
- shape diagnostics decision;
- routing A/B result Markdown and raw JSON;
- this closeout decision.

Removed process artifacts:

- `docs/benchmarks/tmp-2026-06-24-rust-hybrid-candidate-protocol-routing-result/`;
- `docs/benchmarks/tmp-2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result/`.

## Next-Candidate Queue

1. Lower-overhead finalization/reference-resolution candidate materialization.
   The hypothesis is that precomputed or batch-owned candidate materialization
   can preserve the useful semantic boundary from #514 without the per-key
   on-demand cost seen in #515.
2. Parse/extraction bucket review. Only proceed if a fresh baseline makes it a
   top bucket and yields a bounded A/B candidate.
3. SQLite/write-path bucket review. Only proceed if a fresh baseline makes it a
   top bucket and the candidate stays within the existing write-path boundary.

Follow-up:

The first next-candidate queue item was covered by a narrow run-scoped
`FileNodes` batch materialization slice tracked by #517, #518, and #519. The
follow-up closed as `keep-with-caveat`.

The slice kept the run-scoped `FileNodes` batch materialization contract and
diagnostics because it preserves graph semantics, removes per-key Rust producer
on-demand lookup from this candidate shape, and makes `FileNodes` lookup
behavior explainable.

It did not close the broader reference-resolution tail performance problem:

- current repository profile completed with `FileNodes.lookupMs=10`,
  `batchMaterializationMs=44`, and RSS unavailable as
  `command-wrapper-no-rss`;
- VS Code sparse profile was complete but the wrapper run timed out;
- VS Code sparse recorded `FileNodes.lookupMs=327`,
  `batchMaterializationMs=903`, and graphStats
  `5780 files / 327425 nodes / 906683 edges`;
- VS Code sparse batch hit rate was low (`20 / 1516` requested lookups), with
  `1278` batch misses and `1278` fallback lookups;
- routing diagnostics stayed disabled for the smoke:
  `configured=false`, `active=false`, and `onDemandLookupCount=0`.

Conclusion:

Keep the contract and diagnostics, but do not expand `FileNodes` batch
materialization by default. Future work should explore `QualifiedName` or
`LowerName` only if a design can plausibly produce higher hit rate, otherwise
return to a fresh baseline before selecting the next parse/extraction or
SQLite/write-path candidate.

## Closeout

This roadmap should be considered completed as an evidence-first optimization
cycle, not as a performance-win release. The main useful output is the no-go
decision for the current candidate routing shape and a sharper next-candidate
queue.
