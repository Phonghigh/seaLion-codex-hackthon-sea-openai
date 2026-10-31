import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
const app = process.argv[2];
if (!['customer', 'customer-service'].includes(app)) throw new Error('Choose customer or customer-service');
const result = spawnSync('pnpm', ['--filter', `@seapilot/${app}`, 'build'], {
  stdio: 'inherit', env: { ...process.env, SITES_STATIC_EXPORT: '1' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
cpSync(`apps/${app}/out`, 'out', { recursive: true });
