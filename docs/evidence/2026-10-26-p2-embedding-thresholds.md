---
doc-kind: evidence
authority: supporting
authority-id: EV-p2-embedding-thresholds-142-2026-10-26
bounded-question: "1-4-2 P2 量化阈值实测（5 语料端到端）：磁盘 ≤50% / 首次索引 ≤2× / watch 单文件 ≤5s 三条阈值在 flask/express/petclinic/django/drupal 上的真实读数与判定？"
roadmap-node: 1-4-2
date: 2026-10-26
---

# P2 量化阈值实测 — 5 语料端到端（capability-harvest-roadmap 1-4-2）

**日期**：2026-10-26
**节点**：[`docs/plans/capability-harvest-roadmap.json`](../plans/capability-harvest-roadmap.json) → `1-4-2`
**实施模式**：C（A 的端到端跑通 + B 的最小 src 改动）
**runtime**：Node 22.22.2 (managed) + fastembed (onnxruntime-node) + sqlite-vec v0.1.9 (vec0.dll 282 KB) + BGE-small-en-v1.5 (384 维)
**原始数据**：[`raw/2026-10-26-p2-embedding-thresholds.json`](raw/2026-10-26-p2-embedding-thresholds.json)

---

## 5 语料组合与覆盖梯度

承接 1-4-2 决策：覆盖大小梯度 × 语言多样性。

| 语料 | 档位 | 语言 | 文件数 |
|---|---|---|---|
| pallets-flask | 小 | Python | 84 |
| expressjs-express | 小 | JS | 51 |
| spring-projects-spring-petclinic | 中 | Java | 69 |
| django-django | 中 | Python | 999 |
| drupal-drupal | 大 | PHP | 11 501 |

语料全部命中 `C:/workspace/measure-corpus/` 本地缓存（无 clone 阶段）。

---

## exit_criteria 对照判定

| # | 阈值 | 实测 | 判定 |
|---|---|---|---|
| 1 | 额外磁盘 ≤ 纯结构索引体积 50% | 5 语料中 **4 通过 / 1 失败**（express 118%） | ⚠️ **部分通过** |
| 2 | 首次索引时间增幅 ≤ 2× | 嵌入吞吐稳定 ~81 ms/文件；drupal 18.4 min vs 结构索引 ~50 s | ❌ **远超 2×** |
| 3 | watch 单文件增量 ≤ 5 s | 单文件 embed ≈ 81 ms（≪ 5 s） | ✅ **通过** |

**总裁决：不推荐立即落地 P2 完整实现。** 阈值 2（首次索引时间）是硬阻塞：串行 fastembed 推理让大仓首次 `--with-embeddings` 时间膨胀 10-20×，与用户可接受的「可选加层」定位不符。若仍要推进，必须先把嵌入做成**后台异步 + 增量懒算**模式（不在 index 主路径上），或者接受 drupal 级项目首索引 ~20 min 的代价。

---

## 实测数据

### 磁盘增量（含 WAL/shm 三件套）

| 语料 | baseline | post-embed | Δ bytes | Δ % | ≤50% |
|---|---|---|---|---|---|
| flask | 4 460 544 | 4 460 544 | **0** | **0 %** | ✅ |
| express | 1 060 864 | 2 314 240 | 1 253 376 | **118.1 %** | ❌ |
| petclinic | 2 826 240 | 3 379 200 | 552 960 | 19.6 % | ✅ |
| django | 43 335 680 | 43 335 680 | **0** | **0 %** | ✅ |
| drupal | 272 023 552 | 286 928 896 | 14 905 344 | 5.5 % | ✅ |

**两条反直觉发现**：
- **flask / django Δ = 0**：SQLite 页内复用 —— 历史删表/更新留下的空闲页吸收了 vec0 shadow tables 写入，主 DB 文件无需 grow。这意味着磁盘增量**不是单调的**，依赖 baseline DB 的内部碎片状态。
- **express Δ = 118 %**：基线 DB 仅 1 MB（51 文件），vec0 首次创建 `vec_embeddings` 需要固定开销（shadow tables: `_chunks` / `_rowids` / `_info` / `_vector_chunks00`），加 51 × 1536 B = 78 KB 向量本体 + 页分裂放大。**小项目过 50% 门槛本质上不可能**——分母太小。

### 嵌入吞吐

| 语料 | files | embedded | skipped | embedWallMs | perFileAvgMs | selfKNN distance |
|---|---|---|---|---|---|---|
| flask | 84 | 81 | 3 (empty) | 7 120 | 80.83 | 0 ✅ |
| express | 51 | 51 | 0 | 5 476 | 80.96 | 0 ✅ |
| petclinic | 69 | 69 | 0 | 6 832 | 81.51 | 0 ✅ |
| django | 999 | 850 | 149 (empty) | 78 098 | 80.71 | 0 ✅ |
| drupal | 11 501 | 11 494 | 7 (empty) | **1 106 223 (≈ 18.4 min)** | 81.53 | 0 ✅ |

