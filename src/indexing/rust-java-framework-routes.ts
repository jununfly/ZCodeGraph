/**
 * Java framework route back-fill for rust-owned indexing.
 *
 * Roadmap 1-4-2-9 (split cutover). When `java` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.java` file is extracted by the
 * Rust core, so the TypeScript parse pipeline — the only place
 * `springResolver.extract()` and the fabric JVM branch used to run — never
 * sees those files on the default `rust-hybrid` engine. The Rust core has no
 * Spring / Fabric-JVM extraction, so on rust-hybrid 100% of these framework
 * nodes were silently dropped.
 *
 * This module re-runs the mature, regex-only TypeScript extractors during
 * hybrid finalization, for the rust-owned `.java` files:
 *
 *   (A) spring: verb-mapping routes (@GetMapping/@PostMapping/...), method-
 *       level @RequestMapping routes, and @Value/@ConfigurationProperties
 *       config-key binding nodes + references — via `emitSpringJavaKotlinNodes`.
 *       (Spring config FILES application.yml/.properties stay on the
 *       TypeScript path — yaml/properties are deliberately not rust-owned.)
 *
 *   (B) fabric-view (JVM): @ReactProp("name") on a *Manager class ->
 *       one `component` node (id `fabric-component:`) plus one `property`
 *       node per prop (id `fabric-prop:`) — via `extractJvmViewManagerNodes`.
 *
 * Runs in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * Idempotency / incremental safety:
 *  - Back-filled node ids carry deterministic prefixes (`route:` /
 *    `spring-value:` / `spring-cp:` / `fabric-component:` / `fabric-prop:`).
 *    Before re-extracting a file we remove only nodes with those prefixes
 *    (never a whole-file wipe, which would erase Rust baseline symbols) plus
 *    their edges and unresolved refs. A clean replace handles source deletion
 *    and incremental / `--force` re-indexes.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node, UnresolvedReference } from '../types';
import { emitSpringJavaKotlinNodes } from '../resolution/frameworks/java';
import { extractJvmViewManagerNodes } from '../resolution/frameworks/fabric';
import { logWarn } from '../errors';

/** Java frameworks whose extraction lives in the TypeScript shell. */
const JAVA_ROUTE_FRAMEWORKS = new Set(['spring', 'fabric-view']);

/** Back-fill-exclusive node id prefixes (see module doc). */
const BACKFILL_NODE_PREFIXES = [
  'route:',
  'spring-value:',
  'spring-cp:',
  'fabric-component:',
  'fabric-prop:',
] as const;

export interface JavaFrameworkRouteBackfillStats {
  /** Java files inspected for framework nodes. */
  filesScanned: number;
  /** Framework nodes inserted (routes + bindings + fabric component/props). */
  frameworkNodes: number;
  /** Unresolved references inserted (route handlers + config keys). */
  frameworkReferences: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

const isBackfillNodeId = (id: string): boolean =>
  BACKFILL_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));

/**
 * Back-fill Spring + Fabric-JVM framework nodes for rust-owned java files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 */
export function runJavaFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): JavaFrameworkRouteBackfillStats {
  const stats: JavaFrameworkRouteBackfillStats = {
    filesScanned: 0,
    frameworkNodes: 0,
    frameworkReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => JAVA_ROUTE_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  const javaFiles = queries
    .getAllFiles()
    .filter((f) => f.language === 'java' && f.path.endsWith('.java'));

  for (const file of javaFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;

    // Remove any framework nodes previously back-filled for this file so the
    // pass is a clean replace (source deletion + incremental/--force re-runs).
    const fileNodes = queries.getNodesByFile(file.path);
    const priorBackfill = fileNodes.filter((n) => isBackfillNodeId(n.id));
    for (const prior of priorBackfill) {
      queries.deleteEdgesBySource(prior.id);
      queries.deleteUnresolvedByNode(prior.id);
      queries.deleteNode(prior.id);
    }

    const newNodes: Node[] = [];
    const newRefs: UnresolvedReference[] = [];

    if (activeNames.includes('spring')) {
      try {
        const result = emitSpringJavaKotlinNodes(file.path, content);
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
              language: ref.language ?? 'java',
            });
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('Java spring extractor failed', {
          framework: 'spring',
          file: file.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (activeNames.includes('fabric-view')) {
      try {
        for (const node of extractJvmViewManagerNodes(file.path, content)) {
          if (node.id && node.kind && node.name && node.filePath && node.language) {
            newNodes.push(node);
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('Java fabric-view extractor failed', {
          framework: 'fabric-view',
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
      stats.frameworkReferences += newRefs.length;
    }
  }

  return stats;
}
