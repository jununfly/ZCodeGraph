/**
 * PHP framework route / hook back-fill for rust-owned indexing.
 *
 * Roadmap 1-2-5-4 (split cutover). When `php` joins
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every PHP-family file (`.php`, `.module`,
 * `.install`, `.theme`, `.inc` — all classified `SourceLanguage::Php` by the
 * Rust core, see php.rs `drupal_extensions_map_to_php`) is extracted by the
 * Rust core, so the TypeScript parse pipeline — the only place
 * `frameworkResolver.extract()` used to run (tree-sitter.ts framework step) —
 * never sees those files. The Rust core has no Laravel route or Drupal hook
 * extraction (php.rs only documents that they "stay in the TypeScript shell
 * ... back-filled after the ownership cutover (1-2-5-4), exactly like the
 * C#/ASP.NET split"), so on the default `rust-hybrid` engine 100% of:
 *   - Laravel `Route::get/post/.../any` + `Route::resource/apiResource` route
 *     nodes and their route -> handler `references`, and
 *   - Drupal `hook_*` implementation references emitted from `.module` /
 *     `.install` / `.theme` / `.inc` / hook-bearing `.php` files
 * would be silently dropped.
 *
 * This mirrors `rust-csharp-framework-routes.ts` (1-2-4-4) and
 * `rust-python-framework-routes.ts` (1-6-2-4): re-run the mature, regex-only
 * TypeScript `laravelResolver` / `drupalResolver` extractors during hybrid
 * finalization for the PHP-family files the Rust core already indexed. Baseline
 * PHP symbols are untouched (the Rust core already wrote them), so this never
 * re-extracts a whole file.
 *
 * The two resolvers have DIFFERENT output shapes, so this module does not use
 * the C#/Python "reference requires a freshly inserted owning node" rule alone:
 *   - Laravel `extract()` returns NEW, exclusively-owned `route` nodes with the
 *     route -> handler reference attached to that new node. These follow the
 *     C#/Python path (deterministic route ids, delete-then-replace).
 *   - Drupal `extractDrupalHooks()` returns `nodes: []` and emits `hook_*`
 *     references whose `fromNodeId` is an EXISTING, Rust-extracted `function`
 *     node. The node id is the same scheme on both sides
 *     (`function:<sha256(filePath:function:name:line)[:32]>`, compare
 *     tree-sitter-helpers.generateNodeId and lib.rs generate_node_id), so the
 *     hook ref lands on the Rust baseline node. It must NOT be filtered out as
 *     "owner missing", and it must be cleaned up by file + `hook_` prefix
 *     (never `deleteUnresolvedByNode`, which would also erase the Rust
 *     baseline refs the function legitimately emits).
 *
 * Drupal `*.routing.yml` route nodes are NOT handled here: YAML is not a
 * rust-owned language, so those files still flow through the TypeScript
 * fallback and `drupalResolver.extract` keeps producing their route nodes on
 * the normal path. Only PHP-family files are scanned below.
 *
 * Idempotency / incremental safety:
 *  - Laravel route node ids are deterministic (`route:<file>:<line>:...`) and
 *    written with `INSERT OR REPLACE`. Before re-extracting a file we remove
 *    its previously back-filled route nodes (selected by `kind === 'route'`,
 *    never `deleteNodesByFile`, which would also erase Rust-owned baseline
 *    symbols) plus their edges and unresolved refs.
 *  - Drupal hook refs are deleted-then-replaced by (file path, `hook_` name
 *    prefix) using their unresolved rowids, so a hook removed from source stops
 *    being emitted and no orphan/duplicate hook refs survive a re-index. The
 *    Rust core never emits a `hook_*` reference name, so the prefix cannot
 *    match baseline refs.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node, UnresolvedReference } from '../types';
import type { FrameworkResolver } from '../resolution/types';
import { laravelResolver } from '../resolution/frameworks/laravel';
import { drupalResolver } from '../resolution/frameworks/drupal';
import { logWarn } from '../errors';

/**
 * The PHP frameworks whose semantic extraction lives in the TypeScript shell.
 * Imported directly (not via {@link getAllFrameworkResolvers}) so this
 * finalization path does not pull in the full resolver registry and its
 * tree-sitter grammar dependency chain. `laravel` declares `languages:
 * ['php']`; `drupal` declares `languages: ['php','yaml']` but only its PHP
 * hook branch is reached for the PHP-family files scanned here.
 */
const PHP_FRAMEWORK_RESOLVERS: Record<string, FrameworkResolver> = {
  laravel: laravelResolver,
  drupal: drupalResolver,
};

