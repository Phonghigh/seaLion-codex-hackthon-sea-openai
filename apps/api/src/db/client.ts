import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export function connectDatabase(url: string) {
  const client = postgres(url, { connect_timeout: 3, max: 5, connection: { statement_timeout: 5000 } });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 2 }) };
}
