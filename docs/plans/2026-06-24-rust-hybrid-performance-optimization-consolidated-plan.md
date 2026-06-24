# Rust-Hybrid Performance Optimization Consolidated Plan

Date: 2026-06-24

Status: completed

This document consolidates the completed rust-hybrid performance optimization
roadmap and replaces the temporary plan, roadmap, and benchmark process files
from this iteration.

Long-lived baseline contracts remain separate:

- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

## Roadmap Summary

Completed roadmap:

```text
[x][X+] 1. Rust-hybrid performance optimization roadmap
├── [x][Y+] 1-1. Baseline and benchmark artifact contract
├── [x][X+] 1-2. Performance opportunity map across architecture implementation and debt
├── [x][Y+] 1-3. Evidence-gated optimization execution
├── [x][Y+] 1-4. Residual QualifiedName routing bounded optimization
├── [x][Y+] 1-5. VS Code sparse timeout diagnostic visibility
├── [x][Y+] 1-6. Production profile checkpoints for VS Code sparse phase attribution
├── [x][Y+] 1-7. FileNodes routing residual candidate lookup optimization
├── [x][X+] 1-8. Large-corpus representative reduced fixture for finalization timeout reproduction
├── [x][Y+] 1-9. RSS primary metric reliability for sandboxed baseline runs
└── [x][X+] 1-10. Agent Sufficiency guardrail refresh after performance-path changes
```

The roadmap completed one evidence-gated optimization loop for the default
`rust-hybrid` path and produced diagnostics for the next optimization route.
It does not claim full cross-corpus performance greenlight.

## Completed Decisions

### 1-1. Baseline and Benchmark Artifact Contract

Decision: keep separate baseline contracts for indexing performance and Agent
Sufficiency.

Durable contracts:

- `baseline-indexing-performance-v1`
- `baseline-agent-sufficiency-v1`

Process artifacts are expected to use `tmp-*` names and should be deleted or
merged after their issue/plan scope closes unless they become long-lived ADR or
baseline material.

### 1-2. Performance Opportunity Map

Decision: optimize from segmented evidence, not from a single wall-clock number.

The first opportunity map identified candidate buckets across:

- Rust extraction/write;
- TypeScript finalization/reference resolution;
- candidate producer and name matching paths;
- profile and RSS observability;
- Agent Sufficiency guardrails.

### 1-3. Evidence-Gated Optimization Execution

Decision: keep the first bounded candidate,
`name-matching-candidate-lookup-reuse`.

Current-repo A/B medians:

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| wall time | 41661 ms | 26625 ms | -36.09% |
| nameMatchingMs | 32729 ms | 17725 ms | -45.84% |
| importResolutionMs | 2420 ms | 2371 ms | -2.02% |
| databaseAccessMs | 353 ms | 362 ms | +2.55% |

Mechanism evidence:

- `LowerName` on-demand routing lookups dropped from `210` to `0`;
- total routing on-demand lookups dropped from `464` to `256`;
- routing stayed active with no mismatch samples.

Scope guardrail:

- no reference disambiguation change;
- no graph semantics change;
- no Agent Sufficiency claim from this candidate alone.

### 1-4. Residual QualifiedName Routing Bounded Optimization

Decision: keep dotted `QualifiedName` prebatching.

Current-repo A/B medians:

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| wallMs | 26625 | 13115 | -50.7% |
| nameMatchingMs | 17725 | 4235 | -76.1% |
| importResolutionMs | 2371 | 2389 | +0.8% |
| databaseAccessMs | 362 | 344 | -5.0% |
| edgeWriteMs | 105 | 90 | -14.3% |

Candidate routing diagnostics:

- onDemandLookupCount: `256 -> 70`;
- onDemand `QualifiedName`: `223 -> 37`;
- onDemand `FileNodes`: `33 -> 33`;
- residual dotted-reference `QualifiedName`: `0`;
- residual colon-qualified-reference `QualifiedName`: `37`.

No-go in this slice:

- colon-qualified `QualifiedName` routing;
- package resolution semantics;
- FileNodes routing optimization;
- RSS infrastructure changes;
- Agent Sufficiency claims.

### 1-5. VS Code Sparse Timeout Diagnostic Visibility

Decision: keep runner-owned timeout progress snapshots.

VS Code sparse bounded smoke:

- corpus: `/private/tmp/codegraph-corpus/vscode-sparse`;
- commit: `4a6e32fc1f0`;
- timeout: `300000ms`;
- classification: `baseline-partial-timeout`;
- final graphStats at timeout: `5780` files, `327425` nodes, `906677` edges.

Interpretation:

