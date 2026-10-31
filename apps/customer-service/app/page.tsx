import { Suspense } from 'react';
import { WorkspaceEntry } from '../components/workspace-entry';

export default function Page() {
  return <Suspense fallback={<p role="status">Loading customer service workspace…</p>}><WorkspaceEntry /></Suspense>;
}
