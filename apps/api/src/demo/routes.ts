import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import type { CaseStore } from '../store/CaseStore';
export function demoRoutes(store: CaseStore, token: string) {
  const routes = new Hono();
  routes.use('*', async (c, next) => {
    if (!token) return c.json({ ok: false, error: 'Demo mutations are disabled: configure DEMO_RESET_TOKEN' }, 503);
    const provided = Buffer.from(c.req.header('x-demo-token') || '');
    const expected = Buffer.from(token);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return c.json({ ok: false, error: 'Unauthorized' }, 401);
    await next();
  });
  routes.post('/reset', async c => c.json({ ok: true, ...await store.reset() }));
  routes.post('/advance-day', async c => c.json({ ok: true, ...await store.advanceDay() }));
  routes.post('/jump', async c => {
    const to = z.literal('demo2').safeParse(c.req.query('to'));
    if (!to.success) return c.json({ ok: false, error: 'Expected ?to=demo2' }, 400);
    return c.json({ ok: true, ...await store.jump(to.data) });
  });
  return routes;
}
