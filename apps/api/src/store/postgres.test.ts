import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbRowSchemas, type DbTable } from '@seapilot/contracts';
import { isolatedDatabase } from '../../tests/database';
import { createPostgresStore } from './postgres';
import { createDemoService } from '../demo/service';
import { buildSeed } from '../demo/seed';
import { createApp } from '../app';
import { find_cases } from '../ai/tools';

// DATABASE_URL only locates the server. Every file owns a disposable database.
const url = process.env.DATABASE_URL;
if (!url) console.warn('SKIP PostgreSQL integration tests: DATABASE_URL is unset. Set it to a PostgreSQL server where the test user can create disposable databases.');
describe.skipIf(!url)('PostgreSQL integration (disposable database)', () => {
  let connection: Awaited<ReturnType<typeof isolatedDatabase>>;
  let store: ReturnType<typeof createPostgresStore>;
  let demo: ReturnType<typeof createDemoService>;
  beforeAll(async () => {
    connection = await isolatedDatabase(url!);
    store = connection.store;
    demo = createDemoService(store);
    expect(await store.health(), 'The disposable PostgreSQL database must be reachable').toBe(true);
  });
  beforeEach(async () => { await demo.reset(); });
  afterAll(async () => { if (connection) await connection.close(); });
  const snapshot = async () => Object.fromEntries(await Promise.all((Object.keys(DbRowSchemas) as DbTable[]).map(async table => [table, await store.list(table)])));
  const withoutTimes = (value: unknown) => JSON.parse(JSON.stringify(value, (key, val) => key.endsWith('_at') ? undefined : val));
  it('reset twice yields identical business rows across all ten tables', async () => {
    const first = await snapshot();
    await demo.advanceDay();
    await demo.reset();
    expect(withoutTimes(await snapshot())).toEqual(withoutTimes(first));
    expect(await store.list('customers')).toHaveLength(3);
    expect(await store.list('orders')).toHaveLength(3);
    expect(await store.list('cases')).toEqual([]);
  });
  it('jump demo2 creates exactly CS001, CONV1, EV1 and four events', async () => {
    const app = createApp(store, { token: 'test-only', demo });
    const response = await app.request('/api/demo/jump?to=demo2', { method: 'POST', headers: { 'x-demo-token': 'test-only' } });
    expect(response.status).toBe(200);
    expect((await store.list('cases')).map(row => row.id)).toEqual(['CS001']);
    expect((await store.list('conversations')).map(row => row.id)).toEqual(['CONV1']);
    expect((await store.list('evidence')).map(row => row.id)).toEqual(['EV1']);
    expect(await store.list('case_events')).toHaveLength(4);
    expect((await store.get('case_events', 'CE4'))?.payload.shipment_snapshot).toEqual({ A: 'delivered', B: 'in_transit' });
  });
  it('advance updates B and audits unresolved DH001 cases at the new time after the last reply', async () => {
    await demo.reset('After Demo 1');
    const existing = (await store.get('cases', 'CS001'))!;
    await store.createCase({ ...existing, id: 'CS002', status: 'waiting_customer' });
    await store.createCase({ ...existing, id: 'CS003', status: 'resolved' });
    await store.createCase({ ...existing, id: 'CS004', order_id: 'DH002' });
    const before = demo.clock.now().toISOString();
    const app = createApp(store, { token: 'test-only', demo });
    expect((await app.request('/api/demo/advance-day', { method: 'POST', headers: { 'x-demo-token': 'test-only' } })).status).toBe(200);
    const after = demo.clock.now().toISOString();
    expect((await store.list('shipments', { order_id: 'DH001', parcel_code: 'B' }))[0]).toMatchObject({ status: 'delivered', updated_at: after });
    const events = await store.list('case_events', { type: 'shipment_updated' });
    expect(events.map(row => row.case_id).sort()).toEqual(['CS001', 'CS002']);
    expect(events.every(row => row.created_at === after)).toBe(true);
    const lastReply = (await store.list('case_events', { type: 'reply_sent' })).at(-1)!;
    expect(Date.parse(events[0].created_at)).toBeGreaterThan(Date.parse(lastReply.created_at));
    expect(demo.clock.now().getTime()).toBe(Date.parse(before) + 86_400_000);
  });
  it('rolls back truncate and inserts when a seed violates a foreign key', async () => {
    await demo.reset('After Demo 1');
    const before = await snapshot();
    const invalid = buildSeed('Start', demo.clock);
    invalid.orders[0].customer_id = 'MISSING';
    await expect(store.resetTo(invalid)).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
  it('links pending evidence, hands over ownership and records both events', async () => {
    await demo.reset('After Demo 1');
    const at = demo.clock.now().toISOString();
    const conversation = await store.createConversation({ customer_id: 'CUST001', case_id: null, channel: 'chat', mode: 'human', opened_at: at });
    const evidence = await store.addEvidence({ conversation_id: conversation.id, case_id: null, type: 'image', path: '/files/demo/parcel_b_open.jpg', source: 'customer', created_at: at });
    const message = await store.addMessage({ conversation_id: conversation.id, role: 'customer', actor: 'CUST001', text: 'Please follow up', created_at: at });
    await store.linkConversation(conversation.id, 'CS001', 'CS_B', at);
    expect((await store.get('conversations', conversation.id))?.case_id).toBe('CS001');
    expect((await store.get('evidence', evidence.id))?.case_id).toBe('CS001');
    expect((await store.get('cases', 'CS001'))?.assignee).toBe('CS_B');
    expect(await store.get('messages', message.id)).toEqual(message);
    expect(await store.list('case_events', { type: 'assignee_changed' })).toHaveLength(1);
    const task = await store.createTask({ case_id: 'CS001', team: 'operations', status: 'open', evidence_ids: ['EV1', evidence.id], created_at: at });
    expect((await store.get('tasks', task.id))?.evidence_ids).toEqual(['EV1', evidence.id]);
  });
  it('serves real health and authenticated reset', async () => {
    const app = createApp(store, { token: 'test-only', demo });
    expect(await (await app.request('/api/health')).json()).toMatchObject({ ok: true, db: 'up' });
    await demo.reset('After Demo 1');
    expect((await app.request('/api/demo/reset', { method: 'POST', headers: { 'x-demo-token': 'test-only' } })).status).toBe(200);
    expect(await store.list('cases')).toEqual([]);
  });
  it('reads tool context and shipment changes after jump + advance through the app', async () => {
    const app = createApp(store, { token: 'test-only', demo });
    const post = { method: 'POST', headers: { 'x-demo-token': 'test-only' } };
    expect((await app.request('/api/demo/jump?to=demo2', post)).status).toBe(200);
    expect((await find_cases(store, { customer_id: 'CUST001', order_id: 'DH001' }))[0]).toMatchObject({ case_id: 'CS001', score: 0.9 });
    expect((await app.request('/api/demo/advance-day', post)).status).toBe(200);
    const context = await (await app.request('/api/cases/CS001/context')).json();
    expect(context.changes_since_last_contact).toEqual([{ parcel_code: 'B', before: 'in_transit', after: 'delivered' }]);
    const shipments = await (await app.request('/api/orders/DH001/shipments')).json();
    expect(shipments.parcels).toContainEqual(expect.objectContaining({ parcel_code: 'B', status: 'delivered', items: [expect.objectContaining({ id: 'ITEM2' })] }));
  });
});
