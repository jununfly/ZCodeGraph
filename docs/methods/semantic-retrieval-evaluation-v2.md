---
doc-kind: method
authority: supporting
authority-id: MET-semantic-retrieval-evaluation-v2
bounded-question: "How does a bounded semantic-reranking candidate earn independent offline and Agent-value evidence without tuning on its acceptance set?"
version: v2
date: 2026-11-03
---
# Semantic Retrieval Evaluation and Agent-Value Promotion Method v2

Status: active for the bounded reranking campaign authorized by ADR-0013.
Current product integration remains **NO-GO**. This method does not authorize
changing `src/`, the schema, CLI/MCP, or default Explore behavior.

## 1. Scope and non-negotiable boundaries

- Existing indexing, query/Explore, MCP, and embedding operations remain
  unchanged during offline selection and acceptance.
- The only optimization hypothesis is deterministic, structure-aware file
  reranking. Function/method chunks, top-8 chunk retrieval, at most five
  injected symbols, and F1 candidate seeding are fixed.
- Besides the current algorithm, at most three candidate rerankers are
  registered before development selection. All parameters are frozen before
  the new holdout is evaluated. No new model, learned ranker, per-query rule,
  or hidden per-corpus threshold is allowed.
- Current Explore remains the comparison arm. Candidate results never replace
  the baseline after tuning starts.
- An offline GO permits a separately approved, read-only, opt-in prototype. It
  does not itself permit product integration. Default OFF, configuration-only
  rollback, and the CLI/MCP ownership review remain mandatory.

## 2. Diagnostic and acceptance data are different assets

The 16 questions in `semantic-retrieval-human-frozen-v1.json` formerly assigned
to holdout have informed V3 repair, complete-gate evaluation, and subsequent
route decisions. They are now a **diagnostic/regression set**, not an
independent acceptance holdout. Preserve their results and their original
immutable labels; do not rewrite history by changing their original split.

A new release must use a new versioned candidate/review/frozen path. It must
not overwrite v1 or be produced by editing a previously frozen artifact. Before
execution, make the annotation tooling accept an explicit release version and
validate the following:

1. At least four languages and four repositories, each pinned to a full commit
   SHA; at least one repository has at least 10,000 indexed files. Disclose
   production, example, test, and generated-file scopes.
2. At least 12 accepted questions per repository and 60 overall. At least 25%
   are holdout, including one entire held-out language/repository.
3. A Human independent of candidate tuning reviews intent, acceptable entry
   files, evidence anchors, and related-file/hard-negative targets without
   seeing rankings. Rejections require replacements; they do not shrink the
   denominator.
4. The freeze binds reviewer identity, review time, independence declaration,
   per-corpus approval, candidate/probe hashes, and the exact release. Record
   every candidate and parameter before any acceptance ranking is inspected.
5. Verify repository SHA, expected-file and hard-negative existence, evidence
   anchors, vector coverage, and fresh content hashes. Missing expected-file
   coverage is failure, not exclusion from the denominator.

A holdout used to select, repair, or reprioritize a candidate becomes
diagnostic. A later candidate requires a fresh frozen holdout. Re-running an
unchanged candidate for operational diagnosis does not create a new efficacy
claim.

## 3. Offline arms, metrics, and aggregation

Run current Explore and the frozen fused/reranked candidate on the same pinned
indexes and queries. Keep pure vector or other representations only as
diagnostic arms; they are not required for the bounded reranking decision.

- `Hit@k`: the first acceptable entry file occurs at rank at most k. Multiple
  expected files form a set; duplicate file hits are not summed.
- `MRR`: mean reciprocal rank of the first acceptable entry file; a miss
  contributes zero. Also report Hit@1, Hit@5, Hit@10, misses, and per-query
  paired rank changes.
- **Corpus-macro** is the unweighted mean of the per-repository metric values
  and is the primary aggregation. **Question-micro** pools all questions and
  is reported alongside it. Do not label pooled micro averages as macro.
- Publish each corpus denominator and exact binomial confidence intervals for
  Hit@k. Use paired intervals for MRR/rank deltas; small samples are disclosed
  as such and are not converted into claims of proven non-inferiority.
- Every repository's relative delta against current Explore is mandatory,
  including changes that remain above an absolute Hit@k threshold. A gate
  checker must implement these rows rather than merely list them in a report.

Record query encoding, candidate retrieval, graph narrowing/reranking, and
end-to-end latency separately. Final warm latency uses at least 30 repetitions
without cached query vectors; report p50/p95/max. Cold measurements include a
fresh process and already-downloaded model initialization. Report OS, CPU,
Node and model/dependency versions. Do not compare unlike hosts as controlled
experiments.

## 4. Predeclared offline promotion gate

