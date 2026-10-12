/**
 * Swift framework + property-wrapper back-fill for rust-owned indexing.
 *
 * Roadmap 1-6-4-5 (Swift rust-owned cutover). When `swift` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.swift` file is extracted by the
 * Rust core (crates/zcodegraph-core/src/swift.rs), so the TypeScript parse
 * pipeline — the only place two Swift-specific behaviours used to run — never
 * sees those files on the default `rust-hybrid` engine:
 *
 *   (A) Framework `extract()` (swiftUI / UIKit / Vapor). The Rust core has no
 *       Swift framework extraction, so these nodes/references would be dropped:
 *         - swiftUI: `struct V: View`            -> `component`  (id `view:`)
 *                    `@main struct A: App`       -> `class`      (id `app:`)
 *         - uikit:   `class C: …UIViewController`-> `class`      (id `viewcontroller:`)
 *                    `class V: …UIView`          -> `class`      (id `uiview:`)
 *         - vapor:   `builder.get(…, use: h)`    -> `route`      (id `route:`)
 *                    plus the route -> handler `references`.
 *
 *   (B) In-type stored-property modelling (the special-case at
 *       tree-sitter.ts:459, which swift.rs:26-34 explicitly defers to this
 *       pass). Swift stored properties are not their own nodes, but each emits
 *       references attributed to the owning TYPE:
 *         - the property wrapper / attribute:  `@Siblings`, `@Argument`, …
 *             -> a `decorates` ref, and
 *         - a metatype in the attribute args:  `@Siblings(through: Pivot.self)`
 *             -> a `references` ref on `Pivot` (a pivot/join model reached ONLY
 *                through a relationship must not look orphaned), and
 *         - the declared type:                 `var tags: [Tag]`
 *             -> a `references` ref on `Tag`.
 *
 * This mirrors the established split-cutover back-fills
 * (rust-python/csharp/php/ruby-framework-routes.ts): re-run the mature
 * regex-only TypeScript extractors / replicate the regex-shaped walker during
 * hybrid finalization for the `.swift` files the Rust core already indexed,
 * AFTER framework detection/post-extract and BEFORE batched reference
 * resolution, so inserted unresolved refs are linked in the same pass. It is
 * regex-only on purpose (no web-tree-sitter initialisation in finalization),
 * matching the other four back-fills. Baseline Swift symbols are untouched.
 *
 * Idempotency / incremental safety:
 *  - Framework node ids carry deterministic, back-fill-exclusive prefixes
 *    (`view:`/`app:`/`viewcontroller:`/`uiview:`/`route:`). Before
 *    re-extracting a file we remove only those previously back-filled nodes
 *    (never `deleteNodesByFile`, which would erase Rust baseline symbols) plus
 *    their edges and unresolved refs (this also clears Vapor route -> handler
 *    refs, whose owner is a route node).
 *  - Property refs attach to EXISTING Rust baseline TYPE nodes (same shape as
 *    the PHP Drupal-hook refs in rust-php-framework-routes.ts). The Rust Swift
 *    walker emits ONLY `imports`/`calls`/`extends` ref kinds — never
 *    `decorates` and never generic `references` — so for a Swift file every
 *    `decorates` row, and every `references` row whose owner is a baseline
 *    type node, is provably a back-fill row. They are deleted-then-replaced by
 *    unresolved rowid (never `deleteUnresolvedByNode`, which would erase the
 *    type's Rust baseline calls/extends refs). Resolved edges use
 *    `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node, UnresolvedReference } from '../types';
import type { FrameworkResolver } from '../resolution/types';
import { swiftUIResolver, uikitResolver, vaporResolver } from '../resolution/frameworks/swift';
import { stripCommentsForRegex } from '../resolution/strip-comments';
import { logWarn } from '../errors';

/**
 * The three Swift frameworks whose semantic extraction lives in the
 * TypeScript shell. Imported directly (not via getAllFrameworkResolvers) so
 * this finalization path does not pull in the full resolver registry and its
 * tree-sitter grammar dependency chain. Each declares `languages: ['swift']`.
 */
