#!/usr/bin/env node
import { writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hookEvents, normalizeHook, normalizeManual } from './events.mjs';
import { record, readEvents, localDirectory } from './store.mjs';
import { buildReport, renderMarkdown } from './report.mjs';
import { install } from './install.mjs';

// Output location comes from this checked-out script, never from hook stdin.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [command = 'help', ...args] = process.argv.slice(2);
let isPromptHook = command === 'hook' && args[0] === 'UserPromptSubmit';

async function stdinJson() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error('Hook input exceeds 2 MiB');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
}

async function exportReport() {
  let includePrompts = true;
  let output = 'docs/codex-usage-report';
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--include-prompts') includePrompts = true;
    else if (args[index] === '--metadata-only') includePrompts = false;
    else if (args[index] === '--out' && args[index + 1] && !args[index + 1].startsWith('--')) output = args[++index];
    else throw new Error('Usage: report [--metadata-only] [--out <path-prefix>]');
  }
  const prefix = resolve(root, output);
  const rel = relative(root, prefix);
  if (!rel || isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('Report output must stay inside the repository');
  if (rel.split(sep).some((part) => /[. ]$/.test(part) || ['.git', '.codex', '.agents'].includes(part.toLowerCase()))) throw new Error('Invalid report directory');
  await localDirectory(root, ...relative(root, dirname(prefix)).split(sep).filter(Boolean));
  for (const extension of ['md', 'json']) {
    try {
      if ((await lstat(`${prefix}.${extension}`)).isSymbolicLink()) throw new Error('Refusing linked report output');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const { events, invalid } = await readEvents(root);
  const report = buildReport(events, { invalid, includePrompts });
  await writeFile(`${prefix}.md`, renderMarkdown(report), { mode: 0o600 });
  await writeFile(`${prefix}.json`, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(`Report written: ${relative(root, prefix)}.{md,json}; ${report.totals.hook_events} observed hook events; ${invalid} invalid files skipped.`);
}

try {
  if (command === 'hook') {
    if (args.length > 1 || (args[0] && !hookEvents.includes(args[0]))) throw new Error('Unexpected hook arguments');
    const input = await stdinJson();
    isPromptHook ||= input?.hook_event_name === 'UserPromptSubmit';
    if (args[0] && input?.hook_event_name !== args[0]) throw new Error('Mismatched hook event');
    await record(root, normalizeHook(input, root));
    // Empty decisions: do not approve, deny, rewrite, or continue agent work.
    process.stdout.write('{}\n');
  } else if (command === 'install') {
    if (args.length) throw new Error('Unexpected install arguments');
    await install(root);
    console.log('Repository hooks configured. Open Codex /hooks, review and trust them, then start a new turn. Nothing has been auto-trusted.');
  } else if (command === 'manual') {
    if (args.length) throw new Error('Unexpected manual arguments');
    await record(root, normalizeManual(await stdinJson()));
    console.log('Saved a self-reported entry; excluded from automatic tool counts.');
  } else if (command === 'report') {
    await exportReport();
  } else if (command === 'status') {
    if (args.length) throw new Error('Unexpected status arguments');
    const { events, invalid } = await readEvents(root);
    const hooks = events.filter((event) => event.source === 'codex_hook');
    console.log(JSON.stringify({ observed_hook_events: hooks.length, manual_entries: events.length - hooks.length,
      latest_hook_at: hooks.at(-1)?.recorded_at ?? null, invalid_files: invalid,
      trust: 'not inspected; check /hooks in Codex' }, null, 2));
  } else if (command === 'help') {
    console.log('Public team Codex usage evidence (Node.js 20+)\n  install\n  hook [event-name] < event.json\n  status\n  manual < entry.json\n  report [--metadata-only] [--out docs/codex-usage-report]\nSee docs/codex-usage.md.');
  } else throw new Error('Unknown command');
} catch {
  // Never echo stdin, commands, paths, credentials, or raw parser errors.
  if (command === 'hook') {
    if (isPromptHook) {
      process.stdout.write('{"decision":"block","reason":"Team policy requires a public redacted prompt log. Recording failed; fix the recorder/input and submit the prompt again."}\n');
    } else {
      process.stdout.write('{"systemMessage":"Codex usage recorder could not save this event. Check local setup/input; this event is absent from the report."}\n');
    }
  } else {
    console.error('Codex usage command failed. Check arguments, JSON fields, directory permissions and docs/codex-usage.md.');
    process.exitCode = 1;
  }
}
