---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-20-pr-recall-baseline
bounded-question: "What is the recall/precision baseline of `zcodegraph affected --pr` on three real-world repositories across 60 merged PRs?"
---
# PR Recall Baseline Evidence — `zcodegraph affected --pr <base>..<head>`

Date: 2026-10-20
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-1-5** (测现有 PR 影响 recall 基线)

## Why this evidence exists

Node 1-1-5 carries two exit criteria:

- 3 仓 × ≥20 条已合并 PR 回放
- 现有 impact/affected recall 基线入库存档

This document is the archived baseline. It measures how well `zcodegraph affected --pr <base>..<head> --json` recovers the *actual* files changed in real merged PRs, on three real repositories, 20 PRs each (60 total).

Sibling node 1-1-2 measured semantic alignment vs codeflow on a synthetic 6-file fixture. This node uses real PR history as ground truth — the strictest available definition of "files that should be flagged".

## Method

| Step | Detail |
|---|---|
| Ground truth | `git diff --name-only <base>..<merge>` per PR |
| Repositories | expressjs/express (JS), pallets/flask (Python), spring-projects/spring-petclinic (Java) |
| Sample | Last 20 merged PRs against each repo's default branch |
| PR discovery | `gh api search/issues?q=repo:X+is:pr+is:merged+base:<branch>` (the `/pulls?state=closed` endpoint under-reports merged PRs on slow-moving repos — observed 3 vs 30+) |
| Indexing | `zcodegraph index` run once per PR at the merge sha, against the pinned sparse cone (express: `lib+examples`, flask: `src+tests+examples`, petclinic: `src`) |
| Measurement | `zcodegraph affected --pr <base>..<merge> --json` → `affectedSource`, `affectedTests` |

Script: `scripts/measure/pr-recall-baseline.mjs`. Raw per-PR data: [`2026-10-20-pr-recall-baseline.json`](./2026-10-20-pr-recall-baseline.json).

## Metrics

| Metric | Definition | Notes |
|---|---|---|
| `recall` | \|affectedSource ∩ mergedFiles\| / \|mergedFiles\| | Strict — tests partitioned into `affectedTests` are not counted |
| `recallIndexable` | same, restricted to merged files with an indexed source extension (.js/.ts/.py/.java/…) | Denominator excludes README/.md/.toml/etc. |
| `recallUnion` | \|(affectedSource ∪ affectedTests) ∩ mergedFiles\| / \|mergedFiles\| | Partition-aware — the right number for "did the blast radius cover it" |
| `recallUnionIndexable` | union + indexable denominator | The headline metric |
| `precision` | \|affectedSource ∩ mergedFiles\| / \|affectedSource\| | Expected to be LOW by design — blast radius intentionally includes *dependents* of changed files, which by definition are not in the PR diff |

## Headline results

| Repository | PRs | Indexable-applicable PRs | recallUnionIndexable = 1.0 | Median recallUnionIndexable | Median recall (strict) | Median precision |
|---|---:|---:|---:|---:|---:|---:|
| expressjs/express | 20 | 10 | **10 / 10 (100%)** | 1.000 | 1.000 | 1.000 |
| pallets/flask | 20 | 18 | **18 / 18 (100%)** | 1.000 | 1.000 | 0.102 |
| spring-projects/spring-petclinic | 20 | 17 | **17 / 17 (100%)** | 1.000 | 0.720 | 1.000 |
| **aggregate (60 PRs)** | 60 | 45 | **45 / 45 (100%)** | 1.000 | 1.000 | 1.000 |

**On every PR that touched at least one indexed source file, the blast radius covered 100% of the changed files.** There are zero false negatives in 60 real PRs.

The 15 PRs excluded from the indexable-applicable denominator are listed in the JSON's `prsWithNoIndexableFiles` count: they changed only README.md, .properties, .toml, or similar non-source files, so there is nothing for the indexer to recall.

## Strict-recall nuance (petclinic)

Petclinic's median *strict* recall is 0.720 because Java PRs routinely change both `src/main/java/.../Owner.java` and `src/test/java/.../OwnerTests.java` together. The CLI partitions these into `affectedSource` and `affectedTests` — the strict metric counts only the source partition. The **union** recall, which reflects what callers actually see when they don't filter by partition, is 1.000.

This is the partition working as designed, not a recall bug. Callers consuming `--json` should treat the two partitions as a union when computing blast-radius coverage.

## Precision is intentionally low on some repos

Flask's median precision is 0.102. This is expected: `affectedSource` includes **transitive dependents** of changed files (the actual blast radius), while the ground truth only contains the **changed files themselves**. A low precision here is the blast radius doing its job — flagging files that *weren't* in the diff but are still affected.

Express's 1.000 precision is an artifact of its sparse cone (`lib+examples`): the indexed surface is small enough that the dependents of a typical PR fit in a handful of files, all of which the PR also touched.

## Caveats

1. **Ground truth is files, not symbols.** A PR that renames a symbol without changing call-sites will not be flagged as affecting those call-sites — the tool reports file-level blast radius. Symbol-level precision is the domain of `impact <symbol>`, not `affected --pr`.
2. **Sparse cones exclude some repo surface.** Express measurements exclude `test/`, `benchmarks/`, `docs/` (sparse cone `lib+examples`). The 60-PR sample contains no PR that only touched files outside the cone, so this does not distort the headline result.
3. **PR selection is `updated` order.** We sample the 20 most recently *updated* merged PRs, not a random sample. Active PRs are over-represented; dormant-then-merged PRs are under-represented. For a baseline this is acceptable; a random sample would be stricter.
4. **Non-deterministic source: GitHub API + repo state.** Re-running this script next week will see a different 20 PRs. The JSON snapshot is the durable record.

## Raw data

Full per-PR breakdowns, including base/merge shas, merged file lists, affected counts, and per-PR recall/precision, are in [`2026-10-20-pr-recall-baseline.json`](./2026-10-20-pr-recall-baseline.json) alongside this document.

## Reproduce

```bash
npm run build   # ensure dist/bin/zcodegraph.js is current
node scripts/measure/pr-recall-baseline.mjs --prs 20 \
  --out docs/evidence/$(date +%F)-pr-recall-baseline.json
```

Defaults: 3 repos (express, flask, petclinic) × 20 PRs each. Override with `--only <slug>` / `--corpus-root <dir>`.
