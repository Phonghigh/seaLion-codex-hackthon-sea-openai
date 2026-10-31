import { createApiClient } from '@seapilot/contracts/client';
export * from '@seapilot/contracts/client';
export const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:4000' });
