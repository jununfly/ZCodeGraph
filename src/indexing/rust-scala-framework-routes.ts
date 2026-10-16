/**
 * Scala (Play) framework route back-fill for rust-owned indexing.
 *
 * Roadmap 1-4-2-9 (split cutover). When `scala` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.scala` file is extracted by the
 * Rust core, so the TypeScript parse pipeline — the only place
 * `playResolver.extract()` used to run — never sees the Play `conf/routes`
 * file on the default `rust-hybrid` engine. The Rust core has no Play route
 * extraction, so on rust-hybrid 100% of Play route nodes (and the
 * route -> `Controller.method` `references` edges) were silently dropped.
 *
 * This module re-runs the mature, regex-only TypeScript Play route extractor
 * (`emitPlayRouteNodes`) during hybrid finalization, for the rust-owned
 * `conf/routes` file. It inserts only `route` nodes and their unresolved
 * references; the subsequent batched reference resolution then links the
 * route -> handler `references` edges exactly as it does on the pure
 * TypeScript path. Baseline scala symbols are untouched (the Rust core
 * already wrote them), so this never re-extracts a whole file.
 *
 * Runs in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * Idempotency / incremental safety:
 *  - Route node ids are deterministic (`route:<file>:<line>:<METHOD>:<path>`)
 *    and are written with `INSERT OR REPLACE`.
 *  - Before re-extracting a file we remove its previously back-filled route
 *    nodes (selected by `kind === 'route'`, never `deleteNodesByFile`, which
 *    would also erase Rust-owned baseline symbols) plus their edges and
 *    unresolved refs, so route deletion in source is reflected and no orphan
 *    route rows survive an incremental sync / `--force` re-index.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node, UnresolvedReference } from '../types';
import { emitPlayRouteNodes } from '../resolution/frameworks/play';
import { logWarn } from '../errors';

/** The only Scala framework whose route extraction lives in the TS shell. */
const SCALA_ROUTE_FRAMEWORKS = new Set(['play']);

export interface ScalaFrameworkRouteBackfillStats {
  /** conf/routes files inspected for framework routes. */
  filesScanned: number;
  /** Route nodes inserted (after clearing prior back-fill for the file). */
  routeNodes: number;
  /** Unresolved route -> handler references inserted. */
  routeReferences: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

/**
 * Back-fill Play route nodes for rust-owned scala files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 */
export function runScalaFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): ScalaFrameworkRouteBackfillStats {
  const stats: ScalaFrameworkRouteBackfillStats = {
    filesScanned: 0,
    routeNodes: 0,
    routeReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => SCALA_ROUTE_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  // Play routes live in `conf/routes` (and included `conf/*.routes`). The
  // indexer tracks these as `yaml`-language files (detectLanguage maps the
  // extensionless `routes` file through the no-grammar path).
  const playRoutesFiles = queries
    .getAllFiles()
    .filter((f) => /(?:^|\/)conf\/[^/]*routes?$/.test(f.path));

  for (const file of playRoutesFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;

    // Remove any routes previously back-filled for this file so the pass is a
    // clean replace (handles route deletion and incremental/--force re-runs).
    const priorRoutes = queries.getNodesByFile(file.path).filter((n) => n.kind === 'route');
    for (const prior of priorRoutes) {
      queries.deleteEdgesBySource(prior.id);
      queries.deleteUnresolvedByNode(prior.id);
      queries.deleteNode(prior.id);
    }

    const newNodes: Node[] = [];
    const newRefs: UnresolvedReference[] = [];

    try {
      const result = emitPlayRouteNodes(file.path, content);
      for (const node of result.nodes) {
        if (node.id && node.kind && node.name && node.filePath && node.language) {
          newNodes.push(node);
        }
      }
      for (const ref of result.references) {
        // Reference is only meaningful if its owning route node is present.
        if (newNodes.some((n) => n.id === ref.fromNodeId)) {
          newRefs.push({
            fromNodeId: ref.fromNodeId,
            referenceName: ref.referenceName,
            referenceKind: ref.referenceKind,
            line: ref.line,
            column: ref.column,
            filePath: ref.filePath ?? file.path,
            language: ref.language ?? 'scala',
          });
        }
      }
    } catch (err) {
      stats.extractErrors++;
      logWarn('Scala framework route extractor failed', {
        framework: 'play',
        file: file.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (newNodes.length > 0) {
      queries.insertNodes(newNodes);
      stats.routeNodes += newNodes.length;
    }
    if (newRefs.length > 0) {
      queries.insertUnresolvedRefsBatch(newRefs);
      stats.routeReferences += newRefs.length;
    }
  }

  return stats;
}
