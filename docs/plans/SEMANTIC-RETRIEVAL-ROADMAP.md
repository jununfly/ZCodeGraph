<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `semantic-retrieval-roadmap.json` | 最后更新: 2026-11-03 18:45:59

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
- Q: Q4 k8s rust-hybrid 索引栈溢出 → k8s 13,731 .go 文件触发 rust core 索引栈溢出（thread 'main' has overflowed its stack）。改用 --engine typescript 重试。这暴露 1-2 主线 Rust core 在大型 Go 仓上的稳定性问题，但不阻塞 1-3-4 验收——acceptance 关心的是查询行为，索引由 typescript engine 兜底是合法路径。
- Q: Q5 Go 栈溢出修复落地 → 采用 Dart/Pascal 同模板：在 lib.rs 7267 行 if language.is_go() 分支套 thread::Builder::stack_size(DART_EXTRACT_STACK_SIZE=128MiB) 大栈 worker。 Box<dyn Error> 在 worker 内 to_string 后 re-box，walker panic 经 resume_unwind 上抛。改动范围：仅 lib.rs Go 分支，~30 行。修复后 cargo build --package zcodegraph-core 并重跑 k8s 索引验证。typescript fallback 索引（20247 files）保留作对照。
- Q: Q6 Go 大栈修复验证通过 → k8s rust-hybrid 索引成功：24,429 files / 483,541 nodes / 779,307 edges，全程无栈溢出。修复闭合。与 TS fallback 对照（20,247 files / 273,428 nodes）rust core 节点粒度更细、resolver 边更精准。1-3-4 大仓门验收使用 rust-hybrid 真实数据。
- Q: Q7 v2 冻结完成 → v2 frozen artifact docs/baselines/semantic-retrieval-human-frozen-v2.json 已生成：84 queries（v1 60 development + rails 12 holdout + k8s 12 holdout），holdout fraction 28.6% ✅，7 corpora / 7 languages，kubernetes 24,429 files 满足大仓门。Human reviewer=victo，reviewedAt=2026-11-03T10:45:01Z，rankingsShown=false，independentOfTuning=true。候选 hash：v1=994fde36, rails=c64579b4, k8s=b9efa975。按 v2 §2 冻结后不得修改。
<!-- ROADMAP_SECTION_END -->
