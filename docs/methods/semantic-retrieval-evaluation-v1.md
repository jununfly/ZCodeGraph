---
doc-kind: method
authority: supporting
authority-id: MET-semantic-retrieval-evaluation-v1
bounded-question: "How is semantic file-entry retrieval measured, promoted, or rejected without changing current CLI operations?"
version: v1
date: 2026-11-02
---
# Semantic Retrieval Evaluation and Promotion Method v1

Status: superseded for new candidates by `semantic-retrieval-evaluation-v2.md`
under ADR-0013; retained as the protocol that governed the original file-level
experiment. Current product integration is **NO-GO**. The v1 holdout is a
diagnostic/regression set for later candidates because it informed V3 repair
and route selection; its original frozen labels and split remain unchanged.
Execution status and decisions live in
`docs/plans/semantic-retrieval-roadmap.json`.

## 1. Non-negotiable boundary

- Existing `zcodegraph index`, `query`, `explore`, MCP, and embedding
  `install/status/run/retry-failed` behavior remains unchanged by this project.
- Read-only offline probes may use real indexes and isolated vector copies.
  Production reads require no model download, network, queue drain, reindex,
  schema migration, or embedding worker.
- Vector readiness is not semantic retrieval readiness. No semantic product
  claim is permitted before the gates below pass.
- A separate roadmap decision and `DES-cli-p1-modularity-explore-v1` review are
  required before changing `src/`, the CLI/MCP surface, or resource ownership.

## 2. Current measured baseline

Measured on 2026-11-02 using Node v22.22.2, Windows x64, AMD Ryzen AI 9 HX 370,
fastembed 1.14.5, BGE-small-en-v1.5 ONNX-Q 384d and sqlite-vec. No network was
used. Corpora are Flask commit `05e9c6bd630ecf4ec0ec884b1fc7901663737bc7`
(84 files / 81 vectors) and Express commit
`6d2df035a95f3d1002be3e29997b7a4bfe976b5f` (51 files / 51 vectors).

The 24 AI-authored natural-language questions have reviewed source-definition
anchors. They are an **exploratory probe**, not independent human labels. File
vectors use the first 8000 characters; query `embed` and `queryEmbed` are
separate arms. Every repetition re-encodes the query. Latency below is the
per-corpus p50 across 12 queries x 3 warm repetitions; `Hit@5` is any expected
entry file in the top five.

| Arm | Flask Hit@1 / @5 / @10 | Express Hit@1 / @5 / @10 | Flask / Express warm p50 ms |
| --- | --- | --- | --- |
| Existing Explore | 16.7 / 66.7 / 75.0% | 33.3 / 100 / 100% | 54.9 / 21.9 |
| Symbol FTS (diagnostic) | 8.3 / 50.0 / 91.7% | 33.3 / 91.7 / 91.7% | 8.1 / 3.0 |
| Vector-only `embed` | 0 / 16.7 / 25.0% | 0 / 41.7 / 50.0% | 76.6 / 76.9 |
| Vector-only `queryEmbed` | 0 / 25.0 / 25.0% | 16.7 / 33.3 / 50.0% | 76.7 / 77.9 |
| Fixed RRF Explore + vector, k=60 | 16.7 / 33.3 / 75.0% | 41.7 / 91.7 / 100% | 154.3 / 102.7 |

Across the four small holdout items, pure `embed` and `queryEmbed` both have
Hit@5 = 25%. Fixed RRF has Hit@5 = 25%; existing Explore has 75%. These four
items are diagnostic only and are not sufficient for acceptance. RRF worsens
Flask Hit@5 by 33.4 percentage points and Express by 8.3 points, while adding
query-embedding cost. It must not ship.

Model initialization in this already-downloaded process was 105.6 ms. External
sampling measured 494,972,928 bytes (472.0 MiB) peak worker working set across
the complete probe, not a model-only steady-state allocation. Vector database
sizes are 4,460,544 and 2,314,240 bytes; these include the graph database and
cannot be attributed wholly to vectors. Small-corpus KNN latency must not be
extrapolated to a large repository.

Reproduce with:

```bash
node scripts/measure/semantic-retrieval-probe.mjs \
  --out .tmp/measure/semantic-retrieval-probe-result.json
```

