<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-10 16:06:12

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
│   ├── [x][Y+] 1-2-6. Ruby 基线抽取迁移
│   ├── [ ][Y+] 1-2-7. Swift 基线抽取迁移
│   ├── [x][Y+] 1-2-8. Kotlin 基线抽取迁移
│   ├── [~][Y+] 1-2-9. Dart 基线抽取迁移
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

### 当前施工：1-2-9-4. Dart: 框架/运行时语义边界决策 + TS fallback 移除

三选一决策落本节点：migrate / keep TS-shell / split；边界明确且 fixture+语料通过后，才删除 TS 该语言 fallback 抽取路径。

实现进度（本地 cutover 完成，待 commit+push + 3-OS CI 终裁）：选 SPLIT（决策1）+ 无框架 back-fill（决策2），为迄今最干净 cutover（接近 Go）。改动 4 个代码/测试文件：①src/indexing/rust-hybrid-contract.ts RUST_HYBRID_RUST_OWNED_LANGUAGES 追加 dart=第15个（plan 据此 .dart 全走 rust、fallbackByLanguage.dart=0）；②rust-index-engine-cli-engine.test.ts status golden 14→15 语言；③extraction.test.ts 新增 describe Dart on rust-hybrid（2 it：跨文件 extends BaseService/with-mixin implements Authenticatable/无new构造 User() 晋升 instantiates/impact radius + post-cutover plan guard）；④ci.yml step2 -t 追加该 2 个新标题。无 framework-routes.ts、无 src/index.ts wiring、无 frameworks-integration 改动（Flutter 导航=widget 树内命令式 calls，非文件级路由）。dart.ts+barrel 保留服务纯 --engine typescript（既有 Flutter setState e2e 显式 engine typescript 不受影响）。本地静态验证：3 个 TS 文件 strip-types --check 通过；复刻 skip-debt 审计 PASS（0 skip/0 .only/35 个 -t 分支全命中真实标题=33+2 Dart）；纯 rust bin 对逐字跨文件 fixture SQLite 直查锁定供给侧（extends BaseService/implements Authenticatable/imports models.dart/calls 含无参 User 可晋升 instantiates）。无 Rust 改动（lib.rs 1-2-9-3 已 171 全绿），EXTRACTION_VERSION 不 bump（与 C#/PHP/Ruby 同属未发布批次）。CI 三 OS 绿后 CLOSED。

**决策：**
- Q: Dart 框架/运行时语义走 migrate / keep TS-shell / split 哪条边界？ → SPLIT（镜像 C#1-2-4-4 / PHP 1-2-5-4 / Ruby 1-2-6-4 保守边界）：hybrid 调度把 dart 加入 RUST_HYBRID_RUST_OWNED_LANGUAGES（第 15 个），每个 .dart 文件走 Rust、fallbackByLanguage.dart=0；但保留 src/extraction/languages/dart.ts 声明式 extractor + barrel 条目，只服务纯 --engine typescript 引擎。cutover 移除的是 hybrid fallback 调度，不是 extractor。 (1-2-9-1~3 已证实纯 Rust 符号/引用边在真实 Flutter 568K LOC 零丢失，纯 TS 引擎仍需 dart extractor 以保持 15 语言可用。)
- Q: Dart cutover 是否需要 Rails/Drupal/ASP.NET 式框架路由 back-fill 或永久 TS 框架 shell？ → 不需要——Dart/Flutter 是迄今最干净的 cutover（形态接近 Go）。Flutter 导航是 widget 树内的命令式 API（Navigator.push/MaterialPageRoute/Navigator.pushNamed），在抽取层就是普通方法调用 refs（Rust 已提取为 calls/references），不存在文件级路由表（对比 Rails routes.rb controller#action、Drupal hook、ASP.NET attribute route）。勘察确认 src/resolution/frameworks/ 无 dart/flutter resolver，dart.ts 是纯声明式 LanguageExtractor（无任何路由 finalization）。故省略 Ruby 1-2-6-4 里的 rust-*-framework-routes.ts、src/index.ts wiring、frameworks-integration 三块；仅 contract 数组加 dart(第15个)+cli-engine golden 15 语言+extraction.test 新增 plan guard 与跨文件 e2e。dart.ts extractor + barrel 保留服务纯 --engine typescript。
<!-- ROADMAP_SECTION_END -->
