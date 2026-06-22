# Rust-native moduleResolution package self-name repo-local slice closeout

Date: 2026-06-22

This closeout covers #441:

```text
3-5-2. package.json name repo-local self/subpath slice
```

## Decision

Outcome: keep.

The slice implemented bounded repo-local package self-name resolution in the
Rust-owned TypeScript moduleResolution path.

Implemented:

- repo-local `package.json` name discovery for valid in-repo package roots,
- root self-name import lookup: `@repo/pkg` -> `<packageRoot>/index`,
- self-name subpath lookup: `@repo/pkg/foo` -> `<packageRoot>/foo`,
- reuse of existing extension substitution and directory/index lookup,
- fail-closed duplicate package name handling,
- `packageSelfName` profile source bucket,
- `packageSelfName` outcome counts for `resolvedRootIndex`,
  `resolvedSubpath`, `ambiguousName`, `missingPackageName`, and
  `missingTarget`,
- TypeScript oracle recommendation alignment for package self-name root and
  subpath evidence.

Not implemented:

- package `exports`,
- package `imports`,
- `node_modules` graph expansion,
- package entry fields such as `main`, `module`, or `types`,
- ESM named symbol edge writing,
- full TypeScript moduleResolution completion.

## Deterministic Coverage

Rust core fixtures cover:

- package self-name root import resolving to package-root `index`,
- package self-name subpath import resolving package-root-relative targets,
- duplicate package names failing closed as `ambiguousName`,
- package self-name target misses reported as `missingTarget`,
- same-scope package name misses reported as `missingPackageName`,
- `paths` alias taxonomy staying separate from `packageSelfName`.

TypeScript oracle fixtures cover:

- package self-name root taxonomy,
- package self-name subpath taxonomy,
- `paths` alias taxonomy staying separate from package self-name taxonomy.

## Current Repo Smoke

Artifacts:

- `docs/benchmarks/2026-06-22-package-self-name-current.profile.json`
- `docs/benchmarks/2026-06-22-package-self-name-current-oracle.json`
- `docs/benchmarks/2026-06-22-package-self-name-current-oracle.md`

Current repo profile:

- `importPathAliasResolvedRefs`: 662
- `importPathAliasFallbackRefs`: 2601
- `importPathAliasResolvedBySource.packageSelfName`: 0
- `importPathAliasFallbackBySource.packageSelfName`: 0
- `importPathAliasPackageSelfNameOutcomeCounts`: `{}`

Current repo oracle:

- rows inspected: 336
- parity: 336 match
- package self-name hits: none in this repository

The current repository does not contain a real package self-name import sample
for this slice. The smoke still validates that the new scanner does not
misclassify third-party package subpaths, Node/runtime boundaries, or existing
`paths` alias evidence as `packageSelfName`.

## Roadmap Update

Updated:

- `1-3. Repo-local package resolution` -> complete
- `1-3-1. package self-name imports` -> complete
- `1-3-3. package subpath imports landing in repo source` -> complete
- `3-5. package self-name repo-local slice` -> complete
- added and completed `3-5-2. package.json name repo-local self/subpath slice`

Remaining adjacent work stays separate:

- `3-7. package exports repo-local slice`
- `3-8. package imports "#" repo-local slice`
- `3-13. guarded edge-write slice`
