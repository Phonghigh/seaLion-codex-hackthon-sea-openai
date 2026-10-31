import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbRowSchemas, type DbTable } from '@seapilot/contracts';
import { connectDatabase } from '../db/client';
import { createPostgresStore } from './postgres';
import { createDemoService } from '../demo/service';
import { buildSeed } from '../demo/seed';
import { createApp } from '../app';

// Deliberately do not load .env: integration tests truncate the explicitly selected DB.
const url = process.env.DATABASE_URL;
if (!url) console.warn('SKIP PostgreSQL integration tests: DATABASE_URL is unset. Start Docker, migrate, then run tests with DATABASE_URL set.');
describe.skipIf(!url)('PostgreSQL integration (real database; resets all demo tables)', () => {
  let connection: ReturnType<typeof connectDatabase>;
  let store: ReturnType<typeof createPostgresStore>;
  let demo: ReturnType<typeof createDemoService>;
  beforeAll(async () => {
    connection = connectDatabase(url!);
    store = createPostgresStore(connection.db);
    demo = createDemoService(store);
    expect(await store.health(), 'DATABASE_URL must point to a running migrated PostgreSQL database').toBe(true);
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
  it('advance updates B at the old clock time, audits every unresolved DH001 case, then advances', async () => {
    await demo.reset('After Demo 1');
    const existing = (await store.get('cases', 'CS001'))!;
    await store.createCase({ ...existing, id: 'CS002', status: 'waiting_customer' });
    await store.createCase({ ...existing, id: 'CS003', status: 'resolved' });
    await store.createCase({ ...existing, id: 'CS004', order_id: 'DH002' });
    const before = demo.clock.now().toISOString();
    const app = createApp(store, { token: 'test-only', demo });
    expect((await app.request('/api/demo/advance-day', { method: 'POST', headers: { 'x-demo-token': 'test-only' } })).status).toBe(200);
    expect((await store.list('shipments', { order_id: 'DH001', parcel_code: 'B' }))[0]).toMatchObject({ status: 'delivered', updated_at: before });
    const events = await store.list('case_events', { type: 'shipment_updated' });
    expect(events.map(row => row.case_id).sort()).toEqual(['CS001', 'CS002']);
    expect(events.every(row => row.created_at === before)).toBe(true);
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
});
