---
doc-kind: contract
authority: primary
authority-id: DES-complexity-rubric-v1
bounded-question: "How is per-function cyclomatic complexity computed at query time for metrics.complexity v1 — with zero schema change?"
---
# Complexity Rubric v1

Status: active

## Purpose

`complexity-rubric-v1` freezes the decision-point sets, exemption rules,
and formula behind `metrics.complexity` (roadmap node 1-2-6) so that
every value the MCP layer emits is reproducible from the indexed graph
plus a bounded body-text slice — no LLM call, no tree-sitter reparse,
no schema migration, no persisted column. The rubric commits to the
**P0b posture** established by `dead-code-rubric-v1`: freeze a small
language set, produce a measurable coverage signal, then expand.

The metric is **cyclomatic complexity** (McCabe): `1 + |decision points|`
over the function/method body. It is computed at MCP query time and
attached to the returned Markdown as a `**Complexity:** N` line; it is
**never** written back to the `nodes` table or any other persisted
location.

## Non-goals

- **No schema change.** No new column on `nodes`, `files`, or any other
  table; no new table; no new index; no FTS re-definition. Complexity
  lives only in MCP response text.
- **No persisted cache.** The calculator may hold an in-memory LRU keyed
  by `(file_path, content_hash)` for the lifetime of the MCP process;
  it is discarded on exit. On-disk caching is a v2 concern.
- **No tree-sitter reparse.** The metric is computed by token-level
  scanning over a body slice taken via `start_line`/`end_line`, not by
  re-walking an AST. The extractor has already done the AST work; the
  rubric consumes its coordinates, not its output tree.
- **No CLI surface in v1.** Complexity is exposed via MCP tools
  (`zcodegraph_node`, `zcodegraph_search`, `zcodegraph_explore`) only.
  A CLI flag may follow in a later node; it is not part of this
  contract.
- **No recall claim across all 21 languages.** v1 commits to coverage
  ≥90 % on the five frozen languages (C#, Java, PHP, Python, Rust)
  measured as "computable function/method nodes / successfully indexed
  function/method nodes" per language. Other languages are out of
  scope and emit no complexity line.
- **No auto-refactor suggestion.** v1 emits a number only. Threshold
  interpretation ("high / low") is a consumer-side concern and not
  encoded in the rubric.

## Base candidate set

A node is eligible for a complexity value iff **all** of:

```
kind IN ('function','method')
AND language IN ('csharp','java','php','python','rust')
AND file is indexed successfully (not degraded)
AND node is not exempt under the Exemption rules below
```

Test/generated path exclusions from `dead-code-rubric-v1` are **not**
re-applied here: complexity is a property of the code as written, and
consumers may legitimately want the complexity of a test helper or a
generated shim. Exemptions (below) are the only filter.

## Decision-point sets (per language)

The rubric scans the body slice token-by-token. A **token** is a
maximal run of identifier characters, or a maximal run of punctuation
characters (e.g. `&&`, `||`, `?.`, `??`, `=>`); string literals,
character literals, and comments (line and block) are skipped. Each
token in the language's set contributes exactly **+1** to the decision
count. Nesting does not multiply.

| Language | Decision-point tokens (case-sensitive unless noted) |
| --- | --- |
| **C#** (`csharp`) | `if`, `else if`, `for`, `foreach`, `while`, `do`, `case`, `catch`, `&&`, `\|\|`, `?` (ternary), `??` (null-coalescing), `??=` (null-coalescing assignment) |
| **Java** (`java`) | `if`, `else if`, `for`, `while`, `do`, `case`, `catch`, `&&`, `\|\|`, `?` (ternary), `instanceof` (pattern-matching form) |
| **PHP** (`php`) | `if`, `elseif`, `for`, `foreach`, `while`, `do`, `case`, `catch`, `&&`, `\|\|`, `?` (ternary), `??` (null-coalescing), `??=` (null-coalescing assignment) |
| **Python** (`python`) | `if`, `elif`, `for`, `while`, `except`, `with`, `assert`, `and`, `or`, `if` (in comprehension: `[x for x in xs if p]` is +1) |
| **Rust** (`rust`) | `if`, `else if`, `for`, `while`, `loop`, `match` (counts as +1 per arm, not +1 for the keyword — see below), `if let`, `while let`, `&&`, `\|\|`, `?` (try operator) |

**Language-specific clarifications**

- **Rust `match`:** each `match` arm contributes +1 (the `match` keyword
  itself contributes 0). The arm is identified by a `=>` token at the
  top nesting level of the match block. A match with 4 arms contributes
  +4, equivalent to a 4-way `if/else if` chain.
- **C# `else if` / Java `else if` / Rust `else if`:** counted as a
  single decision point (the `if`), not two (the `else` does not add).
- **Python `and` / `or`:** each boolean operator contributes +1, matching
  McCabe's short-circuit evaluation semantics. This parallels `&&` /
  `||` in the C-family languages.
- **Python `with`:** contributes +1 per `with` statement (context
  manager acquire/release is a branch on `__enter__` failure).
- **Python comprehension `if`:** counted when the `if` token appears
  inside a `[...]`, `(...)`, or `{...}` comprehension. Identified by
  nesting depth of brackets at the `if` token's position.
- **Java `instanceof`:** counted only when used as a pattern-matching
  expression (Java 16+ `x instanceof Foo f`); the traditional cast-only
  form is also counted (+1) because it still represents a runtime type
  branch. Both forms are treated identically for simplicity in v1.
- **Rust `?` (try operator):** each `?` token contributes +1 (early
  return on `Err` / `None`).
- **Rust `if let` / `while let`:** the `if let` / `while let` pair
  contributes +1 (the pattern match), not +2.

**Not counted (exhaustive for v1)**

- `else` (alone) — contributes 0
- `switch` / `match` keyword itself — contributes 0 (arms/cases do the
  counting)
- `try` — contributes 0 (`catch` / `except` do the counting)
- `finally` — contributes 0
- `return`, `break`, `continue`, `throw`, `raise`, `yield` — contribute
  0 in v1 (McCabe's original paper does not count these; some variants
  do. v1 follows the original.)
- Lambda / closure bodies — counted as part of the enclosing function's
  body (they are not exempt; see Q4 of roadmap node 1-2-6). Their
  decision points add to the enclosing function's complexity.

## Exemption rules

A node is **exempt** (no complexity emitted, reported as
`exemption_reason`) iff any of the following matches. Exemptions are
checked against the `nodes` row (columns `is_abstract`, `signature`,
`decorators`, `language`, `name`) **plus** a bounded same-file text
probe (existence-only substring match) where noted. Exemptions are
evaluated in order; first match wins.

### E1 — Abstract / interface method (no body)

- `nodes.is_abstract = 1`, **or**
- Language is `java` and the method's containing node (via `contains`
  edge) is an `interface` kind, **or**
