import { classify, promptLimit } from './events.mjs';
import { label, redactText, preview } from './privacy.mjs';

const short = (id) => id?.slice(0, 12) ?? 'none';
const safeCell = (text) => redactText(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\|/g, '&#124;').replace(/`/g, '&#96;').replace(/\r?\n/g, ' ');
const safeBlock = (text) => redactText(text).split(/\r?\n/).map((line) => `    ${line}`).join('\n');

export function buildReport(events, { invalid = 0, includePrompts = false, generatedAt = new Date().toISOString() } = {}) {
  const hooks = events.filter((event) => event.source === 'codex_hook');
  const calls = new Map();
  for (const event of hooks) {
    if (!['PreToolUse', 'PostToolUse'].includes(event.event) || !event.call) continue;
    const key = `${event.session}:${event.turn}:${event.call}`;
    const call = calls.get(key) ?? {
      id: short(event.call), session: short(event.session), turn: short(event.turn),
      tool: label(event.tool), category: classify(label(event.tool)),
      started: false, result_observed: false, status: 'unknown', started_at: null, result_at: null,
    };
    if (event.event === 'PreToolUse') { call.started = true; call.started_at = event.recorded_at; }
    if (event.event === 'PostToolUse') {
      call.result_observed = true; call.result_at = event.recorded_at; call.status = event.status ?? 'unknown';
    }
    calls.set(key, call);
  }
  const tools = new Map();
  for (const call of calls.values()) {
    const row = tools.get(call.tool) ?? {
      tool: call.tool, category: call.category, invocations: 0, starts_observed: 0,
      results_observed: 0, success_signals: 0, error_signals: 0, unknown_results: 0, no_result_observed: 0,
    };
    row.invocations += 1;
    if (call.started) row.starts_observed += 1;
    if (call.result_observed) {
      row.results_observed += 1;
      if (call.status === 'success') row.success_signals += 1;
      else if (call.status === 'error') row.error_signals += 1;
      else row.unknown_results += 1;
    } else row.no_result_observed += 1;
    tools.set(call.tool, row);
  }
  const prompts = hooks.filter((event) => event.event === 'UserPromptSubmit').map((event) => ({
    id: short(event.id), at: event.recorded_at, session: short(event.session), turn: short(event.turn),
    ...(includePrompts ? { content: preview(event.prompt?.text ?? '', promptLimit), capture_truncated: event.prompt?.truncated ?? false } : {}),
  }));
  const manual = events.filter((event) => event.source === 'user_reported').map((event) => ({
    id: short(event.id), recorded_at: event.recorded_at, occurred_at: event.occurred_at,
    service_tool: label(event.tool), status: 'unverified',
    ...(includePrompts ? { prompt: preview(event.prompt?.text, promptLimit), note: preview(event.note?.text) } : {}),
  }));
  return {
    schema_version: 1, title: 'seaPilot — Codex usage evidence', generated_at: generatedAt,
    content_included: includePrompts,
    coverage: {
      first_recorded_at: events[0]?.recorded_at ?? null,
      last_recorded_at: events.at(-1)?.recorded_at ?? null,
      invalid_files_skipped: invalid,
      limitations: [
        'Only events received by this recorder are counted; no retroactive reconstruction.',
        'Hosted tools (for example hosted WebSearch) and specialized paths may not emit tool hooks.',
        'ChatGPT outside this Codex runtime is not observed. Manual entries are self-reported and excluded from automatic counts.',
        'A start without a result may be interrupted, denied, running, or missing; it is not counted as successful.',
        'Success/error signals describe the tool transport or process, not verified business outcomes.',
        'MCP is a connection type, not proof of third-party ownership. Unknown names remain unknown.',
        'This is editable, Git-shared evidence, not tamper-proof certification or proof of hackathon eligibility.',
        'Prompt counts are received hook deliveries, including repeated identical text. Tool invocations are correlated by runtime IDs.',
        'No token, cost, time-saved, percentage of AI-written code, or complete-account usage is inferred.',
      ],
    },
    totals: {
      hook_events: hooks.length, sessions: new Set(hooks.map((event) => event.session)).size,
      prompts: prompts.length, tool_invocations: calls.size,
      tool_results: [...calls.values()].filter((call) => call.result_observed).length,
      manual_entries: manual.length,
    },
    models: [...new Set(hooks.map((event) => label(event.model)))].sort(),
    tools: [...tools.values()].sort((a, b) => a.tool.localeCompare(b.tool)),
    prompts, calls: [...calls.values()], manual_entries: manual,
  };
}

export function renderMarkdown(report) {
  const lines = [
    `# ${report.title}`, '', `Generated: ${report.generated_at} (UTC).`, '',
    'Public team evidence for the hackathon write-up; secrets are redacted before recording.', '',
    `Observed window: ${report.coverage.first_recorded_at ?? 'no events yet'} → ${report.coverage.last_recorded_at ?? 'no events yet'}.`, '',
    '| Metric | Count |', '| --- | ---: |',
    ...Object.entries(report.totals).map(([key, value]) => `| ${key} | ${value} |`), '',
    `Models reported by hooks: ${report.models.map(safeCell).join(', ') || 'none'}.`, '',
    '## Observed tools', '',
    '| Tool | Category | Invocations | Starts | Results | Success signals | Error signals | Unknown results | No result |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.tools.map((row) => `| ${safeCell(row.tool)} | ${row.category} | ${row.invocations} | ${row.starts_observed} | ${row.results_observed} | ${row.success_signals} | ${row.error_signals} | ${row.unknown_results} | ${row.no_result_observed} |`), '',
    '## Prompt trail', '',
    report.content_included ? 'Redacted prompts follow. Redaction is best effort; review content before committing.' : 'Prompt content is omitted from this report; public event files still contain redacted prompts.', '',
    '| Time (UTC) | Session | Turn | Event |', '| --- | --- | --- | --- |',
    ...report.prompts.map((prompt) => `| ${prompt.at} | ${prompt.session} | ${prompt.turn} | ${prompt.id} |`), '',
  ];
  if (report.content_included) {
    for (const prompt of report.prompts) {
      lines.push(`### Prompt ${prompt.id}`, '', safeBlock(prompt.content?.text ?? ''), '',
        `Truncated during capture: ${prompt.capture_truncated ? 'yes' : 'no'}.`, '');
    }
  }
  lines.push('## Tool call trail', '', 'Session and turn identifiers connect each invocation to the prompt trail above.', '',
    '| First observed (UTC) | Session | Turn | Tool | Result |', '| --- | --- | --- | --- | --- |',
    ...report.calls.map((call) => `| ${call.started_at ?? call.result_at} | ${call.session} | ${call.turn} | ${safeCell(call.tool)} | ${call.result_observed ? call.status : 'no result observed'} |`), '');
  lines.push('## Self-reported external activity', '', 'These entries are not automatic evidence and are excluded from tool counts.', '');
  for (const entry of report.manual_entries) {
    lines.push(`- ${safeCell(entry.occurred_at)} — ${safeCell(entry.service_tool)} (${entry.status}; ${entry.id})`);
    if (report.content_included) lines.push('', safeBlock(entry.note?.text ?? ''), '', safeBlock(entry.prompt?.text ?? ''), '');
  }
  if (!report.manual_entries.length) lines.push('No manual entries.');
  lines.push('', '## Coverage and interpretation', '',
    ...report.coverage.limitations.map((item) => `- ${item}`),
    `- Invalid event files skipped: ${report.coverage.invalid_files_skipped}.`, '',
    'See [OpenAI hook documentation](https://learn.chatgpt.com/docs/hooks) for runtime coverage.', '');
  return lines.join('\n');
}
