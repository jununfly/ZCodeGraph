/**
 * Visualize snapshot
 *
 * Reads `.zcodegraph/index.db` directly via `node:sqlite` and projects the
 * nodes/edges tables into a self-contained intermediate representation (IR)
 * that the HTML renderer embeds into the page. No CodeGraph API layer, no
 * LLM, no external service — pure local snapshot.
 *
 * Depth model (controls the node subset exported):
 *   - `file`     — only `kind='file'` nodes + edges whose both endpoints are files.
 *   - `class`    — files + container kinds (class/interface/struct/trait/protocol/enum/module/namespace).
 *   - `function` — everything (file/class/method/function/property/etc.).
 *
 * Edge projection: at every depth, we keep only edges whose `source` AND
 * `target` are both in the exported node set. `contains` edges are kept as-is
 * (they form the tree); cross-node `calls`/`imports`/… edges are also kept
 * verbatim. We deliberately do NOT aggregate or collapse — the layout
 * algorithm in Cytoscape handles visual grouping via compounds.
 */

import * as path from 'path';
import { createDatabase, SqliteDatabase } from '../db/sqlite-adapter';
import { getDatabasePath } from '../db';

export type VisualizeDepth = 'file' | 'class' | 'function';

export interface VisualizeNode {
  id: string;
  kind: string;
  name: string;
  qualifiedName: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  signature?: string | null;
  docstring?: string | null;
}

export interface VisualizeEdge {
  source: string;
  target: string;
  kind: string;
}

export interface VisualizeSnapshot {
  projectRoot: string;
  generatedAt: number;
  depth: VisualizeDepth;
  /**
   * The depth tier requested at build time, surfaced to the front-end as the
   * default selected view. The in-page view switcher maps `file` -> module,
   * `class` -> class, `function` -> function.
   */
  initialView: VisualizeDepth;
  /**
   * Depth-limited node/edge subset (legacy). `stats.exportedNodes` counts this
   * set and is what the CLI prints, so the depth regression test keeps working.
   */
  nodes: VisualizeNode[];
  edges: VisualizeEdge[];
  /**
   * Full node/edge set (everything the DB holds after filter/maxNodes), used by
   * the in-page module/class/function view switcher to re-project without a
   * server round-trip. `allNodes` is a superset of `nodes`.
   */
  allNodes: VisualizeNode[];
  allEdges: VisualizeEdge[];
  stats: {
    totalNodesInDb: number;
    totalEdgesInDb: number;
    exportedNodes: number;
    exportedEdges: number;
  };
}

const CONTAINER_KINDS = new Set([
  'class',
  'interface',
  'struct',
  'trait',
  'protocol',
  'enum',
  'module',
  'namespace',
]);

const FUNCTION_KINDS = new Set([
  'function',
  'method',
  'property',
  'field',
  'variable',
  'constant',
  'enum_member',
  'type_alias',
  'parameter',
  'import',
  'export',
  'route',
  'component',
]);

interface RawNodeRow {
  id: string;
  kind: string;
  name: string;
  qualified_name: string;
  file_path: string;
  language: string;
  start_line: number;
  end_line: number;
  signature: string | null;
  docstring: string | null;
}

interface RawEdgeRow {
  source: string;
  target: string;
  kind: string;
}

function nodeMatchesDepth(kind: string, depth: VisualizeDepth): boolean {
  if (depth === 'file') return kind === 'file';
  if (depth === 'class') return kind === 'file' || CONTAINER_KINDS.has(kind);
  // depth === 'function'
  return (
    kind === 'file' ||
    CONTAINER_KINDS.has(kind) ||
    FUNCTION_KINDS.has(kind)
  );
}

export interface SnapshotOptions {
  depth?: VisualizeDepth;
  /**
   * The view the front-end should select by default (defaults to `depth`).
   * Accepted so callers can keep the `--depth` flag as an "initial view"
   * selector while the snapshot still embeds the full node set for switching.
   */
  initialView?: VisualizeDepth;
  /**
   * Optional glob-style filter applied to `file_path`. Only `**` and `*` are
   * supported; converted to a RegExp the same way `zcodegraph affected` does.
   */
  filter?: string;
  /** Hard cap on exported nodes. Deterministic: order by id, take first N. */
  maxNodes?: number;
}

