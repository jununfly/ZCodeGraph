/**
 * Kotlin (Expo Modules) framework back-fill for rust-owned indexing.
 *
 * Roadmap 1-4-2-9 (split cutover). When `kotlin`/`swift` join
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.kt`/`.swift` file is extracted
 * by the Rust core, so the TypeScript parse pipeline — the only place
 * `expoModulesResolver.extract()` used to run — never sees those files on the
 * default `rust-hybrid` engine. The Rust core has no Expo Modules DSL
 * extraction, so on rust-hybrid 100% of Expo Module method nodes were silently
 * dropped (a JS `Camera.takePictureAsync(...)` callsite then resolved to
 * nothing, and the `expoCrossPlatformEdges` synthesizer lost both impls).
 *
 * This module re-runs the mature, regex-only TypeScript Expo Module extractor
 * (`extractExpoMethods`) during hybrid finalization, for the rust-owned
 * `.kt` AND `.swift` files (Expo Modules is a dual-platform framework — the
 * same DSL declares the JS surface on iOS Swift and Android Kotlin, and the
 * cross-platform pairing synthesizer needs BOTH sides present). It emits one
 * `method` node per `Function("X")` / `AsyncFunction("X")` / `Property("X")` /
 * `Constants("X")` literal; the standard name-matcher then resolves JS
 * `Foo.takePictureAsync(...)` to them via the existing `obj.method` ->
 * method-name path — no separate resolve() branch needed.
 *
 * (Kotlin Spring routes are handled by the shared
 * `emitSpringJavaKotlinNodes` via `rust-java-framework-routes.ts`; this
 * module only covers the Expo Modules DSL.)
 *
 * Runs in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * Idempotency / incremental safety:
 *  - Back-filled node ids carry the deterministic, back-fill-exclusive prefix
 *    `expo-module:`. Before re-extracting a file we remove only nodes with
 *    that prefix (never a whole-file wipe, which would erase Rust baseline
 *    symbols) plus their edges and unresolved refs. A clean replace handles
 *    source deletion and incremental / `--force` re-indexes.
 *  - The extractor emits no references; nothing else hangs off the nodes.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node } from '../types';
import { extractExpoMethods } from '../resolution/frameworks/expo-modules';
import { logWarn } from '../errors';

/** The only Kotlin framework whose extraction lives in the TS shell. */
const KOTLIN_FRAMEWORKS = new Set(['expo-modules']);

/** Back-fill-exclusive node id prefix (see module doc). */
const BACKFILL_NODE_PREFIXES = ['expo-module:'] as const;

export interface KotlinFrameworkRouteBackfillStats {
  /** Kotlin/Swift files inspected for framework nodes. */
  filesScanned: number;
  /** Expo Module method nodes inserted (after clearing prior back-fill). */
  frameworkNodes: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

const isBackfillNodeId = (id: string): boolean =>
  BACKFILL_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));

/**
 * Back-fill Expo Modules method nodes for rust-owned kotlin AND swift files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted nodes are visible to
 * the name-matcher in the same finalization pass.
 */
export function runKotlinFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): KotlinFrameworkRouteBackfillStats {
  const stats: KotlinFrameworkRouteBackfillStats = {
    filesScanned: 0,
    frameworkNodes: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => KOTLIN_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  // Expo Modules is dual-platform: the same DSL declares the JS surface on
  // Android Kotlin AND iOS Swift. Both are rust-owned, so scan both.
  const expoFiles = queries
    .getAllFiles()
    .filter(
      (f) =>
        (f.language === 'kotlin' && f.path.endsWith('.kt')) ||
        (f.language === 'swift' && f.path.endsWith('.swift')),
    );

  for (const file of expoFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;

    // Remove any Expo nodes previously back-filled for this file so the pass
    // is a clean replace (source deletion + incremental/--force re-runs).
    const fileNodes = queries.getNodesByFile(file.path);
    const priorBackfill = fileNodes.filter((n) => isBackfillNodeId(n.id));
    for (const prior of priorBackfill) {
      queries.deleteEdgesBySource(prior.id);
      queries.deleteUnresolvedByNode(prior.id);
      queries.deleteNode(prior.id);
    }

    const language = file.path.endsWith('.kt') ? 'kotlin' : 'swift';
    const newNodes: Node[] = [];
    try {
      for (const node of extractExpoMethods(file.path, content, language)) {
        if (node.id && node.kind && node.name && node.filePath && node.language) {
          newNodes.push(node);
        }
      }
    } catch (err) {
      stats.extractErrors++;
      logWarn('Kotlin expo-modules extractor failed', {
        framework: 'expo-modules',
        file: file.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (newNodes.length > 0) {
      queries.insertNodes(newNodes);
      stats.frameworkNodes += newNodes.length;
    }
  }

  return stats;
}
