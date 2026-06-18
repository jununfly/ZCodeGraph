# Rust-Hybrid Phase 7 SDK Alignment Evidence

## Summary

Phase 7 aligns programmatic SDK full-index entry points with the CLI `rust-hybrid` default while preserving explicit engine selection.

Result: pass.

## Environment

- Date: 2026-06-19
- Host: macOS development machine
- ZCodeGraph version: `0.9.9`
- Node runtime observed by local `node`: `26.0.0`
- Rust core path: `target/debug/zcodegraph-core`

The local CLI-oriented tests may print the Node 26 guard banner when they spawn the built CLI. Existing test harness paths explicitly exercise that guarded environment. This evidence does not validate Node 26 support for users.

## Commands

Build:

```bash
npm run build
```

Targeted SDK and npm SDK shim tests:

```bash
npx vitest run __tests__/sdk-rust-hybrid.test.ts __tests__/npm-sdk.test.ts
```

Targeted CLI regression suite:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts
```

Full regression suite:

```bash
npm test
```

## Test Evidence

Build passed:

```text
npm run build
```

SDK and npm SDK shim tests passed:

```text
Test Files  2 passed (2)
Tests       13 passed (13)
```

CLI engine regression tests passed:

```text
Test Files  1 passed (1)
Tests       51 passed (51)
```

Full regression suite passed:

```text
Test Files  134 passed | 1 skipped (135)
Tests       1835 passed | 15 skipped (1850)
```

## Covered Behaviors

- SDK exports the shared `IndexEngine` type.
- `CodeGraph.init(projectPath, { index: true, engine: 'typescript' })` works as the explicit TypeScript escape hatch.
- `cg.indexAll({ engine: 'typescript' })` works and does not require Rust core discovery.
- `cg.indexAll({ engine: 'rust' })` works when Rust core is available.
- `CodeGraph.init(projectPath, { index: true })` defaults to `rust-hybrid`.
- `cg.indexAll()` defaults to `rust-hybrid`.
- SDK default full-index calls do not read `ZCODEGRAPH_INDEX_ENGINE`.
- Missing Rust core under SDK default `rust-hybrid` fails safely and preserves the previous index.
- SDK `rust-hybrid` appends language-level TypeScript fallback files into the unified graph.
- SDK `rust-hybrid` appends Rust-owned per-file parse gaps when Rust marks files unwritten and fallback-eligible.
- SDK `rust-hybrid` blocks fallback for possible partial Rust writes and records `rust-owned-gap-with-partial-write-blocked`.
- npm SDK shim remains a transparent re-export of the platform SDK contract.

## Regression Found During Validation

The targeted CLI suite caught a boundary regression after changing the SDK default: CLI `--engine typescript` paths still called SDK `indexAll()` without an explicit engine, so the SDK default redirected those paths to `rust-hybrid`.

The fix keeps CLI engine selection explicit by passing `engine: 'typescript'` when the CLI has already selected the TypeScript indexer. CLI behavior still owns `ZCODEGRAPH_INDEX_ENGINE`; SDK behavior remains explicit and does not read that environment variable.

The full regression suite also caught historical TypeScript baseline tests and experiment scripts that relied on the old SDK/CLI default. Those tests and scripts now explicitly request TypeScript when they are validating TypeScript extractor/resolver behavior or TypeScript-vs-Rust A/B arms. Phase 7-specific tests remain the only tests that intentionally exercise the new SDK default.

## Scope Boundaries

This evidence does not validate:

- README or release messaging,
- full release-like packaged smoke,
- real Gin packaged smoke,
- watch/sync `rust-hybrid` incremental semantics,
- performance optimization or #165,
- GitHub Release workflow trigger,
- npm publish,
- final first-user release readiness.
