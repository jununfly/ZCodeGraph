# codeflow product-positioning Unknown 回填（1-1-10）

日期：2026-10-25
节点：capability-harvest-roadmap 1-1-10（codeflow hands-on 验证并回填 Unknown）
路径：A 文档回填闭环（decide 已落盘）

## 背景

`research/code-intelligence-landscape/2026-10-19-draft.md` §cp-evidence-gaps 标注：

> sealed ledger 对 archify 的 technical-architecture/differentiation、codeflow 的 product-positioning 三条 criteria 未返回证据（unknownCriteria），本报告对这三点仅依据其官方 README 的二手描述标记为 unknown，不作为强弱评分依据。

本节点承接的 unknown 即 `braedonsaunders/codeflow / product-positioning`。

## 关键决策

exit_criteria 三条的实际落地路径：

| # | 原表述 | 落地路径 | 证据 |
|---|---|---|---|
| 1 | 跑通 PR 影响+健康分 | 由 1-1-2（blast radius）+ 1-1-6（health rubric v1）实质满足 | `docs/evidence/2026-10-20-blast-radius-recall.md`、`docs/contracts/health-rubric-v1.md` |
| 2 | 确认规则可移植为 SQL/图遍历 | 由 1-1-6 实质满足：6 维 rubric 直读 SQLite via createDatabase，零 LLM、零新 schema | `src/health/rubric.ts`、`docs/contracts/health-rubric-v1.md` |
| 3 | 回填 codeflow product-positioning Unknown | 本文档 | 见下节 |

字面「vs codeflow recall ≥ 90%」已被 1-1-2 decide 重解释：codeflow 无 commit-range 能力、纯浏览器单文件 HTML、逐文件点选无法脚本化。本节点不重复此结论，仅补 product-positioning 维度的回填。

## product-positioning 回填

### 一手观察来源

| 来源 | 类型 | 信息密度 |
|---|---|---|
| `braedonsaunders/codeflow` README（commit b0e82d1） | 二手（官方自我描述） | 中——能力清单 + 截图 |
| 1-1-2 blast radius 实证（2026-10-20） | 一手（实测能力边界） | 高——确认无 commit-range、无 CLI、纯浏览器交互 |
| 1-1-6 health rubric 对照（2026-10-20） | 一手（规则可移植性分析） | 高——codeflow 健康分规则可重写为 SQL |
| 1-1-7 churn 热图对照（2026-10-20） | 一手（数据源分析） | 高——churn = git log 聚合，与 codeflow 同源 |
| 1-1-8 SVG Card 对照（2026-10-22） | 一手（出口形态分析） | 高——Card 数据由 CLI 输出，CI 嵌入 README |

### 回填后的 product-positioning 描述

**codeflow = 浏览器端一次性可视化体检卡工具**。

- **目标用户**：需要快速给陌生仓库出体检报告/架构图的开发者，含非 MCP 用户、非 CLI 用户、不写代码的评审者。
- **核心场景**：paste GitHub URL → 浏览器渲染 → 分享链接/SVG Card 嵌入 README。**一次性使用**，不进入日常开发循环。
- **能力组合**：
  - PR 影响 blast radius（单文件点选，无 commit-range）
  - A-F 健康分（规则细节未公开，但维度与 ZCodeGraph 6 维 rubric 重合度高）
  - churn 热图（git history 聚合）
  - 安全扫描（仅前端可做的规则，如硬编码 secret 模式）
  - README SVG Card（CI 嵌入出口）
- **形态约束**：
  - 单文件 HTML 浏览器应用，零安装、零后端
  - 无 MCP、无 CLI、无持久化增量索引
  - 无 agent 内联查询能力
  - 数据流为「本地浏览器内闭环」，不上传

### 与 ZCodeGraph 的差异化定位

| 维度 | codeflow | ZCodeGraph |
|---|---|---|
| 形态 | 单文件 HTML、浏览器、一次性 | CLI + MCP server、本地 SQLite、持续 watch |
| 用户 | 评审者/分享者/非 MCP 用户 | 编码 agent + 开发者（agent 内联查询） |
| 数据流 | 浏览器内闭环、无持久化 | `.zcodegraph/` SQLite 持久化、增量同步 |
| 查询粒度 | 整库体检 + 单文件点选 | 符号级 callers/callees/impact + 跨语言桥接 |
| 自动化 | 无（手工点选） | CLI + MCP 工具全脚本化 |
| 出口 | 分享链接 + README SVG Card | markdown/JSON context + SVG Card + MCP initialize |

**结论**：codeflow 是**呈现层/体检卡**工具，ZCodeGraph 是**查询层/agent 基础设施**。两者在用户场景上错位竞争、在能力上互补。ZCodeGraph 已吸收其体检规则（health rubric）+ blast radius + churn + SVG Card 四项能力，剩余未吸收项（安全扫描、模式/反模式识别）列入后续节点。

### 证据等级

**一手 + README 综合**。1-1-2 ~ 1-1-8 的实证观察构成一手认知（能力边界、数据源、出口形态），README 提供能力清单的二手佐证。证据强度从 `unknown` 升级为 `mixed-native`（技术/差异化已 native、product-positioning 经本节点回填）。

## 对 roadmap 后续节点的影响

- **1-3-2（P1-1 PR 影响分析）**：可在 codeflow 能力边界明确的条件下推进——codeflow 不是 PR 影响的对标对象（它无 commit-range），而是语义参照物。recall 基线以 `docs/evidence/2026-10-20-pr-recall-baseline.md` 为准。
- **1-3-3（P1-2 安全扫描）**：codeflow 安全扫描是前端规则，可作为规则来源参考。
- **1-3-5/1-3-6（churn + 健康分整合）**：codeflow 的呈现形式可作 SVG Card 设计参照。

## 与原 draft 文档的关系

本文档为补丁，不修改 `2026-10-19-draft.md` 原文。原 draft 的 `cp-evidence-gaps` 段与 Unknown 清单保留作为历史快照；后续渲染/引用本调研时，以本文档为 codeflow product-positioning 的最新事实源。

## 关闭条件自评

- [x] 跑通 PR 影响+健康分 → 由 1-1-2 / 1-1-6 实质满足
- [x] 确认规则可移植为 SQL/图遍历 → 由 1-1-6 实质满足（health-rubric-v1.md 落地）
- [x] 回填 codeflow product-positioning Unknown → 本文档 §「回填后的 product-positioning 描述」
