<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-14 17:15:53

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

### 当前施工：1-2-13-2. Luau: 引用边发射 + Rust gap 诊断 + rust-hybrid 元数据切 rust

import/call/reference 的 unresolved-ref 发射（该语言支持范畴）；parse-gap/extraction-gap 诊断；RUST_HYBRID_RUST_OWNED_LANGUAGES 加入后元数据显示 rust。

**决策：**
- Q: baseline visitor 多集合契约 + Luau 增量边界 → luau.rs 全量复用 lua.rs walker 形状 + Luau 增量两件：type_definition→type_alias（无 exports ref、is_exported 恒 0、零 schema 改动）；typed signature=parameters 文本 + 非 block 后继命名子节点 → ': <return type>'（对齐 luauExtractor.getSignature） (多集合契约（lib.rs 测试锁定）：type_alias 2[Config,Handler]、function 4[helper,helper::inner,map,top]、method 2[M::deposit,M::greet]、variable 8、import 6+imports ref 6、calls 9 精确 multiset、exports ref 恒 0；typed sig 逐字断言 (who: string): string / (amount: number): boolean / (fn: (T) -> U, xs: { T }): { U } / 无类型 (y)；匿名剪枝 f signature 起 '= function()'、lost 不在 calls、无 anonymous 节点；if_expression 初始化值入 sig '= if #xs > 0 then fn(xs[1]) else nil'。关键边界实证：(1) isExported 对 Luau 无下游——luau 不在 TS TYPE_ANNOTATION_LANGUAGES（无 extractTypeRefsFromSubtree）、createNode 仅 extra spread 无列无 exports ref、Rust insert_nodes 硬编码 is_exported=0 → 本波零 schema/TS 改动；(2) TS extractTypeAlias 返 false 不剪枝、type 值子树纯类型节点 → Rust type_definition 分支产节点后递归子节点同构无害；(3) generic_type_list/update_statement/if_expression 走默认递归不产符号（对齐 TS orchestrator）；(4) Luau 无 Lua5.3 位运算 → 维持严格 gating（归 -3 语料 gate）。本地 cargo 184 passed（183→184，baseline 0.26s）、clippy luau 零新增。)
<!-- ROADMAP_SECTION_END -->
