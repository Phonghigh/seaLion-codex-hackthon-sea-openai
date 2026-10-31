'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AgentSuggestion, DbRows } from '@seapilot/contracts';
import { api, CS_IDENTITIES, actorName, formatTime, type ApiResult, type ConversationDetail, type CaseDetail, type CaseContext, type OrderShipments } from '../src/lib/api';
import { Input, Textarea, Label, Tabs, TabsList, TabsTrigger, TabsContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert, AlertDescription, Avatar, Badge, Brand, Button, Sheet, EmptyState, SourceBadge, ArrowLeft, ArrowRight, CheckCheck, Clock3, Inbox, LifeBuoy, Link2, PanelRight, Search, Send, ShieldCheck, Paperclip } from '@seapilot/ui';
import { CasePanel } from './case-panel';
import { DemoControls } from './demo-controls';

type Snapshot = { threads: ConversationDetail[]; selected: string; detail: CaseDetail | null; context: CaseContext | null; order: OrderShipments | null };
const empty: Snapshot = { threads: [], selected: '', detail: null, context: null, order: null };
// Read-only refreshes and ai_suggestion audit events must not invalidate a draft.
function fingerprint(thread: ConversationDetail | undefined, order: OrderShipments | null) {
  return JSON.stringify([thread?.conversation, thread?.messages, thread?.evidence, order?.parcels.map(parcel => [parcel.parcel_code, parcel.status])]);
}
const customerName = (id: string) => ({ CUST001: 'Lan Nguyen', CUST002: 'Minh Tran', CUST003: 'Sam Lee' })[id] ?? id;
export function Workspace({ demoEnabled }: { demoEnabled: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showThread, setShowThread] = useState(true);
  const [details, setDetails] = useState(false);
  const [evidence, setEvidence] = useState<DbRows['evidence'] | null>(null);
  const [help, setHelp] = useState(false);
  const [identity, setIdentity] = useState<keyof typeof CS_IDENTITIES>('An');
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [suggestion, setSuggestion] = useState<{ data: AgentSuggestion; fingerprint: string } | null>(null);
  const [dismissedMatch, setDismissedMatch] = useState(false);
  const [working, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const busy = working || demoBusy;
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const generation = useRef(0);
  const thread = snapshot.selected === selected ? snapshot.threads.find(item => item.conversation.id === selected) : undefined;
  const currentFingerprint = fingerprint(thread, snapshot.order);
  const stale = !!suggestion && suggestion.fingerprint !== currentFingerprint;
  const canApprove = !!suggestion && !stale && !blocked && !readError && !!thread;
  const task = snapshot.detail?.tasks.find(item => item.team === 'operations');
  const actionPending = !!suggestion?.data.proposed_action && !task;
  const match = suggestion?.data.suggested_case_id;
  const linked = !!thread?.conversation.case_id;
  const customer = customerName(thread?.conversation.customer_id ?? 'CUST001');
  const clearReview = useCallback(() => { setSuggestion(null); setDraft(''); setTitle(''); setDismissedMatch(false); setBlocked(false); setError(''); setNotice(''); }, []);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    const list = await api.conversations();
    if (version !== generation.current) return;
    if (!list.ok) { setReadError(list.error); setLoading(false); return; }
    const rows = list.data.sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    const results = await Promise.all(rows.map(row => api.conversation(row.id)));
    if (version !== generation.current) return;
    const failed = results.find(result => !result.ok);
    if (failed && !failed.ok) { setReadError(failed.error); setLoading(false); return; }
    const threads = results.flatMap(result => result.ok ? [result.data] : []);
    const id = rows.some(row => row.id === selected) ? selected : rows[0]?.id ?? '';
    const active = threads.find(item => item.conversation.id === id);
    const caseId = active?.conversation.case_id;
    let detail: CaseDetail | null = null;
    let context: CaseContext | null = null;
    let order: OrderShipments | null = null;
    if (caseId) {
      const [caseResult, contextResult] = await Promise.all([api.caseDetail(caseId), api.caseContext(caseId)]);
      if (version !== generation.current) return;
      if (!caseResult.ok || !contextResult.ok) { setReadError(!caseResult.ok ? caseResult.error : !contextResult.ok ? contextResult.error : 'Could not load case'); setLoading(false); return; }
      detail = caseResult.data; context = contextResult.data;
    }
    const orderId = detail?.case.order_id ?? (active?.conversation.customer_id === 'CUST001' ? 'DH001' : null);
    if (orderId) {
      const result = await api.shipments(orderId);
      if (version !== generation.current) return;
      if (!result.ok) { setReadError(result.error); setLoading(false); return; }
      order = result.data;
    }
    if (id !== selected) { setSelected(id); clearReview(); }
    const next = { threads, selected: id, detail, context, order };
    setSnapshot(next); setReadError(''); setLoading(false);
    return next;
  }, [selected, clearReview]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { await refresh(); if (active) timer = setTimeout(poll, 2000); };
    void poll();
    return () => { active = false; clearTimeout(timer); generation.current += 1; };
  }, [refresh]);
  async function run<T>(work: () => Promise<ApiResult<T>>, success: string, onSuccess?: (data: T) => void) {
    if (pending.current || demoBusy) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await work();
      if (!result.ok) { setBlocked(true); setError(result.error); return; }
      onSuccess?.(result.data); setNotice(success);
      await refresh();
    } finally { pending.current = false; setBusy(false); }
  }
  function suggest() {
    if (!thread) return;
    const key = currentFingerprint;
    setSuggestion(null); setDraft('');
    void run(() => api.suggest(selected), 'Suggestion ready for review.', data => { setSuggestion({ data, fingerprint: key }); setBlocked(false); });
  }
  function approveReply() {
    if (!canApprove || actionPending || !draft.trim() || (!linked && (!title.trim() || (!!match && !dismissedMatch)))) return;
    void run(() => api.approveReply(selected, draft, CS_IDENTITIES[identity], linked ? undefined : title), 'Sent', () => { setDraft(''); setSuggestion(null); });
  }
  function escalate() {
    const action = suggestion?.data.proposed_action;
    if (!canApprove || !linked || !action || task) return;
    void run(() => api.approveAction(selected, action, CS_IDENTITIES[identity]), 'Escalated. Review and approve the reply next.');
  }
  const conversations = snapshot.threads.filter(item => (filter !== 'needs' || item.messages.at(-1)?.role === 'customer') && (filter !== 'auto' || item.conversation.mode === 'auto') && `${item.case?.title ?? ''} ${item.conversation.id} ${customerName(item.conversation.customer_id)} ${item.case?.order_id ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const panel = <CasePanel detail={thread ? snapshot.detail : null} context={thread ? snapshot.context : null} order={thread ? snapshot.order : null} suggestion={suggestion?.data ?? null} busy={busy || !thread} canApprove={canApprove} stale={stale} onEvidence={setEvidence} onUseDraft={() => { if (canApprove && suggestion) { setDraft(suggestion.data.draft_reply); setDetails(false); } }} onEscalate={escalate} onSuggest={suggest} />;
  return <main className="workspace" id="main">
    <nav className="app-rail" aria-label="Workspace navigation"><Brand compact /><div className="rail-nav"><Button variant="ghost" size="icon" className="rail-active" aria-label="Conversations" onClick={() => setShowThread(false)}><Inbox /></Button></div><div className="rail-bottom"><Button variant="ghost" size="icon" aria-label="About this demo" onClick={() => setHelp(true)}><LifeBuoy /></Button><Avatar name={identity} /></div></nav>
    <div className="workspace-body">
      <header className="workspace-top"><div className="row"><h1>Conversations</h1><span className="top-subtitle">Every conversation. One continuous case.</span></div><div className="row"><Badge tone="green">Connected demo</Badge><Label htmlFor="cs-identity" className="agent-label">Signed in as</Label><Select value={identity} onValueChange={value => setIdentity(value as keyof typeof CS_IDENTITIES)} disabled={busy}><SelectTrigger id="cs-identity" aria-label="Signed in as"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="An">An</SelectItem><SelectItem value="Binh">Binh</SelectItem></SelectContent></Select></div></header>
      {(error || readError) && <Alert variant="destructive"><AlertDescription>{error || readError} {blocked && 'Run Suggest again before approving.'}</AlertDescription></Alert>}
      <div className={`workspace-columns ${showThread ? 'show-thread' : ''}`}>
        <aside className="inbox-pane" aria-label="Conversation inbox"><div className="inbox-header"><h2>Team inbox<span className="count">{snapshot.threads.length}</span></h2></div><Label className="search-box"><Search size={14} /><span className="sr-only">Search conversations</span><Input placeholder="Search conversations…" value={query} onChange={e => setQuery(e.target.value)} /></Label><Tabs value={filter} onValueChange={setFilter}><TabsList className="inbox-tabs" aria-label="Filter conversations"><TabsTrigger className="inbox-tab" value="all">All</TabsTrigger><TabsTrigger className="inbox-tab" value="needs">Needs reply</TabsTrigger><TabsTrigger className="inbox-tab" value="auto">Auto-handled</TabsTrigger></TabsList><TabsContent value={filter} className="inbox-tab-content">
          {conversations.map(item => <Button variant="ghost" key={item.conversation.id} disabled={busy} className={`conversation-item ${selected === item.conversation.id ? 'selected' : ''}`} onClick={() => { generation.current += 1; setSelected(item.conversation.id); clearReview(); setShowThread(true); }} aria-current={selected === item.conversation.id ? 'true' : undefined}><div className="row"><Avatar small name={customerName(item.conversation.customer_id)} /><strong className="small">{customerName(item.conversation.customer_id)}</strong><time>{formatTime(item.conversation.opened_at)}</time></div><h3>{item.case?.title ?? 'New conversation'}</h3><p>{item.messages.at(-1)?.text ?? 'No messages yet'}</p><div className="case-ref"><Link2 size={11} />{item.conversation.case_id ?? 'No case linked'}</div></Button>)}
          {!conversations.length && <p className="empty-inbox">{loading ? 'Loading conversations…' : query ? 'No conversations match your search.' : 'No conversations here yet. Start a chat on the Customer site.'}</p>}</TabsContent></Tabs><div className="inbox-footer">All conversations stay here for follow-up.</div>
        </aside>
        <section className="thread-pane" aria-label="Selected conversation">
          {thread ? <><div className="thread-header"><div className="row"><Button variant="ghost" size="icon" className="mobile-back" aria-label="Back to inbox" onClick={() => setShowThread(false)}><ArrowLeft /></Button><Avatar name={customer} /><div><h2>{thread.case?.title ?? 'New conversation'}</h2><p>{customer} <span>·</span> {selected} <span>·</span> {thread.conversation.channel}</p></div></div><div className="row"><Badge tone={linked ? 'green' : 'neutral'}>{thread.case?.status.replaceAll('_', ' ') ?? 'New'}</Badge><Button variant="outline" size="icon" className="details-trigger" aria-label="Open case details" onClick={() => setDetails(true)}><PanelRight /></Button></div></div>
          {!linked && <div className="link-banner">{match && !dismissedMatch ? <><h3><Link2 size={15} />Continue case {match}?</h3><p>{suggestion?.data.link_reason}</p><div className="row"><Button size="sm" disabled={busy || !canApprove} onClick={() => void run(() => api.link(match, selected, CS_IDENTITIES[identity]), 'Conversation linked. Run Suggest again to review the attached context.', () => { setSuggestion(null); setDraft(''); })}><Link2 />Link to {match}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setDismissedMatch(true)}>Not this case</Button></div></> : <><h3><Link2 size={15} />Keep this request together</h3><p>{dismissedMatch ? 'Match dismissed. Approving a reply will create a separate case.' : 'The first approved reply creates the case and attaches this conversation’s evidence.'}</p><Label htmlFor="case-title">New case title</Label><Input id="case-title" placeholder="Describe the customer’s request" value={title} onChange={event => setTitle(event.target.value)} disabled={busy} />{dismissedMatch && <Button size="sm" variant="ghost" onClick={() => setDismissedMatch(false)}>Review match</Button>}</>}</div>}
          <div className="thread-scroll" role="log" aria-live="polite" aria-label="Conversation messages"><div className="day-divider">{formatTime(thread.conversation.opened_at)}</div>{linked && <div className="thread-label"><Link2 size={11} style={{ display: 'inline', marginRight: 4 }} />Linked to {thread.conversation.case_id} · earlier context is in the case panel</div>}{thread.messages.map(message => <article key={message.id} className={`message ${message.role !== 'customer' ? 'own' : ''}`}><Avatar small name={message.role === 'customer' ? customer : actorName(message.actor)} /><div className="message-body"><div className="message-meta"><strong>{message.role === 'customer' ? customer : `${actorName(message.actor)} · Agent`}</strong><SourceBadge source={message.role === 'customer' ? 'customer' : 'system'} /><time>{formatTime(message.created_at)}</time>{message.role !== 'customer' && <CheckCheck size={12} />}</div><div className="bubble">{message.text}</div></div></article>)}<div className="evidence-grid">{thread.evidence.map(item => <Button variant="outline" key={item.id} onClick={() => setEvidence(item)}><Paperclip />{item.id}<SourceBadge source={item.source} /></Button>)}</div></div>
          <form className="composer" onSubmit={event => { event.preventDefault(); approveReply(); }}><div className="row between reply-label"><span>Reply to {customer}</span><span className="row"><ShieldCheck size={12} />Your approval, every time</span></div><div className="composer-box"><Label htmlFor="agent-reply" className="sr-only">Draft reply</Label><Textarea id="agent-reply" placeholder="Run Suggest, review the facts, then edit your reply…" value={draft} disabled={busy} maxLength={4000} onChange={event => setDraft(event.target.value)} /><div className="composer-tools"><Button variant="ghost" size="sm" disabled={busy || (!draft && !suggestion)} onClick={() => { setDraft(''); setSuggestion(null); setNotice('Draft rejected.'); }}>Reject draft</Button><Button type="submit" disabled={busy || !canApprove || !draft.trim() || actionPending || (!linked && (!title.trim() || (!!match && !dismissedMatch)))}>{busy ? 'Working…' : 'Approve and send'}<Send /></Button></div></div><p className="status-note" role="status">{notice}</p>{actionPending && <p className="draft-warning">Approve the escalation successfully before sending this reply.</p>}{stale && <p className="draft-warning">New case data arrived. Run Suggest again to review it.</p>}</form>
          </> : <EmptyState title={loading ? 'Loading workspace…' : 'A case starts with a conversation'}>Select a conversation from the inbox, or start a chat on the Customer site.</EmptyState>}
        </section>
        {panel}
      </div>
      <footer className="demo-bar">{demoEnabled ? <DemoControls disabled={busy} onBusy={setDemoBusy} onComplete={async control => { generation.current += 1; clearReview(); setEvidence(null); if (control !== 'advance-day') { setSnapshot(empty); setSelected(''); setQuery(''); setFilter('all'); } await refresh(); }} /> : <><span className="row"><Clock3 size={13} />Connected workspace</span><Link href="/?demo=1" className="button button-ghost button-sm">Open demo controls<ArrowRight size={14} /></Link></>}<span className="demo-state-note">Shared case data · refreshes every 2 seconds</span></footer>
    </div>
    <Sheet open={details} onOpenChange={setDetails} title="Case context" description="History, evidence and the suggested next step.">{panel}</Sheet>
    <Sheet open={!!evidence} onOpenChange={open => !open && setEvidence(null)} title="Conversation attachment" description="Source-labeled evidence. Seed images are illustrative.">{evidence && <div className="case-section"><Image unoptimized width={640} height={480} src={api.fileUrl(evidence.path)} alt={`Evidence ${evidence.id}`} style={{ width: '100%', height: 'auto' }} /><SourceBadge source={evidence.source} /><p>{formatTime(evidence.created_at)}</p></div>}</Sheet>
    <Sheet open={help} onOpenChange={setHelp} title="Case continuity" description="Customer and CS share the same case data."><div className="case-section"><h3>Continue the customer’s story</h3><p>Start a conversation on the Customer site, then review it here. Suggest reads stored data. Approve each reply and action separately.</p><p>Changing Signed in as only changes who approves the next operation. Demo controls reset or advance shared data.</p></div></Sheet>
  </main>;
}
