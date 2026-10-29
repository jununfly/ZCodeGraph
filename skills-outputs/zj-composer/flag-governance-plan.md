# Composer Plan

## Identity

- **plan_id:** `flag-governance-v2`
- **title:** ZCodeGraph Flag 统一治理与逐条处置
- **status:** `approved`
- **template_version:** `1`
- **generated_at:** 2026-10-29T08:35:52Z
- **composer_version:** `1`
- **human_review:** `approved`



## Intent

- **goal:** 统一 Flag 的分类、读取、校验、诊断与生命周期；逐条给出增/删/改/保持不变建议；经 Human 审批后才实施。
- **scope:** 源码中 38 个活跃环境变量（32 个一般运行时条目、3 个内部进程变量、2 个 profiling 变量、1 个测试钩子）、5 个安装变量、1 个退役入口、1 个项目实验配置；测量脚本、发布脚本和 fake fixture 输入全部纳入前缀迁移，但不冒充公共产品配置。
- **constraints:** 活跃环境变量统一使用 `ZCG_*` 并原子切换；旧名不再作为功能别名。保持已批准的默认行为，不合并两个配置文件，不借统一解析改变算法默认值；行为修正必须单独列测试与迁移说明。
- **desired_output:** 本 Plan 的处置表成为实施基线；实施后具备 `ZCG_*` 注册表、统一 parser、可观测诊断、逐条契约测试和完整回归证据。
- **exclusions:** 不处理 P1–P5 既有未提交改动，不处理原有 research/discussions 删除，不自动 commit/push，不重写或默认启用 Rust 实验算法，不重新决定 MyBatis 默认开启。
- **permission_boundary:** Human 已批准完整方案并授权本 Plan 内的产品代码、测试和正式文档修改；禁止网络发布、凭据使用、安装与 Git 发布。

**统一设计草案**

1. 注册表是唯一元数据来源：每个条目声明 `ZCG_*` 名称、类别、类型、默认值、允许值、读取时机、作用域、非法值策略、状态、证据与退役条件。实现仍由各模块拥有，注册表不做全局可变配置中心。
2. 分类固定为 `product`（稳定产品行为）、`experiment`（有退出条件的验证门控）、`runtime`（运行/安全/资源）、`internal`（进程传递）、`developer`（profiling）、`test`（测试钩子）、`installer`（安装边界）、`retired`（退役入口）。
3. 布尔外部契约统一为 trim 后大小写不敏感的 `1/true` 与 `0/false`；未设置取默认值；空字符串和其他值属于非法。迁移逐个记录兼容差异，不静默接受 `yes`。
4. 非法值分层：显式 CLI 请求、MCP allowlist、显式二进制覆盖路径采用可操作错误的 fail-fast；后台功能与资源调参告警后使用默认值。不得把非法 allowlist 解释为“开放全部工具”。
5. 整数必须完整匹配十进制、有限且满足条目范围；禁止 `12abc` 被当成 12。`0` 是否禁用由条目显式声明；现有范围先保留，不擅自 clamp 新范围。
6. 枚举/列表声明允许值；未知枚举 fail-fast。allowlist 的短名/全名兼容保留，未知工具名报告出来。路径必须存在且符合预期类型；显式错误覆盖不得无声回退。
7. 配置来源优先级预留为 CLI 显式参数 > 环境变量 > 项目配置 > 默认值。本次不新增项目配置字段；`zcodegraph.json` 仍只承载 `exclude`，`.zcodegraph/config.json` 仍只承载 candidate routing 实验。JSON 键不是环境变量，不随本次改名。
8. 冲突成对 Flag 保留现优先级并增加一次性诊断：`NO_WATCH > FORCE_WATCH > WSL 自动策略`，`ASCII > UNICODE`。内部变量永不进入用户配置示例。
9. 实验条目必须有 owner、验证指标、证据位置、退出条件；验证通过则收敛默认值并保留一个版本的逃生口，失败则删除实现及开关。禁止无限期“experimental”。
10. 增加只读 effective-config 诊断（建议挂到 `doctor`，不新增另一个 Flag）：显示生效值、来源、非法输入和 deprecated/internal 分类；敏感路径按需脱敏。文档从注册表生成或做一致性 guard test。
11. 本次不新增行为型环境变量。“增”仅指注册表、诊断和测试能力；不引入 `ZCG_STRICT_CONFIG` 之类新开关。
12. 命名原子迁移：`CODEGRAPH_*`、`ZCODEGRAPH_*` 的后缀保持不变并替换为 `ZCG_*`。运行时、内部、profiling、测试、安装、测量、发布和 fake fixture 变量均适用；旧名不读取、不警告回退、不作为别名。代码常量、注入值、CI、安装脚本、测试、文档和错误信息同步更新。`CODEGRAPH_DIR`、`CODEGRAPH_SECTION_*`、`ZCODEGRAPH_BIN` 等不是进程环境变量的标识符不在此列。
13. 退役入口立即删除：`ZCODEGRAPH_INDEX_ENGINE` 不迁移为 `ZCG_INDEX_ENGINE`，不保留兼容报错；同时删除消费点、专属测试和文档。CLI `index --engine typescript` 不受影响。

