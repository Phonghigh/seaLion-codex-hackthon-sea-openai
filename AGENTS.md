# AGENTS.md - seaPilot

## Product
seaPilot is a case workspace for e-commerce customer service (CS) agents.
One case can span many conversations and many CS agents.
The AI reads stored case data, finds what changed since the last contact,
and drafts a reply and a next action. A CS agent approves every reply and
every action before it is sent or executed.

Demo story (the only scope for today):
- Order DH001 has 2 items in 2 parcels: T-shirt in parcel A, cap in parcel B.
- Case CS001 tracks "cap not received".
- Demo 1: CS A handles the first contact. Parcel A delivered, parcel B in transit.
- Demo 2: next day, parcel B shows "delivered". The customer opens a NEW
  conversation. CS B links it to CS001, sees history + what changed, and asks
  only the one missing question.
- Demo 3: customer says parcel B arrived without the cap and sends a photo.
  CS B approves an escalation to the operations team.
Exact demo data: prompts/04-demo-data.md

## Stack
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase Postgres + Supabase Storage (evidence images)
- OpenAI SDK, Responses API with function tools
- Zod for every API input/output and every tool argument/result
- Vitest for tests
- Deploy on Vercel. Must also run locally with `pnpm dev`.

## Commands
- install:   pnpm install
- dev:       pnpm dev
- typecheck: pnpm typecheck
- lint:      pnpm lint
- test:      pnpm test
- reset:     use the local preview Reset control (no backend reset exists yet)
Run typecheck, lint and test before you say a task is done.

## Frontend foundation
The current frontend has two independent apps: `apps/customer` and
`apps/customer-service`, sharing `packages/ui`, `packages/contracts` and
`packages/demo`. For frontend work, read `docs/FRONTEND-BASE.md` for the current
scope and run instructions, and `DESIGN.md` for shared visual tokens.
The user deferred API discovery/integration for this phase. Keep fixture state
local to each page; shared backend synchronization is future work.
Runtime prompts in `prompts/` remain unchanged. Log each task in
`docs/codex-log.md`.

## Hard rules
1. The repo is PUBLIC. Never commit secrets. Keys live only in .env.local
   (git-ignored) and in Vercel env vars. Keep .env.example with names only.
2. OpenAI and the Supabase service key are server-only. Never import them
   in client components.
3. The AI never writes to the database. It calls tools; the backend validates
   the arguments with Zod and runs the query.
4. Every fact shown to CS has a source: "customer" (what the customer said),
   "system" (order, shipment or case data) or "unverified".
5. No reply or action runs without CS approval. Record every approval and
   every result in case_events. Never show "done" before the action succeeds.
6. Never ask the customer for information that is already in the case.
7. Stay inside the demo scope. Ask before adding a new dependency.
8. Responses API: tools use the Responses API format. Do not send temperature
   or top_p. Read the model name from env OPENAI_MODEL.
9. Small commits with clear messages, with the task id:
   feat(T04): agent loop
10. After each task, append to docs/codex-log.md: task id, start and end time,
    what you built, files changed, tests added, problems found.
11. Every developer must record every Codex prompt used for this project.
    Use the shared `.codex/hooks.json`; run `node scripts/codex-usage/cli.mjs install`
    after cloning, then review/trust the project and hooks via Codex CLI `/hooks`.
    `.codex-usage/events/` contains PUBLIC, redacted prompt/tool evidence and must
    be included with the related work in Git. Run `node scripts/codex-usage/cli.mjs report`
    to regenerate the shared report (includes redacted prompts). Never disable or
    bypass recording for project work; fix a failed prompt recorder before retrying.
    Keep secrets out of prompts and logs. For activity outside hook coverage, add
    a truthful `manual` entry; do not invent automatic evidence. See docs/codex-usage.md.

## Data model (minimum)
customers, orders, order_items, shipments (parcel_code, status, updated_at),
cases (code, status, assignee, order_id), conversations (case_id nullable,
channel, opened_at), messages (conversation_id, role, text, created_at),
evidence (case_id, type, url, source, created_at),
case_events (case_id, type, actor, payload json, created_at),
tasks (case_id, team, status, evidence_ids, created_at).
Case status: open -> waiting_customer -> waiting_ops -> resolved.

## Done means
- typecheck, lint and tests pass
- the frontend demo still runs after its local Reset control; verify backend reset only once implemented
- no secret in the diff
- docs/codex-log.md updated
