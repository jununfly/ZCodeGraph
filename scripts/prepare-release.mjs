#!/usr/bin/env node
/**
 * Promote `## [Unreleased]` content into `## [<version>]` in CHANGELOG.md
 * so the release.yml workflow's `extract-release-notes.mjs <version>` call
 * picks up everything that landed since the last release.
 *
 * **Why this exists:** the release workflow used to do a literal
 * `extract-release-notes.mjs <version>` lookup with an `[Unreleased]`
 * fallback. The fallback only triggers if the `[<version>]` block
 * doesn't exist at all — and in practice maintainers sometimes had a
 * sparse `[<version>]` block pre-populated (e.g. one early fix
 * documented before the rest of the work landed). The workflow then
 * extracted that sparse block, ignoring the much larger `[Unreleased]`
 * section above it — so the published release notes were missing most
 * of what shipped. See v0.9.5 for the canonical post-mortem.
 *
 * **What it does**, idempotently:
 *
 *   Case A — `[<version>]` does not exist yet:
 *     Rename the `[Unreleased]` header to `[<version>] - <YYYY-MM-DD>`
 *     and add a fresh empty `## [Unreleased]` block above it. This is
 *     the common case.
 *
 *   Case B — `[<version>]` exists AND `[Unreleased]` has content:
 *     Merge `[Unreleased]`'s sub-sections (### Added / ### Fixed /
 *     ### Changed / ### Removed / ### Deprecated / ### Security) into
 *     the corresponding sub-sections of `[<version>]`. Unmatched
 *     sub-sections are appended to `[<version>]`. The `[Unreleased]`
 *     block is then emptied.
 *
 *   Case C — `[Unreleased]` has no content:
 *     No-op. Exit 0. Re-runs of the workflow are safe.
 *
 * **Where the date comes from:** for Case A, `<YYYY-MM-DD>` is the
 * UTC date at run time. Matches the existing CHANGELOG convention.
 *
 * **Usage:**
 *
 *   node scripts/prepare-release.mjs                # reads version from package.json
 *   node scripts/prepare-release.mjs 1.2.3          # explicit version
 *
 * **Output:**
 *
 *   Writes CHANGELOG.md in place. Prints a summary line to stdout
 *   like `prepare-release: 0.9.5 — promoted 6 Unreleased entries`.
 *   Exits non-zero on parse failures.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const CHANGELOG_PATH = resolve(process.cwd(), 'CHANGELOG.md');

// --- EXTRACTION_VERSION release gate -------------------------------------
//
// EXTRACTION_VERSION (src/extraction/extraction-version.ts, mirrored in the
// Rust core) identifies the *shape/depth* of extracted content. It must never
// decrease, and when CHANGELOG declares a bump ("extraction version is bumped
// to N") that N has to (a) equal the code constant and (b) be strictly greater
// than what the last released tag shipped. Previously this was a manual
// pre-release memory; this gate makes it impossible to ship a regression or a
// changelog/code drift silently. The gate is ADVISORY (skips with a log line)
// when the value can't be determined — no TS file, no released block, or git
// history/tags unavailable (shallow checkout, temp test dir) — so it never
// blocks a legitimate release it can't actually judge.
const TS_VERSION_PATH = ['src', 'extraction', 'extraction-version.ts'].join('/');
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+].*)?$/;
const CURRENT_VERSION_RE = /EXTRACTION_VERSION\s*=\s*(\d+)/;
// Matches our own CHANGELOG convention, e.g.
// "The extraction version is bumped to 2 for the whole Rust-owned batch".
const DECLARED_BUMP_RE = /extraction version (?:is )?bumped to\s+(\d+)/i;

function readCurrentExtractionVersion() {
  try {
    const m = readFileSync(resolve(process.cwd(), TS_VERSION_PATH), 'utf8').match(
      CURRENT_VERSION_RE,
    );
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function readReleasedExtractionVersion(tagVersion) {
  try {
    const text = execFileSync('git', ['show', `v${tagVersion}:${TS_VERSION_PATH}`], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = text.match(CURRENT_VERSION_RE);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function lastReleasedVersion(blocks) {
  return blocks.find((b) => b.name !== 'Unreleased' && SEMVER_RE.test(b.name))?.name ?? null;
}

function declaredBump(body) {
  for (const line of body) {
    const m = line.match(DECLARED_BUMP_RE);
    if (m) return Number(m[1]);
  }
  return null;
}

function assertExtractionVersionReady({ blocks, unreleasedBody }) {
  const current = readCurrentExtractionVersion();
  if (current === null) {
    console.log(
      `prepare-release: extraction-version gate skipped (no ${TS_VERSION_PATH} in tree)`,
    );
    return;
  }

  const declared = declaredBump(unreleasedBody);
  if (declared !== null && declared !== current) {
    throw new Error(
      `EXTRACTION_VERSION drift: CHANGELOG declares a bump to ${declared} but ` +
        `${TS_VERSION_PATH} is ${current}. Make them agree before releasing.`,
    );
  }

  const lastVersion = lastReleasedVersion(blocks);
  if (!lastVersion) {
    console.log(
      `prepare-release: extraction-version gate: current=${current}; no prior released CHANGELOG block to compare`,
    );
    return;
  }

  const previous = readReleasedExtractionVersion(lastVersion);
  if (previous === null) {
    console.log(
      `prepare-release: extraction-version gate: current=${current}; could not read the value ` +
        `shipped in v${lastVersion} (git history/tags unavailable) — skipped`,
    );
    return;
  }

  if (current < previous) {
    throw new Error(
      `EXTRACTION_VERSION regression: ${TS_VERSION_PATH} is ${current} but v${lastVersion} ` +
        `shipped ${previous}. Extraction versions must never decrease across releases.`,
    );
  }
  if (declared !== null && !(current > previous)) {
    throw new Error(
      `CHANGELOG declares an EXTRACTION_VERSION bump to ${current}, but v${lastVersion} already ` +
        `shipped ${previous}. A declared bump must be strictly greater than the last release.`,
    );
  }

  if (current === previous) {
    console.log(
      `prepare-release: extraction-version gate: current=${current}, unchanged since v${lastVersion} ` +
        `(OK only if this release has no extracted-content changes)`,
    );
  } else {
    console.log(
      `prepare-release: extraction-version gate: OK (${previous} @ v${lastVersion} -> ${current}` +
        (declared !== null ? ', CHANGELOG-declared' : '') +
        `)`,
    );
  }
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
  if (!pkg.version) throw new Error('package.json has no "version" field');
  return pkg.version;
}

function todayUtcIsoDate() {
  // YYYY-MM-DD in UTC. Matches the CHANGELOG's existing convention
  // (the existing dated entries don't disclose a timezone, but UTC is
  // stable across runners and is what the workflow's runner produces
  // by default anyway).
  return new Date().toISOString().slice(0, 10);
}

/**
 * Split the CHANGELOG into a header preface + an ordered list of
 * version blocks `{ header, body[] }`, preserving line content
 * verbatim so we can re-join without surprises.
 */
