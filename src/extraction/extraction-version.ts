/**
 * Extraction version
 *
 * A monotonically-increasing integer that identifies the *shape and depth* of
 * what the extractor writes into the graph. Unlike `CURRENT_SCHEMA_VERSION`
 * (which tracks the SQLite table layout and is migrated in place), this tracks
 * the EXTRACTED CONTENT — node kinds, edges, synthesizers, resolver coverage.
 *
 * When an index was built by an older engine whose `EXTRACTION_VERSION` is
 * below the running engine's, the data on disk is structurally fine but
 * *stale*: it's missing whatever a newer extractor would now produce. A schema
 * migration can't backfill that — only a re-index can. So this is the signal
 * `zcodegraph status` uses to recommend a re-index, and the reason `codegraph
 * upgrade` reminds users to refresh their projects.
 *
 * BUMP THIS when a release changes extraction output enough that existing
 * indexes should be rebuilt to benefit — e.g. a new language/framework
 * extractor, a new dynamic-dispatch synthesizer, a new node/edge kind, or a
 * resolver fix that materially changes which edges exist. Do NOT bump for
 * pure bug fixes, CLI/UX changes, or schema-only migrations. Over-bumping
 * turns the re-index hint into noise — keep it honest (see CLAUDE.md, "Honesty
 * in the product is load-bearing").
 *
 * Version history
 * ---------------
 * - 1: initial (last shipped in 0.11.0).
 * - 2: the unreleased Rust-owned semantic batch (#678/#692) — basename file
 *   nodes plus the C/C++ gaps G1-G4 and the Java gaps G5-G9, all shipped
 *   together while still unreleased as a single 1 -> 2 bump (no per-gap bumps);
 *   existing indexes must be re-indexed once.
 *   File nodes are named by basename (`Storage.h`) instead of the full relative
 *   path, which makes c/cpp `#include` (same-directory + include-dir), Python
 *   absolute-module, and generic file-name imports resolve the correct
 *   file-to-file `imports` edges on a Rust-owned graph (G10). Node id and
 *   `file_path` are unchanged for the file-node rename, so non-file edges are
 *   stable.
 *   C++ extraction now: names trailing-return-type free functions correctly
 *   (`auto f() -> std::string`, G1); emits `extends` edges for
 *   `base_class_clause` inheritance (G2); classifies inline in-class methods
 *   (and constructors) as `method` with a class-scoped `qualifiedName` (G3);
 *   preserves the receiver in `obj->m()`/`obj.m()` calls, promotes
 *   out-of-class `Class::method` definitions to `method`, and names
 *   `T x = expr;` declarators correctly (G4).
 *   Java extraction now: records class/method `visibility` (package-private
 *   stays NULL, G5) and method `is_static` (G6); emits `decorates` edges for
 *   marker/value annotation usages `@Name` (G7); emits `instantiates` edges
 *   for `new Foo()` / anonymous-class creation (G8); and emits `references`
 *   edges for static-value reads `Type.CONST` / `Enum.value` (G9).
 */
export const EXTRACTION_VERSION = 2;
