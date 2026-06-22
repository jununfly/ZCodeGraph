# Rust-native moduleResolution simple package exports closeout

Date: 2026-06-22

This closeout covers #442:

```text
3-7-1. simple exports string/object repo-local target slice
```

## Decision

Outcome: keep.

The slice implemented a bounded package `exports` resolver for repo-local
package self-name imports in the Rust-owned TypeScript moduleResolution path.

Implemented:

- package self-name root imports resolving through simple `exports` string
  targets,
- package self-name root and subpath imports resolving through simple
  `exports` object entries,
- simple condition object selection with priority `import` -> `types` ->
  `default` -> first string leaf,
- `.d.ts` exports targets as repo-local file-level targets,
- simple missing export keys falling back to the existing package-root lookup,
- unsupported arrays, wildcard patterns, deep/non-string condition values, and
  repo-escaping targets failing closed,
- diagnostics for `exportsResolved`, `rootFallbackResolved`, `exportsMissing`,
  `exportsUnsupported`, and `exportsTargetEscapesRepo`,
- TypeScript oracle recommendation routing for package self-name evidence
  covered by root package `exports`.

Not implemented:

- full package `exports`,
- package `imports`,
- wildcard or pattern exports,
- arrays,
- full condition matrix,
- `node_modules` graph expansion,
- package entry fields such as `main`, `module`, or `types` outside `exports`
  condition targets,
- declaration/runtime target relationship,
- ESM named symbol edge writing,
- full TypeScript moduleResolution completion.

## Deterministic Coverage

Rust core fixtures cover:

- root string/object exports targets,
- subpath exports targets,
- condition object priority including `.d.ts` target selection,
- simple export key missing with package-root fallback,
- unsupported array exports failing closed,
- unsupported pattern exports failing closed,
- repo-escaping exports targets failing closed,
- existing package self-name behavior when no `exports` exists.

TypeScript oracle fixtures cover:

- package self-name root evidence covered by `exports`,
- package self-name subpath evidence covered by `exports`,
- `paths` alias taxonomy staying separate from package self-name and exports
  taxonomy.

## Current Repo Smoke

Artifacts:

- `docs/benchmarks/2026-06-22-simple-package-exports-current.profile.json`
- `docs/benchmarks/2026-06-22-simple-package-exports-current-oracle.json`
- `docs/benchmarks/2026-06-22-simple-package-exports-current-oracle.md`

Current repo profile:

- `importPathAliasResolvedRefs`: 662
- `importPathAliasFallbackRefs`: 2601
- `importPathAliasResolvedBySource.packageSelfName`: 0
- `importPathAliasFallbackBySource.packageSelfName`: 0
- `importPathAliasPackageSelfNameOutcomeCounts`: `{}`

Current repo oracle:

- rows inspected: 336
- parity: 336 match
- package exports hits: none in this repository

The current repository does not contain a real package self-name exports import
sample for this slice. The smoke still validates that the new `exports` support
does not misclassify third-party packages, Node/runtime boundaries, existing
`paths` alias evidence, or regular repo-local source evidence.

## Roadmap Update

Updated:

- added and completed
  `3-7-1. simple exports string/object repo-local target slice`,
- `3-7. package exports repo-local slice` -> partial,
- `1-4. Package exports/imports for repo-local targets` -> partial,
- `1-4-1. exports "." and subpath entries` -> partial,
- `1-4-3. condition set handling for repo-local source` -> partial.

Remaining adjacent work stays separate:

- full package `exports`,
- `3-8. package imports "#" repo-local slice`,
- `1-5-4. declaration/runtime target relationship`,
- `3-13. guarded edge-write slice`.
