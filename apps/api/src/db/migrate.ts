import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connectDatabase } from './client';
import { readConfig } from '../config';
const { client, db } = connectDatabase(readConfig().databaseUrl);
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
  console.log('Database migrations applied.');
} finally { await client.end(); }
