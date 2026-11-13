import { beforeAll, describe, expect, it } from 'vitest';
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import CodeGraph from '../src/index';
import { plan } from '../src/mcp/explore-planner';
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
      async run({ isolation, model, arm }: any) {
        seen.push(isolation);
        return {
          exitCode: 0, toolCalls: [], turns: 1, usage: {}, model,
          finalResponse: `Synthetic ${arm} response; not DES evidence`,
        };
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
      async run({ isolation: context, model, arm }: any) {
        await writeFile(path.join(context.corpusDir, 'app.ts'), 'tampered\n', 'utf8');
        return {
          exitCode: 0, toolCalls: [], turns: 1, usage: {}, model,
          finalResponse: `Synthetic ${arm} response; not DES evidence`,
        };
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

  it('rejects a declared post-C run without snapshot-bound C Explore evidence before invoking an adapter', async () => {
    const sourceDir = await sourceFixture();
    let adapterInvocations = 0;
    registerAdapter('iso-post-c-unprepared', {
      async run() {
        adapterInvocations += 1;
        return {
          exitCode: 0, toolCalls: [], turns: 1, usage: {},
          model: 'synthetic-model', finalResponse: 'synthetic response, not DES evidence',
        };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: {
        ...baseOptions,
        adapterId: 'iso-post-c-unprepared',
        runId: 'iso-post-c-unprepared',
        retrieval: { arm: 'C', candidateSha256: 'a'.repeat(64) },
      },
    });

    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toMatch(/post-C.*snapshot-bound.*evidence/i);
    expect(result.arms.with.status).toBe('invalid');
    expect(result.arms.without.status).toBe('invalid');
    expect(result.diagnostics.attemptedArms).toEqual([]);
    expect(result.isolation.consumed).toBe(true);
    expect(adapterInvocations).toBe(0);
  });

  it('persists both transcript locations when the post-C gate rejects zero Explore adoption', async () => {
    const sourceDir = await sourceFixture();
    const indexed = CodeGraph.initSync(sourceDir, {
      config: { include: ['**/*.ts'], exclude: [] },
    });
    await indexed.indexAll({ engine: 'typescript' });
    await indexed.closeAndWait();
    const outDir = await mkdtemp(path.join(tmpdir(), 'zcg-post-c-diagnostic-out-'));
    const transcriptPaths = {
      with: path.join(outDir, 'with.jsonl'),
      without: path.join(outDir, 'without.jsonl'),
    };
    registerAdapter('iso-post-c-zero-explore', {
      async run({ arm, model }: any) {
        return {
          exitCode: 0, toolCalls: [], turns: 1, usage: {}, model,
          transcriptPath: transcriptPaths[arm as 'with' | 'without'],
          finalResponse: 'Synthetic response without Explore; not DES evidence',
        };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: {
        ...baseOptions,
        adapterId: 'iso-post-c-zero-explore',
        runId: 'iso-post-c-zero-explore',
        diagnosticsDir: outDir,
        retrieval: {
          arm: 'C',
          candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
        },
      },
    });

    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toBe('post-C with arm did not call the real C Explore MCP tool');
    const diagnostic = JSON.parse(await readFile(
      path.join(outDir, 'iso-post-c-zero-explore.diagnostics.json'), 'utf8',
    ));
    expect(diagnostic.evidence).toBe(false);
    expect(diagnostic.attemptedArms).toEqual(['with', 'without']);
    expect(diagnostic.arms).toEqual(['with', 'without'].map((arm) => ({
      arm,
      outcome: 'attempted',
      exitCode: 0,
      stderrTail: '',
      transcriptPath: transcriptPaths[arm as 'with' | 'without'],
    })));
    expect(diagnostic.postCPrepared.snapshotFingerprint).toBe(result.isolation.fingerprint);
    expect(result.arms.with.humanReview).toBeNull();
    expect(result.arms.without.humanReview).toBeNull();
  });

  it('renders a snapshot symbol-only file into the actual C Explore MCP answer', async () => {
    const sourceDir = await mkdtemp(path.join(tmpdir(), 'zcg-post-c-source-'));
    await writeFile(path.join(sourceDir, 'entry.ts'),
      'export function sessionEntry() { return "entry"; }\n', 'utf8');
    await writeFile(path.join(sourceDir, 'cookie.ts'),
      'export function writeSessionCookie() { return "symbol-only-source-proof";\n}\n', 'utf8');
    const indexed = CodeGraph.initSync(sourceDir, {
      config: { include: ['**/*.ts'], exclude: [] },
    });
    await indexed.indexAll({ engine: 'typescript' });
    await indexed.closeAndWait();
    const check = CodeGraph.openSync(sourceDir);
    const baseline = await plan(check, 'sessionEntry');
    expect(baseline.sortedFiles.map(([file]) => file)).not.toContain('cookie.ts');
    check.close();

    const repo = path.resolve(import.meta.dirname, '..');
    const server = {
      command: process.execPath,
      args: [path.join(repo, 'scripts/agent-eval/post-c-explore-server.mjs')],
      alwaysLoad: true,
    };
    registerAdapter('real-post-c-explore', {
      async run({ arm, mcpConfig, model, isolation: context }: any) {
        if (arm === 'without') {
          return {
            exitCode: 0, toolCalls: [], turns: 1, usage: {}, model,
            finalResponse: 'Local control response; no CodeGraph or model call',
          };
        }
        const config = mcpConfig.mcpServers.codegraph;
        const child = spawn(config.command, config.args, {
          cwd: context.corpusDir,
          env: { ...context.env, ...config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        const request = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
          name: 'zcodegraph_explore', arguments: { query: 'sessionEntry' },
        } };
        child.stdin.end(`${JSON.stringify(request)}\n`);
        const [exitCode] = await new Promise<[number]>((resolve) => {
          child.once('close', (code) => resolve([code ?? 1]));
        });
        const output = Buffer.concat(stdout).toString('utf8').trim();
        if (exitCode !== 0) {
          return {
            exitCode, toolCalls: [], turns: 0, usage: {}, model,
            stderrTail: Buffer.concat(stderr).toString('utf8'),
            finalResponse: 'Explore MCP call failed',
          };
        }
        const response = output.split('\n').filter((line) => line.trim())
          .map((line) => {
            try { return JSON.parse(line); }
            catch (error) {
              throw new Error(`MCP stdout is not JSON: ${output}; stderr=${Buffer.concat(stderr).toString('utf8')}; exit=${exitCode}; ${error}`);
            }
          }).find((message) => message.id === 1);
        const answer = response?.result?.content?.[0]?.text;
        if (typeof answer !== 'string') {
          return {
            exitCode: 1, toolCalls: [], turns: 0, usage: {}, model,
            stderrTail: `MCP response missing: ${JSON.stringify(response)}; stdout=${output}; stderr=${Buffer.concat(stderr).toString('utf8')}`,
            finalResponse: 'Explore MCP call failed',
          };
        }
        return {
          exitCode: 0,
          toolCalls: [{ name: 'mcp__codegraph__zcodegraph_explore', callId: 'local-explore-1', input: { query: 'sessionEntry' } }],
          toolResults: [{ callId: 'local-explore-1', text: answer }],
          turns: 1, usage: {}, model,
          finalResponse: 'Local agent received the bound Explore answer',
        };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: {
        ...baseOptions,
        prompt: 'sessionEntry',
        adapterId: 'real-post-c-explore',
        runId: 'post-c-explore-render',
        server,
        retrieval: {
          arm: 'C',
          candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
        },
      },
    });

    expect(result.status, JSON.stringify({
      invalidReason: result.invalidReason,
      diagnostics: result.diagnostics,
    })).toBe('valid');
    const text = result.arms.with.mcpExploreEvidence.answers[0].answer;
    expect(text).toContain('cookie.ts');
    expect(text).toContain('symbol-only-source-proof');
    expect(result.arms.with.mcpExploreEvidence).toMatchObject({
      kind: 'snapshot-bound-c-explore-evidence-v1',
      retrievalArm: 'C',
      snapshotFingerprint: result.isolation.fingerprint,
      candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
      answers: [{
        callId: 'local-explore-1',
        kind: 'snapshot-bound-c-explore-v1',
        answerSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }],
    });
    expect(result.arms.with.finalResponse).toBe('Local agent received the bound Explore answer');
    expect(result.arms.with.mcpExploreEvidence.answers[0].symbolIndexPath.startsWith(result.isolation.root))
      .toBe(false);
    expect(result.arms.without.mcpExploreEvidence).toBeUndefined();
    expect(result.arms.with.humanReview).toBeNull();
    expect(result.arms.without.humanReview).toBeNull();
    expect(result.arms.with.mcpExploreEvidence.desEligible).toBe(false);
    expect(result.arms.with.mcpExploreEvidence.evidenceLimit)
      .toBe('local MCP integration only; not a real-agent DES baseline');
  }, 60_000);

  it('keeps necessary source from later C candidates out of the final hard-ceiling cut', async () => {
    const sourceDir = await mkdtemp(path.join(tmpdir(), 'zcg-post-c-truncation-source-'));
    await writeFile(path.join(sourceDir, 'sessions.py'), [
      'class SessionInterface:',
      ...Array.from({ length: 28 }, (_, index) => [
        `    def helper_${index}(self):`,
        `        return ${JSON.stringify('cookie configuration details '.repeat(20) + index)}`,
      ].join('\n')),
      '    def get_cookie_path(self):',
      '        return "/session"',
      '',
    ].join('\n'), 'utf8');
    await writeFile(path.join(sourceDir, 'app.py'), [
      'class Flask:',
      ...Array.from({ length: 25 }, (_, index) => [
        `    def unrelated_${index}(self):`,
        `        return ${JSON.stringify('unrelated application behavior '.repeat(20) + index)}`,
      ].join('\n')),
      '    def run(self):',
      '        return run_simple("::1", 5000, self)',
      '',
    ].join('\n'), 'utf8');
    await writeFile(path.join(sourceDir, 'testing.py'), [
      'class FlaskClient:',
      '    def session_transaction(self):',
      '        self._update_cookies_from_response("example.test", "/")',
      '',
    ].join('\n'), 'utf8');
    await writeFile(path.join(sourceDir, 'test_basic.py'),
      'cookie = "incidental module-only candidate"\n', 'utf8');
    const indexed = CodeGraph.initSync(sourceDir, {
      config: { include: ['**/*.py'], exclude: [] },
    });
    await indexed.indexAll({ engine: 'typescript' });
    await indexed.closeAndWait();
    const query = 'Flask.run SERVER_NAME run_simple FlaskClient session_transaction _update_cookies_from_response cookie path';
    const check = CodeGraph.openSync(sourceDir);
    const baseline = await plan(check, query);
    expect(baseline.sortedFiles.map(([file]) => file)).toEqual(expect.arrayContaining([
      'sessions.py', 'app.py', 'testing.py',
    ]));
    check.close();

    const repo = path.resolve(import.meta.dirname, '..');
    const server = {
      command: process.execPath,
      args: [path.join(repo, 'scripts/agent-eval/post-c-explore-server.mjs')],
      alwaysLoad: true,
    };
    registerAdapter('real-post-c-truncation', {
      async run({ arm, mcpConfig, model, isolation: context }: any) {
        if (arm === 'without') {
          return {
            exitCode: 0, toolCalls: [], turns: 1, usage: {}, model,
            finalResponse: 'Local control response; no CodeGraph or model call',
          };
        }
        const config = mcpConfig.mcpServers.codegraph;
        const child = spawn(config.command, config.args, {
          cwd: context.corpusDir,
          env: { ...context.env, ...config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        child.stdin.end(`${JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
            name: 'zcodegraph_explore', arguments: { query },
          },
        })}\n`);
        const [exitCode] = await new Promise<[number]>((resolve) => {
          child.once('close', (code) => resolve([code ?? 1]));
        });
        const response = Buffer.concat(stdout).toString('utf8').trim().split('\n')
          .filter((line) => line.trim()).map((line) => JSON.parse(line))
          .find((message) => message.id === 1);
        const answer = response?.result?.content?.[0]?.text;
        if (exitCode !== 0 || typeof answer !== 'string') {
          return {
            exitCode: 1, toolCalls: [], turns: 0, usage: {}, model,
            stderrTail: Buffer.concat(stderr).toString('utf8'),
            finalResponse: 'Explore MCP call failed',
          };
        }
        return {
          exitCode: 0,
          toolCalls: [{ name: 'mcp__codegraph__zcodegraph_explore', callId: 'local-truncation-1', input: { query } }],
          toolResults: [{ callId: 'local-truncation-1', text: answer }],
          turns: 1, usage: {}, model,
          finalResponse: 'Local agent received the bound Explore answer',
        };
      },
    });

    const result = await isolation.runIsolatedBaseline({
      sourceDir,
      runBaseline,
      baselineOptions: {
        ...baseOptions,
        prompt: query,
        adapterId: 'real-post-c-truncation',
        runId: 'post-c-truncation-render',
        server,
        retrieval: {
          arm: 'C',
          candidateSha256: 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d',
        },
      },
    });

    expect(result.status, JSON.stringify(result.diagnostics)).toBe('valid');
    const text = result.arms.with.mcpExploreEvidence.answers[0].answer;
    expect(text).toContain('return run_simple("::1", 5000, self)');
    expect(text).toContain('self._update_cookies_from_response("example.test", "/")');
    expect(text).toContain('#### app.py');
    expect(text).toContain('#### testing.py');
    expect(text).not.toContain('elided[output#');
    expect(result.arms.with.mcpExploreEvidence.desEligible).toBe(false);
  }, 60_000);

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
    expect(args).toContain(['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash', 'Task'].join(','));
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

  it('correlates observed tool results without treating the final response as tool output', async () => {
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
            emitStdout?.('{"type":"function_call","name":"mcp__codegraph__zcodegraph_explore","callId":"explore-1","arguments":{"query":"sessionEntry"}}\n');
            emitStdout?.('{"type":"function_call_output","call_id":"explore-1","output":"C Explore answer from the real server"}\n');
            emitStdout?.('{"type":"result","subtype":"success","result":"Natural-language answer after receiving Explore.","model":"actual-model"}\n');
            handler(0);
          }
        },
        kill: () => undefined,
      }),
    });
    expect(result.toolResults).toEqual([{
      callId: 'explore-1', text: 'C Explore answer from the real server',
    }]);
    expect(result.finalResponse).toBe('Natural-language answer after receiving Explore.');
  });

  it('unwraps the observed nested MCP text envelope without changing its answer bytes', async () => {
    const sourceDir = await sourceFixture();
    const snapshot = await isolation.createIsolatedSnapshot({ sourceDir, env: envFixture() });
    let emitStdout: ((chunk: string) => void) | undefined;
    const adapter = await loadAdapter();
    const answer = '## Exploration: exact C answer\nwith source bytes';
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
            emitStdout?.(`${JSON.stringify({
              type: 'user', message: { content: [{
                type: 'tool_result', tool_use_id: 'explore-real-1',
                content: [{ type: 'text', text: JSON.stringify([{ type: 'text', text: answer }]) }],
              }] },
            })}\n`);
            emitStdout?.('{"type":"result","subtype":"success","result":"Final answer, not the MCP answer","model":"actual-model"}\n');
            handler(0);
          }
        },
        kill: () => undefined,
      }),
    });
    expect(result.toolResults).toEqual([{ callId: 'explore-real-1', text: answer }]);
    expect(result.finalResponse).toBe('Final answer, not the MCP answer');
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
