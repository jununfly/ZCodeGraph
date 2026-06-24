# Rust-Hybrid Indexing Completion And Performance Roadmap Plan

Date: 2026-06-24

Status: active

Parent direction:

- `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- #165 post-PRD optimization tracker

Roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Source evidence:

- `docs/plans/2026-06-24-rust-hybrid-performance-optimization-consolidated-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-closeout-decision.md`
- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`
- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0005-separate-durable-decisions-from-process-artifacts.md`

## Goal

Rebuild the roadmap from the accumulated facts instead of continuing to follow
the latest local optimization candidate.

The root goal is:

> Complete Rust-owned indexing/finalization roadmap reconstruction and make
> performance optimization serve that ownership migration mainline.

The prior performance work produced useful evidence, but it also showed the
risk of letting performance grow into its own maze. This plan resets the map
around ownership migration:

- ownership migration is the trunk;
- the end-to-end indexing path is the execution chain inside each ownership
  area;
- user outcomes, graph semantics, and Agent Sufficiency are guardrails;
- performance is evidence and instrumentation, not the steering wheel.

## Root Decisions

### Ownership Trunk

Use ownership migration as the main tree trunk.

For JS, JSX, TS, TSX, MTS, CTS, and Go, the target state is that indexing,
resolver, and finalization become as Rust-owned as practical.

TypeScript remains responsible for:

- CLI, SDK, MCP, and product shell orchestration;
- fallback orchestration for languages or semantic surfaces Rust does not own;
- non-Rust-owned language support;
- explicitly unmigrated semantic guardrails.

### Performance Role

Performance is a validation dimension under ownership migration.

Each ownership slice should record enough trend evidence to avoid building a
slow or opaque boundary:

- wall time;
- relevant profile buckets;
- RSS or unavailable reason;
- graph parity or graphStats;
- fallback taxonomy where relevant.

Open a bounded performance exploit only when evidence shows a bottleneck blocks
ownership progress, user usability, or a trustworthy decision.

### First Frontier

The first exploit frontier is resolver/finalization ownership.

Evidence already points to this frontier:

- VS Code sparse timeout attribution reaches finalization/reference resolution
  after Rust core extraction/write and fallback append;
- per-key on-demand candidate routing is semantically safe in the tested slice
  but a performance no-go;
- run-scoped `FileNodes` materialization is keep-with-caveat, not a broad win;
- the remaining problem is not just a local hotspot, but a hybrid ownership
  boundary.

### First Slice Layer

Start at the facts input layer.

The first implementation slice after this mapping stage should make
Rust-produced facts a stable protocol boundary for TypeScript finalization,
without changing final per-reference disambiguation semantics.

The first facts protocol shapes are:

- `LowerName`;
- `QualifiedName`;
- `FileNodes`.

Each shape must carry explicit status:

- keep;
- no-go;
- diagnostic-only;
- research/oracle-needed;
- candidate for bounded exploit.

Do not redefine the full resolver input surface in one step.

## Current Fact Base

Facts to preserve from completed work:

- `LowerName` on-demand routing lookups previously dropped from `210` to `0`
  in the current-repo optimization cycle.
- Dotted `QualifiedName` prebatching previously reduced residual on-demand
  routing pressure; colon-qualified `QualifiedName` stayed no-go/taxonomy.
- Per-key candidate producer routing reduced some DB lookup counters but
  worsened wall time, `referenceResolutionMs`, and `nameMatchingMs`; it is not
  a default-path performance strategy.
- `FileNodes` batch materialization preserves graph semantics and improves
  diagnosability, but VS Code sparse hit rate was low (`20 / 1516`) and should
  not be expanded by default.
- VS Code sparse remains the large-corpus pressure test.
- A completed large-corpus profile is still needed before broad performance
  claims.
- Agent Sufficiency A/B is not required by default when graph semantics,
  Explore output, language coverage, and user-facing sufficiency claims do not
  change.

## Roadmap Structure

The roadmap JSON is the source of truth while this map is active.

Top-level structure:

```text
[~][X+] 1. Rust-Hybrid Indexing Completion And Performance Roadmap
├── [x][X+] 1-1. Current fact base and evidence archive
├── [x][X+] 1-2. Rust-owned indexing completion boundary
├── [~][Y+] 1-3. Resolver finalization ownership frontier
├── [~][X+] 1-4. Performance evidence lanes under ownership migration
├── [~][X+] 1-5. Agent Sufficiency and graph semantics guardrails
├── [~][X+] 1-6. No-go defer and research archive
└── [~][Y+] 1-7. Execution rules and first-stage closeout
```

The first active exploit leaf for the next stage is:

```text
1-3-1. Facts protocol first slice for LowerName QualifiedName FileNodes
```

## No-Go, Defer, And Research Archive

Keep the archive in the roadmap so future agents do not rediscover old traps.

Default no-go or diagnostic-only:

- per-key on-demand candidate routing as a default performance path;
- expanding low-hit-rate `FileNodes` materialization by default;
- using agent steering to solve tool-choice or sufficiency behavior;
- making full scoreboard a default per-issue requirement;
- changing reference disambiguation semantics as a performance shortcut;
- keeping temporary process evidence indefinitely under `docs/benchmarks`.

Research or oracle-needed before implementation:

- full TypeScript `moduleResolution` exactness;
- package/runtime semantics beyond repo-local bounded slices;
- node_modules graph expansion;
- declaration/runtime target semantics beyond high-confidence pairing;
- any separate type graph or value/type graph split.

## Execution Rules

1. Read this plan and the roadmap before opening implementation work.
2. Keep the roadmap JSON as the source of truth.
3. Use roadmap decisions to record direction changes.
4. Do not open implementation issues from this first mapping stage.
5. The next stage may split `1-3-1` into implementation issues.
6. Each implementation issue should preserve final per-reference
   disambiguation semantics unless a separate architecture decision changes
   that rule.
7. Every implementation issue should record graph parity or graphStats,
   fallback taxonomy where relevant, and RSS or unavailable reason.
8. Agent Sufficiency guardrails are required only when graph semantics, Explore
   output, language coverage, or user-facing sufficiency claims change.

## First-Stage Closeout

This stage is complete when:

- this plan exists;
- roadmap JSON/MD exist and validate;
- root ownership decisions are recorded in roadmap JSON;
- no implementation issues are created from this stage;
- the next recommended action is clear:
  start `1-3-1. Facts protocol first slice for LowerName QualifiedName
  FileNodes`.

