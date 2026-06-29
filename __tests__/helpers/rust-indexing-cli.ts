import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../../src';

export const ZCODEGRAPH_BIN = path.resolve(__dirname, '../../dist/bin/zcodegraph.js');

export const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

export function makeRustIndexingTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-engine-'));
  fs.writeFileSync(path.join(dir, 'a.ts'), 'export function alpha(): number { return 1; }\n');
  const cg = CodeGraph.initSync(dir);
  cg.close();
  return dir;
}

export function writeFakeRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core.cjs' : 'fake-rust-core');
  const marker = fakeRustCoreMarker(dir);
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      `require("fs").writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ args, profiling: process.env.ZCODEGRAPH_PROFILING || null, experimentId: process.env.ZCODEGRAPH_EXPERIMENT_ID || null }) + "\\n");`,
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({ type: "result", success: true, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [], durationMs: 1 }) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

export function writeFakeRustCoreWithPerFileGap(
  dir: string,
  filePath: string,
  code = 'rust-owned-parse-gap',
): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-gap.cjs' : 'fake-rust-core-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      `    code: ${JSON.stringify(code)},`,
      '    severity: "warning",',
      '    writtenByRust: false,',
      '    line: 1,',
      '    column: 1,',
      '    message: "fake Rust-owned parse gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

export function writeFakeRustCoreWithPartialWriteGap(dir: string, filePath: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-partial-gap.cjs' : 'fake-rust-core-partial-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      '    code: "rust-owned-parse-gap",',
      '    severity: "warning",',
      '    writtenByRust: true,',
      '    message: "fake partial Rust write gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

export function fakeRustCoreMarker(dir: string): string {
  return path.join(dir, '.fake-rust-core-invoked');
}

export function writeFailingRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'failing-rust-core.cjs' : 'failing-rust-core');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'process.stderr.write(JSON.stringify({ type: "error", message: "Rust core should not have been invoked" }) + "\\n");',
      'process.exit(70);',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

export function runZcodegraphCli(
  cwd: string,
  args: string[],
  env: Record<string, string | undefined> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [ZCODEGRAPH_BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ...env,
    },
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for condition');
}
