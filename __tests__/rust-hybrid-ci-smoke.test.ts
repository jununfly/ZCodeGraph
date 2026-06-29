import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, 'scripts', 'rust-hybrid-ci-smoke.mjs');

let tempRoot: string | null = null;

function makeTempRoot(): string {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ci-smoke-test-'));
  return tempRoot;
}

function writeFakeCli(root: string, options: { engine?: string } = {}): string {
  const cli = path.join(root, 'fake-zcodegraph.js');
  fs.writeFileSync(cli, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const calls = process.env.FAKE_ZCODEGRAPH_CALLS;
const args = process.argv.slice(2);
const command = args[0];
const project = args[1] && !args[1].startsWith('-') ? args[1] : process.cwd();
if (calls) fs.appendFileSync(calls, args.join(' ') + '\\n');
if (command === 'init' || command === 'index') {
  fs.mkdirSync(path.join(project, '.zcodegraph'), { recursive: true });
  fs.writeFileSync(path.join(project, '.zcodegraph', 'status.json'), JSON.stringify({
    index: {
      engine: ${JSON.stringify(options.engine ?? 'rust-hybrid')},
      fileCount: 3,
      nodeCount: 7,
      hybrid: { fallbackState: 'healthy' }
    }
  }));
  process.exit(0);
}
if (command === 'status') {
  process.stdout.write(fs.readFileSync(path.join(project, '.zcodegraph', 'status.json'), 'utf8') + '\\n');
  process.exit(0);
}
if (command === 'doctor') {
  const bundle = path.join(project, '.zcodegraph', 'diagnostics', 'bundles', 'last-run');
  fs.mkdirSync(bundle, { recursive: true });
  process.stdout.write('.zcodegraph/diagnostics/bundles/last-run\\n');
  process.exit(0);
}
process.stderr.write('unexpected command: ' + args.join(' ') + '\\n');
process.exit(1);
`);
  fs.chmodSync(cli, 0o755);
  return cli;
}

function runSmoke(bin: string, callsFile: string) {
  return spawnSync(process.execPath, [script, '--bin', bin], {
    cwd: repoRoot,
    env: {
      ...process.env,
      FAKE_ZCODEGRAPH_CALLS: callsFile,
    },
    encoding: 'utf-8',
  });
}

describe('rust-hybrid CI smoke script', () => {
  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  it('runs init, index, status, and doctor against a temporary rust-hybrid fixture', () => {
    const root = makeTempRoot();
    const calls = path.join(root, 'calls.txt');
    const cli = writeFakeCli(root);

    const result = runSmoke(cli, calls);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('rust-hybrid CI smoke passed');
    const callLines = fs.readFileSync(calls, 'utf8').trim().split(/\r?\n/);
    expect(callLines).toEqual([
      expect.stringMatching(/^init .+ --engine rust-hybrid$/),
      expect.stringMatching(/^index .+ --engine rust-hybrid --force --quiet$/),
      expect.stringMatching(/^status .+ --json$/),
      expect.stringMatching(/^doctor .+ --engine rust-hybrid --bundle --last-run$/),
    ]);
  });

  it('fails when status output does not prove rust-hybrid indexing', () => {
    const root = makeTempRoot();
    const calls = path.join(root, 'calls.txt');
    const cli = writeFakeCli(root, { engine: 'typescript' });

    const result = runSmoke(cli, calls);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('status --json did not report rust-hybrid index engine');
  });
});
