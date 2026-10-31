import { labelEvidence } from '@seapilot/contracts/client';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResponseOutputItem } from 'openai/resources/responses/responses';
import { AgentSuggestionSchema, AgentSuggestionEnvelopeSchema, type AgentSuggestion } from '@seapilot/contracts';
import { createAgent, type ResponsesClient } from './agent';
import { testStore } from './test-store';
import { createApp } from '../app';

const suggestion: AgentSuggestion = {
  suggested_case_id: 'CS001', link_confidence: 0.95, link_reason: 'Same customer, order and missing cap.',
  known_facts: [{ text: 'Parcel B is marked delivered.', source: 'system' }],
  changes: [{ text: 'Parcel B changed.', before: 'in_transit', after: 'delivered' }],
  missing_info: ['Was parcel B received without the cap?'], draft_reply: 'We have your earlier photo. Did parcel B arrive without the cap?',
  proposed_action: null,
};
const final = (value: unknown = suggestion) => ({ status: 'completed' as const, output: [], output_text: typeof value === 'string' ? value : JSON.stringify(value) });
const toolCall = (name: string, args: unknown, id = 'call-1'): ResponseOutputItem => ({
  type: 'function_call', id: `fc-${id}`, call_id: id, name, arguments: JSON.stringify(args), status: 'completed',
});
const toolResponse = (...output: ResponseOutputItem[]) => ({ ...final(''), output });
const mockClient = () => ({ responses: { create: vi.fn<ResponsesClient['responses']['create']>() } });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('suggest agent with mocked OpenAI', () => {
  it('runs all three tools, preserves reasoning/call ids, uses env model and runtime prompt, and audits without sending', async () => {
    vi.stubEnv('OPENAI_MODEL', 'configured-test-model');
    const store = testStore();
    await store.updateShipment('SHIP2', { status: 'delivered' });
    const client = mockClient();
    client.responses.create
      .mockResolvedValueOnce(toolResponse({ type: 'reasoning', id: 'reasoning-1', summary: [], encrypted_content: 'encrypted-state' }, toolCall('find_cases', { customer_id: 'CUST001', order_id: 'DH001' }, 'find')))
      .mockResolvedValueOnce(toolResponse(toolCall('get_case_context', { case_id: 'CS001' }, 'context'), toolCall('get_order_shipments', { order_id: 'DH001' }, 'shipments')))
      .mockResolvedValueOnce(final());
    const result = await createAgent(store, { client }).suggest('CONV1');
    expect(result).toEqual({ ok: true, suggestion });
    const requests = client.responses.create.mock.calls.map(([body]) => body);
    expect(requests).toHaveLength(3);
    for (const request of requests) expect(request.include).toEqual(['reasoning.encrypted_content']);
    expect(requests[0]).toMatchObject({ model: 'configured-test-model', store: false });
    expect(requests[0].instructions).toContain('You are seaPilot');
    expect(requests[0].instructions).toContain('action_executed event for escalate_to_ops');
    expect(requests[0].instructions).toContain('never include raw ids or ISO timestamps');
    expect(requests[0].instructions).toContain('Never ask for information or evidence that is already in the case');
    expect(requests[0].input).toEqual([{ role: 'user', content: JSON.stringify({ conversation_id: 'CONV1', customer_id: 'CUST001', messages: await store.list('messages', { conversation_id: 'CONV1' }), evidence: labelEvidence(await store.list('evidence', { conversation_id: 'CONV1' })), order_id: 'DH001' }) }]);
    expect(requests.every(body => !('temperature' in body) && !('top_p' in body))).toBe(true);
    expect(requests[2].input).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'reasoning', id: 'reasoning-1', encrypted_content: 'encrypted-state' }),
      expect.objectContaining({ type: 'function_call_output', call_id: 'find' }),
      expect.objectContaining({ type: 'function_call_output', call_id: 'context', output: expect.stringContaining('"before":"in_transit","after":"delivered"') }),
      expect.objectContaining({ type: 'function_call_output', call_id: 'shipments' }),
    ]));
    expect(store.addEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ case_id: 'CS001', type: 'ai_suggestion', payload: { conversation_id: 'CONV1', suggestion } }));
    expect(store.addMessage).not.toHaveBeenCalled();
    expect(store.createTask).not.toHaveBeenCalled();
    expect(store.linkConversation).not.toHaveBeenCalled();
  });

  it('retries schema validation once with the error and preserves the single audit', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(final({ ...suggestion, missing_info: ['one', 'two'] })).mockResolvedValueOnce(final());
    const store = testStore();
    expect((await createAgent(store, { client, model: 'test' }).suggest('CONV1')).ok).toBe(true);
    expect(JSON.stringify(client.responses.create.mock.calls[1][0].input)).toContain('missing_info');
    expect(JSON.stringify(client.responses.create.mock.calls[1][0].input)).toContain('Validation error');
    for (const [request] of client.responses.create.mock.calls) expect(request.include).toEqual(['reasoning.encrypted_content']);
    expect(store.addEvent).toHaveBeenCalledTimes(1);
  });

  it.each(['not JSON', JSON.stringify({ ...suggestion, link_confidence: 2 })])('returns failure after two invalid final answers (%s)', async value => {
    const client = mockClient();
    client.responses.create.mockResolvedValue(final(value));
    const store = testStore();
    const result = await createAgent(store, { client, model: 'test' }).suggest('CONV1');
    expect(result).toMatchObject({ ok: false, suggestion: null, error: expect.stringContaining('validation retry') });
    expect(AgentSuggestionEnvelopeSchema.parse(result)).toEqual(result);
    expect(client.responses.create).toHaveBeenCalledTimes(2);
    expect(store.addEvent).not.toHaveBeenCalled();
  });

  it('does not create a case or write an event for an unlinked conversation', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValue(final());
    const store = testStore();
    const conversation = (await store.get('conversations', 'CONV1'))!;
    conversation.case_id = null;
    expect((await createAgent(store, { client, model: 'test' }).suggest('CONV1')).ok).toBe(true);
    expect(store.addEvent).not.toHaveBeenCalled();
    expect(store.createCase).not.toHaveBeenCalled();
  });

  it('returns safe tool errors to the model without allowing writes', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(toolResponse(
      toolCall('get_case_context', { case_id: '' }), toolCall('createCase', {}, 'write'),
      { ...toolCall('find_cases', {}, 'bad-json'), arguments: '{' } as ResponseOutputItem,
    )).mockResolvedValueOnce(final());
    const store = testStore();
    expect((await createAgent(store, { client, model: 'test' }).suggest('CONV1')).ok).toBe(true);
    expect(JSON.stringify(client.responses.create.mock.calls[1][0].input)).toContain('Unknown read-only tool');
    expect(JSON.stringify(client.responses.create.mock.calls[1][0].input)).toContain('Tool arguments must be valid JSON');
    expect(store.createCase).not.toHaveBeenCalled();
  });

  it('limits individual calls across batches and the validation retry to six', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(toolResponse(...Array.from({ length: 6 }, (_, i) => toolCall('find_cases', { customer_id: 'CUST001' }, `call-${i}`))))
      .mockResolvedValueOnce(final('{}'))
      .mockResolvedValueOnce(toolResponse(toolCall('find_cases', { customer_id: 'CUST001' }, 'seventh')));
    const store = testStore();
    expect(await createAgent(store, { client, model: 'test' }).suggest('CONV1')).toMatchObject({ ok: false, suggestion: null, error: expect.stringContaining('6 tool calls') });
    expect(client.responses.create).toHaveBeenCalledTimes(3);
    expect(store.addEvent).not.toHaveBeenCalled();
  });

  it('aborts a pending model call at the total 30-second deadline', async () => {
    vi.useFakeTimers();
    const client = mockClient();
    client.responses.create.mockImplementation(() => new Promise(() => {}));
    const store = testStore();
    const pending = createAgent(store, { client, model: 'test' }).suggest('CONV1');
    await vi.waitFor(() => expect(client.responses.create).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await pending).toMatchObject({ ok: false, suggestion: null, error: expect.stringContaining('30 seconds') });
    expect(client.responses.create.mock.calls[0][1].signal.aborted).toBe(true);
    expect(store.addEvent).not.toHaveBeenCalled();
  });

  it('times out a stalled store read without starting the model later', async () => {
    vi.useFakeTimers();
    const store = testStore();
    const conversation = await store.get('conversations', 'CONV1');
    let release!: (value: typeof conversation) => void;
    vi.spyOn(store, 'get').mockReturnValue(new Promise(resolve => { release = resolve; }));
    const client = mockClient();
    const pending = createAgent(store, { client, model: 'test' }).suggest('CONV1');
    await vi.advanceTimersByTimeAsync(30_000);
    expect((await pending).ok).toBe(false);
    release(conversation);
    await vi.advanceTimersByTimeAsync(1);
    expect(client.responses.create).not.toHaveBeenCalled();
    expect(store.addEvent).not.toHaveBeenCalled();
  });

  it('fails safely for transport errors, incomplete output and audit failure', async () => {
    const store = testStore();
    const client = mockClient();
    client.responses.create.mockRejectedValueOnce(new Error('private upstream details'));
    const agent = createAgent(store, { client, model: 'test' });
    expect(await agent.suggest('CONV1')).toEqual({ ok: false, suggestion: null, error: 'Unable to generate or save a suggestion' });
    client.responses.create.mockResolvedValueOnce({ ...final(), status: 'incomplete' });
    expect((await agent.suggest('CONV1')).ok).toBe(false);
    client.responses.create.mockResolvedValueOnce(final());
    vi.mocked(store.addEvent).mockRejectedValueOnce(new Error('database secret'));
    expect(await agent.suggest('CONV1')).toEqual({ ok: false, suggestion: null, error: 'Unable to generate or save a suggestion' });
  });

  it('validates POST bodies and returns success/failure envelopes using the app object', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(final()).mockRejectedValueOnce(new Error('offline'));
    const app = createApp(testStore(), { agent: { client, model: 'test' } });
    const request = (body: string) => app.request('/api/agent/suggest', { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3001' }, body });
    for (const invalid of ['{', '{}', '{"conversation_id":""}']) {
      const response = await request(invalid);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ ok: false, suggestion: null });
      expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3001');
    }
    expect(await (await request('{"conversation_id":"CONV1"}')).json()).toEqual({ ok: true, suggestion });
    expect(await (await request('{"conversation_id":"CONV1"}')).json()).toMatchObject({ ok: false, suggestion: null });
    expect(await (await request('{"conversation_id":"missing"}')).json()).toMatchObject({ ok: false, suggestion: null, error: 'Conversation not found' });
  });

  it('requires the configured model and key without exposing credentials', async () => {
    vi.stubEnv('OPENAI_MODEL', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(await createAgent(testStore()).suggest('CONV1')).toMatchObject({ ok: false, suggestion: null, error: expect.stringContaining('OPENAI_MODEL') });
    vi.stubEnv('OPENAI_MODEL', 'test');
    expect(await createAgent(testStore()).suggest('CONV1')).toMatchObject({ ok: false, suggestion: null, error: expect.stringContaining('OPENAI_API_KEY is missing') });
  });

  it('rejects unsupported actions, invalid sources and more than one missing fact', () => {
    expect(AgentSuggestionSchema.safeParse({ ...suggestion, proposed_action: { type: 'refund', reason: '', evidence_ids: [] } }).success).toBe(false);
    expect(AgentSuggestionSchema.safeParse({ ...suggestion, known_facts: [{ text: 'x', source: 'AI' }] }).success).toBe(false);
    expect(AgentSuggestionSchema.safeParse({ ...suggestion, missing_info: ['a', 'b'] }).success).toBe(false);
  });

  it.each([
    { proposed_action: { type: 'escalate_to_ops', reason: 'Needs checking', evidence_ids: [] } },
    { known_facts: [{ text: 'Customer claim', source: 'customer' }] },
    { known_facts: [{ text: 'Inference', source: 'unverified' }] },
    { missing_info: ['Please clarify'] },
    { draft_reply: '' },
  ])('automatic mode rejects replies needing human approval %#', async patch => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(toolResponse(toolCall('get_order_shipments', { order_id: 'DH001' })))
      .mockResolvedValueOnce(final({ ...suggestion, suggested_case_id: null, missing_info: [], ...patch }));
    const store = testStore();
    expect((await createAgent(store, { client, model: 'mock' }).suggest('CONV1', 'auto')).ok).toBe(false);
    expect(store.addMessage).not.toHaveBeenCalled(); expect(store.addEvent).not.toHaveBeenCalled();
  });
  it('automatic mode scopes reads to this customer and requires a successful order read', async () => {
    const client = mockClient();
    client.responses.create.mockResolvedValueOnce(toolResponse(toolCall('get_order_shipments', { order_id: 'DH002' })))
      .mockResolvedValueOnce(final({ ...suggestion, suggested_case_id: null, missing_info: [] }));
    const store = testStore();
    expect((await createAgent(store, { client, model: 'mock' }).suggest('CONV1', 'auto')).ok).toBe(false);
    expect(JSON.stringify(client.responses.create.mock.calls[1][0].input)).toContain('Tool is unavailable for this automatic reply');
    expect(store.addMessage).not.toHaveBeenCalled();
  });

  it('try:suggest exits clearly before DB/network access when the key is empty', () => {
    try {
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/try-suggest.ts'], {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        env: { ...process.env, OPENAI_API_KEY: '', DATABASE_URL: '', OPENAI_MODEL: '' }, stdio: 'pipe',
      });
      expect.fail('Missing key must fail');
    } catch (error) {
      expect(error).toMatchObject({ status: 1 });
      expect(String((error as { stderr: Buffer }).stderr)).toContain('OPENAI_API_KEY is missing');
      expect(String((error as { stderr: Buffer }).stderr)).toContain('No data was changed');
    }
  });
});
