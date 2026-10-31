# 04 — Sample data and demo runbook

> Source (English translation): [04 — Sample data and demo runbook](https://docs.google.com/document/d/1iIN2QEa0cxI_5_xbRE3vugApgIfFUR_lxfgfxBI2qkg/edit?tab=t.b8efafoc304h)
> Retrieved: 2026-10-31 (Asia/Ho_Chi_Minh). Draft; statements below are source material, not verified implementation or event rules.
> Review findings and proposed corrections: [review.md](review.md). Existing repository prompts remain the execution copies.

Usage: on the morning of 31 October, copy the highlighted block into
`prompts/04-demo-data.md`. T02 uses it for seed data and scene-jump states.
Như uses the runbook to play the customer.

## Decisions to confirm

- Demo language: the draft says round-one judges speak Vietnamese and the finals include non-Vietnamese-speaking judges from OpenAI and Sea. Proposed setup: English UI, Vietnamese customer messages in round one, and English messages in the finals. The AI replies in the customer's language, so only the typed messages change. This English edition uses the source's English customer messages; the Vietnamese fixtures remain in `prompts/04-demo-data.md`.
- Evidence photos: Như takes two photos of real parcels before the event (parcel A unopened; parcel B opened with no cap). These are prepared data, not code; include them in Declarations.
- Fictional names for the customer and two CS agents can be changed.

# Demo data - seaPilot

All dates are relative to the moment of reset ("day 0" = today).
The seed computes real timestamps from these offsets so the demo always
looks fresh.

## People
- Customer: Lan Nguyen, customer_id CUST001, email lan.demo@example.com
- CS A: "An" (agent_id CS_A)
- CS B: "Binh" (agent_id CS_B)
- Operations team: "Warehouse Ops"

## Order DH001 (placed day -3, paid, 2 items, 2 parcels)
| item      | sku      | qty | parcel |
| --- | --- | --- | --- |
| T-shirt   | TSHIRT-01| 1   | A      |
| Cap       | CAP-01   | 1   | B      |

## Shipments
| parcel | carrier   | tracking  | status at Start | updated_at   |
| --- | --- | --- | --- | --- |
| A      | DemoShip  | DS-1001-A | delivered       | day -1 10:00 |
| B      | DemoShip  | DS-1001-B | in_transit      | day -1 08:00 |

## Evidence images (files in public/demo/)
- parcel_a.jpg      parcel A, closed, with shipping label DS-1001-A
- parcel_b_open.jpg parcel B opened, empty inside, label DS-1001-B

## State "Start" (after POST /api/demo/reset)
customer, order, items and shipments above. No case, no conversation,
no evidence, no task.

## State "After Demo 1" (POST /api/demo/jump?to=demo2)
Start, plus:
- case CS001: order DH001, status "open", assignee CS_A,
  title "Cap not received"
- conversation CONV1 (channel "chat", day -1 09:00), linked to CS001,
  messages: customer message M1, then the approved CS A reply R1
- evidence EV1: parcel_a.jpg, source "customer", day -1 09:01
- case_events: case_created, evidence_added, ai_suggestion, reply_sent (CS_A)

## Customer messages
M1 (Demo 1, conversation 1)
  EN: I ordered a T-shirt and a cap but only got the T-shirt. Here is a
      photo of the parcel, please check.
  attachment: parcel_a.jpg

M2 (Demo 2, NEW conversation, after "Next day")
  EN: The missing cap from yesterday is still not solved. I already sent a
      photo, do I have to explain everything again?

M3 (Demo 3, same conversation as M2)
  EN: I got the second parcel, but there was no cap inside. Here is a
      photo of the second parcel.
  attachment: parcel_b_open.jpg

## Expected replies (reference for tests and review, not fixed text)
R1 (Demo 1, CS A approves)
  EN: I checked order DH001. The order was split into two parcels: the
      T-shirt is in the delivered parcel, while the cap is in the second
      parcel, which is still in transit. I have recorded your request and
      photo so we can continue following up.

R2 (Demo 2, CS B approves after linking CONV2 to CS001)
  EN: I'm sorry you had to contact us again. I have reviewed your request
      and yesterday's photo of the first parcel; you do not need to resend
      it. The system now marks the second parcel as delivered. Have you not
      received the second parcel, or did you receive it without the cap inside?

R3 (Demo 3, sent only after the escalation succeeds)
  EN: I have recorded your statement that the second parcel arrived without
      the cap, along with your new photo. I have forwarded the information
      and evidence to our operations team for verification. You do not need
      to open a new request or resend the photos you already provided.

## Expected end state after Demo 3
- exactly 1 case (CS001), status "waiting_ops", assignee CS_B
- 2 conversations linked to CS001 (CONV1 chat, CONV2 chat)
- 2 evidence rows, both source "customer" (EV1, EV2)
- 1 task: team "Warehouse Ops", status "open", evidence EV1 + EV2
- case_events include conversation_linked (CS_B), shipment_updated,
  reply_sent (CS_A), reply_sent (CS_B), action_executed (CS_B)
- no reply asks the customer for the parcel A photo again
## Demo runbook (six minutes)

- 0:00–1:00: Minh explains the problem. Before starting, Hoàng presses Reset on the demo bar (`?demo=1`).
- 1:00–2:00: Demo 1. Như sends M1 and the parcel A photo from the customer screen. Hoàng, playing CS A, requests an AI suggestion, points out the source labels, and approves R1.
- 2:00–2:15: Hoàng presses "Next day". Minh explains that the carrier now reports parcel B as delivered.
- 2:15–3:45: Demo 2, the main segment. Như opens a new conversation and sends M2. Hoàng switches to CS B. When the "Link to CS001?" banner appears, press Link. Point out the old photo, "What changed", and the single question. Approve R2.
- 3:45–4:45: Demo 3. Như sends M3 and the parcel B photo. The AI proposes an operations escalation. Hoàng approves the action, waits for success, then approves R3. Point out the `waiting_ops` status and the new task.
- 4:45–6:00: Phong explains the Codex contribution and closes.
- If judging time is short or the demo fails midway: press Reset, then "Start from Demo 2", and go directly to Demos 2 and 3. See the review for the missing "Next day" step in this source shortcut.

## Check before each demo

- Press Reset and confirm the CS screen has no cases.
- Open the customer screen and CS workspace in two side-by-side windows.
- Confirm the connection is stable and AI suggestions return in under 15 seconds. If slow, use the backup hotspot.
