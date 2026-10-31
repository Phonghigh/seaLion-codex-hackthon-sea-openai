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
M1 (Demo 1, conversation 1)
  VI: Tôi đặt áo với mũ mà nhận được mỗi áo. Đây là ảnh kiện hàng,
      shop kiểm tra giúp tôi.
  EN: I ordered a T-shirt and a cap but only got the T-shirt. Here is a
      photo of the parcel, please check.
  attachment: parcel_a.jpg

M2 (Demo 2, NEW conversation, after "Next day")
  VI: Vụ thiếu mũ hôm qua vẫn chưa giải quyết. Tôi gửi ảnh rồi, giờ lại
      phải trình bày từ đầu à?
  EN: The missing cap from yesterday is still not solved. I already sent a
      photo, do I have to explain everything again?

M3 (Demo 3, same conversation as M2)
  VI: Tôi nhận kiện thứ hai rồi nhưng bên trong không có mũ. Tôi gửi thêm
      ảnh kiện thứ hai ở đây.
  EN: I got the second parcel, but there was no cap inside. Here is a
      photo of the second parcel.
  attachment: parcel_b_open.jpg

## Expected replies (reference for tests and review, not fixed text)
R1 (Demo 1, CS A approves)
  VI: Em đã kiểm tra đơn DH001. Đơn được chia thành hai kiện: áo thuộc kiện
      đã giao, còn mũ thuộc kiện thứ hai đang vận chuyển. Em đã ghi nhận yêu
      cầu và ảnh anh/chị gửi để tiếp tục theo dõi.
R2 (Demo 2, CS B approves after linking CONV2 to CS001)
  VI: Em xin lỗi vì anh/chị phải liên hệ lại. Em đã xem yêu cầu và ảnh kiện
      đầu anh/chị gửi hôm qua, anh/chị không cần gửi lại. Hệ thống vừa ghi
      nhận kiện thứ hai đã giao. Anh/chị chưa nhận được kiện thứ hai, hay đã
      nhận kiện nhưng bên trong không có mũ?
R3 (Demo 3, sent only after the escalation succeeds)
  VI: Em đã ghi nhận anh/chị nhận được kiện thứ hai nhưng bên trong không có
      mũ, cùng ảnh mới anh/chị gửi. Em đã chuyển thông tin và các bằng chứng
      sang bộ phận vận hành để xác minh. Anh/chị không cần tạo yêu cầu mới
      hoặc gửi lại những ảnh đã cung cấp.

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
- M0 VI: Đơn DH002 của tôi đến đâu rồi?
     EN: Where is my order DH002?
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
