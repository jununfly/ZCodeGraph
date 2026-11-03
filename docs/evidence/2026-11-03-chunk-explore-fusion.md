# 1-3-3 V3 chunk-explore 融合验证报告

**日期**: 2026-11-03
**节点**: 1-3-3 V3 验证（Q13）
**Scope**: spike 验证（W1，不改 src/）
**结论**: **V3 PASS（4/4 fixed）**

---

## 1. 验证设置

| 维度 | 值 |
|------|-----|
| 目标查询 | 1-3-3 报告中 explore miss 的 4 题 |
| chunk 粒度 | 函数/方法级（Q11 = g1） |
| 融合点 | F1 前置召回模拟——chunk-vec top-K 符号名注入查询字符串（Q12） |
| 工作落点 | spike 脚本，不改 src/（Q14 = W1） |
| 验收门 | ≥ 3/4 转为 Hit@5（Q13 = V3） |

### 4 个目标查询

| ID | Corpus | 原 baseline Hit@5 |
|----|--------|-------------------|
| flask-holdout-request-lifetime | pallets-flask | ❌ |
| eshop-basket-add-or-increment | dotnet-architecture-eShopOnWeb | ❌ |
| eshop-picture-url-composition | dotnet-architecture-eShopOnWeb | ❌ |
| eshop-catalog-filter-pagination | dotnet-architecture-eShopOnWeb | ❌ |

---

## 2. 融合策略实现

**查询扩展模拟 F1 前置召回**（spike 阶段的最小侵入方式）：

```
chunk-vec top-8 chunks
    ↓
pickSymbolsToInject() — 优先 PascalCase（类/接口名），其次 camelCase（函数名）
    ↓
过滤：长度 < 4 跳过、通用前缀（get/set/do/handle/on）且短名跳过、去重
    ↓
最多注入 5 个符号名到原始查询末尾
    ↓
plan(cg, augmentedQuery, { maxFiles: 10 })
```

explore 的 `seedNamedSymbols` 自然命中 PascalCase token，把这些文件作为命名种子拉入 subgraph，再经调用图 glue 与文件评分排序。

---

## 3. 结果

### 3.1 总览

| 题 | baselineRank | fusedRank | fixed |
|----|--------------|-----------|-------|
| flask-holdout-request-lifetime | null | **1** | ✅ |
| eshop-basket-add-or-increment | 16 | **3** | ✅ |
| eshop-picture-url-composition | null | **4** | ✅ |
| eshop-catalog-filter-pagination | null | **2** | ✅ |

**V3 判定：4/4 fixed，PASS（门 ≥3/4）。**

### 3.2 每题注入的符号

**flask-holdout-request-lifetime**（"Where is per-request ambient state pushed on entry and unwound with teardown callbacks?"）
- 注入：`Flask.do_teardown_request`, `test_teardown_request_handler_debug_mode`, `test_teardown_request_handler`, `teardown_request`, `teardown_req`
- 命中：`src/flask/ctx.py` 或 `src/flask/app.py`（rank=1）

**eshop-basket-add-or-increment**（"Where does adding a catalog item to a buyer's basket create a new line or increase the existing quantity?"）
- 注入：`AddItem`, `AddItemToBasket`, `BasketItem`, `SetQuantities`, `BasketWithItemsSpecification`
- 命中：`src/ApplicationCore/Entities/BasketAggregate/Basket.cs`（rank=3）

**eshop-picture-url-composition**（"How is a catalog picture placeholder turned into a URL using the configured catalog base address?"）
- 注入：`CatalogItemListPagedEndpoint`, `HandleAsync`, `CatalogItemGetByIdEndpoint`, `ComposePicUri`, `CreateCatalogItemEndpoint`
- 命中：`src/ApplicationCore/Services/UriComposer.cs`（rank=4）

**eshop-catalog-filter-pagination**（"Where are brand and type filters combined with skip and take to retrieve a requested catalog page?"）
- 注入：`CatalogFilterPaginatedSpecification`, `ListPagedCatalogItemRequest`, `GetCatalogItems`, `CatalogFilterSpecification`, `GetPreconfiguredCatalogBrands`
- 命中：`src/ApplicationCore/Specifications/CatalogFilterPaginatedSpecification.cs`（rank=2）

---

## 4. 关键观察

### 4.1 chunk-vec 命中能力跨语言鲁棒

4 题覆盖 Python（flask）+ C#（eShopOnWeb）两种语言，chunk-vec 都能找到正确 chunk 并提取出有效符号。这反驳了 1-3-3 报告中"file-level embedding 对 C# 大型业务文件语义捕捉力不足"的强结论——**问题不在 C#，在粒度**。

### 4.2 explore 命名符号 seeding 是天然融合点

Q12 选择 F1 前置召回时预期"调用图自然压制语义邻居"，验证结果证实了这一点：
- eshop-picture-url-composition 的 top chunk 是 `CatalogItemListPagedEndpoint`（hard negative），但 explore 排序后正确答案 `UriComposer.cs` 反而进入 top-5
- 调用图 glue 把 UriComposer 与 CatalogItemListPagedEndpoint 的调用关系转化为分数，correct file 被结构信息拉回

### 4.3 符号注入策略可优化

当前策略把 PascalCase 优先 + 长度过滤 + 通用前缀过滤组合，已经能 4/4 通过。但注入列表里仍有噪声（如 `HandleAsync` 这种通用名）——产品化时可以考虑：
- 过滤 explore 已识别为"高频通用符号"的名字
- 按 chunk score 加权注入顺序
- 用 qualifiedName 而非简单 name 提高辨识度

---

## 5. 与 1-3-3 完整门的关系

V3 通过**不代表** 1-3-3 完整门通过。V3 只验证了 4 个 explore miss 题的修复能力，未验证：
- per-corpus Hit@5 ≥ 90% / Hit@10 ≥ 95%
- macro MRR ≥ 0.70
- 全部 16 题 holdout 的完整表现

**下一步选项**：
- 走完整 1-3-3 门重跑 16 题 holdout + 融合方案
- 先开 1-4 产品化节点，把 spike 转化为 src/ 改动，再做完整验收

---

## 6. 产物清单

- 报告：`docs/evidence/2026-11-03-chunk-explore-fusion.{md,json}`
- 融合脚本：`scripts/measure/chunk-explore-fusion.mjs`
- chunk 索引构建脚本：`scripts/measure/chunk-index-build.mjs`
- chunk 索引数据：`.tmp/chunk-explore-fusion/{pallets-flask,dotnet-architecture-eShopOnWeb}.chunks.json`（1446 + 312 chunks）
