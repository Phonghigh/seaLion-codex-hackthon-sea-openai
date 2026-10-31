import { expect, it, vi } from 'vitest';
import { DemoClock } from './clock';
import { buildSeed } from './seed';
import { createDemoService } from './service';
import { testStore } from '../ai/test-store';

it('anchors today in Ho Chi Minh City at 09:00 and advances exactly one day', () => {
  const clock = new DemoClock(new Date('2026-10-30T19:00:00Z'));
  expect(clock.now().toISOString()).toBe('2026-10-31T02:00:00.000Z');
  expect(clock.at(-1, 10)).toBe('2026-10-30T03:00:00.000Z');
  expect(clock.advance().toISOString()).toBe('2026-11-01T02:00:00.000Z');
  clock.reset(new Date('2026-11-02T00:00:00Z'));
  expect(clock.now().toISOString()).toBe('2026-11-02T02:00:00.000Z');
});
it('restores the clock when advance-day cannot commit, and uses tomorrow on retry', async () => {
  const clock = new DemoClock(new Date('2026-10-31T00:00:00Z'));
  const store = testStore(buildSeed('After Demo 1', clock));
  const demo = createDemoService(store, clock);
  const before = clock.now().toISOString();
  vi.spyOn(store, 'transaction').mockRejectedValueOnce(new Error('database unavailable'));
  await expect(demo.advanceDay()).rejects.toThrow('database unavailable');
  expect(clock.now().toISOString()).toBe(before);
  await demo.advanceDay();
  const [event] = await store.list('case_events', { type: 'shipment_updated' });
  expect(event.created_at).toBe(clock.now().toISOString());
  expect(Date.parse(event.created_at)).toBe(Date.parse(before) + 86_400_000);
});
it('builds the exact continuity identifiers and reply snapshot', () => {
  const seed = buildSeed('After Demo 1', new DemoClock());
  expect(seed.messages.map(row => row.id)).toEqual(['M1', 'R1']);
  expect(seed.case_events.map(row => row.type)).toEqual(['case_created', 'evidence_added', 'ai_suggestion', 'reply_sent']);
  expect(seed.case_events[3].payload.shipment_snapshot).toEqual({ A: 'delivered', B: 'in_transit' });
  expect(seed.customers.map(row => row.id)).toEqual(['CUST001', 'CUST002', 'CUST003']);
});
