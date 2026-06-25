<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-24-rust-hybrid-indexing-ownership-roadmap.json` | 最后更新: 2026-06-25 15:56:10

[~][X+] 1. Rust-Hybrid Indexing Completion And Performance Roadmap
├── [x][X+] 1-1. Current fact base and evidence archive
│   ├── [x][X+] 1-1-1. Validated facts from completed performance roadmaps
│   └── [x][X+] 1-1-2. Evidence documents retained as source material
├── [x][X+] 1-2. Rust-owned indexing completion boundary
│   ├── [x][X+] 1-2-1. Rust-owned supported language target set
│   └── [x][X+] 1-2-2. TypeScript shell and fallback ownership boundary
├── [~][Y+] 1-3. Resolver finalization ownership frontier
│   ├── [x][Y+] 1-3-1. Facts protocol first slice for LowerName QualifiedName FileNodes
│   ├── [x][X+] 1-3-2. Reference disambiguation semantic migration slices
│   └── [~][Y+] 1-3-3. Finalization cleanup and edge write ownership slices
├── [ ][X+] 1-4. Performance evidence lanes under ownership migration
│   ├── [ ][X+] 1-4-1. Baseline trend recording for every ownership slice
│   └── [ ][Y+] 1-4-2. Bounded performance exploit only when ownership progress needs it
├── [ ][X+] 1-5. Agent Sufficiency and graph semantics guardrails
│   ├── [ ][X+] 1-5-1. Graph parity fallback taxonomy and RSS evidence
│   └── [ ][X+] 1-5-2. Agent Sufficiency trigger conditions
├── [~][X+] 1-6. No-go defer and research archive
│   ├── [x][X+] 1-6-1. Default no-go and diagnostic-only routes
│   └── [ ][X+] 1-6-2. Research and oracle-needed routes
└── [x][Y+] 1-7. Execution rules and first-stage closeout
    ├── [x][Y+] 1-7-1. First stage builds map only
    └── [x][Y+] 1-7-2. Next stage opens facts protocol implementation issues
<!-- ROADMAP_SECTION_END -->

### 当前施工：1-3-3-2-2-2-2-2-1. Package imports # repo-local file-level edge-write ownership

**决策：**
- Q: 第八刀拆成几个 implementation issues？ → A. 3 issues：diagnostics / happy-path edge-write / fail-closed+closeout (顺序为 moduleEdgeWrite.packageImports diagnostics contract、package imports direct/pattern/condition repo-local edge-write、fail-closed taxonomy + declaration/runtime reuse closeout。)
- Q: 第八刀 implementation issues 发布了吗？ → 已发布 #537, #538, #539 (#537 diagnostics；#538 package imports repo-local file-level edge-write；#539 fail-closed taxonomy + declaration/runtime closeout。)