function parseChangelog(text) {
  const lines = text.split('\n');
  const versionHeaderRe = /^## \[([^\]]+)\](?:\s+-\s+(.+))?\s*$/;
  const preface = [];
  const blocks = []; // { header: string, name: string, body: string[] }
  let cur = null;
  for (const line of lines) {
    const m = line.match(versionHeaderRe);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { header: line, name: m[1], date: m[2] ?? null, body: [] };
    } else if (cur) {
      cur.body.push(line);
    } else {
      preface.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return { preface, blocks };
}

function joinChangelog({ preface, blocks }) {
  const parts = [preface.join('\n')];
  for (const b of blocks) {
    // Reconstruct: header + body. The block body INCLUDES the blank
    // line after the header (it was captured verbatim).
    parts.push([b.header, ...b.body].join('\n'));
  }
  return parts.join('\n');
}

/**
 * Split a block body into ordered sub-sections keyed by their
 * `### Heading`. Lines before the first `### Heading` go in
 * `leading`. Preserves the original (line-array) body inside each
 * sub-section so we can splice cleanly when merging.
 */
function splitSubsections(body) {
  const subsectionRe = /^### (\w+)\s*$/;
  const leading = [];
  const subs = []; // { heading: 'Added' | 'Fixed' | …, headerLine: string, body: string[] }
  let cur = null;
  for (const line of body) {
    const m = line.match(subsectionRe);
    if (m) {
      if (cur) subs.push(cur);
      cur = { heading: m[1], headerLine: line, body: [] };
    } else if (cur) {
      cur.body.push(line);
    } else {
      leading.push(line);
    }
  }
  if (cur) subs.push(cur);
  return { leading, subs };
}

function rebuildBody({ leading, subs }) {
  const parts = [];
  if (leading.length) parts.push(leading.join('\n'));
  for (const s of subs) {
    parts.push([s.headerLine, ...s.body].join('\n'));
  }
  return parts.join('\n').split('\n');
}

/**
 * Return true when the block has any meaningful entries (a bullet line
 * starting with `-`, `*`, or a digit) — vs. being empty / just
 * whitespace / just sub-section headers with nothing under them.
 */
function blockHasContent(body) {
  for (const line of body) {
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) return true;
  }
  return false;
}

/**
 * Trim trailing blank lines from an array of lines, then return.
 * Keeps the output tidy when merging.
 */
function trimTrailingBlank(arr) {
  let i = arr.length;
  while (i > 0 && /^\s*$/.test(arr[i - 1])) i--;
  return arr.slice(0, i);
}

