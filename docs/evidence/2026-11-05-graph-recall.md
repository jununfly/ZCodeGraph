# 1-7-2 调用图/类型召回 — dev + v3 holdout 证据

- 日期：2026-11-05
- Roadmap 节点：`1-7-2`（调用图/类型召回）
- 事实源：`docs/plans/semantic-retrieval-roadmap.json`
- 候选配置：`docs/baselines/semantic-retrieval-symbol-graph-candidate-v1.json`
  - sha256 = `dc73fb7dbefb5a2832a4741b8268bc2bb3d6cceada53b86227ee52f6017ae782`（holdout 运行前断言 OK，未篡改）
- 脚本：`scripts/measure/graph-recall-dev.mjs`、`scripts/measure/graph-fused-holdout-v3.mjs`
- 原始 JSON：`docs/evidence/2026-11-05-graph-{recall-dev,fused-holdout-v3}.json`

## 1. 设计

1-7-1 的符号 FTS5 召回比现 plan() 的 name 种子更宽。1-7-2 新意：从**专用符号 FTS5 召回的更宽符号集**（bm25 top-K）出发，遍历 callers(1)+callees(1)+getTypeHierarchy 边，拉取**即便不在初始 subgraph** 的邻居文件，作为第三源并入候选。

- 实现：给符号索引加 `node_id` 列，recall 返回 id；core 新增 `graphExpand(cg, topSymIds, topK)`、`rankGraphFiles`、`mergedRerank`（三源 0.4/0.4/0.2）。
- 边覆盖现实：rails 有 calls/extends/implements；k8s(Go) 仅 calls+instantiates（结构化接口，图≈调用图）；actix 有 calls/references/decorates。
- Arms：A baseline、C(baseline∪symbol，取自 1-7-1)、G1(baseline∪symbol∪graph 三源)、诊断 graphOnly(纯图召回)。

## 2. 协议（防作弊）

- dev：60 题迭代、不哈希断言。
- holdout：v3 frozen 24 题一次性，先断言候选哈希、禁调参/早停。
- 门沿用 v2 §4 / 1-7 exit criteria。

## 3. Dev 结果（60 题）

- G1 与 C 持平（≈0.733）；graphOnly=0.617 差于 baseline(0.700)。dev 上图为 wash。

## 4. Holdout 结果（v3 24 题，一次性）

| arm | Hit@5 | Hit@10 | MRR |
|---|---|---|---|
| baseline-explore (A) | 0.167 | 0.250 | 0.154 |
| symbol-union-plan (C) | **0.458** | 0.500 | 0.299 |
| symbol-graph-union (G1) | 0.417 | 0.458 | 0.278 |

逐仓 Hit@5：

| corpus | A | C | G1 |
|---|---|---|---|
| rails | 0.25 | **0.50** | 0.417（退） |
| kubernetes | 0.08 | **0.42** | 0.417（平） |

门判定：

- g1MacroHit5Plus5pp：PASS（Δ +0.250）
- mrrNoRegression：PASS（Δ +0.125）
- hit10NoRegression：PASS（Δ +0.208）
- perCorpusHit5At90：**FAIL**（rails 0.417 / k8s 0.417）
- perCorpusHit10At95：**FAIL**

**VERDICT: NO-GO**

## 5. 结论

图增强在干净硬集**未补 k8s 缺口**（仍 0.42）且**拖累 rails**（0.50→0.42）。图邻居文件平均 +13~14/query，只稀释符号召回的位置权重、无增量信号。dev 上 G1 与 C 持平、graphOnly 差于 baseline，同样 wash。

综合 1-7-1+1-7-2：符号级+图级这类**检索本体**改动在 holdout 封顶 k8s0.42/rails0.50，过不了 per-corpus 90% 硬门；剩余缺口在候选集内语义重排，指向 1-7-3。

## 6. 复现

```bash
node scripts/measure/graph-recall-dev.mjs --out docs/evidence/2026-11-05-graph-recall-dev.json
node scripts/measure/graph-fused-holdout-v3.mjs --out docs/evidence/2026-11-05-graph-fused-holdout-v3.json
```
