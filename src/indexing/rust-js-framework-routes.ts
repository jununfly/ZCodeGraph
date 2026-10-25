/**
 * JavaScript/TypeScript framework route back-fill for rust-owned indexing.
 *
 * Roadmap 1-4-2-9 (split cutover). When `javascript`/`typescript` join
 * `RUST_HYBRID_RUST_OWNED_LANGUAGES`, every `.js`/`.ts`/`.tsx` file is
 * extracted by the Rust core, so the TypeScript parse pipeline — the only
 * place the JS framework resolvers' `extract()` used to run — never sees
 * those files on the default `rust-hybrid` engine. The Rust core has no
 * Express/NestJS/React/Fabric-TS extraction, so on rust-hybrid 100% of these
 * framework nodes were silently dropped.
 *
 * This module re-runs the mature, regex-only TypeScript extractors during
 * hybrid finalization, for the rust-owned JS/TS files. Four frameworks, one
 * module (mirrors the rust-php Laravel+Drupal precedent):
 *
 *   (A) express: `(app|router).METHOD('/path', handler)` -> `route` node +
 *       named-handler `references` / inline-arrow-body `calls` — via
 *       `emitExpressRouteNodes`.
 *
 *   (B) nestjs: @Controller/@Get/@Post/... + GraphQL @Resolver/@Query +
 *       microservice @MessagePattern/@EventPattern + WebSocket
 *       @SubscribeMessage -> `route` nodes + handler `references` — via
 *       `emitNestjsRouteNodes`. (The cross-file `RouterModule.register`
 *       prefix pass stays in `postExtract` and is NOT replicated here.)
 *
 *   (C) react: component/hook definitions + React Router <Route> /
 *       createBrowserRouter objects + Next.js pages routes -> `component` /
 *       `hook` / `route` nodes + component `references` — via
 *       `emitReactComponentNodes`.
 *
 *   (D) fabric-view (TS spec): `codegenNativeComponent<NativeProps>('Name')`
 *       -> `component` node + `NativeProps` interface `property` nodes — via
 *       `extractFabricNodes`.
 *
 * Runs in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution.
 *
 * Idempotency / incremental safety:
 *  - Back-filled node ids carry deterministic prefixes (`route:` /
 *    `component:` / `hook:` / `fabric-component:` / `fabric-prop:`). Before
 *    re-extracting a file we remove only nodes with those prefixes (never a
 *    whole-file wipe, which would erase Rust baseline symbols) plus their
 *    edges and unresolved refs. A clean replace handles source deletion and
 *    incremental / `--force` re-indexes.
 *  - Resolved edges use `INSERT OR IGNORE`, so a re-run cannot duplicate them.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { QueryBuilder } from '../db/queries';
import type { Node, UnresolvedReference } from '../types';
import { emitExpressRouteNodes } from '../resolution/frameworks/express';
import { emitNestjsRouteNodes } from '../resolution/frameworks/nestjs';
import { emitReactComponentNodes } from '../resolution/frameworks/react';
import { extractFabricNodes } from '../resolution/frameworks/fabric';
import { logWarn } from '../errors';

/** JS/TS frameworks whose extraction lives in the TypeScript shell. */
const JS_ROUTE_FRAMEWORKS = new Set(['express', 'nestjs', 'react', 'fabric-view']);

/** Back-fill-exclusive node id prefixes (see module doc). */
const BACKFILL_NODE_PREFIXES = [
  'route:',
  'component:',
  'hook:',
  'fabric-component:',
  'fabric-prop:',
] as const;

export interface JsFrameworkRouteBackfillStats {
  /** JS/TS files inspected for framework nodes. */
  filesScanned: number;
  /** Framework nodes inserted (routes + components + hooks + fabric). */
  frameworkNodes: number;
  /** Unresolved references inserted (route handlers + component refs). */
  frameworkReferences: number;
  /** Files skipped because their source could not be read. */
  readErrors: number;
  /** Files whose framework extractor threw. */
  extractErrors: number;
}

/**
 * A node id is a back-fill node ONLY when it matches the deterministic
 * line-anchored shape the TypeScript regex extractors emit:
 *
 *     <prefix>:<filePath>:<至少一段（行号/名称/路径片段）>
 *
 * e.g. `component:Parent.tsx:ParentWidget:2`, `route:src/app.ts:5:GET:/users`,
 * `hook:src/App.tsx:useAuth:3`.
 *
 * The Rust core emits framework-shaped node ids in the same prefix namespace
 * but with a hash payload — `<prefix>:<32-hex>` (one colon only) — for Go
 * route nodes (`route:<hash>`), Rust axum route nodes, React component nodes
 * on .tsx/.jsx, etc. Those are NOT back-fill nodes; deleting them would wipe
 * out the Rust extraction's own output (see roadmap 1-2-21 for the bug this
 * gate guards against — a `startsWith` match used to delete the Rust-side
 * component node the backfill then tried to replace, leaving the graph with
 * only the regex extractor's `start_line=end_line` line-id shell and no
 * `contains`/`calls` edges).
 *
 * Shape gate: `id.split(':')` must yield at least 3 segments AND the first
 * segment must match a known backfill prefix (so `route:abc123…` with only
 * one colon is excluded, but `route:src/app.ts:5:GET:/users` is included).
 */
