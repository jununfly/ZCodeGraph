import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BENCHMARKS_DIR = path.resolve(__dirname, '..', 'docs', 'benchmarks');
const DOC = path.join(
  BENCHMARKS_DIR,
  '2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization.md',
);
const PROFILE = path.join(
  BENCHMARKS_DIR,
  '2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json',
);
const SUFFICIENCY = path.join(
  BENCHMARKS_DIR,
  '2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json',
);
const DECISION_DOC = path.join(
  BENCHMARKS_DIR,
  '2026-06-13-rust-indexing-core-phase-4-results-and-decision.md',
);

describe('Rust indexing Phase 4 reference-resolution optimization evidence', () => {
  it('records #91 after-profile evidence, sufficiency, and unresolved blocker status', () => {
    const doc = fs.readFileSync(DOC, 'utf-8');
    const decisionDoc = fs.readFileSync(DECISION_DOC, 'utf-8');
    const profile = JSON.parse(fs.readFileSync(PROFILE, 'utf-8'));
    const sufficiency = JSON.parse(fs.readFileSync(SUFFICIENCY, 'utf-8'));

    expect(doc).toContain('#91');
    expect(doc).toContain('still unresolved');
    expect(doc).toContain('edgeMaterializationMs');
    expect(doc).toContain('unresolvedCleanupMs');
    expect(doc).toContain('databaseAccessMs');
    expect(doc).toContain(path.basename(PROFILE));
    expect(doc).toContain(path.basename(SUFFICIENCY));
    expect(doc).toContain('local-only provenance');

    const breakdown = profile.results[0]?.referenceResolutionBreakdown;
    expect(breakdown?.databaseAccessMs).toBeGreaterThan(0);
    expect(breakdown?.edgeMaterializationMs).toBeGreaterThanOrEqual(0);
    expect(breakdown?.edgeWriteMs).toBeGreaterThan(0);
    expect(breakdown?.unresolvedCleanupMs).toBeGreaterThan(0);
    expect(profile.results[0]?.dominantFinalizationSubphase).toBe('referenceResolutionMs');
    expect(profile.results[0]?.dominantReferenceResolutionSubpath).toBe('nameMatchingMs');

    expect(sufficiency.regressions).toEqual([]);
    const prompt = sufficiency.results[0]?.prompts[0];
    expect(prompt?.typescript.classification).toBe('no regression');
    expect(prompt?.rust.classification).toBe('no regression');
    expect(prompt?.typescript.deterministicGenericRead).toBe(0);
    expect(prompt?.rust.deterministicGenericRead).toBe(0);

    expect(decisionDoc).toContain('#91');
    expect(decisionDoc).toContain('still unresolved');
  });
});
