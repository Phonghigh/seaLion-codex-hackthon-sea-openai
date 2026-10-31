// Best-effort redaction, not a guarantee that arbitrary text is safe to publish.
const sensitiveKey = /(?:password|passwd|secret|token|api.?key|authorization|cookie|credential|private.?key|service.?role)/i;
const limit = 20_000;

function redactAssignments(text) {
  // Match each complete key once. Two greedy key wildcards around a sensitive
  // word would backtrack quadratically on long repeated/minified input.
  const keys = /(?<![\w.-])([\w.-]+)(["']?\s*[:=]\s*)/g;
  const parts = [];
  let copied = 0;
  let match;
  while ((match = keys.exec(text)) !== null) {
    if (!sensitiveKey.test(match[1])) continue;
    const value = /^(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}]+)/.exec(text.slice(keys.lastIndex));
    if (!value) continue;
    parts.push(text.slice(copied, keys.lastIndex), '[REDACTED]');
    keys.lastIndex += value[0].length;
    copied = keys.lastIndex;
  }
  parts.push(text.slice(copied));
  return parts.join('');
}

export function redactText(value) {
  return redactAssignments(String(value)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(?:sk-(?:proj-|svcacct-)?[\w-]{8,}|gh[pousr]_[\w]{8,}|github_pat_[\w]{8,}|sb_secret_[\w-]{8,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED KEY]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[REDACTED JWT]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*/gi, '$1 [REDACTED]')
    .replace(/\b(?:https?|postgres(?:ql)?):\/\/[^\s<>"']+/gi, (url) => {
      try {
        const parsed = new URL(url);
        if (parsed.username || parsed.password) {
          parsed.username = 'REDACTED';
          parsed.password = '';
        }
        if (parsed.search) parsed.search = '?REDACTED';
        if (parsed.hash) parsed.hash = '#REDACTED';
        return parsed.toString();
      } catch { return '[REDACTED URL]'; }
    })
    .replace(/(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED EMAIL]')
    .replace(/\b[A-Z]:[\\/](?:Users|home)[\\/][^\s\\/"']+/gi, '<HOME>')
    .replace(/\/(?:Users|home)\/[^\s/"']+/g, '<HOME>'));
}

function clean(value, depth = 0) {
  if (depth > 12) return '[DEPTH LIMIT]';
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => clean(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [
      redactText(key), sensitiveKey.test(key) ? '[REDACTED]' : clean(item, depth + 1),
    ]));
  }
  return value;
}

export function preview(value, maxLength = limit) {
  if (value === undefined || value === null) return null;
  const sanitized = clean(value);
  const text = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
  return { text: text.slice(0, maxLength), truncated: text.length > maxLength };
}

// Names are labels, never executable paths or arbitrary prose.
export function label(value, fallback = 'unknown') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.:/-]{1,180}$/.test(value)) return fallback;
  return redactText(value);
}
