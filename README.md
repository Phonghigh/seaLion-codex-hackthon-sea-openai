# seaLion-codex-hackthon-sea-openai

The current seaPilot architecture is planned as a local PostgreSQL/filesystem
backend exposed with Cloudflare Quick Tunnel and a static FE hosted on ChatGPT
Sites. See the [implementation plan](plans/261031-1037-local-api-sites/plan.md)
and [CLI deployment runbook](plans/261031-1037-local-api-sites/phase-02-local-deploy-quick-tunnel.md).
The two-site Next.js frontend base is implemented with independent local fixtures.
See the [frontend runbook](docs/FRONTEND-BASE.md) and run `pnpm dev` for Customer
on port 3000 and Customer Service on port 3001. Backend integration and deployment
remain future work.

## Codex usage evidence

Every developer must enable the project hook before development so prompts and
observed tool calls become part of the public hackathon evidence. The shared
configuration is [.codex/hooks.json](.codex/hooks.json); redacted events are kept
in [.codex-usage/](.codex-usage/README.md); commit and push them with the work to
share the evidence. Node.js 20+
is required; no additional dependency is needed.

For each clone, run `node scripts/codex-usage/cli.mjs install`, start Codex from
the repository root, and review/trust the project and its hooks through `/hooks`.
Then open a new session and check real events with
`node scripts/codex-usage/cli.mjs status`.

Run `node scripts/codex-usage/cli.mjs report` before committing the work. It writes
Markdown and JSON reports including redacted prompts. Review the event
files and reports before publishing; redaction is best effort. No automatic
commit or push occurs.

See [setup and report commands](docs/codex-usage.md) and the
[current usage report](docs/codex-usage-report.md). Recording depends on active,
trusted hooks; it does not observe ChatGPT activity outside this Codex runtime.
