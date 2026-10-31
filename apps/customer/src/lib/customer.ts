import { useSyncExternalStore } from 'react';

export const CUSTOMERS = [
  { id: 'CUST001', name: 'Lan Nguyen', order: 'DH001' },
  { id: 'CUST002', name: 'Minh Tran', order: 'DH002' },
  { id: 'CUST003', name: 'Sam Lee', order: 'DH003' },
] as const;
const KEY = 'seapilot.customer';
const listeners = new Set<() => void>();
let unsaved: string | undefined;
export function readCustomer() {
  try {
    const id = unsaved ?? window.localStorage.getItem(KEY);
    return CUSTOMERS.find(customer => customer.id === id) ?? CUSTOMERS[0];
  } catch { return CUSTOMERS.find(customer => customer.id === unsaved) ?? CUSTOMERS[0]; }
}
export function selectCustomer(id: string) {
  if (!CUSTOMERS.some(customer => customer.id === id)) return;
  try { window.localStorage.setItem(KEY, id); unsaved = undefined; }
  catch { unsaved = id; }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
}
export function useCustomer() { return useSyncExternalStore(subscribe, readCustomer, () => CUSTOMERS[0]); }
