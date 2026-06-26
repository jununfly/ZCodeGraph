<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-26-zcodegraph-0-10-0-readme-metrics-refresh-roadmap.json` | 最后更新: 2026-06-26 12:14:48

[x][X+] 1. ZCodeGraph 0.10.0 README Metrics Refresh Roadmap
├── [x][X+] 1-1. Release tag boundary and retarget plan
├── [x][X+] 1-2. Corpus and benchmark scope
├── [x][Y+] 1-3. Unified metrics artifact
├── [x][Y+] 1-4. README replacement
└── [x][Y+] 1-5. Validation commit and tag retarget
<!-- ROADMAP_SECTION_END -->

### 当前施工：1-5. Validation commit and tag retarget

Validation, commit, push, and v0.10.0 tag retarget remain.

### 当前施工：1-3. Unified metrics artifact

**决策：**
- Q: Deterministic sufficiency probes 的 pass/fail 标准? → B. 每个 corpus 要求关键符号/route/flow evidence 出现在 zcodegraph_explore 输出中 (不要求完整 agent-stop 证明或 with/without A/B。README 只能表述为 deterministic evidence probes，不写成完整 agent A/B。)