const isBackfillNodeId = (id: string): boolean => {
  const segments = id.split(':');
  if (segments.length < 3) return false;
  const first = segments[0]!;
  return BACKFILL_NODE_PREFIXES.some((prefix) => `${first}:` === prefix);
};

/**
 * Back-fill Express/NestJS/React/Fabric-TS framework nodes for rust-owned
 * JS/TS files.
 *
 * Must run in `finalizeRustIndex` AFTER framework detection / post-extract and
 * BEFORE batched reference resolution, so the inserted unresolved references
 * are linked in the same finalization pass.
 */
export function runJsFrameworkRouteBackfill(
  queries: QueryBuilder,
  projectRoot: string,
  frameworkNames: readonly string[],
): JsFrameworkRouteBackfillStats {
  const stats: JsFrameworkRouteBackfillStats = {
    filesScanned: 0,
    frameworkNodes: 0,
    frameworkReferences: 0,
    readErrors: 0,
    extractErrors: 0,
  };

  const activeNames = frameworkNames.filter((name) => JS_ROUTE_FRAMEWORKS.has(name));
  if (activeNames.length === 0) return stats;

  const jsFiles = queries
    .getAllFiles()
    .filter(
      (f) =>
        (f.language === 'javascript' || f.language === 'typescript' || f.language === 'tsx') &&
        /\.(m?js|tsx?|cjs)$/.test(f.path),
    );

  for (const file of jsFiles) {
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

    // Roadmap 1-2-21 B1: the Rust core already emits a `component` node for
    // every PascalCase JSX function/arrow in this file (id is a hash under
    // the `component:` prefix). Emitting a second regex-derived component
    // node for the SAME name+file would (a) duplicate the node in the graph
    // and (b) race the synthesizer / resolver into picking either copy.
    // Skip the regex component node when the Rust core already covers it.
    // Other kinds (`route:` / `hook:` / `fabric-*`) are NOT produced by the
    // Rust core for JS/TS files, so they always flow through.
    const rustComponentNamesInFile = new Set(
      fileNodes
        .filter(
          (n) =>
            n.kind === 'component' &&
            n.id.startsWith('component:') &&
            !isBackfillNodeId(n.id),
        )
        .map((n) => n.name),
    );

    const newNodes: Node[] = [];
    const newRefs: UnresolvedReference[] = [];

    const collect = (
      framework: string,
      emit: (fp: string, src: string) => { nodes: Node[]; references: UnresolvedReference[] },
    ): void => {
      try {
        const result = emit(file.path, content);
        const emittedNodeIds = new Set<string>();
        for (const node of result.nodes) {
          if (!node.id || !node.kind || !node.name || !node.filePath || !node.language) continue;
          if (
            node.kind === 'component' &&
            rustComponentNamesInFile.has(node.name)
          ) {
            // Rust core already has this component — skip the regex duplicate.
            continue;
          }
          emittedNodeIds.add(node.id);
          newNodes.push(node);
        }
        for (const ref of result.references) {
          // Only keep refs whose source node survived the dedupe above —
          // otherwise the ref's fromNodeId dangles at resolve time.
          if (!emittedNodeIds.has(ref.fromNodeId)) continue;
          newRefs.push({
            fromNodeId: ref.fromNodeId,
            referenceName: ref.referenceName,
            referenceKind: ref.referenceKind,
            line: ref.line,
            column: ref.column,
            filePath: ref.filePath ?? file.path,
            language: ref.language ?? 'typescript',
          });
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('JS framework extractor failed', {
          framework,
          file: file.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    if (activeNames.includes('express')) collect('express', emitExpressRouteNodes);
    if (activeNames.includes('nestjs')) collect('nestjs', emitNestjsRouteNodes);
    if (activeNames.includes('react')) collect('react', emitReactComponentNodes);

    // fabric-view returns nodes only (no references).
    if (activeNames.includes('fabric-view')) {
      try {
        for (const node of extractFabricNodes(file.path, content)) {
          if (node.id && node.kind && node.name && node.filePath && node.language) {
            newNodes.push(node);
          }
        }
      } catch (err) {
        stats.extractErrors++;
        logWarn('JS fabric-view extractor failed', {
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
