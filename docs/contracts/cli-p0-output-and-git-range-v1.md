---
doc-kind: contract
authority: primary
authority-id: DES-cli-p0-output-git-range-v1
bounded-question: "What output, error, exit-code, and Git-range guarantees must the P0 CLI hardening preserve?"
version: v1
date: 2026-10-30
---
# CLI P0 Output and Git Range Contract v1

Status: approved design; implementation pending.

## Scope

This contract governs the first CLI safety batch. It preserves successful
command-specific JSON shapes, separates machine output from diagnostics, and
moves `affected --pr` to non-shell Git argument passing. It does not introduce a
universal response envelope or change graph-analysis semantics.

P0 covers `affected`, its `--pr` input, and every existing JSON-capable command
when it is repaired by this batch: `status`, `doctor`, `query`, `files`,
`callers`, `callees`, `impact`, `dead-code`, `health`, `churn`, and
`embedding status`. Commands without `--json`, installers, and the later
`embedding run` / `retry-failed` schemas are outside this contract. Adding a
JSON option to a command is a separately reviewed feature.

## Output invariants

1. A successful `--json` invocation writes exactly one UTF-8 JSON document and
   one trailing newline to stdout. stdout contains no banner, progress, table,
   warning, ANSI escape, or explanatory text. `JSON.parse(stdout)` must work
   without removing prefixes or suffixes.
2. All diagnostics go to stderr, including Node runtime warnings, deprecation
   warnings, progress, remediation hints, and non-fatal fallbacks. Product code
   must use the CLI diagnostic Adapter rather than `console.log` or direct
   stdout writes. The implementation must prevent known launch/runtime warnings
   in supported configurations; it must not globally suppress arbitrary Node
   warnings to make a test pass.
3. `--quiet` does not mean JSON. `affected --quiet` remains newline-delimited
   paths on stdout, with diagnostics on stderr. Combining `--json --quiet`
   fails as conflicting output modes before opening the index or invoking Git.
4. Text success output remains human-oriented. Moving an incidental warning
   from stdout to stderr is allowed; changing successful result content is not.
5. Failure diagnostics do not echo credentials, file contents, environment
   values, or raw child-process stdout. Error messages include the requested
   operation and actionable cause; Git's bounded stderr may be attached as
   diagnostic text only after control characters are escaped.

## Compatibility and failures

Successful `affected` JSON retains its two existing, mutually exclusive shapes.
No `schemaVersion`, `mode`, `summary`, or `affectedSource` may be added to the
legacy shape. The `--pr` shape remains the blast-radius shape already locked by
`tests/cli-affected-pr.test.ts`.

| Invocation | Successful stdout contract |
| --- | --- |
| `affected <files...> --json` | Existing `{changedFiles, affectedTests}` object; no blast-radius-only fields. |
| `affected --pr <range> --json` | Existing `{mode, prRange, changedFiles, affectedSource, affectedTests, summary}` object. |

For a command failure with `--json`, stdout contains one error document rather
than a partial success result:

```json
{
  "error": {
    "code": "invalid-git-range",
    "message": "The Git range is invalid or ambiguous."
  }
}
```

The envelope has exactly the `error` top-level member. `code` is a stable
lower-kebab-case identifier; `message` is a non-empty single-line diagnostic.
Optional structured fields require a future version of this contract. stderr
may add human-readable context and remediation, but machine consumers must not
need to parse it.

P0 assigns the following codes. Codes classify causes; they do not change the
process exit status.

| Code | Applicable failure |
| --- | --- |
| `invalid-options` | Conflicting output flags or invalid command options. |
| `invalid-git-range` | Unsupported, missing, invalid, or ambiguous revision/range. |
| `git-unavailable` | Git cannot be started. |
| `git-command-failed` | Git starts but the requested diff fails for another reason. |
| `project-not-initialized` | The command requires an existing initialized index. |
| `index-unavailable` | The index cannot be opened, read, or is incompatible. |
| `operation-failed` | A failure with no more specific registered code. |

Exit codes are deliberately small and compatible:

| Exit | Meaning |
| --- | --- |
| `0` | The operation completed; this includes an empty affected result. |
| `1` | A command/usage failure, or a status/readiness/health command successfully evaluated a non-passing result. |
| `130` | Cooperative interruption by Ctrl+C where the command supports it. |

A successfully evaluated non-passing result with exit 1 retains that command's
registered result JSON and its health/readiness/reason fields; it is not
replaced by an error envelope. This includes `status`, `doctor`, `health`, and
`embedding status` (both dependency-not-ready and unhealthy queue results).
If evaluation itself fails, the error envelope applies. Existing Commander
usage errors retain Commander's exit 1 behavior, not a new exit 2, and remain
non-JSON responses.

