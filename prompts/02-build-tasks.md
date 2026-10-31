# 02 – Prompt task (build)

Cách dùng: mỗi task là một prompt dán vào Codex, theo đúng thứ tự. Một người có thể chạy 2 task song song nếu task không đụng cùng file. Mỗi task có "Done when"; chưa đạt thì chưa sang task sau.

## Phân công và khung giờ

- T01 Scaffold + deploy: Phong, 10:00–10:45.
- T02 Database, seed, nút demo: Phong, 10:45–11:45.
- T03 Tool functions: Hoàng, 10:45–11:45.
- T04 AI agent loop: Hoàng, 11:45–12:30. Mốc 12:30: Demo 1 chạy với model thật.
- T05 Màn hình CS: Minh, 10:45–12:30.
- T06 Màn hình khách: Minh, 13:00–13:45.
- T07 Nối case + phát hiện thay đổi: Hoàng, 13:00–14:15. Mốc 14:30: Demo 2 chạy, nộp WIP.
- T08 Duyệt + chuyển vận hành: Phong, 14:00–15:00.
- T09 Thanh điều khiển demo: Phong, 14:30–15:00.
- T10 Test continuity + README: Như (chạy Codex), 15:00–16:00. Mốc 15:30: chốt tính năng.

## Cắt bớt khi trễ giờ

- Không được bỏ: T02 (reset), T03, T04, T07, T09.
- Bỏ trước: upload ảnh thật ở T06 (dùng ảnh seed), rồi phần tạo task thật ở T08 (chỉ ghi event).
- 12:30 Demo 1 chưa chạy: bỏ T06. 14:30 Demo 2 chưa chạy: cả team dồn vào T07.

## T01 – Scaffold + deploy

```text
Read AGENTS.md first.
Create a Next.js App Router project with TypeScript strict, Tailwind,
shadcn/ui, ESLint and Vitest. Add the pnpm scripts listed in AGENTS.md.
Add .gitignore that ignores .env*, and .env.example with these names only:
OPENAI_API_KEY, OPENAI_MODEL, NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_RESET_TOKEN.
Create placeholder pages /customer and /cs and a home page that links to both.
Create README.md with these sections (empty for now): Problem, Solution,
Build direction, How we used Codex, Architecture, Run locally, Declarations.
Create docs/codex-log.md with a table header.
Done when: pnpm typecheck, lint and test pass, and pnpm dev shows the 3 pages.
```

Sau T01 (người làm, không phải Codex): push lên GitHub, nối Vercel, nhập biến môi trường, kiểm tra link chạy.

## T02 – Database, seed và nút demo

```text
Read AGENTS.md (data model) and prompts/04-demo-data.md.
1. Write a Supabase migration for all tables in the data model.
2. Write a seed that loads the "Start" state from 04-demo-data.md.
3. Add Zod schemas for every table in lib/schemas.
4. Add server routes, all protected by header x-demo-token = DEMO_RESET_TOKEN:
   - POST /api/demo/reset: delete all rows, load the "Start" state.
   - POST /api/demo/advance-day: set shipment of parcel B to "delivered"
     with updated_at = now, write a case_event "shipment_updated" if a case exists.
   - POST /api/demo/jump?to=demo2: load the "After Demo 1" state.
5. Add pnpm db:reset that calls the same reset function.
Tests: reset twice in a row gives identical rows; jump to demo2 gives
exactly one case CS001 with one conversation and one evidence row.
Done when tests pass and the 3 routes work locally.
```

## T03 – Tool functions

