# Rust-Hybrid Comprehensive Performance Optimization Plan

Date: 2026-06-24

Status: completed

Parent PRD:

- `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`

Consolidated from completed roadmap process files, now removed after merging
their final state into this plan.

Closeout:

- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-closeout-decision.md`

Durable decisions:

- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`
- `docs/zj-adr/ZJ-0005-separate-durable-decisions-from-process-artifacts.md`

## Goal

Run one comprehensive, evidence-first performance optimization cycle for the
default `rust-hybrid` indexing path.

This plan is intentionally broader than a single optimization issue. It should
map the worthwhile performance routes across the indexing chain, then execute
the most promising bounded slice first. The mainline is finalization and
reference-resolution tail work, specifically a candidate lookup/cache protocol
slice that can move repeated candidate lookup pressure toward Rust-owned or
protocol-owned boundaries without changing final reference disambiguation
semantics.

## Direction Decision

The next project direction is supported-language performance optimization.

This plan chooses option 1 from the direction discussion:

1. optimize already-supported language paths;
2. defer new user-facing features;
3. defer broad technical-debt governance unless a performance issue exposes a
   concrete boundary problem;
4. defer broader language coverage until the current `rust-hybrid` path has a
   clearer performance story.

The plan may still include technical debt, architecture, or diagnostic work
when that work is the shortest path to a trustworthy performance conclusion.

## Success Standard

Use an evidence-first success standard:

- complete the opportunity map for the chosen performance lanes;
- land at least one bounded mainline optimization slice;
- record a `keep`, `no-go`, `defer`, or `next` decision for each candidate lane;
- preserve graph parity, fallback taxonomy, and Agent Sufficiency guardrails;
- record RSS or an unavailable reason for optimization evidence.

This plan does not require every metric to beat the current baseline. A no-go
result is successful when it is backed by credible evidence and narrows the
next decision.

## Final Roadmap

The roadmap is organized by indexing-chain stage at the first level and by
optimization technique or candidate at the second level.

Completed roadmap:

```text
[x][X+] 1. Rust-Hybrid Comprehensive Performance Optimization
├── [x][Y+] 1-1. Baseline and evidence contract
│   ├── [x][Y+] 1-1-1. Current repo and VS Code sparse baseline capture
│   └── [x][Y+] 1-1-2. Evidence artifact lifecycle and benchmark hygiene
├── [x][X+] 1-2. Source scan and corpus selection
│   ├── [x][Y+] 1-2-1. Default corpus path validation
│   └── [x][X+] 1-2-2. Excalidraw guardrail trigger criteria
├── [x][X+] 1-3. Rust parse and extraction candidate lane
│   ├── [x][X+] 1-3-1. Parse extraction bucket review
│   └── [x][X+] 1-3-2. Bounded parse extraction optimization candidate
├── [x][X+] 1-4. Rust graph write and SQLite candidate lane
│   ├── [x][X+] 1-4-1. SQLite write path bucket review
│   └── [x][X+] 1-4-2. Bounded graph write optimization candidate
├── [x][Y+] 1-5. Finalization and reference-resolution tail mainline
│   ├── [x][Y+] 1-5-1. Candidate lookup cache protocol boundary
│   ├── [x][Y+] 1-5-2. LowerName QualifiedName FileNodes shape diagnostics
│   ├── [x][Y+] 1-5-3. Bounded candidate protocol A/B optimization
│   └── [x][Y+] 1-5-4. Reference disambiguation semantic guardrail
├── [x][X+] 1-6. Resource usage RSS and process overhead lane
│   ├── [x][Y+] 1-6-1. RSS or unavailable reason evidence
│   └── [x][X+] 1-6-2. Process overhead and timeout attribution
├── [x][X+] 1-7. Agent Sufficiency guardrail lane
│   ├── [x][Y+] 1-7-1. Graph parity and fallback taxonomy guardrail
│   └── [x][X+] 1-7-2. Excalidraw sufficiency guardrail when semantics change
└── [x][Y+] 1-8. Consolidated decision and next-candidate queue
    ├── [x][Y+] 1-8-1. Keep no-go defer next decision archive
    └── [x][Y+] 1-8-2. Next optimization candidate queue
```

The roadmap JSON/Markdown were process artifacts for this completed cycle.
Their final state is consolidated here so the process files can be removed
without losing the decision trail.

## Mainline

### Finalization and Reference-Resolution Tail

The mainline is `1-5. Finalization and reference-resolution tail mainline`.

Rationale:

- prior VS Code sparse evidence attributes the large-corpus timeout to
  finalization reference resolution after Rust core extraction/write and
  fallback append;
- ADR `ZJ-0002` already points finalization/reference resolution toward
  Rust-owned or protocol-owned boundaries;
- repeated TypeScript-only local patches risk improving a local hotspot while
  leaving the architecture boundary unchanged.

### First Migration Slice

The first mainline slice is candidate lookup/cache protocol work.

Scope:

- include high-frequency candidate shapes that already have evidence:
  `LowerName`, `QualifiedName`, and `FileNodes`;
- keep separate diagnostics and decisions per shape;
- preserve per-reference final disambiguation semantics;
- do not expand into full binding-level reference disambiguation migration;
- do not change the SQLite schema unless a separate ADR changes that boundary.