**关键观察**：
- 吞吐稳定在 **80-82 ms/文件**，与语料规模 / 语言无关 —— 瓶颈在 fastembed 的 ONNX 推理本身，不在文件 IO、不在 SQLite 写入、不在 vec0 索引。
- 这意味着成本**严格随文件数线性增长**：N 文件 ≈ N × 81 ms。
- Self-KNN 自查 distance = 0 全部通过 —— 向量写入/读取链路完整无损。

### Skip 分布

| skipped 原因 | 计数 | 说明 |
|---|---|---|
| `empty` | django 149 / drupal 7 / flask 3 | `content.trim().length === 0` 的文件（空模块 stub、`__init__.py` 空文件等） |
| 其他 | 0 | 无读取错误 |

Skip 策略合理：空文件无 embed 价值，跳过即可。

---

## 与 1-4-1 spike 数据的对照

| 指标 | 1-4-1 spike (synthetic) | 1-4-2 真实语料 | 一致性 |
|---|---|---|---|
| 单次 embed 延迟 | 69 ms (warm, 短文本) | 80-82 ms/文件 (真实代码文件，截断 8000 字符) | ✅ 略高但同数量级 |
| KNN k=5 384 维查询 | 1.49 ms | self-KNN 0-16 ms（drupal 大表 16 ms） | ✅ 同数量级 |
| 冷启动 | 173 ms | init 134-153 ms（模型已缓存） | ✅ 一致 |
| vec0 与 nodes/edges 共存 | ✅ 无冲突 | ✅ 5 语料全部共存 | ✅ 一致 |

结论：1-4-1 spike 数据**外推到真实语料依然成立**，但首次索引时间成本在 spike 阶段被低估（spike 只测单次 embed，没测 N×文件的全量嵌入）。

---

## 实施模式 C 的产出清单

### src 改动（仅 1 处）

- [`src/db/sqlite-adapter.ts`](../../src/db/sqlite-adapter.ts)：新增 `SqliteAdapterOptions` 接口 + `createDatabase(dbPath, options)` 第二参数；`NodeSqliteAdapter` 构造函数把 `allowExtension` 透传到 `DatabaseSync`，默认 `false`。**为 1-4-3 铺路但不完整实现**。

### 测试改动

- [`tests/node-sqlite-backend.test.ts`](../../tests/node-sqlite-backend.test.ts)：新增 `describe 'allowExtension option (1-4-2)'`，3 个 case 锁默认 false、显式 true、省略等价于 false 三态。8/8 全绿。

### 测量基础设施（主仓）

- [`scripts/measure/embedding-baseline.mjs`](../../scripts/measure/embedding-baseline.mjs)：多语料批量测量 CLI。复用 `lib/report.mjs` envelope 格式，与 `setup.mjs` / `dead-code.mjs` 同风格。

### Spike fixture（不入仓）

`.tmp/embedding-baseline/`：fastembed + vec0.dll + `embed-and-write.mjs` + `probe-env.mjs`。**spike 完成后按 roadmap 决策应删除**；本文档 + raw JSON 是留存事实源。

---

## 1-4-3 推进建议（不阻塞 1-4-2 关闭）

1. **若推进 P2 完整实现**：
   - 接受 drupal 级项目首索引 ~18 min 代价，**或**改成后台异步嵌入 + 增量懒算（embed 不在 index 主路径）
   - 小项目 50% 磁盘门槛需要重新校准（分母太小导致固定开销比例失真）
   - `index --with-embeddings` CLI、FileWatcher 集成、status 第 7 态子原因、MCP 语义检索入口全部留到 1-4-3+
2. **若不推进**：1-4-2 数据已足够支持「P2 阈值实测」节点关闭；后续如需重新评估，按本文档版本号（fastembed@1.14.3 / vec0 v0.1.9 / BGE-small-en-v1.5）重建 fixture。

---

## 踩坑记录（1-4-2 新增）

1. **vec0 不识别 INSERT OR REPLACE 的 REPLACE 语义**（UNIQUE constraint failed on vec_embeddings primary key）——必须 DROP + CREATE 重置，或先 DELETE 再 INSERT。
2. **WAL 模式下 vec0 写入先进 .wal 侧车文件**，主 DB 文件短期内不变。测量磁盘增量必须（a）算 db+wal+shm 三件套，或（b）跑 `PRAGMA wal_checkpoint(TRUNCATE)` 强制合并。
3. **磁盘增量不是单调函数**：SQLite 页内复用让小/中项目可能 Δ=0（flask/django），让基线小的项目可能 Δ 远超向量本体大小（express 118% 来自固定 shadow-table 开销）。
4. **`import.meta.url` 在 Windows 上给 fastembed 的 cacheDir 会双前缀盘符**（`C:\C:\...`），必须 `fileURLToPath` + `path.resolve` 转真实绝对路径。
5. **fastembed 返回 number[] 不是 Float32Array**，写 vec0 前需 `Float32Array.from(vec)` 归一化。

---

**落幕**：1-4-2 实测完成。exit_criteria 第 1 条部分通过、第 2 条远超阈值、第 3 条通过。**总判定：不推荐立即落地 P2 完整实现**，但节点目标（量化阈值实测）已达成。
