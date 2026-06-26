# Rust Language Indexing Plan 5 Evidence: Macro Taxonomy Frontier

Date: 2026-06-27

Branch: `codex/rust-language-semantic-support-prd`

Plan: `docs/plans/2026-06-27-rust-language-indexing-plan-5-macro-taxonomy-frontier.md`

Roadmap scope: `1-4-3. Rust macro coverage taxonomy frontier`

Issues: #582, #583, #584, #585

## Decision

Plan 5 is complete as a diagnostics-only Rust macro taxonomy slice.

The implementation records macro-related syntax and macro-affected semantic
boundaries in Rust core profile/result JSON. It does not expand macros, execute
proc macros, add macro node kinds, write macro graph nodes, or write
macro-generated graph edges.

## Synthetic Macro Fixture

Covered by:

```bash
cargo test --package zcodegraph-core rust_core_classifies_macro_taxonomy_without_writing_macro_graph_edges
```

Result:

- Passed.
- Counted one `macro_rules!` definition.
- Counted three function-like macro invocations.
- Counted one derive attribute.
- Counted three attribute macros.
- Counted one `cfg` attribute.
- Counted one `cfg_attr` attribute.
- Counted macro-affected impl, trait, module, and route-like function deferred
  taxonomy.
- Verified no macro definition or invocation graph nodes were written.

## mini-redis Smoke

Corpus:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

Command:

```bash
cargo build --package zcodegraph-core
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

Result:

- success: true
- files indexed: 28
- files errored: 0
- nodes created: 320
- edges created: 315
- duration: 107 ms

Macro taxonomy:

```json
{
  "attribute-macro": 41,
  "cfg-attribute": 6,
  "derive-attribute": 27,
  "function-like-macro-invocation": 125,
  "macro-generated-semantics-deferred": 166,
  "proc-macro-deferred": 41
}
```

mini-redis validates real-project macro density and confirms the new taxonomy
does not add graph nodes or edges.

## RSS Evidence

Command:

```bash
/usr/bin/time -l target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

Result:

- wall time: 0.08 s
- user time: 0.07 s
- sys time: 0.00 s
- maximum resident set size: 9,502,720 bytes
- peak memory footprint: 4,637,032 bytes

RSS was available in this run.

## Optional Macro-Rich Repo Smoke

Corpus:

- `/private/tmp/codegraph-corpus/async-trait`

Command:

```bash
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/async-trait \
  --index-path /private/tmp/codegraph-corpus/async-trait/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

Result:

- success: true
- files indexed: 28
- files errored: 1
- nodes created: 245
- edges created: 266
- duration: 50 ms
- warning: `tests/test.rs` recorded a `rust-owned-parse-gap`

Macro taxonomy:

```json
{
  "attribute-macro": 42,
  "cfg-attr-attribute": 1,
  "derive-attribute": 2,
  "function-like-macro-invocation": 70,
  "macro-affected-impl-deferred": 15,
  "macro-affected-trait-deferred": 17,
  "macro-generated-semantics-deferred": 112,
  "macro-rules-definition": 1,
  "proc-macro-deferred": 42
}
```

The optional repo confirms macro-affected trait/impl taxonomy appears on a
macro-rich corpus. The parse gap is recorded as an existing Rust parser coverage
warning and is not a Plan 5 blocker.

## Validation Commands

```bash
cargo test --package zcodegraph-core
npm run build
```

Results:

- `cargo test --package zcodegraph-core`: 91 passed.
- `npm run build`: passed.

## Closeout

Plan 5 completes the bounded Rust macro taxonomy frontier:

- #582: macro syntax taxonomy implemented.
- #583: macro-affected semantic region guardrail implemented.
- #584: macro taxonomy exposed through profile/result JSON.
- #585: synthetic, mini-redis, optional async-trait evidence recorded.

Deferred by design:

- macro expansion;
- proc-macro execution;
- compiler-grade macro resolution;
- macro graph nodes or edges;
- macro-generated route, impl, module, call, import, or reference edges;
- Rust web framework route wiring.
