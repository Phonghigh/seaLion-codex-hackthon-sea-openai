import { randomBytes } from 'node:crypto';
import { and, eq, getTableColumns, isNull, sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { DatabaseStateSchema, DbRowSchemas, type DbRows, type DbTable } from '@seapilot/contracts';
import * as tables from '../db/schema';
import type { CaseStore } from './CaseStore';

type Database = PostgresJsDatabase<typeof tables>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const newId = (prefix: string) => `${prefix}${randomBytes(6).toString('hex')}`;
// postgres timestamps arrive as SQL strings; contracts expose ISO timestamps.
function normalize(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key,
    key.endsWith('_at') && typeof val === 'string' ? new Date(val).toISOString() : val,
  ]));
}
function row<K extends DbTable>(table: K, value: Record<string, unknown>): DbRows[K] {
  return DbRowSchemas[table].parse(normalize(value)) as DbRows[K];
}

export function createPostgresStore(db: Database | Transaction): CaseStore {
  const store: CaseStore = {
    async health() {
      try { await db.execute(sql`select 1`); return true; } catch { return false; }
    },
    async get(table, id) { return (await store.list(table, { id } as Partial<DbRows[typeof table]>))[0]; },
    async list(table, filter = {}) {
      const selected = tables[table as DbTable];
      const columns: Record<string, PgColumn> = getTableColumns(selected);
      const conditions: SQL[] = [];
      for (const [key, value] of Object.entries(filter)) {
        const column = columns[key];
        if (!column) throw new Error(`Unknown filter column: ${key}`);
        if (value !== undefined) conditions.push(value === null ? isNull(column) : eq(column, value));
      }
      const rows = await db.select().from(selected).where(and(...conditions)).orderBy(selected.id);
      return rows.map(value => row(table, value));
    },
    async createConversation(input) {
      const value = DbRowSchemas.conversations.parse({ ...input, id: input.id ?? newId('CONV') });
      const [result] = await db.insert(tables.conversations).values(value).returning();
      return row('conversations', result);
    },
    async updateConversation(id, patch) {
      const value = DbRowSchemas.conversations.pick({ mode: true }).parse(patch);
      const [result] = await db.update(tables.conversations).set(value).where(eq(tables.conversations.id, id)).returning();
      if (!result) throw new Error('Conversation not found');
      return row('conversations', result);
    },
    async addConversationEvent(input) {
      const value = DbRowSchemas.conversation_events.parse({ ...input, id: input.id ?? newId('CVE') });
      const [result] = await db.insert(tables.conversation_events).values(value).returning();
      return row('conversation_events', result);
    },
    async addMessage(input) {
      const value = DbRowSchemas.messages.parse({ ...input, id: input.id ?? newId('M') });
      const [result] = await db.insert(tables.messages).values(value).returning();
      return row('messages', result);
    },
    async addEvidence(input) {
      const value = DbRowSchemas.evidence.parse({ ...input, id: input.id ?? newId('EV') });
      const [result] = await db.insert(tables.evidence).values(value).returning();
      return row('evidence', result);
    },
    async createCase(input) {
      const value = DbRowSchemas.cases.parse({ ...input, id: input.id ?? newId('CS') });
      const [result] = await db.insert(tables.cases).values(value).returning();
      return row('cases', result);
    },
    async addEvent(input) {
      const value = DbRowSchemas.case_events.parse({ ...input, id: input.id ?? newId('CE') });
      const [result] = await db.insert(tables.case_events).values(value).returning();
      return row('case_events', result);
    },
    async createTask(input) {
      const value = DbRowSchemas.tasks.parse({ ...input, id: input.id ?? newId('TASK') });
      const [result] = await db.insert(tables.tasks).values(value).returning();
      return row('tasks', result);
    },
    async updateShipment(id, patch) {
      const value = DbRowSchemas.shipments.omit({ id: true }).partial().parse(patch);
      const [result] = await db.update(tables.shipments).set(value).where(eq(tables.shipments.id, id)).returning();
      if (!result) throw new Error('Shipment not found');
      return row('shipments', result);
    },
    async updateCase(id, patch) {
      const value = DbRowSchemas.cases.omit({ id: true }).partial().parse(patch);
      const [result] = await db.update(tables.cases).set(value).where(eq(tables.cases.id, id)).returning();
      if (!result) throw new Error('Case not found');
      return row('cases', result);
    },
    async linkConversation(conversationId, caseId, actor, at) {
      await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(7362741)`);
        const inner = createPostgresStore(tx);
        const conversation = await inner.get('conversations', conversationId);
        const target = await inner.get('cases', caseId);
        if (!conversation || !target) throw new Error('Conversation or case not found');
        if (conversation.customer_id !== target.customer_id) throw new Error('Customer mismatch');
        if (conversation.case_id && conversation.case_id !== caseId) throw new Error('Conversation already linked');
        if (conversation.case_id === caseId) return;
        await tx.update(tables.conversations).set({ case_id: caseId }).where(eq(tables.conversations.id, conversationId));
        await tx.update(tables.evidence).set({ case_id: caseId }).where(eq(tables.evidence.conversation_id, conversationId));
        await inner.updateCase(caseId, { assignee: actor });
        await inner.addEvent({ case_id: caseId, type: 'conversation_linked', actor, payload: { conversation_id: conversationId }, created_at: at });
        if (target.assignee !== actor) await inner.addEvent({ case_id: caseId, type: 'assignee_changed', actor, payload: { before: target.assignee, after: actor }, created_at: at });
      });
    },
    async resetTo(input) {
      const state = DatabaseStateSchema.parse(input);
      await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(7362741)`);
        await tx.execute(sql`TRUNCATE TABLE conversation_events, tasks, case_events, evidence, messages, conversations, cases, shipments, order_items, orders, customers RESTART IDENTITY CASCADE`);
        if (state.customers.length) await tx.insert(tables.customers).values(state.customers);
        if (state.orders.length) await tx.insert(tables.orders).values(state.orders);
        if (state.order_items.length) await tx.insert(tables.order_items).values(state.order_items);
        if (state.shipments.length) await tx.insert(tables.shipments).values(state.shipments);
        if (state.cases.length) await tx.insert(tables.cases).values(state.cases);
        if (state.conversations.length) await tx.insert(tables.conversations).values(state.conversations);
        if (state.conversation_events.length) await tx.insert(tables.conversation_events).values(state.conversation_events);
        if (state.messages.length) await tx.insert(tables.messages).values(state.messages);
        if (state.evidence.length) await tx.insert(tables.evidence).values(state.evidence);
        if (state.case_events.length) await tx.insert(tables.case_events).values(state.case_events);
        if (state.tasks.length) await tx.insert(tables.tasks).values(state.tasks);
      });
    },
    // Serialize workspace writes across app instances, including case numbering and approvals.
    transaction: work => db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7362741)`);
      return work(createPostgresStore(tx));
    }),
  };
  return store;
}
