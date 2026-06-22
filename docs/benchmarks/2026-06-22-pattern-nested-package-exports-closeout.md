# Pattern/Nested Package Exports Closeout

Date: 2026-06-22

Issue: #443

Roadmap node: `3-7-2. pattern/nested exports repo-local completion slice`

## Decision

Completed for the repo-local graph sufficiency scope.

Rust-owned TypeScript module resolution now handles repo-local package `exports`
entries for:

- exact export keys before pattern keys
- single-`*` pattern keys with single-`*` target substitution
- longest pattern prefix priority, preserving insertion order for equal priority
- condition objects up to two levels with bounded priority:
  `import -> types -> default -> first string leaf`
- `null` blocking exports as fail-closed `exportsBlocked`
- `.d.ts` export targets as file-level graph targets

Arrays remain intentionally unsupported and fail closed as `exportsUnsupported`.

## Evidence

Deterministic Rust fixtures cover the behavior that current-repo imports do not
exercise directly:

- `rust_resolves_package_exports_patterns_with_specificity_priority`
- `rust_resolves_package_exports_nested_conditions_up_to_two_levels`
- `rust_package_exports_blocked_overdeep_and_array_shapes_fail_closed`

The TypeScript module resolution oracle was updated so pattern exports are
recommended as `pattern/nested exports repo-local completion slice` instead of
being folded into the earlier simple exports slice.

Current-repo smoke artifacts:

- `docs/benchmarks/2026-06-22-pattern-nested-package-exports-current.profile.json`
- `docs/benchmarks/2026-06-22-pattern-nested-package-exports-current-oracle.json`
- `docs/benchmarks/2026-06-22-pattern-nested-package-exports-current-oracle.md`

Current-repo oracle summary:

- Rows inspected: 336
- Parity statuses: 336 `match`
- `packageSelfName` profile hits: 0 resolved, 0 fallback

The current repo does not contain representative package exports imports for
this slice, so the current-repo evidence is a no-regression smoke rather than a
coverage proof.

## Non-Goals

This does not claim full TypeScript or Node module resolution. Explicitly out of
scope:

- package imports `#...`
- `node_modules` expansion
- `typesVersions`
- symlink, pnpm virtual store, or package-manager-specific behavior
- full condition matrix semantics
- array export target fallback semantics
- declaration/runtime target relationship
- ESM named symbol edge resolution
- guarded edge-write rollout decisions
