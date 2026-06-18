# Rust-Hybrid Phase 8: First-User Release Readiness Closeout

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 decision: `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`
- Phase 3 decision: `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- Phase 4 decision: `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- Phase 5 decision: `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- Phase 6 decision: `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`
- Phase 7 decision: `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`

## Context

Phases 1-7 implemented the main `rust-hybrid` first-user release path:

1. CLI engine contract and default `rust-hybrid` skeleton.
2. Rust-owned Go extraction v1 and a Gin direct route-handler slice.
3. Mixed-language TypeScript fallback writes into one unified graph.
4. Privacy-preserving `doctor --engine rust-hybrid` diagnostic bundles.
5. Release-like packaged smoke for the CLI path.
6. Rust-owned per-file parse gap fallback.
7. SDK full-index alignment with `rust-hybrid` default behavior.

The remaining PRD risk is release usability and evidence consistency, not another broad feature slice. Phase 8 closes out the first-user release readiness question by auditing PRD gates, rerunning current deterministic smoke on real and packaged paths, updating first-user README messaging, and writing a readiness decision.

## Goal

Produce a current, evidence-backed first-user release readiness decision for the `rust-hybrid` release path.

Phase 8 should answer:

- Can a first user follow the simple setup path without choosing an engine?
- Does the current default `rust-hybrid` path work on a real Gin repository through deterministic smoke?
- Does release-like packaging still work after Phase 7 SDK/default alignment?
- Do status and doctor outputs give maintainers useful degraded/failure evidence?
- Does README/product messaging match the implemented product behavior without exposing unnecessary engine choice in the primary path?
- Are any remaining gaps blockers, explicit non-blockers, or post-release follow-ups?

## Non-Goals

- Do not implement #165 performance optimization.
- Do not require Rust indexing to beat TypeScript on strict speed or RSS targets.
- Do not run multi-round agent A/B.
- Do not implement watch/sync `rust-hybrid` incremental semantics.
- Do not implement full Go module/package import resolution.
- Do not add gRPC/protobuf generated Go flow coverage.
- Do not add broad Go generic edge support.
- Do not change MCP tool names or protocol.
- Do not expose engine internals in normal MCP answers.
- Do not include source code in diagnostic bundles by default.
- Do not upload diagnostics automatically.
- Do not trigger the GitHub Release workflow.
- Do not run `npm publish`, create tags, or push release artifacts.

## Decisions

### Phase 8 Is Release Readiness Closeout

The next plan is a release-readiness closeout, not a new language coverage, watch/sync, or performance plan.

The implementation should stay bounded. Small production, documentation, test, or smoke-harness fixes are allowed only when the closeout audit exposes a concrete PRD release gate gap. Phase 8 should not become an open-ended feature phase.

### README Messaging Is In Scope

README/product messaging must be updated for the first-user primary path.

The primary path should stay simple:

```bash
zcodegraph install
zcodegraph init -i
```

README should not make users choose an indexing engine in the main flow. It may explain, in user-centered language, that ZCodeGraph uses fast Rust-backed indexing where available and automatically falls back where needed.

Troubleshooting or advanced sections may document the TypeScript escape hatch:

```bash
zcodegraph index --engine typescript
ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index
```

Diagnostic bundle commands should also be discoverable:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

Release notes, GitHub Release workflow, and npm publishing are out of scope.

### Real Gin Deterministic Smoke Is Required

Phase 8 must include a real Gin repository smoke.

The smoke is deterministic and should not run multi-round agent A/B. It should validate:

- default `rust-hybrid` full index completes,
- `status --json` reports Go handled by Rust and exposes hybrid metadata,
- `doctor --engine rust-hybrid --bundle --last-run` works,
- fallback taxonomy is explainable,
- graphStats/readability are available,
- a deterministic route/handler probe passes or produces a blocker decision,
- wall time and RSS or RSS unavailable reason are recorded.

If the real Gin corpus is unavailable, Phase 8 cannot honestly claim release readiness. The decision may become blocked or ready-with-explicit-non-blockers only if the missing evidence is clearly classified and accepted.

### Targeted Packaged Smoke Is Required

Phase 8 should rerun a targeted release-like packaged smoke on current main.

The smoke should cover:

- local build,
- release-like packaged CLI discovers the Rust core binary,
- release-like `zcodegraph init -i` default path works,
- release-like `zcodegraph index --engine rust-hybrid` works,
- release-like env selection works,
- release-like status shows hybrid metadata,
- release-like doctor last-run and last-failure bundle generation works,
- bundle and staged npm shim shapes where the existing smoke supports them,
- wall time and RSS or unavailable reason where available.

Do not run the GitHub Release workflow. Do not publish packages. Do not push tags.

### Performance Is A Guardrail, Not A Blocker Target

#165 remains a post-PRD optimization item and is not a Phase 8 blocker.

Phase 8 must still record wall time and RSS or RSS unavailable reason for smoke artifacts. Severe or catastrophic regressions should block readiness and produce a decision artifact, but Phase 8 does not require strict TypeScript-vs-Rust A/B wins.

### Readiness Decision Is Three-State

Phase 8 should end with one of three outcomes:

1. **Accepted: first-user release-ready**
   - PRD release blockers have current evidence.
   - README primary path is aligned.
   - Real Gin deterministic smoke passes.
   - Targeted packaged smoke passes.
   - Status and doctor evidence are usable.
   - No new release blocker remains.

2. **Accepted: release-ready with explicit non-blockers**
   - Core release blockers pass.
   - Remaining items are explicitly classified as non-blocking, such as #165 performance optimization, watch/sync `rust-hybrid` incremental support, or full Go module resolver work.

3. **Blocked**
   - Real Gin smoke is unavailable or fails without an accepted environment explanation.
   - Packaged smoke fails.
   - Status/doctor cannot produce useful evidence.
   - README/product messaging cannot honestly describe current behavior.
   - Process/system failure preservation regresses.

The plan must not assume greenlight before evidence is collected.

## Required Validation

Minimum validation before Phase 8 decision:

```bash
npm run build
npm test
```

Real Gin deterministic smoke:

- default `rust-hybrid` full index,
- `status --json`,
- `doctor --engine rust-hybrid --bundle --last-run`,
- deterministic Gin route/handler/readability probe,
- wall time and RSS or unavailable reason.

Targeted packaged smoke:

- release-like packaged CLI/default path,
- explicit `--engine rust-hybrid`,
- env selection,
- status hybrid metadata,
- doctor last-run and last-failure bundles,
- wall time and RSS or unavailable reason.

README/product messaging:

- primary path does not ask first users to choose an engine,
- troubleshooting documents TypeScript escape hatch,
- doctor bundle commands are discoverable,
- no release workflow or publish instructions are added as something Codex should execute.

## Evidence Artifacts

Expected artifacts:

- PRD gate audit matrix under `docs/benchmarks/`.
- Real Gin deterministic smoke evidence under `docs/benchmarks/`.
- Targeted packaged smoke closeout evidence under `docs/benchmarks/`.
- Final Phase 8 readiness decision under `docs/plans/`.

The final evidence should cite command lines, dates, host environment, target corpus path/commit when available, status excerpts, doctor bundle paths, graphStats, fallback taxonomy, wall time, and RSS or unavailable reason.

## Issue Breakdown

### Phase 8.1: PRD Gate Audit And Smoke Harness

Audit the PRD release gates against current main and prior Phase 1-7 evidence.

Acceptance criteria:

- PRD release gates are mapped to pass, needs-current-evidence, non-blocker, or blocker.
- Existing scripts/tests to reuse are identified.
- Any missing deterministic smoke helper is added only if needed.
- Audit matrix is written under `docs/benchmarks/`.

### Phase 8.2: Real Gin Deterministic Smoke

Run current-main deterministic smoke on a real Gin repository.

Acceptance criteria:

- Default `rust-hybrid` full index completes or produces a blocker decision.
- `status --json` shows Go/Rust hybrid metadata.
- Doctor last-run bundle is generated.
- Deterministic route/handler/readability probe passes or produces a blocker decision.
- Fallback taxonomy is explainable.
- Wall time and RSS or unavailable reason are recorded.
- Evidence is written under `docs/benchmarks/`.

### Phase 8.3: Targeted Packaged Smoke Recheck

Rerun targeted release-like packaged smoke on current main.

Acceptance criteria:

- Packaged CLI discovers Rust core.
- Default `init -i` path works.
- Explicit `index --engine rust-hybrid` path works.
- Env engine selection works.
- Status shows hybrid metadata.
- Doctor last-run and last-failure bundles work.
- No npm publish, release workflow, or tag push is performed.
- Evidence is written under `docs/benchmarks/`.

### Phase 8.4: README Primary Path And Troubleshooting

Update first-user docs to match the implemented product path.

Acceptance criteria:

- README primary path presents `zcodegraph install` and `zcodegraph init -i` without asking users to choose an engine.
- README describes automatic Rust-backed indexing and fallback in user-centered terms.
- Troubleshooting documents TypeScript escape hatch.
- Troubleshooting points to doctor last-run and last-failure bundles.
- README does not claim #165 performance completion.
- README does not instruct Codex to run release workflow, publish npm, or push tags.

### Phase 8.5: Final Evidence And Readiness Decision

Write the final Phase 8 decision.

Acceptance criteria:

- Decision is one of: release-ready, release-ready with explicit non-blockers, or blocked.
- Decision cites the gate audit, real Gin smoke, packaged smoke, README update, and validation commands.
- Decision explicitly classifies #165, watch/sync `rust-hybrid` incremental semantics, full Go module resolver, gRPC/protobuf Go flow, and performance deep optimization.
- Decision does not overclaim readiness if any release blocker lacks current evidence.
- Tracker issue is updated with the outcome.

## Follow-Up Boundaries

Likely non-blocker follow-ups unless Phase 8 evidence proves otherwise:

- #165 performance optimization.
- Watch/sync `rust-hybrid` incremental semantics.
- Full Go module/package import resolution.
- gRPC/protobuf generated Go flow coverage.
- Broader Go generics edge coverage.
- Multi-round agent A/B.

Likely blockers if found:

- Real Gin deterministic smoke cannot index or produce readable graph evidence.
- Packaged default path cannot discover Rust core.
- Status or doctor bundle cannot explain degraded/failure state.
- Process/system failure does not preserve the previous good index.
- README cannot honestly describe the implemented first-user behavior.
