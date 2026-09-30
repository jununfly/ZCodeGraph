<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-09-30 15:42:20

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
│   ├── [ ][Y+] 1-2-4. C# 基线抽取迁移
│   ├── [ ][Y+] 1-2-5. PHP 基线抽取迁移
│   ├── [ ][Y+] 1-2-6. Ruby 基线抽取迁移
│   ├── [ ][Y+] 1-2-7. Swift 基线抽取迁移
│   ├── [ ][Y+] 1-2-8. Kotlin 基线抽取迁移
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
└── [ ][X+] 1-6. 排序与调度
    ├── [~][Y+] 1-6-1. 波次1: Kotlin 基线迁移（#692 夹具模式落地后首个新语言）
    ├── [ ][X+] 1-6-2. Python 框架充分性检查（Django/Flask/FastAPI 边界实证）
    ├── [ ][X+] 1-6-3. Go/Gin 路由所有权检查
    ├── [ ][X+] 1-6-4. Swift 基线迁移（移动桥接成为产品优先级时启动）
    └── [x][Y+] 1-6-5. 波次0: #692 夹具债清零（新语言迁移前置）

### 当前施工：1-6-1-5. TS fallback 归零 + RUST_HYBRID_RUST_OWNED_LANGUAGES 加 kotlin + 3-OS CI 绿 + ALLOWED_SKIPS/skip-debt 护栏同步

**决策：**
- Q: TS fallback 归零的割接范围与先例？ → 严格对齐 java 先例 41ae7ed 最小割接 (①rust-hybrid-contract RUST_HYBRID_RUST_OWNED_LANGUAGES 加 kotlin；②删 src/extraction/languages/kotlin.ts + barrel import/EXTRACTORS 两行；③grammars.ts(扩展名识别+wasm映射+displayName) 与 tree-sitter.ts(STATIC_MEMBER_LANGS/TYPE_ANNOTATION) 惰性保留——java 先例同样未动，删除 extractor 后这些对 kotlin 不再被 TS 引擎消费，保留降风险且供独立 resolver 框架路径；④遗留 TS 引擎 Kotlin 测试按 java 先例删除+留注释(ALLOWED_SKIPS 必须空)：extraction.test.ts 1120-1324 Kotlin Extraction、1822-1869 Kotlin imports、2948-3083 expect/actual(整个 describe)、4170-4192 KMP 子 it(保留同 describe 的 C/C++ it)。fun-interface/expect-actual 是基线已决策 out-of-scope；⑤加 rust-index-engine-cli-language-smoke kotlin 用例；⑥CHANGELOG+README；⑦ci.yml 已枚举 wave0 文件无需改。resolution.test/is-test-file/frameworks/expo/react-native-bridge 的 kotlin 引用经审计均引擎无关(构造 fixture/路径启发式/独立 resolver.extract)，保留。)
- Q: 终检发现的 2 个 typescript 引擎 + Kotlin 跨语言守卫如何处置？ → 切 rust-hybrid，不删除（family-gate 属性引擎无关），并修正决策④的审计结论 (字符串感知、逐 it( 块（花括号深度）的权威扫描全 __tests__ 后，除已删 4 块外，仅剩 extraction.test.ts 两个真实 typescript+kotlin 耦合块，之前文件级粗扫误判为假阳性：(1) 'does not link a static-member read across language families'（Device.kt，Build.VERSION）；(2) 'a TS PascalCase type ref lands on the TS type, never a same-named native class'（TestUtils.kt，硬断言 Kotlin class TestRunner toBeDefined）。两者不是抽取形状测试，而是 TS-shell name-matcher 的语言族隔离负向守卫（sameLanguageFamily/crossesKnownFamily，resolution/index.ts:1801-1813），该 gate 对引擎一视同仁。留 typescript 则 (1) 变 vacuous、(2) 因 .kt 不再被 TS 引擎索引而 toBeDefined 直接变红。故均切 rust-hybrid：Rust 抽取 Kotlin 符号，终解析仍走同一 family gate，非空泛且保语义。块(1) 标题命中 ci.yml L51 -t 子串，CI 真跑；块(2) 靠全量 npm test 兜底。frameworks-integration 剩余 8 个 typescript 块经逐块核对仅 .java/.go，sdk-rust-hybrid 的 typescript 用例是纯引擎路由契约无 .kt，均安全。扫描脚本 C:\workspace\scan-kt-blocks.py。)
<!-- ROADMAP_SECTION_END -->
