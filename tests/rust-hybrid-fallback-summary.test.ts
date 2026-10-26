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
          // Roadmap 1-3-1: omit fallbackByLanguage / use a mismatched
          // missingFallbackByLanguage so the legacy classification path
          // counts the totals as unexpected. This exercises the same
          // degraded taxonomy shape the test was written for.
          missingFallbackByLanguage: { rust: 1 },
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
      missingFallbackByLanguage: { rust: 1 },
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
          // Roadmap 1-3-1: 'rust' is not in BY_DESIGN_TS_SHELL_LANGUAGES, so
          // this missing count classifies as unexpected and still drives the
          // degraded reason list the test was written for.
          missingFallbackByLanguage: { rust: 2 },
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

  it('treats by-design missing fallback as plan drift without degraded escalation (1-3-1)', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 5,
          fallbackByLanguage: { yaml: 3, properties: 2 },
          missingFallbackFileCount: 4,
          missingFallbackByLanguage: { yaml: 3, twig: 1 },
        },
      },
      errors: [],
    });

    expect(summary.fallbackState).toBe('healthy');
    expect(summary.fallbackReasonTaxonomy).toEqual({});
    expect(summary.missingFallbackFileCount).toBe(4);
    expect(summary.missingFallbackByLanguage).toEqual({ yaml: 3, twig: 1 });
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

  // Roadmap 1-4-28 / ADR-0009 D4: P2 async embedding failure sub-reasons
  // extend the taxonomy via `embeddingProfile`. Zero schema change.
  describe('embedding profile extension (1-4-28)', () => {
    it('merges embeddingFailures into fallbackReasonTaxonomy', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          embeddingProfile: {
            embeddingFailures: {
              'embedding-model-download-failed': 2,
              'embedding-runtime-init-failed': 1,
            },
          },
        },
        errors: [],
      });

      expect(summary.fallbackReasonTaxonomy).toEqual({
        'embedding-model-download-failed': 2,
        'embedding-runtime-init-failed': 1,
      });
      expect(summary.fallbackState).toBe('degraded');
      expect(summary.topFallbackReasons[0]).toEqual({
        code: 'embedding-model-download-failed',
        count: 2,
      });
    });

    it('drops embedding-model-not-downloaded (pending, not a failure)', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          embeddingProfile: {
            embeddingFailures: {
              'embedding-model-not-downloaded': 5,
            },
          },
        },
        errors: [],
      });

      expect(summary.fallbackReasonTaxonomy).toEqual({});
      expect(summary.fallbackState).toBe('healthy');
    });

    it('keeps embedding-stale at partial (not degraded) per ADR-0009 D4', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          embeddingProfile: {
            embeddingFailures: { 'embedding-stale': 7 },
          },
        },
        errors: [],
      });

      expect(summary.fallbackReasonTaxonomy).toEqual({ 'embedding-stale': 7 });
      expect(summary.fallbackState).toBe('partial');
    });

    it('embedding-stale plus a degraded reason still yields degraded', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          embeddingProfile: {
            embeddingFailures: {
              'embedding-stale': 3,
              'embedding-vec0-load-failed': 1,
            },
          },
        },
        errors: [],
      });

      expect(summary.fallbackState).toBe('degraded');
    });

    it('renders human labels for embedding failure codes', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          embeddingProfile: {
            embeddingFailures: { 'embedding-vec-schema-mismatch': 1 },
          },
        },
        errors: [],
      });
      const rendered = formatRustHybridFallbackHealthLines(summary).join('\n');
      expect(rendered).toContain('vec_embeddings virtual table schema mismatch');
    });
  });
});

// #686: repeated identical per-file parser diagnostics (e.g. 136 Vue files all
// failing with "Failed to get parser for language: typescript") must collapse
// into one aggregate finding surfaced alongside the `partial` health line —
// not be silently listed only in per-file-diagnostics.json.
describe('rust-hybrid aggregated per-file findings (#686)', () => {
  it('surfaces aggregated findings on the partial branch of formatRustHybridFallbackHealthLines', () => {
    // Roadmap 1-3-1: `fallbackByLanguage` is omitted so the summary falls
    // back to the legacy classification path and the partial branch stays
    // reachable. The aggregated findings still reference vue/yaml — those
    // records come from `per-file-diagnostics.json` (an #686 artifact) and
    // are independent of the 1-3-1 by-design taxonomy change.
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 148,
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
