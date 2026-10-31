import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { caseEvents, cases, demoClock, shipments } from '../db/schema';
import { DAY, demoStart, seed } from '../demo/seed';
import type { CaseStore, DemoState } from './CaseStore';

const demoLock = sql`select pg_advisory_xact_lock(731004)`;
export function createCaseStore(db: Database, clock: () => Date = () => new Date()): CaseStore {
  async function replace(scene: 'start' | 'demo2'): Promise<DemoState> {
    return db.transaction(async tx => {
      await tx.execute(demoLock);
      await tx.execute(sql`truncate tasks, case_events, evidence, messages, conversations, cases, shipments, order_items, orders, customers, demo_clock`);
      const now = demoStart(clock());
      await seed(tx, now, scene);
      return { day: 0, now: now.toISOString(), scene };
    });
  }
  return {
    reset: () => replace('start'),
    jump: () => replace('demo2'),
    advanceDay: () => db.transaction(async tx => {
      await tx.execute(demoLock);
      const [current] = await tx.select().from(demoClock).where(eq(demoClock.id, 1));
      if (!current) throw new Error('Demo clock missing; run db:reset first');
      const now = new Date(current.now.getTime() + DAY);
      await tx.update(demoClock).set({ day: current.day + 1, now }).where(eq(demoClock.id, 1));
      const changed = await tx.update(shipments).set({ status: 'delivered', updatedAt: now }).where(and(eq(shipments.orderId, 'DH001'), eq(shipments.parcelCode, 'B'), eq(shipments.status, 'in_transit'))).returning();
      if (changed.length) {
        const related = await tx.select({ id: cases.id }).from(cases).where(eq(cases.orderId, 'DH001'));
        for (const row of related) await tx.insert(caseEvents).values({
          id: `EVENT_${randomUUID()}`, caseId: row.id, type: 'shipment_updated', actor: 'system',
          payload: { parcel_code: 'B', before: 'in_transit', after: 'delivered' }, createdAt: now,
        });
      }
      return { day: current.day + 1, now: now.toISOString(), scene: 'advanced' as const };
    }),
  };
}
