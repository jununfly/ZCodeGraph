# 1-3-3-1 chunk-explore 融合完整门验收报告

**日期**: 2026-11-03
**节点**: 1-3-3-1（在冻结 holdout 上跑 chunk-explore 融合完整门验收）
**Scope**: Acceptance/evaluation（不改 src/）
**结论**: **NO-GO（当时脚本的 10 项门 9 项通过，仅汇总 MRR 未达）**

> **2026-11-03 证据边界（ADR-0013）**：本报告保留当时的测量结果，但不是独立产品验收。16 题已参与 V3 修复和路线决策，现仅作诊断/回归集。下文“macro”实际为按题汇总的微平均，eShopOnWeb 权重为 12/16；当时脚本也未检查单仓相对 baseline 的回退。报告未覆盖精确名、至少 10,000 文件的大仓、存储/索引、降级与 freshness 等完整安全门。后续只能按 v2 协议在新冻结留出集上晋级。

---

## 1. 评测设置

| 维度 | 值 |
|------|-----|
| 标签 | `docs/baselines/semantic-retrieval-human-frozen-v1.json`（16 题 holdout） |
| 推荐臂 | `chunk-fused-explore`：plan(cg, augmentedQuery)，augmentedQuery = 原查询 + chunk-vec top-K 符号名 |
| 对照臂 | `baseline-explore`：plan(cg, query) |
| chunk 索引 | 函数/方法级，flask 1446 + express 42 + eShopOnWeb 312 chunks |
| 注入策略 | top-8 chunks → PascalCase 优先，≤5 个符号名 |
| 验收门 | 1-3-3 节点 decision 的完整 10 项门 |

---

## 2. 效果门

### 2.1 Macro 指标（16 题）

| 指标 | baseline-explore | chunk-fused-explore | 门 | 判定 |
|------|------------------|---------------------|-----|------|
| **Hit@1** | 0.125 | **0.3125** | — | — |
| **Hit@5** | 0.5625 | **0.9375** | — | — |
| **Hit@10** | 0.75 | **1.0** | — | — |
| **MRR** | 0.2992 | **0.5490** | ≥ 0.70 | ❌ |
| **Hit@5 增量** | — | **+37.5pp** | ≥ +5pp | ✅ 大幅超门 |
| **misses** | 3 | **0** | — | — |

### 2.2 每仓指标（chunk-fused-explore）

| Corpus | Hit@5 | Hit@5 ≥ 90% | Hit@10 | Hit@10 ≥ 95% |
|--------|-------|-------------|--------|---------------|
| pallets-flask | 1.0 | ✅ | 1.0 | ✅ |
| expressjs-express | 1.0 | ✅ | 1.0 | ✅ |
| dotnet-architecture-eShopOnWeb | **0.9167** | ✅ | **1.0** | ✅ |

**全部 6 项 per-corpus 指标通过**——包括 1-3-3 中失败的 eShopOnWeb 整仓。

### 2.3 逐题 rank 分布（chunk-fused-explore）

| 题 | rank | rank |
|----|------|------|
| flask-holdout-env-debug-cli | 1 | eshop-order-from-basket | 3 |
| flask-holdout-request-lifetime | 1 | eshop-picture-url-composition | 4 |
| express-holdout-nested-query-parser | 1 | eshop-catalog-filter-pagination | 2 |
| express-holdout-secure-forwarded-protocol | 4 | eshop-catalog-list-endpoint | 2 |
| eshop-basket-add-or-increment | 3 | eshop-catalog-create-duplicate-guard | 4 |
| eshop-basket-service-load-or-create | 5 | eshop-browser-cache-expiry | 1 |
| eshop-basket-anonymous-transfer | 6 | eshop-cache-invalidate-after-mutation | 2 |
| eshop-json-http-error-feedback | 2 | eshop-empty-basket-checkout-exception | 1 |

仅 1 题（eshop-basket-anonymous-transfer）rank=6 落在 Hit@5 之外。

---

## 3. 延迟门（chunk-fused-explore）

| 指标 | 实测 | 门 | 判定 |
|------|------|-----|------|
| 热 p50 | 91.89 ms | ≤ 150 ms | ✅ |
| 热 p95 | 106.52 ms | ≤ 250 ms | ✅ |
| 冷启动 | 91.54 ms | ≤ 2000 ms | ✅ |
| 大仓（eShopOnWeb）p95 | 106.52 ms | ≤ 500 ms | ✅ |

延迟门全通过，但比 baseline-explore（median 55.36ms）慢约 65%——chunk-vec 检索 + 符号注入增加了开销。

---

