/**
 * Unit tests for `scripts/prepare-release.mjs`.
 *
 * The script reads CHANGELOG.md and package.json from `process.cwd()`,
 * so the tests run it via `node` in a temp directory after staging
 * those files. Real script, real fs — keeps the test honest about what
 * the workflow will actually do.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'prepare-release.mjs');

function run(cwd: string, ...args: string[]) {
  const out = execFileSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return out.trim();
}

function runExpectingFailure(cwd: string, ...args: string[]): string {
  try {
    execFileSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  } catch (err: any) {
    return `${err?.stderr ?? ''} ${err?.message ?? ''}`;
  }
  throw new Error('expected prepare-release to exit non-zero, but it succeeded');
}

const TS_VERSION_REL = path.join('src', 'extraction', 'extraction-version.ts');

function writeTsVersion(dir: string, value: number | string) {
  const file = path.join(dir, TS_VERSION_REL);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `export const EXTRACTION_VERSION = ${value};\n`);
}

function setup(changelog: string, version = '1.2.3', tsVersion?: number | string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-release-'));
  fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version }));
  if (tsVersion !== undefined) writeTsVersion(dir, tsVersion);
  return dir;
}

function gitAvailable(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function git(cwd: string, ...args: string[]) {
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

const HEADER = `# Changelog

Some intro.

`;

describe('prepare-release.mjs', () => {
  let dir: string;
  afterEach(() => {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('Case A: [version] block does not yet exist', () => {
    it('renames [Unreleased] to [version] - <today> and adds a fresh empty [Unreleased]', () => {
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Added\n- New feature foo\n- New feature bar\n\n### Fixed\n- Fixed thing\n\n## [1.2.2] - 2026-01-01\n\n### Added\n- Old entry\n`,
      );
      const out = run(dir);
      expect(out).toMatch(/renamed \[Unreleased\] to \[1\.2\.3\]/);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');

      // [Unreleased] is now empty and at the top.
      expect(result).toMatch(/## \[Unreleased\]\n\n\n## \[1\.2\.3\]/);
      // [1.2.3] gets a date.
      expect(result).toMatch(/## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
      // Promoted content lives under [1.2.3].
      const v123Section = result.split('## [1.2.3]')[1].split('## [1.2.2]')[0];
      expect(v123Section).toContain('### Added');
      expect(v123Section).toContain('- New feature foo');
      expect(v123Section).toContain('- New feature bar');
      expect(v123Section).toContain('### Fixed');
      expect(v123Section).toContain('- Fixed thing');
      // [1.2.2] is intact.
      expect(result).toContain('## [1.2.2] - 2026-01-01');
      expect(result).toContain('- Old entry');
    });
  });

  describe('Case B: [version] already exists AND [Unreleased] has content', () => {
    it('merges Unreleased sub-sections into the matching [version] sub-sections', () => {
      // The v0.9.5 scenario verbatim: sparse [0.9.5] with two Fixed
      // entries, full [Unreleased] above it with Added + more Fixed.
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Added\n- Big feature 1\n- Big feature 2\n\n### Fixed\n- Watcher fix\n- Worktree fix\n\n## [1.2.3] - 2026-02-02\n\n### Fixed\n- Old fix A\n- Old fix B\n\n## [1.2.2] - 2026-01-01\n`,
      );
      const out = run(dir);
      expect(out).toMatch(/merged \d+ Unreleased entries/);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');

      // [Unreleased] is emptied.
      const unrelSection = result.split('## [Unreleased]')[1].split('## [1.2.3]')[0];
      expect(unrelSection.trim()).toBe('');

      // [1.2.3] now has BOTH the original Fixed entries AND the
      // Unreleased Fixed entries, plus the new Added sub-section.
      const v123Section = result.split('## [1.2.3]')[1].split('## [1.2.2]')[0];
      expect(v123Section).toContain('### Added');
      expect(v123Section).toContain('- Big feature 1');
      expect(v123Section).toContain('- Big feature 2');
      expect(v123Section).toContain('### Fixed');
      expect(v123Section).toContain('- Old fix A');
      expect(v123Section).toContain('- Old fix B');
      expect(v123Section).toContain('- Watcher fix');
      expect(v123Section).toContain('- Worktree fix');
      // Date on [1.2.3] is preserved (we don't re-stamp it).
      expect(result).toContain('## [1.2.3] - 2026-02-02');
    });

    it('appends sub-sections that exist only in [Unreleased] to the [version] block', () => {
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Security\n- CVE patch\n\n## [1.2.3] - 2026-02-02\n\n### Fixed\n- Old fix\n`,
      );
      run(dir);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      const v123 = result.split('## [1.2.3]')[1];
      expect(v123).toContain('### Fixed');
      expect(v123).toContain('- Old fix');
      expect(v123).toContain('### Security');
      expect(v123).toContain('- CVE patch');
    });
  });

  describe('Case C: [Unreleased] has no entries', () => {
    it('is a no-op when [Unreleased] is empty', () => {
      dir = setup(HEADER + `## [Unreleased]\n\n## [1.2.3] - 2026-02-02\n\n### Fixed\n- thing\n`);
      const before = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      const out = run(dir);
      expect(out).toMatch(/nothing to do/);
      const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(after).toBe(before);
    });

    it('is a no-op when [Unreleased] has only sub-section headings with no bullets', () => {
      dir = setup(
        HEADER + `## [Unreleased]\n\n### Added\n\n### Fixed\n\n## [1.2.3] - 2026-02-02\n`,
      );
      const before = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      const out = run(dir);
      expect(out).toMatch(/nothing to do/);
      const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(after).toBe(before);
    });
  });

  describe('idempotency', () => {
    it('running twice produces the same output as running once', () => {
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Added\n- Thing A\n\n## [1.2.2] - 2026-01-01\n\n### Added\n- Old\n`,
      );
      run(dir); // first run promotes
      const afterFirst = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      const out2 = run(dir); // second run should be a no-op
      const afterSecond = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(out2).toMatch(/nothing to do/);
      expect(afterSecond).toBe(afterFirst);
    });
  });

  describe('version source', () => {
    it('reads the target version from package.json by default', () => {
      dir = setup(HEADER + `## [Unreleased]\n\n### Added\n- x\n`, '9.9.9');
      run(dir);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toContain('## [9.9.9]');
    });

    it('accepts an explicit version argument that overrides package.json', () => {
      dir = setup(HEADER + `## [Unreleased]\n\n### Added\n- x\n`, '9.9.9');
      run(dir, '5.5.5');
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toContain('## [5.5.5]');
      expect(result).not.toContain('## [9.9.9]');
    });
  });

  describe('link reference', () => {
    it('appends a `[version]: https://...` link reference at EOF when promoting (Case A)', () => {
      dir = setup(HEADER + `## [Unreleased]\n\n### Added\n- x\n\n## [1.2.2] - 2026-01-01\n`);
      run(dir);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toContain(
        '[1.2.3]: https://github.com/jununfly/ZCodeGraph/releases/tag/v1.2.3',
      );
    });

    it('appends a link reference when merging into an existing [version] (Case B)', () => {
      dir = setup(
        HEADER + `## [Unreleased]\n\n### Added\n- new\n\n## [1.2.3] - 2026-02-02\n\n### Fixed\n- prior\n`,
      );
      run(dir);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toContain(
        '[1.2.3]: https://github.com/jununfly/ZCodeGraph/releases/tag/v1.2.3',
      );
    });

    it('does not double-add an existing link reference', () => {
      const ref = '[1.2.3]: https://github.com/jununfly/ZCodeGraph/releases/tag/v1.2.3';
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Added\n- x\n\n## [1.2.2] - 2026-01-01\n\n${ref}\n`,
      );
      run(dir);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      const occurrences = result.split(ref).length - 1;
      expect(occurrences).toBe(1);
    });
  });

  describe('EXTRACTION_VERSION release gate', () => {
    const BUMP_LINE =
      '- The extraction version is bumped to 2 for the whole Rust-owned semantic batch.\n';
    const changelogWith = (unreleasedBody: string, bumpLine = '') =>
      HEADER +
      `## [Unreleased]\n\n### Added\n${unreleasedBody}${bumpLine}\n## [1.2.2] - 2026-01-01\n\n### Added\n- Old\n`;

    it('skips the gate (and still releases) when the TS constant file is absent', () => {
      dir = setup(changelogWith('- thing\n'));
      const out = run(dir);
      expect(out).toMatch(/extraction-version gate skipped/);
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toMatch(/## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
    });

    it('fails when CHANGELOG declares a bump that disagrees with the code constant', () => {
      // CHANGELOG says "bumped to 2" but the TS file is still 3 (or vice versa).
      dir = setup(changelogWith('- thing\n', BUMP_LINE), '1.2.3', 3);
      const err = runExpectingFailure(dir);
      expect(err).toMatch(/EXTRACTION_VERSION drift/);
      // No promotion happened.
      const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
      expect(result).toContain('## [Unreleased]');
      expect(result).not.toMatch(/## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
    });

    const describeGit = gitAvailable() ? describe : describe.skip;
    describeGit('against the last released tag (real git repo)', () => {
      function repo(opts: { prev: number; current: number; bumpLine?: string }) {
        const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-release-git-'));
        git(repoDir, 'init', '-q');
        git(repoDir, 'config', 'user.email', 'test@example.com');
        git(repoDir, 'config', 'user.name', 'test');
        git(repoDir, 'config', 'commit.gpgsign', 'false');
        fs.writeFileSync(
          path.join(repoDir, 'package.json'),
          JSON.stringify({ name: 'x', version: '1.2.3' }),
        );
        writeTsVersion(repoDir, opts.prev);
        git(repoDir, 'add', '-A');
        git(repoDir, 'commit', '-qm', 'base');
        git(repoDir, 'tag', 'v1.2.2');
        writeTsVersion(repoDir, opts.current);
        fs.writeFileSync(
          path.join(repoDir, 'CHANGELOG.md'),
          changelogWith('- thing\n', opts.bumpLine ?? ''),
        );
        return repoDir;
      }

      it('passes and releases when the constant strictly advances over the shipped value', () => {
        dir = repo({ prev: 1, current: 2, bumpLine: BUMP_LINE });
        const out = run(dir);
        expect(out).toMatch(/extraction-version gate: OK \(1 @ v1\.2\.2 -> 2/);
        const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
        expect(result).toMatch(/## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
      });

      it('passes with an unchanged constant when the release declares no bump', () => {
        dir = repo({ prev: 2, current: 2 });
        const out = run(dir);
        expect(out).toMatch(/extraction-version gate: current=2, unchanged since v1\.2\.2/);
      });

      it('fails when the constant regressed below the shipped value', () => {
        dir = repo({ prev: 2, current: 1 });
        const err = runExpectingFailure(dir);
        expect(err).toMatch(/EXTRACTION_VERSION regression/);
        const result = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
        expect(result).not.toMatch(/## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
      });

      it('fails when a bump is declared but the value is not greater than the shipped one', () => {
        dir = repo({ prev: 2, current: 2, bumpLine: BUMP_LINE });
        const err = runExpectingFailure(dir);
        expect(err).toMatch(/already shipped 2/);
      });
    });
  });

  describe('extractor integration', () => {
    it('the resulting [version] block is what extract-release-notes.mjs would surface', () => {
      // Run prepare, then extract — confirm the output contains all the
      // promoted entries.
      dir = setup(
        HEADER +
          `## [Unreleased]\n\n### Added\n- Feature A\n- Feature B\n\n### Fixed\n- Bug fix\n\n## [1.2.2] - 2026-01-01\n`,
      );
      run(dir);

      const extractor = path.resolve(__dirname, '..', 'scripts', 'extract-release-notes.mjs');
      const notes = execFileSync('node', [extractor, '1.2.3'], { cwd: dir, encoding: 'utf8' });
      expect(notes).toContain('### Added');
      expect(notes).toContain('Feature A');
      expect(notes).toContain('Feature B');
      expect(notes).toContain('### Fixed');
      expect(notes).toContain('Bug fix');
    });
  });
});
