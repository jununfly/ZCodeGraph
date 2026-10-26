/**
 * Visualize history snapshot (1-3-6 P1-4)
 *
 * Builds a per-commit series of graph snapshots by:
 *   1. `git rev-list` the requested commit range (bounded by --since /
 *      --max-commits),
 *   2. for each commit, `git archive <sha> | tar -x` into a stable on-disk
 *      cache directory under `.zcodegraph/visualize-history/<sha>/`,
 *   3. running the standard CodeGraph pipeline (ExtractionOrchestrator +
 *      ReferenceResolver) on that extracted tree with its own DB,
 *   4. projecting the resulting nodes/edges into the same IR used by
 *      `visualize/snapshot.ts`, plus the commit metadata.
 *
 * Why `git archive` and not `git checkout`: checkout mutates the user's
 * worktree (file watcher storms, lite-sandbox interactions, loses any dirty
 * state). `git archive` is read-only against the ODB and produces a clean
 * tree we can index in isolation.
 *
 * Cache layout:
 *   <os.tmpdir()>/zcodegraph-history-<hash>/<sha>/
 *     tree/          — `git archive` extraction target
 *     .zcodegraph/   — index.db produced by the isolated run
 *   A `<sha>/.done` marker file is written after a successful index, so a
 *   re-run of `visualize --since` only indexes the commits it hasn't seen.
 *
 * The cache root is OUTSIDE the project on purpose: any path under
 * `<project>/.zcodegraph/` is walked-up-to by `resolveProjectPath` in the
 * spawned CLI subprocess, which would silently re-index the OUTER project
 * instead of the extracted tree.
 *
 * The IR mirrors `VisualizeSnapshot` but wraps it per commit and adds the
 * metadata the timeline UI needs (sha, subject, author, iso date, parents).
 * Node identity across commits is stable because the node-id scheme is
 * `kind:sha256(filePath:kind:name:line)[:32]` and the same file content at
 * the same path yields the same id in every snapshot.
 */

import { execFileSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { VisualizeDepth, VisualizeEdge, VisualizeNode } from './snapshot';

export interface HistoryCommitMeta {
  /** Full SHA. */
  sha: string;
  /** Short SHA (7 chars) for UI labels. */
  shortSha: string;
  /** First line of the commit message. */
  subject: string;
  author: string;
  /** ISO 8601 commit date. */
  date: string;
  /** Unix timestamp (seconds) for ordering. */
  timestamp: number;
  /** Parent SHAs (empty for the root commit). */
  parents: string[];
}

/**
 * Per-commit entry embedded in the rendered HTML. Carries ONLY the metadata
 * and stats — the per-commit `nodes`/`edges`/`allNodes`/`allEdges` are used
 * transiently during collection (to compute union + presence intervals) but
 * are stripped before serialisation. Embedding them would duplicate the full
 * graph N times (measured 84% of the resulting HTML on ZCodeGraph dogfood,
 * 78MB of 93MB).
 */
export interface HistoryCommitSnapshot {
  commit: HistoryCommitMeta;
  stats: {
    totalNodesInDb: number;
    totalEdgesInDb: number;
    exportedNodes: number;
    exportedEdges: number;
  };
  /** True when the index run for this commit failed; UI shows it greyed. */
  indexingFailed?: boolean;
  /** Optional failure detail for the UI tooltip. */
  error?: string;
}

/**
 * Internal-only: the full per-commit snapshot produced while collecting.
 * `buildHistorySnapshot` extracts union/presence from this and then drops it.
 */
interface CollectedCommitSnapshot extends HistoryCommitSnapshot {
  nodes: VisualizeNode[];
  edges: VisualizeEdge[];
  allNodes: VisualizeNode[];
  allEdges: VisualizeEdge[];
}

export interface VisualizeHistorySnapshot {
  projectRoot: string;
  generatedAt: number;
  depth: VisualizeDepth;
  initialView: VisualizeDepth;
  /**
   * Commits are ordered OLDEST first so the slider naturally plays forward
   * in time when the index increases.
   */
  commits: HistoryCommitSnapshot[];
  /** Union of every node id seen across all commits (for stable layout). */
  unionNodes: VisualizeNode[];
  /** Union of every edge seen across all commits. */
  unionEdges: VisualizeEdge[];
  /** Per-node first/last commit index (inclusive) for the slider to slice. */
  nodePresence: Record<string, { first: number; last: number }>;
  /** Per-edge first/last commit index (inclusive). Edge key: `s|k|t`. */
  edgePresence: Record<string, { first: number; last: number }>;
}

export interface HistoryOptions {
  /**
   * `--since` value. Either a git-recognised date ("2026-01-01", "2 weeks
   * ago") or a commit-ish ("HEAD~10", "<sha>"). Ambiguity is resolved by
   * trying `git rev-parse` first; if that succeeds we treat it as a
   * commit-ish, otherwise we pass it to `--since` verbatim.
   */
  since?: string;
  /** Hard cap on the number of commits, after the since filter. Default 10. */
  maxCommits?: number;
  /**
   * Cache directory. Defaults to `<os.tmpdir()>/zcodegraph-history-<sha1-of-project>`.
   * MUST NOT be inside `<project>/.zcodegraph/` — the spawned `index` CLI
   * walks up from its cwd looking for an initialized project, and a cache
   * under `.zcodegraph/` would trick it into re-indexing the OUTER project.
   */
  cacheDir?: string;
  /**
   * When true, reuse a cached per-commit index if `<sha>/.done` exists.
   * When false, the directory is wiped and re-indexed. Default true.
   */
  reuseCache?: boolean;
  /**
   * Optional progress callback so the CLI can render a spinner.
   * `(current, total, sha)` — `current` is 1-based.
   */
  onProgress?: (current: number, total: number, sha: string) => void;
}

const COMMIT_SEP = ''; // record separator between commits in git log

function hashProjectRoot(p: string): string {
  return createHash('sha256').update(path.resolve(p)).digest('hex').slice(0, 16);
}

/**
 * Resolve the commit list we need snapshots for. Oldest first.
 *
 * Uses `git log --format=...` (not `rev-list`) so we get subject/author/date
 * in one shot without a second round-trip per commit.
 */
function listCommits(repoRoot: string, options: HistoryOptions): HistoryCommitMeta[] {
  // We deliberately avoid `--numstat` here — we just want metadata.
  const format = ['%H', '%h', '%s', '%an', '%aI', '%at', '%P'].join('%x1f') + '%x1e';
  const args: string[] = ['log', '--no-merges', `--format=${format}`];

  // Disambiguate --since: commit-ish vs date. We try `rev-parse --verify`
  // first; if it succeeds we treat it as the INCLUSIVE start point (we want
  // the user-named commit to be part of the timeline). Otherwise we pass it
  // through as a date filter for `git log --since`.
  if (options.since) {
    let commitIsh: string | null = null;
    try {
      const out = execFileSync(
        'git',
        ['rev-parse', '--verify', '--quiet', `${options.since}^{commit}`],
        { cwd: repoRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
      ) as string;
      const sha = out.trim();
      if (sha.length > 0) commitIsh = sha;
    } catch {
      // not a commit-ish — fall through and try as date
    }
    if (commitIsh) {
      // Inclusive form: <sha>~1..HEAD includes <sha> itself. We must guard
      // the root-commit case (no parent) — if `rev-parse <sha>~1` fails we
      // fall back to listing everything up to HEAD.
      try {
        execFileSync('git', ['rev-parse', '--verify', '--quiet', `${commitIsh}~1`], {
          cwd: repoRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        });
        args.push(`${commitIsh}~1..HEAD`);
      } catch {
        // <sha> is the root commit — no parent. Listing everything up to HEAD.
        args.push('HEAD');
      }
    } else {
      args.push(`--since=${options.since}`);
    }
  }

  if (options.maxCommits && options.maxCommits > 0) {
    args.push('-n', String(options.maxCommits));
  }

  let out: string;
  try {
    out = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    }) as string;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git log failed in ${repoRoot}: ${msg}`);
  }

  const commits: HistoryCommitMeta[] = [];
  for (const rec of out.split(COMMIT_SEP)) {
    const trimmed = rec.trim();
    if (!trimmed) continue;
    const fields = trimmed.split('\x1f');
    if (fields.length < 7) continue;
    const sha = (fields[0] ?? '').trim();
    const shortSha = (fields[1] ?? '').trim();
    const subject = (fields[2] ?? '').trim();
    const author = (fields[3] ?? '').trim();
    const date = (fields[4] ?? '').trim();
    const at = (fields[5] ?? '').trim();
    const parentsRaw = (fields[6] ?? '').trim();
    if (!sha) continue;
    commits.push({
      sha,
      shortSha,
      subject,
      author,
      date,
      timestamp: parseInt(at, 10) || 0,
      parents: parentsRaw.length > 0 ? parentsRaw.split(/\s+/) : [],
    });
  }

  // `git log` returns newest-first; we want oldest-first for the timeline.
  commits.reverse();
  return commits;
}

/**
 * Materialise a commit's tree under `destDir/tree/` using `git archive`.
 * The marker file `<destDir>/.done` is NOT written here — it is the
 * caller's signal that indexing also succeeded.
 */
function extractCommitTree(repoRoot: string, sha: string, destDir: string): void {
  const treeDir = path.join(destDir, 'tree');
  fs.mkdirSync(treeDir, { recursive: true });

  // Pipe `git archive` into `tar -x`. We use spawnSync with shell:true so the
  // pipe works on Windows without hand-rolling stream plumbing. The sha is
  // validated by `git archive` itself, so injection is not a concern here.
  const cmd = `git archive "${sha}" | tar -x -C "${treeDir.replace(/\\/g, '/')}"`;
  const result = spawnSync(cmd, {
    cwd: repoRoot,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git archive failed for ${sha}: ${result.stderr || result.stdout || 'unknown error'}`,
    );
  }
}

