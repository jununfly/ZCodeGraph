# Domain Language 校对 — 待创建 Issues

> 生成于 2026-06-10 Domain Language 校对 session。
> 使用 `ZJ-CONTEXT.md` 确认的正式术语。
>
> 创建方式（需 classic PAT `ghp_*`）：
> ```
> $env:GITHUB_TOKEN="ghp_xxx"
> gh auth login --with-token
> gh issue create --repo jununfly/ZCodeGraph --title "..." --body "..."
> ```

---

## Issue 1: Domain Language — 统一 "Explore Answer" 命名

**Labels**: `domain-language`, `docs`
**Type**: docs

### 背景

Domain Language 校对确认正式术语为 **"Explore Answer"**。代码注释和文档中存在以下不一致命名：

| 当前用法 | 应改为 |
|---------|--------|
| output-oriented Explore wording | "Explore Answer" |
| response-oriented Explore wording | "Explore Answer" |

### 受影响文件

- `src/mcp/tools.ts`
- `src/mcp/explore-types.ts`
- `docs/design/adaptive-explore-sizing.md`

### 范围

仅修改注释和文档，不涉及 API/类型重命名。类型名 `ExplorePlan` 保持不变（它是 Explore Answer 的计划表示）。

---

## Issue 2: Domain Language — 统一 "Entry Node" 命名

**Labels**: `domain-language`, `code`
**Type**: code

### 背景

Domain Language 校对确认正式术语为 **"Entry Node"**。代码中存在以下不一致：

| 当前用法 | 文件 | 应改为 |
|---------|------|--------|
| `Subgraph.roots` 字段 | `src/types.ts` | `entryNodes` |
| `entryPoints` 变量/参数 | `src/mcp/context/index.ts` | `entryNodeIds` |
| 注释 "entry point" | 多个文件 | "Entry Node" |
| 注释 "root" (指 entry nodes) | `src/types.ts` | "Entry Node" |

### 范围

- `Subgraph.roots` → `entryNodes`：类型字段改名（breaking change，需全量搜索引用）
- `entryPoints` → `entryNodeIds`：本地变量统一
- 注释更新：不涉及逻辑

---

## Issue 3: Domain Language — 统一 "Flow Spine" 命名

**Labels**: `domain-language`, `docs`
**Type**: docs

### 背景

Domain Language 校对确认正式术语为 **"Flow Spine"**。代码注释中混用了 "call-path spine"。

| 当前用法 | 文件 | 应改为 |
|---------|------|--------|
| 注释 "call-path spine" | `src/mcp/explore-types.ts:62` | "Flow Spine" |

### 范围

仅修改注释，`FlowSpine` 类型名保持不变。废弃 "call-path spine" 作为同义词。

---

## Issue 4: Domain Language — 统一产品名称用法

**Labels**: `domain-language`, `docs`
**Type**: docs

### 背景

项目名/产品名有三种写法，缺乏明确规则。

| 用法 | 当前出现位置 | 建议场景 |
|------|------------|---------|
| "ZCodeGraph" | 文档标题、GitHub repo、发布材料 | 项目名、产品名（对外） |
| "CodeGraph" | 类型名、代码内引用 | 现有代码标识符（例如 `CodeGraph` 类） |
| "zcodegraph" | CLI 命令、`zcodegraph_` MCP 工具前缀、`.zcodegraph/`、`zcodegraph.db`、MCP server key | 用户输入的命令、工具名、文件系统路径、协议/配置键 |
| "codegraph" | 旧 `.codegraph/`、旧 MCP server key | 仅作为 legacy 兼容或历史引用 |

### 建议决策

