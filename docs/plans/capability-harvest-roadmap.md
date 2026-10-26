<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-26 17:37:59

[~][X+] 1. ZCodeGraph 能力汇集路线图
    └── [~][X+] 1-4. P2 可选本地混合语义检索
        ├── [~][X+] 1-4-28. P2 异步嵌入管线 - 硬底盘（schema v6 + queue + taxonomy）
        ... 该层还有 4 个兄弟，0 个 in_progress ▸
    ... 该层还有 3 个兄弟，0 个 in_progress ▸

### 当前施工：1-4-28. P2 异步嵌入管线 - 硬底盘（schema v6 + queue + taxonomy）

切分自原 1-4-28 广义骨架：本节点只做 schema/queue/taxonomy 硬底盘，运行时 worker + 三触发点 + CLI flag 拆到 1-4-29。决策：worker 不内嵌 fastembed 依赖（懒探测），read-repair 挂 zcodegraph_search 不新增工具。

**决策：**
- Q: 范围与交付切分？ → 本节点（1-4-28）只做落地骨架：schema/queue/worker/三触发点接入/fallback 扩展，并配 e2e 测试。后续节点（1-4-29+）再做回归基准三件套（D6）+ CLI flag 文档 + benchmarks 文档。整个 P2 嵌入链不阻塞 index 主路径，全部走 ADR-0009 D1-D5 既定方案。
- Q: fastembed 依赖策略？ → 主 package.json 不引入 fastembed/onnxruntime-node；worker 用 try-require 懒探测，缺失则队列项标 pending 不报错（对应 ADR-0009 Failure Modes 表第一行 embedding-model-not-downloaded）。1-4-2 spike 已验证 .tmp/embedding-baseline/ 独立安装路径可用。
- Q: semantic_search 工具策略？ → 本节点不新增 zcodegraph_semantic_search 工具；read-repair 副作用后续挂在既有 zcodegraph_search 上（zero new tool surface，符合 schema-evolution-and-mcp-tool-cap-v1 Clause 2）。语义检索独立工具留到 1-4-29+ 再评估。

### 下一步可开工（ready 前 3）

- 1-4-29. P2 异步嵌入管线 - 运行时（worker + watcher 钩子 + read-repair + CLI flag） [ ]
<!-- ROADMAP_SECTION_END -->
