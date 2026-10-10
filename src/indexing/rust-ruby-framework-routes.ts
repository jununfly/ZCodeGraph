/**
 * Ruby framework route back-fill for rust-owned indexing.
 *
 * Roadmap 1-2-6-4 (split cutover). When `ruby` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.rb`/`.rake` file is extracted by
 * the Rust core, so the TypeScript parse pipeline — the only place
 * `frameworkResolver.extract()` used to run (tree-sitter.ts framework step) —
 * never sees those files. The Rust core has no Rails route extraction (it
 * implements axum/Gin and NestJS post-extract updates only), so on the default
 * `rust-hybrid` engine 100% of Rails route nodes (explicit
 * `get '/p', to: 'articles#show'` plus the RESTful `resources`/`resource`
 * expansion into one route node per action, and the route -> handler
 * `references`) would be silently dropped.
 *
 * This mirrors `rust-csharp-framework-routes.ts` (1-2-4-4): re-run the mature,
 * regex-only TypeScript `railsResolver.extract` during hybrid finalization for
 * the `.rb` files the Rust core already indexed. It inserts only `route`
 * nodes and their unresolved references; the subsequent batched reference
 * resolution then links route -> handler (`articles#show` -> the action
 * method) exactly as on the pure TypeScript path. Baseline Ruby symbols are
 * untouched (the Rust core already wrote them), so this never re-extracts a
 * whole file. Unlike the PHP back-fill there is no shared-node hook shape:
 * Rails always uses dedicated route nodes, hence the five-field stats.
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
import { railsResolver } from '../resolution/frameworks/ruby';
import { logWarn } from '../errors';

/**
 * The single Ruby framework whose route extraction lives in the TypeScript
 * shell. Imported directly (not via {@link getAllFrameworkResolvers}) so this
 * finalization path does not pull in the full resolver registry and its
 * tree-sitter grammar dependency chain. It declares
 * `languages: ['ruby']`, and files here are already filtered to `.rb`.
 */
const RUBY_ROUTE_RESOLVERS: Record<string, FrameworkResolver> = {
  rails: railsResolver,
};

const RUBY_ROUTE_FRAMEWORKS = new Set(Object.keys(RUBY_ROUTE_RESOLVERS));

export interface RubyFrameworkRouteBackfillStats {
  /** Ruby files inspected for framework routes. */
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
 * Back-fill Rails route nodes for rust-owned Ruby files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 *
 * @param queries       Open graph database (Rust has already written baseline nodes).
 * @param projectRoot   Absolute project root; file records are stored relative to it.
 * @param frameworkNames Detected framework names (e.g. resolver.getDetectedFrameworks()).
 */
export function runRubyFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): RubyFrameworkRouteBackfillStats {
  const stats: RubyFrameworkRouteBackfillStats = {
    filesScanned: 0,
    routeNodes: 0,
    routeReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => RUBY_ROUTE_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  const resolvers = activeNames
    .map((name) => RUBY_ROUTE_RESOLVERS[name])
    .filter((r): r is FrameworkResolver => !!r && typeof r.extract === 'function');
  if (resolvers.length === 0) return stats;

  // Only `.rb` files are scanned: `railsResolver.extract` itself ignores
  // everything that does not end in `.rb` (Rakefiles/.rake carry tasks, not
  // the `Rails.application.routes.draw` route table).
  const rubyFiles = queries
    .getAllFiles()
    .filter((f) => f.language === 'ruby' && f.path.endsWith('.rb'));

  for (const file of rubyFiles) {
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
              language: ref.language ?? 'ruby',
            });
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('Ruby framework route extractor failed', {
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
