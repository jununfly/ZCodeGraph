/**
 * embedding installer — roadmap 1-4-32 (ADR-0010 方案 B).
 *
 * Contract coverage for `src/embedding/installer.ts` and the worker's
 * fastembed resolution fallback:
 *   - checkEmbeddingStatus reports the three artifacts independently
 *     (fastembed / vec0 / model cache) and aggregates `ready`
 *   - vec0ReleaseAssetUrl maps platform/arch to the asg017/sqlite-vec
 *     release asset naming scheme
 *   - runEmbeddingInstall --dry-run prints the plan and changes NOTHING
 *     (no npm exec, no download, no mkdir, no embedder init)
 *   - non-interactive without --yes aborts without side effects
 *   - install orchestration: npm prefix install → vec0 download+extract →
 *     model pre-download, with already-present steps skipped (idempotent)
 *   - worker-side resolveFastembedSpecifier prefers default resolution and
 *     falls back to the models-dir copy (tested via installer.resolveFastembed
 *     which shares the two-step strategy)
 *
 * All network / npm / fastembed calls are injected fakes — this suite never
 * touches the network, spawns npm, or loads onnxruntime.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  EMBEDDING_REQUIRED_PACKAGES,
  VEC0_VERSION,
  checkEmbeddingStatus,
  defaultExtractVec0,
  embeddingModelsDir,
  embeddingModulesDir,
  resolveFastembed,
  runEmbeddingInstall,
  vec0BinaryName,
  vec0ReleaseAssetUrl,
} from '../src/embedding/installer';
import { execFileSync } from 'node:child_process';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-emb-install-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/** Seed a fake models-dir fastembed install: package.json anchor + stub module. */
function seedModelsDirFastembed(projectRoot: string): void {
  const modulesDir = embeddingModulesDir(projectRoot);
  const pkgDir = path.join(modulesDir, 'fastembed');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(embeddingModelsDir(projectRoot), 'package.json'), '{}');
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: 'fastembed', version: '1.14.3', main: 'index.js' }),
  );
  fs.writeFileSync(path.join(pkgDir, 'index.js'), 'module.exports = {};\n');
}

function seedVec0(projectRoot: string): string {
  const p = path.join(embeddingModelsDir(projectRoot), vec0BinaryName());
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'fake-vec0-binary');
  return p;
}

