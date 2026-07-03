# Loop Configuration — Roadmap-Sliced Development

## Active Loops

| Pattern | Cadence | Status | Command |
|---------|---------|--------|---------|
| Roadmap-Sliced Development | Human-pulled, usually one slice per active day | L2 guided implementation | See README |

## Branch Policy

- Use `zjal/<roadmap-id>` for non-trivial initiatives.
- Keep one bounded roadmap branch per initiative by default.
- Split PRs by parent node when one PR stops being reviewable.

## Human Gates

- Naming or public terminology changes
- Scope expansion into follow-up work
- Release boundary, package identity, or public URL changes
- Branch merge approval
- Process roadmap deletion or durable retention choice

## Commit Contract

- Every leaf has lightweight commit intent before implementation.
- Leaf status, notes, and verification evidence are updated before commit.
- `completed` means the gate passed or a decision-only gate was satisfied.
- Closeout is a separate commit from the final feature slice.

## PR Handoff

After the closeout commit, continue automatically to PR handoff:

- confirm the branch is clean
- push the roadmap branch
- open or update the PR with verification notes, closeout status, durable docs, and post-merge branch cleanup plan

Stopping before PR handoff is valid only for an explicit Human Gate pause or an external blocker with the exact next command recorded.

## Links

- Pattern: [roadmap-sliced-development](../../patterns/roadmap-sliced-development.md)
