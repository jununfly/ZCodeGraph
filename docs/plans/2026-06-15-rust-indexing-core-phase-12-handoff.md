# Rust Indexing Core Phase 12 Handoff

## Purpose

This handoff is for the next agent continuing the Rust indexing core vertical slice after Phase 12. It summarizes the current state and points to the durable artifacts instead of duplicating their contents.

## Current State

Parent PRD:

- [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
- GitHub parent issue: #49

Recent completed phases:

- Phase 10 corrected the VS Code `VS-1` target problem and reclassified the old #113 evidence as a sparse-target corpus issue.
- Phase 11 fixed the sufficiency smoke harness evidence pipeline so large-target runs produce staged JSON instead of silent empty output.
- Phase 12 reran the exact VS Code `VS-1` target under Node.js 22 and advanced the blocker from `unsupported-runtime` to `typescript-index-timeout`.

Open GitHub issue status at handoff:

- #49 remains open as the parent PRD.
- #137-#141 were completed and closed.

## Key Local Artifacts

Plans:

- [Phase 12 plan](2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md)

Results and decisions:

- [Phase 10 results](../benchmarks/2026-06-14-rust-indexing-core-phase-10-results-and-decision.md)
- [Phase 11 results](../benchmarks/2026-06-15-rust-indexing-core-phase-11-results-and-decision.md)
- [Phase 12 results](../benchmarks/2026-06-15-rust-indexing-core-phase-12-results-and-decision.md)

Important raw artifacts:

- [Phase 12 target validator](../benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json)
- [Phase 12 smoke attempt 1](../benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json)
- [Phase 12 smoke attempt 2](../benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json)

## Implemented Code Changes

Main script changes:

- `scripts/rust-sufficiency-guardrail.mjs`
  - staged output contract
  - unavailable taxonomy
  - `--out`
  - `--prompt-id`
  - `--timeout-ms`
  - `--emit-partial-on-failure`
  - `--repo-pair name:typescript=...`
  - `--repo-pair name:rust=...`

New validator:

- `scripts/phase10-vs1-target-validator.mjs`

Tests added or updated:

- `__tests__/rust-sufficiency-guardrail-prompts.test.ts`
- `__tests__/phase10-vs1-target-validator.test.ts`
- `__tests__/rust-phase10-results-decision-doc.test.ts`
- `__tests__/rust-phase11-results-decision-doc.test.ts`
- `__tests__/rust-phase12-results-decision-doc.test.ts`

## Runtime And Target State

Exact VS Code target:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Sparse patterns: `.github`, `build`, `extensions`, `scripts`, `src`, `test`

Confirmed Node.js 22 binary used for Phase 12:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node
```

Default shell `node` was still Node.js 26 during the work, so future supported-runtime smokes should keep invoking the explicit Node 22 binary unless the user confirms PATH has changed.

## Phase 12 Conclusion

The exact VS Code target validator passed:

- `commitMatchesExpected: true`
- `missingSymbols: []`
- `sufficiencySmokeAllowed: true`

Smoke attempt 1:

- Runtime: Node.js `v22.21.1`
- Timeout: 300s
- Result: `typescript-index-timeout`

Smoke attempt 2:

- Runtime: Node.js `v22.21.1`
- Changed variable: timeout only, increased to 900s
- Result: `typescript-index-timeout`

The run did not reach Rust indexing, Explore/analyze, or TypeScript-vs-Rust comparison. Do not infer graph, matcher, Explore planner, or Rust extraction regressions from Phase 12.

## Suggested Next Plan

The next plan should address TypeScript indexing completion for the exact VS Code JS/TS/config slice, or deliberately use reuse-indexed pair mode if the goal is to isolate Explore sufficiency from indexing runtime.

Recommended next-plan direction:

- Diagnose why the TypeScript indexing path cannot finish the exact VS Code slice within 900s under Node.js 22.
- Preserve the exact target baseline.
- Keep Rust matcher/default rollout status unchanged.
- Do not change graph semantics unless a later artifact reaches comparison and proves a graph-level issue.

## Suggested Skills

- `zj-grill-me` to decide whether the next phase should target TypeScript indexing runtime, reuse-indexed pair isolation, or a smaller representative target.
- `zj-to-issues` and `zj-triage` to publish the next plan as issues.
- `zj-tdd` for implementation once the next phase issues are agreed.
- `zj-diagnose` if the next phase focuses on TypeScript indexing timeout diagnosis.

## Verification Already Run

Recent verification commands:

```bash
npx vitest run __tests__/rust-phase12-results-decision-doc.test.ts __tests__/rust-phase11-results-decision-doc.test.ts __tests__/rust-sufficiency-guardrail-prompts.test.ts __tests__/phase10-vs1-target-validator.test.ts
npm run build
```

Phase 12 raw JSON artifacts were also parsed successfully with `JSON.parse`.

## Cautions

- The working branch contains a large batch of Phase 10-12 evidence files. Preserve them as historical artifacts.
- Do not rewrite Phase 10/11/12 results docs to make later evidence look cleaner; create a new phase result document instead.
- Do not rerun unbounded VS Code smoke attempts. Keep bounded attempts and record the changed variable.
- The npm/package release flow was not touched.
