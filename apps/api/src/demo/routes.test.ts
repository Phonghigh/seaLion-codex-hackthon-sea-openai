import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import type { CaseStore } from '../store/CaseStore';
const state = { day: 0, now: '2026-10-31T02:00:00.000Z', scene: 'start' as const };
function setup(token = 'test-token') {
  const store: CaseStore = { reset: vi.fn().mockResolvedValue(state), jump: vi.fn().mockResolvedValue({ ...state, scene: 'demo2' }), advanceDay: vi.fn().mockResolvedValue({ ...state, day: 1, scene: 'advanced' }) };
  return { store, app: createApp({ store, demoToken: token, corsOrigins: ['http://localhost:3001'] }) };
}
describe('demo route authorization and results', () => {
  it('guards every mutation and disables mutations without configured token', async () => {
    const { app, store } = setup();
    for (const route of ['reset', 'jump?to=demo2', 'advance-day']) {
      const r = await app.request(`/api/demo/${route}`, { method: 'POST' });
      expect(r.status).toBe(401);
    }
    expect(store.reset).not.toHaveBeenCalled();
    expect(store.jump).not.toHaveBeenCalled();
    expect(store.advanceDay).not.toHaveBeenCalled();
    expect((await setup('').app.request('/api/demo/reset', { method: 'POST', headers: { 'x-demo-token': 'test-token' } })).status).toBe(503);
  });
  it('accepts the token, validates jump and returns results after store success', async () => {
    const { app, store } = setup();
    const init = { method: 'POST', headers: { 'x-demo-token': 'test-token' } };
    expect((await app.request('/api/demo/jump?to=bad', init)).status).toBe(400);
    expect(store.jump).not.toHaveBeenCalled();
    expect(await (await app.request('/api/demo/reset', init)).json()).toEqual({ ok: true, ...state });
    expect(await (await app.request('/api/demo/jump?to=demo2', init)).json()).toMatchObject({ ok: true, scene: 'demo2' });
    expect(await (await app.request('/api/demo/advance-day', init)).json()).toMatchObject({ ok: true, day: 1 });
  });
  it('preflights without a token and never reports success after a store failure', async () => {
    const { app, store } = setup();
    vi.mocked(store.reset).mockRejectedValue(new Error('private database detail'));
    const headers = { Origin: 'http://localhost:3001', 'x-demo-token': 'test-token' };
    const preflight = await app.request('/api/demo/reset', { method: 'OPTIONS', headers: { Origin: headers.Origin } });
    expect(preflight.status).toBe(204);
    const failed = await app.request('/api/demo/reset', { method: 'POST', headers });
    expect(failed.status).toBe(500);
    expect(failed.headers.get('access-control-allow-origin')).toBe(headers.Origin);
    expect(await failed.json()).toEqual({ ok: false, error: 'Internal server error' });
  });
});
