/**
 * Shared CLI argument parser for scripts/measure/*.mjs.
 *
 * Flags (all optional except the positional repo URL):
 *   --ref <sha>           Pin a specific commit; defaults to the default branch HEAD.
 *   --sparse <path>       Sparse-checkout cone (e.g. "lib/"); may be repeated.
 *   --out <path>          Write the JSON report here in addition to stdout.
 *   --corpus-root <dir>   Parent directory for clones (default: C:/workspace/measure-corpus).
 *   --keep                Keep the cloned corpus after the run (default: keep — pass
 *                         --no-keep to delete; deletion is the exception, not the rule).
 *   --quiet               Suppress progress messages on stderr.
 *
 * Positional:
 *   <github-url>          e.g. https://github.com/expressjs/express or expressjs/express
 */

export function parseArgs(argv) {
  const args = {
    repo: null,
    ref: null,
    sparse: [],
    out: null,
    corpusRoot: 'C:/workspace/measure-corpus',
    keep: true,
    quiet: false,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') args.ref = argv[++i];
    else if (a === '--sparse') args.sparse.push(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--keep') args.keep = true;
    else if (a === '--no-keep') args.keep = false;
    else if (a === '--quiet') args.quiet = true;
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positional.push(a);
  }

  if (positional.length !== 1) {
    throw new Error(
      `expected exactly one positional <github-url>, got ${positional.length}`,
    );
  }
  args.repo = normalizeRepo(positional[0]);
  return args;
}

/**
 * Accept "owner/name" or "https://github.com/owner/name[.git]" or
 * "git@github.com:owner/name[.git]" and return
 * { owner, name, slug, httpsUrl, sshUrl, cloneUrl }.
 *
 * `cloneUrl` respects the MEASURE_GIT_PROTOCOL env var: "ssh" (default on
 * networks where HTTPS GitHub is blocked), "https". Default: "ssh" because
 * the Windows host running these scripts cannot reach HTTPS github.com.
 */
export function normalizeRepo(input) {
  let owner, name;
  const short = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  const ssh = input.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  const https = input.match(
    /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/,
  );
  if (short) [, owner, name] = short;
  else if (ssh) [, owner, name] = ssh;
  else if (https) [, owner, name] = https;
  else throw new Error(`unsupported repo URL: ${input}`);

  const httpsUrl = `https://github.com/${owner}/${name}.git`;
  const sshUrl = `git@github.com:${owner}/${name}.git`;
  const protocol = (process.env.MEASURE_GIT_PROTOCOL ?? 'ssh').toLowerCase();
  const cloneUrl = protocol === 'https' ? httpsUrl : sshUrl;

  return { owner, name, slug: `${owner}/${name}`, httpsUrl, sshUrl, cloneUrl };
}

export function log(args, msg) {
  if (!args.quiet) process.stderr.write(`[measure] ${msg}\n`);
}

export function fail(msg) {
  process.stderr.write(`[measure] ERROR: ${msg}\n`);
  process.exit(1);
}
