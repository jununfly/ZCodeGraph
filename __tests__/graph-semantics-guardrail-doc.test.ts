import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const GUARDRAIL_DOC = path.join(REPO_ROOT, 'docs/benchmarks/graph-semantics-guardrail-v1.md');
const INDEXING_PERFORMANCE_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/baseline-indexing-performance-v1.md',
);
const RESEARCH_ORACLE_CLOSEOUT_DOC = path.join(
  REPO_ROOT,
  'docs/designs/rust-hybrid-optimization-decision-ledger.md',
);
const OWNERSHIP_ROADMAP_DOC = path.join(
  REPO_ROOT,
  'docs/designs/plan-artifact-consolidated-closeout.md',
);
const RESOLVER_SEMANTIC_RESIDUALS_DOC = path.join(
  REPO_ROOT,
  'docs/designs/resolver-semantic-residuals-ledger.md',
);
const FRAMEWORK_OWNERSHIP_MATRIX_DOC = path.join(
  REPO_ROOT,
  'docs/designs/rust-framework-ownership-matrix-v1.md',
);

describe('Graph semantics guardrail documentation', () => {
  it('defines the hard evidence contract for graph-semantic closeouts', () => {
    expect(fs.existsSync(GUARDRAIL_DOC)).toBe(true);

    const doc = fs.readFileSync(GUARDRAIL_DOC, 'utf8');
    for (const section of [
      '# Graph Semantics Guardrail v1',
      '## Purpose',
      '## Required Trigger',
      '## Hard Gate',
      '### 1. graphStats',
      '### 2. fallback taxonomy',
      '### 3. RSS',
      '## Required Result Fields',
      '## Relationship To Other Baselines',
      '## Pass/Fail Interpretation',
      '## Out Of Scope',
    ]) {
      expect(doc).toContain(section);
    }

    for (const requiredTerm of [
      'graph-semantics-guardrail-v1',
      'baseline-indexing-performance-v1',
      'baseline-agent-sufficiency-v1',
      'graphStats',
      'fallback taxonomy',
      'peakRssBytes',
      'rssUnavailableReason',
      'stable',
      'changed-expected',
      'changed-unexpected',
      'unavailable',
      'pass',
      'fail',
      'needs-human-review',
    ]) {
      expect(doc).toContain(requiredTerm);
    }

    expect(doc).toContain('cannot pass unless all three evidence lanes are');
    expect(doc).toContain('Unsupported, unresolved, or intentionally skipped evidence must not disappear');
    expect(doc).toMatch(/does not\s+replace Agent Sufficiency when that baseline is triggered/);
    expect(doc).toContain('does not require a full agent A/B campaign');
  });

  it('locks the Agent Sufficiency trigger matrix contract', () => {
    const agentDoc = fs.readFileSync(
      path.join(REPO_ROOT, 'docs/benchmarks/baseline-agent-sufficiency-v1.md'),
      'utf8',
    );
    const graphDoc = fs.readFileSync(GUARDRAIL_DOC, 'utf8');

    expect(agentDoc).toContain('## Trigger Matrix');
    for (const trigger of [
      'graph semantics',
      'resolver/finalization behavior',
      'Explore output',
      'MCP tools',
      'language or framework extraction',
      'user-facing sufficiency claims',
      'pure non-semantic changes',
    ]) {
      expect(agentDoc).toContain(trigger);
    }

    for (const outcome of [
      'Agent Sufficiency required',
      'graph-semantics guardrail sufficient',
      'maintainer review required',
    ]) {
      expect(agentDoc).toContain(outcome);
    }

    expect(agentDoc).toContain('graph-semantics-guardrail-v1');
    expect(agentDoc).toMatch(/product-sensitive interpretation/i);
    expect(graphDoc).toContain('baseline-agent-sufficiency-v1');
    expect(graphDoc).toContain('Trigger Matrix');
  });

  it('locks the ownership slice performance trend recording contract', () => {
    const doc = fs.readFileSync(INDEXING_PERFORMANCE_DOC, 'utf8');
    const agentGuidance = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');

    expect(doc).toContain('## Ownership Slice Trend Recording');
    for (const requiredTerm of [
      'roadmap node',
      'issue',
      'ZCodeGraph git commit',
      'targeted corpus or fixture',
      'command invocation',
      'wall time',
      'peak RSS',
      'rssUnavailableReason',
      'profile bucket summary',
      'graphStats',
      'fallback taxonomy',
      'Agent Sufficiency',
      'final classification',
      'targeted fixture/profile',
      'real repo smoke',
      'durable result/decision artifact',
      'issue or plan closeout',
    ]) {
      expect(doc).toContain(requiredTerm);
    }

    for (const requiredGuidance of [
      'Plan, Benchmark, and Evidence Lifecycle',
      'Only durable baseline, result, and decision artifacts belong in `docs/benchmarks/`',
      'temporary profiles, intermediate measurements, and process evidence stay with the issue or plan closeout',
      'Checked-in temporary evidence files must use a `tmp-` prefix',
    ]) {
      expect(agentGuidance).toContain(requiredGuidance);
    }

    for (const trigger of [
      'default `rust-hybrid` full-index path',
      'resolver/finalization/edge-write fan-out',
      'cleanup behavior',
      'changed-unexpected',
      'needs-human-review',
      'README',
      'release',
    ]) {
      expect(doc).toContain(trigger);
    }
  });

  it('locks the bounded optimization protocol contract', () => {
    const doc = fs.readFileSync(INDEXING_PERFORMANCE_DOC, 'utf8');

    expect(doc).toContain('## Bounded Optimization Protocol');
    for (const requiredTerm of [
      'ownership progress blocker',
      'trend signal',
      'user usability risk',
      'bounded candidate',
      'second candidate',
      'keep',
      'no-go',
      'diagnostic-only',
      'needs-human-review',
      'graphStats',
      'fallback taxonomy',
      'Agent Sufficiency',
      'durable result/decision artifact',
      'tmp-',
    ]) {
      expect(doc).toContain(requiredTerm);
    }

    expect(doc).toContain('Do not mix unrelated optimization directions');
    expect(doc).toContain('does not need to reach the 10% plan-level success threshold');
  });

  it('locks the research and oracle-needed route closeout contract', () => {
    expect(fs.existsSync(RESEARCH_ORACLE_CLOSEOUT_DOC)).toBe(true);

    const doc = fs.readFileSync(RESEARCH_ORACLE_CLOSEOUT_DOC, 'utf8');
    const roadmap = fs.readFileSync(OWNERSHIP_ROADMAP_DOC, 'utf8');
    const resolverResiduals = fs.readFileSync(RESOLVER_SEMANTIC_RESIDUALS_DOC, 'utf8');

    for (const requiredTerm of [
      'needs-oracle/research',
      'research/oracle routes stay deferred',
      'future roadmap explicitly promotes them',
    ]) {
      expect(doc).toContain(requiredTerm);
    }

    for (const requiredTerm of [
      'node_modules',
      'type graph',
      'bounded exploit lane',
      'third-party package',
      'package/runtime/builtin',
    ]) {
      expect(`${doc}\n${roadmap}\n${resolverResiduals}`).toContain(requiredTerm);
    }
    expect(roadmap).toContain('Rust indexing core');
    expect(roadmap).toContain('Rust-native TypeScript module resolution');
    expect(roadmap).toContain('guarded, evidence-backed');
  });

  it('locks the Rust framework ownership matrix contract (roadmap 1-5-5)', () => {
    expect(fs.existsSync(FRAMEWORK_OWNERSHIP_MATRIX_DOC)).toBe(true);

    const doc = fs.readFileSync(FRAMEWORK_OWNERSHIP_MATRIX_DOC, 'utf8');

    for (const section of [
      '# Rust Framework Ownership Matrix v1',
      '## Purpose',
      '## Ownership Verdicts (vocabulary)',
      '## Grammar-baseline Rust-owned languages (21)',
      '## File-level languages (kept TypeScript shell)',
      '## Framework resolver verdicts (1-4-1-*)',
      '## Reference resolution & finalization verdicts (1-4-2-*)',
      '## Update Protocol',
      '## Out Of Scope',
      '## Relationship To Other Ledgers',
      '## Pass/Fail Interpretation',
    ]) {
      expect(doc).toContain(section);
    }

    for (const verdict of ['`rust`', '`typescript`', '`split`', '`n/a`']) {
      expect(doc).toContain(verdict);
    }

    // All 21 grammar-baseline Rust-owned languages must appear in the matrix.
    for (const lang of [
      'javascript',
      'jsx',
      'typescript',
      'tsx',
      'go',
      'java',
      'kotlin',
      'python',
      'rust',
      'c',
      'cpp',
      'csharp',
      'php',
      'ruby',
      'dart',
      'swift',
      'objc',
      'lua',
      'luau',
      'pascal',
      'scala',
    ]) {
      expect(doc).toContain(`| ${lang} |`);
    }

    // All 8 file-level keep languages must appear in the matrix.
    for (const lang of [
      'svelte',
      'vue',
      'liquid',
      'razor',
      'xml (MyBatis)',
      'yaml',
      'twig',
      'properties',
    ]) {
      expect(doc).toContain(`| ${lang} |`);
    }

    // Cross-references that must hold for the matrix to stay navigable.
    expect(doc).toContain('resolver-semantic-residuals-ledger.md');
    expect(doc).toContain('graph-semantics-guardrail-v1.md');
    expect(doc).toContain('baseline-indexing-performance-v1.md');
    expect(doc).toContain('plan-artifact-consolidated-closeout.md');
    expect(doc).toContain('file-level-language-ownership-guard.test.ts');
    expect(doc).toContain('RUST_HYBRID_RUST_OWNED_LANGUAGES');
    expect(doc).toContain('roadmap node **1-5-5**');

    // Pass/fail vocabulary must be the canonical tri-state.
    for (const outcome of ['pass', 'fail', 'needs-human-review']) {
      expect(doc).toContain(outcome);
    }
  });
});
