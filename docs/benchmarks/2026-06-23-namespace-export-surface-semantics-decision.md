# Namespace Export Surface Semantics Decision

Date: 2026-06-23

Issue: #469

## Decision

Namespace export and re-export forms should be represented as file/module
dependency semantics in the current `1-7-2` closeout, not as first-class
namespace surface symbol nodes or member-level symbol edges.

For forms such as:

```ts
export * as NS from "./source";
```

the bounded behavior is:

```text
barrel file/export module dependency --> source file
```

The namespace surface name (`NS`) is not modeled as a new symbol node in this
slice, and member-level symbol edges through `NS.member` are not written.

## Rationale

- A namespace export exposes a module object surface, not one named source
  symbol.
- This matches the namespace import policy in #470.
- First-class namespace surface nodes would require a broader export surface
  graph design touching traversal, rendering, and impact semantics.
- A file/module dependency edge is useful and bounded, while guessed member
  symbol edges would be too broad for `1-7-2`.

## Follow-Up

Create a ready-for-agent implementation issue to fixture-lock file/module
dependency behavior for `export * as NS from "./source"`.

## Roadmap Impact

`1-7-2-5-5. namespace export/re-export surface semantics (#469)` can be marked
complete as a semantic decision.

First-class namespace surface modeling and member-level namespace resolution
remain deferred.
