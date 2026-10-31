import '../env';
import { connectDatabase } from '../db/client';
import { createPostgresStore } from '../store/postgres';
import { createDemoService } from './service';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; configure apps/api/.env');
const database = connectDatabase(process.env.DATABASE_URL);
try {
  const result = await createDemoService(createPostgresStore(database.db)).reset();
  console.log(`Demo reset to ${result.state} at ${result.time}`);
} catch {
  console.error('Demo reset failed. Check database availability and run pnpm db:migrate.');
  process.exitCode = 1;
} finally {
  await database.close();
}
