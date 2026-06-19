# Architecture Roadmap — Validation Report

**Date:** 2026-06-11 · **Branch:** `main` · **ZCodeGraph 0.9.9**

This report validates that the 7-candidate architecture roadmap has landed in
the current codebase. It covers static checks, the full test suite, a production
build, indexing this repository, and CLI smoke tests against the generated
`.zcodegraph/` index.

Agent A/B benchmarks were not executed in this pass. They require the benchmark
corpus and an authenticated agent CLI environment, and are treated as retrieval
effectiveness experiments rather than architecture-completion checks.

## Validation Summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npm test` | ✅ 81 test files passed, 1 skipped |
| `npm run build` | ✅ clean |
| Local index with built CLI | ✅ 252 files indexed |
| CLI smoke tests | ✅ version, status, query, callers, affected |
| Agent A/B benchmark | Not run |

The default shell `node` was v26.0.0, which correctly triggers ZCodeGraph's
unsupported-version guard. CLI validation used the Codex bundled Node v24.14.0,
which satisfies the project's `<25.0.0` engine range.

## Test Suite Results

`npm test`:

- **Test files:** 81 passed, 1 skipped
- **Tests:** 1,625 passed, 15 skipped
- **Failures:** 0

Focused architecture-related suites are covered in the full run, including:

- `__tests__/explore-planner.test.ts` — 133 tests
- `__tests__/explore-renderer.test.ts` — 4 tests
- `__tests__/explore-types.test.ts` — 11 tests
- `__tests__/synthesizer-registry.test.ts` — 22 tests
- `__tests__/index-pipeline.test.ts` — 28 tests
- `__tests__/parse-executor.test.ts` — 32 tests
- `__tests__/command-context.test.ts` — 20 tests
- `__tests__/install-plan.test.ts` — 24 tests
- `__tests__/install-renderer.test.ts` — 27 tests
- `__tests__/access-models.test.ts` — 11 tests

## Build Results

`npm run build` completed successfully:

- TypeScript compilation passed.
- `src/db/schema.sql` was copied into `dist/db/schema.sql`.
- Tree-sitter WASM assets were copied into `dist/extraction/wasm/`.
- `dist/bin/zcodegraph.js` was marked executable.

## Real-Project Indexing

Indexed ZCodeGraph itself using the built CLI:

```
$ node dist/bin/zcodegraph.js init
Indexed 252 files
3,873 nodes, 16,104 edges in 1.3s
```

Status JSON after indexing:

- **Version:** 0.9.9
- **Index path:** `.zcodegraph`
- **Files:** 252
- **Nodes:** 3,873
- **Edges:** 16,104
- **Database size:** 14,819,328 bytes
- **Backend:** `node-sqlite`
- **Journal mode:** `wal`
- **Languages:** JavaScript, TypeScript, YAML
- **Pending changes:** 0 added, 0 modified, 0 removed
- **Reindex recommended:** false

Node breakdown:

| Kind | Count |
|---|---:|
| class | 58 |
| constant | 513 |
| file | 250 |
| function | 1,019 |
| import | 1,016 |
| interface | 145 |
| method | 798 |
| property | 2 |
| type_alias | 31 |
| variable | 41 |

## CLI Command Verification

All smoke tests were run against the built CLI with Node v24.14.0:

| Command | Result |
|---|---|
| `zcodegraph --version` | ✅ `0.9.9` |
| `zcodegraph status --json` | ✅ initialized project, `.zcodegraph` index, current extraction version |
| `zcodegraph query "ExplorePlan"` | ✅ finds `ExplorePlan`, `ExplorePlanEntry`, `plan`, `render`, and related tests |
| `zcodegraph callers "plan"` | ✅ finds `handleExplore` and planner tests |
| `zcodegraph affected src/mcp/explore-planner.ts` | ✅ reports 53 affected test files |

## Architecture Candidate Coverage Verification

Each roadmap candidate is present in source and covered by tests:

| Candidate | Key Current Code | Verification |
|---|---|---|
| 1. Explore Answer Planner Seam | `src/mcp/explore-types.ts`, `src/mcp/explore-planner.ts`, `src/mcp/explore-renderer.ts` | ✅ `handleExplore()` calls `plan()` then `render()`; planner/renderer/type tests pass |
| 2. Dynamic Dispatch Synthesizer Registry | `src/resolution/synthesizer-types.ts`, `src/resolution/synthesizer-registry.ts`, `src/resolution/synthesizer-modules.ts` | ✅ registry tests pass; framework resolvers register through the unified registry |
| 3. Index Pipeline Module | `src/extraction/index-pipeline-types.ts`, `src/extraction/index-pipeline.ts` | ✅ pipeline tests pass |
| 4. Extraction Parse Execution Module | `src/extraction/parse-executor-types.ts`, `src/extraction/parse-executor.ts` | ✅ parse-executor tests pass |
| 5. CLI Command Adapter / Execution Context Seam | CLI command modules and `CommandContext` | ✅ command-context and command-helper tests pass |
| 6. Installer Target Adapter Contract Hardening | install plan/renderer modules and installer targets | ✅ installer target, install plan, and install renderer tests pass |
| 7. Query/Storage Access Model Seam | `src/db/access-models.ts`, `src/db/queries.ts` | ✅ `QueryBuilder` implements `AgentAccessModel`, `MaintenanceAccessModel`, `ResolutionAccessModel`, and `StatusAccessModel`; access-model tests pass |

## Edge Graph Verification

The generated graph captures the new architecture seams:

- `handleExplore` calls `plan` and `render`.
- Querying `ExplorePlan` finds the planner types, planner function, renderer,
  and test fixtures.
- `zcodegraph affected src/mcp/explore-planner.ts` identifies 53 affected test
  files, matching the expected broad blast radius for the Explore planner seam.
- `zcodegraph callers "plan"` includes `src/mcp/tools.ts:handleExplore` and
  `__tests__/explore-planner.test.ts`.

## Agent A/B Benchmark Status

Not run in this validation pass.

Available benchmark infrastructure:

- `scripts/agent-eval/bench-readme.sh`
- `scripts/agent-eval/run-all.sh`
- `scripts/agent-eval/arms-matrix.sh`
- `scripts/agent-eval/parse-*.mjs`
- `docs/benchmarks/call-sequence-analysis.md`
- `docs/benchmarks/answer-directly-vs-explore-agent.md`

Running the real agent A/B suite requires:

- An authenticated agent CLI environment.
- Corpus repos under `/tmp/codegraph-corpus/`.
- Multiple runs per arm to handle variance.

Those benchmarks should be used for retrieval-policy changes. They are not a
precondition for confirming that the 7 architecture seams exist, build, index,
and pass their test coverage.

## Conclusion

The architecture roadmap is complete and validated in the current codebase:

- ✅ All 7 candidates are implemented.
- ✅ TypeScript compilation is clean.
- ✅ The full test suite passes with 0 failures.
- ✅ The project builds successfully.
- ✅ The built CLI initializes and queries a `.zcodegraph/` index.
- ✅ The generated graph exposes the new architecture seams.
- ✅ Agent A/B benchmark status is explicit: not run in this pass.
