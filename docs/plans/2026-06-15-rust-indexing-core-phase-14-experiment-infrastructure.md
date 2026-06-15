# Rust Indexing Core Phase 14 Plan: Experiment Infrastructure

Date: 2026-06-15

Reference PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Purpose

Phase 14 should not jump directly to producing a Rust graph for the VS Code stress target. Phase 13 proved that the A/B harness can preserve asymmetric evidence, but it also exposed that the experiment infrastructure is not complete enough for reliable PRD gate decisions.

Phase 14 therefore focuses on making the Rust indexing experiment capability complete and reproducible:

> Any supported repo / prompt / engine-arm combination should produce bounded, reproducible, comparable, and diagnosable evidence. If copy, preflight, indexing, or comparison fails, the artifact must still explain what happened without forcing the next agent to guess.

## Confirmed decisions

### Scope

- Build complete experiment infrastructure first.
- Do not make Rust default.
- Do not rewrite product CLI behavior by default.
- Product CLI changes are out of scope unless the guardrail cannot obtain necessary facts through existing CLI behavior; such gaps should first be recorded as blockers/follow-up issues.

### Required and stress targets

Required decision targets return to the PRD baseline:

- `zcodegraph`
- `excalidraw`

VS Code remains a stress target / optional extended evidence:

- `vscode`
- `requiredForDecision: false`
- `requiredAfterPrdCompletion: true`

After the required targets produce complete evidence, the PRD completion flow must run at least one VS Code stress validation. The stress run does not block the required-target decision, but it must produce artifact evidence and should create follow-up issues for newly exposed blockers.

### Metrics and gates

Benchmark metrics are part of the core experiment capability.

Required:

- per-stage and per-arm `elapsedMs`
- graph/file count where available
- file throughput when derivable

Best-effort optional:

- `peakRssBytes`

Peak RSS absence does not fail the experiment. It records `null` plus diagnostics.

Performance threshold defaults come from the PRD and can be overridden by manifest:

```json
{
  "metrics": {
    "thresholds": {
      "wallTimeImprovementPct": 25,
      "peakRssReductionPct": 30,
      "maxOtherMetricRegressionPct": 10
    }
  }
}
```

Performance gate passes if either:

- wall time improves by at least 25% and RSS does not regress by more than 10%, or
- peak RSS reduces by at least 30% and wall time does not regress by more than 10%.

If RSS is missing:

- wall time passes -> performance may pass with an RSS diagnostic.
- wall time does not pass -> performance is `unavailable`, not `failed`.

### Independent gates

Agent Sufficiency and performance are separate gates.

Target-level gate shape:

```json
{
  "gates": {
    "sufficiency": {
      "status": "passed | failed | unavailable",
      "regressions": []
    },
    "performance": {
      "status": "passed | failed | unavailable",
      "wallTimeDeltaPct": null,
      "peakRssDeltaPct": null,
      "diagnostics": []
    }
  }
}
```

Experiment-level decision readiness summarizes these gates:

```json
{
  "decisionReadiness": {
    "sufficiencyPassed": false,
    "performancePassed": false,
    "requiredTargetsPassed": false,
    "rolloutReadinessClaimed": false
  }
}
```

`rolloutReadinessClaimed` must default to `false`. The runner may generate a recommendation draft, but it must not automatically claim Rust default rollout readiness.

## Formal manifest

Formal experiments must use a manifest. Existing CLI flags remain for ad hoc probes/debugging.

Command shape:

```bash
node scripts/rust-indexing-experiment.mjs \
  --experiment docs/benchmarks/rust-indexing-core-phase-14.experiment.json \
  --out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14.raw.json \
  --summary-out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14-decision-summary-draft.md
```

### Manifest schema direction

