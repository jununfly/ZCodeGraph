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

  it('locks the MCP Explore sufficiency guardrail trigger map for remaining migration work', () => {
    const node = readNode('1-5-6');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'Trigger map completed for Rust indexing replacement mainline',
      'baseline-agent-sufficiency-v1',
      'graph-semantics-guardrail-v1',
      'Three-tier trigger classification',
      'Agent Sufficiency required',
      'graph-semantics sufficient',
      'diagnostics-only sufficient',
      'Explore output changes',
      'MCP tool output/shape/ranking changes',
      'dynamic-dispatch production edge writes',
      'user-facing sufficiency claims',
      'bounded repo-local file/module target parity',
      'guarded edge-write behavior with deterministic fixtures',
      'fallback taxonomy movement',
      'graphStats, fallback taxonomy, and RSS/unavailable reason',
      'protocol-only diagnostics',
      'shadow-only diagnostics',
      'profile field additions',
      'status/doctor wording that does not change graph output or MCP answer content',
      '1-5-3 Rust-owned extraction gap burn-down candidates',
      '1-5-5 Non-Rust-owned language fallback boundary',
      'future dynamic-dispatch production edge migration',
      'future bounded ReferenceResolver file/module target parity',
      'future framework postExtract migration',
      'no production code behavior change',
      'no baseline document rewrite',
      'no new benchmark result',
      'no full agent A/B run in this map slice',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps finalization residual exploit candidates split by guardrail surface', () => {
    const backlog = readNode('1-6');

    for (const requiredTerm of [
      'Candidate backlog refreshed after 1-5-4 residual boundary map completion',
      '1-6-6 Bounded ReferenceResolver semantic migration exploit candidate',
      '1-6-7 Framework post-extract Rust migration exploit candidate',
      '1-6-8 Dynamic-dispatch synthesizer Rust migration exploit candidate',
      '1-6-9 Cleanup and DB maintenance Rust migration exploit candidate',
      'Prefer 1-6-6 if the next goal is highest-confidence TypeScript finalization burn-down',
      'Prefer 1-6-7 if the next goal is a narrow framework postExtract migration surface',
      'Prefer 1-6-8 only if ready to carry Agent Sufficiency guardrails',
      'Prefer 1-6-9 only if cleanup/backlog semantics are the explicit target',
      'Do not collapse these candidates into a generic resolver migration',
    ]) {
      expect(backlog.notes).toContain(requiredTerm);
    }

    const resolver = readNode('1-6-6');
    expect(resolver.notes).toContain('docs/plans/2026-06-29-ts-js-repo-local-file-module-target-parity-plan.md');
    expect(resolver.notes).toContain('#656');
    expect(resolver.notes).toContain('#657');
    expect(resolver.notes).toContain('#658');
    expect(resolver.notes).toContain('TS/JS repo-local import file/module target parity only');
    expect(resolver.notes).toContain('relative repo-local file imports: rust-owned');
    expect(resolver.notes).toContain('extensionless and index-file targets: rust-owned');
    expect(resolver.notes).toContain('tsconfig paths file targets: rust-owned');
    expect(resolver.notes).toContain('tsconfig rootDirs file targets: rust-owned and verified in this slice');
    expect(resolver.notes).toContain('package self-name repo-local file targets: partial');
    expect(resolver.notes).toContain('package imports repo-local file targets: partial');
    expect(resolver.notes).toContain('package exports repo-local file targets: needs-oracle');
    expect(resolver.notes).toContain('Completed parity inventory, one bounded exploit, and guardrail closeout');
    expect(resolver.notes).toContain('rootDirs public diagnostics parity');
    expect(resolver.notes).toContain('no binding-level symbol disambiguation');
    expect(resolver.notes).toContain('no Go module path resolution');
    expect(resolver.notes).toContain('no Rust module path resolution');
    expect(resolver.notes).toContain('no Python import semantics');
    expect(resolver.notes).toContain('must not imply full ReferenceResolver migration');
    expect(resolver.notes).toContain('TypeScript fallback remains for unsupported or ambiguous forms');

    const ciSmoke = readNode('1-6-5');
    expect(ciSmoke.status).toBe('completed');
    expect(ciSmoke.notes).toContain('docs/plans/2026-06-29-rust-hybrid-cross-platform-ci-smoke-plan.md');
    expect(ciSmoke.notes).toContain('Completed issue: #662');
    expect(ciSmoke.notes).toContain('scripts/rust-hybrid-ci-smoke.mjs');
    expect(ciSmoke.notes).toContain('init, index --engine rust-hybrid, status --json, and doctor --engine rust-hybrid --bundle --last-run');
    expect(ciSmoke.notes).toContain('existing cross-platform rust-packaged-path CI matrix');
    expect(ciSmoke.notes).toContain('does not assert semantic parity');
    expect(ciSmoke.notes).toContain('does not use external repositories');

    const framework = readNode('1-6-7');
    expect(framework.notes).toContain('docs/plans/2026-06-29-rust-side-framework-post-extract-protocol-plan.md');
    expect(framework.notes).toContain('generic Rust-side framework postExtract host/update protocol');
    expect(framework.notes).toContain('NestJS RouterModule route-name prefix rewrites');
    expect(framework.notes).toContain('Rust produces typed node updates');
    expect(framework.notes).toContain('TypeScript shell validates and applies updates through the existing node-update path');
    expect(framework.notes).toContain('v1 updates may only mutate route node name');
    expect(framework.notes).toContain('id, qualifiedName, kind, and filePath must remain stable');
    expect(framework.notes).toContain('Provider failures and unsafe updates are fail-open/fail-closed');
    expect(framework.notes).toContain('provider=nestjs, updateKind=route-name-prefix, nodeKind=route, field=name');
    expect(framework.notes).toContain('Completed issues: #659, #660, #661');
    expect(framework.notes).toContain('Implemented a generic Rust-side framework postExtract host/update protocol');
    expect(framework.notes).toContain('Implemented the first Rust-produced provider shape for NestJS RouterModule route-name prefix rewrites');
    expect(framework.notes).toContain('parse-time framework extract() migration remains out of scope');
    expect(framework.notes).toContain('per-reference framework resolve()/claimsReference() migration remains out of scope');
    expect(framework.notes).toContain('route-handler edge preservation covered');
    expect(framework.notes).toContain('idempotency covered with no-op taxonomy');

    const dynamic = readNode('1-6-8');
    expect(dynamic.notes).toContain('Choose one bounded full-graph synthesizer or relationship family first');
    expect(dynamic.notes).toContain('Agent Sufficiency guardrail');
    expect(dynamic.notes).toContain('Read/Grep');

    const cleanup = readNode('1-6-9');
    expect(cleanup.status).toBe('completed');
    expect(cleanup.notes).toContain('docs/plans/2026-06-29-rust-cleanup-protocol-handoff-plan.md');
    expect(cleanup.notes).toContain('Completed issue: #663');
    expect(cleanup.notes).toContain('Rust core emits cleanupProtocol');
    expect(cleanup.notes).toContain('cleanupOwnership.owner=rust-core-protocol');
    expect(cleanup.notes).toContain('mode=rust-declared-typescript-executed');
    expect(cleanup.notes).toContain('fallbackReason=missing-rust-cleanup-protocol');
    expect(cleanup.notes).toContain('fallbackReason=invalid-rust-cleanup-protocol');
    expect(cleanup.notes).toContain('TypeScript still executes resolved and intentionally unresolved rowid-range cleanup');
    expect(cleanup.notes).toContain('Retained unresolved_refs backlog semantics are unchanged');
    expect(cleanup.notes).toContain('SQLite maintenance checkpoint behavior remains out of scope');
    expect(cleanup.notes).toContain('not full cleanup or DB maintenance migration');
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