```text
Read AGENTS.md and lib/schemas.
In lib/ai/tools.ts implement 3 server functions. Each has a Zod schema
for its arguments and its result, and a JSON schema export for the
Responses API tool definition.
1. find_cases({ customer_id?, order_id?, text? })
   -> [{ case_id, code, status, last_activity_at, score 0..1, reason }]
   Match on customer and order first, then on words in text.
2. get_case_context({ case_id })
   -> { case, conversations[{id, channel, opened_at, summary}],
        messages (last 20), evidence[{id, type, url, source, created_at}],
        events (last 20), open_tasks }
3. get_order_shipments({ order_id })
   -> { order, parcels[{ parcel_code, items[], status, updated_at }] }
Also expose GET /api/cases/:id/context and GET /api/orders/:id/shipments
for the UI, using the same functions.
Tests with seeded data for each function.
Done when tests pass.
```

## T04 – AI agent loop

```text
Read AGENTS.md and prompts/03-runtime-prompt.md.
In lib/ai/agent.ts implement suggest(conversation_id):
- Build the input from the conversation messages and the customer id.
- Call the Responses API with the 3 tools from lib/ai/tools.ts and the
  runtime prompt as instructions. Run tool calls in a loop, max 6 calls,
  total timeout 30 s.
- The final answer must parse with the Zod schema AgentSuggestion:
  { suggested_case_id: string|null, link_confidence: 0..1, link_reason,
    known_facts: [{ text, source: "customer"|"system"|"unverified" }],
    changes: [{ text, before, after }],
    missing_info: string[] (max 1 item),
    draft_reply: string,
    proposed_action: null | { type: "escalate_to_ops", reason, evidence_ids } }
- If parsing fails, retry once with the validation error. If it still
  fails, return a safe fallback with draft_reply = "" and an error flag.
- Save each suggestion as a case_event "ai_suggestion" when a case exists.
Add POST /api/agent/suggest { conversation_id }.
Test with a mocked OpenAI client: tool loop, schema retry, fallback.
Done when tests pass and one real call works locally with the seeded data.
```

## T05 – Màn hình CS

```text
Read AGENTS.md and lib/schemas.
Build /cs as a 3-column workspace:
- Left: list of conversations (newest first) with case code or "No case".
- Center: chat thread for the selected conversation and a composer.
- Right: Case panel: code, status, assignee, timeline of case_events,
  evidence thumbnails with a source badge and time.
  Below it an "AI suggestion" card that renders AgentSuggestion:
  facts grouped by source with badges (customer / system / unverified),
  a "What changed" block, a "Still missing" block, an editable draft reply,
  and buttons "Approve and send", "Reject".
  If proposed_action exists, show it with its own "Approve action" button.
Header: a switcher "Signed in as: CS A / CS B" (no auth, stored in state).
Use typed mock data until the APIs exist, then call the real routes.
Done when the page renders the "After Demo 1" state from the API.
```

## T06 – Màn hình khách

```text
Build /customer: the customer sees one chat. Buttons: "New conversation",
send text, attach an image. Images upload to Supabase Storage and are
saved as evidence with source "customer". If upload fails, let the user
pick one of the seeded images instead.
Done when a message and an image sent here appear in /cs.
```

## T07 – Nối case và phát hiện thay đổi

```text
Read AGENTS.md and lib/ai.
1. When a new conversation has no case, /cs shows a banner
   "Link to CS001?" with link_reason from the agent, and buttons
   "Link" and "Not this case".
   POST /api/cases/:id/link-conversation { conversation_id, actor }
   sets conversation.case_id and writes case_event "conversation_linked".
2. Change detection: in get_case_context add "changes_since_last_contact":
   compare each shipment status at the time of the last CS reply with the
   current status, and list the differences.
3. The agent must use this list for AgentSuggestion.changes.
Test: reset -> jump demo2 -> advance-day -> new conversation with the
Demo 2 customer message -> suggest. Expect suggested_case_id = CS001,
a change for parcel B (in_transit -> delivered), exactly 1 missing_info,
and a draft reply that does not ask for the parcel A photo again.
Done when the test passes.
```

## T08 – Duyệt và chuyển vận hành

