<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-13 14:01:03

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
│   ├── [ ][Y+] 1-2-12. Lua 基线抽取迁移
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

### 当前施工：1-2-12-3. Lua: 确定性 fixture 测试 + 真实语料验证

聚焦 fixture（对齐 __tests__/extraction 既有夹具）+ 一个中等规模真实项目语料；benchmark 证据落 docs/benchmarks/（含 SHA 与 gap 计数）；#692 教训：夹具须 CI 三 OS 可跑，禁止 .skip 充当完成。

**决策：**
- Q: 旧 tree-sitter-lua 0.2.0(ABI14,MunifTanjim) grammar 对真实现代 Lua 语料是否产生 multiset/error-recovery 漂移，是否需 tolerates_parse_errors / 128MiB worker / fork 新 grammar 重生成 ABI14？ → 零漂移，三项后备全部不需要。两互补语料：Penlight dfa483d 40f/14235 LOC（Lua5.1/LuaJIT 经典 stdlib，table-module idiom 密集）+ plenary.nvim 74b06c6 80f/13138 LOC（现代 Neovim：5.2 goto/::label::、5.3 位运算、~95 匿名闭包、1072-LOC 深嵌套 profiler）。两者 filesErrored=0、files.errors 列空、kind=ERROR 节点=0；旧 grammar 连 goto/位运算/最深文件都 0 ERROR，故 Lua 不进 tolerates（同 Go/Java/Ruby），AST 浅 debug binary 385/377ms 无需 scoped worker（Dart 才需 128MiB），Dart 式 fork+rust-024 重生成不需要。多集合合理：Penlight variable1701/method485/function207/import81 + calls2290/imports81；plenary variable1331/method244/function144/import115 + calls2165/imports115；无 extends/implements/references（Lua 无 class 型边）。命名抽检：function M:clone()→List::clone 强制 receiver qname、嵌套 local 产 parse_date_unsafe::nextp、动态 require('pl.'..name) 忠实取字符串前缀 pl.（TS 同构无法求值拼接）、callee 点/冒号原样 self 不折叠、匿名闭包不产 function 节点 body 剪枝。fixture：__tests__/rust-owned-language-fixtures.test.ts 新增 Lua baseline describe 3 用例（module golden 多集合/calls 拼写+嵌套参数+wrap(require)/locals 多名+匿名剪枝+require 挖取），本地无 vitest→build debug binary 对逐字 fixture e2e + Python sqlite 逐条核对全 PASS，strip-types --check exit0；CI 随 step1 全文件跑（非跨文件 e2e 不进 -t），ALLOWED_SKIPS 空、无 .skip/.only。证据 docs/benchmarks/2026-10-13-rust-owned-lua-penlight-plenary-validation.md。cargo --lib 180 passed（含 -2 golden）。 (1-2-12-4 cutover 可直接用 crates.io =0.2.0 pin；Lua 无框架路由/宏，预期 Go/Dart 式干净 cutover 无 TS framework backfill，仅 contract RUST_HYBRID_RUST_OWNED_LANGUAGES 加 lua + cli-engine status golden + 删 TS fallback 调度。EXTRACTION_VERSION 不 bump(unreleased)。)
<!-- ROADMAP_SECTION_END -->
