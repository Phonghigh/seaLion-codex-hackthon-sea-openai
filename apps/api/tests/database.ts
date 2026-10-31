import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connectDatabase } from '../src/db/client';
import { createPostgresStore } from '../src/store/postgres';

// Never reset the database behind a running demo. Each harness owns a disposable DB.
export async function isolatedDatabase(url: string) {
  const admin = postgres(url, { max: 1 });
  const name = `seapilot_test_${randomBytes(8).toString('hex')}`;
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  const target = new URL(url); target.pathname = `/${name}`;
  const connection = connectDatabase(target.toString());
  const close = async () => {
    await connection.close();
    await admin.unsafe(`DROP DATABASE "${name}"`);
    await admin.end();
  };
  try {
    await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
    return { store: createPostgresStore(connection.db), db: connection.db, url: target.toString(), close };
  } catch (error) { await close(); throw error; }
}
