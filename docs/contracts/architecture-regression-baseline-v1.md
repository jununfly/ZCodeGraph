---
doc-kind: contract
authority: primary
authority-id: DES-architecture-regression-baseline-v1
bounded-question: "What stable contract does the architecture regression red-line baseline define?"
---
# Architecture Regression Red-line Baseline v1

Status: active
Roadmap: `docs/plans/semantic-retrieval-roadmap.json` node **1-8-1**
(ADR-0011 R2 ledger — architecture regression red-line baseline + re-baseline
authority). NOTE: the originally-referenced `docs/plans/capability-harvest-roadmap.json`
(node 1-2-8, 横切：架构回归红线 + 能力健康探针) was retired; its red-line
baseline governance migrated to the 1-8-1 ledger.

## Purpose

Defines the frozen baseline against which **index-time** and **explore-latency**
regressions are measured, and the red-line thresholds that CI enforces.

This contract complements `baseline-indexing-performance-v1` (optimization
trend protocol). That contract governs *improvement* claims; this one governs
*regression* alarms. A run may fail this red-line check without invalidating
an optimization keep/no-go classification, and vice versa.

## Red Lines

| Metric | Threshold | Basis |
|---|---|---|
| index wall-time regression | **≤ 15%** | frozen exit criterion (origin: roadmap 1-2-8; current authority: node 1-8-1) |
| explore latency regression | **≤ 20%** | frozen decision 2026-10-22 (origin: roadmap 1-2-8; current authority: node 1-8-1): explore runs SQLite queries with higher variance than indexing; 20% noise tolerance avoids flake |

Regression is computed per corpus as:

```
(currentMedian - baselineMedian) / baselineMedian
```

A run **fails** when any corpus exceeds its threshold. Improvement (negative
regression) never fails.

## Baseline Corpus

Single medium-size corpus, reused from the real-corpus gate set
(`scripts/measure/README.md`):

- `spring-projects/spring-petclinic` — Java/Spring application repo, pinned
  ref recorded in the baseline artifact. Chosen because it is small enough
  for CI (< 2 min index) yet exercises extraction + resolution + framework
  routes (Spring) end to end.

The baseline artifact records the pinned commit sha. Re-baselining requires a
roadmap decision on node **1-8-1** (the ADR-0011 R2 ledger in
`docs/plans/semantic-retrieval-roadmap.json`) and an update to the registered
versioned input; the contract version bumps when corpus, queries, thresholds, or
the measurement build/statistic change.

## Measurement Protocol

Tooling: `scripts/measure/perf-baseline.mjs` (same harness family as
`token-baseline.mjs`; clones via `lib/clone.mjs`, indexes via `lib/index.mjs`
against `dist/bin/zcodegraph.js`).

Per corpus:

1. Clone (or reuse cache under `--corpus-root`), pin `--ref`.
2. Cold index once, then re-index `repetitions` times (default 9 since
   2026-11-09, was 3; deleting `.zcodegraph/` between runs); record each wall
   time; **index baseline = median** of all repetitions.
3. For each frozen explore query, run `zcodegraph explore "<query>"`
   `repetitions` times against the indexed DB; record per-run wall time of
   the CLI process; **explore baseline = median across queries and runs**.

Frozen explore queries (structural, representative of agent高频 flows):

```json
[
  "How does the owner controller reach the vet visit service?",
  "callers of OwnerRepository.save"
]
```

## Environment

- Node >= 22 (managed runtime), `npm run build` must precede measurement.
- Clones use SSH by default; `MEASURE_GIT_PROTOCOL=https` or the
  `gh-proxy.com` mirror for network-restricted hosts.
- The committed reference artifact's `evidence.platform` records the environment
  it was measured on. It was originally `win32-x64` (2026-10-22) and was
  re-baselined to `linux-x64` (Ubuntu DEBUG rust-hybrid, 2026-11-08) to match
  the gate platform (see the `rebaseline` block in the artifact). Ubuntu CI
  compares against that frozen artifact as a regression alarm, not as a
  same-host performance equivalence claim. Windows/macOS timing variance is
  governed by node 1-2-10, not this contract.

## Artifacts

- Baseline: `docs/baselines/architecture-regression-v1.json`
  (metric id `architecture-regression-baseline`). This is a versioned input
  consumed by CI, not a historical evidence link. Re-baselining replaces it
  through the roadmap decision process described above.
- Each CI regression run emits the same envelope to stdout; failing runs
  additionally print per-corpus regression percentages on stderr.

## Out of Scope

- watch-mode incremental latency;
- RSS regression (tracked by `baseline-indexing-performance-v1` trend, not a
  red line here);
- Windows CI flake remediation (node 1-2-10);
- automatic rollback — red lines alarm only.

## Change history

- **2026-11-09 — runner-load noise hardening.** The regression statistic stays
  the bare **median**, but `repetitions` was raised from **3 → 9** (CI flag
  `--repetitions` and both scripts' default). Root cause of the prior flake: at
  3 repetitions a single or double CI runner-load spike (observed index runs
  `2761 / 3455 / 3556` → median 3455, +17.2% over the 2948 baseline) dominated
  the bare median and crossed the 15% red line, while a different run measured a
  tight `2885 / 2948 / 2992` (median 2948, −22% on an idle runner). The 30%
  within-run spread at 3 reps is far larger than the 15% threshold, so the gate
  was detecting runner load, not code. With 9 repetitions the median is
  estimated from many more samples; one or two slow runs no longer move it past
  the threshold, while a uniformly slower run (a real regression) still does.
  The baseline `indexMedianMs = 2948` remains the comparison anchor (a typical
  value); it is not re-derived because the new statistic is still a median and
  the current 9-rep median of a stable run is ~2950, well inside the 15% band.
  Further hardening (release-build upstream-check binary + trimmed-mean
  statistic) is possible but out of scope for this change.
