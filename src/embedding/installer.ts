/**
 * Embedding lazy-installer (roadmap 1-4-32, ADR-0010 方案 B).
 *
 * Implements `zcodegraph embedding install` / `zcodegraph embedding status`:
 * the explicit, opt-in path that turns the P2 embedding pipeline from a
 * silent fail (1-4-30 regression evidence) into a guided fix.
 *
 * Three artifacts make the pipeline ready:
 *
 *   1. **npm packages** — `fastembed` (which transitively pulls
 *      `onnxruntime-node`, ~208 MB). Installed via
 *      `npm install --prefix <projectRoot>/.zcodegraph/models fastembed@<pinned>`
 *      so the main project `node_modules` stays untouched. The version is
 *      pinned in code (ADR-0010: avoid vec-schema-mismatch from a
 *      user-installed wrong version).
 *
 *   2. **sqlite-vec `vec0` binary** — downloaded from the asg017/sqlite-vec
 *      GitHub release (pinned version, per-platform artifact) into
 *      `<projectRoot>/.zcodegraph/models/vec0.{dll,so,dylib}`. This is the
 *      path `getDefaultVec0Path()` already probes (candidate #3), so no
 *      resolver change is needed.
 *
 *   3. **ONNX model cache** — one `FlagEmbedding.init` call with
 *      `cacheDir=<projectRoot>/.zcodegraph/models` pre-pulls
 *      BGE-small-en-v1.5 (~65 MB) so the first embed doesn't stall. The
 *      embedder module is resolved with the same two-step strategy the
 *      worker uses (global import → fallback to the models-dir
 *      `node_modules` via `createRequire`), so `embedding install` works
 *      immediately after step 1 without a global fastembed install.
 *
 * Network notes (1-4-2 spike):
 *   - HuggingFace is reached via `HF_ENDPOINT=https://hf-mirror.com` when
 *     the env var is not already set, and `https_proxy`/`http_proxy` are
 *     stripped for the model init child step (Clash-class local proxies
 *     break the HF CDN handshake).
 *   - GitHub release downloads follow redirects (release asset URLs 302 to
 *     a CDN).
 *
 * All functions are injectable (exec / download / embedder loader) so the
 * contract tests in `tests/embedding-installer.test.ts` never touch the
 * network or spawn npm.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Pinned versions (ADR-0010: 版本钉死)
// ---------------------------------------------------------------------------

/**
 * fastembed spec installed into the models dir. `onnxruntime-node` is a
 * transitive dependency of fastembed (1.14.x → onnxruntime-node 1.21.0,
 * verified by the 1-4-2 spike), so only the top-level package is listed.
 *
 * **Exact pin on 1.14.5** (1-4-32 e2e evidence): 1.14.3 downloads the model
 * tarball from `storage.googleapis.com/qdrant-fastembed/…` which 403s from
 * this user base's networks (the saved XML error page then fails extraction
 * with `TAR_BAD_ARCHIVE`); 1.14.5 switched to per-file downloads via
 * `@huggingface/hub`, which honors `HF_ENDPOINT=https://hf-mirror.com`.
 * An exact pin also avoids the npm-resolves-lower-version surprise observed
 * with `^1.14.3`.
 */
export const EMBEDDING_REQUIRED_PACKAGES: ReadonlyArray<{ name: string; spec: string }> = [
  { name: 'fastembed', spec: 'fastembed@1.14.5' },
];

/** sqlite-vec release to pull vec0 from (1-4-2 spike: v0.1.9, win-x64 vec0.dll 282 KB). */
export const VEC0_VERSION = '0.1.9';

/** Model identifier surfaced in status output (the worker stamps `BGE-small-en-v1.5@384d`). */
export const EMBEDDING_MODEL_ID = 'BGE-small-en-v1.5';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** `<projectRoot>/.zcodegraph/models` — install target for all three artifacts. */
export function embeddingModelsDir(projectRoot: string): string {
  return path.join(projectRoot, '.zcodegraph', 'models');
}

