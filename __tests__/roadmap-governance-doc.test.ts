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

  it('locks README product-language claim categories and capability states', () => {
    const node = readNode('1-4-4');

    for (const requiredTerm of [
      'README product language consistency contract',
      'install/init/doctor/troubleshooting commands',
      'supported languages',
      'Rust-owned',
      'TS-indexed',
      'hybrid fallback',
      'degraded status language',
      'metrics, benchmarks, Agent Sufficiency, and degraded interpretation',
      'release/current-state evidence versus historical evidence boundaries',
      'issue reporting and diagnostic bundle user steps',
      'planned separately',
      'broad Full support language',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks README metrics source and troubleshooting executability rules', () => {
    const node = readNode('1-4-4');

    for (const requiredTerm of [
      'current-state release snapshots',
      'clearly historical benchmarks',
      'durable benchmark/result/decision artifact',
      'degraded',
      'RSS-unavailable',
      'one-run smoke',
      'historical boundaries',
      'Process evidence must not be promoted into current user-facing guarantees',
      'commands must be executable on the current CLI/release path',
      'doctor --engine rust-hybrid --bundle --last-run',
      'status --json',
      'command-resolution evidence',
      'diagnostic bundles',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps README editing out of the product-language contract node', () => {
    const node = readNode('1-4-4');

    for (const requiredTerm of [
      'roadmap-governance-doc.test.ts',
      'Do not edit README',
      'do not create a README style guide',
      'do not rewrite AGENTS.md',
      'do not refresh metrics in 1-4-4',
      'Actual README edits belong to a concrete follow-up issue',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks the temporary evidence cleanup checklist decision order and classes', () => {
    const node = readNode('1-4-5');

    for (const requiredTerm of [
      'Temporary evidence retention and deletion checklist contract',
      'preconditions for safe temporary evidence cleanup',
      'durable absorption -> artifact class -> action',
      'Directory, age, filename pattern, git history availability, or tmp-prefix alone is not sufficient',
      'durable baseline/result/decision',
      'active roadmap/plan',
      'issue/closeout evidence',
      'tmp/intermediate evidence',
      'obsolete duplicate/process doc',
      'external/human-setup evidence',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('locks temporary evidence cleanup actions and delete preconditions', () => {
    const node = readNode('1-4-5');

    for (const requiredTerm of [
      'Allowed actions',
      'keep',
      'migrate',
      'delete',
      'defer',
      'all four delete conditions hold',
      'not a durable baseline/result/decision',
      'durable facts are already absorbed',
      'no current roadmap node, open issue, release note, README, or AGENTS reference depends on it',
      'deletion action is recorded in a concrete issue/closeout',
      'destination is known',
      'record the blocked reason',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });

  it('keeps cleanup execution out of the checklist contract node', () => {
    const node = readNode('1-4-5');

    for (const requiredTerm of [
      'roadmap-governance-doc.test.ts',
      'Do not create a standalone checklist document',
      'do not rewrite AGENTS.md',
      'do not rewrite README',
      'do not delete, consolidate, or migrate files in 1-4-5',
      'Actual cleanup execution belongs to a concrete inventory/issue',
    ]) {
      expect(node.notes).toContain(requiredTerm);
    }
  });
});
