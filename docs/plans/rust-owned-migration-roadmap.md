<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-14 19:27:49

[~][X+] 1. Rust-Owned 索引迁移路线图
├── [x][Y+] 1-1. 现状基线校准（2026-09-28 代码核对）
│   ├── [x][Y+] 1-1-1. Rust-owned 语言清单核对（rust-hybrid-contract.ts）
│   ├── [x][Y+] 1-1-2. C++ 已迁移事实校准（PRD 状态过期项）
│   ├── [x][Y+] 1-1-3. 真实语料证据文档清点
│   └── [x][Y+] 1-1-4. 剩余迁移范围确认
├── [~][Y+] 1-2. Goal1: Grammar 语言基线抽取迁移到 Rust
│   ├── [x][Y+] 1-2-1. Java 基线抽取（已完成）
│   ├── [x][Y+] 1-2-2. C 基线抽取（已完成）
│   ├── [x][Y+] 1-2-3. C++ 基线抽取（已完成, #678）
│   ├── [x][Y+] 1-2-4. C# 基线抽取迁移
│   ├── [x][Y+] 1-2-5. PHP 基线抽取迁移
│   ├── [x][Y+] 1-2-6. Ruby 基线抽取迁移
│   ├── [x][Y+] 1-2-7. Swift 基线抽取迁移
│   ├── [x][Y+] 1-2-8. Kotlin 基线抽取迁移
│   ├── [x][Y+] 1-2-9. Dart 基线抽取迁移
│   ├── [ ][Y+] 1-2-10. Pascal/Delphi 基线抽取迁移
│   ├── [ ][Y+] 1-2-11. Scala 基线抽取迁移
│   ├── [x][Y+] 1-2-12. Lua 基线抽取迁移
│   ├── [ ][Y+] 1-2-13. Luau 基线抽取迁移
│   └── [x][Y+] 1-2-14. Objective-C 基线抽取迁移
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

### 当前施工：1-2-13-3. Luau: 确定性 fixture 测试 + 真实语料验证

聚焦 fixture（对齐 __tests__/extraction 既有夹具）+ 一个中等规模真实项目语料；benchmark 证据落 docs/benchmarks/（含 SHA 与 gap 计数）；#692 教训：夹具须 CI 三 OS 可跑，禁止 .skip 充当完成。

**决策：**
- Q: 语料 gate 结论：strict 还是 tolerant？ → Luau 进 tolerates_parse_errors——grammar 1.2.0（2024-12 已最新）系统性落后于语言演进，不是抽取器漂移 (实证（C://workspace//luau-abi-probe argv 模式对 566 文件逐文件 SEXP 归因）：strict 下 lute 55/525 + rbxutil 7/69 文件 rust-owned-parse-gap，根因全部是合法现代 Luau 语法——@native 属性、const function、前导竖线联合 type T<V> = |A|B、typeof(...) 返回类型、泛型可变参 T...、嵌套泛型断言 {} :: Hash<"md5">。error-recovery 局部于声明，walker 无 unwrap/indexing 不 panic。属 Kotlin/Dart/Swift 型（合法语法被 pinned grammar 标 ERROR），非 Lua -3 型（0 漂移）。tolerant 后 lute 688f 0 errored 14878 nodes 3.0s（strict 13086→+1792，type_alias 187→633 definitions/ 全类型文件被 strict 整丢）、rbxutil 91f 0 errored 2292 nodes 375ms；736/997 lute fn/method 带 typed sig。fixture 4 case（golden 多集合 / Luau-only 语法 inert / 多名 local+匿名剪枝 / grammar-lagged 语法恢复）全部 debug binary+sqlite 逐字验证。语料取舍：luau-lang/luau tests 含故意非法+非 UTF-8 文件（parser torture 非生产码）弃用；luau-lsp 26 .luau 埋 C++ 大树（walker 扫整树 13min+ 无产出）弃用。无 fork 无 rust-024（1.2.0 已最新，除非上游出 ABI14 新 grammar）。benchmark docs/benchmarks/2026-10-14-rust-owned-luau-lute-rbxutil-validation.md。EXTRACTION_VERSION 保持 2。)
<!-- ROADMAP_SECTION_END -->