/** `node_modules` under the models dir — the worker's fallback resolution root. */
export function embeddingModulesDir(projectRoot: string): string {
  return path.join(embeddingModelsDir(projectRoot), 'node_modules');
}

/** Platform-specific vec0 binary filename. */
export function vec0BinaryName(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') return 'vec0.dll';
  if (platform === 'darwin') return 'vec0.dylib';
  return 'vec0.so';
}

/**
 * sqlite-vec release asset URL for the current platform/arch.
 *
 * Asset naming on asg017/sqlite-vec releases (verified v0.1.9):
 *   sqlite-vec-<version>-loadable-linux-x86_64.tar.gz
 *   sqlite-vec-<version>-loadable-macos-{x86_64,aarch64}.tar.gz
 *   sqlite-vec-<version>-loadable-windows-x86_64.tar.gz
 *
 * Each tarball contains the platform `vec0.{so,dylib,dll}` at its root.
 */
export function vec0ReleaseAssetUrl(
  version: string = VEC0_VERSION,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  let osPart: string;
  if (platform === 'win32') osPart = 'windows-x86_64';
  else if (platform === 'darwin') osPart = arch === 'arm64' ? 'macos-aarch64' : 'macos-x86_64';
  else if (platform === 'linux') osPart = arch === 'arm64' ? 'linux-aarch64' : 'linux-x86_64';
  else throw new Error(`unsupported platform for vec0 auto-download: ${platform}`);
  return (
    `https://github.com/asg017/sqlite-vec/releases/download/v${version}/` +
    `sqlite-vec-${version}-loadable-${osPart}.tar.gz`
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export interface EmbeddingStatus {
  /** fastembed resolvable via default import OR the models-dir fallback. */
  fastembed: { ok: boolean; resolvedFrom?: 'default' | 'models-dir'; error?: string };
  /** vec0 binary present in `<projectRoot>/.zcodegraph/models/`. */
  vec0: { ok: boolean; path?: string };
  /** ONNX model cache present (fastembed's `.model-cache` dir, non-empty). */
  model: { ok: boolean; path?: string };
  /** All three ready. */
  ready: boolean;
}

/**
 * Resolve `fastembed` the way `worker.ts` does: default Node resolution
 * first (global / project node_modules), then the models-dir fallback
 * installed by `zcodegraph embedding install`.
 *
 * `options.defaultProbe` is a test seam: inject a throwing function to
 * simulate an environment where no global/project fastembed exists (the
 * production default probe uses `createRequire(...).resolve`, which is pure
 * resolution — no module side effects).
 *
 * Returns `{ resolvedFrom }` on success; throws the original resolution
 * error when neither path works.
 */
export function resolveFastembed(
  projectRoot: string,
  options?: { defaultProbe?: () => void },
): { resolvedFrom: 'default' | 'models-dir' } {
  const specifier = resolveFastembedSpecifier(embeddingModelsDir(projectRoot), options);
  return { resolvedFrom: specifier === 'fastembed' ? 'default' : 'models-dir' };
}

/**
 * Shared two-step fastembed specifier resolution (ADR-0010, 1-4-32).
 * Used by both the installer (status/install decisions) and the embed
 * worker (module loading) so the two never drift.
 *
 *   1. Bare `'fastembed'` — default Node resolution covers global installs
 *      and project-local `node_modules` (backward compatible with pre-ADR-0010
 *      setups where the user installed fastembed themselves).
 *   2. Fallback: absolute path inside `<projectRoot>/.zcodegraph/models/
 *      node_modules` — the private prefix populated by `zcodegraph
 *      embedding install`. Resolved via `createRequire` anchored at the
 *      models dir (a bare specifier would never look there).
 *
 * Throws the default-resolution error when neither location provides
 * fastembed.
 */
export function resolveFastembedSpecifier(
  modelsDir: string,
  options?: { defaultProbe?: () => void },
): string {
  const defaultProbe =
    options?.defaultProbe ??
    (() => {
      createRequire(path.join(__dirname, 'package-probe.js')).resolve('fastembed');
    });
  try {
    defaultProbe();
    return 'fastembed';
  } catch (defaultErr) {
    const anchor = path.join(modelsDir, 'package.json');
    try {
      return createRequire(anchor).resolve('fastembed');
    } catch {
      throw defaultErr;
    }
  }
}

/**
 * Detect readiness of the three embedding artifacts for `projectRoot`.
 * Pure filesystem + module-resolution checks; no network, no DB access.
 *
 * `options.defaultProbe` passes through to {@link resolveFastembed} (test
 * seam simulating an environment without global/project fastembed).
 */
export function checkEmbeddingStatus(
  projectRoot: string,
  options?: { defaultProbe?: () => void },
): EmbeddingStatus {
  const modelsDir = embeddingModelsDir(projectRoot);

  let fastembed: EmbeddingStatus['fastembed'];
  try {
    fastembed = { ok: true, ...resolveFastembed(projectRoot, options) };
  } catch (err) {
    fastembed = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const vec0Path = path.join(modelsDir, vec0BinaryName());
  const vec0 = fs.existsSync(vec0Path) ? { ok: true, path: vec0Path } : { ok: false };

  // fastembed 1.14.5 retrieveModel layout: `<cacheDir>/<repo with / → _>/…`
  // i.e. `<modelsDir>/Qdrant_bge-small-en-v1.5-onnx-Q/model_optimized.onnx`.
  // There is no `.model-cache` subdir (that name was the spike's cacheDir).
  // We check for the known repo dir with its ONNX weights present; a generic
  // "any dir containing *.onnx" fallback keeps this working across model
  // upgrades within the pinned fastembed version.
  let model: EmbeddingStatus['model'] = { ok: false };
  try {
    const entries = fs.readdirSync(modelsDir, { withFileTypes: true });
    const modelDirs = entries.filter(
      (e) => e.isDirectory() && e.name !== 'node_modules',
    );
    const hasWeights = (dir: string): boolean =>
      fs.readdirSync(dir).some((f) => f.endsWith('.onnx'));
    for (const e of modelDirs) {
      const dir = path.join(modelsDir, e.name);
      try {
        if (hasWeights(dir)) {
          model = { ok: true, path: dir };
          break;
        }
      } catch {
        /* unreadable dir — skip */
      }
    }
  } catch {
    /* models dir missing */
  }

  return { fastembed, vec0, model, ready: fastembed.ok && vec0.ok && model.ok };
}

// ---------------------------------------------------------------------------
// Download helper (redirect-following, binary-safe)
// ---------------------------------------------------------------------------

export type DownloadFn = (url: string, destPath: string) => Promise<void>;

const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_REDIRECTS = 5;

/**
 * Default downloader: `https.get` following 30x redirects (GitHub release
 * assets 302 to a CDN). Writes to `<dest>.part` and renames on success so a
 * killed download never leaves a half-written binary at the final path.
 */
export const defaultDownload: DownloadFn = (url, destPath) =>
  new Promise((resolve, reject) => {
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });
    const partPath = `${destPath}.part`;

    const attempt = (currentUrl: string, redirectsLeft: number): void => {
      const req = https.get(
        currentUrl,
        { headers: { 'User-Agent': 'zcodegraph-embedding-install' } },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            const loc = res.headers.location;
            res.resume();
            if (!loc) return reject(new Error(`redirect without Location from ${currentUrl}`));
            if (redirectsLeft <= 0) return reject(new Error(`too many redirects fetching ${url}`));
            return attempt(new URL(loc, currentUrl).toString(), redirectsLeft - 1);
          }
          if (status !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${status} fetching ${currentUrl}`));
          }
          const out = fs.createWriteStream(partPath);
          res.pipe(out);
          out.on('finish', () => {
            out.close(() => {
              try {
                fs.renameSync(partPath, destPath);
                resolve();
              } catch (err) {
                reject(err);
              }
            });
          });
          out.on('error', (err) => {
            try {
              fs.unlinkSync(partPath);
            } catch {
              /* best effort */
            }
            reject(err);
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(DOWNLOAD_TIMEOUT_MS, () =>
        req.destroy(new Error(`download timed out after ${DOWNLOAD_TIMEOUT_MS}ms: ${url}`)),
      );
    };
    attempt(url, MAX_REDIRECTS);
  });

// ---------------------------------------------------------------------------
// npm install step
// ---------------------------------------------------------------------------

export type ExecFn = (command: string, args: string[], options: { cwd: string }) => void;

export const defaultExec: ExecFn = (command, args, options) => {
  if (process.platform === 'win32') {
    // Node >= 20.12 blocks spawning `.cmd`/`.bat` without a shell
    // (CVE-2024-27980), so `execFileSync('npm.cmd', …)` throws EINVAL.
    // Build the command line ourselves with double quotes — cmd.exe
    // treats `^` as a literal inside quotes, so the pinned
    // `fastembed@^1.14.3` spec survives.
    const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a));
    execSync(`${command} ${quoted.join(' ')}`, { cwd: options.cwd, stdio: 'inherit' });
    return;
  }
  execFileSync(command, args, { cwd: options.cwd, stdio: 'inherit' });
};

/** Resolve the npm CLI for the current platform (`npm.cmd` on win32). */
function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

// ---------------------------------------------------------------------------
// Model pre-download step
// ---------------------------------------------------------------------------

export type EmbedderInitFn = (modelsDir: string, projectRoot: string) => Promise<void>;

/**
 * Default model pre-download: load fastembed (same two-step resolution as
 * the worker) and `FlagEmbedding.init` with the models dir as cacheDir.
 * fastembed pulls BGE-small-en-v1.5 from HuggingFace on first init.
 */
/**
 * Import a module specifier that may be an absolute path resolved by
 * `createRequire`. On Windows `import('C:\\…')` throws
 * `ERR_UNSUPPORTED_ESM_URL_SCHEME` — absolute paths must be converted to
 * `file://` URLs first. Bare specifiers pass through untouched.
 */
export async function importResolved(specifier: string): Promise<any> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<any>;
  const target = /^[a-zA-Z]:[\\/]/.test(specifier)
    ? pathToFileURL(specifier).href
    : specifier;
  return dynamicImport(target);
}

export const defaultEmbedderInit: EmbedderInitFn = async (modelsDir, _projectRoot) => {
  const specifier = resolveFastembedSpecifier(modelsDir);
  const mod = await importResolved(specifier);
  // HF mirror + proxy strip (1-4-2 spike): Clash-class local proxies break
  // the HF CDN handshake; hf-mirror.com must be reached directly.
  if (!process.env.HF_ENDPOINT) process.env.HF_ENDPOINT = 'https://hf-mirror.com';
  delete process.env.https_proxy;
  delete process.env.http_proxy;
  await mod.FlagEmbedding.init({
    model: mod.EmbeddingModel.BGESmallENV15,
    cacheDir: modelsDir,
  });
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface EmbeddingInstallOptions {
  /** Absolute path to the project root (where `.zcodegraph/models` lives). */
  projectRoot: string;
  /** Skip the interactive confirmation prompt. */
  yes?: boolean;
  /** Print the commands that would run, change nothing. */
  dryRun?: boolean;
  /** Skip step 3 (model pre-download) — useful on metered connections. */
  skipModelDownload?: boolean;
  /** Interactive confirm; default uses @clack/prompts on a TTY, aborts otherwise. */
  confirm?: (message: string) => Promise<boolean>;
  /** Injectable seams for tests. */
  exec?: ExecFn;
  download?: DownloadFn;
  embedderInit?: EmbedderInitFn;
  extractVec0?: ExtractVec0Fn;
  log?: (message: string) => void;
}

export interface EmbeddingInstallResult {
  modelsDir: string;
  installedPackages: boolean;
  downloadedVec0: boolean;
  downloadedModel: boolean;
  dryRun: boolean;
  /** Commands that were (or would be) executed — surfaced in dry-run output. */
  plan: string[];
}

export type ExtractVec0Fn = (tarballPath: string, binaryName: string, destPath: string) => void;

/**
 * Extract `vec0.<ext>` out of the downloaded sqlite-vec tarball.
 *
 * The loadable tarball contains exactly one file we care about at its root.
 * We avoid a tar dependency by shelling out to the system `tar` (bsdtar on
 * Windows 10+ ships in System32 and handles .tar.gz). The file is extracted
 * to stdout (`-xOf`) and written by us — no temp dir juggling.
 */
export const defaultExtractVec0: ExtractVec0Fn = (
  tarballPath: string,
  binaryName: string,
  destPath: string,
): void => {
  // `tar -tzf` lists entries; find the vec0 binary at any depth.
  // Windows gotcha: GNU tar (Git Bash) treats `C:\…` as a remote host
  // ("Cannot connect to C: resolve failed"); `--force-local` disables that.
  // bsdtar (System32 tar.exe) doesn't know the flag, so on win32 we try
  // with it first and fall back to a plain invocation.
  const forceLocal = process.platform === 'win32' ? ['--force-local'] : [];
  const runTar = (args: string[], opts: { encoding: 'utf8' | 'buffer' }): string | Buffer => {
    try {
      return execFileSync('tar', [...forceLocal, ...args], {
        encoding: opts.encoding,
        maxBuffer: 16 * 1024 * 1024,
      });
    } catch (err) {
      if (forceLocal.length > 0) {
        // bsdtar or another tar without --force-local — retry plain.
        return execFileSync('tar', args, {
          encoding: opts.encoding,
          maxBuffer: 16 * 1024 * 1024,
        });
      }
      throw err;
    }
  };
  const listing = runTar(['-tzf', tarballPath], { encoding: 'utf8' }) as string;
  const entry = listing
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.endsWith(`/${binaryName}`) || l === binaryName || l === `./${binaryName}`);
  if (!entry) {
    throw new Error(`vec0 binary ${binaryName} not found inside ${path.basename(tarballPath)}`);
  }
  const buf = runTar(['-xOf', tarballPath, entry], { encoding: 'buffer' }) as Buffer;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
};

/**
 * Run `zcodegraph embedding install`: npm packages → vec0 → model cache.
 *
 * Idempotent by construction: `npm install` on an already-satisfied prefix
 * is a no-op-ish; vec0/model steps skip when the artifact already exists.
 */
export async function runEmbeddingInstall(
  options: EmbeddingInstallOptions,
): Promise<EmbeddingInstallResult> {
  const { projectRoot, yes = false, dryRun = false, skipModelDownload = false } = options;
  const exec = options.exec ?? defaultExec;
  const download = options.download ?? defaultDownload;
  const embedderInit = options.embedderInit ?? defaultEmbedderInit;
  const extractVec0 = options.extractVec0 ?? defaultExtractVec0;
  const log = options.log ?? ((m: string) => process.stdout.write(`${m}\n`));

  const modelsDir = embeddingModelsDir(projectRoot);
  const vec0Dest = path.join(modelsDir, vec0BinaryName());
  const status = checkEmbeddingStatus(projectRoot);

  const specs = EMBEDDING_REQUIRED_PACKAGES.map((p) => p.spec);
  const npmArgs = ['install', '--prefix', modelsDir, '--no-save', '--no-audit', '--no-fund', ...specs];
  const vec0Url = vec0ReleaseAssetUrl();

  const plan: string[] = [
    `npm ${npmArgs.join(' ')}   # fastembed + onnxruntime-node (~210 MB)`,
    `GET ${vec0Url} -> ${vec0Dest}`,
    ...(skipModelDownload
      ? []
      : [`fastembed FlagEmbedding.init(cacheDir=${modelsDir})   # ${EMBEDDING_MODEL_ID} (~65 MB)`]),
  ];

  if (dryRun) {
    for (const line of plan) log(`[dry-run] ${line}`);
    return {
      modelsDir,
      installedPackages: false,
      downloadedVec0: false,
      downloadedModel: false,
      dryRun: true,
      plan,
    };
  }

  if (!yes) {
    const confirmed = await (options.confirm ?? defaultConfirm)(
      `This will download ~275 MB into ${modelsDir}:\n  ${plan.join('\n  ')}\nContinue?`,
    );
    if (!confirmed) {
      log('Aborted. Nothing was installed.');
      return {
        modelsDir,
        installedPackages: false,
        downloadedVec0: false,
        downloadedModel: false,
        dryRun: false,
        plan,
      };
    }
  }

  // Step 1 — npm packages (skip when the private models-dir copy already
  // resolves — that's the deterministic, pinned-version copy this command
  // owns; a global/project fastembed elsewhere does NOT satisfy the pin).
  let installedPackages = false;
  const modelsDirCopyOk = (() => {
    try {
      createRequire(path.join(modelsDir, 'package.json')).resolve('fastembed');
      return true;
    } catch {
      return false;
    }
  })();
  if (!modelsDirCopyOk) {
    fs.mkdirSync(modelsDir, { recursive: true });
    log(`Installing ${specs.join(' ')} into ${modelsDir} …`);
    exec(npmCommand(), npmArgs, { cwd: modelsDir });
    installedPackages = true;
  } else {
    log('fastembed already installed in models dir; skipping npm step.');
  }

  // Step 2 — vec0 binary. Primary source is the GitHub release; when that
  // is unreachable (GitHub release assets are flaky behind some networks),
  // fall back to the gh-proxy mirror used elsewhere in this repo.
  let downloadedVec0 = false;
  if (!fs.existsSync(vec0Dest)) {
    const tarballPath = path.join(modelsDir, `sqlite-vec-${VEC0_VERSION}.tar.gz`);
    const mirrorUrl = `https://gh-proxy.com/${vec0Url}`;
    log(`Downloading ${vec0Url} …`);
    try {
      await download(vec0Url, tarballPath);
    } catch (err) {
      log(
        `GitHub download failed (${err instanceof Error ? err.message : String(err)}); ` +
          `retrying via mirror …`,
      );
      await download(mirrorUrl, tarballPath);
    }
    extractVec0(tarballPath, vec0BinaryName(), vec0Dest);
    try {
      fs.unlinkSync(tarballPath);
    } catch {
      /* leave the tarball; harmless */
    }
    downloadedVec0 = true;
  } else {
    log(`vec0 already present at ${vec0Dest}; skipping download.`);
  }

  // Step 3 — ONNX model cache. The 1-4-32 e2e run saw transient
  // ECONNRESETs on the ~66 MB HF CDN transfer; retry before giving up so a
  // flaky network doesn't surface as a failed install.
  let downloadedModel = false;
  if (!skipModelDownload && !status.model.ok) {
    log(`Pre-downloading ${EMBEDDING_MODEL_ID} into ${modelsDir} …`);
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; ; attempt++) {
      try {
        await embedderInit(modelsDir, projectRoot);
        downloadedModel = true;
        break;
      } catch (err) {
        if (attempt >= MAX_ATTEMPTS) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        log(`Model download attempt ${attempt}/${MAX_ATTEMPTS} failed (${msg}); retrying in 10s …`);
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
  } else if (status.model.ok) {
    log('Model cache already present; skipping model download.');
  }

  const after = checkEmbeddingStatus(projectRoot);
  if (!after.fastembed.ok || !after.vec0.ok || (!skipModelDownload && !after.model.ok)) {
    throw new Error(
      'embedding install finished but readiness check still fails: ' +
        [
          after.fastembed.ok ? null : 'fastembed not resolvable',
          after.vec0.ok ? null : 'vec0 missing',
          skipModelDownload || after.model.ok ? null : 'model cache missing',
        ]
          .filter(Boolean)
          .join('; '),
    );
  }

  log('Embedding pipeline is ready. Next: CODEGRAPH_ENABLE_EMBEDDING=1 zcodegraph index --with-embeddings');
  return { modelsDir, installedPackages, downloadedVec0, downloadedModel, dryRun: false, plan };
}

/** Interactive confirm via @clack/prompts; non-TTY without --yes aborts. */
async function defaultConfirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@clack/prompts')>;
  const clack = await dynamicImport('@clack/prompts');
  const ans = await clack.confirm({ message });
  if (clack.isCancel(ans)) return false;
  return Boolean(ans);
}
