# ZCodeGraph 能力汇集方案（改进版 v2）

> 本文是 `research/code-intelligence-landscape/2026-10-19-harvest-draft.md`（v1）经 zj-discuss
> 五角色跨会话独立评审（B 技术经理 / C 产品专家 / A 架构师 / T 测试·质量 / O 运维·SRE）
> 合成后的改进版。评审原文见同目录 `discussions/capability-harvest-refinement/`。
>
> v1 的分层判断（直接吸收/集成复用/可选增量）与「保住 SQLite 零配置」方向**被全角色确认**；
> 但被一致指出三类系统性缺陷：①成本标级低估（把多周工程标成低成本）、②metrics 缺基线/口径/
> 测量基础设施、③架构不变式只有断言没有机制。v2 逐条修补。

---

## 0. v1 → v2 关键变更一览

| # | v1 缺陷 | 评审来源 | v2 修补 |
|---|---|---|---|
| 1 | 无验证冲刺，archify/codeflow 证据 Unknown 直接进排期 | B,C,T | 新增 **P-1 验证冲刺**（先行 gate） |
| 2 | 死代码/复杂度标「低成本 P0」，实为多周工程 | B,C,T | 拆分/降级，rubric 先行，限语言 |
| 3 | metrics 无基线/口径/样本定义 | T,B,O | 每条 metric 补 ground truth + 基线 + 测量脚本所有者 |
| 4 | 「不冲击 SQLite 零配置」是断言非机制 | A,O | 补 schema 演进条款 + 工具收口规则 + 架构回归红线 |
| 5 | 数据源语义「为覆盖而覆盖」 | C | 移出默认路径，降级为待验证 |
| 6 | PR 影响被放 P1，但它是 agent 高频刚需 | C,B | 提前到 P1 首位，复用现有 impact/affected |
| 7 | token 压缩无稳定 baseline 就对齐 ~62% | B,T | 测量先行，压缩实现挪后 |
| 8 | 新能力诊断面空白，「上线后怎么死」未知 | O,A | 每能力域加健康探针 + doctor capabilities.json |
| 9 | P2 语义检索边界（进程/存储/健康态）未选边 | A,O,C | P2 立项前三问硬验收，未过不立项 |

---

## 1. 汇集原则（不变，全角色确认）

- 落点：ZCodeGraph 现有 **SQLite(FTS5) 内嵌 + tree-sitter 确定性 AST + rust-hybrid** 底座。
- 三方式：**直接吸收**（自研为只读分析）／**集成复用**（archify/SVG Card 作出口）／**可选增量**（语义检索，默认关闭）。
- 底线：零配置、100% 本地、无强制外部进程/服务。

---

## 2. P-1 — 验证冲刺（新增，先行 gate，约 1 周）

> 所有后续阶段的**入口条件**。不完成则对应能力项不进排期。

| 任务 | 验收 | 产出 |
|---|---|---|
| archify hands-on | 在 1 个真实仓库跑通「图谱→archify IR→HTML」，确认 IR schema 匹配 | 回填 v1 三条 Unknown（archify 技术/差异化） |
| codeflow hands-on | 跑通 PR 影响 + 健康分，确认规则可移植为 SQL/图遍历 | 回填 codeflow product-positioning Unknown |
| 固化测量基础设施 | 复用现有 `docs/evidence/` real-corpus gate 流程为脚本 | dead-code/complexity/setup 三 metric 的测量脚本先落地 |
| 测 token 基线 | 复用现有 A/B harness，≥3 语料 × ≥3 次取中位 | 稳定 token 消耗 baseline 报告（不设压缩目标） |
| 测现有 PR 影响基线 | 3 仓 × ≥20 条已合并 PR 回放 | 现有 impact/affected 的 recall 基线入库存档 |

**通过判据**：三条 Unknown 全部回填为 native/absent；6 个 P0/P1 metric 均有可运行测量脚本。
未通过项 → 对应能力从 P0/P1 移除。

---

## 3. P0 — 好用性优先（agent 高频缺口）

> C 的核心修正：P0 应解决「agent 用不顺手」，而非「给人做体检」。
> B 的补充：token 优化测量先行，不对齐无基线的 ~62%。

