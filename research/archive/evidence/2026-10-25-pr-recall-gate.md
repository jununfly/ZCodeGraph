---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-25-pr-recall-gate
bounded-question: "How is `zcodegraph affected --pr` recall regression-gated in CI after the 1-1-5 baseline was established?"
roadmap-node: 1-3-2
date: 2026-10-25
---
# PR Recall Regression Gate — `scripts/measure/pr-recall-gate.mjs`

Date: 2026-10-25
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-3-2** (P1-1 PR 影响分析，复用 impact/affected)

## Why this evidence exists

Node 1-3-2 carries the merge-gate metric from REFINED-PLAN §7:

> `pr-impact-recall ≥ 0.85 ∧ ≥ baseline − 2pp`

The 1-1-5 baseline ([`2026-10-20-pr-recall-baseline.md`](./2026-10-20-pr-recall-baseline.md))
measured `recallUnionIndexable = 1.000` on 60 real merged PRs (3 repos × 20 PRs),
with **zero false negatives** across the indexable-applicable subset (45 PRs).

The baseline was a P-1 snapshot. P0 施工 (1-2-x Rust migration, 1-2-21 export-wrapped
JSX fix, 1-2-11 explore tight-small-project) shipped between P-1 and P1. 1-3-2
decide (2026-10-25) records the chosen path: **do not re-run the 60-PR baseline
(P0 施工不触及 affected/impact 链路），instead add a CI merge-gate that fails
if any pinned PR ever drops below threshold**.

## Threshold

```
threshold = max(0.85, baseline − 0.02)
          = max(0.85, 1.000 − 0.02)
          = 0.98
```

The threshold is computed at script start by reading
[`docs/baselines/pr-recall-v1.json`](../../../docs/baselines/pr-recall-v1.json)
(the promoted successor of the dated snapshot) and applying the REFINED-PLAN
formula. If the baseline JSON is ever replaced (e.g. a re-run on a different
sample yields a lower median), the threshold tracks automatically.

## Pinned PR sample

Six PRs chosen from the 1-1-5 baseline, two per repo, all with
`recallUnionIndexable = 1.0` and `mergedIndexableCount >= 2` (so the recall
denominator is meaningful — single-file PRs would pass trivially):

| Repo | PR | baseSha | mergeSha | mergedIndexableCount |
|---|---|---|---|---:|
| expressjs/express | #7518 | `6d2df035` | `a419aa73` | 3 |
| expressjs/express | #7494 | `7ef98448` | `6d2df035` | 7 |
| pallets/flask | #6168 | `d73fa1cd` | `728c5e44` | 7 |
| pallets/flask | #6096 | `514fc6b3` | `05e9c6bd` | 4 |
| spring-projects/spring-petclinic | #2672 | `818c4136` | `500158f7` | 7 |
| spring-projects/spring-petclinic | #2663 | `818c4136` | `f3c74834` | 4 |

`cloneSha` per repo matches the baseline run's clone, so `ensureClone` reuses
the same on-disk corpus the baseline was produced against. Per-PR base/merge
shas are fetched on demand with `git fetch origin --depth=1 <sha>` if missing.

## Method per PR

Identical to `pr-recall-baseline.mjs::measurePr`, restricted to the pinned
sample:

1. `git diff --name-only <baseSha>..<mergeSha>` → `mergedFiles` (ground truth).
2. Filter `mergedFiles` to indexable source extensions (same regex).
3. `git checkout --detach <mergeSha>`, then `zcodegraph index`.
4. `zcodegraph affected --pr <baseSha>..<mergeSha> --json`.
5. `recall = |affectedUnion ∩ mergedIndexable| / |mergedIndexable|` where
   `affectedUnion = affectedSource ∪ affectedTests`.

Fail CI if any PR's recall < threshold, or if no PR is measurable.

## Local verification (2026-10-25)

```
baseline (1-1-5) = 1.0000
threshold (max(0.85, baseline - 0.02)) = 0.9800

=== expressjs/express ===
  pass (1.000) — PR #7518, idx files=3, affected=4
  pass (1.000) — PR #7494, idx files=7, affected=52

=== pallets/flask ===
  pass (1.000) — PR #6168, idx files=7, affected=83
  pass (1.000) — PR #6096, idx files=4, affected=78

=== spring-projects/spring-petclinic ===
  pass (1.000) — PR #2672, idx files=7, affected=13
  pass (1.000) — PR #2663, idx files=4, affected=11

mean recallUnionIndexable across pinned sample: 1.0000
OK — all pinned PRs meet or exceed the threshold.
```

## CI wiring

The gate is wired into the `architecture-red-lines` job in
`.github/workflows/ci.yml`:

```yaml
- name: PR recall regression gate (3 repos × 2 pinned PRs)
  run: >
    node scripts/measure/pr-recall-gate.mjs
    --corpus-root /tmp/measure-corpus
```

It reuses the `measure-corpus` `actions/cache` already restored by the
red-lines step (keyed on the architecture-regression-baseline JSON), so the
marginal cost is ~3 indices on cached clones (~30s wall-clock on ubuntu).
The job env already sets `MEASURE_SKIP_FETCH=1` for reused clones — the gate
script's `ensureCommit` still fetches pinned base shas on demand, which is
the only network cost on cache hit.

## What this gate does *not* cover

- **Fixture-level blast-radius correctness** is covered separately by
  `tests/cli-affected-pr.test.ts` (hand-derived import-graph ground truth on
  a 6-file TS fixture, asserts exact affected sets).
- **Precision** is intentionally not asserted — blast radius includes
  transitive dependents by design, so a low precision against the PR-diff
  ground truth is the tool working as intended (see
  `2026-10-20-pr-recall-baseline.md` §"Precision is intentionally low on
  some repos").
- **New regressions on PRs outside the pinned sample** are not covered.
  Widening the sample (e.g. 5 PRs per repo) is a future improvement; the
  current 6-PR sample is sized to finish in under a minute on cached corpus.

## Files

- Gate script: [`scripts/measure/pr-recall-gate.mjs`](../../scripts/measure/pr-recall-gate.mjs)
- CI step: `.github/workflows/ci.yml` `architecture-red-lines` job, last step
- Baseline: [`2026-10-20-pr-recall-baseline.md`](./2026-10-20-pr-recall-baseline.md)
  + [`pr-recall-v1.json`](../../../docs/baselines/pr-recall-v1.json)
