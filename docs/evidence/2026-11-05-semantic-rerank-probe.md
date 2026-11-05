# 1-7-3 轻量语义重排探针 — dev + holdout 证据

- 日期：2026-11-05
- Roadmap 节点：`1-7-3`（重排序模型 / 轻量语义重排探针）
- 事实源：`docs/plans/semantic-retrieval-roadmap.json`
- 候选配置：`docs/baselines/semantic-retrieval-semantic-rerank-candidate-v1.json`
  - sha256 = `3feff6a7257c96aa0759f76e4632a338d9c89a5a0109281c3d3e14798adef5ba`（holdout 运行前断言 OK，未篡改）
- 探针脚本：`scripts/measure/semantic-rerank-probe.mjs`
- 原始 JSON：`.tmp/measure/semantic-rerank-{development,holdout}.json`

## 1. 设计

不引 cross-encoder / LLM 重排模型，复用 1-3-3/1-6 既有 BGE chunk 嵌入资产做**候选集内**语义重排探针：

- 加载 `.tmp/chunk-explore-fusion/{corpus}.chunks.json`（384 维，rails/k8s 各 20000 chunks 全量）。
- `fastembed@1.14.5` + `model_optimized.onnx`（BGE-small-en-v1.5，CLS pooling）对 query 做 `queryEmbed`（`query: ` 前缀），与 chunk 向量（`passage: ` 前缀）同嵌入空间。
- 对 **C 臂**（= 1-7-1 `symbol-union-plan`：`mergedRerank(plan() ∪ symbolRecall)`，top10）候选集**内部**重排：
  - **R1 `rerankMaxCos`**：`score(file) = max_cosine(queryVec, chunkVec)` over 该文件 chunks。
  - **R2 `rerankMeanPool`**：`score(file) = cosine(queryVec, mean(chunkVec))`。
  - C 中无 chunk 覆盖的文件保留 C 原位置（sink 到有分文件之后）。
- 诊断臂 **S `chunkRetrieval`**：纯 chunk 语义检索 top10（不依赖 C），探语义检索天花板。

复用 `symbol-index-core.mjs` 的 `buildSymbolIndex / symbolRecallFiles / mergedRerank`，**完全复刻 1-7-1 的 C 候选集**，保证与 1-7-1/1-7-2 holdout 同口径。

## 2. 协议（防作弊）

- dev：60 题（5 小仓，snake_case 易仓），迭代、不哈希断言。
- holdout：v3 frozen 24 题（rails12 + k8s12），一次性评估，先断言候选哈希、禁调参/早停。本脚本 holdout 模式不读 dev。
- 门沿用 v2 §4 / 1-7 exit criteria：macro Hit@5 ≥ baseline+5pp；per-corpus Hit@5 ≥ 90%；per-corpus Hit@10 ≥ 95%；MRR 不回退（Δ<0.01 记 tie）；Hit@10 不回退。

## 3. Dev 结果（60 题）— 方法验证

| arm | Hit@5 | Hit@10 | MRR |
|---|---|---|---|
| baseline-explore (A) | 0.700 | 0.800 | 0.437 |
| symbol-union-plan (C) | 0.733 | 0.817 | 0.545 |
| **rerankMaxCos (R1)** | **0.783** | 0.817 | 0.606 |
| rerankMeanPool (R2) | 0.750 | 0.817 | 0.612 |
| chunkRetrieval (S) | 0.800 | 0.883 | 0.637 |

逐仓 Hit@5：flask A0.67→C0.58→R1 0.75；express A1.00→C1.00→R1 0.92（略退）；spring A0.75→C0.83→R1 0.75；actix A0.58→C0.83→R1 0.92；dotnet A0.50→C0.42→R1 0.58。

**Dev 判读**：R1 在 C 候选集内语义重排有正增益（Hit@5 +0.050 vs C，MRR +0.061）。但注意 dev 5 小仓 chunk 稀疏（express 42、spring 191、dotnet 312 chunks），候选集覆盖度参差（0.74–1.00），信号可能部分是覆盖稀疏的偶然。

## 4. Holdout 结果（v3 24 题，一次性）— 决定性

