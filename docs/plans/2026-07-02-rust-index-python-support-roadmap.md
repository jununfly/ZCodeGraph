<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-07-02-rust-index-python-support-roadmap.json` | 最后更新: 2026-07-02 21:00:42

[~][X+] 1. 添加 rust-index 对 Python 语言的支持
├── [x][Y+] 1-1. 纳入已完成 Rust Python call refs 基线
├── [x][Y+] 1-2. 补齐 Rust Python import dependency recall
│   ├── [x][Y+] 1-2-1. 锁定 Python from-import 每名称引用契约
│   ├── [x][Y+] 1-2-2. 补齐 Python 模块变量节点供 import 召回
│   └── [x][Y+] 1-2-3. 验证 rust-hybrid Python import 文件依赖召回
└── [ ][Y+] 1-3. 完成 Rust Python 支持全量验证与 closeout

### 当前施工：1. 添加 rust-index 对 Python 语言的支持

**决策：**
- Q: 继续方式是什么？ → 在同一个分支、同一个完整 ZAgenticLoop 中完成目标；不拆成多个 loop。已完成的 Rust Python call refs 提交纳入历史事实，继续补齐 import dependency recall、变量节点、最终验证与 closeout。 (用户明确要求一次对清楚 roadmap，用一个完整 loop 完成工作，以便测试 ZAgenticLoop。)

**当前子树：**
├── [x][Y+] 1-1. 纳入已完成 Rust Python call refs 基线
├── [x][Y+] 1-2. 补齐 Rust Python import dependency recall
│   ... 3 more child nodes; run tree 1-2 --depth 2 for full view
└── [ ][Y+] 1-3. 完成 Rust Python 支持全量验证与 closeout
<!-- ROADMAP_SECTION_END -->
