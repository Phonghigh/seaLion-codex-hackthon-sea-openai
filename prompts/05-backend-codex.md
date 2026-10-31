# 05 - Backend prompts for Codex (owner: Hoang)

Written 31 Oct 12:15 (Asia/Saigon) for the workspace as merged in PR #2:
`apps/customer` (Next.js, 3000), `apps/customer-service` (Next.js, 3001),
`packages/contracts` (Zod 4), `packages/demo` (in-memory fixtures), `packages/ui`.
The backend is a new app `apps/api` on port 4000. Paste one prompt per Codex task,
in order. Do not start the next prompt before "Done when" is met.

Before the first prompt, once per machine:
- `node scripts/codex-usage/cli.mjs install`, start Codex at the repo root, trust hooks via `/hooks`.
- `corepack prepare pnpm@10.28.2 --activate`
- `git config user.name` must print `leminhhoangworking`.

| Prompt | Goal | Target |
|---|---|---|
| BE00 | AGENTS.md says the backend is in scope | 5 min |
| BE01 | apps/api + Postgres + schema + seed + demo routes | 12:20-13:00 |
| BE02 | 3 read tools + agent loop on the real model | 13:00-13:45 (Scene 1 real model) |
| BE03 | conversations, messages, upload, approve, link, what changed | 13:45-14:20 (Scene 2 by 14:30) |
| BE04 | switch both web apps from packages/demo to the API | Minh, 13:45-14:30 |
| BE05 | triage + routing, Scenes 0 and 4 | only after Scenes 2 and 3 run |

## BE00 - Put the backend back in scope

```text
Edit AGENTS.md only.
In "Current stack and scope": keep apps/customer (3000), apps/customer-service (3001),
packages/ui, packages/contracts, packages/demo. Add:
- apps/api: Hono on Node 20+, TypeScript strict, run with tsx, port 4000.
- PostgreSQL 16 in Docker (docker-compose.yml at the repo root), Drizzle ORM with the
  "postgres" driver, migrations in apps/api/drizzle. All data access goes through a
  CaseStore interface in apps/api/src/store.
- OpenAI Responses API with function tools, server side only, model from OPENAI_MODEL.
- Both web apps will call the API through NEXT_PUBLIC_API_BASE. packages/demo stays
  only as a fallback for UI development.
- Exposed for the demo with: cloudflared tunnel --url http://127.0.0.1:4000
Remove the sentences saying the backend or API integration is deferred, and the one
saying port 3001 must be reassigned. Keep every hard rule and the data model.
Add to Hard rules: commits by the team git identity, no Co-authored-by lines.
Commit: docs(BE00): backend in scope, api on port 4000.
```

## BE01 - API skeleton, database, seed, demo routes

