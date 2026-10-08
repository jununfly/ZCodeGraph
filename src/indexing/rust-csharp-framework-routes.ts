/**
 * C# framework route back-fill for rust-owned indexing.
 *
 * Roadmap 1-2-4-4 (split cutover). When `csharp` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.cs` file is extracted by the Rust
 * core, so the TypeScript parse pipeline — the only place
 * `frameworkResolver.extract()` used to run (tree-sitter.ts framework step) —
 * never sees those files. The Rust core has no ASP.NET route extraction (it
 * implements axum/Gin and NestJS post-extract updates only), so on the default
 * `rust-hybrid` engine 100% of ASP.NET route nodes (class-level `[Route]` +
 * `[HttpGet]`/... actions and minimal-API `app.MapGet(...)`, plus the
 * route -> handler `references`) would be silently dropped.
 *
 * This mirrors `rust-python-framework-routes.ts` (1-6-2-4): re-run the mature,
 * regex-only TypeScript `aspnetResolver.extract` during hybrid finalization for
 * the `.cs` files the Rust core already indexed. It inserts only `route` nodes
 * and their unresolved references; the subsequent batched reference resolution
 * then links route -> handler exactly as on the pure TypeScript path. Baseline
 * C# symbols are untouched (the Rust core already wrote them), so this never
 * re-extracts a whole file.
 *
 * Idempotency / incremental safety:
 *  - Route node ids are deterministic (`route:<file>:<line>:...`) and are
 *    written with `INSERT OR REPLACE`.
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
import type { FrameworkResolver } from '../resolution/types';
import { aspnetResolver } from '../resolution/frameworks/csharp';
import { logWarn } from '../errors';

/**
 * The single C# framework whose route extraction lives in the TypeScript
 * shell. Imported directly (not via {@link getAllFrameworkResolvers}) so this
 * finalization path does not pull in the full resolver registry and its
 * tree-sitter grammar dependency chain. It declares
 * `languages: ['csharp']`, and files here are already filtered to `.cs`.
 */
const CSHARP_ROUTE_RESOLVERS: Record<string, FrameworkResolver> = {
  aspnet: aspnetResolver,
};

const CSHARP_ROUTE_FRAMEWORKS = new Set(Object.keys(CSHARP_ROUTE_RESOLVERS));

export interface CsharpFrameworkRouteBackfillStats {
  /** C# files inspected for framework routes. */
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
 * Back-fill ASP.NET route nodes for rust-owned C# files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 *
 * @param queries       Open graph database (Rust has already written baseline nodes).
 * @param projectRoot   Absolute project root; file records are stored relative to it.
 * @param frameworkNames Detected framework names (e.g. resolver.getDetectedFrameworks()).
 */
export function runCsharpFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): CsharpFrameworkRouteBackfillStats {
  const stats: CsharpFrameworkRouteBackfillStats = {
    filesScanned: 0,
    routeNodes: 0,
    routeReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => CSHARP_ROUTE_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  const resolvers = activeNames
    .map((name) => CSHARP_ROUTE_RESOLVERS[name])
    .filter((r): r is FrameworkResolver => !!r && typeof r.extract === 'function');
  if (resolvers.length === 0) return stats;

  const csharpFiles = queries
    .getAllFiles()
    .filter((f) => f.language === 'csharp' && f.path.endsWith('.cs'));

  for (const file of csharpFiles) {
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

    for (const resolver of resolvers) {
      try {
        const result = resolver.extract!(file.path, content);
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
              language: ref.language ?? 'csharp',
            });
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('C# framework route extractor failed', {
          framework: resolver.name,
          file: file.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
