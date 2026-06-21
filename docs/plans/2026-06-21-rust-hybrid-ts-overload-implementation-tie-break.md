# Rust-Hybrid TypeScript Overload Implementation Tie-Break

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Implementation-declaration metadata closeout:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-metadata-closeout-decision.md`

## Context

Rust ESM named import/export diagnostics can now expose TypeScript
implementation-declaration metadata for candidate-multiple samples:

- `hasBody`
- `declarationForm`
- `metadataSource`

The VS Code sparse evidence at commit `4a6e32fc1f0` showed that the dominant
sampled candidate-multiple subtype remains `function-overload-signature`, and
that a bounded subset has exactly one implementation marker. The previous
closeout therefore recommends a guarded production resolver tie-break.

## Goal

Resolve TypeScript overload/signature candidate-multiple cases in the Rust ESM
named import/export path when exactly one safe implementation declaration can
be selected.

This is a narrow production behavior slice. It should reduce candidate-multiple
fallbacks only for the guarded overload/signature subset.

## Decision

Default-on production routing is allowed only when all guard conditions hold:

- resolved target file is not a declaration file (`.d.ts`, `.d.mts`,
  `.d.cts`);
- all candidates are in the same resolved target file;
- all candidates are `function` candidates;
- candidate metadata can identify implementation declarations;
- exactly one candidate has `hasBody=true` or
  `declarationForm=implementation`;
- every non-selected candidate is not an implementation declaration.

When selected, the import edge and imported usage edges should target the
implementation candidate.

Edge metadata must use:

```json
{
  "resolvedBy": "rust-esm-named-import-export-overload-implementation"
}
```

## Profile Counter

Add a narrow resolved-ref counter:

- `esmNamedImportExportOverloadImplementationResolvedRefs`

It counts the same way as `esmNamedImportExportResolvedRefs`: import refs and
imported usage refs resolved through this guarded tie-break both count.

## Non-Goals

- Do not change SQLite schema.
- Do not resolve ambient-only overload sets.
- Do not resolve `.d.ts`, `.d.mts`, or `.d.cts` overload sets.
- Do not resolve no-implementation overload sets.
- Do not resolve type/value/namespace collisions.
- Do not change one-hop re-export behavior.
- Do not implement default imports, namespace imports, package/runtime imports,
  or multi-hop barrel chains.
- Do not run agent A/B.
- Do not do multi-run performance benchmarking.

## Validation

Required:

- deterministic fixtures for direct export overload implementation resolution;
- deterministic fixtures for same-file export specifier overload implementation
  resolution;
- deterministic fixture proving imported usage edges target the same
  implementation candidate;
- deterministic no-go fixtures proving ambient-only, declaration-file,
  no-implementation, type/value collision, and unknown metadata cases keep
  fallback;
- profile artifact coverage for
  `esmNamedImportExportOverloadImplementationResolvedRefs`;
- current repo deterministic profile/taxonomy evidence;
- one VS Code sparse deterministic profile/taxonomy evidence run when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- closeout update for #295, #296, and #165.

## Issue Sequence

1. Add guarded overload implementation resolver fixtures.
2. Implement bounded overload implementation tie-break.
3. Update taxonomy/decision tooling for overload implementation resolved
   evidence.
4. Run current and VS Code sparse evidence closeout.
