import { CommandSchema, DemoStateSchema, type DemoState, type DemoCommand, type Scene, type Suggestion } from '@seapilot/contracts';
export const CUSTOMER_MESSAGES = {
  first: 'I ordered a T-shirt and a cap but only got the T-shirt. Here is a photo of the parcel, please check.',
  returning: 'The missing cap from yesterday is still not solved. I already sent a photo, do I have to explain everything again?',
  evidence: 'I got the second parcel, but there was no cap inside. Here is a photo of the second parcel.',
};
export const FIRST_REPLY = 'I checked order DH001. Your order is arriving in two parcels: the T-shirt has been delivered, and the cap is still in transit. I have saved your photo and request so we can keep following up.';
export function createDemoState(scene: Scene = 'returning'): DemoState {
  const state: DemoState = { day: 0, parcelB: 'in_transit', conversations: [], case: null, sequence: 10 };
  if (scene === 'start') return state;
  state.conversations.push({ id: 'CONV1', caseId: null, title: 'Missing cap · Order DH001', day: 0, messages: [{ id: 'M1', role: 'customer', text: CUSTOMER_MESSAGES.first, time: '09:12', attachment: 'parcel-a' }] });
  if (scene === 'first') return state;
  state.case = { id: 'CS001', status: 'open', assignee: 'An', evidence: ['parcel-a'], taskId: null, events: [{ id: 'E1', text: 'An opened this case', time: 'Yesterday, 09:13' }, { id: 'E2', text: 'Parcel A attachment saved', time: 'Yesterday, 09:13' }, { id: 'E3', text: 'An approved and sent a reply', time: 'Yesterday, 09:15' }] };
  state.conversations[0].caseId = 'CS001';
  state.conversations[0].messages.push({ id: 'R1', role: 'agent', agent: 'An', text: FIRST_REPLY, time: '09:15' });
  state.day = 1; state.parcelB = 'delivered';
  state.conversations.push({ id: 'CONV2', caseId: null, title: 'Following up on my missing cap', day: 1, messages: [{ id: 'M2', role: 'customer', text: CUSTOMER_MESSAGES.returning, time: '09:41' }] });
  if (scene === 'evidence') {
    state.conversations[1].caseId = 'CS001'; state.case.assignee = 'Binh'; state.case.evidence.push('parcel-b');
    state.conversations[1].messages.push({ id: 'M3', role: 'customer', text: CUSTOMER_MESSAGES.evidence, time: '09:46', attachment: 'parcel-b' });
  }
  return DemoStateSchema.parse(state);
}
export function transition(current: DemoState, input: DemoCommand): DemoState {
  const command = CommandSchema.parse(input);
  const state = structuredClone(current);
  if (command.type === 'link') {
    const conversation = state.conversations.find(c => c.id === command.conversationId);
    if (!conversation || !state.case) throw new Error('Select an existing conversation and case.');
    if (conversation.caseId) return state;
    conversation.caseId = state.case.id;
    state.case.assignee = state.day ? 'Binh' : 'An';
    for (const message of conversation.messages) if (message.attachment && !state.case.evidence.includes(message.attachment)) state.case.evidence.push(message.attachment);
    state.case.events.push({ id: `E${++state.sequence}`, text: `${state.case.assignee} linked ${conversation.id} to this case`, time: 'Today, 09:42' });
    return state;
  }
  if (command.type === 'advance') {
    state.day = 1; state.parcelB = 'delivered';
    if (state.case && !state.case.events.some(e => e.id === 'shipment-delivered')) state.case.events.push({ id: 'shipment-delivered', text: 'Carrier marked parcel B as delivered', time: 'Today, 08:30' });
    return state;
  }
  if (command.type === 'newConversation') {
    state.conversations.push({ id: `CONV${++state.sequence}`, caseId: null, title: 'New conversation', day: state.day, messages: [] });
    return state;
  }
  const conversation = state.conversations.find(c => c.id === command.conversationId);
  if (!conversation) throw new Error('Choose a conversation first.');
  if (command.type === 'createCase') {
    if (state.case) throw new Error('An existing case is available. Link it instead.');
    if (!conversation.messages.length) throw new Error('Send a customer message first.');
    state.case = { id: 'CS001', status: 'open', assignee: state.day ? 'Binh' : 'An', evidence: [], taskId: null, events: [{ id: `E${++state.sequence}`, text: 'Agent created case CS001', time: 'Just now' }] };
    return transition(state, { type: 'link', conversationId: conversation.id });
  }
  if (command.type === 'send') {
    conversation.messages.push({ id: `M${++state.sequence}`, role: 'customer', text: command.text, time: 'Just now', attachment: command.attachment });
    if (conversation.title === 'New conversation') conversation.title = command.text.slice(0, 60);
    if (command.attachment && conversation.caseId && state.case && !state.case.evidence.includes(command.attachment)) {
      state.case.evidence.push(command.attachment);
      state.case.events.push({ id: `E${++state.sequence}`, text: 'Customer attachment saved', time: 'Just now' });
    }
    return state;
  }
  if (!state.case || conversation.caseId !== state.case.id) throw new Error('Link this conversation to a case first.');
  if (command.type === 'escalate') {
    if (state.case.taskId) return state;
    if (state.parcelB !== 'delivered' || !state.case.evidence.includes('parcel-b')) throw new Error('Confirm the delivered parcel and collect its evidence before escalating.');
    state.case.status = 'waiting_ops'; state.case.taskId = 'OPS001';
    state.case.events.push({ id: `E${++state.sequence}`, text: `${state.case.assignee} approved escalation · OPS001 created`, time: 'Just now' });
    return state;
  }
  if (command.type === 'approveReply') {
    const last = conversation.messages.at(-1);
    if (last?.role === 'agent' && last.text === command.text) return state;
    conversation.messages.push({ id: `R${++state.sequence}`, role: 'agent', agent: state.case.assignee, text: command.text, time: 'Just now' });
    state.case.events.push({ id: `E${++state.sequence}`, text: `${state.case.assignee} approved and sent a reply`, time: 'Just now' });
  }
  return DemoStateSchema.parse(state);
}

