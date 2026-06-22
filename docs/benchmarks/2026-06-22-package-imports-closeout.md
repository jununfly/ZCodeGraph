# Package Imports Closeout

Date: 2026-06-22

Issue: #444

Roadmap node: `3-8. package imports "#" repo-local slice`

## Decision

Completed for the repo-local graph sufficiency scope.

Rust-owned TypeScript module resolution now handles `#...` package imports by
using the nearest package boundary for the source file:

- the source file's nearest ancestor `package.json#imports` is used;
- repo root `imports` is not used for files inside a nested package when that
  nested package has its own boundary;
- successful targets write `rust-finalization` file-level `imports` edges.

The bounded package map behavior mirrors the completed package `exports` slice:

- exact keys
- single-`*` pattern keys and targets
- exact-over-pattern priority
- longest pattern prefix priority
- condition objects up to two levels
- condition priority: `import -> types -> default -> first string leaf`
- `null` blocking entries as `importsBlocked`
- arrays as fail-closed `importsUnsupported`

Targets must stay inside the source file's package boundary. Cross-package
targets fail closed as `importsTargetEscapesPackage`; absolute/out-of-repo
targets fail closed as `importsTargetEscapesRepo`.

## Evidence

Deterministic Rust fixtures cover the behavior that current-repo imports do not
exercise directly:

- `rust_resolves_package_imports_from_nearest_package_boundary`
- `rust_package_imports_fail_closed_for_blocked_unsupported_and_escaping_targets`

The TypeScript module resolution oracle now classifies `#...` specifiers as
`package imports "#" repo-local slice` when TypeScript resolves them through a
nearest package `imports` map.

Current-repo smoke artifacts:

- `docs/benchmarks/2026-06-22-package-imports-current.profile.json`
- `docs/benchmarks/2026-06-22-package-imports-current-oracle.json`
- `docs/benchmarks/2026-06-22-package-imports-current-oracle.md`

Current-repo oracle summary:

- Rows inspected: 336
- Parity statuses: 336 `match`
- `packageImports` profile hits: 0 resolved, 0 fallback
- `importPathAliasPackageImportsOutcomeCounts`: `{}`

The current repo does not contain representative `#...` package imports for
this slice, so the current-repo evidence is a no-regression smoke rather than a
coverage proof.

## Roadmap Update

- `3-8. package imports "#" repo-local slice`: complete
- `1-4-2. imports "#" entries`: complete
- `1-4. Package exports/imports for repo-local targets`: still partial
- `1-4-3. condition set handling for repo-local source`: still partial

## Non-Goals

This does not claim full TypeScript or Node module resolution. Explicitly out of
scope:

- `node_modules` expansion
- `typesVersions`
- symlink, pnpm virtual store, or package-manager-specific behavior
- full condition matrix semantics
- declaration/runtime target relationship
- ESM named symbol edge resolution
- guarded edge-write rollout decisions beyond file-level import edges for this
  bounded slice
