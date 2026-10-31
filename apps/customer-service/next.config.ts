import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@seapilot/ui', '@seapilot/demo', '@seapilot/contracts'], devIndicators: false };
export default config;
