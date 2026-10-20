/**
 * Churn aggregation
 *
 * Pure function: takes the commit list produced by `runGitLog` / `parseGitLog`
 * and folds it into a per-file summary. No I/O, no git, no Date.now — fully
 * deterministic given the same inputs (timestamps are injected by the caller).
 */

import { ChurnCommit } from './git-log';

export interface ChurnFileStats {
  path: string;
  /** Number of commits that touched this file. */
  commits: number;
  /** Total lines added (binary entries count as 0). */
  adds: number;
  /** Total lines deleted (binary entries count as 0). */
  dels: number;
  /** adds + dels — primary "churn volume" metric. */
  totalChurn: number;
  /** Distinct authors who touched this file. */
  authors: string[];
  /** Most recent commit date (YYYY-MM-DD) touching this file. */
  lastTouched: string;
  /** True if any rename entry was observed for this path. */
  sawRename: boolean;
}

export interface ChurnReport {
  version: 1;
  generatedAt: string; // ISO timestamp, injected by caller
  repoRoot: string;
  since?: string;
  until?: string;
  totalCommits: number;
  files: ChurnFileStats[];
  summary: {
    totalFiles: number;
    totalAdds: number;
    totalDels: number;
    /** Top-K file paths by totalChurn (K = min(10, files.length)). */
    hotspots: string[];
  };
}

export interface AggregateOptions {
  repoRoot: string;
  generatedAt: string; // ISO
  since?: string;
  until?: string;
  /** Sort order; default 'churn' = by totalChurn desc, then path asc. */
  sortBy?: 'churn' | 'commits' | 'path';
}

export function aggregateChurn(
  commits: ChurnCommit[],
  options: AggregateOptions,
): ChurnReport {
  const byPath = new Map<string, {
    commits: number;
    adds: number;
    dels: number;
    authors: Set<string>;
    lastTouched: string;
    sawRename: boolean;
  }>();

  for (const commit of commits) {
    // A file may appear multiple times in the same commit's numstat in pathological
    // cases (rename + modify). We count one commit-touch per path per commit.
    const seenInCommit = new Set<string>();
    for (const f of commit.files) {
      if (seenInCommit.has(f.path)) {
        // Still accumulate adds/dels for the second entry, just don't double-count commits.
        const entry = byPath.get(f.path)!;
        entry.adds += f.adds ?? 0;
        entry.dels += f.dels ?? 0;
        continue;
      }
      seenInCommit.add(f.path);

      let entry = byPath.get(f.path);
      if (!entry) {
        entry = {
          commits: 0,
          adds: 0,
          dels: 0,
          authors: new Set(),
          lastTouched: commit.date,
          sawRename: false,
        };
        byPath.set(f.path, entry);
      }
      entry.commits += 1;
      entry.adds += f.adds ?? 0;
      entry.dels += f.dels ?? 0;
      entry.authors.add(commit.author);
      if (commit.date > entry.lastTouched) entry.lastTouched = commit.date;
      if (f.renamed) entry.sawRename = true;
    }
  }

  const files: ChurnFileStats[] = [];
  for (const [path, e] of byPath) {
    files.push({
      path,
      commits: e.commits,
      adds: e.adds,
      dels: e.dels,
      totalChurn: e.adds + e.dels,
      authors: Array.from(e.authors).sort(),
      lastTouched: e.lastTouched,
      sawRename: e.sawRename,
    });
  }

  const sortBy = options.sortBy ?? 'churn';
  files.sort((a, b) => {
    if (sortBy === 'path') return a.path.localeCompare(b.path);
    if (sortBy === 'commits') {
      if (b.commits !== a.commits) return b.commits - a.commits;
      if (b.totalChurn !== a.totalChurn) return b.totalChurn - a.totalChurn;
      return a.path.localeCompare(b.path);
    }
    // churn
    if (b.totalChurn !== a.totalChurn) return b.totalChurn - a.totalChurn;
    if (b.commits !== a.commits) return b.commits - a.commits;
    return a.path.localeCompare(b.path);
  });

  const totalAdds = files.reduce((s, f) => s + f.adds, 0);
  const totalDels = files.reduce((s, f) => s + f.dels, 0);
  const hotspots = files.slice(0, 10).map((f) => f.path);

  return {
    version: 1,
    generatedAt: options.generatedAt,
    repoRoot: options.repoRoot,
    since: options.since,
    until: options.until,
    totalCommits: commits.length,
    files,
    summary: {
      totalFiles: files.length,
      totalAdds,
      totalDels,
      hotspots,
    },
  };
}
