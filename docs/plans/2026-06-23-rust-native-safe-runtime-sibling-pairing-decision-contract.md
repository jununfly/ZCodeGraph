# Rust-Native Safe Runtime Sibling Pairing Decision Contract

Date: 2026-06-23

## Parent

- Issue: #460
- Optimization tracker: #165
- TypeScript module resolution roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Previous diagnostics slice:
  `docs/plans/2026-06-22-rust-native-declaration-target-relationship-diagnostics.md`
- Previous diagnostics closeout:
  `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`
- Roadmap node:
  `1-5-4-2. safe runtime sibling pairing decision contract`

## Decision

This plan defines a safe pairing decision contract for TypeScript declaration
targets that have repo-local runtime sibling candidates.

The goal is to answer this question in profile diagnostics:

```text
Could this declaration target be safely paired with an obvious runtime sibling?
```

This plan does not change graph edge targets. File-level import edges that
currently resolve to declaration files must continue to resolve to declaration
files. The behavior change is limited to profile diagnostics and aggregate
counts that support a later `1-5-4-3` guarded graph-write decision.

## Roadmap Split

`1-5-4` is intentionally split into three nodes:

```text
[-] 1-5-4. declaration/runtime target relationship
├─ [x] 1-5-4-1. declaration target relationship diagnostics
├─ [x] 1-5-4-2. safe runtime sibling pairing decision contract
└─ [ ] 1-5-4-3. guarded runtime sibling graph write
```

This plan completes only `1-5-4-2`.

`1-5-4-3` remains the separate behavior-change slice that may later decide
whether eligible pairing decisions should write graph edges to runtime sibling
targets.

## Scope

Extend declaration target profile diagnostics with a pairing decision for every
declaration target sample.

The decision contract should classify all declaration targets, not only
eligible ones. Blocked cases must be explicit so profile evidence distinguishes
known unsafe cases from unimplemented cases.

Suggested sample shape:

```json
{
  "targetKind": "declaration",
  "runtimeSiblingStatus": "singleRuntimeSibling",
  "runtimeSiblingCandidates": ["src/foo.ts"],
  "candidateCount": 1,
  "truncated": false,
  "pairingDecision": {
    "status": "eligibleSingleRuntimeSibling",
    "runtimeTarget": "src/foo.ts",
    "reason": "same-package-single-runtime-sibling"
  }
}
```

Blocked decisions should omit `runtimeTarget`:

```json
{
  "status": "blockedMultipleRuntimeSiblings",
  "reason": "multiple-runtime-siblings"
}
```

Add aggregate counts under a profile field such as:

```text
moduleResolutionDeclarationRuntimePairingDecisionCounts
```

## Eligibility Rules

Only a declaration target with exactly one repo-local same-basename runtime
sibling can be eligible.

Eligibility requires:

- `runtimeSiblingStatus` is `singleRuntimeSibling`;
- the declaration target and runtime sibling are in the same local package
  boundary;
- no external or package boundary is crossed.

Package boundary is intentionally simple:

- use the nearest ancestor directory containing `package.json`;
- if no ancestor `package.json` exists, use project root;
- declaration target boundary and runtime sibling boundary must match;
- do not parse package.json contents;
- do not use workspace package maps for this decision.

## Taxonomy

Pairing decision statuses:

- `eligibleSingleRuntimeSibling`
- `blockedNoRuntimeSibling`
- `blockedMultipleRuntimeSiblings`
- `blockedExternalOrPackageBoundary`
- `blockedUnsupportedDeclarationShape`

Pairing decision reasons:

- `same-package-single-runtime-sibling`
- `no-runtime-sibling`
- `multiple-runtime-siblings`
- `external-or-package-boundary`
- `unsupported-declaration-shape`

## Non-Goals

This plan must not:

- rewrite declaration targets to runtime sibling targets;
- change graph edge targets;
- change SQLite schema;
- expose stable MCP or public API fields;
- follow package maps, declaration maps, source maps, `typesVersions`, generated
  declaration roots, or `node_modules`;
- implement `1-5-4-3. guarded runtime sibling graph write`;
- claim that `1-5-4. declaration/runtime target relationship` is complete.

## Verification

Required verification:

- deterministic fixture for eligible single same-package runtime sibling;
- deterministic fixture for blocked no runtime sibling;
- deterministic fixture for blocked multiple runtime siblings;
- deterministic fixture for blocked cross-package-boundary sibling;
- profile samples include `pairingDecision` for every declaration target sample;
- aggregate counts include pairing decision status distribution;
- current repo targeted profile smoke records the real distribution.

Optional verification:

- VS Code sparse targeted profile smoke may be run if useful, but it is not a
  hard gate because the previous diagnostics slice produced zero declaration
  target hits on that corpus.

No full benchmark loop, release smoke, or agent A/B is required.

## Completion Criteria

When implemented:

- mark `1-5-4-2` complete;
- keep `1-5-4` partial;
- keep `1-5-4-3` open;
- record closeout evidence under `docs/benchmarks/`.
