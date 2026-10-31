import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';

export function createApp(options: { corsOrigins: string[] }) {
  const app = new Hono();
  app.use('*', cors({
    origin: value => options.corsOrigins.includes(value) ? value : '',
    allowMethods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-demo-token'],
    maxAge: 600,
  }));
  app.get('/api/health', c => c.json({ ok: true, service: 'seapilot-api', time: new Date().toISOString() }));
  app.use('/files/*', serveStatic({
    root: fileURLToPath(new URL('../public/demo', import.meta.url)),
    rewriteRequestPath: path => path.replace(/^\/files/, ''),
  }));
  app.notFound(c => c.json({ ok: false, error: 'Not found' }, 404));
  app.onError((_error, c) => c.json({ ok: false, error: 'Internal server error' }, 500));
  return app;
}
