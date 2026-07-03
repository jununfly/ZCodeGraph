# Rust-Owned Migration Roadmap PRD

Date: 2026-07-03

## Purpose

Move ZCodeGraph toward Rust-owned indexing for every supported source language
while keeping the TypeScript shell responsible only for parts that still need
cross-language orchestration, user-facing diagnostics, or proven framework
sufficiency work.

This PRD consolidates the temporary ownership roadmap into a durable product
plan. It uses the current codebase as the source of truth:

- `src/indexing/rust-hybrid-contract.ts`
- `src/extraction/grammars.ts`
- `src/types.ts`
- `src/extraction/languages/index.ts`
- `crates/zcodegraph-core/src/lib.rs`
- `src/resolution/frameworks/index.ts`
- framework resolver files under `src/resolution/frameworks/`

## Current Ownership Model

`rust-hybrid` currently assigns these languages to Rust-owned per-file indexing:

- `javascript`
- `jsx`
- `typescript`
- `tsx`
- `go`
- `python`
- `rust`

Every other supported source language is currently indexed through TypeScript
fallback extraction under `rust-hybrid`.

Important boundary: Rust-owned per-file indexing does not automatically mean the
language's framework or runtime semantics are Rust-owned. For example, Python
files are Rust-owned, but Django, Flask, and FastAPI resolver logic still lives
in the TypeScript shell.

## Goal 1: Migrate TS-Owned Fallback Extraction To Rust-Owned

Primary goal: remove language-level TypeScript fallback for supported source
languages by migrating each language's baseline extraction into Rust-owned
per-file indexing.

Each language migration must include:

- Rust `SourceLanguage` registration and extension detection.
- Tree-sitter parser dependency and parser setup.
- File/module node creation compatible with the schema.
- Baseline symbol extraction matching the existing TypeScript-owned extractor.
- Import/call/reference unresolved-ref emission where the language supports it.
- Rust-owned parse/extraction gap diagnostics.
- Rust-hybrid metadata showing the language as `rust`.
- Focused fixture tests and one suitably sized real-corpus validation.
- A decision on which framework/runtime semantics remain TypeScript-shell owned.

### Grammar Languages Checklist

These languages currently have TypeScript-owned tree-sitter extractor configs
and should be migrated language by language:

- [x] Java: classes, interfaces, annotations, enums, imports, method calls,
      package declarations, Spring/Play boundary decision.
- [x] C: functions, structs, enums, typedefs, includes, calls, header
      classification boundary.
- [ ] C++: functions, classes, structs, enums, typedefs/aliases, includes,
      calls, namespace/member boundary.
- [ ] C#: classes, records, interfaces, structs, enums, using directives,
      invocations, namespace/package extraction, ASP.NET/Razor boundary.
- [ ] PHP: functions, classes, traits, interfaces, enums, namespace imports,
      function/member/scoped calls, Laravel/Drupal boundary.
- [ ] Ruby: methods, classes, modules, assignments, require/require_relative,
      calls, Rails boundary.
- [ ] Swift: functions, classes, protocols, structs, enums, typealiases,
      imports, calls, SwiftUI/UIKit/Vapor boundary.
- [ ] Kotlin: functions, classes/data classes/enums, type aliases, imports,
      calls, properties, package extraction, Spring/Expo boundary.
- [ ] Dart: functions, classes, enums, type aliases, imports/exports,
      invocation strategy.
- [ ] Pascal/Delphi: procedures/functions, classes, interfaces, enums, type
      declarations, uses, calls, DFM/FMX boundary.
- [ ] Scala: classes, objects, traits, enums, type definitions, imports,
      calls, val/var extraction, Play boundary.
- [ ] Lua: functions, table-style values, `require`, calls.
- [ ] Luau: Lua-compatible extraction plus Luau type definitions.
- [ ] Objective-C: functions, interfaces/classes, protocols, structs, enums,
      typedefs, includes, call/message expressions, Swift/ObjC and React Native
      bridge boundary.

### Custom And File-Level Languages Checklist

These paths are not simple tree-sitter language migrations. Each needs a
separate Rust-owned feasibility decision before implementation.

- [ ] Svelte: preserve script-block delegation and SvelteKit route/action
      semantics; decide whether Rust owns markup scanning or only script facts.
- [ ] Vue: preserve script-block delegation and Vue/Nuxt route semantics; decide
      whether Rust owns single-file-component structure.
- [ ] Liquid: port custom regex extraction and Shopify JSON template/section
      linking, or keep as TypeScript shell if parser-free extraction remains
      easier to audit there.
- [ ] Razor/Blazor: assess whether markup-to-C# links should move to Rust or
      remain TypeScript shell due to framework-heavy semantics.
- [ ] XML/MyBatis: port mapper statement extraction and MyBatis resolver
      contract, or explicitly keep framework extraction in TypeScript shell.
- [ ] YAML: decide per use case: Drupal routes, Spring config, Play routes, and
      generic file-level tracking may not belong in one Rust migration.