function globToRegExp(glob: string): RegExp {
  const regex = glob
    .replace(/[+[\]{}()^$|\\]/g, '\\$&')
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.+')
    .replace(/\*/g, '[^/]*');
  return new RegExp(regex);
}

/**
 * Read the project's `.zcodegraph/index.db` and produce a snapshot IR.
 *
 * The function opens the DB read-only via the shared `node:sqlite` adapter,
 * so it inherits WAL/busy_timeout behavior from the adapter. The caller is
 * responsible for ensuring the project has been indexed — we throw if the
 * DB file is missing.
 */
export function buildSnapshot(
  projectRoot: string,
  options: SnapshotOptions = {},
): VisualizeSnapshot {
  const depth: VisualizeDepth = options.depth ?? 'file';
  const initialView: VisualizeDepth = options.initialView ?? depth;
  const dbPath = getDatabasePath(projectRoot);

  const { db } = createDatabase(dbPath);
  try {
    return buildSnapshotFromDb(db, projectRoot, depth, initialView, options);
  } finally {
    db.close();
  }
}

function buildSnapshotFromDb(
  db: SqliteDatabase,
  projectRoot: string,
  depth: VisualizeDepth,
  initialView: VisualizeDepth,
  options: SnapshotOptions,
): VisualizeSnapshot {
  const totalNodesRow = db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number };
  const totalEdgesRow = db.prepare('SELECT COUNT(*) AS c FROM edges').get() as { c: number };

  // We pull the full node rows and filter in JS rather than in SQL. The
  // alternative (SQL WHERE kind IN (...)) is faster for huge projects but
  // spreads the depth model across two places; the JS filter keeps it in
  // one spot and is fast enough up to ~200k rows.
  const rawNodes = db
    .prepare(
      'SELECT id, kind, name, qualified_name, file_path, language, start_line, end_line, signature, docstring FROM nodes ORDER BY id',
    )
    .all() as RawNodeRow[];

  const filterRe = options.filter ? globToRegExp(options.filter) : null;

  // `allNodes` = the FULL set (after filter + maxNodes cap). This is what the
  // in-page module/class/function switcher re-projects without re-indexing.
  const allNodes: VisualizeNode[] = [];
  for (const row of rawNodes) {
    if (filterRe && !filterRe.test(row.file_path)) continue;
    allNodes.push({
      id: row.id,
      kind: row.kind,
      name: row.name,
      qualifiedName: row.qualified_name,
      filePath: row.file_path,
      language: row.language,
      startLine: row.start_line,
      endLine: row.end_line,
      signature: row.signature,
      docstring: row.docstring,
    });
    if (options.maxNodes && allNodes.length >= options.maxNodes) break;
  }

  // `nodes` = the depth-limited subset of `allNodes` (legacy / regression-test
  // contract: `--depth file` exports only files, `class` adds containers, etc.).
  const nodes: VisualizeNode[] = allNodes.filter((n) => nodeMatchesDepth(n.kind, depth));

  const allNodeIds = new Set(allNodes.map((n) => n.id));
  const depthNodeIds = new Set(nodes.map((n) => n.id));

  const rawEdges = db
    .prepare('SELECT source, target, kind FROM edges ORDER BY id')
    .all() as RawEdgeRow[];

  const allEdges: VisualizeEdge[] = [];
  const edges: VisualizeEdge[] = [];
  for (const e of rawEdges) {
    if (!allNodeIds.has(e.source) || !allNodeIds.has(e.target)) continue;
    allEdges.push({ source: e.source, target: e.target, kind: e.kind });
    if (depthNodeIds.has(e.source) && depthNodeIds.has(e.target)) {
      edges.push({ source: e.source, target: e.target, kind: e.kind });
    }
  }

  return {
    projectRoot: path.resolve(projectRoot),
    generatedAt: Date.now(),
    depth,
    initialView,
    nodes,
    edges,
    allNodes,
    allEdges,
    stats: {
      totalNodesInDb: Number(totalNodesRow.c),
      totalEdgesInDb: Number(totalEdgesRow.c),
      exportedNodes: nodes.length,
      exportedEdges: edges.length,
    },
  };
}
