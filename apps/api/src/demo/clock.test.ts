import { expect, it } from 'vitest';
import { DemoClock } from './clock';
import { buildSeed } from './seed';

it('anchors today in Ho Chi Minh City at 09:00 and advances exactly one day', () => {
  const clock = new DemoClock(new Date('2026-10-30T19:00:00Z'));
  expect(clock.now().toISOString()).toBe('2026-10-31T02:00:00.000Z');
  expect(clock.at(-1, 10)).toBe('2026-10-30T03:00:00.000Z');
  expect(clock.advance().toISOString()).toBe('2026-11-01T02:00:00.000Z');
  clock.reset(new Date('2026-11-02T00:00:00Z'));
  expect(clock.now().toISOString()).toBe('2026-11-02T02:00:00.000Z');
});
it('builds the exact continuity identifiers and reply snapshot', () => {
  const seed = buildSeed('After Demo 1', new DemoClock());
  expect(seed.messages.map(row => row.id)).toEqual(['M1', 'R1']);
  expect(seed.case_events.map(row => row.type)).toEqual(['case_created', 'evidence_added', 'ai_suggestion', 'reply_sent']);
  expect(seed.case_events[3].payload.shipment_snapshot).toEqual({ A: 'delivered', B: 'in_transit' });
  expect(seed.customers.map(row => row.id)).toEqual(['CUST001', 'CUST002', 'CUST003']);
});
