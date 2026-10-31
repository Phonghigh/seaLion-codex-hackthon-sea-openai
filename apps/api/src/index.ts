import './env';
import { serve } from '@hono/node-server';
import { connectDatabase } from './db/client';
import { createPostgresStore } from './store/postgres';
import { createApp } from './app';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; configure apps/api/.env');
const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const database = connectDatabase(process.env.DATABASE_URL);
const app = createApp(createPostgresStore(database.db), { token: process.env.DEMO_RESET_TOKEN, origins: process.env.CORS_ORIGINS || undefined });
const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port }, info => {
  console.log(`seaPilot API listening on http://127.0.0.1:${info.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { server.close(() => { void database.close(); }); });
}
