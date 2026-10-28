---
doc-kind: ledger
authority: supporting
authority-id: LED-capability-harvest-roadmap-closeout
bounded-question: "What was decided and delivered in the capability-harvest roadmap campaign (2026-10-19 → 2026-10-27), and where does its durable content now live?"
decided-by:
  - "1"
  - "1-1"
  - "1-2"
  - "1-3"
  - "1-4"
last-reviewed: 2026-10-28
---

# Capability-Harvest Roadmap Closeout

This ledger consolidates the durable content of the completed
capability-harvest campaign whose process SoT lived at
`docs/plans/capability-harvest-roadmap.json` (49 nodes, 208 decisions,
closed 2026-10-27). In line with ADR
[`ZJ-0005-separate-durable-decisions-from-process-artifacts`](../../docs/decisions/ZJ-0005-separate-durable-decisions-from-process-artifacts.md)
and the ontology rule that `docs/plans/` holds process material only, the
JSON SoT, its rendered `.md`, and the two builder scripts were removed
after this closeout was absorbed.

The full decision tree (49 nodes, 208 Q&A records) remains reachable in
git history at the path above. This ledger preserves the campaign-level
shape and the pointers to every durable artifact the campaign produced.

## Campaign Timeline

| Phase | Window | Scope |
| --- | --- | --- |
| Roadmap orchestration | 2026-10-19 | REFINED-PLAN v2 compiled into the JSON SoT + `build_roadmap.py` / `build_edges_decisions.py` builders. |
| P-1 validation sprint | 2026-10-19 → 2026-10-25 | 1-1 nodes: visualization, blast radius, measurement infrastructure, token baselines, PR recall baseline, health rubric, churn heatmap, SVG Card, codeflow hands-on backfill. |
| P0 usability and quality | 2026-10-20 → 2026-10-26 | 1-2 nodes: diagnostics, index progress, token output optimization, dead-code rubric, find_dead_code, cyclomatic complexity, schema evolution clauses, architecture regression red lines, indexing-scope config, Windows flake hardening, explore small-project budget, A3 extractor backlog burn-down, Rust core JSX export parity. |
| P1 high-value comprehension | 2026-10-23 → 2026-10-25 | 1-3 nodes: graph quality gate, PR impact analysis (reuse), Spring bean/DI semantics, multi-view visualization, time-evolution animation, drupal FK bug fix. |
| P2 optional local hybrid semantic retrieval | 2026-10-26 → 2026-10-27 | 1-4 nodes:立项三问硬验收 → 量化阈值实测 → 异步嵌入管线设计（ADR-0009） → 硬底盘（schema v6 + queue + taxonomy） → 运行时（worker + watcher + read-repair + CLI flag） → D6 回归基准三件套实测 → fastembed 懒装方案立项（ADR-0010） → 实施 ADR-0010 方案 B（`embedding install` 子命令）。 |

Opening commit: `7908740 chore(plans): 能力汇集路线图编排（roadmap SoT + builder 脚本）` (2026-10-19).
Closing commit: `d6da9be chore(1-4-32): ADR-0010 amendment (npm.cmd spawn, pathToFileURL import, exact fastembed@1.14.5 pin, 1.14.5 cache layout) + roadmap close-out` (2026-10-27).

## Final Counts

| Metric | Value | Durable home |
| --- | --- | --- |
| Top-level phases | **4** (P-1, P0, P1, P2) | This ledger |
| Total nodes | **49** (1 root + 4 phase + 36 leaf + 8 sub-leaf) | This ledger |
| Total decisions (Q&A records) | **208** | JSON SoT in git history |
| New ADR | **2** | `docs/decisions/ZJ-0009-async-embedding-pipeline.md`, `docs/decisions/ZJ-0010-fastembed-lazy-install.md` |
| New contracts | **5** | `token-baseline-tasks-v1.md`, `token-baseline-tasks-v2.md`, `dead-code-rubric-v1.md`, `schema-evolution-and-mcp-tool-cap-v1.md`, `architecture-regression-baseline-v1.md` |
| Dated evidence docs produced | **17** (with companion JSON) | `research/archive/evidence/2026-10-*.md` |
| New measure scripts | **6+** | `scripts/measure/{token-baseline,pr-recall-baseline,pr-recall-gate,dead-code-precision,perf-baseline,perf-regression-check,capability-probes,embedding-baseline,async-embedding-d6-regression}.mjs` |
| Schema versions introduced | **v4 → v5 → v6** | `src/db/migrations.ts`, `src/db/schema.sql` |
| MCP tool cap locked | **≤ 12** | `docs/contracts/schema-evolution-and-mcp-tool-cap-v1.md` |
| Rust core JSX parity fix | **unresolved_refs.metadata + tsTypeAnnotation** | `crates/zcodegraph-core/` + `src/indexing/rust-js-framework-routes.ts` |

