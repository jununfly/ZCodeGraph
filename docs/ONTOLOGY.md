---
doc-kind: contract
authority: primary
authority-id: ONT-docs-ontology-v1
bounded-question: What are the entity classes, attributes, relationships, and rules that govern every document under docs/?
last-reviewed: 2026-10-28
---

# ZCodeGraph Documentation Ontology v1

> Entity/attribute/relationship/rule contract for every document under
> `docs/`. Existence and content locked by `tests/docs-ontology.test.ts` —
> do not delete or rename without updating that test.
>
> doc-kind: design · authority: primary (ONT-docs-ontology-v1).

This document defines the **ontology** of the `docs/` tree: what kinds of
entities exist, what attributes each entity carries, how entities relate to
each other, and the rules every entity must satisfy.

**Scope of `docs/`.** `docs/` carries only the repository's *current* objective
results, structure, design rationale, authoritative constraints, open TODOs,
and future plans. Machine-readable inputs consumed by tests, scripts, or CI
live in `docs/baselines/`; they are versioned assets, not document entities.
Routine measurements go to `.tmp/measure/`, review evidence stays with its
owning issue or plan closeout, and historical process material is traceable
through Git history. Current documentation must not depend on local
investigation or discussion workspaces.

## Purpose

- Make every document under `docs/` a **typed entity** with explicit
  attributes, so the map is machine-readable and drift-proof.
- Give every entity a **bounded question** so a reader knows in one line why
  the entity exists and when it should be superseded.
- Express **relationships** between entities (supersedes, evidence-for,
  decided-by) as YAML frontmatter, not as inline Markdown.
- Define a small set of **hard rules** that the test suite enforces, so
  adding a new document is a guided, machine-checked act.

## Entity Classes

Every document under `docs/` belongs to exactly one entity class. The class
is expressed both by its folder and by `doc-kind` in frontmatter.

| Entity class | Folder | doc-kind (frontmatter) | Authority range | Bounded question shape |
| --- | --- | --- | --- | --- |
| **Decision** | `docs/decisions/` | `decision` | `primary` | "What architecture decision was made and why?" |
| **Contract** | `docs/contracts/` | `contract` | `primary` | "What contract must hold?" |
| **Method** | `docs/methods/` | `method` | `primary` or `supporting` | "How is X done?" |
| **Plan** | `docs/plans/` | `plan` | `process` | "What is the live execution plan?" (CLI SoT) |

Entity class is **load-bearing**: it determines the authority vocabulary, the
default lifecycle, and the test lock tier. Misclassifying an entity (e.g.
placing a timestamped benchmark under `contracts/`) is a review signal.

### Non-entity assets

The following assets have explicit owners but are not Markdown document
entities and do not carry ontology frontmatter:

| Asset class | Location | Governance |
| --- | --- | --- |
| Versioned baseline input | `docs/baselines/` | Must have a registered consumer in tests, scripts, or CI |
| Active process plan | `docs/plans/` | Roadmap CLI owns its schema and lifecycle |
| Routine measurement output | `.tmp/measure/` | Ignored local output; never a normative source |

## Attributes

Every entity carries YAML frontmatter at the top of the file. Required
fields must be present on every entity; optional fields may be omitted when
not applicable.

### Required attributes

| Field | Type | Values |
| --- | --- | --- |
| `doc-kind` | string | one of the `doc-kind` values listed in the entity-class table |
| `authority` | string | `primary` / `supporting` / `historical` / `process` |
| `authority-id` | string | stable identifier (`ADR-XXXX`, `DES-*`, `BENCH-*`, `CON-*`, `MET-*`, `REF-*`, `ONT-*`); required on `primary` and `supporting` entities, omitted on `historical` |
| `bounded-question` | string | one sentence stating the question this entity answers |

### Optional attributes

| Field | Type | Purpose |
| --- | --- | --- |
| `supersedes` | list of authority-id | entity ids this entity replaces |
| `evidence-for` | list of authority-id | entity ids this entity provides evidence for |
| `decided-by` | list of roadmap-node-id | roadmap nodes whose decision produced this entity |
| `last-reviewed` | ISO date (YYYY-MM-DD) | most recent governance review date |
| `page-form` | `tutorial` / `reference` | shape of the page (see `zj-docs-ontology` governance contract) |
| `version` | string | contract version (e.g. `v1`); bumped on normative change |
| `roadmap-node` | string | roadmap node id whose closeout produced this entity |
| `date` | ISO date | creation or closeout date |

