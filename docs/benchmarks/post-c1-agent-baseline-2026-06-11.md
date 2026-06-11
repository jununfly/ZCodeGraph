# Post-C1 Agent-Level Benchmark Baseline

> **Date:** 2026-06-11
> **Commit:** `59e2157` (docs update + unit baseline)
> **Purpose:** Establish measurable baseline for Candidate 1 Explore Planner Seam before Candidate 2+ policy improvements.

---

## 1. Executive Summary

| Dimension | Baseline Value | Status |
|-----------|---------------|--------|
| Build | 0 errors, clean | ✅ |
| Unit tests (C1 scope) | **175 / 175 pass** | ✅ |
| Unit test duration | **2.57s** | ✅ |
| `handleExplore()` size | **23 lines** (thin adapter) | ✅ |
| Agent A/B eval (external codebase) | ⚠️ **DEFERRED** — needs indexed ES repo | 🔴 |
| Read/Grep Fallback count | ⚠️ **DEFERRED** — needs agent session | 🔸 |
| Sufficiency score | ⚠️ **DEFERRED** — needs human/AI judgment | 🔸 |

---

## 2. Unit Test Regression Baseline

### 2.1 Test Suite Composition

| Module | Tests | LOC | Exports Covered |
|--------|-------|-----|-----------------|
| `explore-planner.test.ts` | 133 | 1781 | 20 exports (~6.7 tests/export) |
| `explore-output-budget.test.ts` | 17 | 256 | Budget tiers + integration |
| `explore-types.test.ts` | 11 | 263 | 6 type exports |
| `adaptive-explore-sizing.test.ts` | 9 | 393 | Skeletonization policies |
| `explore-renderer.test.ts` | 4 | 170 | 1 export (`render`) |
| `explore-blast-radius.test.ts` | 2 | 73 | Blast radius section |
| **Total** | **175** | **2936** | |

### 2.2 Source Code Metrics

| File | Lines | Exports | Role |
|------|-------|---------|------|
| `src/mcp/explore-types.ts` | 212 | 6 | Shared types & interfaces |
| `src/mcp/explore-planner.ts` | 1138 | 20 | Planning logic (core seam) |
| `src/mcp/explore-renderer.ts` | 637 | 1 | Rendering logic |
| `src/mcp/tools.ts` (handleExplore) | 23 | 0 | Thin MCP adapter |
| **Total C1 code** | **2010** | **27** | |

### 2.3 Test-to-Code Ratio

- **Total source LOC:** 1987 (types + planner + renderer, excluding adapter)
- **Total test LOC:** 2936
- **Ratio:** **1.48:1** (test lines per source line)

### 2.4 Per-Function Test Coverage (Planner Exports)

| Export Function | Tests | Coverage Notes |
|-----------------|-------|----------------|
| `computeGraphRelevance` (RWR) | 5 | Seed mass, isolated nodes, empty, uniform fallback, edge kinds |
| `synthEdgeNote` | 7 | Null handling, strategy recognition (callback/EE/react/vue), registeredAt |
| `plan()` (main entry) | 12 | Empty subgraph, budget tier selection, maxFiles clamp, fileGroups, spine, adaptive flag, glue/central/entry fields |
| Evidence Value (`assignEvidenceValues`) | 4 | Critical/supportive/compressible classification, reason field, renderMode+score, distracting exclusion |
| Polymorphic Siblings (`applyPolySiblingPolicy`) | 5 | Off-spine skeletonization, on-spine keep-full, uniquely-named spare, adaptive disable |
| `matchesSymbol` | 8 | Simple name, qualified (::/.), file-path qualified, rejections |
| `parseQueryTokens` | 10 | Empty, identifiers, extensions, qualifiers, length filter, dedup, cap, delimiters, non-identifier filter |
| `isTestPath` | 8 | Directory detection (tests/spec/__tests__/testdata/mocks/fixtures), extension detection, rejection |
| `bodyLines` | 4 | Normal, single-line, missing endLine, malformed |
| `inNamedContext` | 7 | filePath match, qualifiedName match, reject both-empty, partial path, dir equality |
| `seedNamedSymbols` | 7 | Empty query, simple inject, non-callable skip, test skip, ≤3 inject, ≥4 overload filter, fallback, existing subgraph mark |
| `isLowValue` | 13 | All test path patterns + icon/i18n + rejection |
| `buildFileGroups` | 7 | Empty, grouping, splitting, score weights (+50/+10/+3/+1), import/export skip, accumulation |
| `countDistinctTermHits` | 6 | Empty files, path terms, node name terms, distinct-only, multi-file, short-term filter |
| `aggregateFileGraphScores` | 4 | Empty zero-max, RWR aggregation, missing-node handling, cross-file max |
| `gateAndSortFiles` | 9 | Empty, score gate (<3), test exclude, test keep, entry protection, term-hit protection, named-seed sort, generated deprioritize, min-2 guard |
| `readAdaptiveEnabled` | 5 | Default true, "0" false, "1" true, non-zero true, empty false |

---

## 3. Representative Explore Query Set

For future agent-session A/B testing, these queries exercise distinct planner seams:

### Category A: Mechanism Tracing

