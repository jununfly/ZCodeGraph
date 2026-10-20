/**
 * Unit tests for churn aggregation + git log parsing.
 *
 * These tests do NOT spawn git — `aggregateChurn` and `parseGitLog` are pure
 * functions over structured inputs. The end-to-end git integration is covered
 * by `tests/cli-churn.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { aggregateChurn } from '../src/churn/aggregate';
import { normalizeGitDate, normalizePathField, parseGitLog, ChurnCommit } from '../src/churn/git-log';

// Mirror of the COMMIT_PREFIX in src/churn/git-log.ts. Tests build synthetic
// git-log output and must use the same sentinel so `parseGitLog` recognizes
// commit headers. The sentinel is a C0 control char (0x1E, Record Separator)
// chosen so it can never collide with real file paths or author names.
const P = 'COMMIT';

describe('churn: normalizePathField', () => {
  it('returns plain paths as-is', () => {
    expect(normalizePathField('src/foo/bar.ts')).toEqual({
      path: 'src/foo/bar.ts',
      renamed: false,
    });
  });

  it('normalizes "old => new" renames to the new path', () => {
    expect(normalizePathField('src/old.ts => src/new.ts')).toEqual({
      path: 'src/new.ts',
      renamed: true,
    });
  });

  it('normalizes brace-form renames "dir/{old => new}/file"', () => {
    expect(normalizePathField('src/{old => new}/file.ts')).toEqual({
      path: 'src/new/file.ts',
      renamed: true,
    });
  });

  it('normalizes brace-form renames with leading and trailing segments', () => {
    expect(normalizePathField('a/b/{c => d}/e/f.ts')).toEqual({
      path: 'a/b/d/e/f.ts',
      renamed: true,
    });
  });
});

describe('churn: parseGitLog', () => {
  it('parses a multi-commit log with numstat entries', () => {
    const text = [
      `${P}abc123|Alice|2026-10-01`,
      '10\t2\tsrc/a.ts',
      '5\t0\tsrc/b.ts',
      '',
      `${P}def456|Bob|2026-10-02`,
      '3\t1\tsrc/a.ts',
      '-\t-\tbin/logo.png',
      '',
    ].join('\n');

    const commits = parseGitLog(text);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      sha: 'abc123',
      author: 'Alice',
      date: '2026-10-01',
    });
    expect(commits[0]!.files).toHaveLength(2);
    expect(commits[0]!.files[0]).toEqual({
      path: 'src/a.ts',
      adds: 10,
      dels: 2,
      renamed: false,
    });
    expect(commits[1]!.files[1]).toEqual({
      path: 'bin/logo.png',
      adds: null,
      dels: null,
      renamed: false,
    });
  });

  it('handles rename entries and converts backslashes to POSIX', () => {
    const text = [
      `${P}x|Carol|2026-10-03`,
      '2\t0\tsrc/{old => new}/file.ts',
      '1\t1\tsrc\\windows\\path.ts',
    ].join('\n');
    const commits = parseGitLog(text);
    expect(commits[0]!.files[0]).toEqual({
      path: 'src/new/file.ts',
      adds: 2,
      dels: 0,
      renamed: true,
    });
    expect(commits[0]!.files[1]!.path).toBe('src/windows/path.ts');
  });

  it('handles author names containing "|" by splitting on first/last bar', () => {
    const text = `${P}sha1|Alice|Bob|2026-10-04\n1\t1\ta.ts\n`;
    const commits = parseGitLog(text);
    expect(commits[0]!.author).toBe('Alice|Bob');
    expect(commits[0]!.date).toBe('2026-10-04');
  });
});

describe('churn: normalizeGitDate', () => {
  it('expands Nd/Nw/Nm/Ny/Nh shorthands to "N units ago"', () => {
    expect(normalizeGitDate('90d')).toBe('90 days ago');
    expect(normalizeGitDate('2w')).toBe('2 weeks ago');
    expect(normalizeGitDate('6m')).toBe('6 months ago');
    expect(normalizeGitDate('1y')).toBe('1 years ago');
    expect(normalizeGitDate('12h')).toBe('12 hours ago');
  });

  it('passes absolute dates and natural language through verbatim', () => {
    expect(normalizeGitDate('2026-01-01')).toBe('2026-01-01');
    expect(normalizeGitDate('yesterday')).toBe('yesterday');
    expect(normalizeGitDate('2 weeks ago')).toBe('2 weeks ago');
  });

  it('returns undefined for undefined', () => {
    expect(normalizeGitDate(undefined)).toBeUndefined();
  });
});

describe('churn: aggregateChurn', () => {
  const baseOptions = {
    repoRoot: '/repo',
    generatedAt: '2026-10-20T00:00:00.000Z',
  };

  it('aggregates adds/dels/commits per file and sorts by churn desc', () => {
    const commits: ChurnCommit[] = [
      {
        sha: 'c1',
        author: 'Alice',
        date: '2026-10-01',
        files: [
          { path: 'src/a.ts', adds: 10, dels: 2, renamed: false },
          { path: 'src/b.ts', adds: 1, dels: 0, renamed: false },
        ],
      },
      {
        sha: 'c2',
        author: 'Bob',
        date: '2026-10-02',
        files: [
          { path: 'src/a.ts', adds: 5, dels: 3, renamed: false },
          { path: 'src/c.ts', adds: 0, dels: 0, renamed: false }, // binary
        ],
      },
      {
        sha: 'c3',
        author: 'Alice',
        date: '2026-10-03',
        files: [{ path: 'src/a.ts', adds: 1, dels: 1, renamed: false }],
      },
    ];

    const report = aggregateChurn(commits, baseOptions);
    expect(report.version).toBe(1);
    expect(report.totalCommits).toBe(3);
    expect(report.summary.totalFiles).toBe(3);
    expect(report.summary.totalAdds).toBe(17);
    expect(report.summary.totalDels).toBe(6);

    // Sorted by totalChurn desc: a (16+8=24? no: 10+2+5+3+1+1=22), b(1), c(0)
    expect(report.files.map((f) => f.path)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    const a = report.files[0]!;
    expect(a.commits).toBe(3);
    expect(a.adds).toBe(16);
    expect(a.dels).toBe(6);
    expect(a.totalChurn).toBe(22);
    expect(a.authors).toEqual(['Alice', 'Bob']);
    expect(a.lastTouched).toBe('2026-10-03');
  });

  it('counts binary entries as zero churn but still records the commit touch', () => {
    const commits: ChurnCommit[] = [
      {
        sha: 'c1',
        author: 'Alice',
        date: '2026-10-01',
        files: [{ path: 'bin/logo.png', adds: null, dels: null, renamed: false }],
      },
    ];
    const report = aggregateChurn(commits, baseOptions);
    expect(report.files[0]).toMatchObject({
      path: 'bin/logo.png',
      commits: 1,
      adds: 0,
      dels: 0,
      totalChurn: 0,
    });
  });

  it('deduplicates commit-touch when the same path appears twice in one commit', () => {
    const commits: ChurnCommit[] = [
      {
        sha: 'c1',
        author: 'Alice',
        date: '2026-10-01',
        files: [
          { path: 'src/a.ts', adds: 1, dels: 0, renamed: false },
          { path: 'src/a.ts', adds: 2, dels: 0, renamed: false },
        ],
      },
    ];
    const report = aggregateChurn(commits, baseOptions);
    expect(report.files[0]!.commits).toBe(1);
    expect(report.files[0]!.adds).toBe(3);
  });

  it('supports sort=commits and sort=path', () => {
    const commits: ChurnCommit[] = [
      {
        sha: 'c1',
        author: 'A',
        date: '2026-10-01',
        files: [{ path: 'b.ts', adds: 100, dels: 0, renamed: false }],
      },
      {
        sha: 'c2',
        author: 'A',
        date: '2026-10-02',
        files: [{ path: 'a.ts', adds: 1, dels: 0, renamed: false }],
      },
      {
        sha: 'c3',
        author: 'A',
        date: '2026-10-03',
        files: [{ path: 'a.ts', adds: 1, dels: 0, renamed: false }],
      },
    ];
    const byCommits = aggregateChurn(commits, { ...baseOptions, sortBy: 'commits' });
    expect(byCommits.files.map((f) => f.path)).toEqual(['a.ts', 'b.ts']);
    const byPath = aggregateChurn(commits, { ...baseOptions, sortBy: 'path' });
    expect(byPath.files.map((f) => f.path)).toEqual(['a.ts', 'b.ts']);
  });

  it('hotspots contain the top 10 by churn', () => {
    const commits: ChurnCommit[] = [];
    for (let i = 0; i < 15; i++) {
      commits.push({
        sha: `c${i}`,
        author: 'A',
        date: '2026-10-01',
        files: [{ path: `f${String(i).padStart(2, '0')}.ts`, adds: i + 1, dels: 0, renamed: false }],
      });
    }
    const report = aggregateChurn(commits, baseOptions);
    expect(report.summary.hotspots).toHaveLength(10);
    expect(report.summary.hotspots[0]).toBe('f14.ts'); // largest adds
  });
});
