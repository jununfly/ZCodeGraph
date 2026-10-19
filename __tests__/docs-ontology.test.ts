import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const DOCS_ROOT = join(__dirname, '..', 'docs');

const ENTITY_FOLDERS = ['decisions', 'contracts', 'ledgers', 'evidence', 'methods'] as const;

const VALID_DOC_KINDS = ['decision', 'contract', 'ledger', 'evidence', 'method', 'design'] as const;
const VALID_AUTHORITIES = ['primary', 'supporting', 'historical', 'process', 'external'] as const;

const FOLDER_CLASS_MAP: Record<string, { docKind: string; authority: string }> = {
  decisions: { docKind: 'decision', authority: 'primary' },
  contracts: { docKind: 'contract', authority: 'primary' },
  ledgers: { docKind: 'ledger', authority: 'supporting' },
  evidence: { docKind: 'evidence', authority: 'supporting' },
  methods: { docKind: 'method', authority: 'supporting' },
};

const REQUIRED_FIELDS = ['doc-kind', 'authority', 'authority-id', 'bounded-question'] as const;
const OPTIONAL_FIELDS = ['supersedes', 'evidence-for', 'decided-by', 'last-reviewed'] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
      result[key] = value;
    }
  }
  return result;
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('docs ontology', () => {
  it('every entity folder exists', () => {
    for (const folder of ENTITY_FOLDERS) {
      expect(existsSync(join(DOCS_ROOT, folder)), `docs/${folder}/ must exist`).toBe(true);
    }
  });

  it('ONTOLOGY.md exists at docs root', () => {
    expect(existsSync(join(DOCS_ROOT, 'ONTOLOGY.md'))).toBe(true);
  });

  it('README.md exists at docs root', () => {
    expect(existsSync(join(DOCS_ROOT, 'README.md'))).toBe(true);
  });

  describe('frontmatter validation', () => {
    const allFiles: Array<{ folder: string; path: string }> = [];
    for (const folder of ENTITY_FOLDERS) {
      const dir = join(DOCS_ROOT, folder);
      if (!existsSync(dir)) continue;
      for (const file of collectMarkdownFiles(dir)) {
        allFiles.push({ folder, path: file });
      }
    }

    it('at least 60 markdown entities exist', () => {
      expect(allFiles.length).toBeGreaterThanOrEqual(60);
    });

    for (const { folder, path } of allFiles) {
      const relPath = `docs/${folder}/${basename(path)}`;

      it(`${relPath} has valid frontmatter`, () => {
        const content = readFileSync(path, 'utf-8');
        const fm = parseFrontmatter(content);
        expect(fm, `${relPath} must have YAML frontmatter`).not.toBeNull();

        // Required fields
        for (const field of REQUIRED_FIELDS) {
          expect(fm![field], `${relPath} missing required field: ${field}`).toBeDefined();
        }

        // doc-kind vocabulary
        expect(
          VALID_DOC_KINDS.includes(fm!['doc-kind'] as any),
          `${relPath} doc-kind "${fm!['doc-kind']}" not in vocabulary`
        ).toBe(true);

        // authority vocabulary
        expect(
          VALID_AUTHORITIES.includes(fm!['authority'] as any),
          `${relPath} authority "${fm!['authority']}" not in vocabulary`
        ).toBe(true);

        // Folder/class matching
        const expected = FOLDER_CLASS_MAP[folder];
        expect(fm!['doc-kind'], `${relPath} doc-kind mismatch for ${folder}/`).toBe(expected.docKind);
        expect(fm!['authority'], `${relPath} authority mismatch for ${folder}/`).toBe(expected.authority);

        // authority-id format
        expect(fm!['authority-id'].length, `${relPath} authority-id too short`).toBeGreaterThan(3);
      });
    }

    it('authority-ids are unique across all entities', () => {
      const ids = new Map<string, string[]>();
      for (const { folder, path } of allFiles) {
        const content = readFileSync(path, 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm) continue;
        const id = fm['authority-id'];
        if (!id) continue;
        const existing = ids.get(id) ?? [];
        existing.push(`docs/${folder}/${basename(path)}`);
        ids.set(id, existing);
      }
      for (const [id, paths] of ids) {
        expect(paths.length, `authority-id "${id}" used by multiple files: ${paths.join(', ')}`).toBe(1);
      }
    });

    it('dated evidence files use YYYY-MM-DD prefix', () => {
      const evidenceDir = join(DOCS_ROOT, 'evidence');
      if (!existsSync(evidenceDir)) return;
      for (const file of readdirSync(evidenceDir)) {
        if (!file.endsWith('.md')) continue;
        // Undated evidence files are allowed for non-dated analyses
        if (/^(answer-directly|call-sequence|codegraph-ab-matrix)/.test(file)) continue;
        expect(
          /^\d{4}-\d{2}-\d{2}-/.test(file),
          `evidence/${file} must use YYYY-MM-DD prefix`
        ).toBe(true);
      }
    });
  });

  describe('relationship fields reference authority-ids, not paths', () => {
    const allFiles: string[] = [];
    for (const folder of ENTITY_FOLDERS) {
      const dir = join(DOCS_ROOT, folder);
      if (!existsSync(dir)) continue;
      allFiles.push(...collectMarkdownFiles(dir));
    }

    for (const path of allFiles) {
      const relPath = path.replace(DOCS_ROOT, 'docs');
      it(`${relPath} relationship fields use authority-id format`, () => {
        const content = readFileSync(path, 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm) return;
        for (const field of ['supersedes', 'evidence-for', 'decided-by'] as const) {
          const value = fm[field];
          if (!value) continue;
          // Should not contain path separators
          expect(
            value.includes('/') || value.includes('\\'),
            `${relPath} ${field} must reference authority-id, not path: "${value}"`
          ).toBe(false);
        }
      });
    }
  });
});