**完整重命名映射**

映射公式无例外：`CODEGRAPH_<SUFFIX>` 或 `ZCODEGRAPH_<SUFFIX>` → `ZCG_<SUFFIX>`。以下列出全部适用后缀，和公式共同构成逐项完整映射；退役入口除外。

| 类别 | 完整后缀清单 |
|---|---|
| 一般运行时（32） | `ENABLE_EMBEDDING`、`ENABLE_DATASOURCE`、`ADAPTIVE_EXPLORE`、`EXPLORE_TIGHT_SMALL_PROJECT`、`EXPLORE_LINENUMS`、`EXPLORE_ELIDED_MARKERS`、`MCP_TOOLS`、`RUST_NAME_MATCHER`、`RUST_NAME_MATCHER_STRICT`、`NAME_MATCHER_REPLAY_AB`、`CANDIDATE_PROTOCOL`、`CANDIDATE_PROTOCOL_EQUIVALENCE`、`RUST_CANDIDATE_PRODUCER`、`RUST_CORE_BINARY`、`ALLOW_UNSAFE_NODE`、`DEBUG`、`NO_WATCH`、`FORCE_WATCH`、`NO_DAEMON`、`MCP_DEBUG`、`MCP_LOG_ATTACH`、`NO_RELAUNCH`、`ASCII`、`UNICODE`、`VEC0_PATH`、`WATCH_DEBOUNCE_MS`、`MAX_DIR_WATCHES`、`PPID_POLL_MS`、`DAEMON_IDLE_TIMEOUT_MS`、`DAEMON_MAX_IDLE_MS`、`DAEMON_CLIENT_SWEEP_MS`、`RESOLVER_CACHE_SIZE` |
| 内部进程（3） | `DAEMON_INTERNAL`、`WASM_RELAUNCHED`、`HOST_PPID` |
| Profiling / 测试（3） | `PROFILING`、`EXPERIMENT_ID`、`RUST_CORE_TEST_SLEEP_MS` |
| 安装（5） | `INSTALL_DIR`、`BIN_DIR`、`DOWNLOAD_BASE`、`NO_DOWNLOAD`、`VERSION` |
| 测量（19） | `DEV_BIN`、`EXPERIMENT_CHILD_MAX_BUFFER_BYTES`、`EXPERIMENT_FAIL_ENGINE`、`EXPERIMENT_FAKE_RUST_ELAPSED_MS`、`EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES`、`EXPERIMENT_FAKE_RUST_PROFILE`、`EXPERIMENT_FAKE_RUST_SUCCESS`、`EXPERIMENT_FAKE_TYPESCRIPT_PEAK_RSS_BYTES`、`EXPERIMENT_MEASURE_RSS`、`PHASE3_BENCHMARK_SCRIPT`、`PHASE3_BUNDLE_DIR`、`PHASE3_FAILURE_MATRIX_SCRIPT`、`PHASE3_NPM_ROOT`、`PHASE3_PACKAGE_SMOKE_SCRIPT`、`PHASE3_PROFILE_SCRIPT`、`PHASE3_SKIP_DIAGNOSTICS`、`PHASE3_SKIP_PACKAGE_SMOKE`、`PHASE3_SKIP_SMOKE`、`PHASE3_SUFFICIENCY_SCRIPT` |
| 发布 / fake fixture（7） | `RELEASE_DIR`、`RSS_PROC_ROOT`、`RSS_PS_COMMAND`、`RSS_TIME_COMMAND`、`RUST_CORE_ARTIFACT_DIR`、`FAKE_DEFAULT_MARKER`、`TEST_TARGET` |

