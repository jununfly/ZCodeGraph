<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-20 18:57:05

[~][X+] 1. ZCodeGraph 能力汇集路线图
    ├── [ ][X+] 1-2. P0 好用性优先（agent 高频缺口）
    │   ├── [~][X+] 1-2-1. P0a 诊断增强（MCP 初始化失败可恢复提示）
    │   ... 该层还有 8 个兄弟，0 个 in_progress ▸
    ... 该层还有 3 个兄弟，0 个 in_progress ▸
<details><summary>阻塞链：6 个节点被阻塞</summary>

- 1-2-5. P0b find_dead_code 首版（限 3-5 语言） ← e4: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e7: 1-2-4. P0b 冻结《死代码判定 rubric v1》 [ ]
- 1-2-6. P0b 圈复杂度（查询时计算，零 schema 变更） ← e5: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ]
- 1-3-1. P1 准入：图质量门禁（degraded 降个位数） ← e11: 1-2-8. 横切：架构回归红线 + 能力健康探针 [ ]
- 1-3-2. P1-1 PR 影响分析（复用 impact/affected） ← e8: 1-3-1. P1 准入：图质量门禁（degraded 降个位数） [ ]
- 1-3-3. P1-2 Spring bean/DI 语义扩展（剔除数据源） ← e6: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e9: 1-3-1. P1 准入：图质量门禁（degraded 降个位数） [ ]
- ... 另有 1 个节点被阻塞未列出

</details>


### 当前施工：1-2-1. P0a 诊断增强（MCP 初始化失败可恢复提示）

**决策：**
- Q: 覆盖哪 5 类首次接入失败？ → ①better-sqlite3 native 加载失败 → 提示 wasm fallback 已生效或建议 rebuild；②Node 版本不符 (<20 或 25.x) → 直接引用 node-version-check 的指引；③未 init/index 就 serve → 指向 zcodegraph index；④wasm 缺失/损坏 → 指向 reinstall/copy-assets；⑤.zcodegraph/ 权限或锁 → 提示关占用进程或删 lock
- Q: 改哪一层？ → 不新增 zcodegraph doctor 子命令，在现有 zcodegraph status 上扩展诊断输出（保持 MCP 工具面 ≤12 的收口）；MCP 侧在 initialize 失败路径返回 actionable 提示文本，server-instructions.ts 补一节『首次接入失败排查』保持单一事实源
- Q: 验证方式？ → 干净环境走查：① 新 clone 目录 + 无 node_modules；② 无 .zcodegraph/；③ 错 Node 版本（用 nvm 切 18/25 各一次）；④ 人为删 dist/*.wasm；⑤ 人为 chmod 000 .zcodegraph/。每类记录 stderr 是否含 actionable 提示。WSL 跑 Linux 场景，Win 本机跑 Windows 场景。
- Q: 现状覆盖度审计结论？ → ②Node 版本 (node-version-check.ts) 和 ③未 init (tools.ts:689) 已覆盖，不动。真正缺口：①better-sqlite3 加载失败 → MCP 无显式提示 agent 当前 backend；④wasm 缺失 → 无检测；⑤找到 .zcodegraph/ 但 open 失败 → engine.ts:173 只写 stderr，agent 在协议层看不到。本节点聚焦 ①④⑤ 三类。
- Q: 最小改动方案？ → 3 处实现 + 1 处新测试：① engine.ts doInitialize catch 里缓存 lastInitError + 新增 getLastInitError()；② tools.ts getCodeGraph 在 !this.cg 分支先检查 engine.lastInitError，若有则抛出带修复指引的错误；③ server-instructions.ts 新增『首次接入失败排查』一节（保持 agent 单一事实源）；④ 新建 tests/mcp-init-recovery.test.ts 3 用例：init 失败 → tools/call actionable / wasm grammar 不可用 → status 列出 / .zcodegraph 锁或权限 → 含修复指引

### 下一步可开工（ready 前 3）

- 1-2. P0 好用性优先（agent 高频缺口） [ ]
- 1-2-2. P0a 索引进度回调 [ ]
- 1-2-3. P0a token 输出优化（GCF 式压缩） [ ]
<!-- ROADMAP_SECTION_END -->
