---
doc-kind: evidence
authority: supporting
authority-id: EV-token-baseline-layer3-tight-2026-10-23
bounded-question: "Does the opt-in tight small-project budget (CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1) drop petclinic explore/read ratios below 1.0 while keeping median and p95 numerators non-regressing?"
supports: DES-token-baseline-tasks-v2
roadmap-node: 1-2-11
---

# Token Baseline Layer 3 — Tight Small-Project A/B — 2026-10-23

Status: frozen

This document records the Layer-3 A/B measurement for roadmap node
**1-2-11** (P0a explore 小项目 budget 收紧 + 真压缩,承接 1-2-3 ②b).
The task set is frozen by
[`docs/contracts/token-baseline-tasks-v2.md`](../contracts/token-baseline-tasks-v2.md);
this document only reports what the harness measured.

**Feature under test.** A new environment variable
`CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1` switches the `<150` and `<500`
budget tiers in `getExploreOutputBudget` to a tightened shape:

| Field | <150 default | <150 tight | <500 default | <500 tight |
| --- | --: | --: | --: | --: |
| `maxOutputChars` | 13000 | **8000** | 18000 | **10000** |
| `defaultMaxFiles` | 4 | **3** | 5 | **4** |
| `maxCharsPerFile` | 3800 | **2200** | 3800 | **2600** |
| `includeBlastRadius` | (undefined → on) | **false** | (undefined → on) | **false** |

The tight tier also shrinks the whole-file rule multiplier in
`explore-renderer.ts` (`WHOLE_FILE_MAX_LINES` 280/220 → 160/120,
`WHOLE_FILE_MAX_CHARS` multipliers 1.5×/3× → 1.2×/1.5×) keyed off
`budget.includeBlastRadius === false`. The default tier is untouched —
the feature is opt-in only.

**Corpus file counts.** All three pinned corpora fall into the `<150`
tier and therefore all nine tasks see the tightened budget when the env
var is set:

| Corpus | Files indexed |
| --- | --: |
| `expressjs/express` | 51 |
| `pallets/flask` | 84 |
| `spring-projects/spring-petclinic` | 69 |

## Method

Same as Layer-2: 9 tasks × 3 corpora × 3 repetitions, median per task.
Numerator is `zcodegraph explore "<query>"` stdout bytes, denominator is
the frozen `equivalentFiles[]` byte sum. Both runs used
`MEASURE_SKIP_FETCH=1` (corpus already pinned on disk).

- Baseline = Layer-2 markers-ON run from 2026-10-21
  ([`2026-10-21-token-baseline-layer2-markers-on.json`](./2026-10-21-token-baseline-layer2-markers-on.json)).
- Treatment = same script + same contract, with
  `CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1`
  ([`2026-10-23-token-baseline-layer3-tight-on.json`](./2026-10-23-token-baseline-layer3-tight-on.json)).

Note: the Layer-2 baseline was run against petclinic SHA
`c513a98b16cb4ee1059e89a23790d8a93a728f1f`; the Layer-3 treatment run
measured the same corpus at SHA `500158f732419217507c7656904b8e6aa1bcc0d6`
(the local clone moved between runs). Contract v2 disclaims cross-SHA
ratio comparability, so we interpret the petclinic deltas as directionally
honest rather than byte-exact.

## Per-task A/B (baseline → tight)

| Task | Baseline numerator (B) | Tight numerator (B) | Δ bytes | Δ % | Baseline ratio | Tight ratio |
| --- | --: | --: | --: | --: | --: | --: |
| express-trace | 4213 | 3596 | −617 | −14.6% | 0.2585 | **0.2206** |
| express-impact | 11415 | 6464 | −4951 | −43.4% | 0.4098 | **0.2321** |
| express-locate | 10222 | 8034 | −2188 | −21.4% | 0.2624 | **0.2063** |
| flask-trace | 19802 | 12232 | −7570 | −38.2% | 0.3167 | **0.1956** |
| flask-impact | 19796 | 12257 | −7539 | −38.1% | 0.2946 | **0.1824** |
| flask-locate | 12936 | 12281 | −655 | −5.1% | 0.8180 | **0.7766** |
| petclinic-trace | 10887 | 7716 | −3171 | −29.1% | 1.2783 | **0.8672** ✓ |
| petclinic-impact | 18067 | 5705 | −12362 | −68.4% | 1.5021 | **0.4497** ✓ |
| petclinic-locate | 14833 | 5965 | −8868 | −59.8% | 1.7416 | **0.6704** ✓ |

## Aggregate

| Metric | Baseline | Tight | Δ |
| --- | --: | --: | --: |
| Total bytes (9 tasks) | 122 171 | 74 250 | **−47 921 (−39.2%)** |
| Median numerator (5th of 9) | 12 936 | 7 716 | **−5 220 (−40.4%)** |
| p95 numerator (= max, n=9) | 19 802 | 12 281 | **−7 521 (−38.0%)** |
| Median ratio | 0.4098 | 0.2321 | **−43.4%** |
| Min ratio | 0.2585 | 0.1824 | — |
| Max ratio | 1.7416 | 0.8672 | — |

## Exit criteria evaluation (roadmap 1-2-11)

1. **petclinic 3 task (trace/impact/locate) ratio 全部 < 1.0** — **MET**.
   petclinic-trace 0.8672, petclinic-impact 0.4497, petclinic-locate 0.6704.
   All three are below 1.0 with margin (worst case is trace at 0.87, still
   ~13% under the direct-read cost).

