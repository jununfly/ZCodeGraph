<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-29-issue-668-next-version-roadmap.json` | 最后更新: 2026-06-29 22:59:11

[~][Y+] 1. Issue #668 下个版本产品路线图
├── [x][X+] 1-1. Dogfood and release channel isolation
│   ├── [x][X+] 1-1-1. Explicit development dogfood command
│   ├── [x][Y+] 1-1-2. Legacy global dev shim migration
│   ├── [x][Y+] 1-1-3. Repository automation uses zcodegraph-dev channel
│   └── [x][Y+] 1-1-4. Dogfood channel tests and release notes
├── [ ][X+] 1-2. Stable non-interactive command output
├── [ ][Y+] 1-3. Doctor bundle compact diagnostic summary
└── [~][Y+] 1-4. Degraded fallback health first-screen explanation
    ├── [x][Y+] 1-4-1. Fallback summary data contract
    ├── [x][Y+] 1-4-2. Init and index degraded health message
    └── [ ][Y+] 1-4-3. Fallback health regression coverage

### 当前施工：1-4. Degraded fallback health first-screen explanation

P1 first. Goal: make degraded rust-hybrid fallback health explain itself on the first screen after init/index: graph usability, fallback count, top reason categories, representative safe examples if available, and next action.

**当前子树：**
├── [x][Y+] 1-4-1. Fallback summary data contract
├── [x][Y+] 1-4-2. Init and index degraded health message
└── [ ][Y+] 1-4-3. Fallback health regression coverage
<!-- ROADMAP_SECTION_END -->
