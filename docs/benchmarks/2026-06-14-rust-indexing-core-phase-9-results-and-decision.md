# Rust Indexing Core Phase 9 Results And Decision

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Parent issue: #113

Tracker: #124

Implementation issues: #120, #121, #122, #123

## Decision

Phase 9 classification: **bounded success**.

Phase 9 did not achieve full success because the VS Code `VS-1` same-scope smoke still cannot produce a connected Flow section. The deterministic probe changed the diagnosis: on the Phase 8 sparse indexed copies, six of the seven `VS-1` expected symbols are not present in the index at all, and the remaining `start` token is highly ambiguous. The first proven blocker is therefore `missing-symbol`, not a proven missing call edge, missing synthesized edge, or Explore planner pathfinding bug.

The implemented fix was the minimal proven gap: the VS Code sufficiency guardrail no longer treats the `## Exploration: ...` query echo as expected-symbol evidence. That makes the smoke classify `VS-1` as `missing-symbol` instead of falsely reporting all expected symbols present.

Phase 9 does not change Rust matcher opt-in status, does not change Rust indexer default status, and does not establish default rollout readiness.

## Artifacts

- Probe raw JSON: [2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json](2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json)
- Sufficiency validation raw JSON: [2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json)

## Probe Result

Probe command:

```bash
node scripts/phase9-vs1-graph-probe.mjs \
  --repo /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-guardrail-vscode-ts-m6jBjd \
  --out docs/benchmarks/2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json
```

Prompt:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

Primary classification: `missing-symbol`.

Per-token classification:

| Token | Classification | Candidate count |
|---|---:|---:|
| `AbstractExtensionService` | `missing-symbol` | 0 |
| `_createExtensionHostManager` | `missing-symbol` | 0 |
| `_doCreateExtensionHostManager` | `missing-symbol` | 0 |
| `ExtensionHostManager` | `missing-symbol` | 0 |
| `start` | `ambiguous-symbol` | 26 |
| `ExtensionHostMain` | `missing-symbol` | 0 |
| `MainThreadExtensionService` | `missing-symbol` | 0 |

Explore output still had no Flow section, but the probe shows the stronger root cause is missing expected symbols in the indexed sparse scope.

## Implemented Fix

The sufficiency guardrail now removes the `## Exploration: ...` heading before checking whether expected symbols appear in the returned evidence. This prevents a query string from satisfying its own expected-symbol check.

Focused validation:

```bash
npx vitest run __tests__/phase9-vs1-graph-probe.test.ts
npx vitest run __tests__/rust-sufficiency-guardrail-prompts.test.ts -t "query echo"
```

## VS Code Validation

Full same-scope sufficiency rerun was attempted with:

```bash
ZCODEGRAPH_RUST_NAME_MATCHER=1 node scripts/rust-sufficiency-guardrail.mjs \
  --repo vscode=/tmp/zcodegraph-phase7-vscode-sparse \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json
```

That run did not produce machine-readable output before the extended wait limit and was interrupted with SIGINT. The raw validation artifact records this as:

- `status`: `unavailable`
- `unavailableReason`: `Timed out after extended wait and was interrupted with SIGINT; no machine-readable output was produced.`

To avoid fabricating a full rerun, Phase 9 also re-ran `zcodegraph_explore` against the existing Phase 8 TypeScript and Rust indexed VS Code sparse copies and applied the corrected expected-symbol analysis.

Corrected validation result:

| Engine | Flow section | Flow connected | Classification | Missing expected |
|---|---:|---:|---|---|
| TypeScript | false | false | `missing-symbol` | 6 |
| Rust | false | false | `missing-symbol` | 6 |

Rust-specific regressions: `[]`.

## Status Of #113

#113 should remain open or be replaced by a narrower follow-up. The current evidence no longer supports the old wording that the same-scope VS Code `VS-1` has all expected symbols but lacks a Flow section. The proven blocker is that the Phase 8 sparse scope does not contain the key extension-host/workbench symbols needed by `VS-1`.

Recommended follow-up:

- Refresh or replace the VS Code sparse target so it includes the source files that define `AbstractExtensionService`, `_createExtensionHostManager`, `_doCreateExtensionHostManager`, `ExtensionHostManager`, `ExtensionHostMain`, and `MainThreadExtensionService`.
- Rerun the deterministic probe on that corrected scope.
- Only then decide whether the next blocker is `missing-static-edge`, `missing-synthesized-edge`, `explore-planner-pathfinding-gap`, or `expected-runtime-boundary`.

## Conclusion

Phase 9 produced a useful correction to the validation harness and a deterministic probe for future VS Code flow work. It did not prove a graph coverage fix is needed yet; it proved the current sparse validation target is insufficient for `VS-1`.
