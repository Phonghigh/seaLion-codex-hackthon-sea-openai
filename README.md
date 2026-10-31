# seaPilot - team seaLion (Sea x OpenAI Codex Hackathon, 31 Oct 2026)

"Customers change conversations. Agents change shifts. The case keeps going."

seaPilot is a case workspace for e-commerce customer service. The case, not the
conversation, is the unit of work: a returning customer is linked to their existing
case, the agent sees what changed since the last reply, the AI asks only the one
missing fact, and every reply and action is approved by a human.

Build direction: 02, AI-Native Products & Operations.

## Read in this order
1. [docs/PRODUCT-BRIEF.md](docs/PRODUCT-BRIEF.md) - what we build, triage rules, 5 scenes, cut-line.
2. [AGENTS.md](AGENTS.md) - rules Codex follows, stack, data model, locked decisions.
3. [docs/Architecture.md](docs/Architecture.md) - topology: static web on ChatGPT Sites,
   planned Hono API on the demo laptop behind a Cloudflare tunnel, PostgreSQL.
4. [docs/DEMO-RUNBOOK.md](docs/DEMO-RUNBOOK.md) - the 6-minute demo and fallbacks.
5. [prompts/02-build-tasks.md](prompts/02-build-tasks.md) - Codex prompts, owners, schedule.

Status: the two-site Next.js/shadcn frontend now calls the Hono/PostgreSQL API.
Customer uses port 3000, Customer Service 3001, and API 4000. See the
[frontend runbook](docs/FRONTEND-BASE.md) and [API setup](apps/api/README.md).
Set `NEXT_PUBLIC_USE_FIXTURES=1` for the original offline previews. Three complete
client-driven demo cycles pass with a mocked model and disposable PostgreSQL;
visual browser checks, live-model behavior and deployment remain unverified.
The incoming one-package/Vite scaffold does not replace these Next.js apps.

## Problem
## Solution
## Architecture
## Run locally
## Demo link
## How we used Codex

Every developer records every Codex prompt with the shared hooks. Redacted events
live in [.codex-usage/](.codex-usage/README.md) and the report in
[docs/codex-usage-report.md](docs/codex-usage-report.md). Setup:
`node scripts/codex-usage/cli.mjs install`, then trust the hooks via `/hooks` in Codex.
Task log: [docs/codex-log.md](docs/codex-log.md). Details: [docs/codex-usage.md](docs/codex-usage.md).

## Declarations
Development tooling vendored in `.agents/` (Matt Pocock skills, MIT; Impeccable, Apache-2.0)
and the Codex usage recorder in `scripts/codex-usage/` are tooling, not product code.
Commits before 10:00 on 31 Oct contain planning documents and that tooling only.
