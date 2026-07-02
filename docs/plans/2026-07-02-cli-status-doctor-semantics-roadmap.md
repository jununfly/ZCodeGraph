<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-07-02-cli-status-doctor-semantics-roadmap.json` | 最后更新: 2026-07-02 18:17:33

[~][X+] 1. CLI/status/doctor 语义统一
├── [x][X+] 1-1. 统一诊断语义契约
│   └── [x][Y+] 1-1-1. 健康状态分类模型
├── [ ][X+] 1-2. 状态命令用户体验收敛
│   └── [ ][Y+] 1-2-1. status命令信任摘要输出
├── [ ][X+] 1-3. doctor命令诊断入口收敛
│   ├── [ ][X+] 1-3-1. doctor命令来源选择提示
│   └── [ ][X+] 1-3-2. corrupted诊断bundle后续版本
├── [ ][X+] 1-4. 本地验证与公开文档同步
│   └── [ ][X+] 1-4-1. 公开文档健康词汇同步
└── [ ][X+] 1-5. 过程决策收束与closeout

### 当前施工：1. CLI/status/doctor 语义统一

**决策：**
- Q: 是否采用 Roadmap-Sliced Development Pattern？ → 采用 L1→L2 节奏：先建立 roadmap 和语义边界，再按叶子节点执行切片；每个叶子必须有 verification gate 与 commit intent。 (目标触达 CLI/status/doctor 用户心智、测试和公开文档，满足 pattern entry criteria。)
- Q: 是否创建专用 roadmap 分支？ → 已创建 codex/cli-status-doctor-semantics。 (非平凡 roadmap 必须使用专用分支；当前分支承载本次 initiative。)
- Q: 本次 ZAgenticLoop 是否连续执行直到 roadmap 完成？ → 采用连续执行约束：按叶子节点一刀一提交持续推进；遇到 Human Gate、scope expansion、失败 gate、需要删除/发布/merge 时停下来问 Human。 (Human Gate 已确认：先添加这个运行约束并实践。该约束适用于本 roadmap 当前分支 codex/cli-status-doctor-semantics。)

**当前子树：**
├── [x][X+] 1-1. 统一诊断语义契约
│   ... 1 more child nodes; run tree 1-1 --depth 2 for full view
├── [ ][X+] 1-2. 状态命令用户体验收敛
│   ... 1 more child nodes; run tree 1-2 --depth 2 for full view
├── [ ][X+] 1-3. doctor命令诊断入口收敛
│   ... 2 more child nodes; run tree 1-3 --depth 2 for full view
├── [ ][X+] 1-4. 本地验证与公开文档同步
│   ... 1 more child nodes; run tree 1-4 --depth 2 for full view
└── [ ][X+] 1-5. 过程决策收束与closeout
<!-- ROADMAP_SECTION_END -->
