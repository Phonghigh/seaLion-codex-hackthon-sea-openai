import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Hono } from 'hono';
import { z } from 'zod';
import { registerWorkspace, RequestError } from './workspace';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import type { CaseStore } from './store/CaseStore';
import { createDemoService } from './demo/service';
import { SuggestRequestSchema } from '@seapilot/contracts';
import { createAgent, type AgentOptions } from './ai/agent';
import { get_case_context, get_order_shipments, ToolNotFoundError } from './ai/tools';

export const DEFAULT_ORIGINS = 'http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:3000,http://localhost:3001';
export function createApp(store: CaseStore, options: { token?: string; origins?: string; demo?: ReturnType<typeof createDemoService>; agent?: AgentOptions } = {}) {
  const app = new Hono();
  const demo = options.demo ?? createDemoService(store);
  let lastWrite = 0;
  const now = () => new Date(lastWrite = Math.max(demo.clock.now().getTime(), lastWrite + 1));
  const agent = createAgent(store, { now, ...options.agent });
  const origins = (options.origins ?? DEFAULT_ORIGINS).split(',').map(value => value.trim()).filter(Boolean);
  app.use('*', cors({
    origin: origin => origins.includes(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'x-demo-token'],
  }));
  app.onError((error, c) => {
    if (error instanceof RequestError) return c.json({ ok: false, error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return c.json({ ok: false, error: 'Invalid request body' }, 400);
    return c.json({ ok: false, error: error instanceof ToolNotFoundError ? error.message : 'Request failed' }, error instanceof ToolNotFoundError ? 404 : 500);
  });
  registerWorkspace(app, store, () => now().toISOString());
  app.get('/api/cases/:id/context', async c => c.json(await get_case_context(store, { case_id: c.req.param('id') })));
  app.get('/api/orders/:id/shipments', async c => c.json(await get_order_shipments(store, { order_id: c.req.param('id') })));
  app.post('/api/agent/suggest', async c => {
    const parsed = SuggestRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, suggestion: null, error: 'Expected a non-empty conversation_id' }, 400);
    return c.json(await agent.suggest(parsed.data.conversation_id));
  });
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
  app.post('/api/demo/reset', async c => {
    const result = await demo.reset(); lastWrite = 0;
    return c.json({ ok: true, ...result });
  });
  app.post('/api/demo/advance-day', async c => c.json({ ok: true, ...await demo.advanceDay() }));
  app.post('/api/demo/jump', async c => {
    if (c.req.query('to') !== 'demo2') return c.json({ ok: false, error: 'Expected to=demo2' }, 400);
    const result = await demo.reset('After Demo 1'); lastWrite = 0;
    return c.json({ ok: true, ...result });
  });
  app.notFound(c => c.json({ ok: false, error: 'Not found' }, 404));
  return app;
}
