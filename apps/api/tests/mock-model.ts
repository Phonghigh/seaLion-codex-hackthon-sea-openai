import type { ResponseInputItem, ResponseOutputItem } from 'openai/resources/responses/responses';
import { GetCaseContextResultSchema, GetOrderShipmentsResultSchema, FindCasesResultSchema } from '../src/ai/tools';
import type { AgentSuggestion, DbRows } from '@seapilot/contracts';
import type { ResponsesClient } from '../src/ai/agent';

export const M1 = 'I ordered a T-shirt and a cap but only got the T-shirt. Here is a photo of the parcel, please check.';
export const M2 = 'The missing cap from yesterday is still not solved. I already sent a photo, do I have to explain everything again?';
export const M3 = 'I got the second parcel, but there was no cap inside. Here is a photo of the second parcel.';

// Exercises the real agent tool loop; suggestions derive from tool output, not hidden store access.
export function mockModel(): ResponsesClient {
  return { responses: { async create(body) {
    const input = body.input as ResponseInputItem[];
    const first = input[0] as { content: string };
    const context = JSON.parse(first.content) as { customer_id: string; order_id: string; messages: DbRows['messages'][]; evidence: (DbRows['evidence'] & { label: string })[] };
    const output = (id: string) => input.find(item => item.type === 'function_call_output' && item.call_id === id);
    const result = (id: string): unknown => {
      const item = output(id);
      return item?.type === 'function_call_output' && typeof item.output === 'string' ? JSON.parse(item.output) : undefined;
    };
    const call = (name: string, args: unknown): ResponseOutputItem => ({ type: 'function_call', id: `fc-${name}`, call_id: name, name, arguments: JSON.stringify(args), status: 'completed' });
    const tools = (...output: ResponseOutputItem[]) => ({ status: 'completed' as const, output, output_text: '' });
    if (!output('find_cases')) return tools(call('find_cases', { customer_id: context.customer_id, order_id: context.order_id }), call('get_order_shipments', { order_id: context.order_id }));
    const candidates = FindCasesResultSchema.parse(result('find_cases'));
    const shipments = GetOrderShipmentsResultSchema.parse(result('get_order_shipments'));
    const candidate = candidates[0];
    if (candidate && !output('get_case_context')) return tools(call('get_case_context', { case_id: candidate.case_id }));
    const history = candidate ? GetCaseContextResultSchema.parse(result('get_case_context')) : null;
    const evidence = history?.evidence ?? context.evidence;
    const escalated = history?.events.some(event => event.type === 'action_executed' && (event.payload.action as { type?: string } | undefined)?.type === 'escalate_to_ops');
    const receivedEmpty = context.messages.some(message => message.role === 'customer' && message.text === M3);
    const hasEarlierPhoto = evidence.some(item => item.path.endsWith('parcel_a.jpg'));
    const secondDelivered = shipments.parcels.find(item => item.parcel_code === 'B')?.status === 'delivered';
    const suggestion: AgentSuggestion = {
      suggested_case_id: candidate?.case_id ?? null, link_confidence: candidate?.score ?? 0, link_reason: candidate?.reason ?? 'No existing case.',
      known_facts: [{ text: `Parcel B: ${secondDelivered ? 'delivered' : 'in transit'}.`, source: 'system' }, ...evidence.map(item => ({ text: `On file: ${item.label}.`, source: item.source }))],
      changes: history?.changes_since_last_contact.map(item => ({ text: `Parcel ${item.parcel_code} changed.`, before: item.before, after: item.after })) ?? [],
      missing_info: candidate && !receivedEmpty ? ['Was parcel B received without the cap?'] : [],
      draft_reply: escalated ? 'The case has been forwarded to the operations team for checking. You do not need to send the photos again.'
        : receivedEmpty ? 'We have recorded the empty second parcel and both photos. The case will be forwarded to the operations team for checking once approved. You do not need to send the photos again.'
        : candidate ? `${hasEarlierPhoto ? 'We have your earlier parcel A photo; you do not need to resend it.' : 'Please send the parcel A photo again.'} The system now marks parcel B delivered. Did it arrive without the cap?`
        : 'Your order is split: the T-shirt parcel was delivered and the cap parcel is still in transit. We have recorded your photo and will follow up.',
      proposed_action: receivedEmpty && !escalated ? { type: 'escalate_to_ops', reason: 'Customer reports parcel B arrived empty.', evidence_ids: evidence.map(item => item.id) } : null,
    };
    return { status: 'completed', output: [], output_text: JSON.stringify(suggestion) };
  } } };
}
