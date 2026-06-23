# Third-Party Package Indexing Boundary Decision

Date: 2026-06-23

Issue: #471

## Decision

`1-7-2` does not include `node_modules` expansion or third-party package symbol
indexing.

External package, runtime, and builtin imports such as:

```ts
import { map } from "lodash";
import { readFile } from "node:fs";
```

remain taxonomy-visible no-go cases for the current bounded repo-local value
graph semantics.

No package/module node, third-party symbol node, or `node_modules` graph is
introduced by this closeout.

## Rationale

- Third-party package symbol indexing belongs to the Roadmap explore subtree,
  not the repo-local graph sufficiency main subtree.
- Implementing it correctly requires broader decisions for package manager
  layout, conditional exports, `typesVersions`, symlinks, pnpm virtual stores,
  and third-party declaration/runtime relationships.
- A package metadata middle layer would still add new graph semantics without
  solving source-level symbol sufficiency.
- The safer bounded behavior is to preserve accurate taxonomy and avoid guessed
  edges.

## Roadmap Impact

`1-7-2-6-2. node_modules/third-party package indexing boundary (#471)` can be
marked complete as a boundary decision.

Full node_modules / third-party package symbol indexing remains deferred in the
explore subtree.
