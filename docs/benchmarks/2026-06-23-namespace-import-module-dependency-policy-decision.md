# Namespace Import Module Dependency Policy Decision

Date: 2026-06-23

Issue: #470

## Decision

Namespace imports should be represented as file/module dependency edges in the
current `1-7-2` closeout, not as guessed symbol-level member edges.

For forms such as:

```ts
import * as NS from "./source";

NS.foo();
NS.VALUE;
```

the bounded behavior is:

```text
consumer file --imports--> source file
```

The namespace member accesses (`NS.foo`, `NS.VALUE`) are not resolved to
individual exported symbols in this slice.

## Rationale

- A namespace import binds a module object, not one named exported symbol.
- The file-level dependency edge preserves useful graph sufficiency without
  guessing member targets.
- Member-level namespace resolution requires a broader export/member resolver,
  including alias/default/re-export interactions, and should be promoted through
  a separate plan if needed.
- No schema change is required for the bounded policy.

## Roadmap Impact

`1-7-2-5-4. namespace import module/file dependency policy (#470)` can be
marked complete as a semantic policy decision.

Member-level namespace symbol resolution remains deferred.
