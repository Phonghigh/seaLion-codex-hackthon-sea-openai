import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSuggestion, Triage } from '@seapilot/contracts';
import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import type { ResponsesClient } from '../src/ai/agent';
import { createApp } from '../src/app';
import { createDemoService } from '../src/demo/service';
import { isolatedDatabase } from './database';
import { M1, M2, M3, mockModel } from './mock-model';

const low: Triage = { category: 'order_status', category_confidence: 0.96, needs_human: 0.08, risk: 1, language: 'en' };
const missing: Triage = { category: 'missing_item', category_confidence: 0.97, needs_human: 0.88, risk: 4, language: 'en' };
const final = (value: unknown) => ({ status: 'completed' as const, output: [], output_text: JSON.stringify(value) });
function automaticModel() {
  const create = vi.fn<ResponsesClient['responses']['create']>(async body => {
    const input = body.input as Exclude<ResponseCreateParamsNonStreaming['input'], string>;
    const output = input?.find(item => item.type === 'function_call_output');
    if (!output || output.type !== 'function_call_output') return {
      ...final(''), output: [{ type: 'function_call', id: 'fc-order', call_id: 'call-order', name: 'get_order_shipments', arguments: JSON.stringify({ order_id: 'DH002' }), status: 'completed' }],
    };
    const data = JSON.parse(output.output as string);
    const suggestion: AgentSuggestion = {
      suggested_case_id: null, link_confidence: 0, link_reason: 'No open case.',
      known_facts: [{ text: `Order ${data.order.id}: ${data.parcels[0].status}`, source: 'system' }],
      changes: [], missing_info: [], draft_reply: `Order ${data.order.id} is currently ${data.parcels[0].status.replaceAll('_', ' ')}.`, proposed_action: null,
    };
    return final(suggestion);
  });
  return { responses: { create } };
}
const url = process.env.DATABASE_URL;
describe.skipIf(!url)('BE05 scenes and async routing (disposable PostgreSQL, mocked models)', () => {
  let database: Awaited<ReturnType<typeof isolatedDatabase>>;
  let app: ReturnType<typeof createApp>;
  let classify: ReturnType<typeof vi.fn<ResponsesClient['responses']['create']>>;
  let automatic: ReturnType<typeof automaticModel>;
  let demo: ReturnType<typeof createDemoService>;
  beforeAll(async () => { database = await isolatedDatabase(url!); });
  afterAll(async () => { await database?.close(); });
  beforeEach(async () => {
    classify = vi.fn<ResponsesClient['responses']['create']>().mockResolvedValue(final(low));
    automatic = automaticModel(); demo = createDemoService(database.store);
    app = createApp(database.store, { demo, token: 'test-only', triage: { model: 'mock-triage', client: { responses: { create: classify } } }, agent: { model: 'mock-suggest', client: automatic } });
    await demo.reset();
  });
  const post = async (path: string, body: unknown = {}) => {
    const response = await app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-token': 'test-only' }, body: JSON.stringify(body) });
    expect(response.status, await response.clone().text()).toBeLessThan(300);
    return response.json();
  };
  const create = async (customer_id = 'CUST002') => (await post('/api/conversations', { customer_id })).data.id as string;
  const send = (id: string, text = 'Where is my order DH002?') => post(`/api/conversations/${id}/messages`, { role: 'customer', text });
  const detail = async (id: string) => (await (await app.request(`/api/conversations/${id}`)).json()).data;
  const routed = async (id: string) => {
    await vi.waitFor(async () => expect((await detail(id)).triage_pending).toBe(false));
    const data = await detail(id); expect(data.routing).toBeTruthy(); return data;
  };
  it('detection-only classifies and routes without invoking the reply model or sending a reply', async () => {
    app = createApp(database.store, { demo, token: 'test-only', triage: { detectionOnly: true, model: 'mock-triage', client: { responses: { create: classify } } }, agent: { model: 'mock-suggest', client: automatic } });
    const id = await create(); await send(id);
    const data = await routed(id);
    expect(classify).toHaveBeenCalledOnce();
    expect(automatic.responses.create).not.toHaveBeenCalled();
    expect(data.routing).toMatchObject({ triage: low, decision: { mode: 'human', rule: 'detection_only' } });
    expect(data.routing.route).toBeTruthy();
    expect(data.conversation.mode).toBe('human');
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].role).toBe('customer');
    expect(await database.store.list('cases')).toEqual([]);
    expect(await database.store.list('tasks')).toEqual([]);
    expect(await database.store.list('conversation_events', { conversation_id: id })).toEqual([expect.objectContaining({ type: 'routed' })]);
  });
  it('Scene 0 sends a system-backed AI reply, persists the audit and exposes mode/customer on refresh', async () => {
    const id = await create(); await send(id);
    const data = await routed(id);
    expect(data).toMatchObject({ customer: { name: 'Minh Tran' }, order_id: 'DH002', conversation: { mode: 'auto', case_id: null }, routing: { triage: low, decision: { mode: 'ai' }, route: null } });
    expect(data.messages).toHaveLength(2);
    expect(data.messages[1]).toMatchObject({ role: 'cs', actor: 'AI', text: 'Order DH002 is currently in transit.' });
    expect(await database.store.list('cases')).toEqual([]);
    expect(await database.store.list('tasks')).toEqual([]);
    expect(await database.store.list('conversation_events', { conversation_id: id })).toEqual([expect.objectContaining({ type: 'auto_reply', payload: expect.objectContaining({ triage: low, decision: expect.objectContaining({ mode: 'ai' }) }) })]);
    for (const [request] of automatic.responses.create.mock.calls) expect(request.tools?.map(tool => tool.type === 'function' ? tool.name : '')).toEqual(['get_case_context', 'get_order_shipments']);
    const restarted = createApp(database.store, { agent: { client: automatic, model: 'mock' } });
    expect((await (await restarted.request(`/api/conversations/${id}`)).json()).data.routing).toEqual(data.routing);
  });
  it('Scenes 1–3 keep human Suggest, Link, Approve and escalation intact, with An → Binh routing', async () => {
    classify.mockResolvedValue(final(missing));
    const human = mockModel();
    app = createApp(database.store, { demo, token: 'test-only', triage: { client: { responses: { create: classify } }, model: 'mock' }, agent: { client: human, model: 'mock' } });
    const first = await create('CUST001');
    await post('/api/upload', { conversation_id: first, seed: 'parcel_a' });
    await send(first, M1);
    expect((await routed(first)).routing).toMatchObject({ decision: { mode: 'human', rule: 'has_attachment -> human' }, route: { team: 'delivery', agent: 'an' } });
    const s1 = (await post('/api/agent/suggest', { conversation_id: first })).suggestion;
    await post('/api/approve', { conversation_id: first, kind: 'reply', text: s1.draft_reply, title: 'Cap not received', actor: 'CS_A' });
    await post('/api/demo/advance-day');
    const second = await create('CUST001'); await send(second, M2);
    expect((await routed(second)).routing).toMatchObject({ decision: { mode: 'human', rule: 'open_case_exists -> human (keep owner if on shift)' }, route: { team: 'delivery', agent: 'binh' } });
    const s2 = (await post('/api/agent/suggest', { conversation_id: second })).suggestion;
    expect(s2.suggested_case_id).toBe('CS001');
    await post('/api/cases/CS001/link-conversation', { conversation_id: second, actor: 'CS_B' });
    await post('/api/approve', { conversation_id: second, kind: 'reply', text: s2.draft_reply, actor: 'CS_B' });
    await post('/api/upload', { conversation_id: second, seed: 'parcel_b_open' }); await send(second, M3);
    expect((await routed(second)).routing.route.agent).toBe('binh');
    const s3 = (await post('/api/agent/suggest', { conversation_id: second })).suggestion;
    const blocked = await app.request('/api/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversation_id: second, kind: 'reply', text: s3.draft_reply, actor: 'CS_B' }) });
    expect(blocked.status).toBe(409);
    await post('/api/approve', { conversation_id: second, kind: 'action', action: s3.proposed_action, actor: 'CS_B' });
    const updated = (await post('/api/agent/suggest', { conversation_id: second })).suggestion;
    await post('/api/approve', { conversation_id: second, kind: 'reply', text: updated.draft_reply, actor: 'CS_B' });
    expect(await database.store.list('cases')).toEqual([expect.objectContaining({ id: 'CS001', assignee: 'CS_B', status: 'waiting_ops' })]);
    expect(await database.store.list('tasks')).toHaveLength(1);
    expect(await database.store.list('messages', { actor: 'AI' })).toEqual([]);
  });
  it('Scene 4 routes an ambiguous English request to General Support / Carlos', async () => {
    classify.mockResolvedValue(final({ category: 'other', category_confidence: 0.4, needs_human: 0.4, risk: 2, language: 'en' }));
    const id = await create('CUST003'); await send(id, "Hi, something's wrong with my order");
    expect(await routed(id)).toMatchObject({ customer: { name: 'Sam Lee' }, conversation: { mode: 'human' }, routing: { decision: { mode: 'human', rule: 'category_confidence < thresholds.min_category_confidence -> human' }, route: { team: 'general', agent: 'carlos' } } });
    expect(automatic.responses.create).not.toHaveBeenCalled();
  });
  it('saves and returns the message before a slow triage call, then updates through polling', async () => {
    let resolve!: (response: ReturnType<typeof final>) => void;
    classify.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const id = await create(); const response = await send(id);
    expect(response.data.text).toContain('DH002');
    await vi.waitFor(() => expect(classify).toHaveBeenCalledTimes(1));
    expect(await detail(id)).toMatchObject({ triage_pending: true, conversation: { mode: 'human' }, routing: null });
    resolve(final(low));
    expect((await routed(id)).conversation.mode).toBe('auto');
  });
  it('routes the second message after an auto-reply to a human without a second auto-reply', async () => {
    const id = await create(); await send(id); await routed(id);
    await send(id, 'Is it still in transit?');
    const data = await routed(id);
    expect(data.routing.decision.rule).toBe('second_message_after_ai_reply -> human');
    expect(data.conversation.mode).toBe('human');
    expect(data.messages.filter((item: { actor: string }) => item.actor === 'AI')).toHaveLength(1);
  });
  it('returns safe human routing on triage failure', async () => {
    classify.mockRejectedValue(new Error('upstream private details'));
    const id = await create(); await send(id);
    expect((await routed(id)).routing).toMatchObject({ triage: { category: 'other', category_confidence: 0, needs_human: 1, risk: 3, language: 'en' }, decision: { mode: 'human' } });
    expect(automatic.responses.create).not.toHaveBeenCalled();
  });
  it.each(['unknown order', 'return policy'])('does not auto-answer without system facts: %s', async kind => {
    if (kind === 'return policy') classify.mockResolvedValue(final({ ...low, category: 'return_howto' }));
    const id = await create(); await send(id, kind === 'unknown order' ? 'Where is order DH999?' : 'How do I return it?');
    expect((await routed(id)).routing.decision.mode).toBe('human');
    expect(automatic.responses.create).not.toHaveBeenCalled();
  });
  it('routes to a human if the suggest agent fails rather than showing Auto', async () => {
    automatic.responses.create.mockRejectedValue(new Error('offline'));
    const id = await create(); await send(id);
    expect(await routed(id)).toMatchObject({ conversation: { mode: 'human' }, routing: { decision: { mode: 'human', rule: 'auto_reply_unavailable' } } });
    expect(await database.store.list('messages', { actor: 'AI' })).toEqual([]);
  });
  it('rechecks attachments that arrive while an automatic reply is being drafted', async () => {
    let resolve!: (response: ReturnType<typeof final>) => void;
    automatic.responses.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const id = await create(); await send(id);
    await vi.waitFor(() => expect(automatic.responses.create).toHaveBeenCalledTimes(1));
    await post('/api/upload', { conversation_id: id, seed: 'parcel_a' });
    await vi.waitFor(async () => expect((await detail(id)).routing?.decision.mode).toBe('human'));
    resolve(final({}));
    expect((await detail(id)).conversation.mode).toBe('human');
    expect(await database.store.list('messages', { actor: 'AI' })).toEqual([]);
  });
  it('discards an older triage result when another customer message arrives', async () => {
    let resolve!: (response: ReturnType<typeof final>) => void;
    classify.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValueOnce(final(missing));
    const id = await create(); await send(id);
    await vi.waitFor(() => expect(classify).toHaveBeenCalledTimes(1));
    const second = await send(id, 'Actually, an item is missing.');
    const data = await routed(id);
    expect(data.routing).toMatchObject({ message_id: second.data.id, decision: { mode: 'human' } });
    resolve(final(low)); await new Promise(done => setImmediate(done));
    expect((await detail(id)).routing).toEqual(data.routing);
    expect(automatic.responses.create).not.toHaveBeenCalled();
  });
  it.each(['shipment changed', 'human replied'])('rechecks system state before sending: %s', async change => {
    let resolve!: (response: ReturnType<typeof final>) => void;
    const model = automatic.responses.create.getMockImplementation()!;
    automatic.responses.create.mockImplementation(async (body, options) => {
      const output = await model(body, options);
      return output.output.length ? output : new Promise(done => { resolve = done; });
    });
    const id = await create(); await send(id);
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    if (change === 'shipment changed') await database.store.updateShipment('SHIP3', { status: 'delivered' });
    else await post('/api/approve', { conversation_id: id, kind: 'reply', text: 'A human is checking this.', title: 'Order status', actor: 'CS_A' });
    resolve(final({ suggested_case_id: null, link_confidence: 0, link_reason: '', known_facts: [{ text: 'In transit', source: 'system' }], changes: [], missing_info: [], draft_reply: 'Your order is in transit.', proposed_action: null }));
    const data = await routed(id);
    expect(data.routing.decision.mode).toBe('human');
    expect(data.routing.decision.rule).toBe(change === 'shipment changed' ? 'system_data_changed' : 'open_case_exists -> human (keep owner if on shift)');
    expect(data.messages.filter((item: { actor: string }) => item.actor === 'AI')).toEqual([]);
  });
  it('discards an in-flight result after reset and does not restore old conversations', async () => {
    let resolve!: (response: ReturnType<typeof final>) => void;
    classify.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const id = await create(); await send(id);
    await vi.waitFor(() => expect(classify).toHaveBeenCalledTimes(1));
    await post('/api/demo/reset'); resolve(final(low));
    await new Promise(done => setImmediate(done));
    expect(await database.store.list('conversations')).toEqual([]);
    expect(await database.store.list('conversation_events')).toEqual([]);
    expect(automatic.responses.create).not.toHaveBeenCalled();
  });
});