```text
Read AGENTS.md rules 4 to 6.
POST /api/cases/:id/approve { kind: "reply"|"action", payload, actor }
- reply: save the edited text as a CS message in the conversation,
  write case_event "reply_sent" with the approver.
- action escalate_to_ops: create a tasks row (team "operations",
  status "open", evidence_ids), set case status "waiting_ops",
  write case_event "action_executed" with the result.
  Only after the insert succeeds, return success. On error return the error
  and write case_event "action_failed".
The UI shows "Sent" or "Escalated" only after a success response.
Tests for both kinds and for the failure path.
Done when tests pass.
```

## T09 – Thanh điều khiển demo

```text
Add a small demo bar on /cs, shown only when the URL has ?demo=1.
Buttons: "Reset", "Next day", "Start from Demo 2". Each calls the
matching /api/demo route with the token from a server action
(the token must never reach the browser).
After each click, reload the data on the page.
Done when Reset -> Demo 1 -> Next day -> Demo 2 -> Demo 3 works 3 times
in a row with the same result.
```

## T10 – Test continuity và README

```text
Write tests/continuity.test.ts that runs the full story with a mocked
model that returns realistic AgentSuggestion objects:
reset -> Demo 1 messages -> advance-day -> new conversation ->
suggest -> link -> approve reply -> customer says parcel B arrived
without the cap + photo -> suggest -> approve escalation.
Assert: exactly one case; 2 conversations on CS001; 2 evidence rows with
source "customer"; no reply asks again for the parcel A photo;
final case status "waiting_ops"; a tasks row exists.
Then fill README.md: Architecture (short diagram in text), Run locally,
and "How we used Codex" built from docs/codex-log.md (number of tasks,
tests, commits).
Done when the test passes and README is complete.
```

## T07b – Triage and routing (P2, start only after Scene 2 runs)

```text
Read AGENTS.md, docs/PRODUCT-BRIEF.md section 3, config/routing-policy.json,
config/teams.json and prompts/04-demo-data.md (customers 2 and 3, agents, demo clock).
1. lib/ai/triage.ts: triage(message, context) -> { category, category_confidence,
   needs_human, risk, language }. Two adapters behind one interface, chosen by env
   TRIAGE_PROVIDER: "decisions" (POST /v1/decisions, model from env DECISIONS_MODEL,
   questions: category choice, needs_human predicate, risk score 1-5, language choice)
   and "responses" (Responses API with a strict JSON schema, confidence = 1.0 for choice).
   If the decisions call fails, fall back to "responses" and log it.
2. lib/routing/decide.ts: pure functions, no model calls.
   decideMode(triage, caseFacts, policy) -> { mode: "ai"|"human", rule: string, reason }
   applies the rules in config/routing-policy.json in order, first match wins.
   routeHuman(category, customerLanguage, clock, teams, openCaseOwner, openCounts)
   -> { team, agent, reason, flag? } following human_routing order.
   Unit tests for every rule and every routing step, using config files as fixtures.
3. Demo clock: lib/demo/clock.ts holds the current demo time; "Next day" advances it
   one day. On-shift checks use it, never the real clock.
4. Wire it: when a customer message arrives, run triage -> decideMode -> if ai: run the
   agent with read-only tools, send the reply, write case_event "auto_reply", mark the
   conversation "auto"; if human: routeHuman, set assignee, write case_event "routed".
5. UI: a Triage card above the AI suggestion on /cs showing category + confidence,
   needs_human, risk, language, mode, team/agent and the reason. An "Auto-handled"
   tab lists auto conversations.
Tests: Scene 0 -> ai; Scene 1 -> human/delivery/an; after Next day Scene 2 -> human,
existing case CS001, binh; Scene 4 -> human, carlos.
Done when tests pass and Scenes 0, 1, 2 show the card with the expected decisions.
```

## T11 – Voice for the customer (optional, after 15:30 and after the backup video)

```text
Add a mic button on /customer: record, transcribe with the OpenAI audio API,
put the text into the existing message input, then send through the normal flow.
No voice for CS. If anything fails, the text input must keep working.
Done when one spoken message reaches /cs as text.
```
