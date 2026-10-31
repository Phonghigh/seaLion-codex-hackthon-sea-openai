import { describe, expect, it } from 'vitest';
import { createApp } from './app';
const app = createApp({ corsOrigins: ['http://localhost:3000'] });
describe('API boundary', () => {
  it('serves public health and exact-origin CORS', async () => {
    const allowed = await app.request('/api/health', { headers: { Origin: 'http://localhost:3000' } });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ ok: true });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    const denied = await app.request('/api/health', { headers: { Origin: 'http://localhost:3000.evil.test' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('answers preflight before auth and supplies CORS on errors', async () => {
    const response = await app.request('/api/demo/reset', { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-demo-token' } });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toContain('x-demo-token');
    const missing = await app.request('/missing', { headers: { Origin: 'http://localhost:3000' } });
    expect(missing.status).toBe(404);
    expect(missing.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });
  it('serves sample illustrations without exposing source files', async () => {
    const image = await app.request('/files/parcel_a.svg');
    expect(image.status).toBe(200);
    expect(await image.text()).toContain('Sample illustration');
    expect((await app.request('/files/%2e%2e/package.json')).status).toBe(404);
  });
});
