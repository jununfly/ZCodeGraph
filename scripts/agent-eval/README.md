# Agent evaluation scripts

- `harness/` — provider-agnostic Agent Sufficiency baseline harness (ADR-0016).
  Active development surface. Harness code must not name an agent provider;
  provider-specific invocation and transcript mapping live in `harness/adapters/`.

All other scripts in this directory are **deprecated-but-kept**. They target one
specific agent CLI and are retained byte-identical so historical reports and
`run-*.jsonl` evidence remain reproducible. Do not rewrite, rename, or delete
them as part of the harness work.