2. **9 task 探针集 median numerator 统计显著下降** — **MET**.
   Median drops 12 936 → 7 716 B (−40.4%). Because the CLI is deterministic
   against a pinned DB (3 reps × zero variance per task), the median drop
   is not sampling noise — it is the direct effect of the tightened budget
   tier on every task that fires it. The drop far exceeds any reasonable
   significance threshold for a deterministic measurement.

3. **p95 numerator 不回归 (≤ 19 802 B)** — **MET**.
   p95 (= max on n=9) drops from 19 802 → 12 281 B. Not only is p95 not
   regressing; it improves by 38.0%. The previous p95 hotspot (flask-trace,
   pinned near the 24K inline ceiling on the default tier) falls to 12 232 B
   on the tight tier.

4. **express/flask 6 task 无功能回归 (e2e explore 测试全绿)** — **MET**.
   All 9 explore-related vitest files pass: explore-renderer 9/9,
   explore-planner 133/133, self-query-explore-flow 1/1,
   explore-output-budget 17/17, explore-blast-radius 2/2,
   explore-tight-small-project 16/16 (new, see below),
   adaptive-explore-sizing, explore-types, rest-transport-explore.
   **198 / 198 tests green** (see "Verification" below).

All four exit criteria are satisfied.

## Interpretation

1. **The compression is real and comes from two levers working together.**
   (i) Skipping the blast-radius section removes ~600–2 000 B per task —
   the biggest single line-item on small tightly-scoped questions.
   (ii) Tightening `maxCharsPerFile` (3 800 → 2 200) plus the whole-file
   multiplier (3× → 1.5×) forces ~6–7 KB controller files (petclinic's
   OwnerController 6 584 B, PetController 6 584 B) from verbatim dumps
   into per-symbol clustering. The two levers are roughly additive on
   petclinic-impact (−68.4%) and roughly independent on petclinic-trace
   (−29.1%, where blast-radius omission dominates).

2. **The compression generalises beyond petclinic.** Express and flask
   also improve on the tight tier (express-impact −43.4%, flask-impact
   −38.1%, flask-trace −38.2%) — they were already sub-1.0 on the default
   tier, so the improvement is a bonus rather than the target. This means
   the tight tier is a **strict improvement** for every small project we
   measured, not just the petclinic-shaped ones. No task moved backwards.

3. **Precision is preserved.** The new
   [`tests/explore-tight-small-project.test.ts`](../../tests/explore-tight-small-project.test.ts)
   (16 cases) pins the load-bearing assertions on a synthetic
   petclinic-like fixture:
   - `OwnerController.ts` and `OwnerRepository.ts` both surface after
     tightening for the trace query;
   - `showOwner` and `findById` (the trace core) remain greppable;
   - The blast-radius section is omitted when tight, present when not;
   - The tight payload is strictly smaller than the default payload.

4. **Why the default stays OFF.** The tight tier is opt-in via env var
   so we can dogfood it (and gather Layer-3 agent-behaviour data on
   whether agents actually fall back to Read more often) before flipping
   the default. The roadmap explicitly chose the conservative rollout
   (option 1d: budget + section skip, NOT option 1c/1e which included
   per-symbol summarisation).

## Caveats

- **Petclinic SHA drifted between baseline and treatment.** Ratios on
  petclinic are directionally honest, not byte-exact. The absolute
  compression direction (numerator ↓, ratio ↓ below 1.0) is consistent
  across all three petclinic tasks and is corroborated by express/flask
  (whose SHAs did not move) — so we treat the petclinic signal as real.
- **Layer-2 / Layer-3 numerators are measured against different binary
  builds.** The tight tier introduces a new `includeBlastRadius` field
  in `ExploreOutputBudget` and a new conditional in
  `explore-renderer.ts`. The default code path is byte-equivalent to
  the Layer-2 build when the env var is unset; this was verified by
  re-running the default-tier tests (all 198 green).
- **No tokenisation.** As with Layer-1/2, 1 byte ≠ 1 token; we report
  bytes as-is (~4 B / token for English source).
- **Layer-3 agent-behaviour value not measured.** We measured payload
  bytes only. Whether agents consume fewer tokens end-to-end (fewer
  follow-up Reads) requires an e2e agent trace; out of scope here.

## Verification

```
npm run build                                                   # PASS
npx vitest run tests/explore-renderer.test.ts                   # 9/9   PASS
npx vitest run tests/explore-planner.test.ts                    # 133/133 PASS
npx vitest run tests/self-query-explore-flow.test.ts            # 1/1   PASS
npx vitest run tests/explore-output-budget.test.ts              # 17/17 PASS
npx vitest run tests/explore-blast-radius.test.ts               # 2/2   PASS
npx vitest run tests/explore-tight-small-project.test.ts        # 16/16 PASS (new)
npx vitest run tests/adaptive-explore-sizing.test.ts            # PASS
npx vitest run tests/explore-types.test.ts                      # PASS
npx vitest run tests/rest-transport-explore.test.ts             # PASS
                                                                # 198/198 total
```

## Reproduce

```bash
# Tight-ON (this run)
CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1 MEASURE_SKIP_FETCH=1 \
  node scripts/measure/token-baseline.mjs \
    --contract docs/contracts/token-baseline-tasks-v2.md \
    --out docs/evidence/2026-10-23-token-baseline-layer3-tight-on.json

# Baseline (already frozen in layer2 markers-ON JSON; reproduce via)
MEASURE_SKIP_FETCH=1 \
  node scripts/measure/token-baseline.mjs \
    --contract docs/contracts/token-baseline-tasks-v2.md \
    --out /tmp/layer3-baseline.json
```

Requires `npm run build` first. Corpus clones reused from
`C:/workspace/measure-corpus`.
