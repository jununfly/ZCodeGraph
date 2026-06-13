import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG = path.join(REPO_ROOT, 'CHANGELOG.md');
const PHASE4_DOCS = [
  path.join(REPO_ROOT, 'docs', 'plans', '2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md'),
  path.join(REPO_ROOT, 'docs', 'benchmarks', '2026-06-13-rust-indexing-core-phase-4-results-and-decision.md'),
  path.join(REPO_ROOT, 'docs', 'benchmarks', '2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md'),
];

function unreleasedSection(): string {
  const text = fs.readFileSync(CHANGELOG, 'utf-8');
  const match = text.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[)/);
  if (!match) throw new Error('Missing [Unreleased] section');
  return match[1];
}

function markdownLinks(text: string): string[] {
  return [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('#'));
}

describe('Rust indexing Phase 4 release notes and documentation links', () => {
  it('keeps completed readiness work user-facing without claiming Rust is default', () => {
    const unreleased = unreleasedSection();
    const lowerUnreleased = unreleased.toLowerCase();

    expect(unreleased).toContain('Phase 4');
    expect(unreleased).toContain('experimental Rust indexing');
    expect(unreleased).toContain('large VS Code');
    expect(unreleased).toContain('continue opt-in');
    expect(lowerUnreleased).not.toContain('rust indexing is now the default');
    expect(lowerUnreleased).not.toContain('rust is now the default');
  });

  it('keeps Phase 4 plan, results, and decision document links resolvable', () => {
    for (const doc of PHASE4_DOCS) {
      const text = fs.readFileSync(doc, 'utf-8');
      const dir = path.dirname(doc);
      for (const link of markdownLinks(text)) {
        const withoutAnchor = link.split('#')[0];
        if (!withoutAnchor) continue;
        expect(fs.existsSync(path.resolve(dir, withoutAnchor)), `${doc} links to ${link}`).toBe(true);
      }
    }
  });
});