const SWIFT_FRAMEWORK_RESOLVERS: Record<string, FrameworkResolver> = {
  swiftui: swiftUIResolver,
  uikit: uikitResolver,
  vapor: vaporResolver,
};

const SWIFT_FRAMEWORK_NAMES = new Set(Object.keys(SWIFT_FRAMEWORK_RESOLVERS));

/** Back-fill-exclusive framework node id prefixes (see module doc). */
const BACKFILL_NODE_PREFIXES = ['view:', 'app:', 'viewcontroller:', 'uiview:', 'route:'] as const;

/**
 * Rust baseline type-node kinds that can own a stored-property reference.
 * `interface` (a Swift `protocol`) is deliberately excluded: protocol
 * requirements parse as `protocol_property_declaration`, which the TS
 * special-case never walks, so they emit no refs (fidelity, not over-recall).
 */
const OWNER_TYPE_KINDS = new Set(['class', 'struct', 'enum']);

/** Method/function node kinds — their bodies hold local vars, not stored properties. */
const METHOD_KINDS = new Set(['method', 'function']);

/**
 * Swift standard-library / compiler-magic type names the TS type-annotation
 * walker would see as `type_identifier` leaves but which name no graph node
 * (mirrors the relevant entries of tree-sitter.ts BUILTIN_TYPES for Swift).
 */
const SWIFT_BUILTIN_TYPES = new Set([
  // lowercase primitives
  'void', 'self', 'nil', 'true', 'false',
  // Swift stdlib (capitalised; shared BUILTIN_TYPES already lists most)
  'Int', 'Int8', 'Int16', 'Int32', 'Int64', 'UInt', 'UInt8', 'UInt16', 'UInt32', 'UInt64',
  'Float', 'Double', 'Bool', 'Boolean', 'String', 'Character', 'StaticString',
  'Optional', 'Array', 'Set', 'Dictionary', 'ArraySlice', 'ContiguousArray',
  'Any', 'AnyObject', 'AnyHashable', 'AnyClass', 'Never', 'Void', 'Result',
  'Codable', 'Decodable', 'Encodable', 'Error', 'Identifiable', 'Sendable',
  'Task', 'TaskGroup', 'ThrowingTaskGroup', 'UnsafeContinuation',
]);

export interface SwiftFrameworkRouteBackfillStats {
  /** Swift files inspected. */
  filesScanned: number;
  /** Framework nodes inserted (component / class / route), after clearing. */
  frameworkNodes: number;
  /** Vapor route -> handler unresolved references inserted. */
  routeReferences: number;
  /** Stored-property wrapper `decorates` refs inserted (@Siblings/@Argument/…). */
  propertyDecorates: number;
  /** Stored-property declared-type `references` refs inserted. */
  propertyTypeReferences: number;
  /** Property-wrapper metatype (`Type.self` in attribute args) refs inserted. */
  propertyMetatypeReferences: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

/** A Rust baseline type node that can own stored-property refs. */
interface OwnerType {
  id: string;
  startLine: number;
  endLine: number;
}

const isBackfillNodeId = (id: string): boolean =>
  BACKFILL_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));

/** 1-based line number of a character offset into the comment-blanked source. */
const lineOfOffset = (safe: string, offset: number): number =>
  safe.slice(0, offset).split('\n').length;

/**
 * Build the attribute/modifier prefix for a stored property declared on
 * `line`, starting with the text before `(var|let)` on its own line and
 * climbing through a MULTI-LINE attribute's continuation lines. A tree-sitter
 * `modifiers` node spans e.g.
 *   @Siblings(through: Pivot.self,
 *             from: \.$a,
 *             to:   \.$b)
 *   var tags: [Tag]
 * Regex-wise the continuation lines (`from: …,` / `to: …)`) neither start with
 * `@` nor sit on the declaration line, so a single-line look-back misses the
 * metatype. Climb while a line is an attribute argument continuation (ends
 * with `,` / `)`, no declaration keyword) and stop at the line carrying the
 * `@`; bail on any declaration boundary. Returns '' when there is no attribute.
 */
