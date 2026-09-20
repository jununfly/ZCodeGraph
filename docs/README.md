# ZCodeGraph Documentation Map

> Single entry point and authority register for this repository's durable
> documentation. Last reviewed: 2026-09-20.

This map is the index of record. It binds each page to a lifecycle category, a
`doc-kind`, and an `authority`. Navigation order here is **not** truth
precedence; when two primary pages make conflicting normative claims, that is a
Human-review signal, not something the map silently resolves.

- **doc-kind**: what the page is (`prd`, `adr`, `design`, `benchmark`,
  `reference`, `architecture-*`, `plan`, `retro`, …).
- **authority**:
  - `primary` — a durable authority for one bounded question; carries one
    `authority-id`.
  - `supporting` — elaborates, evidences, or navigates to a primary page; not
    normative on its own.
  - `historical` — a dated one-off record (result, snapshot, evidence); kept for
    traceability, never treated as the current standard.
  - `process` — temporary issue/plan material awaiting durable extraction or
    deletion confirmation.
  - `external` — lives outside `docs/` and is governed elsewhere.

Categories in use: `prds`, `designs`, `benchmarks`, `zj-adr`, `references`.
The former target-defined `states` category was dissolved on 2026-09-20 (its
single page was a benchmark result and moved into `benchmarks/`).

Root-level external entries: [`../ZJ-CONTEXT.md`](../ZJ-CONTEXT.md) — domain
language glossary (`external`, governed at repository root).

---

## zj-adr — durable architecture decisions

`doc-kind: adr`. Index: [`zj-adr/README.md`](zj-adr/README.md)
(`supporting`). All seven decisions are `primary`.

| Authority ID | Page | Bounded question |
| --- | --- | --- |
| ADR-0001 | [ZJ-0001-agent-sufficiency-as-architecture-north-star.md](zj-adr/ZJ-0001-agent-sufficiency-as-architecture-north-star.md) | Is Agent Sufficiency the architecture north star? |
| ADR-0002 | [ZJ-0002-rust-owned-finalization-reference-resolution.md](zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md) | Where does the Rust/TypeScript ownership boundary sit? |
| ADR-0003 | [ZJ-0003-evidence-gated-indexing-optimization.md](zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md) | Must indexing optimizations be gated on local evidence? |
| ADR-0004 | [ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md](zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md) | Staged SQLite write paths for Rust indexing? |
| ADR-0005 | [ZJ-0005-separate-durable-decisions-from-process-artifacts.md](zj-adr/ZJ-0005-separate-durable-decisions-from-process-artifacts.md) | Keep durable decisions separate from process artifacts? |
| ADR-0006 | [ZJ-0006-lazy-sqlite-corruption-recovery.md](zj-adr/ZJ-0006-lazy-sqlite-corruption-recovery.md) | How does the MCP daemon recover stale/corrupt SQLite handles? |
| ADR-0007 | [ZJ-0007-three-tier-fallback-health-state.md](zj-adr/ZJ-0007-three-tier-fallback-health-state.md) | How are expected fallbacks distinguished from real gaps? |

## prds — product requirements

`doc-kind: prd`, `authority: primary`. Dated PRDs form a lineage; the
2026-07-03 roadmap is the current migration authority and earlier PRDs are
retained as historical context for their slice.

| Authority ID | Page | Bounded question |
| --- | --- | --- |
| PRD-rust-vertical-slice | [2026-06-12-rust-indexing-core-vertical-slice.md](prds/2026-06-12-rust-indexing-core-vertical-slice.md) | First Rust indexing core vertical slice scope |
| PRD-hybrid-first-user | [2026-06-18-rust-hybrid-first-user-release.md](prds/2026-06-18-rust-hybrid-first-user-release.md) | Rust-hybrid first-user release scope |
| PRD-hybrid-arch-perf | [2026-06-19-rust-hybrid-architecture-and-performance-optimization.md](prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md) | Hybrid architecture & performance optimization scope |
| PRD-rust-language-semantics | [2026-06-26-rust-language-semantic-support.md](prds/2026-06-26-rust-language-semantic-support.md) | Rust language semantic support scope |
| PRD-rust-owned-roadmap | [2026-07-03-rust-owned-migration-roadmap.md](prds/2026-07-03-rust-owned-migration-roadmap.md) | **Current** Rust-owned migration roadmap |

## designs — design documents

`doc-kind: design`.