- the timeout was not a pure no-progress hang;
- graph edge count changed during the run and returned to the final count;
- runner-owned snapshots can show progress but cannot attribute the internal
  production phase when no profile artifact exists.

### 1-6. Production Profile Checkpoints

Decision: keep production partial profile checkpoints for phase attribution.

VS Code sparse partial profile showed:

- Rust core completed at `166517ms`;
- TypeScript fallback append completed at `166580ms`;
- finalization started at `166582ms`;
- framework post-extract completed at `167552ms`;
- reference resolution started but did not complete before the `300s` timeout.

Interpretation:

The VS Code sparse timeout is attributable to finalization reference
resolution, after Rust core extraction/write and after fallback append.

### 1-7. FileNodes Routing Residual Candidate Lookup Optimization

Decision: keep FileNodes lookup diagnostics and the bounded prebatch/reuse
mechanism, but do not claim a material performance win.

Reduced fixture:

- before wallMs: `1054`;
- after wallMs: `1125`;
- before referenceResolutionMs: `31`;
- after referenceResolutionMs: `32`;
- FileNodes requested: `1200`;
- FileNodes reused: `1199`;
- fallbackCount: `0`.

Current repo:

- FileNodes requested: `2329`;
- FileNodes reused: `2213`;
- missed: `116`;
- fallbackCount: `0`.

Interpretation:

The mechanism is exercised and safe enough to keep as diagnostics plus bounded
reuse, but it did not improve the reduced fixture.

### 1-8. Reduced Fixture for Finalization Timeout Reproduction

Decision: keep the representative reduced fixture as the inner loop for
reference-resolution pressure.

The fixture is useful for fast iteration on candidate routing and
reference-resolution shape diagnostics. It is not a replacement for a completed
VS Code sparse profile.

### 1-9. RSS Primary Metric Reliability

Decision: keep command-mode RSS baseline taxonomy.

Current repo one-run baseline:

- resultClassification: `baseline-frozen`;
- status: `completed`;
- wallMs: `5952`;
- peakRssBytes: `null`;
- rssUnavailableKind: `command-wrapper-no-rss`;
- rssUnavailableReason:
  `command RSS sampling did not report maximum resident set size`.

Interpretation:

RSS bytes are still unavailable on this sandboxed machine, but RSS state is now
structured and judgeable. Command-wrapper RSS failure should not classify a
completed index/profile run as an indexing failure.

### 1-10. Agent Sufficiency Guardrail Refresh

Decision: Agent Sufficiency is preserved with existing graph-coverage gaps.

Current repo deterministic guardrail:

- status: `completed`;
- classification: `success-comparison-completed`;
- comparison regression count: `0`;
- TypeScript graphStats: `16367` nodes, `37787` edges, `374` files;
- Rust graphStats: `16367` nodes, `37787` edges, `374` files.

Prompt-level gaps:

- `ZCG-1`, `ZCG-2`, and `ZCG-3` did not produce Flow sections;
- each prompt still carries deterministic Read/Grep fallback-risk signals;
- `ZCG-3` misses `ReferenceResolver` in both TypeScript and Rust arms.

Interpretation:

The recent performance-path changes did not introduce a Rust-vs-TypeScript
sufficiency regression on the current repo guardrail. This does not claim new
Agent Sufficiency improvement.

## Remaining Gaps

These are not unfinished nodes in this roadmap. They are follow-up routes.

1. #165 remains the post-PRD optimization tracker.
   - This roadmap should be treated as one completed iteration underneath it.
   - It should not be closed solely because this roadmap closed.

2. #430 remains the Import/File Resolver Part 2 package/runtime tracker.
   - Package imports, builtins, `exports`/`imports`, `node_modules`, and full
     TypeScript `moduleResolution` remain outside this performance roadmap.

3. #185 remains a retained cross-platform validation environment item.
   - It is not a blocker for this roadmap.

4. VS Code sparse still times out in the bounded window.
   - The best available attribution points at finalization reference
     resolution.
   - A completed large-corpus profile is still required before broad
     cross-corpus performance claims.

5. Agent Sufficiency has existing current-repo graph-coverage gaps.
   - These are future sufficiency improvement candidates, not regressions from
     this performance path.

## Consolidation Notes

The following process artifacts were merged into this document and can be
deleted after consolidation:

- narrow plan documents for this roadmap;
- roadmap JSON/Markdown files for this completed roadmap;
- `tmp-rust-hybrid-*` benchmark decision/result/profile files from this
  roadmap;
- `tmp-*` benchmark directories generated by this roadmap.

The baseline contract files are retained because they are long-lived reference
documents, not process artifacts.