const PHP_FRAMEWORK_NAMES = new Set(Object.keys(PHP_FRAMEWORK_RESOLVERS));

/** A Drupal hook reference always targets the canonical `hook_<name>` symbol. */
const isDrupalHookReferenceName = (name: string): boolean => name.startsWith('hook_');

export interface PhpFrameworkRouteBackfillStats {
  /** PHP-family files inspected for framework routes/hooks. */
  filesScanned: number;
  /** Framework nodes inserted (Laravel route nodes), after clearing prior back-fill. */
  routeNodes: number;
  /** Laravel route -> handler unresolved references inserted. */
  routeReferences: number;
  /** Drupal hook implementation unresolved references inserted. */
  hookReferences: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

/**
 * Back-fill Laravel route nodes and Drupal hook refs for rust-owned PHP files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 *
 * @param queries       Open graph database (Rust has already written baseline nodes).
 * @param projectRoot   Absolute project root; file records are stored relative to it.
 * @param frameworkNames Detected framework names (e.g. resolver.getDetectedFrameworks()).
 */
export function runPhpFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): PhpFrameworkRouteBackfillStats {
  const stats: PhpFrameworkRouteBackfillStats = {
    filesScanned: 0,
    routeNodes: 0,
    routeReferences: 0,
    hookReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => PHP_FRAMEWORK_NAMES.has(name));
  if (activeNames.length === 0) return stats;

  const resolvers = activeNames
    .map((name) => PHP_FRAMEWORK_RESOLVERS[name])
    .filter((r): r is FrameworkResolver => !!r && typeof r.extract === 'function');
  if (resolvers.length === 0) return stats;

  // language === 'php' covers .php/.module/.install/.theme/.inc — the Rust core
  // records all five with language 'php' (proven by the wave0 fixture asserting
  // filesByLanguage.php counts a .module file).
  const phpFiles = queries.getAllFiles().filter((f) => f.language === 'php');

  for (const file of phpFiles) {
    const fullPath = path.join(projectRoot, file.path);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      stats.readErrors++;
      continue;
    }
    stats.filesScanned++;

    // (1) Laravel: remove routes previously back-filled for this file so the
    // pass is a clean replace (route deletion + incremental/--force re-runs).
    const priorRoutes = queries.getNodesByFile(file.path).filter((n) => n.kind === 'route');
    for (const prior of priorRoutes) {
      queries.deleteEdgesBySource(prior.id);
      queries.deleteUnresolvedByNode(prior.id);
      queries.deleteNode(prior.id);
    }

    // (2) Drupal: remove hook refs previously back-filled for this file. The
    // hooks attach to shared Rust function nodes, so scope the delete by file +
    // `hook_` name prefix and use unresolved rowids; never delete by node.
    const priorHookRowids = queries
      .getUnresolvedReferencesByFiles([file.path])
      .filter((ref) => isDrupalHookReferenceName(ref.referenceName))
      .map((ref) => ref.rowid)
      .filter((rowid): rowid is number => typeof rowid === 'number');
    if (priorHookRowids.length > 0) {
      queries.deleteUnresolvedReferencesByRowIds(priorHookRowids);
    }

    const newNodes: Node[] = [];
    const routeRefs: UnresolvedReference[] = [];
    const hookRefs: UnresolvedReference[] = [];

    for (const resolver of resolvers) {
      try {
        const result = resolver.extract!(file.path, content);
        for (const node of result.nodes) {
          if (node.id && node.kind && node.name && node.filePath && node.language) {
            newNodes.push(node);
          }
        }
        for (const ref of result.references) {
          const normalized: UnresolvedReference = {
            fromNodeId: ref.fromNodeId,
            referenceName: ref.referenceName,
            referenceKind: ref.referenceKind,
            line: ref.line,
            column: ref.column,
            filePath: ref.filePath ?? file.path,
            language: ref.language ?? 'php',
          };
          if (isDrupalHookReferenceName(normalized.referenceName)) {
            // Drupal hook ref: owner is an existing Rust function node.
            hookRefs.push(normalized);
          } else if (newNodes.some((n) => n.id === normalized.fromNodeId)) {
            // Laravel route -> handler ref whose owning route node is present.
            routeRefs.push(normalized);
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('PHP framework route/hook extractor failed', {
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
    if (routeRefs.length > 0) {
      queries.insertUnresolvedRefsBatch(routeRefs);
      stats.routeReferences += routeRefs.length;
    }
    if (hookRefs.length > 0) {
      queries.insertUnresolvedRefsBatch(hookRefs);
      stats.hookReferences += hookRefs.length;
    }
  }

  return stats;
}
