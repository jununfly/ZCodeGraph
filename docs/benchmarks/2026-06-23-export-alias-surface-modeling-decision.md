# Export Alias Surface Modeling Decision

Date: 2026-06-23

Issue: #465

## Decision

Do not add first-class export alias surface nodes or schema changes for ESM
named export alias forms in the current `1-7-2` closeout.

For forms such as:

```ts
export { foo as publicFoo } from "./source";
```

the graph edge remains:

```text
barrel export node --exports--> source symbol foo
```

The left-side source symbol is the graph target because it is the implementation
symbol an agent needs to inspect. The exported alias surface name (`publicFoo`)
may be preserved later as metadata or diagnostics, but it is not modeled as a
new symbol node in this slice.

## Rationale

- The current graph behavior takes the agent to the implementation symbol.
- A first-class alias surface node would introduce a broader
  surface-symbol-to-implementation-symbol model that affects query rendering,
  impact traversal, and future default/namespace re-export semantics.
- That broader export surface model should be designed separately instead of
  folded into guarded named symbol edge writing.

## Roadmap Impact

`1-7-2-3-2. export alias surface modeling decision (#465)` can be marked
complete as a bounded decision.

Full first-class export surface modeling remains deferred and should be promoted
through a separate plan if needed.
