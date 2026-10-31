# 02 - Build tasks (Codex prompts)

Revised 31 Oct 12:05 (Asia/Saigon) for the decided stack: `web/` static on ChatGPT
Sites, `api/` Hono + SQLite on Minh's Mac behind a Cloudflare tunnel. See AGENTS.md.

How to use: each task is one prompt pasted into Codex, in order. One person may run two
tasks in parallel if they do not touch the same package. Every task has "Done when";
do not start the next one before it is met. Start every prompt with "Read AGENTS.md".

## Owners and schedule

| Task | Owner | Time | Milestone |
|---|---|---|---|
| T01 Workspace scaffold | Phong | 12:05-12:35 | |
| T02 Schema, store, seed, demo routes | Nhu (after T01) | 12:35-13:15 | |
| T03 Tool functions | Phong | 12:35-13:05 | |
| T05 CS screen (mock data first) | Minh | 12:35-13:30 | 13:30 Sites gate |
| T04 Agent loop | Phong | 13:05-13:50 | 14:00 Scene 1 with real model |
| T06 Customer screen | Minh | 13:30-14:00 | |
| T08 Approve and escalate | Nhu | 13:15-14:00 | |
| T07 Link case + what changed | Phong | 13:50-14:30 | 14:30 Scene 2 runs, WIP submitted |
| T09 Demo bar + Sites publish | Minh | 14:00-14:30 | |
| T07b Triage + routing | Phong | 14:30-15:30 | only after Scene 2 runs |
| T10 Continuity test + README | Nhu | 14:30-15:30 | 15:30 feature freeze |
| T12 Replay mode | Minh | 14:30-15:00 | |
| T11 Voice (optional) | anyone | after 15:30 and after the backup video | |

Hoang reviews every commit and runs the demo. Everyone: trust the Codex hooks
(`node scripts/codex-usage/cli.mjs install`, then `/hooks`) before the first prompt.

## Cut-line when late
- Never drop: T01, T02, T03, T04, T07, T09.
- Drop first: real image upload in T06 (use seeded images), then T07b, then Scene 4.
- 14:00 Scene 1 not running: Minh stops T06 and helps T04. 14:30 Scene 2 not running:
  everyone on T07.

## T01 - Workspace scaffold (Phong)

```text
Read AGENTS.md first.
Create a pnpm workspace with three packages:
- web/: React 18 + Vite + TypeScript strict + Tailwind + shadcn/ui + ESLint + Vitest.
  Routes /customer and /cs (react-router). Home page links to both.
  src/lib/api.ts: typed fetch client using import.meta.env.VITE_API_BASE (default
  "http://127.0.0.1:3001"). web/.env.example with VITE_API_BASE only.
- api/: Node 20 + Hono + TypeScript strict + tsx for dev + Vitest.
  GET /api/health -> { ok: true, time }. CORS middleware with an exact-origin allowlist
  from env CORS_ORIGINS (comma separated), Vary: Origin, OPTIONS handled before auth,
  CORS headers on error responses. Serve web/dist at / when the folder exists.
  Serve api/public and api/data/uploads under /files/*. api/.env.example with
  OPENAI_API_KEY, OPENAI_MODEL, DEMO_RESET_TOKEN, CORS_ORIGINS. Listen on 127.0.0.1:3001.
- shared/: Zod schemas package "@seapilot/shared" used by both.
Root scripts: dev (api + web concurrently), build, typecheck, lint, test (vitest in all
packages), test:tooling (node --test tests/codex-usage.test.mjs), db:reset, tunnel
(cloudflared tunnel --url http://127.0.0.1:3001). Exclude tests/codex-usage.test.mjs
from every Vitest config. .gitignore: api/.env, web/.env, api/data/*.db, api/data/uploads,
node_modules, dist. Keep api/data/.gitkeep and api/public/demo/ with the two images from
prompts/04-demo-data.md (create simple placeholder JPEGs if real ones are missing).
Create docs/codex-log.md row for T01.
Done when: pnpm typecheck, lint, test, test:tooling pass; pnpm dev shows the 3 pages
and GET http://127.0.0.1:3001/api/health answers.
```

