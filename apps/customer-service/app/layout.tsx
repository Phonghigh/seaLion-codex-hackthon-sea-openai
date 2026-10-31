import type { Metadata } from 'next';
import '@seapilot/ui/styles.css';
export const metadata: Metadata = { title: 'seaPilot — Customer Service', description: 'The conversation changes. The case keeps going.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a href="#main" className="skip-link">Skip to workspace</a>{children}</body></html>; }
