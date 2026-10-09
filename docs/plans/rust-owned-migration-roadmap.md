<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-09 11:51:41

[~][X+] 1. Rust-Owned 索引迁移路线图
├── [x][Y+] 1-1. 现状基线校准（2026-09-28 代码核对）
│   ├── [x][Y+] 1-1-1. Rust-owned 语言清单核对（rust-hybrid-contract.ts）
│   ├── [x][Y+] 1-1-2. C++ 已迁移事实校准（PRD 状态过期项）
│   ├── [x][Y+] 1-1-3. 真实语料证据文档清点
│   └── [x][Y+] 1-1-4. 剩余迁移范围确认
├── [~][Y+] 1-2. Goal1: Grammar 语言基线抽取迁移到 Rust
│   ├── [x][Y+] 1-2-1. Java 基线抽取（已完成）
│   ├── [x][Y+] 1-2-2. C 基线抽取（已完成）
│   ├── [~][Y+] 1-2-3. C++ 基线抽取（已完成, #678）
│   ├── [x][Y+] 1-2-4. C# 基线抽取迁移
│   ├── [~][Y+] 1-2-5. PHP 基线抽取迁移
│   ├── [ ][Y+] 1-2-6. Ruby 基线抽取迁移
│   ├── [ ][Y+] 1-2-7. Swift 基线抽取迁移
│   ├── [x][Y+] 1-2-8. Kotlin 基线抽取迁移
│   ├── [ ][Y+] 1-2-9. Dart 基线抽取迁移
│   ├── [ ][Y+] 1-2-10. Pascal/Delphi 基线抽取迁移
│   ├── [ ][Y+] 1-2-11. Scala 基线抽取迁移
│   ├── [ ][Y+] 1-2-12. Lua 基线抽取迁移
│   ├── [ ][Y+] 1-2-13. Luau 基线抽取迁移
│   └── [ ][Y+] 1-2-14. Objective-C 基线抽取迁移
├── [ ][X+] 1-3. Goal1: 自定义与文件级语言 Rust 化可行性
│   ├── [ ][X+] 1-3-1. Svelte Rust 化可行性与落地
│   ├── [ ][X+] 1-3-2. Vue Rust 化可行性与落地
│   ├── [ ][X+] 1-3-3. Liquid Rust 化可行性与落地
│   ├── [ ][X+] 1-3-4. Razor/Blazor Rust 化可行性与落地
│   ├── [ ][X+] 1-3-5. XML/MyBatis Rust 化可行性与落地
│   ├── [ ][X+] 1-3-6. YAML Rust 化可行性与落地
│   ├── [ ][X+] 1-3-7. Twig Rust 化可行性与落地
│   └── [ ][X+] 1-3-8. Properties Rust 化可行性与落地
├── [ ][X+] 1-4. Goal2: TS shell 共享层 migrate/keep/split 决策
│   ├── [ ][X+] 1-4-1. Framework resolvers 逐项归属决策（23 项）
│   └── [ ][X+] 1-4-2. 引用解析与终结层逐项决策（8 项）
├── [ ][Y+] 1-5. 验收标准与所有权护栏
│   ├── [ ][Y+] 1-5-1. 迁移语言在 rust-hybrid 元数据中 TS fallback 归零
│   ├── [ ][Y+] 1-5-2. 每个迁移语言有确定性 fixture 与真实语料证据
│   ├── [ ][Y+] 1-5-3. 每个未迁移共享层项有 keep/split/migrate 决策与理由
│   ├── [ ][Y+] 1-5-4. Status/doctor 在混合所有权下六态健康输出不回归
│   └── [ ][Y+] 1-5-5. 所有权护栏：文件 Rust-owned 不自动宣称框架/运行时语义 Rust-owned
└── [x][X+] 1-6. 排序与调度
    ├── [x][Y+] 1-6-1. 波次1: Kotlin 基线迁移（#692 夹具模式落地后首个新语言）
    ├── [x][X+] 1-6-2. Python 框架充分性检查（Django/Flask/FastAPI 边界实证）
    ├── [x][X+] 1-6-3. Go/Gin 路由所有权检查
    ├── [x][X+] 1-6-4. Swift 基线迁移（移动桥接成为产品优先级时启动）
    └── [x][Y+] 1-6-5. 波次0: #692 夹具债清零（新语言迁移前置）

### 当前施工：1-2-5-4. PHP: 框架/运行时语义边界决策 + TS fallback 移除

三选一决策落本节点：migrate / keep TS-shell / split；边界明确且 fixture+语料通过后，才删除 TS 该语言 fallback 抽取路径。

**决策：**
- Q: Scoping 决策（2026-10-09，Q1-Q4，三选一：migrate / keep TS-shell / split） → 结论：选 SPLIT，与 C# 1-2-4-4（ASP.NET 路由语义留在 TS shell）同构，不是"加 owned 表即完事"的 migrate，也不是 keep。

Q1 决策与依据（为什么是 split 而非 migrate）：
- 纯语法面 Rust 已对等：1-2-5-3 双语料 4,601 个 PHP-family 文件 / 604,642 LOC / 126,472 refs，0 parse gap、0 ERROR 节点（Laravel framework@848f3ed src/Illuminate 1,742 php；Drupal@c305d65 sparse 2,859 php-family）。基线符号 + 七类 refs 可整建制交给 Rust。
- 但框架/运行时语义 Rust 不做：crates/zcodegraph-core/src/php.rs L27-29 注释原文明确 "Laravel routes and Drupal hooks/routes stay in the TypeScript shell ... back-filled after the ownership cutover (1-2-5-4), exactly like the C#/ASP.NET split"；php.rs 全文件除该注释外零 route/laravel/attribute 命中。
- 这些语义当前由 TS 管道在 tree-sitter.ts L4188-4211 的框架 extract 循环产出（getAllFrameworkResolvers → getApplicableFrameworks(detectedLanguage)（frameworks/index.ts L108，按 fw.languages 过滤）→ fw.extract）。切 owned 后 PHP-family 文件不再进 TS fallback，route 节点 / hook refs 会静默丢失，必须显式回填。故 split。