示例：`CODEGRAPH_ENABLE_DATASOURCE` → `ZCG_ENABLE_DATASOURCE`；`ZCODEGRAPH_RUST_CORE_BINARY` → `ZCG_RUST_CORE_BINARY`。非环境变量标识符和 `CODEGRAPH_START`/`CODEGRAPH_END` 之类指令分隔文本不改名。

**逐条处置：32 个一般运行时变量**

| Flag | 意图与当前实现效果 | 建议 |
|---|---|---|
| `ZCG_ENABLE_EMBEDDING` | 默认关；精确 `1` 开启后台入队/read-repair/MCP 恢复；CLI 还须 `--with-embeddings`。 | 改：统一 parser；保留双入口但澄清“持续能力开关”与“本次操作”不是重复授权。 |
| `ZCG_ENABLE_DATASOURCE` | 默认关；精确 `1` 启用 MyBatis Java Mapper ↔ XML statement heuristic calls；不连接 DB。旧集成测试假定默认开。 | 改：保留默认关，显式开启 MyBatis 测试并补默认关测试；注册为 MyBatis 语义门控，验证后再议默认开。 |
| `ZCG_ADAPTIVE_EXPLORE` | 默认开；`0/false` 及空串关闭；控制 explore 动态骨架化。 | 改：归 stable 逃生口；空串按非法并回默认，补兼容说明。 |
| `ZCG_EXPLORE_TIGHT_SMALL_PROJECT` | 默认关；`1/true` 对小项目收紧 explore 预算；用于 A/B。 | 改：归实验，登记 A/B 退出条件；验证完成前不删、不改默认。 |
| `ZCG_EXPLORE_LINENUMS` | 默认开；仅 `0/false` 关；控制行号。 | 改：统一 parser，默认不变。 |
| `ZCG_EXPLORE_ELIDED_MARKERS` | 默认开；仅 `0/false` 关；提供可追问的省略标记。 | 保持不变：用途、默认与优先级不变；仅统一前缀并纳入统一读取。 |
| `ZCG_MCP_TOOLS` | 逗号 allowlist，支持短名/全名；未知名可被静默忽略，无有效匹配时反而暴露全部。 | 改：未知名/空有效集合 fail-fast；list 与 call 共用同一解析结果。 |
| `ZCG_RUST_NAME_MATCHER` | 默认关；`1/true` 启用 JS/TS Rust matcher；Rust decision 与同一 candidate set 上的 TS matcher 对照，mismatch 回退 TS。Rust core 有真实算法与单元测试，TS guard 测试多用 fake runner；尚无代表性大仓 parity/性能证据。 | 改：归实验并登记真实 corpus parity、graphStats、性能退出门；当前不删、不默认开、不改算法。 |
| `ZCG_RUST_NAME_MATCHER_STRICT` | 默认关；语义 mismatch 抛错；仅在 matcher 开启且出现差异时有实际意义。 | 改：声明依赖，单独开启时给诊断；不静默制造独立 matcher 功能。 |
| `ZCG_NAME_MATCHER_REPLAY_AB` | 默认关；比较完整 TS context 与 candidate-set-restricted TS context，验证 candidate set 完整性，不是 Rust/TS 全量算法等价性证据。 | 改：归 developer/experiment 诊断，保留至 matcher 退出决策，文档禁止夸大证据。 |
| `ZCG_CANDIDATE_PROTOCOL` | 实际默认开；`0/false` 关闭候选查找/cache 主路径并回旧 queries/cache；不是默认关实验，也不直接拥有 Rust disambiguation。 | 改：归为默认开的内部算法逃生口，保留默认；删除会改变主路径，不在本次实施。 |
| `ZCG_CANDIDATE_PROTOCOL_EQUIVALENCE` | 默认关；`1/true` 对照 protocol 结果与 TS baseline；不产生 Rust decision。 | 改：归实验诊断并记录退出条件，名称避免误读为真实 Rust matcher parity。 |
| `ZCG_RUST_CANDIDATE_PRODUCER` | 默认关；只控制 producer shadow diagnostics；读取 Rust 候选再与 TS baseline 对照，不决定 routing 是否启用。 | 改：保留独立 shadow 开关至验证结束；routing 单独由项目 JSON 控制，不合并。 |
| `ZCG_RUST_CORE_BINARY` | 显式 Rust core 路径，覆盖 packaged/source discovery；不存在会报错。 | 改：只改统一名称；用途与 fail-fast 语义保持不变，纳入路径 parser。 |
| `ZCG_ALLOW_UNSAFE_NODE` | 绕过 Node <20 或 >=25 硬阻断；实现任意非空即生效，示例却写 `1`。 | 改：只接受显式 true；非法/空值 fail-fast，消除文档与实现差异。 |
| `ZCG_DEBUG` | 任意非空启用通用 debug stack 输出。 | 改：统一布尔；与 MCP/attach 日志保持独立用途。 |
| `ZCG_NO_WATCH` | 精确 `1` 强制关 watcher，优先于 FORCE；CLI `--no-watch` 也写入它。 | 保持不变：优先级保留，仅统一解析与冲突诊断。 |
| `ZCG_FORCE_WATCH` | 精确 `1` 覆盖 WSL `/mnt/*` 自动关闭，但不能覆盖 NO_WATCH。 | 保持不变：保留逃生口与优先级。 |
| `ZCG_NO_DAEMON` | 非空且非 `0/false` 时直接 MCP 模式。 | 改：统一布尔，默认关不变。 |
| `ZCG_MCP_DEBUG` | 任意非空输出部分 MCP fallback debug。 | 改：统一布尔；不与通用 DEBUG 合并。 |
| `ZCG_MCP_LOG_ATTACH` | 仅精确 `1` 输出正常 daemon attach 日志，避免 host 把 stderr 当错误。 | 保持不变：独立用途和默认关保留。 |
| `ZCG_NO_RELAUNCH` | 任意非空禁止为 tree-sitter WASM JIT workaround 再执行进程。 | 改：统一布尔并标为高级运行逃生口。 |
| `ZCG_ASCII` | 精确 `1` 强制 ASCII，优先于 UNICODE。 | 保持不变：保留优先级，补冲突诊断。 |
| `ZCG_UNICODE` | 精确 `1` 请求 Unicode，在 ASCII 未开时生效。 | 保持不变：保留平台默认及优先级。 |
| `ZCG_VEC0_PATH` | 显式 vec0 覆盖；路径不存在会继续自动发现，可能掩盖拼写错误。 | 改：显式无效路径 fail-fast/清晰报错；仅未设置时自动发现。 |
| `ZCG_WATCH_DEBOUNCE_MS` | watcher debounce，合法整数范围 100–60000，非法回默认；合法覆盖写 stderr。 | 改：复用整数 parser，保留范围与默认。 |
| `ZCG_MAX_DIR_WATCHES` | Linux inotify 目录上限，默认 50000，仅全数字且 >0。 | 改：统一 parser/非法诊断，默认与 >0 约束不变。 |
| `ZCG_PPID_POLL_MS` | host 存活轮询，默认 5000，`0` 禁用，非法/负数回默认。 | 改：统一 parser，保留 0 的禁用语义。 |
| `ZCG_DAEMON_IDLE_TIMEOUT_MS` | 无 client 后退出时间，默认 300000，`0` 禁用。 | 改：统一非负整数与诊断。 |
| `ZCG_DAEMON_MAX_IDLE_MS` | 无活动 backstop，默认 1800000，`0` 禁用。 | 改：统一非负整数与诊断。 |
| `ZCG_DAEMON_CLIENT_SWEEP_MS` | client peer 清理周期，默认 30000，`0` 禁用。 | 改：统一非负整数与诊断。 |
| `ZCG_RESOLVER_CACHE_SIZE` | 多类 resolver cache 共同上限，默认 5000；`parseInt` 会接受数字后缀。 | 改：严格正整数，非法告警回默认。 |

