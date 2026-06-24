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
    expect(readme).not.toContain('mcp__zcodegraph__codegraph_');
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
    expect(docs).not.toMatch(/\bnpx\s+codegraph\b/);
    expect(docs).not.toMatch(/\bcodegraph\s+(init|status|serve|install|watch|sync|search|callers|callees|impact|node|files|uninstall|uninit|index|query|affected|upgrade|context)\b/);
  });

  it('documents Delphi form file extensions in language support tables', () => {
    const docs = [
      read('README.md'),
      read('site/src/content/docs/reference/languages.md'),
    ].join('\n---\n');

    const pascalRows = docs
      .split('\n')
      .filter((line) => line.includes('| Pascal / Delphi |') && line.includes('`.pas`'));

    expect(pascalRows).toHaveLength(2);
    for (const row of pascalRows) {
      expect(row).toContain('`.dfm`');
      expect(row).toContain('`.fmx`');
    }
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

  it('documents product naming and uses zcodegraph for user commands', () => {
    const context = read('ZJ-CONTEXT.md');
    expect(context).toContain('### Product Naming');
    expect(context).toContain('**ZCodeGraph**');
    expect(context).toContain('**CodeGraph**');
    expect(context).toContain('**zcodegraph**');
    expect(context).toContain('`.zcodegraph/`');
    expect(context).toContain('`zcodegraph.db`');
    expect(context).toContain('server key `zcodegraph`');
    expect(context).toContain('legacy compatibility name');

    const userFacing = [
      read('README.md'),
      read('src/bin/zcodegraph.ts'),
      read('src/bin/node-version-check.ts'),
      read('src/mcp/tools.ts'),
    ].join('\n');

    expect(userFacing).not.toContain('"command": "codegraph"');
    expect(userFacing).not.toContain('"codegraph": {\n      "type": "stdio"');
    expect(userFacing).not.toMatch(/\bRun ["`]codegraph\b/);
    expect(userFacing).not.toMatch(/\bUse ["`]codegraph\b/);
    expect(userFacing).not.toMatch(/\bcodegraph (init|index|sync|status|serve|install|uninstall|uninit|upgrade|query|files|callers|callees|impact|affected|context)\b/);
  });

  it('uses Explore Answer for the domain concept, not older output or response aliases', () => {
    const docsAndComments = [
      'ZJ-CONTEXT.md',
      'src/mcp/tools.ts',
      'src/mcp/explore-types.ts',
      'docs/designs/adaptive-explore-sizing.md',
    ].map(read).join('\n---\n');

    expect(docsAndComments).toContain('Explore Answer');
    expect(docsAndComments).not.toMatch(new RegExp(`\\bexplore ${'output'}\\b`, 'i'));
    expect(docsAndComments).not.toMatch(new RegExp(`\\bexplore ${'response'}\\b`, 'i'));
  });
});
