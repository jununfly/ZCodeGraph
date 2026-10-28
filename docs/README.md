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
> constraints, open TODOs, and future plans. Versioned machine-readable
> inputs consumed by tests or CI live in `baselines/`. Routine measurement
> output goes to the ignored `.tmp/measure/` directory; review evidence
> stays with its owning issue or plan closeout.

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

Historical process material is traceable through Git history. It is not a
runtime input or normative reference for the current documentation map.

## baselines — versioned machine-readable inputs

These JSON assets are **not document entities**. Each one is an explicit input
to a test, script, or CI job; routine measurement output must not be added here.

| Asset | Consumer | Purpose |
| --- | --- | --- |
| [`architecture-regression-v1.json`](baselines/architecture-regression-v1.json) | `scripts/measure/perf-regression-check.mjs`; CI | Frozen corpus, queries, and latency thresholds input |
| [`pr-recall-v1.json`](baselines/pr-recall-v1.json) | `scripts/measure/pr-recall-gate.mjs` | Frozen aggregate PR-recall threshold |
| [`dead-code-annotation-r1-v1.json`](baselines/dead-code-annotation-r1-v1.json) | `scripts/measure/dead-code-precision.mjs` | Fixed arbitrated labels for precision evaluation |

Promotion requires registering the asset and its consumer here. Re-baselining
updates the existing versioned input through its owning decision process;
ordinary reports stay in `.tmp/measure/`.

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

This folder does not currently exist on disk because no campaign is active.
New campaigns drop a fresh JSON SoT here under `zj-roadmap-driven` and the
folder reappears. Completed campaign snapshots remain available in Git history.

Process material lifecycle:

1. A new campaign drops a fresh JSON SoT here under `zj-roadmap-driven`.
2. The markdown rendering is regenerated by `render_md.py` (delete-then-render).
3. Durable outcomes are absorbed into registered decisions, contracts, or
   methods; review evidence stays with the owning issue or closeout.
4. After closeout, the process SoT may be removed with Human confirmation.
   This folder never carries long-lived entities.

---

## Governance history

Earlier governance change logs, closed campaign snapshots, and superseded
category layouts are preserved in Git history rather than duplicated in this
current-state map.

Current governance rules are owned by `ONTOLOGY.md`; current assets and their
consumers are registered above. A documentation move or rewrite must preserve
that single-owner model and keep executable assets self-contained.
