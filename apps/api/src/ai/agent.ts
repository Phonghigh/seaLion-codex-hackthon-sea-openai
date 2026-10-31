import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { Response, ResponseCreateParamsNonStreaming, ResponseInputItem } from 'openai/resources/responses/responses';
import { z } from 'zod';
import { AgentSuggestionSchema, type AgentSuggestionEnvelope } from '@seapilot/contracts';
import { labelEvidence } from '@seapilot/contracts/client';
import type { CaseStore } from '../store/CaseStore';
import { chronological, executeTool, responseTools, ToolNotFoundError } from './tools';

export interface ResponsesClient {
  responses: { create(body: ResponseCreateParamsNonStreaming, options: { signal: AbortSignal; maxRetries: number }): Promise<Pick<Response, 'output' | 'output_text' | 'status'>> };
}
export interface AgentOptions { client?: ResponsesClient; model?: string; now?: () => Date }
class SuggestionError extends Error {}
const timeoutMessage = 'Suggestion timed out after 30 seconds';

export function createAgent(store: CaseStore, options: AgentOptions = {}) {
  return { async suggest(conversation_id: string, mode: 'human' | 'auto' = 'human'): Promise<AgentSuggestionEnvelope> {
    const controller = new AbortController();
    const deadline = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(new SuggestionError(timeoutMessage)), { once: true });
    });
    const timer = setTimeout(() => controller.abort(), 30_000);
    // Guard every continuation: a slow store/client cannot resume the loop after timeout.
    const withinDeadline = async <T>(work: Promise<T>): Promise<T> => {
      const result = await Promise.race([work, deadline]);
      if (controller.signal.aborted) throw new SuggestionError(timeoutMessage);
      return result;
    };
    try {
      const model = options.model ?? process.env.OPENAI_MODEL?.trim();
      if (!model) throw new SuggestionError('OPENAI_MODEL is required; configure apps/api/.env');
      if (!options.client && !process.env.OPENAI_API_KEY?.trim()) {
        throw new SuggestionError('OPENAI_API_KEY is missing; configure apps/api/.env before requesting a suggestion');
      }
      const client = options.client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
      const conversation = await withinDeadline(store.get('conversations', conversation_id));
      if (!conversation) throw new SuggestionError('Conversation not found');
      const [messages, evidence, orders, instructions] = await withinDeadline(Promise.all([
        store.list('messages', { conversation_id }),
        store.list('evidence', { conversation_id }),
        store.list('orders', { customer_id: conversation.customer_id }),
        readFile(new URL('../../../../prompts/03-runtime-prompt.md', import.meta.url), 'utf8'),
      ]));
      const input: ResponseInputItem[] = [{ role: 'user', content: JSON.stringify({
        conversation_id, customer_id: conversation.customer_id, messages: chronological(messages),
        evidence: labelEvidence(evidence),
        order_id: orders.sort((a, b) => b.placed_at.localeCompare(a.placed_at) || b.id.localeCompare(a.id))[0]?.id ?? null,
      }) }];
      let readOrder = false;
      const allowedTools = mode === 'auto' ? responseTools.filter(tool => tool.name !== 'find_cases') : responseTools;
      const autoInstructions = '\nFor this request only, the API has approved automatic handling of a low-risk question with no open case. Skip case matching. Read the supplied order using get_order_shipments. Use only system facts, no missing_info, no suggested_case_id, and proposed_action must be null. Draft a direct customer reply using the same output shape. If system data cannot answer, leave draft_reply empty for human review.';
      let calls = 0;
      let retried = false;
      while (true) {
        const response = await withinDeadline(client.responses.create({
          model, instructions: instructions + (mode === 'auto' ? autoInstructions : ''), tools: allowedTools, input: [...input], store: false,
          include: ['reasoning.encrypted_content'],
        }, { signal: controller.signal, maxRetries: 0 }));
        if (response.status !== 'completed') throw new SuggestionError('Model response did not complete');
        input.push(...toResponseInputItems(response.output));
        const toolCalls = response.output.filter(item => item.type === 'function_call');
        if (toolCalls.length) {
          if (calls + toolCalls.length > 6) throw new SuggestionError('Suggestion exceeded the limit of 6 tool calls');
          for (const call of toolCalls) {
            calls++;
            let output: unknown;
            try {
              const args = JSON.parse(call.arguments);
              if (mode === 'auto' && (!allowedTools.some(tool => tool.name === call.name) ||
                (call.name === 'get_order_shipments' && !orders.some(order => order.id === args.order_id)) ||
                (call.name === 'get_case_context' && args.case_id !== conversation.case_id))) {
                throw new ToolNotFoundError('Tool is unavailable for this automatic reply');
              }
              output = await withinDeadline(executeTool(store, call.name, args));
              if (call.name === 'get_order_shipments') readOrder = true;
            } catch (error) {
              if (error instanceof SuggestionError) throw error;
              output = { ok: false, error: error instanceof z.ZodError ? error.message
                : error instanceof ToolNotFoundError ? error.message
                : error instanceof SyntaxError ? 'Tool arguments must be valid JSON' : 'Tool read failed; data is unavailable' };
            }
            input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
          }
          continue;
        }
        let suggestion;
        try {
          suggestion = AgentSuggestionSchema.parse(JSON.parse(response.output_text));
        } catch (error) {
          if (retried) throw new SuggestionError('Model returned an invalid suggestion after one validation retry');
          retried = true;
          const details = error instanceof z.ZodError ? error.message : 'Output is not valid JSON';
          input.push({ role: 'user', content: `Validation error: ${details}\nReturn corrected JSON matching the AgentSuggestion shape in the instructions.` });
          continue;
        }
        if (mode === 'auto' && (!readOrder || suggestion.proposed_action || suggestion.suggested_case_id ||
          suggestion.missing_info.length || !suggestion.draft_reply.trim() || !suggestion.known_facts.length ||
          suggestion.known_facts.some(fact => fact.source !== 'system'))) {
          throw new SuggestionError('Automatic reply requires verified system facts and no action');
        }
        if (conversation.case_id && mode !== 'auto') {
          await withinDeadline(store.addEvent({
            case_id: conversation.case_id, type: 'ai_suggestion', actor: 'system',
            payload: { conversation_id, suggestion }, created_at: (options.now?.() ?? new Date()).toISOString(),
          }));
        }
        return { ok: true, suggestion };
      }
    } catch (error) {
      return { ok: false, suggestion: null, error: controller.signal.aborted ? timeoutMessage
        : error instanceof SuggestionError ? error.message : 'Unable to generate or save a suggestion' };
    } finally {
      clearTimeout(timer);
    }
  } };
}
