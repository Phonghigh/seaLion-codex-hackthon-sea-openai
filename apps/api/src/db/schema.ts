import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, integer, jsonb, unique, check } from 'drizzle-orm/pg-core';
const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' }).notNull();
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email'), language: text('language').notNull(),
});
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), customerId: text('customer_id').notNull().references(() => customers.id),
  placedAt: time('placed_at'), status: text('status').notNull(),
});
export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id),
  sku: text('sku').notNull(), name: text('name').notNull(), qty: integer('qty').notNull(), parcelCode: text('parcel_code').notNull(),
}, t => [check('positive_qty', sql`${t.qty} > 0`)]);
export const shipments = pgTable('shipments', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id),
  parcelCode: text('parcel_code').notNull(), carrier: text('carrier').notNull(), tracking: text('tracking').notNull(),
  status: text('status').notNull(), updatedAt: time('updated_at'), expectedDeliveryAt: timestamp('expected_delivery_at', { withTimezone: true }),
}, t => [unique('order_parcel').on(t.orderId, t.parcelCode)]);
export const cases = pgTable('cases', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id),
  customerId: text('customer_id').notNull().references(() => customers.id), title: text('title').notNull(),
  status: text('status', { enum: ['open', 'waiting_customer', 'waiting_ops', 'resolved'] }).notNull(),
  assignee: text('assignee').notNull(), createdAt: time('created_at'),
}, t => [check('case_status', sql`${t.status} in ('open','waiting_customer','waiting_ops','resolved')`)]);
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(), caseId: text('case_id').references(() => cases.id),
  customerId: text('customer_id').notNull().references(() => customers.id), channel: text('channel').notNull(),
  openedAt: time('opened_at'), mode: text('mode', { enum: ['human', 'auto'] }).notNull().default('human'),
}, t => [check('conversation_mode', sql`${t.mode} in ('human','auto')`)]);
export const messages = pgTable('messages', {
  id: text('id').primaryKey(), conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['customer', 'cs', 'ai'] }).notNull(), text: text('text').notNull(), actor: text('actor').notNull(), createdAt: time('created_at'),
}, t => [check('message_role', sql`${t.role} in ('customer','cs','ai')`)]);
export const evidence = pgTable('evidence', {
  id: text('id').primaryKey(), caseId: text('case_id').references(() => cases.id),
  conversationId: text('conversation_id').notNull().references(() => conversations.id), type: text('type').notNull(),
  path: text('path').notNull(), source: text('source', { enum: ['customer', 'system', 'unverified'] }).notNull(), createdAt: time('created_at'),
}, t => [check('evidence_source', sql`${t.source} in ('customer','system','unverified')`)]);
export const caseEvents = pgTable('case_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id),
  type: text('type').notNull(), actor: text('actor').notNull(), payload: jsonb('payload').$type<Record<string, unknown>>().notNull(), createdAt: time('created_at'),
});
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id), team: text('team').notNull(),
  status: text('status').notNull(), evidenceIds: jsonb('evidence_ids').$type<string[]>().notNull(), createdAt: time('created_at'),
});
// One durable clock shared by every API process, reset/jump and migration restart.
export const demoClock = pgTable('demo_clock', {
  id: integer('id').primaryKey(), day: integer('day').notNull(), now: time('now'),
}, t => [check('singleton_clock', sql`${t.id} = 1`), check('nonnegative_day', sql`${t.day} >= 0`)]);
