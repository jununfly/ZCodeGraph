<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `issue-679-malformed-recovery.json` | 最后更新: 2026-07-13 23:19:04

[~][X+] 1. Issue #679: MCP SQLite stale connection recovery (lazy detection)
├── [x][Y+] 1-1. 添加 SQLite 损坏错误检测工具函数
├── [x][Y+] 1-2. CodeGraph 添加 reopen() 公开方法关闭旧连接并重建内部对象
├── [x][Y+] 1-3. ToolHandler.execute 添加惰性恢复与一次性重试逻辑
├── [x][Y+] 1-4. TDD 测试验证 malformed 错误触发恢复与重试
└── [~][X+] 1-5. 端到端验证与 PR 提交

### 当前施工：1-5. 端到端验证与 PR 提交
<!-- ROADMAP_SECTION_END -->
