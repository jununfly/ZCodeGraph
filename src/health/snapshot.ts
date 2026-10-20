/**
 * Health snapshot — reads `.zcodegraph/index.db` directly via `node:sqlite`
 * and produces the raw inputs consumed by `computeHealth()` in `rubric.ts`.
 *
 * Modeled on `src/visualize/snapshot.ts`: read-only, no CodeGraph API, no
 * LLM, no fs beyond the DB open. Deterministic — same DB → same inputs.
 */

import * as path from 'path';
import { createDatabase, SqliteDatabase } from '../db/sqlite-adapter';
import { getDatabasePath } from '../db';
import { computeHealth, HealthInputs, HealthReport } from './rubric';

/** Non-`contains` edge kinds — the cross-node coupling signal. */
const NON_CONTAINS_EDGE_KINDS = [
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
] as const;

const FUNCTION_NODE_KINDS = ['function', 'method'] as const;

const LONG_FUNCTION_LINE_THRESHOLD = 100;
const GOD_FILE_NODE_COUNT_THRESHOLD = 100;

export interface HealthScale {
  files: number;
  functions: number;
  /** Sum of `files.size` (bytes). Used as a proxy for LOC. */
  totalBytes: number;
  languages: number;
}

export interface HealthHiddenCosts {
  circularIssues: number;
  deadPct: number;
  avgCoupling: number;
}

export interface HealthSnapshot {
  projectRoot: string;
  generatedAt: number;
  report: HealthReport;
  scale: HealthScale;
  hiddenCosts: HealthHiddenCosts;
  inputs: HealthInputs;
}

interface RawFileRow {
  path: string;
  language: string;
  size: number;
  node_count: number;
}

interface RawNodeRow {
  id: string;
  kind: string;
  file_path: string;
  start_line: number;
  end_line: number;
}

interface RawEdgeRow {
  source: string;
  target: string;
  kind: string;
}

/**
 * Tarjan SCC over the file-level `imports` graph. Returns the number of
 * SCCs of size > 1 (i.e. cycles). O(V + E).
 */
function countImportCycles(
  files: string[],
  importEdges: Array<{ source: string; target: string }>,
): number {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  let sccCount = 0;

  const adj = new Map<string, string[]>();
  for (const f of files) adj.set(f, []);
  for (const e of importEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  function strongconnect(v: string): void {
    index.set(v, counter);
    lowlink.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (w === undefined) break;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) sccCount++;
    }
  }

  for (const f of files) {
    if (!index.has(f)) strongconnect(f);
  }

  return sccCount;
}

/**
 * Read the project's `.zcodegraph/index.db` and produce a health snapshot.
 *
 * The DB is opened read-only via the shared `node:sqlite` adapter. The
 * caller is responsible for ensuring the project has been indexed — we
 * throw if the DB file is missing.
 */
export function buildHealthSnapshot(projectRoot: string): HealthSnapshot {
  const dbPath = getDatabasePath(projectRoot);
  const { db } = createDatabase(dbPath);
  try {
    return buildHealthSnapshotFromDb(db, projectRoot);
  } finally {
    db.close();
  }
}