After T01 (Phong, by hand): push; Minh pulls, runs `pnpm dev` and `pnpm tunnel` on the
Mac, confirms /api/health through the tunnel URL.

## T02 - Schema, store, seed, demo routes (Nhu)

```text
Read AGENTS.md (data model, decisions) and prompts/04-demo-data.md.
1. api/src/db/schema.ts: Drizzle schema for every table in AGENTS.md, SQLite dialect,
   better-sqlite3 driver, drizzle-kit migration generated into api/drizzle/.
   Ids are text (fixture strings like CS001, CONV1, EV1).
2. api/src/store/CaseStore.ts: interface with the reads and writes the routes and tools
   need (get/list for every table, create message, create evidence, create case, link
   conversation, add event, create task, update shipment, update case). sqlite.ts
   implements it. All writes go through the store.
3. api/src/store/seed.ts: loads the "Start" state and the "After Demo 1" state from
   04-demo-data.md, including customers 2 and 3 and orders DH002, DH003. Timestamps are
   computed from the demo clock (api/src/demo/clock.ts: day 0 09:00 Asia/Ho_Chi_Minh,
   advance() adds one day).
4. shared/src: Zod schemas for every table row, generated from the Drizzle schema with
   drizzle-zod where possible.
5. Routes, all requiring header x-demo-token = DEMO_RESET_TOKEN:
   POST /api/demo/reset (delete all, load Start, clock -> day 0),
   POST /api/demo/advance-day (parcel B -> delivered, updated_at = clock now, clock +1,
   case_event shipment_updated if a case exists),
   POST /api/demo/jump?to=demo2 (load After Demo 1).
   Add pnpm db:reset that calls the same reset function.
Tests: reset twice gives identical business rows (ignore timestamps); jump demo2 gives
exactly one case CS001, one conversation, one evidence row; advance-day after jump
writes shipment_updated.
Done when tests pass and the 3 routes work with curl.
```

## T03 - Tool functions (Phong)

```text
Read AGENTS.md and shared/src.
In api/src/ai/tools.ts implement 3 server functions against CaseStore. Each has a Zod
schema for arguments and result, and a JSON schema export for the Responses API tool.
1. find_cases({ customer_id?, order_id?, text? })
   -> [{ case_id, status, last_activity_at, score 0..1, reason }]
   Match on customer and order first, then on words in text.
2. get_case_context({ case_id })
   -> { case, conversations[{id, channel, opened_at, summary}], messages (last 20),
        evidence[{id, type, path, source, created_at}], events (last 20), open_tasks,
        changes_since_last_contact: [{ parcel_code, before, after }] }
   changes = shipment_snapshot in the latest reply_sent event vs current shipments.
3. get_order_shipments({ order_id })
   -> { order, parcels[{ parcel_code, items[], status, updated_at }] }
Expose GET /api/cases/:id/context and GET /api/orders/:id/shipments using the same
functions. Tests with seeded data for each function, including changes after advance-day.
Done when tests pass.
```

## T04 - Agent loop (Phong)

```text
Read AGENTS.md and prompts/03-runtime-prompt.md.
In api/src/ai/agent.ts implement suggest(conversation_id):
- Build the input from the conversation messages and the customer id.
- Call the Responses API with the 3 tools and the runtime prompt as instructions.
  Run tool calls in a loop, max 6 calls, total timeout 30 s.
- Parse the final answer with shared AgentSuggestion:
  { suggested_case_id: string|null, link_confidence: 0..1, link_reason,
    known_facts: [{ text, source }], changes: [{ text, before, after }],
    missing_info: string[] (max 1), draft_reply: string,
    proposed_action: null | { type: "escalate_to_ops", reason, evidence_ids } }
- On parse failure retry once with the validation error. If it still fails return
  { ok: false, error, suggestion: null }.
- Save each suggestion as case_event ai_suggestion when a case exists.
POST /api/agent/suggest { conversation_id } -> { ok, suggestion, error? }.
If env DEMO_REPLAY=1, return the saved suggestion from api/data/replay/<conversation
fingerprint>.json when present (T12 writes these files).
Tests with a mocked OpenAI client: tool loop, schema retry, failure envelope.
Done when tests pass and one real call works on the seeded "After Demo 1" data.
```

