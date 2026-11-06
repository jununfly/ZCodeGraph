# 真机 A/B 评估方法论选型 — 证据调研与决策备忘录

> **历史草案，已被正式报告取代（2026-11-05）。** 本文保留早期推理过程，不作为当前统计协议依据。现行版本为 [ZRA-Paired v1 正式报告（链接校订版 v2）](2026-11-05-methodology-report-v2.md)，其 [Report IR](report-ir.json)、[证据映射](cited-findings.json) 与 [发布 receipt](2026-11-05-receipt-v2.json) 一并保留。关键修订：按任务簇推断、主检验改为配对随机化、A/C/S 平衡顺序，S 仅诊断排序价值；正式 N 与成本须由试点标定。原 v1 编译产物仅作发布审计留档，本地链接为修订前口径，不作为现行依据。

- 日期：2026-11-05
- 触发：ADR-0014 D2 批准 C 进真机 A/B 后，发现"真机 A/B 骨架"是拍脑袋想法，需先证实评估方法论本身
- 决策框架：`research/agent-eval-methodology/technical-decision-brief.json`
- 生命周期阶段：usefulness-validation
- 证据：5 轮 WebSearch（论文 + 工业实践）+ sealed-ledger 采集（`ledger-response.json`，GitHub harness 适配性辅助证据）

## 0. 核心结论（先行）

**没有完全对口的现成方法可原生复用，必须定制——但定制的方法论骨架应直接借用三个成熟范式：**

1. **τ-bench 的 `pass^k` 一致性度量** —— 替代/补充"配对 bootstrap"，因为它天然刻画 agent 运行随机性，而 ZCodeGraph 真机是随机 agent。
2. **tool-ablation 的 `w/o retriever` 对照** —— 这是度量"检索工具价值"的学界标准做法，正是 C on/off 需要的对照臂。
3. **配对统计 + 污染控制**（paired bootstrap/McNemar + freshness 公理）—— 决定样本量与显著性判定，直接命中本仓 n=24 功效不足、v3 已冻结的痛点。

**一句话**：本仓要建的不是"又一个 agent benchmark"，而是一个**单变量（检索实现）的配对消融实验**，其严谨性骨架借自 τ-bench + 检索评估统计文献 + 污染控制实践，执行面复用现有 `scripts/agent-eval/itrun.sh`。

## 1. 方法论谱系（证据 → 适用性）

### 1.1 τ-bench / τ²-bench（Sierra）—— 最贴合的范式

**证据**（qaskills.sh / callsphere.ai / llmindex.net / arXiv:2406.12045 / 2506.07982）：
- 终态评估（final database state vs goal），不靠 grading 对话 —— rule-based，客观。
- 每任务 ≥3 trials，主指标 `pass^k` = 同一任务 k 次独立运行**全部**成功的比例。
- `pass^k` vs `pass@k`：pass@k 随 k 升到 1（奖励 best-case），pass^k 随 k 降到 0（暴露脆弱性）。**agent 一致性才是生产相关指标**。
- 固定 user-simulator 跨对照（"keep this fixed across comparisons so the agent is the only variable"）。
- τ² 加 NL-assertions 用独立 LLM judge，但**终态判定仍 rule-based**。
- 实操：40-80 任务/域，k=4 或 8，成本 = 任务×k×臂数 次完整 agent 运行。

**对本仓适用性**：★★★★★
- 直接借用 `pass^k` 思想：本仓真机是随机 agent（交互式 Claude Code），单次运行不可复现，**必须多 trial**。
- "agent 是唯一变量"原则 → 本仓"检索实现是唯一变量"。
- **改造点**：τ-bench 测"agent 能否完成任务"，本仓测"检索工具让 agent 少 fallback"。终点不同（τ=终态正确，本仓=fallback 减少），但**多 trial + 固定其余变量 + rule-based 终态**的骨架直接可用。

### 1.2 tool-ablation 范式（SCIAGENT / LongDA / RAMAR）—— 对照臂设计

**证据**（openreview / arXiv:2601.02598 / springer）：
- 标准做法：`w/o retriever`（移除检索）作为消融臂，度量检索模块贡献。
- LongDA：移除 search_doc → GPT-5 coverage 91→80（检索工具价值可量化）。
- RAMAR：`w/o Ret.` 性能掉最多，证明"接地外部知识是最关键功能"。

**对本仓适用性**：★★★★★
- 这正是 ADR-0014 D2 要的"C on/off 对照"。本仓 C 臂 = symbol-union 检索，baseline 臂 = 现 plan()，**天然就是一对检索消融**。
- **改造点**：学界 ablation 通常"有工具 vs 无工具"，本仓是"检索算法 A vs 检索算法 B"（更细粒度），对照逻辑同构。

### 1.3 检索评估统计严谨性（zeroentropy / RAG-CI / aimultiple）—— 显著性判定

