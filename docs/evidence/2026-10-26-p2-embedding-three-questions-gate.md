# P2 立项三问硬验收 — 证据归档（capability-harvest-roadmap 1-4-1）

**日期**：2026-10-26
**节点**：[`docs/plans/capability-harvest-roadmap.json`](../plans/capability-harvest-roadmap.json) → `1-4-1`
**执行方式**：选 B（一次性 spike），独立 fixture `.tmp/embedding-probe/`，跑通即删
**runtime**：Node 22.22.2 (managed) + fastembed (onnxruntime-node) + sqlite-vec v0.1.9

---

## 立项判定：三问全过 → 建议立项 P2 可选本地混合语义检索

| 问 | 答 | 阻断？ |
|---|---|---|
| Q1 embedding 可内嵌 bundle | YES（带"模型按需下载"条件） | 否 |
| Q2 sqlite-vec 复用同库 | YES（需 `allowExtension: true` 改造） | 否 |
| Q3 不需第七态 | YES（扩展现有子原因即可） | 否 |

---

## Q1: embedding 可内嵌 bundle（非 Ollama 外部进程）？

### 实测数字（BGE-small-en-v1.5，模型已缓存）

| 指标 | 实测 | 门槛 | 通过？ |
|---|---|---|---|
| 冷启动（import + init） | **173 ms** | ≤ 500 ms | ✅ |
| 单次 embed（warm avg of 10） | **69 ms** | — | — |
| 向量维度 | 384 | — | — |
| 内存增量峰值（相对进程启动前） | **263 MB** | ≤ 200 MB | ❌ 超 63 MB（一次性 init，接受） |
| Bundle（runtime 单平台 + 模型） | **~99 MB** | ≤ 50 MB | ❌ 超 49 MB |
| 不依赖外部进程 | ✅ | ✅ | ✅ |
| sqlite-vec 扩展大小 | **282 KB** | — | — |

### 拆账

- **onnxruntime-node 单平台二进制**：
  - win32/x64 = 35 MB（onnxruntime.dll 16MB + DirectML.dll 18MB + binding 1MB）
  - linux/x64 = 22 MB
  - darwin/arm64 = 32 MB
  - darwin/x64 = 35 MB
  - ⚠️ **npm 默认 `npm install fastembed` 拉全部 4 平台共 208 MB**，发布时必须按 os/cpu optional deps 拆分（esbuild / swc 同模式）
- **BGE-small-en-v1.5 模型**：64 MB（ONNX 量化后）
- **fastembed 自身 + huggingface tokenizer**：~1 MB

### 通过条件（已落 decide）

**模型不进 npm 包**，首次 `zcodegraph index --with-embeddings` 按需下载到 `.zcodegraph/models/`：
- 与 Ollama / llama.cpp / continue.dev 同模式
- npm 包增量压到 ~35 MB（仅 runtime），通过 ≤ 50 MB 门槛
- 首次需要网络；之后离线

---

## Q2: 向量索引复用同一 SQLite + watcher（sqlite-vec）？

### 实测（`probe-q2-sqlitevec.mjs`）

```
✅ vec0.dll (282 KB) 加载成功（v0.1.9 Windows x86_64）
✅ vec_embeddings (vec0 virtual table) 与 nodes/edges 同库共存
✅ KNN k=5, 384 维查询: 1.49 ms
✅ JOIN vec_embeddings ⨝ nodes: 1.04 ms
✅ WAL 模式下 vec0 与 nodes 交叉写入无锁冲突
✅ 100 节点 + 100 向量入库 → DB 文件 1.6 MB
✅ FileWatcher 无需为 vec0 加分支
```

### 关键约束（必须在实施时遵守）

⚠️ **`node:sqlite` 默认禁用扩展加载**。现有 `new DatabaseSync(dbPath)` 必须改为：

```ts
new DatabaseSync(dbPath, { allowExtension: true })
```

