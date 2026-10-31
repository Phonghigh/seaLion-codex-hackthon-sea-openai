import '../src/env';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { serve } from '@hono/node-server';
import { createApp } from '../src/app';
import { isolatedDatabase } from '../tests/database';
import { mockModel, M1, M2, M3 } from '../tests/mock-model';

// This is an explicit test harness, never a fallback in the production API.
process.env.OPENAI_API_KEY = '';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the disposable test database');
const database = await isolatedDatabase(process.env.DATABASE_URL);
const app = createApp(database.store, { token: 'curl-test-only', agent: { client: mockModel(), model: 'mock-only' } });
const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
await new Promise<void>(resolve => { if (server.listening) resolve(); else server.once('listening', resolve); });
const address = server.address();
assert(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const exec = promisify(execFile);
async function request(path: string, body?: unknown) {
  const args = ['--silent', '--show-error', '--fail-with-body', `${origin}${path}`];
  if (body !== undefined) args.push('-H', 'Content-Type: application/json', '--data', JSON.stringify(body));
  if (path.startsWith('/api/demo/')) args.push('-H', 'x-demo-token: curl-test-only');
  const { stdout } = await exec('curl', args);
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  return result;
}
try {
  await request('/api/demo/reset', {});
  const first = (await request('/api/conversations', { customer_id: 'CUST001' })).data.id;
  await request(`/api/conversations/${first}/messages`, { role: 'customer', text: M1 });
  const ev1 = (await request('/api/upload', { conversation_id: first, seed: 'parcel_a' })).data.id;
  const scene1 = (await request('/api/agent/suggest', { conversation_id: first })).suggestion;
  await request('/api/approve', { conversation_id: first, kind: 'reply', title: 'Cap not received', text: scene1.draft_reply, actor: 'an' });
  await request('/api/demo/advance-day', {});
  const second = (await request('/api/conversations', { customer_id: 'CUST001' })).data.id;
  await request(`/api/conversations/${second}/messages`, { role: 'customer', text: M2 });
  const scene2 = (await request('/api/agent/suggest', { conversation_id: second })).suggestion;
  assert.equal(scene2.suggested_case_id, 'CS001');
  assert.deepEqual(scene2.changes.map((item: { before: string; after: string }) => [item.before, item.after]), [['in_transit', 'delivered']]);
  await request('/api/cases/CS001/link-conversation', { conversation_id: second, actor: 'binh' });
  await request('/api/approve', { conversation_id: second, kind: 'reply', text: scene2.draft_reply, actor: 'binh' });
  await request(`/api/conversations/${second}/messages`, { role: 'customer', text: M3 });
  const ev2 = (await request('/api/upload', { conversation_id: second, seed: 'parcel_b_open' })).data.id;
  const scene3 = (await request('/api/agent/suggest', { conversation_id: second })).suggestion;
  await request('/api/approve', { conversation_id: second, kind: 'action', action: scene3.proposed_action, actor: 'binh' });
  await request('/api/approve', { conversation_id: second, kind: 'reply', text: scene3.draft_reply, actor: 'binh' });
  const detail = (await request('/api/cases/CS001')).data;
  const conversations = (await request('/api/conversations?customer_id=CUST001')).data;
  assert.equal((await database.store.list('cases')).length, 1);
  assert.equal(conversations.length, 2);
  assert(conversations.every((item: { case_id: string }) => item.case_id === 'CS001'));
  assert.equal(detail.case.assignee, 'binh'); assert.equal(detail.case.status, 'waiting_ops');
  assert.equal(detail.evidence.length, 2);
  assert(detail.evidence.every((item: { source: string }) => item.source === 'customer'));
  assert.equal(detail.tasks.length, 1);
  assert.deepEqual(detail.tasks[0].evidence_ids, [ev1, ev2].sort());
  for (const id of [first, second]) {
    const thread = (await request(`/api/conversations/${id}`)).data;
    assert(thread.messages.filter((item: { role: string }) => item.role === 'cs').every((item: { text: string }) => !/please (?:re)?send.*parcel A photo/i.test(item.text)));
  }
  console.log('curl continuity PASS: 1 case, 2 conversations, 2 customer photos, assignee binh, waiting_ops, 1 task containing both photos. OPENAI_API_KEY empty.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await database.close();
}