function seedModelCache(projectRoot: string): string {
  // fastembed 1.14.5 retrieveModel layout: <cacheDir>/<repo with / → _>/
  const dir = path.join(
    embeddingModelsDir(projectRoot),
    'Qdrant_bge-small-en-v1.5-onnx-Q',
  );
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'model_optimized.onnx'), 'fake');
  return dir;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('embedding installer — pure helpers', () => {
  it('pins fastembed spec with a version (ADR-0010: 版本钉死)', () => {
    expect(EMBEDDING_REQUIRED_PACKAGES).toHaveLength(1);
    expect(EMBEDDING_REQUIRED_PACKAGES[0]!.name).toBe('fastembed');
    expect(EMBEDDING_REQUIRED_PACKAGES[0]!.spec).toMatch(/^fastembed@\^?1\./);
    expect(VEC0_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('vec0BinaryName maps platform to extension', () => {
    expect(vec0BinaryName('win32')).toBe('vec0.dll');
    expect(vec0BinaryName('darwin')).toBe('vec0.dylib');
    expect(vec0BinaryName('linux')).toBe('vec0.so');
  });

  it('vec0ReleaseAssetUrl follows the asg017/sqlite-vec loadable naming scheme', () => {
    expect(vec0ReleaseAssetUrl('0.1.9', 'win32', 'x64')).toBe(
      'https://github.com/asg017/sqlite-vec/releases/download/v0.1.9/sqlite-vec-0.1.9-loadable-windows-x86_64.tar.gz',
    );
    expect(vec0ReleaseAssetUrl('0.1.9', 'darwin', 'arm64')).toBe(
      'https://github.com/asg017/sqlite-vec/releases/download/v0.1.9/sqlite-vec-0.1.9-loadable-macos-aarch64.tar.gz',
    );
    expect(vec0ReleaseAssetUrl('0.1.9', 'darwin', 'x64')).toContain('macos-x86_64');
    expect(vec0ReleaseAssetUrl('0.1.9', 'linux', 'x64')).toContain('linux-x86_64');
    expect(vec0ReleaseAssetUrl('0.1.9', 'linux', 'arm64')).toContain('linux-aarch64');
  });

  it('vec0ReleaseAssetUrl rejects unknown platforms', () => {
    expect(() => vec0ReleaseAssetUrl('0.1.9', 'freebsd' as NodeJS.Platform, 'x64')).toThrow(
      /unsupported platform/,
    );
  });

  it('embeddingModelsDir is <projectRoot>/.zcodegraph/models', () => {
    expect(embeddingModelsDir('/p')).toBe(path.join('/p', '.zcodegraph', 'models'));
    expect(embeddingModulesDir('/p')).toBe(
      path.join('/p', '.zcodegraph', 'models', 'node_modules'),
    );
  });

  it('defaultExtractVec0 handles Windows drive-letter paths (GNU tar --force-local)', () => {
    // Build a real tarball with a drive-letter absolute path — the exact
    // scenario that broke with GNU tar's remote-host interpretation
    // ("Cannot connect to C: resolve failed").
    const staging = path.join(tmpRoot, 'staging');
    fs.mkdirSync(staging, { recursive: true });
    fs.writeFileSync(path.join(staging, vec0BinaryName('win32')), 'fake-vec0');
    const tarball = path.join(tmpRoot, 'vec0.tar.gz');
    // --force-local on creation too: Git Bash GNU tar rejects `C:\…` output
    // paths as remote hosts (the exact bug defaultExtractVec0 guards against).
    execFileSync('tar', ['--force-local', '-czf', tarball, '-C', staging, vec0BinaryName('win32')]);

    const dest = path.join(tmpRoot, 'out', vec0BinaryName('win32'));
    defaultExtractVec0(tarball, vec0BinaryName('win32'), dest);
    expect(fs.readFileSync(dest, 'utf8')).toBe('fake-vec0');
  });
});

// ---------------------------------------------------------------------------
// checkEmbeddingStatus — three independent artifacts
// ---------------------------------------------------------------------------

/**
 * This dev checkout has fastembed@1.14.5 in its root node_modules (1-4-2
 * spike leftover), so the default resolution probe legitimately succeeds.
 * Tests that need "no fastembed anywhere" inject a throwing defaultProbe.
 */
const noDefaultFastembed = () => {
  throw new Error('MODULE_NOT_FOUND (test-injected: no global/project fastembed)');
};

describe('checkEmbeddingStatus', () => {
  it('reports all three missing on a fresh project (the 1-4-30 silent-fail state)', () => {
    const s = checkEmbeddingStatus(tmpRoot, { defaultProbe: noDefaultFastembed });
    expect(s.ready).toBe(false);
    expect(s.fastembed.ok).toBe(false);
    expect(s.vec0.ok).toBe(false);
    expect(s.model.ok).toBe(false);
  });

  it('vec0 alone does not make the pipeline ready', () => {
    const p = seedVec0(tmpRoot);
    const s = checkEmbeddingStatus(tmpRoot, { defaultProbe: noDefaultFastembed });
    expect(s.vec0.ok).toBe(true);
    expect(s.vec0.path).toBe(p);
    expect(s.ready).toBe(false);
  });

  it('models-dir fastembed resolves via the fallback step', () => {
    seedModelsDirFastembed(tmpRoot);
    const s = checkEmbeddingStatus(tmpRoot, { defaultProbe: noDefaultFastembed });
    expect(s.fastembed.ok).toBe(true);
    expect(s.fastembed.resolvedFrom).toBe('models-dir');
    expect(s.ready).toBe(false); // still missing vec0 + model
  });

  it('all three artifacts present → ready', () => {
    seedModelsDirFastembed(tmpRoot);
    seedVec0(tmpRoot);
    seedModelCache(tmpRoot);
    const s = checkEmbeddingStatus(tmpRoot);
    expect(s.fastembed.ok).toBe(true);
    expect(s.vec0.ok).toBe(true);
    expect(s.model.ok).toBe(true);
    expect(s.ready).toBe(true);
  });

  it('a models dir without ONNX weights does not count as a downloaded model', () => {
    // e.g. the leftover GCS tarball from a failed 1.14.3 attempt
    fs.mkdirSync(embeddingModelsDir(tmpRoot), { recursive: true });
    fs.writeFileSync(
      path.join(embeddingModelsDir(tmpRoot), 'fast-bge-small-en-v1.5.tar.gz'),
      'junk',
    );
    fs.mkdirSync(path.join(embeddingModelsDir(tmpRoot), 'empty-dir'), { recursive: true });
    expect(checkEmbeddingStatus(tmpRoot, { defaultProbe: noDefaultFastembed }).model.ok).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// resolveFastembed — worker resolution order (default → models-dir)
// ---------------------------------------------------------------------------

describe('resolveFastembed (shared with worker two-step strategy)', () => {
  it('falls back to the models-dir copy installed by embedding install', () => {
    seedModelsDirFastembed(tmpRoot);
    expect(
      resolveFastembed(tmpRoot, { defaultProbe: noDefaultFastembed }).resolvedFrom,
    ).toBe('models-dir');
  });

  it('throws the default-resolution error when neither location has fastembed', () => {
    expect(() => resolveFastembed(tmpRoot, { defaultProbe: noDefaultFastembed })).toThrow();
  });

  it('reports "default" when the dev/global node_modules provides fastembed', () => {
    // No probe injection: this checkout's root node_modules has fastembed.
    expect(resolveFastembed(tmpRoot).resolvedFrom).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// runEmbeddingInstall — orchestration contracts
// ---------------------------------------------------------------------------

describe('runEmbeddingInstall', () => {
  const failIfCalled = (label: string) => () => {
    throw new Error(`${label} must not be called in this scenario`);
  };

  it('--dry-run prints the full plan and changes nothing on disk', async () => {
    const lines: string[] = [];
    const r = await runEmbeddingInstall({
      projectRoot: tmpRoot,
      dryRun: true,
      log: (m) => lines.push(m),
      exec: failIfCalled('exec'),
      download: () => failIfCalled('download')() as never,
      embedderInit: () => failIfCalled('embedderInit')() as never,
    });
    expect(r.dryRun).toBe(true);
    expect(r.installedPackages).toBe(false);
    expect(r.downloadedVec0).toBe(false);
    expect(r.downloadedModel).toBe(false);
    // Plan covers all three artifacts.
    expect(r.plan.some((l) => l.includes('npm install') && l.includes('fastembed@'))).toBe(true);
    expect(r.plan.some((l) => l.includes('sqlite-vec') && l.includes('vec0'))).toBe(true);
    expect(r.plan.some((l) => l.includes('FlagEmbedding.init'))).toBe(true);
    // Every plan line surfaced in dry-run output.
    expect(lines.filter((l) => l.startsWith('[dry-run]'))).toHaveLength(r.plan.length);
    // Nothing created on disk.
    expect(fs.existsSync(embeddingModelsDir(tmpRoot))).toBe(false);
  });

  it('--skip-model-download omits the model step from the plan', async () => {
    const r = await runEmbeddingInstall({
      projectRoot: tmpRoot,
      dryRun: true,
      skipModelDownload: true,
      log: () => {},
    });
    expect(r.plan.some((l) => l.includes('FlagEmbedding.init'))).toBe(false);
  });

  it('non-interactive without --yes aborts before any side effect', async () => {
    const lines: string[] = [];
    const r = await runEmbeddingInstall({
      projectRoot: tmpRoot,
      yes: false,
      confirm: async () => false, // user said no / no TTY
      log: (m) => lines.push(m),
      exec: failIfCalled('exec'),
      download: () => failIfCalled('download')() as never,
    });
    expect(r.installedPackages).toBe(false);
    expect(r.downloadedVec0).toBe(false);
    expect(fs.existsSync(embeddingModelsDir(tmpRoot))).toBe(false);
    expect(lines.some((l) => l.includes('Aborted'))).toBe(true);
  });

  it('--yes runs npm into the models prefix, downloads vec0, and inits the model', async () => {
    const execCalls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const downloads: Array<{ url: string; dest: string }> = [];
    const embedderInits: Array<{ modelsDir: string }> = [];

    const r = await runEmbeddingInstall({
      projectRoot: tmpRoot,
      yes: true,
      exec: (command, args, opts) => {
        execCalls.push({ command, args, cwd: opts.cwd });
        // Simulate npm having installed fastembed into the prefix.
        seedModelsDirFastembed(tmpRoot);
      },
      download: async (url, dest) => {
        downloads.push({ url, dest });
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, 'fake-tarball');
      },
      extractVec0: () => {
        // Simulate successful tar extraction (the real path shells out to
        // system tar; URL naming is covered by the vec0ReleaseAssetUrl
        // contract above).
        seedVec0(tmpRoot);
      },
      embedderInit: async (modelsDir) => {
        embedderInits.push({ modelsDir });
        seedModelCache(tmpRoot);
      },
      log: () => {},
    });

    // npm install ran with the pinned spec into the models prefix.
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0]!.args).toContain('--prefix');
    expect(execCalls[0]!.args).toContain(EMBEDDING_REQUIRED_PACKAGES[0]!.spec);
    expect(execCalls[0]!.args).toContain(embeddingModelsDir(tmpRoot));
    expect(execCalls[0]!.cwd).toBe(embeddingModelsDir(tmpRoot));

    // vec0 came from the pinned release URL.
    expect(downloads).toHaveLength(1);
    expect(downloads[0]!.url).toBe(vec0ReleaseAssetUrl());

    // model pre-download ran against the models dir cacheDir.
    expect(embedderInits).toEqual([{ modelsDir: embeddingModelsDir(tmpRoot) }]);

    expect(r.installedPackages).toBe(true);
    expect(r.dryRun).toBe(false);
    expect(checkEmbeddingStatus(tmpRoot).ready).toBe(true);
  });

  it('idempotent: a second run skips npm/vec0/model steps that already exist', async () => {
    seedModelsDirFastembed(tmpRoot);
    seedVec0(tmpRoot);
    seedModelCache(tmpRoot);

    const r = await runEmbeddingInstall({
      projectRoot: tmpRoot,
      yes: true,
      exec: failIfCalled('exec'),
      download: () => failIfCalled('download')() as never,
      embedderInit: () => failIfCalled('embedderInit')() as never,
      log: () => {},
    });
    expect(r.installedPackages).toBe(false);
    expect(r.downloadedVec0).toBe(false);
    expect(r.downloadedModel).toBe(false);
  });

  it('fails loudly when post-install readiness still fails', async () => {
    await expect(
      runEmbeddingInstall({
        projectRoot: tmpRoot,
        yes: true,
        // exec "succeeds" but never actually installs fastembed.
        exec: () => {},
        download: async (_url, dest) => {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, 'fake');
        },
        extractVec0: () => {}, // "extraction succeeded" but no vec0 written
        embedderInit: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow(/readiness check still fails/);
  });
});
