import { afterEach, expect, it, vi } from 'vitest';
import type { AgentSuggestion } from '@seapilot/contracts';
import { refreshDraftAfter } from '../../customer-service/src/lib/review-flow';
import { readIdentity, selectIdentity } from '../../customer-service/src/lib/identity';

const suggestion: AgentSuggestion = {
  suggested_case_id: 'CS001', link_confidence: 1, link_reason: 'Same case',
  known_facts: [], changes: [], missing_info: [], proposed_action: null,
  draft_reply: 'The case has been forwarded to the operations team for checking.',
};

it.each(['link', 'escalation'])('regenerates a draft after %s succeeds using the refreshed conversation', async () => {
  const calls: string[] = [];
  let finish!: (result: { ok: true; data: null }) => void;
  const mutation = new Promise<{ ok: true; data: null }>(resolve => { finish = resolve; });
  const work = refreshDraftAfter({
    conversationId: 'CONV2', mutate: () => mutation,
    onUpdating: () => { calls.push('updating'); },
    loadFingerprint: async () => { calls.push('refresh'); return 'new-context'; },
    suggest: async id => { calls.push(`suggest:${id}`); return { ok: true, data: suggestion }; },
  });
  expect(calls).toEqual([]);
  finish({ ok: true, data: null });
  expect(await work).toEqual({ ok: true, data: { data: suggestion, fingerprint: 'new-context' } });
  expect(calls).toEqual(['updating', 'refresh', 'suggest:CONV2']);
});

it('does not request another suggestion or discard review state on a failed action', async () => {
  const onUpdating = vi.fn(); const suggest = vi.fn(); const loadFingerprint = vi.fn();
  expect(await refreshDraftAfter({ conversationId: 'CONV2', mutate: async () => ({ ok: false, error: 'Action failed' }), onUpdating, loadFingerprint, suggest })).toEqual({ ok: false, error: 'Action failed' });
  expect(onUpdating).not.toHaveBeenCalled();
  expect(loadFingerprint).not.toHaveBeenCalled();
  expect(suggest).not.toHaveBeenCalled();
});

it('does not restore the old draft when refreshing context or regenerating fails', async () => {
  const suggest = vi.fn(async () => ({ ok: false as const, error: 'Model unavailable' }));
  const args = { conversationId: 'CONV2', mutate: async () => ({ ok: true as const, data: null }), onUpdating: vi.fn(), suggest };
  expect(await refreshDraftAfter({ ...args, loadFingerprint: async () => undefined })).toMatchObject({ ok: false });
  expect(suggest).not.toHaveBeenCalled();
  expect(await refreshDraftAfter({ ...args, loadFingerprint: async () => 'new-context' })).toEqual({ ok: false, error: 'Model unavailable' });
});

afterEach(() => { vi.unstubAllGlobals(); });
it('persists Binh across reloads, defaults invalid/missing storage to An and resets the selection', async () => {
  let saved: string | null = null;
  vi.stubGlobal('window', { localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } } });
  expect(readIdentity()).toBe('An');
  selectIdentity('Binh');
  vi.resetModules();
  expect((await import('../../customer-service/src/lib/identity')).readIdentity()).toBe('Binh');
  selectIdentity('An');
  expect(readIdentity()).toBe('An');
  saved = 'unknown';
  expect(readIdentity()).toBe('An');
});
it('handles denied storage reads and writes without breaking the workspace', () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('Storage disabled'); } });
  expect(readIdentity()).toBe('An');
  expect(() => selectIdentity('Binh')).not.toThrow();
  expect(readIdentity()).toBe('Binh');
  selectIdentity('An');
});
it('keeps the chosen identity when storage can be read but cannot be written', async () => {
  vi.resetModules();
  const identity = await import('../../customer-service/src/lib/identity');
  vi.stubGlobal('window', { localStorage: { getItem: () => 'An', setItem: () => { throw new Error('Quota exceeded'); } } });
  identity.selectIdentity('Binh');
  expect(identity.readIdentity()).toBe('Binh');
});
