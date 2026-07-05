# Loop Constraints

> Add rules below with `/constraints <rule>` in your agent.
> The `zj-loop-constraints` skill reads this file at the start of every run.
> Constraints here are **binding** — the agent MUST follow them.

## Push & Merge
- Don't push before telling me
- Never auto-merge to main without human approval
- Always create a draft PR first; let me review before marking ready

## Paths
- Never edit .env, .env.*, auth/, payments/, secrets/, credentials/
- Never edit infrastructure configs without human approval

## Code
- Always run tests before proposing a fix
- Never disable tests to make CI green
- Never refactor unrelated code — one fix per run
- Max 3 fix attempts per item; escalate after

## Communication
- Always tell me what you're about to do before doing it
- Never close an issue or PR without my approval

## Budget
- If token spend hits 80% of daily cap, switch to report-only
- If loop-pause-all is active, exit immediately

## Daily Triage
- Daily Triage is L3 readiness with L1 report-only execution.
- Run at most once per day.
- Read only GitHub Actions, open issues, open PRs, main branch commits, and `git status --short`.
- Use the cursor in `zj-loop/STATE.md` as the primary scan window; fall back to the last 24 hours only when the cursor is missing or corrupt.
- Do not scan chat, unrelated docs, the full repository, dependency freshness, security advisories, or local diffs by default.
- Only write `zj-loop/STATE.md` when new signals exist.
- Append `zj-loop/zj-loop-run-log.md` every run.
- If there is no new signal, append a no-op run-log entry and do not rewrite `zj-loop/STATE.md`.
- Do not edit product code, tests, package files, or docs outside `zj-loop/`.
- Do not create branches, worktrees, commits, PRs, issue comments, issue closures, or GitHub writes.
- Do not spawn sub-agents or automatically start follow-up loops.
- For Critical or High-Priority items, include evidence and an exact human-confirmation command; do not execute it.

---
<!-- Add your own rules below. Use plain English. The loop reads this verbatim. -->
