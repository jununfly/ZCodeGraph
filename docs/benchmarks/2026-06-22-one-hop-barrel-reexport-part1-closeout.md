# One-Hop Barrel Re-Export Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #427
- Baseline: `docs/benchmarks/2026-06-22-import-file-completion-map-baseline.md`
- Related closeout:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md`

## Decision

Decision: `keep`.

The selected one-hop residual category is:

```text
repo-local one-hop direct re-export where the barrel specifier resolves to a
repo-local source file and the leaf file has exactly one matching exported
symbol
```

The behavior is already implemented and covered. It writes edges to the final
leaf exported symbol, not to the barrel export node.

## Implemented Scope

Kept behavior:

- `export { foo } from "./leaf"` followed by `import { foo } from "./barrel"`;
- paths-alias one-hop re-export where both barrel and leaf stay repo-local;
- final target is the leaf symbol.

Kept fallback:

- leaf target file unavailable;
- re-export specifier target not found;
- leaf candidate-zero;
- leaf candidate-multiple;
- package/runtime re-exports;
- default, namespace, type-only, and multi-hop barrel behavior.

## Deterministic Fixture Coverage

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- `resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `emits bounded ESM named binding fallback samples in the profile artifact`

The fallback test covers:

- `reexport-specifier-target-not-found`;
- `reexport-leaf-candidate-zero`;
- package/runtime binding fallback.

## Evidence

Current repo:

| Field | Count |
| --- | ---: |
| `esmOneHopReexportResolvedRefs` | 283 |
| `reexportCandidateGap` | 0 in sampled taxonomy |

VS Code sparse:

| Field | Count |
| --- | ---: |
| `esmOneHopReexportResolvedRefs` | 439 |
| `reexport-leaf-candidate-zero` | 123 |
| `reexport-leaf-candidate-multiple` | 20 |

## Interpretation

The bounded one-hop direct barrel behavior is keepable.

The remaining one-hop residual is not safe to broaden here:

- candidate-zero needs proof that extraction, file-target resolution, or export
  discovery missed a specific supported declaration shape;
- candidate-multiple needs semantic target-selection rules and must not use
  source-order or pick-first behavior;
- multi-hop chains remain outside Part 1 by default.

## Part 2 Boundary

Package/runtime re-exports remain Part 2 or unsupported taxonomy. This slice
does not add package imports, Node/runtime builtins, package `exports`/`imports`,
`node_modules`, or full TypeScript `moduleResolution`.

## Closeout

#427 closes as `keep` for bounded repo-local one-hop direct re-export behavior.

Residuals:

- one-hop leaf candidate-zero: `no-go` without narrower extraction/target
  evidence;
- one-hop leaf candidate-multiple: `needs-architecture`;
- package/runtime re-export: `handoff-to-Part2`;
- multi-hop barrel chain: outside Part 1 unless separately approved.
