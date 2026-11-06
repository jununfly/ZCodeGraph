# ZCodeGraph Documentation Map

> Single entry point and entity registry for this repository's durable
> documentation. Last reviewed: 2026-11-06.
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
| Decision | [`decisions/`](decisions/) | primary | 15 |
| Contract | [`contracts/`](contracts/) | primary | 18 |
| Method | [`methods/`](methods/) | primary / supporting | 13 |
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
| [`semantic-retrieval-probe-v1.json`](baselines/semantic-retrieval-probe-v1.json) | `scripts/measure/semantic-retrieval-probe.mjs` | Exploratory real-source AI-anchored retrieval probe; not independent human acceptance labels |
| [`semantic-retrieval-human-annotation-v1.json`](baselines/semantic-retrieval-human-annotation-v1.json) | `scripts/measure/semantic-retrieval-annotation.mjs` | 36 new candidates combined with the 24 probe questions for Human-blind review; AI-authored source input |
| [`semantic-retrieval-human-frozen-v1.json`](baselines/semantic-retrieval-human-frozen-v1.json) | `scripts/measure/semantic-retrieval-annotation.mjs` | 60 Human-reviewed labels by victo, five languages/repositories; 16/60 holdout with whole eShopOnWeb held out; immutable release input |
| [`semantic-retrieval-human-frozen-v2.json`](baselines/semantic-retrieval-human-frozen-v2.json) | `scripts/measure/chunk-fused-holdout-gate-v2.mjs`; `scripts/measure/explore-large-corpus-performance.mjs` | 84 Human-reviewed labels across seven pinned corpora; 60 development plus whole-corpus Rails/Kubernetes holdout; immutable release input |
| [`semantic-retrieval-rails-candidates-v2.json`](baselines/semantic-retrieval-rails-candidates-v2.json) | `semantic-retrieval-human-frozen-v2.json` release manifest (`candidateSha256.rails`) | Twelve reviewed Rails holdout candidates; pinned source labels retained for release audit |
| [`semantic-retrieval-kubernetes-candidates-v2.json`](baselines/semantic-retrieval-kubernetes-candidates-v2.json) | `semantic-retrieval-human-frozen-v2.json` release manifest (`candidateSha256.kubernetes`) | Twelve reviewed Kubernetes holdout candidates; pinned large-corpus source labels retained for release audit |
| [`semantic-retrieval-human-frozen-v3.json`](baselines/semantic-retrieval-human-frozen-v3.json) | `scripts/measure/{symbol-index-dev,symbol-fused-holdout-v3,graph-recall-dev,graph-fused-holdout-v3,semantic-rerank-probe}.mjs` | Human-reviewed frozen v3 corpus; 60 development plus 24 Rails/Kubernetes holdout; immutable and permanently diagnostic after 1-7 |
| [`semantic-retrieval-symbol-index-candidate-v1.json`](baselines/semantic-retrieval-symbol-index-candidate-v1.json) | `scripts/measure/symbol-index-dev.mjs`; `scripts/measure/symbol-fused-holdout-v3.mjs` | Frozen C (symbol-union) candidate config for development selection and one-shot v3 holdout evaluation |
| [`semantic-retrieval-symbol-graph-candidate-v1.json`](baselines/semantic-retrieval-symbol-graph-candidate-v1.json) | `scripts/measure/graph-fused-holdout-v3.mjs` | Frozen G1 (symbol-graph-union) candidate config for one-shot v3 holdout evaluation |
| [`semantic-retrieval-semantic-rerank-candidate-v1.json`](baselines/semantic-retrieval-semantic-rerank-candidate-v1.json) | `scripts/measure/semantic-rerank-probe.mjs` | Frozen R1/R2 semantic-rerank candidate config with holdout hash assertion |
| [`semantic-retrieval-d2-candidate-v1.json`](baselines/semantic-retrieval-d2-candidate-v1.json) | `scripts/measure/chunk-fused-d2-holdout-v3.mjs` | Frozen D2 self-consistency gate candidate config for one-shot v3 holdout evaluation |

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
| ADR-0011 | [ZJ-0011-index-write-lock-lease-and-reclaim.md](decisions/ZJ-0011-index-write-lock-lease-and-reclaim.md) | How is index-write mutual exclusion held across Rust and TypeScript, released after crashes, and diagnosed without unsafe lock-file reclamation? |
| ADR-0012 | [ZJ-0012-semantic-retrieval-holdout-no-go-and-chunk-downgrade.md](decisions/ZJ-0012-semantic-retrieval-holdout-no-go-and-chunk-downgrade.md) | How does ZCodeGraph handle the 1-3-3 holdout NO-GO verdict — pause effect improvement, keep infrastructure, and restart chunk representation as a downgraded recall-enhancement spike? |
| ADR-0013 | [ZJ-0013-bounded-reranking-and-independent-agent-value-gate.md](decisions/ZJ-0013-bounded-reranking-and-independent-agent-value-gate.md) | After the chunk-fused MRR gate fails, may one bounded reranking experiment proceed under a fresh holdout and an independent Agent-value gate rather than weakening the threshold? |
| ADR-0014 | [ZJ-0014-split-retrieval-gate-into-agent-entry-and-ship.md](decisions/ZJ-0014-split-retrieval-gate-into-agent-entry-and-ship.md) | Should per-corpus Hit@5>=90% keep doubling as both the Agent A/B entry valve and the ship gate, or split into two tiers so the macro-gaining candidate C can reach paired Agent evaluation? (Accepted) |
| ADR-0015 | [ZJ-0015-zra-paired-v1-agent-ab-protocol.md](decisions/ZJ-0015-zra-paired-v1-agent-ab-protocol.md) | 真机 Agent A/B 应采用哪套配对协议测量检索实现的净收益，以及它如何修订 ADR-0013 D5、ADR-0014 D2 与 methods v2 §5？ |

