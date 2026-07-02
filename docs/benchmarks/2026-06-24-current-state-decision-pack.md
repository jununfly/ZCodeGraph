# Current State Decision Pack

Date: 2026-06-24

## Purpose

This decision pack closes the current documentation-governance pass after the
Rust indexing and `rust-hybrid` historical documents were consolidated.

The goal is not to start another implementation roadmap. The goal is to make
the next agent read one current-state document before choosing between
performance work, language coverage, technical-debt cleanup, or new features.

## Direction Decision

The next project direction should be:

1. Finish current-state trust and consistency cleanup.
2. Then return to performance optimization.
3. Then consider language coverage expansion.
4. Treat new user-facing features as lower priority until the Rust-owned
   indexing boundary and evidence story are stable.

Reasoning:

- Rust indexing and `rust-hybrid` now have many completed slices and historical
  decisions. Without a current-state layer, future agents can easily reopen old
  no-go paths or duplicate already-consolidated work.
- The current product risk is stale execution entry points.
- Performance remains the next substantial engineering track, but it should
  start from the architecture/evidence decisions already captured in ADRs and
  consolidated benchmark archives.

## Current Canonical Entry Points

Use these before reading older evidence:

- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- `docs/designs/plan-artifact-consolidated-closeout.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Durable Decisions

### Agent Sufficiency Is The Architecture North Star

Decision source:

- `docs/zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md`

Current interpretation:

- Optimize for whether CodeGraph answers are sufficient enough to stop agents
  from falling back to generic Read/Grep.
- Do not judge work only by internal graph completeness or token cost.

### Rust-Hybrid Remains The Product Default, Not Full TS Replacement

Decision source:

- `docs/designs/plan-artifact-consolidated-closeout.md`

Current interpretation:

- Rust indexing cannot fully replace TypeScript indexing yet.
- `rust-hybrid` remains the default primary path.
- Rust-owned languages include JS, JSX, TS, TSX, MTS, CTS, Go, and Python
  baseline.
- Same-language TypeScript fallback is removed for Rust-owned languages.
- TypeScript fallback still exists for non-Rust-owned product languages and the
  explicit `zcodegraph index --engine typescript` escape hatch.

### Finalization / Reference Resolution Should Move Toward Rust Ownership

Decision source:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`

Current interpretation:

- TypeScript should remain the product shell for CLI/SDK/MCP/status/doctor and
  compatibility orchestration.
- High-volume resolver/finalization database work should continue moving toward
  Rust-owned or protocol-owned boundaries.
- Candidate lookup/cache protocol is the correct first migration shape; broad
  disambiguation migration remains a separate semantic decision.

### Performance Work Must Be Evidence-Gated

Decision source:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

Current interpretation:

- Every optimization candidate should produce local evidence or a no-go
  decision.
- Weak or negative results are useful when they improve the decision map.
- GitHub issue operations are outside the local evidence tooling contract.

### Staged SQLite Write Paths Are The Durable Write Direction

Decision source:

- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

Current interpretation:

- Staged writes and failure-safe final flush remain the durable safety boundary.
- SQLite/write-path work is a proven optimization family but does not solve
  TypeScript finalization/reference resolution.

## Remaining Gaps

These are current-state gaps, not immediate implementation commitments.

1. Python Rust-owned support is baseline extraction only. Framework sufficiency
   and Python resolver parity remain open.
2. Python real-corpus evidence still needs a valid Django or approved Python
   checkout.
3. VS Code sparse still has Rust-owned parse gap taxonomy to review.
4. TypeScript fallback still covers non-Rust-owned product languages.
5. TypeScript finalization/reference resolution remains an architecture-bound
   performance and semantic frontier.
6. Several benchmark artifacts remain as supporting raw evidence. They should
   not be deleted unless a canonical decision already includes the useful
   conclusion and no current document depends on the raw data.

## Documentation Cleanup Applied

This pass uses three classes:

- `canonical decision`: keep directly or reference from this pack;
- `raw evidence / still referenced`: keep;
- `stale process / superseded pair`: delete after extracting the useful
  decision.

Deleted as stale process files:

- `docs/benchmarks/2026-06-20-benchmark-decision-adr-audit.md`
- `docs/benchmarks/rust-indexing-core-phase-14-experiment.md`
- `docs/benchmarks/rust-indexing-core-phase-14.experiment.json`

Why:

- The benchmark ADR audit's durable output is now represented by ADRs
  `ZJ-0002`, `ZJ-0003`, and `ZJ-0004`; the audit file itself is process
  history.
- The Phase 14 experiment manifest and runner note are historical process
  files. The useful Rust indexing history has already been consolidated into
  `docs/designs/plan-artifact-consolidated-closeout.md` and
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`.

## Issue State Audit Queue

This pass deliberately does not call GitHub APIs or update issues.

Next triage pass should verify:

- #165: still the overall post-release optimization tracker.
- #224: should remain parse/extraction diagnostic track only if still open.
- #295: architecture/performance PRD parent issue should point to ADRs and
  consolidated benchmark archives.
- #296: resolver migration plan should be considered represented by `ZJ-0002`
  plus the consolidated `rust-hybrid` plan archive.
- #301: historical benchmark decision ADR cleanup should be closeable if still
  open, because its durable decisions are now in ADRs and this decision pack.
- #475-#487: should be closed or marked completed if still open; their
  implementation/closeout state is consolidated in
  `docs/designs/plan-artifact-consolidated-closeout.md`.

## Recommended Next Candidate Queue

### 1. Trust And Consistency Follow-Up

Run a narrow triage pass over open issues and update GitHub state to match this
decision pack. Do not create a new implementation roadmap yet.

### 2. Performance Optimization

Resume `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
from the current ADR-backed state:

- use `ZJ-0002` for finalization/reference-resolution ownership;
- use `ZJ-0003` for evidence gates;
- use `ZJ-0004` for write-path boundaries.

### 3. Python Real-Corpus And Sufficiency Boundary

Provide a valid Python corpus, then decide whether Python should stay baseline
only or get a framework sufficiency roadmap.

### 4. Broader Language Coverage

Only choose another Rust-owned language after a bounded extraction baseline,
diagnostic taxonomy, and fallback contract are clear.

## Non-Goals

- No code implementation in this pass.
- No new roadmap tree in this pass.
- No direct GitHub issue updates in this pass.
- No performance benchmark rerun in this pass.
- No PRD product-goal changes in this pass.