The manifest is a generic experiment schema, but Phase 14 only implements the fields needed for `kind=indexing-ab`.

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-14",
  "kind": "indexing-ab",
  "arms": ["typescript", "rust"],
  "sourceCopy": {
    "mode": "js-ts-config-slice",
    "isolation": "per-arm"
  },
  "targets": [],
  "metrics": {},
  "outputs": {}
}
```

Phase 14 implementation rules:

- `kind` must be exactly `indexing-ab`.
- `arms` must contain exactly `typescript` and `rust`.
- Arm order is ignored and normalized to `typescript`, `rust`.
- Unsupported, missing, or extra arms are manifest validation errors.
- Unknown fields may be preserved but are not interpreted.
- `sourceCopy.mode` must be `js-ts-config-slice`.
- `sourceCopy.isolation` must be `per-arm`.
- Reuse modes remain ad hoc CLI behavior and are not allowed in formal manifest runs.

### Target path resolution

Targets use `pathEnv` / `pathFallback` so committed manifests are not hard-bound to one machine.

```json
{
  "name": "excalidraw",
  "pathEnv": "ZCODEGRAPH_CORPUS_EXCALIDRAW",
  "pathFallback": "C:/workspace/github/corpus/excalidraw"
}
```

Resolution rules:

1. If `pathEnv` exists and the environment variable has a value, use it.
2. Otherwise use `pathFallback`.
3. If neither resolves, target preflight is unavailable with `missing-target-path`.
4. The artifact records:
   - `configuredPathEnv`
   - `configuredPathFallback`
   - `resolvedPath`
   - `pathSource: "env" | "fallback"`

### Target validation

Targets may specify `expectedCommit`, `allowDirty`, and `sparsePatterns`.

Rules:

- `expectedCommit` set and actual HEAD differs -> target unavailable with `target-drift`.
- `allowDirty=false` and working tree dirty -> target unavailable with `target-dirty`.
- `expectedCommit=null` -> record actual commit, but do not gate.
- `sparsePatterns` are metadata only in v1; record them but do not hard-gate.

Example target entries:

```json
{
  "name": "zcodegraph",
  "pathFallback": ".",
  "targetClass": "required",
  "requiredForDecision": true,
  "expectedCommit": null,
  "allowDirty": true,
  "promptIds": ["ZCG-1", "ZCG-2", "ZCG-3"]
}
```

```json
{
  "name": "vscode",
  "pathEnv": "ZCODEGRAPH_CORPUS_VSCODE",
  "pathFallback": "C:/workspace/github/corpus/vscode-sparse",
  "targetClass": "stress",
  "requiredForDecision": false,
  "requiredAfterPrdCompletion": true,
  "expectedCommit": "4ac5322601c6985aba4cd9349c23f4ef22dc3e65",
  "allowDirty": false,
  "sparsePatterns": [".github", "build", "extensions", "scripts", "src", "test"],
  "promptIds": ["VS-1"]
}
```

## Runner design

Add a new formal runner instead of growing the legacy guardrail script:

```text
scripts/rust-indexing-experiment.mjs
```

The existing script remains for legacy/ad hoc behavior:

```text
scripts/rust-sufficiency-guardrail.mjs
```

Implementation strategy:

- The new runner can be self-contained in v1.
- Small duplication is allowed to keep old and new schemas decoupled.
- Only extract stable pure functions when clearly useful.
- Do not force DRY if it tangles Phase 13 compatibility with Phase 14 formal schema.

Likely stable utilities that can be copied first and extracted later:

- command runner
- `tail()`
- base env allowlist
- JS/TS/config source-copy slice
- Explore execution and prompt analysis
- graph stats collection

## Preflight model

Phase 14 uses two preflight layers:

1. experiment preflight
2. target / arm preflight

Experiment preflight checks:

- manifest shape
- output path writeability
- toolchain facts
- global Rust binary discovery

Fatal experiment-level errors abort immediately if no artifact can be produced:

- invalid JSON manifest
- unsupported experiment kind
- duplicate target names
- invalid outputs

Global Rust binary missing does not abort. It materializes into each Rust arm preflight as unavailable.

Target preflight checks:

- path resolution
- target exists
- git commit
- dirty tree
- prompt selection

Arm preflight checks:

- engine-specific readiness
- Rust binary executable/version when engine is Rust

Rules:

- target unavailable -> both arms skipped for that target.
- arm unavailable -> only that arm skipped.
- target/arm/prompt failures do not abort other targets.

## Arm model

Arm failure must distinguish preflight unavailability from execution failure.

```json
{
  "engine": "rust",
  "preflight": {
    "status": "available | unavailable",
    "kind": null,
    "diagnostics": []
  },
  "execution": {
    "status": "pending | running | completed | failed | skipped | timeout",
    "elapsedMs": 0,
    "diagnostics": []
  },
  "indexing": {
    "status": "summary/legacy alias"
  },
  "graphAvailable": false,
  "graphStats": null
}
```

`preflight unavailable` means the arm was not eligible to run.
`execution failed` means the runner attempted indexing and the process failed or timed out.

## Artifact output

Formal output is one total raw artifact and one total decision summary draft.

Target-level details are embedded inside the raw artifact.

Top-level shape:

```json
{
  "schemaVersion": 1,
  "experimentId": "rust-indexing-core-phase-14",
  "kind": "indexing-ab",
  "generatedAt": "...",
  "preflight": {},
  "targets": [],
  "classification": "...",
  "decisionReadiness": {
    "sufficiencyPassed": false,
    "performancePassed": false,
    "requiredTargetsPassed": false,
    "rolloutReadinessClaimed": false
  }
}
```

### Progress and partial artifact

When `--out` is provided, the runner must keep the raw artifact valid after each major transition:

- after experiment preflight
- after each target preflight
- after source copy
- after each arm starts
- after each arm completes/fails/skips
- after comparison starts/completes/fails/skips
- after classification

Partial artifacts must preserve latest known per-arm status, diagnostics, command provenance, and metrics.

## Classification

Use two classification layers:

- `target.classification`
- `experiment.classification`

Do not reuse Phase 13 mixed names such as `success-asymmetric-blocker` in the formal manifest path.

Target-level taxonomy:

```text
target-success-comparison-completed
target-failed-preflight
target-failed-arm-unavailable
target-failed-comparison-regression
target-skipped
```

Experiment-level taxonomy:

```text
success-required-targets-passed
success-required-targets-passed-with-stress-failures
failed-required-target-unavailable
failed-required-arm-unavailable
failed-required-comparison-regression
failed-manifest-invalid
failed-experiment-preflight
```

## Continue-across-targets policy

The runner should maximize evidence.

Rules:

- Manifest/schema-level fatal errors abort.
- Target/arm/prompt-level errors are recorded and other targets continue.
- Final classification summarizes required and stress target outcomes.

Required target unavailable or required arm unavailable should cause experiment-level failure classification, but should not prevent other targets from running.

## Exit codes

Default:

```text
0 = raw artifact + summary draft successfully produced
1 = fatal error prevents artifact/summary
```

Optional CI gate:

```text
--fail-on-required-gate-failure
  2 = experiment completed, but experiment.classification starts with failed-required-
