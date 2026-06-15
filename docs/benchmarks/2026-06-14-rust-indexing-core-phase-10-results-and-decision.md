# Rust Indexing Core Phase 10 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issues: #49, #113

Tracker: #130

Implementation issues: #125, #126, #127, #128, #129

## Decision

Phase 10 classification: **bounded success with commit drift**.

Phase 10 corrected the VS Code `VS-1` validation target enough to re-baseline the deterministic graph question. The corrected local target used for validation was a large VS Code sparse checkout at commit `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`, not the originally requested `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`. This is explicit commit drift, not hidden equivalence.

On that corrected drift target, all seven `VS-1` expected symbols had indexed candidates and `zcodegraph_explore` produced a connected Flow section. That means the Phase 9/#113 failure mode is reclassified from a proven graph coverage gap to a **corpus problem in the old sparse target**. The remaining deterministic blocker class is `ambiguous-symbol` for `start`, not missing symbols or a missing Flow section.

The corrected-target sufficiency smoke was attempted once, but it produced no machine-readable output before the bounded wait ended and was interrupted. Therefore Phase 10 does not produce a TypeScript-vs-Rust sufficiency comparison on the corrected target.

Phase 10 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Corrected Target Contract

Validated local target:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Local path provenance: local-only
- Expected VS Code commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Actual VS Code commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Commit drift: explicit and accepted only for this Phase 10 re-baseline evidence
- Sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Copied JS/TS/config file count: 11518
- Indexed JS/TS file count: 11098

The target is larger than the old Phase 7 sparse checkout and includes the workbench/API/extension-host files needed for `VS-1`.

## Checkout Instructions

For an exact-commit corrected target, use:

```bash
git clone --filter=blob:none --sparse https://github.com/microsoft/vscode.git /private/tmp/zcodegraph-phase10-vscode-vs1
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 checkout 4ac5322601c6985aba4cd9349c23f4ef22dc3e65
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 sparse-checkout set .github build extensions scripts src test
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 sparse-checkout list
git -C /private/tmp/zcodegraph-phase10-vscode-vs1 rev-parse HEAD
find /private/tmp/zcodegraph-phase10-vscode-vs1 -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name 'package.json' -o -name 'tsconfig.json' -o -name 'jsconfig.json' \) | wc -l
```

Then index and validate:

```bash
npm run build
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js init /private/tmp/zcodegraph-phase10-vscode-vs1
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js index /private/tmp/zcodegraph-phase10-vscode-vs1 --force --quiet
node scripts/phase10-vs1-target-validator.mjs --repo /private/tmp/zcodegraph-phase10-vscode-vs1 --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json
```

No sufficiency smoke should run unless the validator reports `sufficiencySmokeAllowed: true`.

## Artifacts

- Target validator raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json)
- Deterministic probe raw JSON: [2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json)
- Sufficiency smoke raw JSON: [2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json)

## Validator Result

Validator command:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-target-validation.raw.json
```

Result:

- `valid`: `true`
- `sufficiencySmokeAllowed`: `true`
- `missingSymbols`: `[]`
- `start` ambiguity count: 138

Per-token candidate count:

| Token | Candidate count |
|---|---:|
| `AbstractExtensionService` | 1 |
| `_createExtensionHostManager` | 1 |
| `_doCreateExtensionHostManager` | 2 |
| `ExtensionHostManager` | 1 |
| `start` | 138 |
| `ExtensionHostMain` | 1 |
| `MainThreadExtensionService` | 1 |

## Deterministic Probe Result

Probe command:

```bash
node scripts/phase9-vs1-graph-probe.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vs1-probe.raw.json
```

Probe result:

- Explore output chars: 21857
- Flow section: `true`
- Flow connected: `true`
- Primary classification: `ambiguous-symbol`

Per-token classification:

| Token | Classification | Candidate count |
|---|---|---:|
| `AbstractExtensionService` | `expected-runtime-boundary` | 1 |
| `_createExtensionHostManager` | `expected-runtime-boundary` | 1 |
| `_doCreateExtensionHostManager` | `expected-runtime-boundary` | 2 |
| `ExtensionHostManager` | `expected-runtime-boundary` | 1 |
| `start` | `ambiguous-symbol` | 138 |
| `ExtensionHostMain` | `expected-runtime-boundary` | 1 |
| `MainThreadExtensionService` | `expected-runtime-boundary` | 1 |

## Sufficiency Smoke Result

Smoke command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_RUST_NAME_MATCHER=1 \
  node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  > docs/benchmarks/2026-06-14-rust-indexing-core-phase-10-vscode-sufficiency.raw.json
```

Result:

- `status`: `unavailable`
- Reason: one corrected-target sufficiency smoke was attempted, produced no machine-readable stdout after roughly 4.5 minutes, and was interrupted with SIGINT.
- Flow section: unavailable
- Flow connected: unavailable
- Missing expected symbols: unavailable
- Deterministic Read/Grep fallback risk: unavailable
- Rust-specific regression: unavailable
- TypeScript-vs-Rust comparison: unavailable

This satisfies the Phase 10 bounded smoke requirement by recording an explicit unavailable reason. It does not support any TypeScript-vs-Rust sufficiency claim.

## Status Of #113

#113 should be closed or replaced with narrower wording. Its old premise is no longer supported:

- On the old Phase 7/8 sparse target, six of seven `VS-1` symbols were absent, so the old evidence was a corpus problem.
- On the corrected drift target, all seven symbols are present and deterministic Explore produces a connected Flow section.

The remaining useful follow-up is not "VS Code `VS-1` lacks Flow section" as stated in #113. If follow-up is needed, it should be narrower: make corrected-target sufficiency smoke complete within a bounded runtime and then compare TypeScript vs Rust on that target.

## Conclusion

Phase 10 re-baselined `VS-1` against a target that actually contains the expected symbols. Deterministic graph evidence now connects the flow, so the original #113 graph gap is not reproduced on the corrected target. The next blocker is operational sufficiency-smoke runtime/completion, not symbol coverage or deterministic Explore Flow connectivity.
