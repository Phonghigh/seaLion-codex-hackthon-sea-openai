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

/** Demo script messages, one click fills the composer (and attaches the sample photo). */
export type SampleMessage = { label: string; text: string; attachment?: 'parcel_a' | 'parcel_b_open' };
export const SAMPLE_MESSAGES: Record<string, SampleMessage[]> = {
  CUST001: [
    { label: 'Scene 1 · missing cap + photo A', text: 'I ordered a T-shirt and a cap but only got the T-shirt. Here is a photo of the parcel, please check.', attachment: 'parcel_a' },
    { label: 'Scene 2 · follow-up next day', text: 'The missing cap from yesterday is still not solved. I already sent a photo, do I have to explain everything again?' },
    { label: 'Scene 3 · opened parcel B + photo', text: 'I got the second parcel, but there was no cap inside. Here is a photo of the second parcel.', attachment: 'parcel_b_open' },
  ],
  CUST002: [{ label: 'Scene 0 · where is my order', text: 'Where is my order DH002?' }],
  CUST003: [{ label: 'Scene 4 · vague problem', text: "Hi, something's wrong with my order" }],
};
