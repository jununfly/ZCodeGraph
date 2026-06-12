import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';

describe('zcodegraph_explore — self-query flow connectivity', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-self-flow-'));
    fs.mkdirSync(path.join(testDir, 'src', 'mcp'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'src', 'mcp', 'explore-types.ts'),
      `export interface ExplorePlan {
  text: string;
}
`
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'mcp', 'explore-planner.ts'),
      `import type { ExplorePlan } from './explore-types';
export function plan(query: string): ExplorePlan {
  return { text: query };
}
export class PlanningConsole {
  plan(): ExplorePlan {
    return { text: 'distractor' };
  }
}
export class InstallRenderer {
  planSummary(): string {
    return 'distractor';
  }
}
export function plantLegacyRulesFile(): void {}
`
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'mcp', 'explore-renderer.ts'),
      `import type { ExplorePlan } from './explore-types';
export function render(planResult: ExplorePlan): string {
  return planResult.text;
}
export function renderBar(): string {
  return 'distractor';
}
export function renderCodeGraphMcpBlock(): string {
  return 'distractor';
}
export class NodeRenderer {
  renderNodeSection(): string {
    return 'distractor';
  }
}
`
    );
    fs.writeFileSync(
      path.join(testDir, 'src', 'mcp', 'tools.ts'),
      `import { plan } from './explore-planner';
import { render } from './explore-renderer';
export class ToolHandler {
  handleExplore(query: string): string {
    const planResult = plan(query);
    return render(planResult);
  }
}
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.ts'], exclude: [] },
    });
    await cg.indexAll();
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('connects an explore request to planner and renderer despite ambiguous top-level names', async () => {
    const handler = new ToolHandler(cg);
    const result = await handler.execute('zcodegraph_explore', {
      query: 'How does a zcodegraph_explore request become rendered markdown? Use this symbol bag: handleExplore plan ExplorePlan render',
      maxFiles: 8,
    });
    const text = result.content.map((c) => c.text).join('\n');
    const flow = text.slice(text.indexOf('## Flow'), text.indexOf('### Source'));

    expect(flow).toContain('handleExplore');
    expect(flow).toContain('plan');
    expect(flow).toContain('render');
    expect(flow.indexOf('handleExplore')).toBeLessThan(flow.indexOf('plan'));
    expect(flow.indexOf('plan')).toBeLessThan(flow.indexOf('render'));
    expect(flow).not.toContain('renderBar');
  });
});
