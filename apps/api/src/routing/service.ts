import type { RoutingRecord, Triage } from '@seapilot/contracts';
import { compareChronological } from '@seapilot/contracts/client';
import policy from '../../../../config/routing-policy.json';
import teams from '../../../../config/teams.json';
import { triage, safeTriage, type TriageOptions } from '../ai/triage';
import type { createAgent } from '../ai/agent';
import type { DemoClock } from '../demo/clock';
import type { CaseStore } from '../store/CaseStore';
import { decideMode, routeHuman, type RoutingFacts } from './decide';

async function readFacts(store: CaseStore, conversationId: string) {
  const conversation = await store.get('conversations', conversationId);
  if (!conversation) return null;
  const [customer, messages, evidence, orders, cases] = await Promise.all([
    store.get('customers', conversation.customer_id), store.list('messages', { conversation_id: conversationId }),
    store.list('evidence', { conversation_id: conversationId }), store.list('orders', { customer_id: conversation.customer_id }), store.list('cases'),
  ]);
  const orderedMessages = messages.sort(compareChronological);
  const message = orderedMessages.filter(item => item.role === 'customer').at(-1);
  if (!message) return null;
  const orderCodes = [...new Set(message.text.toUpperCase().match(/\bDH\d+\b/g) ?? [])];
  const order = orderCodes.length === 1 ? orders.find(item => item.id === orderCodes[0]) : orderCodes.length === 0 && orders.length === 1 ? orders[0] : undefined;
  const shipments = order ? await store.list('shipments', { order_id: order.id }) : [];
  const openCase = cases.find(item => item.id === conversation.case_id && item.status !== 'resolved') ??
    cases.find(item => item.customer_id === conversation.customer_id && item.status !== 'resolved' && (!order || item.order_id === order.id));
  const openCounts: Record<string, number> = {};
  for (const item of cases.filter(item => item.status !== 'resolved')) openCounts[item.assignee] = (openCounts[item.assignee] ?? 0) + 1;
  return { conversation, customer, message, orderedMessages, order, shipments, openCase, openCounts, evidence,
    facts: { open_case_exists: !!openCase, has_attachment: evidence.length > 0,
      second_message_after_ai_reply: messages.some(item => item.actor === 'AI' && item.role === 'cs'),
      // No return-policy data exists in this demo; a return-howto must go to a human.
      all_facts_from_system: !!order && shipments.length > 0 && shipments.every(item => !!item.status),
    },
  };
}

/** In-process demo jobs; model calls never hold a DB transaction or delay message saving. */
export function createRoutingService(store: CaseStore, clock: DemoClock, now: () => string, agent: ReturnType<typeof createAgent>, options: TriageOptions & { detectionOnly?: boolean } = {}) {
  const detectionOnly = options.detectionOnly ?? process.env.TRIAGE_DETECTION_ONLY === '1';
  const detectMode = (result: Triage, facts: RoutingFacts) => {
    const decision = decideMode(result, facts, policy);
    return detectionOnly && decision.mode === 'ai'
      ? { mode: 'human' as const, rule: 'detection_only', reason: 'AI classified this request as eligible for automatic handling. Detection-only mode keeps the reply with a human.' }
      : decision;
  };
  let epoch = 0;
  const versions = new Map<string, number>();
  const pending = new Set<Promise<void>>();
  const active = new Map<string, number>();
  const routingFacts = (data: NonNullable<Awaited<ReturnType<typeof readFacts>>>, result: Triage) => ({
    ...data.facts, all_facts_from_system: data.facts.all_facts_from_system && ['order_status', 'order_contents', 'confirm_receipt'].includes(result.category),
  });
  async function processConversation(conversationId: string, version: number, started: number) {
    const valid = () => epoch === started && versions.get(conversationId) === version;
    const initial = await readFacts(store, conversationId);
    if (!initial || !valid()) return;
    let result: Triage;
    try {
      result = await triage(initial.message.text, {
        open_case_exists: initial.facts.open_case_exists, has_attachment: initial.facts.has_attachment,
        language: initial.customer?.language, order_id: initial.order?.id,
        shipments: initial.shipments.map(({ parcel_code, status }) => ({ parcel_code, status })),
      }, options);
    } catch { result = safeTriage(initial.customer?.language); }
    if (!valid()) return;
    const fresh = await readFacts(store, conversationId);
    if (!fresh || fresh.message.id !== initial.message.id || !valid()) return;
    const decision = detectMode(result, routingFacts(fresh, result));
    const shipmentSnapshot = JSON.stringify(fresh.shipments.map(item => [item.id, item.status, item.updated_at]));
    const suggestion = decision.mode === 'ai' ? await agent.suggest(conversationId, 'auto') : null;
    if (!valid()) return;
    await store.transaction(async tx => {
      const current = await readFacts(tx, conversationId);
      if (!current || current.message.id !== initial.message.id || !valid()) return;
      // A CS reply, attachment, link, reset or newer customer message may arrive during either model call.
      let finalDecision = detectMode(result, routingFacts(current, result));
      if (finalDecision.mode === 'ai' && JSON.stringify(current.shipments.map(item => [item.id, item.status, item.updated_at])) !== shipmentSnapshot) {
        finalDecision = { mode: 'human', rule: 'system_data_changed', reason: 'Shipment data changed while the reply was prepared; a human will review the latest status.' };
      }
      if (finalDecision.mode === 'ai' && current.orderedMessages.at(-1)?.id !== initial.message.id) {
        finalDecision = { mode: 'human', rule: 'reply_already_sent', reason: 'A support reply was already sent; further replies need human review.' };
      }
      if (finalDecision.mode === 'ai' && (!suggestion?.ok || !suggestion.suggestion)) {
        finalDecision = { mode: 'human', rule: 'auto_reply_unavailable', reason: 'A verified automatic reply was unavailable; a human will review the request.' };
      }
      const route = finalDecision.mode === 'human' ? routeHuman(result.category, result.language, clock, teams, current.openCase?.assignee, current.openCounts) : null;
      const record: RoutingRecord = { message_id: initial.message.id, triage: result, decision: finalDecision, route };
      const at = now();
      await tx.updateConversation(conversationId, { mode: finalDecision.mode === 'ai' ? 'auto' : 'human' });
      if (finalDecision.mode === 'ai' && suggestion?.suggestion) {
        await tx.addMessage({ conversation_id: conversationId, role: 'cs', actor: 'AI', text: suggestion.suggestion.draft_reply, created_at: at });
      }
      await tx.addConversationEvent({ conversation_id: conversationId, type: finalDecision.mode === 'ai' ? 'auto_reply' : 'routed',
        actor: 'system', payload: { ...record }, created_at: at });
    });
  }
  return {
    schedule(conversationId: string) {
      const version = (versions.get(conversationId) ?? 0) + 1;
      versions.set(conversationId, version);
      active.set(conversationId, version);
      const started = epoch;
      const job = processConversation(conversationId, version, started).catch(() => {
        // DB failure leaves the saved message in the human inbox. Never emit private provider/DB errors.
        console.warn('Conversation routing could not be saved; human review is required.');
      });
      pending.add(job);
      void job.finally(() => {
        pending.delete(job);
        if (active.get(conversationId) === version) active.delete(conversationId);
      });
    },
    isPending(conversationId: string) { return active.has(conversationId); },
    invalidate() { epoch += 1; versions.clear(); active.clear(); },
    async drain() { await Promise.all(pending); },
  };
}

export type RoutingService = ReturnType<typeof createRoutingService>;
