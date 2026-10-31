import { z } from 'zod';

export const TriageSchema = z.object({
  category: z.string().min(1),
  category_confidence: z.number().min(0).max(1),
  needs_human: z.number().min(0).max(1),
  risk: z.number().int().min(1).max(5),
  language: z.enum(['vi', 'en', 'other']),
}).strict();
export type Triage = z.infer<typeof TriageSchema>;
export const ModeDecisionSchema = z.object({ mode: z.enum(['ai', 'human']), rule: z.string(), reason: z.string() });
export type ModeDecision = z.infer<typeof ModeDecisionSchema>;
export const HumanRouteSchema = z.object({ team: z.string(), agent: z.string(), reason: z.string(), flag: z.literal('no_match').optional() });
export type HumanRoute = z.infer<typeof HumanRouteSchema>;
export const RoutingRecordSchema = z.object({
  message_id: z.string(), triage: TriageSchema, decision: ModeDecisionSchema,
  route: HumanRouteSchema.nullable(),
});
export type RoutingRecord = z.infer<typeof RoutingRecordSchema>;
