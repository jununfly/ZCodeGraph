# Default Re-Export Surface Semantics Decision

Date: 2026-06-23

Issue: #467

## Decision

Default re-export graph semantics should target the leaf default-exported
implementation symbol, not a new exported surface node.

For forms such as:

```ts
// source.ts
export default function Widget() {}

// barrel.ts
export { default as PublicWidget } from "./source";
```

the intended graph edge is:

```text
barrel export node --exports--> source default implementation symbol Widget
```

The exported surface name (`PublicWidget`) is not modeled as a first-class graph
node in the current `1-7-2` closeout. It may be preserved later as metadata or
diagnostics, but that broader export surface model remains deferred.

## Rationale

- This matches the export alias decision in #465: source/implementation symbols
  are the graph targets because they are what agents need to inspect.
- Creating separate surface nodes would require a broader export surface graph
  design touching query rendering, traversal, and impact semantics.
- Default re-export implementation is useful and bounded, but should be handled
  as a follow-up ready-for-agent issue rather than hidden inside the decision
  issue.

## Follow-Up

Create a ready-for-agent implementation issue for:

```text
Resolve default re-exports to leaf default-exported implementation symbols.
```

## Roadmap Impact

`1-7-2-5-2. default re-export surface semantics (#467)` can be marked complete
as a semantic decision.

The follow-up implementation should be added as a separate sub-node under
`1-7-2-5` and does not require schema changes.