```

By default, a failed gate is represented in the artifact, not process exit status.

## Decision summary draft

The runner must produce a Markdown decision summary draft. It is not the final decision.

The summary draft should include:

- experiment id and manifest path
- target matrix
- preflight summary
- per-target arm availability
- graph stats
- elapsed metrics
- peak RSS metrics or diagnostics
- sufficiency gate status
- performance gate status
- regressions
- target classifications
- experiment classification
- rollout recommendation draft

Default rollout recommendation draft:

```text
Rust default rollout readiness is not claimed by this generated draft.
```

A maintainer must review or modify the draft before any final rollout decision.

## Canonical files to add

```text
scripts/rust-indexing-experiment.mjs
docs/benchmarks/rust-indexing-core-phase-14.experiment.json
docs/benchmarks/rust-indexing-core-phase-14-experiment.md
```

The companion doc should explain:

- env vars
- fallback path semantics
- target classes
- gates
- exit codes
- run commands
- output files
- VS Code stress validation trigger

## Non-goals

- Do not make Rust the default indexer.
- Do not rewrite MCP tools.
- Do not rewrite resolver/synthesizer behavior.
- Do not change product CLI behavior unless proven necessary and separately approved.
- Do not require VS Code stress target to pass for required-target decision readiness.
- Do not allow reuse-indexed mode in formal manifest v1.
- Do not auto-claim rollout readiness.

## Draft issue breakdown

This is a draft only. Do not create these issues until the plan is reviewed.

### 1. Phase 14: add formal experiment manifest parser and validator

Type: AFK

Blocked by: None

What to build:

- Add `scripts/rust-indexing-experiment.mjs` with `--experiment`, `--out`, and `--summary-out` arguments.
- Parse and validate generic manifest schema v1 for `kind=indexing-ab`.
- Validate exact TypeScript/Rust arms, source copy mode/isolation, duplicate target names, target path configuration, and output arguments.

Acceptance criteria:

- Invalid manifest JSON exits with fatal classification and no misleading partial run.
- Unsupported kind, unsupported arms, duplicate target names, and invalid sourceCopy are rejected with clear diagnostics.
- Valid canonical manifest is accepted.
- Focused tests cover success and validation failures.

### 2. Phase 14: implement experiment and target/arm preflight artifact model

Type: AFK

Blocked by: issue 1

What to build:

- Implement experiment preflight and target/arm preflight in the new runner.
- Resolve `pathEnv/pathFallback`.
- Validate commit and dirty-tree rules.
- Propagate global Rust binary readiness into Rust arm preflight.

Acceptance criteria:

- Missing target path records target unavailable and continues other targets.
- Target drift and target dirty are classified at target preflight.
- Missing Rust binary marks Rust arms unavailable without aborting the experiment.
- Artifact records path resolution provenance.

### 3. Phase 14: implement formal per-arm source copy and execution snapshots

Type: AFK

Blocked by: issue 2

What to build:

- Implement formal `js-ts-config-slice` + per-arm isolation only.
- Execute TypeScript and Rust arms independently through the existing CLI path.
- Write valid partial artifacts after each major transition.

Acceptance criteria:

- Reuse-indexed modes are rejected in formal manifest path.
- Per-arm temp workspaces are distinct.
- `.zcodegraph` from source is not copied.
- One arm unavailable/failed does not discard the other arm's evidence.
- Partial artifacts are valid JSON at each snapshot point.

### 4. Phase 14: implement sufficiency and performance gates

Type: AFK

Blocked by: issue 3

What to build:

- Run prompt comparisons only when both arms are graph-available.
- Record sufficiency gate separately from performance gate.
- Compute elapsed deltas, file throughput, and best-effort peak RSS diagnostics.
- Apply default PRD thresholds with manifest override support.

Acceptance criteria:

- Sufficiency and performance gates are independently recorded.
- Required target gate failures affect experiment classification.
- Missing RSS follows the confirmed optional-RSS rules.
- Regressions are listed without overwriting arm evidence.

### 5. Phase 14: implement experiment/target classification and exit-code policy

Type: AFK

Blocked by: issue 4

What to build:

- Add target-level and experiment-level classification.
- Implement continue-across-targets behavior.
- Implement default exit code and optional `--fail-on-required-gate-failure` behavior.

Acceptance criteria:

- Target failures do not abort other targets.
- Required target failures classify the experiment as failed-required-*.
- Stress target failures can classify as success-required-targets-passed-with-stress-failures when required targets pass.
- Default exit code is 0 when raw artifact and summary draft are produced.
- Optional gate-failure flag returns 2 for failed-required-* classifications.

### 6. Phase 14: generate decision summary draft and companion docs

Type: AFK

Blocked by: issue 5

What to build:

- Generate a Markdown decision summary draft from the raw artifact.
- Add canonical manifest and companion documentation.

Acceptance criteria:

- Summary draft includes preflight, target matrix, arm availability, graph stats, metrics, gates, regressions, classifications, and rollout recommendation draft.
- Draft states that Rust default rollout readiness is not automatically claimed.
- Companion doc explains env vars, fallback paths, target classes, gates, exit codes, output files, and VS Code stress validation trigger.

### 7. Phase 14: run required targets and then one VS Code stress validation

Type: HITL

Blocked by: issue 6

What to build:

- Run the canonical formal experiment for ZCodeGraph and Excalidraw.
- If required targets meet the confirmed trigger condition, run at least one VS Code stress validation.
- Review the generated decision summary draft.

Acceptance criteria:

- Required-target raw artifact and summary draft are produced.
- VS Code stress artifact is produced after trigger conditions are met.
- Stress target failures do not block required-target decision readiness.
- New blockers exposed by stress validation are captured as follow-up issues.

## Open implementation notes

- The runner may initially duplicate some helper logic from `rust-sufficiency-guardrail.mjs` to keep schema boundaries clean.
- If helper duplication becomes noisy, extract stable pure utilities only after their boundary is obvious.
- Peak RSS collection should be best effort and should not dominate Phase 14 scope.
