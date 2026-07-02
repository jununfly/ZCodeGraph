# Plan Artifact Consolidated Closeout

This document consolidates the durable decisions and future navigation facts
from the former `docs/plans/` process artifacts. The source plan and roadmap
files were removed after consolidation in line with ADR
`ZJ-0005-separate-durable-decisions-from-process-artifacts`.

## Consolidation Rule

Process files are useful while a roadmap is active, but they must not become
the project's long-term source of truth. Durable memory belongs in:

- `ZJ-CONTEXT.md` for domain vocabulary;
- `docs/zj-adr/` for hard-to-reverse architectural trade-offs;
- `docs/prds/` for product requirements;
- `docs/designs/` for stable designs and closeout navigation;
- `docs/benchmarks/` for consolidated evidence.

The removed `docs/plans/` files are now treated as absorbed process artifacts:
their stable decisions are summarized here or already live in the design,
PRD, ADR, README, changelog, and benchmark documents listed below.

## Durable Product Decisions

### ZCodeGraph naming and project isolation

The product name is `ZCodeGraph`; the CLI command, MCP server key, filesystem
namespace, and MCP tool prefix use the `zcodegraph` family. Legacy `codegraph`
names are compatibility/history only. Source-checkout development uses the
explicit `zcodegraph-dev` command and must not take over the release
`zcodegraph` command.

Durable home:

- `ZJ-CONTEXT.md`
- `README.md`
- `CHANGELOG.md`

Former process files:

- `2026-06-08-zcodegraph-brand-and-isolation-migration.md`
- `2026-06-30-issue-668-next-version-closeout.md`

### CLI graph-health semantics

`zcodegraph status` is the trust check for the current graph. `status`,
`doctor`, `init`, and `index` share the health vocabulary:

- `healthy`
- `degraded`
- `failed`
- `unavailable`
- `stale`
- `corrupted`

Every non-healthy status must produce exact next-step commands. `doctor` is the
handoff path to maintainers. It creates local, privacy-preserving bundles and
does not upload anything automatically.

Durable home:

- `README.md`
- `CHANGELOG.md`
- `src/diagnostics/graph-health.ts`
- `src/diagnostics/index.ts`
- `__tests__/graph-health.test.ts`
- `__tests__/status-json.test.ts`
- `__tests__/rust-hybrid-doctor.test.ts`

Former process files:

- `2026-06-19-first-user-diagnostic-trust-cleanup.md`
- `2026-06-19-first-user-diagnostic-trust-cleanup-decision.md`
- `2026-06-30-issue-668-next-version-closeout.md`
- `2026-07-02-corrupted-doctor-bundle-v2-roadmap.json`
- `2026-07-02-corrupted-doctor-bundle-v2-roadmap.md`
- `2026-07-02-fallback-diagnostics-ux-roadmap.json`
- `2026-07-02-fallback-diagnostics-ux-roadmap.md`

### Fallback diagnostics UX

`rust-hybrid` fallback does not automatically mean failure. The graph may be
usable while some fallback files or Rust-owned diagnostics need review.
Human-facing output must translate fallback taxonomy into decision-oriented
language, while JSON and bundles preserve machine-readable codes.

Current user-facing contract:

- `zcodegraph index` and `zcodegraph init` explain degraded fallback on the
  first screen.
- `zcodegraph status` shows graph usability, top fallback reason groups, the
  exact doctor command, and the privacy-preserving artifact to share.
- `zcodegraph status --json` exposes `fallbackDiagnostics`.
- `zcodegraph doctor --engine rust-hybrid --bundle --last-run` summarizes graph
  health, fallback health, top reasons, and the maintainer handoff artifact.
- `per-file-diagnostics.json` uses path hashes and reason categories without
  source slices.

Durable home:

- `README.md`
- `CHANGELOG.md`
- `src/diagnostics/fallback-summary.ts`
- `src/diagnostics/index.ts`
- `src/bin/zcodegraph.ts`
- `__tests__/rust-index-engine-cli-fallback.test.ts`
- `__tests__/rust-hybrid-doctor.test.ts`
- `__tests__/status-json.test.ts`

Former process files:

- `2026-06-19-first-user-diagnostic-trust-cleanup.md`
- `2026-06-30-issue-668-next-version-closeout.md`
- `2026-07-02-corrupted-doctor-bundle-v2-roadmap.json`
- `2026-07-02-corrupted-doctor-bundle-v2-roadmap.md`
- `2026-07-02-fallback-diagnostics-ux-roadmap.json`
- `2026-07-02-fallback-diagnostics-ux-roadmap.md`

