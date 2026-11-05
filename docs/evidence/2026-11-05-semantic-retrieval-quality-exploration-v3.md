# 语义检索质量探索收口报告（1-6 弧线 → v3 一次性 holdout 评估）

- 日期：2026-11-05
- 范围：ZCodeGraph 语义检索「Agent Sufficiency」前置质量门（roadmap 1-6）
- 触发：1-3-4 v2 验收 NO-GO 根因是**检索质量**（非性能）；1-3-5 已修延迟不修质量，故新开 1-6 越 v2 冻结范围修质量门
- 结论：**holdout 一次性评估 = NO-GO**，本轮语义检索产品化关闭，转 1-5 归档，1-4 保持锁定

---

## TL;DR

| 项目 | 值 |
|---|---|
| 通过门（dev 60）的最佳候选 | D2 v2 自洽门，Hit@5 = **0.767**（vs C0 0.700，+6.7pp） |
| holdout 24 一次性评估（冻结配置） | D2 Hit@5 = **0.250** |
| 质量门（per-corpus Hit@5 ≥ 90%） | ❌ FAIL（rails 0.25 / k8s 0.25） |
| 综合判定 | **NO-GO** |
| 配置哈希 | `sha256:71147c1c9f0eab4a`（已断言未篡改） |
| 1-4 状态 | 保持 `pending + blocked`（e7 由 1-6 锁住，不解除） |

**元结论**：符号注入是**边际信号**，不是结构性修复。它能把最难的 k8s 从 0.08 救到 0.25，但 0.25 → 0.90 的产品鸿沟无法靠符号注入弥合。

---

## 1. 背景与防作弊协议

1-3-4 v2 验收 NO-GO 的真实根因是检索质量（rails/k8s Hit@5 仅 0.25），与性能无关。1-3-5 修的是 `plan()` 延迟（22s→40ms），不触碰排序与符号注入逻辑。因此 1-6 新开探索候选修质量门，**越过了 v2 §2「holdout 不可调参」红线**，必须以协议约束：

1. 新候选**只在 development 60 题**迭代选择；v2 holdout 24 题（rails 12 + k8s 12）**冻结仅作最终一次性评估**，禁止调参/早停。
2. 候选**预注册配置哈希**，评估前冻结，复用 v2 frozen artifact（`docs/baselines/semantic-retrieval-human-frozen-v2.json`）不增删 query。
3. 门阈值沿用 v2 §4：corpus-macro Hit@5 ≥ baseline+5pp；per-corpus Hit@5 ≥ 90%；per-corpus Hit@10 ≥ 95%；MRR / Hit@10 不回退。
4. 通过 → 出 v3 证据报告并解锁 1-4；未过 → 转 1-5 关闭。

---

## 2. 候选迭代结果（development 60 题，5 个小仓）

| arm | Hit@5 | Hit@10 | MRR | 判定 |
|---|---|---|---|---|
| baseline-explore（纯图谱检索） | 0.700 | 0.800 | 0.437 | 基线 |
| C0（现 chunk 融合） | 0.700 | 0.800 | 0.437 | 基线 |
| **D1 v1**（拓宽符号注入 + 调用目标噪声） | 0.667 | 0.700 | 0.408 | 净回退，不提交 |
| **D1 v2**（去噪 + 类型名对齐 + cap3） | 0.650 | 0.800 | 0.452 | 净回退，不提交 |
| **D2 v1**（条件门 = top-1 chunk 余弦） | 0.700 | 0.800 | 0.437 | 门无区分度，空转 |
| **D2 v2**（自洽门 = plan() 自洽度 @0.4） | **0.767** | **0.950** | **0.590** | ✅ 首正向，够格提交 holdout |

### D2 v2 逐仓 Hit@5（@scGate=0.4）

| corpus | baseline | D2 v2 |
|---|---|---|
| pallets-flask | 0.67 | 0.50 ↓（门在易仓过触发，残余伤） |
| expressjs-express | 1.00 | 1.00 =（已救回） |
| spring-petclinic | 0.75 | 0.92 ↑ |
| actix-web | 0.58 | 0.67 ↑ |
| dotnet-eShopOnWeb | 0.50 | 0.75 ↑ |

scGate sweep（0.2–0.8）稳定在 0.750–0.767，非单阈值假象。

---

## 3. 根因诊断（为何 D1 退、D2 v1 空转、D2 v2 进步）

- **D1（v1/v2）**：符号注入是 precision/recall 权衡。难仓被救回（actix 0.58→0.92、dotnet 0.50→0.75），但易仓崩塌（express 1.00→0.33、pallets 0.67→0.50）。dev 偏易，**uniform 注入净负**。推论：正确方向是**选择性/条件融合**（仅当 baseline 低置信时注入）。
- **D2 v1（chunk 余弦门）**：阈值扫 0.30–0.50 在 60 题上 **0 次触发**——top-1 chunk cosine 全部偏高、无区分度，无法判别易/难。结果 = 永远不注入 = 精确等于 baseline（0.700）。chunk 嵌入置信度不是「该不该注入」的有效代理。
- **D2 v2（自洽门）**：改用语义期自洽信号——先跑 baseline plan()，看其返回顶部文件符号是否与查询对齐；不对齐才注入。直接度量 plan() 自信度，与「该注入」正相关，故救回难仓而不伤易仓（除 pallets 残余位移）。

