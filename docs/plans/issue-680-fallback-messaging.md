<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `issue-680-fallback-messaging.json` | 最后更新: 2026-07-13 23:51:37

[~][X+] 1. Issue #680: Clarify rust-hybrid fallback degraded summary for non-Rust-owned YAML files
├── [x][Y+] 1-1. 修改 FALLBACK_REASON_LABELS 标签并添加语言明细行到 formatRustHybridFallbackHealthLines
├── [x][Y+] 1-2. fallbackSummaryFromHybridMetadata 提取 fallbackByLanguage 字段
├── [x][Y+] 1-3. typescriptFallbackAppend profile 对象添加 fallbackByLanguage 字段
├── [x][Y+] 1-4. clack.log.warn 一行式警告改措辞为 non-Rust-owned files via TypeScript fallback
├── [x][Y+] 1-5. buildDiagnosticBundleSummary 传递 fallbackByLanguage 到 summary
└── [~][X+] 1-6. 端到端验证与 PR 提交

### 当前施工：1-6. 端到端验证与 PR 提交
<!-- ROADMAP_SECTION_END -->
