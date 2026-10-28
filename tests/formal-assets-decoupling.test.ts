import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const REPO_ROOT = join(__dirname, '..');
const FORMAL_DIRECTORIES = [
  'src',
  'crates',
  'tests',
  'scripts',
  'docs',
  '.github',
];
const ROOT_CONFIG_FILES = ['package.json'];
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.rs',
  '.md',
  '.json',
  '.yml',
  '.yaml',
  '.sh',
  '.py',
  '.toml',
  '.sql',
  '.html',
]);
const LOCAL_WORKSPACES = ['re' + 'search', 'discussions'];
const LOCAL_WORKSPACE_PATH = new RegExp(
  `(?:^|[\\s"'\`(<\\[=:{,/\\\\])(?:${LOCAL_WORKSPACES.join('|')})[/\\\\]`,
);
const RETIRED_DOC_PATH = /(?:^|[/\\])docs[\\/](?:evidence|ledgers)[\\/]/;

function collectTextFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function repoPath(fullPath: string): string {
  return relative(REPO_ROOT, fullPath).split(sep).join('/');
}

const formalFiles = [
  ...FORMAL_DIRECTORIES.flatMap((directory) =>
    collectTextFiles(join(REPO_ROOT, directory)),
  ),
  ...readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith('.md') || ROOT_CONFIG_FILES.includes(entry.name)),
    )
    .map((entry) => join(REPO_ROOT, entry.name)),
];

const BASELINES = [
  {
    file: 'architecture-regression-v1.json',
    consumers: ['.github/workflows/ci.yml'],
  },
  {
    file: 'pr-recall-v1.json',
    consumers: ['scripts/measure/pr-recall-gate.mjs'],
  },
  {
    file: 'dead-code-annotation-r1-v1.json',
    consumers: ['scripts/measure/dead-code-precision.mjs'],
  },
] as const;

describe('formal assets are self-contained', () => {
  it('path guard recognizes relative, absolute, and Windows forms', () => {
    const localName = LOCAL_WORKSPACES[0];
    for (const example of [
      `../${localName}/notes.md`,
      `/workspace/${localName}/notes.md`,
      `C:\\workspace\\${localName}\\notes.md`,
      'docs/' + 'evidence/old-result.json',
      '..\\docs\\' + 'ledgers\\old-plan.md',
    ]) {
      expect(LOCAL_WORKSPACE_PATH.test(example) || RETIRED_DOC_PATH.test(example)).toBe(
        true,
      );
    }
    expect(LOCAL_WORKSPACE_PATH.test('nousresearch.com/model')).toBe(false);
    expect(LOCAL_WORKSPACE_PATH.test('researchFrontiers/value')).toBe(false);
  });

  it('does not reference local workspaces or retired evidence paths', () => {
    const violations: string[] = [];

    for (const fullPath of formalFiles) {
      const content = readFileSync(fullPath, 'utf8');
      for (const [index, line] of content.split(/\r?\n/).entries()) {
        if (LOCAL_WORKSPACE_PATH.test(line) || RETIRED_DOC_PATH.test(line)) {
          violations.push(`${repoPath(fullPath)}:${index + 1}: ${line.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it.each(BASELINES)(
    'keeps $file parseable and registered with its consumer',
    ({ file, consumers }) => {
      const relativePath = `docs/baselines/${file}`;
      const content = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
      expect(readFileSync(join(REPO_ROOT, 'docs/README.md'), 'utf8')).toContain(
        file,
      );
      for (const consumer of consumers) {
        expect(readFileSync(join(REPO_ROOT, consumer), 'utf8')).toContain(file);
      }
    },
  );
});
