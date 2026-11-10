---
doc-kind: method
authority: supporting
authority-id: MET-hard-budget-ceiling-pre-registration
bounded-question: "如何让 ADR-0015 的预注册硬预算上限冻结具备机械可判定性，从而支撑 D4 的停止规则？"
page-form: reference
roadmap-node: 1-8-2
date: 2026-11-10
---
# 预注册硬预算上限：单位、数值与冻结判据

规范所有者：`ADR-0015` D2/D4/D5。本页登记冻结字段、计数规则与触顶判据。

## 1. 冻结值

| 字段 | 冻结值 / 状态 |
| --- | --- |
| 单位 | `paired-run` = 1 Agent Task × 1 臂(A/C/S) × 1 trial |
| 计数规则 | 失败、超时、重试与配置指纹拒绝的 run 全部计入 `consumed`；整任务剔除时已执行 run 不回退；pilot 与 formal 分账、互不挪用；run 边界由不可变运行清单条目界定 |
| `pilot ceiling` | **96 paired-runs**（5 任务时 60）；仅估方差、审计一致性、顺序效应、缺失与成本 |
| `formal ceiling` | 正式 N 预注册前 **0**；之后按 `N × k × 3` 冻结，不得在看到结果后上调 |
| 观测告警 | 金额 / wall-clock / token 记录并报告，不设阈值、不作统计门 |
| 触顶 | `consumed(scope) >= ceiling(scope)` → 按 ADR-0015 D4 停止并判 `inconclusive` |
| 正式 N | UNSET（试点估方差后预注册） |
| 总成本 | UNSET |
| 正确性非劣数值 | UNSET |
| 任务集精确组成 + Task Freshness | UNSET；v3 holdout 不得复用 |
| named operators / reviewers | UNSET；Q68 reviewer = Human |
| MDE | 1.5（已冻结） |
| 主检验与推断簇 | 已冻结（ADR-0015 D2） |

## 2. 可判定性

单位与按 scope 封顶的数值成对，才产生谓词 `consumed(scope, unit) >= ceiling(scope) -> stop`：缺数值无法判定触顶，缺单位则数值没有计量对象。停止判定须在看到结果前封闭；事后放宽等价于 optional stopping，任务级双侧符号翻转随机化检验的 α 失去意义。

## 3. 单位判据

| 层级 | 候选 | 可复核来源 | 漂移来源 |
| --- | --- | --- | --- |
| 协议内原生 | paired-run 数 | 不可变运行清单 + 配置指纹 | 仅取决于 run 计数规则 |
| 派生计量 | token / wall-clock | 运行时日志与计时器 | 上下文长度、共享 runner 负载 |
| 外部经济量 | 金额 | 外部账单 | 模型定价、缓存、汇率 |

1. `run 数 = N × k × 3` 与 Paired Block、任务簇唯一推断单元、trial 不放大 N、`k=6` 全排列同处一个坐标系，无需外部换算率。
2. 不可变运行清单与配置指纹断言直接记录每次 run，核数不依赖第三方系统。
3. wall-clock 不能作为同机等价量：`DES-architecture-regression-baseline-v1` 的 Environment 段声明回归比对是告警而非同机性能等价断言；`docs/baselines/architecture-regression-v1.json` 的 `measurement.checkRepetitions = 9` 是该噪声的既有缓解配置。
4. 金额与 token 受协议外输入影响；`AGENTS.md` 的优化目标是 wall-clock latency + tool-call count，不优化 token cost。
5. run 数不约束金额与时长；以金额为主门须先定义单价来源、计费快照与重试计费规则，否则触顶不可复核。

已冻结的取舍：主上限单位取 paired-run，金额 / wall-clock / token 仅作观测告警。

## 4. 触顶判定

- **计数面**：不可变运行清单逐 run 累加（含失败、超时、重试与指纹拒绝）；配置指纹保证 A/C/S 共享任务、模型版本、prompt、工具 schema、索引快照与 MCP 工具面；pilot 与 formal 分账。
- **判定面**：任一正确性回退立即停止；触顶判 `inconclusive`；禁止只删除失败臂或追加批次求显著。

## 5. 关联

- `ADR-0015` — D2/D4/D5 规范所有者。
- `MET-semantic-retrieval-evaluation-v2` — 语义检索评测方法 v2。
- `DES-architecture-regression-baseline-v1` — 计时噪声合约。
- `docs/baselines/architecture-regression-v1.json` — `checkRepetitions` 版本化输入。

## 6. 边界

本页不授予实现、试点或产品集成授权。`formal ceiling` 数值须待正式 N 预注册后落盘；余下 UNSET 字段由 Human 给出。
