import { describe, expect, it } from 'vitest';
import { createDemoState, transition } from './index';

describe('case continuity through the local demo boundary', () => {
  it('links the returning conversation to the existing case without duplicating evidence', () => {
    const state = createDemoState('returning');
    const next = transition(state, { type: 'link', conversationId: 'CONV2' });
    expect(next.conversations.filter(c => c.caseId === 'CS001')).toHaveLength(2);
    expect(next.case?.evidence).toEqual(['parcel-a']);
    expect(next.case?.assignee).toBe('Binh');
    expect(state.conversations.find(c => c.id === 'CONV2')?.caseId).toBeNull();
  });
});

it('only escalates a linked case with the delivered-parcel evidence and records one task', () => {
  const returning = createDemoState('returning');
  expect(() => transition(returning, { type: 'escalate', conversationId: 'CONV2' })).toThrow();
  const linked = transition(returning, { type: 'link', conversationId: 'CONV2' });
  expect(() => transition(linked, { type: 'escalate', conversationId: 'CONV2' })).toThrow();
  const evidence = transition(linked, { type: 'send', conversationId: 'CONV2', text: 'The parcel arrived without the cap.', attachment: 'parcel-b' });
  expect(evidence.case?.status).toBe('open');
  const approved = transition(evidence, { type: 'escalate', conversationId: 'CONV2' });
  expect(approved.case?.status).toBe('waiting_ops');
  expect(approved.case?.evidence).toEqual(['parcel-a', 'parcel-b']);
  expect(approved.case?.taskId).toBe('OPS001');
  const retry = transition(approved, { type: 'escalate', conversationId: 'CONV2' });
  expect(retry.case?.events.filter(e => e.text.includes('approved escalation'))).toHaveLength(1);
});

it('keeps the original agent and evidence when the next agent links a new conversation', () => {
  const state = transition(createDemoState('returning'), { type: 'link', conversationId: 'CONV2' });
  expect(state.conversations[0].messages.at(-1)?.agent).toBe('An');
  const replied = transition(state, { type: 'approveReply', conversationId: 'CONV2', text: 'Your earlier attachment is on file.' });
  expect(replied.conversations[1].messages.at(-1)?.agent).toBe('Binh');
  expect(replied.case?.events.at(-1)?.text).toContain('approved and sent');
});

it('preserves earlier history when creating a conversation and starts fresh after reset', () => {
  const before = createDemoState('returning');
  const after = transition(before, { type: 'newConversation' });
  expect(after.conversations).toHaveLength(3);
  expect(after.conversations.slice(0, 2)).toEqual(before.conversations);
  expect(after.case).toEqual(before.case);
  expect(after.conversations.at(-1)?.caseId).toBeNull();
  expect(createDemoState('start')).toMatchObject({ case: null, conversations: [], day: 0 });
});

it('rejects blank messages and replies before linking without changing history', () => {
  const state = createDemoState('returning');
  expect(() => transition(state, { type: 'send', conversationId: 'CONV2', text: '   ' })).toThrow();
  expect(() => transition(state, { type: 'approveReply', conversationId: 'CONV2', text: 'Hello' })).toThrow();
  expect(state.conversations[1].messages).toHaveLength(1);
});
