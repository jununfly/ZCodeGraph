# ZCodeGraph Documentation Map

> Single entry point and entity registry for this repository's durable
> documentation. Last reviewed: 2026-10-28.
>
> This map is the **entity registry** for the ontology defined in
> [`ONTOLOGY.md`](ONTOLOGY.md). Each section corresponds to one entity
> class. Every entity listed here carries YAML frontmatter with
> `doc-kind`, `authority`, `authority-id` (when primary/supporting), and
> `bounded-question`; see `ONTOLOGY.md` for the schema.
>
> Navigation order here is **not** truth precedence; when two primary
> entities make conflicting normative claims, that is a Human-review signal,
> not something the map silently resolves.
>
> **Scope of `docs/`** (2026-10-28 governance pass): only the repository's
> *current* objective results, structure, design rationale, authoritative
> constraints, open TODOs, and future plans. Time-stamped measurement
> artifacts and decision-campaign history live under
> [`research/archive/`](../research/archive/) and are not part of the
> durable documentation tree.

## Entity classes

| Class | Folder | Authority range | Count |
| --- | --- | --- | --- |
| Decision | [`decisions/`](decisions/) | primary | 10 |
| Contract | [`contracts/`](contracts/) | primary | 14 |
| Method | [`methods/`](methods/) | primary / supporting | 11 |
| Plan | `plans/` (CLI SoT, not always on disk) | process | not enumerated here |

Root-level external entries: [`../ZJ-CONTEXT.md`](../ZJ-CONTEXT.md) —
domain language glossary (`external`, governed at repository root).

Ontology contract: [`ONTOLOGY.md`](ONTOLOGY.md) — entity classes,
attributes, relationships, hard rules (`primary`, ONT-docs-ontology-v1).

Historical material entrance: [`../research/archive/`](../research/archive/) —
time-stamped evidence and decision-campaign ledgers preserved as
evidence-surface artifacts. Not governed by this map.

---

## decisions — durable architecture decisions

`doc-kind: decision`. All `primary`.

| Authority ID | Entity | Bounded question |
| --- | --- | --- |
| ADR-0001 | [ZJ-0001-agent-sufficiency-as-architecture-north-star.md](decisions/ZJ-0001-agent-sufficiency-as-architecture-north-star.md) | Is Agent Sufficiency the architecture north star? |
| ADR-0002 | [ZJ-0002-rust-owned-finalization-reference-resolution.md](decisions/ZJ-0002-rust-owned-finalization-reference-resolution.md) | Where does the Rust/TypeScript ownership boundary sit? |
| ADR-0003 | [ZJ-0003-evidence-gated-indexing-optimization.md](decisions/ZJ-0003-evidence-gated-indexing-optimization.md) | Must indexing optimizations be gated on local evidence? |
| ADR-0004 | [ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md](decisions/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md) | Staged SQLite write paths for Rust indexing? |
| ADR-0005 | [ZJ-0005-separate-durable-decisions-from-process-artifacts.md](decisions/ZJ-0005-separate-durable-decisions-from-process-artifacts.md) | Keep durable decisions separate from process artifacts? |
| ADR-0006 | [ZJ-0006-lazy-sqlite-corruption-recovery.md](decisions/ZJ-0006-lazy-sqlite-corruption-recovery.md) | How does the MCP daemon recover stale/corrupt SQLite handles? |
| ADR-0007 | [ZJ-0007-three-tier-fallback-health-state.md](decisions/ZJ-0007-three-tier-fallback-health-state.md) | How are expected fallbacks distinguished from real gaps? |
| ADR-0008 | [ZJ-0008-merge-init-into-index.md](decisions/ZJ-0008-merge-init-into-index.md) | Should `init` be hard-merged into `index` with auto-bootstrap? |
| ADR-0009 | [ZJ-0009-async-embedding-pipeline.md](decisions/ZJ-0009-async-embedding-pipeline.md) | How is P2 embedding made asynchronous + lazy-incremental? |
| ADR-0010 | [ZJ-0010-fastembed-lazy-install.md](decisions/ZJ-0010-fastembed-lazy-install.md) | How does ZCodeGraph ship the optional fastembed/onnxruntime-node dependency without bloating the default install? |