function buildHealthSnapshotFromDb(db: SqliteDatabase, projectRoot: string): HealthSnapshot {
  // ---------- Pull raw rows ----------
  const rawFiles = db
    .prepare('SELECT path, language, size, node_count FROM files ORDER BY path')
    .all() as RawFileRow[];

  const rawNodes = db
    .prepare('SELECT id, kind, file_path, start_line, end_line FROM nodes ORDER BY id')
    .all() as RawNodeRow[];

  const rawEdges = db
    .prepare('SELECT source, target, kind FROM edges ORDER BY id')
    .all() as RawEdgeRow[];

  // ---------- Scale ----------
  const filePaths = rawFiles.map((f) => f.path);
  const languageSet = new Set(rawFiles.map((f) => f.language));
  const totalBytes = rawFiles.reduce((acc, f) => acc + (f.size ?? 0), 0);

  // ---------- Function-level aggregates ----------
  const fnKinds = new Set<string>(FUNCTION_NODE_KINDS);
  const fnNodes = rawNodes.filter((n) => fnKinds.has(n.kind));
  const totalFunctions = fnNodes.length;

  // Dead functions: zero calls edges in either direction.
  const fnIds = new Set(fnNodes.map((n) => n.id));
  const calledIn = new Set<string>();
  const calledOut = new Set<string>();
  for (const e of rawEdges) {
    if (e.kind !== 'calls') continue;
    if (fnIds.has(e.target)) calledIn.add(e.target);
    if (fnIds.has(e.source)) calledOut.add(e.source);
  }
  let deadFunctions = 0;
  let longFunctions = 0;
  for (const fn of fnNodes) {
    if (!calledIn.has(fn.id) && !calledOut.has(fn.id)) deadFunctions++;
    if (fn.end_line - fn.start_line >= LONG_FUNCTION_LINE_THRESHOLD) longFunctions++;
  }

  // ---------- Circular imports (Tarjan over file-level imports graph) ----------
  // Project `imports` edges to file level via source/target node file_path.
  // We need a node-id → file_path lookup; we only care about imports edges
  // whose both endpoints resolve to a file in the files table.
  const nodeFile = new Map<string, string>();
  for (const n of rawNodes) nodeFile.set(n.id, n.file_path);

  const fileSet = new Set(filePaths);
  const importEdges: Array<{ source: string; target: string }> = [];
  for (const e of rawEdges) {
    if (e.kind !== 'imports') continue;
    const srcFile = nodeFile.get(e.source);
    const tgtFile = nodeFile.get(e.target);
    if (!srcFile || !tgtFile) continue;
    if (!fileSet.has(srcFile) || !fileSet.has(tgtFile)) continue;
    if (srcFile === tgtFile) continue; // self-import is not a cycle
    importEdges.push({ source: srcFile, target: tgtFile });
  }
  const circularIssues = countImportCycles(filePaths, importEdges);

  // ---------- God files ----------
  const godFileIssues = rawFiles.filter(
    (f) => (f.node_count ?? 0) >= GOD_FILE_NODE_COUNT_THRESHOLD,
  ).length;

  // ---------- Coupling ----------
  const nonContainsEdgeKinds = new Set<string>(NON_CONTAINS_EDGE_KINDS);
  const nonContainsEdges = rawEdges.filter((e) => nonContainsEdgeKinds.has(e.kind));
  const avgCoupling = rawFiles.length > 0 ? nonContainsEdges.length / rawFiles.length : 0;

  // ---------- Orphan nodes ----------
  // A node is an orphan when it has zero non-contains edges in either direction.
  const nonContainsTouched = new Set<string>();
  for (const e of nonContainsEdges) {
    nonContainsTouched.add(e.source);
    nonContainsTouched.add(e.target);
  }
  let orphanNodes = 0;
  for (const n of rawNodes) {
    if (!nonContainsTouched.has(n.id)) orphanNodes++;
  }

  // ---------- Build inputs + report ----------
  const inputs: HealthInputs = {
    totalFunctions,
    deadFunctions,
    circularIssues,
    godFileIssues,
    avgCoupling,
    longFunctions,
    totalNodes: rawNodes.length,
    orphanNodes,
  };

  const report = computeHealth(inputs);

  const scale: HealthScale = {
    files: rawFiles.length,
    functions: totalFunctions,
    totalBytes,
    languages: languageSet.size,
  };

  const deadPct = totalFunctions > 0 ? (deadFunctions / totalFunctions) * 100 : 0;
  const hiddenCosts: HealthHiddenCosts = {
    circularIssues,
    deadPct: Math.round(deadPct * 10) / 10,
    avgCoupling: Math.round(avgCoupling * 10) / 10,
  };

  return {
    projectRoot: path.resolve(projectRoot),
    generatedAt: Date.now(),
    report,
    scale,
    hiddenCosts,
    inputs,
  };
}
