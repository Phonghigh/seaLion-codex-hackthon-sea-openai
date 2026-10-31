import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it('defaults to Lan and persists Minh or Sam across module reloads', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) };
  vi.stubGlobal('window', { localStorage: storage });
  let picker = await import('../../customer/src/lib/customer');
  expect(picker.readCustomer().name).toBe('Lan Nguyen');
  for (const id of ['CUST002', 'CUST003']) {
    picker.selectCustomer(id); vi.resetModules(); picker = await import('../../customer/src/lib/customer');
    expect(picker.readCustomer().id).toBe(id);
  }
  picker.selectCustomer('invalid'); expect(picker.readCustomer().name).toBe('Sam Lee');
});
it('keeps the customer selection usable when localStorage is blocked', async () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('Storage blocked'); } });
  const picker = await import('../../customer/src/lib/customer');
  expect(picker.readCustomer().id).toBe('CUST001');
  picker.selectCustomer('CUST002'); expect(picker.readCustomer().name).toBe('Minh Tran');
});