- **对外文档/README/发布材料**："ZCodeGraph"（大写 Z，驼峰）
- **API/包的文档简称**："ZCodeGraph"
- **现有代码标识符**："CodeGraph"（如 `CodeGraph` 类）
- **CLI/MCP 工具名/文件系统/配置键**："zcodegraph"（小写，如 `zcodegraph init`、`zcodegraph_*` 工具前缀、`.zcodegraph/`、`zcodegraph.db`、MCP server key）
- **legacy 名称**："codegraph" 只用于兼容旧 `.codegraph/` 或旧 MCP server key，不再作为新写入口径

需在 `ZJ-CONTEXT.md` 中记录此约定。

---

## Issue 5: Domain Language — 统一 Subgraph 收集动词

**Labels**: `domain-language`, `code`
**Type**: code

### 背景

收集图子集的动作在代码中有三种表述，未统一。

| 当前用法 | 文件 |
|---------|------|
| "collects subgraph" | `src/mcp/explore-types.ts` |
| "buildContext" | `src/mcp/context/index.ts` |
| "gathers relevant files" | `src/mcp/tools.ts` |

### 建议

统一使用 **"collect"**：与 Explore Answer 的"收集证据"语义一致，且 `collects subgraph` 已是 `explore-types.ts` 中的既有用法。

### 范围

- `context/index.ts`：`buildContext` 如非 API 暴露，可改为 `collectContext`
- `tools.ts`："gather" → "collect" 注释更新

---

## Issue 6: Domain Language — "Read Model" 重命名为 "Access Model"

**Labels**: `domain-language`, `code`
**Type**: code

### 背景

术语表确认正式术语为 **"Access Model"**（替代 "Read Model"）。
但 `src/db/read-models.ts` 中 4 个接口名仍使用 `XxxReadModel` / `XxxWriteModel`，命名不一致。

| 当前名 | 应改为 |
|--------|--------|
| `AgentReadModel` | `AgentAccessModel` |
| `MaintenanceWriteModel` | `MaintenanceAccessModel` |
| `ResolutionReadModel` | `ResolutionAccessModel` |
| `StatusReadModel` | `StatusAccessModel` |

### 范围

Breaking change——`QueryBuilder` 实现这四个接口，需全量搜索引用并更新所有调用者。

---

## Issue 7: Domain Language — "Provenance" 重命名为 "Edge Origin"

**Labels**: `domain-language`, `code`
**Type**: code

### 背景

术语表确认正式术语为 **"Edge Origin"**（替代 "Provenance"）。
但 `src/types.ts:193` 中 `Edge.provenance` 字段仍使用旧名，且拼写有误（`'heuristic'` 被误写为 `'heuristic'`）。

| 当前名 | 应改为 |
|--------|--------|
| `Edge.provenance` | `Edge.edgeOrigin` |
| 类型 `'tree-sitter' \| 'scip' \| 'heuristic'` | 修正拼写 `'heuristic'` |

### 范围

`Edge` 类型字段改名 + 拼写修正，需全量搜索引用并更新。

---

## Issue 8: Domain Language — "Render Mode" 领域术语改为 "Source Depth"

**Labels**: `domain-language`, `docs`
**Type**: docs

### 背景

术语表确认领域术语为 **"Source Depth"**（替代 "Render Mode"）。
代码中字段名 `renderMode` 暂不改变（由后续 refactor 处理），但文档和注释应使用 "Source Depth"。

### 范围

仅更新 `docs/design/adaptive-explore-sizing.md` 和代码注释中的用词。
`renderMode` 字段名保留，待后续 issue 追踪重命名。

---

## Issue 9: `ExploreOutputBudget` 重复定义 — 统一到 `explore-types.ts`

**Labels**: `domain-language`, `code`
**Type**: code

### 背景

`ExploreOutputBudget` 接口在两个文件中定义：

| 文件 | 状态 |
|------|------|
| `src/mcp/explore-types.ts:29` | 应选为单一来源 |
| `src/mcp/tools.ts:109`（已删除，见 2026-06-10 提交） | 已改为 re-export |

### 范围

验证 `tools.ts` 中已从 `explore-types.ts` re-export，无残留重复定义。
