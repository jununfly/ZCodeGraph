<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-08 14:37:52

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

### 当前施工：1-2-4-3. C#: 确定性 fixture 测试 + 真实语料验证

聚焦 fixture（对齐 __tests__/extraction 既有夹具）+ 一个中等规模真实项目语料；benchmark 证据落 docs/benchmarks/（含 SHA 与 gap 计数）；#692 教训：夹具须 CI 三 OS 可跑，禁止 .skip 充当完成。

**决策：**
- Q: Q: 真实语料 Newtonsoft.Json 测出 2 个 parse-gap，其中 DiagnosticsTraceWriter.cs 是 blank_csharp_preprocessor_directives 对 UTF-8 BOM 不感知引入的回归（raw 0 错 → blanked 1 错 MISSING #endif；全语料 blanking 净收益 44 文件/423 错 → 2/2）。本节点是否修这个 BOM 缺陷？ → A: 修，且只修 Rust 侧 lib.rs。探针三版已实证 strip-BOM 后 blanking 把该文件归零；blanking 方向正确须保留（修 43 文件，含 JsonWriter 107 错）。最小改法：条件指令正则在文件绝对起始处可选吃 UTF-8 BOM (?:\u{feff})? 且 BOM 字节保留不 blank（偏移不变）。TS mirror csharp.ts 有同缺陷但将在 1-2-4-4 删除，本节点不投入。 (note: 修后 parse-gap 只剩 JsonReader.cs L189 的 #if/#else 互斥双臂固有边界（不求值预处理符号无法消除），benchmark 诚实记为已知边界。交付=Rust 单测 + BOM 确定性 fixture(CI 三 OS 无 skip) + 重跑语料复核 + benchmark 文档(SHA 52fa3ae/242 文件/70180 LOC/gap 归因)。)
- Q: Q: 残留 JsonReader.cs 的 #if/#else 不是小边界：保留双臂让该 46KB 核心文件整文件 node_count=1（约87个声明全丢）。是否在本节点把预处理 blanking 从'保留双臂'改为'活动单臂'(保留 #if 臂、blank #elif/#else..#endif)？ → A: 是，改为确定性活动单臂，与 BOM 修复同函数落地。全语料 measure-first 对比(242 文件)：RAW 44 错；保留双臂 1 错(JsonReader，整文件崩)；活动单臂 0 错。声明损失仅 7 个，全部是多目标回退臂(ThreadSafeStore !HAVE_CONCURRENT_DICTIONARY 手写锁回退 field-2、DateTimeUtils !HAVE_TIME_ZONE_INFO method-1、ReflectionUtils method-2、JsonTextReader/DefaultContractResolver 各 field-1)，保留 #if 臂=更现代常用配置；而保留双臂的代价是 JsonReader 约87个声明全丢。csharp.ts 文档原意'index every symbol regardless of build flags'在表达式续接形态有灾难性失败，活动单臂严格更优。需支持嵌套+#elif(从首个 elif/else blank 到 endif，保留换行护偏移)。 (note: EXTRACTION_VERSION 不 bump——C# rust 抽取整体未发布、cutover 在 1-2-4-4，属同一未发布 C# 批次内。TS mirror csharp.ts 仍保留双臂，1-2-4-4 删除，benchmark 诚实记此分歧。交付追加：Rust 单测加 #if/#else 表达式续接用例 + fixture 加 #else 续接形态 + 重跑语料确认 0 parse-gap。)
<!-- ROADMAP_SECTION_END -->