## Durable Architecture Decisions

### Framework resolver extraction

Framework resolvers should expose extraction behavior through explicit resolver
contracts instead of dead regex paths. Framework route extraction and route to
handler references are part of the extraction/resolution pipeline and should be
covered by resolver-specific tests.

Durable home:

- `src/resolution/frameworks/`
- `src/extraction/`
- framework integration tests
- `README.md`

Former process file:

- `2026-04-24-framework-resolver-extract.md`

### Explore Answer architecture and Agent Sufficiency

Agent Sufficiency is the north star for retrieval work: a ZCodeGraph answer is
successful when it gives an agent enough structural understanding to avoid
generic Read/Grep fallback. The Explore Answer pipeline is organized around
planner, renderer, evidence scope, output budget, flow spine, and source depth.

Durable home:

- `ZJ-CONTEXT.md`
- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`
- `docs/designs/architecture-roadmap.md`
- `docs/designs/architecture-roadmap-validation.md`
- `docs/designs/adaptive-explore-sizing.md`
- `docs/benchmarks/call-sequence-analysis.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

Former process files:

- `2026-06-09-architecture-candidates-and-explore-planner.md`
- `2026-06-11-explore-sufficiency-evaluation.md`

### Dynamic dispatch and framework coverage

Static extraction must avoid silently wrong graph edges. Dynamic-dispatch
coverage is valuable only when a flow is closed end-to-end; partial coverage can
increase fallback behavior by exposing one boundary while leaving the next one
unexplained.

Durable home:

- `docs/designs/dynamic-dispatch-coverage-playbook.md`
- `docs/designs/callback-edge-synthesis.md`
- `docs/designs/mixed-ios-and-react-native-bridging.md`
- `README.md`
- relevant framework resolver tests

Former process files:

- `2026-04-24-framework-resolver-extract.md`
- `2026-06-27-rust-language-semantic-support-closeout.md`

## Rust Indexing Decisions

### Rust indexing core

The Rust indexing core is a staged replacement path, not a one-shot rewrite.
It must preserve SQLite safety, deterministic extraction, packaging contracts,
and failure safety while moving ownership by bounded slices.

Durable home:

- `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`
- `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`
- `docs/designs/rust-indexing-core-sqlite-contract.md`
- `docs/designs/rust-indexing-finalization-boundary.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Former process files:

- `2026-06-24-rust-indexing-core-consolidated-plans.md`
- `2026-06-24-rust-indexing-ts-replacement-readiness-consolidated-plan.md`

### `rust-hybrid` rollout

`rust-hybrid` is the default fast local indexing path, but it remains a hybrid
engine with explicit fallback taxonomy. A degraded run can still be usable when
the degradation is explained and bounded. Same-language TypeScript fallback for
Rust-owned files is disabled; Rust-owned gaps are diagnostics, not hidden
fallback appends.

Durable home:

- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-current-state-decision-pack.md`
- `src/indexing/rust-hybrid-contract.ts`
- `__tests__/rust-index-engine-cli-fallback.test.ts`
- `__tests__/sdk-rust-hybrid.test.ts`

Former process files:

- `2026-06-24-rust-hybrid-consolidated-plans.md`
- `2026-06-24-rust-indexing-ts-replacement-readiness-consolidated-plan.md`

### TypeScript module-resolution migration

Rust-native TypeScript module resolution proceeds by guarded, evidence-backed
slices. The implemented durable boundaries include repo-local config
interpretation, package-map condition sets, extensionless candidates,
declaration target diagnostics, guarded ESM named symbol edges, runtime sibling
pairing, runtime sibling graph writes, and explicit semantic-frontier
classification.

Durable home:

- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `src/indexing/`
- `crates/zcodegraph-core/`
- Rust-native module-resolution tests

Former process files:

