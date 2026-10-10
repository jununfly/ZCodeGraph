<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-09 22:13:47

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
│   ├── [x][Y+] 1-2-5. PHP 基线抽取迁移
│   ├── [~][Y+] 1-2-6. Ruby 基线抽取迁移
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

### 当前施工：1-2-6-4. Ruby: 框架/运行时语义边界决策 + TS fallback 移除

三选一决策落本节点：migrate / keep TS-shell / split；边界明确且 fixture+语料通过后，才删除 TS 该语言 fallback 抽取路径。

**决策：**
- Q: Scope gate: 产品实现路线还是技能验收/学习路线？ → Product execution（exploit）。Ruby baseline 抽取/引用边/跨文件 e2e/真实语料均已在 1-2-6-1/-2/-3 CLOSED 且三 OS CI 绿；1-2-6-4 是把已验证的 Rust 能力做 split cutover 接线，属确定性工程收尾，非探索/学习。 (镜像 PHP 1-2-5-4 / C# 1-2-4-4 裁决。)
- Q: Split 边界：cutover 是否删除 TS ruby.ts？Rails 框架路由放哪一层？ → 保留 src/extraction/languages/ruby.ts 与 barrel（仅供纯 --engine typescript），cutover 仅把 ruby 加入 RUST_HYBRID_RUST_OWNED_LANGUAGES 移除 hybrid fallback 调度（fallbackByLanguage.ruby=0），不删 extractor——遵循 C#/python/go/PHP 先例。Rails 路由由新建 src/indexing/rust-ruby-framework-routes.ts 在 finalizeRustIndex 的 runPostExtract() 之后、batched resolution 之前重跑纯 regex railsResolver，仅插 route 节点 + controller#action unresolved refs；resolution/frameworks/ruby.ts 与 import-resolver 永久留 TS shell。 (纠正早先 Q3 删除 ruby.ts 的设想；依据 be8b839 removes fallback scheduling, not the extractor。Ruby 无 Drupal hook 共享节点复杂度，backfill 最贴近 C# ASP.NET（dedicated route nodes，5 字段 stats，无 hookReferences）。EXTRACTION_VERSION 不 bump（未发布批次）。)
- Q: 实现与验证结果：cutover 接线了哪些点？测试如何裁决？ → 已接线：(1) rust-hybrid-contract.ts 将 ruby 加为第 14 个 RUST_HYBRID_RUST_OWNED_LANGUAGES；(2) 新建 src/indexing/rust-ruby-framework-routes.ts（镜像 C# ASP.NET dedicated-route backfill，复用 railsResolver，5 字段 stats，幂等 per-file kind=route 清理 + 确定性 id + clearCaches 仅在有 route 时）；(3) src/index.ts 在 PHP backfill checkpoint 之后、batched resolution 之前接线 import/profile 类型/默认零值/backfill 调用；(4) 同步 rust-index-engine-cli-engine status golden 的 14 语言数组。ruby.ts 与 barrel 保留。测试：extraction.test.ts post-cutover plan 守卫（isRustHybridOwnedLanguage('ruby')、engineByLanguage.ruby=rust、user.rb 入 rustOwnedFiles、fallbackByLanguage.ruby=0）；frameworks-integration.test.ts 新增 Rails e2e（Gemfile+config/routes.rb+articles/pages controller，resources 7 路由 + 显式 GET /dashboard，断言 route→Rust action references 边）。ci.yml step2 -t 追加两分支，本地复刻 skip-debt guard 审计 33/33 分支命中真实 it，ALLOWED_SKIPS 仍空。纯 regex 逻辑复刻探针确认夹具产出精确的 8 个 route 名与 controller#action refs。真实 Rails 框架源码无 config/routes.rb（gem 不定义应用路由表），故路由语义由确定性 e2e 裁决，benchmark baseline 符号数不变。全部 TS 文件 strip-types 语法通过；最终 tsc/vitest 三 OS CI 裁决。EXTRACTION_VERSION 不 bump。 (本地无 node_modules，权威 TS 类型/端到端裁决在三 OS CI。)
<!-- ROADMAP_SECTION_END -->