**内部进程标记（3）：不进入公共配置目录**

| Flag | 意图与当前实现效果 | 建议 |
|---|---|---|
| `ZCG_DAEMON_INTERNAL` | 标记 detached daemon，防递归 spawn。 | 改：注册为 internal，实现保留，不承诺用户配置兼容。 |
| `ZCG_WASM_RELAUNCHED` | 防 WASM workaround 重复 re-exec。 | 改：注册为 internal，实现保留。 |
| `ZCG_HOST_PPID` | 跨 re-exec/proxy 传递真实 host PID，供 watchdog。 | 改：注册为 internal，保留数值校验。 |

**开发、测试、退役与项目实验配置**

| 配置 | 意图与当前实现效果 | 建议 |
|---|---|---|
| `ZCG_PROFILING` | `heap` 开启 dhat；无 feature 时明确报错；其他非空枚举报错。 | 改：归 developer 枚举，保留现语义，不纳入普通用户 Flag。 |
| `ZCG_EXPERIMENT_ID` | heap 报告子目录名，缺省 `manual`。 | 改：归 developer 输出标识，校验路径穿越/非法字符。 |
| `ZCG_RUST_CORE_TEST_SLEEP_MS` | Rust core 测试延迟钩子。 | 改：注册为 test-only；生产构建/文档不得将其当功能。 |
| `ZCODEGRAPH_INDEX_ENGINE`（退役，无新名） | 已退役；非空即报错并引导 `index --engine typescript`。 | 删：立即删除消费点、专属测试和文档；不等待下一 major，不生成 `ZCG_INDEX_ENGINE`，不恢复旧引擎选择行为。 |
| `.zcodegraph/config.json` 的 `experimental.rustCandidateProducerRouting` | 项目级布尔 routing 实验，默认关；独立调用 producer runner，不经 shadow env 总控。每次 routed lookup 仍读 TS baseline，候选差异、缺失结果、hydration miss 或进程失败时整 run 回 TS；真实 Rust core 小 fixture 已有 active/parity 证据。 | 改：JSON 键不改名；登记代表性 corpus parity、性能与退出条件；保留 fail-closed，不默认开、不与 shadow env 合并。 |