- `2026-06-22-rust-native-config-interpretation-completion.md`
- `2026-06-22-rust-native-declaration-target-relationship-diagnostics.md`
- `2026-06-22-rust-native-file-target-semantics-extensionless-candidates.md`
- `2026-06-22-rust-native-package-map-condition-set-completion.md`
- `2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- `2026-06-23-rust-native-guarded-esm-named-symbol-edge-write.md`
- `2026-06-23-rust-native-guarded-runtime-sibling-graph-write.md`
- `2026-06-23-rust-native-safe-runtime-sibling-pairing-decision-contract.md`
- `2026-06-23-rust-native-typescript-module-resolution-semantic-frontier-implementation-plan.md`

### Rust language semantic support

Rust language support is product capability, not the same thing as
`rust-hybrid`. The current support is structural and bounded: `.rs` baseline,
repo-local module paths, trait/impl relationships, Cargo/workspace diagnostics,
macro/cfg frontiers, route wiring candidates, and visibility-guarded scoped
symbol edges. Compiler-grade semantics remain out of scope unless a future PRD
claims them.

Durable home:

- `ZJ-CONTEXT.md`
- `docs/prds/2026-06-26-rust-language-semantic-support.md`
- `README.md`
- Rust language tests

Former process file:

- `2026-06-27-rust-language-semantic-support-closeout.md`

## Release Decision

The 0.10.0 release was a go decision with explicit maintainer-controlled
release steps. Codex does not publish manually, does not run `npm publish`, and
does not bump versions unless asked. GitHub Actions remains the release path.

Durable home:

- `AGENTS.md`
- `CHANGELOG.md`
- `.github/workflows/release.yml`
- `scripts/prepare-release.mjs`
- `scripts/pack-npm.sh`
- `scripts/build-bundle.sh`
- `docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-critical-validation.md`

Former process file:

- `2026-06-25-zcodegraph-0-10-0-release-go-no-go.md`

## Future Entry Points

Future work should start from these durable entry points instead of resurrecting
deleted process files:

- Agent sufficiency or Explore Answer quality: start from `ZJ-CONTEXT.md`,
  `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`, and
  `docs/benchmarks/call-sequence-analysis.md`.
- Rust indexing architecture: start from the Rust indexing PRDs, ADRs
  `ZJ-0002` through `ZJ-0004`, and the consolidated benchmark artifacts.
- Diagnostic trust and CLI health: start from README troubleshooting,
  `src/diagnostics/`, `src/bin/zcodegraph.ts`, and the status/doctor tests.
- Rust language support: start from the Rust language semantic support PRD and
  README support claims.
- Release readiness: start from the release workflow, changelog rules, and
  release validation benchmark artifacts.

## Removed Process Artifacts

The following files were consolidated and removed:

- `docs/plans/2026-04-24-framework-resolver-extract.md`
- `docs/plans/2026-06-08-zcodegraph-brand-and-isolation-migration.md`
- `docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md`
- `docs/plans/2026-06-11-explore-sufficiency-evaluation.md`
- `docs/plans/2026-06-19-first-user-diagnostic-trust-cleanup-decision.md`
- `docs/plans/2026-06-19-first-user-diagnostic-trust-cleanup.md`
- `docs/plans/2026-06-22-rust-native-config-interpretation-completion.md`
- `docs/plans/2026-06-22-rust-native-declaration-target-relationship-diagnostics.md`
- `docs/plans/2026-06-22-rust-native-file-target-semantics-extensionless-candidates.md`
- `docs/plans/2026-06-22-rust-native-package-map-condition-set-completion.md`
- `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- `docs/plans/2026-06-23-rust-native-guarded-esm-named-symbol-edge-write.md`
- `docs/plans/2026-06-23-rust-native-guarded-runtime-sibling-graph-write.md`
- `docs/plans/2026-06-23-rust-native-safe-runtime-sibling-pairing-decision-contract.md`
- `docs/plans/2026-06-23-rust-native-typescript-module-resolution-semantic-frontier-implementation-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- `docs/plans/2026-06-24-rust-indexing-core-consolidated-plans.md`
- `docs/plans/2026-06-24-rust-indexing-ts-replacement-readiness-consolidated-plan.md`
- `docs/plans/2026-06-25-zcodegraph-0-10-0-release-go-no-go.md`
- `docs/plans/2026-06-27-rust-language-semantic-support-closeout.md`
- `docs/plans/2026-06-30-issue-668-next-version-closeout.md`
- `docs/plans/2026-07-02-corrupted-doctor-bundle-v2-roadmap.json`
- `docs/plans/2026-07-02-corrupted-doctor-bundle-v2-roadmap.md`
- `docs/plans/2026-07-02-fallback-diagnostics-ux-roadmap.json`
- `docs/plans/2026-07-02-fallback-diagnostics-ux-roadmap.md`
