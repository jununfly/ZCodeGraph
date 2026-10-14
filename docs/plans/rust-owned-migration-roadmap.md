<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-14 16:52:13

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

### 当前施工：1-2-13-1. Luau: Rust SourceLanguage 注册 + grammar 接入 + 基线符号对齐 TS extractor

范围：Lua 兼容抽取 + Luau 类型定义。grammar：tree-sitter-luau（自 vendor wasm）；应最大化复用 Lua Rust 抽取。交付：扩展名检测、parser 初始化、file/module 节点与 schema 兼容、基线符号节点逐项对齐 TS extractor。

**决策：**
- Q: grammar 供应链三选一 (crates.io 版本 / fork / rust-024 重生成) → crates.io tree-sitter-luau 1.2 (最新, 2024-12)：ABI14 实证 + LANGUAGE 常量 + tree-sitter-language 0.1 passthrough，同 objc3.0/swift0.6 型，无 fork 无 pin 降级 (独立探针 C://workspace//luau-abi-probe 实证：1.0.0/1.1.0 同为 ABI14 但旧式 language() + tree-sitter 0.20 绑定（links 冲突不可用），1.2.0 parser.c LANGUAGE_VERSION=14 直编直过。Lua-parity 节点/field 逐字对齐 lua.rs 依赖（chunk root、function_declaration @name 三态、variable_declaration>assignment_statement、function_call @name/@arguments、require 形状）；Luau 增量=type_definition(export 关键字在节点文本内，对齐 TS isExported 切片)、返回类型=parameters 后无名类型节点、generic_type_list、update_statement、if_expression。边界：Luau 无 Lua5.3 位运算符(&,|,<<,>>,~)→混入文件 has_error=true，非漂移（Luau 语义本不支持）；tolerates_parse_errors 默认严格（同 Go/Java/Lua），归 -3 语料 gate。extractVariable 类型注解 local x: number 无碍（TS/Rust 均只从 variable_list @name=identifier 产 variable）。)
- Q: Luau/Lua 抽取器复用边界 (复用 lua.rs / 独立 luau.rs) → 独立 luau.rs 模块，-1 空骨架；-2 visitor 复用 lua.rs walker 形状但独立实现（加 type_definition→type_alias + typed signature） (理由：(1) TS 侧 luauExtractor 本就独立注册、继承 luaExtractor 仅加 typeAliasTypes/isExported/getSignature 三处；(2) Rust 侧 lua.rs 的 LANG 常量、signature 生成、type_definition 处理需分叉，共享单文件会引入语言分支噪音；(3) 镜像 objc.rs/swift.rs 独立模块惯例。接线：lib.rs 6 处（mod luau、enum 变体 Luau(Lua 后 Python 前)、.luau 扩展名、codegraph_name 'luau'、LANGUAGE.into()、is_luau()、dispatch 分支 lua 后 python 前）；不入 tolerates_parse_errors；无跨语言 family（Luau 不进 jvm/apple map）；无 128MiB worker（Luau AST 与 Lua 同浅）。新增 lib.rs 测试 luau_parses_and_dispatches_through_rust_pipeline_grammar_wiring（2 .luau 含类型表面，files_indexed=2/errored=0/parse_by_language luau=2）。本地 cargo 183 passed（182→183）、clippy luau 零新增。)
<!-- ROADMAP_SECTION_END -->
