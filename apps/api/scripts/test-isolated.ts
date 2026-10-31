import '../src/env';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isolatedDatabase } from '../tests/database';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to create a disposable test database');
const database = await isolatedDatabase(process.env.DATABASE_URL);
try {
  const child = spawn('pnpm', ['test'], {
    cwd: fileURLToPath(new URL('../../../', import.meta.url)), stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: database.url, OPENAI_API_KEY: '' },
  });
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once('error', reject); child.once('exit', code => resolve(code ?? 1));
  });
} finally { await database.close(); }