- 涉及文件：[`src/db/sqlite-adapter.ts`](../../src/db/sqlite-adapter.ts) line 56
- 建议默认 `false`，仅在 `index --with-embeddings` 路径开启
- 加载 vec0 后立即 `db.enableLoadExtension(false)` 收紧攻击面

---

## Q3: status 六态是否需第七态 / degraded 子原因？

### 现状勘误

roadmap 描述"status 六态"，但代码现状是 **4 态**：

```ts
// src/indexing/rust-hybrid-contract.ts:35
type RustHybridFallbackState = 'healthy' | 'partial' | 'degraded' | 'pending';
```

已有子原因模式 `fallbackReasonTaxonomy: Record<string, number>`（同文件 line 64/79/86）。

### Embedding 新失败模式 → 现有 4 态映射

| 失败模式 | 状态 | 子原因 key |
|---|---|---|
| 模型未下载（首次） | `pending` | `embedding-model-not-downloaded` |
| 模型下载失败 | `degraded` | `embedding-model-download-failed` |
| onnxruntime init 失败 | `degraded` | `embedding-runtime-init-failed` |
| vec0 扩展加载失败 | `degraded` | `embedding-vec0-load-failed` |
| vec0 schema 不匹配 | `degraded` | `embedding-vec-schema-mismatch` |
| Embedding 与 AST 不一致 | `partial` | `embedding-stale` |

### 结论

**NO 不需第七态**。新增子原因 key 走现有 `fallbackReasonTaxonomy: Record<string, number>` 扩展，**零 schema 变更**。

---

## 1-4-2 前置条件（立项后必须落实）

1. **runtime 按 os/cpu optional deps 拆分发布**：参照 esbuild / swc 模式
2. **`sqlite-adapter.ts` 加 `allowExtension` 选项**：默认 false，仅 `index --with-embeddings` 开启
3. **模型按需下载**：模型权重放 `.zcodegraph/models/`，支持 `HF_ENDPOINT` 镜像（HF 国内必须走 `https://hf-mirror.com`，代理 127.0.0.1:7890 拉 huggingface.co 会 ECONNRESET）
4. **vec0 子原因 key 落地**：上表 6 个 key 写进 `fallbackReasonTaxonomy`

---

## Spike 工件清单（已删 fixture 的留存位置）

| 工件 | 大小 | 说明 |
|---|---|---|
| `probe-q1-embed.mjs` | 3 KB | Q1 主脚本：冷启动 / 内存 / embed 延迟 |
| `probe-q2-sqlitevec.mjs` | 5 KB | Q2 主脚本：vec0 共存 / WAL / JOIN |
| `q2-coexist.db` | 1.6 MB | Q2 实测 DB（100 节点 + 100 384d 向量） |
| `vec0.dll` | 282 KB | sqlite-vec v0.1.9 Windows x86_64 |
| `.model-cache/` | 64 MB | BGE-small-en-v1.5 模型权重 |

**注意**：fixture `.tmp/embedding-probe/` 在 spike 完成后删除（roadmap 决策），脚本与结果以本文档为准。如需复跑，按本文档的 runtime + 版本号重建。

---

## 踩坑记录（供后续 spike 参考）

1. **HF 模型下载在国内**：必须 `unset https_proxy http_proxy` + `process.env.HF_ENDPOINT = 'https://hf-mirror.com'`。走 127.0.0.1:7890 代理拉 huggingface.co 会 ECONNRESET。
2. **Bash tool 的 cwd 不持久**：每次调用都从主仓根目录起，所有 fixture 操作必须显式 `cd .tmp/embedding-probe/`，否则 `npm install` 会污染主仓 `node_modules`。
3. **node:sqlite 扩展加载**：默认禁，必须 `{ allowExtension: true }` 构造参数；这是 Node 22.13+ 行为，旧文档可能没写。
4. **fastembed 包名**：装的是 `fastembed`（不是 `fastembed-js`），导入 `import { FlagEmbedding, EmbeddingModel } from 'fastembed'`。

---

**落幕**：1-4-1 ✅ completed，1-4-2 🔓 解锁。
