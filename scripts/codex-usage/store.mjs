import { mkdir, writeFile, rename, readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { join, relative, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validStoredEvent } from './events.mjs';

export async function localDirectory(root, ...parts) {
  if (parts.some((part) => !part || part === '.' || part === '..' || /[\\/]/.test(part) || isAbsolute(part))) {
    throw new Error('Invalid directory component');
  }
  const base = await realpath(root);
  let path = base;
  for (const part of parts) {
    path = join(path, part);
    await mkdir(path, { mode: 0o700 }).catch((error) => { if (error.code !== 'EEXIST') throw error; });
    const info = await lstat(path);
    const diff = relative(base, await realpath(path));
    if (info.isSymbolicLink() || !info.isDirectory() || isAbsolute(diff) || diff === '..' || diff.startsWith(`..${sep}`)) {
      throw new Error('Unsafe log directory');
    }
  }
  return path;
}

export async function record(root, event) {
  if (!validStoredEvent(event)) throw new Error('Invalid normalized event');
  const directory = await localDirectory(root, '.codex-usage', 'events');
  const delivery = randomUUID();
  const temp = join(directory, `${delivery}.tmp`);
  await writeFile(temp, `${JSON.stringify(event)}\n`, { flag: 'wx', mode: 0o600 });
  // A unique delivery filename allows atomic rename on Windows without links
  // or shared locks. Replayed logical IDs are deduplicated when reading.
  await rename(temp, join(directory, `${event.id}.${delivery}.json`));
}

export async function readEvents(root) {
  const directory = await localDirectory(root, '.codex-usage', 'events');
  const events = [];
  let invalid = 0;
  for (const file of await readdir(directory)) {
    if (!/^[a-f0-9]{64}(?:\.[a-f0-9-]{36})?\.json$/.test(file)) continue;
    try {
      const path = join(directory, file);
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 4 * 1024 * 1024) throw new Error('Invalid file');
      const item = JSON.parse(await readFile(path, 'utf8'));
      if (!validStoredEvent(item) || item.id !== file.split('.')[0]) throw new Error('Invalid event');
      events.push(item);
    } catch { invalid += 1; }
  }
  events.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at) || a.id.localeCompare(b.id));
  const seen = new Set();
  return { events: events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }), invalid };
}