### P0a — 诊断与接入增强
- **诊断增强**（对齐 CGC job error_type/traceback，但**不重做已够用的 installer**）：聚焦 MCP 初始化失败时的可恢复提示。
  - 验收：`agent 首次成功调用 MCP 工具率 ≥95%`（先测基线；≥5 名新用户干净环境按 README 走查 ≤30min 成功，**不用遥测**，与 100% 本地自洽）。
- **索引进度回调**：确定性事件序列断言。
- **token 输出优化**：基于 P-1 baseline 做 GCF 式压缩，验收 = 「固定探针集上统计显著下降」，**不承诺 ~62%**（B/T：基线不稳时对齐营销数字无意义）。

### P0b — 质量分析（降级 + rubric 先行，非 P0a 同批次）
> B/T 一致：这是 2-4 周级工程，不是「低成本」。C：报告型功能非 agent 高频，可后移。

- **先冻结《死代码判定 rubric v1》**：判定规则清单（注解白名单/框架入口/动态分派处置）+ 语料（现有 5 仓 + ≥1 Spring 仓，固定 commit）+ 每仓 ≥30 条双人独立标注 + 不一致仲裁。
- 首版**只承诺 3-5 主流语言**（TS/JS/Python/Go/Java）+ 已有路由标注的框架入口排除；其余语言精度不承诺。
- 圈复杂度**查询时计算**（A：零 schema 变更，不预计算落库）。
- 验收：标注一致率 ≥85% 且 precision ≥80%（只报 precision，recall 不承诺）；complexity-coverage 按语言分列 ≥90%（分母=status 成功索引文件的 function-kind 节点，附豁免清单）。

---

## 4. P1 — 高价值理解增量（拆三个独立交付物）

> B：P1 准入条件——当前 5 个 release 语料 degraded 文件降到个位数（VS Code sparse 214→<20），否则 PR 影响 ≥85% recall 无测量基础。
> A：新增 NodeKind/EdgeKind 须走 schema 演进条款（见 §6）。

### P1-1 — PR 影响分析（提前到首位，C：agent 改动前刚需）
- **复用现有 `zcodegraph_impact`/`affected` 组合**（O：不新增独立 MCP 工具，避免工具面膨胀 + 长事务 WAL 膨胀）。
- 落地形态：受影响文件 + blast radius；README 健康 SVG Card 作 **CLI/CI 出口**（A：不占 MCP 名额）。
- 验收：同语料同标注流程复测 recall ≥85% 且 ≥ 基线−2pp（允许不回退）。

### P1-2 — 框架语义扩展（**剔除数据源**，C：为覆盖而覆盖）
- 只做 Spring bean/DI（直连现有 14 框架路由优势）；**数据源节点（SQL/Redis）移出默认路径，降级为待验证**。
- 验收：1 个真实 Spring 仓 sufficiency 探针通过。

### P1-3 — 可视化出口（纯数据契约，A 收口）
- **只产出 archify IR JSON**（`zcodegraph export --format archify`），渲染交用户侧——零新依赖零新进程。不 spawn 外部 archify、不打包其代码。
- 必要时移植上游 viewer（同 grammar 高亮）。
- 验收：IR schema 校验通过 + 快照确定性重渲染一致。

---

## 5. P2 — 可选本地混合语义检索（立项前硬验收）

> A/O/C 一致：边界三问未答「是」则不立项，维持默认关闭。

**立项前三问（硬验收，任一答「否」→ 不立项）：**
1. embedding 能否内嵌进 bundle（本机 GGUF/node-llama 类，**而非 Ollama 外部进程**）？
2. 向量索引能否复用同一 SQLite 文件 + 同一 watcher 增量链路（优先 **sqlite-vec**，C 建议）？
3. status 六态是否需第七态 / degraded 子原因？

**量化阈值**（O：用现有 5 语料端到端实测，达标才可并入默认路径）：
- 额外磁盘 ≤ 纯结构索引体积 50%；首次索引时间增幅 ≤ 2×；watch 单文件增量 ≤5s。
- （替代 v1 不可判定的「可接受且默认关闭」。）

---

## 6. 架构不变式机制（A/O 修补，新增）

> 把「保住 SQLite 零配置」从断言变成机制。

