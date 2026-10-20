---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-20-blast-radius-recall
bounded-question: "What evidence does 2026-10-20-blast-radius-recall provide for the affected --pr blast-radius feature?"
---
# Blast Radius Recall Evidence — `zcodegraph affected --pr <range>`

Date: 2026-10-20
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-1-2** (P-1 对照 codeflow 自研 PR 影响 blast radius)

## Why this evidence exists

Node 1-1-2 carries an exit criterion: *"在选定 fixture 上与 codeflow 输出对比，受影响文件集合 recall ≥ 90%"*.

During implementation we discovered that **codeflow does not expose a commit-range blast-radius API** — it is a single-file HTML browser application whose blast-radius feature operates at **single-file granularity** (manual point-and-click) or **PR URL granularity** (via GitHub API on a hosted web page). Neither form is scriptable for automated recall measurement on a local commit range.

A `decide` entry on node 1-1-2 (2026-10-20) records the agreed reinterpretation (α+γ combination):

> recall 证据降级为「语义对齐论证 + 单文件抽样对照（N≥2）+ 明确标注 codeflow 能力缺口」，不追求字面 90% 阈值。

This document is that evidence.

## 1. Semantic alignment table

| Dimension | codeflow blast radius | `zcodegraph affected --pr` | Aligned? |
|---|---|---|---|
| Dependency direction | transitive dependents (who imports me, transitively) | transitive dependents via BFS on the indexed edge graph | ✅ |
| Edge semantics | static import / require relationships | static `imports` + `references` edges resolved by tree-sitter + framework resolvers | ✅ (stricter — codeflow does not resolve framework routes) |
| Granularity | file-level | file-level (with symbol-level available via `impact <symbol>`) | ✅ |
| Commit range input | **not supported** | `git diff --name-only <base>..<head>` | ⚠️ codeflow capability gap |
| Test/source partition | not surfaced in UI | `--json` partitions `affectedSource` vs `affectedTests` | ⚠️ codeflow capability gap |
| Automation surface | none (browser-only) | CLI exit code 0/1 + JSON stdout, composable in CI | ⚠️ codeflow capability gap |

**Conclusion of the table:** on the dimensions codeflow *does* expose, our semantics match. The three ⚠️ rows are codeflow capability gaps — they are precisely the dimensions where `affected --pr` adds new value, and they are also the dimensions that make a literal recall measurement impossible.

## 2. Single-file sample对照 (N=2)

We constructed a 6-file TypeScript fixture with a real git history (see "Fixture" below) and computed the blast radius of two single-file commit ranges. The ground truth was derived **by hand** from the import graph before running the CLI.

### Fixture

```
src/core.ts         export function core(): number
src/util.ts         import { core } from "./core"
src/service.ts      import { util } from "./util"
src/main.ts         import { service } from "./service"
tests/util.test.ts  import { util } from "../src/util"
tests/core.test.ts  import { core } from "../src/core"
```

Commits:
- `ab95a89c…` — A: initial (all 6 files)
- `a3f7136b…` — B: touch `src/util.ts` only
- `34089b68…` — C: touch `src/core.ts` only

### Sample 1 — `A..B` (changed = `src/util.ts`)

Hand-derived ground truth (transitive dependents of `util.ts`, including itself):
`{util.ts, service.ts, main.ts, tests/util.test.ts}` (4 files).

CLI output (`affected --pr A..B --json`), with `.zcodegraph/.gitignore` (index side-effect, not an import dependency) excluded:

```
affectedSource: [src/util.ts, src/service.ts, src/main.ts]
affectedTests:  [tests/util.test.ts]
```

Recall = 4 / 4 = **100%**. Precision = 4 / 4 = **100%**.

### Sample 2 — `B..C` (changed = `src/core.ts`)

Hand-derived ground truth (transitive dependents of `core.ts`, including itself):
`{core.ts, util.ts, service.ts, main.ts, tests/core.test.ts, tests/util.test.ts}` (6 files).
Note: `tests/util.test.ts` is transitively affected because it imports `util.ts`, which imports `core.ts`.

CLI output:

```
affectedSource: [src/core.ts, src/util.ts, src/service.ts, src/main.ts]
affectedTests:  [tests/core.test.ts, tests/util.test.ts]
```

Recall = 6 / 6 = **100%**. Precision = 6 / 6 = **100%**.

### Aggregate

| Metric | Value |
|---|---|
| Sample size | N = 2 |
| Mean recall (vs hand-derived ground truth) | **100%** |
| Mean precision | **100%** |
| Recall vs codeflow | **N/A — codeflow has no scriptable commit-range blast radius** |

## 3. Interpretation

- **Against hand-derived ground truth**, the implementation achieves 100% recall on the fixture's two single-file commit ranges. This is the strongest recall claim we can make without a scriptable external reference.
- **Against codeflow**, no recall number is meaningful. codeflow's blast radius is exposed only through manual UI interaction or a hosted PR-URL flow, neither of which can be automated into an offline measurement.
- The very features that make a literal recall comparison impossible (commit-range input, source/test partition, CLI automation) are the features `affected --pr` introduces beyond codeflow's current capability set. This is **evidence of differentiation, not equivalence** — and that is what node 1-1-2 was actually intended to validate.

## 4. Caveats

1. **Small sample.** N=2 single-file commit ranges on a 6-file fixture. Larger multi-file ranges on a real-world corpus are deferred to node 1-1-5 (`测现有 PR 影响 recall 基线`), which shares the fixture-selection decision with this node via roadmap edge.
2. **Hand-derived ground truth.** Both samples use hand-derived import-graph transitive closure as the reference. For a 6-file fixture this is reliable; for larger corpora it is not feasible.
3. **`.zcodegraph/` side-effect.** Running the CLI inside the fixture regenerates `.zcodegraph/.gitignore`, which appears as an extra changed file. This is excluded from recall math above (it is not an import dependency) but is visible in the raw output and could be filtered by a future `--exclude` flag.
4. **No CI regression on recall.** Because there is no external scriptable reference, recall is **not** asserted in CI. The regression guard is the e2e suite in `tests/cli-affected-pr.test.ts`, which asserts exact blast-radius sets on the same fixture shape.

## 5. Reproducibility

```bash
# 1. Build the fixture (6 TS files, git init, 3 commits as above)
# 2. Index
node dist/bin/zcodegraph.js index
# 3. Sample 1 — A..B
node dist/bin/zcodegraph.js affected --pr <shaA>..<shaB> --json
# 4. Sample 2 — B..C
node dist/bin/zcodegraph.js affected --pr <shaB>..<shaC> --json
```

The e2e suite `tests/cli-affected-pr.test.ts` runs this exact flow in CI on all three operating systems and asserts the same blast-radius sets.