## 4. 资源门

| 指标 | 实测 | 门 | 判定 |
|------|------|-----|------|
| 峰值 RSS | 486.5 MB | ≤ 768 MiB | ✅ |
| 稳态增量 RSS | 264.6 MB | ≤ 512 MiB | ✅ |

资源门全通过，但显著高于 1-3-3 pure-fts 的 170.4 MB——fastembed ONNX 模型常驻 + chunk 索引内存占用。

---

## 5. GO/NO-GO 判定

**结论：NO-GO（10 项门 9 项通过）**

| 维度 | 通过 | 失败 |
|------|------|------|
| 效果门 | 3/4 | macro MRR 0.549 < 0.70 |
| 延迟门 | 4/4 | — |
| 资源门 | 2/2 | — |
| **合计** | **9/10** | **1/10** |

按 1-3-3 节点 decision「任何门失败均不集成」，NO-GO。

---

## 6. 关键分析

### 6.1 MRR 未达根因

MRR = 平均倒数排名。chunk-fused-explore 的 Hit@1 仅 0.3125（5/16 题 rank=1），意味着大多数正确答案排在 2-4 位而非第 1 位。

分布：
- rank=1：5 题（31.25%）
- rank=2-4：9 题（56.25%）
- rank=5-6：2 题（12.5%）

要把 MRR 推到 0.70，需要多个非首位的正确答案前移，而不只是增加 Hit@5。当前 Hit@1=0.3125（5/16）。**此前“只差 3 题”的表述不成立**：实际有 4 个 rank 2 题；即使把它们全部移到 rank 1，MRR 也仅从 0.548958 增至 0.673958，仍未达 0.70。

**改进方向**（不在本节点范围）：
- 注入符号的优先级排序（当前 PascalCase 优先 + 长度过滤是启发式）
- 用 chunk score 加权注入顺序
- 融合阶段引入重排（rerank）而非仅靠 explore 排序

### 6.2 与 1-3-3 pure-fts NO-GO 的对比

| 指标 | 1-3-3 pure-fts | 1-3-3-1 chunk-fused-explore | 改善 |
|------|----------------|------------------------------|------|
| macro MRR | 0.3006 | **0.5490** | +82.6% |
| macro Hit@5 | 0.375 | **0.9375** | +150% |
| macro Hit@10 | 0.6875 | **1.0** | +45.5% |
| per-corpus 全过 | ❌ 0/3 仓 | ✅ 3/3 仓 | — |
| misses | 5 | **0** | -100% |
| 热 p50 | 10.31 ms | 91.89 ms | 慢 8.9× |
| 峰值 RSS | 170.4 MB | 486.5 MB | 大 2.85× |

**chunk-fused-explore 在效果上大幅超越 1-3-3 pure-fts，仅 macro MRR 单门未达**。代价是延迟与资源消耗上升，但均远低于阈值。

### 6.3 与 baseline-explore 的对比

chunk-fused-explore 在 Hit@5 上比 baseline-explore 高 37.5pp（门要求 ≥5pp），证明 chunk-vec 召回增强确实有效。baseline 的 3 个 miss 题（flask-holdout-request-lifetime、eshop-picture-url-composition、eshop-catalog-filter-pagination）全部被 fused 修复。

---

## 7. 后续决策（由 ADR-0013 取代原始三选一建议）

1. 不按 0.5490 的结果倒推并降低 MRR 门，也不把“9/10”解释为接近产品级。
2. 只允许一次单假设、至多 3 个新候选的确定性结构感知文件重排实验；候选在 development 上选择，固定 chunk 与注入参数。
3. 本报告 16 题只作诊断/回归。新冻结留出集采用仓级等权宏平均，要求 Hit@5 相对 current Explore 提升至少 5pp，MRR/Hit@10 不回退，并补齐所有安全门。
4. 离线 GO 后另行审批只读 opt-in 原型，再由配对 Agent Sufficiency 实验证明恢复性 Read/Grep 减少且正确性不回退。失败关闭本轮产品化，而非永久禁止新表示/模型假设。

详见 `../decisions/ZJ-0013-bounded-reranking-and-independent-agent-value-gate.md` 与 `../methods/semantic-retrieval-evaluation-v2.md`。

---

## 8. 产物清单

- 报告：`docs/evidence/2026-11-03-chunk-fused-holdout.{md,json}`
- 脚本：`scripts/measure/chunk-fused-holdout-gate.mjs`
- chunk 索引：`.tmp/chunk-explore-fusion/{pallets-flask,expressjs-express,dotnet-architecture-eShopOnWeb}.chunks.json`
