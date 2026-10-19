# Rust-Owned C# Corpus Validation (Newtonsoft.Json)

Date: 2026-10-08
Roadmap: 1-2-4-3 C# 确定性 fixture 测试 + 真实语料验证（1-2-4-1 baseline extractor、1-2-4-2 pre-cutover reference-edge 验证之后）

## Corpus

- Repository: `JamesNK/Newtonsoft.Json`
- Checkout: `52fa3aef1f2cadcd3a3f874251eddc98d3efbbaa`
- Local path during validation: `C:\workspace\cs-corpus` (shallow clone); the
  indexed production subset is `Src/Newtonsoft.Json`.
- Size: **242 C# files, 70,180 LOC** (production library only; the checkout's
  951-file total includes the large `Tests/`/`TestObjects/` trees, which are
  excluded so the gate measures shipped symbols, not test scaffolding).
- Rationale: Newtonsoft.Json is the canonical, widely-deployed .NET serialization
  library — a medium-sized, real-world, multi-targeting codebase that exercises
  the hard parts of C# extraction: file-scoped and block namespaces, records,
  generics, attributes, LINQ expression trees, and heavy conditional
  compilation (`#if HAVE_*` / `#elif` / `#else` / `#endif` across .NET target
  profiles). It is a deliberate step up from the deterministic wave0 fixtures.

Directory spread of the 242 files: root 57, `Serialization` 48, `Utilities` 47,
`Linq` 35, `Converters` 18, `Schema` 16, `Linq/JsonPath` 13, `Bson` 7,
`Properties` 1.

## Grammar supply

- `tree-sitter-c-sharp` **0.23.1** pinned in `crates/zcodegraph-core/Cargo.toml`
  (tree-sitter language ABI 14, matching the repository's tree-sitter 0.24
  runtime; 0.23.5 is parser ABI 15 and fails to load).
- Parse normalization is `blank_csharp_preprocessor_directives`
  (`crates/zcodegraph-core/src/lib.rs`), which this node made **BOM-aware** and
  switched from "keep both `#if`/`#else` arms" to a single deterministic
  **active `#if` arm**. See "Preprocessor findings" below.

## Command

The validation used the Rust core binary directly (the local Windows clone has
no `node_modules`/`dist`, so the TS shell and vitest arbitration run on CI):

```bash
./target/debug/zcodegraph-core.exe index \
  --project-path C:\workspace\cs-corpus\Src\Newtonsoft.Json \
  --index-path  C:\workspace\cs-corpus\Src\Newtonsoft.Json\.zcodegraph\zcodegraph.db \
  --engine rust --force
```

## Result

- Files indexed: **242**
- Files errored: **0**
- Nodes created: **8,248**
- `contains` edges created: **8,006**
- Unresolved references emitted: **19,298**
- Non-empty `errors` column in the `files` table: **0**
- Wall time: ~1,826 ms total; C# parse+extract ~921 ms; SQLite write ~456 ms
  (debug build).

The pure-Rust engine emits containment plus unresolved references; cross-file
edge resolution (calls/instantiates/references/extends→implements) runs in the
language-agnostic TS finalizer under rust-hybrid and is gated separately by the
1-2-4-2 end-to-end test. This benchmark therefore reports node shape and the
unresolved-ref supply, not resolved edges.

### C# node distribution

| Count | Kind      |
|------:|-----------|
|   242 | file      |
|   243 | module (namespace; one file declares more than one) |
| 2,688 | method    |
| 2,000 | variable  |
| 1,033 | import    |
|   686 | field     |
|   678 | property  |
|   340 | enum_member |
|   261 | class     |
|    50 | enum      |
|    19 | interface |
|     8 | struct    |

### C# unresolved refs

| Count | Reference kind | Note |
|------:|----------------|------|
| 9,593 | calls         | bare / receiver-qualified / chained calls |
| 6,567 | references    | type-position refs (params, returns, fields, locals) |
| 1,245 | instantiates  | `new X(...)` |
| 1,033 | imports       | one per `using_directive` surviving in the active arm |
|   606 | decorates     | `[Attribute]` usages |
|   254 | extends       | base-type / interface refs (promoted to `implements` for class→interface by the resolver under rust-hybrid) |

207 of 242 files carry at least one non-import unresolved reference, i.e. rich
cross-file symbol coupling is available for the finalizer to resolve.

## Preprocessor findings (the substantive fix in this node)

`measure-first` probes over all 242 files compared three normalization
strategies against the raw 0.23.1 parse:

| Strategy | Files with parse errors | Outcome |
|---|---:|---|
| Raw (no blanking) | 44 files / 423 error nodes | multi-targeting `#if` inside enum member lists and elsewhere detaches member lists |
| Blank directives, **keep both arms** (pre-node Rust + current TS mirror) | 1 file | the 46 KB `JsonReader.cs` collapsed to **1 node** |
| Blank directives, **single active `#if` arm** (this node) | **0 files** | two real defects fixed |

### Defect 1 — BOM blindness

`Serialization/DiagnosticsTraceWriter.cs` begins with a UTF-8 BOM
(`EF BB BF`) immediately followed by a column-1 `#if HAVE_TRACE_WRITER`. The old
line-anchored regex (`^[ \t]*#`) could not see the `#if` through the BOM but
*did* blank the later `#endif`, producing an unbalanced region the grammar
reported as `MISSING #endif` — a file that parsed with **zero** errors raw was
made worse by blanking. The regex now runs over the BOM-stripped tail with
offsets shifted past the BOM; the BOM bytes are preserved verbatim.