```text
Read AGENTS.md (stack, data model, decisions), prompts/04-demo-data.md and
docs/Architecture.md (ERD).
Create apps/api as a workspace package "@seapilot/api":
1. Hono server on 127.0.0.1:4000 (env PORT). GET /api/health -> { ok: true, time, db: "up"|"down" }.
   CORS middleware: exact-origin allowlist from env CORS_ORIGINS (comma separated,
   default "http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001"),
   Vary: Origin, OPTIONS answered before auth, CORS headers also on error responses.
   GET /files/* serves apps/api/public and apps/api/data/uploads without auth.
2. docker-compose.yml at the repo root: service "db", image postgres:16, port 5432,
   named volume, POSTGRES_PASSWORD from env with a dev-only default, db name seapilot.
3. apps/api/src/db/schema.ts: Drizzle tables exactly as the ERD in docs/Architecture.md:
   customers, orders, order_items, shipments, cases, conversations, messages, evidence,
   case_events, tasks. Text primary keys. jsonb for case_events.payload and
   tasks.evidence_ids. timestamptz for times. conversations.case_id and evidence.case_id
   nullable. conversations.mode text default "human". Generate the first migration
   into apps/api/drizzle with drizzle-kit.
4. Zod row schemas in packages/contracts/src/db.ts (hand written, Zod 4, exported from
   the package index). Do not change the existing frontend schemas in that package.
5. apps/api/src/store/CaseStore.ts: interface with what routes and tools need
   (get/list per table, createConversation, addMessage, addEvidence, createCase,
   linkConversation, addEvent, createTask, updateShipment, updateCase, resetTo(state)).
   apps/api/src/store/postgres.ts implements it with Drizzle.
6. apps/api/src/demo/clock.ts: demo clock, day 0 09:00 Asia/Ho_Chi_Minh, advance() +1 day,
   now() returns the demo time. Persist the current day in a one-row table or in memory.
7. apps/api/src/demo/seed.ts: builds the "Start" and "After Demo 1" states from
   prompts/04-demo-data.md, including customers CUST001-003, orders DH001-003, items,
   shipments, and for After Demo 1: CS001, CONV1, M1, R1, EV1 and the four events.
   Timestamps are computed from the demo clock. reply_sent payload includes
   shipment_snapshot { "A": "delivered", "B": "in_transit" }.
   Copy the two demo images to apps/api/public/demo/ (generate simple placeholder JPEGs
   with the label text if no real photos exist).
8. Routes requiring header x-demo-token = DEMO_RESET_TOKEN:
   POST /api/demo/reset (truncate all tables in one statement, load Start, clock day 0),
   POST /api/demo/advance-day (parcel B -> delivered at clock now, clock +1, case_event
   shipment_updated on every open case of DH001),
   POST /api/demo/jump?to=demo2 (load After Demo 1).
9. Root package.json scripts: "dev:api", "db:up" (docker compose up -d db),
   "db:migrate", "db:reset" (calls the same reset function), "tunnel"
   (cloudflared tunnel --url http://127.0.0.1:4000). Add apps/api to "dev" and "typecheck".
   Add "apps/api/**/*.test.ts" to vitest include. apps/api/.env.example with names only:
   PORT, DATABASE_URL, POSTGRES_PASSWORD, DEMO_RESET_TOKEN, CORS_ORIGINS,
   OPENAI_API_KEY, OPENAI_MODEL. .gitignore: apps/api/.env, apps/api/data/uploads.
Tests (vitest, real Docker database; skip with a clear message when DATABASE_URL is unset):
reset twice gives identical business rows ignoring timestamps; jump demo2 gives exactly
one case CS001, one conversation, one evidence row; advance-day after jump sets B
delivered and writes shipment_updated; /api/health answers; OPTIONS from an allowed
origin returns 204 with CORS headers, from another origin returns no allow header.
Append a row to docs/codex-log.md.
Done when: pnpm db:up, pnpm db:migrate, pnpm db:reset work from a clean clone;
pnpm typecheck, lint and test pass; curl hits all routes. Commit feat(BE01).
```

## BE02 - Tools and agent loop on the real model

```text
Read AGENTS.md, prompts/03-runtime-prompt.md and apps/api/src/store.
1. apps/api/src/ai/tools.ts: three read-only functions on CaseStore, each with a Zod
   schema for arguments and result and a JSON schema export for the Responses API:
   - find_cases({ customer_id?, order_id?, text? }) -> [{ case_id, status,
     last_activity_at, score, reason }]. Rules from docs/Architecture.md "How find_cases
     decides": open cases of the same customer; same order adds to 0.9; each keyword
     found in cases.title or the last 20 messages adds 0.05, capped at 1.0; reason is a
     plain sentence.
   - get_case_context({ case_id }) -> { case, conversations[{id, channel, opened_at,
     summary}], messages (last 20), evidence[{id, type, path, source, created_at}],
     events (last 20), open_tasks, changes_since_last_contact[{ parcel_code, before,
     after }] } where changes compare the shipment_snapshot of the latest reply_sent
     event with current shipments.
   - get_order_shipments({ order_id }) -> { order, parcels[{ parcel_code, items[],
     status, updated_at }] }.
   Expose GET /api/cases/:id/context and GET /api/orders/:id/shipments with the same functions.
2. packages/contracts/src/agent.ts: AgentSuggestion Zod schema exactly as in
   prompts/02-build-tasks.md T04, plus envelope { ok: boolean, suggestion: AgentSuggestion|null,
   error?: string }.
3. apps/api/src/ai/agent.ts: suggest(conversation_id). Input = conversation messages and
   customer id. Responses API with the 3 tools, runtime prompt file as instructions,
   model from OPENAI_MODEL, no temperature/top_p. Tool loop max 6 calls, 30 s total
   timeout. Parse with AgentSuggestion; on failure retry once with the validation error;
   then return { ok: false, error, suggestion: null }. Write case_event ai_suggestion
   when the conversation has a case.
4. POST /api/agent/suggest { conversation_id } -> envelope.
Tests with a mocked OpenAI client: tool loop, schema retry, failure envelope;
find_cases scores CS001 >= 0.9 for Lan + DH001; changes_since_last_contact after
jump + advance-day returns B in_transit -> delivered.
Then run one real call against the After Demo 1 data with a script
apps/api/scripts/try-suggest.ts and paste the JSON into docs/codex-log.md.
Done when tests pass and the real call returns a valid suggestion. Commit feat(BE02).
```

