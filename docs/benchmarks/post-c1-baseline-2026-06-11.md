# Post-Candidate-1 Benchmark Baseline

**Date:** 2026-06-11
**Commit:** `main` (sync with origin)
**Purpose:** Record test status and build health after Phase 1 (Explore Answer Planner Seam) extraction. Serves as regression baseline for future policy improvements.

## Scope

This is a **unit/integration test baseline**, not an agent A/B benchmark. The agent-level A/B benchmarks in `call-sequence-analysis.md` and `answer-directly-vs-explore-agent.md` require external codebases (Elasticsearch, etc.) and real agent sessions — they have not been re-run.

## Build

```
npm run build → PASS (tsc + copy-assets + chmod, 0 errors)
```

Output: `dist/` with 570 files (282 *.map, 141 *.ts, 141 *.js, 5 *.wasm, 1 *.sql)

## Test Suite Results

### Explore-specific tests (Candidate 1 scope) — ALL PASS

| Test File | Tests | Status |
|-----------|-------|--------|
| `__tests__/explore-types.test.ts` | 11 | ✅ |
| `__tests__/explore-renderer.test.ts` | 4 | ✅ |
| `__tests__/explore-planner.test.ts` | 133 | **✅** |
| `__tests__/explore-output-budget.test.ts` | 17 | ✅ (includes SQLite) |
| `__tests__/adaptive-explore-sizing.test.ts` | 8 | ✅ (includes SQLite) |
| `__tests__/explore-blast-radius.test.ts` | 2 | ✅ (includes SQLite) |
| **Total** | **175** | **✅ 175/175 pass** |

### Full suite summary

```
Test Files:  8 failed | 72 passed | 2 skipped (82 total)
Tests:       23 failed | 1608 passed | 9 skipped (1640 total)
Duration:    74.31s
```

### Pre-existing failures (NOT caused by C1 extraction)

| Test File | Failures | Root Cause |
|-----------|----------|------------|
| `status-json.test.ts` | 2 | Path assertion expects `.zcodegraph` but codebase uses `.codegraph` internally |
| `frameworks-integration.test.ts` | 3 | JVM FQN Kotlin/Java cross-language resolution |
| `mcp-daemon.test.ts` | 2 | Daemon lockfile race condition (#411) |
| `mcp-initialize.test.ts` | 3 | MCP handshake timing / async initialization race |
| `mcp-project-isolation.test.ts` | 1 | Cross-project catch-up gate isolation |
| `mcp-roots.test.ts` | 3 | MCP roots/list resolution without rootUri |
| `resolution.test.ts` | 1 | C/C++ #include end-to-end include-dir scan |
| `security.test.ts` | 2 | Symlink escape prevention (#527) |

All 23 failures are pre-existing and unrelated to the explore planner seam extraction. They exist on the upstream CodeGraph repo as well.

## Candidate 1 Artifacts Verification

### Source modules delivered

| Module | Lines | Exports | Role |
|--------|-------|---------|------|
| `src/mcp/explore-types.ts` | 213 | `ExplorePlan`, `ExplorePlanEntry`, `FlowSpineEntry`, `ExploreOutputBudget`, etc. | Type definitions |
| `src/mcp/explore-planner.ts` | 1138 | `plan()`, `matchesSymbol()` + ~20 internals | Planning logic |
| `src/mcp/explore-renderer.ts` | 637 | `render()` | Markdown rendering |
| `src/mcp/tools.ts` handleExplore | ~25 lines | adapter only | Thin MCP adapter |

### Design deviations recorded

See the "Implementation deviations from original design" section in:
`docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md#post-phase-benchmarks`

Summary:

1. **Planner**: Takes `(cg, query, opts?)` instead of pure `(query, subgraph, budget, freshness)` — owns its own subgraph query.
2. **Renderer**: Takes `(plan, cg, flow, blastRadius)` instead of pure `(plan, symbolBodyMap)` — needs CodeGraph for source reads and polymorphic sibling detection.

## Next Steps (for real benchmark)

To establish the true Agent Sufficiency baseline:

1. **Index a target codebase** (e.g., Elasticsearch or a large internal repo):
   ```bash
   npx @jununfly/zcodegraph index /path/to/target
   ```

2. **Run the eval runner**:
   ```bash
   npm run eval -- /path/to/target
   ```

3. **Run agent A/B sessions** (with/without ZCodeGraph) on representative tasks and classify Read/Grep calls per the Fallback boundary definition in `docs/design/architecture-roadmap.md`.

4. **Record results here** as the pre-policy-improvement baseline.
