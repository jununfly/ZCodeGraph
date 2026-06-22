# Rust-Native TypeScript Module Resolution Roadmap

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Import/file resolver Part 2 tracker: #430
- Previous Part 2 closeout:
  `docs/benchmarks/2026-06-22-typescript-module-resolution-part2-closeout.md`
- Previous oracle plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part2-typescript-module-resolution.md`

## Read This First

Future agents must read this roadmap before opening implementation files.

The goal is not to wander through TypeScript module-resolution details one
specifier at a time. The goal is to execute the main campaign:

```text
build a Rust-native TypeScript moduleResolution architecture that can be
validated against TypeScript semantics, then move bounded slices from
shadow-only diagnostics into graph-writing behavior
```

Use the tree below to understand the full map, then choose work from the main
subtree and the exploit slices. Do not let the explore subtree consume the main
route unless a later decision explicitly promotes one of those branches.

## Decision

We will pursue **Rust-native TypeScript full `moduleResolution`** as the
long-term target.

This is a shift from the previous sample-driven oracle plan. The oracle plan
was useful, but it exposed a process problem: capped fallback samples can fail
to select an implementation bucket even when the larger architectural gap is
real. The next route must stop waiting for sample luck and start building the
Rust-native resolver architecture directly.

This does not mean reckless graph changes. The first implementation plan is
shadow-only diagnostics in Rust core:

- production Rust code may change;
- default graph nodes/edges must not change;
- diagnostics/profile fields may be added;
- TypeScript compiler API remains a test/evidence oracle only;
- no TypeScript runtime dependency is added;
- no `node_modules` graph expansion is added.

## Roadmap Tree

```text
Rust-native TypeScript moduleResolution
├─ Main subtree: repo-local graph sufficiency path
│  ├─ Resolver architecture and protocol
│  │  ├─ Rust request type: specifier + source file + language + import kind
│  │  ├─ compilerOptions summary: moduleResolution/module/baseUrl/paths/rootDirs/allowJs/resolveJsonModule
│  │  ├─ decision record: TS-style resolution decision
│  │  └─ shadow-only profile diagnostics
│  ├─ Config interpretation
│  │  ├─ tsconfig/jsconfig discovery
│  │  ├─ extends/default handling
│  │  ├─ moduleResolution modes
│  │  ├─ baseUrl/paths
│  │  └─ rootDirs
│  ├─ Repo-local package resolution
│  │  ├─ package self-name imports
│  │  ├─ workspace package imports
│  │  ├─ package subpath imports landing in repo source
│  │  └─ package boundary no-go when target is external
│  ├─ Package exports/imports for repo-local targets
│  │  ├─ exports "." and subpath entries
│  │  ├─ imports "#" entries
│  │  ├─ condition set handling for repo-local source
│  │  └─ no node_modules graph expansion by default
│  ├─ File target semantics
│  │  ├─ extension substitution
│  │  ├─ .ts/.tsx/.js/.jsx/.mts/.cts/.d.ts pairing
│  │  ├─ directory/index lookup
│  │  └─ declaration/runtime target relationship
│  ├─ Parity confidence
│  │  ├─ TS compiler API oracle fixtures
│  │  ├─ Rust decision record comparison
│  │  ├─ mismatch/no-oracle taxonomy
│  │  └─ current repo + VS Code sparse diagnostics
│  └─ Guarded graph writing
│     ├─ file-level imports edges
│     ├─ ESM named symbol edges
│     ├─ one-hop re-export edges
│     └─ rollback/no-go when parity is weak
│
├─ Explore subtree: semantic frontier
│  ├─ full node_modules graph expansion
│  ├─ third-party package symbol indexing
│  ├─ typesVersions
│  ├─ Classic and Node10 legacy exactness
│  ├─ symlink/preserveSymlinks/pnpm virtual store behavior
│  ├─ custom loaders and bundler plugins
│  ├─ JSON/CSS/assets/custom non-code modules
│  ├─ type-only vs runtime target divergence
│  └─ package manager specific edge cases
│
└─ Exploit slices: bounded implementation work
   ├─ shadow-only diagnostics skeleton
   ├─ TS oracle parity harness
   ├─ profile diagnostics integration
   ├─ paths/rootDirs parity slice
   ├─ package self-name repo-local slice
   ├─ workspace package repo-local slice
   ├─ package exports repo-local slice
   ├─ package imports "#" repo-local slice
   ├─ extension substitution slice
   ├─ directory/index lookup slice
   ├─ Node builtin boundary taxonomy slice
   ├─ package external-boundary no-go taxonomy slice
   └─ guarded edge-write slice
