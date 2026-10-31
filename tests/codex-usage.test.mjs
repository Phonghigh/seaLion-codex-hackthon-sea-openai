import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, digest, hookEvents, inProject, normalizeHook, normalizeManual, outcome, validStoredEvent } from '../scripts/codex-usage/events.mjs';
import { hookCommand, install, mergeHooks } from '../scripts/codex-usage/install.mjs';
import { label, preview, redactText } from '../scripts/codex-usage/privacy.mjs';
import { buildReport, renderMarkdown } from '../scripts/codex-usage/report.mjs';
import { localDirectory, readEvents, record } from '../scripts/codex-usage/store.mjs';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '../scripts/codex-usage');
const now = '2026-10-31T06:00:00.000Z';
const fixtureRoot = resolve(tmpdir(), 'codex-usage-synthetic-project');

function hook(overrides = {}, root = fixtureRoot) {
  return normalizeHook({
    hook_event_name: 'PreToolUse', cwd: root, session_id: 'synthetic-session',
    turn_id: 'synthetic-turn', tool_use_id: 'synthetic-call', tool_name: 'exec_command',
    tool_input: { command: 'echo synthetic' }, ...overrides,
  }, root, now);
}

function manual(overrides = {}) {
  return normalizeManual({
    service: 'ChatGPT', tool: 'web_search', note: 'Synthetic self-reported research',
    occurred_at: '2026-10-31T13:00:00+07:00', ...overrides,
  }, now);
}

async function sandbox(t, withCli = false) {
  // Short prefix also exercises Windows hosts with the legacy MAX_PATH limit.
  const root = await mkdtemp(join(tmpdir(), 'sph-'));
  t.after(async () => {
    assert.ok(root.startsWith(join(tmpdir(), 'sph-')));
    await rm(root, { recursive: true, force: true });
  });
  if (withCli) await cp(scripts, join(root, 'scripts', 'codex-usage'), { recursive: true });
  return root;
}

