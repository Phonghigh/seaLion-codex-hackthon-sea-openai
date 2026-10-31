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
| T-shirt   | TSHIRT-01| 1   | A      |
| Cap       | CAP-01   | 1   | B      |

## Shipments
| parcel | carrier   | tracking  | status at Start | updated_at   |
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
All demo data is in English (switched 31 Oct 13:45, Asia/Saigon). Type these texts as written.

M1 (Demo 1, conversation 1)
  I ordered a T-shirt and a cap but only got the T-shirt. Here is a photo of
  the parcel, please check.
  attachment: parcel_a.jpg

M2 (Demo 2, NEW conversation, after "Next day")
  The missing cap from yesterday is still not solved. I already sent a photo,
  do I have to explain everything again?

M3 (Demo 3, same conversation as M2)
  I got the second parcel, but there was no cap inside. Here is a photo of
  the second parcel.
  attachment: parcel_b_open.jpg

## Expected replies (reference for tests and review, not fixed text)
R1 (Demo 1, CS A approves)
  I checked order DH001. It was shipped in two parcels: the T-shirt was in the
  parcel that has been delivered, and the cap is in a second parcel that is
  still in transit. I have saved your request and your photo so we can keep
  following up.
R2 (Demo 2, CS B approves after linking CONV2 to CS001)
  Sorry you had to contact us again. I can see your request and the photo of
  the first parcel from yesterday, so there is no need to send it again. Our
  system has just recorded the second parcel as delivered. Have you not
  received the second parcel, or did it arrive without the cap inside?
R3 (Demo 3, sent only after the escalation succeeds)
  I have noted that the second parcel arrived without the cap, together with
  your new photo. I have forwarded the details and all photos to our operations
  team for checking. You do not need to open a new request or send the photos
  again.

## Expected end state after Demo 3
- exactly 1 case (CS001), status "waiting_ops", assignee CS_B
- 2 conversations linked to CS001 (CONV1 chat, CONV2 chat)
- 2 evidence rows, both source "customer" (EV1, EV2)
- 1 task: team "Warehouse Ops", status "open", evidence EV1 + EV2
- case_events include conversation_linked (CS_B), shipment_updated,
  reply_sent (CS_A), reply_sent (CS_B), action_executed (CS_B)
- no reply asks the customer for the parcel A photo again

## Additions for triage and routing (Scenes 0 and 4)

### Customer 2 (Scene 0, AI-handled)
- Minh Tran, customer_id CUST002, order DH002, 1 item (water bottle), 1 parcel,
  status in_transit, tracking DS-1002, expected delivery day 0.
- M0 EN: Where is my order DH002?
- Expected: triage category order_status (high), needs_human low, risk 1 -> mode "ai".
  AI reply from shipment data, sent at once, case_event "auto_reply", badge "Auto".

### Customer 3 (Scene 4, ambiguous, English)
- Sam Lee, customer_id CUST003, order DH003 delivered day -1, no case.
- M4 EN: Hi, something's wrong with my order, can you help?
- Expected: category spread out / "other", confidence < 0.7 or category not allowed
  -> human, General Support, Carlos (EN, on shift by his timezone). Reason shown.

### Agents and teams
See config/teams.json. Demo clock: day 0 09:00 Asia/Ho_Chi_Minh; "Next day" -> day 1 09:00.
Scene 1 expected: human, delivery, An (on shift day 0, VI).
Scene 2 expected: human, existing case CS001, An off shift -> Binh (on shift day 1, VI).

### Triage expectations per scene (for tests and the Triage card)
| Scene | category | needs_human | risk | mode | assignee | rule |
|---|---|---|---|---|---|---|
| 0 | order_status | low | 1 | ai | - | ai allow-list |
| 1 | missing_item | high | 4 | human | an | attachment / human category |
| 2 | missing_item | high | 4 | human | binh | open case exists; owner off shift |
| 3 | missing_item | high | 4 | human | binh | open case exists |
| 4 | other (low confidence) | mid | 2 | human | carlos | low confidence; language en |
