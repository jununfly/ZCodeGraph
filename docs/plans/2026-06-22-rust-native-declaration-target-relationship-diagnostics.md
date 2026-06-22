# Rust-Native Declaration Target Relationship Diagnostics

Date: 2026-06-22

## Parent

- Issue: #459
- Optimization tracker: #165
- TypeScript module resolution roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Roadmap node:
  `1-5-4-1. declaration target relationship diagnostics`

## Decision

This plan implements a narrow diagnostics slice for TypeScript declaration
targets resolved by the Rust-native file/module resolver.

When a file-level import resolves to a TypeScript declaration file
(`.d.ts`, `.d.mts`, or `.d.cts`), Rust indexing should continue to point the
file-level import edge at the declaration target. This plan does not rewrite
the edge to a runtime sibling.

Instead, profile diagnostics should expose whether the declaration target has
an obvious repo-local runtime sibling candidate. The purpose is to produce
evidence for a later `1-5-4-2` decision about safe runtime sibling pairing.

## Scope

Implement diagnostics for declaration targets in module resolution profile
artifacts.

The diagnostics should:

- classify declaration targets into a small taxonomy;
- infer only repo-local same-basename runtime siblings;
- expose bounded sample details in profile artifacts;
- expose aggregate counts suitable for large repo evidence;
- avoid exposing source contents or absolute paths.

Runtime sibling inference is intentionally conservative:

- `foo.d.ts` may look for same-directory siblings such as `foo.ts`, `foo.tsx`,
  `foo.mts`, `foo.cts`, `foo.js`, `foo.jsx`, `foo.mjs`, and `foo.cjs`;
- `foo.d.mts` should prefer module-flavored siblings such as `foo.mts` and
  `foo.mjs`, then reasonable TypeScript source siblings;
- `foo.d.cts` should prefer CommonJS-flavored siblings such as `foo.cts` and
  `foo.cjs`, then reasonable TypeScript source siblings;
- candidates must be repo-local and same-basename only.

## Non-Goals

This plan must not:

- change default graph edge targets;
- rewrite declaration targets to runtime targets;
- change the SQLite schema;
- add stable public API fields;
- follow `package.json` maps, `typesVersions`, `declarationMap`, source maps,
  generated declaration roots, or `node_modules`;
- claim that `1-5-4. declaration/runtime target relationship` is complete.

## Diagnostic Contract

Profile artifacts may add a narrow, non-stable diagnostics object for module
resolution samples whose resolved target is a declaration file:

```json
{
  "targetKind": "declaration",
  "runtimeSiblingStatus": "singleRuntimeSibling",
  "runtimeSiblingCandidates": ["src/foo.ts"],
  "candidateCount": 1,
  "truncated": false
}
```

The status taxonomy should stay small:

- `noRuntimeSibling`
- `singleRuntimeSibling`
- `multipleRuntimeSiblings`
- `skippedExternalOrPackageBoundary`

Candidate paths should be repo-relative, capped, and privacy-safe. If the
candidate list exceeds the cap, set `truncated: true`.

Aggregate counts should be available in the profile artifact so large repos can
be diagnosed without reading every sample:

- declaration targets with no runtime sibling;
- declaration targets with one runtime sibling;
- declaration targets with multiple runtime siblings;
- declaration targets skipped because they cross an external or package
  boundary.

## Verification

Required verification:

- deterministic tests for `.d.ts`, `.d.mts`, and `.d.cts` no/single/multiple
  sibling taxonomy;
- deterministic tests that profile samples include
  `declarationTargetRelationship` when a declaration target is sampled;
- deterministic tests that aggregate counts line up with fixture decisions;
- current repo targeted profile smoke;
- VS Code sparse targeted profile smoke when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.

If the VS Code sparse corpus is unavailable or not a Git checkout, record a
`needs-human-setup` evidence note instead of cloning automatically.

No full benchmark loop, release smoke, or agent A/B is required for this
diagnostics slice.

## Roadmap Update

This plan completes only:

```text
[x] 1-5-4-1. declaration target relationship diagnostics
```

After implementation, the roadmap should become:

```text
[-] 1-5-4. declaration/runtime target relationship
├─ [x] 1-5-4-1. declaration target relationship diagnostics
└─ [ ] 1-5-4-2. safe runtime sibling pairing decision/implementation
```

`1-5-4` remains partial until a later plan decides and implements safe runtime
sibling pairing.
