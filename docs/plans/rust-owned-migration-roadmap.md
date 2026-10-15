<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-15 17:01:02

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
│   ├── [x][Y+] 1-2-10. Pascal/Delphi 基线抽取迁移
│   ├── [~][Y+] 1-2-11. Scala 基线抽取迁移
│   ├── [x][Y+] 1-2-12. Lua 基线抽取迁移
│   ├── [x][Y+] 1-2-13. Luau 基线抽取迁移
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

### 当前施工：1-2-11-4. Scala: 框架/运行时语义边界决策 + TS fallback 移除

三选一决策落本节点：migrate / keep TS-shell / split；边界明确且 fixture+语料通过后，才删除 TS 该语言 fallback 抽取路径。

**决策：**
- Q: 框架/运行时语义边界：migrate / keep TS-shell / split 三选一 → 选 migrate（clean cutover，无 framework back-fill，同 Go/Dart/Lua/Pascal 模式）。证据：(1) scala.ts 是纯符号抽取器 scalaExtractor，零 framework/route 逻辑（grep play/route/akka/http4s/controller 仅 1 处 generic 注释）；(2) rust-scala-framework-routes.ts 不存在（对照 csharp/objc/php/python/ruby/swift 均有 back-fill 文件）；(3) tree-sitter.ts 的 21 行 Scala 全是 TS fallback visitor 路径（scalaBaseTypeName / extends-with / 柯里化参数 / context bounds），cutover 后即死代码；(4) 无其他 TS consumer（razor 式共享消费，对照 csharp.ts→razor 须保留）。Play/Akka route 属 framework 语义，超出 baseline 符号图边界，与 Go/Dart/Lua 一致放弃 back-fill。 (Scala 无 razor 式跨语言 consumer → scala.ts 可删；tree-sitter.ts 21 行 Scala visitor 同步清除；grammars.ts scala wasm vendored 路径保留（TS 语言检测/其他引擎仍可能加载）)
- Q: TS orchestrator enrichment 的 cutover delta 是否接受 → 接受。tree-sitter.ts 移除的 21 行 Scala 中，curried 多参数列表 + context-bound（type_parameters）references 是 TS orchestrator 通用 type-annotation pass 的 enrichment，不属于 baseline extractor 契约——scala.ts 自身只在 val/var @type 调 emitScalaTypeRefs（L134），rust baseline 忠实对齐（scala.rs L694 同样只 val/var）。spark 语料 1,347 references 已验证此边界。因此删除的 Scala cross-file describe（断言 implicit param 链接 fold→Monoid）是 TS-only enrichment 测试，随 cutover 退役；rust 侧不补 method-param/context-bound refs（与所有先行 wave 的 baseline=extractor 契约一致）。新增 rust-hybrid e2e 锁 trait extends 端到端解析。 (本地验证：rust engine 在 2-file fixture 上 0 errored，Monoid trait 发出 Semigroup extends ref；三 OS CI 仲裁 rust-hybrid e2e + 全量 vitest)
<!-- ROADMAP_SECTION_END -->
