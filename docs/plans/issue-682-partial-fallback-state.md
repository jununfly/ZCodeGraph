<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `issue-682-partial-fallback-state.json` | 最后更新: 2026-07-14 00:31:02

[x][X+] 1. Issue #682: Three-tier fallback health state (healthy/partial/degraded)
├── [x][Y+] 1-1. Add 'partial' to RustHybridFallbackState type and update rustHybridFallbackStateFor() three-tier logic
├── [x][Y+] 1-2. Update existing tests: assert 'partial' instead of 'degraded' for non-Rust-owned language fallback scenarios
├── [x][Y+] 1-3. Update clack.log in zcodegraph.ts: conditional info/warn based on fallback state
├── [x][Y+] 1-4. Update formatRustHybridFallbackHealthLines() for partial state output (info line + language breakdown)
└── [x][X+] 1-5. End-to-end verification and PR submission
<!-- ROADMAP_SECTION_END -->
