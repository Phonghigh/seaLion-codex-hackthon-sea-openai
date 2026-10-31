# seaPilot API (T02–T04)

Hono + PostgreSQL 16, with storage behind `CaseStore`. Requires Node 20.12+
(the workspace frontend may require a newer Node release), pnpm 10.28.2 and Docker.

From the repository root:

1. Run `pnpm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env`. Set `DATABASE_URL`,
   `POSTGRES_PASSWORD` and `DEMO_RESET_TOKEN`; optionally set `PORT` and `CORS_ORIGINS`.
   The database URL must match the Compose password, local port 5432 and database
   `seapilot`. Compose has a local demo password default; set your own in `.env`.
   The agent needs server-only `OPENAI_API_KEY` and `OPENAI_MODEL`; other routes and
   mocked tests work without a key.
3. Run `pnpm db:up`, `pnpm db:migrate`, then `pnpm db:reset`.
4. Run `pnpm dev` for all three apps, or `pnpm dev:api` for just the API.

API and database bind to loopback. The API defaults to `http://127.0.0.1:4000`.
`pnpm tunnel` exposes that API when explicitly run; this task does not start it.

| Route | Authentication | Result |
| --- | --- | --- |
| `GET /api/health` | Public | `{ ok: true, time, db: "up" or "down" }` |
| `GET /files/demo/parcel_a.jpg` | Public | Labeled placeholder JPEG |
| `GET /files/demo/parcel_b_open.jpg` | Public | Labeled placeholder JPEG |
| `GET /files/<name>` | Public | File in `public/`, otherwise `data/uploads/` |
| `POST /api/demo/reset` | `x-demo-token` | Start fixtures, clock day 0 |
| `POST /api/demo/jump?to=demo2` | `x-demo-token` | After Demo 1 fixtures, clock day 0 |
| `POST /api/demo/advance-day` | `x-demo-token` | B delivered and audited at current time, then clock +1 day |
| `GET /api/cases/:id/context` | Public demo API | Case, recent messages/events, evidence, open tasks and shipment changes |
| `GET /api/orders/:id/shipments` | Public demo API | Order and parcels with their items and current statuses |
| `POST /api/agent/suggest` | Public demo API | Body `{ conversation_id }`; envelope `{ ok, suggestion, error? }` |

The token must equal `DEMO_RESET_TOKEN`; missing server configuration fails closed.
CORS accepts exact origins from `CORS_ORIGINS`, comma separated. Defaults are
localhost and 127.0.0.1 on ports 3000 and 3001. Preflight runs before authentication.

The demo clock is process-local memory. Restarting the API starts its clock at day 0;
use the HTTP reset when it is running to reset both database and clock together.
The CLI shares the reset implementation but cannot change another process's clock.
Demo control requests in one server process are serialized. Database resets use one
TRUNCATE statement and inserts in a transaction; shipment changes and audit events
also commit together. Advance-day audits every unresolved DH001 case.

`CaseStore.get(table, id)` and `list(table, partialRowFilter)` support all ten tables;
reads return ISO timestamp strings. Named writes validate with the separate Zod row
contracts. `transaction` supports atomic multi-step operations. Linking also attaches
pending evidence, changes assignee and records both audit events. Future routes must
require CS approval before calling writes for replies or actions.

The fixture document leaves Sam's item, secondary emails, and some IDs unspecified;
those are explicit demo placeholders in `seed.ts`. No expected-delivery column was
added to the exact ERD. Both parcel images are labeled illustrations, not real photos.

## Checks

`pnpm typecheck`, `pnpm lint`, and `pnpm test` run from the root. Tests intentionally
do not auto-load `.env`: integration tests print a clear skip when `DATABASE_URL`
is unset, and otherwise truncate all ten tables in the selected database. Use only
a disposable demo/test database. After migrating it, run the complete suite with:

```sh
node --env-file=apps/api/.env -e 'const {spawnSync}=require("node:child_process"); process.exit(spawnSync("pnpm",["test"],{stdio:"inherit",env:process.env}).status??1)'
```

Then `pnpm db:reset` restores Start. Migration changes are generated with
`pnpm --filter @seapilot/api db:generate`; commit the SQL and Drizzle metadata together.
The existing frontend remains on its local fixtures until a later integration task.

## Agent tools and trial script

The Responses API uses the three read-only functions in `src/ai/tools.ts`, with
Zod-validated arguments/results and JSON schemas. The official `openai` SDK stays
on v6 to preserve this API's Node 20 support. Unresolved cases for the same
customer start at 0.5; matching the order gives 0.9, plus 0.05 per unique matching
keyword up to 1.0. If no order is supplied, the customer's most recent order is used.
Text alone cannot search other customers. Conversation summaries are attributed
message excerpts. A missing reply snapshot produces no inferred shipment changes.

The agent reads `prompts/03-runtime-prompt.md`, permits at most six tool calls across
the entire run and validation retry, and applies one 30-second deadline to the run.
Invalid JSON/schema output gets one repair attempt. Failure always returns a null
suggestion; only validated suggestions are audited as `ai_suggestion` for an already
linked conversation. Replies, linking and actions still require separate CS approval.
Function calls and reasoning items are preserved as described in the
[official Responses function-calling guide](https://developers.openai.com/api/docs/guides/function-calling).

`pnpm try:suggest` loads `apps/api/.env`, resets the selected database to After Demo 1,
advances a day, creates only the returning conversation and M2 customer message, and
prints the real-model suggestion envelope as JSON. It exits with an explicit error
before connecting or changing data when `OPENAI_API_KEY` is missing. With a key,
this script intentionally replaces demo data; its clock is separate from a running
API process, as with `db:reset`. The automated script check forces an empty key and
does not contact OpenAI.
