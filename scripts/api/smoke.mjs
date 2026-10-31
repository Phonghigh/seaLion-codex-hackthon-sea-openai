import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
if (existsSync('.env')) loadEnvFile('.env');
const base = process.env.API_BASE || 'http://127.0.0.1:4000';
const token = process.env.DEMO_RESET_TOKEN;
assert(token && !/[\r\n]/.test(token), 'Set DEMO_RESET_TOKEN before smoke testing');
function request(path, { method = 'GET', auth = false, origin } = {}) {
  // Keep the token out of process arguments and output.
  const config = auth ? `header = ${JSON.stringify(`x-demo-token: ${token}`)}\n` : '';
  const result = spawnSync('curl', ['--silent', '--show-error', '--max-time', '10', '--path-as-is', '--config', '-', '-X', method, ...(origin ? ['-H', `Origin: ${origin}`] : []), '-D', '-', '-w', '\n%{http_code}', `${base}${path}`], { input: config, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout;
  const split = output.indexOf('\r\n\r\n');
  return { status: Number(output.slice(output.lastIndexOf('\n') + 1)), headers: output.slice(0, split).toLowerCase(), body: output.slice(split + 4, output.lastIndexOf('\n')) };
}
assert.equal(request('/api/health').status, 200);
for (const file of ['parcel_a.svg', 'parcel_b_open.svg']) {
  const result = request(`/files/${file}`);
  assert.equal(result.status, 200);
  assert.match(result.body, /Sample illustration/);
}
assert.equal(request('/files/%2e%2e/package.json').status, 404);
for (const route of ['reset', 'advance-day', 'jump?to=demo2']) assert.equal(request(`/api/demo/${route}`, { method: 'POST' }).status, 401);
const allowed = (process.env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)[0];
assert(allowed, 'Configure CORS_ORIGINS for the preflight check');
assert.equal(request('/api/demo/reset', { method: 'OPTIONS', origin: allowed }).status, 204);
assert(request('/api/health', { origin: allowed }).headers.includes(`access-control-allow-origin: ${allowed.toLowerCase()}`));
assert(!request('/api/health', { origin: 'https://untrusted.invalid' }).headers.includes('access-control-allow-origin:'));
assert.equal(request('/api/demo/jump?to=invalid', { method: 'POST', auth: true }).status, 400);
for (const [route, scene, day] of [['reset', 'start', 0], ['jump?to=demo2', 'demo2', 0], ['advance-day', 'advanced', 1], ['reset', 'start', 0]]) {
  const response = request(`/api/demo/${route}`, { method: 'POST', auth: true });
  assert.equal(response.status, 200);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, true); assert.equal(data.scene, scene); assert.equal(data.day, day);
  console.log(`POST /api/demo/${route}: 200 (${scene}, day ${day})`);
}
console.log('curl checks passed: health, both sample files, traversal, CORS, token guards, invalid jump, reset, jump and advance-day.');
