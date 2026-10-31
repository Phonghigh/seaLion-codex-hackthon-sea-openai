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

## Stack (decided 31 Oct 12:00, do not change without asking)
Two deployables, one pnpm workspace:
- `web/`   React + Vite + TypeScript strict + Tailwind + shadcn/ui.
           Builds to static files. Published on ChatGPT Sites.
           Calls the API through `VITE_API_BASE` (the Cloudflare tunnel URL).
- `api/`   Node 20 + Hono + TypeScript strict. Runs on the demo laptop (macOS).
           Exposed with `cloudflared tunnel --url http://127.0.0.1:3001`.
           Also serves `web/dist` as a fallback so one tunnel URL shows the whole app.
- `shared/` Zod schemas and types used by both (`@seapilot/shared`).
- Data: SQLite file `api/data/seapilot.db` via Drizzle ORM + better-sqlite3.
  Images: `api/public/demo/` (seed) and `api/data/uploads/` (customer uploads),
  served by the API at `/files/*` without auth.
- OpenAI SDK: Responses API with function tools for the agent.
  Decisions API for triage (T07b), fallback to Responses.
- Vitest for `api/`, `web/`, `shared/`. `tests/codex-usage.test.mjs` uses node:test
  and is run by `pnpm test:tooling`, excluded from Vitest.
No Next.js, no Supabase, no Postgres, no Vercel, no auth.

## Commands (run from repo root)
- install:    pnpm install
- dev:        pnpm dev            (api on 3001 and web on 5173, concurrently)
- build:      pnpm build          (web/dist + api/dist)
- typecheck:  pnpm typecheck
- lint:       pnpm lint
- test:       pnpm test           (vitest, all packages)
- tooling:    pnpm test:tooling   (node --test tests/codex-usage.test.mjs)
- reset:      pnpm db:reset       (same as POST /api/demo/reset)
- tunnel:     pnpm tunnel         (cloudflared quick tunnel to 3001)
Run typecheck, lint and test before you say a task is done.

## Folder layout
- web/src/pages/customer/     customer chat screen
- web/src/pages/cs/           CS workspace, demo bar
- web/src/lib/api.ts          typed fetch client, base = VITE_API_BASE
- api/src/routes/             Hono routes: demo, conversations, messages, upload,
                              agent, cases, orders, health, files
- api/src/db/schema.ts        Drizzle schema, single source of truth for tables
- api/src/store/CaseStore.ts  interface; sqlite.ts adapter; seed.ts loads 04-demo-data
- api/src/ai/                 tools.ts, agent.ts, triage.ts, prompt loader
- api/src/routing/decide.ts   pure rule engine reading config/*.json
- api/src/demo/clock.ts       demo clock (Next day moves it one day)
- shared/src/                 Zod schemas: tables, AgentSuggestion, API envelopes
- config/                     routing-policy.json, teams.json
- prompts/                    build prompts and runtime prompt (do not edit unless asked)
- docs/codex-log.md           log of every Codex task (rule 10)

## Hard rules
1. The repo is PUBLIC. Never commit secrets. Keys live only in `api/.env`
   (git-ignored). Keep `api/.env.example` and `web/.env.example` with names only.
2. OPENAI_API_KEY lives only in `api/`. The web bundle never contains a secret.
   The demo token is typed once into the demo bar and kept in sessionStorage.
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
    Keep secrets out of prompts and logs. See docs/codex-usage.md.
12. CORS on the API: exact-origin allowlist from env CORS_ORIGINS, never `*`.
    Handle OPTIONS before auth. `GET /files/*` and `GET /api/health` need no token.

## Data model
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

## Decisions that close known gaps (do not re-open)
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
- the demo still runs after POST /api/demo/reset
- no secret in the diff
- docs/codex-log.md updated
