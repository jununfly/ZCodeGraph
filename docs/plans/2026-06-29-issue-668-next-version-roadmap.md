<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-29-issue-668-next-version-roadmap.json` | 最后更新: 2026-06-29 22:34:14

[~][Y+] 1. Issue #668 下个版本产品路线图
├── [~][X+] 1-1. Dogfood and release channel isolation
│   ├── [x][X+] 1-1-1. Explicit development dogfood command
│   ├── [x][Y+] 1-1-2. Legacy global dev shim migration
│   ├── [ ][Y+] 1-1-3. Repository automation uses zcodegraph-dev channel
│   └── [ ][Y+] 1-1-4. Dogfood channel tests and release notes
├── [ ][X+] 1-2. Stable non-interactive command output
├── [ ][X+] 1-3. Doctor bundle compact diagnostic summary
└── [ ][X+] 1-4. Degraded fallback health first-screen explanation

### 当前施工：1-1. Dogfood and release channel isolation

Reframed from generic broken install recovery. The core UX is one maintainer machine using dev ZCodeGraph inside this repo while expecting release ZCodeGraph in other projects; the global zcodegraph command must not silently drift between channels or strand stale source-checkout shims.

**决策：**
- Q: Broken launcher 怎么产品化恢复？ → 把它定义成 shell-level install health/repair 问题：新版 CLI 的 uninstall 只能清 agent 配置，无法修复一个根本启动不了的 stale PATH shim。 (候选实现可以是 install.sh/README/troubleshooting 加 zcodegraph doctor install when reachable；但真正覆盖用户场景需要一条不依赖旧 zcodegraph 可执行文件能工作的恢复命令。)
- Q: Broken install state 的真实使用场景是什么？ → 这是 maintainer/dogfood dual-channel 问题：同一台机器既要在 ZCodeGraph 仓库里 dogfood 开发版，又要在其他项目里使用 release 版，单一全局 zcodegraph launcher 容易被 dev checkout 污染或遗留。 (Human clarified. 不能把它只设计成普通用户 stale shim cleanup；应区分 dev dogfood channel 与 release channel。)
- Q: 开发版 dogfood 是否允许覆盖全局 zcodegraph 命令？ → 不允许。全局 zcodegraph 命令名保留给 release/installed channel；开发版 dogfood 必须走显式 dev channel。 (Human confirmed. 这避免 dev checkout 泄漏到其他项目，也避免 checkout 删除后主命令变成 stale shim。)
- Q: P0 如何拆成可执行任务？ → 按四条线拆：dev-link 新通道、local-install 迁移、旧 zcodegraph repair 防护、仓库自动化与文档迁移。 (每条任务都应能独立验证，且共同维护 channel invariant：zcodegraph=release，zcodegraph-dev=source dogfood。)

**当前子树：**
├── [x][X+] 1-1-1. Explicit development dogfood command
│   ... 3 more child nodes; run tree 1-1-1 --depth 2 for full view
├── [x][Y+] 1-1-2. Legacy global dev shim migration
│   ... 2 more child nodes; run tree 1-1-2 --depth 2 for full view
├── [ ][Y+] 1-1-3. Repository automation uses zcodegraph-dev channel
└── [ ][Y+] 1-1-4. Dogfood channel tests and release notes
<!-- ROADMAP_SECTION_END -->
