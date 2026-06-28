# Rust-Side Framework PostExtract Protocol Plan

## Purpose

Migrate the first bounded framework `postExtract()` responsibility from the TypeScript product shell toward the Rust-owned indexing path without broadening into parse-time framework extraction, per-reference framework resolution, dynamic-dispatch synthesis, or SQLite maintenance ownership.

This is the forty-seventh cut for roadmap node `1-6-7. Framework post-extract Rust migration exploit candidate`.

## Current Production Boundary

Current TypeScript flow:

- `finalizeRustIndex()` runs `resolver.initialize()`.
- `ReferenceResolver.runPostExtract()` detects framework resolvers with `postExtract(context)`.
- Each provider returns node updates.
- The TypeScript shell persists those updates through the existing node-update path.
- Provider failures are best-effort: failures are debug-logged and do not fail indexing.

Current provider fact:

- NestJS is currently the only framework resolver with `postExtract()`.
- The production contract is still generic `FrameworkResolver.postExtract()`, not a NestJS-only contract.
- NestJS `postExtract()` rewrites route node names for `RouterModule` prefixes while preserving route node identity.

## Decisions

### Target

Build a generic Rust-side framework `postExtract` host/update protocol, with NestJS `RouterModule` route-prefix rewrites as the first default-path validation fixture.

### DB Ownership

Rust produces typed node updates. The TypeScript shell continues applying those updates through the existing node-update path.

This avoids coupling the first framework post-extract migration slice to SQLite write ownership, DB maintenance timing, and broader finalization ownership changes.

### Update Shape

The first protocol version only allows route `name` updates.

Required stable identity fields:

- `id`
- `qualifiedName`
- `kind`
- `filePath`

The TypeScript shell must validate these fields against the current graph before applying an update.

### Failure Semantics

The protocol is fail-open:

- provider errors do not fail indexing;
- unsafe or invalid updates are skipped;
- diagnostics/profile taxonomy records attempted, produced, applied, skipped, and failed counts;
- skip/failure reasons should include at least `provider-error`, `node-not-found`, `identity-mismatch`, and `unsupported-update-field`.

### Default Path

The first version runs on the default rust-hybrid path, but only for an allowlisted shape:

- provider: `nestjs`
- update kind: `route-name-prefix`
- node kind: `route`
- mutable field: `name`

All other providers and update shapes fail closed until explicitly planned.

## Scope

In scope:

- Generic Rust-side framework post-extract update protocol.
- TypeScript shell application/validation of Rust-produced updates.
- NestJS `RouterModule` route-name prefix as the first migrated provider shape.
- Preserved `id` and `qualifiedName` route updates.
- Idempotency checks.
- Route edge preservation checks.
- Profile/diagnostic counters that distinguish Rust-produced, applied, skipped, and failed updates.

Out of scope:

- Migrating parse-time framework `extract()` behavior.
- Migrating per-reference framework `resolve()` or `claimsReference()` behavior.
- Migrating dynamic-dispatch synthesis.
- Migrating DB maintenance or direct Rust DB write ownership for post-extract updates.
- General node mutation APIs.
- Additional framework providers beyond the NestJS `RouterModule` route-name prefix shape.
- Agent Sufficiency A/B evaluation unless a later issue changes route-flow connectivity enough to require it.

## Issue Split

### Issue 1: Define Rust-Side Framework PostExtract Update Protocol

Goal: add the generic contract and guardrails for Rust-produced post-extract node updates without implementing broad provider semantics.

Acceptance criteria:

- Define a typed update shape for framework post-extract updates.
- Restrict v1 updates to route `name` changes with stable identity fields.
- Add TypeScript shell validation that rejects unsupported fields, missing nodes, and identity mismatches.
- Preserve fail-open behavior with diagnostics/profile taxonomy.
- Do not change framework parse extraction, per-reference framework resolution, dynamic-dispatch synthesis, or DB maintenance ownership.

Blocked by: none.

### Issue 2: Migrate NestJS RouterModule Route Prefix PostExtract Shape

Goal: implement the first default-path Rust-produced post-extract update shape for NestJS `RouterModule` route-name prefix rewrites.

Acceptance criteria:

- Produce Rust-side updates for the allowlisted NestJS `RouterModule` route-name prefix shape.
- Apply updates through the TypeScript shell validator.
- Preserve route node `id` and `qualifiedName`.
- Preserve existing route-handler edges.
- Keep repeated indexing idempotent.
- Fail closed for unsupported framework post-extract shapes.

Blocked by: Issue 1.

### Issue 3: Close Out Framework PostExtract Migration Guardrails

Goal: prove the slice migrated one bounded post-extract shape without overclaiming framework resolver ownership.

Acceptance criteria:

- Record closeout evidence that names the migrated shape and remaining TypeScript-owned framework responsibilities.
- Ensure roadmap/status/profile wording does not imply full framework migration.
- Confirm provider failures remain fail-open and diagnosable.
- Decide whether the next framework follow-up stays under `1-6-7` or moves to a separate roadmap node.

Blocked by: Issue 2.

## Guardrails

- Do not claim full framework resolver migration.
- Do not claim full TypeScript finalization migration.
- Keep TypeScript product-shell finalization in place for all non-allowlisted post-extract behavior.
- Keep dynamic-dispatch and Agent Sufficiency risk out of this slice unless a later issue explicitly expands scope.
- Keep direct Rust DB writes out of the first protocol version.

## Closeout

Issues:

- #659 Define Rust-side framework postExtract update protocol.
- #660 Migrate NestJS RouterModule route prefix postExtract shape.
- #661 Close out framework postExtract migration guardrails.

Implemented migration shape:

- Rust core now emits typed framework post-extract update candidates through the Rust profile.
- The TypeScript product shell validates and applies those candidates through the existing node-update path.
- The only default-path allowlisted provider shape is `provider=nestjs`, `updateKind=route-name-prefix`, `nodeKind=route`, `field=name`.
- The first Rust producer generates NestJS `RouterModule` route-name prefix updates when matching module/controller/route nodes already exist in the graph.

Preserved guardrails:

- Rust does not write post-extract node updates directly to SQLite in this slice.
- v1 updates only mutate route node `name`.
- Route node `id`, `qualifiedName`, `kind`, and `filePath` must match the current graph before an update is applied.
- Existing route-handler edges remain intact because route node identity is preserved.
- Repeated finalization is idempotent: already-applied route-name updates are counted as `no-op`.
- Invalid or unsupported updates fail closed with taxonomy such as `node-not-found`, `identity-mismatch`, and `unsupported-update-field`.

Remaining TypeScript-owned responsibilities:

- Parse-time framework `extract()` behavior remains TypeScript-owned.
- Per-reference framework `resolve()` and `claimsReference()` behavior remain TypeScript-owned.
- Non-allowlisted framework post-extract providers and update shapes remain TypeScript-owned or deferred.
- Dynamic-dispatch synthesis remains outside this slice.
- DB maintenance and direct Rust DB write ownership remain outside this slice.

Next follow-up guidance:

- Additional framework post-extract provider shapes can remain under `1-6-7` if they use the same typed update protocol and name-only preserved-identity contract.
- Any broader framework resolver migration, parse-time extraction migration, or dynamic-dispatch work should use a separate roadmap node.
