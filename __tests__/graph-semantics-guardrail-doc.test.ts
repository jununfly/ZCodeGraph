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
  'docs/benchmarks/2026-06-25-rust-hybrid-research-oracle-needed-routes-closeout-decision.md',
);
const OWNERSHIP_ROADMAP_DOC = path.join(
  REPO_ROOT,
  'docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md',
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

    expect(doc).toContain('# Rust-Hybrid Research And Oracle-Needed Routes Closeout Decision');
    for (const requiredTerm of [
      '1-6-2. Research and oracle-needed routes',
      'defer/no-go taxonomy',
      'needs-oracle/research',
      'future explicit product switch',
      'node_modules',
      'third-party package graph expansion',
      'package manager edge cases',
      'typesVersions',
      'symlink',
      'preserveSymlinks',
      'pnpm virtual store',
      'type-only versus runtime target divergence',
      'separate type graph',
      'advanced declaration/runtime semantics',
      'CSS/assets/custom non-code modules',
      'package/runtime/builtin imports',
      'deterministic oracle fixture',
      'Agent Sufficiency',
      'user usability value',
      'bounded exploit slice',
      'graph semantics guardrail',
      'product or architecture decision',
    ]) {
      expect(doc).toContain(requiredTerm);
    }

    expect(doc).toContain('not an implementation queue');
    expect(roadmap).toContain('[x][X+] 1. Rust-Hybrid Indexing Completion And Performance Roadmap');
    expect(roadmap).toContain('[x][X+] 1-6-2. Research and oracle-needed routes');
  });
});
