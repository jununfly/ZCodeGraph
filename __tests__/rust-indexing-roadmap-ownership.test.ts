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

  it('locks the framework post-extract residual migration boundary contract', () => {
    const node = readNode('1-5-4-2');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'FrameworkResolver.postExtract() = typescript-owned / migration-candidate',
      'finalizeRustIndex -> resolver.initialize() -> resolver.runPostExtract()',
      'finalization.frameworkPostExtract.started',
      'finalization.frameworkPostExtract.completed',
      'frameworkPostExtractMs',
      'ReferenceResolver.runPostExtract() calls fw.postExtract(context)',
      'queries.updateNode(node)',
      'postExtract(context) returns preserved-id node updates',
      'node id must remain stable so existing route-handler edges survive',
      'qualifiedName should remain stable for idempotency',
      'NestJS is currently the only framework resolver with postExtract()',
      'generic FrameworkResolver.postExtract contract rather than a NestJS-only migration claim',
      'parse-time framework extract() is outside this node',
      'per-reference framework resolve() and claimsReference() are outside this node',
      'ReferenceResolver semantic matching / framework semantic matching',
      'dynamic-dispatch synthesis is outside this node',
      'Rust-side framework post-extract host API',
      'node-update protocol preserving ids and qualifiedName/idempotency',
      'active framework detection parity',
      'failure/fallback behavior that preserves current silent debug logging semantics',
      'tests covering route prefix rewrite edge preservation',
      'no production code behavior change',
      'no framework extraction behavior change',
      'no framework semantic resolve behavior change',
      'no dynamic-dispatch behavior change',
      'no route node rewrite migration',
      'no benchmark or real-repo smoke requirement',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks the dynamic-dispatch synthesis residual migration boundary contract', () => {
    const node = readNode('1-5-4-4');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'Full-graph dynamic-dispatch synthesis = typescript-owned / migration-candidate-with-agent-sufficiency-guardrail',
      'ReferenceResolver.resolveAllBatched() runs synthesizeCallbackEdges()',
      'after baseline reference-resolution edges are persisted',
      'finalizeRustIndex reads dynamicDispatchSynthesisMs',
      'finalization.dynamicDispatchSynthesis.started',
      'finalization.dynamicDispatchSynthesis.completed',
      'synthesizeCallbackEdges() hardcodes full-graph synthesizer execution',
      'queries.insertEdges()',
      'callback/observer dispatch',
      'EventEmitter',
      'React render',
      'JSX child',
      'Vue template',
      'SvelteKit load',
      'Go method contains/implements/interface dispatch',
      'React Native/Fabric/Expo bridges',
      'MyBatis Java XML',
      'Gin middleware chain',
      'synthesized edges are additive heuristic graph edges',
      'failures are best-effort / ignored by the current TypeScript path',
      'per-reference framework resolve() and claimsReference() are outside this node',
      'FrameworkResolver.postExtract() is outside this node',
      'SynthesizerRegistry unification is a design direction',
      'not the current production dynamic-dispatch execution path',
      'Candidate lookup/cache protocol and Rust matcher replay are outside this node',
      'choose one bounded synthesizer or relationship family first',
      'Rust-side heuristic edge protocol',
      'provenance',
      'synthesizedBy',
      'registeredAt',
      'precision taxonomy',
      'language gating',
      'graph parity checks for synthesized edge counts and samples',
      'Agent Sufficiency guardrail',
      'Read/Grep',
      'preserve best-effort failure behavior',
      'no production code behavior change',
      'no synthesized edge behavior change',
      'no SynthesizerRegistry migration',
      'no Rust synthesizer implementation',
      'no framework resolver semantic change',
      'no benchmark or real-repo smoke requirement',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('marks the finalization residual boundary map complete without overclaiming migration', () => {
    const node = readNode('1-5-4');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'Residual boundary map completed',
      '1-5-4 now closes the TypeScript product-shell finalization residual boundary map',
      'This completes the residual boundary map, not full Rust ownership of finalization/reference-resolution',
      'TypeScript product-shell finalization remains in production',
      'Do not treat this parent completion as resolver semantics migrated',
      'dynamic-dispatch synthesis migrated',
      'framework post-extract migrated',
      'cleanup migrated',
      'DB maintenance migrated',
      'Dynamic-dispatch migration requires Agent Sufficiency guardrails',
      'ReferenceResolver semantic migration requires parity/oracle guardrails',
      'Cleanup and DB maintenance migration requires terminal cleanup/backlog semantics guardrails',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
    expect(node.notes).not.toContain('parent remains in_progress');
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
