import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import type { CaseStore } from './store/CaseStore';
import { createDemoService } from './demo/service';

export const DEFAULT_ORIGINS = 'http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001';
export function createApp(store: CaseStore, options: { token?: string; origins?: string; demo?: ReturnType<typeof createDemoService> } = {}) {
  const app = new Hono();
  const demo = options.demo ?? createDemoService(store);
  const origins = (options.origins ?? DEFAULT_ORIGINS).split(',').map(value => value.trim()).filter(Boolean);
  app.use('*', cors({
    origin: origin => origins.includes(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'x-demo-token'],
  }));
  app.onError((_error, c) => c.json({ ok: false, error: 'Request failed' }, 500));
  app.get('/api/health', async c => c.json({ ok: true, time: demo.clock.now().toISOString(), db: await store.health() ? 'up' : 'down' }));
  for (const directory of ['../public/', '../data/uploads/']) {
    const root = fileURLToPath(new URL(directory, import.meta.url));
    if (directory.includes('uploads')) mkdirSync(root, { recursive: true });
    app.get('/files/*', serveStatic({ root, rewriteRequestPath: path => path.replace(/^\/files\//, '') }));
  }
  app.use('/api/demo/*', async (c, next) => {
    if (!options.token || c.req.header('x-demo-token') !== options.token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
    await next();
  });
  app.post('/api/demo/reset', async c => c.json({ ok: true, ...await demo.reset() }));
  app.post('/api/demo/advance-day', async c => c.json({ ok: true, ...await demo.advanceDay() }));
  app.post('/api/demo/jump', async c => {
    if (c.req.query('to') !== 'demo2') return c.json({ ok: false, error: 'Expected to=demo2' }, 400);
    return c.json({ ok: true, ...await demo.reset('After Demo 1') });
  });
  app.notFound(c => c.json({ ok: false, error: 'Not found' }, 404));
  return app;
}
