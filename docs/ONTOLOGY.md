---
doc-kind: contract
authority: primary
authority-id: ONT-docs-ontology-v1
bounded-question: What are the entity classes, attributes, relationships, and rules that govern every document under docs/?
last-reviewed: 2026-10-19
---

# ZCodeGraph Documentation Ontology v1

> Entity/attribute/relationship/rule contract for every document under
> `docs/`. Existence and content locked by `__tests__/docs-ontology.test.ts` —
> do not delete or rename without updating that test.
>
> doc-kind: design · authority: primary (ONT-docs-ontology-v1).

This document defines the **ontology** of the `docs/` tree: what kinds of
entities exist, what attributes each entity carries, how entities relate to
each other, and the rules every entity must satisfy. It replaces the
category-by-folder convention (`prds/`, `designs/`, `benchmarks/`, `zj-adr/`,
`references/`) with an entity-by-folder convention (`decisions/`, `contracts/`,
`ledgers/`, `evidence/`, `methods/`, `plans/`).

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
| **Decision** | `docs/decisions/` | `adr` | `primary` | "What architecture decision was made and why?" |
| **Contract** | `docs/contracts/` | `design` (boundary, schema, ownership, guardrail) | `primary` | "What contract must hold?" |
| **Ledger** | `docs/ledgers/` | `design` (decision-ledger, residuals-ledger, closeout) | `supporting` | "What was decided in a multi-step campaign and why?" |
| **Evidence** | `docs/evidence/` | `benchmark` (dated), `prd` (dated), `design` (dated feasibility) | `historical` | "What was true at time T?" |
| **Method** | `docs/methods/` | `reference`, `design` (playbook, sizing, parser) | `primary` or `supporting` | "How is X done?" |
| **Plan** | `docs/plans/` | `plan` | `process` | "What is the live execution plan?" (CLI SoT) |

Entity class is **load-bearing**: it determines the authority vocabulary, the
default lifecycle, and the test lock tier. Misclassifying an entity (e.g.
placing a dated benchmark under `contracts/`) is a review signal.

## Attributes

Every entity carries YAML frontmatter at the top of the file. Required
fields must be present on every entity; optional fields may be omitted when
not applicable.

### Required attributes

| Field | Type | Values |
| --- | --- | --- |
| `doc-kind` | string | one of the `doc-kind` values listed in the entity-class table |
| `authority` | string | `primary` / `supporting` / `historical` / `process` |
| `authority-id` | string | stable identifier (`ADR-XXXX`, `DES-*`, `BENCH-*`, `REF-*`, `ONT-*`); required on `primary` and `supporting` entities, omitted on `historical` |
| `bounded-question` | string | one sentence stating the question this entity answers |

### Optional attributes

| Field | Type | Purpose |
| --- | --- | --- |
| `supersedes` | list of authority-id | entity ids this entity replaces |
| `evidence-for` | list of authority-id | entity ids this entity provides evidence for |
| `decided-by` | list of roadmap-node-id | roadmap nodes whose decision produced this entity |
| `last-reviewed` | ISO date (YYYY-MM-DD) | most recent governance review date |

## Relationships

Entities are connected via the optional relationship attributes. All
relationships reference **authority-id**, never file paths — file paths may
change under `git mv`, but authority-id is stable.

- **`supersedes`** — the entity it points at is no longer normative. The
  superseding entity must carry enough context that the superseded one is
  only kept for historical traceability.
- **`evidence-for`** — the entity it points at relies on this entity's
  existence as evidence. Dated evidence points at the contract or decision
  it validates; a contract points at evidence only when the evidence is
  load-bearing for the contract's correctness.
- **`decided-by`** — the roadmap node (e.g. `1-4-1-3`) whose `decide` action
  produced this entity. Used primarily for contracts and ledgers.

## Hard Rules

The following rules are enforced by `__tests__/docs-ontology.test.ts`. They
are the only rules the test suite locks; everything else is convention.

1. **Every document under `docs/` (except `README.md` and files under
   `docs/plans/`) has YAML frontmatter** with all four required attributes.
2. **`authority-id` is unique across the entire tree.** No two entities
   share an id.
3. **Authority vocabulary is closed.** Only `primary`, `supporting`,
   `historical`, `process` are valid values for `authority`.
4. **Folder matches entity class.** A file in `docs/contracts/` has
   `doc-kind: design`; a file in `docs/decisions/` has `doc-kind: adr`;
   a file in `docs/evidence/` has `doc-kind: benchmark` or `prd`; etc.
5. **Dated evidence files (name starts with a YYYY-MM-DD prefix) have
   `authority: historical` and omit `authority-id`.** The dated filename is
   the natural identifier.
6. **`docs/plans/` is process material** (CLI SoT for roadmap-driven
   development). It is not an entity class and is exempt from frontmatter.
7. **No broken authority-id references.** Every id listed in `supersedes`,
   `evidence-for`, or `decided-by` must resolve to an existing entity.

## Lifecycle

- **Creation** — a new entity is added by writing the file under the correct
  folder, adding frontmatter, and registering it in `docs/README.md` under
  the matching entity-class section.
- **Supersede** — when an entity is replaced, the new entity lists the old
  one in `supersedes`. The old entity is kept (it becomes `historical`) and
  its `authority` is updated.
- **Deletion** — `historical` entities may be deleted only after explicit
  extraction (their normative content has been distilled into a `primary`
  or `supporting` entity). Deletion requires Human confirmation; the test
  suite locks the `primary` and `supporting` entities against accidental
  deletion.

## Out Of Scope

- The `docs/plans/` folder (process material, governed by the roadmap CLI).
- Root-level files (`AGENTS.md`, `CLAUDE.md`, `README.md`, `ZJ-CONTEXT.md`)
  — they are external entry points, not entities.
- The site/ tree (Astro-generated documentation; separate lifecycle).

## Relationship To Other Contracts

- `docs/README.md` — the **entity registry**. This file defines the rules;
  `README.md` is the index of entities that satisfy those rules.
- `docs/contracts/rust-framework-ownership-matrix-v1.md` — per-language
  framework/runtime semantics ownership. That contract governs the *code*;
  this document governs the *documentation about the code*.
- `docs/ledgers/plan-artifact-consolidated-closeout.md` — navigation for
  the process-artifact lifecycle (ADR-0005). It enumerates which artifacts
  were extracted from process files into durable ones; this document
  enumerates the rules every future extraction must satisfy.

## Change Log

- 2026-10-19 — Initial version. Replaces the category-by-folder convention
  with the entity-by-folder convention. Triggered by the ontology
  restructuring governed by `/zj-docs-ontology`.