| Authority | Authority ID | Page | Note |
| --- | --- | --- | --- |
| primary | DES-architecture-roadmap | [architecture-roadmap.md](designs/architecture-roadmap.md) | Current architecture roadmap |
| primary | DES-sqlite-contract | [rust-indexing-core-sqlite-contract.md](designs/rust-indexing-core-sqlite-contract.md) | Rust indexing core SQLite contract |
| supporting | DES-plan-closeout | [plan-artifact-consolidated-closeout.md](designs/plan-artifact-consolidated-closeout.md) | Durable process-consolidation navigation (ADR-0005); **existence + content locked by two vitest contracts — do not delete** |
| supporting | — | [architecture-roadmap-validation.md](designs/architecture-roadmap-validation.md) | Validation report for the roadmap |
| supporting | — | [index-pipeline.md](designs/index-pipeline.md) | Index pipeline design |
| supporting | — | [rust-indexing-finalization-boundary.md](designs/rust-indexing-finalization-boundary.md) | Finalization boundary |
| supporting | — | [dynamic-dispatch-coverage-playbook.md](designs/dynamic-dispatch-coverage-playbook.md) | Coverage playbook |
| supporting | — | [adaptive-explore-sizing.md](designs/adaptive-explore-sizing.md) | Adaptive `zcodegraph_explore` sizing |
| supporting | — | [callback-edge-synthesis.md](designs/callback-edge-synthesis.md) | Callback/observer edge synthesis |
| supporting | — | [mixed-ios-and-react-native-bridging.md](designs/mixed-ios-and-react-native-bridging.md) | Mixed iOS + RN bridging coverage |
| supporting | — | [template-markup-parser.md](designs/template-markup-parser.md) | Template parser scope (Razor/Blazor/Thymeleaf) |
| historical | — | [2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md](designs/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md) | Dated feasibility decision; existence + terms also test-locked |

> No `process` pages remain in `designs/` as of 2026-09-20. The former
> `domain-language-issues.md` was deleted after all nine items were verified as
> implemented, tracked, and closed (see change log item 5).

## benchmarks — baselines, standards, and dated evidence

`doc-kind: benchmark`. Only the `baseline-*` / guardrail standards are
`primary`. Dated one-off runs are `historical`; undated analyses are
`supporting`.

### Primary standards (repeatable method)

| Authority ID | Page | Bounded question |
| --- | --- | --- |
| BENCH-agent-sufficiency-v1 | [baseline-agent-sufficiency-v1.md](benchmarks/baseline-agent-sufficiency-v1.md) | How is Agent Sufficiency measured? |
| BENCH-indexing-perf-v1 | [baseline-indexing-performance-v1.md](benchmarks/baseline-indexing-performance-v1.md) | How is indexing performance measured? |
| BENCH-graph-semantics-v1 | [graph-semantics-guardrail-v1.md](benchmarks/graph-semantics-guardrail-v1.md) | What graph-semantics guardrails must hold? |

### Supporting analyses and method

- [codegraph-ab-matrix.md](benchmarks/codegraph-ab-matrix.md) — with/without
  A/B matrix across languages and sizes (`supporting`).
- [answer-directly-vs-explore-agent.md](benchmarks/answer-directly-vs-explore-agent.md)
  — interactive A/B writeup (`supporting`).
- [call-sequence-analysis.md](benchmarks/call-sequence-analysis.md) — why read
  savings do not convert to wall-clock (`supporting`).

### Historical one-off evidence (not current standards)

Dated consolidated evidence and release snapshots:

- [2026-06-19-first-user-diagnostic-trust-cleanup-evidence.md](benchmarks/2026-06-19-first-user-diagnostic-trust-cleanup-evidence.md)
- [2026-06-24-current-state-decision-pack.md](benchmarks/2026-06-24-current-state-decision-pack.md)
- [2026-06-24-rust-hybrid-consolidated-benchmarks.md](benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md)
- [2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md](benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md)
- [2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md](benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md)
- [2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md](benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md)
- [2026-06-24-rust-indexing-core-consolidated-benchmarks.md](benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md)
- [2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md](benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md)
- [2026-06-25-zcodegraph-0-10-0-release-critical-validation.md](benchmarks/2026-06-25-zcodegraph-0-10-0-release-critical-validation.md)
- [2026-06-25-zcodegraph-0-10-0-release-snapshot.md](benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot.md)
  · data: [`...-result.json`](benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot-result.json)
- [2026-06-26-zcodegraph-0-10-0-current-state.md](benchmarks/2026-06-26-zcodegraph-0-10-0-current-state.md)
  · data: [`...-summary.json`](benchmarks/2026-06-26-zcodegraph-0-10-0-current-state-summary.json)
- [2026-06-26-zcodegraph-0-10-0-targeted-agent-ab.md](benchmarks/2026-06-26-zcodegraph-0-10-0-targeted-agent-ab.md)
  · data: [`...-summary.json`](benchmarks/2026-06-26-zcodegraph-0-10-0-targeted-agent-ab-summary.json)
