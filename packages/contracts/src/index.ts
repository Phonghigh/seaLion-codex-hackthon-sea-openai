import { z } from 'zod';

export const EvidenceId = z.enum(['parcel-a', 'parcel-b']);
export type EvidenceId = z.infer<typeof EvidenceId>;
export const MessageSchema = z.object({
  id: z.string(), role: z.enum(['customer', 'agent']), text: z.string().min(1).max(4000),
  time: z.string(), agent: z.enum(['An', 'Binh']).optional(), attachment: EvidenceId.optional(),
});
export type Message = z.infer<typeof MessageSchema>;
export const ConversationSchema = z.object({
  id: z.string(), caseId: z.string().nullable(), title: z.string(), day: z.number(),
  messages: z.array(MessageSchema),
});
export type Conversation = z.infer<typeof ConversationSchema>;
export const CaseSchema = z.object({
  id: z.literal('CS001'), status: z.enum(['open', 'waiting_ops']), assignee: z.enum(['An', 'Binh']),
  evidence: z.array(EvidenceId), events: z.array(z.object({ id: z.string(), text: z.string(), time: z.string() })),
  taskId: z.string().nullable(), lastReplyParcelB: z.enum(['in_transit', 'delivered']).nullable(),
});
export const DemoStateSchema = z.object({
  revision: z.number().int().nonnegative(), day: z.number(), parcelB: z.enum(['in_transit', 'delivered']),
  conversations: z.array(ConversationSchema), case: CaseSchema.nullable(), sequence: z.number(),
});
export type DemoState = z.infer<typeof DemoStateSchema>;
export type Scene = 'start' | 'first' | 'returning' | 'evidence';
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('link'), conversationId: z.string() }),
  z.object({ type: z.literal('createCase'), conversationId: z.string() }),
  z.object({ type: z.literal('newConversation') }),
  z.object({ type: z.literal('send'), conversationId: z.string(), text: z.string().trim().min(1).max(4000), attachment: EvidenceId.optional() }),
  z.object({ type: z.literal('approveReply'), expectedRevision: z.number().int().nonnegative(), conversationId: z.string(), text: z.string().trim().min(1).max(4000) }),
  z.object({ type: z.literal('escalate'), conversationId: z.string() }),
  z.object({ type: z.literal('advance') }),
]);
export type DemoCommand = z.infer<typeof CommandSchema>;
export interface Suggestion {
  kind: 'in_transit' | 'clarify' | 'escalate' | 'escalated' | 'holding';
  draft: string; question: string | null; action: boolean;
  facts: { text: string; source: 'customer' | 'system' | 'unverified' }[];
}