function buildAttributePrefix(lines: string[], line: number, colInLine: number): string {
  let prefix = (lines[line - 1] ?? '').slice(0, colInLine);
  if (prefix.includes('@')) return prefix;

  const DECL_START = /^\s*(?:public|private|internal|fileprivate|open|final|static|class|weak|unowned|lazy|override|@objcMembers|var|let|func|struct|class|enum|protocol|extension|import|return|guard|let)\b/;
  for (let i = line - 2; i >= 0; i--) {
    const raw = lines[i] ?? '';
    const t = raw.trim();
    if (!t) break;
    if (t.startsWith('@')) {
      prefix = `${raw}\n${prefix}`;
      break;
    }
    // Attribute-argument continuation: ends in ',' or ')' and isn't a new
    // declaration / closing brace.
    const isContinuation = /[),]\s*$/.test(t) && !DECL_START.test(t) && !t.startsWith('}');
    if (!isContinuation) break;
    prefix = `${raw}\n${prefix}`;
  }

  return prefix.includes('@') ? prefix : '';
}

/**
 * For each stored-property declaration line in a file, the information needed
 * to emit its wrapper / metatype / declared-type references:
 * the 1-based line/column, the owning type, and the wrapper-prefix + type text.
 */
interface PropertyHit {
  line: number;
  column: number;
  owner: OwnerType;
  /** Text from the leading attribute(s) up to (not including) var/let. */
  wrapperPrefix: string;
  /** The declared-type expression after `:`, up to `=`/newline. */
  typeText: string;
}

/**
 * Find the innermost Rust baseline type whose body contains `line`, excluding
 * declarations that fall inside a method/function body (local `var`/`let`).
 */
function ownerForLine(
  types: OwnerType[],
  methodRanges: ReadonlyArray<{ startLine: number; endLine: number }>,
  line: number,
): OwnerType | undefined {
  if (methodRanges.some((m) => line >= m.startLine && line <= m.endLine)) return undefined;
  let best: OwnerType | undefined;
  for (const t of types) {
    if (line >= t.startLine && line <= t.endLine) {
      if (!best || (t.startLine >= best.startLine && t.endLine <= best.endLine)) best = t;
    }
  }
  return best;
}

/**
 * Regex-only scan of a comment-blanked Swift file for stored-property
 * declarations, mirroring the tree-sitter.ts:459 special case (scoped to
 * type-body stored properties here — local vars inside methods are skipped via
 * the method ranges). Returns one hit per `(var|let) name: Type` declaration.
 */
