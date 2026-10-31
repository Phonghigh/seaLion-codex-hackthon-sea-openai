# 01 – AGENTS.md

> Source (English translation): [01 – AGENTS.md](https://docs.google.com/document/d/1iIN2QEa0cxI_5_xbRE3vugApgIfFUR_lxfgfxBI2qkg/edit?tab=t.5xjljfh106tk)
> Retrieved: 2026-10-31 (Asia/Ho_Chi_Minh). Draft; statements below are source material, not verified implementation or event rules.
> Review findings and proposed corrections: [review.md](review.md). Existing repository prompts remain the execution copies.

Usage: on the morning of 31 October, after creating the repository, copy the complete highlighted block below into root `AGENTS.md`. Codex reads this file before each task.
Confirm before copying: the model name (set `OPENAI_MODEL` after activating credits on 30 October).
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
- reset:     pnpm db:reset   (same as POST /api/demo/reset)
Run typecheck, lint and test before you say a task is done.

## Folder layout
- app/customer/        customer chat screen
- app/cs/              CS workspace
- app/api/             route handlers
- lib/db/              Supabase client and queries (server only)
- lib/ai/              agent loop, tools, runtime prompt loader
- lib/schemas/         Zod schemas, the single source of truth for types
- supabase/            migrations and seed
- tests/               Vitest tests, including tests/continuity.test.ts
- prompts/             build prompts and runtime prompt (do not edit unless asked)
- docs/codex-log.md    log of every Codex task (see rule 10)

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
- the demo still runs after POST /api/demo/reset
- no secret in the diff
- docs/codex-log.md updated

