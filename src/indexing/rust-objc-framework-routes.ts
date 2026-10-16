/**
 * Objective-C framework macro back-fill for rust-owned indexing.
 *
 * Roadmap 1-2-14-4 (split cutover). When `objc` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.m`/`.mm` file (plus content-
 * detected Objective-C `.h` headers) is extracted by the Rust core
 * (crates/zcodegraph-core/src/objc.rs), so the TypeScript parse pipeline — the
 * only place `frameworkResolver.extract()` used to run (tree-sitter.ts
 * framework step) — never sees those files on the default `rust-hybrid`
 * engine.
 *
 * The Rust objc walker has no awareness of the preprocessor-expanded React
 * Native registration macros (tree-sitter-objc parses them as an ERROR /
 * macro-expression, never a method/property node). Two mature, regex-only
 * TypeScript framework extractors therefore used to add nodes the Rust core
 * cannot:
 *
 *   (A) react-native-bridge:  RCT_EXPORT_MODULE / RCT_EXPORT_METHOD /
 *       RCT_REMAP_METHOD -> a `method` node per JS-callable native method
 *       (id prefix `rn-export:`). Emitted via
 *       `emitReactNativeObjcExportNodes` (1-4-1-21 retired the resolver's
 *       extract hook).
 *
 *   (B) fabric-view (legacy Paper): RCT_EXPORT_VIEW_PROPERTY /
 *       RCT_CUSTOM_VIEW_PROPERTY / RCT_REMAP_VIEW_PROPERTY on a *Manager
 *       @implementation -> one `component` node (id `fabric-component:`)
 *       plus one `property` node per view property (id `fabric-prop:`).
 *       Emitted via `extractLegacyViewManagerNodes` (1-4-1-23 retired the
 *       resolver's ObjC extract branch).
 *
 * Both extractors return NODES ONLY (no references) and are pure source-text
 * regex scans — no web-tree-sitter initialisation — so this mirrors the
 * established single-section split back-fills (rust-csharp-framework-routes.ts)
 * rather than the two-section Swift one (objc.rs already models ordinary
 * properties; there is no stored-property reference replication to do).
 *
 * The resolver `resolve()` halves are unaffected by the cutover and need no
 * back-fill: react-native-bridge.resolve redirects only JS callers and reads
 * native methods from the indexed DB (now containing these back-filled nodes),
 * and swift-objc-bridge is resolve()-only (no extract()) over ObjC method
 * nodes the Rust core writes.
 *
 * Runs in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * Idempotency / incremental safety:
 *  - Back-filled node ids carry deterministic, back-fill-exclusive prefixes
 *    (`rn-export:` / `fabric-component:` / `fabric-prop:`). Before
 *    re-extracting a file we remove only nodes with those prefixes (never a
 *    whole-file wipe, which would erase Rust baseline symbols) plus their
 *    edges and unresolved refs. A clean replace handles macro deletion and
 *    incremental / `--force` re-indexes.
 *  - These extractors emit no references; nothing else hangs off the nodes.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node } from '../types';
import { emitReactNativeObjcExportNodes } from '../resolution/frameworks/react-native';
import { extractLegacyViewManagerNodes } from '../resolution/frameworks/fabric';
import { logWarn } from '../errors';

/**
 * Node emitters for the two ObjC-touching frameworks. These used to live
 * behind `resolver.extract`; 1-4-1-21 and 1-4-1-23 retired those hooks and
 * moved the node synthesis to exported pure functions this finalization
 * pass can call directly. The resolvers' detect() names still gate whether
 * each emitter runs on this project.
 */
type ObjcFrameworkEmitter = (filePath: string, source: string) => Node[];

const OBJC_FRAMEWORK_EMITTERS: Record<string, ObjcFrameworkEmitter> = {
  'react-native-bridge': emitReactNativeObjcExportNodes,
  'fabric-view': extractLegacyViewManagerNodes,
};

const OBJC_FRAMEWORK_NAMES = new Set(Object.keys(OBJC_FRAMEWORK_EMITTERS));

/** Back-fill-exclusive node id prefixes (see module doc). */
const BACKFILL_NODE_PREFIXES = ['rn-export:', 'fabric-component:', 'fabric-prop:'] as const;

export interface ObjcFrameworkRouteBackfillStats {
  /** ObjC implementation files inspected for framework macros. */
  filesScanned: number;
  /** Framework macro nodes inserted (RN methods + Fabric component/props), after clearing. */
  frameworkNodes: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

const isBackfillNodeId = (id: string): boolean =>
  BACKFILL_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));

/**
 * Back-fill React Native / legacy-Fabric macro nodes for rust-owned ObjC
 * files. Only `.m`/`.mm` carry these registration macros (a header never
 * contains a fresh RCT_EXPORT_MODULE body), matching the extractors' own
 * `.endsWith('.m') || .endsWith('.mm')` gates.
 */
export function runObjcFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): ObjcFrameworkRouteBackfillStats {
  const stats: ObjcFrameworkRouteBackfillStats = {
    filesScanned: 0,
    frameworkNodes: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => OBJC_FRAMEWORK_NAMES.has(name));
  if (activeNames.length === 0) return stats;

  const emitters = activeNames
    .map((name) => ({ name, emit: OBJC_FRAMEWORK_EMITTERS[name]! }))
    .filter((entry) => typeof entry.emit === 'function');
  if (emitters.length === 0) return stats;

  const objcFiles = queries
    .getAllFiles()
    .filter((f) => f.language === 'objc' && (f.path.endsWith('.m') || f.path.endsWith('.mm')));

  for (const file of objcFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;

    // Remove any macro nodes previously back-filled for this file so the pass
    // is a clean replace (macro deletion + incremental/--force re-runs).
    const fileNodes = queries.getNodesByFile(file.path);
    const priorBackfill = fileNodes.filter((n) => isBackfillNodeId(n.id));
    for (const prior of priorBackfill) {
      queries.deleteEdgesBySource(prior.id);
      queries.deleteUnresolvedByNode(prior.id);
      queries.deleteNode(prior.id);
    }

    const newNodes: Node[] = [];
    for (const { name, emit } of emitters) {
      try {
        for (const node of emit(file.path, content)) {
          if (node.id && node.kind && node.name && node.filePath && node.language) {
            newNodes.push(node);
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('ObjC framework extractor failed', {
          framework: name,
          file: file.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (newNodes.length > 0) {
      queries.insertNodes(newNodes);
      stats.frameworkNodes += newNodes.length;
    }
  }

  return stats;
}
