import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DECISION = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-7-results-and-decision.md',
);
const RAW_PROFILE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json',
);
const VSCODE_PROFILE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json',
);
const VSCODE_SUFFICIENCY = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json',
);

describe('Rust indexing Phase 7 results and decision document', () => {
  it('records guarded matcher evidence without default rollout claims', () => {
    const decision = fs.readFileSync(DECISION, 'utf-8');
    const raw = JSON.parse(fs.readFileSync(RAW_PROFILE, 'utf-8')) as {
      results: Array<{
        referenceResolutionBreakdown: {
          rustMatcherEligibleRefs: number;
          rustMatcherHandledRefs: number;
          rustMatcherFallbackRefs: number;
          rustMatcherSemanticMismatchRefs: number;
          rustMatcherFallbackReasons: Record<string, number>;
        };
      }>;
    };
    const vscodeProfile = JSON.parse(fs.readFileSync(VSCODE_PROFILE, 'utf-8')) as {
      results: Array<{
        phase1CopiedFiles: number;
        result: { filesIndexed: number; filesErrored: number };
        referenceResolutionBreakdown: {
          rustMatcherEligibleRefs: number;
          rustMatcherHandledRefs: number;
          rustMatcherFallbackRefs: number;
          rustMatcherSemanticMismatchRefs: number;
          rustMatcherFallbackReasons: Record<string, number>;
        };
        dominantReferenceResolutionSubpath: string;
      }>;
    };
    const vscodeSufficiency = JSON.parse(fs.readFileSync(VSCODE_SUFFICIENCY, 'utf-8')) as {
      regressions: string[];
      results: Array<{
        prompts: Array<{
          typescript: { flowConnected: boolean; deterministicGenericRead: number };
          rust: { flowConnected: boolean; deterministicGenericRead: number };
        }>;
      }>;
    };

    expect(decision).toContain('Classification: `continue matcher prototype`');
    expect(decision).toContain('ZCODEGRAPH_RUST_NAME_MATCHER=1');
    expect(decision).toContain('guarded fallback');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-7-reduced-profile.raw.json');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-7-vscode-profile.raw.json');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-7-vscode-sufficiency.raw.json');
    expect(decision).toContain('The smoke does not show a Rust-specific sufficiency regression');
    expect(decision).toContain('rssUnavailableReason');
    expect(decision).not.toContain('default rollout is ready');
    expect(decision).not.toContain('Rust is ready to become the default');

    const breakdown = raw.results[0]?.referenceResolutionBreakdown;
    expect(breakdown?.rustMatcherEligibleRefs).toBe(12);
    expect(breakdown?.rustMatcherHandledRefs).toBe(7);
    expect(breakdown?.rustMatcherFallbackRefs).toBe(5);
    expect(breakdown?.rustMatcherSemanticMismatchRefs).toBe(0);
    expect(breakdown?.rustMatcherFallbackReasons).toEqual({ unresolved: 5 });

    const vscodeBreakdown = vscodeProfile.results[0]?.referenceResolutionBreakdown;
    expect(vscodeProfile.results[0]?.phase1CopiedFiles).toBe(1727);
    expect(vscodeProfile.results[0]?.result.filesIndexed).toBe(1725);
    expect(vscodeProfile.results[0]?.result.filesErrored).toBe(3);
    expect(vscodeProfile.results[0]?.dominantReferenceResolutionSubpath).toBe('rustMatcherMs');
    expect(vscodeBreakdown?.rustMatcherEligibleRefs).toBe(145320);
    expect(vscodeBreakdown?.rustMatcherHandledRefs).toBe(104375);
    expect(vscodeBreakdown?.rustMatcherFallbackRefs).toBe(48800);
    expect(vscodeBreakdown?.rustMatcherSemanticMismatchRefs).toBe(12);
    expect(vscodeBreakdown?.rustMatcherFallbackReasons).toEqual({
      unresolved: 48788,
      'semantic-mismatch': 12,
    });

    expect(vscodeSufficiency.regressions).toEqual([]);
    const smoke = vscodeSufficiency.results[0]?.prompts[0];
    expect(smoke?.typescript.flowConnected).toBe(false);
    expect(smoke?.rust.flowConnected).toBe(false);
    expect(smoke?.typescript.deterministicGenericRead).toBe(1);
    expect(smoke?.rust.deterministicGenericRead).toBe(1);
  });
});
