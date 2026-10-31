import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { createApiClient as customerClient } from '../../customer/src/lib/api';
import { createApiClient as csClient, CS_IDENTITIES, type ApiResult } from '../../customer-service/src/lib/api';
import { createApp } from '../src/app';
import { isolatedDatabase } from './database';
import { mockModel, M1, M2, M3 } from './mock-model';

function data<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

// These always run, including when PostgreSQL is unavailable.
describe('web transport validation and failure envelopes', () => {
  it('does not treat HTTP 200 ok:false, malformed payloads, null suggestions or network errors as success', async () => {
    const transport = vi.fn<typeof fetch>();
    const client = csClient({ fetch: transport });
    transport.mockResolvedValueOnce(Response.json({ ok: false, error: 'Model unavailable', suggestion: null }));
    expect(await client.suggest('CONV1')).toMatchObject({ ok: false, error: 'Model unavailable' });
    transport.mockResolvedValueOnce(Response.json({ ok: true, suggestion: null }));
    expect(await client.suggest('CONV1')).toMatchObject({ ok: false });
    transport.mockResolvedValueOnce(Response.json({ ok: true, data: { message: 'not a row' } }));
    expect(await client.approveReply('CONV1', 'Hello', 'CS_A')).toMatchObject({ ok: false });
    transport.mockResolvedValueOnce(Response.json({ ok: false, error: 'Action failed' }, { status: 500 }));
    expect(await client.approveAction('CONV1', { type: 'escalate_to_ops', reason: 'Missing', evidence_ids: ['EV1'] }, 'CS_B')).toMatchObject({ ok: false, error: 'Action failed' });
    transport.mockRejectedValueOnce(new Error('offline'));
    expect(await client.conversations()).toMatchObject({ ok: false });
    transport.mockResolvedValueOnce(new Response('<html>proxy failure</html>', { status: 502 }));
    expect(await client.conversation('CONV1')).toMatchObject({ ok: false });
  });
  it('keeps demo tokens off workspace requests and uses encoded URLs', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, error: 'test' }));
    const client = customerClient({ baseUrl: 'http://example.test/', fetch: transport });
    await client.demo('demo2', 'test-only');
    expect(transport.mock.calls[0]).toMatchObject(['http://example.test/api/demo/jump?to=demo2', { method: 'POST', headers: { 'x-demo-token': 'test-only' } }]);
    await client.sendMessage('id/with space', 'hello');
    expect(transport.mock.calls[1][0]).toBe('http://example.test/api/conversations/id%2Fwith%20space/messages');
    expect(new Headers(transport.mock.calls[1][1]?.headers).has('x-demo-token')).toBe(false);
    expect(CS_IDENTITIES).toEqual({ An: 'CS_A', Binh: 'CS_B' });
  });
});

