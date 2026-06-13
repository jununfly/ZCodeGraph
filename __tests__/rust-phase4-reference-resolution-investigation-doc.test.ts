import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md',
);
const RAW_PROFILE_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json',
);
const RAW_SUFFICIENCY_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json',
);
const DECISION_DOC_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md',
);

describe('Phase 4 reference resolution bottleneck investigation doc', () => {
  it('records the focused #87 VS Code profile and rollout blocker decision', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
    expect(fs.existsSync(RAW_PROFILE_PATH)).toBe(true);
    expect(fs.existsSync(RAW_SUFFICIENCY_PATH)).toBe(true);

    const doc = fs.readFileSync(DOC_PATH, 'utf8');
    expect(doc).toContain('#87');
    expect(doc).toContain('VS Code');
    expect(doc).toContain('referenceResolutionMs');
    expect(doc).toContain('databaseAccessMs');
    expect(doc).toContain('nameMatchingMs');
    expect(doc).toContain('importResolutionMs');
    expect(doc).toContain('frameworkMatchingMs');
    expect(doc).toContain('otherResolutionMs');
    expect(doc).toContain('default-rollout blocker');
    expect(doc).toContain('2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json');
    expect(doc).toContain('2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json');
    expect(doc).toContain('Read/Grep fallback-risk signals of `0 / 0`');

    const raw = JSON.parse(fs.readFileSync(RAW_PROFILE_PATH, 'utf8')) as {
      results: Array<{
        referenceResolutionBreakdown: Record<string, number>;
        dominantReferenceResolutionSubpath: string;
      }>;
    };
    expect(raw.results[0]?.dominantReferenceResolutionSubpath).toBe('databaseAccessMs');
    expect(raw.results[0]?.referenceResolutionBreakdown.databaseAccessMs).toBeGreaterThan(
      raw.results[0]?.referenceResolutionBreakdown.nameMatchingMs ?? 0,
    );
  });

  it('keeps the Phase 4 decision doc linked to the #87 blocker evidence', () => {
    const decisionDoc = fs.readFileSync(DECISION_DOC_PATH, 'utf8');
    expect(decisionDoc).toContain('#87');
    expect(decisionDoc).toContain('reference-resolution investigation');
    expect(decisionDoc).toContain('databaseAccessMs');
    expect(decisionDoc).toContain('reference-resolution sufficiency rerun');
  });
});
