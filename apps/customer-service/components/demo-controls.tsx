'use client';
import { useRef, useState } from 'react';
import { api, type DemoControl } from '../src/lib/api';
import { Button, CalendarDays, RotateCcw, ArrowRight, Sheet, Input, Label, Alert, AlertDescription } from '@seapilot/ui';
const TOKEN_KEY = 'seapilot.demo-token';
export function DemoControls({ disabled, onBusy, onComplete }: { disabled: boolean; onBusy: (busy: boolean) => void; onComplete: (control: DemoControl) => Promise<void> }) {
  const [requested, setRequested] = useState<DemoControl | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [time, setTime] = useState('');
  const pending = useRef(false);
  async function execute(control: DemoControl, value: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); onBusy(true); setError('');
    try {
      const result = await api.demo(control, value);
      if (!result.ok) {
        setError(result.error);
        if (result.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setToken(''); setRequested(control); }
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, value);
      setToken(''); setRequested(null); setTime(result.data.time);
      await onComplete(control);
    } catch { setError('Session storage is unavailable. Enable it to use the demo controls.'); }
    finally { pending.current = false; setBusy(false); onBusy(false); }
  }
  function choose(control: DemoControl) {
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (saved) void execute(control, saved); else { setRequested(control); setError(''); }
    } catch { setError('Session storage is unavailable. Enable it to use the demo controls.'); }
  }
  return <><span className="row"><CalendarDays size={14} />{time ? new Date(time).toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Demo controls'}</span><Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => choose('reset')}><RotateCcw />Reset</Button><Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => choose('advance-day')}>Next day<ArrowRight /></Button><Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => choose('demo2')}>Start from Demo 2</Button>{error && !requested && <span role="alert">{error}</span>}
    <Sheet open={requested !== null} onOpenChange={open => { if (!open && !busy) { setRequested(null); setToken(''); } }} title="Demo token" description="Enter the local demo token once. It stays in this tab’s session storage."><form className="case-section" onSubmit={event => { event.preventDefault(); if (requested) void execute(requested, token); }}><Label htmlFor="demo-token">Demo token</Label><Input id="demo-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} disabled={busy} /><Button type="submit" disabled={busy || !token.trim()}>{busy ? 'Applying…' : 'Continue'}</Button>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</form></Sheet>
  </>;
}
