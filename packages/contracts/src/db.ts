import { z } from 'zod';

const id = z.string().min(1);
const time = z.iso.datetime({ offset: true });
export const CustomerRowSchema = z.object({ id, name: z.string(), email: z.email(), language: z.string() });
export const OrderRowSchema = z.object({ id, customer_id: id, placed_at: time, status: z.string() });
export const OrderItemRowSchema = z.object({ id, order_id: id, sku: z.string(), name: z.string(), qty: z.number().int().positive(), parcel_code: z.string() });
export const ShipmentRowSchema = z.object({ id, order_id: id, parcel_code: z.string(), carrier: z.string(), tracking: z.string(), status: z.string(), updated_at: time });
export const CaseRowSchema = z.object({ id, order_id: id, customer_id: id, title: z.string(), status: z.enum(['open', 'waiting_customer', 'waiting_ops', 'resolved']), assignee: z.string(), created_at: time });
export const ConversationRowSchema = z.object({ id, customer_id: id, case_id: id.nullable(), channel: z.string(), mode: z.enum(['human', 'auto']).default('human'), opened_at: time });
export const MessageRowSchema = z.object({ id, conversation_id: id, role: z.enum(['customer', 'cs', 'ai']), text: z.string(), actor: z.string(), created_at: time });
export const EvidenceRowSchema = z.object({ id, conversation_id: id, case_id: id.nullable(), type: z.string(), path: z.string(), source: z.enum(['customer', 'system', 'unverified']), created_at: time });
export const CaseEventRowSchema = z.object({ id, case_id: id, type: z.string(), actor: z.string(), payload: z.record(z.string(), z.unknown()), created_at: time });
export const ConversationEventRowSchema = z.object({ id, conversation_id: id, type: z.string(), actor: z.string(), payload: z.record(z.string(), z.unknown()), created_at: time });
export const TaskRowSchema = z.object({ id, case_id: id, team: z.string(), status: z.string(), evidence_ids: z.array(id), created_at: time });

export const DbRowSchemas = {
  customers: CustomerRowSchema, orders: OrderRowSchema, order_items: OrderItemRowSchema,
  shipments: ShipmentRowSchema, cases: CaseRowSchema, conversations: ConversationRowSchema,
  messages: MessageRowSchema, conversation_events: ConversationEventRowSchema, evidence: EvidenceRowSchema, case_events: CaseEventRowSchema, tasks: TaskRowSchema,
};
export type DbRows = { [K in keyof typeof DbRowSchemas]: z.infer<(typeof DbRowSchemas)[K]> };
export type DbTable = keyof DbRows;
export const DatabaseStateSchema = z.object({
  customers: z.array(CustomerRowSchema), orders: z.array(OrderRowSchema), order_items: z.array(OrderItemRowSchema),
  shipments: z.array(ShipmentRowSchema), cases: z.array(CaseRowSchema), conversations: z.array(ConversationRowSchema),
  messages: z.array(MessageRowSchema), conversation_events: z.array(ConversationEventRowSchema).default([]), evidence: z.array(EvidenceRowSchema), case_events: z.array(CaseEventRowSchema), tasks: z.array(TaskRowSchema),
});
export type DatabaseState = z.infer<typeof DatabaseStateSchema>;
