<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `issue-682-partial-fallback-state.json` | 最后更新: 2026-07-14 00:28:56

[~][X+] 1. Issue #682: Three-tier fallback health state (healthy/partial/degraded)
├── [x][Y+] 1-1. Add 'partial' to RustHybridFallbackState type and update rustHybridFallbackStateFor() three-tier logic
├── [x][Y+] 1-2. Update existing tests: assert 'partial' instead of 'degraded' for non-Rust-owned language fallback scenarios
├── [x][Y+] 1-3. Update clack.log in zcodegraph.ts: conditional info/warn based on fallback state
├── [x][Y+] 1-4. Update formatRustHybridFallbackHealthLines() for partial state output (info line + language breakdown)
└── [ ][X+] 1-5. End-to-end verification and PR submission

### 当前施工：1. Issue #682: Three-tier fallback health state (healthy/partial/degraded)

**决策：**
- Q: PR #684 是否已解决 → B. 需进一步改进 degraded 语义 (PR #684 修复了措辞但 degraded 语义仍需调整)
- Q: 状态模型 → A. 三级 healthy/partial/degraded (partial = 仅预期 fallback (non-Rust-owned 语言))
- Q: 改动范围 → A. 仅状态语义 (不扩展 Rust-owned 语言，单独 issue 跟踪)
- Q: partial log 级别 → A. info (degraded 保持 warn) (log 级别与状态语义一致)
- Q: partial 消息格式 → A. 信息行 + 语言明细 (不含 need review 语句)
- Q: missing-file 归类 → A. 归入 degraded (索引不完整)

**当前子树：**
├── [x][Y+] 1-1. Add 'partial' to RustHybridFallbackState type and update rustHybridFallbackStateFor() three-tier logic
├── [x][Y+] 1-2. Update existing tests: assert 'partial' instead of 'degraded' for non-Rust-owned language fallback scenarios
├── [x][Y+] 1-3. Update clack.log in zcodegraph.ts: conditional info/warn based on fallback state
├── [x][Y+] 1-4. Update formatRustHybridFallbackHealthLines() for partial state output (info line + language breakdown)
└── [ ][X+] 1-5. End-to-end verification and PR submission
<!-- ROADMAP_SECTION_END -->
