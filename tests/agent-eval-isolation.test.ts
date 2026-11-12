import { beforeAll, describe, expect, it } from 'vitest';
import { access, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerAdapter, runBaseline } from '../scripts/agent-eval/harness/runner.mjs';

// @ts-expect-error no type declarations for the concrete adapter mjs module
const loadAdapter = () => import('../scripts/agent-eval/harness/adapters/codebuddy.mjs');

// @ts-expect-error no type declarations for the harness mjs module
const load = () => import('../scripts/agent-eval/harness/isolation.mjs');
let isolation: any;

beforeAll(async () => {
  isolation = await load();
});

async function sourceFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'zcg-iso-src-'));
  await writeFile(path.join(dir, 'app.ts'), 'export const answer = 42;\n', 'utf8');
  await writeFile(path.join(dir, '.env'), 'GITHUB_TOKEN=should-not-leak\n', 'utf8');
  return dir;
}

const envFixture = () => ({
  PATH: process.env.PATH ?? '',
  GITHUB_TOKEN: 'leak-me',
  OPENAI_API_KEY: 'leak-me',
  ZCG_MODE: 'test',
});

describe('credential-free read-only snapshot (S1)', () => {
  it('mirrors the corpus without leaking credentials and never mutates the host env', async () => {
    const sourceDir = await sourceFixture();
    const before = { ...process.env };

    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });

    expect(snapshot.readOnly).toBe(true);
    expect(snapshot.credentialFree).toBe(true);
    expect(await readFile(path.join(snapshot.corpusDir, 'app.ts'), 'utf8'))
      .toBe('export const answer = 42;\n');
    await expect(access(path.join(snapshot.corpusDir, '.env'))).rejects.toThrow();
    expect(snapshot.env.GITHUB_TOKEN).toBeUndefined();
    expect(snapshot.env.OPENAI_API_KEY).toBeUndefined();
    expect(snapshot.env.ZCG_MODE).toBe('test');
    expect(process.env.GITHUB_TOKEN).toBe(before.GITHUB_TOKEN);

    const second = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    expect(second.root).not.toBe(snapshot.root);
  });

  it('detects any mutation through an independent integrity fingerprint', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });

    expect(snapshot.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await isolation.verifySnapshot(snapshot)).toBe(true);

    await writeFile(path.join(snapshot.corpusDir, 'app.ts'), 'export const answer = 0;\n', 'utf8');
    expect(await isolation.verifySnapshot(snapshot)).toBe(false);
  });

  it('excludes only the declared index runtime directory, not source or repository metadata', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });

    await mkdir(path.join(snapshot.corpusDir, '.zcodegraph'), { recursive: true });
    await writeFile(path.join(snapshot.corpusDir, '.zcodegraph', 'zcodegraph.db'), 'local index', 'utf8');
    expect(await isolation.verifySnapshot(snapshot)).toBe(true);

    await mkdir(path.join(snapshot.corpusDir, '.git'), { recursive: true });
    await writeFile(path.join(snapshot.corpusDir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
    expect(await isolation.verifySnapshot(snapshot)).toBe(false);
  });

  it('is single-use: every consumer rejects a disposed snapshot', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });

    expect(() => isolation.assertUsable(snapshot)).not.toThrow();
    await isolation.disposeSnapshot(snapshot);
    expect(() => isolation.assertUsable(snapshot)).toThrow(/disposed/);
    await expect(isolation.verifySnapshot(snapshot)).rejects.toThrow(/disposed/);
    await expect(readFile(path.join(snapshot.root, '.consumed'), 'utf8')).resolves.toContain('disposed');
  });
});

