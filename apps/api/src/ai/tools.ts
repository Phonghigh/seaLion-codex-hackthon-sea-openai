import { z } from 'zod';
import type { FunctionTool } from 'openai/resources/responses/responses';
import { CaseRowSchema } from '@seapilot/contracts';
import { compareChronological, labelEvidence } from '@seapilot/contracts/client';
import type { CaseStore } from '../store/CaseStore';

// Only these two store capabilities are available to model tools.
type ReadStore = Pick<CaseStore, 'get' | 'list'>;
const id = z.string().min(1);
export const FindCasesArgsSchema = z.object({ customer_id: id.optional(), order_id: id.optional(), text: z.string().optional() }).strict();
export const FindCasesResultSchema = z.array(z.object({
  case_id: id, status: CaseRowSchema.shape.status, last_activity_at: z.iso.datetime({ offset: true }),
  score: z.number().min(0).max(1), reason: z.string(),
}));
export const GetCaseContextArgsSchema = z.object({ case_id: id }).strict();
export { CaseContextSchema as GetCaseContextResultSchema, OrderShipmentsSchema as GetOrderShipmentsResultSchema } from '@seapilot/contracts/client';
import { CaseContextSchema as GetCaseContextResultSchema, OrderShipmentsSchema as GetOrderShipmentsResultSchema } from '@seapilot/contracts/client';
export const GetOrderShipmentsArgsSchema = z.object({ order_id: id }).strict();

export class ToolNotFoundError extends Error {}
export const chronological = <T extends { id: string; created_at: string }>(rows: T[]): T[] =>
  [...rows].sort(compareChronological);

async function caseHistory(store: ReadStore, caseId: string) {
  const conversations = (await store.list('conversations', { case_id: caseId }))
    .sort((a, b) => Date.parse(a.opened_at) - Date.parse(b.opened_at) || a.id.localeCompare(b.id));
  const messages = chronological((await Promise.all(conversations.map(row => store.list('messages', { conversation_id: row.id })))).flat());
  return { conversations, messages };
}

export async function find_cases(store: ReadStore, input: z.input<typeof FindCasesArgsSchema>) {
  const args = FindCasesArgsSchema.parse(input);
  const explicitOrder = args.order_id ? await store.get('orders', args.order_id) : undefined;
  const customerId = args.customer_id ?? explicitOrder?.customer_id;
  // Text alone must not discover unrelated customers' cases.
  if (!customerId) return FindCasesResultSchema.parse([]);
  const orders = await store.list('orders', { customer_id: customerId });
  const orderId = args.order_id ?? [...orders].sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at) || a.id.localeCompare(b.id))[0]?.id;
  const keywords = [...new Set((args.text ?? '').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  const cases = (await store.list('cases', { customer_id: customerId })).filter(row => row.status !== 'resolved');
  const candidates = await Promise.all(cases.map(async row => {
    const [{ conversations, messages }, events, evidence, tasks] = await Promise.all([
      caseHistory(store, row.id), store.list('case_events', { case_id: row.id }),
      store.list('evidence', { case_id: row.id }), store.list('tasks', { case_id: row.id }),
    ]);
    const searchable = [row.title, ...messages.slice(-20).map(message => message.text)].join('\n').toLocaleLowerCase();
    const matched = keywords.filter(word => searchable.includes(word));
    const sameOrder = row.order_id === orderId;
    // Customer alone is a candidate (0.5); customer + order establishes 0.9.
    const score = Math.min(1, Math.round(((sameOrder ? 0.9 : 0.5) + matched.length * 0.05) * 100) / 100);
    const times = [row.created_at, ...conversations.map(item => item.opened_at),
      ...[...messages, ...events, ...evidence, ...tasks].map(item => item.created_at)];
    return { case_id: row.id, status: row.status,
      last_activity_at: new Date(Math.max(...times.map(Date.parse))).toISOString(), score,
      reason: `This unresolved case belongs to customer ${customerId}${sameOrder ? ` and the same order ${orderId}` : ` but a different order (${row.order_id})`}${matched.length ? `, with matching keywords: ${matched.join(', ')}` : ''}.`,
    };
  }));
  return FindCasesResultSchema.parse(candidates.sort((a, b) => b.score - a.score || Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at) || a.case_id.localeCompare(b.case_id)));
}