---

## contracts — primary design & benchmark contracts

`doc-kind: contract`. All `primary`. These are the normative constraints the
codebase currently obeys. Test-locked where applicable.

| Authority ID | Entity | Bounded question |
| --- | --- | --- |
| DES-architecture-roadmap | [architecture-roadmap.md](contracts/architecture-roadmap.md) | What is the validated architecture roadmap for CodeGraph? |
| DES-rust-sqlite-contract | [rust-indexing-core-sqlite-contract.md](contracts/rust-indexing-core-sqlite-contract.md) | What is the SQLite contract for the Rust indexing core? |
| DES-finalization-tail-boundary-contract | [finalization-tail-boundary-contract.md](contracts/finalization-tail-boundary-contract.md) | What is the TypeScript finalization tail boundary contract? |
| DES-rust-framework-matrix | [rust-framework-ownership-matrix-v1.md](contracts/rust-framework-ownership-matrix-v1.md) | Which language/framework slices are rust-owned vs TypeScript shell? |
| BENCH-agent-sufficiency | [baseline-agent-sufficiency-v1.md](contracts/baseline-agent-sufficiency-v1.md) | What is the Agent Sufficiency baseline (v1)? |
| BENCH-indexing-performance | [baseline-indexing-performance-v1.md](contracts/baseline-indexing-performance-v1.md) | What is the indexing performance baseline (v1)? |
| DES-graph-semantics-guardrail-v1 | [graph-semantics-guardrail-v1.md](contracts/graph-semantics-guardrail-v1.md) | What is the graph-semantics closeout guardrail? |
| DES-health-rubric | [health-rubric-v1.md](contracts/health-rubric-v1.md) | What is the A-F health rubric (v1)? |
| BENCH-token-tasks-v1 | [token-baseline-tasks-v1.md](contracts/token-baseline-tasks-v1.md) | What are the Layer-1 token baseline tasks (v1)? |
| BENCH-token-tasks-v2 | [token-baseline-tasks-v2.md](contracts/token-baseline-tasks-v2.md) | What are the Layer-2/3 token baseline tasks (v2)? |
| DES-dead-code-rubric-v1 | [dead-code-rubric-v1.md](contracts/dead-code-rubric-v1.md) | What is the dead-code detection rubric (v1)? |
| DES-schema-evolution-cap | [schema-evolution-and-mcp-tool-cap-v1.md](contracts/schema-evolution-and-mcp-tool-cap-v1.md) | Schema evolution clauses + MCP tool cap ≤12 (v1)? |
| BENCH-architecture-regression-v1 | [architecture-regression-baseline-v1.md](contracts/architecture-regression-baseline-v1.md) | What is the architecture regression baseline (v1)? |
| DES-complexity-rubric | [complexity-rubric-v1.md](contracts/complexity-rubric-v1.md) | What is the cyclomatic-complexity rubric (v1)? |
| CON-resolver-semantic-residuals-v1 | [resolver-semantic-residuals-v1.md](contracts/resolver-semantic-residuals-v1.md) | Which resolver semantic gaps are deferred / no-go, and what guards bind shipped slices? |

---

## methods — methods, playbooks, and how-to guides

`doc-kind: method`. Authority: `primary` or `supporting`.

