import { useSyncExternalStore } from 'react';
import type { CS_IDENTITIES } from './api';

type Identity = keyof typeof CS_IDENTITIES;
const KEY = 'seapilot.cs-identity';
const listeners = new Set<() => void>();
let unsaved: Identity | undefined;

export function readIdentity(): Identity {
  if (unsaved) return unsaved;
  try { return window.localStorage.getItem(KEY) === 'Binh' ? 'Binh' : 'An'; }
  catch { return 'An'; }
}
export function selectIdentity(value: Identity) {
  try { window.localStorage.setItem(KEY, value); unsaved = undefined; }
  catch { unsaved = value; /* Keep the selection for this session. */ }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
}
export function useIdentity() {
  return useSyncExternalStore(subscribe, readIdentity, () => 'An' as const);
}