function findStoredProperties(
  safe: string,
  types: OwnerType[],
  methodRanges: ReadonlyArray<{ startLine: number; endLine: number }>,
): PropertyHit[] {
  const hits: PropertyHit[] = [];
  const lines = safe.split('\n');

  // `(var|let) name : <type>` where a type annotation is present. Only
  // declarations WITH an annotation are walked (the TS type-annotation helper
  // emits nothing without a `type_annotation` child). The type span stops at a
  // default-value `=`, a computed-property body `{` (so `var body: some View
  // { Text("hi") }` attributes only `View`, never the initializer's `Text`),
  // or newline.
  const declRegex = /\b(?:var|let)\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*[^\n={]*/g;
  let m: RegExpExecArray | null;
  while ((m = declRegex.exec(safe)) !== null) {
    const line = lineOfOffset(safe, m.index);
    const owner = ownerForLine(types, methodRanges, line);
    if (!owner) continue;

    const colInLine = m.index - safe.lastIndexOf('\n', m.index - 1) - 1;

    // Leading attribute/modifier text, spanning a single-line inline
    // `@Published public var` or a multi-line attribute's argument lines.
    const wrapperPrefix = buildAttributePrefix(lines, line, colInLine);

    // The type expression: text after the first ':' of the matched span, up to
    // a default-value `=`, computed-body `{`, or line end.
    const colonAt = m[0].indexOf(':');
    const typeText = m[0].slice(colonAt + 1);

    // Skip declarations with no attribute prefix — they still contribute
    // declared-type refs below, so only short-circuit wrapper extraction, not
    // the hit itself.
    hits.push({
      line,
      column: colInLine,
      owner,
      wrapperPrefix,
      typeText,
    });
  }

  return hits;
}

/** Capitalised non-builtin type names referenced by a declared type. */
function typeNamesFromTypeExpression(typeText: string): string[] {
  const names = typeText.match(/[A-Z][A-Za-z0-9_]*/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (SWIFT_BUILTIN_TYPES.has(name)) continue;
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** The three stored-property reference buckets, counted separately in the profile. */
interface PropertyRefBuckets {
  /** `@Wrapper` decorates refs. */
  decorates: UnresolvedReference[];
  /** Declared-type (`var x: [Tag]`) references refs. */
  typeReferences: UnresolvedReference[];
  /** Property-wrapper metatype (`@Siblings(through: Pivot.self)`) references refs. */
  metatypeReferences: UnresolvedReference[];
}

/**
 * Property-wrapper references for one stored property, split into the three
 * buckets attributed to the owning type:
 *  - one `decorates` per distinct `@Wrapper` (dot suffix / generic args stripped),
 *  - one `references` per distinct `Type.self` metatype in the attribute args,
 *  - one `references` per distinct declared type name.
 */
function buildPropertyRefs(hit: PropertyHit, filePath: string): PropertyRefBuckets {
  const buckets: PropertyRefBuckets = {
    decorates: [],
    typeReferences: [],
    metatypeReferences: [],
  };
  const mk = (
    referenceName: string,
    referenceKind: 'decorates' | 'references',
  ): UnresolvedReference => ({
    fromNodeId: hit.owner.id,
    referenceName,
    referenceKind,
    line: hit.line,
    column: hit.column,
    filePath,
    language: 'swift',
  });

  // (1) wrapper / attribute usages — `@Siblings`, `@Argument`, `@MainActor`.
  const wrappers = new Set<string>();
  const attrRegex = /@([A-Za-z_][A-Za-z0-9_.]*)/g;
  let am: RegExpExecArray | null;
  while ((am = attrRegex.exec(hit.wrapperPrefix)) !== null) {
    let name = am[1]!;
    const dot = name.lastIndexOf('.');
    if (dot >= 0) name = name.slice(dot + 1);
    wrappers.add(name);
  }
  for (const name of wrappers) buckets.decorates.push(mk(name, 'decorates'));

  // (2) metatype args in attribute arguments — `Pivot.self`, skipping
  // `.$keypath` (no capitalised head) and builtins.
  const metatypes = new Set<string>();
  const selfTypeRegex = /\b([A-Z][A-Za-z0-9_]*)\.self\b/g;
  let sm: RegExpExecArray | null;
  while ((sm = selfTypeRegex.exec(hit.wrapperPrefix)) !== null) {
    metatypes.add(sm[1]!);
  }
  for (const name of metatypes) {
    if (!SWIFT_BUILTIN_TYPES.has(name)) buckets.metatypeReferences.push(mk(name, 'references'));
  }

  // (3) declared type references.
  for (const name of typeNamesFromTypeExpression(hit.typeText)) {
    buckets.typeReferences.push(mk(name, 'references'));
  }

  return buckets;
}

/**
 * Back-fill Swift framework nodes and stored-property references for rust-owned
 * Swift files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * @param queries       Open graph database (Rust has already written baseline nodes).
 * @param projectRoot   Absolute project root; file records are stored relative to it.
 * @param frameworkNames Detected framework names (e.g. resolver.getDetectedFrameworks()).
 */
export function runSwiftFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): SwiftFrameworkRouteBackfillStats {
  const stats: SwiftFrameworkRouteBackfillStats = {
    filesScanned: 0,
    frameworkNodes: 0,
    routeReferences: 0,
    propertyDecorates: 0,
    propertyTypeReferences: 0,
    propertyMetatypeReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => SWIFT_FRAMEWORK_NAMES.has(name));
  const resolvers = activeNames
    .map((name) => SWIFT_FRAMEWORK_RESOLVERS[name])
    .filter((r): r is FrameworkResolver => !!r && typeof r.extract === 'function');

  const swiftFiles = queries
    .getAllFiles()
    .filter((f) => f.language === 'swift' && f.path.endsWith('.swift'));

  for (const file of swiftFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;
    const safe = stripCommentsForRegex(content, 'swift');

    const fileNodes = queries.getNodesByFile(file.path);

    // ---- (A) Framework node + route-handler back-fill (framework-gated) ----
    if (resolvers.length > 0) {
      // Remove previously back-filled framework nodes for this file (clean
      // replace for route deletion / incremental / --force). Deleting the
      // route node also removes its route -> handler unresolved refs.
      const priorBackfill = fileNodes.filter((n) => isBackfillNodeId(n.id));
      for (const prior of priorBackfill) {
        queries.deleteEdgesBySource(prior.id);
        queries.deleteUnresolvedByNode(prior.id);
        queries.deleteNode(prior.id);
      }

      const newNodes: Node[] = [];
      const newRefs: UnresolvedReference[] = [];
      for (const resolver of resolvers) {
        try {
          const result = resolver.extract!(file.path, content);
          for (const node of result.nodes) {
            if (node.id && node.kind && node.name && node.filePath && node.language) {
              newNodes.push(node);
            }
          }
          for (const ref of result.references) {
            if (newNodes.some((n) => n.id === ref.fromNodeId)) {
              newRefs.push({
                fromNodeId: ref.fromNodeId,
                referenceName: ref.referenceName,
                referenceKind: ref.referenceKind,
                line: ref.line,
                column: ref.column,
                filePath: ref.filePath ?? file.path,
                language: ref.language ?? 'swift',
              });
            }
          }
        } catch (err) {
          stats.extractErrors++;
          logWarn('Swift framework extractor failed', {
            framework: resolver.name,
            file: file.path,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (newNodes.length > 0) {
        queries.insertNodes(newNodes);
        stats.frameworkNodes += newNodes.length;
      }
      if (newRefs.length > 0) {
        queries.insertUnresolvedRefsBatch(newRefs);
        stats.routeReferences += newRefs.length;
      }
    }

    // ---- (B) Stored-property wrapper / metatype / type references ----
    //
    // Remove the property refs previously back-filled for this file. The Rust
    // Swift walker never emits decorates or generic references, so scoping by
    // (file, owner baseline-type node, kind) provably selects only back-fill
    // rows; the type's baseline calls/extends/imports are other kinds and are
    // left intact.
    const typeNodes: OwnerType[] = fileNodes
      .filter((n) => OWNER_TYPE_KINDS.has(n.kind))
      .map((n) => ({
        id: n.id,
        startLine: n.startLine ?? 0,
        endLine: n.endLine ?? n.startLine ?? 0,
      }));

    if (typeNodes.length > 0) {
      const typeIds = new Set(typeNodes.map((t) => t.id));
      const priorRowids = queries
        .getUnresolvedReferencesByFiles([file.path])
        .filter((ref) => typeIds.has(ref.fromNodeId))
        .filter((ref) => ref.referenceKind === 'decorates' || ref.referenceKind === 'references')
        .map((ref) => ref.rowid)
        .filter((rowid): rowid is number => typeof rowid === 'number');
      if (priorRowids.length > 0) {
        queries.deleteUnresolvedReferencesByRowIds(priorRowids);
      }

      const methodRanges = fileNodes
        .filter((n) => METHOD_KINDS.has(n.kind))
        .map((n) => ({ startLine: n.startLine ?? 0, endLine: n.endLine ?? n.startLine ?? 0 }));

      const propertyRefs: UnresolvedReference[] = [];
      let decorates = 0;
      let typeRefs = 0;
      let metatypeRefs = 0;
      for (const hit of findStoredProperties(safe, typeNodes, methodRanges)) {
        const buckets = buildPropertyRefs(hit, file.path);
        propertyRefs.push(
          ...buckets.decorates,
          ...buckets.metatypeReferences,
          ...buckets.typeReferences,
        );
        decorates += buckets.decorates.length;
        metatypeRefs += buckets.metatypeReferences.length;
        typeRefs += buckets.typeReferences.length;
      }

      if (propertyRefs.length > 0) {
        queries.insertUnresolvedRefsBatch(propertyRefs);
        stats.propertyDecorates += decorates;
        stats.propertyTypeReferences += typeRefs;
        stats.propertyMetatypeReferences += metatypeRefs;
      }
    }
  }

  return stats;
}