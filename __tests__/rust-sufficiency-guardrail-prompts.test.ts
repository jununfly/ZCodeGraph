import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-sufficiency-guardrail.mjs');

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('Rust sufficiency guardrail prompt configuration', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('documents external prompt files for long-running repo-specific probes', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--prompts <json>');
    expect(result.stdout).toContain('Names with built-in prompts: zcodegraph, excalidraw, zustand');
  });

  it('loads prompt definitions for repositories without built-in prompts before checking build artifacts', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-prompts-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'vscode-does-not-exist');
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        vscode: [
          {
            id: 'VS-1',
            query: 'ExtensionHostMain MainThreadExtensionService',
            expected: ['ExtensionHostMain', 'MainThreadExtensionService'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `vscode=${repo}`],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain('No built-in or configured prompts for repo name "vscode"');
  });
});