| ID | Query | Seam Exercised |
|----|-------|---------------|
| Q-A1 | `"How does the explore answer get planned and rendered?"` | Full pipeline: plan → flow → blastRadius → render |
| Q-A2 | `"How does handleExplore delegate to planner?"` | Adapter thinness, plan() call signature |
| Q-A3 | `"How is evidence value assigned to files?"` | assignEvidenceValues, buildFileGroups scoring |
| Q-A4 | `"How does output budget cap the answer?"` | getExploreOutputBudget, budget tiers |

### Category B: Polymorphic Family Exploration

| ID | Query | Seam Exercised |
|----|-------|---------------|
| Q-B1 | `"How are polymorphic siblings skeletonized?"` | applyPolySiblingPolicy, family-file detection |
| Q-B2 | `"What happens when an off-spine sibling is uniquely named?"` | RealCall fix, uniqueness-aware sparing |
| Q-B3 | `"How does the renderer decide full vs skeleton mode?"` | renderMode propagation to renderer |

### Category C: Cross-Module Flow

| ID | Query | Seam Exercised |
|----|-------|---------------|
| Q-C1 | `"How does findRelevantContext feed into the planner?"` | Subgraph → plan() pipeline |
| Q-C2 | `"How is the call-chain spine built?"` | buildFlowFromNamedSymbols, seedNamedSymbols |
| Q-C3 | `"How does blast radius extend the answer?"` | buildBlastRadiusSection, caller traversal |

### Category D: Edge Cases

| ID | Query | Seam Exercised |
|----|-------|---------------|
| Q-D1 | `"Explore something that doesn't exist"` | Empty subgraph early return |
| Q-D2 | `"Explore a test file directly"` | isTestPath, isLowValue filtering |
| Q-D3 | `"Explore with a very long query"` | parseQueryTokens cap at 16 |
| Q-D4 | `"Explore a generated file"` | Generated file deprioritization in sort |

---

## 4. Architecture Quality Gates

These are the structural metrics that define "planner seam health":

| Gate | Metric | Baseline | Target |
|------|--------|----------|--------|
| Adapter thinness | `handleExplore()` LOC | **23** | < 30 |
| Planner cohesion | Exports from explore-planner.ts | **20** | Stable or decreasing |
| Renderer isolation | Exports from explore-renderer.ts | **1** (`render`) | = 1 |
| Type completeness | Types in explore-types.ts | **6** | Cover all shared shapes |
| Test coverage ratio | Test LOC / Source LOC | **1.48:1** | > 1:1 |
| Test count per export | Avg tests per planner export | **~8.4** | > 5 |
| Integration tests | End-to-end explore answers | **2** (budget integration) | >= 2 |

---

## 5. Deferred Measurements

The following require infrastructure not yet available in CI/CD:

### 5.1 External Codebase Eval (searchNodes + findRelevantContext)

**Requirement:** An indexed codebase with `.zcodegraph/zcodegraph.db`
**Current blocker:** No suitable multi-language indexed repo available
**Existing harness:** `__tests__/evaluation/runner.ts` with 12 Elasticsearch-focused test cases
**Action needed:** Index a representative codebase (ES clone or equivalent), run `npm run eval`, record recall/MRR/latency

### 5.2 Agent Session Metrics

**Requirement:** Running ZCodeGraph MCP server + headless agent session
**Metrics to capture:**

| Metric | Definition | How to Measure |
|--------|-----------|---------------|
| Read/Grep Fallback Count | Number of times agent uses Read/Grep after explore | Log tool calls post-explore |
| Total Tool Calls | All tool calls in session | Session log analysis |
| Wall-Clock Time | Session duration | Timer around session |
| Answer Sufficiency | Human/AI rating of answer quality | rubric-based evaluation |
| Output Token Count | Size of explore response | String length / token estimate |

### 5.3 Pre/Post Comparison Data

To measure C2+ impact, we need:

1. **This baseline document** (✅ done)
2. **Pre-change agent sessions** using current C1 code (⚠️ deferred)
3. **Post-change agent sessions** after each C2+ improvement (future)

---

## 6. Runbook for Future Baseline Updates

When updating this baseline (e.g., after C2+ changes):

```bash
# 1. Ensure clean build
npm run build

# 2. Run explore-specific tests with timing
npx vitest run __tests__/explore-planner.test.ts \
  __tests__/explore-renderer.test.ts \
  __tests__/explore-types.test.ts \
  __tests__/explore-output-budget.test.ts \
  __tests__/adaptive-explore-sizing.test.ts \
  __tests__/explore-blast-radius.test.ts \
  --reporter=verbose

# 3. Record results in new docs/benchmarks/post-cN-agent-baseline-YYYY-MM-DD.md
#    following the same template as this document

# 4. For external eval (when available):
EVAL_CODEBASE=/path/to/indexed/repo npm run eval

# 5. Diff against this baseline to detect regressions
```

---

## 7. Sign-Off

| Check | Owner | Date |
|-------|-------|------|
| Unit regression baseline recorded | AI (zj-grill-with-docs) | 2026-06-11 |
| Plan document updated with deviations | AI (zj-grill-with-docs) | 2026-06-11 |
| Representative query set defined | AI (zj-grill-with-docs) | 2026-06-11 |
| External codebase eval | **BLOCKED** — no indexed repo | — |
| Agent session baseline | **BLOCKED** — needs MCP + agent infra | — |
