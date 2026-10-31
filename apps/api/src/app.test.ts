import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp, DEFAULT_ORIGINS } from './app';
import { isolatedUploads } from '../tests/uploads';
import type { CaseStore } from './store/CaseStore';

// Only health/reset are exercised without a database; persistence is tested separately.
const stubStore = () => ({ health: vi.fn(async () => true), resetTo: vi.fn(async () => undefined) }) as unknown as CaseStore;
let uploads: Awaited<ReturnType<typeof isolatedUploads>>;
beforeAll(async () => { uploads = await isolatedUploads(); });
afterAll(async () => { await uploads?.close(); });
const origin = 'http://localhost:3001';
afterEach(() => vi.restoreAllMocks());
describe('HTTP boundary (no database required)', () => {
  it('answers health without authentication and reports database availability', async () => {
    const store = stubStore();
    const app = createApp(store);
    expect(await (await app.request('/api/health')).json()).toMatchObject({ ok: true, db: 'up', time: expect.any(String) });
    vi.mocked(store.health).mockResolvedValue(false);
    expect(await (await app.request('/api/health')).json()).toMatchObject({ ok: true, db: 'down' });
  });
  it.each(DEFAULT_ORIGINS.split(','))('answers preflight before auth for %s', async allowed => {
    const response = await createApp(stubStore()).request('/api/demo/reset', { method: 'OPTIONS', headers: { Origin: allowed, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-demo-token' } });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowed);
    expect(response.headers.get('vary')).toContain('Origin');
    expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('x-demo-token');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });
  it.each(['https://other.example', 'http://localhost:3001.evil.example', 'null'])('does not allow %s', async denied => {
    const response = await createApp(stubStore()).request('/api/demo/reset', { method: 'OPTIONS', headers: { Origin: denied } });
    expect(response.status).toBe(204);
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    expect(response.headers.get('vary')).toContain('Origin');
  });
  it('uses a trimmed exact custom allowlist', async () => {
    const app = createApp(stubStore(), { origins: ' https://demo.example, https://other.example ' });
    const response = await app.request('/api/health', { headers: { Origin: 'https://demo.example' } });
    expect(response.headers.get('access-control-allow-origin')).toBe('https://demo.example');
    expect((await app.request('/api/health', { headers: { Origin: origin } })).headers.has('access-control-allow-origin')).toBe(false);
  });
  it('keeps CORS on unauthorized, validation, missing-route and internal errors', async () => {
    const store = stubStore();
    const token = 'test-only';
    const app = createApp(store, { token });
    for (const [path, headers, status] of [
      ['/api/demo/reset', { Origin: origin }, 401],
      ['/api/demo/jump?to=unknown', { Origin: origin, 'x-demo-token': token }, 400],
      ['/not-found', { Origin: origin }, 404],
    ] as const) {
      const response = await app.request(path, { method: 'POST', headers });
      expect(response.status).toBe(status);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    }
    vi.mocked(store.resetTo).mockRejectedValue(new Error('private database details'));
    const failed = await app.request('/api/demo/reset', { method: 'POST', headers: { Origin: origin, 'x-demo-token': token } });
    expect(failed.status).toBe(500);
    expect(failed.headers.get('access-control-allow-origin')).toBe(origin);
    expect(await failed.text()).not.toContain('private database details');
    expect((await createApp(store).request('/api/demo/reset', { method: 'POST' })).status).toBe(401);
  });
  it('serves both demo JPEGs and uploaded files publicly; does not expose the env file', async () => {
    const app = createApp(stubStore(), { uploadsRoot: uploads.root });
    for (const name of ['parcel_a.jpg', 'parcel_b_open.jpg']) {
      const response = await app.request(`/files/demo/${name}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('image/jpeg');
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect([...bytes.slice(0, 2)]).toEqual([255, 216]);
    }
    const directory = fileURLToPath(uploads.root);
    const filename = `test-${process.pid}.txt`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}${filename}`, 'upload fixture');
    try {
      expect(await (await app.request(`/files/${filename}`)).text()).toBe('upload fixture');
      expect((await app.request('/files/%2e%2e%2f.env')).status).toBe(404);
    } finally { await rm(`${directory}${filename}`); }
  });
});
