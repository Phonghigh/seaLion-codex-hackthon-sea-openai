import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);
const origin = z.string().url().refine(value => new URL(value).origin === value, 'Use exact origins without paths');
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    port: z.coerce.number().int().min(1).max(65535).parse(env.PORT || 4000),
    databaseUrl: env.DATABASE_URL || 'postgres://seapilot:seapilot_local_only@127.0.0.1:5433/seapilot',
    demoToken: env.DEMO_RESET_TOKEN || '',
    corsOrigins: z.array(origin).parse((env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)),
  };
}