/**
 * Index the extracted tree into its own `.zcodegraph/` database, then read
 * the snapshot back out.
 *
 * We spawn a fresh `node dist/bin/zcodegraph.js index` instead of calling
 * the API in-process so each commit pays the same isolation cost and we
 * inherit the relaunch/wasm flags in one place.
 */
function indexCommitTree(
  cliBin: string,
  treeDir: string,
): { ok: boolean; error?: string } {
  const env = {
    ...process.env,
    CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
    CODEGRAPH_NO_DAEMON: '1',
    CODEGRAPH_NO_RELAUNCH: '1',
  };
  // `index` auto-bootstraps the store on first run, then we run the resolver
  // pass implicitly. We do NOT pass --quiet so the subprocess emits the
  // standard progress lines — callers can decide whether to forward them.
  const result = spawnSync(process.execPath, [cliBin, 'index', '--quiet'], {
    cwd: treeDir,
    env,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (result.status !== 0) {
    return {
      ok: false,
      error: `index exited ${result.status}: ${result.stderr || result.stdout || ''}`.slice(0, 500),
    };
  }
  return { ok: true };
}

/**
 * Read the per-commit snapshot out of the just-built DB. We re-use the
 * existing `buildSnapshot` to keep the IR identical to single-shot
 * `visualize`.
 */
async function readSnapshotFromTree(
  treeDir: string,
  depth: VisualizeDepth,
  initialView: VisualizeDepth,
): Promise<{
  nodes: VisualizeNode[];
  edges: VisualizeEdge[];
  allNodes: VisualizeNode[];
  allEdges: VisualizeEdge[];
  stats: {
    totalNodesInDb: number;
    totalEdgesInDb: number;
    exportedNodes: number;
    exportedEdges: number;
  };
}> {
  // Lazy import so this module doesn't pull the better-sqlite3 adapter chain
  // into the CLI's cold path when --since isn't used.
  const { buildSnapshot } = await import('./snapshot');
  const snap = buildSnapshot(treeDir, { depth, initialView });
  return {
    nodes: snap.nodes,
    edges: snap.edges,
    allNodes: snap.allNodes,
    allEdges: snap.allEdges,
    stats: snap.stats,
  };
}

function edgeKey(e: VisualizeEdge): string {
  return `${e.source}|${e.kind}|${e.target}`;
}

/**
 * Build the full per-commit history snapshot.
 *
 * Throws on:
 *   - not a git repository,
 *   - `git rev-list` returning zero commits in range,
 *   - all commits failing to index.
 * Individual commit failures are captured in `indexingFailed` so the UI can
 * still render the timeline with gaps.
 */
export async function buildHistorySnapshot(
  projectRoot: string,
  cliBin: string,
  options: HistoryOptions & { depth: VisualizeDepth; initialView?: VisualizeDepth },
): Promise<VisualizeHistorySnapshot> {
  const depth = options.depth;
  const initialView = options.initialView ?? depth;
  const maxCommits = options.maxCommits && options.maxCommits > 0 ? options.maxCommits : 10;
  const reuseCache = options.reuseCache !== false;

  const commits = listCommits(projectRoot, { since: options.since, maxCommits });
  if (commits.length === 0) {
    throw new Error(
      `No commits found for --since=${options.since ?? '(none)'}. Try a wider range.`,
    );
  }

  const cacheRoot =
    options.cacheDir ??
    path.join(
      os.tmpdir(),
      `zcodegraph-history-${hashProjectRoot(projectRoot)}`,
    );
  fs.mkdirSync(cacheRoot, { recursive: true });

  // Transient: full per-commit data used to compute union + presence.
  const collected: CollectedCommitSnapshot[] = [];
  const nodePresence = new Map<string, { first: number; last: number }>();
  const edgePresence = new Map<string, { first: number; last: number }>();
  const unionNodeById = new Map<string, VisualizeNode>();
  const unionEdgeByKey = new Map<string, VisualizeEdge>();

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]!;
    const destDir = path.join(cacheRoot, commit.sha);
    const doneMarker = path.join(destDir, '.done');
    const treeDir = path.join(destDir, 'tree');

    options.onProgress?.(i + 1, commits.length, commit.sha);

    const emptyStats = {
      totalNodesInDb: 0,
      totalEdgesInDb: 0,
      exportedNodes: 0,
      exportedEdges: 0,
    };

    let snapPayload: CollectedCommitSnapshot;
    try {
      if (reuseCache && fs.existsSync(doneMarker) && fs.existsSync(treeDir)) {
        // Cache hit — skip extract + index, just re-read the snapshot.
        const s = await readSnapshotFromTree(treeDir, depth, initialView);
        snapPayload = { commit, ...s };
      } else {
        // Fresh run: wipe any partial state, extract, index, mark done.
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true });
        }
        extractCommitTree(projectRoot, commit.sha, destDir);
        const idx = indexCommitTree(cliBin, treeDir);
        if (!idx.ok) {
          snapPayload = {
            commit,
            nodes: [],
            edges: [],
            allNodes: [],
            allEdges: [],
            stats: emptyStats,
            indexingFailed: true,
            error: idx.error,
          };
        } else {
          fs.writeFileSync(doneMarker, new Date().toISOString(), 'utf-8');
          const s = await readSnapshotFromTree(treeDir, depth, initialView);
          snapPayload = { commit, ...s };
        }
      }
    } catch (err) {
      snapPayload = {
        commit,
        nodes: [],
        edges: [],
        allNodes: [],
        allEdges: [],
        stats: emptyStats,
        indexingFailed: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    collected.push(snapPayload);

    // Union + presence bookkeeping. Presence is computed against ALL nodes
    // (not just the depth-limited view) so the timeline doesn't lie when the
    // user switches views mid-playback.
    // Strip docstring/signature from the union entry: they're code-review
    // payload that the history selection panel doesn't render (timeline
    // scrubbing cares about presence/absence, not body text). Each commit
    // would otherwise repeat the same large strings.
    for (const n of snapPayload.allNodes) {
      if (!unionNodeById.has(n.id)) {
        unionNodeById.set(n.id, {
          id: n.id,
          kind: n.kind,
          name: n.name,
          qualifiedName: n.qualifiedName,
          filePath: n.filePath,
          language: n.language,
          startLine: n.startLine,
          endLine: n.endLine,
          signature: null,
          docstring: null,
        });
      }
      const p = nodePresence.get(n.id);
      if (p) p.last = i;
      else nodePresence.set(n.id, { first: i, last: i });
    }
    for (const e of snapPayload.allEdges) {
      const k = edgeKey(e);
      if (!unionEdgeByKey.has(k)) unionEdgeByKey.set(k, e);
      const p = edgePresence.get(k);
      if (p) p.last = i;
      else edgePresence.set(k, { first: i, last: i });
    }
  }

  const allFailed = collected.every((c) => c.indexingFailed);
  if (allFailed) {
    throw new Error(
      `All ${collected.length} commit snapshots failed to index. First error: ${collected[0]?.error ?? 'unknown'}`,
    );
  }

  // Strip per-commit node/edge payloads before embedding into HTML. The UI
  // reads unionNodes/unionEdges + presence intervals; commits[] keeps only
  // meta + stats + failure info. This is the size optimisation that avoids
  // duplicating the full graph N times.
  const perCommitMeta: HistoryCommitSnapshot[] = collected.map((c) => ({
    commit: c.commit,
    stats: c.stats,
    indexingFailed: c.indexingFailed,
    error: c.error,
  }));

  return {
    projectRoot: path.resolve(projectRoot),
    generatedAt: Date.now(),
    depth,
    initialView,
    commits: perCommitMeta,
    unionNodes: Array.from(unionNodeById.values()),
    unionEdges: Array.from(unionEdgeByKey.values()),
    nodePresence: Object.fromEntries(nodePresence),
    edgePresence: Object.fromEntries(edgePresence),
  };
}

/** Resolve the CLI binary path (dist/bin/zcodegraph.js) from this module. */
export function resolveCliBin(): string {
  // dist/visualize/history-snapshot.js -> dist/bin/zcodegraph.js
  const here = __dirname;
  const candidates = [
    path.join(here, '..', 'bin', 'zcodegraph.js'),
    path.join(here, '..', '..', 'dist', 'bin', 'zcodegraph.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Could not locate zcodegraph CLI binary. Searched: ${candidates.join(', ')}`,
  );
}

// Re-export os so test code can place the cache under tmpdir without an
// extra import.
export { os };
