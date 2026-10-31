import { DatabaseStateSchema, type DatabaseState } from '@seapilot/contracts';
import type { DemoClock } from './clock';

export type SeedState = 'Start' | 'After Demo 1';
export function buildSeed(state: SeedState, clock: DemoClock): DatabaseState {
  const at = (day: number, hour = 9, minute = 0) => clock.at(day, hour, minute);
  const seed: DatabaseState = {
    customers: [
      { id: 'CUST001', name: 'Lan Nguyen', email: 'lan.demo@example.com', language: 'vi' },
      { id: 'CUST002', name: 'Minh Tran', email: 'minh.demo@example.com', language: 'vi' },
      { id: 'CUST003', name: 'Sam Lee', email: 'sam.demo@example.com', language: 'en' },
    ],
    orders: [1, 2, 3].map(i => ({ id: `DH00${i}`, customer_id: `CUST00${i}`, placed_at: at(-3), status: 'paid' })),
    order_items: [
      { id: 'ITEM1', order_id: 'DH001', sku: 'TSHIRT-01', name: 'T-shirt', qty: 1, parcel_code: 'A' },
      { id: 'ITEM2', order_id: 'DH001', sku: 'CAP-01', name: 'Cap', qty: 1, parcel_code: 'B' },
      { id: 'ITEM3', order_id: 'DH002', sku: 'BOTTLE-01', name: 'Water bottle', qty: 1, parcel_code: 'A' },
      // Scene 4 leaves the product unspecified; this is a demo fixture, not a customer fact.
      { id: 'ITEM4', order_id: 'DH003', sku: 'DEMO-01', name: 'Demo item', qty: 1, parcel_code: 'A' },
    ],
    shipments: [
      { id: 'SHIP1', order_id: 'DH001', parcel_code: 'A', carrier: 'DemoShip', tracking: 'DS-1001-A', status: 'delivered', updated_at: at(-1, 10) },
      { id: 'SHIP2', order_id: 'DH001', parcel_code: 'B', carrier: 'DemoShip', tracking: 'DS-1001-B', status: 'in_transit', updated_at: at(-1, 8) },
      { id: 'SHIP3', order_id: 'DH002', parcel_code: 'A', carrier: 'DemoShip', tracking: 'DS-1002', status: 'in_transit', updated_at: at(-1, 8) },
      { id: 'SHIP4', order_id: 'DH003', parcel_code: 'A', carrier: 'DemoShip', tracking: 'DS-1003', status: 'delivered', updated_at: at(-1, 10) },
    ],
    cases: [], conversations: [], messages: [], evidence: [], case_events: [], tasks: [],
  };
  if (state === 'After Demo 1') {
    seed.cases.push({ id: 'CS001', order_id: 'DH001', customer_id: 'CUST001', title: 'Cap not received', status: 'open', assignee: 'CS_A', created_at: at(-1, 9, 2) });
    seed.conversations.push({ id: 'CONV1', customer_id: 'CUST001', case_id: 'CS001', channel: 'chat', mode: 'human', opened_at: at(-1) });
    seed.messages.push(
      { id: 'M1', conversation_id: 'CONV1', role: 'customer', actor: 'CUST001', text: 'Tôi đặt áo với mũ mà nhận được mỗi áo. Đây là ảnh kiện hàng, shop kiểm tra giúp tôi.', created_at: at(-1) },
      { id: 'R1', conversation_id: 'CONV1', role: 'cs', actor: 'CS_A', text: 'Em đã kiểm tra đơn DH001. Đơn được chia thành hai kiện: áo thuộc kiện đã giao, còn mũ thuộc kiện thứ hai đang vận chuyển. Em đã ghi nhận yêu cầu và ảnh anh/chị gửi để tiếp tục theo dõi.', created_at: at(-1, 9, 4) },
    );
    seed.evidence.push({ id: 'EV1', conversation_id: 'CONV1', case_id: 'CS001', type: 'image', path: '/files/demo/parcel_a.jpg', source: 'customer', created_at: at(-1, 9, 1) });
    seed.case_events.push(
      { id: 'CE1', case_id: 'CS001', type: 'case_created', actor: 'CS_A', payload: { conversation_id: 'CONV1', order_id: 'DH001' }, created_at: at(-1, 9, 2) },
      { id: 'CE2', case_id: 'CS001', type: 'evidence_added', actor: 'CS_A', payload: { evidence_id: 'EV1', source: 'customer' }, created_at: at(-1, 9, 2) },
      { id: 'CE3', case_id: 'CS001', type: 'ai_suggestion', actor: 'system', payload: { conversation_id: 'CONV1', draft_reply: seed.messages[1].text }, created_at: at(-1, 9, 3) },
      { id: 'CE4', case_id: 'CS001', type: 'reply_sent', actor: 'CS_A', payload: { message_id: 'R1', approved_by: 'CS_A', shipment_snapshot: { A: 'delivered', B: 'in_transit' } }, created_at: at(-1, 9, 4) },
    );
  }
  return DatabaseStateSchema.parse(seed);
}
