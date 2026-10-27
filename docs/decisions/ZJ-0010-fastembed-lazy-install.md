---
doc-kind: decision
authority: primary
authority-id: ADR-0010
bounded-question: "How does ZCodeGraph ship the optional fastembed/onnxruntime-node dependency without bloating the default install?"
roadmap-node: 1-4-31
date: 2026-10-27
---
# ZJ-0010: fastembed 懒装方案（embedding 可选依赖的发布形态）

## Status

Accepted (design phase)

## Context

ADR-0009 把嵌入管线锁定为 **opt-in**：`CODEGRAPH_ENABLE_EMBEDDING=1` + `zcodegraph index --with-embeddings` 才会触发；worker 通过 `await import('fastembed')` 动态加载，加载失败把 queue 行标 `failed` 并写 `last_error='embedding-model-not-downloaded'`。

1-4-30 回归实测在 drupal 11 491 文件上发现 fresh 安装的 silent fail 路径：

1. 用户跑 `npm install -g @jununfly/zcodegraph`
2. 主 `package.json` 不含 `fastembed` / `onnxruntime-node`（1-4-28 决策：opt-in）
3. 用户开 `CODEGRAPH_ENABLE_EMBEDDING=1` + `--with-embeddings`
4. enqueue 成功（pending=11 491），worker 起来动态 import 失败
5. queue 行陆续标 `failed`，`zcodegraph status` 显示 `embedding-model-not-downloaded`
6. 用户从 CLI 输出里**没看到任何"请先安装 fastembed"提示** —— silent fail

成本面（本 ADR 权衡的核心数字）：

| 依赖 | 体积 | 内容 |
|---|---|---|
| `fastembed@1.14.x` | 148 KB | JS wrapper + tokenizer |
| `onnxruntime-node@1.21.0` | **208 MB** | ONNX 推理引擎 native binding |
| `BGE-small-en-v1.5` 模型 | 65 MB | 已在 1-4-1 决策中锁定按需下载，不进 npm 包 |

`onnxruntime-node` 208 MB 是不能忽视的安装体积。ZCodeGraph 当前主依赖都是几 MB 级别的纯 JS（commander / clack / tree-sitter-wasms 等），用户群体的硬件与网络差异极大（参见 1-4-2 实测：drupal 18.4 min 嵌入时间意味着非 SSD/弱 CPU 上更糟）。**默认塞 208 MB 给所有用户违反最小惊讶原则**，也违反 ADR-0009 的"opt-in 不污染主路径"精神。

但同时：**让 fastembed 完全不在 package.json 里、靠文档告诉用户"自己 npm install fastembed"也是糟糕的 DX** —— 用户不知道该装哪个版本，不知道要装 onnxruntime-node，不知道装在哪里（全局 vs 项目 local）。

## Decision

选 **方案 B：`zcodegraph embedding install` 显式子命令**。

```
zcodegraph embedding install           # 交互式：列出将安装的包，确认后跑 npm install
zcodegraph embedding install --yes     # 非交互：直接装
zcodegraph embedding install --dry-run # 只打印将执行的命令，不真跑
zcodegraph embedding status            # 检测 fastembed/vec0/模型三件套是否就绪
```

子命令做四件事：

1. **检测当前状态**：fastembed 是否可解析、vec0.dll 是否在位、ONNX 模型 cache 是否已下载
2. **安装 npm 包**：在 `<projectRoot>/.zcodegraph/models/node_modules/` 下跑 `npm install --prefix ... fastembed@^1.14.3`（不污染主 `node_modules`，版本号在代码里钉死）
3. **下载 vec0.dll**：从 sqlite-vec GitHub release 抓对应平台的 vec0 binary 到 `.zcodegraph/models/`（沿用 1-4-2 spike 已验证的 URL）
4. **预下载 ONNX 模型**：用 fastembed 的 `FlagEmbedding.init` 触发一次模型下载到 `.zcodegraph/models/`，避免首次 embed 时才拉 65 MB

`worker.ts` 的 `await import('fastembed')` 解析路径增加一档：在 `<projectRoot>/.zcodegraph/models/node_modules/` 也找一次（用 `createRequire` 显式指定路径）。这保持向后兼容：用户全局装了 fastembed 仍能用。

## 三方案对照

### 方案 A：`peerDependencies` + `peerDependenciesMeta.optional=true`

```json
"peerDependencies": {
  "fastembed": "^1.14.3",
  "onnxruntime-node": "1.21.0"
},
"peerDependenciesMeta": {
  "fastembed": { "optional": true },
  "onnxruntime-node": { "optional": true }
}
```

**优点**：
- npm 7+ 的标准"可选插件"机制
- 不装也不报错（`optional: true` 抑制 missing peer 警告）
- 用户想用时 `npm install fastembed` 即可，npm 会按 peer 约束解析版本

**缺点**：
- npm 7+ **默认仍会自动安装 peerDeps**（`auto-install-peers=true` 是多数 npm 配置的默认），`optional: true` 只是抑制警告，**并不阻止自动安装**。在 pnpm 上才能严格跳过（`auto-install-peers=false`）。这意味着方案 A 在大多数用户机器上 = 方案 C 的 208 MB 默认塞入，**达不到"opt-in 不污染"的目标**。
- 用户不知道要装：silent fail 路径不变，只是从"包不存在"变成"用户没装可选 peer"。
- 模型 cache 仍要单独下载，vec0.dll 仍要单独放置 —— 方案 A 只解决 npm 包问题，不解决整套链路的 ready 检查。