| Authority | Authority ID | Entity | Bounded question |
| --- | --- | --- | --- |
| supporting | REF-lang-verification | [language-verification-guide.md](methods/language-verification-guide.md) | How is language extraction verified? |
| supporting | DES-dynamic-dispatch-playbook | [dynamic-dispatch-coverage-playbook.md](methods/dynamic-dispatch-coverage-playbook.md) | How is dynamic-dispatch coverage measured and extended? |
| supporting | DES-adaptive-explore-sizing | [adaptive-explore-sizing.md](methods/adaptive-explore-sizing.md) | How is adaptive `zcodegraph_explore` sizing computed? |
| supporting | DES-callback-synthesis | [callback-edge-synthesis.md](methods/callback-edge-synthesis.md) | How are callback/observer edges synthesized? |
| supporting | DES-ios-rn-bridging | [mixed-ios-and-react-native-bridging.md](methods/mixed-ios-and-react-native-bridging.md) | How does mixed iOS + React Native bridging coverage work? |
| supporting | DES-template-markup-parser | [template-markup-parser.md](methods/template-markup-parser.md) | What is the template parser scope (Razor/Blazor/Thymeleaf)? |
| supporting | DES-arch-validation | [architecture-roadmap-validation.md](methods/architecture-roadmap-validation.md) | How was the architecture roadmap validated? |
| supporting | DES-index-pipeline | [index-pipeline.md](methods/index-pipeline.md) | How does the index pipeline work? |
| supporting | DES-finalization-boundary | [rust-indexing-finalization-boundary.md](methods/rust-indexing-finalization-boundary.md) | Where is the finalization boundary? |
| primary | MET-ab-evaluation-matrix | [ab-evaluation-matrix.md](methods/ab-evaluation-matrix.md) | How is the CodeGraph A/B evaluation matrix designed, and what is the 0.9.4 baseline? |
| primary | MET-agent-routing | [agent-routing.md](methods/agent-routing.md) | Should agents answer directly with CodeGraph or delegate to a sub-agent? |

---

## plans — live execution plans (process material)

`doc-kind: plan`. Authority: `process`. These are CLI-managed roadmaps, not
entities; they are exempt from frontmatter and are governed by the
`zj-roadmap-driven` skill.

This folder does not currently exist on disk (git removed the empty
directory when the last tenant was deleted). The previous tenant
(`capability-harvest-roadmap.{json,md}`, 49 nodes / 208 decisions) was
closed 2026-10-27 and consolidated 2026-10-28 into
[`research/archive/ledgers/capability-harvest-roadmap-closeout.md`](../research/archive/ledgers/capability-harvest-roadmap-closeout.md)
per ADR ZJ-0005; see the 2026-10-28 capability-harvest closeout change
log entry below. New campaigns drop a fresh JSON SoT here under
`zj-roadmap-driven` and the folder reappears.

Process material lifecycle:

1. A new campaign drops a fresh JSON SoT here under `zj-roadmap-driven`.
2. The markdown rendering is regenerated by `render_md.py` (delete-then-render).
3. When every node is CLOSED, the campaign is consolidated into a dated
   archive entry under `research/archive/ledgers/` and the SoT is `git rm`'d.
4. This folder is reserved and never carries long-lived entities.

---

## Change log — governance pass 2026-10-28 (capability-harvest closeout)

Scope: **process-artifact consolidation** for the closed capability-harvest
campaign (ADR ZJ-0005 lifecycle). Executed under `/zj-docs-ontology` with
Human confirmation.

1. **Authored** [`research/archive/ledgers/capability-harvest-roadmap-closeout.md`](../research/archive/ledgers/capability-harvest-roadmap-closeout.md)
   (`LED-capability-harvest-roadmap-closeout`, `supporting`) distilling the
   49-node / 208-decision campaign into a durable closeout: timeline
   (2026-10-19 → 2026-10-27), final counts (4 phases, 2 new ADR, 5 new
   contracts, 17 dated evidence docs, 6+ new measure scripts, schema
   v4→v5→v6), per-phase outcome, and pointers to every durable artifact.
2. **Deleted** the four process files via `git rm`:
   - `docs/plans/build_edges_decisions.py` (76 lines)
   - `docs/plans/build_roadmap.py` (69 lines)
   - `docs/plans/capability-harvest-roadmap.json` (2,065 lines)
   - `docs/plans/capability-harvest-roadmap.md` (47 lines)
   The full decision tree remains reachable in git history at those paths.
3. **Updated** the `## plans` section above to record the empty-folder
   state and the closeout pointer.
4. **Re-validated** `tests/docs-ontology.test.ts` — 77/77 still pass
   (no test depends on `docs/plans/` existing; it is not in
   `ENTITY_FOLDERS`).

What this pass deliberately did **not** do:

