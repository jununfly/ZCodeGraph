# Issue #668 Next-Version Closeout

Date: 2026-06-30

Branch: `codex/issue-668-dogfood-dev-channel`

Related feedback: #668

## Status

Completed.

This closeout consolidates the completed roadmap and process notes for the
Issue #668 next-version work. The live roadmap JSON/Markdown pair is no longer
kept as a process artifact because every node is complete and the durable
decisions are captured here.

## Product Theme

The next-version theme is **Recovery and Explainability**.

Issue #668 exposed a trust break in the first-run and maintainer dogfood
experience: a user could end up with a broken command, ambiguous degraded
fallback state, or a diagnostic bundle path that did not immediately explain
what happened. The fix was not to add more language or framework coverage. The
fix was to make recovery paths explicit, degraded health understandable, and
diagnostic output useful for both humans and scripts.

## Completed Roadmap

The completed roadmap had 19 nodes:

- completed: 19
- pending: 0
- in progress: 0
- blocked: 0
- decisions recorded: 24

Top-level roadmap:

```text
[x] 1. Issue #668 next-version product roadmap
├── [x] 1-1. Dogfood and release channel isolation
├── [x] 1-2. Stable non-interactive command output
├── [x] 1-3. Doctor bundle compact diagnostic summary
└── [x] 1-4. Degraded fallback health first-screen explanation
```

## Durable Decisions

### 1. Keep `zcodegraph` as the release channel

The global `zcodegraph` command belongs to the release or installed channel.
Maintainer dogfood must not overwrite it.

Decision:

- `zcodegraph` means release/installed channel.
- `zcodegraph-dev` means explicit source-checkout dogfood channel.
- Development workflows may create `zcodegraph-dev`, but must never bind the
  development checkout to the global `zcodegraph` command.

Why:

- Maintainers use one machine both to develop ZCodeGraph and to use the
  released package in other projects.
- A single mutable global `zcodegraph` command can leak the development checkout
  into unrelated projects.
- If the checkout moves or is deleted, a stale global development shim can break
  the user's main command.

Implemented by:

- `scripts/dev-link.sh` installs `zcodegraph-dev` only.
- The default install location is `~/.local/bin`, with `--bin-dir <dir>` for
  CI, temporary verification, or non-standard PATH setups.
- The default `zcodegraph-dev` shim builds before execution.
- `--no-build` supports benchmark/evaluation loops that prebuild manually.

### 2. Convert legacy local install into a migration entry

`scripts/local-install.sh` no longer preserves its historical meaning of
linking the development checkout onto `zcodegraph`.

Decision:

- It is now a migration wrapper for the explicit dogfood channel.
- It installs/removes `zcodegraph-dev`.
- It does not run `npm link`.
- It does not mutate the `zcodegraph` command.

Why:

The old behavior made it too easy to keep reintroducing the same release/dev
channel collision that caused the user experience problem.

### 3. Repair legacy development shims only when explicit and proven

Legacy development `zcodegraph` shims are detected, but not removed by default.

Decision:

- Default behavior prints precise repair commands.
- `--repair-zcodegraph` is required for cleanup.
- Cleanup is allowed only when the script can prove the old `zcodegraph` shim
  points at the current checkout.
- Ambiguous commands, release installs, or user-owned commands are left alone.

Why:

Repair should fix the maintainer dogfood accident without damaging a real
release install or a user-custom command.

### 4. Repository automation must use the explicit dogfood channel

Repository automation that needs the source checkout now uses `zcodegraph-dev`
or an explicit development binary path instead of relying on a globally linked
development `zcodegraph`.

Implemented by:

- `scripts/agent-eval/audit.sh`
- `scripts/add-lang/bench.sh`

### 5. Explain degraded fallback health on the first screen

`rust-hybrid` degraded fallback state is now summarized in a reusable contract
and shown in the successful `init`/`index` path.

Decision:

- Degraded fallback health is not just a label.
- First-screen output should explain whether the graph is usable, why fallback
  happened, and how to collect deeper diagnostics.
- The summary must not include source paths or source slices.

Implemented fields:

- fallback state
- fallback file count
- missing fallback count and language map when present
- fallback reason taxonomy
- top fallback reasons
- graph usability wording

### 6. Doctor bundles print a compact local summary

`zcodegraph doctor --engine rust-hybrid --bundle --last-run` and
`--last-failure` now print a compact summary after creating the bundle.

Decision:

- The bundle schema already contains the needed status, graph stats, and
  per-file taxonomy.
- The CLI should read the generated bundle and summarize it locally.
- This does not require a schema migration.

The summary includes:

- engine and bundle source
- graph stats when available
- fallback health
- top fallback taxonomy reasons

### 7. Provide a stable non-interactive doctor output

`zcodegraph doctor --bundle --json` is the tracer bullet for stable
non-interactive output.

Decision:

- Add `--json` only to `doctor --bundle` in this slice.
- Preserve default human output.
- JSON stdout must be directly parseable with no chalk/prose prefix.

The JSON object includes:

- `bundlePath`
- `summary.engine`
- `summary.source`
- `summary.lines`
- `summary.graph`
- `summary.fallback`

## Implementation Commits

```text
93aac7e9 Add explicit zcodegraph-dev dogfood channel
9358f477 Migrate automation to zcodegraph-dev channel
149c7eee Add rust-hybrid fallback summary contract
b92737a9 Explain rust-hybrid degraded fallback health
3c06ad5b Add fallback health regression coverage
2ac450f7 Print compact doctor bundle summary
8be53b8d Add JSON output for doctor bundles
```

## Validation

Representative validation run across the roadmap:

```text
bash -n scripts/dev-link.sh
bash -n scripts/local-install.sh
bash -n scripts/agent-eval/audit.sh
bash -n scripts/add-lang/bench.sh
npx vitest run __tests__/dev-link.test.ts
npx vitest run __tests__/rust-hybrid-fallback-summary.test.ts
npx vitest run __tests__/rust-index-engine-cli-fallback.test.ts
npx vitest run __tests__/rust-hybrid-doctor.test.ts __tests__/rust-hybrid-fallback-summary.test.ts
npm run build
git diff --check
```

## Deleted Process Artifacts

The following live roadmap/process artifacts were consolidated into this
closeout and removed:

- `docs/plans/2026-06-29-issue-668-next-version-roadmap.json`
- `docs/plans/2026-06-29-issue-668-next-version-roadmap.md`

## Residual

No open roadmap nodes remain for this recovery/explainability patch.

Potential future work, if more CLI commands need automation-grade output, is to
generalize the `doctor --bundle --json` tracer bullet into a broader command
output pattern. That was intentionally not done in this roadmap because it would
cross-cut the CLI surface.
