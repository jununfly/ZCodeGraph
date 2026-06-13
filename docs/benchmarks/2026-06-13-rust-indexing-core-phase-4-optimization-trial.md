# Rust Indexing Core Phase 4 Optimization Trial

Parent issue: [#80](https://github.com/jununfly/ZCodeGraph/issues/80)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

Baseline: [Rust Indexing Core Phase 4 Profile Baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)

## Summary

Result classification: `positive`.

The Phase 4 baseline identified `dynamicDispatchSynthesisMs` as the dominant
Rust-path finalization subphase on ZCodeGraph, Excalidraw, and Zustand. The
trial applies a bounded, behavior-equivalent optimization: full-graph dynamic
synthesizers now skip language-specific passes when the indexed project has no
files in those languages. The pass falls back to the historical behavior when
language statistics are unavailable.

The trial also records real dynamic-dispatch synthesis timing separately from
reference resolution timing. Before this change, the Rust finalization profile
conservatively assigned the whole resolver window to
`dynamicDispatchSynthesisMs` whenever any synthesized edge was emitted, which
made the next bottleneck harder to identify.

Rust remains opt-in.

## Hypothesis

Rust Phase 4 validation targets are JavaScript/TypeScript/JSX/TSX slices, but
the dynamic-dispatch finalization pass still ran language-specific full-graph
synthesizers for Go, Dart, C++, Kotlin, React Native native bridges, MyBatis,
Gin, Pascal forms, and other ecosystems that cannot match a JS/TS-only graph.

Skipping impossible language-specific passes should reduce measured
dynamic-dispatch synthesis time without changing graph semantics for applicable
JS/TS synthesizers such as callback channels, EventEmitter, React render, JSX
child, Vue, SvelteKit, and interface/implementation bridges.

## Raw Artifacts

- Before profile: `/tmp/zcodegraph-rust-phase4-profile-baseline.json`
- After profile: `/tmp/zcodegraph-rust-phase4-optimization-after.json`
- Sufficiency guardrail:
  `/tmp/zcodegraph-rust-phase4-optimization-sufficiency.json`

After profile generated at: `2026-06-13T13:33:19.761Z`

## Results

| Repo | Before dynamic synthesis | After dynamic synthesis | Drop | Before slowdown | After slowdown | Slowdown delta | Rust RSS before | Rust RSS after |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | 647 ms | 103 ms | 84.1% | 42.9% | 44.7% | 1.9 pp wider | 221,020,160 bytes | 216,399,872 bytes |
| Excalidraw | 2312 ms | 327 ms | 85.9% | 18.5% | 17.5% | 1.0 pp narrower | 303,022,080 bytes | 291,651,584 bytes |
| Zustand | 73 ms | 6 ms | 91.8% | 7.2% | 6.5% | 0.7 pp narrower | 92,880,896 bytes | 93,339,648 bytes |

The trial meets the Phase 4 positive threshold because the target subphase fell
by more than 15% on every hard-gate repository, with no material RSS regression
and no Agent Sufficiency regression detected by the guardrail.

## Guardrails

Targeted validation:

```bash
npm run build
npx vitest run \
  __tests__/callback-synthesizer-language-gating.test.ts \
  __tests__/field-channel-synthesizer.test.ts \
  __tests__/closure-collection-synthesizer.test.ts \
  __tests__/rust-index-engine-cli.test.ts \
  __tests__/rust-parity.test.ts \
  __tests__/rust-index-profile.test.ts
node scripts/rust-sufficiency-guardrail.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --repo zustand=/private/tmp/codegraph-corpus/zustand
```

Result:

- Build passed.
- Targeted Vitest suites passed: 6 test files, 27 tests.
- Sufficiency guardrail completed for ZCodeGraph, Excalidraw, and Zustand with
  no regressions reported.

## Notes

- This trial is intentionally bounded: it does not move ReferenceResolver,
  framework resolvers, dynamic-dispatch synthesizer implementations, Explore
  planning, or Explore rendering to Rust.
- The optimization does not reduce node coverage, edge coverage, heuristic
  coverage, or Agent Sufficiency policy.
- The improved timing split means later Phase 4 work can distinguish actual
  synthesis time from reference-resolution time instead of treating the shared
  resolver window as one opaque bottleneck.