---

## contracts — primary design & benchmark contracts

`doc-kind: contract`. All `primary`. These are the normative constraints the
codebase currently obeys. Test-locked where applicable.

| Authority ID | Entity | Bounded question |
| --- | --- | --- |
| DES-architecture-roadmap | [architecture-roadmap.md](contracts/architecture-roadmap.md) | What is the validated architecture roadmap for CodeGraph? |
| DES-rust-indexing-core-sqlite-contract | [rust-indexing-core-sqlite-contract.md](contracts/rust-indexing-core-sqlite-contract.md) | What is the SQLite contract for the Rust indexing core? |
| DES-finalization-tail-boundary-contract | [finalization-tail-boundary-contract.md](contracts/finalization-tail-boundary-contract.md) | What is the TypeScript finalization tail boundary contract? |
| DES-rust-framework-ownership-matrix-v1 | [rust-framework-ownership-matrix-v1.md](contracts/rust-framework-ownership-matrix-v1.md) | Which language/framework slices are rust-owned vs TypeScript shell? |
| DES-baseline-agent-sufficiency-v1 | [baseline-agent-sufficiency-v1.md](contracts/baseline-agent-sufficiency-v1.md) | What is the Agent Sufficiency baseline (v1)? |
| DES-baseline-indexing-performance-v1 | [baseline-indexing-performance-v1.md](contracts/baseline-indexing-performance-v1.md) | What is the indexing performance baseline (v1)? |
| DES-graph-semantics-guardrail-v1 | [graph-semantics-guardrail-v1.md](contracts/graph-semantics-guardrail-v1.md) | What is the graph-semantics closeout guardrail? |
| DES-health-rubric-v1 | [health-rubric-v1.md](contracts/health-rubric-v1.md) | What is the A-F health rubric (v1)? |
| DES-token-baseline-tasks-v1 | [token-baseline-tasks-v1.md](contracts/token-baseline-tasks-v1.md) | What are the Layer-1 token baseline tasks (v1)? |
| DES-token-baseline-tasks-v2 | [token-baseline-tasks-v2.md](contracts/token-baseline-tasks-v2.md) | What are the Layer-2/3 token baseline tasks (v2)? |
| DES-dead-code-rubric-v1 | [dead-code-rubric-v1.md](contracts/dead-code-rubric-v1.md) | What is the dead-code detection rubric (v1)? |
| DES-schema-evolution-and-mcp-tool-cap-v1 | [schema-evolution-and-mcp-tool-cap-v1.md](contracts/schema-evolution-and-mcp-tool-cap-v1.md) | Schema evolution clauses + MCP tool cap ≤12 (v1)? |
| DES-architecture-regression-baseline-v1 | [architecture-regression-baseline-v1.md](contracts/architecture-regression-baseline-v1.md) | What is the architecture regression baseline (v1)? |
| DES-complexity-rubric-v1 | [complexity-rubric-v1.md](contracts/complexity-rubric-v1.md) | What is the cyclomatic-complexity rubric (v1)? |
| CON-resolver-semantic-residuals-v1 | [resolver-semantic-residuals-v1.md](contracts/resolver-semantic-residuals-v1.md) | Which resolver semantic gaps are deferred / no-go, and what guards bind shipped slices? |
| DES-cli-p0-output-git-range-v1 | [cli-p0-output-and-git-range-v1.md](contracts/cli-p0-output-and-git-range-v1.md) | What output, error, exit-code, and Git-range guarantees must the P0 CLI hardening preserve? |
| DES-cli-p1-embedding-operations-v1 | [cli-p1-embedding-operations-v1.md](contracts/cli-p1-embedding-operations-v1.md) | What exact queue, JSON, concurrency, migration, and interruption guarantees govern embedding status, run, and retry-failed? |
| DES-cli-p1-modularity-explore-v1 | [cli-p1-modularity-and-explore-v1.md](contracts/cli-p1-modularity-and-explore-v1.md) | What module interfaces, dependency directions, resource ownership, and migration slices must the CLI and shared Explore blast-radius extraction preserve? |

