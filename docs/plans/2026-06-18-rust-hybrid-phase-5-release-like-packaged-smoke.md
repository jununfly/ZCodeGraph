# Rust-Hybrid Phase 5: Release-Like Packaged Smoke and Readiness Evidence

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 4 plan: `docs/plans/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-v1.md`
- Phase 4 decision: `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- Phase 4 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- Phase 5 tracker: [#251](https://github.com/jununfly/ZCodeGraph/issues/251)
- Phase 5 decision: `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- Phase 5 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`

## Context

Phase 1 made `rust-hybrid` the CLI full-index default skeleton. Phase 2 added Rust-owned Go extraction and a Gin sufficiency slice. Phase 3 implemented language-level TypeScript fallback writes into one unified graph. Phase 4 added local diagnostic bundles for degraded and failed `rust-hybrid` runs.

Those phases validated source-checkout behavior. The first-user release PRD still requires release-like packaged behavior: users install a bundle or npm shim, the CLI discovers the packaged Rust core, `rust-hybrid` remains the default full-index strategy, status exposes hybrid health, and doctor bundles work from the packaged path.

The existing package smoke script predates the `rust-hybrid` default and still speaks in terms of default TypeScript and explicit Rust. Phase 5 should update that smoke gate so the release-like path validates the current product strategy rather than the old implementation story.

## Goal

Prove that release-like packaged CLI and staged npm shim paths can run the first-user `rust-hybrid` workflow:

1. `zcodegraph init -i` uses `rust-hybrid` by default.
2. `zcodegraph index` uses `rust-hybrid` by default.
3. `zcodegraph index --engine rust-hybrid` works explicitly.
4. Packaged status exposes hybrid metadata.
5. Degraded `rust-hybrid` runs can produce `doctor --last-run` bundles.
6. Rust process-level failures fail safely and can produce `doctor --last-failure` bundles.

This phase provides release-like readiness evidence. It does not claim final first-user release readiness.

## Non-Goals

- Do not update README or release messaging.
- Do not implement SDK default behavior or SDK engine options.
- Do not implement Rust-owned per-file parse/extraction fallback to TypeScript.
- Do not require real Gin packaged smoke.
- Do not trigger the GitHub Release workflow.
- Do not publish npm packages.
- Do not push tags.
- Do not close #165.
- Do not claim final first-user release readiness.

## Decisions

### Cover extracted bundle and staged npm shim

Phase 5 must cover both release-like shapes:

- extracted bundle with `bin/zcodegraph` and `bin/zcodegraph-core`,
- staged npm shim with the matching optional platform package.

Testing only the extracted bundle would miss npm shim and optional dependency layout failures. Testing only the npm shim would make Rust core discovery failures harder to diagnose.

### Build and run local release-like artifacts

Unit tests for the smoke script are useful but insufficient. Phase 5 evidence must include one local release-like smoke run against built artifacts:

- a local extracted bundle,
- a local staged npm root.

The smoke remains local-only. It must not publish, contact the public npm registry, trigger a GitHub Release workflow, or upload diagnostics.

### Cover healthy, degraded, and failure paths

The smoke should use small deterministic fixtures rather than a real Gin checkout.

Required fixture classes:

- healthy: Rust-owned JS/TS/Go fixture indexes successfully and status reports `rust-hybrid`,
- degraded: mixed supported non-Rust-owned file triggers TypeScript fallback and `doctor --last-run` works,
- failure: packaged Rust core is hidden or removed, `rust-hybrid` fails safely, previous index is preserved, and `doctor --last-failure` works.

Real Gin sufficiency evidence remains covered by earlier source-checkout phases. Phase 5 is about package mechanics, not Go coverage breadth.

### Align CI packaged-path checks

`.github/workflows/ci.yml` should stop checking the old TypeScript-default wording for packaged path coverage. The targeted CI check should align with `rust-hybrid` default behavior and packaged Rust core discovery.

### Leave SDK and per-file Rust fallback as follow-ups

The SDK remains a separate API and error-model slice. Rust-owned per-file parse/extraction fallback also remains a separate release blocker or follow-up blocker because it requires Rust gap taxonomy and graph replacement semantics.

Phase 5 should name these gaps in the decision artifact, but not implement them.

## Expected Behavior

### Extracted bundle smoke

Given a local extracted bundle:

```bash
node scripts/rust-package-smoke.mjs --bundle <bundle-dir> --npm-root <npm-root> --out <out-dir>
```

Expected bundle gates:

- `init -i` exits successfully and writes a `rust-hybrid` index.
- default `index` exits successfully and writes a `rust-hybrid` index.
- explicit `index --engine rust-hybrid` exits successfully.
- `status --json` reports hybrid metadata.
- degraded fixture records fallback taxonomy and `doctor --last-run` creates a bundle directory.
- missing packaged Rust core fails safely under `rust-hybrid`, preserves the previous index, and `doctor --last-failure` creates a bundle directory.

### Staged npm shim smoke

Given a staged npm root containing the main package and matching platform package:

- npm shim launches the packaged CLI.
- npm default `index` uses `rust-hybrid`.
- npm explicit `--engine rust-hybrid` works.
- npm status reports hybrid metadata.
- npm degraded run creates `doctor --last-run` bundle.
- npm missing optional platform package still fails clearly.
- npm package metadata still has no postinstall and no local Rust compilation requirement.

### CI alignment

The packaged-path CI target should verify current `rust-hybrid` behavior, not stale TypeScript-default behavior.

## Issue Breakdown

1. [#252 Rust-hybrid Phase 5.1: Update package smoke contract for rust-hybrid](https://github.com/jununfly/ZCodeGraph/issues/252)
2. [#254 Rust-hybrid Phase 5.2: Add package smoke tests and CI alignment](https://github.com/jununfly/ZCodeGraph/issues/254)
3. [#253 Rust-hybrid Phase 5.3: Run local extracted bundle smoke](https://github.com/jununfly/ZCodeGraph/issues/253)
4. [#255 Rust-hybrid Phase 5.4: Run staged npm shim smoke](https://github.com/jununfly/ZCodeGraph/issues/255)
5. [#256 Rust-hybrid Phase 5.5: Record packaged smoke evidence and decision](https://github.com/jununfly/ZCodeGraph/issues/256)

## Validation

Required before closing Phase 5:

- `npm run build` passes.
- Targeted unit/script tests pass.
- Local extracted bundle smoke passes.
- Local staged npm shim smoke passes.
- Smoke covers healthy, degraded, and process-failure `rust-hybrid` paths.
- Packaged `status --json` hybrid metadata is verified.
- Packaged doctor `last-run` and `last-failure` bundle generation is verified.
- Evidence document is written under `docs/benchmarks/`.
- Decision document is written under `docs/plans/`.
- Decision explicitly states SDK behavior and Rust-owned per-file fallback remain separate follow-ups.

Do not require:

- full benchmark scoreboard,
- real Gin packaged smoke,
- release workflow trigger,
- npm publish,
- README update.

## Stop Conditions

Stop and write a blocker decision instead of expanding scope if:

- packaged Rust core discovery fails in a way that requires release workflow redesign,
- staged npm shim cannot exercise the packaged CLI without changing package architecture,
- doctor bundle generation requires source slices or automatic upload,
- validating `rust-hybrid` packaged path requires implementing SDK defaults,
- per-file Rust fallback becomes necessary to make the package smoke pass.
