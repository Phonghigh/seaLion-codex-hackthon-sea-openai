import { readFile, rm } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app';
import { isolatedDatabase } from './database';
import { isolatedUploads } from './uploads';
import { mockModel, M1, M2, M3 } from './mock-model';

const url = process.env.DATABASE_URL;
if (!url) console.warn('SKIP continuity integration: DATABASE_URL is unset; tests use a disposable database when configured.');
describe.skipIf(!url)('case continuity through the app with PostgreSQL and a mocked model', () => {
  let database: Awaited<ReturnType<typeof isolatedDatabase>>;
  let uploads: Awaited<ReturnType<typeof isolatedUploads>>;
  let app: ReturnType<typeof createApp>;
  beforeAll(async () => { database = await isolatedDatabase(url!); uploads = await isolatedUploads(); });
  afterAll(async () => { if (database) await database.close(); await uploads?.close(); });
  const post = (path: string, body: unknown = {}) => app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-token': 'test-only' }, body: JSON.stringify(body) });
  const success = async (path: string, body: unknown = {}) => {
    const response = await post(path, body);
    const result = await response.json();
    expect(response.status, JSON.stringify(result)).toBeLessThan(300);
    expect(result.ok).toBe(true);
    return result;
  };
  const conversation = async (customer_id = 'CUST001') => (await success('/api/conversations', { customer_id })).data.id as string;
  const message = (id: string, text: string) => success(`/api/conversations/${id}/messages`, { role: 'customer', text });
  const attach = async (id: string, seed = 'parcel_a') => (await success('/api/upload', { conversation_id: id, seed })).data;
  const reply = (id: string, text: string, actor = 'an') => success('/api/approve', { conversation_id: id, kind: 'reply', title: 'Cap not received', text, actor });
  beforeEach(async () => {
    app = createApp(database.store, { uploadsRoot: uploads.root, token: 'test-only', agent: { client: mockModel(), model: 'mock-only' } });
    await success('/api/demo/reset');
  });

  it('runs reset → Scene 1 → advance → Scene 2 handover → Scene 3 escalation → reply', async () => {
    const first = await conversation();
    await message(first, M1);
    const ev1 = await attach(first);
    expect(ev1).toMatchObject({ case_id: null, source: 'customer' });
    const scene1 = (await success('/api/agent/suggest', { conversation_id: first })).suggestion;
    expect((await reply(first, scene1.draft_reply)).data.case_id).toBe('CS001');
    expect((await database.store.get('evidence', ev1.id))?.case_id).toBe('CS001');
    await success('/api/demo/advance-day');
    const timeline = (await (await app.request('/api/cases/CS001')).json()).data.events;
    expect(Date.parse(timeline.find((event: { type: string }) => event.type === 'shipment_updated').created_at)).toBeGreaterThan(Date.parse(timeline.find((event: { type: string }) => event.type === 'reply_sent').created_at));
    const second = await conversation();
    await message(second, M2);
    const scene2 = (await success('/api/agent/suggest', { conversation_id: second })).suggestion;
    expect(scene2).toMatchObject({ suggested_case_id: 'CS001', changes: [{ before: 'in_transit', after: 'delivered' }] });
    expect(scene2.missing_info).toHaveLength(1);
    await success('/api/cases/CS001/link-conversation', { conversation_id: second, actor: 'binh' });
    const eventsBefore = await database.store.list('case_events');
    await success('/api/cases/CS001/link-conversation', { conversation_id: second, actor: 'an' });
    expect(await database.store.list('case_events')).toEqual(eventsBefore);
    await reply(second, scene2.draft_reply, 'binh');
    await message(second, M3);
    const ev2 = await attach(second, 'parcel_b_open');
    const scene3 = (await success('/api/agent/suggest', { conversation_id: second })).suggestion;
    const blocked = await post('/api/approve', { conversation_id: second, kind: 'reply', text: scene3.draft_reply, actor: 'binh' });
    expect(blocked.status).toBe(409);
    expect(await database.store.list('messages', { role: 'cs' })).toHaveLength(2);
    const action = { conversation_id: second, kind: 'action', action: scene3.proposed_action, actor: 'binh' };
    const approvals = await Promise.all([success('/api/approve', action), success('/api/approve', action)]);
    expect(approvals[0].data.task.id).toBe(approvals[1].data.task.id);
    const updated = (await success('/api/agent/suggest', { conversation_id: second })).suggestion;
    expect(updated.proposed_action).toBeNull();
    expect(updated.draft_reply).toContain('has been forwarded');
    await reply(second, updated.draft_reply, 'binh');
    expect(await database.store.list('cases')).toEqual([expect.objectContaining({ id: 'CS001', assignee: 'binh', status: 'waiting_ops' })]);
    expect(await database.store.list('conversations', { case_id: 'CS001' })).toHaveLength(2);
    expect(await database.store.list('evidence')).toEqual(expect.arrayContaining([expect.objectContaining({ id: ev1.id, case_id: 'CS001', source: 'customer' }), expect.objectContaining({ id: ev2.id, case_id: 'CS001', source: 'customer' })]));
    expect(await database.store.list('evidence')).toHaveLength(2);
    expect(await database.store.list('tasks')).toEqual([expect.objectContaining({ team: 'operations', status: 'open', evidence_ids: [ev1.id, ev2.id].sort() })]);
    const replies = await database.store.list('messages', { role: 'cs' });
    expect(replies).toHaveLength(3);
    for (const item of replies) expect(item.text).not.toMatch(/please (?:re)?send.*parcel A photo/i);
    const events = await database.store.list('case_events');
    expect(events.filter(item => item.type === 'action_executed')).toHaveLength(1);
    expect(events.filter(item => item.type === 'reply_sent').map(item => item.payload.shipment_snapshot)).toEqual(expect.arrayContaining([{ A: 'delivered', B: 'in_transit' }, { A: 'delivered', B: 'delivered' }]));
    const detail = await (await app.request(`/api/conversations/${second}`)).json();
    expect(detail.data).toMatchObject({ case: { id: 'CS001', assignee: 'binh' }, evidence: [{ id: ev2.id }] });
    expect(detail.data.messages).toHaveLength(4);
    expect((await (await app.request('/api/cases/CS001')).json()).data.tasks).toHaveLength(1);
    expect((await (await app.request('/api/conversations?customer_id=CUST001')).json()).data).toHaveLength(2);
    expect((await (await app.request('/api/conversations?customer_id=CUST002')).json()).data).toEqual([]);
    await success('/api/demo/reset');
    expect(await database.store.list('cases')).toEqual([]);
    expect(await database.store.list('evidence')).toEqual([]);
    expect(await database.store.list('tasks')).toEqual([]);
  });

  it('rolls back task and status if auditing fails, records action_failed, keeps reply blocked and permits retry', async () => {
    await success('/api/demo/jump?to=demo2');
    await message('CONV1', M3);
    await attach('CONV1', 'parcel_b_open');
    const suggestion = (await success('/api/agent/suggest', { conversation_id: 'CONV1' })).suggestion;
    // Fail after task insertion and status update, exercising real transaction rollback.
    await database.db.execute(sql`ALTER TABLE case_events ADD CONSTRAINT test_fail_action CHECK (type <> 'action_executed')`);
    const body = { conversation_id: 'CONV1', kind: 'action', action: suggestion.proposed_action, actor: 'binh' };
    try {
      const failed = await post('/api/approve', body);
      expect(failed.status).toBe(500);
      expect(await failed.json()).toMatchObject({ ok: false });
      expect(await database.store.list('tasks')).toEqual([]);
      expect((await database.store.get('cases', 'CS001'))?.status).toBe('open');
      expect(await database.store.list('case_events', { type: 'action_failed' })).toHaveLength(1);
      expect((await post('/api/approve', { conversation_id: 'CONV1', kind: 'reply', text: 'Escalated', actor: 'binh' })).status).toBe(409);
    } finally { await database.db.execute(sql`ALTER TABLE case_events DROP CONSTRAINT test_fail_action`); }
    await success('/api/approve', body);
    await reply('CONV1', suggestion.draft_reply, 'binh');
  });

  it('stores multipart bytes under a generated name, serves them and attaches pending evidence on link', async () => {
    await success('/api/demo/jump?to=demo2');
    const second = await conversation();
    const bytes = await readFile(new URL('../public/demo/parcel_a.jpg', import.meta.url));
    const form = new FormData(); form.set('conversation_id', second);
    form.set('file', new File([bytes], '../../overwrite.jpg', { type: 'image/jpeg' }));
    const response = await app.request('/api/upload', { method: 'POST', body: form });
    expect(response.status).toBe(201);
    const { data } = await response.json();
    try {
      expect(data).toMatchObject({ case_id: null, source: 'customer' });
      expect(Buffer.from(await (await app.request(data.path)).arrayBuffer())).toEqual(bytes);
      await success('/api/cases/CS001/link-conversation', { conversation_id: second, actor: 'binh' });
      expect((await database.store.get('evidence', data.id))?.case_id).toBe('CS001');
    } finally { await rm(new URL(data.path.split('/').at(-1)!, uploads.root), { force: true }); }
  });

  it('validates every body and rejects missing records, cross-customer links and foreign evidence without a demo token', async () => {
    const paths = ['/api/conversations', '/api/conversations/missing/messages', '/api/upload', '/api/cases/missing/link-conversation', '/api/approve'];
    for (const path of paths) {
      for (const body of ['{', '{}']) {
        expect((await app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).status).toBe(400);
      }
    }
    expect((await post('/api/conversations', { customer_id: 'missing' })).status).toBe(404);
    expect((await app.request('/api/conversations/missing')).status).toBe(404);
    expect((await app.request('/api/cases/missing')).status).toBe(404);
    const publicCreate = await app.request('/api/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customer_id: 'CUST001' }) });
    expect(publicCreate.status).toBe(201);
    await success('/api/demo/jump?to=demo2');
    const other = await conversation('CUST002');
    expect((await post('/api/cases/CS001/link-conversation', { conversation_id: other, actor: 'binh' })).status).toBe(409);
    const foreign = await attach(other);
    expect((await post('/api/approve', { conversation_id: 'CONV1', kind: 'action', actor: 'binh', action: { type: 'escalate_to_ops', reason: 'test', evidence_ids: [foreign.id] } })).status).toBe(400);
    expect(await database.store.list('tasks')).toEqual([]);
    expect((await post('/api/conversations/CONV1/messages', { role: 'cs', text: 'bypass' })).status).toBe(400);
  });

  it('allocates sequential case IDs under concurrent first replies and uses the latest customer order', async () => {
    const first = await conversation(); const second = await conversation();
    await database.db.execute(sql`INSERT INTO orders (id, customer_id, placed_at, status) VALUES ('DHNEW', 'CUST001', now() + interval '1 day', 'paid')`);
    await Promise.all([reply(first, 'First'), reply(second, 'Second')]);
    expect((await database.store.list('cases')).map(item => [item.id, item.order_id])).toEqual([['CS001', 'DHNEW'], ['CS002', 'DHNEW']]);
  });

  it('cleans up an uploaded file if evidence persistence fails', async () => {
    const id = await conversation();
    const { readdir } = await import('node:fs/promises');
    const directory = uploads.root;
    const before = await readdir(directory);
    const transaction = vi.spyOn(database.store, 'transaction').mockRejectedValueOnce(new Error('database unavailable'));
    const form = new FormData(); form.set('conversation_id', id); form.set('file', new File(['image'], 'test.jpg', { type: 'image/jpeg' }));
    try { expect((await app.request('/api/upload', { method: 'POST', body: form })).status).toBe(500); }
    finally { transaction.mockRestore(); }
    expect(await readdir(directory)).toEqual(before);
  });
});