## BE03 - Conversations, approve, link, what changed

```text
Read AGENTS.md "Decisions that close known gaps" and apps/api/src.
Routes (no demo token needed, Zod on every body):
- POST /api/conversations { customer_id } -> new conversation, case_id null.
- GET /api/conversations?customer_id= and GET /api/conversations/:id (with messages,
  evidence, case summary).
- POST /api/conversations/:id/messages { role: "customer", text } -> message.
- POST /api/upload (multipart: conversation_id, file) -> file to apps/api/data/uploads,
  evidence row source "customer", case_id = conversation's case or null.
  Also accept { conversation_id, seed: "parcel_a"|"parcel_b_open" } to attach a demo image.
- POST /api/cases/:id/link-conversation { conversation_id, actor } -> conversation.case_id,
  move the conversation's evidence to the case, case.assignee = actor, events
  conversation_linked and assignee_changed. Linking twice is a no-op.
- POST /api/approve { conversation_id, kind: "reply"|"action", text?, action?, actor }:
  reply: if the conversation has no case, create CS001 (or next CSnnn) for the customer's
  most recent order with title from the request, link it, attach evidence, write
  case_created. Then add the CS message and reply_sent with { actor, shipment_snapshot }.
  action escalate_to_ops: one transaction: tasks row (team "operations", status "open",
  evidence_ids), case.status = waiting_ops, action_executed. Approving twice must not
  create a second task. On error: action_failed and { ok: false }.
  A reply on a case with an open escalate action pending approval is rejected.
- GET /api/cases/:id (case, events, evidence, tasks).
Test apps/api/tests/continuity.test.ts with a mocked model returning realistic
suggestions: reset -> Scene 1 message + parcel_a -> approve reply (creates CS001) ->
advance-day -> new conversation + M2 -> suggest -> link as binh -> approve reply ->
M3 + parcel_b_open -> suggest -> approve action -> approve reply. Assert one case,
2 conversations on CS001, 2 customer evidence rows, assignee binh, status waiting_ops,
one task with both evidence ids, no reply text asks for the parcel A photo again.
Done when tests pass and the same story works with curl against the real model.
Commit feat(BE03).
```

## BE04 - Point both web apps at the API (Minh)

```text
Read AGENTS.md and apps/api routes. In apps/customer and apps/customer-service add
src/lib/api.ts: typed fetch client over NEXT_PUBLIC_API_BASE (default
http://127.0.0.1:4000) using the Zod schemas from @seapilot/contracts. Replace reads and
writes that use packages/demo with API calls: conversations, messages, upload or seed
image, suggest, link, approve, case panel, demo bar (Reset, Next day, Start from Demo 2
with the demo token asked once and kept in sessionStorage). Keep packages/demo behind
NEXT_PUBLIC_USE_FIXTURES=1 for offline UI work. Show "Sent" or "Escalated" only after
ok: true. Disable approve buttons when ok is false. Poll the conversation every 2 s.
Done when Scene 1 -> Next day -> Scene 2 -> Scene 3 runs through the API three times in
a row after Reset. Commit feat(BE04).
```

## BE05 - Triage and routing (only after Scenes 2 and 3 run)

Use prompt T07b in prompts/02-build-tasks.md with these path changes: code goes in
apps/api/src/ai/triage.ts and apps/api/src/routing/decide.ts, the clock is
apps/api/src/demo/clock.ts, the Triage card goes in apps/customer-service.
