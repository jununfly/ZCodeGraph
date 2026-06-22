# Direct ESM Named Import/Export Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #426
- Baseline: `docs/benchmarks/2026-06-22-import-file-completion-map-baseline.md`
- Prior direct export closeouts:
  - `docs/benchmarks/2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md`
  - `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md`

## Decision

Decision: `keep`.

The selected direct named binding residual is:

```text
repo-local direct ESM named import/export where the target file has exactly one
matching exported declaration or same-file export-specifier declaration
```

This behavior is already implemented and covered by deterministic fixtures. No
new production behavior is required for #426.

## Implemented Scope

Kept behavior:

- direct named import to a relative repo-local source file;
- direct named import to a paths-alias repo-local source file;
- declaration-style direct exports with TypeScript modifiers;
- same-file `export { Name }` when there is exactly one local declaration
  candidate.

Kept fallback:

- default imports;
- namespace imports;
- type-only imports;
- package/runtime imports;
- unsupported import shapes;
- direct export candidate-zero;
- direct export candidate-multiple unless a later semantic decision narrows it.

## Deterministic Fixture Coverage

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- direct ESM named imports;
- paths-alias ESM named imports;
- declaration-style ESM named exports with TypeScript modifiers;
- same-file ESM export specifiers;
- bounded ESM named binding fallback samples.

Fallback taxonomy coverage exists in:

- `__tests__/rust-esm-fallback-taxonomy.test.ts`
- `__tests__/rust-esm-candidate-multiple-taxonomy.test.ts`

## Evidence

Current repo after the direct export burndown:

| Field | Count |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 2,454 |
| `esmNamedImportExportFallbackRefs` | 1,846 |
| `direct-export-candidate-zero` | 49 |
| `package-or-runtime-binding` | 1,233 |
| `type-only-import` | 228 |
| `unsupported-import-shape` | 329 |

VS Code sparse after the direct export burndown:

| Field | Count |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 121,566 |
| `esmNamedImportExportFallbackRefs` | 40,039 |
| `direct-export-candidate-multiple` | 16,384 |
| `direct-export-candidate-zero` | 10,864 |
| `same-file-export-specifier-candidate-zero` | 58 |
| `package-or-runtime-binding` | 1,965 |
| `type-only-import` | 2,759 |
| `unsupported-import-shape` | 2,083 |

## Interpretation

The bounded direct named path is keepable.

The largest remaining direct named residual is not a simple missing file-level
lookup. VS Code sparse is dominated by candidate-multiple and candidate-zero
cases. Candidate-multiple requires a separate semantic decision for overloads,
ambient declarations, and type/value namespace collisions. Candidate-zero
requires better evidence about why the declaration is absent before changing
selection behavior.

## Part 2 Boundary

Package/runtime bindings are explicitly Part 2. #426 does not solve package
imports, runtime builtins, package `exports`/`imports`, `node_modules`, or full
TypeScript `moduleResolution`.

## Closeout

#426 closes as `keep` for the bounded direct named import/export behavior.

Residuals:

- direct candidate-multiple: `needs-architecture`;
- direct candidate-zero: `no-go` until a narrower diagnostic identifies a safe
  implementation target;
- package/runtime binding: `handoff-to-Part2`.
