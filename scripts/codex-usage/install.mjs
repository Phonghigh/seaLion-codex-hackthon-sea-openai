import { readFile, writeFile, mkdir, lstat, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { hookEvents } from './events.mjs';
import { localDirectory } from './store.mjs';

export function hookCommand(event) {
  if (!hookEvents.includes(event)) throw new Error('Unsupported hook event');
  // A shared command must work on every developer's checkout, even from a
  // subdirectory. All shell text is constant; no input/path is interpolated.
  const launcher = "const e=process.argv[1],fail=()=>{process.stderr.write('Team prompt recorder failed; fix the recorder before retrying.\\n');process.exitCode=e==='UserPromptSubmit'?2:1};"
    + "try{let p=require('node:path'),f=require('node:fs'),r=process.cwd(),s;"
    + "while(f.existsSync(s=p.join(r,'scripts/codex-usage/cli.mjs'))===false){"
    + "let u=p.dirname(r);if(u===r)throw Error('Usage recorder missing');r=u}"
    + "process.argv=[process.execPath,s,'hook',e];"
    + "import(require('node:url').pathToFileURL(s).href).catch(fail)}catch{fail()}";
  return `node -e "${launcher}" ${event}`;
}

export function mergeHooks(existing) {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) throw new Error('Invalid hooks configuration');
  const config = structuredClone(existing);
  config.hooks ??= {};
  if (typeof config.hooks !== 'object' || Array.isArray(config.hooks)) throw new Error('Invalid hooks configuration');
  for (const event of hookEvents) {
    const command = hookCommand(event);
    config.hooks[event] ??= [];
    if (!Array.isArray(config.hooks[event])) throw new Error('Invalid hooks event');
    // Replace our former machine-specific handlers; preserve other team hooks.
    config.hooks[event] = config.hooks[event].map((group) => {
      if (!Array.isArray(group.hooks)) throw new Error('Invalid hooks group');
      return { ...group, hooks: group.hooks.filter((handler) => handler.command !== command
        && !(handler.type === 'command' && /^node "[^"\r\n]*[\\/]scripts[\\/]codex-usage[\\/]cli\.mjs" hook$/.test(handler.command))) };
    }).filter((group) => group.hooks.length);
    config.hooks[event].push({ hooks: [{ type: 'command', command, timeout: ['Interrupt', 'SessionEnd'].includes(event) ? 3 : 10 }] });
  }
  return config;
}

export async function install(root) {
  const directory = join(root, '.codex');
  await mkdir(directory, { recursive: true });
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('Refusing linked configuration directory');
  const target = join(directory, 'hooks.json');
  let previous = null;
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error('Refusing linked configuration file');
    previous = await readFile(target, 'utf8');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const merged = mergeHooks(previous === null ? {} : JSON.parse(previous));
  const next = `${JSON.stringify(merged, null, 2)}\n`;
  if (previous === next) return;
  if (previous !== null) {
    const backup = await localDirectory(root, '.codex-usage', 'local');
    await writeFile(join(backup, `hooks-backup-${Date.now()}.json`), previous, { flag: 'wx', mode: 0o600 });
  }
  const temp = join(directory, `hooks-${randomUUID()}.tmp`);
  await writeFile(temp, next, { flag: 'wx', mode: 0o600 });
  await rename(temp, target);
}
