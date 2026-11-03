<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `semantic-retrieval-roadmap.json` | 最后更新: 2026-11-03 17:47:04

[~][X+] 1. 语义检索独立项目：真实基准、效果验证与证据门控集成
    ├── [~][X+] 1-3. 在冻结留出集与大规模真实语料上复验效果和资源
    │   └── [~][X+] 1-3-4. 有界文件重排与新冻结留出集独立验收
    │   ... 该层还有 3 个兄弟，0 个 in_progress ▸
    ... 该层还有 4 个兄弟，0 个 in_progress ▸
<details><summary>阻塞链：2 个节点被阻塞</summary>

- 1-4. 验证 Agent Sufficiency 净收益并审批 opt-in 集成 ← e2: 1-3. 在冻结留出集与大规模真实语料上复验效果和资源 [~], e6: 1-3-4. 有界文件重排与新冻结留出集独立验收 [~]
- 1-5. 证据不足时关闭或保留离线实验而不进入产品 ← e3: 1-3. 在冻结留出集与大规模真实语料上复验效果和资源 [~]

</details>


### 当前施工：1-3-4. 有界文件重排与新冻结留出集独立验收

**决策：**
- Q: scope gate 分类 → Acceptance/evaluation：只跑验收脚本与产出报告，不动 src/，不集成 CLI/MCP。脚本与 fixture 走 scripts/measure/ 与 .tmp/。新留出集冻结由 Human 审阅后再开始评测。
- Q: Q1 候选预注册（v2 §1） → 注册 3 个候选（含当前算法）：C0=chunk-fused-explore（当前，1-3-3-1 报告配置：PascalCase 优先+长度过滤的启发式符号注入）；C1=C0+R1 chunk-score 加权注入（按 chunk-vec 原始 score 降序排序注入符号，替换 PascalCase 启发式）；C2=C0+R3 同文件聚合重排（同文件多 chunk 入 top-8 时按命中数+最高 score 加权提升该文件权重）。固定配置：函数/方法级 chunk、top-8 chunk 检索、至多 5 个注入符号、F1 候选 seeding。所有参数在 development 选择后冻结，新 holdout 上不得调整。
- Q: Q2 v2 留出集构建路径 → B1 增量：v1 5仓60题 原封不动平移为 development（v1 16 题 holdout 也作 development，按 v2 §2 这些题已参与 V3 修复，不再具有独立 holdout 资格），新增 1 个 ≥10k 文件大仓 12 题作 whole-holdout。总计 6 仓 72 题，holdout 占比 12/72=16.7%（低于 v2 §2 ≥25% 要求，需在第 6 仓之外再从其他仓补 holdout 题）。选型 django 待验证 ≥10k 门槛。
- Q: Q3 v2 留出集最终架构（替代 Q2 草案） → 7 仓 84 题：v1 5 仓 60 题原封平移为 development（v1 16 题 holdout 已参与 V3 修复降级为 diagnostic，按 v2 §2 不得再作 v2 holdout）；新增 kubernetes（Go，~20k 文件，作 ≥10k 大仓门 + whole-holdout，12 题）；新增 rails/rails（Ruby，~4k 文件，whole-holdout，12 题）。holdout 24/84=28.6% ✅ 过 v2 §2 ≥25% 门。语言 7 种：Python/JS/Java/Rust/C#/Go/Ruby。
<!-- ROADMAP_SECTION_END -->
