import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { z } from 'zod';
import { AgentSuggestionSchema, type DbTable } from '@seapilot/contracts';
import type { CaseStore } from './store/CaseStore';

const id = z.string().trim().min(1);
const actionSchema = AgentSuggestionSchema.shape.proposed_action.unwrap().extend({ evidence_ids: z.array(id).min(1) });
const approveSchema = z.discriminatedUnion('kind', [
  z.object({ conversation_id: id, kind: z.literal('reply'), text: id, title: id.optional(), actor: id }).strict(),
  z.object({ conversation_id: id, kind: z.literal('action'), action: actionSchema, actor: id }).strict(),
]);
export class RequestError extends Error {
  constructor(message: string, public status: 400 | 404 | 409 = 400) { super(message); }
}
async function required<K extends DbTable>(store: CaseStore, table: K, key: string) {
  const row = await store.get(table, key);
  if (!row) throw new RequestError(`${table} not found`, 404);
  return row;
}
const uploadRoot = new URL('../data/uploads/', import.meta.url);

export function registerWorkspace(app: Hono, store: CaseStore, now: () => string) {
  app.post('/api/conversations', async c => {
    const body = z.object({ customer_id: id }).strict().parse(await c.req.json());
    await required(store, 'customers', body.customer_id);
    return c.json({ ok: true, data: await store.createConversation({ ...body, case_id: null, channel: 'chat', mode: 'human', opened_at: now() }) }, 201);
  });
  app.get('/api/conversations', async c => {
    const customer_id = id.optional().parse(c.req.query('customer_id'));
    return c.json({ ok: true, data: await store.list('conversations', customer_id ? { customer_id } : {}) });
  });
  app.get('/api/conversations/:id', async c => {
    const conversation = await required(store, 'conversations', c.req.param('id'));
    const [messages, evidence, summary] = await Promise.all([
      store.list('messages', { conversation_id: conversation.id }), store.list('evidence', { conversation_id: conversation.id }),
      conversation.case_id ? store.get('cases', conversation.case_id) : null,
    ]);
    return c.json({ ok: true, data: { conversation, messages: messages.sort((a, b) => a.created_at.localeCompare(b.created_at)), evidence, case: summary } });
  });
  app.post('/api/conversations/:id/messages', async c => {
    const body = z.object({ role: z.literal('customer'), text: id }).strict().parse(await c.req.json());
    const conversation = await required(store, 'conversations', c.req.param('id'));
    return c.json({ ok: true, data: await store.addMessage({ ...body, conversation_id: conversation.id, actor: conversation.customer_id, created_at: now() }) }, 201);
  });
  app.post('/api/upload', async c => {
    let path: string;
    let conversation_id: string;
    let saved: URL | undefined;
    if (c.req.header('content-type')?.startsWith('multipart/form-data')) {
      const body = z.object({ conversation_id: id, file: z.instanceof(File).refine(file => file.size > 0 && file.size <= 10 * 1024 * 1024, 'Expected a file up to 10 MiB') }).strict().parse(await c.req.parseBody());
      conversation_id = body.conversation_id;
      await required(store, 'conversations', conversation_id);
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[body.file.type];
      if (!extension) throw new RequestError('Expected a JPEG, PNG or WebP image');
      const name = `${randomUUID()}.${extension}`;
      saved = new URL(name, uploadRoot);
      await mkdir(uploadRoot, { recursive: true });
      await writeFile(saved, Buffer.from(await body.file.arrayBuffer()), { flag: 'wx' });
      path = `/files/${name}`;
    } else {
      const body = z.object({ conversation_id: id, seed: z.enum(['parcel_a', 'parcel_b_open']) }).strict().parse(await c.req.json());
      conversation_id = body.conversation_id;
      path = `/files/demo/${body.seed}.jpg`;
    }
    try {
      const evidence = await store.transaction(async tx => {
        const conversation = await required(tx, 'conversations', conversation_id);
        const evidence = await tx.addEvidence({ conversation_id, case_id: conversation.case_id, type: 'image', path, source: 'customer', created_at: now() });
        if (conversation.case_id) await tx.addEvent({ case_id: conversation.case_id, type: 'evidence_added', actor: conversation.customer_id, payload: { evidence_id: evidence.id }, created_at: now() });
        return evidence;
      });
      return c.json({ ok: true, data: evidence }, 201);
    } catch (error) {
      if (saved) await rm(fileURLToPath(saved), { force: true });
      throw error;
    }
  });
  app.post('/api/cases/:id/link-conversation', async c => {
    const body = z.object({ conversation_id: id, actor: id }).strict().parse(await c.req.json());
    const caseId = c.req.param('id');
    await store.transaction(async tx => {
      const conversation = await required(tx, 'conversations', body.conversation_id);
      const target = await required(tx, 'cases', caseId);
      if (conversation.customer_id !== target.customer_id || (conversation.case_id && conversation.case_id !== caseId)) throw new RequestError('Conversation cannot be linked to this case', 409);
      await tx.linkConversation(conversation.id, caseId, body.actor, now());
    });
    return c.json({ ok: true });
  });
  app.get('/api/cases/:id', async c => {
    const current = await required(store, 'cases', c.req.param('id'));
    const filter = { case_id: current.id };
    const [events, evidence, tasks] = await Promise.all([store.list('case_events', filter), store.list('evidence', filter), store.list('tasks', filter)]);
    return c.json({ ok: true, data: { case: current, events, evidence, tasks } });
  });
  app.post('/api/approve', async c => {
    const body = approveSchema.parse(await c.req.json());
    let actionCase: string | undefined;
    try {
      const data = await store.transaction(async tx => {
        const conversation = await required(tx, 'conversations', body.conversation_id);
        let caseId = conversation.case_id;
        if (body.kind === 'action') {
          if (!caseId) throw new RequestError('Link a case before approving an action', 409);
          actionCase = caseId;
          const evidence = await tx.list('evidence', { case_id: caseId });
          const evidence_ids = [...new Set(body.action.evidence_ids)].sort();
          if (evidence_ids.some(key => !evidence.some(item => item.id === key))) throw new RequestError('Action evidence must belong to this case');
          // One operations escalation per case; retries (including concurrent requests) return it.
          const existing = (await tx.list('tasks', { case_id: caseId, team: 'operations' }))[0];
          if (existing) return { task: existing, duplicate: true };
          const task = await tx.createTask({ case_id: caseId, team: 'operations', status: 'open', evidence_ids, created_at: now() });
          await tx.updateCase(caseId, { status: 'waiting_ops' });
          await tx.addEvent({ case_id: caseId, type: 'action_executed', actor: body.actor, payload: { conversation_id: conversation.id, action: body.action, task_id: task.id }, created_at: now() });
          return { task };
        }
        if (!caseId) {
          if (!body.title) throw new RequestError('A title is required for the first reply');
          const orders = await tx.list('orders', { customer_id: conversation.customer_id });
          const order = orders.sort((a, b) => b.placed_at.localeCompare(a.placed_at) || b.id.localeCompare(a.id))[0];
          if (!order) throw new RequestError('Customer has no order', 409);
          const cases = await tx.list('cases');
          const next = Math.max(0, ...cases.map(item => /^CS\d+$/.test(item.id) ? Number(item.id.slice(2)) : 0)) + 1;
          caseId = `CS${String(next).padStart(3, '0')}`;
          await tx.createCase({ id: caseId, customer_id: conversation.customer_id, order_id: order.id, title: body.title, status: 'open', assignee: body.actor, created_at: now() });
          await tx.linkConversation(conversation.id, caseId, body.actor, now());
          await tx.addEvent({ case_id: caseId, type: 'case_created', actor: body.actor, payload: { conversation_id: conversation.id }, created_at: now() });
        }
        const events = await tx.list('case_events', { case_id: caseId, type: 'ai_suggestion' });
        const tasks = await tx.list('tasks', { case_id: caseId, team: 'operations' });
        const pending = events.some(event => {
          const parsed = AgentSuggestionSchema.safeParse(event.payload.suggestion);
          return parsed.success && parsed.data.proposed_action !== null;
        });
        if (pending && !tasks.length) throw new RequestError('Approve the pending escalation successfully before sending this reply', 409);
        const current = await required(tx, 'cases', caseId);
        const shipments = await tx.list('shipments', { order_id: current.order_id });
        const shipment_snapshot = Object.fromEntries(shipments.map(item => [item.parcel_code, item.status]));
        const message = await tx.addMessage({ conversation_id: conversation.id, role: 'cs', text: body.text, actor: body.actor, created_at: now() });
        await tx.addEvent({ case_id: caseId, type: 'reply_sent', actor: body.actor, payload: { actor: body.actor, conversation_id: conversation.id, message_id: message.id, shipment_snapshot }, created_at: now() });
        return { case_id: caseId, message };
      });
      return c.json({ ok: true, data });
    } catch (error) {
      if (body.kind === 'action' && actionCase) {
        await store.addEvent({ case_id: actionCase, type: 'action_failed', actor: body.actor, payload: { conversation_id: body.conversation_id, action: body.action, error: 'Action was not completed' }, created_at: now() });
      }
      throw error;
    }
  });
}