## Goal 1 — P-1 Validation Sprint (1-1)

**Outcome:** the measurement infrastructure was built from scratch. The
campaign's central decision was that *no P0/P1 work could be evaluated
without a baseline*, so P-1 produced the baseline before any feature work
began.

| Leaf | Result | Durable home |
| --- | --- | --- |
| 1-1-1 自研可视化引擎首版 | `zcodegraph visualize` shipped; single self-contained HTML | `src/visualize/` + CLI |
| 1-1-2 对照 codeflow 自研 PR 影响 blast radius | `zcodegraph affected --pr <range>` landed; 4 e2e in CI | `src/bin/zcodegraph.ts` + `tests/cli-affected-pr.test.ts` |
| 1-1-3 固化测量基础设施脚本 | `scripts/measure/` framework created | `scripts/measure/` |
| 1-1-4 测 token 消耗稳定 baseline | median ratio **0.1712** vs conservative read-everything baseline (~6× byte savings) | `docs/contracts/token-baseline-tasks-v1.md` + `research/archive/evidence/2026-10-20-token-baseline-layer1.{md,json}` |
| 1-1-5 测现有 PR 影响 recall 基线 | **100 %** recall on 3 pinned repos (express, flask, petclinic) × 20 PRs | `research/archive/evidence/2026-10-20-pr-recall-baseline.{md,json}` |
| 1-1-6 对照 codeflow 自研 A-F 健康分 | health rubric v1 frozen; pure-SQL, zero LLM, zero new schema | `docs/contracts/health-rubric-v1.md` + `src/health/rubric.ts` |
| 1-1-7 churn 热图 | git-history driven | `src/visualize/` + CLI |
| 1-1-8 README SVG Card | CI egress shipped | `src/visualize/` + CI wiring |
| 1-1-10 codeflow hands-on 验证并回填 Unknown | codeflow's three Unknown criteria resolved by first-hand observation | `research/archive/evidence/2026-10-25-codeflow-product-positioning-backfill.md` |

**Key decision:** the字面 recall-vs-codeflow exit criterion was reinterpreted
because codeflow has no commit-range capability, no CLI, and only a browser
single-file HTML UI. The "≥ 90 %" threshold was therefore restated as
"blast-radius recall ≥ 90 % on 3 pinned repos" and closed at 100 %.

## Goal 2 — P0 Usability and Quality (1-2)

**Outcome:** 22 nodes covering agent-facing diagnostics, output sizing,
dead-code detection, complexity metrics, schema evolution discipline,
architecture regression red lines, and a burn-down of A3 extractor backlog
that unlocked dead-code precision.

### Notable sub-campaigns

**1-2-4 + 1-2-5 + 1-2-12 — dead-code rubric + tooling + extractor backlog**

- Rubric v1 frozen (`docs/contracts/dead-code-rubric-v1.md`). R1 (Agent
  mechanical) + R2 (Human blind) annotation protocol. 68 labels across
  5 repos.
- `find_dead_code` first cut shipped for C# / Java / PHP / Python / Rust.
- Precision re-measurement (`scripts/measure/dead-code-precision.mjs`):
  harmful-claim rate 3/68 = **4.4 %** at 1-2-5, **0/61 = 0 %** after the
  1-2-12 backlog burn-down. Strict three-bucket agreement 0.618 → 0.656;
  the residual is conservative `unknown → alive` classification that is
  *by design*, not a判定 bug.
- The three harmful claims were all A3-class extractor bugs (C# same-file
  calls edges, django decorator wrapper), recorded as backlog and
  subsequently fixed in 1-2-12.

**1-2-7 + 1-2-8 — schema discipline + architecture red lines**

