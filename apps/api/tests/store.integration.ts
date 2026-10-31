import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { readConfig } from '../src/config';
import * as s from '../src/db/schema';
import { createCaseStore } from '../src/store/postgres';

// Disposable database: generated migrations explicitly reference public schema.
// Never reset the operator's demo database while testing.
const name = `test_${randomUUID().replaceAll('-', '')}`;
const url = process.env.TEST_DATABASE_URL || readConfig().databaseUrl;
const admin = postgres(url, { max: 1, onnotice: () => {} });
const testUrl = new URL(url);
testUrl.pathname = `/${name}`;
const client = postgres(testUrl.toString(), { max: 5, onnotice: () => {} });
const db = drizzle(client, { schema: s });
const store = createCaseStore(db, () => new Date('2026-10-30T19:00:00Z'));
beforeAll(async () => {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
});
afterAll(async () => {
  await client.end();
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
});
beforeEach(async () => { await store.reset(); });
describe('Postgres demo lifecycle', () => {
  it('seeds all scenarios at 09:00 Vietnam with an empty case workspace', async () => {
    expect(await db.select().from(s.customers)).toHaveLength(3);
    expect(await db.select().from(s.orders)).toHaveLength(3);
    expect(await db.select().from(s.cases)).toHaveLength(0);
    expect(await db.select().from(s.conversations)).toHaveLength(0);
    expect(await db.select().from(s.evidence)).toHaveLength(0);
    const [clock] = await db.select().from(s.demoClock);
    expect(clock.now.toISOString()).toBe('2026-10-31T02:00:00.000Z');
    expect(clock.day).toBe(0);
    const [b] = await db.select().from(s.shipments).where(eq(s.shipments.id, 'SHIP002'));
    expect(b.status).toBe('in_transit');
    expect(b.updatedAt.toISOString()).toBe('2026-10-30T01:00:00.000Z');
  });
  it('jumps to After Demo 1, retains a reply baseline, and advances without duplicate shipment events', async () => {
    await store.jump('demo2');
    expect(await db.select().from(s.messages)).toHaveLength(2);
    expect(await db.select().from(s.evidence)).toHaveLength(1);
    expect(await db.select().from(s.tasks)).toHaveLength(0);
    const [reply] = await db.select().from(s.caseEvents).where(eq(s.caseEvents.type, 'reply_sent'));
    expect(reply.payload.shipment_snapshot).toEqual({ A: 'delivered', B: 'in_transit' });
    const days = await Promise.all([store.advanceDay(), store.advanceDay()]);
    expect(days.map(x => x.day).sort()).toEqual([1, 2]);
    expect(await db.select().from(s.caseEvents).where(eq(s.caseEvents.type, 'shipment_updated'))).toHaveLength(1);
    expect((await db.select().from(s.cases))[0].assignee).toBe('CS_A');
    await store.reset();
    expect(await db.select().from(s.caseEvents)).toHaveLength(0);
    expect(await db.select().from(s.messages)).toHaveLength(0);
    expect((await db.select().from(s.shipments).where(eq(s.shipments.id, 'SHIP002')))[0].status).toBe('in_transit');
  });
  it('rolls back reset completely if any seed write fails', async () => {
    await store.jump('demo2');
    await client.unsafe(`CREATE FUNCTION fail_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test seed failure'; END $$`);
    await client.unsafe('CREATE TRIGGER fail_seed BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION fail_seed()');
    try { await expect(store.reset()).rejects.toThrow(); }
    finally { await client.unsafe('DROP TRIGGER fail_seed ON customers'); }
    expect(await db.select().from(s.cases)).toHaveLength(1);
    expect(await db.select().from(s.evidence)).toHaveLength(1);
  });
});