P0 does not reinterpret all existing exit paths or introduce per-domain numeric
codes. An uncaught exception or unhandled rejection is a bug: the Adapter logs a
diagnostic to stderr and exits 1; it must not print a success-shaped result or
leave the process running with exit 0.

## Git range Interface

The Git-range Module accepts exactly one `A..B` string and returns changed paths
or one of the Git errors above. Its caller supplies the project directory; the
Module owns validation, process invocation, and output decoding. The CLI does
not construct a shell command.

The only accepted range syntax is two revision expressions joined by one
literal `..`. Empty sides, `...`, additional ranges, whitespace, NUL/control
characters, and a range beginning with `-` are rejected. `A` and `B` may be full
or abbreviated commit IDs or ordinary revision names such as `HEAD`,
`origin/main`, and `HEAD~3`. Arbitrary `git rev-parse` syntax, pathspecs,
reflogs, `:/text` searches, and `A...B` are not supported by P0.

A defensive validation Interface is used in addition to argv passing:

- reject `[\x00-\x20\x7f]`, backslash, and the shell/Git metacharacters
  `; & | < > $ \` ' " ! * ? [ ] ( ) { }`;
- reject any revision containing `..`, `@{`, or starting with `-` or `:`;
- allow the remaining conservative revision characters, including alphanumerics,
  `/`, `_`, `.`, `~`, `^`, `@`, `+`, `=`, `,`, `%`, and `-` inside a name.

This is an allowlist for the documented P0 form, not a shell-escaping
algorithm. A revision that Git could resolve outside this subset is deferred,
not silently rewritten. A future expansion requires its own compatibility and
injection tests.

After lexical validation, each endpoint is independently resolved with:

```text
git rev-parse --verify --end-of-options <endpoint>^{commit}
```

The two verified commit IDs, not the user-controlled revision strings, are then
used for the diff:

```text
git diff -z --name-only --no-renames AOID..BOID --
```

`--end-of-options` prevents revision text from becoming an option. Resolving to
exactly one full object ID per endpoint removes revision/path ambiguity and
pins the two commits before the diff; full object IDs cannot be Git options.
The final `--` marks the end of diff revisions before the empty pathspec. Both
subprocess calls use `execFileSync('git', args, {shell: false, ...})` (or the
equivalent async argv Interface), fixed project cwd, bounded stdout/stderr, and
no string-interpolated shell command. `prRange` remains the exact validated
input.

Invalid, ambiguous, non-commit, missing, or revision/path-ambiguous input maps
to `invalid-git-range`. Failure to start Git maps to `git-unavailable`; a diff
that fails after successful resolution maps to `git-command-failed`.

Changed paths are parsed from the `-z` result, not newline splitting.
A NUL-delimited result preserves spaces and other legal filename characters.
Empty diffs succeed with empty arrays. Paths remain Git-relative paths and pass
through the existing index filtering and path-safety rules; this contract does
not make arbitrary filesystem paths readable.

## Compatibility note

The existing human-readable prefix
`git diff --name-only <range> failed in <project>` is retained for Git execution
failures so current diagnostics do not break unnecessarily. The prefix is a
compatibility aid, not evidence that a shell was invoked. The JSON `error.code`
is the stable machine classification; raw Git wording and platform-specific
error text are not stable.

## Required verification

1. Parse complete stdout directly for both successful `affected` JSON shapes;
   remove the existing `(node:` truncation workaround. Assert warnings and
   diagnostics are only on stderr.
2. Exercise every P0 JSON-capable command for success, failure, and (where
   applicable) unhealthy results; assert the exact registered shape and exit.
3. Test `A..B` with full/short commit IDs, `HEAD~3..HEAD`, and
   `origin/main..HEAD`; test an empty diff and filenames containing spaces,
   quotes, semicolons, and newlines.
4. Reject empty sides, `A...B`, multiple ranges, non-commit and ambiguous
   revisions, `--output=<path>..HEAD`, and inputs containing shell metacharacters.
   A fake `git` Adapter records argv and proves `shell: false`; an isolated
   sentinel directory proves no command substitution, redirection, or injected
   file creation occurs.
5. Assert `invalid-git-range`, `git-unavailable`, and `git-command-failed`
   independently. Preserve the legacy non-PR success JSON byte-for-byte after
   parsing normalization (same object, same field ordering, no new fields).

## Deferred

Uniform schemas for all future commands, additional Git revision languages,
three-dot diff semantics, machine-readable usage errors, and semantic changes
to affected-file traversal require separate design approval.