| arm | Hit@5 | Hit@10 | MRR |
|---|---|---|---|
| baseline-explore (A) | 0.167 | 0.250 | 0.154 |
| symbol-union-plan (C) | **0.458** | 0.500 | 0.299 |
| rerankMaxCos (R1) | 0.375 | 0.500 | 0.237 |
| rerankMeanPool (R2) | 0.375 | 0.500 | 0.258 |
| chunkRetrieval (S) | 0.292 | 0.375 | 0.149 |

逐仓 Hit@5：

| corpus | A | C | R1 | R2 | S | C 候选集 chunk 覆盖度 |
|---|---|---|---|---|---|---|
| rails | 0.25 | **0.50** | 0.33 | 0.33 | 0.33 | 0.54 |
| kubernetes | 0.08 | **0.42** | 0.42 | 0.42 | 0.25 | **0.25** |

门判定（以 R1 为基准）：

- macroHit5Plus5pp：PASS（Δ +0.208）
- mrrNoRegression：PASS（Δ +0.083）
- hit10NoRegression：PASS（Δ +0.250）
- perCorpusHit5At90：**FAIL**（rails 0.33 / k8s 0.42）
- perCorpusHit10At95：**FAIL**

**VERDICT: NO-GO**

## 5. 结论

1. **dev→holdout 反转是核心信号**：R1 在 dev +0.05、在 holdout **-0.083（退）**。原因：
   - **chunk 覆盖度不对称**：k8s 的 C 候选文件仅 25% 落在 20000-chunk 子集内，语义重排对 75% 候选文件无分可用（保留 C 位置）；rails 54%。语义重排能发力的文件子集本身就偏。
   - **BGE chunk 向量未弥合 query↔符号名语义鸿沟**：在 PascalCase 硬仓（rails/k8s）上，纯语义检索 S=0.292 **全面劣于**符号召回 C=0.458；把语义分叠进 C 候选集反而把 C 已排对的期望文件压下去（rails 0.50→0.33）。说明期望文件之所以被 C 排前，靠的是**符号名 camelCase 对齐**（字面），而非语义相似；语义分与这个强信号负相关。
2. **语义重排无法移动 k8s0.42/rails0.50 的天花板**：R1/R2 在 k8s 完全持平（0.42），rails 反而退。诊断臂 S 更差，确认语义检索本体在此硬集上不是解。
3. **1-7 三子方向全部封顶**：1-7-1 符号级召回（C=0.458，holdout 史上最佳）、1-7-2 图召回（G1=0.417，退）、1-7-3 语义重排（R1=0.375，退）。**检索本体替换 + 候选集内语义重排都过不了 per-corpus 90% 硬门**；C 仍是最佳臂但 macro 0.458 ≪ 0.90。
4. **不建议上完整 cross-encoder/LLM 重排（1-7-3 完整体）**：探针已证伪"候选集内重排能补缺"这一前提——瓶颈不在排序，而在 (a) 期望文件是否进候选集、(b) 字面符号对齐 vs 语义的冲突。cross-encoder 同样吃 chunk 文本，覆盖度问题不解决则同源失效。

## 6. 建议

- 1-7 线结构化探索（符号/图/语义重排）已穷尽，均 NO-GO。**建议关闭 1-7，并与 Human 辩论 per-corpus 90% 门标准**：该门在 rails/k8s 这类巨型 PascalCase 硬仓上，是否现实？或是否应改以 macro Hit@5 + MRR + Hit@10 综合放宽门（C 已全 PASS）作为可发布判据。
- 若坚持硬门，唯一未试方向是**扩大候选集召回**（让期望文件必进 top-N 大候选集）+ **新人工标注硬查询**（v3 已冻，splitMeta 要求 augment）。但这已超出 1-7 三子方向范围。
- 1-4 保持 pending+blocked（无候选通过质量门）。

## 7. 复现

```bash
# dev（迭代）
node scripts/measure/semantic-rerank-probe.mjs --split development \
  --out .tmp/measure/semantic-rerank-development.json
# holdout（一次性，先断言候选哈希）
node scripts/measure/semantic-rerank-probe.mjs --split holdout \
  --out .tmp/measure/semantic-rerank-holdout.json
```