- No implementation code was touched. Every code change referenced from
  the roadmap is preserved in git history under `feat(<node>):` or
  `chore(<node>):` commits.
- The two build scripts were not archived under `research/archive/` —
  they are pure process-only helpers and their content is recoverable
  from git history if a future campaign needs them.

## Change log — governance pass 2026-10-28 (evidence/ledger decoupling)

Scope: **decouple `docs/` from timestamped evidence and decision-campaign
history** so that `docs/` carries only the repository's current state,
structure, design rationale, authoritative constraints, open TODOs, and
future plans. Executed under `/zj-docs-ontology` with Human confirmation.

What this pass did:

1. **Deleted two doc-lock vitest files** that hard-locked three ledger
   paths:
   - `tests/graph-semantics-guardrail-doc.test.ts`
   - `tests/rust-indexing-core-consolidated-docs.test.ts`
2. **Extracted three durable documents** from archival sources so the
   current constraints and methods remain reachable from `docs/`:
   - `contracts/resolver-semantic-residuals-v1.md` (`CON-resolver-semantic-residuals-v1`, `primary`)
     — distilled from `ledgers/resolver-semantic-residuals-ledger.md`
     (3,008 lines, 63 closeout sections). Lists shipped routes with
     guards, explicit no-go buckets, and deferred-pending-metadata
     buckets.
   - `methods/ab-evaluation-matrix.md` (`MET-ab-evaluation-matrix`, `primary`)
     — distilled from `evidence/codegraph-ab-matrix.md`. Keeps the full
     37-cell 0.9.4 baseline table as the design target for the retrieval
     layer.
   - `methods/agent-routing.md` (`MET-agent-routing`, `primary`)
     — distilled from `evidence/answer-directly-vs-explore-agent.md`.
     Locks the "answer directly with CodeGraph" routing rule for
     `server-instructions.ts`.
3. **Rewrote cross-document references** in 18 files (contracts, decisions,
   methods, ONTOLOGY.md, AGENTS.md, CLAUDE.md, this map):
   - `docs/evidence/<file>` → `research/archive/evidence/<file>`
   - `docs/ledgers/<file>` → `research/archive/ledgers/<file>`
   - `docs/evidence/codegraph-ab-matrix.md` → `docs/methods/ab-evaluation-matrix.md`
   - `docs/evidence/answer-directly-vs-explore-agent.md` → `docs/methods/agent-routing.md`
   - `docs/ledgers/resolver-semantic-residuals-ledger.md` → `docs/contracts/resolver-semantic-residuals-v1.md`
4. **Moved archival material out of `docs/`** via `git mv`:
   - `docs/evidence/` (78 files) → `research/archive/evidence/`
   - `docs/ledgers/` (8 files) → `research/archive/ledgers/`
5. **Removed four empty leftover directories** under `docs/` (`benchmarks/`,
   `designs/`, `prds/`, `references/`) that were not git-tracked but were
   still on disk from the 2026-10-19 ontology restructuring.
6. **Updated `tests/docs-ontology.test.ts`**:
   - Dropped `ledgers` and `evidence` from `ENTITY_FOLDERS` and
     `FOLDER_CLASS_MAP`.
   - Removed the dated-evidence `YYYY-MM-DD` prefix check (no longer
     applicable).
   - Made `methods/` accept either `primary` or `supporting` authority
     (two new primary methods landed).
   - Lowered the entity-count floor from 60 to 30 to match the new tree
     size.
   - Taught the frontmatter parser to accept CRLF line endings (fixed
     pre-existing failure on `ZJ-0010-fastembed-lazy-install.md`).
   - Result: 77/77 tests pass.
7. **Rewrote this map**: dropped `## ledgers` and `## evidence` sections,
   added archive entrance pointer, added new contract and two new methods,
   updated entity-class counts (Decision 8→10, Contract 13→14,
   Method 9→11), and refreshed the `Last reviewed` stamp.

What this pass deliberately did **not** do:

- No historical content was deleted — every former `docs/evidence/` and
  `docs/ledgers/` file is preserved under `research/archive/` via `git mv`,
  reachable through git history and on disk.
