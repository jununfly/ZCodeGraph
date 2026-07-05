# Loop Configuration - Daily Triage (Codex)

## Active Loops

| Pattern | Cadence | Status | Automation prompt |
|---------|---------|--------|-------------------|
| Daily Triage | 1d | L3 readiness, L1 report-only execution | `Run $zj-loop-budget + $zj-loop-constraints + $zj-loop-triage. Read zj-loop/STATE.md. Scan only new GitHub Actions, issues, PRs, and main commits since the stored cursor. Update zj-loop/STATE.md only when new signals exist. Append zj-loop/zj-loop-run-log.md every run. Report only.` |

## Daily Triage Contract

- Read GitHub Actions, issues, PRs, and main branch commits only.
- Use the cursor in `zj-loop/STATE.md` as the primary scan window; fall back to the last 24 hours only when the cursor is missing or corrupt.
- Check local cleanliness with `git status --short` only; do not read local diffs by default.
- If there are no new signals, append a no-op entry to `zj-loop/zj-loop-run-log.md` and do not rewrite `zj-loop/STATE.md`.
- If there are new signals, update `zj-loop/STATE.md` with concise High-Priority, Watch, Noise, and Cursor sections.
- For every non-no-op High-Priority or Critical item, include evidence and an exact human-confirmation command.

## Human Gates

- No auto-fix until L2 checklist complete
- All high-risk paths: human review required (see zj-loop/zj-loop-safety.md denylist)
- Critical signals do not bypass report-only mode; escalate severity and write an exact next command instead.

## Worktrees

- Codex provides a built-in worktree per thread — use it for L2+ fix attempts.
- One fix per worktree; verifier subagent must APPROVE before proposing a PR.
- Daily Triage must not create branches, worktrees, commits, or PRs.

## Connectors (MCP)

- MCP optional for L1 report-only loops.
- For L2+: GitHub connector to read CI/issues; write scope limited to comments until trusted.

## Budget

- Max runs per day: 1
- Max tokens per day: 50k
- Max sub-agent spawns per run: 0
- Early-exit is required when there is no new signal.
- Review `zj-loop/STATE.md` daily + Codex Triage inbox.

## Links

- Pattern: [daily-triage](../../patterns/daily-triage.md)
- Checklist: [loop-design-checklist](../../docs/loop-design-checklist.md)
