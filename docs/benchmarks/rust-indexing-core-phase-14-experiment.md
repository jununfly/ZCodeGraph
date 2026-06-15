# Rust Indexing Core Phase 14 Experiment

This document describes the formal Phase 14 Rust indexing A/B experiment manifest and runner.

## Command

```bash
node scripts/rust-indexing-experiment.mjs \
  --experiment docs/benchmarks/rust-indexing-core-phase-14.experiment.json \
  --out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14.raw.json \
  --summary-out docs/benchmarks/YYYY-MM-DD-rust-indexing-core-phase-14-decision-summary-draft.md
```

Use `--fail-on-required-gate-failure` in CI when failed required-target gates should return exit code `2`.

## Environment variables

- `ZCODEGRAPH_CORPUS_EXCALIDRAW`: optional override for the Excalidraw target path.
- `ZCODEGRAPH_CORPUS_VSCODE`: optional override for the VS Code stress target path.
- `ZCODEGRAPH_RUST_CORE_BINARY`: optional Rust core binary path for the Rust arm.

`pathEnv` wins over `pathFallback` when the environment variable is set.

## Target classes

- `required`: participates in required decision readiness.
- `stress`: optional extended evidence; failures do not block required-target decision readiness.

Phase 14 required targets are `zcodegraph` and `excalidraw`. `vscode` is a stress target and should be run after PRD completion trigger conditions are met.

## Gates

Sufficiency and performance are independent gates.

- Sufficiency runs only when both arms are graph-available.
- Performance compares elapsed time and best-effort peak RSS.
- Missing peak RSS records diagnostics and does not automatically fail the experiment.

Default thresholds:

- wall-time improvement: 25%
- peak RSS reduction: 30%
- max other metric regression: 10%

## Exit codes

- `0`: raw artifact and summary draft were produced.
- `1`: fatal error prevented trustworthy artifact/summary production.
- `2`: only with `--fail-on-required-gate-failure`, when completed experiment classification starts with `failed-required-`.

## Output files

The runner writes:

- one raw JSON artifact containing embedded target details
- one Markdown decision summary draft

The generated summary is not a final rollout decision. Rust default rollout readiness is not automatically claimed.

## VS Code stress validation trigger

After required targets produce complete evidence, run at least one VS Code stress validation. Stress failures should create follow-up issues but must not block required-target decision readiness.