**安装边界（5）：独立注册，不进入运行时配置优先级**

| Flag | 意图与当前实现效果 | 建议 |
|---|---|---|
| `ZCG_INSTALL_DIR` | bundle 缓存/安装目录。 | 改：只统一前缀；installer 用途、路径校验与文档保留。 |
| `ZCG_BIN_DIR` | Unix 安装脚本的 symlink 目标目录，缺省 `~/.local/bin`。 | 改：只统一前缀并补注册/测试；保持缺省与安装行为。 |
| `ZCG_DOWNLOAD_BASE` | release 下载镜像基址。 | 改：只统一前缀；installer 用途不变。 |
| `ZCG_NO_DOWNLOAD` | 禁止网络 fallback，但仍允许缓存 bundle。 | 改：统一前缀与布尔解析，保留“不是禁用缓存”的说明。 |
| `ZCG_VERSION` | upgrade/install 版本 pin，CLI 显式版本优先。 | 改：只统一前缀；保留 CLI 优先级。 |

测量、发布和 fake fixture 的 26 个环境变量按完整映射同步为 `ZCG_*`，采用“脚本参数清单 + 所在脚本校验”；不注册为公共产品 Flag，不保留旧名。

**Human 决策状态与 D3 建议**

- D1 Embedding（已批准）：保留 env 持续能力开关 + CLI 本次操作开关，更新说明而非取消双入口。
- D2 MyBatis（已批准）：修复测试配置漂移，显式设置 `ZCG_ENABLE_DATASOURCE=1`；保持默认关，另测默认关。
- D4 非法值（已批准）：显式请求/安全边界 fail-fast，后台与资源调参告警回默认；空字符串不再等价于任意非空 truthy。
- 命名与退役（已批准）：全部活跃环境变量原子迁移到 `ZCG_*`，旧名不留功能别名；已退役入口直接删除。
- D3 Rust（已批准）：不整组删除、不默认启用、不把删除开关与删除 Rust 能力捆绑；按下表分别收敛。

