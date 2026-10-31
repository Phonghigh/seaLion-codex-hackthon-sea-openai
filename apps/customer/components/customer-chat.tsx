'use client';
import { useState } from 'react';
import type { EvidenceId } from '@seapilot/contracts';
import { useDemo } from '@seapilot/demo/react';
import { Textarea, Label, Card, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Accordion, AccordionItem, AccordionTrigger, AccordionContent, Alert, AlertDescription, Avatar, Badge, Brand, Button, EvidenceTile, Sheet, EmptyState, Package, Paperclip, ArrowUp, Plus, ShieldCheck, CheckCheck, Truck, RotateCcw, X, MessageSquare } from '@seapilot/ui';

export function CustomerChat() {
  const { state, perform, busy, error, notice, reset } = useDemo('returning');
  const [selected, setSelected] = useState('CONV2');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<EvidenceId | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [evidence, setEvidence] = useState<'A' | 'B' | null>(null);
  const conversation = state.conversations.find(c => c.id === selected) ?? state.conversations.at(-1);
  const draft = drafts[conversation?.id ?? ''] ?? '';
  async function send() {
    if (!conversation || !draft.trim()) return;
    if (await perform({ type: 'send', conversationId: conversation.id, text: draft, attachment }, 'Message saved in this local demo.')) {
      setDrafts(previous => ({ ...previous, [conversation.id]: '' })); setAttachment(undefined); setPickerOpen(false);
    }
  }
  async function newConversation() {
    if (await perform({ type: 'newConversation' }, 'New conversation started. Your earlier messages are still available.')) { setSelected(''); setAttachment(undefined); setPickerOpen(false); }
  }
  return <>
    <header className="customer-header"><Brand /><div className="row"><span className="header-help">A little help, without starting over.</span><Badge tone="green">Local demo</Badge><Avatar name="Lan Nguyen" /></div></header>
    <main id="main" className="customer-main">
      <div className="customer-intro"><div><h1>We’re here to help, Lan.</h1><p>One conversation closer to getting things sorted.</p></div><Button variant="outline" onClick={newConversation} disabled={busy}><Plus />New conversation</Button></div>
      <div className="customer-grid">
        <Card className="customer-chat" role="region" aria-label="Support conversation">
          <div className="chat-header"><div className="row"><span className="brand-symbol"><MessageSquare size={18} /></span><div><h2>Your support team</h2><p className="muted small"><span className="online" />We’ll keep the context, so you don’t have to.</p></div></div><Badge>DH001</Badge></div>
          <div className="customer-messages" role="log" aria-label="Messages" aria-live="polite">
            <div className="day-divider">{conversation?.day ? 'Today' : 'Yesterday'} · {conversation?.id ?? 'New conversation'}</div>
            {!conversation?.messages.length && <EmptyState title="What can we help with?">Tell us what happened with your order. Your earlier conversations are still on file.</EmptyState>}
            {conversation?.messages.map(message => <article key={message.id} className={`message ${message.role === 'customer' ? 'own' : ''}`}><Avatar small name={message.role === 'customer' ? 'Lan Nguyen' : 'Support'} /><div className="message-body"><div className="message-meta"><strong>{message.role === 'customer' ? 'You' : `${message.agent ?? 'Support'} · Support`}</strong><time>{message.time}</time>{message.role === 'customer' && <CheckCheck size={12} aria-label="Saved" />}</div><div className="bubble">{message.text}</div>{message.attachment && <EvidenceTile parcel={message.attachment === 'parcel-a' ? 'A' : 'B'} onClick={() => setEvidence(message.attachment === 'parcel-a' ? 'A' : 'B')} />}</div></article>)}
          </div>
          <form className="composer" onSubmit={event => { event.preventDefault(); void send(); }}>
            <div className="composer-box"><Label className="sr-only" htmlFor="customer-message">Your message</Label><Textarea id="customer-message" placeholder="Tell us what’s on your mind…" maxLength={4000} value={draft} onChange={e => setDrafts(previous => ({ ...previous, [conversation?.id ?? '']: e.target.value }))} disabled={busy} />
              <div className="composer-tools"><Button variant="ghost" size="sm" aria-expanded={pickerOpen} onClick={() => setPickerOpen(!pickerOpen)} disabled={busy}><Paperclip />{attachment ? '1 sample attached' : 'Attach sample'}</Button><Button type="submit" disabled={busy || !draft.trim()}><span>{busy ? 'Sending…' : 'Send'}</span><ArrowUp /></Button></div>
              {pickerOpen && <div className="attachment-picker"><Label htmlFor="customer-attachment" className="small">Demo attachment</Label><Select value={attachment ?? 'none'} onValueChange={value => setAttachment(value === 'none' ? undefined : value as EvidenceId)} disabled={busy}><SelectTrigger id="customer-attachment" className="attachment-select"><SelectValue placeholder="Choose a sample" /></SelectTrigger><SelectContent><SelectItem value="none">Choose a sample</SelectItem><SelectItem value="parcel-a">Parcel A · shipping label</SelectItem><SelectItem value="parcel-b">Parcel B · opened parcel</SelectItem></SelectContent></Select>{attachment && <Button variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setAttachment(undefined)}><X /></Button>}<p className="muted small">Sample references only. Files are not uploaded.</p></div>}
            </div>
            <div className="composer-footnote"><ShieldCheck size={13} />Your messages stay with this conversation.</div>
            <p className="status-note" role="status">{notice}</p>{error && <Alert variant="destructive" className="error-note"><AlertDescription>{error}</AlertDescription></Alert>}
          </form>
        </Card>
        <aside className="customer-aside" aria-label="Order context">
          <Card className="order-aside"><div className="row between"><h2>Your order</h2><Package size={18} className="muted" /></div><p className="order-meta">DH001 · 2 items, 2 parcels</p>
            <div className="product-row"><div className="product-mark"><Package size={24} strokeWidth={1.3} /></div><div><p className="product-name">Everyday T-shirt</p><p className="product-detail">TSHIRT-01 · Parcel A</p><Badge tone="green">Delivered</Badge></div></div>
            <div className="product-row"><div className="product-mark"><Package size={24} strokeWidth={1.3} /></div><div><p className="product-name">Classic cap</p><p className="product-detail">CAP-01 · Parcel B</p><Badge tone="green">Marked delivered</Badge></div></div>
            <p className="order-note"><Truck size={15} style={{ display: 'inline', marginRight: 6 }} />Your items travel separately. We can help if something is missing from a delivered parcel.</p>
          </Card>
          <div className="support-note"><h3>A fresh chat. The same context.</h3><p>You don’t need to send your story or attachments again. Your support team can pick up where you left off.</p></div>
          <Accordion type="single" collapsible className="customer-history"><AccordionItem value="history"><AccordionTrigger>Earlier conversations ({state.conversations.length})</AccordionTrigger><AccordionContent>{state.conversations.map(c => <Button key={c.id} size="sm" variant={conversation?.id === c.id ? 'secondary' : 'outline'} onClick={() => { setSelected(c.id); setAttachment(undefined); }}>{c.id} · {c.day ? 'Today' : 'Yesterday'}</Button>)}</AccordionContent></AccordionItem></Accordion>
        </aside>
      </div>
      <div className="local-notice"><span>This is a local preview. No messages are sent to a service or the CS site.</span><Button size="sm" variant="ghost" onClick={() => { reset('returning'); setSelected('CONV2'); setDrafts({}); setAttachment(undefined); }} disabled={busy}><RotateCcw />Reset</Button></div>
    </main>
    <Sheet open={!!evidence} onOpenChange={open => !open && setEvidence(null)} title={`Parcel ${evidence ?? ''} attachment`} description="Illustrative demo reference, supplied by the customer in the scenario."><div className="case-section"><EmptyState title="Sample image not supplied">This attachment represents {evidence === 'A' ? 'the first parcel’s shipping label' : 'the opened second parcel'}. No actual photo was uploaded or verified.</EmptyState><Badge tone="blue">Customer source</Badge></div></Sheet>
  </>;
}