The raw result is deliberately local `.tmp/` output. Its 2026-11-02 run had
SHA-256 `82097b7f86a356d261889d3051e960e8bd273923a4451a3c3c9ddcf2f4a29a95`.
A repeated run may have different timings and timestamp; compare ranked IDs,
protocol, corpus revisions and metrics rather than expecting byte equality.

## 3. Evaluation protocol

### 3.1 Corpora and labels

1. Pin full commit SHA and scope. Include production files; record examples,
   tests and generated files explicitly rather than silently treating them as
   equivalent candidates. Reject any missing expected-file vector or stale
   content hash; the initial Flask coverage of 81/84 is a disclosed probe
   limitation, not an accepted production state.
2. Expand to at least **four languages and four repositories**, including one
   repository with **at least 10,000 indexed files**. Include both the current
   flat-library shape and a larger framework/application shape. Choose the
   additional languages from supported real corpus fixtures before execution.
3. A Human who did not tune the candidate reviews question intent, acceptable
   entry files and source evidence without seeing rankings. Each repository has
   at least 12 accepted questions; the complete release set has at least 60.
   Report per-corpus denominators and exact confidence intervals alongside
   macro averages.
4. Split by repository and question family before candidate tuning. At least
   25% of accepted questions and one entire language/repository are untouched
   holdouts. A failed holdout cannot be reused for tuning; a fresh frozen set
   is required. Hard negatives are review targets, not presumed irrelevant.
5. The runner verifies corpus SHA, expected-file existence, evidence anchors,
   artifact pins, vector coverage and fresh content hashes. Missing coverage
   is a failure, not removal of a difficult query from the denominator.

### 3.2 Human-blind candidate preparation and freeze

The frozen release `docs/baselines/semantic-retrieval-human-frozen-v1.json`
contains 60 accepted labels across five languages and five pinned repositories.
Human reviewer `victo` accepted all 60 candidates on 2026-11-03 without model
rankings and declared independence from tuning; all five corpus approvals are
recorded. Its SHA-256 is
`994fde361d8fb477c38b4720209df1329d45d33ed475ffde2a09eea3a933f8ff`.
The release has 16/60 holdout questions (26.7%), including the complete
eShopOnWeb corpus. Mechanical source checks and the freeze succeeded; this does
not claim additional-corpus vector coverage, achieved recall, or product
integration approval. Verify the immutable release with:

```bash
node scripts/measure/semantic-retrieval-annotation.mjs validate
```

The original candidate package combined the 24 exploratory Flask/Express
questions with 36 new Spring PetClinic, Actix Web and eShopOnWeb questions.
Before the Human review, all 60 passed mechanical commit, file-existence and
definition-anchor checks. Preparation for a future new release uses:

```bash
node scripts/measure/semantic-retrieval-annotation.mjs prepare
```

The generated HTML/JSON review under `.tmp/measure/` contains no rankings or
tuning information. The reviewer inspects the pinned source and records
`accept`, `amend`, or `reject` for every item. Amendments may change the
question, expected files, source evidence, related-file review targets or
split; IDs and corpus membership are fixed. The reviewer must supply identity,
review timestamp, independence-from-tuning confirmation and per-corpus
approval. Validate and, only after genuine complete review, freeze with:

```bash
node scripts/measure/semantic-retrieval-annotation.mjs validate \
  --review .tmp/measure/semantic-retrieval-human-review-v1.json
node scripts/measure/semantic-retrieval-annotation.mjs freeze \
  --review .tmp/measure/semantic-retrieval-human-review-v1.json
```

A freeze requires at least 12 accepted questions per repository, at least 60
overall, at least 25% holdout, and the complete eShopOnWeb repository as an
unseen holdout. The frozen release has 16/60 holdout questions (26.7%). A
rejection cannot silently shrink the denominator; supply and review a
replacement. Candidate/probe SHA-256 binds the review to the exact inputs, and
an existing frozen release cannot be overwritten. A valid or exported review
is not itself a freeze. A freeze also does not establish additional-corpus
index/vector coverage, retrieval effectiveness, resource compliance, or Agent
Sufficiency; those remain separate gates.

### 3.3 Arms and measurements

- Current Explore and current symbol retrieval are mandatory baselines.
- Pure vector, chosen chunk/document representation, and the proposed hybrid
  are separate arms. Never replace the baseline with the candidate after
  tuning begins.
