# Rust Indexing Core Phase 3 Results

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 3 Production Hardening Plan](../plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md)
Issues: [#71](https://github.com/jununfly/ZCodeGraph/issues/71), [#72](https://github.com/jununfly/ZCodeGraph/issues/72), [#73](https://github.com/jununfly/ZCodeGraph/issues/73), [#74](https://github.com/jununfly/ZCodeGraph/issues/74), [#75](https://github.com/jununfly/ZCodeGraph/issues/75), [#76](https://github.com/jununfly/ZCodeGraph/issues/76), [#77](https://github.com/jununfly/ZCodeGraph/issues/77)

## Summary

Phase 3 keeps the Rust JS/TS indexer opt-in and focuses on repeatable release
confidence rather than default rollout. The profiling path now separates the
TypeScript finalization window into named subphases, so future reruns can show
where post-Rust time is spent before attempting additional optimization.

Rust remains opt-in. Rust is not required to be faster than TypeScript in Phase 3; the required evidence is repeatable profiling, no semantic/sufficiency regression, and a documented optimization conclusion.

## Verification Run

Verification for #76 completed the implementation and local test gates:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-package-smoke.test.ts __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts __tests__/rust-phase3-results-doc.test.ts __tests__/rust-index-profile.test.ts __tests__/status-json.test.ts __tests__/rust-core-discovery.test.ts __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/build-bundle-rust-core.test.ts __tests__/pack-npm-rust-core.test.ts __tests__/ci-rust-packaged-path.test.ts
git diff --check
```

Verification for #77 completed the real three-repository harness run:

```bash
ZCODEGRAPH_PHASE3_BUNDLE_DIR=/tmp/zcodegraph-phase3-bundle/zcodegraph-darwin-arm64 \
ZCODEGRAPH_PHASE3_NPM_ROOT=release/npm \
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --repo zustand=/private/tmp/codegraph-corpus/zustand \
  --out /tmp/zcodegraph-rust-phase3-real/
```

Output:

- raw artifacts, `summary.json`, and `summary.md`:
  `/tmp/zcodegraph-rust-phase3-real/`
- generated at: `2026-06-13T12:09:43.634Z`
- result: all Phase 3 gates passed
- package publishing: not performed
- default rollout: not performed; Rust remains opt-in

## Real Three-Repo Run

| Repo | Commit | Files copied | TypeScript | Rust | Slowdown | Gate |
|---|---|---:|---:|---:|---:|---|
| ZCodeGraph | `d77fce6` | 268 | 2029 ms | 2844 ms | 40.2% | pass |
| Excalidraw | `a83ac488` | 648 | 5229 ms | 6224 ms | 19.0% | pass |
| Zustand | `566b5bf` | 53 | 373 ms | 396 ms | 6.2% | pass |

The Phase 3 benchmark gate is bounded investigation, not a speedup requirement:
Rust must remain below 100% slower, must not show a material RSS regression when
RSS data is available, and must not regress sufficiency. RSS sampling returned
`null` on this macOS run, so no RSS improvement or regression is claimed.

| Gate | Status |
|---|---|
| Benchmark | pass |
| Profile | pass |
| Agent Sufficiency | pass |
| Failure-safety matrix | pass |
| Package smoke | pass |
| Default TypeScript smoke | pass |
| Explicit Rust smoke | pass |
| Diagnostics | pass |

## Repeatable Commands

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-profile.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand \
  --out /tmp/zcodegraph-rust-phase3/
node scripts/rust-package-smoke.mjs \
  --bundle /path/to/extracted/zcodegraph-linux-x64 \
  --npm-root /path/to/release/npm \
  --out /tmp/zcodegraph-rust-package-smoke/
```

The Phase 3 harness writes raw artifacts plus `summary.json` and `summary.md`.
`rust-index-profile.mjs` is still independently runnable for focused profiling.
`rust-package-smoke.mjs` consumes local bundle output and the local
`scripts/pack-npm.sh` output under `release/npm`; it does not publish packages,
create GitHub Releases, push tags, or contact the public npm registry.

## Finalization Subphases

`rust-index-profile.mjs` now records the following subphases for each target
repo:

| Field | Meaning |
|---|---|
| `frameworkPostExtractMs` | Framework post-extract finalization after Rust extraction. |
| `referenceResolutionMs` | TypeScript-side unresolved reference resolution. |
| `dynamicDispatchSynthesisMs` | Dynamic-dispatch synthesis surfaced from the resolver window. |
| `dbMaintenanceMs` | SQLite maintenance after finalization. |

Each repo result also includes `dominantFinalizationSubphase`.

## Pinned Validation Targets

| Repo | Role | Required evidence |
|---|---|---|
| ZCodeGraph | Self-hosting JS/TS indexing corpus | Passed at `d77fce6`. |
| Excalidraw | React/JSX flow corpus | Passed at `a83ac488`. |
| Zustand | Third-party TS store/action corpus | Passed at `566b5bf`. |

## Low-risk optimization conclusion

No additional TypeScript resolver or synthesizer rewrite is included in Phase 3.
The low-risk optimization decision is to expose subphase timings first and keep
ReferenceResolver, framework resolvers, and dynamic-dispatch synthesizers in
TypeScript. A future optimization may target the dominant subphase reported by
the three-repo profile, but Phase 3 does not speculate beyond the measured data.

This is intentional: changing the resolver/synthesizer layer without the new
subphase evidence would risk sufficiency regressions. The accepted Phase 3
optimization work is the profiling split itself, which makes the next low-risk
optimization measurable and reversible.

## Local bundle and packed npm smoke

Package smoke validation is a hard gate for Phase 3. The smoke path verifies:

- an extracted Unix bundle preserves `bin/zcodegraph` and `bin/zcodegraph-core`;
- default TypeScript indexing works from the bundle without invoking Rust;
- explicit `--engine rust` works from the bundle through the packaged Rust core;
- removing `bin/zcodegraph-core` makes explicit Rust indexing fail safely;
- the packed npm main package stays thin and has no `postinstall`;
- the matching optional platform package supplies `bin/zcodegraph-core` or
  `bin/zcodegraph-core.exe`;
- a local npx-like invocation works from the staged packages;
- missing optional platform package behavior is clear and does not attempt local
  Rust compilation.

The packed npm layout should be generated by `scripts/pack-npm.sh` from local
release bundles before running `rust-package-smoke.mjs`.

## Default-rollout readiness checklist

- [x] ZCodeGraph, Excalidraw, and Zustand all have pinned commits in the Phase 3
  harness output.
- [x] Benchmark output shows no Phase 3 bounded-performance regression.
- [x] Profile output includes `frameworkPostExtractMs`, `referenceResolutionMs`,
  `dynamicDispatchSynthesisMs`, `dbMaintenanceMs`, and
  `dominantFinalizationSubphase` for all three repos.
- [x] Agent Sufficiency output shows no Rust-vs-TypeScript regression for all
  three repos.
- [x] Failure-safety matrix output passes all hard-gated cases.
- [x] Local bundle and packed npm smoke output passes without real publishing.
- [x] Local diagnostics output is present in `status --json` and harness
  `summary.json`.
- [x] Default TypeScript indexing behavior is unchanged.
- [x] Rust remains opt-in through explicit `--engine rust` or
  `ZCODEGRAPH_INDEX_ENGINE=rust`.
- [x] No npm package, GitHub Release, tag, or default rollout has been
  performed.