- Language is `csharp` and `signature` contains the `abstract` keyword
  (C# extractor populates `is_abstract`; this is a defensive
  cross-check), **or**
- Language is `rust` and the `signature` ends with `;` (trait method
  without default body), **or**
- Language is `python` and `decorators` contains `abstractmethod`.

`exemption_reason: "abstract-no-body"`.

### E2 — Extern / FFI declaration

- Language is `rust` and the body slice begins with `extern "..."` or
  the `signature` begins with `extern `, **or**
- Language is `csharp` and `signature` contains `extern ` (P/Invoke
  pattern), **or**
- Language is `python` and the body slice is empty or contains only a
  docstring / `pass` / `...` (stub pattern — covers `.pyi` and
  `ctypes` stubs), **or**
- Language is `java` and `signature` contains `native `.

`exemption_reason: "extern-or-ffi"`.

### E3 — Macro / derive / source-generator product

- Language is `rust` and `decorators` contains any of `derive`,
  `async_trait`, `automock`, `pyfunction`, `wasm_bindgen`, **or**
- Language is `csharp` and the file path contains `.g.cs`, `.Designer.cs`,
  or `SourceGenerated`, **or**
- Language is `java` and `decorators` contains `Generated`
  (`javax.annotation.Generated`, `lombok.Generated`), **or**
- Language is `php` and the file path contains `vendor/` (excluded from
  indexing by default but may appear in dev corpora).

`exemption_reason: "generated-product"`.

**Non-exemptions (explicitly decided in roadmap node 1-2-6, Q4):**

- Anonymous functions / closures / lambdas are **not** exempt. Their
  decision points are counted into the enclosing named function's body
  slice.
- Test functions are **not** exempt (see Base candidate set).
- `pub` / exported status is **not** an exemption.

## Formula

```
complexity = 1 + |decision points in body slice|
```

For an exempt node the MCP layer emits **no** `**Complexity:**` line;
the exemption is recorded in the metrics-coverage probe (see Metrics
below) with its `exemption_reason`.

## Body-slice acquisition

The calculator consumes `nodes.file_path`, `nodes.start_line`,
`nodes.end_line` from the graph and resolves the body text as follows:

1. `validatePathWithinRoot(projectRoot, file_path)` (existing safety
   wrapper in `src/context/index.ts`).
2. `fs.readFileSync(file_path, 'utf-8')`.
3. `lines.slice(startLine - 1, endLine).join('\n')`.

This is the same pattern `ContextBuilder.extractNodeCode` uses today
(`src/context/index.ts:1270-1298`); the calculator reuses that code
path via a shared helper, not a fork. If the file is missing or
unreadable, the calculator returns `null` and the MCP layer emits no
complexity line; the miss is counted in the coverage probe.

## Metrics

The coverage probe (`scripts/measure/complexity-coverage.mjs`) reports,
per language:

```
coverage_lang = |computable nodes| / |successfully indexed function+method nodes in lang|
```

where `computable = has a body slice AND is not exempt`. The roadmap
exit criterion (1-2-6) is `coverage_lang ≥ 0.90` for each of the five
frozen languages, reported per language (not pooled). Exempt nodes are
**not** deducted from the denominator — they are part of
"successfully indexed" and are reported in a separate `exempt` bucket
with a breakdown by `exemption_reason`.

Files that fail `validatePathWithinRoot` / read (miss bucket) are
reported separately and counted against coverage; a miss rate >5 % in
any language is a defect to be investigated before closing 1-2-6.

## Corpora

The same five pinned corpora as `dead-code-rubric-v1` § Corpora are
used for the coverage probe:

| # | Corpus | Language |
| --- | --- | --- |
| 1 | eShopOnWeb | C# |
| 2 | spring-petclinic | Java |
| 3 | drupal (core subset) | PHP |
| 4 | django | Python |
| 5 | actix (actix-web) | Rust |

## Amendments

Rule changes require a new version (`complexity-rubric-v2.md`) unless
they are pure clarifications that do not change any emitted value or
exemption verdict. Clarifications land as dated entries below this
line.

*(No amendments yet — v1 baseline.)*
