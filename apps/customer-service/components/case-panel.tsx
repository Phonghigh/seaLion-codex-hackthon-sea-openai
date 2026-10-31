'use client';
import Image from 'next/image';
import type { AgentSuggestion } from '@seapilot/contracts';
import { api, actorName, formatTime, type CaseDetail, type CaseContext, type OrderShipments } from '../src/lib/api';
import { Card, Avatar, Badge, Button, SourceBadge, ArrowRight, CheckCircle2, Clock3, Link2, Package, Sparkles, Truck } from '@seapilot/ui';

type Evidence = CaseDetail['evidence'][number];
interface Props {
  detail: CaseDetail | null; context: CaseContext | null; order: OrderShipments | null;
  suggestion: AgentSuggestion | null; busy: boolean; canApprove: boolean; stale: boolean;
  onEvidence: (evidence: Evidence) => void; onUseDraft: () => void; onEscalate: () => void; onSuggest: () => void;
}
export function CasePanel({ detail, context, order, suggestion, busy, canApprove, stale, onEvidence, onUseDraft, onEscalate, onSuggest }: Props) {
  const supportCase = detail?.case;
  const task = detail?.tasks.find(item => item.team === 'operations');
  return <aside className="case-pane" aria-label="Case details">
    <div className="case-heading"><h2>Case context</h2>{supportCase && <Badge>{supportCase.id}</Badge>}</div>
    {supportCase ? <Card className="case-section"><div className="row between" style={{ marginBottom: 14 }}><h3 style={{ margin: 0 }}>{supportCase.title}<SourceBadge source="system" /></h3><Badge tone={supportCase.status === 'waiting_ops' ? 'amber' : 'green'}>{supportCase.status.replaceAll('_', ' ')}</Badge></div><dl className="case-info"><div><dt>Assigned to</dt><dd className="row"><Avatar small name={actorName(supportCase.assignee)} />{actorName(supportCase.assignee)}</dd></div><div><dt>Customer</dt><dd>{supportCase.customer_id}</dd></div><div><dt>Order</dt><dd>{supportCase.order_id}</dd></div></dl></Card> : <div className="case-section"><h3><Link2 size={15} />Start with one case</h3><p>Approve the first reply to create a case, or confirm a suggested match to continue an existing case.</p></div>}
    {order && <Card className="case-section"><h3><Package size={15} />Order & parcels<SourceBadge source="system" /></h3>{order.parcels.map(parcel => <div className="parcel-row" key={parcel.parcel_code}><span className="parcel-name"><Package size={16} />{parcel.parcel_code} · {parcel.items.map(item => item.name).join(', ')}</span><Badge tone={parcel.status === 'delivered' ? 'green' : 'amber'}>{parcel.status.replaceAll('_', ' ')}</Badge></div>)}</Card>}
    <Card className="case-section suggestion-card"><div className="row between" style={{ marginBottom: 14 }}><h3 className="suggestion-heading" style={{ margin: 0 }}><Sparkles size={16} />Suggested next step</h3><Button size="sm" variant="outline" disabled={busy} onClick={onSuggest}>{busy ? 'Working…' : 'Suggest'}</Button></div>
      {(suggestion?.changes ?? context?.changes_since_last_contact.map(change => ({ text: `Parcel ${change.parcel_code}`, before: change.before, after: change.after })) ?? []).map((change, index) => <div className="change-highlight" key={index}><h4>What changed since the last reply<SourceBadge source="system" /></h4><p className="small">{change.text}</p><div className="change-flow"><s>{change.before}</s><ArrowRight size={13} /><strong>{change.after}</strong></div></div>)}
      {stale && <p className="draft-warning" role="status">Conversation or shipment data changed. Run Suggest again before approving.</p>}
      {suggestion ? <><div className="facts">{suggestion.known_facts.map((fact, index) => <p className="fact" key={index}><SourceBadge source={fact.source} />{fact.text}</p>)}</div><div className="missing-fact"><strong>{suggestion.missing_info.length ? 'One thing still missing' : 'No more information needed'}</strong><p>{suggestion.missing_info[0] ?? 'Use the evidence already on file to continue this case.'}</p></div><Button variant="secondary" style={{ width: '100%', marginTop: 16 }} onClick={onUseDraft} disabled={busy || !canApprove}><Sparkles />Use suggested reply</Button>
        {suggestion.proposed_action && !task && <div className="action-box"><strong>Ask operations to check packing</strong><p>{suggestion.proposed_action.reason}</p><p>Evidence: {suggestion.proposed_action.evidence_ids.join(', ')}</p><Button size="sm" onClick={onEscalate} disabled={busy || !canApprove || !supportCase}>Approve escalation<ArrowRight /></Button></div>}
      </> : <p className="muted">Select Suggest to review the stored case data and prepare a reply.</p>}
      {task && <div className="action-box"><div className="row"><CheckCircle2 size={17} /><strong>Escalated<SourceBadge source="system" /></strong></div><p>{task.id} · Warehouse Ops<br />Evidence: {task.evidence_ids.join(', ')}</p><p>Review and approve the reply to let the customer know.</p></div>}
    </Card>
    {detail && <><Card className="case-section"><div className="row between"><h3 style={{ margin: 0 }}>Evidence on file</h3><span className="small muted">{detail.evidence.length} attached</span></div><div className="evidence-grid">{detail.evidence.map(item => <Button variant="outline" key={item.id} style={{ height: 'auto', display: 'block' }} onClick={() => onEvidence(item)}><Image unoptimized width={640} height={480} src={api.fileUrl(item.path)} alt={`Evidence ${item.id}`} style={{ width: '100%', maxHeight: 100, objectFit: 'cover' }} /><span>{item.id}</span><SourceBadge source={item.source} /></Button>)}</div></Card>
      <Card className="case-section"><h3><Clock3 size={15} />Case timeline<SourceBadge source="system" /></h3><div className="timeline">{detail.events.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(event => <div className="timeline-item" key={event.id}><span className="timeline-dot" /><div>{event.type.replaceAll('_', ' ')} · {actorName(event.actor)}{event.type === 'assignee_changed' && <span> · {String(event.payload.before)} → {String(event.payload.after)}</span>}<time>{formatTime(event.created_at)}</time></div></div>)}</div></Card></>}
    <div className="case-section"><p className="muted small"><Truck size={13} style={{ display: 'inline', marginRight: 6 }} />Delivered describes the parcel, not its contents.</p></div>
  </aside>;
}
