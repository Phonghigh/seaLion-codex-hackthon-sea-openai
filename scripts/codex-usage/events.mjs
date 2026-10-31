import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { label, preview } from './privacy.mjs';

export const hookEvents = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'SessionEnd',
];
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const promptLimit = 2 * 1024 * 1024;

function requiredString(value, key, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

export function inProject(root, cwd) {
  if (typeof cwd !== 'string' || !isAbsolute(cwd)) return false;
  const part = relative(resolve(root), resolve(cwd));
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`));
}

export function classify(name) {
  const tool = name.replace(/^functions\./, '');
  if (/^(?:exec|wait)$/.test(tool)) return 'orchestration';
  if (/^mcp__codex_app__/.test(tool)) return 'codex_app';
  if (/^mcp__/.test(tool)) return 'mcp_external';
  if (/^(?:web(?:__|\.)|image_gen(?:__|\.)|WebSearch$)/.test(tool)) return 'openai_tool';
  if (/^(?:Bash|exec_command|write_stdin|apply_patch|view_image|update_plan|spawn_agent|send_message|wait_agent|request_user_input|request_user_input_async)$/.test(tool)) return 'codex_builtin';
  return 'unknown';
}

export function outcome(response) {
  if (response && typeof response === 'object') {
    if (response.isError === true || response.is_error === true) return 'error';
    if (Number.isInteger(response.exit_code)) return response.exit_code === 0 ? 'success' : 'error';
    if (response.isError === false || response.is_error === false) return 'success';
  }
  // PostToolUse alone means a result was observed, not that the action succeeded.
  return 'unknown';
}

export function normalizeHook(input, root, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an object');
  if (!hookEvents.includes(input.hook_event_name)) throw new Error('Unsupported hook event');
  requiredString(input.cwd, 'cwd', 4096);
  if (!inProject(root, input.cwd)) throw new Error('Hook cwd is outside this project');
  const session = digest(requiredString(input.session_id, 'session_id'));
  const turn = input.turn_id ? digest(requiredString(input.turn_id, 'turn_id')) : null;
  const event = input.hook_event_name;
  const isTool = event === 'PreToolUse' || event === 'PostToolUse';
  const call = isTool ? digest(requiredString(input.tool_use_id, 'tool_use_id')) : null;
  const name = isTool ? label(requiredString(input.tool_name, 'tool_name')) : null;
  if (event === 'UserPromptSubmit' && (typeof input.prompt !== 'string' || input.prompt.length > promptLimit)) throw new Error('Invalid prompt');
  const agent = input.agent_id ? digest(requiredString(input.agent_id, 'agent_id')) : null;
  const prompt = event === 'UserPromptSubmit' ? preview(input.prompt, promptLimit) : null;
  // Redaction can expand input (for example many short email addresses).
  // Do not allow a prompt whose public evidence would be incomplete.
  if (prompt?.truncated) throw new Error('Redacted prompt exceeds capture limit');
  // Every delivered prompt is evidence, including repeated text in one turn.
  // Only tool calls have a runtime invocation ID suitable for deduplication.
  const stable = call ?? randomUUID();
  return {
    schema_version: 1, id: digest(JSON.stringify([session, turn, event, stable, agent])),
    recorded_at: now, source: 'codex_hook', event, session, turn, agent,
    model: label(input.model), tool: name, category: name ? classify(name) : null,
    call, status: event === 'PostToolUse' ? outcome(input.tool_response) : null,
    prompt,
    input: isTool ? preview(input.tool_input) : null,
    output: event === 'PostToolUse' ? preview(input.tool_response) : null,
    note: null,
  };
}

export function normalizeManual(input, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an object');
  const service = label(requiredString(input.service, 'service'));
  const name = label(requiredString(input.tool, 'tool'));
  requiredString(input.note, 'note', 20_000);
  const occurredAt = requiredString(input.occurred_at, 'occurred_at');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(occurredAt) || !Number.isFinite(Date.parse(occurredAt))) {
    throw new Error('occurred_at must be ISO 8601 with timezone');
  }
  if (input.prompt !== undefined && (typeof input.prompt !== 'string' || input.prompt.length > promptLimit)) throw new Error('Invalid prompt');
  return {
    schema_version: 1, id: digest(randomUUID()), recorded_at: now,
    occurred_at: new Date(occurredAt).toISOString(), source: 'user_reported',
    event: 'ManualEntry', session: null, turn: null, agent: null,
    model: label(input.model), tool: `${service}/${name}`, category: 'manual_external',
    call: null, status: 'unverified', prompt: preview(input.prompt, promptLimit),
    input: null, output: null, note: preview(input.note),
  };
}

export function validStoredEvent(value) {
  const hash = (item) => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item);
  const date = (item) => typeof item === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(item) && Number.isFinite(Date.parse(item));
  const text = (item, limit = 20_000) => item === null || (item && typeof item.text === 'string' && item.text.length <= limit && typeof item.truncated === 'boolean');
  if (!(value && value.schema_version === 1 && hash(value.id)
    && date(value.recorded_at)
    && ['codex_hook', 'user_reported'].includes(value.source)
    && (hookEvents.includes(value.event) || value.event === 'ManualEntry')
    && (value.session === null || hash(value.session))
    && (value.turn === null || hash(value.turn))
    && (value.agent === null || hash(value.agent))
    && (value.call === null || hash(value.call))
    && typeof value.model === 'string' && value.model.length <= 180
    && (value.tool === null || (typeof value.tool === 'string' && value.tool.length <= 361))
    && [null, 'success', 'error', 'unknown', 'unverified'].includes(value.status)
    && text(value.prompt, promptLimit)
    && [value.input, value.output, value.note].every((item) => text(item)))) return false;
  if (value.source === 'user_reported') {
    return value.event === 'ManualEntry' && date(value.occurred_at)
      && value.session === null && value.call === null && value.status === 'unverified'
      && typeof value.tool === 'string' && value.note !== null;
  }
  if (value.event === 'ManualEntry' || !hash(value.session)) return false;
  if (value.event === 'PreToolUse' || value.event === 'PostToolUse') {
    return hash(value.call) && typeof value.tool === 'string'
      && (value.event === 'PostToolUse' ? ['success', 'error', 'unknown'].includes(value.status) : value.status === null);
  }
  return value.call === null && value.tool === null
    && (value.event !== 'UserPromptSubmit' || value.prompt !== null);
}
