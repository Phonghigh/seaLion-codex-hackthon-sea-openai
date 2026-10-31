# 05 – Write-up (draft)

> Source (English translation): [05 – Write-up (draft)](https://docs.google.com/document/d/1iIN2QEa0cxI_5_xbRE3vugApgIfFUR_lxfgfxBI2qkg/edit?tab=t.8pt3qhj8y9uo)
> Retrieved: 2026-10-31 (Asia/Ho_Chi_Minh). Draft; statements below are source material, not verified implementation or event rules.
> Review findings and proposed corrections: [review.md](review.md). Existing repository prompts remain the execution copies.

Usage: this is the Project Write-up draft for PDF submission through the Google Form. Use English because the final-round panel includes international judges. On event day, Như fills the [ ... ] placeholders with real figures from `docs/codex-log.md` and the README, then exports the PDF at 16:15–16:35.
Rule: never invent figures. If a real measurement is unavailable, remove the sentence rather than estimating.
## Draft
seaPilot - Project Write-up
Team seaLion | Sea x OpenAI Regional Codex Hackathon Vietnam | 31 Oct 2026
Build direction: 02 - AI-Native Products & Operations
Repo: [GITHUB LINK]   Demo: [DEMO LINK]

1. Problem
In e-commerce customer service, one problem often takes several contacts.
A customer reports a missing item in chat, comes back the next day in a new
conversation, and is answered by a different CS agent. Today the new agent
has to read old threads or ask the customer to explain again, and the
customer often has to resend photos. Meanwhile the facts change: a parcel
that was "in transit" yesterday is "delivered" today. Duplicate tickets,
repeated questions and wrong next steps follow.

2. Solution
seaPilot is a case workspace where the case, not the conversation, is the
unit of work. When a customer writes again, seaPilot:
- suggests the existing case the message belongs to, and the CS agent
  confirms the link;
- shows the full history and evidence of that case on one screen;
- compares the order and shipment data with what the customer was last
  told, and lists what changed;
- names the one fact still missing and drafts a reply that asks only that;
- proposes the next action (for example, ask operations to check packing)
  with the evidence attached.
Every fact is labelled by source: customer statement, system data, or
unverified. The CS agent approves every reply and every action. Nothing
is sent or executed without approval, and every result is logged.

3. Demo story
Order DH001 has two parcels: T-shirt (A) and cap (B).
Demo 1: the customer reports the cap missing. seaPilot finds that parcel B
is still in transit, creates case CS001 and records the photo.
Demo 2: next day, parcel B shows "delivered". The customer opens a new
conversation, annoyed. A different agent links it to CS001 in one click,
sees the old photo and the status change, and sends a reply that asks one
question: was parcel B not received, or received without the cap?
Demo 3: the customer says parcel B arrived empty and sends a new photo.
seaPilot proposes an escalation to operations with both photos. The agent
approves; the task is created; the case moves to "waiting for operations".

4. Why AI-Native (Build direction 02)
Without AI, keeping one case consistent across conversations and agents
needs a person to re-read everything at every handover. seaPilot makes the
case itself remember, notice change and ask the next right question, so a
new agent can continue a case they have never seen in [SECONDS] seconds.
What a business can now do: let any agent on any shift pick up any case
without losing context, and stop asking customers to repeat themselves.

5. How it works
- Next.js + TypeScript app with two screens: customer chat and CS workspace.
- Supabase Postgres stores cases, conversations, messages, evidence, events
  and tasks. Context lives in the database, not in the model's memory.
- One AI agent using the OpenAI Responses API with three function tools:
  find_cases, get_case_context, get_order_shipments. The backend validates
  every tool call with Zod. The model never writes to the database.
- The agent returns a structured suggestion: linked case, facts with
  sources, changes, missing info, draft reply, proposed action.
- An approval API executes replies and actions only after CS approval and
  logs each result.

6. How we used Codex
- We wrote AGENTS.md (stack, commands, rules such as "never commit secrets"
  and "label every fact with its source") and [N] task prompts before the
  event, then built everything on the day with Codex.
- Codex built [N] tasks: scaffold, database and seed, tools, agent loop,
  CS workspace, customer screen, case linking and change detection,
  approval flow, demo controls, continuity test.
- [N] commits, [N] tests, [N] % of lines written by Codex (from git log and
  docs/codex-log.md).
- Codex wrote the end-to-end continuity test that replays the full demo and
  checks: one case only, no repeated questions, final status correct.
- [ONE CONCRETE EXAMPLE: a bug or contract mismatch Codex found or fixed.]

7. Results and limits
Working today: [LIST WHAT RUNS IN THE DEMO].
Simulated: order, shipment and operations systems; one channel (chat).
Next: real carrier and order APIs, email and app channels, measuring
case-link accuracy and repeated questions avoided in a pilot.

