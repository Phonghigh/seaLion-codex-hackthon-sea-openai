'use client';
import { useSearchParams } from 'next/navigation';
import { Workspace } from './workspace';

export function WorkspaceEntry() {
  const params = useSearchParams();
  return <Workspace demoEnabled={params.get('demo') === '1'} />;
}
