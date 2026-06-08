import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('ZCodeGraph docs and agent-facing identity', () => {
  it('README presents the fork product identity and current install/tool names', () => {
    const readme = read('README.md');

    expect(readme).toContain('ZCodeGraph');
    expect(readme).toContain('maintained by jununfly');
    expect(readme).toContain('based on upstream CodeGraph by Colby McHenry');
    expect(readme).toContain('npm install -g @jununfly/zcodegraph');
    expect(readme).toContain('zcodegraph init');
    expect(readme).toContain('zcodegraph serve --mcp');
    expect(readme).toContain('zcodegraph_explore');
    expect(readme).toContain('https://jununfly.github.io/ZCodeGraph/');
    expect(readme).toContain('https://github.com/jununfly/ZCodeGraph/issues');

    expect(readme).not.toContain('npm install -g @colbymchenry/codegraph');
    expect(readme).not.toContain('npx @colbymchenry/codegraph');
    expect(readme).not.toContain('https://github.com/colbymchenry/codegraph');
    expect(readme).not.toContain('https://colbymchenry.github.io/codegraph');
    expect(readme).not.toContain('mcp__codegraph__codegraph_');
  });

  it('site docs use the ZCodeGraph package and CLI in user-facing setup pages', () => {
    const docs = [
      'site/src/pages/index.astro',
      'site/src/content/docs/getting-started/installation.md',
      'site/src/content/docs/getting-started/quickstart.md',
      'site/src/content/docs/getting-started/your-first-graph.md',
      'site/src/content/docs/reference/api.md',
      'site/src/content/docs/reference/cli.md',
      'site/src/content/docs/reference/mcp-server.md',
      'site/src/content/docs/reference/integrations.md',
      'site/src/content/docs/guides/affected-tests.md',
      'site/src/content/docs/guides/indexing.md',
      'site/src/content/docs/troubleshooting.md',
    ].map(read).join('\n---\n');

    expect(docs).toContain('@jununfly/zcodegraph');
    expect(docs).toContain('zcodegraph');
    expect(docs).not.toContain('@colbymchenry/codegraph');
    expect(docs).not.toContain('https://github.com/colbymchenry/codegraph');
    expect(docs).not.toContain('https://colbymchenry.github.io/codegraph');
    expect(docs).not.toContain('/codegraph/');
    expect(docs).not.toContain('@jununfly/zzcodegraph');
    expect(docs).not.toContain('zzcodegraph');
    expect(docs).not.toMatch(/\bnpx\s+codegraph\b/);
    expect(docs).not.toMatch(/\bcodegraph\s+(init|status|serve|install|watch|sync|search|callers|callees|impact|node|files|uninstall|uninit|index|query|affected|upgrade|context)\b/);
  });

  it('agent benchmark scripts do not point at the upstream package identity', () => {
    const scripts = [
      'scripts/agent-eval/audit.sh',
      'scripts/agent-eval/bench-why-repo.sh',
      'scripts/agent-eval/hook-settings.json',
    ].map(read).join('\n---\n');

    expect(scripts).toContain('@jununfly/zcodegraph');
    expect(scripts).not.toContain('@colbymchenry/codegraph');
    expect(scripts).not.toContain('/Users/colby/codegraph');
    expect(scripts).not.toContain('/Users/colby/Development/Personal/codegraph');
  });
});