function main() {
  const versionArg = process.argv[2];
  const version = versionArg || readPackageVersion();

  const text = readFileSync(CHANGELOG_PATH, 'utf8');
  const parsed = parseChangelog(text);

  const unrelIdx = parsed.blocks.findIndex((b) => b.name === 'Unreleased');
  const verIdx = parsed.blocks.findIndex((b) => b.name === version);

  if (unrelIdx === -1) {
    console.log(`prepare-release: no [Unreleased] block — nothing to do`);
    return;
  }

  const unrel = parsed.blocks[unrelIdx];
  if (!blockHasContent(unrel.body)) {
    console.log(`prepare-release: [Unreleased] is empty — nothing to do`);
    return;
  }

  // Gate the release on EXTRACTION_VERSION consistency BEFORE mutating the
  // CHANGELOG, so a drift/regression fails the run instead of promoting a bad
  // changelog. Advisory-only when the comparison inputs are unavailable.
  assertExtractionVersionReady({ blocks: parsed.blocks, unreleasedBody: unrel.body });

  if (verIdx === -1) {
    // Case A — promote Unreleased → [version].
    const today = todayUtcIsoDate();
    const promoted = {
      header: `## [${version}] - ${today}`,
      name: version,
      date: today,
      body: trimTrailingBlank(unrel.body).concat(['']), // single trailing blank
    };
    const emptied = {
      header: `## [Unreleased]`,
      name: 'Unreleased',
      date: null,
      body: ['', ''], // two blank lines for the next round of entries
    };
    parsed.blocks.splice(unrelIdx, 1, emptied, promoted);
    const next = joinChangelog(parsed);
    writeFileSync(CHANGELOG_PATH, appendLinkRef(next, version));
    console.log(`prepare-release: ${version} — renamed [Unreleased] to [${version}] - ${today}`);
    return;
  }

  // Case B — merge Unreleased sub-sections into the existing
  // [version] sub-sections. New sub-section headings encountered in
  // Unreleased that don't exist in [version] get appended.
  const ver = parsed.blocks[verIdx];
  const unrelSubs = splitSubsections(unrel.body);
  const verSubs = splitSubsections(ver.body);

  let merged = 0;
  for (const us of unrelSubs.subs) {
    const target = verSubs.subs.find((s) => s.heading === us.heading);
    const usBody = trimTrailingBlank(us.body);
    if (usBody.length === 0) continue;
    if (target) {
      // Append Unreleased's entries to the end of the version's matching
      // sub-section, keeping their original ordering. Insert a separating
      // blank line if the existing sub-section doesn't already end in one.
      const existing = trimTrailingBlank(target.body);
      const sep = existing.length && !/^\s*$/.test(existing[existing.length - 1]) ? [''] : [];
      target.body = existing.concat(sep, usBody, ['']);
    } else {
      // Append the whole sub-section to the end.
      verSubs.subs.push({
        heading: us.heading,
        headerLine: us.headerLine,
        body: usBody.concat(['']),
      });
    }
    merged += usBody.filter((l) => /^\s*([-*]|\d+\.)\s+/.test(l)).length;
  }

  ver.body = rebuildBody(verSubs);
  // Empty out Unreleased.
  unrel.body = ['', ''];

  const merged_text = joinChangelog(parsed);
  writeFileSync(CHANGELOG_PATH, appendLinkRef(merged_text, version));
  console.log(`prepare-release: ${version} — merged ${merged} Unreleased entries into existing [${version}] block`);
}

/**
 * Append a `[X.Y.Z]: https://github.com/jununfly/ZCodeGraph/releases/tag/vX.Y.Z`
 * link reference at the end of the file IF one doesn't already exist. The
 * link ref is what makes `## [X.Y.Z]` heading text auto-link to its tag in
 * GitHub's renderer; without it the heading still renders, just unlinked.
 *
 * Idempotent. The existing CHANGELOG mixes link refs scattered through the
 * file and a sorted block at the bottom — we just append at the very end,
 * which CommonMark accepts regardless.
 */
function appendLinkRef(text, version) {
  const refLine = `[${version}]: https://github.com/jununfly/ZCodeGraph/releases/tag/v${version}`;
  // Already there? Look for a line that EQUALS this (anywhere in the file)
  // to keep idempotency robust against the scattered-vs-block layout.
  const lines = text.split('\n');
  if (lines.some((l) => l.trim() === refLine)) return text;
  // Append, separated by a blank line from the prior content. Preserve a
  // single trailing newline at EOF.
  const trailingNewline = text.endsWith('\n') ? '' : '\n';
  return text + trailingNewline + refLine + '\n';
}

try {
  main();
} catch (err) {
  console.error(`prepare-release: ${err?.message ?? err}`);
  process.exit(1);
}