| D3 项 | 实际依赖和默认路径 | 证据边界 | 建议 |
|---|---|---|---|
| Candidate Protocol 及逃生口 | 默认开；TypeScript `ResolutionContext` 主路径委托 provider 做候选查找/cache；关闭走旧 queries/cache。producer shadow/routing 的 provider 基础设施也在这里。 | fixture 开关 graph parity、lookup shape、cache/batch、diagnostics；正式 ADR-0002 将 candidate lookup/cache 作为第一迁移切片。 | 保留默认主路径及 `ZCG_CANDIDATE_PROTOCOL` 逃生口；不在本次删除或默认关闭。 |
| Rust Name Matcher | 默认关，仅 JS/TS；开启后批量调用 `match-name`，再以 candidate-set-restricted TS matcher 验证，mismatch 回 TS，strict 才抛错。 | Rust core 有 exact/qualified/method/fallback 单元测试；TS 多数集成 guard 使用 fake runner。尚无代表性大仓真实 Rust/TS parity 与收益阈值。 | 保留三个开关的不同角色；matcher 主开关归实验，strict 声明依赖，replay 仅作 candidate-set 完整性诊断。 |
| Candidate Protocol Equivalence | 默认关；只把 protocol 返回与 TS baseline 比较。 | 证明 protocol/baseline 一致，不是 Rust matcher 算法 parity。 | 保留诊断并澄清语义，待 protocol 生命周期结束再退。 |
| Candidate Producer shadow | 默认关；env 只触发 snapshot 时的 shadow runner 和 mismatch 汇总，不是 routing 总开关。 | 真实 Rust core 单元测试覆盖五种 lookup；CLI 小 fixture 验证 `mismatchCount: 0`、comparedCount 与 lookupCount 一致。 | 保留 shadow 诊断；与 routing 共用证据但独立处置，不合并控制条件。 |
| Candidate Producer routing | 项目 JSON 默认关；每批直接调用 producer runner，不需要 shadow env。routed lookup 仍逐项读 TS baseline，差异/缺结果/hydration miss/进程错误整 run 回 TS。 | 真实 Rust core 小 fixture 验证 enabled/disabled/invalid 图一致、active 与 fallback taxonomy；尚无代表性大仓性能/等价性退出证据。 | 保留默认关、fail-closed 与 JSON 键；登记独立 corpus/性能退出门，不默认开。 |

D3 统一退出门：默认路径切换或删除实现前，必须按 ADR-0002 与 `finalization-tail-boundary-contract.md` 提供代表性 corpus 的 graphStats、真实 Rust/TS parity/replay、fallback taxonomy、wall time/RSS 及必要的 Agent Sufficiency 证据；当前只有 fixture/guard 证据时不得宣称生产等价。Flag 治理不替代该迁移决策。

## Capability composition

### Step 1 — 冻结注册表契约与逐条兼容矩阵

- **skill_or_workflow:** `zj-codebase-design`
- **role:** 将批准的分类、完整 `ZCG_*` 映射、parser 和配置边界转换为最小模块设计。
- **reason:** 目标要求先统一语义，验收需要每条 Flag 的默认、合法值和非法行为可追踪。
- **inputs:** 本 Plan 处置表、当前消费点、Human 对 D3 及完整方案的确认。
- **outputs:** 经 Human 审批后的 registry schema、完整重命名矩阵、退役删除清单和模块改动清单。
- **prerequisites:** Human 审批完整 Plan，包含 D3 逐项处置和旧名不保留别名的迁移边界。
- **dependencies:** N/A。
- **excluded_alternatives:** N/A。

### Step 2 — 以契约测试驱动统一读取与迁移

- **skill_or_workflow:** `zj-tdd`
- **role:** 先固定现状与预期差异，再实现 registry/parser 并逐模块迁移。
- **reason:** 约束要求避免统一解析引起隐性回归，验收需要默认值、非法值、优先级和读取时机证据。
- **inputs:** Step 1 的兼容矩阵、现有 Flag 测试。
- **outputs:** 经 Human 审批后的 parser、registry、全部 `ZCG_*` 消费点/脚本/测试/文档迁移、退役入口删除和单元/集成测试。
- **prerequisites:** Step 1 输出已审阅。
- **dependencies:** Step 1。
- **excluded_alternatives:** N/A。

### Step 3 — 修复明确行为缺陷并登记实验生命周期

- **skill_or_workflow:** `zj-tdd`
- **role:** 分别验证 MCP allowlist、vec0 覆盖、MyBatis 测试漂移及实验依赖。
- **reason:** 这些条目的当前效果与预期不一致，验收需要独立红绿证据而非被统一迁移掩盖。
- **inputs:** Step 2 parser、对应真实 CLI/MCP/索引路径。
- **outputs:** 经 Human 审批后的缺陷修复、实验元数据、诊断与迁移说明。
- **prerequisites:** Step 2 定向测试通过。
- **dependencies:** Step 2。
- **excluded_alternatives:** N/A。

### Step 4 — 双轴复核与完整验收

- **skill_or_workflow:** `zj-code-review`
- **role:** 独立检查 Standards/Spec、变更范围和证据完整性。
- **reason:** 验收要求确认没有遗漏旧前缀、夹带未批准默认值漂移或无关文件变更。
- **inputs:** 经 Human 审批后的完整 diff、测试输出、Flag 清单和决策记录。
- **outputs:** 审查结论、完整测试结果、未提交变更摘要与后续 checkpoint 建议。
- **prerequisites:** Step 3 完成且构建通过。
- **dependencies:** Step 3。
- **excluded_alternatives:** N/A。

