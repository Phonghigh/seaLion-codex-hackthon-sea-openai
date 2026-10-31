import { serve } from '@hono/node-server';
import { createApp } from './app';
import { readConfig } from './config';

import { connectDatabase } from './db/client';
import { createCaseStore } from './store/postgres';

const config = readConfig();
const { client, db } = connectDatabase(config.databaseUrl);
const server = serve({ fetch: createApp({ ...config, store: createCaseStore(db) }).fetch, hostname: '127.0.0.1', port: config.port }, info => {
  console.log(`seaPilot API: http://127.0.0.1:${info.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => { void client.end(); }));
