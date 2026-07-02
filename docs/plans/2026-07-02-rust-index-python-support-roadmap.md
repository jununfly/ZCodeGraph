<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-07-02-rust-index-python-support-roadmap.json` | 最后更新: 2026-07-02 20:34:03

[~][X+] 1. 添加 rust-index 对 Python 语言的支持
├── [~][X+] 1-1. 探索 rust-index 与现有 Python 支持边界
├── [~][X+] 1-2. 实现 rust-index Python 基础语义可信路径
│   ├── [x][Y+] 1-2-1. 建立 Rust Python 基础符号契约测试
│   ├── [x][Y+] 1-2-2. 补齐 Rust Python 调用与 import reference 语义
│   └── [ ][Y+] 1-2-3. 验证 rust-hybrid Python owns 与 fallback 健康信号
└── [ ][X+] 1-3. 隔离 Python 框架路由与高级解析后续范围
    └── [ ][X+] 1-3-1. 登记 Django Flask FastAPI 路由为后续候选

### 当前施工：1-1. 探索 rust-index 与现有 Python 支持边界

**决策：**
- Q: 代码库已经回答了什么？ → rust core 已包含 tree-sitter-python、.py/.pyw 识别、extract_python_symbols，以及一条最薄的 rust-hybrid Python smoke；当前缺口不是从零接入，而是提升到可相信的 rust-owned Python 基础语义。 (已观察到 Rust 侧仅明确覆盖 file/module/class/method/function/import 与 import refs；TS 侧还有 Python import 依赖召回、Django/Flask/FastAPI framework routes 等更高层能力。)
<!-- ROADMAP_SECTION_END -->
