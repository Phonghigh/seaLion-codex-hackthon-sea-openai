import { z } from 'zod';

export const AgentSuggestionSchema = z.object({
  suggested_case_id: z.string().nullable(),
  link_confidence: z.number().min(0).max(1),
  link_reason: z.string(),
  known_facts: z.array(z.object({ text: z.string(), source: z.enum(['customer', 'system', 'unverified']) })),
  changes: z.array(z.object({ text: z.string(), before: z.string(), after: z.string() })),
  missing_info: z.array(z.string()).max(1),
  draft_reply: z.string(),
  proposed_action: z.object({
    type: z.literal('escalate_to_ops'), reason: z.string(), evidence_ids: z.array(z.string()),
  }).nullable(),
});
export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;

export const AgentSuggestionEnvelopeSchema = z.object({
  ok: z.boolean(), suggestion: AgentSuggestionSchema.nullable(), error: z.string().optional(),
});
export type AgentSuggestionEnvelope = z.infer<typeof AgentSuggestionEnvelopeSchema>;
export const SuggestRequestSchema = z.object({ conversation_id: z.string().min(1) });
