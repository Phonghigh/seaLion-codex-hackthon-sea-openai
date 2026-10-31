import type { CaseStore } from '../store/CaseStore';
import { DemoClock } from './clock';
import { buildSeed, type SeedState } from './seed';

// Serialize demo controls so an overlapping reset/advance cannot desynchronize the
// in-memory clock and committed database. Failed writes restore the prior clock.
export function createDemoService(store: CaseStore, clock = new DemoClock()) {
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = pending.then(work);
    pending = result.catch(() => undefined);
    return result;
  }
  return {
    clock,
    reset: (state: SeedState = 'Start') => serial(async () => {
      const today = new Date();
      const resetClock = new DemoClock(today);
      await store.resetTo(buildSeed(state, resetClock));
      clock.reset(today);
      return { state, time: clock.now().toISOString() };
    }),
    advanceDay: () => serial(async () => {
      const previousTime = clock.now();
      const updatedAt = clock.advance().toISOString();
      try {
        await store.transaction(async tx => {
          const [parcel] = await tx.list('shipments', { order_id: 'DH001', parcel_code: 'B' });
          if (!parcel) throw new Error('Reset demo data before advancing the day');
          await tx.updateShipment(parcel.id, { status: 'delivered', updated_at: updatedAt });
          const cases = await tx.list('cases', { order_id: 'DH001' });
          for (const current of cases.filter(item => item.status !== 'resolved')) {
            await tx.addEvent({ case_id: current.id, type: 'shipment_updated', actor: 'system', created_at: updatedAt,
              payload: { order_id: 'DH001', parcel_code: 'B', before: parcel.status, after: 'delivered' },
            });
          }
        });
      } catch (error) { clock.reset(previousTime); throw error; }
      return { time: updatedAt };
    }),
  };
}
