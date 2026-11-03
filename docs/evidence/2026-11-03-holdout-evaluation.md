# 1-3-3 冻结留出集验收报告

**日期**: 2026-11-03
**节点**: 1-3-3（在多语言和大规模真实语料上同时通过效果与资源门）
**Scope**: Acceptance/evaluation（只验收，不改 src/，不集成 CLI/MCP）
**标签**: `docs/baselines/semantic-retrieval-human-frozen-v1.json`（reviewer=victo, reviewedAt=2026-11-03T11:58:17+08:00）
**结论**: **NO-GO**

---

## 1. 评测设置

| 维度 | 值 |
|------|-----|
| 评测 split | 冻结 holdout（16 题：flask 2 + express 2 + eShopOnWeb 整仓 12） |
| 推荐臂 | `pure-fts`（1-3-2 dev 推荐配置：FTS5 symbol search, limit=100, uniqueFiles） |
| 对照臂 | `existing-explore`（现有 `plan(cg, query, { maxFiles: 10 })`） |
| 重复 | 每臂每查询 1 次冷跑 + 3 次热跑 |
| 验收门 | 节点 1-3-3 decision 中的效果/延迟/资源门 |

---

## 2. 效果门

### 2.1 Macro 指标（16 题）

| 指标 | pure-fts | existing-explore | 门槛 | 判定 |
|------|----------|------------------|------|------|
| MRR | **0.3006** | 0.2953 | ≥ 0.70 | ❌ 失败（差 0.40） |
| Hit@1 | 0.1875 | 0.125 | — | — |
| Hit@5 | **0.375** | **0.5625** | ≥ explore + 5pp | ❌ 失败（**低 18.75pp**） |
| Hit@10 | 0.6875 | 0.75 | — | — |
| Misses | 5 | 4 | — | — |

### 2.2 每仓指标（pure-fts）

| Corpus | Hit@5 | Hit@5 ≥ 90% | Hit@10 | Hit@10 ≥ 95% |
|--------|-------|-------------|--------|---------------|
| pallets-flask | **0.0** | ❌ | 1.0 | ✅ |
| expressjs-express | 1.0 | ✅ | 1.0 | ✅ |
| dotnet-architecture-eShopOnWeb | **0.333** | ❌ | **0.583** | ❌ |

**关键观察**：
- **flask holdout 2 题 pure-fts Hit@5=0**——dev 集上 pure-fts 在 flask 表现优异（Hit@10=0.9091  macro），但 holdout 上完全失败。这是 dev 集过拟合的直接证据。
- **eShopOnWeb 整仓留出** pure-fts 仅 33% Hit@5 / 58% Hit@10，是最大失分点。
- **pure-fts 在 holdout 上输给了 existing-explore**（Hit@5 0.375 vs 0.5625，差 -18.75pp），与 1-3-2 dev 集上 pure-fts 全面领先的结论**完全相反**。

### 2.3 失败题目分类

**pure-fts misses（5 题，全部 eShopOnWeb）**：
- eshop-picture-url-composition
- eshop-catalog-filter-pagination
- eshop-catalog-create-duplicate-guard
- eshop-json-http-error-feedback
- eshop-empty-basket-checkout-exception

**existing-explore misses（4 题）**：
- flask-holdout-request-lifetime
- eshop-basket-add-or-increment
- eshop-picture-url-composition
- eshop-catalog-filter-pagination

两臂共同 miss 2 题（eshop-picture-url-composition、eshop-catalog-filter-pagination），说明 eShopOnWeb 仓的 C# 大型分层应用对当前检索策略是根本性挑战。

---

## 3. 延迟门（pure-fts）

| 指标 | 实测 | 门槛 | 判定 |
|------|------|------|------|
| 热 p50 | 10.31 ms | ≤ 150 ms | ✅ |
| 热 p95 | 12.72 ms | ≤ 250 ms | ✅ |
| 冷启动 | 11.29 ms | ≤ 2000 ms | ✅ |
| 大仓（eShopOnWeb）p95 | 12.76 ms | ≤ 500 ms | ✅ |

延迟门**全部通过**，且远低于阈值——pure-fts 不走 ONNX 推理，只是 SQLite FTS5 查询。

---

## 4. 资源门

| 指标 | 实测 | 门槛 | 判定 |
|------|------|------|------|
| 峰值 RSS | 170.4 MB | ≤ 768 MiB | ✅ |
| 稳态增量 RSS | 107.8 MB | ≤ 512 MiB | ✅ |

资源门**全部通过**。

---

## 5. GO/NO-GO 判定

**结论：NO-GO**

10 项门中：
- ❌ **效果门 4 项全失败**（per-corpus Hit@5、per-corpus Hit@10、macro MRR、macro Hit@5 vs explore）
- ✅ 延迟门 4 项全通过
- ✅ 资源门 2 项全通过

按节点 decision：「任何门失败均不集成」。

---

## 6. 根因分析

### 6.1 dev 与 holdout 的严重倒挂

| 指标 | dev (44 题) | holdout (16 题) | 差 |
|------|-------------|-----------------|-----|
| pure-fts MRR | 0.5291 | 0.3006 | -0.229 |
| pure-fts Hit@5 | 0.7955 | 0.375 | -0.42 |
| pure-fts Hit@10 | 0.9091 | 0.6875 | -0.22 |

**根因**：1-3-2 的 dev 集上 pure-fts 击败所有融合臂，是因为 dev 查询直接命中符号名/文件内容关键词。但 holdout 查询——尤其是 eShopOnWeb 整仓的 C# 业务逻辑题——需要语义理解而非精确字符串匹配。

### 6.2 eShopOnWeb 的结构性挑战

eShopOnWeb 是 5 仓中唯一的：
- **C# / ASP.NET** 项目（其他 4 仓是 Python/JS/Java/Rust）
- **整仓 holdout**（其他仓只留出 2 题）
- **业务密集**（Blazor 管理界面 + 分层架构 + DDD 命名）

file-level embedding 对 C# 大型业务文件的语义捕捉力不足；FTS5 对"如何给用户展示订单历史"类问题找不到精确关键词时全面崩溃。

### 6.3 与 1-3-2 推荐配置的冲突

1-3-2 在 dev 集上推荐 pure-fts，理由是"MRR 最高、延迟最低"。但同一配置在 holdout 上：
- MRR 0.30（门槛 0.70）
- Hit@5 比 explore 低 18.75pp（门槛要求高 5pp）

这说明 1-3-2 的 dev 集**不足以代表真实分布**——dev 集上没有 eShopOnWeb 这种类型的查询，导致推荐配置在 holdout 上失效。

---

## 7. 下一步建议

按 1-3-3 节点 decision，本轮不集成。可选路径：

1. **回到 1-3-2 重选** — 把 eShopOnWeb 加入 dev 集重新跑候选网格（但 holdout 已被看过，再调参会污染）。
2. **承认当前 file-level + FTS5 路线的天花板** — 效果门 0.70 MRR 对此路线不可达，需要 chunk-level 或 symbol-level 表示。
3. **接受 NO-GO 作为终态结论** — 报告 pure-fts 在 holdout 上的真实表现，明确"在冻结留出集上不达标"这一事实，留待项目层决定是否继续投入语义检索方向。

---

## 8. 产物清单

- 报告：`docs/evidence/2026-11-03-holdout-evaluation.{md,json}`
- 评测脚本：`scripts/measure/holdout-gate.mjs`
- eShopOnWeb 向量就绪证据：`.tmp/measure/embedding-thresholds-eshoponweb.json`（276 文件、275 嵌入、27.1s、磁盘增量 0.2%）
