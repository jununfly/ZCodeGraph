import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const root = path.join(__dirname, '..');

/**
 * Walk a directory recursively, returning all file paths (relative to root)
 * that match at least one of the given extensions.
 */
function walkDir(
  dir: string,
  exts: string[],
  base: string = dir,
): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip dot-directories like .git, .workbuddy, node_modules
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;
      results.push(...walkDir(full, exts, base));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (exts.includes(ext)) {
        results.push(path.relative(base, full));
      }
    }
  }
  return results;
}

/** Patterns that represent old external identity — must NOT appear in source. */
const RESIDUE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: '@colbymchenry/codegraph', regex: /@colbymchenry\/codegraph/ },
  { name: 'dist/bin/codegraph.js', regex: /dist\/bin\/codegraph\.js/ },
  { name: 'src/bin/codegraph.ts', regex: /src\/bin\/codegraph\.ts/ },
];

/** Files/directories excluded from residue scanning. */
const RESIDUE_SCAN_EXCLUDE = new Set([
  // Historical records — intentionally preserve old changelog entries
  'CHANGELOG.md',
  // Migration/planning documents — contain old names as part of the plan
  'docs/plans/2026-06-08-zcodegraph-brand-and-isolation-migration.md',
  // Architecture review plan (temporary, will be deleted)
  'docs/plans/architecture-review-2026-06-08T18-03-08.md',
  // Handoff document
  'docs/plans/zcodegraph-architecture-review-handoff-2026-06-08.md',
  // Test files may contain old names in negative assertions
  // (e.g., expect(x).not.toContain('@colbymchenry/codegraph'))
  // and the residue test itself references old patterns
]);

function isExcluded(relPath: string): boolean {
  if (relPath.startsWith('__tests__')) return true;
  if (relPath.startsWith('.workbuddy')) return true;
  if (relPath.startsWith('dist')) return true;
  if (relPath.startsWith('node_modules')) return true;
  if (RESIDUE_SCAN_EXCLUDE.has(relPath.replace(/\\/g, '/'))) return true;
  return false;
}