export function getSuggestion(state: DemoState, conversationId: string): Suggestion | null {
  const conversation = state.conversations.find(c => c.id === conversationId);
  if (!conversation || !conversation.messages.length || !conversation.caseId || !state.case) return null;
  const facts: Suggestion['facts'] = [
    { text: 'Lan reported a missing cap from order DH001.', source: 'customer' },
    { text: `Parcel B is ${state.parcelB === 'delivered' ? 'marked delivered' : 'still in transit'}.`, source: 'system' },
    { text: 'The contents of parcel B have not been independently verified.', source: 'unverified' },
  ];
  if (state.case.taskId) return { kind: 'escalated', facts, action: false, question: null, draft: 'I have recorded that the second parcel arrived without the cap, along with your new attachment. I have forwarded both attachments to our operations team for verification. You do not need to open a new request or resend the evidence.' };
  if (state.case.evidence.includes('parcel-b') && state.parcelB === 'delivered') return { kind: 'escalate', facts, action: true, question: null, draft: 'Thank you for confirming and sending the new attachment. Your earlier evidence is already on file. I will ask our operations team to check the parcel packing once the escalation is approved.' };
  if (state.parcelB === 'in_transit') return { kind: 'in_transit', facts, action: false, question: null, draft: FIRST_REPLY };
  return { kind: 'clarify', facts, action: false, question: 'Was parcel B not received, or received without the cap?', draft: "I'm sorry you had to contact us again. Your earlier message and attachment are already on file; there is no need to resend them. The carrier now marks the second parcel as delivered. Have you not received it, or did it arrive without the cap?" };
}
