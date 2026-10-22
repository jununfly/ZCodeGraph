/**
 * Dead-code report — reads `.zcodegraph/zcodegraph.db` via `node:sqlite`,
 * feeds the rows into `evaluateDeadCode()`, and assembles the report.
 *
 * Modeled on `src/health/snapshot.ts`: read-only, no CodeGraph API, no
 * LLM. The only fs access beyond the DB open is the bounded A1
 * file-content probe (rubric amendment 2026-10-21): existence-only
 * substring match, input set bounded to paths in the `files` table.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createDatabase, SqliteDatabase } from '../db/sqlite-adapter';
import { getDatabasePath } from '../db';
import {
  countBuckets,
  DeadCodeBuckets,
  DeadCodeEdgeRow,
  DeadCodeNodeMeta,
  DeadCodeNodeRow,
  DeadCodeVerdict,
  evaluateDeadCode,
} from './rubric';

export interface DeadCodeReport {
  projectRoot: string;
  generatedAt: number;
  candidates: number;
  buckets: DeadCodeBuckets;
  unknownRatio: number;
  verdicts: DeadCodeVerdict[];
  /** Number of files skipped by path exclusions (reported, per rubric). */
  pathExcludedFunctions: number;
}

interface NodeRowFull extends DeadCodeNodeRow {
  // SELECT covers exactly the DeadCodeNodeRow fields.
}

/**
 * Read the project's index DB and produce the dead-code report.
 * Throws when the DB file is missing (project not indexed).
 */
export function buildDeadCodeReport(projectRoot: string): DeadCodeReport {
  const dbPath = getDatabasePath(projectRoot);
  const { db } = createDatabase(dbPath);
  try {
    return buildDeadCodeReportFromDb(db, projectRoot);
  } finally {
    db.close();
  }
}

/**
 * Internal hook for tests / sibling modules that already own a DB handle.
 * Callers MUST close the db themselves; we never close it here.
 */
export function buildDeadCodeReportFromDbUnsafe(
  db: SqliteDatabase,
  projectRoot: string,
): DeadCodeReport {
  return buildDeadCodeReportFromDb(db, projectRoot);
}

