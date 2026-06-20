# Rust-Hybrid JS/TS File Import Target Parity

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior complete candidate producer routing boundary:
  `docs/plans/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary.md`
- Prior closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`

## Context

The complete candidate producer routing boundary proved that Rust-produced
candidate sets can be kept semantically safe behind local config, but it also
confirmed that TypeScript finalization/reference-resolution remains the largest
tail. The next step should improve Rust-owned resolver completeness before
returning to performance optimization.

The prior VS Code sparse closeout showed a large remaining file-target gap:

- `unresolved-file-level-import-target`: 64,429
- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919

For feature completeness, the file target gap should be reduced before moving
deeper into binding-level symbol disambiguation. If Rust cannot reliably map an
import specifier to a target file, later symbol-level resolution work lacks the
right context.

## Goal

Bring Rust JS/TS file-level import target resolution closer to the TypeScript
resolver for two narrow, high-value paths:

- conventional aliases:
  - `@/`
  - `~/`
  - `@src/`
  - `src/`
  - `@app/`
  - `app/`
- workspace package subpaths:
  - `@scope/ui/widgets` -> `packages/ui/widgets`
  - bare package import -> member package directory
  - directory/index extension resolution remains the normal follow-up step

This is a Rust-owned file-level target parity slice. It should create
file-level `imports` edges where the target file is known, but it must not make
symbol-level resolver decisions.

## Non-Goals

- Do not migrate binding-level symbol disambiguation.
- Do not change final target selection, ranking, confidence, or `resolvedBy`
  semantics for non-file-level decisions.
- Do not implement npm package resolution.
- Do not honor package `exports`, `main`, or conditional exports.
- Do not add `.svelte` or `.vue` target extension support in this slice.
- Do not change default user behavior outside the existing Rust-owned
  `rust-hybrid` indexing path.
- Do not change SQLite schema.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock performance improvement as a success gate.

## Target Scope

### Conventional Aliases

Rust should mirror the TypeScript resolver's conventional alias fallback list:

| Alias | Replacement |
| --- | --- |
| `@/` | `src/` |
| `~/` | `src/` |
| `@src/` | `src/` |
| `src/` | `src/` |
| `@app/` | `app/` |
| `app/` | `app/` |

The existing extension and directory index candidate rules still apply after
rewriting the specifier.

### Workspace Package Subpaths

Rust should load workspace member package names from:

- root `package.json` `workspaces` array;
- root `package.json` `workspaces.packages` array;
- root `pnpm-workspace.yaml` `packages:` list.

The loader should:

- expand one level of `*` / `**` workspace globs such as `packages/*` and
  `apps/*`;
- read each member's `package.json.name`;
- map package name to member directory;
- use longest package-name match for imports;
- rewrite the subpath without extension;
- let normal extension/index resolution find the target file.

The loader deliberately does not inspect `exports` or `main`.

## Diagnostics

Existing profile fields are enough to see total file-level import movement but
not enough to explain which source kind moved. This slice should add
profile-artifact diagnostics for source-kind attribution. These fields are
diagnostic artifacts only and do not promise long-term public API stability.

Required source kinds:

- `relative`
- `tsconfigPaths`
- `conventionalAlias`
- `workspacePackage`
- `unsupported`
- `binding`
- `unresolved`

At minimum, the profile must make it possible to answer:

- how many imports were resolved by each source kind;
- how many imports fell back by each source kind;
- whether conventional alias and workspace package paths were exercised in a
  real profile.

Existing aggregate fields should remain present for compatibility:

- `importPathAliasResolvedRefs`
- `importPathAliasFallbackRefs`
- `importPathAliasBindingFallbackRefs`
- `importPathAliasUnsupportedFallbackRefs`
- `importPathAliasUnresolvedFallbackRefs`

## Acceptance Evidence

Required deterministic coverage:

- Rust resolves conventional aliases to file-level `imports` edges.
- Rust resolves workspace package subpaths declared via root `package.json`
  workspaces to file-level `imports` edges.
- Rust resolves workspace package subpaths declared via `pnpm-workspace.yaml`
  to file-level `imports` edges.
- Existing relative import and tsconfig/jsconfig paths behavior remains intact.
- The resolved graph stays stable relative to the intended file-level target
  behavior.
- Diagnostics expose source-kind resolved/fallback counts.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy and source-kind diagnostics in the closeout decision;
- closeout decision stating whether this file-target parity slice is keepable.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance results are evidence, not a gate. A no-op or regression is
acceptable if the closeout clearly explains why the feature-completeness slice
is or is not keepable.

## Issue Sequence

1. Add Rust workspace package manifest loader.
2. Resolve Rust JS/TS conventional aliases and workspace subpaths.
3. Add source-kind diagnostics for Rust file import target resolution.
4. Run targeted closeout evidence for JS/TS file import target parity.
