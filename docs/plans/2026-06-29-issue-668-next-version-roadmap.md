<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-29-issue-668-next-version-roadmap.json` | 最后更新: 2026-06-29 22:43:00

[~][Y+] 1. Issue #668 下个版本产品路线图
├── [x][X+] 1-1. Dogfood and release channel isolation
│   ├── [x][X+] 1-1-1. Explicit development dogfood command
│   ├── [x][Y+] 1-1-2. Legacy global dev shim migration
│   ├── [x][Y+] 1-1-3. Repository automation uses zcodegraph-dev channel
│   └── [x][Y+] 1-1-4. Dogfood channel tests and release notes
├── [ ][X+] 1-2. Stable non-interactive command output
├── [ ][X+] 1-3. Doctor bundle compact diagnostic summary
└── [ ][X+] 1-4. Degraded fallback health first-screen explanation

### 当前施工：1. Issue #668 下个版本产品路线图

Confirmed scope: next version is a Recovery + Explainability patch release. Exclude new language/framework semantic coverage unless needed to support diagnostics UX.

**决策：**
- Q: 下个版本主题应该围绕什么？ → 优先做 first-run recovery and diagnostics polish，而不是继续扩大语言/框架语义覆盖。 (#668 是 2026-06-29 0.10.1 之后的真实用户反馈；价值链断在恢复、解释、机器可读输出，而不是图本身不可用。)
- Q: 下个版本是否定为 Recovery + Explainability patch release？ → 要。下个版本聚焦安装恢复、稳定输出、降级解释、doctor 摘要，不塞新的语言/框架语义覆盖能力。 (Human confirmed. 版本叙事应围绕 first-run trust：命令能恢复、日志能读、降级能解释、bundle 能行动。)

**当前子树：**
├── [x][X+] 1-1. Dogfood and release channel isolation
│   ... 4 more child nodes; run tree 1-1 --depth 2 for full view
├── [ ][X+] 1-2. Stable non-interactive command output
├── [ ][X+] 1-3. Doctor bundle compact diagnostic summary
└── [ ][X+] 1-4. Degraded fallback health first-screen explanation
<!-- ROADMAP_SECTION_END -->