---

## methods — methods, playbooks, and how-to guides

`doc-kind: method`. Authority: `primary` or `supporting`.

| Authority | Authority ID | Entity | Bounded question |
| --- | --- | --- | --- |
| supporting | MET-language-verification-guide | [language-verification-guide.md](methods/language-verification-guide.md) | How is language extraction verified? |
| supporting | MET-dynamic-dispatch-coverage-playbook | [dynamic-dispatch-coverage-playbook.md](methods/dynamic-dispatch-coverage-playbook.md) | How is dynamic-dispatch coverage measured and extended? |
| supporting | MET-adaptive-explore-sizing | [adaptive-explore-sizing.md](methods/adaptive-explore-sizing.md) | How is adaptive `zcodegraph_explore` sizing computed? |
| supporting | MET-callback-edge-synthesis | [callback-edge-synthesis.md](methods/callback-edge-synthesis.md) | How are callback/observer edges synthesized? |
| supporting | MET-mixed-ios-and-react-native-bridging | [mixed-ios-and-react-native-bridging.md](methods/mixed-ios-and-react-native-bridging.md) | How does mixed iOS + React Native bridging coverage work? |
| supporting | MET-template-markup-parser | [template-markup-parser.md](methods/template-markup-parser.md) | What is the template parser scope (Razor/Blazor/Thymeleaf)? |
| supporting | MET-architecture-roadmap-validation | [architecture-roadmap-validation.md](methods/architecture-roadmap-validation.md) | How was the architecture roadmap validated? |
| supporting | MET-index-pipeline | [index-pipeline.md](methods/index-pipeline.md) | How does the index pipeline work? |
| supporting | MET-rust-indexing-finalization-boundary | [rust-indexing-finalization-boundary.md](methods/rust-indexing-finalization-boundary.md) | Where is the finalization boundary? |
| primary | MET-ab-evaluation-matrix | [ab-evaluation-matrix.md](methods/ab-evaluation-matrix.md) | How is the CodeGraph A/B evaluation matrix designed, and what is the 0.9.4 baseline? |
| primary | MET-agent-routing | [agent-routing.md](methods/agent-routing.md) | Should agents answer directly with CodeGraph or delegate to a sub-agent? |
| supporting | MET-semantic-retrieval-evaluation-v1 | [semantic-retrieval-evaluation-v1.md](methods/semantic-retrieval-evaluation-v1.md) | How was the original file-entry semantic retrieval candidate measured and rejected under the v1 budgets? Historical protocol; its holdout is now diagnostic for later candidates. |
| supporting | MET-semantic-retrieval-evaluation-v2 | [semantic-retrieval-evaluation-v2.md](methods/semantic-retrieval-evaluation-v2.md) | How does a bounded semantic-reranking candidate earn independent offline and Agent-value evidence without tuning on its acceptance set? |

---

## plans — live execution plans (process material)

`doc-kind: plan`. Authority: `process`. These are CLI-managed roadmaps, not
entities; they are exempt from frontmatter and are governed by the
`zj-roadmap-driven` skill.

The independent semantic-retrieval campaign is in
[`plans/semantic-retrieval-roadmap.json`](plans/semantic-retrieval-roadmap.json),
with its CLI-rendered view at
[`SEMANTIC-RETRIEVAL-ROADMAP.md`](plans/SEMANTIC-RETRIEVAL-ROADMAP.md).
It authorizes offline evaluation and evidence-gated planning only; it does not
change the existing CLI, MCP, or embedding operations contracts.

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
