# First-User Diagnostic Trust Cleanup Decision

Date: 2026-06-19

Related issues: #282, #283, #284, #285, #286

## Decision

Accept the first-user diagnostic trust cleanup as complete.

The source-path closeout shows the graph is usable and the remaining degraded
state is expected language-level fallback, not an unhandled Rust-owned parse
gap.

## What Changed

- Rust TypeScript normalization now handles `import("...")` type queries in
  `as` assertions and function-type return positions.
- The previously observed parse gap on `__tests__/explore-planner.test.ts` no
  longer reproduces.
- CLI reporting now separates recovered fallback warnings from unrecovered
  parse errors.
- `.zcodegraph/errors.log` now records recovered fallback warnings instead of
  claiming there are zero errors while hiding the warning event.
- Unsupported Node.js version warnings now point to the current
  `jununfly/ZCodeGraph` issue URL.

## Evidence

- Evidence: `docs/benchmarks/2026-06-19-first-user-diagnostic-trust-cleanup-evidence.md`
- Plan: `docs/plans/2026-06-19-first-user-diagnostic-trust-cleanup.md`

## Closeout Interpretation

Current closeout status:

- `rust-hybrid` init succeeds.
- Current repository no longer has a Rust-owned TypeScript parse-gap diagnostic.
- Remaining degraded state is expected:
  - 3 YAML files through TypeScript fallback
  - 2 Rust files through TypeScript fallback
- Doctor bundle contains no source code or plaintext paths by default.
- Node 26 warning still blocks by policy, but now points at the current
  repository. This plan did not change Node runtime support.

## Residual

The hybrid metadata field `pendingFallbacks` still lists
`rust-owned-parse-gap` as a capability class even when the current run has no
per-file parse-gap diagnostics. Because `fallbackReasonTaxonomy` and
per-file diagnostics accurately describe the current run, this is not a
blocker for the diagnostic trust cleanup. It can be revisited if users confuse
capability-class pending fallback with current-run fallback.
