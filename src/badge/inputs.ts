/**
 * Badge inputs — open `.zcodegraph/index.db` once, build the health report
 * (reusing `src/health/snapshot.ts`), and also fetch the total edge count
 * which the health rubric itself does not need.
 *
 * Single DB open per badge call; the snapshot module already pulls files /
 * nodes / edges, so this stays cheap even on large projects.
 */

import { createDatabase } from '../db/sqlite-adapter';
import { getDatabasePath } from '../db';
import { buildHealthSnapshotFromDbUnsafe } from '../health/snapshot';
import type { BadgeInputs } from './svg';

/**
 * Build the badge inputs for a project. Throws if the project is not
 * indexed (same contract as `zcodegraph health`).
 */
export function buildBadgeInputs(projectRoot: string): BadgeInputs {
  const dbPath = getDatabasePath(projectRoot);
  const { db } = createDatabase(dbPath);
  try {
    const snapshot = buildHealthSnapshotFromDbUnsafe(db, projectRoot);
    const totalEdgesRow = db.prepare('SELECT COUNT(*) AS c FROM edges').get() as {
      c: number;
    };
    return {
      score: snapshot.report.score,
      grade: snapshot.report.grade,
      nodes: snapshot.inputs.totalNodes,
      edges: Number(totalEdgesRow.c),
    };
  } finally {
    db.close();
  }
}
