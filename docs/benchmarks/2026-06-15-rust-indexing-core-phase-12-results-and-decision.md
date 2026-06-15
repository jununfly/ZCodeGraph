# Rust Indexing Core Phase 12 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issue: #49

Tracker: #141

Implementation issues: #137, #138, #139, #140

## Decision

Phase 12 classification: **supported-runtime blocker advanced to TypeScript indexing timeout**.

Phase 12 removed the Phase 11 `unsupported-runtime` blocker by running the corrected exact VS Code `VS-1` smoke with the confirmed Node.js 22 binary. The smoke still did not reach TypeScript-vs-Rust comparison, but it now fails deeper: the TypeScript index stage did not complete within either the 300s first attempt or the 900s bounded second attempt.

This is not evidence of a graph semantics regression, matcher regression, Explore planner problem, or Rust extraction regression. The run never reached Rust indexing, Explore/analyze, or comparison.

Phase 12 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Runtime Confirmation

Confirmed Node.js 22 binary from #137:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node -v
# v22.21.1
```

The default shell `node` remained Node.js 26 and was not used for the Phase 12 smoke attempts.

## Baseline Target

The Phase 12 baseline is the exact VS Code sparse checkout:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Expected VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Actual VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Commit drift: none
- Sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Copied JS/TS/config file count: 11518
- Indexed JS/TS file count in the pre-existing local index: 11098

The Phase 10 drift-target wording is historical. Phase 12 and later should use this exact target baseline.

## Artifacts

- Phase 11 results: [2026-06-15-rust-indexing-core-phase-11-results-and-decision.md](2026-06-15-rust-indexing-core-phase-11-results-and-decision.md)
- Phase 12 plan: [../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md](../plans/2026-06-15-rust-indexing-core-phase-12-supported-runtime-sufficiency-completion.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json)
- Attempt 1 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json)
- Attempt 2 raw JSON: [2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json](2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json)

## Validator Result

Validator command:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `commitMatchesExpected`: `true`
- `missingSymbols`: `[]`
- `sufficiencySmokeAllowed`: `true`
- `start` ambiguity count: 138

The validator hard gate passed before any smoke attempt ran.

## Attempt 1

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  /private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 300000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt1.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `typescript-index-timeout`
- runtime: `v22.21.1`
- copy stage: `completed` in 2362ms
- TypeScript index stage: `unavailable` after 294880ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending

Attempt 1 failed before comparison, so Phase 12 allowed exactly one second attempt.

## Attempt 2

Changed variable: timeout only.

Reason: Attempt 1 reached the TypeScript index stage under the supported runtime but timed out at the 300s bound. Increasing the timeout was the smallest allowed variable change to test whether indexing needed more time.

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  /private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 900000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vscode-sufficiency-attempt2.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `typescript-index-timeout`
- runtime: `v22.21.1`
- copy stage: `completed` in 1356ms
- TypeScript index stage: `unavailable` after 896017ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending

No additional attempts were run.

## Follow-Up Direction

The current blocker is **TypeScript indexing completion for the exact VS Code JS/TS/config slice**, not supported runtime and not Rust graph semantics.

Recommended follow-up:

- Investigate why the TypeScript indexing path cannot finish the exact VS Code slice within a 900s bounded smoke; or
- Use Phase 11 reuse-indexed pair mode if the next goal is to isolate Explore sufficiency from indexing runtime.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The artifacts did not reach Rust indexing or comparison.

## Conclusion

Phase 12 successfully advanced the evidence beyond Phase 11's Node.js 26 `unsupported-runtime` blocker. Under Node.js 22, the corrected exact target passes validation and the smoke reaches TypeScript indexing, but TypeScript indexing does not complete within the bounded attempts. TypeScript-vs-Rust sufficiency remains unavailable until the TypeScript indexing stage completes or a reuse-indexed pair is used to isolate comparison.
