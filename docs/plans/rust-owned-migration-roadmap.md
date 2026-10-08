<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-08 15:52:52

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
│   ├── [~][Y+] 1-2-4. C# 基线抽取迁移
│   ├── [ ][Y+] 1-2-5. PHP 基线抽取迁移
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

### 当前施工：1-2-4-4. C#: 框架/运行时语义边界决策 + TS fallback 移除

三选一决策落本节点：migrate / keep TS-shell / split；边界明确且 fixture+语料通过后，才删除 TS 该语言 fallback 抽取路径。

**决策：**
- Q: Q: C# 三选一（migrate 框架语义进 Rust / keep 全 TS shell / split）如何定？ → A: split。纯语法抽取切 Rust（删 src/extraction/languages/csharp.ts 115 行 + csharp 加入 RUST_HYBRID_RUST_OWNED_LANGUAGES），但保留 src/resolution/frameworks/csharp.ts 的 aspnetResolver 为 TS shell，并新建 src/indexing/rust-csharp-framework-routes.ts（镜像 rust-python-framework-routes.ts）在 finalizeRustIndex 的 runPostExtract 后、batched resolve 前 back-fill ASP.NET route 节点。 (note: 证据——aspnetResolver 有 extract()(类级[Route]前缀+[HttpGet]bare/string+minimal API app.MapGet+route->handler references)但无 postExtract；其 route 抽取只在 TS parse 路径 tree-sitter.ts L4189 对每文件调用，切 rust-owned 后 .cs 绕过该路径→route 100% 丢失（与 Python 1-6-2-4 同构）。aspnetResolver.resolve()(controller/DI/repository/model 启发式)是语言无关 resolver 注册的一部分，finalize 全量 resolve 仍跑，不丢。razor-extractor 不依赖 csharpExtractor，不受影响；blanking 已在 Rust core 1-2-4-3 修好。)
- Q: Q: split 首条 decide 的 note 称 'razor-extractor 不依赖 csharpExtractor 不受影响'——经核实此判断错误，TS fallback 抽取路径到底如何移除？ → A: 不物理删除 src/extraction/languages/csharp.ts(115 行) 与 EXTRACTORS barrel 注册，二者保留（已 git checkout 还原）。'移除 TS fallback 抽取路径' 仅通过把 csharp 加入 RUST_HYBRID_RUST_OWNED_LANGUAGES 实现——hybrid plan 不再把 .cs 排入 fallbackFiles（fallbackByLanguage.csharp=0），.cs 默认走 Rust。csharp.ts 仍服务两个真实消费者：(1) Blazor razor-extractor.ts L252-279 processCodeBlocks 对每个 @code/@functions 块 new TreeSitterExtractor(fp,'class __RazorCode__{...}','csharp').extract()（razor 是 TS 拥有语言，非 rust-owned）；(2) 纯 engine:'typescript' 直调。 (note: 决定性先例——rust-owned 切完后 python.ts/go.ts 的 TS extractor 文件与 barrel 注册(python:pythonExtractor/go:goExtractor)仍保留，其 TS 直调用例(Python Extraction L635/Go Extraction L675/imports)也仍在；只有无内部消费者的 kotlin.ts/java.ts/cpp 被物理删除。若删 EXTRACTORS['csharp']，tree-sitter.ts L230 extractor=null、L359 visitNode 首行 if(!this.extractor)return 静默早退，Blazor @code 块引用抽取静默失效（不崩溃），直接打破 extraction.test.ts:3505 'delegates Blazor @code block C#...'。isLanguageSupported('csharp')(grammars.ts:299)只查 grammar 加载、csharp grammar 仍在，故 razor L253 守卫照样通过、断链无任何报错。Task3 原物理删除判定作废，改为 ownership 表切出。)
- Q: Q: split cutover 的真实语料证据（route backfill 是否真能在 Rust 抽基线符号的同时保住 ASP.NET route）如何？ → A: 通过。真实语料 eShopOnWeb src/Web（dotnet-architecture/eShopOnWeb@4da8212，sparse 仅取 src/Web，64 .cs/2658 LOC）：真实 rust bin 索引 66 文件（64 cs+2 js）filesErrored=0、872 节点（120 method/63 module/62 class…）、Rust 图在 backfill 前 route=0；TS aspnetResolver.extract（transpile require hook 真跑，非 stub）对 64 .cs 抽 25 route（15 GET/10 POST，全 attribute-controller，0 minimal——Program.cs 用 MVC MapControllerRoute）+25 route→handler 引用；detect()=true；25/25 handler 全部 same-file 命中 Rust method 节点、0 missing。cutover 前后基线符号与 route 图等价（872 节点 / 25 route / 25 可解析），唯一变化是不再 schedule 64 个 .cs TS fallback 文件（cutover 前也只是 contentHash no-op）。minimal API 路径由新 frameworks-integration 夹具确定性覆盖。benchmark 落 docs/benchmarks/2026-10-08-rust-owned-csharp-aspnet-route-cutover.md（governance exit 0）。 (note: 诚实限制（与 cutover 前 TS 行为一致，非本节点回归）：route 名保留原始 token 占位 /[controller]/[action]（运行时 SlugifyParameterTransformer 才替换）；MVC convention 路由 MapControllerRoute 不产 route 节点（extractor 只建模 attribute route + minimal API Map*）；sparse 语料不含被引用的 ApplicationCore/Infrastructure 等项目故不测跨项目边（1-2-4-2 夹具已覆盖跨文件）。route 归因 ManageController 20/OrderController 2/UserController 3。)
<!-- ROADMAP_SECTION_END -->
