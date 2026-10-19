import { describe, expect, it } from 'vitest';
import {
  buildRustHybridFallbackSummary,
  formatRustHybridFallbackDoctorHint,
  formatRustHybridFallbackHealthLines,
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

  it('formats the first-screen partial doctor hint for non-Rust-owned language fallback', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: { typescriptFallbackAppend: { fallbackFileCount: 1 } },
      errors: [],
    });

    expect(formatRustHybridFallbackDoctorHint(summary)).toEqual([
      'Indexed with rust-hybrid',
      'Fallback health: partial',
      'Index is complete; some files were indexed via TypeScript fallback for non-Rust-owned languages.\n1 files indexed via TypeScript fallback (non-Rust-owned languages)',
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

// #686: repeated identical per-file parser diagnostics (e.g. 136 Vue files all
// failing with "Failed to get parser for language: typescript") must collapse
// into one aggregate finding surfaced alongside the `partial` health line —
// not be silently listed only in per-file-diagnostics.json.
describe('rust-hybrid aggregated per-file findings (#686)', () => {
  it('surfaces aggregated findings on the partial branch of formatRustHybridFallbackHealthLines', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 148,
          fallbackByLanguage: { vue: 136, yaml: 12 },
        },
      },
      errors: [],
    });
    summary.aggregatedFindings = [
      {
        language: 'vue',
        code: 'parser_error',
        message: 'Failed to get parser for language: typescript',
        count: 136,
      },
      {
        language: 'yaml',
        code: 'parser_error',
        message: 'Failed to get parser for language: yaml',
        count: 12,
      },
    ];

    const lines = formatRustHybridFallbackHealthLines(summary);
    const rendered = lines.join('\n');

    expect(lines[0]).toBe('Fallback health: partial');
    expect(rendered).toContain('Top aggregated findings:');
    expect(rendered).toContain('136 vue parser_error "Failed to get parser for language: typescript"');
    expect(rendered).toContain('12 yaml parser_error "Failed to get parser for language: yaml"');
  });

  it('omits the aggregated-findings block when no findings are supplied (partial)', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: { typescriptFallbackAppend: { fallbackFileCount: 1 } },
      errors: [],
    });

    const rendered = formatRustHybridFallbackHealthLines(summary).join('\n');
    expect(rendered).toContain('Fallback health: partial');
    expect(rendered).not.toContain('Top aggregated findings:');
  });

  it('truncates long messages in aggregate lines to keep the first screen scannable', () => {
    const longMessage = 'Failed to get parser for language: typescript — this is an unusually long explanation that should be trimmed for the first-screen rendering because it would overflow the line budget';
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: { typescriptFallbackAppend: { fallbackFileCount: 5 } },
      errors: [],
    });
    summary.aggregatedFindings = [
      { language: 'vue', code: 'parser_error', message: longMessage, count: 5 },
    ];

    const rendered = formatRustHybridFallbackHealthLines(summary).join('\n');
    const aggLine = rendered.split('\n').find((l) => l.includes('vue parser_error'));
    expect(aggLine).toBeDefined();
    // First-screen line budget: truncated to <= 100 chars total.
    expect(aggLine!.length).toBeLessThanOrEqual(120);
    expect(aggLine).toContain('…');
  });

  it('keeps degraded branch unchanged when aggregated findings are supplied', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: { typescriptFallbackAppend: { fallbackFileCount: 2 } },
      errors: [{ severity: 'warning', code: 'rust-owned-parse-gap' }],
    });
    summary.aggregatedFindings = [
      { language: 'rust', code: 'parser_error', message: 'rust parse failure', count: 1 },
    ];

    const rendered = formatRustHybridFallbackHealthLines(summary).join('\n');
    expect(rendered).toContain('Fallback health: degraded');
    expect(rendered).toContain('Top fallback reasons:');
    // Degraded branch already surfaces top fallback reasons; aggregated
    // findings are additive — they must still appear.
    expect(rendered).toContain('Top aggregated findings:');
  });
});
