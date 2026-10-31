import type { Metadata } from 'next';
import '@seapilot/ui/styles.css';
export const metadata: Metadata = { title: 'seaPilot — Customer support', description: 'Keep your support conversation moving.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a href="#main" className="skip-link">Skip to conversation</a>{children}</body></html>; }