describe('ZCodeGraph identity residue verification', () => {
  // ---------- Residue checks ----------

  describe('external identity residue scan', () => {
    const scanExts = ['.ts', '.tsx', '.js', '.mjs', '.sh', '.md', '.json', '.astro'];
    const allFiles = walkDir(root, scanExts).filter((f) => !isExcluded(f));

    for (const { name, regex } of RESIDUE_PATTERNS) {
      it(`no residual "${name}" in source files (excluding docs/plans, CHANGELOG, tests)`, () => {
        const hits: string[] = [];
        for (const file of allFiles) {
          const content = fs.readFileSync(path.join(root, file), 'utf8');
          if (regex.test(content)) {
            hits.push(file);
          }
        }
        expect(hits, `Residual "${name}" found in:\n${hits.join('\n')}`).toEqual([]);
      });
    }
  });

  // ---------- Source-level CLI command residue (zcodegraph init / serve) ----------

  describe('CLI command identity in source files', () => {
    const srcFiles = walkDir(path.join(root, 'src'), ['.ts', '.tsx']);
    // Those patterns target user-facing error messages / help text / agent instructions
    // where the old CLI name leaks through.

    const cliResiduePatterns: Array<{ name: string; regex: RegExp; files?: string[] }> = [
      {
        name: 'zcodegraph init (user-facing)',
        regex: /Run ["]zcodegraph init/,
        files: ['src/sync/worktree.ts', 'src/mcp/tools.ts', 'src/bin/zcodegraph.ts'],
      },
      {
        name: 'zcodegraph init (agent instructions)',
        regex: /zcodegraph init -i/,
        files: ['src/mcp/server-instructions.ts', 'src/mcp/engine.ts'],
      },
      {
        name: 'codegraph serve --mcp',
        regex: /codegraph serve --mcp/,
        files: ['src/mcp/daemon.ts', 'src/mcp/daemon-paths.ts', 'src/installer/targets/hermes.ts'],
      },
      {
        name: 'zcodegraph sync',
        regex: /zcodegraph sync/,
        files: ['src/mcp/engine.ts'],
      },
    ];

    for (const { name, regex, files } of cliResiduePatterns) {
      const targets = files ? files.map((f) => path.join('src', f)) : srcFiles;
      it(`no residual "${name}" in source code`, () => {
        const hits: string[] = [];
        for (const file of targets) {
          const full = path.join(root, file);
          if (!fs.existsSync(full)) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (regex.test(content)) {
            hits.push(file);
          }
        }
        expect(hits, `Residual "${name}" found in:\n${hits.join('\n')}`).toEqual([]);
      });
    }
  });

  // ---------- Scripts residue ----------

  describe('scripts identity', () => {
    it('scripts use zcodegraph CLI, not codegraph', () => {
      const scriptFiles = walkDir(path.join(root, 'scripts'), ['.sh', '.js', '.mjs']);
      const hits: string[] = [];
      const re = /(?<!\.)\bcodegraph (init|serve|sync|index|status)|command -v codegraph\b|execFileSync\(['"`]codegraph['"`]/;
      for (const file of scriptFiles) {
        const content = fs.readFileSync(path.join(root, 'scripts', file), 'utf8');
        if (re.test(content)) {
          hits.push(file);
        }
      }
      expect(hits, `Residual codegraph commands in scripts:\n${hits.join('\n')}`).toEqual([]);
    });
  });

  // ---------- docs residue (non-plans) ----------

  describe('docs identity (excluding plans/)', () => {
    const docsDir = path.join(root, 'docs');
    // Normalize to forward slashes for consistent filtering
    const docFiles = walkDir(docsDir, ['.md']).filter(
      (f) => !f.replace(/\\/g, '/').startsWith('plans/'),
    );

    it('docs use zcodegraph init / serve, not codegraph', () => {
      const hits: string[] = [];
      const re = /(?<!\.)\bcodegraph (init|serve)\b/;
      for (const file of docFiles) {
        const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
        if (re.test(content)) {
          hits.push(`docs/${file}`);
        }
      }
      expect(hits, `Residual codegraph commands in docs:\n${hits.join('\n')}`).toEqual([]);
    });
  });

  // ---------- Preservation checks ----------

  describe('internal domain model preservation', () => {
    it('CodeGraph class is still referenced in source', () => {
      const srcFiles = walkDir(path.join(root, 'src'), ['.ts', '.tsx']);
      const hits: string[] = [];
      for (const file of srcFiles) {
        const content = fs.readFileSync(path.join(root, 'src', file), 'utf8');
        if (/\bCodeGraph\b/.test(content)) {
          hits.push(file);
        }
      }
      expect(hits.length).toBeGreaterThan(0);
    });

    it('.zcodegraph/ index directory is referenced in source and docs', () => {
      // Collect paths independently — walkDir returns paths relative to base,
      // so src/ results are relative to src/, docs/ results relative to docs/.
      const srcFiles = walkDir(path.join(root, 'src'), ['.ts', '.tsx']).map(
        (f) => ({ rel: f, full: path.join(root, 'src', f) }),
      );
      const docFiles = walkDir(path.join(root, 'docs'), ['.md']).map(
        (f) => ({ rel: `docs/${f}`, full: path.join(root, 'docs', f) }),
      );
      const rootFiles = ['README.md', 'CLAUDE.md'].map((f) => ({
        rel: f,
        full: path.join(root, f),
      }));

      const allFiles = [...srcFiles, ...docFiles, ...rootFiles];
      const hits: string[] = [];
      for (const { rel, full } of allFiles) {
        if (!fs.existsSync(full)) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (/\.zcodegraph\//.test(content) || /`.zcodegraph`/.test(content)) {
          hits.push(rel);
        }
      }
      expect(hits.length).toBeGreaterThan(0);
    });

    it('src/bin/zcodegraph.ts exists (not codegraph.ts)', () => {
      expect(fs.existsSync(path.join(root, 'src', 'bin', 'zcodegraph.ts'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'src', 'bin', 'codegraph.ts'))).toBe(false);
    });
  });

  // ---------- .workbuddy/ untracked check ----------

  describe('.workbuddy/ isolation', () => {
    it('.workbuddy/ is not tracked by git', () => {
      let stdout: string;
      try {
        stdout = execSync('git ls-files .workbuddy/', { cwd: root, encoding: 'utf8' }).trim();
      } catch {
        stdout = '';
      }
      expect(stdout).toBe('');
    });
  });
});
