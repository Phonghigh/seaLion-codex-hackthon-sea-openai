# seaPilot – Product brief (team seaLion, 31 Oct 2026)

Read this before any task. It is the single source of truth for WHAT we build today.
HOW we build it: AGENTS.md and prompts/02-build-tasks.md.

## 1. The idea in 3 sentences

1. Problem: a customer reports a missing item, writes again the next day in a NEW
   conversation, meets a DIFFERENT agent, and has to explain and resend photos.
   Meanwhile the facts changed (parcel "in transit" yesterday is "delivered" today).
2. Solution: the CASE, not the conversation, is the unit of work. seaPilot links the
   new conversation to the right case, shows the agent WHAT CHANGED, asks only the ONE
   missing fact, and routes every case to AI or to the right human.
3. Value (build direction 02, AI-Native Operations): any agent, on any shift, can
   continue any case. Customers stop repeating themselves.

One line: "Customers change conversations. Agents change shifts. The case keeps going."

## 2. Four things we never drop (this is the "insight" judges grade)

| # | Principle | Where it shows in the demo |
|---|---|---|
| 1 | Link to the existing case, never create a duplicate ticket | "Link to CS001?" banner in Scene 2 |
| 2 | Detect what changed since the customer was last answered | "What changed: parcel B in_transit -> delivered" |
| 3 | Ask exactly ONE missing fact, never ask again what is already known | Reply R2 has one question |
| 4 | Every fact has a source (customer / system / unverified); a human approves every reply and action | Source badges; Approve buttons; "delivered != complete" in Scene 3 |

## 3. Triage: AI or human, and which human

Principle: the MODEL measures, RULES decide. Rules live in config/routing-policy.json
and config/teams.json so a manager can change them without touching prompts.

### 3.1 What the model measures (one call, Decisions API; fallback Responses API)
Input: the customer message + short system context (existing open case? parcel status? attachment?).

| name | type | answers | used for |
|---|---|---|---|
| category | choice | order_status, missing_item, damaged, refund_request, return_howto, complaint, other | pick team |
| needs_human | predicate | probability 0..1 | AI vs human |
| risk | score | 1 (low) .. 5 (high) | threshold |
| language | choice | vi, en, other | filter agents |

### 3.2 The rules (first match wins; default is HUMAN)
```
1. An open case already exists for this customer/order  -> HUMAN, keep current owner if on shift
2. Message has an attachment (photo/file)               -> HUMAN  (evidence needs human eyes)
3. category in {refund_request, damaged, missing_item,
   complaint}                                           -> HUMAN
4. needs_human >= 0.5                                   -> HUMAN
5. risk >= 3                                            -> HUMAN
6. confidence(category) < 0.7                           -> HUMAN  (ambiguous: do not guess)
7. Second message on the same topic after an AI reply   -> HUMAN
8. category in allow-list {order_status, return_howto,
   confirm_receipt} and all facts come from system data -> AI
9. Default                                              -> HUMAN
```
Rules 1, 2, 7 are hard facts, not model opinions. AI can never auto-answer a case
with money, evidence or an existing case, however confident the model is.
Thresholds (0.5, 3, 0.7) are hand-set today; in production they come from labelled data,
tuned so that AI errors on sensitive cases are ~0 (over-routing to humans is cheap).

### 3.3 When AI handles it
Same runtime prompt, read-only tools only (get_order_shipments, get_case_context),
no proposed_action. The reply is sent immediately, logged as case_event "auto_reply",
and visible to agents in an "Auto-handled" tab. If the customer writes again -> human (rule 7).

### 3.4 When a human handles it: pick team, then agent
1. team = owner of the category (config/teams.json)
2. agents in that team who are ON SHIFT now (system clock, agent timezone, schedule)
3. who speak the customer's language
4. if the case already has an owner and they are on shift -> keep them (continuity)
5. fewest open cases
6. nobody matches -> team lead + flag "no_match" + reason
Every decision carries a human-readable reason shown on the Triage card.

## 4. Demo: 5 scenes, one story (6 minutes)

| Scene | Who | What happens | Rule shown | Priority |
|---|---|---|---|---|
| 0 | Customer 2, Minh Tran | "Where is my order DH002?" -> Triage: order_status 0.96, human 0.08, risk 1 -> AI answers from shipment data, sent at once, badge "Auto" | 8 | P2 |
| 1 | Lan, agent An | Missing cap + photo of parcel A -> Triage: missing_item, human 0.88, risk 4 -> Delivery team, An (on shift, VI). AI suggestion with sources, An approves. Case CS001 created | 2, 3 | P0 |
| Next day | demo bar | parcel B -> delivered; clock -> tomorrow; An off shift, Binh on shift | | P0 |
| 2 (core) | Lan, agent Binh | NEW conversation, annoyed. Triage: existing case CS001, An off shift -> Binh. Banner "Link to CS001?" -> history + photo appear -> "What changed" -> ONE question. Binh approves | 1 | P0 |
| 3 | Lan, Binh | Parcel B arrived without the cap + photo. AI proposes escalate_to_ops with both photos, no refund promise. Binh approves action -> case waiting_ops -> reply sent | 1 | P0/P1 |
| 4 | Customer 3 (EN) | "Hi, something's wrong with my order, can you help?" -> category spread out, confidence low -> human, General Support, Carlos (EN, on shift) | 6 + language | P3 |

If a judging slot is short or something breaks: Reset -> "Start from Demo 2".

Timing: 0:00 problem (Minh) · 0:40 Scene 0 · 1:10 Scene 1 · 2:10 Scene 2 · 3:40 Scene 3 ·
4:30 Scene 4 (skip if late) · 4:50 architecture + Codex + close (Phong) · 6:00 end.

## 5. Scope

In today: 2 screens (customer, CS), 1 agent with 3 tools, triage + routing, 5 scenes,
demo bar (Reset / Next day / Start from Demo 2), continuity test.
Out (say "next step" in the pitch): real email/app channels, auth, many customers,
metrics dashboard, vector search.
Optional, only after 15:30 AND a backup video exists: voice for the customer
(speech -> text -> same chat flow). The pitch must not depend on it.

## 6. Order of work and cut-line

- P0 (must, before 14:30): Scenes 1-2-3 WITHOUT triage card; demo bar; seed.
- P2 (after Scene 2 runs): T07b triage + routing -> cards on Scenes 1-2; Scene 0.
- P3: Scene 4. Then voice.
- If triage is not ready by 15:30: demo stays 3 scenes, switch agent by hand,
  pitch says triage is next.

## 7. Timeline (hard milestones marked *)
10:30 tech decisions · 11:00 empty deploy live · 12:45* Scene 1 runs with real model ·
14:30* Scene 2 runs, WIP submission · 15:30* feature freeze · 16:10 backup video ·
16:35 write-up + declarations · 16:45* Google Form submitted · 17:00 freeze.