## Gaps and suggestions

无缺失的已安装能力；不需要外部能力建议。性能阈值与实验退出证据不足时不宣称可删除实验实现，保留为 Human 决策。

## Human checkpoints

- **approval_point:** Human 审阅完整 v2 Plan 并确认 D3 逐项处置后才进入 Step 1；每批实现仍按既定 checkpoint 等待明确提交指令。
- **decisions_needed:** 无；完整 v2 方案、D1、D2、D3、D4、统一 `ZCG_*` 和退役入口立即删除均已批准。
- **rejection_path:** preserve this Plan and record the reason; do not execute.
- **side_effect_authorization:** 所有产品代码、测试和正式文档修改均需 Human 审批；网络发布、依赖安装与 Git 发布需另行明确授权。

## Evidence and provenance

- **skill_index_snapshot:** `catalog-v1-759e57ac6b09258794730cf23e9e755ddf26b2fb0ccca6ede2b6c0d0eba603da`
- **catalog_revision_or_digest:** `759e57ac6b09258794730cf23e9e755ddf26b2fb0ccca6ede2b6c0d0eba603da`
|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
- **source_references:** selected=[zj-codebase-design -> zj-codebase-design/SKILL.md | zj-tdd -> zj-tdd/SKILL.md | zj-code-review -> zj-code-review/SKILL.md]; excluded=[Step 1 -> zj-codebase-design/SKILL.md | Step 2 -> zj-tdd/SKILL.md | Step 3 -> zj-tdd/SKILL.md | Step 4 -> zj-code-review/SKILL.md]
- **evidence_requirements:** 源码消费点；`ZCG_*` 映射与旧名不生效的契约测试；现状布尔/数值测试；MyBatis 默认关与显式开；MCP list/call 一致；vec0 错误覆盖；Candidate Protocol 默认开；Rust 实验默认关和 fail-closed；全量构建测试；diff 范围复核。
- **generated_assertions:** 当前仅完成只读研究、D3 建议和 Composer 证据；未修改 Flag 产品代码；未默认开启 MyBatis 或 Rust 实验，未删除 Rust 实现，未合并配置文件。
- **unknowns:** 外部用户是否依赖空字符串和非标 truthy；Rust 实验代表性 corpus 的性能/等价性结果与具体退出时间；effective-config 诊断的最终 CLI 形状。Composer 模板注册表登记 Git LF 原始摘要，而当前 Windows 工作区文件为 CRLF，validator 按磁盘字节比对会产生 false mismatch；这是工具链独立问题，不在本 Plan 擅自修复。

## Verification

- **step_checks:** registry 清单与源码消费点一致；38 个代码活跃变量（一般运行时/内部/profiling/测试）、5 个安装变量及 26 个脚本/fixture 变量完成映射；旧名不生效；退役入口无消费点；逐条 parser 与定向红绿测试；npm build、cargo check、完整 Vitest、git diff --check；只改变批准范围。
- **scenario_oracle:** 对每类布尔输入、非法整数、冲突 watch/glyph、错误 allowlist、错误 vec0、MyBatis 默认/开启、Candidate Protocol 默认开启、Rust 实验默认关闭和回退建立可重复断言；任何未声明默认值变化均失败。
- **plan_acceptance:** `approved`

## Failure and rollback

- **failure_exits:** 任何契约不清、未声明默认值变化、非目标文件改动或回归失败即停止该批次并保留证据。
- **safe_stop:** 回到最近已验证批次；不触碰 P1–P5 或既有文档删除；等待 Human 决定。
- **rollback:** 仅反向撤销本治理批次已批准的代码/测试/文档改动，不覆盖或回退其他未提交工作；不自动 Git 发布。
- **undeclared_side_effect_response:** stop, preserve evidence, and escalate for Human review.

## Handoff

- **consuming_execution_chain:** Human 批准后由 zj-codebase-design → zj-tdd → zj-code-review 顺序消费；提交与推送仍由 Human 显式触发。
- **handoff_preconditions:** Human approval, complete provenance, and passing verification checks.
- **authority_statement:** Composer 只提出并记录方案，没有执行权。
