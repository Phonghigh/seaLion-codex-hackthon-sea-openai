import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' }).notNull();
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull(), language: text('language').notNull(),
});
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), customer_id: text('customer_id').notNull().references(() => customers.id), placed_at: time('placed_at'), status: text('status').notNull(),
});
export const order_items = pgTable('order_items', {
  id: text('id').primaryKey(), order_id: text('order_id').notNull().references(() => orders.id), sku: text('sku').notNull(), name: text('name').notNull(), qty: integer('qty').notNull(), parcel_code: text('parcel_code').notNull(),
});
export const shipments = pgTable('shipments', {
  id: text('id').primaryKey(), order_id: text('order_id').notNull().references(() => orders.id), parcel_code: text('parcel_code').notNull(), carrier: text('carrier').notNull(), tracking: text('tracking').notNull(), status: text('status').notNull(), updated_at: time('updated_at'),
});
export const cases = pgTable('cases', {
  id: text('id').primaryKey(), order_id: text('order_id').notNull().references(() => orders.id), customer_id: text('customer_id').notNull().references(() => customers.id), title: text('title').notNull(), status: text('status').notNull(), assignee: text('assignee').notNull(), created_at: time('created_at'),
});
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(), customer_id: text('customer_id').notNull().references(() => customers.id), case_id: text('case_id').references(() => cases.id), channel: text('channel').notNull(), mode: text('mode').notNull().default('human'), opened_at: time('opened_at'),
});
export const messages = pgTable('messages', {
  id: text('id').primaryKey(), conversation_id: text('conversation_id').notNull().references(() => conversations.id), role: text('role').notNull(), text: text('text').notNull(), actor: text('actor').notNull(), created_at: time('created_at'),
});
export const evidence = pgTable('evidence', {
  id: text('id').primaryKey(), conversation_id: text('conversation_id').notNull().references(() => conversations.id), case_id: text('case_id').references(() => cases.id), type: text('type').notNull(), path: text('path').notNull(), source: text('source').notNull(), created_at: time('created_at'),
});
export const case_events = pgTable('case_events', {
  id: text('id').primaryKey(), case_id: text('case_id').notNull().references(() => cases.id), type: text('type').notNull(), actor: text('actor').notNull(), payload: jsonb('payload').$type<Record<string, unknown>>().notNull(), created_at: time('created_at'),
});
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(), case_id: text('case_id').notNull().references(() => cases.id), team: text('team').notNull(), status: text('status').notNull(), evidence_ids: jsonb('evidence_ids').$type<string[]>().notNull(), created_at: time('created_at'),
});

export const conversation_events = pgTable('conversation_events', {
  id: text('id').primaryKey(), conversation_id: text('conversation_id').notNull().references(() => conversations.id),
  type: text('type').notNull(), actor: text('actor').notNull(), payload: jsonb('payload').$type<Record<string, unknown>>().notNull(), created_at: time('created_at'),
});