const url = process.env.DATABASE_URL;
if (!url) console.warn('SKIP web client story: DATABASE_URL unset. Run apps/api/scripts/test-isolated.ts for three real PostgreSQL resets.');
describe.skipIf(!url)('both web api.ts clients against the app with PostgreSQL and mocked Responses', () => {
  let database: Awaited<ReturnType<typeof isolatedDatabase>>;
  let customer: ReturnType<typeof customerClient>;
  let cs: ReturnType<typeof csClient>;
  beforeAll(async () => {
    database = await isolatedDatabase(url!);
    const app = createApp(database.store, { token: 'web-test-only', agent: { client: mockModel(), model: 'mock-only' } });
    const transport: typeof fetch = async (input, init) => app.request(input instanceof Request ? input : String(input), init);
    customer = customerClient({ fetch: transport }); cs = csClient({ fetch: transport });
  });
  afterAll(async () => { if (database) await database.close(); });

  it('runs Scene 1 → Next day → Scene 2 → Scene 3 three times after Reset', async () => {
    for (let iteration = 0; iteration < 3; iteration += 1) {
      data(await cs.demo('reset', 'web-test-only'));
      expect(data(await customer.conversations('CUST001'))).toEqual([]);
      const first = data(await customer.createConversation('CUST001')).id;
      data(await customer.sendMessage(first, M1));
      const ev1 = data(await customer.seedImage(first, 'parcel_a')).id;
      expect(data(await cs.conversation(first)).evidence[0]).toMatchObject({ id: ev1, case_id: null, source: 'customer' });
      const scene1 = data(await cs.suggest(first));
      data(await cs.approveReply(first, scene1.draft_reply, CS_IDENTITIES.An, 'Cap not received'));
      const initial = data(await cs.caseDetail('CS001'));
      expect(initial.events.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(event => event.type)).toEqual(['case_created', 'conversation_linked', 'reply_sent']);
      expect(initial.events.some(event => event.type === 'assignee_changed')).toBe(false);
      expect(data(await customer.conversation(first)).messages.at(-1)?.role).toBe('cs');
      data(await cs.demo('advance-day', 'web-test-only'));
      const second = data(await customer.createConversation('CUST001')).id;
      data(await customer.sendMessage(second, M2));
      const scene2 = data(await cs.suggest(second));
      expect(scene2.suggested_case_id).toBe('CS001');
      expect(scene2.changes).toEqual([expect.objectContaining({ before: 'in_transit', after: 'delivered' })]);
      expect(scene2.missing_info).toHaveLength(1);
      data(await cs.link('CS001', second, CS_IDENTITIES.Binh));
      const handover = data(await cs.caseDetail('CS001'));
      expect(handover.case.assignee).toBe('CS_B');
      const created = handover.events.find(event => event.type === 'case_created')!;
      const changed = handover.events.find(event => event.type === 'assignee_changed')!;
      expect(changed.payload).toEqual({ before: 'CS_A', after: 'CS_B' });
      expect(Date.parse(created.created_at)).toBeLessThan(Date.parse(changed.created_at));
      data(await cs.approveReply(second, scene2.draft_reply, CS_IDENTITIES.Binh));
      data(await customer.sendMessage(second, M3));
      const ev2 = data(await customer.seedImage(second, 'parcel_b_open')).id;
      const scene3 = data(await cs.suggest(second));
      expect(scene3.proposed_action).not.toBeNull();
      const blocked = await cs.approveReply(second, scene3.draft_reply, CS_IDENTITIES.Binh);
      expect(blocked).toMatchObject({ ok: false, status: 409 });
      const invalid = await cs.approveAction(second, { ...scene3.proposed_action!, evidence_ids: ['NOT_THIS_CASE'] }, CS_IDENTITIES.Binh);
      expect(invalid).toMatchObject({ ok: false });
      expect(data(await cs.caseDetail('CS001')).tasks).toEqual([]);
      const action = data(await cs.approveAction(second, scene3.proposed_action!, CS_IDENTITIES.Binh));
      expect(data(await cs.approveAction(second, scene3.proposed_action!, CS_IDENTITIES.Binh)).task.id).toBe(action.task.id);
      data(await cs.approveReply(second, scene3.draft_reply, CS_IDENTITIES.Binh));
      const detail = data(await cs.caseDetail('CS001'));
      expect(await database.store.list('cases')).toHaveLength(1);
      expect(data(await cs.conversations())).toEqual(expect.arrayContaining([expect.objectContaining({ id: first, case_id: 'CS001' }), expect.objectContaining({ id: second, case_id: 'CS001' })]));
      expect(data(await cs.conversations())).toHaveLength(2);
      expect(detail.case).toMatchObject({ assignee: 'CS_B', status: 'waiting_ops' });
      expect(detail.evidence).toHaveLength(2);
      expect(detail.evidence.every(item => item.source === 'customer')).toBe(true);
      expect(detail.tasks).toEqual([expect.objectContaining({ evidence_ids: [ev1, ev2].sort(), team: 'operations' })]);
      expect(data(await cs.caseContext('CS001')).open_tasks).toHaveLength(1);
      expect(data(await customer.shipments('DH001')).parcels.find(item => item.parcel_code === 'B')?.status).toBe('delivered');
      for (const id of [first, second]) {
        const replies = data(await customer.conversation(id)).messages.filter(item => item.role === 'cs');
        expect(replies.length).toBeGreaterThan(0);
        for (const reply of replies) expect(reply.text).not.toMatch(/please (?:re)?send.*parcel A photo/i);
      }
    }
  }, 30_000);

  it('validates jump, token rejection, same-assignee linking and multipart upload through the web clients', async () => {
    expect(await cs.demo('reset', 'wrong')).toMatchObject({ ok: false, status: 401 });
    data(await cs.demo('demo2', 'web-test-only'));
    const before = data(await cs.caseDetail('CS001'));
    const id = data(await customer.createConversation('CUST001')).id;
    const bytes = await readFile(new URL('../public/demo/parcel_a.jpg', import.meta.url));
    const evidence = data(await customer.upload(id, new File([bytes], 'photo.jpg', { type: 'image/jpeg' })));
    try {
      expect(evidence.case_id).toBeNull();
      data(await cs.link('CS001', id, before.case.assignee));
      const after = data(await cs.caseDetail('CS001'));
      expect(after.events.filter(event => event.type === 'assignee_changed')).toEqual(before.events.filter(event => event.type === 'assignee_changed'));
      expect(after.evidence.find(item => item.id === evidence.id)?.case_id).toBe('CS001');
      expect(customer.fileUrl(evidence.path)).toBe(`http://127.0.0.1:4000${evidence.path}`);
    } finally { await rm(new URL(`../data/uploads/${evidence.path.split('/').at(-1)}`, import.meta.url), { force: true }); }
  });
});