```

## Route Discipline

The main subtree is the campaign.

The explore subtree is a map of known complexity, not a default work queue.
Explore branches can be investigated when they block the main subtree, but they
should not become implementation work simply because they are interesting.

The exploit slices are the unit of execution. Each issue should pick one exploit
slice and make it verifiable end-to-end.

## First Implementation Plan

The first implementation plan is:

```text
Rust-native moduleResolution shadow diagnostics foundation
```

This plan has four issues.

### 1. Roadmap And Resolver Protocol Skeleton

Purpose:

- land this roadmap;
- create Rust-native resolver request and decision record types;
- keep behavior shadow-only;
- do not write graph edges.

Initial request fields:

- `specifier`;
- `source_file`;
- `language`;
- `import_kind`;
- nearest config path when known;
- compilerOptions summary:
  - `moduleResolution`;
  - `module`;
  - `baseUrl`;
  - `paths`;
  - `rootDirs`;
  - `allowJs`;
  - `resolveJsonModule`.

Initial decision record fields:

- `specifier`;
- `sourceFile`;
- `moduleResolutionMode`;
- `resolvedKind`;
- `resolvedPath`;
- `isExternalLibraryImport`;
- `failedLookupCategory`;
- `conditionSet`;
- `parityStatus`;
- `fallbackReason`.

Acceptance criteria:

- Rust core has typed request/decision structures;
- the structures are covered by unit tests or deterministic fixture tests;
- default graph output is unchanged;
- no TypeScript runtime dependency is added.

### 2. TS Oracle Parity Harness

Purpose:

- use TypeScript compiler API as test/evidence oracle;
- compare Rust decision records with oracle records;
- classify parity as `match`, `mismatch`, `no-oracle`, or `unknown`.

Acceptance criteria:

- deterministic fixtures cover builtin, relative, paths, package self-name,
  package subpath, exports, and unresolved cases where feasible;
- oracle remains test/evidence tooling only;
- no production runtime dependency is added;
- mismatch samples are privacy-safe.

### 3. Profile Diagnostics Integration

Purpose:

- expose Rust-native moduleResolution shadow diagnostics in the Rust index
  profile;
- prove diagnostics are non-empty on targeted fixtures;
- run current repo and VS Code sparse targeted profile/status.

Acceptance criteria:

- profile exposes decision counts and bounded samples;
- current repo profile/status evidence is recorded;
- VS Code sparse profile/status evidence is recorded when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- no automatic clone is attempted;
- RSS or unavailable reason is recorded;
- graph-readable status remains healthy/degraded as before.

### 4. Closeout And Next Exploit Slice Selection

Purpose:

- decide whether the shadow diagnostics foundation is keep/no-go;
- select the next main-subtree exploit slice;
- keep explore-subtree work out unless explicitly promoted.

Acceptance criteria:

- closeout artifact exists under `docs/benchmarks/`;
- #430 and #165 are updated;
- next exploit slice is selected from the roadmap tree;
- the closeout explicitly states default graph behavior did not change;
- the closeout does not claim full moduleResolution completion.

## Validation Contract

The first implementation plan requires:

- unit or deterministic fixture tests;
- current repo targeted profile/status;
- VS Code sparse targeted profile/status when available;
- no full scoreboard;
- no agent A/B;
- no release/package smoke by default;
- no default graph edge changes.

## Risk Posture

Do not be timid about the architectural goal.

The risk is not that Rust-native TypeScript moduleResolution is too ambitious.
The risk is drifting into local details without a campaign map. This roadmap is
the map. Future implementation should use it to move deliberately through the
main subtree while keeping semantic frontier work visible but contained.
