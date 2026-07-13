import { describe, expect, it } from 'vitest';
import {
  buildRustHybridFallbackSummary,
  formatRustHybridFallbackDoctorHint,
} from '../src/diagnostics/fallback-summary';

describe('rust-hybrid fallback summary contract', () => {
  it('summarizes degraded fallback reasons without file paths or source slices', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 2,
          missingFallbackFileCount: 1,
          missingFallbackByLanguage: { yaml: 1 },
        },
      },
      errors: [
        { severity: 'warning', code: 'rust-owned-parse-gap' },
        { severity: 'warning', code: 'rust-owned-parse-gap' },
        { severity: 'warning', code: 'rust-owned-extraction-gap' },
        { severity: 'error', code: 'rust-owned-parse-gap' },
        { severity: 'warning', code: 'parse_error' },
      ],
    });

    expect(summary).toMatchObject({
      fallbackState: 'degraded',
      fallbackFileCount: 2,
      missingFallbackFileCount: 1,
      missingFallbackByLanguage: { yaml: 1 },
      fallbackReasonTaxonomy: {
        'language-level-typescript-fallback': 2,
        'language-level-fallback-missing-file': 1,
        'rust-owned-parse-gap': 2,
        'rust-owned-extraction-gap': 1,
      },
      graphUsabilityMessage: 'The index is usable; fallback-degraded files or diagnostics are the only parts that need review.',
    });
    expect(summary.topFallbackReasons).toEqual([
      { code: 'language-level-typescript-fallback', count: 2 },
      { code: 'rust-owned-parse-gap', count: 2 },
      { code: 'language-level-fallback-missing-file', count: 1 },
      { code: 'rust-owned-extraction-gap', count: 1 },
    ]);
    expect(JSON.stringify(summary)).not.toContain('/tmp/');
    expect(JSON.stringify(summary)).not.toContain('function ');
  });

  it('formats the existing first-screen degraded doctor hint from the summary', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: { typescriptFallbackAppend: { fallbackFileCount: 1 } },
      errors: [],
    });

    expect(formatRustHybridFallbackDoctorHint(summary)).toEqual([
      'Indexed with rust-hybrid',
      'Fallback health: degraded',
      'The index is usable; fallback-degraded files or diagnostics are the only parts that need review.\nTop fallback reasons:\n  1 non-Rust-owned files via TypeScript fallback',
      'Run diagnostic bundle:\n  zcodegraph doctor --engine rust-hybrid --bundle --last-run',
    ]);
  });

  it('keeps missing fallback counts visible in the degraded first-screen reason list', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 1,
          missingFallbackFileCount: 2,
          missingFallbackByLanguage: { yaml: 2 },
        },
      },
      errors: [],
    });

    expect(summary.fallbackReasonTaxonomy).toEqual({
      'language-level-typescript-fallback': 1,
      'language-level-fallback-missing-file': 2,
    });
    expect(formatRustHybridFallbackDoctorHint(summary)[2]).toContain(
      '2 planned TypeScript fallback files missing from the checkout',
    );
  });

  it('returns no first-screen doctor hint for healthy fallback state', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {},
      errors: [],
    });

    expect(summary.fallbackState).toBe('healthy');
    expect(formatRustHybridFallbackDoctorHint(summary)).toEqual([]);
  });
});
