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
});
