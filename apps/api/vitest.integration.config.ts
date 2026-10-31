import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['apps/api/tests/*.integration.ts'], environment: 'node', hookTimeout: 30000 } });
