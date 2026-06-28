# Rust-Hybrid Cross-Platform CI Smoke Plan

## Purpose

Add a small, cross-platform CI smoke for the migrated `rust-hybrid` indexing path so future Rust-owned indexing migration slices do not silently break on Linux, macOS, or Windows.

This is the forty-eighth cut for roadmap node `1-6-5. Add cross-platform CI smoke for migrated Rust indexing path`.

## Decisions

### Scope

Cover only the minimal `rust-hybrid` migrated indexing happy path:

- build the TypeScript CLI and Rust core through the existing CI job;
- generate a tiny temporary TypeScript fixture inside the smoke;
- run `init`, `index --engine rust-hybrid`, `status --json`, and `doctor --engine rust-hybrid --bundle --last-run`;
- verify the path reports `rust-hybrid` indexing evidence and a usable diagnostic bundle.

Do not turn this smoke into full graph parity, semantic parity, release qualification, or Agent Sufficiency evaluation.

### Workflow Placement

Attach the smoke to the existing `.github/workflows/ci.yml` cross-platform `rust-packaged-path` matrix job.

This keeps the guardrail visible in normal PR/branch CI and avoids discovering migrated-path breakage only during release.

### Fixture

Generate a temporary fixture at runtime. The fixture should be tiny, deterministic, and repository-local to the CI process. It must not depend on external Git checkouts, `/private/tmp/codegraph-corpus`, or indexing the full ZCodeGraph repository.

### Pass/Fail Standard

The smoke passes only when:

- all CLI commands exit `0`;
- `status --json` proves the indexed project used `rust-hybrid`;
- the indexed project has non-zero file/node evidence;
- `doctor --engine rust-hybrid --bundle --last-run` exists, exits `0`, and creates/reports a diagnostic bundle.

`doctor` may report a defined degraded state in its bundle contents if the degradation is classified. Unknown crashes, missing commands, missing `--last-run`, missing bundle output, or status output that does not prove `rust-hybrid` are failures.

### Implementation Shape

Add a small Node script:

- `scripts/rust-hybrid-ci-smoke.mjs`

The CI workflow should call the script directly after build/Rust checks. The script owns fixture creation, CLI invocation, status JSON parsing, doctor invocation, and failure messages. This avoids fragile cross-platform shell logic in workflow YAML and gives maintainers a local reproduction command.

## Issue Split

### Issue 1: Add Cross-Platform Rust-Hybrid CI Smoke

Goal: implement the smoke as one vertical slice from script to workflow to tests.

Acceptance criteria:

- Add a local script that creates a tiny fixture and verifies the `rust-hybrid` `init`/`index`/`status`/`doctor --last-run` path.
- Add contract coverage that proves the CI workflow runs the smoke on the existing Linux/macOS/Windows matrix.
- Keep the smoke focused on path health, not graph parity or release packaging.
- Update roadmap closeout and changelog wording without claiming full migration coverage.

Blocked by: none.

## Guardrails

- Do not use external repositories or machine-local corpus paths.
- Do not add a new workflow unless the existing matrix cannot carry the smoke.
- Do not require perfect health when a platform reports a classified degraded diagnostic.
- Do not broaden into dynamic-dispatch, framework semantics, or DB maintenance migration.
- Do not replace existing unit/integration tests with this smoke; it is a CI path-health guardrail only.

## Closeout

Issue:

- #662 Add cross-platform rust-hybrid CI smoke.

Implemented behavior:

- Added `scripts/rust-hybrid-ci-smoke.mjs` as the local reproduction entry point.
- The script creates a tiny temporary TypeScript fixture and runs the built CLI through `init`, `index --engine rust-hybrid`, `status --json`, and `doctor --engine rust-hybrid --bundle --last-run`.
- The script fails if commands crash, if `status --json` does not prove `rust-hybrid`, if indexed file/node evidence is zero, or if doctor does not report/create a last-run diagnostic bundle.
- The existing cross-platform `rust-packaged-path` CI matrix now calls the smoke after TypeScript/Rust builds.

Guardrails preserved:

- The smoke does not use external repositories, `/private/tmp/codegraph-corpus`, or the full ZCodeGraph repository as its fixture.
- The smoke does not assert semantic parity, graph parity, release package layout, dynamic-dispatch behavior, or full Rust indexing migration completeness.
- Workflow YAML stays thin; cross-platform path handling lives in the Node script.
