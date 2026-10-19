import { describe, expect, it } from 'vitest';
import {
  rustHybridFallbackStateFor,
  planRustHybridAssignments,
  mergeRustOwnedGapDiagnostics,
  type RustHybridAssignmentPlan,
} from '../src/indexing/rust-hybrid-contract';
import {
  buildRustHybridFallbackSummary,
  formatRustHybridFallbackHealthLines,
  formatRustHybridFallbackDoctorHint,
} from '../src/diagnostics/fallback-summary';
import { classifyGraphHealth } from '../src/diagnostics/graph-health';

describe('Issue #682: three-tier fallback health state (healthy/partial/degraded)', () => {
  describe('rustHybridFallbackStateFor', () => {
    it('returns partial when only language-level-typescript-fallback exists', () => {
      const state = rustHybridFallbackStateFor(5, {
        'language-level-typescript-fallback': 5,
      });
      expect(state).toBe('partial');
    });

    it('returns degraded when rust-owned-parse-gap is present alongside expected fallback', () => {
      const state = rustHybridFallbackStateFor(5, {
        'language-level-typescript-fallback': 5,
        'rust-owned-parse-gap': 1,
      });
      expect(state).toBe('degraded');
    });

    it('returns degraded when language-level-fallback-missing-file is present', () => {
      const state = rustHybridFallbackStateFor(5, {
        'language-level-typescript-fallback': 5,
        'language-level-fallback-missing-file': 2,
      });
      expect(state).toBe('degraded');
    });

    it('returns healthy when no fallbacks exist', () => {
      const state = rustHybridFallbackStateFor(0, {});
      expect(state).toBe('healthy');
    });
  });

  describe('buildRustHybridFallbackSummary', () => {
    it('returns partial state for non-Rust-owned language fallback without gaps', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          typescriptFallbackAppend: {
            fallbackFileCount: 58,
            fallbackByLanguage: { yaml: 58 },
          },
        },
        errors: [],
      });

      expect(summary.fallbackState).toBe('partial');
      expect(summary.graphUsabilityMessage).not.toContain('need review');
    });

    it('returns degraded state when rust-owned gaps are present', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          typescriptFallbackAppend: {
            fallbackFileCount: 1,
          },
        },
        errors: [
          { severity: 'warning', code: 'rust-owned-parse-gap' },
        ],
      });

      expect(summary.fallbackState).toBe('degraded');
    });
  });

  describe('formatRustHybridFallbackHealthLines', () => {
    it('outputs partial format with info line and language breakdown', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          typescriptFallbackAppend: {
            fallbackFileCount: 58,
            fallbackByLanguage: { yaml: 58 },
          },
        },
        errors: [],
      });

      const lines = formatRustHybridFallbackHealthLines(summary);
      const joined = lines.join('\n');

      expect(joined).toContain('Fallback health: partial');
      expect(joined).toContain('58 files indexed via TypeScript fallback (non-Rust-owned languages)');
      expect(joined).toContain('Fallback by source language: yaml (58)');
      expect(joined).not.toContain('need review');
    });

    it('outputs partial format without language breakdown when absent', () => {
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

      expect(joined).toContain('Fallback health: partial');
      expect(joined).toContain('5 files indexed via TypeScript fallback (non-Rust-owned languages)');
      expect(joined).not.toContain('Fallback by source language');
      expect(joined).not.toContain('need review');
    });
  });

  describe('formatRustHybridFallbackDoctorHint', () => {
    it('returns hint for partial state with info-level health line', () => {
      const summary = buildRustHybridFallbackSummary({
        success: true,
        profile: {
          typescriptFallbackAppend: {
            fallbackFileCount: 10,
            fallbackByLanguage: { yaml: 10 },
          },
        },
        errors: [],
      });

      const hint = formatRustHybridFallbackDoctorHint(summary);
      expect(hint.length).toBeGreaterThan(0);
      expect(hint[0]).toBe('Indexed with rust-hybrid');
      expect(hint[1]).toContain('Fallback health: partial');
    });
  });

  describe('classifyGraphHealth', () => {
    it('treats partial fallback state as healthy graph health', () => {
      const health = classifyGraphHealth({
        initialized: true,
        databasePath: '/fake/path',
        databasePresent: true,
        hybridFallbackState: 'partial',
      });

      expect(health.state).toBe('healthy');
      expect(health.usable).toBe(true);
    });

    it('still treats degraded fallback state as degraded graph health', () => {
      const health = classifyGraphHealth({
        initialized: true,
        databasePath: '/fake/path',
        databasePresent: true,
        hybridFallbackState: 'degraded',
      });

      expect(health.state).toBe('degraded');
    });
  });
});
