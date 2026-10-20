/**
 * Shallow + sparse clone helper for measurement scripts.
 *
 * Clones <repo> into <corpusRoot>/<owner>-<name> (idempotent: existing
 * directory is reused if it points at the same remote), optionally restricts
 * the working tree to a sparse cone, and resolves HEAD to a concrete sha.
 *
 * Returns { repoDir, sha, durationMs, reusedClone }.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { log } from './args.mjs';

function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    ...opts,
  }).trim();
}

export function ensureClone({ repo, ref, sparse, corpusRoot, quiet }) {
  const start = Date.now();
  const args = { quiet };
  fs.mkdirSync(corpusRoot, { recursive: true });

  const repoDir = path.join(corpusRoot, `${repo.owner}-${repo.name}`);
  let reusedClone = false;

  if (fs.existsSync(path.join(repoDir, '.git'))) {
    // Reuse existing clone — cheap path. Verify the remote matches either
    // the HTTPS or SSH form so we don't silently measure the wrong repo.
    try {
      const remote = git(['-C', repoDir, 'config', '--get', 'remote.origin.url']);
      const stripped = remote.replace(/\.git$/, '');
      const ok =
        stripped === repo.httpsUrl.replace(/\.git$/, '') ||
        stripped === repo.sshUrl.replace(/\.git$/, '');
      if (ok) {
        reusedClone = true;
        log(args, `reusing clone at ${repoDir}`);
      } else {
        throw new Error(
          `existing directory ${repoDir} points at ${remote}, not ${repo.httpsUrl}. ` +
            `Remove it or pass a different --corpus-root.`,
        );
      }
    } catch (err) {
      if (err.message.includes('points at')) throw err;
      throw new Error(
        `existing directory ${repoDir} has no remote.origin.url; refusing to reuse.`,
      );
    }
  } else {
    log(args, `cloning ${repo.slug} -> ${repoDir} (via ${repo.cloneUrl})`);
    const cloneArgs = ['clone', '--filter=blob:none', '--no-checkout', repo.cloneUrl, repoDir];
    git(cloneArgs);
  }

  // Configure sparse cone if requested.
  if (sparse.length > 0) {
    log(args, `sparse-checkout: ${sparse.join(', ')}`);
    git(['-C', repoDir, 'sparse-checkout', 'init', '--cone']);
    git(['-C', repoDir, 'sparse-checkout', 'set', ...sparse]);
  }

  // Resolve ref (default: origin/HEAD) and check out.
  const targetRef = ref ?? 'origin/HEAD';
  log(args, `checkout ${targetRef}`);
  git(['-C', repoDir, 'fetch', 'origin', '--depth=1', targetRef === 'origin/HEAD' ? 'HEAD' : targetRef]);
  git(['-C', repoDir, 'checkout', '--detach', 'FETCH_HEAD']);
  const sha = git(['-C', repoDir, 'rev-parse', 'HEAD']);

  return {
    repoDir,
    sha,
    durationMs: Date.now() - start,
    reusedClone,
  };
}