## T05 - CS screen (Minh)

```text
Read AGENTS.md and shared/src.
Build /cs in web/ as a 3-column workspace:
- Left: conversations (newest first) with case id or "No case", plus a tab
  "Auto-handled" for conversations with mode "auto".
- Center: chat thread for the selected conversation and a composer.
- Right: Case panel: id, status, assignee, timeline of case_events, evidence thumbnails
  (src = VITE_API_BASE + path) with a source badge and time.
  Below: "AI suggestion" card rendering AgentSuggestion: facts grouped by source with
  badges, "What changed", "Still missing", editable draft reply, buttons
  "Approve and send" and "Reject". If proposed_action exists, show it with its own
  "Approve action" button. Buttons disabled while ok is false.
  A "Suggest" button calls POST /api/agent/suggest.
Header: switcher "Signed in as: An / Binh" stored in state only.
Use typed mock data until the APIs exist, then call the real routes through
src/lib/api.ts. Done when the page renders the "After Demo 1" state from the API.
```

## T06 - Customer screen (Minh)

```text
Build /customer in web/: pick a customer (Lan, Minh Tran, Sam Lee), one chat, buttons
"New conversation", send text, attach an image. POST /api/conversations creates one,
POST /api/conversations/:id/messages sends text, POST /api/upload (multipart) stores
the file in api/data/uploads and creates an evidence row with source "customer"
linked to the conversation (case_id null until linked). If upload fails, let the user
pick one of the seeded images instead. Add those routes in api/ if T02 did not.
Done when a message and an image sent here appear in /cs.
```

## T07 - Link case and what changed (Phong)

```text
Read AGENTS.md decisions and api/src/ai.
1. When a conversation has no case and the suggestion has suggested_case_id, /cs shows
   a banner "Link to <id>?" with link_reason and buttons "Link" and "Not this case".
   POST /api/cases/:id/link-conversation { conversation_id, actor } sets
   conversation.case_id, moves that conversation's evidence to the case, sets
   case.assignee = actor, writes conversation_linked and assignee_changed.
2. The agent must fill AgentSuggestion.changes from changes_since_last_contact.
3. The runtime prompt already forbids asking for known evidence; verify with the test.
Test: reset -> jump demo2 -> advance-day -> new conversation with M2 -> suggest (mocked
model that follows the tool results). Expect suggested_case_id = CS001, one change for
parcel B in_transit -> delivered, exactly 1 missing_info, draft reply that does not
ask for the parcel A photo. Then link -> case.assignee = CS_B.
Done when the test passes and Scene 2 runs on the real model.
```

## T08 - Approve and escalate (Nhu)

```text
Read AGENTS.md rules 4 to 6 and the decisions section.
POST /api/cases/approve { conversation_id, kind: "reply"|"action", payload, actor }
- reply: if the conversation has no case, create one (id CS001 if none exists, title from
  the suggestion, order from the customer's open order), link the conversation, attach
  its evidence, write case_created. Then save the edited text as a CS message, write
  reply_sent with { actor, shipment_snapshot: { parcel_code: status } }.
- action escalate_to_ops: create a tasks row (team "operations", status "open",
  evidence_ids), set case status waiting_ops, write action_executed. Only after the
  insert succeeds return ok: true. On error return ok: false and write action_failed.
  Approving the same action twice must not create a second task.
The UI shows "Sent" or "Escalated" only after ok: true.
Tests for both kinds, the first-case path, the failure path and the double approve.
Done when tests pass.
```

## T09 - Demo bar and Sites publish (Minh)

