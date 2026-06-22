# TypeScript Module Resolution Part 2 Closeout

Date: 2026-06-22

## Parent

- Issue: #435
- Part 2 tracker: #430
- Optimization tracker: #165
- Plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part2-typescript-module-resolution.md`

## Decision

Decision: `complete-with-no-go-implementation-slices`.

This Part 2 plan completed the TypeScript module-resolution oracle and boundary
taxonomy work. It did not implement repo-local package/self-name or package
`exports`/`imports` production behavior because the oracle did not select a
safe repo-local bucket from the sampled evidence.

This closeout does not claim full TypeScript `moduleResolution` completion.

## Slice Decisions

| Issue | Slice | Decision | Artifact |
| --- | --- | --- | --- |
| #431 | TypeScript moduleResolution oracle diagnostic map | keep | `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md` |
| #432 | oracle-selected repo-local package self-name resolution | no-go | `docs/benchmarks/2026-06-22-repo-local-package-self-name-resolution-no-go.md` |
| #433 | oracle-selected package exports/imports repo-local slice | no-go | `docs/benchmarks/2026-06-22-package-exports-imports-repo-local-no-go.md` |
| #434 | Node/runtime and third-party package boundary taxonomy | keep | `docs/benchmarks/2026-06-22-node-runtime-third-party-boundary-taxonomy-closeout.md` |

## Remaining Residual Classification

### Closed / Keep

| Residual | Decision |
| --- | --- |
| TypeScript compiler API oracle for sampled package/runtime fallbacks | keep |
| Node/runtime builtin boundary taxonomy | keep |
| third-party package boundary taxonomy | keep |
| third-party package subpath boundary taxonomy | keep |
| package/runtime unresolved no-go taxonomy | keep |

### No-Go In This Plan

| Residual | Reason |
| --- | --- |
| repo-local package/self-name implementation | oracle sampled no repo-local package/self-name residuals |
| package `exports`/`imports` repo-local implementation | oracle sampled no repo-local exports/imports residuals |

### Handoff To Next Plan

| Residual | Next route |
| --- | --- |
| full TypeScript `moduleResolution` completion | needs broader oracle sampling or a corpus with known repo-local package residuals |
| package `exports`/`imports` implementation | rerun oracle on selected corpus/samples before implementation |
| package self-name implementation | rerun oracle on selected corpus/samples before implementation |
| third-party package deep resolution | explicit product decision required; default remains no `node_modules` graph expansion |

## Next Plan Recommendation

Recommended next plan:

```text
TypeScript moduleResolution targeted corpus expansion
```

Purpose:

- choose or construct a corpus with known repo-local package self-name and
  package `exports`/`imports` imports;
- expand oracle sampling beyond capped package/runtime fallback samples only
  for that corpus;
- select a bounded implementation slice only when TypeScript resolves to
  repo-local source and Rust currently falls back.

Do not proceed directly to a production resolver rewrite without that evidence.

## Validation

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

Additional check:

```bash
git diff --check
```

Result:

- passed.

## Tracker Update

#430 should read this plan as complete but not the entire Part 2 route as
fully complete.

#165 should record:

- oracle map complete;
- boundary taxonomy complete;
- repo-local implementation slices no-goed due lack of selected evidence;
- next route is targeted corpus expansion for repo-local package
  module-resolution residuals.
