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

  it('locks the remaining TypeScript indexer responsibility inventory contract', () => {
    const node = readNode('1-5-2');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'explicit TypeScript engine escape hatch = keep-stable',
      "indexAll({ engine: 'typescript' })",
      'retained user escape hatch, not burn-down target',
      'non-Rust-owned language fallback append = boundary-guardrail',
      'fallbackFiles',
      'indexFallbackFiles',
      'downstream node 1-5-5',
      'TypeScript shell finalization = migration-target',
      'finalizeRustIndex',
      'reference resolution/finalization shell work',
      'downstream node 1-5-4',
      'legacy TypeScript-engine tests/fixtures = legacy-coverage',
      'only split follow-up when it blocks default rust-hybrid assertions',
      'product/docs/reporting surface = diagnostic/reporting-only',
      'status/doctor/profile/README wording',
      'no production code changes',
      'no fallback removal',
      'no README/status/doctor rewrite',
      'no benchmark requirement',
      'no real-repo smoke requirement',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks the ReferenceResolver semantic residual migration boundary contract', () => {
    const node = readNode('1-5-4-3');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'candidate lookup / cache protocol = migration-infrastructure',
      'CandidateProtocolProvider',
      'lookup shapes',
      'LRU cache protocol',
      'Rust candidate producer routing',
      'Rust name matcher replay inputs',
      'bounded protocol hardening, not semantic ownership claim',
      'file/module target resolution = bounded-exploit-candidate',
      'import path',
      'tsconfig paths',
      'package maps',
      'repo-local file targets',
      'bounded Rust finalization edge-write shapes',
      'narrow exploit slice with parity guardrails',
      'symbol/name disambiguation = needs-oracle',
      'exact/lower/qualified/name matcher',
      'overload',
      'value/type token',
      'receiver/method',
      'requires oracle/guarded parity before Rust ownership',
      'framework semantic matching = product-shell-retained',
      'framework resolver matching',
      'route/framework-specific semantics',
      'dedicated framework migration plan',
      'edge materialization + terminal cleanup = write-cleanup-boundary',
      'converting resolver decisions into graph edges',
      'unresolved_refs cleanup',
      'finalization write/cleanup boundaries rather than semantic decision migration',
      'no resolver behavior change',
      'no edge write change',
      'no cleanup change',
      'no dynamic-dispatch change',
      'no fallback routing change',
      'no benchmark or real-repo smoke requirement',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks the DB maintenance and unresolved cleanup residual boundary contract', () => {
    const node = readNode('1-5-4-5');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'resolved unresolved_refs terminal cleanup = typescript-owned / migration-candidate',
      'resolvedCleanupRowCount',
      'resolvedCleanupMs',
      'resolvedCleanupDbMs',
      'intentionally unresolved terminal cleanup = typescript-owned / migration-candidate',
      'intentionallyUnresolvedCleanupRowCount',
      'intentionallyUnresolvedCleanupMs',
      'intentionallyUnresolvedCleanupDbMs',
      'retained unresolved_refs backlog = typescript-owned / guardrail',
      'cleanupOwnership.retainedRefs',
      'unresolved refs that must remain available for later semantic handling',
      'SQLite maintenance checkpoint = typescript-owned / product-shell-maintenance',
      'dbMaintenanceMs',
      'DatabaseConnection.runMaintenance',
      'no cleanup behavior change',
      'no unresolved_refs deletion semantics change',
      'no retained backlog reduction target',
      'no DB maintenance migration',
      'no resolver behavior change',
      'no edge write change',
      'no benchmark or real-repo smoke requirement',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });
});
