# Rust Indexing Core Phase 4 Default Rollout Readiness Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 3 Production Hardening Plan](2026-06-13-rust-indexing-core-phase-3-production-hardening.md)

Phase 3 results: [Rust Indexing Core Phase 3 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-3-results.md)

Phase 4 results and decision: [Rust Indexing Core Phase 4 Results And Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Phase 4 decision outcome: Branch B, continue opt-in hardening. Rust remains
opt-in; Branch A is blocked until the follow-up rollout blockers named in the
decision document are addressed.

## Goal

Phase 4 aims to collect the missing rollout-readiness evidence and perform one
bounded optimization so that, if the gates pass, the next artifact can be a
Rust default-rollout plan.

Rust remains opt-in throughout Phase 4. The TypeScript indexer remains the
default for `zcodegraph index`, npm/npx users, MCP hosts, release bundles, and
all existing install flows.

## Current Evidence

Phase 3 established that the opt-in Rust JavaScript, TypeScript, JSX, and TSX
indexing path is packageable, locally diagnosable, failure-safe, and sufficient
on the pinned ZCodeGraph, Excalidraw, and Zustand validation targets.

The remaining rollout-readiness gaps are:

- Phase 3 did not require Rust to be faster than TypeScript end-to-end.
- Phase 3 macOS peak-RSS sampling returned `null`, so memory evidence must be
  made repeatable before using RSS as a rollout argument.
- The Rust path still pays TypeScript-side finalization costs for framework
  post-extract work, reference resolution, dynamic-dispatch synthesis, and DB
  maintenance.
- The validation set needs one larger JavaScript/TypeScript target to expose
  finalization and RSS behavior at a scale beyond Excalidraw.
- Real release-cycle npm/npx consumption evidence is still a prerequisite for a
  future default-rollout plan, but it is not a Phase 4 completion gate.

## Current Decisions

- [ ] Target decision branch A: prepare a default-rollout plan only if Phase 4
  evidence supports it.
- [ ] Keep Rust opt-in for the whole phase.
- [ ] Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX,
  and TSX.
- [ ] Improve measurement before making optimization claims.
- [ ] Require one bounded, data-driven optimization trial.
- [ ] Require matching tests and benchmark/profile evidence for every Phase 4
  implementation issue.
- [ ] Use ZCodeGraph, Excalidraw, and Zustand as hard-gate repositories.
- [ ] Use VS Code as the default large JavaScript/TypeScript readiness target,
  with a documented same-class replacement allowed if VS Code is too expensive
  for the local validation environment.
- [ ] Do not publish npm packages, trigger GitHub Releases, push release tags,
  or change the default engine in Phase 4.

## Non-Goals

- Do not make Rust the default index engine.
- Do not write or execute the default-rollout plan during Phase 4.
- Do not migrate additional languages.
- Do not rewrite MCP, installer, Explore planning, Explore rendering, or MCP
  tool surfaces.
- Do not migrate ReferenceResolver, framework resolvers, or dynamic-dispatch
  synthesizers to Rust.
- Do not change graph semantics to trade coverage or Agent Sufficiency for
  speed.
- Do not remove heuristic edges, reduce symbol coverage, or weaken Explore
  sufficiency as an optimization tactic.
- Do not add telemetry or upload diagnostics.
- Do not require npm/npx users to compile Rust locally.

## Hard Gates

Phase 4 is complete only when all hard gates pass:

- ZCodeGraph, Excalidraw, and Zustand semantic parity remains acceptable for
  the Rust JS/TS/JSX/TSX slice.
- Agent Sufficiency guardrails show no increased generic Read/Grep fallback risk
  after Rust indexing on the three hard-gate repositories.
- Rust end-to-end wall-clock indexing is no more than 25% slower than
  TypeScript on each hard-gate repository.
- VS Code or the documented same-class large target has a readiness profile
  where Rust is no more than 50% slower than TypeScript.
- At least one reliable platform records valid peak-RSS data for TypeScript and
  Rust indexing; unavailable RSS must include a machine-readable reason rather
  than an unexplained `null`.
- Rust peak RSS shows no material regression against TypeScript and should show
  a clear reduction on at least one pressure repository.
- The data-driven optimization trial is `positive`, or it is `neutral but
  informative` and names the remaining rollout-blocking optimization target. A
  `negative` trial blocks branch A.
- Phase 3 package smoke, packed npm smoke, CI artifact contract, failure-safety
  matrix, local diagnostics, and default TypeScript safety checks continue to
  pass.
- Every implementation issue includes aligned tests and benchmark/profile
  evidence in the same branch of work.
- Rust remains opt-in through explicit `--engine rust` or
  `ZCODEGRAPH_INDEX_ENGINE=rust`.

## Validation Targets

| Repo | Role | Requirement |
|---|---|---|
| ZCodeGraph | Self-hosting JS/TS indexing corpus | Hard gate |
| Excalidraw | React/JSX flow and canvas corpus | Hard gate |
| Zustand | TS store/action corpus | Hard gate |
| VS Code | Large JS/TS readiness target | Readiness evidence |

VS Code is the default large target. If it is too expensive for a local
validation environment, Phase 4 may use a same-class large JavaScript/TypeScript
repository instead. The replacement must record the reason, repository URL,
commit, indexed file count, TypeScript/Rust profile, and sufficiency prompt.

## Phase 4 Checklist

### 1. Profiling And RSS Evidence Baseline

- [ ] Extend `scripts/rust-index-profile.mjs` or the Phase 3 validation harness
  so peak RSS is reliable on at least one supported platform.
- [ ] When RSS is unavailable, emit a machine-readable reason instead of a bare
  `null`.
- [ ] Record TypeScript and Rust wall-clock time, peak RSS, source scanning,
  parsing/extraction, SQLite writing, subprocess handoff, and TypeScript
  finalization subphases.
- [ ] Record repository commit, file count, CLI version, Rust core version, Node
  version, OS, and architecture.
- [ ] Produce comparable before baselines for ZCodeGraph, Excalidraw, and
  Zustand.
- [ ] Add tests for profile JSON shape, RSS unavailable reasons, and summary
  artifact layout.
- [ ] Record benchmark/profile outputs in a Phase 4 results document or raw
  artifact directory referenced by the results document.

### 2. Data-Driven Optimization Trial

- [ ] Pick one measured Rust-path bottleneck from the Phase 4 baseline.
- [ ] Write the optimization hypothesis before implementation: which metric
  should improve and why.
- [ ] Implement one bounded optimization that is locally reversible and does not
  change graph semantics.
- [ ] Measure before/after on ZCodeGraph, Excalidraw, and Zustand.
- [ ] If the large target is ready, run the same readiness profile on VS Code or
  its documented replacement.
- [ ] Classify the result as:
  - `positive`: the target subphase drops at least 15% on one pressure repo, or
    Rust-vs-TypeScript slowdown narrows by at least 10 percentage points, with
    no parity or sufficiency regression.
  - `neutral`: the metrics do not materially improve, but the run identifies
    the next bottleneck or proves this direction is not worth expanding.
  - `negative`: the optimization regresses parity, sufficiency, RSS,
    wall-clock, or maintainability; the optimization must be reverted or
    quarantined.
- [ ] Add tests that protect the optimized behavior and prevent default
  TypeScript regressions.
- [ ] Add benchmark/profile evidence showing the trend classification.

### 3. Finalization Follow-Up

- [ ] If the optimization trial identifies a safe finalization target, perform
  one follow-up that reduces repeated DB queries, repeated scans, or unbatched
  resolver work.
- [ ] Keep ReferenceResolver, framework resolvers, dynamic-dispatch
  synthesizers, Explore planning, and Explore rendering in TypeScript.
- [ ] Verify semantic parity and Agent Sufficiency after the change.
- [ ] Verify default TypeScript indexing still behaves the same.
- [ ] If no safe finalization optimization remains, document the blocking
  reason and the next architectural decision that would be required.

### 4. Large Target Readiness Validation

- [ ] Pin a VS Code commit, or document the same-class replacement.
- [ ] Run TypeScript and Rust index profiles on the large target.
- [ ] Record wall-clock, peak RSS, finalization subphases, node/edge counts, and
  dominant bottleneck.
- [ ] Run at least one Explore sufficiency probe against the large target.
- [ ] Confirm Rust indexing does not increase generic Read/Grep fallback risk.
- [ ] Store raw artifacts plus a compact summary.
- [ ] Keep the large target out of the ordinary local test loop unless an
  explicit long-running validation command is used.

### 5. Release And Packaging Readiness Refresh

- [ ] Re-run local release bundle smoke for default TypeScript indexing,
  explicit Rust indexing, and missing packaged Rust binary behavior.
- [ ] Re-run packed npm smoke for optional platform package wiring, explicit
  Rust indexing, default TypeScript indexing, and no local Rust compilation.
- [ ] Re-run the Rust failure-safety matrix.
- [ ] Re-run CI artifact contract tests for all six release targets.
- [ ] Verify `zcodegraph status --json` still reports Rust readiness,
  discovery, last index engine, and latest local profile summary.
- [ ] Add or update tests for any changed package, bundle, or diagnostics
  behavior.
- [ ] Record benchmark/smoke outputs in the Phase 4 results artifacts.

### 6. Decision Document

- [ ] Write a Phase 4 results document with raw artifact locations, benchmark
  summary, RSS summary, optimization trend classification, large-target
  readiness evidence, package smoke results, and failure-safety results.
- [ ] Write a Phase 4 stop/continue decision.
- [ ] Choose one branch:
  - Branch A: prepare a default-rollout plan.
  - Branch B: continue opt-in hardening.
  - Branch C: stop Rust expansion and reassess the Rust-core/TypeScript-shell
    boundary.
- [ ] If choosing branch A, list the release-cycle evidence still required
  before changing the default engine.
- [ ] If choosing branch B or C, explain which gate blocked branch A.

## Default Rollout Readiness Criteria

Branch A is allowed only when Phase 4 evidence supports it:

- Hard-gate repositories pass semantic parity and Agent Sufficiency.
- Rust is no more than 25% slower than TypeScript on each hard-gate repository.
- The large target is no more than 50% slower.
- RSS evidence is valid, shows no material regression, and preferably shows a
  clear Rust advantage on at least one pressure repository.
- The optimization trial is `positive`, or `neutral but informative` with a
  concrete next optimization that can be included in the rollout plan.
- Package smoke, failure safety, CI artifact, diagnostics, and default
  TypeScript safety all pass.
- Release-cycle evidence can be scheduled without adding new infrastructure.

Release-cycle evidence remains outside the Phase 4 completion gate. Before a
future default engine change, the project still needs:

- At least one official release carrying Rust core optional platform packages.
- Post-release npm/npx explicit `--engine rust` smoke on macOS, Linux, and
  Windows.
- No unresolved packaging or install blockers from that release.
- Bug reports that can be separated by TypeScript/Rust engine metadata.
- A rollback plan that can restore TypeScript as the default without changing
  the MCP protocol or installer surface.

## Local Validation

Minimum local validation for Phase 4 implementation work:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts
node scripts/rust-index-profile.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand
node scripts/rust-phase3-validation.mjs \
  --repo zcodegraph=. \
  --repo excalidraw=/path/to/excalidraw \
  --repo zustand=/path/to/zustand \
  --out /tmp/zcodegraph-rust-phase4/
```

Long-running readiness validation should additionally profile VS Code or the
documented same-class replacement and run the package smoke path:

```bash
node scripts/rust-index-profile.mjs \
  --repo vscode=/path/to/vscode
node scripts/rust-package-smoke.mjs \
  --bundle /path/to/extracted/zcodegraph-linux-x64 \
  --npm-root /path/to/release/npm \
  --out /tmp/zcodegraph-rust-phase4-package-smoke/
```

Any implementation issue that changes Rust indexing, TypeScript finalization,
packaging, diagnostics, or validation scripts must include both:

- targeted automated tests for the changed contract;
- benchmark/profile evidence showing the expected trend or explaining why the
  result is neutral/negative.

## Agent Handoff Notes

- Start with profiling and RSS evidence; do not optimize against a missing or
  unexplained baseline.
- Keep Rust opt-in until a later default-rollout plan explicitly changes that
  decision.
- Protect Agent Sufficiency first. A faster index that causes agents to Read or
  Grep more is a regression.
- Keep optimization bounded and reversible. If the data points toward a deeper
  resolver/synthesizer migration, record that as an architectural decision
  rather than slipping it into Phase 4.
- Treat VS Code as readiness evidence, not as part of the ordinary quick local
  test loop.
- Do not publish npm packages, trigger GitHub Releases, push tags, or change the
  default engine as part of Phase 4.
