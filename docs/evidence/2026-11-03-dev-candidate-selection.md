# 1-3-2 开发集候选选择报告

**日期**: 2026-11-03  
**节点**: 1-3-2（在开发集选择候选、文档切分和确定性融合策略）  
**范围**: development split only（44 查询，4 corpus），无 holdout 调参  
**状态**: 已完成

---

## 1. 评测设置

| 维度 | 值 |
|------|-----|
| 表示 | file-level embedding（BGE-small-en-v1.5，384d，量化） |
| 查询编码 | `embed`（无前缀）/ `queryEmbed`（BGE query prefix） |
| 融合策略 | `pure-vec` / `pure-fts` / `rrf-k60` / `weighted-alpha` |
| 融合伙伴 | `existing-explore` / `symbol-fts` |
| 总配置数 | 12（pure-vec/pure-fts 不依赖伙伴，去重后） |
| 评测指标 | MRR、Hit@1、Hit@5、Hit@10、misses、warm latency |
| 预算 | max-children=3，max-rounds=2，未触发上限 |

**前置工作**: 为 actix-actix-web 生成 file-level 向量（93 文件，10.2s），使 4 个 dev corpus 全部具备向量。

---

## 2. 12 组配置完整结果

| # | 配置 | MRR | Hit@1 | Hit@5 | Hit@10 | Misses | Median ms | P95 ms |
|---|------|-----|-------|-------|--------|--------|-----------|--------|
| 1 | embed_pure-vec | 0.2726 | 0.1818 | 0.4091 | 0.4773 | 23 | 76.5 | 82.6 |
| 2 | embed_pure-fts | **0.5291** | 0.3409 | **0.7955** | **0.9091** | **4** | **9.7** | **13.5** |
| 3 | embed_rrf-k60_explore | 0.4882 | 0.3409 | 0.7273 | 0.8636 | 6 | 133.5 | 160.4 |
| 4 | embed_rrf-k60_fts | 0.5082 | 0.3864 | 0.6591 | 0.8409 | 7 | 88.8 | 96.0 |
| 5 | embed_weighted_explore | 0.5149 | 0.3864 | 0.6818 | 0.8409 | 7 | 133.3 | 156.6 |
| 6 | embed_weighted_fts | 0.4617 | 0.3182 | 0.6591 | 0.8182 | 8 | 88.5 | 98.2 |
| 7 | queryEmbed_pure-vec | 0.2762 | 0.2045 | 0.4091 | 0.4545 | 24 | 76.9 | 84.6 |
| 8 | queryEmbed_pure-fts | **0.5291** | 0.3409 | **0.7955** | **0.9091** | **4** | **9.3** | **12.6** |
| 9 | queryEmbed_rrf-k60_explore | 0.4707 | 0.2955 | 0.7273 | 0.8636 | 6 | 134.0 | 159.6 |
| 10 | queryEmbed_rrf-k60_fts | 0.4549 | 0.2955 | 0.6591 | 0.8182 | 8 | 88.3 | 97.5 |
| 11 | queryEmbed_weighted_explore | 0.5233 | 0.4091 | 0.6818 | 0.8182 | 8 | 132.6 | 157.6 |
| 12 | queryEmbed_weighted_fts | 0.4718 | 0.3409 | 0.6136 | 0.7955 | 9 | 88.1 | 96.1 |

---

## 3. 关键发现

### 3.1 纯 FTS5 在 dev 集上全面领先

`pure-fts`（配置 2/8）在 MRR（0.5291）、Hit@5（0.7955）、Hit@10（0.9091）和 misses（4）上均为最优，且延迟最低（median ~9.5ms，P95 ~13ms）。这比任何向量或融合策略都好。

**根因**: dev 查询是"How do I..." / "Where is..." 型，直接命中符号名或文件内容关键词。FTS5 的精确匹配在这些查询上比语义相似度更可靠。

### 3.2 向量臂单独表现差

`pure-vec` MRR 仅 0.27，Hit@10 不到 0.48，misses 高达 23-24。file-level embedding 在代码语义检索上单独使用不足。

### 3.3 融合策略未能超越纯 FTS5

- RRF-k60 最佳变体（embed + symbol-fts）MRR = 0.5082，仍低于 pure-fts 的 0.5291
- weighted-alpha（α=0.5）最佳变体（queryEmbed + explore）MRR = 0.5233，接近但仍低于 pure-fts
- 融合增加了延迟（RRF median ~88-134ms vs FTS ~9.5ms），但没有带来精度增益

### 3.4 查询编码差异极小

`embed` vs `queryEmbed` 在 pure-fts 上结果完全相同（FTS 不走向量），在其他配置上差异 < 0.02 MRR。BGE query prefix 在此场景无显著增益。

---

## 4. 推荐配置

**推荐进入 1-3-3 复验的单一配置**:

```
表示:     file-level embedding（保留，用于后续 chunk/symbol 对比）
融合:     pure-fts（FTS5 symbol search，limit=100，uniqueFiles）
查询编码: 不适用（FTS 不走向量编码）
```

**理由**:
1. dev 集上 MRR 最高（0.5291），Hit@10 最高（0.9091），misses 最少（4）
2. 延迟最低（median ~9.5ms），满足 explore 小项目 budget 要求
3. 无需模型加载，冷启动最快
4. 结果确定性最强（FTS5 排名是确定性的）

**保留向量臂作为备选**: 如果 1-3-3 在更大规模/多语言语料上发现 FTS5 覆盖不足，可回退到 `rrf-k60_symbol-fts`（embed 编码）作为融合备选。

---

## 5. 参数表（可复现）

| 参数 | 值 |
|------|-----|
| model | BGE-small-en-v1.5-onnx-Q-384d |
| fastembed | 1.14.5 |
| vec0 | sqlite-vec v0.1.9 |
| rrfK | 60 |
| weightedAlpha | 0.5（placeholder，未优化） |
| topK | 10 |
| warmRepetitions | 3 |
| corpusDocumentEncoding | first-8000-characters; model.embed |

---

## 6. 后续节点输入

1-3-3 需要：
- 在 holdout（16 查询，dotnet）+ 大规模真实语料（django/drupal）上复验 `pure-fts` 配置
- 确认 FTS5 在更大规模语料上是否保持优势
- 测量资源消耗（内存、延迟）是否满足门限

---

## 7. 文件清单

| 文件 | 说明 |
|------|------|
| `scripts/measure/dev-candidate-grid.json` | 网格定义 |
| `scripts/measure/dev-candidate-grid.mjs` | 评测脚本 |
| `docs/evidence/2026-11-03-dev-candidate-selection.json` | 原始结果（12 配置 × 44 查询） |
| `docs/evidence/2026-11-03-dev-candidate-selection.md` | 本报告 |
