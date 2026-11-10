import { beforeAll, describe, expect, it } from 'vitest';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerAdapter, runBaseline } from '../scripts/agent-eval/harness/runner.mjs';

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
});
