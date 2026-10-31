import type { Database } from '../db/client';
import * as s from '../db/schema';
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export const DAY = 86_400_000;
export function demoStart(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return new Date(`${date}T09:00:00+07:00`);
}
export async function seed(tx: Transaction, now: Date, scene: 'start' | 'demo2') {
  const at = (day: number, minutes = 0) => new Date(now.getTime() + day * DAY + minutes * 60_000);
  await tx.insert(s.customers).values([
    { id: 'CUST001', name: 'Lan Nguyen', email: 'lan.demo@example.com', language: 'vi' },
    { id: 'CUST002', name: 'Minh Tran', language: 'vi' },
    { id: 'CUST003', name: 'Sam Lee', language: 'en' },
  ]);
  await tx.insert(s.orders).values([
    { id: 'DH001', customerId: 'CUST001', placedAt: at(-3), status: 'paid' },
    { id: 'DH002', customerId: 'CUST002', placedAt: at(-3), status: 'paid' },
    { id: 'DH003', customerId: 'CUST003', placedAt: at(-3), status: 'paid' },
  ]);
  await tx.insert(s.orderItems).values([
    { id: 'ITEM001', orderId: 'DH001', sku: 'TSHIRT-01', name: 'T-shirt', qty: 1, parcelCode: 'A' },
    { id: 'ITEM002', orderId: 'DH001', sku: 'CAP-01', name: 'Cap', qty: 1, parcelCode: 'B' },
    { id: 'ITEM003', orderId: 'DH002', sku: 'BOTTLE-01', name: 'Water bottle', qty: 1, parcelCode: 'A' },
  ]);
  await tx.insert(s.shipments).values([
    { id: 'SHIP001', orderId: 'DH001', parcelCode: 'A', carrier: 'DemoShip', tracking: 'DS-1001-A', status: 'delivered', updatedAt: at(-1, 60) },
    { id: 'SHIP002', orderId: 'DH001', parcelCode: 'B', carrier: 'DemoShip', tracking: 'DS-1001-B', status: 'in_transit', updatedAt: at(-1, -60) },
    { id: 'SHIP003', orderId: 'DH002', parcelCode: 'A', carrier: 'DemoShip', tracking: 'DS-1002', status: 'in_transit', updatedAt: at(-1), expectedDeliveryAt: at(0) },
    { id: 'SHIP004', orderId: 'DH003', parcelCode: 'A', carrier: 'DemoShip', tracking: 'DS-1003', status: 'delivered', updatedAt: at(-1) },
  ]);
  await tx.insert(s.demoClock).values({ id: 1, day: 0, now });
  if (scene === 'start') return;
  await tx.insert(s.cases).values({ id: 'CS001', orderId: 'DH001', customerId: 'CUST001', title: 'Cap not received', status: 'open', assignee: 'CS_A', createdAt: at(-1) });
  await tx.insert(s.conversations).values({ id: 'CONV1', caseId: 'CS001', customerId: 'CUST001', channel: 'chat', openedAt: at(-1), mode: 'human' });
  await tx.insert(s.messages).values([
    { id: 'M1', conversationId: 'CONV1', role: 'customer', actor: 'CUST001', text: 'I ordered a T-shirt and a cap but only got the T-shirt. Here is a photo of the parcel, please check.', createdAt: at(-1) },
    { id: 'R1', conversationId: 'CONV1', role: 'cs', actor: 'CS_A', text: 'I checked order DH001. Your order is arriving in two parcels: the T-shirt has been delivered, and the cap is still in transit. I have saved your photo and request so we can keep following up.', createdAt: at(-1, 3) },
  ]);
  await tx.insert(s.evidence).values({ id: 'EV1', caseId: 'CS001', conversationId: 'CONV1', type: 'image', path: '/files/parcel_a.svg', source: 'customer', createdAt: at(-1, 1) });
  await tx.insert(s.caseEvents).values([
    { id: 'EVENT001', caseId: 'CS001', type: 'case_created', actor: 'CS_A', payload: {}, createdAt: at(-1) },
    { id: 'EVENT002', caseId: 'CS001', type: 'evidence_added', actor: 'CUST001', payload: { evidence_id: 'EV1', sample: true }, createdAt: at(-1, 1) },
    { id: 'EVENT003', caseId: 'CS001', type: 'ai_suggestion', actor: 'ai', payload: { fixture: true, reply: 'R1' }, createdAt: at(-1, 2) },
    { id: 'EVENT004', caseId: 'CS001', type: 'reply_sent', actor: 'CS_A', payload: { message_id: 'R1', approved_by: 'CS_A', shipment_snapshot: { A: 'delivered', B: 'in_transit' } }, createdAt: at(-1, 3) },
  ]);
}
