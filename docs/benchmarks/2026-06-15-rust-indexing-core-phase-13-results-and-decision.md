# Rust Indexing Core Phase 13 Results and Decision

Date: 2026-06-15

## Summary

Phase 13 added a full-index A/B artifact model for comparing the existing TypeScript indexing path against the existing Rust-enabled CLI/indexing path. The Windows exact VS Code target is validated and indexed for the TypeScript arm. The Rust arm did not produce a graph in this environment, so the formal result is an asymmetric blocker rather than a rollout-ready comparison.

Decision: do not change the default indexing path or Rust matcher/default rollout. Keep Rust disabled by default until a Rust arm graph is produced for the exact VS Code target and VS-1 comparison can run with both arms available.

## Artifacts

- Target validation raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vs1-target-validation.raw.json`
- Phase 13 A/B raw: `docs/benchmarks/2026-06-15-rust-indexing-core-phase-13-vscode-ab.raw.json`

## Target validation

The Phase 12 exact VS Code target was validated on Windows before the Phase 13 run.

| Field | Value |
|---|---:|
| Target path | `C:\workspace\github\corpus\vscode-sparse` |
| Expected commit | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |
| Actual commit | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |
| Commit matches expected | `true` |
| JS/TS/config files in target slice | `11518` |
| Indexed JS/TS files | `11098` |
| Missing expected VS-1 symbols | `[]` |
| Validator valid | `true` |
| Sufficiency smoke allowed | `true` |

## Phase 13 A/B result

The raw artifact uses the new Phase 13 schema while retaining the older consumer-facing fields.

| Field | Value |
|---|---|
| `experimentMode` | `full-index-ab` |
| `executionModel` | `sequential` |
| `mode` | `deterministic-tool-surface-reuse-indexed-arm` |
| `status` | `completed` |
| `classification` | `success-asymmetric-blocker` |
| `comparison.status` | `unavailable` |
| `comparison.reason` | `comparison requires both arms to have graphAvailable=true` |
| `defaultRolloutReadinessClaimed` | `false` |

### TypeScript arm

| Field | Value |
|---|---:|
| Source copy mode | `reuse-indexed-arm` |
| Graph available | `true` |
| Node count | `330853` |
| Edge count | `1515830` |
| File count | `11382` |

### Rust arm

| Field | Value |
|---|---|
| Source copy | `null` |
| Graph available | `false` |
| Diagnostic kind | `missing-index` |
| Diagnostic message | `Missing indexed project for vscode: rust` |

## Classification meaning

`success-asymmetric-blocker` means the harness completed and preserved evidence from the successful arm, but one arm did not produce a graph. Because VS-1 comparison requires both arms to have `graphAvailable=true`, comparison was intentionally skipped and recorded as unavailable rather than failing the whole harness.

This is the expected Phase 13 outcome for the current Windows environment: TypeScript exact-target evidence exists; Rust exact-target evidence does not.

## Implementation notes

The guardrail now records:

- Phase 13 artifact fields: `experimentMode`, `executionModel`, `target`, `arms`, `comparison`, `classification`.
- Per-arm command provenance with an env allowlist.
- Independent source-copy metadata for full A/B runs.
- Sequential arm execution where one arm failure does not discard the other arm's evidence.
- Conditional comparison: run VS-1 only when both arms have graphs.
- Single-arm reuse mode for formal asymmetric evidence when an already indexed exact target exists for only one arm.

The older artifact fields remain present for compatibility: `mode`, `stages`, `results`, `regressions`, `unavailableKind`, and `defaultRolloutReadinessClaimed`.

## Verification

Commands run after implementation:

```bash
npm run build
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts
```

Focused regression result:

```text
Test Files  1 passed (1)
Tests       7 passed | 2 skipped (9)
```

Full build result: passed.

## Follow-up

Before any Rust default rollout claim, produce a Rust graph for the same exact VS Code target and rerun Phase 13 so both arms are available. Only then should `comparison.status=completed` be used for a readiness decision.