function buildDeadCodeReportFromDb(db: SqliteDatabase, projectRoot: string): DeadCodeReport {
  // 1-2-12-5: include Rust `import` rows as well — the extractor persists
  // `mod ... { ... }` blocks as kind='import' nodes, and the rubric's
  // cfg(test)-mod range lookup needs their line ranges. Non-candidate
  // kinds are filtered out by the rubric's candidacy check (which requires
  // kind IN function/method), so including them here is safe.
  const nodes = db
    .prepare(
      `SELECT id, kind, name, qualified_name, file_path, language,
              start_line, end_line, signature, visibility, is_exported,
              decorators
         FROM nodes
        WHERE kind IN ('function','method')
           OR (kind = 'import' AND language = 'rust')`,
    )
    .all() as unknown as NodeRowFull[];

  const allNodes = db
    // 1-2-12-4: include signature so the rubric can read an interface's
    // materialized superinterface list (`extends Repository,...`) when the
    // interface owns a candidate method (Spring Data repository signal).
    .prepare(`SELECT id, kind, name, file_path, signature FROM nodes`)
    .all() as unknown as DeadCodeNodeMeta[];

  const edges = db
    .prepare(`SELECT source, target, kind FROM edges`)
    .all() as unknown as DeadCodeEdgeRow[];

  // R1 fallback signal: resolved `decorates` edges → target leaf names.
  const decoratesBySource = new Map<string, Set<string>>();
  {
    const rows = db
      .prepare(
        `SELECT e.source AS src, tn.name AS tname
           FROM edges e JOIN nodes tn ON tn.id = e.target
          WHERE e.kind = 'decorates'`,
      )
      .all() as unknown as Array<{ src: string; tname: string }>;
    for (const r of rows) {
      if (!decoratesBySource.has(r.src)) decoratesBySource.set(r.src, new Set());
      decoratesBySource.get(r.src)!.add(String(r.tname).toLowerCase());
    }
  }

  // File-level reflection signal: imports-edge target names per file.
  const importsByFile = new Map<string, Set<string>>();
  {
    const rows = db
      .prepare(
        `SELECT n.file_path AS fp, tn.name AS tname
           FROM edges e
           JOIN nodes n ON n.id = e.source
           JOIN nodes tn ON tn.id = e.target
          WHERE e.kind = 'imports'`,
      )
      .all() as unknown as Array<{ fp: string; tname: string }>;
    for (const r of rows) {
      if (!importsByFile.has(r.fp)) importsByFile.set(r.fp, new Set());
      importsByFile.get(r.fp)!.add(String(r.tname).toLowerCase());
    }
  }

  // Indexed file set — the probe input boundary (A1 clarification).
  const indexedFiles = new Set(
    (db.prepare(`SELECT path FROM files`).all() as unknown as Array<{ path: string }>).map(
      (r) => r.path,
    ),
  );

  const root = path.resolve(projectRoot);
  const contentCache = new Map<string, string | null>();
  const readIndexedFile = (filePath: string): string | null => {
    if (contentCache.has(filePath)) return contentCache.get(filePath)!;
    let content: string | null = null;
    if (indexedFiles.has(filePath)) {
      try {
        content = fs.readFileSync(path.join(root, filePath), 'utf8');
      } catch {
        content = null; // unreadable file — probe misses, verdict unaffected
      }
    }
    contentCache.set(filePath, content);
    return content;
  };

  const probeFileContent = (filePath: string, needle: string): boolean => {
    const content = readIndexedFile(filePath);
    return content !== null && content.includes(needle);
  };

  const hasRazorSibling = (filePath: string): boolean => {
    // `Foo.razor.cs` → sibling `Foo.razor` must be an indexed file.
    const sibling = filePath.replace(/\.razor\.cs$/i, '.razor');
    return sibling !== filePath && indexedFiles.has(sibling);
  };

  // A1(a)-extended: union of all indexed `.razor` file contents. A C#
  // class whose qualified name (`Ns.Class`) appears in any razor file is
  // markup-reachable (`@inherits` / component tag). Qualified names use
  // `::` separators in the graph; razor source uses `.`.
  let razorCorpus: string | null = null;
  const razorReferencesClass = (qualifiedClassName: string): boolean => {
    if (razorCorpus === null) {
      const parts: string[] = [];
      for (const fp of indexedFiles) {
        if (fp.toLowerCase().endsWith('.razor')) {
          const c = readIndexedFile(fp);
          if (c !== null) parts.push(c);
        }
      }
      razorCorpus = parts.join('\n');
    }
    if (razorCorpus.length === 0) return false;
    // `BlazorAdmin.Helpers::ToastComponent` → probe `ToastComponent`
    // (markup uses the short name; the namespace-qualified probe is
    // `@inherits BlazorAdmin.Helpers.ToastComponent`).
    const shortName = qualifiedClassName.split('::').pop() ?? qualifiedClassName;
    return razorCorpus.includes(shortName);
  };

  const verdicts = evaluateDeadCode({
    nodes,
    edges,
    allNodes,
    decoratesBySource,
    importsByFile,
    probeFileContent,
    hasRazorSibling,
    razorReferencesClass,
  });

  // Count path-excluded function nodes for the summary line.
  const candidateIds = new Set(verdicts.map((v) => v.id));
  const pathExcludedFunctions = nodes.filter(
    (n) => !candidateIds.has(n.id),
  ).length;

  const buckets = countBuckets(verdicts);
  const total = verdicts.length;

  return {
    projectRoot: root,
    generatedAt: Date.now(),
    candidates: total,
    buckets,
    unknownRatio: total > 0 ? Math.round((buckets.unknown / total) * 1000) / 1000 : 0,
    verdicts,
    pathExcludedFunctions,
  };
}
