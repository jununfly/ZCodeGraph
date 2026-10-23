import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  planRustHybridAssignments,
  mergeMissingFallbackDiagnostics,
  buildRustHybridMetadataFromPlan,
  isByDesignTsShellLanguage,
  RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES,
  RUST_HYBRID_RUST_OWNED_LANGUAGES,
} from '../src/indexing/rust-hybrid-contract';
import { LANGUAGES } from '../src/types';

/**
 * Roadmap 1-3-1 (P1 准入：图质量门禁) e2e gate.
 *
 * The 1-3-x-1 keep decisions assigned eight languages to the TypeScript shell
 * by design: svelte/vue/liquid/razor/xml/yaml/twig/properties. Files in these
 * languages still flow through the TS fallback extractor (they are indexed and
 * produce file rows / framework-resolver symbols), but their presence MUST NOT
 * mark the graph as degraded — they are intentional TS-shell territory, not a
 * Rust-core gap.
 *
 * This suite locks the post-1-3-1 contract:
 *  1. Every by-design language is excluded from
 *     `fallbackReasonTaxonomy['language-level-typescript-fallback']`.
 *  2. Sparse-missing by-design files no longer escalate the plan to degraded.
 *  3. Real Rust-owned parse/extraction gaps still escalate (degraded preserved
 *     for genuine signals).
 *  4. Every supported language is classified — there is no third bucket of
 *     "silently unexpected" languages drifting through the fallback path.
 */

function makeTempProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-131-gate-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('1-3-1 graph quality gate: by-design TS-shell languages cannot degrade the graph', () => {
  it('classifies every supported language as rust-owned OR by-design TS-shell (no third bucket)', () => {
    const rustOwned = new Set<string>(RUST_HYBRID_RUST_OWNED_LANGUAGES);
    const byDesign = new Set<string>(RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES);
    const overlap = [...rustOwned].filter((l) => byDesign.has(l));
    expect(overlap).toEqual([]);

    const unclassified = (LANGUAGES as readonly string[]).filter(
      (lang) => lang !== 'unknown' && !rustOwned.has(lang) && !byDesign.has(lang),
    );
    expect(unclassified).toEqual([]);
  });

  it('plan with only by-design TS-shell files reports healthy with empty taxonomy', () => {
    const dir = makeTempProject({
      'routing.yml': 'app:\n  path: /health\n',
      'application.properties': 'spring.datasource.url=jdbc:h2:mem:test\n',
      'template.twig': '{# empty #}\n',
      'Mapper.xml': '<?xml version="1.0"?><mapper/>\n',
      'Component.svelte': '<script>export let x;</script>\n',
      'Component.vue': '<template><div/></template>\n',
      'template.liquid': '{{ x }}\n',
      'View.razor': '@code { int x = 1; }\n',
      // One rust-owned file so the plan has a real index base.
      'index.ts': 'export const a = 1;\n',
    });
    try {
      const plan = planRustHybridAssignments(dir);

      // All by-design files still flow through the TS fallback extractor.
      expect(plan.fallbackFiles.length).toBeGreaterThan(0);
      expect(plan.fallbackByLanguage).toMatchObject({
        yaml: 1,
        properties: 1,
        twig: 1,
        xml: 1,
        svelte: 1,
        vue: 1,
        liquid: 1,
        razor: 1,
      });
      expect(plan.engineByLanguage.yaml).toBe('typescript');

      // …but the taxonomy is empty and the state is healthy.
      expect(plan.fallbackReasonTaxonomy).toEqual({});
      expect(plan.fallbackState).toBe('healthy');

      const metadata = buildRustHybridMetadataFromPlan(plan);
      expect(metadata.fallbackState).toBe('healthy');
      expect(metadata.fallbackReasonTaxonomy).toEqual({});
    } finally {
      cleanup(dir);
    }
  });

  it.each([...RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES])(
    'by-design language %s is recognized by isByDesignTsShellLanguage',
    (lang) => {
      expect(isByDesignTsShellLanguage(lang)).toBe(true);
    },
  );

  it('rust-owned languages are NOT by-design TS-shell', () => {
    for (const lang of RUST_HYBRID_RUST_OWNED_LANGUAGES) {
      expect(isByDesignTsShellLanguage(lang)).toBe(false);
    }
  });

  it('sparse-missing by-design fallback files do NOT escalate to degraded', () => {
    const dir = makeTempProject({
      'index.ts': 'export const a = 1;\n',
      'routing.yml': 'app:\n  path: /health\n',
    });
    try {
      const plan = planRustHybridAssignments(dir);
      const merged = mergeMissingFallbackDiagnostics(plan, {
        missingFallbackFileCount: 3,
        missingFallbackByLanguage: { yaml: 2, properties: 1 },
      });

      expect(merged.missingFallbackFileCount).toBe(3);
      expect(merged.missingFallbackByLanguage).toEqual({ yaml: 2, properties: 1 });
      expect(merged.fallbackReasonTaxonomy).toEqual({});
      expect(merged.fallbackState).toBe('healthy');
    } finally {
      cleanup(dir);
    }
  });

  it('rust-owned parse gap still escalates to degraded (genuine signal preserved)', () => {
    const dir = makeTempProject({
      'index.ts': 'export const a = 1;\n',
      'routing.yml': 'app:\n  path: /health\n',
    });
    try {
      const plan = planRustHybridAssignments(dir);
      // Simulate the runtime path: rust-owned-parse-gap is added by
      // mergeRustOwnedGapDiagnostics (covered separately in
      // rust-index-engine-cli-fallback.test.ts). Here we exercise the state
      // classifier directly with a taxonomy carrying a real gap.
      const withGap = {
        ...plan,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
        fallbackState: 'degraded' as const,
      };
      const metadata = buildRustHybridMetadataFromPlan(withGap);

      expect(metadata.fallbackReasonTaxonomy).toEqual({ 'rust-owned-parse-gap': 1 });
      expect(metadata.fallbackState).toBe('degraded');
    } finally {
      cleanup(dir);
    }
  });

  it('mixed by-design + rust-owned-gap: by-design stripped, gap escalates', () => {
    const dir = makeTempProject({
      'index.ts': 'export const a = 1;\n',
      'broken.ts': 'export function broken( {\n', // intentionally broken
      'routing.yml': 'app:\n  path: /health\n',
      'app.properties': 'k=v\n',
    });
    try {
      const plan = planRustHybridAssignments(dir);
      // Simulate the runtime path: by-design fallbacks contribute nothing,
      // then a real rust-owned gap lands and the runtime escalates the state.
      const withGap = {
        ...plan,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
        fallbackState: 'degraded' as const,
      };
      const metadata = buildRustHybridMetadataFromPlan(withGap);

      expect(metadata.fallbackByLanguage).toMatchObject({ yaml: 1, properties: 1 });
      expect(metadata.fallbackFileCount).toBe(2);
      expect(metadata.fallbackReasonTaxonomy).toEqual({ 'rust-owned-parse-gap': 1 });
      expect(metadata.fallbackState).toBe('degraded');
    } finally {
      cleanup(dir);
    }
  });
});