All rows below are required before Agent A/B evaluation. The MRR>=0.70 absolute
budget from v1 is not reused for this recall-enhancement slice; MRR is instead
a non-regression metric. This is a target-relative decision under ADR-0013,
not retroactive calibration to the observed 0.5490 result.

| Dimension | Required evidence |
| --- | --- |
| Net entry gain | Corpus-macro Hit@5 >= current Explore + 5 percentage points on the new holdout. |
| Ordering safety | Corpus-macro MRR and Hit@10 do not regress versus current Explore; question-micro and paired per-query deltas are disclosed. |
| Per-corpus recall | Every repository Hit@5>=90% and Hit@10>=95%. No repository's Hit@5 or Hit@10 regresses by more than 2 percentage points versus current Explore. Where current Explore exceeds 95%, use non-regression plus Agent Sufficiency rather than demanding further saturated-metric growth. |
| Exact-name safety | The frozen exact-symbol control suite has zero Hit@1 regression; semantic candidates never displace exact structural matches. |
| Warm latency | End-to-end p50<=150ms and p95<=250ms on the declared reference host. |
| Cold latency | First query with an already-downloaded model load <=2,000ms; no steady-state network dependency. |
| Large corpus | Warm p95<=500ms on a repository with at least 10,000 indexed files; no full-corpus source read or reindex in the query path. Results from eShopOnWeb alone do not satisfy this row. |
| Memory | Incremental steady-state RSS<=512MiB and peak additional working set<=768MiB on the reference host. |
| Storage and indexing | Model plus optional runtime package<=250MiB; per-file vector overhead<=2KiB at 384d before separately approved chunk storage. Indexing overhead<=2x wall time and<=2x final storage. Account for DB/WAL/SHM and chunk index bytes. |
| Operational degradation | Disabled, missing, stale, or mismatched vectors, model failure, and budget timeout fall back to unchanged structural retrieval with explicit health metadata. Verify deterministic order, filters, freshness, bounded candidates, and no raw-source query-time scan. |

Point-estimate gate passage is not proof of population-level non-inferiority.
Report the intervals and denominators, and do not erase a failed row by changing
the aggregation after seeing results. Resource compliance cannot compensate for
a recall, exact-name, or correctness failure.

## 5. Paired Agent Sufficiency gate

An offline GO is followed by a separately approved read-only opt-in prototype.
Compare current Explore against the candidate using identical tasks, model,
tool surface, prompts, budgets, and indexes; the retrieval implementation is
the only intended independent variable. The task set must exercise natural-
language code understanding and correct-entry evidence, not merely repeat the
offline file-location score.

1. Freeze the task set, repetitions, pairing key, minimum detectable benefit,
   and analysis before execution. Reuse the registered Agent Sufficiency
   tasks where their intent matches; disclose any new tasks.
2. Pair by task×repetition. Interleave arm order and retain or exclude the
   complete pair using predeclared rules. Preserve failures, timeouts, and
   inconclusive runs; never silently drop one arm or only successful runs.
3. The primary endpoint is the paired reduction in **recovery Read/Grep
   fallback**. Legitimate deepening, edit preparation, and verification reads
   are not fallback. Audit the reason for reads and the answer's correct-entry
   evidence; raw Read/Grep counts alone are insufficient.
4. Answer correctness must not regress. Exact-name safety remains a separate
   zero-regression gate. Tool calls, tokens, and wall time are secondary
   explanatory endpoints, not alternative primary wins.
5. Report every pair and the candidate-minus-baseline fallback delta. Use a
   predeclared paired bootstrap interval that preserves within-task pairing;
   report its confidence level and resampling unit. For a reduction, the
   interval must exclude zero in the beneficial direction. Crossing zero is
   inconclusive and does not promote.
6. Do not append runs until a desired significance result appears. Inconclusive,
   correctness regression, or absent predeclared net benefit closes this
   campaign's productization path.

The existing `scripts/agent-eval/` runners are implementation references, not
proof that this protocol has been satisfied. In particular, they require
pair-preserving execution, read-reason audit, and pair-level analysis before
use for this gate.

## 6. Integration and closeout

Only after both offline and Agent-value gates pass may a maintainer consider
an opt-in integration. Register normative interface changes under
`docs/contracts/`, review `DES-cli-p1-modularity-explore-v1`, and preserve
existing CLI P0/P1 behavior. Default OFF, explicit readiness/health states,
and configuration-only rollback without reindex are required.

Any failed mandatory gate stops this bounded campaign. Keep the frozen
candidate, negative result, reproducible evidence, and optional embedding
infrastructure; do not continue tuning under a new label. Closing this campaign
does not prohibit a genuinely different representation/model hypothesis, which
must have its own decision and fresh independent holdout.