export async function get_case_context(store: ReadStore, input: z.input<typeof GetCaseContextArgsSchema>) {
  const { case_id } = GetCaseContextArgsSchema.parse(input);
  const current = await store.get('cases', case_id);
  if (!current) throw new ToolNotFoundError('Case not found');
  const [history, evidence, allEvents, tasks, shipments] = await Promise.all([
    caseHistory(store, case_id), store.list('evidence', { case_id }), store.list('case_events', { case_id }),
    store.list('tasks', { case_id }), store.list('shipments', { order_id: current.order_id }),
  ]);
  const events = chronological(allEvents);
  const latestReply = events.filter(event => event.type === 'reply_sent').at(-1);
  const snapshot = z.record(z.string(), z.string()).safeParse(latestReply?.payload.shipment_snapshot);
  const baseline = snapshot.success ? snapshot.data : {};
  return GetCaseContextResultSchema.parse({
    case: current,
    conversations: history.conversations.map(conversation => ({ ...conversation,
      // An extractive summary preserves attribution and adds no inferred facts.
      summary: history.messages.filter(message => message.conversation_id === conversation.id).slice(-3)
        .map(message => `${message.role}: ${message.text}`).join('\n'),
    })),
    messages: history.messages.slice(-20), evidence: labelEvidence(evidence), events: events.slice(-20),
    open_tasks: chronological(tasks.filter(task => task.status === 'open')),
    changes_since_last_contact: shipments.filter(parcel => Object.hasOwn(baseline, parcel.parcel_code) && baseline[parcel.parcel_code] !== parcel.status)
      .map(parcel => ({ parcel_code: parcel.parcel_code, before: baseline[parcel.parcel_code], after: parcel.status })),
  });
}

export async function get_order_shipments(store: ReadStore, input: z.input<typeof GetOrderShipmentsArgsSchema>) {
  const { order_id } = GetOrderShipmentsArgsSchema.parse(input);
  const order = await store.get('orders', order_id);
  if (!order) throw new ToolNotFoundError('Order not found');
  const [shipments, items] = await Promise.all([store.list('shipments', { order_id }), store.list('order_items', { order_id })]);
  return GetOrderShipmentsResultSchema.parse({ order, parcels: shipments.map(parcel => ({
    parcel_code: parcel.parcel_code, items: items.filter(item => item.parcel_code === parcel.parcel_code), status: parcel.status, updated_at: parcel.updated_at,
  })) });
}

export const findCasesTool: FunctionTool = {
  type: 'function', name: 'find_cases', description: 'Find unresolved cases for a customer, ranked by order and keywords. Supply the customer id from the conversation.',
  parameters: z.toJSONSchema(FindCasesArgsSchema), strict: false,
};
export const getCaseContextTool: FunctionTool = {
  type: 'function', name: 'get_case_context', description: 'Read case history, evidence, open tasks and shipment changes since the last reply.',
  parameters: z.toJSONSchema(GetCaseContextArgsSchema), strict: true,
};
export const getOrderShipmentsTool: FunctionTool = {
  type: 'function', name: 'get_order_shipments', description: 'Read an order and its current parcels, items and carrier-reported statuses.',
  parameters: z.toJSONSchema(GetOrderShipmentsArgsSchema), strict: true,
};
export const responseTools = [findCasesTool, getCaseContextTool, getOrderShipmentsTool];

export async function executeTool(store: ReadStore, name: string, args: unknown) {
  switch (name) {
    case 'find_cases': return find_cases(store, FindCasesArgsSchema.parse(args));
    case 'get_case_context': return get_case_context(store, GetCaseContextArgsSchema.parse(args));
    case 'get_order_shipments': return get_order_shipments(store, GetOrderShipmentsArgsSchema.parse(args));
    default: throw new ToolNotFoundError('Unknown read-only tool');
  }
}