- [2026-07-02-rust-owned-python-flask-validation.md](benchmarks/2026-07-02-rust-owned-python-flask-validation.md)
- [2026-07-03-rust-owned-c-cjson-validation.md](benchmarks/2026-07-03-rust-owned-c-cjson-validation.md)
- [2026-07-03-rust-owned-java-spring-petclinic-validation.md](benchmarks/2026-07-03-rust-owned-java-spring-petclinic-validation.md)
- [2026-07-13-rust-owned-cpp-fmt-validation.md](benchmarks/2026-07-13-rust-owned-cpp-fmt-validation.md)
- [explore-sufficiency-2026-06-11.md](benchmarks/explore-sufficiency-2026-06-11.md)
- [explore-sufficiency-2026-06-12-results.md](benchmarks/explore-sufficiency-2026-06-12-results.md)
  — compact result for the 06-11 benchmark (moved from `states/`, 2026-09-20)
- [post-c1-agent-baseline-2026-06-11.md](benchmarks/post-c1-agent-baseline-2026-06-11.md)
- [post-c1-agent-baseline-2026-06-12.md](benchmarks/post-c1-agent-baseline-2026-06-12.md)
- [post-c1-baseline-2026-06-11.md](benchmarks/post-c1-baseline-2026-06-11.md)

All items above are `authority: historical` (JSON companions are data
evidence, not standalone pages).

## references — methods and how-to guides

`doc-kind: reference`.

| Authority | Authority ID | Page | Note |
| --- | --- | --- | --- |
| primary | REF-lang-verification | [references/language-verification-guide.md](references/language-verification-guide.md) | Language verification guide (renamed from `SEARCH_QUALITY_LOOP.md`, 2026-09-20) |

---

## Change log — governance pass 2026-09-20

Completed under the Human-confirmed scope "moves + pointer + extract +
issues-check":

1. **Moved** `docs/SEARCH_QUALITY_LOOP.md` →
   [`docs/references/language-verification-guide.md`](references/language-verification-guide.md)
   via `git mv`; repaired its inbound text reference in
   `benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`.
2. **Moved** `docs/states/explore-sufficiency-2026-06-12-results.md` →
   [`docs/benchmarks/explore-sufficiency-2026-06-12-results.md`](benchmarks/explore-sufficiency-2026-06-12-results.md)
   via `git mv`; removed the emptied `states/` category; repaired the inbound
   reference in `benchmarks/explore-sufficiency-2026-06-11.md`.
3. **Added pointer** `docs-map: docs/README.md` to `AGENTS.md` and `CLAUDE.md`.
4. **Reclassified** `designs/plan-artifact-consolidated-closeout.md` from
   `process` to `supporting`: it is the durable ADR-0005 navigation artifact,
   and its existence/content are enforced by
   `__tests__/rust-indexing-core-consolidated-docs.test.ts` and
   `__tests__/graph-semantics-guardrail-doc.test.ts`. It must not be deleted.
5. **Deleted** `designs/domain-language-issues.md` via `git rm` after
   `issues-check` verified all nine items were implemented in source, had GitHub
   trackers, and were closed. Spot checks in source:
   - `Subgraph.entryNodes` (`src/types.ts:320`) — Issue 2 / #26.
   - `Edge.edgeOrigin?: 'tree-sitter' | 'scip' | 'heuristic' | 'rust-finalization'`
     (`src/types.ts:193`) — Issue 7 / #33.
   - `collectContext` is the public method (`src/index.ts:2471`,
     `src/context/index.ts:262`); no `buildContext` remains in `src/` —
     Issue 5 / #32.
   - `ExploreOutputBudget` is re-exported from the single source
     `src/mcp/explore-types.ts` (`src/mcp/tools.ts:94`) — Issue 9.
   - All glossary terms live in `ZJ-CONTEXT.md` — Issues 1/3/4/6/8 (#27–#31, #29).
6. **Fixed documentation drift left by the closed rename #32:** the public
   method `buildContext` no longer exists in source, but five doc sites still
   used the old name. Updated `AGENTS.md`, `CLAUDE.md`, `README.md`, and
   `site/src/content/docs/reference/api.md` (example + method table) to
   `collectContext`.

### Incident note (same pass)

The WorkBuddy safe-delete shim transiently emptied the `docs/` working tree
(git index untouched). Recovery used `git restore --worktree docs` with the
plain git binary (shim-immune); the two staged renames and the staged
process-file deletion survived, and this untracked map was reconstructed from
the pass record. No tracked content was lost.

Still awaiting separate Human confirmation (no action taken):

- **Historical benchmark archival/deletion.** Dated `historical` evidence whose
  facts are consolidated into ADRs/current-state pages may be archived after
  review; several are also referenced by `__tests__/*-doc.test.ts` contracts,
  so each deletion needs a contract check. Nothing is deleted by default.