**证据**（zeroentropy.dev / iotdigitaltwinplm.com / aimultiple.com）：
- **配对检验 > 比较两个 CI**：同任务两系统分数相关（难题对两者都难），配对 per-task delta 保留配对功效。
- **paired bootstrap / paired permutation**（重采样任务，重算 delta 均值，CI 排除 0 = 显著）；二值 hit@k 用 **McNemar**（discordant pairs）。
- **预注册单一主指标**，其余为诊断；多指标/多分段需 **Bonferroni/Holm 校正**。
- **样本量**：NDCG 差 0.01-0.02 需 ~500-1000 查询；差 0.005 需 5000+。**小样本单数据集结论通常功效不足**。
- **run-to-run noise floor**：同配置多跑几个 seed，效应须超过该下限才算真。
- **效应量 vs p 值**：显著但 0.001 的提升不可发布；要知道 p 也要知道效应量。

**对本仓适用性**：★★★★★（直接命中痛点）
- 本仓 v3 只有 24 题 → **统计功效严重不足**，真机必须扩样。
- ADR-0014 D2 已锁"配对 bootstrap 区间跨 0 判 inconclusive" —— 与文献一致。
- **改造点**：本仓终点是"fallback 调用次数"（计数）而非 NDCG，配对检验用 per-task fallback delta；若终点二值化（任务是否仍需 fallback）则用 McNemar。

### 1.4 Adaptive-Retrieval 混淆（emergentmind 2602.07213）—— 必须内建的混淆控制

**证据**：检索的增益可能主要来自"检索触发的反思"而非"检索内容本身"。该文发现：agent 选择**不**检索时准确率反而最高（+2.1pp/+19.5pp），增益来自"可选择检索"引发的自反思，而非检索内容。作者承认未能实验区分这两个混淆。

**对本仓适用性**：★★★★☆（关键风险）
- 本仓若测得"C 减少 fallback"，**必须排除"是 C 的内容好，还是 C 的存在改变了 agent 行为"**。
- **改造点**：需一个对照——比如给 agent 一个**故意打乱的检索结果**（shuffled/oracle-irrelevant），若 fallback 仍减少，则增益来自"有检索动作"而非"检索内容质量"。这是文献未能解决的问题，本仓应内建此对照以超越。

### 1.5 污染控制 / freshness 公理（SWE-bench-Verified / vibeagentmaking）

**证据**：分数只在"测试对被测者新鲜"时反映能力。三种实现：held-out（私有题集）、timestamped-after（时序新题）、independently-produced（独立第三方）。SWE-bench Verified 实测 10.6% 泄漏率；EvoEval 改写后掉 19-47pp。

**对本仓适用性**：★★★★★
- v3 已永久冻结（已看过结论）→ 真机任务集**必须全新**。
- **改造点**：真机任务集应满足 freshness 公理——新标注、未参与调参者审阅、独立于 v3。

## 2. 候选方法对比（constraint → option → evidence → tradeoff → decision）

| 候选 | 解决什么 | 证据强度 | 语义错配 | 判定 |
|---|---|---|---|---|
| **原生复用 SWE-bench** | agent 修 bug 能力 | native（终态/harness 完整） | 测"修 bug"非"检索价值"；终点是 patch 正确 | ❌ 拒绝：终点不符 |
| **原生复用 τ-bench** | 工具+policy 遵循 | native（pass^k/终态/trials） | 测"任务完成"非"fallback 减少"；需改终点 | 🔶 借骨架：pass^k + 固定变量 + rule-based |
| **原生复用 AgentBench/ToolBench** | 多环境 agent 能力 | native（环境丰富） | 测通用 agent 能力，过重，非检索消融 | ❌ 拒绝：粒度过粗 |
| **tool-ablation 对照** | 检索贡献度量 | native（学界标准） | 无——正是检索 on/off | ✅ 采用：作为对照臂设计 |
| **配对统计协议** | 显著性判定 | native（IR 文献标准） | 无 | ✅ 采用：paired bootstrap/McNemar + 功效分析 |
| **本仓定制（推荐）** | 单变量检索消融 + 上述骨架 | adapted | 终点=fallback 减少（本仓特有） | ✅ **定制，骨架借 1.1-1.5** |

## 3. 推荐方法论：ZCodeGraph 检索价值配对消融协议（ZRA-Paired v1 草案）

**设计**：单变量（检索实现）× 多 trial × 配对统计 × 污染控制 × 混淆控制。

### 3.1 臂（arms）
- **A = baseline**：现 `plan()`（环境变量默认）。
- **C = symbol-union**：C 检索（`ZCG_RETRIEVAL_ARM=symbol-union` opt-in，默认 OFF）。
- **S = shuffled-control（混淆控制，新增）**：C 的候选文件集**随机打乱**后喂给 agent。若 S 也减少 fallback → 增益来自"有检索动作"而非"内容质量"，C 的内容价值存疑。

### 3.2 终点（预注册单一主指标）
- **主终点**：经审计的**恢复性 Read/Grep fallback 次数**（per-task，复用 ZJ-CONTEXT.md 与 baseline-agent-sufficiency-v1 的 fallback vs legitimate-deepening 分类）。
- **辅助终点**：任务是否仍需 fallback（二值，供 McNemar）、答案正确性（不回退门）、工具调用数/token/耗时（诊断）。
- **正确性安全门**：答案正确性不回退；精确名零 Hit@1 回退。

