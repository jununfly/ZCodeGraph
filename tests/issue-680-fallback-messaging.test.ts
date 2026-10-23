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
    // 1-3-1: yaml/svelte/vue/liquid/razor/xml/twig/properties are by-design TS-shell
    // languages and no longer force `partial`. Use a non-by-design language so the
    // fixture still exercises the partial-state info line.
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 30,
          fallbackByLanguage: { kotlin: 30 },
        },
      },
      errors: [],
    });

    const lines = formatRustHybridFallbackHealthLines(summary);
    const joined = lines.join('\n');

    // Partial state: info line uses "files indexed via TypeScript fallback (non-Rust-owned languages)"
    expect(joined).toContain('30 files indexed via TypeScript fallback (non-Rust-owned languages)');
    expect(joined).not.toContain('30 TypeScript fallback files');

    // Language breakdown line
    expect(joined).toContain('Fallback by source language: kotlin (30)');
  });

  it('handles multiple source languages in the breakdown', () => {
    const summary = buildRustHybridFallbackSummary({
      success: true,
      profile: {
        typescriptFallbackAppend: {
          fallbackFileCount: 30,
          fallbackByLanguage: { kotlin: 25, css: 3, html: 2 },
        },
      },
      errors: [],
    });

    const lines = formatRustHybridFallbackHealthLines(summary);
    const joined = lines.join('\n');

    expect(joined).toContain('Fallback by source language: kotlin (25), css (3), html (2)');
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
