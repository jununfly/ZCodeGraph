<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-20 14:59:28

[~][X+] 1. ZCodeGraph 能力汇集路线图
├── [ ][X+] 1-1. P-1 验证冲刺（先行 gate）
│   ├── [x][X+] 1-1-1. P-1 自研可视化引擎首版（zcodegraph visualize）
│   ├── [x][X+] 1-1-2. P-1 对照 codeflow 自研 PR 影响 blast radius
│   ├── [x][X+] 1-1-3. 固化测量基础设施脚本
│   ├── [x][X+] 1-1-4. 测 token 消耗稳定 baseline
│   ├── [!][X+] 1-1-5. 测现有 PR 影响 recall 基线
│   ├── [x][X+] 1-1-6. P-1 对照 codeflow 自研 A-F 健康分（health rubric v1）
│   ├── [ ][X+] 1-1-7. P-1 对照 codeflow 自研 churn 热图（git history 驱动）
│   └── [ ][X+] 1-1-8. P-1 对照 codeflow 自研 README SVG Card（CI 出口）
├── [!][X+] 1-2. P0 好用性优先（agent 高频缺口）
│   ├── [ ][X+] 1-2-1. P0a 诊断增强（MCP 初始化失败可恢复提示）
│   ├── [ ][X+] 1-2-2. P0a 索引进度回调
│   ├── [ ][X+] 1-2-3. P0a token 输出优化（GCF 式压缩）
│   ├── [ ][X+] 1-2-4. P0b 冻结《死代码判定 rubric v1》
│   ├── [!][X+] 1-2-5. P0b find_dead_code 首版（限 3-5 语言）
│   ├── [!][X+] 1-2-6. P0b 圈复杂度（查询时计算，零 schema 变更）
│   ├── [ ][X+] 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12
│   ├── [ ][X+] 1-2-8. 横切：架构回归红线 + 能力健康探针
│   └── [ ][X+] 1-2-9. P0a 索引范围配置：默认排除 .workbuddy/ 等 agent 工作目录
├── [!][X+] 1-3. P1 高价值理解增量
│   ├── [!][X+] 1-3-1. P1 准入：图质量门禁（degraded 降个位数）
│   ├── [!][X+] 1-3-2. P1-1 PR 影响分析（复用 impact/affected）
│   ├── [!][X+] 1-3-3. P1-2 Spring bean/DI 语义扩展（剔除数据源）
│   ├── [ ][X+] 1-3-5. P1-3 可视化多视图（模块/类/函数层）
│   └── [ ][X+] 1-3-6. P1-4 可视化时间演化动画（git history）
└── [!][X+] 1-4. P2 可选本地混合语义检索
    ├── [ ][X+] 1-4-1. P2 立项前三问硬验收
    └── [!][X+] 1-4-2. P2 量化阈值实测（5 语料端到端）
<details><summary>阻塞链：10 个节点被阻塞</summary>

- 1-1-5. 测现有 PR 影响 recall 基线 ← e17: 1-2-9. P0a 索引范围配置：默认排除 .workbuddy/ 等 agent 工作目录 [ ]
- 1-2. P0 好用性优先（agent 高频缺口） ← e1: 1-1. P-1 验证冲刺（先行 gate） [ ]
- 1-2-5. P0b find_dead_code 首版（限 3-5 语言） ← e4: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e7: 1-2-4. P0b 冻结《死代码判定 rubric v1》 [ ]
- 1-2-6. P0b 圈复杂度（查询时计算，零 schema 变更） ← e5: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ]
- 1-3. P1 高价值理解增量 ← e2: 1-1. P-1 验证冲刺（先行 gate） [ ]
- ... 另有 5 个节点被阻塞未列出

</details>


### 下一步可开工（ready 前 3）

- 1-1. P-1 验证冲刺（先行 gate） [ ]
- 1-1-7. P-1 对照 codeflow 自研 churn 热图（git history 驱动） [ ]
- 1-1-8. P-1 对照 codeflow 自研 README SVG Card（CI 出口） [ ]
<!-- ROADMAP_SECTION_END -->
