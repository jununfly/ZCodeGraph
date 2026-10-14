<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-10-14 12:15:57

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
│   ├── [x][Y+] 1-2-7. Swift 基线抽取迁移
│   ├── [~][Y+] 1-2-8. Kotlin 基线抽取迁移
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

### 当前施工：1-2-3-2. C++ 增强：bodyless 头文件声明符号与定义关联（backlog）

**决策：**
- Q: backlog 编排：C++ bodyless headers 归属 → 新增子节点 1-2-3-2 挂到 CLOSED 波 1-2-3 下，作独立增强波 (C++ 1-2-3 已 CLOSED（#678+1-2-3-1 夹具清零），bodyless 头（纯声明 .h 无对应 .cpp 实现体）符号与定义关联属 baseline 外增强，非回归；独立 explore 节点，不阻塞、不 bump EXTRACTION_VERSION，待产品优先级排波。)
- Q: C++ bodyless 头声明抽取范围与声明↔定义节点关系 → 全量三态分流 + 声明/定义共存 (scope gate=Product execution（用户确认）。路线：(1) lib.rs declaration 分支按 declarator 类型分流——function_declarator→function（自由）/method（带 qualified_identifier 或在 class/struct 体内，qualifiedName=file::[ns::]Class::name 对齐 G4 形状）；非函数 declarator 且在 class/struct 体内→field（signature="Type name"，为字段接收者推断铺路）；其余→variable 保持现状。(2) 声明与定义各自产 method 节点，resolveMethodOnType(name-matcher.ts:254) 按 Class::method 后缀匹配取 matches[0]，与 G4 inline+out-of-class 共存同构，零 TS 改动。(3) 单一事实源 lib.rs；不 bump EXTRACTION_VERSION（unreleased C++ 同批）。(4) 测试三层：rust unit（声明三态+嵌套类+namespace）、wave0 fixture、真实语料 gate 沿用既有 C++ 语料 0-gap。)
- Q: 实现与验证结果 → lib.rs declaration|field_declaration 双 kind 统一三态分流，三层验证全绿 (关键 AST 事实（dump 实证，纠正初始假设）：tree-sitter-cpp 类内 bodyless 声明用 field_declaration（非 declaration），且 declaration/field_declaration 均无 declarator field 标签（function_definition 才有）→ 新增 cpp_declaration_declarator 按排除法定位 declarator；unwrap_cpp_declarator 解包 reference/pointer 包装；cpp_declarator_ptr_prefix 从包装层收集 */& 前缀拼进 field signature（CDetect* m_cpAlg）。实现：declaration|field_declaration 统一 handler 按 declarator 三态——function_declarator→function/method（类内或 qualified→method，qname=file::[ns::]Class::name 对齐 G3/G4）；非函数且在 class/struct 体内→field（signature=Type[*&] name）；其余→variable 保持。destructor ~Foo() 产 method 名=类叶名。验证：cargo 181/181（180→181，G4 Processing 2→4 decl+def 共存）；wave0 +1 it 本地 binary+sqlite 逐字 ALL PASS；真实语料 nlohmann/json 495f 0 error/22814 nodes，method hpp 1934、field 1884、field signature 指针前缀正确（BasicJsonType* value），同 qname overload 重复=G3 既有行为非本波引入。clippy 新增代码零告警（type_complexity 用 CppNamedSymbol alias 收敛；9899 为 G4 pre-existing）。证据 docs/benchmarks/2026-10-14-rust-owned-cpp-bodyless-headers-validation.md。Probe 环境教训：WorkBuddy shell printf/python 把 \n 渲染成字面 /n（sandbox 文本转换），写 fixture 必须 python chr(10).join 或 newline='\n'。)
<!-- ROADMAP_SECTION_END -->
