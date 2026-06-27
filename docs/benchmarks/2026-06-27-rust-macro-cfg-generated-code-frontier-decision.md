# Rust Macro Cfg Generated Code Frontier Decision

Date: 2026-06-27

## Scope

This is an explore-only slice for `1-5-3. Macro cfg and generated-code frontier` in the Rust language indexing roadmap.

The goal is to classify how macro and cfg semantics affect graph correctness before adding implementation behavior.

## Non-goals

- Do not implement macro expansion.
- Do not evaluate `cfg` or feature expressions.
- Do not filter parsed items based on target triples or Cargo features.
- Do not recover macro-generated symbols.
- Do not model `build.rs`, `OUT_DIR`, or generated source includes.
- Do not change default graph writes.
- Do not run agent A/B or performance gates.

## Current Implementation Facts

Rust core currently records macro/cfg taxonomy from source text:

- `macro-rules-definition`
- `cfg-attribute`
- `cfg-attr-attribute`
- `derive-attribute`
- `attribute-macro`
- `proc-macro-deferred`
- `function-like-macro-invocation`
- `macro-generated-semantics-deferred`
- `macro-affected-impl-deferred`
- `macro-affected-trait-deferred`
- `macro-affected-mod-deferred`
- `macro-affected-route-like-function-deferred`

Trait taxonomy also records `cfg-impl-deferred` when an impl item text includes an attribute.

The current implementation is intentionally diagnostic. It does not expand macros or evaluate cfg conditions, and it does not write graph edges for macro-generated semantics.

## Frontier Taxonomy By Code Existence / Semantic Generation Mode

### Always-present parsed AST

Parsed Rust items without cfg or macro influence can be indexed normally, subject to the existing resolver and edge guards.

### Conditionally-present AST

Items under `#[cfg]` or `#[cfg_attr]` are parser-visible but semantically conditional. Treating them as always present can overstate graph facts for a concrete build target.

Current status: taxonomy exists; no cfg-aware filtering.

### Macro-affected parsed item

Attribute and derive macros can change semantics of parsed items, including generated impls, route behavior, or trait behavior.

Current status: taxonomy exists for some affected item categories; graph writes remain conservative.

### Macro-generated missing item

Macros can create functions, impls, modules, routes, methods, or trait implementations that are not visible in the parsed AST.

Current status: no generated symbol recovery; taxonomy records deferred semantics.

### Macro invocation opaque region

Function-like macro invocations and `macro_rules!` definitions are opaque without expansion.

Current status: definitions and invocations are counted; no expansion.

### External build/generated code

`build.rs`, `OUT_DIR`, `include!`, and generated files are outside the current Rust core semantic model.

Current status: no-go taxonomy candidate; do not enter mainline implementation without a separate product decision.

## mini-redis Deterministic Smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Command:

```bash
rm -rf /private/tmp/codegraph-corpus/mini-redis/.zcodegraph
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --force
```

Result:

```json
{
  "success": true,
  "filesIndexed": 28,
  "filesSkipped": 0,
  "filesErrored": 0,
  "nodesCreated": 320,
  "edgesCreated": 315,
  "durationMs": 88,
  "rustMacroTaxonomyCounts": {
    "attribute-macro": 41,
    "cfg-attribute": 6,
    "derive-attribute": 27,
    "function-like-macro-invocation": 125,
    "macro-generated-semantics-deferred": 166,
    "proc-macro-deferred": 41
  },
  "rustTraitImplTaxonomyCounts": {
    "cfg-impl-deferred": 7,
    "cross-crate-trait-deferred": 5,
    "impl-method": 109,
    "inherent-impl": 12,
    "trait-impl": 25,
    "where-clause-deferred": 1
  },
  "rustAxumRouteTaxonomyCounts": {}
}
```

SQLite graph summary:

```text
edges:
  contains: 292
  rust-finalization imports: 23
```

Interpretation:

- mini-redis has substantial macro/cfg surface.
- The current graph remains conservative: no explicit macro-generated semantic edges are written.
- Existing diagnostics expose broad counts but do not yet explain which graph write paths were avoided or affected.

## Graph Correctness Risks

- `#[cfg]` can make parser-visible nodes false positives for a concrete build.
- `derive` and proc macros can create missing impl/method/trait behavior.
- Attribute route macros can create framework routing semantics that are not captured by simple route call syntax.
- `macro_rules!` and function-like macro invocations can hide modules, handlers, impls, or calls.
- Generated code can make a source-only graph incomplete in ways that are not fixable without an oracle or explicit product mode.

## Recommended Next Bounded Implementation

Next slice: `Macro/cfg diagnostic hardening v1`.

Target behavior:

- Make macro/cfg affected Rust semantics more visible in profile/result diagnostics.
- Distinguish conditionally-present parsed items from macro-generated missing items.
- Surface macro-affected `impl`, `trait`, `mod`, and route-like functions more consistently.
- Add no-go taxonomy for external generated code patterns if detectable without expansion.
- Do not change default graph writes.
- Do not implement cfg evaluation or macro expansion.

## Decision

`1-5-3. Macro cfg and generated-code frontier` is ready to close as an explore slice.

The next implementation should improve diagnostics before attempting cfg-aware behavior. This keeps the roadmap aligned with the rule that wrong graph edges are worse than missing graph edges.