- `Hit@k`: first expected entry file occurs at rank <= k. Expected files form a
  set; do not sum duplicate file hits. Also report MRR and misses.
- Development selection may test file/chunk candidates and deterministic
  fusion. Record every parameter. No arbitrary score calibration, per-corpus
  hidden threshold or per-query special case is allowed.
- Each query has a cold process + model initialization measurement and at
  least 30 repetitions for final warm latency. Report p50/p95/max, separately
  for embedding, KNN, graph narrowing and end-to-end work. No cached query
  vectors in warm measurements.
- Report incremental worker RSS and peak working set, idle RSS after model
  load, SQLite/WAL/model/package bytes, and embedding wall time. Measure
  single-query latency with background indexing/drain both idle and active.
  State CPU, OS, Node and dependency versions; do not compare unlike hosts as
  if controlled.

## 4. Release budgets

These are **initial go/no-go budgets**, derived from the small real probe and
current product direction, not claims of achieved product performance. They
apply to the frozen human-reviewed set, each repository, and the large corpus
where indicated. A failure in any mandatory row blocks integration.

| Dimension | Required budget |
| --- | --- |
| Recall | Every repository Hit@5 >= 90%, Hit@10 >= 95%; macro MRR >= 0.70. |
| Net gain | Candidate Hit@5 >= current Explore + 5 percentage points on the frozen macro set, and no repository regresses by >2 points. If the current arm exceeds 95% on a repository, use non-regression plus Agent Sufficiency as the gain criterion there. |
| Exact-name safety | The frozen exact-symbol control suite has zero Hit@1 regression; semantic retrieval must not displace exact structural matches. |
| Warm interactive latency | End-to-end p50 <= 150 ms, p95 <= 250 ms on the reference host, including query encoding, candidate retrieval and graph narrowing. |
| Cold latency | First query including an already-downloaded model load <= 2,000 ms; no network in steady-state query serving. |
| Large-corpus search | Warm p95 <= 500 ms at >=10,000 indexed files; no full-corpus source read or reindex in the query path. |
| Memory | Incremental steady-state RSS <= 512 MiB; peak additional working set <= 768 MiB on the reference host. |
| Storage | Model plus optional runtime package <= 250 MiB; per-file vector overhead <= 2 KiB at 384d before a separately approved chunk index. Database accounting includes WAL/SHM. |
| Indexing | Existing embedding design target: indexing overhead <=2x wall time and <=2x final storage. Background drain must not make the default CLI unavailable; retrieval never blocks on queue completion. |
| Degradation | Unavailable/stale/mismatched vectors, disabled opt-in, model load failure or budget timeout fall back to unchanged structural retrieval with explicit health metadata, never an unannotated worse ranking. |

The peak measured in the exploratory run is below the memory ceiling but says
nothing about large-repository latency or recall. Meeting a resource budget
cannot compensate for a recall failure.

## 5. Integration and Agent Sufficiency gate

1. Only after all offline gates pass, prototype a read-only candidate provider
   that supplies file candidates to existing graph narrowing. Keep model
   loading lazy and outside default indexing/status; no new MCP tool is
   presumed necessary.
2. Prove deterministic ordering, exact-name precedence, corpus/file filters,
   snapshot freshness, bounded candidates and no raw-source query-time scan.
   Missing model and stale vector tests exercise the unchanged fallback.
3. Run the registered Agent Sufficiency baseline on paired current/hybrid runs
   with the same tasks. Record task success, correct-entry evidence,
   Read/Grep fallback displacement, tool calls, tokens and latency. Require no
   correctness regression and a statistically/reportably meaningful reduction
   in fallback work or time; inconclusive results do not promote.
4. A maintainer approves a separate opt-in integration decision. Default OFF;
   readiness and health distinguish `disabled`, `not-ready`, `stale`, and
   `degraded`. Rollback is configuration-only and requires no reindex.
5. Register any normative interface change under `docs/contracts/`, update the
   evaluation method, and preserve existing CLI P0/P1 output and resource
   contracts.

## 6. Rejection and closeout

If development candidates cannot beat the current arm, if a frozen gate fails,
or if latency/memory require harming default CLI behavior, stop integration.
Keep only reproducible offline evidence and the negative decision. Do not
weaken denominators, move holdouts into development, hide per-repository
regressions or equate embedding health with semantic value. Reconsider only
with a new representation/model hypothesis and a fresh holdout.
