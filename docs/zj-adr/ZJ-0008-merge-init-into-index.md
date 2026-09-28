# ZJ-0008: Merge `init` into `index` (hard command merge with auto-bootstrap)

## Status

Accepted

## Context

The CLI historically exposed two adjacent lifecycle commands:

- `zcodegraph init [path]` — create `.zcodegraph/` and build the initial index;
- `zcodegraph index [path]` — (re)index a project, requiring a prior `init`.

Two concrete problems resulted:

1. **A bootstrap-path capability gap.** `init` did not accept the quiet flag or
   the Rust tuning options (`--engine`, `--graph-work-profile`,
   `--sqlite-write-mode`, `--profile`, `--profile-out`). A non-interactive
   bootstrap could not select or profile the engine, so CI was forced to run
   `init` followed by `index --force` — indexing the same tree twice on every
   cold run.
2. **Two divergent actions for one idempotent goal.** "Make sure the graph for
   this tree exists and is complete/current" is a single idempotent intent, but
   it was split across a one-shot command (`init`) and a repeatable one
   (`index`), with duplicated orchestration and duplicated guidance.

The merge was scoped to the **commander CLI layer only**. The library SDK
(`CodeGraph.init()`, `CodeGraph.initSync()`, `indexAll()`) keeps an explicit
two-step lifecycle — a programmatic caller wants deterministic control over
when a store is created versus when content is indexed. The installer's
`initializeLocalProject` likewise stays unfolded, since it runs inside the
install-wizard flow and folding it would widen the blast radius beyond a
bounded slice. The not-yet-wired pure command layer (`src/cli/commands.ts`,
architecture-roadmap Candidate 5) is intentionally left untouched; its
`runInit` calls the still-supported SDK `CodeGraph.init()`, not the deleted CLI
command.

## Decision

Hard-merge the two commands:

- **Only `zcodegraph index [path]` remains.** On an uninitialized project it
  bootstraps the store (create `.zcodegraph/` + schema) and then runs the full
  index; on an already-initialized project it performs the normal (re)index.
  `index` is semantically idempotent — ensure the graph is complete and
  current — and bootstrap is simply its implicit first step.
- **`init` is deleted outright — no alias, no deprecation shim, no transition
  period.** Invoking `zcodegraph init` now exits non-zero as an unknown command
  and creates no store. A soft deprecation was explicitly rejected: a shim
  would perpetuate the duplicated action the merge removes.
- **`uninit` is retained.** Destructive commands are not forced into symmetry;
  there is no benefit to folding teardown into anything else.
- **All index flags apply to bootstrap too** (`-f/--force`, `-q/--quiet`,
  `-v/--verbose`, `--engine`, `--graph-work-profile`, `--sqlite-write-mode`,
  `--profile`, `--profile-out`), closing the CI capability gap so a cold run is
  a single `index --engine rust-hybrid --quiet` invocation.
- **Watch fallback after bootstrap:** the git-sync-hooks offer is evaluated
  only after a first-run bootstrap. It runs interactively only when stdin is a
  TTY and `-q` is absent; in non-interactive or quiet mode it emits a single
  stderr hint and never blocks.
- **Diagnostics** record the command name as the free string `'index'`
  (arguments still capture the full `process.argv`); there is no schema change.
- All agent-facing guidance for an uninitialized project now points at
  `zcodegraph index` (MCP `server-instructions`, tools, engine messages,
  worktree warnings, graph-health next-commands). Corrupted-store recovery uses
  `zcodegraph uninit -f && zcodegraph index` (the prior `rm -rf .zcodegraph`
  recipe is removed in favor of the supported teardown command).

## Consequences

- One command covers both first run and rebuild; CI cold-start cost drops from
  two full indexes to one, and quiet/Rust tuning works from the very first run.
- The SDK contract is unchanged, so library consumers and the installer are
  unaffected; only the process-facing CLI surface changes.
- **Breaking change / accepted rollout risk — already-issued agent instructions
  cannot be recalled.** The MCP `initialize` response and per-agent instruction
  blocks are written into third-party MCP client configurations and cached
  long after an upgrade. Agents provisioned before this change may still emit
  `zcodegraph init`, which now fails as an unknown command. This is an accepted
  cost of the hard merge (chosen over a perpetual shim): the error is
  unambiguous, and current `server-instructions` plus every in-product hint
  direct to `zcodegraph index`. The recovery for such an agent is simply to run
  `zcodegraph index`, which succeeds whether or not the project was previously
  initialized.
- Test, script, and documentation surface moved with the command: CLI-process
  tests assert bootstrap-via-`index` and unknown-command behavior for `init`;
  Rust benchmark/smoke/validation harnesses collapse their init+index pairs to
  a single `index --force`; user docs and the packaging smoke gate rename
  their init scenarios to bootstrap.
