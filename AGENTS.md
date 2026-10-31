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
- Vitest plus the Node usage-recorder suite. Both run through `pnpm test`.
- The user explicitly requested Next.js, two sites and shadcn. Preserve this
  implemented frontend; the incoming Vite/no-component-library scaffold plan
  does not authorize replacing it.
- `apps/api`: Hono on Node 20, port 4000; PostgreSQL 16 in Docker with Drizzle.
  Data access goes through the `CaseStore` interface. Cloudflared tunnels to 4000.
- Both web apps will use `NEXT_PUBLIC_API_BASE` as their API base URL. The API is
  now in scope; T01b/T02 leave both web apps unchanged, so wiring is a later task.
- Private Sites deployments are recorded in `docs/SITES-DEPLOYMENT.md`.

For frontend work, read `docs/FRONTEND-BASE.md` and `DESIGN.md`.
For backend work, read `docs/API-BASE.md`, `docs/Architecture.md` and the seed
contract in `prompts/04-demo-data.md`. Preserve the two existing web apps.

## Commands (run from repo root)
- install: `pnpm install`
- dev: `pnpm dev` (Customer 3000, Customer Service 3001)
- build: `pnpm build` (both independent Next.js builds)
- typecheck: `pnpm typecheck`
- lint: `pnpm lint`
- test: `pnpm test` (Vitest and Node recorder tests)
- API: `pnpm dev:api` (4000)
- database: `docker compose up -d db`, `pnpm db:migrate`, `pnpm db:reset`
- tunnel: `pnpm tunnel` (cloudflared to 4000)
Run typecheck, lint and test before you say a task is done.

## Hard rules
1. The repo is PUBLIC. Never commit secrets. Keys live only in `.env` (git-ignored).
   Keep `.env.example` with names only. DATABASE_URL and POSTGRES_PASSWORD are env too;
   a dev-only default may appear in docker-compose.yml.
2. OPENAI_API_KEY is server-only. The
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

## Backend data model
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
- database migration/reset and API route checks pass; frontend files stay unchanged in T01b/T02
- no secret in the diff
- docs/codex-log.md updated
