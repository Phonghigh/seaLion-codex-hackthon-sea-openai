import { expect, it, vi } from 'vitest';
import { readdir } from 'node:fs/promises';
import { createApp } from '../src/app';
import { isolatedDatabase } from './database';
import { createPostgresStore } from '../src/store/postgres';
import { isolatedUploads } from './uploads';

it.skipIf(!process.env.DATABASE_URL)('upload cleanup is unaffected by another app uploading at the same time', async () => {
  const db = await isolatedDatabase(process.env.DATABASE_URL!);
  const own = await isolatedUploads();
  const other = await isolatedUploads();
  let savedPath: string | undefined;
  try {
    const app = createApp(db.store, { token: 'test-only', uploadsRoot: own.root });
    const otherApp = createApp(createPostgresStore(db.db), { uploadsRoot: other.root });
    await app.request('/api/demo/jump?to=demo2', { method: 'POST', headers: { 'x-demo-token': 'test-only' } });
    const upload = () => { const body = new FormData(); body.set('conversation_id', 'CONV1'); body.set('file', new File(['image'], 'test.jpg', { type: 'image/jpeg' })); return { method: 'POST', body }; };
    const directory = own.root;
    const before = await readdir(directory);
    // Pin a valid interleaving: the unrelated upload commits while ours fails.
    vi.spyOn(db.store, 'transaction').mockImplementationOnce(async () => {
      const response = await otherApp.request('/api/upload', upload());
      expect(response.status).toBe(201);
      savedPath = (await response.json()).data.path;
      throw new Error('database unavailable');
    });
    expect((await app.request('/api/upload', upload())).status).toBe(500);
    expect(await readdir(directory)).toEqual(before);
    expect(await readdir(other.root)).toEqual([savedPath!.split('/').at(-1)]);
    expect((await otherApp.request(savedPath!)).status).toBe(200);
    expect((await app.request(savedPath!)).status).toBe(404);
    // Customer evidence now starts a background triage job. Let it finish before disposing its DB.
    await vi.waitFor(async () => expect((await (await otherApp.request('/api/conversations/CONV1')).json()).data.triage_pending).toBe(false));
  } finally {
    await own.close();
    await other.close();
    await db.close();
  }
});
