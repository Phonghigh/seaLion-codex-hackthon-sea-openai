# seaPilot - Demo runbook (6 min + 2 min Q&A)

Operator: Hoang. Laptop: Minh. Speakers: Nhu (problem, 0:00-0:40), Hoang (scenes),
Phong (architecture + Codex, 4:50-6:00). Two browser tabs side by side:
`/customer` and `/cs?demo=1`. All times Asia/Saigon.

## Before the slot
1. `git pull` the frozen build, `pnpm install`, fill `api/.env`.
2. `pnpm db:reset && pnpm dev`, open `/api/health`. `pnpm tunnel`, confirm the Sites
   page loads data from the tunnel URL.
3. Run all scenes once, then click Reset. Leave both tabs open.

## The story

| # | Operator does | Screen shows | API does |
|---|---|---|---|
| Open | Click Reset on the demo bar | Empty `/cs`, empty `/customer` | Reload seed: Lan, DH001, parcel A delivered, parcel B in_transit |
| 0 | (cut today, triage is next step) | | |
| 1 | `/customer`, Lan sends M1 + parcel_a.jpg | `/cs`: new conversation, triage "missing_item -> Delivery, An". AI card: facts with sources, draft R1. Click Approve and send | triage -> human -> An. Approve with no case -> create CS001, link conv, attach EV1, reply_sent with shipment_snapshot |
| Next day | Click Next day. Switch "Signed in as" to Binh | CS001 timeline: shipment_updated B delivered | parcel B -> delivered, demo clock +1 day, An off shift |
| 2 (core) | `/customer`, Lan clicks New conversation, sends M2 | Banner "Link to CS001?" with reason. Click Link -> history + old photo appear. AI card: "What changed: B in_transit -> delivered", exactly one question, draft R2. Approve | find_cases -> CS001. Link sets assignee Binh, event conversation_linked + assignee_changed. changes = last snapshot vs now |
| 3 | Lan sends M3 + parcel_b_open.jpg in the same conversation | AI card: both photos, no question, proposed escalate_to_ops. Click Approve action -> "Escalated". Then Approve reply R3 | task for operations with EV1+EV2, case -> waiting_ops, event action_executed. Reply allowed only after success |
| 4 | (cut today) | | |
| Close | Phong: architecture, Codex log, usage report | README, docs/codex-log.md | |

Timing: 0:00 problem · 0:50 Scene 1 · 2:00 Scene 2 · 3:30 Scene 3 · 4:30 what is next
(triage, Scene 0/4) · 4:50 architecture + Codex · 6:00 end.

## If something breaks
- Lost Scene 1 midway: Reset -> Start from Demo 2 -> Next day -> continue at Scene 2.
- OpenAI slow or down: set `DEMO_REPLAY=1` on the api; `/api/agent/suggest` returns the
  last successful suggestion saved per scene in `api/data/replay/`. Say so to the judges.
- Venue Wi-Fi down: phone hotspot (only OpenAI needs the network).
- Sites cannot reach the tunnel: open the tunnel URL directly, it serves the same app.
- Everything down: backup video recorded at 16:10 on Minh's Mac.
- Triage not ready by 15:30: demo is Scenes 1-2-3, switch agent by hand, pitch says
  triage is next.

## Expected end state after Scene 3
One case CS001, status waiting_ops, assignee Binh. Two conversations linked. Two evidence
rows, source customer. One task, team operations, evidence EV1 + EV2. No reply asks for
the parcel A photo again.