Q2 所有权边界 + 落点（split 怎么切）：
- 所有权表：src/indexing/rust-hybrid-contract.ts L9 RUST_HYBRID_RUST_OWNED_LANGUAGES 追加 'php'，成为第 13 个 owned 语言；hybrid 下 .php 等改走 Rust core（fallbackByLanguage.php 归 0）。
- 回填器：新建 src/indexing/rust-php-framework-routes.ts，镜像 src/indexing/rust-csharp-framework-routes.ts（170 行模板）。直接 import 两个 resolver（不经 getAllFrameworkResolvers，避免拉入 tree-sitter grammar 依赖链）：laravelResolver（src/resolution/frameworks/laravel.ts，languages=['php']，detect artisan | app/Http/Kernel.php，extract L102 仅 .php，产 Route::get/post/.../any 的 route 节点 + Route::resource/apiResource，route→handler refs 经 extractLaravelHandler L193）与 drupalResolver（src/resolution/frameworks/drupal.ts，languages=['php','yaml'] L298）。
- 回填文件集合（关键，经 Rust 侧核实）：SourceLanguage::from_path 把 php/module/install/theme/inc 五扩展全部归类 Php（php.rs L1059-1069 drupal_extensions_map_to_php 锁定）。故 backfill 扫描 queries.getAllFiles() 中 language==='php'（即覆盖 .php/.module/.install/.theme/.inc），而非只筛 .php —— Drupal hook refs 大量在 .module/.install/.theme/.inc。
- Drupal 边界（不回填的部分）：drupalResolver.extract L403-408 分流 —— *.routing.yml（L404）是 yaml 语言，cutover 后仍走 TS fallback（yaml 非 owned），路由节点不丢、不纳入 backfill；只有 isDrupalHookFile/.php 分支（L408，PHP-family hook refs）随 php 移给 Rust 才需要回填。
- 接线（src/index.ts finalizeRustIndex，函数起 L1555）：镜像 csharp —— import 置于 L65-68 旁；profile 类型字段 phpFrameworkRouteBackfill（PhpFrameworkRouteBackfillStats）置于 L1565-1566 旁 + 零值初始化 L1697-1710 旁；调用块插在 csharp backfill completed checkpoint（L2035）之后、resolveReferencesBatched（L2039）之前（回填的 unresolved refs 必须进入同一次 batched resolve 才能连 route→handler 边）；配套 profile 计时 + clearCaches。每文件先按 kind==='route' 幂等删旧 back-fill route 与边/unresolved（不用 deleteNodesByFile，以免删 Rust 基线符号）。

Q3 TS php.ts / barrel 去留：
- 保留 src/extraction/languages/php.ts（117 行纯语法）与 barrel index.ts L17/L36。依据：(1) 纯 --engine typescript 仍需 PHP 抽取能力，删会显式移除 TS 引擎的 PHP 支持，超节点边界；(2) 与 C# 先例一致（csharp.ts 切后保留，且其另有 razor @code 内部强制方）。PHP 无 razor 式内部强制委托方，但保守保留，不投入、不删除。
- 节点 notes 所谓"删除 TS 该语言 fallback 抽取路径"在 hybrid 层达成（php 进 owned 表 → 不再进 fallbackFiles），而非物理删除 php.ts。

Q4 测试 / 验收（fixture + 语料都过才收口）：
- 翻转 __tests__/extraction.test.ts 1-2-5-3 的 pre-cutover plan 守卫：isRustHybridOwnedLanguage('php')===true、PHP 文件不进 fallbackFiles、fallbackByLanguage.php===0。
- 新增 rust-hybrid 框架/路由 e2e（镜像 ASP.NET controller/minimal-API 两例）：Laravel Route::get + 两类 handler 表达（[Class::class,'method'] 与 'Class@method'），断言 route 节点存在 + route→Rust handler method 解析边；评估加 Drupal hook（.module）回填例。Drupal .routing.yml 因仍走 TS fallback，仅断言其路由节点不回归。
- __tests__/rust-index-engine-cli-engine.test.ts L511 owned 语言硬编码 12→13 加 'php'。
- 同步 .github/workflows/ci.yml step2 -t 白名单（无正则元字符的唯一标题），skip-debt-guardrail 静态核验每条命中真实 it。
- 语料（Task 收尾）：cutover 后用 rust-hybrid（非纯 rust）重跑 Laravel/Drupal，核对 route 节点回填数与 route→handler 解析边、Drupal hook refs、.routing.yml 不回归；更新/新增 benchmark；EXTRACTION_VERSION 不 bump（未发布 PHP 批，同 1-2-5-3）。
- 本机无 node_modules，TS 仅 node --experimental-strip-types --check  transpile-only，真验证靠 push 后 3-OS CI（ubuntu/macos-14/windows-2025）。 (证据：php.rs L27-29 注释 + L1059-1069 五扩展归类；laravel.ts L102/L193；drupal.ts L298/L403-408；tree-sitter.ts L4188-4211；frameworks/index.ts L108；rust-csharp-framework-routes.ts 170 行模板；rust-hybrid-contract.ts L9/L221-227；index.ts L65-68/L1565-1566/L1697-1710/L1988-2039；cli-engine L511；barrel index.ts L17/L36；1-2-5-3 双语料 0 gap。)
<!-- ROADMAP_SECTION_END -->