describe('isolated with-vs-without baseline (S2)', () => {
  const baseOptions = {
    corpus: 'corpus-1',
    prompt: 'How does X reach Y?',
    model: 'resolved-model-id',
  };

  it('shares one isolation context across both arms and discards the whole run on a breach', async () => {
    const sourceDir = await sourceFixture();
    const seen: any[] = [];
    registerAdapter('iso-fake-valid', {
      async run({ isolation }: any) {
        seen.push(isolation);
        return { exitCode: 0, toolCalls: [], turns: 1, usage: {} };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: { ...baseOptions, adapterId: 'iso-fake-valid', runId: 'iso-valid' },
    });

    expect(result.status).toBe('valid');
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).toMatchObject({ readOnly: true, credentialFree: true });
    expect(seen[0].fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(seen[0].env.GITHUB_TOKEN).toBeUndefined();
    expect(result.isolation.consumed).toBe(true);
    await expect(readFile(path.join(result.isolation.root, '.consumed'), 'utf8'))
      .resolves.toContain('disposed');

    registerAdapter('iso-fake-breach', {
      async run({ isolation: context }: any) {
        await writeFile(path.join(context.corpusDir, 'app.ts'), 'tampered\n', 'utf8');
        return { exitCode: 0, toolCalls: [], turns: 1, usage: {} };
      },
    });

    const breached = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      isolationOptions: { env: envFixture() },
      baselineOptions: { ...baseOptions, adapterId: 'iso-fake-breach', runId: 'iso-breach' },
    });

    expect(breached.status).toBe('invalid');
    expect(breached.invalidReason).toMatch(/snapshot integrity breach/);
    expect(breached.arms.with.status).toBe('invalid');
    expect(breached.arms.without.status).toBe('invalid');
  });

  it('does not persist a baseline transcript before snapshot integrity has passed', async () => {
    const sourceDir = await sourceFixture();
    const outDir = await mkdtemp(path.join(tmpdir(), 'zcg-iso-out-'));
    const valid = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: { ...baseOptions, adapterId: 'iso-fake-valid', runId: 'iso-valid-file', outDir },
    });
    expect(valid.status).toBe('valid');
    expect(await readdir(outDir)).toEqual(['iso-valid-file.json']);

    const breached = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: { ...baseOptions, adapterId: 'iso-fake-breach', runId: 'iso-breach-file', outDir },
    });
    expect(breached.status).toBe('invalid');
    expect(breached.invalidReason).toMatch(/snapshot integrity breach/);
    await expect(access(path.join(outDir, 'iso-breach-file.json'))).rejects.toThrow();
    expect(await readdir(outDir)).toEqual(['iso-valid-file.json']);
  });

  it('persists failure diagnostics separately after integrity verification', async () => {
    const sourceDir = await sourceFixture();
    const outDir = await mkdtemp(path.join(tmpdir(), 'zcg-iso-diagnostic-out-'));
    registerAdapter('iso-fake-failure', {
      async run() {
        return {
          exitCode: 1,
          toolCalls: [],
          stderrTail: 'authentication read denied by outer sandbox',
          transcriptPath: 'C:/temp/with.jsonl',
        };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: {
        ...baseOptions, adapterId: 'iso-fake-failure', runId: 'iso-invalid-file',
        outDir, diagnosticsDir: outDir,
      },
    });

    expect(result.status).toBe('invalid');
    expect(result.isolation.intact).toBe(true);
    await expect(access(path.join(outDir, 'iso-invalid-file.json'))).rejects.toThrow();
    const diagnostic = JSON.parse(await readFile(path.join(outDir, 'iso-invalid-file.diagnostics.json'), 'utf8'));
    expect(diagnostic.evidence).toBe(false);
    expect(diagnostic.attemptedArms).toEqual(['with']);
    expect(diagnostic.arms).toEqual([expect.objectContaining({
      arm: 'with',
      exitCode: 1,
      stderrTail: 'authentication read denied by outer sandbox',
      transcriptPath: 'C:/temp/with.jsonl',
    })]);
    expect(diagnostic.isolation).toMatchObject({ consumed: true, intact: true });
  });

  it('gives the concrete adapter only the snapshot cwd and sanitized environment', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    const spawnInputs: Array<{ args: string[]; options: any }> = [];
    const spawnImpl = (_command: string, args: string[], options: any) => {
      spawnInputs.push({ args, options });
      return {
        stdout: { on: () => undefined },
        stderr: { on: () => undefined },
        on: (event: string, handler: (...args: any[]) => void) => {
          if (event === 'close') handler(0);
        },
        kill: () => undefined,
      };
    };

    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'resolved-at-runtime', cliPath: 'C:/tools/codebuddy',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot, spawnImpl,
    });

    expect(result.exitCode).toBe(0);
    expect(spawnInputs).toHaveLength(1);
    const spawnInput = spawnInputs[0]!;
    expect(spawnInput.options.cwd).toBe(snapshot.corpusDir);
    expect(spawnInput.options.env.GITHUB_TOKEN).toBeUndefined();
    expect(spawnInput.options.env.OPENAI_API_KEY).toBeUndefined();
    expect(spawnInput.options.env.ZCG_MODE).toBe('test');
    expect(spawnInput.options.cwd).not.toBe(sourceDir);
    expect(spawnInput.options.env).not.toBe(process.env);
    expect(spawnInput.args).not.toContain('--dangerously-skip-permissions');
    expect(spawnInput.args).not.toContain('bypassPermissions');
  });

  it('starts the Node launcher with a script path and read-only tool restrictions', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    const spawnInputs: Array<{ command: string; args: string[]; options: any }> = [];
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'resolved-at-runtime', cliPath: 'C:/tools/codebuddy',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: (command: string, args: string[], options: any) => {
        spawnInputs.push({ command, args, options });
        return {
          stdout: { on: () => undefined }, stderr: { on: () => undefined },
          on: (event: string, handler: (...args: any[]) => void) => {
            if (event === 'close') handler(0);
          },
          kill: () => undefined,
        };
      },
    });
    expect(result.exitCode).toBe(0);
    expect(spawnInputs).toHaveLength(1);
    const { command, args, options } = spawnInputs[0]!;
    expect(command).toBe(process.execPath);
    expect(args[0]).toBe('C:/tools/codebuddy');
    expect(args[1]).toBe('-p');
    expect(args).toContain('--strict-mcp-config');
    expect(args).toContain('--tools');
    expect(args).toContain('--allowedTools');
    expect(args).toContain('Read,Grep,Glob,mcp__codegraph__*');
    expect(args).toContain('--disallowedTools');
    expect(args).toContain('--no-session-persistence');
    expect(args).toContain('Edit');
    expect(args).toContain('Bash');
    expect(args).not.toContain('--dangerously-skip-permissions');
    expect(args).not.toContain('bypassPermissions');
    expect(options.env.CODEBUDDY_FORCE_LITE_WB_BUNDLE).toBe('1');
    expect(options.env.SERVER__PORT).not.toBe(process.env.SERVER__PORT);
    expect(Number(options.env.SERVER__PORT)).toBeGreaterThan(0);
    expect(Number(options.env.SERVER__PORT)).toBeLessThanOrEqual(65535);
  });

  it('starts a standalone native executable without Node or the WorkBuddy bundle override', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    const spawnInputs: Array<{ command: string; args: string[]; options: any }> = [];
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'resolved-at-runtime',
      cliPath: 'C:/tools/codebuddy.exe', cliFlavor: 'standalone',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: (command: string, args: string[], options: any) => {
        spawnInputs.push({ command, args, options });
        return {
          stdout: { on: () => undefined }, stderr: { on: () => undefined },
          on: (event: string, handler: (...args: any[]) => void) => {
            if (event === 'close') handler(0);
          },
          kill: () => undefined,
        };
      },
    });
    expect(result.exitCode).toBe(0);
    const { command, args, options } = spawnInputs[0]!;
    expect(command).toBe('C:/tools/codebuddy.exe');
    expect(args[0]).toBe('-p');
    expect(args).not.toContain('C:/tools/codebuddy.exe');
    expect(options.env.CODEBUDDY_FORCE_LITE_WB_BUNDLE).toBeUndefined();
    expect(options.shell).not.toBe(true);
  });

  it('passes the frozen standalone effort explicitly without claiming it was read back', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    const spawnInputs: Array<{ args: string[] }> = [];
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'glm-5.3-flash', effort: 'high',
      cliPath: 'C:/tools/package/bin/codebuddy', cliFlavor: 'standalone',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: (_command: string, args: string[]) => {
        spawnInputs.push({ args });
        return {
          stdout: { on: () => undefined }, stderr: { on: () => undefined },
          on: (event: string, handler: (...args: any[]) => void) => {
            if (event === 'close') handler(0);
          },
          kill: () => undefined,
        };
      },
    });
    const effortFlag = spawnInputs[0]!.args.indexOf('--effort');
    expect(effortFlag).toBeGreaterThanOrEqual(0);
    expect(spawnInputs[0]!.args[effortFlag + 1]).toBe('high');
    expect(result).not.toHaveProperty('effort');
  });

  it('replays a captured error envelope without treating exit zero as success', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    let emitStdout: ((chunk: string) => void) | undefined;
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'requested-model', cliPath: 'C:/tools/codebuddy',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: () => ({
        stdout: { on: (event: string, handler: (chunk: string) => void) => {
          if (event === 'data') emitStdout = handler;
        } },
        stderr: { on: () => undefined },
        on: (event: string, handler: (...args: any[]) => void) => {
          if (event === 'close') {
            emitStdout?.('{"type":"assistant","message":{"role":"assistant","model":"actual-model","content":[{"type":"text","text":"Authentication required"}]}}\n');
            emitStdout?.('{"type":"result","subtype":"error_during_execution","is_error":true,"errors":["Authentication required"],"num_turns":2}\n');
            handler(0);
          }
        },
        kill: () => undefined,
      }),
    });
    expect(result.exitCode).toBe(0);
    expect(result.runtimeError).toBe('Authentication required');
    expect(result.model).toBe('actual-model');
  });

  it('normalizes MCP connection, advertised tools, and actual CodeGraph calls separately', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    let emitStdout: ((chunk: string) => void) | undefined;
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'requested-model', cliPath: 'C:/tools/codebuddy',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: () => ({
        stdout: { on: (event: string, handler: (chunk: string) => void) => {
          if (event === 'data') emitStdout = handler;
        } },
        stderr: { on: () => undefined },
        on: (event: string, handler: (...args: any[]) => void) => {
          if (event === 'close') {
            emitStdout?.('{"type":"system","subtype":"init","mcp_servers":[{"name":"codegraph","status":"connected"}],"tools":["Read","mcp__codegraph__zcodegraph_explore","mcp__codegraph__zcodegraph_node","mcp__codegraph__zcodegraph_search"]}\n');
            emitStdout?.('{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"explore-1","name":"mcp__codegraph__zcodegraph_explore","input":{"query":"How does X reach Y?"}},{"type":"tool_use","id":"read-1","name":"Read","input":{"file_path":"app.ts"}}]}}\n');
            emitStdout?.('{"type":"result","subtype":"success","result":"X reaches Y through Z."}\n');
            handler(0);
          }
        },
        kill: () => undefined,
      }),
    });
    expect(result.mcp).toEqual({
      servers: [{ name: 'codegraph', status: 'connected' }],
      advertisedCodeGraphTools: [
        'mcp__codegraph__zcodegraph_explore',
        'mcp__codegraph__zcodegraph_node',
        'mcp__codegraph__zcodegraph_search',
      ],
      codeGraphToolCallCount: 1,
    });
    expect(result.toolCallCount).toBeUndefined();
    expect(result.toolCalls).toHaveLength(2);
  });

  it('persists the raw transcript before returning a final response for review', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    let emitStdout: ((chunk: string) => void) | undefined;
    const adapter = await loadAdapter();
    const result = await adapter.run({
      prompt: 'test prompt', model: 'requested-model', cliPath: 'C:/tools/codebuddy',
      mcpConfig: { mcpServers: {} }, arm: 'with', isolation: snapshot,
      spawnImpl: () => ({
        stdout: { on: (event: string, handler: (chunk: string) => void) => {
          if (event === 'data') emitStdout = handler;
        } },
        stderr: { on: () => undefined },
        on: (event: string, handler: (...args: any[]) => void) => {
          if (event === 'close') {
            emitStdout?.('{"type":"function_call","name":"Read","callId":"read-1","arguments":{"file_path":"src/flask/app.py"}}\n');
            emitStdout?.('{"type":"result","subtype":"success","result":"Flask.run calls run_simple; testing uses the host helper.","model":"actual-model","total_cost_usd":0.01,"usage":{"input_tokens":10,"output_tokens":5}}\n');
            handler(0);
          }
        },
        kill: () => undefined,
      }),
    });
    expect(result.exitCode).toBe(0);
    expect(result.model).toBe('actual-model');
    expect(result.finalResponse).toContain('Flask.run calls run_simple');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.turns).toBe(1);
    expect(result.usage.credit).toBe(0.01);
    expect(await readFile(result.transcriptPath, 'utf8')).toContain('"type":"result"');
  });
});