- No normative contract content was rewritten beyond the three extractions
  above; all other contract and decision bodies are intact.
- The `plans/` folder was not touched; per ONTOLOGY rule 6 it remains the
  reserved CLI SoT location. The `capability-harvest-roadmap` closeout is
  tracked as a separate follow-up.
- `scripts/measure/*.mjs` help strings still reference the old
  `docs/evidence/` paths in comments only; those are documentation strings
  in archived measure scripts and are updated separately if those scripts
  are re-run.

Open follow-ups from the decoupling pass (superseded by the 2026-10-28
capability-harvest closeout above and subsequent cosmetic-paths commit):

- ~~Close out `plans/capability-harvest-roadmap.{json,md}`~~ — done in the
  2026-10-28 capability-harvest closeout pass above.
- Update `scripts/measure/*.mjs` help strings to point at
  `research/archive/evidence/` (comment-only).
- `tests/cli-affected-pr.test.ts:17` comment still mentions the old
  `docs/evidence/2026-10-20-blast-radius-recall.md` path (cosmetic).

Prior governance passes: see change log entries 2026-10-19 (×2), 2026-09-28,
2026-09-20/21 below for the category-by-folder era and the entity-by-folder
restructuring.

---

## Change log — governance pass 2026-10-19 (rust-owned-migration closeout)

Scope: **process-artifact consolidation** for the closed rust-owned migration
campaign (ADR ZJ-0005 lifecycle). Executed under `/zj-docs-ontology` with
Human confirmation.

1. **Authored** `ledgers/rust-owned-migration-roadmap-closeout.md`
   (`LED-rust-owned-migration-roadmap-closeout`, `supporting`) distilling the
   166-node / 317-decision campaign into a durable closeout. (Moved to
   `research/archive/ledgers/` in the 2026-10-28 pass.)
2. **Deleted** `plans/rust-owned-migration-roadmap.json` (3,586 lines) and
   `plans/rust-owned-migration-roadmap.md` (52 lines) via `git rm` after the
   closeout ledger was staged. The full decision tree remains reachable in
   git history.
3. **Annotated** `evidence/2026-07-03-rust-owned-migration-roadmap.md` with a
   closeout pointer at the top.
4. **Updated** the entity-class count table (Ledger 7→8, Plan 2→0) and the
   `## plans` section.
5. **Re-validated** `tests/docs-ontology.test.ts` — all 138 tests passed at
   that time.

## Change log — governance pass 2026-10-19

Scope: **ontology restructuring** — replaced the category-by-folder layout
(`prds/`, `designs/`, `benchmarks/`, `zj-adr/`, `references/`) with the
entity-by-folder layout (`decisions/`, `contracts/`, `ledgers/`, `evidence/`,
`methods/`, `plans/`). Executed under `/zj-docs-ontology` with Human
confirmation via `/zj-grilling` rounds.

1. **Authored** [`ONTOLOGY.md`](ONTOLOGY.md) as the new primary
   (ONT-docs-ontology-v1) defining entity classes, attributes,
   relationships, and hard rules.
2. **Migrated** 60 documents via `git mv` into the entity-class folders.
3. **Repointed test path constants** in 4 vitest files.
4. **Updated business-rule text** in
   `contracts/baseline-indexing-performance-v1.md`.
5. **Retired the zj-adr/README.md** index; its content was folded into the
   `decisions/` section above.
6. **Rewrote this map** as the entity registry.
7. **Added YAML frontmatter** to all 66 markdown entities.
8. **Created** `tests/docs-ontology.test.ts` (138 tests at that time).

## Change log — governance pass 2026-09-28

Full read-only discovery + validation after the init/index hard merge (ADR
ZJ-0008) and the Mac full-suite validation commit `fb2124d`:

1. **Registered ADR ZJ-0008** (`merge-init-into-index`).
2. **Validated** `docs_governance.py --validate` exit 0 across the tree.
3. **Confirmed** no authority-binding conflicts.

Earlier passes (2026-09-20, 2026-09-21) are preserved in git history.