- `schema-evolution-and-mcp-tool-cap-v1.md` freezes the rule: every schema
  bump must be paired with a written migration clause; MCP tool count is
  capped at **≤ 12**.
- `architecture-regression-baseline-v1.md` establishes the perf baseline
  (petclinic: index 2491 ms / explore 455.5 ms) and the regression red
  lines (index ≤ 15 %, explore ≤ 20 %). Wired into `.github/workflows/ci.yml`
  as the `architecture-red-lines` job (ubuntu-only, corpus cached).

**1-2-9 — indexing-scope configuration**

- Default excludes now cover `.workbuddy/` and other agent working
  directories. No schema change; resolver-side filter.

**1-2-10 + 1-2-21 — Windows flake hardening + Rust core JSX parity**

- A 类 flake closed (feat `7eea0f9` + chore `52aa602`); extraction suite
  278/278 green on Windows. Remaining C-class limits documented.
- 1-2-21 fixed the Rust core JSX export-wrapper edge case: `backfill`
  `isBackfillNodeId` was dropping rust-core hash-id components, and the
  esm-value-token 152-line type-annotation corner case. Resolution added
  an `unresolved_refs.metadata` column and a `tsTypeAnnotation` marker.
  Tested by `load_imported_symbol_usage_refs` filtering.

**1-2-11 — explore 小项目 budget 收紧**

- Opt-in env `CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1`. Default OFF for
  dogfood. 16 new test cases; 198/198 explore suite green.

## Goal 3 — P1 High-Value Comprehension (1-3)

| Leaf | Result | Durable home |
| --- | --- | --- |
| 1-3-1 图质量门禁 | degraded < 10 on 4 corpora; drupal FK bug split into 1-3-7 | `tests/graph-quality-gate-1-3-1.test.ts` + evidence |
| 1-3-2 PR 影响分析（复用 impact/affected） | Reused existing CLI; PR-recall gate wired into CI red-lines job | `scripts/measure/pr-recall-gate.mjs` |
| 1-3-3 Spring bean/DI 语义扩展 | schema v5 zero-DDL (`bean` NodeKind + `injects` EdgeKind); `mybatisJavaXmlEdges` moved behind `CODEGRAPH_ENABLE_DATASOURCE=1` opt-in | `src/types.ts`, `src/db/migrations.ts`, `src/resolution/frameworks/java.ts`, `src/resolution/callback-synthesizer.ts` |
| 1-3-5 可视化多视图 | module / class / function layers in the single self-contained HTML | `src/visualize/` |
| 1-3-6 可视化时间演化动画 | git-history driven timeline animation | `src/visualize/` |
| 1-3-11 (1-3-7) drupal rust core FK bug fix | PHP `function_definition` start-line off-by-one when attributes are present; resolver regex updated to anchor `function` keyword | `src/indexing/rust-php-framework-routes.ts` |

**Schema v5 (zero DDL)** introduced the `bean` NodeKind and `injects`
EdgeKind. On petclinic: 4 bean nodes + 6 injects edges (Controller/Formatter
→ Repository interface). Spring-DI capability probe healthy.

## Goal 4 — P2 Optional Local Hybrid Semantic Retrieval (1-4)

**Outcome:** the async embedding pipeline was designed and shipped end to
end. The立项三问硬验收 (1-4-1) confirmed the spike was worth pursuing; the
threshold measurement (1-4-2) showed that synchronous embedding was
unusable for first-index (~18.4 min on drupal, vs ≤ 2× structural indexing
budget of ~50 s); ADR-0009 redesigned the pipeline as asynchronous; and
ADR-0010 made the heavy fastembed dependency lazy-install.

### Decision sequence

1. **1-4-1 — 立项三问硬验收.** Fixture `.tmp/embedding-probe/` confirmed
   fastembed + onnxruntime-node + sqlite-vec v0.1.9 + BGE-small-en-v1.5
   (384 d) work end to end on Node 22.
2. **1-4-2 — 量化阈值实测.** Five corpora measured. Throughput
   ~81 ms/file (ONNX inference-bound). Disk ≤ 50 % baseline on 4/5
   corpora (express 118 % fails because of fixed vec0 shadow-table
   overhead on tiny projects). Watch-mode single-file ≈ 81 ms passes
   ≤ 5 s budget. **Verdict: synchronous embedding cannot ship in the
   index main path.** Triggered ADR-0009.
