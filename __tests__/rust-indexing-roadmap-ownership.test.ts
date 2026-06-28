import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RUST_HYBRID_RUST_OWNED_LANGUAGES } from '../src/indexing/rust-hybrid-contract';

const REPO_ROOT = path.resolve(__dirname, '..');
const ROADMAP_JSON = path.join(
  REPO_ROOT,
  'docs/plans/2026-06-27-rust-indexing-debt-to-rust-migration-roadmap.json',
);

type RoadmapNode = {
  status: string;
  notes: string;
};

function readNode(id: string): RoadmapNode {
  const roadmap = JSON.parse(fs.readFileSync(ROADMAP_JSON, 'utf8')) as {
    nodes: Record<string, RoadmapNode>;
  };
  return roadmap.nodes[id];
}

describe('Rust indexing migration roadmap ownership map', () => {
  it('keeps the documented Rust-owned language map aligned with the assignment source of truth', () => {
    const node = readNode('1-5-1');

    expect(node.status).toBe('completed');
    for (const language of RUST_HYBRID_RUST_OWNED_LANGUAGES) {
      expect(node.notes).toContain(language);
    }
    expect([...RUST_HYBRID_RUST_OWNED_LANGUAGES]).toEqual([
      'javascript',
      'jsx',
      'typescript',
      'tsx',
      'go',
      'python',
      'rust',
    ]);
    expect(node.notes).toContain('RUST_HYBRID_RUST_OWNED_LANGUAGES');
    expect(node.notes).toContain('language-level rather than extension-list-level');
  });

  it('locks ownership axes and replacement-readiness status vocabulary', () => {
    const node = readNode('1-5-1');

    for (const requiredTerm of [
      'language ownership',
      'pipeline stage',
      'fallback/removal risk',
      'scan/detect',
      'Rust extraction',
      'Rust finalization/reference-resolution',
      'framework/synthesizer',
      'status/doctor reporting',
      'owned-ready',
      'owned-with-residuals',
      'owned-structural-only',
      'blocks-removal',
      'diagnostic/documentation-only',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('records the evidence-limited current classification without overclaiming readiness', () => {
    const node = readNode('1-5-1');

    for (const requiredTerm of [
      'javascript, jsx, typescript, tsx: owned-with-residuals',
      'module-resolution',
      'finalization/reference-resolution',
      'MCP Explore sufficiency guardrail risk',
      'go: owned-with-residuals',
      'python: owned-with-residuals',
      'framework/resolver semantic coverage',
      'rust: owned-structural-only',
      'macros, lifetimes, trait coherence, and Cargo feature resolution',
      'planned separately',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps implementation, README, diagnostics, and benchmark work out of the map slice', () => {
    const node = readNode('1-5-1');

    for (const requiredTerm of [
      'no README rewrite',
      'no status/doctor display change',
      'no production code behavior change',
      'no full benchmark or real-repo smoke',
      'no language added or removed from Rust-owned assignment',
      'Follow-up implementation belongs to later 1-5 burn-down or fallback-boundary nodes',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });
});
