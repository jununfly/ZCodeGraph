# Rust-native package map condition set closeout

Date: 2026-06-22

Scope: Roadmap Tree `1-4. Package exports/imports for repo-local targets`,
specifically `1-4-3. condition set handling for repo-local source`.

## Decision

Status: complete for the bounded repo-local package map condition set slice.

Rust-owned repo-local package `exports` and `imports` resolution now uses a
shared condition selection helper with this order:

1. `types`
2. runtime condition: `import` or `require`
3. `node`
4. `compilerOptions.customConditions` in config order
5. `default`

The implementation remains intentionally bounded:

- no `node_modules` graph expansion
- no full Node or TypeScript resolver replacement
- no declaration-to-runtime target pairing beyond resolving the selected file
- package map behavior is still repo-local only

## Evidence

Deterministic Rust tests:

- `rust_resolves_package_exports_condition_objects_and_declaration_targets`
  proves `types` is preferred and the selected condition is recorded.
- `rust_package_maps_use_custom_conditions_after_standard_conditions` proves
  `compilerOptions.customConditions` applies to both repo-local `exports` and
  `imports` after the standard conditions and before `default`.
- `rust_package_exports_use_require_condition_for_commonjs_require` proves
  `require("...")` imports use the `require` runtime condition.

Verification commands:

- `cargo fmt`
- `cargo test -p zcodegraph-core`
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`
- `npm run build`
- `cargo build -p zcodegraph-core`
- `git diff --check`

Current-repo smoke artifacts:

- Profile:
  `docs/benchmarks/2026-06-22-package-map-condition-set-current.profile.json`
- Oracle JSON:
  `docs/benchmarks/2026-06-22-package-map-condition-set-current-oracle.json`
- Oracle summary:
  `docs/benchmarks/2026-06-22-package-map-condition-set-current-oracle.md`

Current-repo oracle result:

- Rows inspected: 336
- Parity statuses: `match = 336`
- The current repo did not contain package self-name or package `imports`
  samples, so package-map condition behavior is covered by deterministic Rust
  fixtures rather than current-repo package-map hits.

## Roadmap Update

- `1-4. Package exports/imports for repo-local targets`: complete
- `1-4-3. condition set handling for repo-local source`: complete

Remaining related work is outside this slice:

- `1-5-4. declaration target semantics`: decide whether and how `types`
  declarations should relate to runtime implementation targets.