## Relationships

Entities are connected via the optional relationship attributes. All
relationships reference **authority-id**, never file paths — file paths may
change under `git mv`, but authority-id is stable.

- **`supersedes`** — the entity it points at is no longer normative. The
  superseding entity must carry enough context that the superseded one is
  only kept for historical traceability.
- **`evidence-for`** — the entity it points at relies on this entity's
  existence as evidence. Relationship targets are current registered entities;
  historical snapshots remain discoverable through Git history.
- **`decided-by`** — the roadmap node (e.g. `1-4-1-3`) whose `decide` action
  produced this entity. Used primarily for contracts.

## Hard Rules

The following rules are enforced by `tests/docs-ontology.test.ts`. They
are the only rules the test suite locks; everything else is convention.

1. **Every Markdown entity in `decisions/`, `contracts/`, or `methods/` has
   YAML frontmatter** with all four required attributes. `docs/README.md`,
   `docs/plans/`, and non-entity assets are exempt.
2. **`authority-id` is unique across the entire tree.** No two entities
   share an id.
3. **Authority vocabulary is closed.** Only `primary`, `supporting`,
   `historical`, `process` are valid values for `authority`.
4. **Folder matches entity class.** A file in `docs/contracts/` has
   `doc-kind: contract`; a file in `docs/decisions/` has
   `doc-kind: decision`; a file in `docs/methods/` has `doc-kind: method`.
5. **`docs/methods/` accepts either `primary` or `supporting` authority.**
   Other folders have a single allowed authority.
6. **`docs/plans/` is process material** (CLI SoT for roadmap-driven
   development). It is not an entity class and is exempt from frontmatter.
7. **No broken authority-id references.** Every id listed in `supersedes`,
   `evidence-for`, or `decided-by` must resolve to an existing entity.
8. **Frontmatter parsing must tolerate CRLF line endings.** Windows
   contributors may write files with `\r\n`; the test parser accepts both.

## Lifecycle

- **Creation** — a new entity is added by writing the file under the correct
  folder, adding frontmatter, and registering it in `docs/README.md` under
  the matching entity-class section.
- **Supersede** — when an entity is replaced, the new entity lists the old
  one in `supersedes` and carries all context needed to apply the decision.
  Retirement or relocation of the old entity requires Human confirmation.
- **Extraction** — when historical material contains a current requirement,
  distill that requirement into the appropriate registered entity under
  `docs/`. The resulting entity must stand alone; the source snapshot remains
  traceable through Git history rather than a durable local-workspace link.

## Out Of Scope

- The `docs/plans/` folder (process material, governed by the roadmap CLI).
- Root-level files (`AGENTS.md`, `CLAUDE.md`, `README.md`, `ZJ-CONTEXT.md`)
  — they are external entry points, not entities.
- Local investigation and discussion workspaces, and historical process
  snapshots recoverable from Git history. None is governed by this ontology
  or consumed by current executable assets.
- The `site/` tree (Astro-generated documentation; separate lifecycle).

## Relationship To Other Contracts

- `docs/README.md` — the **entity registry**. This file defines the rules;
  `README.md` is the index of entities that satisfy those rules.
- `docs/contracts/rust-framework-ownership-matrix-v1.md` — per-language
  framework/runtime semantics ownership. That contract governs the *code*;
  this document governs the *documentation about the code*.
- `docs/contracts/resolver-semantic-residuals-v1.md` — the self-contained
  owner of resolver semantic boundaries.
- `docs/baselines/` — versioned machine-readable inputs. These assets and
  their consumers must be registered in `docs/README.md`; they are not
  document entities or relationship targets.

## Change Log

- 2026-10-28 — **Scope narrowed to current-state docs.** Removed `Ledger`
  and `Evidence` as entity classes. Added `version`, `page-form`,
  `roadmap-node`, `date` as recognized optional attributes. Methods may be
  `primary` or `supporting`; the frontmatter parser tolerates CRLF.
  Versioned machine inputs are explicitly separated from document entities,
  and historical process material is traced through Git history.
- 2026-10-19 — Initial version. Replaced the category-by-folder convention
  with the entity-by-folder convention. Triggered by the ontology
  restructuring governed by `/zj-docs-ontology`.
