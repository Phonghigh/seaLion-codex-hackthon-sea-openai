import { describe, expect, it } from 'vitest';
import { buildSeed } from '../demo/seed';
import { DemoClock } from '../demo/clock';
import { createDemoService } from '../demo/service';
import { createApp } from '../app';
import { find_cases, get_case_context, get_order_shipments, responseTools } from './tools';
import { testStore } from './test-store';

describe('read-only case tools', () => {
  it('ranks Lan + DH001 >= 0.9, adds unique keywords, caps scores, and excludes resolved/other customers', async () => {
    const seed = buildSeed('After Demo 1', new DemoClock());
    seed.cases.push({ ...seed.cases[0], id: 'OTHER', customer_id: 'CUST002' },
      { ...seed.cases[0], id: 'CLOSED', status: 'resolved' },
      { ...seed.cases[0], id: 'WAITING', order_id: 'DH002', status: 'waiting_ops' });
    const store = testStore(seed);
    expect(await find_cases(store, { customer_id: 'CUST001', order_id: 'DH001' })).toMatchObject([
      { case_id: 'CS001', score: 0.9 }, { case_id: 'WAITING', score: 0.5 },
    ]);
    const [match] = await find_cases(store, { customer_id: 'CUST001', order_id: 'DH001', text: 'CAP cap' });
    expect(match).toMatchObject({ score: 0.95, last_activity_at: seed.case_events.at(-1)!.created_at });
    expect(match.reason).toContain('DH001');
    expect((await find_cases(store, { customer_id: 'CUST001', text: 'cap not received more' }))[0].score).toBe(1);
    expect((await find_cases(store, { order_id: 'DH001' }))[0].score).toBe(0.9);
    expect(await find_cases(store, { text: 'cap' })).toEqual([]);
    expect(await find_cases(store, { customer_id: 'CUST003', order_id: 'DH001' })).toEqual([]);
  });

  it('uses the latest 20 messages for keywords and context, but all events to locate the last reply', async () => {
    const seed = buildSeed('After Demo 1', new DemoClock());
    seed.messages[0].text = 'obsoletekeyword';
    for (let i = 0; i < 25; i++) {
      const created_at = new Date(Date.parse(seed.case_events.at(-1)!.created_at) + (i + 1) * 1000).toISOString();
      seed.messages.push({ ...seed.messages[0], id: `NEW${i}`, text: `recentkeyword ${i}`, created_at });
      seed.case_events.push({ ...seed.case_events[0], id: `NEW${i}`, type: 'ai_suggestion', created_at });
    }
    seed.shipments[1].status = 'delivered';
    seed.tasks.push({ id: 'TASK1', case_id: 'CS001', team: 'operations', status: 'open', evidence_ids: ['EV1'], created_at: seed.cases[0].created_at },
      { id: 'TASK2', case_id: 'CS001', team: 'operations', status: 'done', evidence_ids: [], created_at: seed.cases[0].created_at });
    const store = testStore(seed);
    expect((await find_cases(store, { customer_id: 'CUST001', text: 'obsoletekeyword' }))[0].score).toBe(0.9);
    expect((await find_cases(store, { customer_id: 'CUST001', text: 'recentkeyword' }))[0].score).toBe(0.95);
    const context = await get_case_context(store, { case_id: 'CS001' });
    expect(context.messages).toHaveLength(20);
    expect(context.messages.at(-1)?.id).toBe('NEW24');
    expect(context.events).toHaveLength(20);
    expect(context.events.some(event => event.type === 'reply_sent')).toBe(false);
    expect(context.open_tasks.map(task => task.id)).toEqual(['TASK1']);
    expect(context.changes_since_last_contact).toEqual([{ parcel_code: 'B', before: 'in_transit', after: 'delivered' }]);
    expect(context.evidence[0]).toMatchObject({ id: 'EV1', source: 'customer' });
    expect(context.conversations[0].summary).toContain('customer: recentkeyword 24');
  });

  it('compares the latest reply only and does not invent a baseline when missing', async () => {
    const store = testStore();
    await store.updateShipment('SHIP2', { status: 'delivered' });
    expect((await get_case_context(store, { case_id: 'CS001' })).changes_since_last_contact).toHaveLength(1);
    const reply = (await store.get('case_events', 'CE4'))!;
    await store.addEvent({ ...reply, id: 'LATEST', created_at: new Date(Date.parse(reply.created_at) + 1000).toISOString(), payload: { shipment_snapshot: { A: 'delivered', B: 'delivered' } } });
    expect((await get_case_context(store, { case_id: 'CS001' })).changes_since_last_contact).toEqual([]);
    const seed = buildSeed('After Demo 1', new DemoClock());
    seed.case_events = [];
    expect((await get_case_context(testStore(seed), { case_id: 'CS001' })).changes_since_last_contact).toEqual([]);
  });

  it('labels seed photos and numbers uploads chronologically with an id tie-break', async () => {
    const seed = buildSeed('After Demo 1', new DemoClock());
    const photo = seed.evidence[0];
    seed.evidence.push({ ...photo, id: 'EV4', path: '/files/upload-four.jpg' },
      { ...photo, id: 'EV2', path: '/files/demo/parcel_b_open.jpg' },
      { ...photo, id: 'EV3', path: '/files/upload-three.jpg' });
    const context = await get_case_context(testStore(seed), { case_id: 'CS001' });
    expect(context.evidence.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'EV1', label: 'photo of parcel A' }, { id: 'EV2', label: 'photo of the opened parcel B' },
      { id: 'EV3', label: 'customer photo 1' }, { id: 'EV4', label: 'customer photo 2' },
    ]);
  });

  it('groups items by parcel, validates args/results, and exports Responses function schemas', async () => {
    const store = testStore();
    const result = await get_order_shipments(store, { order_id: 'DH001' });
    expect(result.order.id).toBe('DH001');
    expect(result.parcels).toMatchObject([
      { parcel_code: 'A', items: [{ id: 'ITEM1' }], status: 'delivered' },
      { parcel_code: 'B', items: [{ id: 'ITEM2' }], status: 'in_transit' },
    ]);
    await expect(get_case_context(store, { case_id: '' })).rejects.toThrow();
    await expect(get_order_shipments(store, { order_id: 'missing' })).rejects.toThrow('Order not found');
    const broken = buildSeed('After Demo 1', new DemoClock());
    broken.shipments[0].updated_at = 'not a timestamp';
    await expect(get_order_shipments(testStore(broken), { order_id: 'DH001' })).rejects.toThrow();
    expect(responseTools.map(tool => tool.name)).toEqual(['find_cases', 'get_case_context', 'get_order_shipments']);
    expect(responseTools.every(tool => tool.type === 'function' && tool.parameters?.type === 'object')).toBe(true);
  });

  it('serves identical tool data through the app; jump + advance changes B', async () => {
    const store = testStore();
    const demo = createDemoService(store);
    const app = createApp(store, { demo, token: 'test' });
    const post = { method: 'POST', headers: { 'x-demo-token': 'test' } };
    expect((await app.request('/api/demo/jump?to=demo2', post)).status).toBe(200);
    expect((await app.request('/api/demo/advance-day', post)).status).toBe(200);
    const context = await (await app.request('/api/cases/CS001/context')).json();
    expect(context).toEqual(await get_case_context(store, { case_id: 'CS001' }));
    expect(context.changes_since_last_contact).toEqual([{ parcel_code: 'B', before: 'in_transit', after: 'delivered' }]);
    expect(await (await app.request('/api/orders/DH001/shipments')).json()).toEqual(await get_order_shipments(store, { order_id: 'DH001' }));
    expect((await app.request('/api/cases/missing/context')).status).toBe(404);
    expect((await app.request('/api/orders/missing/shipments')).status).toBe(404);
  });
});