- [ ] Twig: decide whether file-level tracking is sufficient or whether a real
      Twig extraction story is needed first.
- [ ] Properties: port Spring config-key extraction only if Spring value binding
      can remain precise.

## Goal 2: Rationality Check For TS Shell Shared Layer Migration

Primary goal: do not blindly migrate shared TypeScript-shell behavior. For each
shared layer item, decide whether Rust ownership improves correctness,
performance, diagnostic quality, or packaging simplicity enough to justify the
migration.

Each item should end in one of three decisions:

- `migrate to Rust-owned`
- `keep TypeScript-shell owned`
- `split ownership with explicit boundary`

### Framework Resolver Checklist

- [ ] Laravel resolver: route/resource extraction and controller resolution.
- [ ] Drupal resolver: routing YAML and hook extraction.
- [ ] Express resolver: route and middleware extraction.
- [ ] NestJS resolver: controller/route extraction, module prefix post-extract
      updates, GraphQL/gateway/class decorators.
- [ ] React resolver: component/context/router semantics and dynamic-dispatch
      interactions.
- [ ] Svelte resolver: SvelteKit routes and form actions.
- [ ] Vue/Nuxt resolver: file-convention routes and middleware.
- [ ] Django resolver: URL/view/model and ORM descriptor semantics.
- [ ] Flask resolver: decorator routes and Flask-RESTful resources.
- [ ] FastAPI resolver: decorator routes and dependency semantics.
- [ ] Rails resolver: routes, controller/model/helper/service conventions.
- [ ] Spring resolver: controller routes and config-key binding.
- [ ] Play resolver: extensionless `conf/routes` extraction.
- [ ] Go/Gin resolver: route extraction and handler resolution.
- [ ] Rust framework resolver: Rocket/Axum-like route extraction not already
      covered by Rust core.
- [ ] ASP.NET resolver: route and Razor/Blazor linkage boundary.
- [ ] SwiftUI resolver: app/view linkage.
- [ ] UIKit resolver: view-controller/view relationships.
- [ ] Vapor resolver: Swift server route extraction.
- [ ] Swift-Objective-C bridge resolver: mixed iOS bridge semantics.
- [ ] React Native bridge resolver: JS-to-native bridge semantics.
- [ ] Expo Modules resolver: Swift/Kotlin module DSL extraction.
- [ ] Fabric view resolver: TS spec to native component/view-manager links.

### Reference Resolution And Finalization Checklist

- [ ] ReferenceResolver orchestration: decide whether it remains TypeScript
      shell because it coordinates all languages, or whether Rust can own
      language-local subsets.
- [ ] Name matcher: decide whether to port the generic matcher, keep it in
      TypeScript, or split candidate production and decision logic.
- [ ] Dynamic-dispatch synthesizers: keep in TypeScript shell until each
      mechanism has end-to-end flow proof and precision evidence.
- [ ] Framework resolver registry: decide whether Rust should expose a
      post-extract protocol rather than own framework registry directly.
- [ ] Cleanup protocol execution: decide whether TypeScript remains executor or
      Rust can safely own resolved/unresolved cleanup.
- [ ] Status/doctor fallback diagnostics: keep user-facing health vocabulary
      stable even if ownership changes underneath.
- [ ] MCP/read APIs: keep API surface stable; migration should not change agent
      tool semantics.
- [ ] Rust-owned gap diagnostics: preserve per-file parse/extraction-gap
      reporting for every newly migrated language.

## Acceptance Criteria

- Language-level TypeScript fallback goes to zero for migrated languages in
  `rust-hybrid` metadata.
- Every migrated language has deterministic fixture coverage and real-corpus
  evidence.
- Every non-migrated shared-layer item has a recorded keep/split/migrate
  decision with rationale.
- Status and doctor output continue to explain mixed ownership through healthy,
  degraded, failed, unavailable, stale, and corrupted states.
- No migration claims ownership of framework/runtime semantics just because the
  underlying source files moved to Rust-owned indexing.

## Suggested Sequencing

1. Pick one TS-owned grammar language and migrate baseline extraction first.
2. Validate on a small or medium real project in that language.
3. Update `rust-hybrid` metadata and fallback diagnostics.
4. Decide whether that language's framework resolver stays TypeScript-shell
   owned or gets a separate migration roadmap.
5. Repeat for the next language only after the previous migration has fixture
   and corpus evidence.

Near-term clean candidates from the current map:

- Python framework sufficiency check after Python baseline Rust-owned evidence.
- Go/Gin route ownership check.
- Kotlin baseline migration, because Spring resolver boundaries are already
  explicit. Java baseline migration is complete; Spring/Play framework semantics
  remain TypeScript-shell owned, with corpus evidence recorded in
  `docs/benchmarks/2026-07-03-rust-owned-java-spring-petclinic-validation.md`.
- Swift baseline migration, if mobile bridge ownership becomes product priority.
