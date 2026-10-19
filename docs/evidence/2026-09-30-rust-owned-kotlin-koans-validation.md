# Rust-Owned Kotlin Corpus Validation

Date: 2026-09-30
Roadmap: 1-6-1 波次1 Kotlin 基线迁移（#692 夹具模式落地后首个新语言）

## Corpus

- Repository: `Kotlin/kotlin-koans`
- Checkout: `5935a3cab5293bd7967b1bf1f4d2ae713f9e0e9e`
- Local path during validation: `C:\workspace\kt-corpus`
- Size: 98 Kotlin files, 2,423 LOC of Kotlin; 116 repository files total.
- Rationale: an official JetBrains teaching corpus sized comparably to the
  cJSON C gate (53 C files). It exercises a deliberately broad slice of Kotlin
  grammar — data classes, `object` declarations, extension functions/properties,
  SAM conversions, lambdas, nullability/smart casts, generics, builder DSLs and
  property delegates — while staying pure grammar-level (no Spring/Android
  framework noise), which matches the baseline-extraction scope of this node.
  The repository also ships 10 Java interop files, which the Rust core indexes
  through its already-migrated Java path.

## Grammar supply

The Kotlin grammar is **not** sourced from crates.io: the latest published
`tree-sitter-kotlin` 0.3.8 pins `tree-sitter >=0.21, <0.23`, which conflicts with
this repository's `tree-sitter` 0.24. `fwcd/tree-sitter-kotlin` main is an
unreleased 0.4.0 (built against tree-sitter 0.24 via `tree-sitter-language`), so
`crates/zcodegraph-core/Cargo.toml` git-pins the rev:

```toml
tree-sitter-kotlin = { git = "https://github.com/fwcd/tree-sitter-kotlin", rev = "1852ea17b7f60fb3f9d84e0b1555d56b46b39fb1" }
```

Revert to a crates.io version once fwcd publishes a 0.4.x release. CI sets
`CARGO_NET_GIT_FETCH_WITH_CLI=true` so the grammar is fetched through the git
CLI when Cargo's built-in schannel fetch cannot reach the revocation server.

## Command

The validation used the Rust core binary directly (the local Windows clone has
no `node_modules`/`dist`, so the TS shell and vitest arbitration run on CI):

```bash
./target/debug/zcodegraph-core.exe index \
  --project-path C:\workspace\kt-corpus \
  --index-path  C:\workspace\kt-corpus\.zcodegraph\zcodegraph.db \
  --engine rust --force
```

## Result

- Repository files: 116
- Files indexed: 108 (98 `.kt` + 10 `.java`)
- Files errored: **0**
- Nodes created: 959
- Edges created: 851
- `parseByLanguage.kotlin.files` = 98 (every Kotlin file parsed by Rust)
- Kotlin files with a non-empty `errors` column in the `files` table: **0**
- Parse/extraction wall time: ~388 ms total; Kotlin parse+extract ~63 ms.

### Kotlin node distribution

| Count | Kind            |
|------:|-----------------|
|    98 | file            |
|    98 | module (package header) |
|   200 | import          |
|    74 | class           |
|     1 | interface       |
|     2 | enum            |
|     6 | enum_member     |
|   147 | method          |
|   120 | function        |
|     8 | property        |
|   121 | variable        |

### Kotlin unresolved refs

| Count | Reference kind | Audit |
|------:|----------------|-------|
|   747 | calls          | bare / receiver-qualified / chained call names |
|   200 | imports         | one ref per `import_header`; wildcard `java.util.*` collapses to one `java.util` |
|   174 | references      | type-position refs (parameters, returns, properties, delegation) |
|    93 | decorates       | **all** are the JUnit `@Test` annotation — zero noise |
|    10 | extends         | real inheritance/delegation (e.g. builder `Tag`, `ReadWriteProperty`) |
|     0 | instantiates    | correct — Kotlin has no `new`; the 3 corpus `instantiates` refs all originate from the 10 Java files |

## Verification gates

- Rust unit test: `cargo test --lib kotlin_baseline` →
  `rust_core_kotlin_baseline_classification_typealias_and_extension` passes
  (locks object→class, `typealias` RHS references, and extension-receiver
  `Int::times2` qualification).
- Deterministic wave0 fixtures: `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('Kotlin baseline (roadmap 1-6-1)')` — 8 cases / 27 assertions.
  Because the local clone cannot run vitest, every fixture sample was indexed
  end-to-end through the Rust binary and asserted directly against SQLite;
  27/27 passed with every file's `errors` column NULL. Vitest arbitration is
  delegated to the 3-OS CI matrix in node 1-6-1-5.

## Grammar boundary noted during the gate

fwcd 0.4 misparses a single-line declaration that carries a body, e.g.
`object R { val x }`, as an `infix_expression` (the declaration node is lost
without an ERROR node). Multi-line bodies parse correctly
(`object R {\n val x\n}` → `object_declaration`). The legacy TypeScript
extractor does not recover these either, so this is accepted parity rather than
a Rust regression. Wave0 fixtures and this corpus use mainstream multi-line
formatting; the boundary is recorded in roadmap node 1-6-1 decisions and is not
worked around in product code.

## Decision

The Kotlin baseline migration corpus gate **passes**. All 98 Kotlin files are
parsed by the Rust indexer with zero parse/extraction errors, the emitted graph
shape (modules, class/interface/enum/object classification, methods vs
functions, properties vs variables, imports, extends, decorates, calls) is
internally consistent with no spurious `instantiates` noise, and real
inheritance/delegation and annotation edges are present. Ownership switch
(adding `kotlin` to `RUST_HYBRID_RUST_OWNED_LANGUAGES`, retiring the TypeScript
Kotlin extractor) and 3-OS CI arbitration proceed in node 1-6-1-5.
