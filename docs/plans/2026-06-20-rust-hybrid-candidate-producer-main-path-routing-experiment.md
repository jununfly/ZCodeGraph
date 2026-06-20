# Rust-hybrid candidate producer main-path routing experiment

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #316-#320 complete Rust candidate producer shape coverage

## Decision

Implement the next resolver-migration slice as a **gated Rust candidate
producer main-path routing experiment**.

This slice may route only these Rust producer shapes into the candidate
protocol main path:

- `ExactName`
- `KnownNamePresence`

The routing experiment must be **default off** and enabled only by an
experimental local project config file:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

Do not add a new environment flag for this experiment.

## Why This Slice

Rust candidate producer shape coverage is now complete and validated in shadow
mode:

- current repo: 6,185 producer lookups compared, 0 mismatches;
- VS Code sparse: 156,348 producer lookups compared, 0 mismatches.

Continuing to collect only shadow evidence now has lower marginal value. The
next useful question is whether the validated Rust producer can replace a
narrow part of the TypeScript candidate source while preserving graph
semantics.

This is still not a `matchReference` migration. TypeScript remains the owner of
final target selection, language/kind gates, ranking, confidence, `resolvedBy`,
framework behavior, and every-reference disambiguation.

## Scope

### In Scope

- Read experimental local config from `.zcodegraph/config.json`.
- Enable routing only when `experimental.rustCandidateProducerRouting === true`.
- Treat missing config, missing `experimental`, missing key, or `false` as
  routing disabled.
- Treat non-boolean config values as invalid, fail closed to TypeScript
  baseline, and report `invalid-local-config`.
- Expose concise status JSON:
  - `rust.experimental.candidateProducerRouting.enabled`
  - `rust.experimental.candidateProducerRouting.source`
- Record richer profile/doctor diagnostics for routing:
  - active shapes;
  - fallback reason;
  - mismatch count and bounded samples;
  - producer failure reason;
  - invalid config reason.
- Precompute the bare unresolved-reference key universe before reference
  resolution.
- Batch-run the Rust candidate producer once for:
  - `ExactName`
  - `KnownNamePresence`
- Route only those two shapes through the Rust producer result maps.
- Hydrate Rust producer ids through an existing TypeScript-side `id -> Node`
  map.
- Keep TypeScript baseline comparison while routing is enabled.
- Fail closed to the TypeScript baseline for the entire run on mismatch,
  producer failure, invalid config, missing Rust result, or missing node id.
- Validate graph stability with routing enabled and disabled.
- Run current-repo and VS Code sparse targeted evidence.

### Out of Scope

- Routing `LowerName`, `QualifiedName`, or `FileNodes`.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Adding a new environment flag.
- Adding a CLI config writer such as `zcodegraph config set`.
- Changing `zcodegraph init`.
- Writing README or user-facing release messaging.
- Promising a stable config API.
- Optimizing producer transport, subprocess overhead, payload shape, or
  serialization.
- Migrating legacy environment flags in this implementation slice.

## Local Config Contract

The config file is experimental and local-only:

- path: `.zcodegraph/config.json`;
- public stability: none;
- missing file: disabled, `source: "missing-config"`;
- valid true: enabled, `source: "local-config"`;
- valid false: disabled, `source: "local-config"`;
- invalid JSON: disabled, `source: "invalid-local-config"`;
- non-boolean `experimental.rustCandidateProducerRouting`: disabled,
  `source: "invalid-local-config"`.

Invalid config must not interrupt indexing. It must fail closed to TypeScript
baseline.

## Routing Boundary

Routing must live inside `CandidateProtocolProvider`.

`ReferenceResolver` should keep calling the candidate provider normally:

- `lookupNodes({ kind: "ExactName", name })`
- `hasKnownName(name)`

`matchReference` must not know Rust producer routing exists.

The candidate provider owns:

- local config interpretation;
- routing enabled/disabled state;
- precomputed Rust producer maps;
- `id -> Node` hydration;
- TypeScript baseline comparison;
- fail-closed fallback;
- profile diagnostics.

## Key Universe

Before reference resolution, collect only bare unresolved-reference
`referenceName` values.

Do not collect:

- dotted receiver/member derived names;
- colon/namespace parts;
- tail segments;
- all indexed known names.

Derived known-name checks should continue to use the TypeScript baseline in
this slice.

## Fail-Closed Rules

Routing must fall back to TypeScript baseline for the entire run if any of
these happen:

- local config is invalid;
- Rust core is unavailable;
- producer subprocess fails;
- producer response is invalid;
- a requested Rust result is missing;
- candidate id sets mismatch for `ExactName`;
- known-name presence mismatches;
- a Rust candidate id cannot be hydrated to a TypeScript-side `Node`.

Fallback must not interrupt indexing. It must preserve the resolved graph and
record enough diagnostics to explain why routing did not remain active.

## Diagnostics

Status JSON should stay concise:

```json
{
  "rust": {
    "experimental": {
      "candidateProducerRouting": {
        "enabled": false,
        "source": "missing-config"
      }
    }
  }
}
```

Profile/doctor diagnostics should carry detailed routing evidence. Exact field
names may evolve in the implementation, but the diagnostics must answer:

- Was routing configured?
- Was routing active?
- Which shapes were routed?
- Did routing fall back?
- Why did routing fall back?
- How many mismatches occurred?
- Were mismatch samples capped?

Diagnostics are not MCP output and do not promise a stable public API.

## Legacy Env Flag Debt

This plan does not migrate existing legacy environment flags.

Create a separate technical-debt issue to audit and classify existing
`ZCODEGRAPH_*` and related experimental flags. The audit should decide which
flags should be migrated to local config, kept as test/CI/script overrides,
kept as one-shot command controls, or removed.

Do not fold that migration into this routing experiment.

## Acceptance Evidence

Required:

- deterministic config parsing tests for missing, valid true, valid false,
  invalid JSON, and non-boolean values;
- status JSON test for enabled/source only;
- routing-disabled graph guard;
- routing-enabled graph guard;
- invalid-config fail-closed graph guard;
- producer mismatch fail-closed graph guard;
- current-repo targeted profile with routing enabled;
- VS Code sparse targeted profile with routing enabled;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in closeout;
- closeout decision stating keep / no-go / prerequisite.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- routing changes resolved graph output;
- fail-closed behavior cannot preserve the TypeScript baseline graph;
- routing requires changing `matchReference`;
- routing requires broad `ReferenceResolver` branching instead of provider
  encapsulation;
- useful routing requires `LowerName`, `QualifiedName`, or `FileNodes` in the
  first experiment;
- diagnostics cannot explain fallback reason;
- local config semantics become user-facing product API surface;
- the only credible path requires migrating disambiguation in the same slice.

## Issue Sequence

1. Add experimental local routing config and status visibility.
2. Precompute the bare `ExactName` / `KnownNamePresence` routing key universe.
3. Route `ExactName` / `KnownNamePresence` through Rust producer with
   fail-closed TypeScript fallback.
4. Validate routing graph stability and targeted evidence.
5. Create a technical-debt issue for legacy environment flag audit and
   migration classification.

This sequence is intentionally aggressive but bounded. It tests Rust producer
main-path routing without migrating disambiguation.
