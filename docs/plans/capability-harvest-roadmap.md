<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-19 20:34:08

[~][X+] 1. ZCodeGraph 能力汇集路线图
    ├── [ ][X+] 1-1. P-1 验证冲刺（先行 gate）
    │   ├── [~][X+] 1-1-1. P-1 自研可视化引擎首版（zcodegraph visualize）
    │   ... 该层还有 4 个兄弟，0 个 in_progress ▸
    ... 该层还有 3 个兄弟，0 个 in_progress ▸
<details><summary>阻塞链：11 个节点被阻塞</summary>

- 1-2. P0 好用性优先（agent 高频缺口） ← e1: 1-1. P-1 验证冲刺（先行 gate） [ ]
- 1-2-5. P0b find_dead_code 首版（限 3-5 语言） ← e4: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e7: 1-2-4. P0b 冻结《死代码判定 rubric v1》 [ ]
- 1-2-6. P0b 圈复杂度（查询时计算，零 schema 变更） ← e5: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ]
- 1-3. P1 高价值理解增量 ← e2: 1-1. P-1 验证冲刺（先行 gate） [ ]
- 1-3-1. P1 准入：图质量门禁（degraded 降个位数） ← e11: 1-2-8. 横切：架构回归红线 + 能力健康探针 [ ]
- ... 另有 6 个节点被阻塞未列出

</details>


### 当前施工：1-1-1. P-1 自研可视化引擎首版（zcodegraph visualize）

**决策：**
- Q: 为什么推翻 archify 集成复用、改为 ZCodeGraph 自研可视化引擎？ → 用户 2026-10-19 裁决：archify 定位由'集成复用'改为'自研等效'。理由：(1) archify 本体 85k stars 但为外部进程，与 ZG'零外部依赖、本地内嵌'哲学存在根本张力；(2) 用户对可视化的真实诉求是'zcodegraph visualize 一条命令出 HTML'，而非'ZG 出 IR、archify 渲染'的两段式链路；(3) Cytoscape.js 单文件可内嵌，离线零外部进程，与 SQLite 内嵌零配置一致。 (用户 2026-10-19 A2 裁决；推翻 1-3-4 节点原有'archify 纯数据契约'决策；技术选型 Cytoscape.js)
- Q: visualize 数据源、依赖内嵌、默认范围、CLI 命名如何选？ → (1) 数据源：直接 better-sqlite3 读 .zcodegraph/*.db——与现有 CLI（query/files/context）一致，不经过 CodeGraph API 层，快照快且解耦。(2) 依赖内嵌：npm i cytoscape，build 时 copy 进 dist/assets/，生成 HTML 时读文件内容塞进 <script>，与 schema.sql/*.wasm 同套路，产物单文件离线可用。(3) 默认范围：只画 file 节点 + 跨文件 contains 边，加 --depth file|class|function 参数下钻，避免 10w+ 节点卡死浏览器。(4) CLI 名：zcodegraph visualize，与节点 label 一致，与 query/files/context/affected 同风格。 (用户 2026-10-19 裁决 4 项；后续 1-3-5/1-3-6 在此切片上扩展)

### 下一步可开工（ready 前 3）

- 1-1. P-1 验证冲刺（先行 gate） [ ]
- 1-1-2. codeflow hands-on 验证并回填 Unknown [ ]
- 1-1-3. 固化测量基础设施脚本 [ ]
<!-- ROADMAP_SECTION_END -->
