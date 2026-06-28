import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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

describe('Rust indexing debt roadmap governance documentation', () => {
  it('locks the process cleanup policy taxonomy and inventory scope', () => {
    const node = readNode('1-4-1');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'Action taxonomy',
      'keep',
      'consolidate',
      'delete-candidate',
      'defer',
      'docs/plans',
      'docs/benchmarks',
      'Grouped inventory candidates',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps cleanup execution out of the policy-only roadmap node', () => {
    const node = readNode('1-4-1');

    for (const nonGoal of [
      'no file deletion',
      'no README rewrite',
      'no ADR rewrite',
      'no benchmark evidence rewrite',
    ]) {
      expect(node.notes).toContain(nonGoal);
    }
    expect(node.notes).toContain('Follow-up execution belongs to 1-4-5 or a dedicated issue');
  });

  it('locks artifact routing by decision lifetime and reuse scope', () => {
    const node = readNode('1-4-2');

    expect(node.status).toBe('completed');
    for (const requiredTerm of [
      'Routing matrix',
      'ADR',
      'Benchmark',
      'Plan/Roadmap',
      'Issue/tracker or tmp-* artifacts',
      'README',
      'AGENTS/server-instructions',
      'ZJ-CONTEXT/design docs',
      'decision lifetime and reuse scope',
      'not by directory name or file extension',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps consumer-facing projections out of the durable source role', () => {
    const node = readNode('1-4-2');

    for (const requiredTerm of [
      'user-facing projection',
      'agent-facing projection',
      'point back to ADR/benchmark/plan/roadmap sources',
      'no file movement',
      'no docs deletion',
      'no ADR rewrite',
      'no AGENTS rewrite',
      'no README rewrite',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks the common closeout skeleton for issue plan roadmap and PRD closeouts', () => {
    const node = readNode('1-4-3');

    for (const requiredTerm of [
      'Closeout template contract',
      'issue closeout',
      'plan/roadmap closeout',
      'PRD/release-style closeout',
      'fact-absorption contract',
      'Required blocks',
      'Scope',
      'Decision',
      'Evidence',
      'Absorption',
      'Follow-up',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks closeout evidence lanes and artifact absorption requirements', () => {
    const node = readNode('1-4-3');

    for (const requiredTerm of [
      'conditional evidence lanes',
      'RSS',
      'rssUnavailableReason',
      'graphStats',
      'fallback taxonomy',
      'Agent Sufficiency guardrail status',
      'keep / delete / migrate',
      'durable facts are absorbed',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks closeout follow-up classification and non-goals', () => {
    const node = readNode('1-4-3');

    for (const requiredTerm of [
      'none',
      'tracked issue',
      'roadmap node',
      'human setup',
      'deferred no-go',
      'Vague follow-up later wording is not sufficient',
      'roadmap node notes',
      'roadmap-governance-doc.test.ts',
      'Do not create docs/templates/closeout-template.md',
      'do not rewrite AGENTS.md',
      'do not rewrite README',
      'do not perform file deletion or evidence consolidation in 1-4-3',
      '1-4-5',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });
});
