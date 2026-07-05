# Loop Budget - ZCodeGraph

> Primary loop: **Daily Triage** (scaffolded by zj-loop-init)

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| Daily Triage | 1 | 50k | 0 |

## Daily Triage Cost Rules

- No new signal: append `zj-loop/zj-loop-run-log.md` only and exit.
- New signal: update `zj-loop/STATE.md` and append `zj-loop/zj-loop-run-log.md`.
- Do not spawn sub-agents.
- Do not read local diffs by default.
- Do not start implementation loops automatically.

## On budget exceed

1. Pause schedulers (`scheduler_delete` or disable automations)
2. Append event to `zj-loop/zj-loop-run-log.md`
3. Notify human (Slack / issue / zj-loop/STATE.md High Priority)

## Kill switch

- Command or issue label: `loop-pause-all`
- Resume only after human clears the flag in zj-loop/STATE.md

## Estimate spend

```bash
npx @jununfly/zj-loop-cost --pattern daily-triage
```