**结论**：不满足 opt-in 精神，**否决**。

### 方案 B：`zcodegraph embedding install` 显式子命令 ✅

**优点**：
- **显式 > 隐式**：与 ZCodeGraph 既有惯例一致（`zcodegraph install`、`zcodegraph index`、`zcodegraph uninit` 都是显式命令）
- 默认安装零变化：主 package.json 不加任何依赖
- 一条命令搞齐三件套：npm 包 + vec0.dll + ONNX 模型 cache
- `embedding status` 提供自检入口，CLI `--with-embeddings` 在 fastembed 缺失时**打印可执行的下一步提示**（"run `zcodegraph embedding install`"），把 silent fail 变成 guided fix
- 版本号在代码里钉死，避免用户装错版本导致 vec schema 不匹配（ADR-0009 Failure Modes row 4）

**缺点**：
- 多一个子命令要维护（涉及 npm registry / GitHub release / HuggingFace 三个外部源）
- 用户得知道有这个命令 —— 通过 `--with-embeddings` 的警告信息暴露
- 跨平台二进制下载（vec0.dll / vec0.so / vec0.dylib）要处理平台判断，但 1-4-2 spike 已经踩过坑

**结论**：选 B。

### 方案 C：`zcodegraph install` 安装器加 opt-in 步骤

在现有交互式安装器里加一步 `clack.confirm`："是否启用 P2 嵌入？将额外下载 ~270 MB"。

**优点**：
- 用户在第一次装 zcodegraph 时就被告知有这个能力
- 一键完成

**缺点**：
- `zcodegraph install` 当前职责是**写 MCP 配置到各 agent**（Claude Code / Cursor / Codex CLI / opencode），与"装 npm 包"是两件事，混在一起语义模糊
- 不交互模式（`-y` / CI）下默认是开还是关？开 → 失去 opt-in；关 → 用户 `-y` 跑完仍不知道有嵌入能力
- 用户后来才想用时仍要单独跑 `zcodegraph embedding install` —— 还是得做方案 B，方案 C 只是它的前置广告位

**结论**：不取代 B，但可以作为 B 的**暴露入口**——`zcodegraph install` 末尾打印一行"提示：P2 嵌入能力可用 `zcodegraph embedding install` 启用"。这是后续 polish，不属于本 ADR 强制范围。

## Consequences

### Positive

- 默认安装体积零增长（不加 208 MB）
- silent fail → guided fix：`--with-embeddings` 在 fastembed 缺失时打印 "run `zcodegraph embedding install`"
- 版本钉死 + 三件套一起装，消除"用户装了 fastembed 但版本不对/vec0 缺失/模型没下载"的组合失败
- `embedding status` 给 CI 提供断言入口（脚本报非零即未就绪）

### Negative

- 新增子命令的维护成本：要测试 npm install / vec0 下载 / HF 模型下载三条外部链路
- `worker.ts` 的 fastembed 解析路径要扩一档（`<projectRoot>/.zcodegraph/models/node_modules/`），破坏当前纯 Node 解析的简单性

### Neutral

- `zcodegraph install`（agent MCP 配置安装器）不变；本 ADR 引入的 `zcodegraph embedding install` 是**不同子命令空间**下的兄弟命令
- 不引入 peerDeps / optionalDependencies / bundleDependencies —— package.json 不动

## Implementation Notes（归 1-4-32 实施节点）

- 新文件 `src/embedding/installer.ts` 暴露 `runEmbeddingInstall(opts)`、`checkEmbeddingStatus(projectRoot)`、`EMBEDDING_REQUIRED_PACKAGES`
- `src/bin/zcodegraph.ts` 新增 `program.command('embedding')` 子命令空间，挂 `install` / `status` 两个 action
- `src/bin/zcodegraph.ts` 的 `--with-embeddings` 警告信息扩展为：
  ```
  [CodeGraph] --with-embeddings requires fastembed. Run:
    zcodegraph embedding install
  ```
- `src/embedding/worker.ts` 的 fastembed 解析顺序：
  1. `await import('fastembed')`（默认 Node 解析，全局/项目 node_modules）
  2. fallback：`createRequire(<projectRoot>/.zcodegraph/models/package.json).resolve('fastembed')`
- vec0 下载源：https://github.com/asg017/sqlite-vec/releases （1-4-2 spike 已验证 v0.1.9 win-x64 vec0.dll 282 KB）
- 模型下载：调用 `FlagEmbedding.init({ model: BGESmallENV15, cacheDir: <projectRoot>/.zcodegraph/models })`，让 fastembed 自己拉

## References

- 上层设计：[`ZJ-0009-async-embedding-pipeline.md`](ZJ-0009-async-embedding-pipeline.md)
- 触发证据：[`../evidence/2026-10-26-p2-async-embedding-d6-regression.md`](../evidence/2026-10-26-p2-async-embedding-d6-regression.md) §"已知遗留"
- 现有 installer（不同职责）：`src/installer/index.ts`
- worker fastembed 加载点：`src/embedding/worker.ts:218`（`await dynamicImport('fastembed')`）
- 1-4-2 spike 依赖清单：`.tmp/embedding-baseline/package.json`（fastembed@^1.14.3 单 dep，被动带入 onnxruntime-node@1.21.0）
