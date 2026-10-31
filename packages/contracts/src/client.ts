import { z } from 'zod';
import { RoutingRecordSchema } from './triage';
import { AgentSuggestionEnvelopeSchema, type AgentSuggestion } from './agent';
import { CustomerRowSchema, CaseRowSchema, ConversationRowSchema, MessageRowSchema, EvidenceRowSchema, CaseEventRowSchema, TaskRowSchema, OrderRowSchema, OrderItemRowSchema } from './db';

export const LabeledEvidenceSchema = EvidenceRowSchema.extend({ label: z.string().min(1) });
export const ConversationDetailSchema = z.object({ conversation: ConversationRowSchema, customer: CustomerRowSchema.optional(), order_id: z.string().nullable().optional(), routing: RoutingRecordSchema.nullable().optional(), triage_pending: z.boolean().optional(), messages: z.array(MessageRowSchema), evidence: z.array(LabeledEvidenceSchema), case: CaseRowSchema.nullable() });
export const CaseDetailSchema = z.object({ case: CaseRowSchema, events: z.array(CaseEventRowSchema), evidence: z.array(LabeledEvidenceSchema), tasks: z.array(TaskRowSchema) });
export const CaseContextSchema = z.object({
  case: CaseRowSchema,
  conversations: z.array(ConversationRowSchema.pick({ id: true, channel: true, opened_at: true }).extend({ summary: z.string() })),
  messages: z.array(MessageRowSchema).max(20),
  evidence: z.array(LabeledEvidenceSchema.pick({ id: true, type: true, path: true, source: true, created_at: true, label: true })),
  events: z.array(CaseEventRowSchema).max(20), open_tasks: z.array(TaskRowSchema),
  changes_since_last_contact: z.array(z.object({ parcel_code: z.string(), before: z.string(), after: z.string() })),
});
export const OrderShipmentsSchema = z.object({ order: OrderRowSchema, parcels: z.array(z.object({ parcel_code: z.string(), items: z.array(OrderItemRowSchema), status: z.string(), updated_at: z.iso.datetime({ offset: true }) })) });
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;
export type CaseDetail = z.infer<typeof CaseDetailSchema>;
export type CaseContext = z.infer<typeof CaseContextSchema>;
export type OrderShipments = z.infer<typeof OrderShipmentsSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };
export type DemoControl = 'reset' | 'advance-day' | 'demo2';
export const CS_IDENTITIES = { An: 'CS_A', Binh: 'CS_B' } as const;
export const actorName = (actor: string) => actor === 'CS_A' ? 'An' : actor === 'CS_B' ? 'Binh' : actor;
export const formatTime = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const compareChronological = (a: { id: string; created_at: string }, b: { id: string; created_at: string }) =>
  Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id);

/** Labels describe the supplied image, without inferring or validating its contents. */
export function labelEvidence<T extends { id: string; path: string; created_at: string }>(evidence: T[]) {
  let upload = 0;
  return [...evidence].sort(compareChronological).map(item => ({ ...item,
    label: item.path === '/files/demo/parcel_a.jpg' ? 'photo of parcel A'
      : item.path === '/files/demo/parcel_b_open.jpg' ? 'photo of the opened parcel B'
      : `customer photo ${++upload}`,
  }));
}

/** Browser-safe transport. Only demo controls receive a token, supplied at runtime. */
export function createApiClient({ baseUrl = 'http://127.0.0.1:4000', fetch: transport = globalThis.fetch }: { baseUrl?: string; fetch?: typeof globalThis.fetch } = {}) {
  const base = baseUrl.replace(/\/$/, '');
  async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<ApiResult<T>> {
    try {
      const response = await transport(`${base}${path}`, { ...init, cache: 'no-store', signal: AbortSignal.timeout(40_000) });
      const body: unknown = await response.json();
      const failure = z.object({ ok: z.literal(false), error: z.string() }).safeParse(body);
      if (failure.success) return { ok: false, error: failure.data.error, status: response.status };
      if (!response.ok) return { ok: false, error: `Request failed (${response.status})`, status: response.status };
      const parsed = schema.safeParse(body);
      if (!parsed.success) return { ok: false, error: 'The API returned an invalid response. Refresh and try again.' };
      return { ok: true, data: parsed.data };
    } catch {
      return { ok: false, error: 'Cannot reach the API. Check the connection and try again.' };
    }
  }
  const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const envelope = <T>(schema: z.ZodType<T>) => z.object({ ok: z.literal(true), data: schema }).transform(value => value.data);
  const encoded = encodeURIComponent;
  return {
    fileUrl: (path: string) => `${base}/files/${path.replace(/^\/files\//, '')}`,
    conversations: (customerId?: string) => request(`/api/conversations${customerId ? `?customer_id=${encoded(customerId)}` : ''}`, envelope(z.array(ConversationRowSchema))),
    conversation: (id: string) => request(`/api/conversations/${encoded(id)}`, envelope(ConversationDetailSchema)),
    createConversation: (customerId: string) => request('/api/conversations', envelope(ConversationRowSchema), json({ customer_id: customerId })),
    sendMessage: (conversationId: string, text: string) => request(`/api/conversations/${encoded(conversationId)}/messages`, envelope(MessageRowSchema), json({ role: 'customer', text })),
    seedImage: (conversationId: string, seed: 'parcel_a' | 'parcel_b_open') => request('/api/upload', envelope(EvidenceRowSchema), json({ conversation_id: conversationId, seed })),
    upload: (conversationId: string, file: File) => {
      const body = new FormData(); body.set('conversation_id', conversationId); body.set('file', file);
      return request('/api/upload', envelope(EvidenceRowSchema), { method: 'POST', body });
    },
    suggest: async (conversationId: string): Promise<ApiResult<AgentSuggestion>> => {
      const result = await request('/api/agent/suggest', AgentSuggestionEnvelopeSchema, json({ conversation_id: conversationId }));
      if (!result.ok) return result;
      return result.data.ok && result.data.suggestion ? { ok: true, data: result.data.suggestion } : { ok: false, error: result.data.error ?? 'No suggestion available. Try Suggest again.' };
    },
    link: (caseId: string, conversationId: string, actor: string) => request(`/api/cases/${encoded(caseId)}/link-conversation`, z.object({ ok: z.literal(true) }), json({ conversation_id: conversationId, actor })),
    approveReply: (conversationId: string, text: string, actor: string, title?: string) => request('/api/approve', envelope(z.object({ case_id: z.string(), message: MessageRowSchema })), json({ conversation_id: conversationId, kind: 'reply', text, actor, ...(title ? { title } : {}) })),
    approveAction: (conversationId: string, action: NonNullable<AgentSuggestion['proposed_action']>, actor: string) => request('/api/approve', envelope(z.object({ task: TaskRowSchema, duplicate: z.boolean().optional() })), json({ conversation_id: conversationId, kind: 'action', action, actor })),
    caseDetail: (id: string) => request(`/api/cases/${encoded(id)}`, envelope(CaseDetailSchema)),
    caseContext: (id: string) => request(`/api/cases/${encoded(id)}/context`, CaseContextSchema),
    shipments: (id: string) => request(`/api/orders/${encoded(id)}/shipments`, OrderShipmentsSchema),
    demo: (control: DemoControl, token: string) => request(`/api/demo/${control === 'demo2' ? 'jump?to=demo2' : control}`, z.object({ ok: z.literal(true), time: z.iso.datetime({ offset: true }), state: z.string().optional() }), { method: 'POST', headers: { 'x-demo-token': token } }),
  };
}