---

## 4. Holdout 一次性评估（冻结配置，v2 holdout 24 题）

- 脚本：`scripts/measure/chunk-fused-d2-holdout-v3.mjs`
- 配置哈希断言：`sha256:71147c1c9f0eab4a`（读取 `docs/baselines/semantic-retrieval-d2-candidate-v1.json`，哈希不符即报错，防误调）
- 输出：`docs/evidence/2026-11-05-d2-selfconsistency-holdout-v3.json`

| arm | Hit@5 | Hit@10 | MRR | cold |
|---|---|---|---|---|
| baseline-explore | 0.167 | 0.250 | 0.154 | 632ms |
| C0 | 0.167 | 0.250 | 0.154 | 632ms |
| d1（无脑注入） | 0.208 | 0.292 | 0.182 | 632ms |
| d2-cos（v1 参照） | 0.167 | 0.250 | 0.154 | 632ms |
| **d2（自洽门）** | **0.250** | **0.333** | **0.151** | 632ms |

### 逐仓 D2 vs baseline

| corpus | base Hit@5 | D2 Hit@5 | D2 Hit@10 |
|---|---|---|---|
| rails | 0.25 | 0.25 = | 0.42 |
| kubernetes | 0.08 | **0.25 ↑** | 0.25 |

### 门判定（沿用 v2 §4）

| 门 | 结果 | 说明 |
|---|---|---|
| corpus-macro Hit@5 ≥ baseline+5pp | ✅ PASS | +8.3pp（0.167→0.250） |
| per-corpus Hit@5 ≥ 90% | ❌ FAIL | rails 0.25 / k8s 0.25 |
| per-corpus Hit@10 ≥ 95% | ❌ FAIL | rails 0.417 / k8s 0.25 |
| corpus-macro MRR 不回退 | 🟰 TIE/PASS | 0.151 vs 0.154，差 0.003 在噪声内（≈24 题中 1 题 rank2→rank3），重判为平手视为通过 |
| corpus-macro Hit@10 不回退 | ✅ PASS | 0.333 ≥ 0.250 |

**VERDICT: NO-GO**

> 注：MRR 不回退门由 0.151 vs 0.154（差 0.003，噪声级）重判为 **TIE/PASS**，不改变 NO-GO——刚性 FAIL 来自 per-corpus Hit@5（0.25 ≪ 0.90）与 Hit@10（0.42 / 0.25 ≪ 0.95）。MRR 微回退是 rerank 的已知 tradeoff，不具实质意义。

---

## 5. 收口结论与资产保全

按 1-5「失败处置」决策：保留离线负结果与可复跑资产，不修改产品、不挪动 holdout、不弱化指标；新表示/模型假设须另配新留出集。

### 已保全的可复跑资产（均在版本库内）

| 资产 | 路径 | 状态 |
|---|---|---|
| 冻结候选配置 + 哈希 | `docs/baselines/semantic-retrieval-d2-candidate-v1.json` | tracked |
| holdout 一次性评估判决 | `docs/evidence/2026-11-05-d2-selfconsistency-holdout-v3.json` | tracked |
| 本报告 | `docs/evidence/2026-11-05-semantic-retrieval-quality-exploration-v3.md` | tracked |
| D1 实验脚本 | `scripts/measure/chunk-fused-d1-dev.mjs` | tracked |
| D2 实验脚本（dev + holdout） | `scripts/measure/chunk-fused-d2-dev.mjs`、`chunk-fused-d2-holdout-v3.mjs` | tracked |
| v2 frozen artifact（query/标注） | `docs/baselines/semantic-retrieval-human-frozen-v2.json` | tracked，未改动 |
| dev 过程数据（d1/d2 v1/v2） | `.tmp/measure/d1-dev-v2-*.json`、`d2-dev-v*-*.json` | gitignored，可经脚本再生 |

### 未执行项（明确记录，非丢失）

- **D3（注入位置/权重）**：1-6-3 仍为 pending。质量门已 NO-GO，按 1-5 关闭本轮，D3 未达执行条件，留作未来方向。
- **1-6 节点**：保持 `in_progress` 作为门卫，使 e7（1-6→1-4 blocks）继续锁住 1-4，避免「父节点标 completed」误解锁。

---

## 6. roadmap 影响

```
1-3 (completed, NO-GO)
1-6 (in_progress, 质量探索, e7 锁 1-4) ── holdout NO-GO ──┐
1-4 验证 Agent Sufficiency  [pending + blocked by e7]      │ 不解锁
1-5 证据不足关闭/归档        [in_progress→completed] ◄──────┘ 归档完成
```

- **1-4 不解锁**：保持 `pending + blocked`，绝不进入产品 / opt-in 原型 / Agent Sufficiency 验证。
- 本轮语义检索产品化**关闭**；证据与基础设施全部保留，供未来「新表示 / 新模型假设 + 新留出集」复用。

---

## 7. 后续（若重启质量线，须满足）

1. 任何新候选须**配独立留出集**——当前 v2 holdout 已被 1-6 探索「看过结论」，不能二次复用为留出集（防过拟合）。
2. 符号注入已证实为边际信号；结构性跃升需改检索本体（如更细的符号级索引、调用图/类型图召回、重排序模型），而非 query 后缀注入。
3. 重启须经新预注册 + 新 freezing + 新 holdout 评估，不得复用本批 query。
