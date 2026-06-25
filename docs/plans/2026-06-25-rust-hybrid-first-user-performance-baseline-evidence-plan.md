# Rust-Hybrid First-User Performance Baseline Evidence Plan

Date: 2026-06-25

Roadmap node: `1-8-1. Fact base and targeted baseline evidence`

## Goal

Establish current first-user `rust-hybrid` performance facts before selecting an
optimization candidate. This plan extends the completed ownership roadmap rather
than creating a separate performance map, so candidate work stays tied to the
same ownership, guardrail, and research/no-go context.

This plan does not implement performance optimizations and does not choose the
final optimization candidate. It produces candidate routing input for `1-8-2`.

## Standards

Use these existing contracts:

- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/graph-semantics-guardrail-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

## Scope

Run a targeted baseline:

- `current-repo`: run 3 times and report median plus variance;
- `vscode-sparse`: run once if `/private/tmp/codegraph-corpus/vscode-sparse`
  exists and is a Git checkout;
- `excalidraw`: run once if `/private/tmp/codegraph-corpus/excalidraw` exists
  and is a Git checkout.

Missing real repos must be recorded as `needs-human-setup`. Agents must not
clone missing corpora during this plan.

Every result must record RSS or an unavailable reason, profile bucket summary,
graphStats, fallback taxonomy, command invocation, runtime identity, and
ZCodeGraph commit.

## Non-Goals

- Do not change indexing production code, resolver behavior, DB write paths, or
  extraction semantics.
- Do not select the final bounded optimization candidate.
- Do not run a full Agent Sufficiency campaign unless the baseline evidence
  unexpectedly changes graph semantics or user-facing sufficiency claims.
- Do not clone missing real repos.

## Issue Breakdown

### 1. Baseline evidence runner contract

Verify or extend the baseline runner, tests, and docs so targeted baseline
artifacts expose all fields required by `baseline-indexing-performance-v1`.
This issue may update benchmark scripts, deterministic tests, and documentation.
It should not alter the indexing production path being measured.

Acceptance:

- runner output includes RSS or unavailable reason;
- runner output includes profile artifact paths and profile bucket summary;
- runner output includes graphStats and fallback taxonomy when available;
- runner output records `needs-human-setup` for missing real repos;
- deterministic tests cover the artifact contract.

### 2. Targeted baseline execution

Run the targeted baseline for current repo and any available real repos. Use the
runner contract from issue 1. Do not clone missing corpora.

Acceptance:

- current repo has 3 runs with median and variance;
- available `vscode-sparse` and `excalidraw` repos each have one run;
- unavailable real repos are recorded as `needs-human-setup`;
- each run records RSS or unavailable reason, profile buckets, graphStats, and
  fallback taxonomy;
- raw process evidence stays with the issue unless promoted to durable
  result/decision artifacts.

### 3. Baseline closeout and candidate routing input

Write a durable baseline result/decision artifact in `docs/benchmarks/`. The
artifact should summarize the measured state and provide candidate routing input
for `1-8-2`, without selecting the final optimization candidate.

Acceptance:

- closeout records baseline id, commit, corpus identity, commands, wall time,
  RSS or unavailable reason, profile buckets, graphStats, fallback taxonomy, and
  result classification;
- closeout reports phase bucket ranking and suspicious bottlenecks;
- closeout provides a recommended candidate shortlist for `1-8-2`;
- closeout explicitly states that final candidate selection is deferred to
  `1-8-2`;
- roadmap node `1-8-1` is updated with the closeout result.
