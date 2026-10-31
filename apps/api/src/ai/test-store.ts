import { vi } from 'vitest';
import { type DatabaseState, type DbRows, type DbTable } from '@seapilot/contracts';
import type { CaseStore } from '../store/CaseStore';
import { DemoClock } from '../demo/clock';
import { buildSeed } from '../demo/seed';

// Test double only. Production always uses the injected PostgreSQL CaseStore.
export function testStore(initial = buildSeed('After Demo 1', new DemoClock())) {
  let state: DatabaseState = structuredClone(initial);
  const store: CaseStore = {
    health: async () => true,
    get: async <K extends DbTable>(table: K, id: string) => state[table].find(row => row.id === id) as DbRows[K] | undefined,
    list: async <K extends DbTable>(table: K, filter: Partial<DbRows[K]> = {}) =>
      (state[table] as DbRows[K][]).filter(row => Object.entries(filter).every(([key, value]) => row[key as keyof DbRows[K]] === value)),
    addEvent: vi.fn(async input => {
      const row = { ...input, id: input.id ?? `CE-test-${state.case_events.length}` };
      state.case_events.push(row);
      return row;
    }),
    resetTo: async next => { state = structuredClone(next); },
    updateShipment: async (id, patch) => {
      const row = state.shipments.find(item => item.id === id)!;
      Object.assign(row, patch);
      return row;
    },
    transaction: work => work(store),
    createConversation: vi.fn(), addMessage: vi.fn(), addEvidence: vi.fn(), createCase: vi.fn(),
    linkConversation: vi.fn(), createTask: vi.fn(), updateCase: vi.fn(),
  };
  return store;
}