```text
Add a demo bar on /cs shown only when the URL has ?demo=1. Buttons: Reset, Next day,
Start from Demo 2. On first use ask for the demo token once and keep it in
sessionStorage; send it as x-demo-token. After each click reload the page data.
Then: pnpm build, publish web/dist on ChatGPT Sites with VITE_API_BASE = tunnel URL,
add the Sites origin to CORS_ORIGINS, verify from a phone.
Done when Reset -> Scene 1 -> Next day -> Scene 2 -> Scene 3 works 3 times in a row
with the same result, on the Sites URL.
```

## T10 - Continuity test and README (Nhu)

```text
Write api/tests/continuity.test.ts that runs the full story with a mocked model
returning realistic AgentSuggestion objects: reset -> Scene 1 messages -> approve
reply (creates CS001) -> advance-day -> new conversation -> suggest -> link ->
approve reply -> M3 + photo -> suggest -> approve action -> approve reply.
Assert: exactly one case; 2 conversations on CS001; 2 evidence rows with source
"customer"; no reply asks again for the parcel A photo; final status waiting_ops;
assignee CS_B; one task with EV1 and EV2.
Then fill README.md: Problem, Solution, Build direction, Architecture (text diagram),
Run locally, Demo link, How we used Codex (from docs/codex-log.md and
docs/codex-usage-report.md: tasks, tests, commits), Declarations.
Done when the test passes and README is complete.
```

## T12 - Replay mode (Minh)

```text
Read AGENTS.md. In api/src/ai/agent.ts: after every successful real suggestion, save it
to api/data/replay/<fingerprint>.json where fingerprint = sha256 of customer_id +
ordered message texts of the conversation. When env DEMO_REPLAY=1 and a file matches,
return it without calling OpenAI and set suggestion.meta.replayed = true. The UI shows a
small "replayed" badge. Keep api/data/replay out of git.
Done when a run with DEMO_REPLAY=1 after one real run needs no network.
```

## T07b - Triage and routing (Phong, only after Scene 2 runs)

```text
Read AGENTS.md, docs/PRODUCT-BRIEF.md section 3, config/routing-policy.json,
config/teams.json and prompts/04-demo-data.md (customers 2 and 3, agents, demo clock).
1. api/src/ai/triage.ts: triage(message, context) -> { category, category_confidence,
   needs_human, risk, language }. Two adapters behind one interface chosen by env
   TRIAGE_PROVIDER: "decisions" (POST /v1/decisions, model DECISIONS_MODEL, questions:
   category choice, needs_human predicate, risk score 1-5, language choice) and
   "responses" (Responses API with a strict JSON schema, confidence = 1.0 for choice).
   If decisions fails, fall back to responses and log it.
2. api/src/routing/decide.ts: pure functions, no model calls.
   decideMode(triage, caseFacts, policy) -> { mode, rule, reason } applying
   routing-policy.json rules in order, first match wins.
   routeHuman(category, language, clock, teams, openCaseOwner, openCounts)
   -> { team, agent, reason, flag? } following human_routing order.
   Unit tests for every rule and routing step using the config files as fixtures.
3. On-shift checks use api/src/demo/clock.ts, never the real clock.
4. Wire: on each customer message run triage -> decideMode -> ai: run the agent with
   read-only tools, send the reply, write auto_reply, set conversation.mode = "auto";
   human: routeHuman, set assignee, write routed.
5. web: Triage card above the AI suggestion showing category + confidence, needs_human,
   risk, language, mode, team/agent and reason.
Tests: Scene 0 -> ai; Scene 1 -> human/delivery/an; after Next day Scene 2 -> human,
existing case CS001, binh; Scene 4 -> human, carlos.
Done when tests pass and Scenes 0, 1, 2 show the card with the expected decisions.
```

## T11 - Voice (optional, after 15:30 and after the backup video)

```text
Add a mic button on /customer: record, send audio to POST /api/transcribe (OpenAI audio
API, server side), put the text into the message input, then send through the normal
flow. No voice for CS. If anything fails the text input must keep working.
Done when one spoken message reaches /cs as text.
```
