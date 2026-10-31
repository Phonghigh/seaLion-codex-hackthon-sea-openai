import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function isolatedUploads() {
  const directory = await mkdtemp(join(tmpdir(), 'seapilot-test-uploads-'));
  return { root: pathToFileURL(`${directory}/`), close: () => rm(directory, { recursive: true, force: true }) };
}