### 3.3 配对与多 trial
- 配对单元：**task × repetition**，两臂在**同任务同 repetition** 下运行，交错臂序（ABBA 抵消顺序效应）。
- 每任务 **k≥4 trials**（借 τ-bench pass^k 思想），主报 **fallback 减少的配对分布**，辅报 **fallback-free 的 pass^k 式一致性**（任务在 k 次中全部无需 fallback 的比例）。

### 3.4 统计
- 主：per-task fallback delta 的 **paired bootstrap**（10000 重采样，95% CI，排除 0 = 显著有益）。
- 辅：fallback-free 二值结局的 **McNemar**（discordant pairs，Holm 校正）。
- **run-to-run noise floor**：同配置多 seed，效应须超此下限。
- 效应量与 p 值同报；多分段做 Holm 校正。

### 3.5 样本量（功效分析，非拍脑袋）
- 先用现有 itrun.sh 跑 **5-8 个试点任务 × k=4** 估 fallback 方差与 run-to-run noise。
- 按目标 MDE（建议：**每任务平均 fallback 减少 ≥1.5 次**，或 **fallback-free 任务占比提升 ≥20pp**）反推 N。
- 文献基准：小效应需 n≥80-150；本仓终点是计数（方差可能更大），**初判 N≥40 任务 × k=4**（=160 配对观测/臂），试点后修正。

### 3.6 污染控制（freshness 公理）
- 任务集**全新标注**，独立于 v3 24 题；未参与 1-7 调参者审阅；无排名条件下定稿。
- 仓选择：含 rails/k8s（C 的难点战场）+ 代表性普通仓，**整仓留出**原则沿用。

### 3.7 执行面
- 复用 `scripts/agent-eval/itrun.sh`（交互式 tmux + Claude Code + MCP），**不用 headless print-mode**（会驱动不同 subagent）。
- C 接线：`plan()` 加 `ZCG_RETRIEVAL_ARM` 环境变量开关（默认 OFF），运行时切臂，保证"唯一变量是检索实现"。

## 4. 风险登记（risk register）

| 风险 | 触发 | 影响 | 缓解机制 | 残余风险 | 负责人 |
|---|---|---|---|---|---|
| 样本量不足→inconclusive | N 太小或方差大 | 真机白跑 | 试点估方差后按 MDE 反推 N；预注册功效 | 中 | 评估设计者 |
| fallback 分类主观 | 审计员判断 deepening vs fallback 不一致 | 主终点噪音 | 复用 v1 分类 + 双人独立审计 + 不一致仲裁 | 中 | 审计员 |
| 反思混淆 | C 减少 fallback 是因"有检索"非"内容好" | 误判 C 价值 | shuffled-control 臂 S 对照 | 中高 | 评估设计者 |
| 元泄漏 | 任务集与 v3 重叠或调参者标注 | 结论失效 | freshness 公理 + 独立审阅 + 显式披露 | 低 | 标注负责人 |
| C 接线污染 | env 切换改变 agent 工具面 | 违反单变量 | 运行时 env 开关，工具面/接口不变 | 低 | 实现者 |
| 成本爆炸 | N×k×臂数 交互运行 | 预算超支 | 试点后定 N；先小后大；预算上限预注册 | 中 | 评估设计者 |

## 5. 决策与下一步

**决策**：采用**本仓定制的配对消融协议 ZRA-Paired v1**，骨架借自 τ-bench（pass^k/固定变量/rule-based 终态）、tool-ablation（检索 on/off 对照）、检索统计文献（paired bootstrap/McNemar/功效分析）、Adaptive-Retrieval（shuffled-control 混淆控制）、污染控制（freshness 公理）。**不原生复用任何现成 benchmark。**

**这是一个真 tradeoff 的决策**（定制 vs 复用、单终点 vs 多终点、配对 bootstrap vs pass^k），且难逆转（协议一旦跑起来，改协议=作废已跑数据）、无上下文会困惑（为什么不直接用 SWE-bench）——**值得立 ADR**（建议 ZJ-0015）。

**下一步**：
1. 把 ZRA-Paired v1 写成正式 ADR（ZJ-0015），含上述风险登记与协议全文。
2. C 接线：实现 `ZCG_RETRIEVAL_ARM` 环境变量开关（这是真机跑起来的前置）。
3. 试点：5-8 任务 × k=4 跑起来，估 fallback 方差 → 定终值 N。
4. 任务集标注（freshness + 独立审阅）。

## 6. 诚实声明（信息缺口）

- sealed-ledger（GitHub 采集）对方法论统计严谨性覆盖不足（topicMatch=0、significance 多 unknown），本备忘录的核心统计/配对/混淆证据来自 **WebSearch 的论文与工业实践**，非 sealed-ledger。sealed-ledger 仅用作 harness 适配性辅助证据。
- 信息缺口状态：**has-gaps** —— (a) 各候选的精确成本未量化（依赖试点）；(b) shuffled-control 是文献未解决的混淆，本仓方案是设计推断而非已验证；(c) 终值 N 未由试点标定。这些在 §4 风险与 §5 下一步中显式列出。