The expected implementation shape is Rust-owned or protocol-owned candidate
lookup/cache support, not another TypeScript-only local patch.

## Non-Mainline Lanes

### Rust Parse And Extraction

Parse/extraction may enter implementation only when baseline evidence shows it
is a top bucket and a bounded A/B candidate exists. Otherwise it should stay as
an explore lane with a `keep`, `no-go`, `defer`, or `next` conclusion.

### Rust Graph Write And SQLite

SQLite/write-path optimization may enter implementation only when baseline
evidence shows it is a top bucket and a bounded A/B candidate exists. Reuse
`ZJ-0004` as the write-path boundary. Do not change the SQLite schema as part
of this plan.

### Resource Usage And RSS

Every optimization result must record RSS or an unavailable reason. RSS
improvement is not a hard success gate. The primary success gates are wall
time, phase-bucket movement, graph parity, fallback taxonomy, and Agent
Sufficiency guardrails when relevant.

### Agent Sufficiency

Agent Sufficiency is the architecture north star, but this plan is not a full
agent A/B campaign by default. Run Agent Sufficiency or Excalidraw guardrails
only when graph semantics, Explore output, language coverage, or user-facing
sufficiency claims change.

## Baseline And Corpus Policy

Default corpus:

- current ZCodeGraph repository;
- VS Code sparse checkout at the existing human-provided corpus path.

Guardrail corpus:

- Excalidraw only when semantics or Agent Sufficiency claims change.

Full scoreboard:

- run the full README repo scoreboard only at closeout or when explicitly
  needed.

If the VS Code sparse checkout is unavailable or is not a Git checkout, mark
the relevant issue as needing human setup. Do not clone a new corpus
automatically.

## Evidence Contract

Each optimization issue should record:

- baseline command and corpus;
- before/after or no-go measurement;
- wall time and relevant phase buckets;
- graphStats or graph parity evidence;
- fallback taxonomy when reference resolution or hybrid ownership is involved;
- RSS or unavailable reason;
- whether Agent Sufficiency guardrails were required and, if so, their result;
- final `keep`, `no-go`, `defer`, or `next` decision.

Process artifacts should not accumulate under long-lived `docs/benchmarks`
unless they are baseline standards, formal result artifacts, or durable
decision evidence. Temporary issue evidence should use `tmp-*` names or stay
within the issue lifecycle. Durable decisions should move into ADRs or
consolidated benchmark evidence.

## Published Issue Breakdown

This plan was split into four issues:

1. #513: Baseline and evidence contract for the comprehensive performance
   roadmap.
2. #514: Finalization/reference-resolution candidate lookup/cache protocol
   boundary and shape diagnostics.
3. #515: Bounded candidate protocol A/B optimization for `LowerName`,
   `QualifiedName`, and `FileNodes`.
4. #516: Closeout decision archive with graph parity, fallback taxonomy, RSS,
   and next-candidate queue.

All four issues are closed.

Parse/extraction and SQLite lanes did not become implementation issues in this
cycle because the evidence gate did not select them as the next bounded
candidate.

## Closeout Decision

The plan is complete as an evidence-first optimization cycle, not as a
performance-win release.

Durable evidence:

- baseline:
  `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.md`
- raw baseline:
  `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.json`
- candidate protocol shape decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-shape-diagnostics-decision.md`
- routing A/B result:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-ab-result.md`
- raw routing enabled result:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-result.json`
- raw VS Code sparse routing disabled comparison:
  `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result.json`
- closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-closeout-decision.md`

Key conclusions:

- baseline classification was `baseline-partial-timeout`;
- current repository baseline completed in `6224ms`;
- VS Code sparse baseline timed out at `310581ms`;
- candidate protocol routing was a `no-go` as a default-path performance
  optimization;
- routing was semantically safe in this slice: graphStats stayed stable and
  mismatch count was `0`;
- routing reduced VS Code sparse candidate protocol DB lookups from `38104` to
  `7794`, but worsened wall time, `referenceResolutionMs`, and
  `nameMatchingMs`;
- `FileNodes.lookupMs` worsened from `352` to `38256`, making per-key
  on-demand candidate producer/hydration the strongest negative signal;
- RSS remained unavailable with `command-wrapper-no-rss`;
- Agent Sufficiency A/B was not required because graph shape and semantics did
  not change.

Next-candidate queue:

1. Lower-overhead finalization/reference-resolution candidate materialization,
   avoiding expensive per-key subprocess/on-demand work.
2. Parse/extraction bucket review only if a fresh baseline makes it a top
   bucket with a bounded A/B candidate.
3. SQLite/write-path bucket review only if a fresh baseline makes it a top
   bucket and stays within the existing write-path boundary.

## Out Of Scope

- New user-facing features.
- New language coverage.
- Full TypeScript reference-resolution rewrite in Rust.
- Full binding-level disambiguation migration.
- SQLite schema changes.
- Full README repo scoreboard as a per-issue requirement.
- README claim updates unless user-facing metrics or claims change.

## Verification

Default verification for this plan:

- roadmap validation through `zj-roadmap-driven`;
- deterministic unit/integration tests for changed behavior;
- current repo profile evidence;
- VS Code sparse targeted profile evidence when the issue touches large-corpus
  tail behavior;
- graph parity and fallback taxonomy where reference-resolution behavior is in
  scope;
- `git diff --check`.
