# AGENTS.md - seaPilot

## Product
seaPilot is a case workspace for e-commerce customer service (CS) agents.
One case can span many conversations and many CS agents.
The AI reads stored case data, finds what changed since the last contact,
and drafts a reply and a next action. A CS agent approves every reply and
every action before it is sent or executed.

WHAT we build: docs/PRODUCT-BRIEF.md (scenes, triage rules, cut-line).
HOW the demo runs: docs/DEMO-RUNBOOK.md. Topology: docs/Architecture.md.
Exact demo data: prompts/04-demo-data.md. Build tasks: prompts/02-build-tasks.md.

## Current stack and scope
- Two independent Next.js App Router apps with strict TypeScript: `apps/customer`
  (port 3000) and `apps/customer-service` (port 3001).
- Tailwind CSS and official shadcn/ui components in `packages/ui`; shared Zod
  schemas in `packages/contracts` and in-memory fixtures in `packages/demo`.
- `apps/api`: Hono on Node 20+, strict TypeScript, run with `tsx`, port 4000.
- PostgreSQL 16 in Docker (`docker-compose.yml` at the repo root), Drizzle ORM
  with the `postgres` driver, migrations in `apps/api/drizzle`. All data access
  goes through a `CaseStore` interface in `apps/api/src/store`.
- OpenAI Responses API with function tools, server side only, model from `OPENAI_MODEL`.
- Both web apps will call the API through `NEXT_PUBLIC_API_BASE`. `packages/demo`
  stays only as a fallback for UI development.
- Exposed for the demo with: `cloudflared tunnel --url http://127.0.0.1:4000`
- Vitest plus the Node usage-recorder suite. Both run through `pnpm test`.
- The user explicitly requested Next.js, two sites and shadcn. Preserve this
  implemented frontend; the incoming Vite/no-component-library scaffold plan
  does not authorize replacing it.

For frontend work, read `docs/FRONTEND-BASE.md` for commands and scope,
`DESIGN.md` for tokens and components, and `docs/FRONTEND-IMPLEMENTATION-PLAN.md`
for delivery status. For backend work, read `docs/Architecture.md` and
`prompts/02-build-tasks.md`: they preserve main's Hono/PostgreSQL/Drizzle/tunnel
integration plan, not implemented services. Adapt their one-package/Vite paths
to this workspace before implementation. Do not replace the frontend or deploy
without a new user instruction.

## Commands (run from repo root)
- install: `pnpm install`
- dev: `pnpm dev` (Customer 3000, Customer Service 3001)
- build: `pnpm build` (both independent Next.js builds)
- typecheck: `pnpm typecheck`
- lint: `pnpm lint`
- test: `pnpm test` (Vitest and Node recorder tests)
- reset: local preview Reset control (no backend reset exists yet)
Run typecheck, lint and test before you say a task is done.
Database, migration and tunnel commands in the integration plan are not available
in the current package scripts.

## Hard rules
1. The repo is PUBLIC. Never commit secrets. Keys live only in `.env` (git-ignored).
   Keep `.env.example` with names only. DATABASE_URL and POSTGRES_PASSWORD are env too;
   a dev-only default may appear in docker-compose.yml.
2. When backend integration is implemented, OPENAI_API_KEY is server-only. The
   web bundle never contains a secret. The planned demo token stays in sessionStorage.
3. The AI never writes to the database. It calls tools; the API validates
   the arguments with Zod and runs the query.
4. Every fact shown to CS has a source: "customer", "system" or "unverified".
5. No reply or action runs without CS approval. Record every approval and
   every result in case_events. Never show "done" before the action succeeds.
6. Never ask the customer for information that is already in the case.
7. Stay inside the demo scope. Ask before adding a new dependency.
8. Responses API: tools use the Responses API format. Do not send temperature
   or top_p. Read the model name from env OPENAI_MODEL.
9. Small commits with clear messages, with the task id: `feat(T04): agent loop`.
   Commits are authored by the team git identity; no Co-authored-by lines.
10. After each task, append to docs/codex-log.md: task id, start and end time,
    what you built, files changed, tests added, problems found.
11. Every developer must record every Codex prompt used for this project.
    Use the shared `.codex/hooks.json`; run `node scripts/codex-usage/cli.mjs install`
    after cloning, then review/trust the project and hooks via Codex CLI `/hooks`.
    `.codex-usage/events/` contains PUBLIC, redacted prompt/tool evidence and must
    be included with the related work in Git. Run `node scripts/codex-usage/cli.mjs report`
    to regenerate the shared report. Never disable or bypass recording for project work.
    Fix failed prompt recording before retrying. For activity outside hook coverage,
    add a truthful manual entry; never invent automatic evidence. Keep secrets out
    of prompts and logs. See docs/codex-usage.md.
12. CORS on the API: exact-origin allowlist from env CORS_ORIGINS, never `*`.
    Handle OPTIONS before auth. `GET /files/*` and `GET /api/health` need no token.

## Planned backend data model
customers, orders, order_items, shipments (parcel_code, status, updated_at),
cases (id = code e.g. CS001, status, assignee, order_id, title),
conversations (id, case_id nullable, customer_id, channel, opened_at, mode "human"|"auto"),
messages (id, conversation_id, role, text, created_at),
evidence (id, case_id nullable, conversation_id, type, path, source, created_at),
case_events (id, case_id, type, actor, payload json, created_at),
tasks (id, case_id, team, status, evidence_ids json, created_at).
Ids are the fixture strings from prompts/04-demo-data.md (CS001, CONV1, EV1 ...);
new rows get short random ids with the same prefix. Case status: open ->
waiting_customer -> waiting_ops -> resolved. Team id "operations", label "Warehouse Ops".

## Backend integration decisions from main
- First case: approving a reply in a conversation with no case creates the case,
  links the conversation, attaches pending evidence, writes case_created.
- Change detection baseline: every reply_sent event stores `shipment_snapshot`
  (parcel_code -> status). changes_since_last_contact = last snapshot vs now.
- Handover: POST link-conversation sets case.assignee = actor and writes
  assignee_changed. Switching "Signed in as" in the UI changes nothing in data.
- Agent failure: API returns `{ ok: false, error, suggestion: null }`; UI disables
  approve buttons. No error flag inside AgentSuggestion.
- Scene 3 reply is approved only after the escalation succeeds.

## Done means
- typecheck, lint and tests pass
- the frontend demo still runs after its local Reset control; verify backend reset once implemented
- no secret in the diff
- docs/codex-log.md updated
