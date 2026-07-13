import { describe, expect, it } from 'vitest';
import {
  buildRustHybridFallbackSummary,
  formatRustHybridFallbackHealthLines,
  rustHybridFallbackReasonLabel,
} from '../src/diagnostics/fallback-summary';

describe('Issue #680: fallback messaging distinguishes implementation from source language', () => {
  it('uses "non-Rust-owned files via TypeScript fallback" as the reason label', () => {
    expect(rustHybridFallbackReasonLabel('language-level-typescript-fallback'))
      .toBe('non-Rust-owned files via TypeScript fallback');
  });

  it('includes a "Fallback by source language" line when fallbackByLanguage is present', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 30,
          fallbackByLanguage: { yaml: 30 },
        },
      },
      errors: [],
    });

    const lines = formatRustHybridFallbackHealthLines(summary);
    const joined = lines.join('\n');

    // Reason line should use the new label
    expect(joined).toContain('30 non-Rust-owned files via TypeScript fallback');
    expect(joined).not.toContain('30 TypeScript fallback files');

    // Language breakdown line
    expect(joined).toContain('Fallback by source language: yaml (30)');
  });

  it('handles multiple source languages in the breakdown', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 30,
          fallbackByLanguage: { yaml: 25, css: 3, html: 2 },
        },
      },
      errors: [],
    });

    const lines = formatRustHybridFallbackHealthLines(summary);
    const joined = lines.join('\n');

    expect(joined).toContain('Fallback by source language: yaml (25), css (3), html (2)');
  });

  it('omits the language breakdown line when fallbackByLanguage is absent', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 5,
        },
      },
      errors: [],
    });

    const lines = formatRustHybridFallbackHealthLines(summary);
    const joined = lines.join('\n');

    expect(joined).not.toContain('Fallback by source language');
  });
});
