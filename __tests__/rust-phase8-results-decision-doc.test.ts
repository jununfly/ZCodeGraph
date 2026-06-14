import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DECISION = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-8-results-and-decision.md',
);
const REDUCED_PROFILE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-8-reduced-profile.raw.json',
);
const VSCODE_PROFILE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json',
);
const VSCODE_SUFFICIENCY = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json',
);

describe('Phase 8 Rust matcher results and decision', () => {
  it('records same-scope VS Code evidence and keeps rollout decision bounded', () => {
    const decision = fs.readFileSync(DECISION, 'utf-8');
    const reduced = JSON.parse(fs.readFileSync(REDUCED_PROFILE, 'utf-8'));
    const vscodeProfile = JSON.parse(fs.readFileSync(VSCODE_PROFILE, 'utf-8'));
    const vscodeSufficiency = JSON.parse(fs.readFileSync(VSCODE_SUFFICIENCY, 'utf-8'));

    const reducedBreakdown = reduced.results[0]?.referenceResolutionBreakdown;
    const vscode = vscodeProfile.results[0];
    const vscodeBreakdown = vscode?.referenceResolutionBreakdown;

    expect(decision).toContain('continue matcher prototype');
    expect(decision).not.toContain('promote guarded path');
    expect(decision).not.toContain('default rollout readiness achieved');
    expect(decision).not.toContain('ready for default rollout');
    expect(decision).toContain('#113');
    expect(decision).toContain('not a Phase 8 blocker');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-8-vscode-profile.raw.json');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-8-vscode-sufficiency.raw.json');
    expect(decision).toContain('RSS sampling unavailable');

    expect(vscode?.commit).toBe('4ac5322601c');
    expect(vscode?.phase1CopiedFiles).toBe(1727);
    expect(vscode?.result.filesIndexed).toBe(1725);
    expect(vscode?.result.filesErrored).toBe(3);
    expect(vscodeBreakdown?.rustMatcherMs).toBe(7972);
    expect(vscodeBreakdown?.rustMatcherSerializationMs).toBe(552);
    expect(vscodeBreakdown?.rustMatcherEligibleRefs).toBe(145320);
    expect(vscodeBreakdown?.rustMatcherHandledRefs).toBe(104375);
    expect(vscodeBreakdown?.rustMatcherFallbackRefs).toBe(39384);
    expect(vscodeBreakdown?.rustMatcherSemanticMismatchRefs).toBe(12);
    expect(vscodeBreakdown?.rustMatcherSemanticMismatchSamples).toHaveLength(12);
    expect(vscodeBreakdown?.rustMatcherFallbackReasons).toEqual({
      'outside-matcher-boundary': 13484,
      'missing-candidate-facts': 24226,
      'rust-unresolved': 1662,
      'semantic-mismatch': 12,
    });
    expect(vscodeBreakdown?.rustMatcherFallbackReasons).not.toHaveProperty('unresolved');
    expect(vscodeBreakdown?.rustMatcherCandidateMaterializationMs).toBe(584);
    expect(vscodeBreakdown?.rustMatcherSubprocessMs).toBe(7972);
    expect(vscodeBreakdown?.rustMatcherTsVerificationMs).toBe(1072);
    expect(vscodeBreakdown?.rustMatcherPayloadBytes).toBe(342838941);
    expect(vscodeBreakdown?.rustMatcherUniqueCandidateFacts).toBe(208070);

    expect(reducedBreakdown?.rustMatcherFallbackReasons).not.toHaveProperty('unresolved');
    expect(reducedBreakdown?.rustMatcherSemanticMismatchSamples).toHaveLength(30);
    expect(vscodeSufficiency.regressions).toEqual([]);
    expect(vscodeSufficiency.results[0]?.prompts[0]?.typescript.classification).toBe('graph coverage');
    expect(vscodeSufficiency.results[0]?.prompts[0]?.rust.classification).toBe('graph coverage');
  });
});
