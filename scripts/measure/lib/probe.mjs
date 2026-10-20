/**
 * Shared SQLite probe for measurement scripts.
 *
 * Reads `.zcodegraph/index.db` directly via `node:sqlite` and exposes the
 * raw counters all three metric scripts consume. Mirrors the queries in
 * `src/health/snapshot.ts` (kept in sync by hand; both are read-only).
 *
 * Hard rules:
 *  - Read-only. No INSERT/UPDATE/DELETE.
 *  - node:sqlite only. No external deps.
 */

import { DatabaseSync } from 'node:sqlite';

const FUNCTION_KINDS = new Set(['function', 'method']);
const NON_CONTAINS_EDGE_KINDS = new Set([
  'imports',
  'calls',
  'extends',
  'implements',
  'references',
  'type_of',
  'returns',
  'instantiates',
  'overrides',
  'decorates',
]);

export function openDb(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  return db;
}

export function probeGraph(db) {
  const files = db
    .prepare('SELECT path, language, size, node_count FROM files')
    .all();
  const nodes = db
    .prepare('SELECT id, kind, file_path, start_line, end_line FROM nodes')
    .all();
  const edges = db.prepare('SELECT source, target, kind FROM edges').all();

  // Function/method counters
  const fnNodes = nodes.filter((n) => FUNCTION_KINDS.has(n.kind));
  const totalFunctions = fnNodes.length;

  const fnIds = new Set(fnNodes.map((n) => n.id));
  const calledIn = new Set();
  const calledOut = new Set();
  for (const e of edges) {
    if (e.kind !== 'calls') continue;
    if (fnIds.has(e.target)) calledIn.add(e.target);
    if (fnIds.has(e.source)) calledOut.add(e.source);
  }
  let deadFunctions = 0;
  const fnLines = [];
  for (const fn of fnNodes) {
    if (!calledIn.has(fn.id) && !calledOut.has(fn.id)) deadFunctions++;
    const lines = fn.end_line - fn.start_line;
    if (Number.isFinite(lines) && lines >= 0) fnLines.push(lines);
  }

  // Coupling
  const nonContainsEdges = edges.filter((e) => NON_CONTAINS_EDGE_KINDS.has(e.kind));
  const avgCoupling = files.length > 0 ? nonContainsEdges.length / files.length : 0;

  // Orphan nodes
  const nonContainsTouched = new Set();
  for (const e of nonContainsEdges) {
    nonContainsTouched.add(e.source);
    nonContainsTouched.add(e.target);
  }
  let orphanNodes = 0;
  for (const n of nodes) {
    if (!nonContainsTouched.has(n.id)) orphanNodes++;
  }

  return {
    files: {
      total: files.length,
      languages: new Set(files.map((f) => f.language)).size,
      totalBytes: files.reduce((acc, f) => acc + (f.size ?? 0), 0),
      godFiles: files.filter((f) => (f.node_count ?? 0) >= 100).length,
    },
    functions: {
      total: totalFunctions,
      dead: deadFunctions,
      lines: fnLines, // array of function lengths in lines
    },
    edges: {
      total: edges.length,
      nonContains: nonContainsEdges.length,
    },
    nodes: {
      total: nodes.length,
      orphans: orphanNodes,
    },
    avgCoupling,
    _raw: { files, nodes, edges }, // for metric-specific post-processing
  };
}

/** Percentile over a number array. p in [0, 100]. */
export function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, Math.min(sortedAsc.length - 1, idx))];
}
