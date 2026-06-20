# Rust-Hybrid Import Fallback Profile Samples

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior relative import target taxonomy plan:
  `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`
- Prior no-go closeout:
  `docs/benchmarks/2026-06-21-relative-import-target-burndown-closeout-decision.md`

## Context

The relative import target taxonomy slice proved that the final SQLite database
is the wrong place to sample Rust-owned import target misses. The Rust core
profile reports the gap:

- current repo `importPathAliasFallbackBySource.relative`: 9
- VS Code sparse `importPathAliasFallbackBySource.relative`: 64,191

But after TypeScript finalization cleanup, `unresolved_refs` is empty. The
taxonomy script can classify final DB rows, but there are no rows left to
classify. The next useful step is to capture privacy-safe fallback samples at
the Rust core/profile boundary before cleanup.

## Goal

Add a bounded diagnostic profile artifact that samples Rust import target
fallbacks before TypeScript finalization cleanup, then extend the taxonomy
script to classify those profile samples.

This is an evidence-quality slice. It should enable the next implementation
decision: choose one bounded relative import target burndown category, or record
a defensible no-go.

## Non-Goals

- Do not change resolver semantics.
- Do not add or remove graph edges.
- Do not change SQLite schema.
- Do not add diagnostics to `status`, `doctor`, README, or public API.
- Do not add source slices, AST text, or code bodies to artifacts.
- Do not implement query/hash stripping, path normalization, package exports,
  bundler loader semantics, asset import graph edges, dynamic/template import
  resolution, or symbol disambiguation.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock or RSS improvement.

## Artifact Contract

Add diagnostic fields under `rustCore` in the profile artifact. These fields are
internal benchmark diagnostics and do not promise long-term public API
stability.

Required shape:

```json
{
  "rustCore": {
    "importPathAliasFallbackSampleCounts": {
      "relative/target-not-found": 64191
    },
    "importPathAliasFallbackSamples": [
      {
        "sourceKind": "relative",
        "reason": "target-not-found",
        "referenceName": "../foo",
        "filePath": "src/bar.ts",
        "language": "typescript",
        "line": 12,
        "col": 8
      }
    ],
    "importPathAliasFallbackSampleCap": {
      "perBucket": 100,
      "total": 2000,
      "truncated": true
    }
  }
}
```

Allowed sample fields:

- `sourceKind`
- `reason`
- `referenceName`
- `filePath`
- `language`
- `line`
- `col`

Forbidden sample fields:

- source content;
- source line slice;
- AST text;
- candidate code body.

## Reason Taxonomy

The first version should classify resolver-stage reasons without doing deep
filesystem probing or reading source files.

Required reasons:

- `target-not-found`
- `file-node-not-found`
- `binding-level-symbol-disambiguation`
- `unsupported-import-form`
- `tsconfig-path-target-not-found`
- `conventional-alias-target-not-found`
- `workspace-package-target-not-found`

For relative import target fallback, the important split is:

- `target-not-found`: the resolver could not map the specifier to a file path;
- `file-node-not-found`: the resolver found a file path, but no file node exists
  in the graph.

That split tells the next slice whether the problem is likely path/extension
resolution or extraction/write/index inclusion.

## Sampling Caps

Sampling must preserve trend evidence while keeping large corpus artifacts
bounded.

Required caps:

- maximum 100 samples per `(sourceKind, reason)` bucket;
- maximum 2,000 samples total;
- full counts by `(sourceKind, reason)` must still be emitted;
- cap metadata must state whether samples were truncated.

## Taxonomy Script

Extend:

- `scripts/rust-import-target-taxonomy.mjs`

Required behavior:

- keep existing `--db` mode;
- add `--profile <path>` mode;
- in `--profile` mode, read `rustCore.importPathAliasFallbackSamples`;
- classify samples into the same taxonomy output shape as DB mode where
  possible;
- write deterministic JSON and markdown artifacts under `docs/benchmarks/`;
- if a profile has no samples, emit a clear `sampleSourceUnavailableReason`;
- do not read source files.

## Validation

Required deterministic coverage:

- Rust core/profile fixture proves fallback sample counts, samples, reasons,
  and cap metadata are emitted.
- Cap behavior is tested for both per-bucket and total limits.
- Taxonomy script fixture proves `--profile` mode classifies profile samples and
  keeps existing `--db` behavior intact.
- No test expects source content in artifacts.

Required targeted evidence:

- current-repo targeted `rust-hybrid` profile with fallback samples;
- current-repo profile taxonomy artifact;
- VS Code sparse targeted `rust-hybrid` profile with fallback samples;
- VS Code sparse profile taxonomy artifact;
- RSS or unavailable reason;
- closeout decision stating whether the next bounded burndown category can be
  selected.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Emit Rust import fallback samples in the rustCore profile artifact.
2. Extend the relative import target taxonomy script to read profile samples.
3. Run current-repo and VS Code sparse profile taxonomy evidence.
4. Write closeout decision and update trackers.