- **schema 演进条款**：新增 NodeKind/EdgeKind 或预计算表 → 必须 (a) `migrations.ts` 迁移 + bump `CURRENT_SCHEMA_VERSION`（当前=4），(b) 写明旧 CLI 打开新库的兼容策略，(c) 成本矩阵相应上调。
- **MCP 工具收口**：全项目 MCP 工具 **≤12**；新分析能力**优先折叠进现有工具**（死代码/复杂度作 explore/status 附加输出段），独立新工具须过「agent 已会调用吗」闸门，过不了的做 **CLI 子命令**；健康分/SVG Card/archify 一律 CLI/CI 出口。（依据 `AGENTS.md`：新工具很少被 agent 主动选择。）
- **架构回归红线（每阶段 merge gate，新增 2 条 metric）**：
  - `index-time-regression`：开启全部新能力后同语料索引时间增幅 ≤15%。
  - `explore-latency-regression`：核心 explore 调用 p95 延迟与输出体积增幅红线。
- **能力健康探针**（O）：每能力域定义独立探针（Spring 端点识别数 / archify 桥连通性 / embedding 可用性）纳入 status 扩展输出；doctor bundle 新增 `capabilities.json`（启用状态/最近成功调用/错误计数）；新增 `--upstream-check` 输出 fork 跟踪清单，预警上游冲突。

---

## 7. 修订后 metrics（每条补基线/口径/所有者）

| Metric | 定义 | 基线/口径 | 阈值 | 测量所有者 |
|---|---|---|---|---|
| first-tool-success | agent 首次成功调用 MCP 工具率 | ≥5 新用户走查，无遥测 | ≥95% | P-1 落地脚本 |
| token-output-reduction | 固定探针集输出 token 对比 | P-1 baseline（≥3 语料×≥3 次中位） | 统计显著下降 | P-1 落地脚本 |
| dead-code-precision | rubric 双人标注 precision | 5+1 仓，每仓≥30 条 | 一致率≥85% 且 precision≥80% | rubric v1 文档 |
| complexity-coverage | 圈复杂度可计算函数占比 | 按语言分列，分母=成功索引 function 节点 | ≥90%（附豁免清单） | sqlite 探针脚本 |
| pr-impact-recall | 命中真实受影响文件占比 | P-1 测现有基线，同语料同标注复测 | ≥85% 且 ≥基线−2pp | PR 回放脚本 |
| index-time-regression | 新能力全开后索引时间增幅 | 同语料对比 | ≤15% | merge gate |
| explore-latency-regression | explore p95 延迟/体积增幅 | 同语料对比 | 红线（定值） | merge gate |
| semantic-index-cost | 向量相对结构索引磁盘/时间 | 5 语料实测 | 磁盘≤50%/时间≤2×/增量≤5s | P2 评估报告 |

---

## 8. 状态协议

- **子问题结论：** 能力汇集方向正确但 v1 低估了成本、metrics 不可判定、架构不变式缺机制；v2 以「验证冲刺 P-1 + rubric 先行 + schema/工具收口 + 回归红线 + 立项硬验收」修补后可采纳。
- **沉淀指令：**
  - 改 `research/code-intelligence-landscape/`：本文档为 v2 权威版，v1 标记为「已被 v2 取代」保留参考。
  - 待 P-1 启动时新建 experience-version 级 brief，注入本文 §2 的验证冲刺任务。
  - archify/codeflow 三条 Unknown 在 P-1 回填后更新 ledger。
- **状态协议：** DONE_WITH_CONCERNS（方向收敛、机制补齐；archify/codeflow 实际可行性仍待 P-1 hands-on 验证，语义检索是否立项待 P2 三问裁决）

---

## 附：评审视角来源

| 视角 | 角色 | 隔离方式 | 结论 |
|---|---|---|---|
| B | 技术经理 | 独立 subagent（Read 原文） | 修正：补依赖表/阶段门禁/验证冲刺 |
| C | 产品专家 | 独立 subagent（Read 原文） | 修正：P0 聚焦 agent 高频缺口，剔数据源 |
| A | 架构师 | 独立 subagent（Read 原文） | 修正后采纳：补 schema/工具收口/回归红线 |
| T | 测试·质量 | 独立 subagent（Read 原文） | 修正：metrics 补 ground truth/口径/基线 |
| O | 运维·SRE | 独立 subagent（Read 原文） | 修正：补量化阈值/健康探针/压测验收 |

> 隔离方式说明：本环境为同 provider 多 subagent 并行（各自独立 Agent 会话、独立 Read 原文），
> 满足「同 provider 跨会话」零降级基线；未达「跨 provider」最强隔离，但五视角结构错位、无回声。
