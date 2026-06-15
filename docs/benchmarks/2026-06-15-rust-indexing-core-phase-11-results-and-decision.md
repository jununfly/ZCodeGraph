# Rust Indexing Core Phase 11 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issues: #49, #130

Tracker: #136

Implementation issues: #131, #132, #133, #134, #135

## Decision

Phase 11 classification: **bounded harness success, sufficiency comparison unavailable**.

The Phase 11 goal was to turn the corrected-target VS Code `VS-1` smoke from a silent no-output run into a bounded, machine-readable artifact. That goal was met: `rust-sufficiency-guardrail.mjs` now supports a staged output contract, unavailable taxonomy, `--out`, `--prompt-id`, `--timeout-ms`, and reuse-indexed pair mode.

The real corrected-target smoke did not complete a TypeScript-vs-Rust comparison. It produced a structured `unsupported-runtime` artifact while running under Node.js 26. The failure happened during the TypeScript index stage after the JS/TS/config slice copy completed. This is a harness/runtime environment blocker, not evidence of a graph semantics regression, matcher regression, or Rust extraction regression.

Phase 11 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Target Contract

The VS Code target was upgraded after Phase 10 from explicit drift to the exact requested commit.

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Local path provenance: local-only
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

## Artifacts

- Phase 10 decision doc: [2026-06-14-rust-indexing-core-phase-10-results-and-decision.md](2026-06-14-rust-indexing-core-phase-10-results-and-decision.md)
- Exact target validator raw JSON: [2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json](2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json)
- Corrected-target smoke raw JSON: [2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json](2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json)

## Implemented Harness Changes

`scripts/rust-sufficiency-guardrail.mjs` now has a Phase 11 evidence contract:

- `status`: `completed`, `failed`, or `unavailable`
- `unavailableKind`: one of `copy-timeout`, `typescript-index-timeout`, `rust-index-timeout`, `explore-timeout`, `missing-index`, `validator-failed`, `process-error`, or `unsupported-runtime`
- staged records for `copy`, `typescriptIndex`, `rustIndex`, `exploreAnalyze`, and `comparison`
- elapsedMs, command provenance, stderr tail or unavailable reason, runtime warnings, partial paths, and default rollout disclaimer
- `--out` for writing the final or partial artifact
- `--prompt-id` for bounded single-prompt smokes such as `VS-1`
- `--timeout-ms` for bounded stage execution
- `--repo-pair name:typescript=...` and `--repo-pair name:rust=...` for reuse-indexed pair mode

Default stdout JSON behavior remains compatible when no new output file option is supplied.

Focused validation:

```bash
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts
npm run build
```

## Validator Result

Validator command:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `sufficiencySmokeAllowed`: `true`
- `commitMatchesExpected`: `true`
- `missingSymbols`: `[]`
- `start` ambiguity count: 138

## Sufficiency Smoke Result

Smoke command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --prompt-id VS-1 \
  --timeout-ms 300000 \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-11-vscode-sufficiency.raw.json
```

Result:

- `status`: `unavailable`
- `unavailableKind`: `unsupported-runtime`
- copy stage: `completed` in 2343ms
- TypeScript index stage: `unavailable` after 295037ms
- Rust index stage: pending
- Explore/analyze stage: pending
- comparison stage: pending
- runtime warning: Node.js 26 is outside the supported runtime range

The artifact preserved command provenance, stage elapsedMs, partial temp path, and stderr tail. It did not produce Flow section, `flowConnected`, missing expected symbols, deterministic Read/Grep fallback risk, Rust-specific regression, or TypeScript-vs-Rust comparison status because indexing did not reach Explore.

## Follow-Up Direction

The next blocker is **runtime environment / smoke completion**, not graph semantics.

Recommended next step:

- Run the same Phase 11 smoke under Node.js 22, or
- Create/reuse explicit TypeScript and Rust indexed pairs and run the new reuse-indexed pair mode.

Do not start resolver, matcher, Explore planner, or Rust extraction changes from this evidence. The current artifact did not reach the comparison stage, so it cannot support a graph or Rust regression conclusion.

## Conclusion

Phase 11 fixed the evidence pipeline problem that caused Phase 10 to end with a manually written no-output unavailable artifact. Large-target smoke attempts now produce structured, staged JSON. The corrected exact VS Code target is valid, but TypeScript-vs-Rust sufficiency remains unavailable until the smoke is rerun under a supported runtime or with reusable indexed pairs.
