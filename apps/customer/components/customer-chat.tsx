'use client';
import Image from 'next/image';
import { CUSTOMERS, SAMPLE_MESSAGES, selectCustomer, useCustomer } from '../src/lib/customer';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DbRows } from '@seapilot/contracts';
import { api, actorName, formatTime, type ConversationDetail, type OrderShipments } from '../src/lib/api';
import { Input, Textarea, Label, Card, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Accordion, AccordionItem, AccordionTrigger, AccordionContent, Alert, AlertDescription, Avatar, Badge, Brand, Button, Sheet, EmptyState, Package, Paperclip, ArrowUp, Plus, ShieldCheck, CheckCheck, Truck, X, MessageSquare } from '@seapilot/ui';

export function CustomerChat() {
  const customer = useCustomer();
  return <CustomerConversation key={customer.id} customer={customer} />;
}

function CustomerConversation({ customer }: { customer: typeof CUSTOMERS[number] }) {
  const [conversations, setConversations] = useState<DbRows['conversations'][]>([]);
  const [selected, setSelected] = useState('');
  const [thread, setThread] = useState<ConversationDetail | null>(null);
  const [order, setOrder] = useState<OrderShipments | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<'parcel_a' | 'parcel_b_open' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [evidence, setEvidence] = useState<DbRows['evidence'] | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderLoading, setOrderLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const draft = drafts[selected] ?? '';
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    const [list, shipments] = await Promise.all([api.conversations(customer.id), api.shipments(customer.order)]);
    if (version !== generation.current) return;
    if (shipments.ok) { setOrder(shipments.data); setOrderError(''); } else setOrderError(shipments.error);
    setOrderLoading(false);
    if (!list.ok) { setReadError(list.error); setLoading(false); return; }
    const sorted = list.data.sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    setConversations(sorted);
    const id = sorted.some(item => item.id === selected) ? selected : sorted.at(-1)?.id ?? '';
    if (id !== selected) { setSelected(id); setThread(null); setAttachment(''); setFile(null); setDrafts({}); }

    if (id) {
      const result = await api.conversation(id);
      if (version !== generation.current) return;
      if (result.ok) { setThread(result.data); setReadError(''); if (shipments.ok) setLastSynced(new Date().toLocaleTimeString()); } else { setThread(null); setReadError(result.error); }
    } else { setThread(null); setReadError(''); if (shipments.ok) setLastSynced(new Date().toLocaleTimeString()); }
    setLoading(false);
  }, [selected, customer]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { if (!pending.current) await refresh(); if (active) timer = setTimeout(poll, 2000); };
    void poll();
    return () => { active = false; clearTimeout(timer); generation.current += 1; };
  }, [refresh]);
  async function newConversation() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const result = await api.createConversation(customer.id);
    if (result.ok) { generation.current += 1; setConversations(previous => [...previous, result.data]); setSelected(result.data.id); setThread(null); setAttachment(''); setFile(null); setPickerOpen(false); setNotice('New conversation started. Earlier messages are still available.'); }
    else setError(result.error);
    pending.current = false; setBusy(false);
  }
  async function send() {
    if (pending.current || (!draft.trim() && !attachment && !file)) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    let target = selected;
    try {
      // First message with no open conversation: create one so the customer can just type.
      if (!target) {
        const created = await api.createConversation(customer.id);
        if (!created.ok) { setError(created.error); return; }
        target = created.data.id; generation.current += 1;
        setConversations(previous => [...previous, created.data]); setSelected(target);
        setDrafts(previous => ({ ...previous, [target]: previous[''] ?? '', '': '' }));
      }
      // Save evidence first so the hard attachment rule cannot race a fast triage call.
      // Clear only saved parts; a failed text send can be retried without another upload.
      if (file || attachment) {
        const result = file ? await api.upload(target, file) : await api.seedImage(target, attachment as 'parcel_a' | 'parcel_b_open');
        if (!result.ok) { setError(`${result.error} Your message has not been sent. Retry the attachment or choose a sample.`); return; }
        setAttachment(''); setFile(null); setPickerOpen(false);
      }
      if (draft.trim()) {
        const result = await api.sendMessage(target, draft);
        if (!result.ok) { setError(result.error); return; }
        setDrafts(previous => ({ ...previous, [target]: '', '': '' }));
      }
      setNotice('Sent');
    } finally { await refresh(); pending.current = false; setBusy(false); }
  }
  return <>
    <header className="customer-header"><Brand /><div className="row"><span className="header-help">Customer support</span><Badge>Demo</Badge><Badge role="status" tone={readError || orderError ? 'amber' : loading ? 'neutral' : 'green'}>{readError || orderError ? (lastSynced ? 'Reconnecting' : 'Unavailable') : loading ? 'Connecting…' : 'Connected'}</Badge><Label htmlFor="customer-picker" className="sr-only">Customer</Label><Select value={customer.id} onValueChange={selectCustomer} disabled={busy}><SelectTrigger id="customer-picker" className="customer-picker"><SelectValue /></SelectTrigger><SelectContent>{CUSTOMERS.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Avatar name={customer.name} /></div></header>
    <main id="main" className="customer-main">
      <div className="customer-intro"><div><h1>Hi {customer.name.split(' ')[0]}. Let’s get it sorted.</h1><p>Your order, your messages, and a team ready to pick up where you left off.</p></div><Button variant="outline" onClick={() => void newConversation()} disabled={busy || loading}><Plus />New conversation</Button></div>
      <div className="customer-grid">
        <Card className="customer-chat" role="region" aria-label="Support conversation">
          <div className="chat-header"><div className="row"><span className="brand-symbol"><MessageSquare size={18} /></span><div><h2>Conversation with support</h2><p className="muted small">Your earlier messages and attachments stay on file.</p></div></div><Badge>{order?.order.id ?? 'Order'}</Badge></div>
          {readError && <Alert variant="destructive"><AlertDescription>Could not refresh conversations. {readError}<Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>Retry conversations</Button></AlertDescription></Alert>}<div className="customer-messages" role="log" aria-label="Messages" aria-live="polite">
            <div className="day-divider">{thread ? `${formatTime(thread.conversation.opened_at)} · ${thread.conversation.id}` : loading ? 'Loading conversations…' : 'New conversation'}</div>
            {!loading && !readError && !thread?.messages.length && <EmptyState title="What can we help with?">Tell us what happened with your order. Your earlier conversations stay on file.</EmptyState>}
            {thread?.messages.map(message => <article key={message.id} className={`message ${message.role === 'customer' ? 'own' : ''}`}><Avatar small name={message.role === 'customer' ? customer.name : actorName(message.actor)} /><div className="message-body"><div className="message-meta"><strong>{message.role === 'customer' ? 'You' : `${actorName(message.actor)} · Support`}</strong><time>{formatTime(message.created_at)}</time><CheckCheck size={12} aria-label="Saved" /></div><div className="bubble">{message.text}</div></div></article>)}
            {!!thread?.evidence.length && <div className="customer-evidence" aria-label="Your attachments">{thread.evidence.map(item => <button type="button" className="customer-evidence-thumb" key={item.id} onClick={() => setEvidence(item)} aria-label={`Open attachment ${item.id}`}><Image unoptimized width={160} height={120} src={api.fileUrl(item.path)} alt={item.path.includes('/demo/') ? 'Sample photo you sent' : 'Photo you sent'} /><span><Paperclip size={12} />{item.path.includes('/demo/') ? 'Sample photo' : 'Your photo'} · {formatTime(item.created_at)}</span></button>)}</div>}
          </div>
          <form className="composer" onSubmit={event => { event.preventDefault(); void send(); }}>
            {!!SAMPLE_MESSAGES[customer.id]?.length && <div className="sample-messages" aria-label="Sample messages"><span className="small muted">Sample messages:</span>{SAMPLE_MESSAGES[customer.id].map(sample => <Button key={sample.label} type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setDrafts(previous => ({ ...previous, [selected]: sample.text })); setFile(null); setAttachment(sample.attachment ?? ''); setPickerOpen(false); }}>{sample.attachment && <Paperclip />}{sample.label}</Button>)}</div>}
            <div className="composer-box"><Label className="sr-only" htmlFor="customer-message">Your message</Label><Textarea id="customer-message" placeholder={selected ? 'Write your message…' : 'Tell us what happened with your order…'} maxLength={4000} value={draft} onChange={e => setDrafts(previous => ({ ...previous, [selected]: e.target.value }))} disabled={busy} />
              <div className="composer-tools"><Button variant="ghost" size="sm" aria-expanded={pickerOpen} onClick={() => setPickerOpen(!pickerOpen)} disabled={busy}><Paperclip />{file ? file.name : attachment ? '1 sample attached' : 'Attach image'}</Button><Button type="submit" disabled={busy || (!draft.trim() && !attachment && !file)}>{busy ? 'Sending…' : 'Send'}<ArrowUp /></Button></div>
              {pickerOpen && <div className="attachment-picker"><Label htmlFor="customer-file">Upload an image</Label><Input key={file?.name ?? 'empty'} id="customer-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setAttachment(''); }} /><Label htmlFor="customer-attachment" className="small">Or use a demo image</Label><Select value={attachment || 'none'} onValueChange={value => { setAttachment(value === 'none' ? '' : value as 'parcel_a' | 'parcel_b_open'); setFile(null); }} disabled={busy}><SelectTrigger id="customer-attachment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Choose a sample</SelectItem><SelectItem value="parcel_a">Parcel A · shipping label</SelectItem><SelectItem value="parcel_b_open">Parcel B · opened parcel</SelectItem></SelectContent></Select>{(attachment || file) && <Button variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => { setAttachment(''); setFile(null); }}><X /></Button>}<p className="muted small">JPEG, PNG or WebP, up to 10 MiB. Sample images are labeled illustrations.</p></div>}
            </div>
            <div className="composer-footnote"><ShieldCheck size={13} />Your messages stay with this conversation.</div>
            <p className="status-note" role="status">{thread?.triage_pending ? 'Message saved. Finding the right support…' : notice}</p>{error && <Alert variant="destructive" className="error-note"><AlertDescription>{error}</AlertDescription></Alert>}
          </form>
        </Card>
        <aside className="customer-aside" aria-label="Order context"><Card className="order-aside"><div className="row between"><h2>Your order</h2><Package size={18} className="muted" /></div><p className="order-meta">{order ? `${order.order.id} · ${order.parcels.length} parcels` : orderLoading ? 'Loading order…' : 'Order unavailable'}</p>{orderError && <Alert variant="destructive"><AlertDescription>{order ? 'Showing previously loaded order details. They may be out of date. ' : 'Could not load your order. '}{orderError}<Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>Retry order</Button></AlertDescription></Alert>}{order?.parcels.map(parcel => <div className="product-row" key={parcel.parcel_code}><div className="product-mark"><Package size={24} strokeWidth={1.3} /></div><div><p className="product-name">{parcel.items.map(item => item.name).join(', ')}</p><p className="product-detail">Parcel {parcel.parcel_code}</p><Badge tone={parcel.status === 'delivered' ? 'green' : 'amber'}>{parcel.status.replaceAll('_', ' ')}</Badge></div></div>)}<p className="order-note"><Truck size={15} style={{ display: 'inline', marginRight: 6 }} />Your items travel separately. We can help if something is missing from a delivered parcel.</p></Card>
          <div className="support-note"><h3>No need to start over.</h3><p>You don’t need to send your story or attachments again. Your support team can pick up where you left off.</p></div>
          <Accordion type="single" collapsible className="customer-history"><AccordionItem value="history"><AccordionTrigger>Earlier conversations ({conversations.length})</AccordionTrigger><AccordionContent>{conversations.map(c => <Button key={c.id} size="sm" disabled={busy} variant={selected === c.id ? 'secondary' : 'outline'} onClick={() => { generation.current += 1; setSelected(c.id); setThread(null); setAttachment(''); setFile(null); }}>{c.id} · {formatTime(c.opened_at)}</Button>)}</AccordionContent></AccordionItem></Accordion>
        </aside>
      </div><div className="local-notice">{readError || orderError ? 'Connection interrupted. Retrying automatically.' : 'Messages refresh automatically.'} {lastSynced && `Last synced ${lastSynced}.`}</div>
    </main>
    <Sheet open={!!evidence} onOpenChange={open => !open && setEvidence(null)} title="Conversation attachment" description="Customer-supplied evidence. Seed images are illustrative.">{evidence && <div className="case-section"><Image unoptimized width={640} height={480} src={api.fileUrl(evidence.path)} alt={`Customer attachment ${evidence.id}`} style={{ width: '100%', height: 'auto' }} /><Badge tone="blue">{evidence.source}</Badge><p>{formatTime(evidence.created_at)}</p></div>}</Sheet>
  </>;
}
