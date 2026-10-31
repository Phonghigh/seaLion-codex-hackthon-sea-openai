import type { AgentSuggestion } from '@seapilot/contracts';
import type { ApiResult } from './api';

export type Review = { data: AgentSuggestion; fingerprint: string };

/** Keep approval/link, context reload and draft regeneration in one busy operation. */
export async function refreshDraftAfter<T>({ mutate, conversationId, onUpdating, loadFingerprint, suggest }: {
  mutate: () => Promise<ApiResult<T>>;
  conversationId: string;
  onUpdating: () => void;
  loadFingerprint: () => Promise<string | undefined>;
  suggest: (id: string) => Promise<ApiResult<AgentSuggestion>>;
}): Promise<ApiResult<Review>> {
  const mutation = await mutate();
  if (!mutation.ok) return mutation;
  onUpdating();
  const fingerprint = await loadFingerprint();
  if (fingerprint === undefined) return { ok: false, error: 'Could not reload the conversation. Run Suggest again before approving.' };
  const result = await suggest(conversationId);
  return result.ok ? { ok: true, data: { data: result.data, fingerprint } } : result;
}