3. **1-4-27 — ADR-0009 async pipeline design.** Six decisions: D1 SQLite
   same-DB queue; D2 MCP server embedded `worker_threads` lazy-start;
   D3 three trigger points (CLI / FileWatcher / read-repair) with
   `(file_path, content_hash)` PK dedup; D4 fallbackReasonTaxonomy
   extended by 6 keys with zero schema change; D5 `vec_embeddings` +
   `embedding_queue` schema; D6 drupal `T_index ≈ 51.5 s ≪ 100 s`.
4. **1-4-28 → 1-4-30 — implementation + D6 regression.** Schema v6,
   worker runtime, watcher hook, read-repair, CLI flag. D6 regression
   re-measured the three artifacts: drupal wall-clock, `pending=files`,
   81 ms-rate.
5. **1-4-31 — ADR-0010 lazy install plan.** peerDeps optional,
   `embedding install` subcommand, installer opt-in. **Decision: option B.**
6. **1-4-32 — implementation of ADR-0010 option B.** `zcodegraph
   embedding install` / `embedding status` subcommands, worker
   `resolveFastembedSpecifier` (default resolution → `.zcodegraph/models`
   `createRequire` fallback), `--with-embeddings` guided fix on install.
   Exact pin `fastembed@1.14.5` (1.14.3 has a GCS 403 download bug;
   npm `^1.14.3` resolves to 1.14.3). HF CDN 66 MB onnx intermittently
   ECONNRESET → 3-retry wrapper. Windows Node ≥ 20.12 spawnSync `.cmd`
   EINVAL → execSync with quoted path. `import('C:\…')` requires
   `pathToFileURL`.

### Durable decisions

- ADR-0009 (`docs/decisions/ZJ-0009-async-embedding-pipeline.md`) — the
  six async-pipeline decisions.
- ADR-0010 (`docs/decisions/ZJ-0010-fastembed-lazy-install.md`) — option B
  lazy-install shape.

### Durable evidence

- `research/archive/evidence/2026-10-26-p2-embedding-three-questions-gate.md`
- `research/archive/evidence/2026-10-26-p2-embedding-thresholds.{md,json}`
- `research/archive/evidence/2026-10-26-p2-async-embedding-hard-floor.md`
- `research/archive/evidence/2026-10-26-p2-async-embedding-runtime.md`
- `research/archive/evidence/2026-10-26-p2-async-embedding-d6-regression.md`

## Cross-Cutting Artifacts

| Artifact | Where |
| --- | --- |
| Rust-hybrid contract (21 rust-owned languages) | `src/indexing/rust-hybrid-contract.ts` |
| Skip-debt guardrail (empty allowlist) | `tests/skip-debt-guardrail.test.ts` |
| CI workflow | `.github/workflows/ci.yml` (architecture-red-lines job, PR-recall gate, D6 regression) |
| Measure scripts | `scripts/measure/` |
| Schema migrations | `src/db/migrations.ts` (v4 → v5 → v6) |

## What This Closeout Does NOT Cover

- The roadmap's *implementation* work itself. Each leaf's code change is
  in git history under `feat(<node>):` or `chore(<node>):` commits. This
  ledger is a navigation artifact, not a changelog.
- The two build scripts (`build_roadmap.py`, `build_edges_decisions.py`).
  They were process-only helpers used to regenerate the SoT; their
  content is preserved in git history at
  `docs/plans/build_{roadmap,edges_decisions}.py`.
- Open follow-ups from this campaign (e.g. extractor backlog residuals,
  C-class Windows limits). Those are tracked separately as their own
  roadmap nodes or backlog issues.

## Lifecycle Note

This closeout follows the ADR ZJ-0005 lifecycle: process material →
durable extraction → authority audit → retirement → deletion proposal →
Human confirmation → deletion. The four process files
(`docs/plans/build_edges_decisions.py`, `docs/plans/build_roadmap.py`,
`docs/plans/capability-harvest-roadmap.json`,
`docs/plans/capability-harvest-roadmap.md`) are removed by `git rm` in the
same change that authors this ledger. The decision tree remains reachable
in git history.

The 2026-10-28 docs-decoupling governance pass moved this ledger from
`docs/ledgers/` to `research/archive/ledgers/` as part of the broader
evidence/ledger lifecycle migration.
