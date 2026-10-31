import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default [...next, ...ts, { ignores: ['**/.next/**', '**/out/**', '**/node_modules/**'] }, { settings: { next: { rootDir: ['apps/customer/', 'apps/customer-service/'] } } }];
