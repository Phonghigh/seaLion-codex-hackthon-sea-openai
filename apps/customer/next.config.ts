import type { NextConfig } from 'next';
const config: NextConfig = { output: process.env.SITES_STATIC_EXPORT === '1' ? 'export' : undefined, transpilePackages: ['@seapilot/ui', '@seapilot/demo', '@seapilot/contracts'], devIndicators: false };
export default config;
