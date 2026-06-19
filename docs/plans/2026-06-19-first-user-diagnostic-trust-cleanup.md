# First-User Diagnostic Trust Cleanup Plan

## Context

The first-user `rust-hybrid` release path is usable, but a fresh local
`zcodegraph init` on this repository exposed a trust-chain problem:

- the index completed and remained usable;
- `rust-hybrid` reported `degraded`;
- the doctor bundle explained the degradation as expected fallback plus one
  Rust-owned TypeScript parse gap;
- `.zcodegraph/errors.log` reported `0 files with errors`, which conflicts
  with the CLI and doctor bundle;
- the Node 25+ warning still points to the historical
  `colbymchenry/codegraph` issue URL.

This plan is a narrow post-release cleanup. It is not a performance plan, a
new-language plan, or a broad runtime-support plan.

## Goal

Improve first-user trust when ZCodeGraph reports degraded indexing or runtime
warnings.

The desired outcome is not `degraded = 0`. The desired outcome is that users
and maintainers can answer:

- Did indexing fail, or is the graph usable?
- Which fallback was expected?
- Which fallback is a Rust-owned gap worth tracking?
- Does the diagnostic bundle avoid source code and plaintext paths?
- Do CLI, status, doctor, and errors log describe the same event consistently?
- Does the runtime warning point users at the current project?

## Non-Goals

- Do not implement #165 performance optimization.
- Do not expand language coverage.
- Do not add new MCP tools.
- Do not change the Node 25+ / Node 26 blocking policy.
- Do not claim Node 26 support.
- Do not require real agent/installer configuration changes in closeout.
- Do not require `rust-hybrid` to avoid every fallback.

## Decisions

### Explainability Beats Zero Degraded

`rust-hybrid` intentionally supports per-file and language-level fallback.
This plan should make degraded runs understandable and actionable rather than
turning all fallback into a release blocker.

### Existing Issues Stay Canonical

Use the existing issues for the two problems already created:

- #282 tracks the current Rust-owned TypeScript parse gap.
- #283 tracks parse-gap reporting consistency across CLI, errors log, and
  doctor bundle.

Do not create duplicate issues for those concerns.

### Runtime Warning Is A Small Ownership Fix

The Node 25+ warning should point to `jununfly/ZCodeGraph`, not the historical
repository. This is a small product-trust fix with deterministic coverage. It
must not expand into a broader Node/runtime support redesign.

### Closeout Uses CLI Source Path Only

The closeout smoke should use the built source checkout path:

```bash
node dist/bin/zcodegraph.js init
node dist/bin/zcodegraph.js status --json
node dist/bin/zcodegraph.js doctor --engine rust-hybrid --bundle --last-run
```

Do not reinstall MCP agent configuration by default. The closeout should verify
the user-facing CLI/status/doctor trust chain, not mutate user agent config.

## Issue Sequence

1. #282 Fix rust-hybrid TypeScript parse gap on explore planner tests.
2. #283 Align rust-hybrid parse-gap reporting across CLI, errors log, and
   doctor bundle.
3. Fix Node/runtime warning ownership URL and coverage.
4. Close out first-user diagnostic trust-chain smoke and decision.

## Acceptance

- #282 is resolved or explicitly classified as a non-blocking residual with
  clear taxonomy.
- #283 makes recovered parse-gap reporting consistent.
- Node unsupported-version warning points to the current repository and remains
  covered by deterministic tests.
- A final CLI source-path smoke records the init/status/doctor trust chain.
- The closeout decision states whether remaining degraded behavior is expected,
  actionable, or blocking.
