/**
 * Git log runner for churn analysis
 *
 * Spawns `git log --numstat` in the target repository and parses the output
 * into a structured commit list. Zero new npm dependencies — follows the
 * `execSync('git ...')` precedent in `src/bin/zcodegraph.ts` (affected --pr).
 *
 * Output format produced by git:
 *
 *     <COMMIT>sha|author|YYYY-MM-DD
 *     <added>\t<deleted>\t<path>
 *     <added>\t<deleted>\t<path>
 *     <blank line>
 *     <COMMIT>sha|author|YYYY-MM-DD
 *     ...
 *
 * Binary files appear as `-\t-\t<path>`. Renames (with `-M50%`) appear as
 * `<added>\t<deleted>\t<old> => <new>` or `<added>\t<deleted>\t<dir/>{old => new}/file`.
 */

import { execFileSync } from 'child_process';

export interface ChurnCommitFileChange {
  /** POSIX-style path, relative to repository root. Renames are normalized to the new path. */
  path: string;
  /** Lines added. `null` for binary files. */
  adds: number | null;
  /** Lines deleted. `null` for binary files. */
  dels: number | null;
  /** True when git reported this entry as a rename; `path` is already the post-rename path. */
  renamed: boolean;
}

export interface ChurnCommit {
  sha: string;
  author: string;
  /** YYYY-MM-DD (git `--date=short`). */
  date: string;
  files: ChurnCommitFileChange[];
}

export interface GitLogOptions {
  /** Passed to `git log --since`. Examples: "90d", "2026-01-01". */
  since?: string;
  /** Passed to `git log --until`. */
  until?: string;
  /** Path filters appended after `--`. Each entry is passed verbatim. */
  paths?: string[];
  /** Hard cap via `git log -n`. */
  maxCommits?: number;
}

const COMMIT_PREFIX = 'COMMIT';

/**
 * Normalize a `--since` / `--until` value into a form git accepts. Bare
 * shorthands like `90d` are NOT valid git date syntax — expand common ones
 * (`Nd`, `Nw`, `Nm`, `Ny`, `Nh`) into the equivalent "N units ago" phrasing.
 * Anything else (absolute dates, `2026-01-01`, `yesterday`, `2 weeks ago`)
 * is passed through verbatim.
 */
export function normalizeGitDate(v: string | undefined): string | undefined {
  if (!v) return v;
  const m = v.match(/^(\d+)([dwmyh])$/);
  if (!m) return v;
  const n = m[1];
  const unit = { d: 'days', w: 'weeks', m: 'months', y: 'years', h: 'hours' }[
    m[2] as 'd' | 'w' | 'm' | 'y' | 'h'
  ];
  return `${n} ${unit} ago`;
}

export function runGitLog(repoRoot: string, options: GitLogOptions = {}): ChurnCommit[] {
  const args: string[] = [
    'log',
    '--numstat',
    '--no-merges',
    '-M50%',
    `--format=${COMMIT_PREFIX}%H|%an|%ad`,
    '--date=short',
  ];
  const since = normalizeGitDate(options.since);
  const until = normalizeGitDate(options.until);
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  if (options.maxCommits && options.maxCommits > 0) {
    args.push('-n', String(options.maxCommits));
  }
  if (options.paths && options.paths.length > 0) {
    args.push('--', ...options.paths);
  }

  // Use execFileSync with an argv array (not execSync with a joined string)
  // so the Windows cmd shell does not reinterpret `|` inside `--format=...`
  // as a pipe operator.
  let out: string;
  try {
    out = execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
    }) as string;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git log failed in ${repoRoot}: ${msg}`);
  }

  return parseGitLog(out);
}

/**
 * Normalize a git numstat path field. Handles rename forms:
 *   - "old/path => new/path"
 *   - "dir/{old => new}/file.ts"
 * Returns the post-rename (new) path. Plain paths are returned as-is.
 * Always uses POSIX separators.
 */
export function normalizePathField(field: string): { path: string; renamed: boolean } {
  // dir/{old => new}/file
  const brace = field.match(/^(.*)\{(.+?) => (.+?)\}(.*)$/);
  if (brace) {
    const [, pre, , post, tail] = brace;
    return { path: `${pre ?? ''}${post ?? ''}${tail ?? ''}`, renamed: true };
  }
  // old => new
  const arrow = field.match(/^(.*?) => (.*)$/);
  if (arrow) {
    return { path: arrow[2] ?? '', renamed: true };
  }
  return { path: field, renamed: false };
}

export function parseGitLog(text: string): ChurnCommit[] {
  const commits: ChurnCommit[] = [];
  let current: ChurnCommit | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.length === 0) continue;

    if (line.startsWith(COMMIT_PREFIX)) {
      if (current) commits.push(current);
      const body = line.slice(COMMIT_PREFIX.length);
      // Author names can contain '|' in theory; split on first and last '|'.
      const firstBar = body.indexOf('|');
      const lastBar = body.lastIndexOf('|');
      if (firstBar < 0 || lastBar <= firstBar) {
        current = null;
        continue;
      }
      const sha = body.slice(0, firstBar);
      const author = body.slice(firstBar + 1, lastBar);
      const date = body.slice(lastBar + 1);
      current = { sha, author, date, files: [] };
      continue;
    }

    if (!current) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [addsRaw, delsRaw, ...rest] = parts;
    if (addsRaw == null || delsRaw == null) continue;
    const pathField = rest.join('\t'); // path can contain tabs in theory

    const { path, renamed } = normalizePathField(pathField);
    const isBinary = addsRaw === '-' || delsRaw === '-';

    current.files.push({
      path: path.replace(/\\/g, '/'),
      adds: isBinary ? null : parseInt(addsRaw, 10),
      dels: isBinary ? null : parseInt(delsRaw, 10),
      renamed,
    });
  }

  if (current) commits.push(current);
  return commits;
}
