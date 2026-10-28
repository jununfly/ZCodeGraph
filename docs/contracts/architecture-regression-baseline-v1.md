---
doc-kind: contract
authority: primary
authority-id: DES-architecture-regression-baseline-v1
bounded-question: "What stable contract does the architecture regression red-line baseline define?"
---
# Architecture Regression Red-line Baseline v1

Status: active
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-2-8**
(横切：架构回归红线 + 能力健康探针).

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
| index wall-time regression | **≤ 15%** | roadmap 1-2-8 exit criterion (frozen) |
| explore latency regression | **≤ 20%** | roadmap 1-2-8 decision 2026-10-22: explore runs SQLite queries with higher variance than indexing; 20% noise tolerance avoids flake |

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
roadmap decision on node 1-2-8 and an update to the registered versioned input;
the contract version bumps when corpus, queries, or thresholds change.

## Measurement Protocol

Tooling: `scripts/measure/perf-baseline.mjs` (same harness family as
`token-baseline.mjs`; clones via `lib/clone.mjs`, indexes via `lib/index.mjs`
against `dist/bin/zcodegraph.js`).

Per corpus:

1. Clone (or reuse cache under `--corpus-root`), pin `--ref`.
2. Cold index once, then re-index `repetitions` times (default 3, deleting
   `.zcodegraph/` between runs); record each wall time; **index baseline =
   median**.
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
- The committed reference artifact records its original `win32-x64` environment.
  Ubuntu CI compares against that frozen artifact as a regression alarm, not as
  a same-host performance equivalence claim. Windows/macOS timing variance is
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