async function runProcess(command, args, cwd, input = '') {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolveResult({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

const cli = (root, args, input = '') => runProcess(process.execPath,
  [join(root, 'scripts', 'codex-usage', 'cli.mjs'), ...args], root, input);

const runHookCommand = (command, cwd, input) => process.platform === 'win32'
  ? runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${command}; exit $LASTEXITCODE`], cwd, input)
  : runProcess('/bin/sh', ['-c', command], cwd, input);

test('redacts nested object secrets while preserving Vietnamese prompt text', () => {
  const result = preview({ prompt: 'Hãy kiểm tra đơn hàng và ảnh chiếc mũ 🧢', nested: {
    password: 'synthetic-password', API_KEY: 'synthetic-api-value', Authorization: 'synthetic-auth',
    service_role: 'synthetic-role', sessionToken: 'synthetic-token', ordinary: 'giữ nguyên',
  } });
  const parsed = JSON.parse(result.text);
  assert.equal(parsed.prompt, 'Hãy kiểm tra đơn hàng và ảnh chiếc mũ 🧢');
  assert.equal(parsed.nested.ordinary, 'giữ nguyên');
  assert.deepEqual(Object.values(parsed.nested).slice(0, 5), Array(5).fill('[REDACTED]'));
  assert.equal(result.truncated, false);
});

test('redacts bearer tokens, credential URLs, private keys, emails and home names', () => {
  const source = [
    'Bearer synthetic.bearer.value',
    'postgresql://synthetic-user:synthetic-password@example.test:5432/db?access=synthetic-query#synthetic-fragment',
    '-----BEGIN PRIVATE KEY-----\nsynthetic-private-body\n-----END PRIVATE KEY-----',
    'Liên hệ synthetic-person@example.test',
    'C:\\Users\\synthetic-user\\project /home/synthetic-user/project',
    'api_key="synthetic quoted value"',
  ].join('\n');
  const result = redactText(source);
  for (const secret of ['synthetic.bearer', 'synthetic-user', 'synthetic-password', 'synthetic-query',
    'synthetic-fragment', 'synthetic-private-body', 'synthetic-person', 'synthetic quoted value']) {
    assert.ok(!result.includes(secret), `Leaked ${secret}`);
  }
  assert.match(result, /Liên hệ/);
  assert.match(result, /\[REDACTED PRIVATE KEY\]/);
  assert.match(result, /\[REDACTED EMAIL\]/);
});

test('redacts Basic authentication payloads in raw text', () => {
  const encoded = Buffer.from('synthetic-user:synthetic-password').toString('base64');
  for (const source of [`Basic ${encoded}`, `Authorization: Basic ${encoded}`, `authorization=Basic ${encoded}`]) {
    assert.equal(redactText(source).includes(encoded), false);
  }
});

test('redacts repeated sensitive keys and nested raw command assignments without excessive backtracking', () => {
  const repeatedKey = 'password'.repeat(250_000);
  const started = performance.now();
  assert.ok(redactText(repeatedKey) === repeatedKey, 'Unassigned prose must remain unchanged');
  const assigned = redactText(`${repeatedKey}=synthetic-secret`);
  assert.ok(assigned === `${repeatedKey}=[REDACTED]`, 'The entire repeated key must match once');
  // Generous bound: protects the hook timeout while tolerating slow CI hosts.
  assert.ok(performance.now() - started < 3_000, 'Redaction should finish well within the hook timeout');
  const rawCommands = [
    '{"command":"echo token=synthetic-nested-secret; echo giữ-nguyên"}',
    JSON.stringify({ command: "$env:OPENAI_API_KEY='synthetic-env-secret'; Write-Host 'giữ-nguyên'" }),
  ];
  for (const raw of rawCommands) {
    const redacted = redactText(raw);
    assert.equal(/synthetic-(nested|env)-secret/.test(redacted), false);
    assert.match(redacted, /\[REDACTED\]/);
    assert.match(redacted, /command/);
    assert.match(redacted, /giữ-nguyên/);
  }
});

test('bounds prompt size and depth, handles missing values and rejects unsafe labels', () => {
  assert.equal(preview(undefined), null);
  assert.equal(preview(null), null);
  assert.deepEqual(preview('a'.repeat(20_001)), { text: 'a'.repeat(20_000), truncated: true });
  const cyclic = {};
  cyclic.self = cyclic;
  assert.match(preview(cyclic).text, /DEPTH LIMIT/);
  assert.equal(label('<script>unsafe</script>'), 'unknown');
  assert.equal(label('mcp__example__tool'), 'mcp__example__tool');
});

test('validates hook shape, event fields and repository containment', () => {
  for (const input of [null, [], {}, { hook_event_name: 'UnknownEvent' }]) {
    assert.throws(() => normalizeHook(input, fixtureRoot));
  }
  for (const patch of [{ session_id: '' }, { tool_use_id: null }, { tool_name: 123 },
    { cwd: resolve(fixtureRoot, '..', 'other-project') }, { cwd: 'relative/path' },
    { hook_event_name: 'UserPromptSubmit', prompt: 123 }]) {
    assert.throws(() => hook(patch));
  }
  assert.equal(inProject(fixtureRoot, join(fixtureRoot, 'nested')), true);
  assert.equal(inProject(fixtureRoot, `${fixtureRoot}-sibling`), false);
  assert.equal(inProject(fixtureRoot, join(fixtureRoot, '..')), false);
  assert.equal(inProject(fixtureRoot, null), false);
  const event = hook();
  assert.equal(validStoredEvent(event), true);
  assert.equal(event.session, digest('synthetic-session'));
  assert.equal(event.call, digest('synthetic-call'));
  assert.equal(JSON.stringify(event).includes('synthetic-session'), false);
  for (const patch of [{ recorded_at: '2026-10-31' }, { session: null }, { agent: 'raw-agent' },
    { source: 'user_reported' }, { call: null }, { status: 'success' },
    { input: { text: 'a'.repeat(20_001), truncated: false } }]) {
    assert.equal(validStoredEvent({ ...event, ...patch }), false, JSON.stringify(Object.keys(patch)));
  }
});

test('classifies transport explicitly and leaves unfamiliar tool names unknown', () => {
  for (const [tool, category] of [
    ['functions.exec', 'orchestration'], ['wait', 'orchestration'],
    ['exec_command', 'codex_builtin'], ['mcp__codex_app__open_in_codex', 'codex_app'],
    ['mcp__codex_apps__github__search', 'mcp_external'], ['mcp__example__tool', 'mcp_external'],
    ['web__run', 'openai_tool'], ['image_gen.imagegen', 'openai_tool'],
    ['UnfamiliarCustomTool', 'unknown'],
  ]) assert.equal(classify(tool), category, tool);
  assert.match(buildReport([]).coverage.limitations.join('\n'), /MCP is a connection type/);
});

test('records only explicit success/error signals, not arbitrary result text', () => {
  for (const [response, status] of [
    [{ exit_code: 0 }, 'success'], [{ exit_code: 1 }, 'error'],
    [{ isError: true }, 'error'], [{ is_error: false }, 'success'],
    ['done', 'unknown'], [{ message: 'success' }, 'unknown'], [null, 'unknown'],
  ]) assert.equal(outcome(response), status);
});

test('counts pre/post pairs once and distinguishes missing, unknown and failed results', () => {
  const events = [hook(), hook({ hook_event_name: 'PostToolUse', tool_response: { exit_code: 0 } }),
    hook({ tool_use_id: 'missing-result' }),
    hook({ hook_event_name: 'PostToolUse', tool_use_id: 'unknown-result', tool_response: 'done' }),
    hook({ hook_event_name: 'PostToolUse', tool_use_id: 'failed-result', tool_response: { isError: true } }),
    hook({ session_id: 'another-session' }),
  ];
  const report = buildReport(events, { generatedAt: now });
  assert.equal(report.totals.tool_invocations, 5);
  assert.equal(report.totals.tool_results, 3);
  assert.deepEqual(report.tools[0], {
    tool: 'exec_command', category: 'codex_builtin', invocations: 5, starts_observed: 3,
    results_observed: 3, success_signals: 1, error_signals: 1, unknown_results: 1, no_result_observed: 2,
  });
});

test('manual entries retain unverified provenance and stay outside automatic counts', () => {
  const entry = manual({ prompt: 'Tìm tài liệu tiếng Việt', note: 'customer email synthetic-person@example.test' });
  assert.equal(entry.source, 'user_reported');
  assert.equal(entry.status, 'unverified');
  assert.equal(entry.occurred_at, now);
  const report = buildReport([entry], { includePrompts: true, generatedAt: now });
  assert.equal(report.totals.tool_invocations, 0);
  assert.equal(report.totals.hook_events, 0);
  assert.equal(report.totals.manual_entries, 1);
  assert.equal(report.manual_entries[0].status, 'unverified');
  assert.match(report.manual_entries[0].note.text, /\[REDACTED EMAIL\]/);
  for (const patch of [{ service: '' }, { tool: '' }, { note: '' }, { prompt: {} },
    { occurred_at: '2026-10-31' }, { occurred_at: 'not a date' }]) {
    assert.throws(() => manual(patch));
  }
});

test('report omits prompt and manual content by default and safely indents review excerpts', () => {
  const content = '# synthetic-heading\n```\n<script>alert("synthetic")</script>\n| injected | row |';
  const event = hook({ hook_event_name: 'UserPromptSubmit', prompt: content });
  const report = buildReport([event, manual({ prompt: content, note: content })], { generatedAt: now });
  assert.equal(JSON.stringify(report).includes('synthetic-heading'), false);
  const included = buildReport([event, manual({ prompt: content, note: content })], { includePrompts: true, generatedAt: now });
  const markdown = renderMarkdown(included);
  assert.ok(markdown.includes('    # synthetic-heading'));
  assert.ok(markdown.includes('    <script>'));
  assert.ok(!markdown.includes('\n# synthetic-heading'));
  assert.ok(!markdown.includes('\n<script>'));
  assert.ok(!markdown.includes('\n| injected'));
  included.models = ['<script>|`unsafe`'];
  assert.match(renderMarkdown(included), /&lt;script&gt;&#124;&#96;unsafe&#96;/);
});

test('duplicate tool event delivery is idempotent and preserves its earliest timestamp', async (t) => {
  const root = await sandbox(t);
  const event = hook({}, root);
  await record(root, event);
  await record(root, { ...event, recorded_at: '2026-10-31T07:00:00.000Z' });
  const data = await readEvents(root);
  assert.equal(data.events.length, 1);
  assert.equal(data.invalid, 0);
  assert.equal(data.events.find((item) => item.id === event.id).recorded_at, now);
  assert.equal((await readdir(join(root, '.codex-usage', 'events'))).some((name) => name.endsWith('.tmp')), false);
});

test('every received prompt is retained even when identical text repeats in the same turn', async (t) => {
  const root = await sandbox(t);
  const initial = hook({ hook_event_name: 'UserPromptSubmit', prompt: 'Kiểm tra đơn hàng DH001' }, root);
  const steering = hook({ hook_event_name: 'UserPromptSubmit', prompt: 'Chỉ kiểm tra kiện B của đơn DH001' }, root);
  const replay = hook({ hook_event_name: 'UserPromptSubmit', prompt: 'Kiểm tra đơn hàng DH001' }, root);
  assert.equal(initial.turn, steering.turn);
  assert.notEqual(initial.id, steering.id);
  assert.notEqual(initial.id, replay.id);
  for (const event of [initial, steering, replay]) await record(root, event);
  const { events, invalid } = await readEvents(root);
  assert.equal(invalid, 0);
  assert.equal(events.length, 3);
  assert.deepEqual(new Set(events.map((event) => event.prompt.text)), new Set([initial.prompt.text, steering.prompt.text]));
  assert.equal(events.filter((event) => event.prompt.text === initial.prompt.text).length, 2);
  assert.equal(buildReport(events).totals.prompts, 3);
});

test('rejects invalid normalized events and skips malformed, mismatched or oversize files', async (t) => {
  const root = await sandbox(t);
  await assert.rejects(record(root, { ...hook({}, root), id: '../escape' }), /Invalid normalized event/);
  await record(root, hook({}, root));
  const directory = join(root, '.codex-usage', 'events');
  await writeFile(join(directory, `${digest('malformed')}.json`), '{malformed');
  await writeFile(join(directory, `${digest('wrong-name')}.json`), JSON.stringify(hook({}, root)));
  await writeFile(join(directory, `${digest('oversize')}.json`), 'a'.repeat(4 * 1024 * 1024 + 1));
  await writeFile(join(directory, 'ignored.tmp'), '{incomplete');
  const data = await readEvents(root);
  assert.equal(data.events.length, 1);
  assert.equal(data.invalid, 3);
});

test('refuses directory traversal before creating directories outside the root', async (t) => {
  const root = await sandbox(t);
  await assert.rejects(localDirectory(root, '..'), /Invalid directory component|Unsafe log directory/);
  const nestedRoot = join(root, 'project');
  await mkdir(nestedRoot);
  await assert.rejects(localDirectory(nestedRoot, join('..', 'outside-project')), /Invalid directory component|Unsafe log directory/);
  await assert.rejects(lstat(join(root, 'outside-project')), { code: 'ENOENT' });
});

test('refuses linked log directories', async (t) => {
  const root = await sandbox(t);
  const outside = await sandbox(t);
  try {
    await symlink(outside, join(root, '.codex-usage'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
      t.skip(`Environment cannot create symbolic links: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(record(root, hook({}, root)), /Unsafe log directory/);
  assert.deepEqual(await readdir(outside), []);
});

test('mergeHooks preserves existing configuration and is idempotent', () => {
  const existing = { metadata: { custom: true }, hooks: {
    PreToolUse: [{ matcher: 'synthetic', hooks: [{ type: 'command', command: 'echo existing' }] }],
    CustomEvent: [{ hooks: [{ type: 'command', command: 'echo custom' }] }],
  } };
  const before = structuredClone(existing);
  const merged = mergeHooks(existing);
  assert.deepEqual(existing, before);
  assert.deepEqual(merged.metadata, before.metadata);
  assert.deepEqual(merged.hooks.CustomEvent, before.hooks.CustomEvent);
  assert.deepEqual(merged.hooks.PreToolUse[0], before.hooks.PreToolUse[0]);
  for (const name of hookEvents) {
    const recorderHandlers = merged.hooks[name].flatMap((group) => group.hooks).filter((handler) => handler.command === hookCommand(name));
    assert.equal(recorderHandlers.length, 1);
    assert.equal(recorderHandlers[0].timeout, ['SessionEnd', 'Interrupt'].includes(name) ? 3 : 10);
  }
  assert.deepEqual(mergeHooks(merged), merged);
  assert.throws(() => mergeHooks([]));
  assert.throws(() => mergeHooks({ hooks: [] }));
  assert.throws(() => mergeHooks({ hooks: { PreToolUse: 'invalid' } }));
});

test('mergeHooks migrates legacy recorder commands without removing unrelated handlers', () => {
  const legacy = 'node "D:/synthetic-old-clone/scripts/codex-usage/cli.mjs" hook';
  const unrelated = { type: 'command', command: 'node "./scripts/unrelated.mjs"' };
  const existing = { hooks: { UserPromptSubmit: [{ hooks: [
    { type: 'command', command: legacy, timeout: 10 }, unrelated,
  ] }] } };
  const merged = mergeHooks(existing);
  const handlers = merged.hooks.UserPromptSubmit.flatMap((group) => group.hooks);
  assert.equal(handlers.some((handler) => handler.command === legacy), false);
  assert.equal(handlers.filter((handler) => handler.command === hookCommand('UserPromptSubmit')).length, 1);
  assert.ok(handlers.some((handler) => JSON.stringify(handler) === JSON.stringify(unrelated)));
  assert.deepEqual(mergeHooks(merged), merged);
});

test('installation preserves and backs up old hooks, then leaves repeated install unchanged', async (t) => {
  const root = await sandbox(t);
  await mkdir(join(root, '.codex'));
  const previous = JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'echo existing' }] }] } });
  await writeFile(join(root, '.codex', 'hooks.json'), previous);
  await install(root);
  const first = await readFile(join(root, '.codex', 'hooks.json'), 'utf8');
  await install(root);
  assert.equal(await readFile(join(root, '.codex', 'hooks.json'), 'utf8'), first);
  const backups = (await readdir(join(root, '.codex-usage', 'local'))).filter((name) => name.startsWith('hooks-backup-'));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(join(root, '.codex-usage', 'local', backups[0]), 'utf8'), previous);
});

test('portable installed hooks match across clone locations and execute from nested cwd', async (t) => {
  const firstRoot = await sandbox(t, true);
  const secondRoot = await sandbox(t, true);
  await install(firstRoot);
  await install(secondRoot);
  const firstConfig = await readFile(join(firstRoot, '.codex', 'hooks.json'), 'utf8');
  const secondConfig = await readFile(join(secondRoot, '.codex', 'hooks.json'), 'utf8');
  assert.equal(firstConfig, secondConfig);
  assert.equal(firstConfig.includes(firstRoot.replace(/\\/g, '/')), false);
  assert.equal(firstConfig.includes(firstRoot), false);
  const command = JSON.parse(firstConfig).hooks.UserPromptSubmit.flatMap((group) => group.hooks)[0].command;
  const nested = join(firstRoot, 'app', 'nested folder');
  await mkdir(nested, { recursive: true });
  const payload = { hook_event_name: 'UserPromptSubmit', cwd: nested,
    session_id: 'portable-synthetic-session', turn_id: 'portable-synthetic-turn', prompt: 'Synthetic portable prompt' };
  const result = await runHookCommand(command, nested, JSON.stringify(payload));
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {});
  const data = await readEvents(firstRoot);
  assert.equal(data.events.length, 1);
  assert.equal(data.events[0].prompt.text, payload.prompt);
});

test('portable prompt launcher blocks missing or broken recorder startup without exposing errors', async (t) => {
  const missingRoot = await sandbox(t);
  const brokenRoot = await sandbox(t, true);
  await writeFile(join(brokenRoot, 'scripts', 'codex-usage', 'cli.mjs'), "throw new Error('synthetic-private-import-error');\n");
  for (const root of [missingRoot, brokenRoot]) {
    const result = await runHookCommand(hookCommand('UserPromptSubmit'), root, '{synthetic-private-input');
    assert.equal(result.code, 2, result.stderr);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.length > 0);
    assert.equal(result.stderr.includes('synthetic-private'), false);
    assert.equal(result.stderr.includes(root), false);
  }
});

test('public event/report/config files are trackable while local raw staging and temporary files stay ignored', async () => {
  const publicPaths = ['.codex/hooks.json', '.codex-usage/events/synthetic.json',
    '.codex-usage/reports/latest.md', '.codex-usage/reports/latest.json',
    'docs/codex-usage-report.md', 'docs/codex-usage-report.json'];
  const privatePaths = ['.codex-usage/local/raw-synthetic.json', '.codex-usage/local/backup.json',
    '.codex-usage/events/synthetic.tmp', '.codex/hooks-synthetic.tmp', '.env.local'];
  const result = await runProcess('git', ['check-ignore', '--no-index', '--stdin', '-z'],
    resolve(scripts, '../..'), [...publicPaths, ...privatePaths].join('\0') + '\0');
  assert.ok([0, 1].includes(result.code), result.stderr);
  const ignored = new Set(result.stdout.split('\0').filter(Boolean));
  for (const path of publicPaths) assert.equal(ignored.has(path), false, `Must be trackable: ${path}`);
  for (const path of privatePaths) assert.equal(ignored.has(path), true, `Must stay ignored: ${path}`);
});

test('CLI malformed stdin fails open without leaking input, status stays empty', async (t) => {
  const root = await sandbox(t, true);
  const result = await cli(root, ['hook'], '{malformed-synthetic-private-input');
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(typeof JSON.parse(result.stdout).systemMessage, 'string');
  assert.equal(result.stdout.includes('synthetic-private-input'), false);
  const status = await cli(root, ['status']);
  assert.equal(status.code, 0);
  assert.equal(JSON.parse(status.stdout).observed_hook_events, 0);
  assert.equal(JSON.parse(status.stdout).latest_hook_at, null);
  const manualFailure = await cli(root, ['manual'], '{malformed-synthetic-private-input');
  assert.equal(manualFailure.code, 1);
  assert.equal(manualFailure.stderr.includes('synthetic-private-input'), false);
});

test('configured prompt hook blocks malformed or mismatched capture without exposing input', async (t) => {
  const root = await sandbox(t, true);
  const validPayload = { hook_event_name: 'UserPromptSubmit', cwd: root,
    session_id: 'synthetic-session', turn_id: 'synthetic-turn', prompt: 'synthetic-private-prompt' };
  for (const input of ['{malformed-synthetic-private-input', JSON.stringify({ ...validPayload, session_id: '' }),
    JSON.stringify({ ...validPayload, hook_event_name: 'SessionEnd' }),
    JSON.stringify({ ...validPayload, cwd: resolve(root, '..', 'other-project') })]) {
    const result = await cli(root, ['hook', 'UserPromptSubmit'], input);
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout).decision, 'block');
    assert.equal(result.stdout.includes('synthetic-private'), false);
    assert.equal(result.stderr, '');
  }
  assert.equal((await readEvents(root)).events.length, 0);
  const toolFailure = await cli(root, ['hook', 'PostToolUse'], '{malformed-synthetic-private-input');
  assert.equal(toolFailure.code, 0);
  assert.equal(JSON.parse(toolFailure.stdout).decision, undefined);
  assert.equal(typeof JSON.parse(toolFailure.stdout).systemMessage, 'string');
});

test('configured prompt hook blocks storage failure and allows work after prompt persists', async (t) => {
  const root = await sandbox(t, true);
  const payload = { hook_event_name: 'UserPromptSubmit', cwd: root,
    session_id: 'synthetic-session', turn_id: 'synthetic-turn', prompt: 'synthetic-private-prompt' };
  await writeFile(join(root, '.codex-usage'), 'synthetic storage obstruction');
  const blocked = await cli(root, ['hook', 'UserPromptSubmit'], JSON.stringify(payload));
  assert.equal(blocked.code, 0);
  assert.equal(JSON.parse(blocked.stdout).decision, 'block');
  assert.equal(blocked.stdout.includes(payload.prompt), false);
  await rm(join(root, '.codex-usage'));
  const allowed = await cli(root, ['hook', 'UserPromptSubmit'], JSON.stringify(payload));
  assert.equal(allowed.code, 0);
  assert.deepEqual(JSON.parse(allowed.stdout), {});
  const data = await readEvents(root);
  assert.equal(data.events.length, 1);
  assert.equal(data.events[0].prompt.text, payload.prompt);
});

test('prompt capture and public reports preserve redacted content longer than tool previews', async (t) => {
  const root = await sandbox(t, true);
  const prompt = `${'Nội dung phát triển được lưu đầy đủ. '.repeat(1_000)}\napi_key=synthetic-private-key\nKết thúc prompt`;
  assert.ok(prompt.length > 20_000);
  const payload = { hook_event_name: 'UserPromptSubmit', cwd: root,
    session_id: 'synthetic-session', turn_id: 'synthetic-turn', prompt };
  const captured = await cli(root, ['hook', 'UserPromptSubmit'], JSON.stringify(payload));
  assert.equal(captured.code, 0, captured.stderr);
  assert.deepEqual(JSON.parse(captured.stdout), {});
  const { events } = await readEvents(root);
  assert.equal(events.length, 1);
  assert.equal(events[0].prompt.truncated, false);
  assert.equal(events[0].prompt.text, redactText(prompt));
  assert.match(events[0].prompt.text, /Kết thúc prompt$/);
  const exported = await cli(root, ['report']);
  assert.equal(exported.code, 0, exported.stderr);
  const report = JSON.parse(await readFile(join(root, 'docs', 'codex-usage-report.json'), 'utf8'));
  assert.equal(report.prompts[0].content.text, events[0].prompt.text);
  assert.equal(report.prompts[0].capture_truncated, false);
  assert.equal(report.prompts[0].content.truncated, false);
  assert.equal(JSON.stringify(report).includes('synthetic-private-key'), false);
});

test('prompt hook blocks redaction expansion beyond the capture limit instead of storing a truncated prompt', async (t) => {
  const root = await sandbox(t, true);
  const prompt = `${'a@b.co '.repeat(125_000)}SYNTHETIC-END`;
  const payload = { hook_event_name: 'UserPromptSubmit', cwd: root,
    session_id: 'synthetic-session', turn_id: 'synthetic-turn', prompt };
  assert.ok(Buffer.byteLength(JSON.stringify(payload), 'utf8') < 2 * 1024 * 1024);
  assert.throws(() => normalizeHook(payload, root, now));
  const result = await cli(root, ['hook', 'UserPromptSubmit'], JSON.stringify(payload));
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  assert.equal(result.stdout.includes('a@b.co'), false);
  assert.equal(result.stdout.includes('SYNTHETIC-END'), false);
  assert.equal((await readEvents(root)).events.length, 0);
});

test('concurrent subprocess hooks keep all events intact and duplicate calls count once', async (t) => {
  const root = await sandbox(t, true);
  const payload = {
    hook_event_name: 'PreToolUse', cwd: root, session_id: 'concurrent-synthetic-session',
    turn_id: 'concurrent-synthetic-turn', tool_name: 'exec_command', tool_input: { command: 'synthetic' },
  };
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => cli(root, ['hook'], JSON.stringify({
    ...payload, tool_use_id: `call-${index % 6}`,
  }))));
  for (const result of results) {
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.stdout), {});
  }
  const data = await readEvents(root);
  assert.equal(data.events.length, 6);
  assert.equal(data.invalid, 0);
  assert.equal(buildReport(data.events).totals.tool_invocations, 6);
  const files = await readdir(join(root, '.codex-usage', 'events'));
  assert.equal(files.some((name) => name.endsWith('.tmp')), false);
  for (const file of files) {
    assert.equal(validStoredEvent(JSON.parse(await readFile(join(root, '.codex-usage', 'events', file), 'utf8'))), true);
  }
});

test('CLI report enforces project boundaries and produces counts from synthetic hooks', async (t) => {
  const root = await sandbox(t, true);
  const outside = await cli(root, ['report', '--out', '../escape-report']);
  assert.equal(outside.code, 1);
  for (const directory of ['.git', '.GIT', '.CoDeX', '.AgEnTs']) {
    assert.equal((await cli(root, ['report', '--out', `${directory}/unsafe`])).code, 1, directory);
  }
  await record(root, hook({}, root));
  const result = await cli(root, ['report', '--out', 'docs/synthetic-report']);
  assert.equal(result.code, 0);
  const report = JSON.parse(await readFile(join(root, 'docs', 'synthetic-report.json'), 'utf8'));
  assert.equal(report.totals.tool_invocations, 1);
  assert.equal(report.content_included, true);
  assert.match(await readFile(join(root, 'docs', 'synthetic-report.md'), 'utf8'), /Observed tools/);
  assert.equal((await lstat(join(root, 'docs', 'synthetic-report.json'))).isFile(), true);
});

test('CLI report includes redacted prompts by default and supports metadata-only export', async (t) => {
  const root = await sandbox(t, true);
  await record(root, hook({ hook_event_name: 'UserPromptSubmit',
    prompt: 'Synthetic public prompt; api_key=synthetic-private-key' }, root));
  const result = await cli(root, ['report']);
  assert.equal(result.code, 0, result.stderr);
  const publicReport = JSON.parse(await readFile(join(root, 'docs', 'codex-usage-report.json'), 'utf8'));
  assert.equal(publicReport.content_included, true);
  assert.match(publicReport.prompts[0].content.text, /Synthetic public prompt/);
  assert.equal(JSON.stringify(publicReport).includes('synthetic-private-key'), false);
  const metadataResult = await cli(root, ['report', '--metadata-only', '--out', 'docs/synthetic-metadata']);
  assert.equal(metadataResult.code, 0, metadataResult.stderr);
  const metadata = JSON.parse(await readFile(join(root, 'docs', 'synthetic-metadata.json'), 'utf8'));
  assert.equal(metadata.content_included, false);
  assert.equal(metadata.totals.prompts, 1);
  assert.equal(JSON.stringify(metadata).includes('Synthetic public prompt'), false);
});