### Defect 2 — both-arm continuation crash

`JsonReader.cs` guards a multi-line boolean expression:

```csharp
if (value < DateParseHandling.None ||
#if HAVE_DATE_TIME_OFFSET
        value > DateParseHandling.DateTimeOffset
#else
        value > DateParseHandling.DateTime
#endif
        )
```

Keeping both arms blanked only the directive lines, leaving two adjacent
operands (`value > DateTimeOffset` immediately followed by
`value > DateTime`) with no joining operator — one ERROR node that made the
grammar drop the enclosing class's member list. The whole 46 KB file then
indexed a single node (`node_count = 1`). The normalization now keeps a single
deterministic active arm (the `#if` arm) and blanks from the first
`#elif`/`#else` through the matching `#endif`, preserving newlines so every
surviving symbol's byte offset stays exact. After the fix `JsonReader.cs`
indexes **127 nodes** (44 methods, 31 variables, 15 properties, 13 fields,
13 enum members, 7 imports, class/enum/module/file).

### Cost of the active-arm choice

Switching to one active arm removed every parse error at the cost of **seven**
symbols corpus-wide, all legacy multi-targeting *fallback* arms — never the
primary implementation:

| File | Dropped symbols | Arm |
|---|---:|---|
| `Utilities/ThreadSafeStore.cs` | 2 fields | `#else` under `HAVE_CONCURRENT_DICTIONARY` (hand-written lock fallback) |
| `Utilities/ReflectionUtils.cs` | 2 methods | non-modern target fallback |
| `Utilities/DateTimeUtils.cs` | 1 method | `#else` under `HAVE_TIME_ZONE_INFO` |
| `JsonTextReader.cs` | 1 field | fallback target |
| `Serialization/DefaultContractResolver.cs` | 1 field | fallback target |

The kept `#if` arm is the modern/common configuration; the preprocessor
symbols are intentionally not evaluated. Net node change from restoring
`JsonReader.cs` (+~126) and `DiagnosticsTraceWriter.cs` (+~11) dwarfs the seven
dropped fallback symbols (final total 8,248 vs 8,171 with the both-arm/BOM-buggy
build). The conditional `using` count likewise moves 1,062 → 1,033 (-29) because
fallback-arm `using` directives inside inactive regions are now blanked — the
same deliberate trade-off.

The TypeScript mirror `src/extraction/languages/csharp.ts`
(`blankCsharpPreprocessorDirectives`) still keeps both arms and is BOM-blind.
It is slated for deletion at the ownership cutover (1-2-4-4), so this node does
not invest in it; the divergence is recorded here rather than silently
preserved.

`EXTRACTION_VERSION` is **not** bumped: the C# Rust extractor is unreleased and
the ownership cutover has not happened, so this is work inside the same
unreleased C# semantic batch (v2).

## Verification gates

- Rust unit tests (`crates/zcodegraph-core/src/lib.rs`), all passing under
  `cargo test -p zcodegraph-core csharp_preproc` (4 tests):
  - `csharp_preproc_blanking_is_bom_aware` — BOM preserved, both directives
    blanked, guarded code kept, byte length unchanged.
  - `csharp_preproc_blanking_without_bom_unchanged` — no-BOM regression guard.
  - `csharp_preproc_keeps_active_arm_and_blanks_else_arm` — expression-
    continuation `#if/#else`: active arm survives, inactive arm blanked,
    newlines and length preserved.
  - `csharp_preproc_keeps_code_for_if_without_else` — #237 enum-member shape
    still keeps guarded code for a plain `#if/#endif`.
- Deterministic wave0 fixtures in
  `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('C# baseline (roadmap 1-2-4)')`, two new cases (CI runs this file
  with no name filter, across ubuntu/macos/windows, no `.skip`):
  - a column-1 `#if` guarded by a leading UTF-8 BOM
    (DiagnosticsTraceWriter shape);
  - an `#if/#else` expression continuation that previously detached the whole
    class (JsonReader shape).
  Because the local clone cannot run vitest, each fixture source was indexed
  end-to-end through the freshly built Rust binary and asserted directly
  against SQLite (`filesErrored = 0`, `errors` NULL, expected methods/
  properties/fields/enum members present); vitest arbitration is delegated to
  the 3-OS CI matrix on this node's push.
- Corpus re-index after the fix: `filesErrored = 0`, every file's `errors`
  column NULL/empty.

## Decision

The C# real-corpus validation gate **passes**. All 242 production Newtonsoft.Json
files parse and extract through Rust with zero parse/extraction errors; the node
distribution (modules/classes/records/interfaces/enums, methods vs properties
vs fields, imports, enum members) is internally consistent and rich (8,248
nodes, 19,298 unresolved refs across 207 coupled files). In the course of the
gate two genuine preprocessor-normalization defects (UTF-8 BOM blindness and
both-arm expression continuation) were found measure-first, fixed only in the
Rust core, and locked by Rust unit tests plus deterministic cross-OS fixtures.
The remaining cost — seven legacy fallback-arm symbols — is an honest, documented
trade-off, not a parse gap. The ownership cutover (adding `csharp` to
`RUST_HYBRID_RUST_OWNED_LANGUAGES` and retiring the TypeScript C# extractor)
proceeds in node 1-2-4-4.
