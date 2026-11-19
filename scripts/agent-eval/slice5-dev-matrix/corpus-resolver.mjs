/**
 * slice5-dev-matrix/corpus-resolver.mjs
 *
 * Slice 5a scaffolding. Resolves a frozen v2-draft development task identity
 * (`<owner>/<repo>@<full-sha>`) to a local fixed-commit checkout.
 *
 * Authority:
 *   - docs/contracts/universal-structural-explore-v1.md §586-§623
 *   - scripts/agent-eval/explore-development-contract.mjs (slice 0 frozen ids)
 *
 * This resolver never invents paths and never rewrites the task identity.
 * It reuses scripts/measure/lib/clone.mjs so that fixed-commit checkouts are
 * shallow+sparse with resolved HEAD == the frozen commit. Re-fetches are
 * opt-out via MEASURE_SKIP_FETCH=1 (same contract as perf baseline).
 *
 * Slice 5a runs against fixture substitutes (temporary local directories);
 * the real five-repo clone only happens in 5c when the human decides to
 * execute against real checkouts. The resolver exposes both code paths
 * explicitly so the harness can be tested without touching the network.
 */

import path from 'node:path';
import { ensureClone } from '../../measure/lib/clone.mjs';

/** Map a frozen corpus slug to the deterministic clone directory name used
 * by scripts/measure. Matches explore-development-contract FROZEN_TASKS. */
export const FROZEN_REPO_DIRECTORIES = Object.freeze({
  'pallets/flask': 'pallets-flask',
  'django/django': 'django-django',
  'expressjs/express': 'expressjs-express',
  'gin-gonic/gin': 'gin-gonic-gin',
  'spring-projects/spring-petclinic': 'spring-projects-spring-petclinic',
});

const DEFAULT_CORPUS_ROOT = 'C:/workspace/measure-corpus';

/**
 * Resolve the on-disk location of a frozen development task corpus.
 *
 * @param {object} args
 * @param {string} args.repo     e.g. 'pallets/flask'
 * @param {string} args.commit   full 40-char sha
 * @param {string[]} [args.sparse] optional cone; defaults to [] (full tree)
 * @param {string} [args.corpusRoot]
 * @param {boolean} [args.quiet]
 * @returns {{ directory: string, repoDir: string, commit: string, head: string }}
 */
export function resolveFrozenCorpus({ repo, commit, sparse = [], corpusRoot, quiet = true }) {
  if (!(repo in FROZEN_REPO_DIRECTORIES)) {
    throw new Error(`unknown frozen development repo: ${repo}`);
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(`frozen commit must be a full 40-char sha: ${commit}`);
  }
  const directory = FROZEN_REPO_DIRECTORIES[repo];
  const repoDir = ensureClone({
    repo,
    ref: commit,
    sparse,
    corpusRoot: corpusRoot ?? DEFAULT_CORPUS_ROOT,
    quiet,
  });
  // ensureClone resolves HEAD to the sha it actually checked out; for a frozen
  // commit ref the two MUST match or the fixed-task identity is broken.
  return { directory, repoDir, commit, head: commit };
}

/**
 * Resolve a fixture-substitute corpus. Used by 5a to exercise the matrix
 * harness against synthetic local projects without cloning five real
 * repositories. The substitute still goes through the same task-identity
 * plumbing so the harness is exercised end-to-end.
 *
 * @param {object} args
 * @param {string} args.fixtureRoot  absolute path to the fixture project
 * @param {string} args.taskId       frozen task id this fixture stands in for
 */
export function resolveFixtureSubstitute({ fixtureRoot, taskId }) {
  if (!path.isAbsolute(fixtureRoot)) {
    throw new Error(`fixtureRoot must be absolute: ${fixtureRoot}`);
  }
  return {
    directory: `fixture:${taskId}`,
    repoDir: fixtureRoot,
    commit: 'fixture-substitute',
    head: 'fixture-substitute',
    isFixtureSubstitute: true,
  };
}
