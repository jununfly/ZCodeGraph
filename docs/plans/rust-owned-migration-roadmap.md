<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `rust-owned-migration-roadmap.json` | 最后更新: 2026-09-30 19:25:19

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
└── [ ][X+] 1-6. 排序与调度
    ├── [x][Y+] 1-6-1. 波次1: Kotlin 基线迁移（#692 夹具模式落地后首个新语言）
    ├── [x][X+] 1-6-2. Python 框架充分性检查（Django/Flask/FastAPI 边界实证）
    ├── [~][X+] 1-6-3. Go/Gin 路由所有权检查
    ├── [ ][X+] 1-6-4. Swift 基线迁移（移动桥接成为产品优先级时启动）
    └── [x][Y+] 1-6-5. 波次0: #692 夹具债清零（新语言迁移前置）

### 当前施工：1-6-3-1. [产品修复] 扩展 Rust core Go 路由抽取至 TS 覆盖范围：parse_go_gin_route_call 增 OPTIONS/HEAD、Chi 驼峰 Get/Post/Put/Patch/Delete、net/http HandleFunc/Handle(归 ANY)，保留 group 前缀；rust 单测 + 真实 rust-hybrid e2e(gorilla/mux 链式 .Methods + group) + 3-OS CI

**决策：**
- Q: Q1 修复实现 → parse_go_gin_route_call 动词表从硬编码 5 大写动词改为 VERB_SPELLINGS 14 项：Gin 7 大写(GET/POST/PUT/DELETE/PATCH/OPTIONS/HEAD) + Chi 5 驼峰(Get/Post/Put/Patch/Delete 映射规范大写) + HandleFunc/Handle 映射 ANY。取 call 文本中最早出现的动词标记；needle 含开括号天然消除 .Handle( 与 .HandleFunc( 歧义；链式 s.HandleFunc(...).Methods 命中首个 HandleFunc。group 前缀与 variable_types 方法 handler 处理原样复用。
- Q: Q2 测试层 → 5 个 Rust 纯函数单测(七动词含 OPTIONS/HEAD、Chi 驼峰、HandleFunc/Handle 归 ANY+gorilla 链式 Methods、新动词 group 前缀、非路由负例)，cargo test -p zcodegraph-core 全量 124 passed。新增 1 个引擎无关 TS-shell rust-hybrid e2e：单 it 断言 7 条路由名(OPTIONS/HEAD/GET chi/ANY std/ANY users-id/GET api-v1-users + 2 回归)与 6 条 route->handler references 边。
- Q: Q3 护栏同步 → 无 it.skip(直接新用例)，ALLOWED_SKIPS 保持空。ci.yml step2 -t 追加无元字符唯一子串 extracts-OPTIONS/HEAD-Chi-verbs-stdlib/gorilla-ANY-and-grouped-routes(实际含斜杠与逗号，均非正则元字符)；ci-rust-packaged-path.test.ts 补对应 toContain。python 复现 skip-debt 审计：18 个 -t 分支 0 死分支，新分支唯一命中真实 it。
- Q: Q4 本机实证 → 重建 zcodegraph-core.exe 后对 1-6-3 的 8 标记 .workbuddy/probe-go/ginapp 夹具 --engine rust --force 重索引直查 SQLite：route 4->8(召回 8/8)，OPTIONS /opts、HEAD /healthz、ANY /std、GET /chi、GET /api/v1/users 全在，8 条 route->handler refs 齐全，0 parse error，nodes 16->20、edges 15->19。本机无 node_modules/dist，TS e2e 与三 OS 归 CI。EXTRACTION_VERSION 维持 2(同未发布 v2 语义批，不 bump)。
<!-- ROADMAP_SECTION_END -->
